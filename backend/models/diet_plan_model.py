import os
import json
import ast
import mysql.connector
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from datetime import datetime, timedelta
from flask import make_response, jsonify
from configs.config import dbconfig
import threading
import mysql.connector

# Add the path to import the Pakistani recipe integration module
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from diet_recommendation.pakistani_recipes_integration_via_agent import (
    generate_smart_sehat_meal_plan,
    VAE,
    MealOptimizer
)

_thread_local = threading.local()

# Path to saved model components
MODEL_DIR = os.path.join(os.path.dirname(__file__), '../models/diet_model')


# ------------------------------------------------------------------
# 🔧  LOCAL TEST SWITCHES  🔧
# ------------------------------------------------------------------
from datetime import date, timedelta

# 1) Move "today" N days forward/backward
TEST_OFFSET_DAYS = 0        # +3 → jump 3 days ahead,  -2 → 2 days back

# 2) Or pin "today" to an absolute calendar date     (overrides offset)
TEST_STATIC_DATE = None    # e.g., date(2025, 5, 20)
# ------------------------------------------------------------------



class diet_plan_model():
    def __init__(self):
        # save cfg so _ensure_conn() can use it
        self.dbcfg = dbconfig

        # optional: make one throw‑away call to verify credentials
        test = mysql.connector.connect(
            host=dbconfig['host'],
            user=dbconfig['username'],
            password=dbconfig['password'],
            database=dbconfig['database'],
            ssl_disabled=True,
        )
        test.close()

        # load model components that live on disk
        try:
            self.load_model_components()
        except Exception as e:
            print(f"Model load error: {e}")
    def _parse_list_field(self, value):
        """
        Robustly turn a DB field that *might* contain:
          • a real Python list  (already deserialised)
          • a JSON string       "[\"item1\", \"item2\"]"
          • a repr string       "['item1', 'item2']"
          • a plain CSV string  "item1, item2"
        into a clean Python list[str].
        """
        if value is None:
            return []

        # already a list
        if isinstance(value, list):
            return value

        # must be a string after this
        txt = str(value).strip()

        # Try JSON, then Python literal
        for parser in (json.loads, ast.literal_eval):
            try:
                parsed = parser(txt)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass

        # Fallback: split on commas
        return [item.strip(" '\"\t\n\r") for item in txt.split(',') if item.strip()]
    
    def _ensure_conn(self):
        """
        Return a live mysql.connector connection & dict cursor
        that belong to *this* thread. Re‑opens automatically if lost.
        """
        if getattr(_thread_local, "conn", None) is None:
            _thread_local.conn = mysql.connector.connect(
                host=dbconfig['host'],
                user=dbconfig['username'],
                password=dbconfig['password'],
                database=dbconfig['database'],
                autocommit=True,
                # ↓ turn off SSL if you're on localhost
                ssl_disabled=True,
            )

        try:
            _thread_local.conn.ping(reconnect=True, attempts=1, delay=0)
        except Exception:
            _thread_local.conn.close()
            _thread_local.conn = mysql.connector.connect(
                host=dbconfig['host'],
                user=dbconfig['username'],
                password=dbconfig['password'],
                database=dbconfig['database'],
                autocommit=True,
                ssl_disabled=True,
            )

        _thread_local.cur = _thread_local.conn.cursor(dictionary=True)
        return _thread_local.conn, _thread_local.cur

    def load_model_components(self):
        """Load saved model components"""
        # Device configuration
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load meal mappings
        with open(os.path.join(MODEL_DIR, 'meal_mappings.pkl'), 'rb') as f:
            import pickle
            mappings = pickle.load(f)
            self.meal_id_to_idx = mappings['meal_id_to_idx']
            self.idx_to_meal_id = mappings['idx_to_meal_id']
            self.num_meal_classes = mappings['num_meal_classes']
        
        # Load meal nutrition data
        self.meal_nutrition_df = self._load_nutrition_data()
        
        # Load normalization parameters
        with open(os.path.join(MODEL_DIR, 'normalization_params.pkl'), 'rb') as f:
            import pickle
            self.norm_params = pickle.load(f)
        
        # Initialize and load the model
        self.model = VAE(input_dim=10, latent_dim=256, num_meal_classes=self.num_meal_classes).to(self.device)
        self.model.load_state_dict(torch.load(
            os.path.join(MODEL_DIR, 'diet_recommendation_model.pt'), 
            map_location=self.device
        ))
        self.model.eval()
        
        # Initialize the meal optimizer
        self.meal_optimizer = MealOptimizer()
        
    def _load_nutrition_data(self):
        """Load nutrition data from database or CSV"""

        try:
            conn, cur = self._ensure_conn()
            import pandas as pd
            return pd.read_csv(os.path.join(MODEL_DIR, 'meal_nutrition_complete.csv'))
        except:
            # Fallback to database if file not found
            cur.execute("SELECT * FROM meal_nutrition")
            result = cur.fetchall()
            import pandas as pd
            return pd.DataFrame(result)
    
    def calculate_user_metrics(self, user_data):
        """
        Calculate BMR, BMI, PAL and target energy intake based on user data
        """
        # Extract user data
        weight = float(user_data.get('weight', 70))  # Default: 70kg
        height = float(user_data.get('height', 170))  # Default: 170cm
        age = int(user_data.get('age', 30))  # Default: 30 years
        gender = user_data.get('gender', 'male').lower()
        physical_activity = int(user_data.get('physicalActivity', 3))
        
        # Calculate BMR
        if gender == 'male':
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        
        # Calculate BMI
        height_m = height / 100  # Convert height to meters
        bmi = weight / (height_m * height_m)
        
        # Map physical activity level from 1-5 scale to PAL value
        pal_map = {
            1: 1.2,    # Sedentary
            2: 1.375,  # Light activity
            3: 1.55,   # Moderate activity
            4: 1.725,  # Very active
            5: 1.9     # Extra active
        }
        pal = pal_map.get(physical_activity, 1.55)
        
        # Calculate target energy intake
        target_energy_intake = bmr * pal
        
        # Adjust for medical condition if needed
        disease_type = user_data.get('diseaseType', '')
        if disease_type == 'heart':
            # Reduce calories for heart disease patients
            target_energy_intake *= 0.9
        elif disease_type == 'diabetes':
            # Adjust for diabetes
            target_energy_intake *= 0.85
        elif disease_type == 'liver':
            # Adjust for liver disease
            target_energy_intake *= 0.9
        
        # Round values for readability
        bmr = round(bmr, 2)
        bmi = round(bmi, 2)
        pal = round(pal, 2)
        target_energy_intake = round(target_energy_intake, 2)
        
        return {
            'bmr': bmr,
            'bmi': bmi,
            'pal': pal,
            'targetEnergyIntake': target_energy_intake
        }
    
    def save_user_metrics(self, user_id, history_id, metrics):
        """Save calculated user metrics to database"""
        try:
            conn, cur = self._ensure_conn()
            query = """
            INSERT INTO UserMetrics 
            (userId, historyId, bmr, bmi, targetEnergyIntake, pal, calculatedOn)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            bmr = VALUES(bmr),
            bmi = VALUES(bmi),
            targetEnergyIntake = VALUES(targetEnergyIntake),
            pal = VALUES(pal),
            calculatedOn = VALUES(calculatedOn)
            """
            
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            values = (
                user_id, 
                history_id, 
                metrics['bmr'],
                metrics['bmi'],
                metrics['targetEnergyIntake'],
                metrics['pal'],
                current_time
            )
            
            cur.execute(query, values)
            return True
        except Exception as e:
            print(f"Error saving user metrics: {str(e)}")
            return False
    
    def get_user_profile_for_diet(self, user_id):
        """Get complete user profile in the format expected by the diet algorithm"""
        try:
            conn, cur = self._ensure_conn()
            # Query to get latest medical history
            query = """
            SELECT 
                u.userid, u.firstName, u.lastName, u.dateOfBirth,
                m.historyid, m.gender, m.diseaseType, m.height, m.weight, m.age, m.physicalActivity,
                um.bmr, um.bmi, um.targetEnergyIntake, um.pal
            FROM user u
            LEFT JOIN medicalhistory m ON u.userid = m.userId
            LEFT JOIN UserMetrics um ON m.historyid = um.historyId
            WHERE u.userid = %s
            ORDER BY m.historyid DESC
            LIMIT 1
            """
            
            cur.execute(query, (user_id,))
            user_data = cur.fetchone()
            
            if not user_data:
                return None
            
            # Calculate metrics if not already calculated
            if not user_data.get('bmr'):
                metrics = self.calculate_user_metrics(user_data)
                user_data.update(metrics)
                self.save_user_metrics(user_id, user_data['historyid'], metrics)
            
            # Create profile in the format expected by generate_smart_sehat_meal_plan
            user_profile = {
                'weight': float(user_data.get('weight', 70)),
                'height': float(user_data.get('height', 170)) / 100,  # Convert cm to meters
                'bmr': float(user_data.get('bmr', 1500)),
                'age': int(user_data.get('age', 35)),
                'bmi': float(user_data.get('bmi', 25)),
                'pal': float(user_data.get('pal', 1.5)),
                'target_energy_intake': float(user_data.get('targetEnergyIntake', 2000)),
                'cvd': 0,
                't2d': 0,
                'iron_deficiency': 0
            }
            
            # Set disease flags based on diseaseType
            disease_type = user_data.get('diseaseType', '')
            if disease_type == 'heart':
                user_profile['cvd'] = 1
            elif disease_type == 'diabetes':
                user_profile['t2d'] = 1
            elif disease_type == 'liver':
                # For fatty liver, we can treat it similar to diabetes
                user_profile['t2d'] = 1
            
            return user_profile
        except Exception as e:
            print(f"Error getting user profile: {str(e)}")
            return None
    
    def generate_diet_plan(self, user_id):
        """Generate a personalized Pakistani diet plan for the user"""
        try:
            # Get user profile in the correct format
            user_profile = self.get_user_profile_for_diet(user_id)
            
            if not user_profile:
                return make_response({"message": "User profile not found"}, 404)
            
            print(f"User profile for diet generation: {user_profile}")
            
            # Generate Pakistani meal plan using the imported function
            pakistani_meal_plan = generate_smart_sehat_meal_plan(
                user_profile, 
                self.model, 
                self.meal_nutrition_df, 
                self.meal_optimizer, 
                self.norm_params
            )
            
            if not pakistani_meal_plan:
                return make_response({"message": "Failed to generate meal plan"}, 500)
            
            # Save the plan to database
            self.save_diet_plan(user_id, user_profile['target_energy_intake'], pakistani_meal_plan)
            
            # Format for frontend
            frontend_plan = self.format_plan_for_frontend(pakistani_meal_plan)
            
            return make_response({
                "message": "Diet plan generated successfully",
                "plan": frontend_plan
            }, 200)
            
        except Exception as e:
            print(f"Error generating diet plan: {str(e)}")
            return make_response({"message": f"Error generating diet plan: {str(e)}"}, 500)
    
    def save_diet_plan(self, user_id, target_calories, weekly_plan):
        """Save the generated diet plan to database"""
        try:
            conn, cur = self._ensure_conn()
            # Calculate week dates
            today = datetime.now().date()
            week_start = today
            week_end = today + timedelta(days=6)
            
            # Convert numpy types to native Python types for JSON serialization
            def convert_to_serializable(obj):
                if isinstance(obj, np.float64):
                    return float(obj)
                elif isinstance(obj, np.int64):
                    return int(obj)
                elif isinstance(obj, dict):
                    return {k: convert_to_serializable(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_to_serializable(item) for item in obj]
                else:
                    return obj
            
            # Convert the weekly plan to a JSON-serializable format
            serializable_plan = convert_to_serializable(weekly_plan)
            
            # Insert plan into DietPlan table
            plan_query = """
            INSERT INTO DietPlan 
            (userId, generatedDate, weekStartDate, weekEndDate, targetCalories, planData)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            plan_values = (
                user_id,
                datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                week_start.strftime('%Y-%m-%d'),
                week_end.strftime('%Y-%m-%d'),
                target_calories,
                json.dumps(serializable_plan)
            )
            cur.execute(plan_query, plan_values)
            plan_id = cur.lastrowid
            
            # Check which columns exist in the Meal table
            cur.execute("SHOW COLUMNS FROM Meal")
            columns = [col['Field'] for col in cur.fetchall()]
            has_ingredients = 'ingredients' in columns
            has_instructions = 'instructions' in columns
            has_summary = 'summary' in columns
            has_nutrition_details = 'nutritionDetails' in columns
            
            # Insert individual meals
            for day_idx, day_plan in enumerate(weekly_plan):
                day_of_week = day_idx + 1  # 1-7 for Monday-Sunday
                for meal in day_plan['meals']:
                    #print(meal)
                    meal_name = meal.get('name', meal.get('title', f"Meal {meal.get('meal_id', 'Unknown')}"))
                    meal_description = meal.get('summary', f"Portion: {meal.get('portion', 1.0):.2f}")
                    meal_portion = meal.get('portion', 1.0)
                    # Process ingredients and instructions
                    ingredients = meal.get('ingredients', [])
                    if isinstance(ingredients, str):
                        ingredients_text = ingredients
                    elif isinstance(ingredients, list):
                        ingredients_text = json.dumps(ingredients)
                    else:
                        ingredients_text = None
                    
                    instructions = meal.get('instructions', [])
                    if isinstance(instructions, str):
                        instructions_text = instructions
                    elif isinstance(instructions, list):
                        instructions_text = json.dumps(instructions)
                    else:
                        instructions_text = None
                    
                    # Convert nutrition details to JSON
                    nutrition_details = meal.get('nutrition_details', {})
                    if isinstance(nutrition_details, dict):
                        nutrition_json = json.dumps(nutrition_details)
                    else:
                        nutrition_json = None
                    
                    # Build the query dynamically based on available columns
                    if has_ingredients and has_instructions and has_summary and has_nutrition_details:
                        meal_query = """
                        INSERT INTO Meal 
                        (planId, dayOfWeek, mealType, name, description, portion, calories, protein, carbs, fat,
                         ingredients, instructions, summary, nutritionDetails)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """
                        meal_values = (
                            plan_id,
                            day_of_week,
                            meal['meal_type'],
                            meal_name,
                            meal_description,
                            meal_portion,
                            float(meal.get('kcal', 0)),
                            float(meal.get('protein', 0)),
                            float(meal.get('carbohydrate', 0)),
                            float(meal.get('fat', 0)),
                            ingredients_text,
                            instructions_text,
                            meal.get('summary', ''),
                            nutrition_json
                        )
                    else:
                        # Fallback to basic query for older database schema
                        meal_query = """
                        INSERT INTO Meal 
                        (planId, dayOfWeek, mealType, name, description, portion, calories, protein, carbs, fat)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """
                        meal_values = (
                            plan_id,
                            day_of_week,
                            meal['meal_type'],
                            meal_name,
                            meal_description,
                            meal_portion,
                            float(meal.get('kcal', 0)),
                            float(meal.get('protein', 0)),
                            float(meal.get('carbohydrate', 0)),
                            float(meal.get('fat', 0))

                        )
                    
                    cur.execute(meal_query, meal_values)
                    meal['meal_id'] = cur.lastrowid
            
            return True
        except Exception as e:
            print(f"Error saving diet plan: {str(e)}")
            return False
    
    def format_plan_for_frontend(self, weekly_plan):
        """Format the diet plan for frontend display"""
        frontend_plan = {
            'morning': [],
            'evening': [],
            'night': []
        }
        
        # Take the first day of the plan for display
        if weekly_plan and len(weekly_plan) > 0:
            day_plan = weekly_plan[0]
            
            # Group meals by time of day
            for meal in day_plan['meals']:
                meal_type = meal.get('meal_type', '')
                meal_name = meal.get('name', meal.get('title', f"Meal {meal.get('meal_id', 'Unknown')}"))
                meal_calories = float(meal.get('kcal', 0))
                
                # Process ingredients
                ingredients   = self._parse_list_field(meal.get('ingredients'))
                instructions  = self._parse_list_field(meal.get('instructions'))
                
                # Create a better description
                summary = meal.get('summary', '')
                description = summary if summary else meal.get('description', '')
                if not description and ingredients:
                    # Create description from ingredients
                    if isinstance(ingredients, list) and len(ingredients) > 0:
                        ingredients_text = ', '.join(str(ing) for ing in ingredients[:3])
                        if len(ingredients) > 3:
                            ingredients_text += f" and {len(ingredients) - 3} more ingredients"
                        description = f"Made with {ingredients_text}"
                    else:
                        description = "Traditional Pakistani ingredients"
                
                # Format for frontend display with all data
                frontend_meal = {
                    'id': meal.get('meal_id', 0),
                    'name': meal_name,
                    'description': description,
                    'portion': meal.get('portion', 1.0),
                    'image': None,  # Can be updated with actual images
                    'time_range': self.get_time_range_for_meal(meal_type),
                    'nutritional_values': {
                        'calories': round(meal_calories),
                        'protein': f"{round(float(meal.get('protein', 0)), 1)}g",
                        'carbs': f"{round(float(meal.get('carbohydrate', 0)), 1)}g",
                        'fat': f"{round(float(meal.get('fat', 0)), 1)}g"
                    },
                    'ingredients': ingredients if isinstance(ingredients, list) else [],
                    'instructions': instructions if isinstance(instructions, list) else [],
                    'nutrition_details': meal.get('nutrition_details', {}),
                    "is_completed": bool(meal.get("isCompleted", 0)),
                }
                
                # Add to appropriate time category
                if meal_type in ['breakfast', 'morning_snack']:
                    frontend_plan['morning'].append(frontend_meal)
                elif meal_type in ['lunch', 'afternoon_snack']:
                    frontend_plan['evening'].append(frontend_meal)
                elif meal_type in ['dinner', 'supper']:
                    frontend_plan['night'].append(frontend_meal)
        
        return frontend_plan
    
    def get_time_range_for_meal(self, meal_type):
        """Get appropriate time range for meal type"""
        time_ranges = {
            'breakfast': '07:00am - 09:00am',
            'morning_snack': '10:00am - 11:00am',
            'lunch': '12:00pm - 02:00pm',
            'afternoon_snack': '03:00pm - 04:00pm',
            'dinner': '06:00pm - 08:00pm',
            'supper': '09:00pm - 10:00pm'
        }
        return time_ranges.get(meal_type, '08:00am - 10:00am')
    
    def get_diet_plans(self, user_id):
        """Get existing diet plans for a user"""
        try:
            conn, cur = self._ensure_conn()
            # Check for existing plan in database
            query = """
            SELECT planId, generatedDate, weekStartDate, weekEndDate, targetCalories
            FROM DietPlan
            WHERE userId = %s
            ORDER BY generatedDate DESC
            LIMIT 1
            """
            cur.execute(query, (user_id,))
            plan_data = cur.fetchone()
            
            if not plan_data:
                # No plan exists, generate a new one
                return self.generate_diet_plan(user_id)
            
            # Check if plan is more than 7 days old
            generated_date = datetime.strptime(str(plan_data['generatedDate']), '%Y-%m-%d %H:%M:%S')
            if (datetime.now() - generated_date).days > 7:
                # Plan is old, generate a new one
                return self.generate_diet_plan(user_id)
            
            # Load plan data
            plan_id = plan_data['planId']
            
            # Check which columns exist in the Meal table
            cur.execute("SHOW COLUMNS FROM Meal")
            columns = [col['Field'] for col in cur.fetchall()]
            
            # Build the query dynamically based on available columns
            base_columns = ['mealId', 'dayOfWeek', 'mealType', 'name', 'description', 'calories', 'protein', 'carbs', 'fat', 'isCompleted']
            additional_columns = []
            
            if 'ingredients' in columns:
                additional_columns.append('ingredients')
            if 'instructions' in columns:
                additional_columns.append('instructions')
            if 'summary' in columns:
                additional_columns.append('summary')
            if 'nutritionDetails' in columns:
                additional_columns.append('nutritionDetails')
            
            all_columns = base_columns + additional_columns
            column_str = ', '.join(all_columns)

            # today       = datetime.now().date()
            if TEST_STATIC_DATE is not None:
                today = TEST_STATIC_DATE
            else:
                today = datetime.now().date() + timedelta(days=TEST_OFFSET_DAYS)
            week_start  = datetime.strptime(str(plan_data['weekStartDate']), '%Y-%m-%d').date()
            day_offset  = (today - week_start).days           # 0‑based
            if day_offset < 0 or day_offset > 6:
                # we’re outside this plan’s range ⇒ make a new plan
                return self.generate_diet_plan(user_id)

            day_of_week = day_offset + 1
            
            # Get meals grouped by time of day
            query = f"""
            SELECT {column_str}
            FROM Meal
            WHERE planId = %s AND dayOfWeek = %s  -- First day of the week
            ORDER BY mealType
            """
            cur.execute(query, (plan_id, day_of_week))
            meals = cur.fetchall()
            
            # Format for frontend
            frontend_plan = {
                'morning': [],
                'evening': [],
                'night': []
            }
            
            for meal in meals:
                meal_type = meal['mealType']
                
                # Process ingredients if available
                ingredients = []
                if 'ingredients' in meal and meal['ingredients']:
                    try:
                        ingredients = self._parse_list_field(meal.get('ingredients'))
                    except:
                        ingredients = meal['ingredients'].split(',') if isinstance(meal['ingredients'], str) else []
                
                # Process instructions if available
                instructions = []
                if 'instructions' in meal and meal['instructions']:
                    try:
                        instructions = self._parse_list_field(meal.get('instructions'))
                    except:
                        instructions = [meal['instructions']] if isinstance(meal['instructions'], str) else []
                
                # Process nutrition details if available
                nutrition_details = {}
                if 'nutritionDetails' in meal and meal['nutritionDetails']:
                    try:
                        nutrition_details = json.loads(meal['nutritionDetails'])
                    except:
                        nutrition_details = {}
                
                # Use summary for description if available
                description = meal.get('summary', meal['description']) or f"A nutritious {meal_type.replace('_', ' ')}"
                
                frontend_meal = {
                    'id': meal['mealId'],
                    'name': meal['name'],
                    'description': description,
                    'image': None,
                    'time_range': self.get_time_range_for_meal(meal_type),
                    'nutritional_values': {
                        'calories': round(meal['calories']),
                        'protein': f"{round(meal['protein'], 1)}g",
                        'carbs': f"{round(meal['carbs'], 1)}g",
                        'fat': f"{round(meal['fat'], 1)}g"
                    },
                    'ingredients': ingredients,
                    'instructions': instructions,
                    'nutrition_details': nutrition_details,
                    'is_completed': bool(meal.get("isCompleted", 0)), 
                }
                
                # Add to appropriate time category
                if meal_type in ['breakfast', 'morning_snack']:
                    frontend_plan['morning'].append(frontend_meal)
                elif meal_type in ['lunch', 'afternoon_snack']:
                    frontend_plan['evening'].append(frontend_meal)
                elif meal_type in ['dinner', 'supper']:
                    frontend_plan['night'].append(frontend_meal)
            
            return make_response({
                "message": "Diet plan retrieved successfully",
                "plan": frontend_plan
            }, 200)
        
        except Exception as e:
            print(f"Error getting diet plans: {str(e)}")
            return make_response({"message": f"Error retrieving diet plan: {str(e)}"}, 500)
    
    def get_weekly_diet_plan(self, user_id):
        """Get full weekly diet plan for a user"""
        try:
            conn, cur = self._ensure_conn()
            # Check for existing plan in database
            query = """
            SELECT planId, generatedDate, weekStartDate, weekEndDate, targetCalories, planData
            FROM DietPlan
            WHERE userId = %s
            ORDER BY generatedDate DESC
            LIMIT 1
            """
            cur.execute(query, (user_id,))
            plan_data = cur.fetchone()
            
            if not plan_data:
                # No plan exists, generate a new one
                return self.generate_diet_plan(user_id)
            
            # Check if plan is more than 7 days old
            generated_date = datetime.strptime(str(plan_data['generatedDate']), '%Y-%m-%d %H:%M:%S')
            if (datetime.now() - generated_date).days > 7:
                # Plan is old, generate a new one
                return self.generate_diet_plan(user_id)
            
            # Load plan data
            plan_id = plan_data['planId']
            
            # Option 1: Return stored JSON plan data
            if plan_data.get('planData'):
                try:
                    weekly_plan = json.loads(plan_data['planData'])
                    return make_response({
                        "message": "Weekly diet plan retrieved successfully",
                        "weeklyPlan": weekly_plan
                    }, 200)
                except:
                    pass
            
            # Option 2: Reconstruct from Meal table (fallback)
            query = """
            SELECT dayOfWeek, mealType, name, description, calories, protein, carbs, fat
            FROM Meal
            WHERE planId = %s
            ORDER BY dayOfWeek, mealType
            """
            cur.execute(query, (plan_id,))
            all_meals = cur.fetchall()
            
            # Group by day
            days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            weekly_plan = []
            
            for day_idx in range(7):
                day_num = day_idx + 1
                day_meals = [m for m in all_meals if m['dayOfWeek'] == day_num]
                
                # Calculate daily totals
                total_energy = sum(meal['calories'] for meal in day_meals)
                total_protein = sum(meal['protein'] for meal in day_meals)
                total_carbs = sum(meal['carbs'] for meal in day_meals)
                total_fat = sum(meal['fat'] for meal in day_meals)
                
                daily_plan = {
                    'day': day_num,
                    'day_name': days_of_week[day_idx],
                    'meals': day_meals,
                    'energy': {
                        'target': plan_data['targetCalories'],
                        'actual': total_energy
                    },
                    'nutrients': {
                        'protein': total_protein,
                        'carbohydrates': total_carbs,
                        'fat': total_fat
                    }
                }
                
                weekly_plan.append(daily_plan)
            
            return make_response({
                "message": "Weekly diet plan retrieved successfully",
                "weeklyPlan": weekly_plan
            }, 200)
        
        except Exception as e:
            print(f"Error getting weekly diet plan: {str(e)}")
            return make_response({"message": f"Error retrieving weekly diet plan: {str(e)}"}, 500)

    def get_meal_details(self, user_id, meal_id):
        """Get detailed information for a specific meal"""
        try:
            conn, cur = self._ensure_conn()
            # Check if the meal belongs to the user and get all details
            query = """
            SELECT m.*, dp.userId
            FROM Meal m
            JOIN DietPlan dp ON m.planId = dp.planId
            WHERE dp.userId = %s AND m.mealId = %s
            """
            cur.execute(query, (user_id, meal_id))
            meal_data = cur.fetchone()
            
            if not meal_data:
                return make_response({"message": "Meal not found or does not belong to user"}, 404)
            
            # Process the meal data
            meal = {
                'id': meal_data['mealId'],
                'name': meal_data['name'],
                'description': meal_data['description'],
                'summary': meal_data.get('summary', ''),
                'time_range': self.get_time_range_for_meal(meal_data['mealType']),
                'meal_type': meal_data['mealType'],
                'portion': meal_data['portion'],
                'nutritional_values': {
                    'calories': round(meal_data['calories']),
                    'protein': f"{round(meal_data['protein'], 1)}g",
                    'carbs': f"{round(meal_data['carbs'], 1)}g",
                    'fat': f"{round(meal_data['fat'], 1)}g"
                },
                'ingredients': [],
                'instructions': [],
                'nutrition_details': {},
                "is_completed": bool(meal_data.get("isCompleted", 0)),
            }
            
            # Process ingredients
            if meal_data.get('ingredients'):
                try:
                    meal['ingredients'] = self._parse_list_field(meal_data.get('ingredients'))
                except:
                    meal['ingredients'] = [meal_data['ingredients']]
            
            # Process instructions
            if meal_data.get('instructions'):
                try:
                    meal['instructions'] = self._parse_list_field(meal_data.get('instructions'))
                except:
                    meal['instructions'] = [meal_data['instructions']]
            
            # Process nutrition details
            if meal_data.get('nutritionDetails'):
                try:
                    meal['nutrition_details'] = json.loads(meal_data['nutritionDetails'])
                except:
                    meal['nutrition_details'] = {}
            
            return make_response({"meal": meal}, 200)
            
        except Exception as e:
            print(f"Error getting meal details: {str(e)}")
            return make_response({"message": f"Error retrieving meal details: {str(e)}"}, 500)

    # def mark_meal_completed(self, user_id, meal_id):
    #     """Mark a specific meal as completed"""
    #     try:
    #         # Check if the meal belongs to the user
    #         query = """
    #         SELECT m.mealId
    #         FROM Meal m
    #         JOIN DietPlan dp ON m.planId = dp.planId
    #         WHERE dp.userId = %s AND m.mealId = %s
    #         """
    #         self.cur.execute(query, (user_id, meal_id))
    #         result = self.cur.fetchone()
            
    #         if not result:
    #             return make_response({"message": "Meal not found or does not belong to user"}, 404)
            
    #         # Update completion status - this would require a separate table
    #         # For now, we'll just return success without actually storing the status
            
    #         return make_response({"message": "Meal marked as completed"}, 200)
        
    #     except Exception as e:
    #         print(f"Error marking meal as completed: {str(e)}")
    #         return make_response({"message": f"Error updating meal status: {str(e)}"}, 500)
    def mark_meal_completed(self, user_id, meal_id):
        """Set Meal.isCompleted 1 (idempotent)."""
        try:
            conn, cur = self._ensure_conn()
            # make sure the meal belongs to the user
            cur.execute(
                """
                SELECT 1
                FROM Meal m
                JOIN DietPlan dp ON m.planId = dp.planId
                WHERE dp.userId = %s AND m.mealId = %s
                """,
                (user_id, meal_id),
            )
            if not cur.fetchone():
                return make_response(
                    {"message": "Meal not found or does not belong to user"}, 404
                )

            # update flag
            cur.execute(
                """
                UPDATE Meal m
                JOIN DietPlan dp ON m.planId = dp.planId
                SET m.isCompleted = 1
                WHERE dp.userId = %s AND m.mealId = %s
                """,
                (user_id, meal_id),
            )

            return make_response({"message": "Meal marked as completed"}, 200)

        except Exception as e:
            print("Error marking meal:", e)
            return make_response({"message": f"Error: {e}"}, 500)
            
    def get_all_diet_plan_meals(self, user_id):
        """Get all meals from the current diet plan grouped by day"""
        try:
            conn, cur = self._ensure_conn()
            
            # Get the latest diet plan
            query = """
            SELECT planId, generatedDate, weekStartDate, weekEndDate, targetCalories
            FROM DietPlan
            WHERE userId = %s
            ORDER BY generatedDate DESC
            LIMIT 1
            """
            cur.execute(query, (user_id,))
            plan_data = cur.fetchone()
            
            if not plan_data:
                return make_response({"message": "No diet plan found"}, 404)
            
            plan_id = plan_data['planId']
            
            # Get all meals grouped by day
            query = """
            SELECT mealId, dayOfWeek, mealType, name, description, portion, 
                calories, protein, carbs, fat, isCompleted, summary
            FROM Meal
            WHERE planId = %s
            ORDER BY dayOfWeek, 
                    FIELD(mealType, 'breakfast', 'morning_snack', 'lunch', 
                        'afternoon_snack', 'dinner', 'supper')
            """
            cur.execute(query, (plan_id,))
            all_meals = cur.fetchall()
            
            # Group meals by day
            days_data = {}
            days_of_week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            for meal in all_meals:
                day_num = meal['dayOfWeek']
                if day_num not in days_data:
                    days_data[day_num] = {
                        'dayNumber': day_num,
                        'dayName': days_of_week[day_num - 1],
                        'meals': []
                    }
                
                meal_info = {
                    'id': meal['mealId'],
                    'name': meal['name'],
                    'mealType': meal['mealType'],
                    'portion': float(meal['portion']),
                    'summary': meal.get('summary', meal['description']),
                    'calories': round(meal['calories']),
                    'protein': round(meal['protein'], 1),
                    'carbs': round(meal['carbs'], 1),
                    'fat': round(meal['fat'], 1),
                    'isCompleted': bool(meal['isCompleted'])
                }
                days_data[day_num]['meals'].append(meal_info)
            
            # Convert to list sorted by day
            result = sorted(days_data.values(), key=lambda x: x['dayNumber'])
            
            return make_response({
                "message": "Diet plan meals retrieved successfully",
                "weekStartDate": str(plan_data['weekStartDate']),
                "weekEndDate": str(plan_data['weekEndDate']),
                "targetCalories": plan_data['targetCalories'],
                "days": result
            }, 200)
            
        except Exception as e:
            print(f"Error getting all diet plan meals: {str(e)}")
            return make_response({"message": f"Error retrieving meals: {str(e)}"}, 500)
        
    # def update_meal_in_db(self, user_id, meal_id, new_meal):
    #     """Update a meal in the database"""
    #     try:
    #         self._ensure_conn()
            
    #         # First verify the meal belongs to the user
    #         self.cur.execute("""
    #             SELECT m.planId
    #             FROM Meal m
    #             JOIN DietPlan dp ON m.planId = dp.planId
    #             WHERE dp.userId = %s AND m.mealId = %s
    #         """, (user_id, meal_id))
            
    #         result = self.cur.fetchone()
    #         if not result:
    #             return False
                
    #         plan_id = result['planId']
            
    #         # Update the meal
    #         self.cur.execute("""
    #             UPDATE Meal
    #             SET name = %s,
    #                 description = %s,
    #                 portion = %s,
    #                 calories = %s,
    #                 protein = %s,
    #                 carbs = %s,
    #                 fat = %s
    #             WHERE mealId = %s
    #         """, (
    #             new_meal.get('title', 'Updated Meal'),
    #             f"Portion: {new_meal.get('portion', 1.0):.2f}",
    #             new_meal.get('portion', 1.0),
    #             float(new_meal.get('kcal', 0)),
    #             float(new_meal.get('protein', 0)),
    #             float(new_meal.get('carbohydrate', 0)),
    #             float(new_meal.get('fat', 0)),
    #             meal_id
    #         ))
            
    #         # Update planData with the new meal info
    #         self.update_plan_data_for_meal(plan_id)
            
    #         return True
            
    #     except Exception as e:
    #         print(f"Error updating meal in DB: {e}")
    #         return False
    # ───────────────────────────────────────────────────────────────
# 1) Replace-or-add  update_meal_in_db
# ───────────────────────────────────────────────────────────────
    def update_meal_in_db(self, user_id: int, meal_id: int, new_meal: dict) -> bool:
        """
        Overwrite a Meal row with the fields in `new_meal`
        and refresh DietPlan.planData.

        new_meal keys expected ───────────────
        title, meal_type, portion, kcal, protein, carbohydrate,
        fat, ingredients (list|str), instructions (list|str),
        summary, nutritionDetails (dict), imageUrl, isCompleted
        """
        try:
            self._ensure_conn()

            # 1. verify ownership and grab planId
            self.cur.execute("""
                SELECT m.planId
                FROM   Meal m
                JOIN   DietPlan dp ON m.planId = dp.planId
                WHERE  dp.userId = %s AND m.mealId = %s
            """, (user_id, meal_id))
            row = self.cur.fetchone()
            if not row:
                print("[update_meal_in_db] Meal not found / not owned")
                return False
            plan_id = row["planId"]

            # 2. discover available columns once
            self.cur.execute("SHOW COLUMNS FROM Meal")
            cols = {c["Field"] for c in self.cur.fetchall()}

            setters, params = [], []

            def add(col, val):
                if col in cols:
                    setters.append(f"{col}=%s")
                    params.append(val)

            add("name",          new_meal.get("title", "Updated Meal"))
            add("mealType",      new_meal.get("meal_type"))
            add("portion",       float(new_meal.get("portion", 1.0)))
            add("calories",      float(new_meal.get("kcal", 0)))
            add("protein",       float(new_meal.get("protein", 0)))
            add("carbs",         float(new_meal.get("carbohydrate", 0)))
            add("fat",           float(new_meal.get("fat", 0)))
            add("isCompleted",   int(new_meal.get("isCompleted", 0)))

            summary = new_meal.get("summary", "")
            add("description",   summary or f"Portion: {new_meal.get('portion',1.0):.2f}")
            add("summary",       summary)

            # lists / dicts → JSON strings
            if "ingredients" in cols:
                ings = new_meal.get("ingredients", [])
                add("ingredients",
                    json.dumps(ings, ensure_ascii=False)
                    if isinstance(ings, (list, dict)) else str(ings))

            if "instructions" in cols:
                instr = new_meal.get("instructions", [])
                add("instructions",
                    json.dumps(instr, ensure_ascii=False)
                    if isinstance(instr, (list, dict)) else str(instr))

            if "nutritionDetails" in cols:
                add("nutritionDetails",
                    json.dumps(new_meal.get("nutritionDetails", {}),
                            ensure_ascii=False))

            if "imageUrl" in cols:
                add("imageUrl", new_meal.get("imageUrl"))

            if not setters:
                print("[update_meal_in_db] Nothing to update")
                return False

            params.append(meal_id)
            sql = f"UPDATE Meal SET {', '.join(setters)} WHERE mealId = %s"
            self.cur.execute(sql, tuple(params))

            # 3. keep planData JSON in sync
            self.update_plan_data_for_meal(plan_id)

            return True

        except Exception as e:
            print(f"[update_meal_in_db] Error: {e}")
            return False


    # ───────────────────────────────────────────────────────────────
    # 2)  N E W   H E L P E R   update_plan_data_for_meal
    # ───────────────────────────────────────────────────────────────
    def update_plan_data_for_meal(self, plan_id: int) -> None:
        """
        Re-create the weekly plan JSON (planData) for a single DietPlan row.
        Safe to call after any Meal INSERT/UPDATE/DELETE.
        """
        try:
            self._ensure_conn()

            # fetch static plan header
            self.cur.execute("""
                SELECT weekStartDate, targetCalories
                FROM   DietPlan
                WHERE  planId = %s
            """, (plan_id,))
            plan_row = self.cur.fetchone()
            if not plan_row:
                print("[update_plan_data_for_meal] Plan not found")
                return

            # fetch all meals belonging to this plan
            self.cur.execute("""
                SELECT dayOfWeek, mealType, name, portion,
                    calories, protein, carbs, fat, summary
                FROM   Meal
                WHERE  planId = %s
                ORDER  BY dayOfWeek,
                        FIELD(mealType,'breakfast','morning_snack',
                                    'lunch','afternoon_snack',
                                    'dinner','supper')
            """, (plan_id,))
            meals = self.cur.fetchall()

            # rebuild weekly JSON
            days_of_week = ['Monday','Tuesday','Wednesday','Thursday',
                            'Friday','Saturday','Sunday']
            weekly_plan = []
            for d in range(1, 8):   # 1-7
                todays = [m for m in meals if m["dayOfWeek"] == d]
                weekly_plan.append({
                    "day"       : d,
                    "day_name"  : days_of_week[d-1],
                    "meals"     : todays,
                    "energy"    : {
                        "target": float(plan_row["targetCalories"]),
                        "actual": sum(m["calories"] for m in todays)
                    },
                    "nutrients" : {
                        "protein"      : sum(m["protein"] for m in todays),
                        "carbohydrates": sum(m["carbs"]   for m in todays),
                        "fat"          : sum(m["fat"]     for m in todays)
                    }
                })

            # save back to DietPlan
            self.cur.execute("""
                UPDATE DietPlan SET planData=%s
                WHERE planId = %s
            """, (json.dumps(weekly_plan, ensure_ascii=False), plan_id))

            print("[update_plan_data_for_meal] planData refreshed")

        except Exception as e:
            print(f"[update_plan_data_for_meal] Error: {e}")

        
