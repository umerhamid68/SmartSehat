# from flask import request, jsonify
# from app import app
# from models.scan_model import scan_model

# obj = scan_model()

# @app.route('/api/scan/meal', methods=['POST'])
# def scan_meal():
#     """Endpoint to scan a meal image"""
#     try:
#         if 'image' not in request.files:
#             return jsonify({"error": "No image provided"}), 400
#         image_file = request.files['image']
#         return obj.scan_meal_model(image_file)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/scan/product', methods=['POST'])
# def scan_product():
#     """Endpoint to scan a product image"""
#     try:
#         if 'image' not in request.files:
#             return jsonify({"error": "No image provided"}), 400
#         image_file = request.files['image']
#         return obj.scan_product_model(image_file)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/scan/nutrition', methods=['POST'])
# def scan_nutrition():
#     """Endpoint to scan nutrition label"""
#     try:
#         if 'image' not in request.files:
#             return jsonify({"error": "No image provided"}), 400
#         image_file = request.files['image']
#         return obj.scan_nutrition_model(image_file)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/predict/product', methods=['POST'])
# def predict_product_safety():
#     """Endpoint to predict product safety"""
#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({"error": "No data provided"}), 400
#         return obj.predict_product_safety_model(data)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# @app.route('/api/predict/meal', methods=['POST'])
# def predict_meal_safety():
#     """Endpoint to predict meal safety"""
#     try:
#         data = request.form.to_dict()
#         return obj.predict_meal_safety_model(data)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500






from flask import request, jsonify, make_response
from app import app
from models.scan_model import scan_model
from models.auth_model import auth_model
import jwt
import re

obj = scan_model()
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

@app.route('/api/scan/meal', methods=['POST'])
@auth.token_auth()
def scan_meal():
    """Endpoint to scan a meal image"""
    try:
        # Verify user authentication
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']

        data, status_code = obj.scan_meal_model(image_file, userId)
        if status_code == 200:

            return jsonify({
                "scanId": data.get("scanId"),
                "gptResult": data.get("gptResult")
            }), 200
        else:
            return jsonify(data), status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan/product', methods=['POST'])
@auth.token_auth()
def scan_product():
    """Endpoint to scan a product image"""
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']
        data, status_code = obj.scan_product_model(image_file, userId)
        if status_code == 200:

            return jsonify({
                "scanId": data.get("scanId"),
                "gptResult": data.get("gptResult")
            }), 200
        else:
            return jsonify(data), status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan/nutrition', methods=['POST'])
@auth.token_auth()
def scan_nutrition():
    """Endpoint to scan nutrition label"""
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files['image']
        data, status_code = obj.scan_nutrition_model(image_file, userId)
        if status_code == 200:

            return jsonify({
                "scanId": data.get("scanId"),
                "gptResult": data.get("gptResult")
            }), 200
        else:
            return jsonify(data), status_code

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict/product', methods=['POST'])
@auth.token_auth()
def predict_product_safety():
    """Endpoint to predict product safety"""
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        data['userId'] = userId
        return obj.predict_product_safety_model(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict/meal', methods=['POST'])
@auth.token_auth()
def predict_meal_safety():
    """Endpoint to predict meal safety"""
    try:
        userId = extract_user_info_from_token()
        if not userId:
            return make_response({"message": "INVALID_TOKEN"}, 401)

        data = request.form.to_dict()

        data['userId'] = userId
        return obj.predict_meal_safety_model(data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/scan/history', methods=['GET'])
@auth.token_auth()
def get_scan_history():
    """Get scan history for the authenticated user."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    return obj.get_scan_history(userId)