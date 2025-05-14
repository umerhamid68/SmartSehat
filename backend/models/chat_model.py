import os
import json
from flask import jsonify
from together import Together

from models.medicalHistory_model import medicalHistory_model
from models.diet_plan_model import diet_plan_model
from helpers.chat_helpers import generate_visualization, is_meal_update_command, extract_meal_type

class chat_model():
    def __init__(self):
        self.client = Together(api_key="63269cd907596d9c031586061650084b73002400f24d0e1898d65edca00cc443")
        with open("./chat_prompt.txt", "r") as file:
            self.system_prompt = file.read()
        self.user_contexts = {}
        self.medical_history_obj = medicalHistory_model()
        self.diet_model = diet_plan_model()

    def get_or_init_user_context(self, userId):
        if userId not in self.user_contexts:
            # 1. Get medical history
            user_medical_history = self.medical_history_obj.get_medical_history_model(userId)
            medical_data = user_medical_history.get_json() if user_medical_history.status_code == 200 else {}

            # 2. Get current diet plan
            user_diet_plan = self.diet_model.get_diet_plans(userId)
            diet_data = user_diet_plan.get_json().get("plan", {}) if hasattr(user_diet_plan, 'get_json') else {}

            # 3. Inject into system prompt
            dynamic_prompt = (
                f"{self.system_prompt}\n\n"
                f"Medical History: {json.dumps(medical_data)}\n\n"
                f"Today's Diet Plan: {json.dumps(diet_data)}\n\n"
            )

            # 4. Create new conversation context
            self.user_contexts[userId] = [
                {"role": "system", "content": dynamic_prompt}
            ]

        return self.user_contexts[userId]

    def process_chat(self, userId, user_message):
        print("inside process_chat")
        if is_meal_update_command(user_message):
            print("inside meal update command")
            return self.substitute_meal(userId, user_message)

        conversation = self.get_or_init_user_context(userId)
        conversation.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                # model="meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
                messages=conversation
            )
            bot_response = response.choices[0].message.content.strip()

            try:
                response_data = json.loads(bot_response)
                if "chartType" in response_data and "values" in response_data:
                    img_base64 = generate_visualization(response_data)
                    return jsonify({"image": img_base64}), 200
                else:
                    return jsonify(response_data), 200
            except json.JSONDecodeError:
                return jsonify({"message": bot_response}), 200

        except Exception as e:
            print(f"Error processing chat: {e}")
            return jsonify({"error": str(e)}), 500

        # ------------------------------------------------------------------
    #  INSIDE chat_model – replace the current substitute_meal method
    # ------------------------------------------------------------------
    def substitute_meal(self, userId: int, meal_type_raw: str):
        try:
            # ───────── 0. Normalise meal type
            meal_type = extract_meal_type(meal_type_raw.strip().lower())
            if not meal_type:
                return jsonify({"message": "Meal type not specified."}), 400

            # ───────── 1. Locate the meal we want to swap
            sql = """
            SELECT m.*
            FROM   dietplan  AS dp
            JOIN   meal      AS m  ON m.planId = dp.planId
            WHERE  dp.userId = %s
              AND  CURDATE() BETWEEN dp.weekStartDate AND dp.weekEndDate
              AND  m.mealType = %s
              AND  m.dayOfWeek = DATEDIFF(CURDATE(), dp.weekStartDate) + 1
            ORDER BY dp.generatedDate DESC
            LIMIT 1
            """
            self.diet_model.cur.execute(sql, (userId, meal_type))
            meal_to_replace = self.diet_model.cur.fetchone()

            if not meal_to_replace:
                print(f"[SUB] No '{meal_type}' meal found for user {userId}")
                return jsonify({"message": f"No {meal_type} meal found in today's plan."}), 404

            print(f"[SUB] Will replace mealId {meal_to_replace['mealId']} ({meal_to_replace['name']})")

            # ───────── 2. Fetch dietary profile
            user_profile = self.diet_model.get_user_profile_for_diet(userId)
            if not user_profile:
                return jsonify({"message": "Could not retrieve user profile."}), 500

            # ───────── 3. Ask the LLM for a replacement recipe
            kcal_now  = float(meal_to_replace['calories'])
            kcal_min  = int(kcal_now * 0.85)
            kcal_max  = int(kcal_now * 1.15)

            prompt = f"""
            You are SmartSehat’s nutrition assistant.

            TASK
            ----
            Create ONE Pakistani-style replacement recipe that
            ▸ matches the user’s medical needs,
            ▸ keeps the same meal_type (“{meal_type}”),
            ▸ keeps calories BETWEEN {kcal_min} and {kcal_max} inclusive,
            ▸ is realistic and easy to cook.

            RESPONSE RULES (STRICT)
            -----------------------
            1. Respond with **exactly one JSON object** – nothing before it, nothing after it.
            2. Do NOT wrap the JSON in markdown fences, back-ticks, or prose.
            3. The JSON **must follow this schema** (same keys, same order):

            {{
            "title":               "string",
            "meal_type":           "{meal_type}",
            "portion":             float,        // e.g. 1.0
            "kcal":                float,
            "protein":             float,
            "carbohydrate":        float,
            "fat":                 float,
            "ingredients":         ["string", ...],
            "instructions":        ["string", ...],
            "summary":             "short description",
            "nutritionDetails":    {{"key": "value", ...}},
            "imageUrl":            null
            }}

            CONTEXT
            -------
            Current meal (being replaced):
            {json.dumps({k: str(v) for k, v in meal_to_replace.items()}, indent=2)}

            User profile:
            {json.dumps(user_profile, indent=2)}
            """

            llm_resp = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=[{"role": "system", "content": prompt}]
            )
            raw_json = llm_resp.choices[0].message.content.strip()
            raw_json = llm_resp.choices[0].message.content.strip()

            # If the model wrapped the JSON in prose/fences, grab the first {...}
            import re
            m = re.search(r"\{[\s\S]*\}", raw_json)
            if m:
                raw_json = m.group(0)

            replacement = json.loads(raw_json)

            replacement = json.loads(raw_json)

            print(f"[SUB] LLM suggested «{replacement['title']}» "
                  f"({replacement['kcal']} kcal)")

            # ───────── 4. Minimal sanity checks
            if replacement['meal_type'].lower() != meal_type:
                raise ValueError("LLM returned wrong meal_type")

            if not (kcal_min <= float(replacement['kcal']) <= kcal_max):
                raise ValueError("LLM kcal outside allowed range")

            # ───────── 5. Persist to DB
            ok = self.diet_model.update_meal_in_db(
                userId,
                meal_to_replace['mealId'],
                replacement
            )
            if not ok:
                return jsonify({"message": "Failed to update the meal in DB."}), 500

            print("[SUB] Meal updated successfully.")

            # ───────── 6. API response
            return jsonify({
                "message": f"{meal_type.capitalize()} was replaced with "
                           f"«{replacement['title']}».",
                "new_meal": replacement
            }), 200

        except json.JSONDecodeError:
            print("[SUB] LLM did not return valid JSON")
            return jsonify({"message": "Replacement generation failed."}), 500
        except Exception as e:
            print(f"[SUB] Exception: {e}")
            return jsonify({"error": str(e)}), 500




    #     if not meal_type:
    #         print("DEBUG 1 Meal type not found in user message.")
    #         return jsonify({"message": "Sure! Which meal would you like to update? (e.g., breakfast, lunch, or dinner)"}), 200
    #     print(f"DEBUG 2 Meal type to replace: {meal_type}")
    #     plan_response = self.diet_model.get_diet_plans(userId)
        
    #     if not hasattr(plan_response, 'get_json'):
    #         return jsonify({"message": "Could not retrieve your current diet plan."}), 500
    #     print(f"DEBUG 3 Plan response: {json.loads(plan_response.data.decode('utf-8'))}")
    #     current_plan = plan_response.get_json().get("plan", {})
    #     print(f"DEBUG 4 Current plan: {current_plan}")
    #     meals_today = current_plan.get("morning", []) + current_plan.get("evening", []) + current_plan.get("night", [])
    #     print(f"DEBUG 5 Meals today: {meals_today}")
    #     meal_to_replace = next((m for m in meals_today if meal_type in m['description'].lower()), None)
    #     print(f"DEBUG 6 Meal to replace: {meal_to_replace}")

        # # Get current diet plan
        # plan_response = self.diet_model.get_diet_plans(userId)
        # if not hasattr(plan_response, 'get_json'):
        #     return jsonify({"message": "Could not retrieve your current diet plan."}), 500

        # current_plan = plan_response.get_json().get("plan", {})
        # meals_today = current_plan.get("morning", []) + current_plan.get("evening", []) + current_plan.get("night", [])
        
        # # Find the meal to replace
        # meal_to_replace = None
        # for meal in meals_today:
        #     if meal_type in meal['description'].lower() or meal_type in meal['name'].lower():
        #         meal_to_replace = meal
        #         break

        # if not meal_to_replace:
        #     return jsonify({"message": f"No {meal_type} meal found in today's plan."}), 404

        # # Get user profile for dietary restrictions
        # user_profile = self.diet_model.get_user_profile_for_diet(userId)
        # if not user_profile:
        #     return jsonify({"message": "Could not retrieve user profile."}), 500

        # # Find a similar replacement meal
        # replacement = self.diet_model.find_similar_meal(meal_to_replace, user_profile)
        
        # if not replacement:
        #     return jsonify({"message": "Couldn't find a suitable replacement meal."}), 500

        # print(f"Substituting meal ID {meal_to_replace['id']} with {replacement['title']}")

        # # Update the meal in the database
        # update_success = self.diet_model.update_meal_in_db(userId, meal_to_replace['id'], replacement)
        
        # if not update_success:
        #     return jsonify({"message": "Failed to update the meal in your plan."}), 500

        # return jsonify({
        #     "message": f"{meal_type.capitalize()} was successfully replaced with '{replacement['title']}'",
        #     "new_meal": {
        #         "name": replacement['title'],
        #         "nutritional_values": {
        #             "calories": round(replacement['kcal']),
        #             "protein": f"{round(replacement['protein'], 1)}g",
        #             "carbs": f"{round(replacement['carbohydrate'], 1)}g",
        #             "fat": f"{round(replacement['fat'], 1)}g"
        #         }
        #     }
        # }), 200