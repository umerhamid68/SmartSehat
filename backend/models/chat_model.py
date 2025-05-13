import os
import json
from flask import jsonify
from together import Together

from models.medicalHistory_model import medicalHistory_model
from models.diet_plan_model import diet_plan_model
from helpers.chat_helpers import generate_visualization, is_meal_update_command, extract_meal_type

class chat_model():
    def __init__(self):
        self.client = Together(api_key=os.environ.get("TOGETHER_API_KEY"))
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
        if is_meal_update_command(user_message):
            return self.substitute_meal(userId, user_message)

        conversation = self.get_or_init_user_context(userId)
        conversation.append({"role": "user", "content": user_message})

        try:
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
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
            return jsonify({"error": str(e)}), 500

    def substitute_meal(self, userId, user_message):
        meal_type = extract_meal_type(user_message)

        if not meal_type:
            return jsonify({"message": "Sure! Which meal would you like to update? (e.g., breakfast, lunch, or dinner)"}), 200

        plan_response = self.diet_model.get_diet_plans(userId)
        if not hasattr(plan_response, 'get_json'):
            return jsonify({"message": "Could not retrieve your current diet plan."}), 500

        current_plan = plan_response.get_json().get("plan", {})
        meals_today = current_plan.get("morning", []) + current_plan.get("evening", []) + current_plan.get("night", [])
        meal_to_replace = next((m for m in meals_today if meal_type in m['description'].lower()), None)

        if not meal_to_replace:
            return jsonify({"message": f"No {meal_type} meal found in today's plan."}), 404

        user_profile = self.diet_model.get_user_profile(userId)
        replacement = self.find_similar_meal(meal_to_replace, user_profile)

        if not replacement:
            return jsonify({"message": "Couldn't find a suitable replacement meal."}), 500

        update_success = self.update_meal_in_db(userId, meal_to_replace['id'], replacement)
        if not update_success:
            return jsonify({"message": "Failed to update the meal in your plan."}), 500

        return jsonify({
            "message": f"{meal_type.capitalize()} was successfully replaced with '{replacement['title']}'",
            "new_meal": replacement
        }), 200

    def find_similar_meal(self, current_meal, user_profile):
        try:
            current_cal = current_meal['nutritional_values']['calories']
            target_kcal = float(current_cal)
            min_kcal = target_kcal * 0.85
            max_kcal = target_kcal * 1.15

            filtered = self.diet_model.recipe_db
            filtered = filtered[
                (filtered['meal_type'].str.lower() == current_meal['description'].split()[2].lower()) &
                (filtered['kcal'] >= min_kcal) &
                (filtered['kcal'] <= max_kcal)
            ]

            disease = user_profile.get("diseaseType")
            if disease == "diabetes":
                filtered = filtered[filtered["is_diabetic_friendly"] == True]
            elif disease == "heart":
                filtered = filtered[filtered["is_heart_friendly"] == True]
            elif disease == "liver":
                filtered = filtered[filtered["is_liver_friendly"] == True]

            if filtered.empty:
                return None

            return filtered.sample(1).iloc[0].to_dict()

        except Exception as e:
            print(f"Error finding replacement meal: {e}")
            return None

    def update_meal_in_db(self, user_id, meal_id, new_meal):
        try:
            self.diet_model.cur.execute("""
                UPDATE Meal
                SET name = %s,
                    description = %s,
                    portion = %s,
                    calories = %s,
                    protein = %s,
                    carbs = %s,
                    fat = %s,
                    ingredients = %s,
                    instructions = %s,
                    summary = %s,
                    nutritionDetails = %s,
                    imageUrl = %s
                WHERE mealId = %s
            """, (
                new_meal.get('title', 'Updated Meal'),
                f"Portion: {new_meal.get('portion', 1.0):.2f}",
                new_meal.get('portion', 1.0),
                new_meal.get('kcal', 0),
                new_meal.get('protein', 0),
                new_meal.get('carbohydrate', 0),
                new_meal.get('fat', 0),
                new_meal.get('ingredients', ''),
                new_meal.get('instructions', ''),
                new_meal.get('summary', ''),
                json.dumps(new_meal.get('nutritionDetails', {})),
                new_meal.get('imageUrl', None),
                meal_id
            ))
            return True
        except Exception as e:
            print(f"Error updating meal in DB: {e}")
            return False
