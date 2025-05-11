# # from flask import request, jsonify, make_response
# # from app import app
# # from models.diet_model import diet_model
# # from models.auth_model import auth_model
# # import jwt
# # import re

# # diet_obj = diet_model()
# # auth = auth_model()

# # def extract_user_info_from_token():
# #     """Extract userId from the JWT token."""
# #     try:
# #         authorization = request.headers.get("authorization")
# #         if authorization and re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
# #             token = authorization.split(" ")[1]
# #             tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
# #             return tokendata['payload']['userid']
# #         else:
# #             return None
# #     except Exception as e:
# #         return None

# # @app.route('/api/diet/plans', methods=['GET'])
# # @auth.token_auth()
# # def get_user_diet_plans():
# #     """Get all diet plans for the authenticated user"""
# #     try:
# #         user_id = extract_user_info_from_token()
# #         if not user_id:
# #             return make_response({"message": "INVALID_TOKEN"}, 401)
        
# #         # Check for meal_time query parameter
# #         meal_time = request.args.get('meal_time')
        
# #         # Get diet plans from model
# #         response, status_code = diet_obj.get_user_diet_plans(user_id, meal_time)
# #         return jsonify(response), status_code
        
# #     except Exception as e:
# #         return jsonify({"error": str(e)}), 500

# # @app.route('/api/diet/plan/<plan_id>', methods=['GET'])
# # @auth.token_auth()
# # def get_diet_plan_details(plan_id):
# #     """Get detailed information for a specific diet plan"""
# #     try:
# #         user_id = extract_user_info_from_token()
# #         if not user_id:
# #             return make_response({"message": "INVALID_TOKEN"}, 401)
        
# #         # Get diet plan details from model
# #         response, status_code = diet_obj.get_diet_plan_details(plan_id, user_id)
# #         return jsonify(response), status_code
        
# #     except Exception as e:
# #         return jsonify({"error": str(e)}), 500

# # @app.route('/api/diet/plan/<plan_id>/complete', methods=['POST'])
# # @auth.token_auth()
# # def mark_plan_completed(plan_id):
# #     """Mark a diet plan as completed/uncompleted"""
# #     try:
# #         user_id = extract_user_info_from_token()
# #         if not user_id:
# #             return make_response({"message": "INVALID_TOKEN"}, 401)
        
# #         data = request.get_json()
# #         is_completed = data.get('is_completed', True)
        
# #         # Mark diet plan as completed in model
# #         response, status_code = diet_obj.mark_plan_completed(plan_id, user_id, is_completed)
# #         return jsonify(response), status_code
        
# #     except Exception as e:
# #         return jsonify({"error": str(e)}), 500
















# from flask import request, jsonify, make_response
# from app import app
# from models.diet_model import diet_model
# from models.auth_model import auth_model
# import re
# import jwt

# diet_obj = diet_model()
# auth = auth_model()

# def extract_user_info_from_token():
#     """Extract userId from the JWT token."""
#     try:
#         authorization = request.headers.get("authorization")
#         if authorization and re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
#             token = authorization.split(" ")[1]
#             tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
#             return tokendata['payload']['userid']
#         else:
#             return None
#     except Exception as e:
#         print(f"Token extraction error: {str(e)}")
#         return None

# @app.route('/api/diet/plans', methods=['GET'])
# @auth.token_auth()
# def get_user_diet_plans():
#     """Get all diet plans for the authenticated user"""
#     try:
#         user_id = extract_user_info_from_token()
        
#         if not user_id:
#             return jsonify({"message": "INVALID_TOKEN"}), 401
        
#         # Print debug info
#         print(f"Processing request for user_id: {user_id}")
        
#         # Check for meal_time query parameter
#         meal_time = request.args.get('meal_time')
        
#         # Get diet plans from model
#         response, status_code = diet_obj.get_user_diet_plans(user_id, meal_time)
        
#         # Print response before returning
#         print(f"Diet plans response: {response}")
        
#         return jsonify(response), status_code
        
#     except Exception as e:
#         print(f"Error in get_user_diet_plans: {str(e)}")
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/diet/plan/<plan_id>', methods=['GET'])
# @auth.token_auth()
# def get_diet_plan_details(plan_id):
#     """Get detailed information for a specific diet plan"""
#     try:
#         user_id = extract_user_info_from_token()
#         if not user_id:
#             return jsonify({"message": "INVALID_TOKEN"}), 401
        
#         # Get diet plan details from model
#         response, status_code = diet_obj.get_diet_plan_details(plan_id, user_id)
#         return jsonify(response), status_code
        
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/diet/plan/<plan_id>/complete', methods=['POST'])
# @auth.token_auth()
# def mark_plan_completed(plan_id):
#     """Mark a diet plan as completed/uncompleted"""
#     try:
#         user_id = extract_user_info_from_token()
#         if not user_id:
#             return jsonify({"message": "INVALID_TOKEN"}), 401
        
#         data = request.get_json()
#         is_completed = data.get('is_completed', True)
        
#         # Mark diet plan as completed in model
#         response, status_code = diet_obj.mark_plan_completed(plan_id, user_id, is_completed)
#         return jsonify(response), status_code
        
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500













































from flask import request, jsonify, make_response
from app import app
from models.diet_model import diet_model
from models.auth_model import auth_model
import jwt
import re

diet_obj = diet_model()
auth = auth_model()

def extract_user_info_from_token():
    """Extract userId from the JWT token."""
    try:
        authorization = request.headers.get("authorization")
        if authorization and re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
            token = authorization.split(" ")[1]
            tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
            return tokendata['payload']['userid']
        else:
            return None
    except Exception as e:
        print(f"Token extraction error: {str(e)}")
        return None

# Fix route paths to match your app's convention (removed /api prefix)
@app.route('/diet/plans', methods=['GET'])
@auth.token_auth()
def get_user_diet_plans():
    """Get all diet plans for the authenticated user"""
    try:
        user_id = extract_user_info_from_token()
        
        if not user_id:
            return jsonify({"message": "INVALID_TOKEN"}), 401
        
        print(f"Processing diet plans request for user_id: {user_id}")
        
        # Check for meal_time query parameter
        meal_time = request.args.get('meal_time')
        
        # Get diet plans from model
        response, status_code = diet_obj.get_user_diet_plans(user_id, meal_time)
        
        return jsonify(response), status_code
        
    except Exception as e:
        print(f"Error in get_user_diet_plans: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/diet/plan/<plan_id>', methods=['GET'])
@auth.token_auth()
def get_diet_plan_details(plan_id):
    """Get detailed information for a specific diet plan"""
    try:
        user_id = extract_user_info_from_token()
        if not user_id:
            return jsonify({"message": "INVALID_TOKEN"}), 401
        
        print(f"Getting diet plan {plan_id} for user {user_id}")
        
        # Get diet plan details from model
        response, status_code = diet_obj.get_diet_plan_details(plan_id, user_id)
        return jsonify(response), status_code
        
    except Exception as e:
        print(f"Error in get_diet_plan_details: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/diet/plan/<plan_id>/complete', methods=['POST'])
@auth.token_auth()
def mark_plan_completed(plan_id):
    """Mark a diet plan as completed/uncompleted"""
    try:
        user_id = extract_user_info_from_token()
        if not user_id:
            return jsonify({"message": "INVALID_TOKEN"}), 401
        
        data = request.get_json()
        is_completed = data.get('is_completed', True)
        
        # Mark diet plan as completed in model
        response, status_code = diet_obj.mark_plan_completed(plan_id, user_id, is_completed)
        return jsonify(response), status_code
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500