from datetime import datetime, timedelta
from logging import exception
import mysql.connector
import jwt
from flask import make_response, request, json
import re
from configs.config import dbconfig
from functools import wraps

class auth_model():
    
    def __init__(self):
        self.con = mysql.connector.connect(host=dbconfig['host'],user=dbconfig['username'],password=dbconfig['password'],database=dbconfig['database'])
        self.con.autocommit=True
        self.cur = self.con.cursor(dictionary=True)
        
    # def token_auth(self, endpoint=""):
    #     def inner1(func):
    #         @wraps(func)
    #         def inner2(*args):
    #             endpoint = request.url_rule
    #             try:
    #                 authorization = request.headers.get("authorization")
    #                 if re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
    #                     token = authorization.split(" ")[1]
    #                     try:
    #                         tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
    #                     except Exception as e:
    #                         return make_response({"ERROR":str(e)}, 401)
    #                     print(tokendata)
    #                     current_role = tokendata['payload']['roleid']
    #                     self.cur.execute(f"SELECT * FROM accessibility_view WHERE endpoint='{endpoint}'")
    #                     result = self.cur.fetchall()
    #                     if len(result)>0:
    #                         roles_allowed = json.loads(result[0]['roles_allowed'])
    #                         if current_role in roles_allowed:
    #                             return func(*args)
    #                         else:
    #                             return make_response({"ERROR":"INVALID_ROLE"}, 422)
    #                     else:
    #                         return make_response({"ERROR":"INVALID_ENDPOINT"}, 404)
    #                 else:
    #                     return make_response({"ERROR":"INVALID_TOKEN"}, 401)
    #             except Exception as e:
    #                 return make_response({"ERROR":str(e)}, 401)
    #         return inner2
    #     return inner1
    # def token_auth(self):
    #     def inner1(func):
    #         @wraps(func)
    #         def inner2(*args):
    #             try:
    #                 # Extract the Authorization header
    #                 authorization = request.headers.get("authorization")
    #                 # Check if the header follows the "Bearer <token>" format
    #                 if authorization and re.match("^Bearer *([^ ]+) *$", authorization, flags=0):
    #                     # Extract the token
    #                     token = authorization.split(" ")[1]
    #                     try:
    #                         # Decode the token using the secret key
    #                         tokendata = jwt.decode(token, "ali@123", algorithms="HS256")
    #                         # Optionally, you can log or use the decoded token data
    #                         print("Token data:", tokendata)
    #                         # Proceed to the protected function
    #                         return func(*args)
    #                     except Exception as e:
    #                         # Handle token decoding errors (e.g., invalid token, expired token)
    #                         return make_response({"ERROR": "INVALID_OR_EXPIRED_TOKEN"}, 401)
    #                 else:
    #                     # Return error if the token format is invalid or missing
    #                     return make_response({"ERROR": "MISSING_OR_INVALID_TOKEN"}, 401)
    #             except Exception as e:
    #                 # Handle any other exceptions
    #                 return make_response({"ERROR": "AUTHENTICATION_FAILED"}, 401)
    #         return inner2
    #     return inner1
    def token_auth(self):
        """
        Decorator that
        1. extracts the Bearer token from the Authorization header,
        2. verifies / decodes it, and
        3. passes *all* positional and keyword arguments through to the
           protected view function so Flask can deliver URL parameters
           like meal_id, user_id, etc.
        """
        def decorator(view_func):
            @wraps(view_func)                     # keeps name & signature
            def wrapper(*args, **kwargs):        # <‑‑ accept **kwargs!
                try:
                    auth_header = request.headers.get("Authorization")
                    # Expect:  Authorization: Bearer <token>
                    if auth_header and re.match(r"^Bearer +[^ ]+$", auth_header):
                        token = auth_header.split()[1]

                        try:                     # validate / decode token
                            token_data = jwt.decode(token,
                                                   "ali@123",
                                                   algorithms=["HS256"])
                            print("Token data:", token_data)
                        except Exception:
                            return make_response(
                                {"ERROR": "INVALID_OR_EXPIRED_TOKEN"}, 401
                            )

                        # Token is valid – run the real view
                        return view_func(*args, **kwargs)   # <‑‑ forward kwargs
                    else:
                        return make_response(
                            {"ERROR": "MISSING_OR_INVALID_TOKEN"}, 401
                        )

                except Exception:
                    return make_response({"ERROR": "AUTHENTICATION_FAILED"}, 401)

            return wrapper
        return decorator