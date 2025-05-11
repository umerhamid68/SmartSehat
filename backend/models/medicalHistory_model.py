from datetime import datetime
import mysql.connector
from flask import make_response
from configs.config import dbconfig
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class medicalHistory_model():
    def __init__(self):
        try:
            self.con = mysql.connector.connect(host=dbconfig['host'],user=dbconfig['username'],password=dbconfig['password'],database=dbconfig['database'])
            self.con.autocommit = True
            self.cur = self.con.cursor(dictionary=True)
        except mysql.connector.Error as err:
            logger.error(f"Database connection error: {err}")
            raise

    def add_medical_history_model(self, data):
        """Add medical history and disease-specific data as a transaction."""
        print(data)
        try:
            # Start a transaction
            self.con.start_transaction()

            # Step 1: Insert into MedicalHistory table
            query = """
            INSERT INTO MedicalHistory (userId, gender, diseaseType, startDate, endDate, height, weight, age, physicalActivity)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                data['userId'], data['gender'], data['diseaseType'],
                data['startDate'], data['endDate'],
                data['height'], data['weight'], data['age'], data['physicalActivity']
            )
            self.cur.execute(query, values)
            historyid = self.cur.lastrowid  # Get the auto-generated historyid
            print("debug1")
            # Step 2: Insert into disease-specific table
            if data['diseaseType'] == 'heart':
                query = """
                    INSERT INTO HeartDisease (
                        historyid, severity, stentInserted, openHeartSurgery, cholesterolLevel,
                        hypertension, smoking, diabetesExpectancy
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    historyid, data['severity'], data['stentInserted'], data['openHeartSurgery'],
                    data['cholesterolLevel'], data['hypertension'], data['smoking'], data['diabetesExpectancy']
                )
            elif data['diseaseType'] == 'liver':
                query = """
                    INSERT INTO FattyLiver (
                        historyid, liverEnzymes, fibrosisStage, steatosisGrade, severity
                    ) VALUES (%s, %s, %s, %s, %s)
                """
                values = (
                    historyid, data['liverEnzymes'], data['fibrosisStage'],
                    data['steatosisGrade'], data['severity']
                )
            elif data['diseaseType'] == 'diabetes':
                query = """
                    INSERT INTO Diabetes (
                        historyid, type, bloodSugarLevel, a1cLevel, insulinUsage, insulinDependency
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """
                values = (
                    historyid, data['type'], data['bloodSugarLevel'], data['a1cLevel'],
                    data['insulinUsage'], data['insulinDependency']
                )

            self.cur.execute(query, values)

            # Commit the transaction
            self.con.commit()
            return make_response({"message": "MEDICAL_HISTORY_CREATED_SUCCESSFULLY"}, 201)
        except mysql.connector.Error as err:
            # Rollback the transaction in case of error
            self.con.rollback()
            logger.error(f"Error adding medical history: {err}")
            return make_response({"message": "Database error"}, 500)

    def get_medical_history_model(self, userId):
        """Get medical history and disease-specific data for a user."""
        try:
            # Fetch general medical history
            self.cur.execute("SELECT * FROM MedicalHistory WHERE userId = %s", (userId,))
            medical_history = self.cur.fetchall()
            print("debug")
            print(medical_history)
            
            if not medical_history:
                return make_response({"message": "No medical history found"}, 404)

            # Fetch disease-specific data for each history record
            for record in medical_history:
                if record['diseaseType'] == 'heart':
                    self.cur.execute("SELECT * FROM HeartDisease WHERE historyid = %s", (record['historyid'],))
                    disease_data = self.cur.fetchone()
                elif record['diseaseType'] == 'liver':
                    self.cur.execute("SELECT * FROM FattyLiver WHERE historyid = %s", (record['historyid'],))
                    disease_data = self.cur.fetchone()
                elif record['diseaseType'] == 'diabetes':
                    self.cur.execute("SELECT * FROM Diabetes WHERE historyid = %s", (record['historyid'],))
                    disease_data = self.cur.fetchone()
                else:
                    disease_data = None

                # Add disease-specific data to the record
                record['diseaseData'] = disease_data
                

            print("debug")
            print(medical_history)
            return make_response({"payload": medical_history}, 200)
        except mysql.connector.Error as err:
            logger.error(f"Error fetching medical history: {err}")
            return make_response({"message": "Database error"}, 500)

    def update_medical_history_model(self, data):
        print(data)
        """Update medical history and disease-specific data."""
        try:
            # Start a transaction
            self.con.start_transaction()
            self.cur.execute("SELECT historyid FROM MedicalHistory WHERE userId = %s", (data['userId'],))
            history_record = self.cur.fetchone()
            print(history_record)
            if not history_record:
                return make_response({"message": "MEDICAL_HISTORY_NOT_FOUND"}, 404)
            
            historyid = history_record['historyid']
            # Step 1: Update MedicalHistory table
            query = """
            UPDATE MedicalHistory
            SET gender = %s, diseaseType = %s, medications = %s, startDate = %s, endDate = %s, diagnosedSince = %s,
                height = %s, weight = %s, age = %s, physicalActivity = %s
            WHERE userId = %s
            """
            values = (
                data['gender'], data['diseaseType'], data['medications'],
                data['startDate'], data['endDate'], data['diagnosedSince'],
                data['height'], data['weight'], data['age'], data['physicalActivity'],
                data['userId']
            )
            print("debug1")
            self.cur.execute(query, values)
            print("debug2")
            # Step 2: Update disease-specific table
            if data['diseaseType'] == 'heart':
                query = """
                    UPDATE HeartDisease
                    SET severity = %s, stentInserted = %s, openHeartSurgery = %s, cholesterolLevel = %s,
                    hypertension = %s, smoking = %s, diabetesExpectancy = %s
                    WHERE historyid = %s
                """
                values = (
                    data['severity'], data['stentInserted'], data['openHeartSurgery'],
                    data['cholesterolLevel'], data['hypertension'], data['smoking'], data['diabetesExpectancy'],
                    historyid
                )
            elif data['diseaseType'] == 'liver':
                query = """
                    UPDATE FattyLiver
                    SET liverEnzymes = %s, fibrosisStage = %s, steatosisGrade = %s, severity = %s
                    WHERE historyid = %s
                """
                values = (
                    data['liverEnzymes'], data['fibrosisStage'], data['steatosisGrade'], data['severity'],
                    historyid
                )
            elif data['diseaseType'] == 'diabetes':
                query = """
                    UPDATE Diabetes
                    SET type = %s, bloodSugarLevel = %s, a1cLevel = %s, insulinUsage = %s, insulinDependency = %s
                    WHERE historyid = %s
                """
                values = (
                    data['type'], data['bloodSugarLevel'], data['a1cLevel'],
                    data['insulinUsage'], data['insulinDependency'], historyid
                )

            self.cur.execute(query, values)

            # Commit the transaction
            self.con.commit()
            return make_response({"message": "MEDICAL_HISTORY_UPDATED_SUCCESSFULLY"}, 200)
        except mysql.connector.Error as err:
            # Rollback the transaction in case of error
            self.con.rollback()
            logger.error(f"Error updating medical history: {err}")
            return make_response({"message": "Database error"}, 500)

    def delete_medical_history_model(self, data):
        try:
            print(data)
            # Start a transaction
            self.con.start_transaction()

            # Step 1: Find historyid from MedicalHistory table using userId
            self.cur.execute("SELECT historyid, diseaseType FROM MedicalHistory WHERE userId = %s", (data['userId'],))
            medical_history_record = self.cur.fetchone()

            if not medical_history_record:
                # No record found for the given userId
                return make_response({"message": "NO_MEDICAL_HISTORY_FOUND"}, 404)

            historyid = medical_history_record['historyid']
            disease_type = medical_history_record['diseaseType']

            # Step 2: Delete from disease-specific table based on diseaseType
            if disease_type == 'heart':
                self.cur.execute("DELETE FROM HeartDisease WHERE historyid = %s", (historyid,))
            elif disease_type == 'liver':
                self.cur.execute("DELETE FROM FattyLiver WHERE historyid = %s", (historyid,))
            elif disease_type == 'diabetes':
                self.cur.execute("DELETE FROM Diabetes WHERE historyid = %s", (historyid,))

            # Step 3: Delete from MedicalHistory table
            self.cur.execute("DELETE FROM MedicalHistory WHERE historyid = %s AND userId = %s", (historyid, data['userId']))

            # Commit the transaction
            self.con.commit()
            return make_response({"message": "MEDICAL_HISTORY_DELETED_SUCCESSFULLY"}, 202)
        except mysql.connector.Error as err:
            # Rollback the transaction in case of error
            self.con.rollback()
            logger.error(f"Error deleting medical history: {err}")
            return make_response({"message": "Database error"}, 500)