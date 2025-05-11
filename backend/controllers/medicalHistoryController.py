from flask import request, make_response
from app import app
from models.medicalHistory_model import medicalHistory_model
from models.auth_model import auth_model
import jwt
import re

medical_history_obj = medicalHistory_model()
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

@app.route("/api/medicalHistory/all", methods=["GET"])
@auth.token_auth()
def all_medical_history():
    """Fetch all medical history records."""
    return medical_history_obj.all_medical_history_model()

@app.route("/api/medicalHistory/add", methods=["POST"])
@auth.token_auth()
def add_medical_history():
    """Add a new medical history record."""
    print(request.form)
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)
    
    data = request.form.to_dict()
    data['userId'] = userId  # Add userId to the data
    # New fields extraction
    data['height'] = request.form.get('height')
    data['weight'] = request.form.get('weight')
    data['age'] = request.form.get('age')
    data['physicalActivity'] = request.form.get('physicalActivity')
    
    # Add disease-specific fields based on diseaseType
    if data['diseaseType'] == 'heart':
        data['severity'] = request.form.get('severity', 'Moderate')
        data['stentInserted'] = request.form.get('stentInserted', False)
        data['openHeartSurgery'] = request.form.get('openHeartSurgery', False)
        data['cholesterolLevel'] = request.form.get('cholesterolLevel', 0)
        data['hypertension'] = request.form.get('hypertension', False)
        data['smoking'] = request.form.get('smoking', False)
        data['diabetesExpectancy'] = request.form.get('diabetesExpectancy', False)
    elif data['diseaseType'] == 'liver':
        data['liverEnzymes'] = request.form.get('liverEnzymes', 'Normal')
        data['fibrosisStage'] = request.form.get('fibrosisStage', 0)
        data['steatosisGrade'] = request.form.get('steatosisGrade', 0)
        data['severity'] = request.form.get('severity', 'Mild')
    elif data['diseaseType'] == 'diabetes':
        data['type'] = request.form.get('type', 0)
        data['bloodSugarLevel'] = request.form.get('bloodSugarLevel', 0)
        data['a1cLevel'] = request.form.get('a1cLevel', 0)
        data['insulinUsage'] = request.form.get('insulinUsage', False)
        data['insulinDependency'] = request.form.get('insulinDependency', False)
    
    return medical_history_obj.add_medical_history_model(data)

@app.route("/api/medicalHistory/update", methods=["PUT"])
@auth.token_auth()
def update_medical_history():
    """Update an existing medical history record."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)

    data = request.form.to_dict()
    data['userId'] = userId  # Add userId to the data
    # New fields extraction
    data['height'] = request.form.get('height')
    data['weight'] = request.form.get('weight')
    data['age'] = request.form.get('age')
    data['physicalActivity'] = request.form.get('physicalActivity')
    
    # Add disease-specific fields based on diseaseType
    if data['diseaseType'] == 'heart':
        data['severity'] = request.form.get('severity', 'Moderate')
        data['stentInserted'] = request.form.get('stentInserted', False)
        data['openHeartSurgery'] = request.form.get('openHeartSurgery', False)
        data['cholesterolLevel'] = request.form.get('cholesterolLevel', 0)
        data['hypertension'] = request.form.get('hypertension', False)
        data['smoking'] = request.form.get('smoking', False)
        data['diabetesExpectancy'] = request.form.get('diabetesExpectancy', False)
    elif data['diseaseType'] == 'liver':
        data['liverEnzymes'] = request.form.get('liverEnzymes', 'Normal')
        data['fibrosisStage'] = request.form.get('fibrosisStage', 0)
        data['steatosisGrade'] = request.form.get('steatosisGrade', 0)
        data['severity'] = request.form.get('severity', 'Mild')
    elif data['diseaseType'] == 'diabetes':
        data['type'] = request.form.get('type', 1)
        data['bloodSugarLevel'] = request.form.get('bloodSugarLevel', 0)
        data['a1cLevel'] = request.form.get('a1cLevel', 0)
        data['insulinUsage'] = request.form.get('insulinUsage', False)
        data['insulinDependency'] = request.form.get('insulinDependency', False)

    return medical_history_obj.update_medical_history_model(data)

@app.route("/api/medicalHistory/delete", methods=["DELETE"])
@auth.token_auth()
def delete_medical_history():
    """Delete a medical history record."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)

    data = request.form.to_dict()
    data['userId'] = userId  # Add userId to the data

    return medical_history_obj.delete_medical_history_model(data)

@app.route("/api/medicalHistory", methods=["GET"])
@auth.token_auth()
def get_medical_history():
    """Get medical history for the authenticated user."""
    userId = extract_user_info_from_token()
    if not userId:
        return make_response({"message": "INVALID_TOKEN"}, 401)

    return medical_history_obj.get_medical_history_model(userId)