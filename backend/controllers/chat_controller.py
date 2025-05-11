import json
from flask import request, jsonify, make_response
from app import app
from models.chat_model import chat_model
from models.auth_model import auth_model
import jwt
import re

chat_obj = chat_model()
auth = auth_model()

def extract_user_info_from_token():
    """Extract userId from the JWT token."""
    try:
        authorization = request.headers.get("authorization")
        if authorization and re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
            token = authorization.split(" ")[1]
            tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
            return tokendata['payload']['userid']  # returning userId from token
        else:
            return None
    except Exception as e:
        return None


@app.route('/api/chat', methods=['POST'])
@auth.token_auth()
def chat():
    """
    Endpoint to handle chat requests.
    Expects JSON:
    {
        "message": "User typed message here..."
    }
    """
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        data = request.json
        if not data or "message" not in data:
            return jsonify({"error": "No message provided"}), 400

        user_message = data["message"]
        print(f"User {userId} says: {user_message}")

        # Pass userId and user_message to the chat model
        return chat_obj.process_chat(userId, user_message)

    except Exception as e:
        return jsonify({"error": str(e)}), 500