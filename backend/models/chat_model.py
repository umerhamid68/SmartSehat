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
            print(f"Error processing chat: {e}")
            return jsonify({"error": str(e)}), 500

    def substitute_meal(self, userId, user_message):
        """Handle meal substitution requests"""
        meal_type = extract_meal_type(user_message)

        if not meal_type:
            return jsonify({"message": "Sure! Which meal would you like to update? (e.g., breakfast, lunch, or dinner)"}), 200

        # Get current diet plan
        plan_response = self.diet_model.get_diet_plans(userId)
        if not hasattr(plan_response, 'get_json'):
            return jsonify({"message": "Could not retrieve your current diet plan."}), 500

        current_plan = plan_response.get_json().get("plan", {})
        meals_today = current_plan.get("morning", []) + current_plan.get("evening", []) + current_plan.get("night", [])
        
        # Find the meal to replace
        meal_to_replace = None
        for meal in meals_today:
            if meal_type in meal['description'].lower() or meal_type in meal['name'].lower():
                meal_to_replace = meal
                break

        if not meal_to_replace:
            return jsonify({"message": f"No {meal_type} meal found in today's plan."}), 404

        # Get user profile for dietary restrictions
        user_profile = self.diet_model.get_user_profile_for_diet(userId)
        if not user_profile:
            return jsonify({"message": "Could not retrieve user profile."}), 500

        # Find a similar replacement meal
        replacement = self.diet_model.find_similar_meal(meal_to_replace, user_profile)
        
        if not replacement:
            return jsonify({"message": "Couldn't find a suitable replacement meal."}), 500

        print(f"Substituting meal ID {meal_to_replace['id']} with {replacement['title']}")

        # Update the meal in the database
        update_success = self.diet_model.update_meal_in_db(userId, meal_to_replace['id'], replacement)
        
        if not update_success:
            return jsonify({"message": "Failed to update the meal in your plan."}), 500

        return jsonify({
            "message": f"{meal_type.capitalize()} was successfully replaced with '{replacement['title']}'",
            "new_meal": {
                "name": replacement['title'],
                "nutritional_values": {
                    "calories": round(replacement['kcal']),
                    "protein": f"{round(replacement['protein'], 1)}g",
                    "carbs": f"{round(replacement['carbohydrate'], 1)}g",
                    "fat": f"{round(replacement['fat'], 1)}g"
                }
            }
        }), 200