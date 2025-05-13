from datetime import datetime, timedelta
import mysql.connector
import json
from flask import make_response, jsonify
import jwt
from configs.config import dbconfig


class user_model():
    def __init__(self):
        self.con = mysql.connector.connect(host=dbconfig['host'],user=dbconfig['username'],password=dbconfig['password'],database=dbconfig['database'])
        self.con.autocommit=True
        self.cur = self.con.cursor(dictionary=True)
        
    def all_user_model(self):
        self.cur.execute("SELECT * FROM user")
        result = self.cur.fetchall()
        #print(result)
        if len(result)>0:
            #return {"payload":result}
            return make_response({"payload":result},200)
        else:
            return "No Data Found"
    
    def add_user_model(self, data):
        # Check if a user with the same email already exists
        self.cur.execute(f"SELECT email FROM User WHERE email = '{data['email']}'")
        existing_user = self.cur.fetchone()

        if existing_user:
            # If a user with the same email exists, return an error response
            return make_response({"message": "USER_ALREADY_EXISTS"}, 409)
        else:
            # If no user with the same email exists, insert the new user
            self.cur.execute(f"INSERT INTO User(firstName, lastName, email, password, dateOfBirth) VALUES('{data['firstName']}', '{data['lastName']}', '{data['email']}', '{data['password']}', '{data['dateOfBirth']}')")
            return make_response({"message": "CREATED_SUCCESSFULLY"}, 201)
    
    def add_multiple_users_model(self, data):
        # Generating query for multiple inserts
        qry = "INSERT INTO users(name, email, phone, roleid, password) VALUES "
        for userdata in data:
            qry += f" ('{userdata['name']}', '{userdata['email']}', '{userdata['phone']}', {userdata['roleid']},'{userdata['password']}'),"
        finalqry = qry.rstrip(",")
        self.cur.execute(finalqry)
        return make_response({"message":"CREATED_SUCCESSFULLY"},201)

    def delete_user_model(self,id):
        self.cur.execute(f"DELETE FROM users WHERE id={id}")
        if self.cur.rowcount>0:
            return make_response({"message":"DELETED_SUCCESSFULLY"},202)
        else:
            return make_response({"message":"CONTACT_DEVELOPER"},500)
        
    
    def update_user_model(self,data):
        self.cur.execute(f"UPDATE users SET name='{data['name']}', email='{data['email']}', phone='{data['phone']}' WHERE id={data['id']}")
        if self.cur.rowcount>0:
            return make_response({"message":"UPDATED_SUCCESSFULLY"},201)
        else:
            return make_response({"message":"NOTHING_TO_UPDATE"},204)

    def patch_user_model(self, data):
        qry = "UPDATE users SET "
        for key in data:
            if key!='id':
                qry += f"{key}='{data[key]}',"
        qry = qry[:-1] + f" WHERE id = {data['id']}"
        self.cur.execute(qry)
        if self.cur.rowcount>0:
            return make_response({"message":"UPDATED_SUCCESSFULLY"},201)
        else:
            return make_response({"message":"NOTHING_TO_UPDATE"},204)

    def pagination_model(self, pno, limit):
        pno = int(pno)
        limit = int(limit)
        start = (pno*limit)-limit
        qry = f"SELECT * FROM users LIMIT {start}, {limit}"
        self.cur.execute(qry)
        result = self.cur.fetchall()
        if len(result)>0:
            return make_response({"page":pno, "per_page":limit,"this_page":len(result), "payload":result})
        else:
            return make_response({"message":"No Data Found"}, 204)

    def upload_avatar_model(self, uid, db_path):
        self.cur.execute(f"UPDATE users SET avatar='{db_path}' WHERE id={uid}")
        if self.cur.rowcount>0:
            return make_response({"message":"FILE_UPLOADED_SUCCESSFULLY", "path":db_path},201)
        else:
            return make_response({"message":"NOTHING_TO_UPDATE"},204)

    def get_avatar_path_model(self, uid):
        self.cur.execute(f"SELECT avatar FROM users WHERE id={uid}")
        result = self.cur.fetchall()
        if len(result)>0:
            print(type(result))
            return {"payload":result}
        else:
            return "No Data Found"  
        
    def user_login_model(self, username, password):
        print(username)
        print(password)
        self.cur.execute(f"SELECT userid, email from user WHERE email='{username}' and password='{password}'")
        result = self.cur.fetchall()
        if len(result)==1:
            exptime = datetime.utcnow() + timedelta(days=7)
            data = {
                "payload": result[0],
                "iat": int(datetime.utcnow().timestamp()),   # issued‑at  (nice to have)
                "exp": int(exptime.timestamp())              # expires‑at
            }
            print(int(exp_epoc_time))
            jwt_token = jwt.encode(data, "ali@123", algorithm="HS256")
            return make_response({"token":jwt_token}, 200)
        else:
            return make_response({"message":"NO SUCH USER"}, 204)
        
    def get_user_details_model(self, token):
        """Get user details (firstName, lastName, dateOfBirth, email) using the token."""
        try:
            # Decode the token to extract the payload
            decoded_token = jwt.decode(token, "ali@123", algorithms=["HS256"])
            userid = decoded_token['payload']['userid']

            # Query the database to fetch user details
            self.cur.execute(f"SELECT firstName, lastName, dateOfBirth, email FROM User WHERE userid = {userid}")
            user_details = self.cur.fetchone()

            if user_details:
                return make_response({"payload": user_details}, 200)
            else:
                return make_response({"message": "USER_NOT_FOUND"}, 404)
        except jwt.ExpiredSignatureError:
            return make_response({"message": "TOKEN_EXPIRED"}, 401)
        except jwt.InvalidTokenError:
            return make_response({"message": "INVALID_TOKEN"}, 401)
        except mysql.connector.Error as err:
            logger.error(f"Error fetching user details: {err}")
            return make_response({"message": "DATABASE_ERROR"}, 500)
            