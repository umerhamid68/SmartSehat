from flask import jsonify
import json
import os
from configs.config import dbconfig
from datetime import datetime

class diet_model():
    def __init__(self):
        self.con = dbconfig()
        self.cur = self.con.cursor(dictionary=True)
        
        # Load sample diet plans from JSON file
        self.sample_data_path = os.path.join(os.path.dirname(__file__), '../data/diet_plans.json')
        self.load_sample_data()
    
    def load_sample_data(self):
        """Load sample diet plans from JSON file if available"""
        try:
            if os.path.exists(self.sample_data_path):
                with open(self.sample_data_path, 'r') as f:
                    self.sample_diet_plans = json.load(f)
            else:
                # Create default sample data if file doesn't exist
                self.sample_diet_plans = self.create_default_sample_data()
                os.makedirs(os.path.dirname(self.sample_data_path), exist_ok=True)
                with open(self.sample_data_path, 'w') as f:
                    json.dump(self.sample_diet_plans, f, indent=4)
        except Exception as e:
            print(f"Error loading sample data: {str(e)}")
            self.sample_diet_plans = self.create_default_sample_data()
    
    def create_default_sample_data(self):
        """Create default sample diet plan data"""
        return {
            "users": {
                "1": {
                    "morning": [
                        {
                            "id": 1,
                            "name": "Healthy Breakfast Sandwich",
                            "description": "One Sandwich with Half Boiled Egg",
                            "image": "sandwich.png",
                            "time_range": "08:00am - 11:00am",
                            "nutritional_values": {
                                "calories": 350,
                                "protein": "15g",
                                "carbs": "30g",
                                "fat": "12g"
                            },
                            "ingredients": [
                                "Whole grain bread",
                                "Half boiled egg",
                                "Avocado",
                                "Spinach",
                                "Tomato slice"
                            ],
                            "is_completed": False,
                            "tags": ["diabetes-friendly", "heart-healthy"]
                        },
                        {
                            "id": 2,
                            "name": "Vegetable Oatmeal Bowl",
                            "description": "Oatmeal with Mixed Vegetables and Herbs",
                            "image": "oatmeal.png",
                            "time_range": "07:00am - 09:00am",
                            "nutritional_values": {
                                "calories": 280,
                                "protein": "8g",
                                "carbs": "45g",
                                "fat": "6g"
                            },
                            "ingredients": [
                                "Steel-cut oats",
                                "Diced carrots",
                                "Spinach",
                                "Bell peppers",
                                "Parsley",
                                "Olive oil"
                            ],
                            "is_completed": False,
                            "tags": ["low-sodium", "cholesterol-friendly"]
                        }
                    ],
                    "evening": [
                        {
                            "id": 3,
                            "name": "Grilled Chicken Salad",
                            "description": "Grilled Chicken with Fresh Vegetables",
                            "image": "chicken_salad.png",
                            "time_range": "01:00pm - 03:00pm",
                            "nutritional_values": {
                                "calories": 320,
                                "protein": "28g",
                                "carbs": "15g",
                                "fat": "14g"
                            },
                            "ingredients": [
                                "Grilled chicken breast",
                                "Mixed greens",
                                "Cherry tomatoes",
                                "Cucumber",
                                "Olive oil dressing"
                            ],
                            "is_completed": False,
                            "tags": ["high-protein", "low-carb"]
                        }
                    ],
                    "night": [
                        {
                            "id": 4,
                            "name": "Steamed Fish with Vegetables",
                            "description": "Lightly Seasoned Steamed Fish with Seasonal Vegetables",
                            "image": "steamed_fish.png",
                            "time_range": "07:00pm - 09:00pm",
                            "nutritional_values": {
                                "calories": 280,
                                "protein": "32g",
                                "carbs": "12g",
                                "fat": "8g"
                            },
                            "ingredients": [
                                "White fish fillet",
                                "Broccoli",
                                "Carrots",
                                "Zucchini",
                                "Lemon",
                                "Herbs"
                            ],
                            "is_completed": False,
                            "tags": ["heart-healthy", "low-fat"]
                        }
                    ]
                }
            }
        }
    
    def get_user_diet_plans(self, user_id, meal_time=None):
        """
        Get diet plans for a specific user, optionally filtered by meal time
        """
        try:
            # In a production environment, you'd query the database here
            # For now, we'll use our sample data
            if str(user_id) in self.sample_diet_plans["users"]:
                user_plans = self.sample_diet_plans["users"][str(user_id)]
                
                if meal_time and meal_time in user_plans:
                    return {"plans": user_plans[meal_time]}, 200
                elif not meal_time:
                    # Return all meal times
                    return {"plans": user_plans}, 200
                else:
                    return {"error": f"No plans found for meal time: {meal_time}"}, 404
            else:
                return {"error": "User not found"}, 404
                
        except Exception as e:
            return {"error": str(e)}, 500
    
    def get_diet_plan_details(self, plan_id, user_id):
        """
        Get detailed information for a specific diet plan
        """
        try:
            # In a production environment, you'd query the database here
            # For now, we'll search through our sample data
            if str(user_id) in self.sample_diet_plans["users"]:
                user_plans = self.sample_diet_plans["users"][str(user_id)]
                
                for meal_time, plans in user_plans.items():
                    for plan in plans:
                        if plan["id"] == int(plan_id):
                            return {"plan": plan}, 200
                
                return {"error": "Plan not found"}, 404
            else:
                return {"error": "User not found"}, 404
                
        except Exception as e:
            return {"error": str(e)}, 500
    
    def mark_plan_completed(self, plan_id, user_id, is_completed):
        """
        Mark a diet plan as completed/uncompleted
        """
        try:
            # In a production environment, you'd update the database here
            # For now, we'll update our sample data
            if str(user_id) in self.sample_diet_plans["users"]:
                user_plans = self.sample_diet_plans["users"][str(user_id)]
                
                for meal_time, plans in user_plans.items():
                    for plan in plans:
                        if plan["id"] == int(plan_id):
                            plan["is_completed"] = is_completed
                            # Save the updated data to our JSON file
                            with open(self.sample_data_path, 'w') as f:
                                json.dump(self.sample_diet_plans, f, indent=4)
                            return {"success": True, "plan": plan}, 200
                
                return {"error": "Plan not found"}, 404
            else:
                return {"error": "User not found"}, 404
                
        except Exception as e:
            return {"error": str(e)}, 500