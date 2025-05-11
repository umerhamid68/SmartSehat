import os
import json
import mysql.connector
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from datetime import datetime, timedelta
from flask import make_response, jsonify
from configs.config import dbconfig
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from diet_recommendation.recipe_matcher import generate_intelligent_pakistani_meal_plan

# Path to saved model components
MODEL_DIR = os.path.join(os.path.dirname(__file__), '../models/diet_model')

class VAE(nn.Module):
    def __init__(self, input_dim=10, latent_dim=256, num_meal_classes=None):
        super(VAE, self).__init__()
        self.input_dim = input_dim
        self.latent_dim = latent_dim
        self.num_meal_classes = num_meal_classes
        self.hidden_size = 512

        self.encoder_fc = nn.Linear(input_dim, 256)
        self.fc_mu = nn.Linear(256, latent_dim)
        self.fc_logvar = nn.Linear(256, latent_dim)

        self.latent_to_hidden = nn.Linear(latent_dim, self.hidden_size)

        self.gru = nn.GRU(
            input_size=latent_dim,
            hidden_size=self.hidden_size,
            num_layers=2,
            batch_first=True
        )

        self.meal_classifier = nn.Linear(self.hidden_size, num_meal_classes)
        self.energy_predictor = nn.Linear(self.hidden_size, 1)
        self.nutrient_predictor = nn.Linear(self.hidden_size, 4)

    def encode(self, x):
        x = F.relu(self.encoder_fc(x))
        mu = self.fc_mu(x)
        logvar = self.fc_logvar(x)
        return mu, logvar

    def reparameterize(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z, num_meals=6):
        batch_size = z.size(0)
        h_projected = F.relu(self.latent_to_hidden(z))
        h_0 = h_projected.unsqueeze(0).repeat(2, 1, 1)
        input_seq = torch.zeros(batch_size, num_meals, self.latent_dim).to(z.device)
        output, _ = self.gru(input_seq, h_0)
        meal_logits = self.meal_classifier(output)
        pooled_output = output.mean(dim=1)
        energy = self.energy_predictor(pooled_output)
        nutrients = self.nutrient_predictor(pooled_output)
        return meal_logits, energy, nutrients

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        meal_logits, energy, nutrients = self.decode(z)
        return meal_logits, energy, nutrients, mu, logvar

class MealOptimizer:
    def __init__(self):
        pass

    def adjust_portions(self, meals, predicted_energy, target_energy):
        """
        Implementation of Equations 12-13 from the paper
        Adjusts meal quantities to match target energy intake
        """
        if predicted_energy <= 0:
            return meals
            
        d = (target_energy - predicted_energy) / predicted_energy

        adjusted_meals = []
        for meal in meals:
            original_portion = meal.get('portion', 1.0)
            new_portion = d * original_portion + original_portion
            adjusted_meal = meal.copy()
            adjusted_meal['portion'] = new_portion
            adjusted_meals.append(adjusted_meal)

        return adjusted_meals

class diet_plan_model():
    def __init__(self):
        # Database connection
        self.con = mysql.connector.connect(
            host=dbconfig['host'],
            user=dbconfig['username'],
            password=dbconfig['password'],
            database=dbconfig['database']
        )
        self.con.autocommit = True
        self.cur = self.con.cursor(dictionary=True)
        
        # Load model components
        try:
            self.load_model_components()
        except Exception as e:
            print(f"Error loading model components: {str(e)}")
    
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
        
        # Load recipes
        self.recipe_db = self._load_recipes()
        
    def _load_nutrition_data(self):
        """Load nutrition data from database or CSV"""
        try:
            import pandas as pd
            return pd.read_csv(os.path.join(MODEL_DIR, 'meal_nutrition_complete.csv'))
        except:
            # Fallback to database if file not found
            self.cur.execute("SELECT * FROM meal_nutrition")
            result = self.cur.fetchall()
            import pandas as pd
            return pd.DataFrame(result)
    
    def _load_recipes(self):
        """Load Pakistani recipes from file"""
        try:
            with open(os.path.join(MODEL_DIR, 'analyzed_pakistani_recipes.csv'), 'r') as f:
                import pandas as pd
                return pd.read_csv(f)
        except:
            # Return empty DataFrame if file not found
            import pandas as pd
            return pd.DataFrame()
    
    def calculate_user_metrics(self, user_data):
        """
        Calculate BMR, BMI, PAL and target energy intake based on user data
        
        Formulas:
        - BMR (Mifflin-St Jeor equation):
          Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
          Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
          
        - BMI = weight(kg) / height(m)²
        
        - PAL (Physical Activity Level):
          1.2 = Sedentary (little or no exercise)
          1.375 = Light activity (1-3 days/week)
          1.55 = Moderate activity (3-5 days/week)
          1.725 = Very active (6-7 days/week)
          1.9 = Extra active (very hard exercise or physical job)
          
        - Target Energy Intake = BMR × PAL
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
            
            self.cur.execute(query, values)
            return True
        except Exception as e:
            print(f"Error saving user metrics: {str(e)}")
            return False
    
    def get_user_profile(self, user_id):
        """Get complete user profile data for the VAE model"""
        try:
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
            
            self.cur.execute(query, (user_id,))
            user_data = self.cur.fetchone()
            
            if not user_data:
                return None
                
            # Get disease specific data
            disease_type = user_data.get('diseaseType', '')
            disease_data = None
            
            if disease_type == 'heart':
                self.cur.execute(
                    "SELECT * FROM heartdisease WHERE historyid = %s", 
                    (user_data['historyid'],)
                )
                disease_data = self.cur.fetchone()
            elif disease_type == 'diabetes':
                self.cur.execute(
                    "SELECT * FROM diabetes WHERE historyid = %s", 
                    (user_data['historyid'],)
                )
                disease_data = self.cur.fetchone()
            elif disease_type == 'liver':
                self.cur.execute(
                    "SELECT * FROM fattyliver WHERE historyid = %s", 
                    (user_data['historyid'],)
                )
                disease_data = self.cur.fetchone()
            
            # Create a combined profile
            combined_profile = user_data
            if disease_data:
                combined_profile.update(disease_data)
            
            # If metrics not calculated, calculate them
            if not combined_profile.get('bmr'):
                metrics = self.calculate_user_metrics(combined_profile)
                combined_profile.update(metrics)
                self.save_user_metrics(
                    user_id, 
                    combined_profile['historyid'], 
                    metrics
                )
            
            return combined_profile
        except Exception as e:
            print(f"Error getting user profile: {str(e)}")
            return None
    
    def create_vae_input(self, user_profile):
        """Create input tensor for the VAE model"""
        # Default values
        weight = 70
        height = 170
        bmr = 1500
        age = 35
        bmi = 25
        pal = 1.5
        target_energy = 2000
        cvd = 0
        t2d = 0
        iron_deficiency = 0
        
        # Update with actual values if available
        if user_profile:
            weight = float(user_profile.get('weight', weight))
            height = float(user_profile.get('height', height))
            bmr = float(user_profile.get('bmr', bmr))
            age = int(user_profile.get('age', age))
            bmi = float(user_profile.get('bmi', bmi))
            pal = float(user_profile.get('pal', pal))
            target_energy = float(user_profile.get('targetEnergyIntake', target_energy))
            
            # Set disease flags
            if user_profile.get('diseaseType') == 'heart':
                cvd = 1
            elif user_profile.get('diseaseType') == 'diabetes':
                t2d = 1
            
            # Iron deficiency is assumed 0, could be extended in future
        
        # Normalize values
        normalized_weight = weight / self.norm_params['weight_max']
        normalized_height = height / self.norm_params['height_max']
        normalized_bmr = bmr / self.norm_params['bmr_max']
        normalized_age = age / self.norm_params['age_max']
        normalized_bmi = bmi / self.norm_params['bmi_max']
        normalized_pal = pal / self.norm_params['pal_max']
        normalized_target_energy = target_energy / self.norm_params['energy_max']
        
        # Create input tensor
        user_features = np.array([
            normalized_weight,
            normalized_height,
            normalized_bmr,
            normalized_age,
            normalized_bmi,
            normalized_pal,
            normalized_target_energy,
            cvd,
            t2d,
            iron_deficiency
        ], dtype=np.float32)
        
        return torch.tensor(user_features).unsqueeze(0).to(self.device)
    
    def generate_diet_plan(self, user_id):
        """Generate a personalized diet plan for the user"""
        try:
            # Get user profile and medical history
            user_profile = self.get_user_profile(user_id)
            
            # If we have obtained all necessary user information
            if user_profile:
                # Create input tensor for the VAE model
                user_tensor = self.create_vae_input(user_profile)
                
                # First generate the base meal plan with the VAE model
                base_weekly_plan = self.generate_base_meal_plan(user_tensor, user_profile)
                
                # Then replace with Pakistani recipes
                weekly_plan = generate_intelligent_pakistani_meal_plan(
                    user_profile,
                    base_weekly_plan,
                    target_calories=user_profile['targetEnergyIntake']
                )
                
                # Save the plan to database
                self.save_diet_plan(user_id, user_profile['targetEnergyIntake'], weekly_plan)
                
                # Return the generated plan
                return make_response({
                    "message": "Diet plan generated successfully",
                    "plan": self.format_plan_for_frontend(weekly_plan)
                }, 200)
            
        except Exception as e:
            print(f"Error generating diet plan: {str(e)}")
            return make_response({"message": f"Error generating diet plan: {str(e)}"}, 500)
    
    def save_diet_plan(self, user_id, target_calories, weekly_plan):
        """Save the generated diet plan to database"""
        try:
            # Calculate week dates
            today = datetime.now().date()
            week_start = today
            week_end = today + timedelta(days=6)
            
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
                json.dumps(weekly_plan)
            )
            self.cur.execute(plan_query, plan_values)
            plan_id = self.cur.lastrowid
            
            # Insert individual meals
            for day_idx, day_plan in enumerate(weekly_plan):
                day_of_week = day_idx + 1  # 1-7 for Monday-Sunday
                
                for meal in day_plan['meals']:
                    meal_query = """
                    INSERT INTO Meal 
                    (planId, dayOfWeek, mealType, name, description, calories, protein, carbs, fat)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    meal_name = meal.get('title', f"Meal {meal.get('meal_id', 'Unknown')}")
                    meal_description = f"Portion: {meal.get('portion', 1.0):.2f}"
                    
                    meal_values = (
                        plan_id,
                        day_of_week,
                        meal['meal_type'],
                        meal_name,
                        meal_description,
                        meal.get('kcal', 0) * meal.get('portion', 1.0),
                        meal.get('protein', 0) * meal.get('portion', 1.0),
                        meal.get('carbohydrate', 0) * meal.get('portion', 1.0),
                        meal.get('fat', 0) * meal.get('portion', 1.0)
                    )
                    self.cur.execute(meal_query, meal_values)
            
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
                meal_name = meal.get('title', f"Meal {meal.get('meal_id', 'Unknown')}")
                meal_calories = meal.get('kcal', 0) * meal.get('portion', 1.0)
                
                # Format for frontend display
                frontend_meal = {
                    'id': meal.get('meal_id', 0),
                    'name': meal_name,
                    'description': f"A nutritious {meal_type.replace('_', ' ')}",
                    'image': None,  # Can be updated with actual images
                    'time_range': self.get_time_range_for_meal(meal_type),
                    'nutritional_values': {
                        'calories': round(meal_calories),
                        'protein': f"{round(meal.get('protein', 0) * meal.get('portion', 1.0), 1)}g",
                        'carbs': f"{round(meal.get('carbohydrate', 0) * meal.get('portion', 1.0), 1)}g",
                        'fat': f"{round(meal.get('fat', 0) * meal.get('portion', 1.0), 1)}g"
                    },
                    'is_completed': False
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
            # Check for existing plan in database
            query = """
            SELECT planId, generatedDate, weekStartDate, weekEndDate, targetCalories
            FROM DietPlan
            WHERE userId = %s
            ORDER BY generatedDate DESC
            LIMIT 1
            """
            self.cur.execute(query, (user_id,))
            plan_data = self.cur.fetchone()
            
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
            
            # Get meals grouped by time of day
            query = """
            SELECT mealId, dayOfWeek, mealType, name, description, calories, protein, carbs, fat
            FROM Meal
            WHERE planId = %s AND dayOfWeek = 1  -- First day of the week
            ORDER BY mealType
            """
            self.cur.execute(query, (plan_id,))
            meals = self.cur.fetchall()
            
            # Format for frontend
            frontend_plan = {
                'morning': [],
                'evening': [],
                'night': []
            }
            
            for meal in meals:
                meal_type = meal['mealType']
                
                frontend_meal = {
                    'id': meal['mealId'],
                    'name': meal['name'],
                    'description': meal['description'] or f"A nutritious {meal_type.replace('_', ' ')}",
                    'image': None,  # Can be updated with actual images
                    'time_range': self.get_time_range_for_meal(meal_type),
                    'nutritional_values': {
                        'calories': round(meal['calories']),
                        'protein': f"{round(meal['protein'], 1)}g",
                        'carbs': f"{round(meal['carbs'], 1)}g",
                        'fat': f"{round(meal['fat'], 1)}g"
                    },
                    'is_completed': False  # This could be stored in another table
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
            # Check for existing plan in database
            query = """
            SELECT planId, generatedDate, weekStartDate, weekEndDate, targetCalories, planData
            FROM DietPlan
            WHERE userId = %s
            ORDER BY generatedDate DESC
            LIMIT 1
            """
            self.cur.execute(query, (user_id,))
            plan_data = self.cur.fetchone()
            
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
            
            # Option 2: Reconstruct from Meal table
            query = """
            SELECT dayOfWeek, mealType, name, description, calories, protein, carbs, fat
            FROM Meal
            WHERE planId = %s
            ORDER BY dayOfWeek, mealType
            """
            self.cur.execute(query, (plan_id,))
            all_meals = self.cur.fetchall()
            
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
            
    def mark_meal_completed(self, user_id, meal_id):
        """Mark a specific meal as completed"""
        try:
            # Check if the meal belongs to the user
            query = """
            SELECT m.mealId
            FROM Meal m
            JOIN DietPlan dp ON m.planId = dp.planId
            WHERE dp.userId = %s AND m.mealId = %s
            """
            self.cur.execute(query, (user_id, meal_id))
            result = self.cur.fetchone()
            
            if not result:
                return make_response({"message": "Meal not found or does not belong to user"}, 404)
            
            # Update completion status - this would require a separate table
            # For now, we'll just return success without actually storing the status
            
            return make_response({"message": "Meal marked as completed"}, 200)
        
        except Exception as e:
            print(f"Error marking meal as completed: {str(e)}")
            return make_response({"message": f"Error updating meal status: {str(e)}"}, 500)