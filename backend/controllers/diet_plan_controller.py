print("DEBUG: Starting diet_plan_controller import")
from flask import request, make_response, jsonify
from app import app
from models.diet_plan_model import diet_plan_model
from models.auth_model import auth_model
import jwt
import re

print("DEBUG: Creating diet_plan_obj")
diet_plan_obj = diet_plan_model()
print("DEBUG: diet_plan_obj created successfully")
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
        return None

@app.route("/api/diet/generate", methods=["POST"])
@auth.token_auth()
def generate_diet_plan():
    """Generate a new diet plan for the authenticated user."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    # Generate the diet plan
    return diet_plan_obj.generate_diet_plan(userId)

@app.route("/api/diet/plans", methods=["GET"])
@auth.token_auth()
def get_diet_plans():
    """Get daily diet plans for the authenticated user."""
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)
        
        # Get the diet plans
        response = diet_plan_obj.get_diet_plans(userId)
        
        # Extract the plan data from the response
        if hasattr(response, 'get_json'):
            data = response.get_json()
            if 'plan' in data:
                return jsonify({"plans": data['plan']})
        
        # Return the original response if extraction fails
        return response
    except Exception as e:
        print(f"Error in get_diet_plans: {str(e)}")
        import traceback
        traceback.print_exc()
        return make_response({"message": f"Error: {str(e)}"}, 500)

@app.route("/api/diet/weekly", methods=["GET"])
@auth.token_auth()
def get_weekly_diet_plan():
    """Get weekly diet plan for the authenticated user."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    # Get the weekly diet plan
    return diet_plan_obj.get_weekly_diet_plan(userId)

@app.route("/api/diet/meal/complete", methods=["POST"])
@auth.token_auth()
def mark_meal_completed():
    """Mark a meal as completed."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    data = request.json
    if not data or 'mealId' not in data:
        return make_response({"message": "Missing meal ID"}, 400)
    
    # Mark the meal as completed
    return diet_plan_obj.mark_meal_completed(userId, data['mealId'])

@app.route("/api/diet/meal/<int:meal_id>", methods=["GET"])
@auth.token_auth()
def get_meal_details(meal_id):  # meal_id is a parameter here
    """Get detailed information for a specific meal."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    # Get the meal details
    return diet_plan_obj.get_meal_details(userId, meal_id)



@app.route("/api/diet/all-meals", methods=["GET"])
@auth.token_auth()
def get_all_diet_plan_meals():
    """Get all meals grouped by day for the authenticated user."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    return diet_plan_obj.get_all_diet_plan_meals(userId)