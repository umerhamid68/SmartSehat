# models/chat_model.py

import json
import os
import openai
from flask import jsonify
from helpers.chat_helpers import generate_visualization
from models.medicalHistory_model import medicalHistory_model  # If you want medical data
from together import Together
# from .someOtherModel import someOtherModel  # If you want user data from DB

class chat_model():
    def __init__(self):
        self.client = Together(api_key=os.environ.get("TOGETHER_API_KEY"))

        # 2) Load your system prompt
        with open("./chat_prompt.txt", "r") as file:
            self.system_prompt = file.read()

        # 3) In-memory user context (stores conversation)
        self.user_contexts = {}

        # 4) If you need medical history data:
        self.medical_history_obj = medicalHistory_model()

    def get_or_init_user_context(self, userId):
        """
        Return the conversation list for this user. If not existing,
        initialize with system prompt and possibly user data from DB.
        """
        if userId not in self.user_contexts:
            # Optionally, fetch user medicalHistory from DB:
            user_medical_history = self.medical_history_obj.get_medical_history_model(userId)
            if user_medical_history.status_code == 200:
                medical_data = user_medical_history.get_json()
            else:
                medical_data = {}

            # Build the dynamic prompt with medical data if you want:
            dynamic_prompt = (
                f"{self.system_prompt}\n\n"  # + any user data
                f"Medical History: {json.dumps(medical_data)}\n\n"
            )
            self.user_contexts[userId] = [
                {"role": "system", "content": dynamic_prompt}
            ]
        return self.user_contexts[userId]

    def process_chat(self, userId, user_message):
        """
        Main method to handle user chat logic.
        """
        print("here")
        conversation = self.get_or_init_user_context(userId)
        print("conversation", conversation)
        # Append the user's new message
        conversation.append({"role": "user", "content": user_message})

        try:
            # Use openai ChatCompletion with your model of choice
            # e.g. "meta-llama/Llama-3.3-70B-Instruct-Turbo"
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=conversation
            )

            bot_response = response.choices[0].message.content.strip()
            print(f"Bot says: {bot_response}")

            # Check if the bot response is JSON for visualization
            try:
                response_data = json.loads(bot_response)
                if "chartType" in response_data and "values" in response_data:
                    # Generate the visualization
                    img_base64 = generate_visualization(response_data)
                    return jsonify({"image": img_base64}), 200
                else:
                    # It's valid JSON but not a recognized chart format
                    return jsonify(response_data), 200
            except json.JSONDecodeError:
                # Plain text
                return jsonify({"message": bot_response}), 200

        except Exception as e:
            print(f"Error: {e}")
            return jsonify({"error": str(e)}), 500
