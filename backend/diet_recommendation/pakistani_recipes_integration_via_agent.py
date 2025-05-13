# -*- coding: utf-8 -*-
"""
Pakistani Recipes Integration via Agent
Module for generating Pakistani meal plans from VAE outputs
"""

import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import pickle
import json
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import re
from together import Together

# Set up Together AI client
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY", "63269cd907596d9c031586061650084b73002400f24d0e1898d65edca00cc443")
together_client = Together(api_key=TOGETHER_API_KEY)

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Model directory path
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'diet_model')

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
        d = (target_energy - predicted_energy) / predicted_energy if predicted_energy > 0 else 0

        adjusted_meals = []
        for meal in meals:
            original_portion = meal.get('portion', 1.0)

            new_portion = d * original_portion + original_portion

            adjusted_meal = meal.copy()
            adjusted_meal['portion'] = new_portion
            adjusted_meals.append(adjusted_meal)

        return adjusted_meals

def extract_numeric(value_str):
    """
    Extract numeric value from strings like "199 kcal" or "4 g"
    """
    if value_str is None:
        return 0.0

    value_str = str(value_str)

    match = re.search(r'([\d\.]+)', value_str)
    if match:
        return float(match.group(1))
    return 0.0

def select_intelligent_pakistani_recipe(meal_requirements, candidate_recipes, meal_type, health_condition=None):
    """
    Use LLM to select the most appropriate Pakistani recipe based on requirements
    """
    prompt = f"""As a nutrition expert for Pakistani cuisine, select the most appropriate recipe for a {meal_type} for a patient {f"with {health_condition}" if health_condition else "with no specific health condition"}.

The nutritional requirements are:
- Calories: {meal_requirements.get('kcal', 0):.0f} kcal
- Protein: {meal_requirements.get('protein', 0):.1f}g
- Carbohydrates: {meal_requirements.get('carbohydrate', 0):.1f}g
- Fat: {meal_requirements.get('fat', 0):.1f}g

Available recipes:
"""

    for i, recipe in enumerate(candidate_recipes):
        nutrition_text = ""
        if 'nutrition_details' in recipe and recipe['nutrition_details']:
            if isinstance(recipe['nutrition_details'], dict):
                for key, value in recipe['nutrition_details'].items():
                    nutrition_text += f"- {key}: {value}\n"
            else:
                nutrition_text += f"- Additional nutrition info: {recipe['nutrition_details']}\n"

        prompt += f"""
Recipe {i+1}: {recipe['name']}
- Summary: {recipe.get('summary', 'No summary available')}
- Calories: {recipe['calories']:.0f} kcal
- Protein: {recipe['protein']:.1f}g
- Carbs: {recipe['carbs']:.1f}g
- Fat: {recipe['fat']:.1f}g
{nutrition_text if nutrition_text else ""}
- Dish type: {recipe.get('dish_type', 'unknown')}
- T2D suitable: {recipe.get('t2d_suitable', 'unknown')}
- CVD suitable: {recipe.get('cvd_suitable', 'unknown')}
- Healthiness score: {recipe.get('healthiness', 5)}/10
"""

    if health_condition == 't2d':
        prompt += "\nFor Type 2 Diabetes patients, please prioritize low-carb options and avoid sweet dishes, desserts, and high glycemic foods."
    elif health_condition == 'cvd':
        prompt += "\nFor Cardiovascular Disease patients, please prioritize low-fat, low-sodium options and heart-healthy ingredients."

    prompt += f"\n\nSelect the SINGLE most appropriate recipe number for this {meal_type}. Consider both nutritional match and dietary restrictions. Return ONLY the recipe number (1, 2, 3, etc.) and a brief reason."

    try:
        response = together_client.chat.completions.create(
            model="deepseek-ai/DeepSeek-R1",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1
        )

        response_text = response.choices[0].message.content

        number_match = re.search(r'^(\d+)', response_text.strip())
        if number_match:
            selected_num = int(number_match.group(1))
        else:
            number_match = re.search(r'Recipe (\d+)', response_text)
            if number_match:
                selected_num = int(number_match.group(1))
            else:
                selected_num = 1

        selected_idx = selected_num - 1
        if selected_idx < 0 or selected_idx >= len(candidate_recipes):
            selected_idx = 0

        return candidate_recipes[selected_idx]

    except Exception as e:
        print(f"Error during recipe selection: {str(e)}")
        return candidate_recipes[0]

def find_intelligent_pakistani_equivalent(meal, enhanced_recipes_df, meal_type, health_condition=None):
    """
    Find the most appropriate Pakistani recipe for a given meal based on multiple criteria
    """
    matching_recipes = enhanced_recipes_df[enhanced_recipes_df['proper_meal_type'] == meal_type]

    if len(matching_recipes) < 3:
        matching_recipes = enhanced_recipes_df[enhanced_recipes_df['meal_type'] == meal_type]

    if len(matching_recipes) < 3:
        matching_recipes = enhanced_recipes_df

    if health_condition == 't2d':
        suitable_recipes = matching_recipes[matching_recipes['t2d_suitable'] == 'yes']
        if len(suitable_recipes) >= 3:
            matching_recipes = suitable_recipes
    elif health_condition == 'cvd':
        suitable_recipes = matching_recipes[matching_recipes['cvd_suitable'] == 'yes']
        if len(suitable_recipes) >= 3:
            matching_recipes = suitable_recipes

    if meal_type in ['breakfast', 'lunch', 'dinner']:
        non_condiment_recipes = matching_recipes[matching_recipes['dish_type'] != 'condiment']
        if len(non_condiment_recipes) >= 3:
            matching_recipes = non_condiment_recipes

    meal_kcal = meal.get('kcal', 0)
    meal_protein = meal.get('protein', 0)
    meal_carbs = meal.get('carbohydrate', 0)
    meal_fat = meal.get('fat', 0)

    meal_vector = np.array([meal_kcal, meal_protein, meal_carbs, meal_fat]).reshape(1, -1)

    meal_vector_normalized = meal_vector / np.array([500, 50, 100, 50]).reshape(1, -1)

    recipe_vectors = matching_recipes[['calories', 'protein', 'carbs', 'fat']].values
    recipe_vectors_normalized = recipe_vectors / np.array([500, 50, 100, 50]).reshape(1, -1)

    similarities = cosine_similarity(meal_vector_normalized, recipe_vectors_normalized).flatten()

    top_indices = np.argsort(similarities)[-5:][::-1]
    top_recipes = matching_recipes.iloc[top_indices].to_dict('records')

    if not top_recipes:
        if len(enhanced_recipes_df) > 0:
            top_recipes = [enhanced_recipes_df.iloc[0].to_dict()]
        else:
            return {
                'name': f"Generic {meal_type.capitalize()}",
                'meal_type': meal_type,
                'original_kcal': meal_kcal,
                'original_protein': meal_protein,
                'original_carbs': meal_carbs,
                'original_fat': meal_fat,
                'portion': 1.0,
                'kcal': meal_kcal,
                'protein': meal_protein,
                'carbohydrate': meal_carbs,
                'fat': meal_fat,
                'ingredients': [],
                'instructions': [],
                'summary': f"A balanced {meal_type} meal."
            }

    selected_recipe = select_intelligent_pakistani_recipe(
        meal_requirements=meal,
        candidate_recipes=top_recipes,
        meal_type=meal_type,
        health_condition=health_condition
    )

    portion_factor = meal_kcal / selected_recipe['calories'] if selected_recipe['calories'] > 0 else 1.0

    nutrition_details = selected_recipe.get('nutrition_details', {})
    if not isinstance(nutrition_details, dict):
        try:
            if isinstance(nutrition_details, str) and nutrition_details.startswith('{') and nutrition_details.endswith('}'):
                import ast
                nutrition_details = ast.literal_eval(nutrition_details)
            else:
                nutrition_details = {'additional_info': nutrition_details}
        except:
            nutrition_details = {}

    pakistani_equivalent = {
        'name': selected_recipe['name'],
        'meal_type': meal_type,
        'original_kcal': selected_recipe['calories'],
        'original_protein': selected_recipe['protein'],
        'original_carbs': selected_recipe['carbs'],
        'original_fat': selected_recipe['fat'],
        'portion': portion_factor,
        'kcal': selected_recipe['calories'] * portion_factor,
        'protein': selected_recipe['protein'] * portion_factor,
        'carbohydrate': selected_recipe['carbs'] * portion_factor,
        'fat': selected_recipe['fat'] * portion_factor,
        'ingredients': selected_recipe.get('ingredients', []),
        'instructions': selected_recipe.get('instructions', []),
        'summary': selected_recipe.get('summary', ''),
        'nutrition_details': nutrition_details
    }

    return pakistani_equivalent

def generate_intelligent_pakistani_meal_plan(vae_meal_plan, enhanced_recipes_df, health_condition=None):
    """
    Convert a VAE-generated meal plan to use appropriate Pakistani recipes with intelligent selection
    """
    pakistani_meal_plan = []

    for day in vae_meal_plan:
        day_plan = {
            'day': day['day'],
            'day_name': day['day_name'],
            'energy': day['energy'],
            'nutrients': day['nutrients'],
            'meals': []
        }

        for meal in day['meals']:
            meal_type = meal['meal_type']
            pakistani_equivalent = find_intelligent_pakistani_equivalent(
                meal, enhanced_recipes_df, meal_type, health_condition
            )
            day_plan['meals'].append(pakistani_equivalent)

        total_kcal = sum(meal['kcal'] for meal in day_plan['meals'])
        total_protein = sum(meal['protein'] for meal in day_plan['meals'])
        total_carbs = sum(meal['carbohydrate'] for meal in day_plan['meals'])
        total_fat = sum(meal['fat'] for meal in day_plan['meals'])

        day_plan['energy']['actual'] = total_kcal
        day_plan['nutrients'] = {
            'protein': total_protein,
            'carbohydrates': total_carbs,
            'fat': total_fat
        }

        pakistani_meal_plan.append(day_plan)

    return pakistani_meal_plan

def generate_meal_plan(user_profile, model, meal_nutrition_df, meal_optimizer, norm_params, idx_to_meal_id):
    """
    Generate a weekly meal plan for a given user profile using the VAE model
    """
    user_features = np.array([
        user_profile['weight'] / norm_params['weight_max'],
        user_profile['height'] / norm_params['height_max'],
        user_profile['bmr'] / norm_params['bmr_max'],
        user_profile['age'] / norm_params['age_max'],
        user_profile['bmi'] / norm_params['bmi_max'],
        user_profile['pal'] / norm_params['pal_max'],
        user_profile['target_energy_intake'] / norm_params['energy_max'],
        user_profile['cvd'],
        user_profile['t2d'],
        user_profile['iron_deficiency']
    ], dtype=np.float32)

    user_tensor = torch.tensor(user_features).unsqueeze(0).to(device)

    model.eval()
    weekly_plan = []
    meal_types = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper']

    used_meals = set()

    for day in range(7):
        with torch.no_grad():
            mu, logvar = model.encode(user_tensor)
            z = model.reparameterize(mu, logvar)

            meal_logits, energy, nutrients = model.decode(z)

            meals = []
            for meal_idx in range(6):
                meal_probs = F.softmax(meal_logits[0, meal_idx], dim=0)

                top_meal_indices = torch.topk(meal_probs, k=min(5, len(meal_probs))).indices.cpu().numpy()

                meal_class_idx = None
                for idx in top_meal_indices:
                    if idx not in used_meals:
                        meal_class_idx = idx
                        used_meals.add(idx)
                        break

                if meal_class_idx is None:
                    meal_class_idx = top_meal_indices[0]

                meal_id = idx_to_meal_id[meal_class_idx]

                meal_row = meal_nutrition_df[meal_nutrition_df['meal_id'] == meal_id]
                if not meal_row.empty:
                    meal_data = meal_row.iloc[0].to_dict()
                    meal_data['meal_type'] = meal_types[meal_idx]
                    meal_data['portion'] = 1.0
                    meals.append(meal_data)
                else:
                    meals.append({
                        'meal_id': meal_id,
                        'meal_type': meal_types[meal_idx],
                        'title': f"Meal {meal_id}",
                        'kcal': 0,
                        'protein': 0,
                        'carbohydrate': 0,
                        'fat': 0,
                        'portion': 1.0
                    })

            total_energy_before = sum(meal.get('kcal', 0) for meal in meals)

            if total_energy_before > 0:
                target_energy = user_profile['target_energy_intake']
                optimized_meals = meal_optimizer.adjust_portions(
                    meals, total_energy_before, target_energy
                )
            else:
                optimized_meals = meals

            total_energy = sum(meal.get('kcal', 0) * meal.get('portion', 1.0) for meal in optimized_meals)
            total_protein = sum(meal.get('protein', 0) * meal.get('portion', 1.0) for meal in optimized_meals)
            total_carbs = sum(meal.get('carbohydrate', 0) * meal.get('portion', 1.0) for meal in optimized_meals)
            total_fat = sum(meal.get('fat', 0) * meal.get('portion', 1.0) for meal in optimized_meals)

            daily_plan = {
                'day': day + 1,
                'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day],
                'meals': optimized_meals,
                'energy': {
                    'target': user_profile['target_energy_intake'],
                    'actual': total_energy
                },
                'nutrients': {
                    'protein': total_protein,
                    'carbohydrates': total_carbs,
                    'fat': total_fat
                }
            }

            weekly_plan.append(daily_plan)

    return weekly_plan

def generate_smart_sehat_meal_plan(user_profile, model, meal_nutrition_df, meal_optimizer, norm_params):
    """
    Generate an intelligently filtered Pakistani meal plan for a user with specific health condition
    """
    health_condition = None
    if user_profile['t2d'] == 1:
        health_condition = 't2d'
    elif user_profile['cvd'] == 1:
        health_condition = 'cvd'

    print(f"Generating meal plan for user with {health_condition if health_condition else 'no specific health condition'}...")

    # Load analyzed Pakistani recipes
    analyzed_recipes_path = os.path.join(MODEL_DIR, "analyzed_pakistani_recipes.csv")
    if os.path.exists(analyzed_recipes_path):
        print(f"Loading pre-analyzed recipes from {analyzed_recipes_path}")
        enhanced_recipes_df = pd.read_csv(analyzed_recipes_path)

        def parse_nutrition_details(details):
            if pd.isna(details) or details == '':
                return {}

            try:
                if isinstance(details, str):
                    if details.startswith('{') and details.endswith('}'):
                        import ast
                        return ast.literal_eval(details)
                    return details
                return details
            except:
                return {}

        if 'nutrition_details' in enhanced_recipes_df.columns:
            enhanced_recipes_df['nutrition_details'] = enhanced_recipes_df['nutrition_details'].apply(parse_nutrition_details)
    else:
        print(f"ERROR: Pre-analyzed recipes file {analyzed_recipes_path} not found. Run recipe_analysis.ipynb first.")
        return None

    # Load meal mappings
    with open(os.path.join(MODEL_DIR, 'meal_mappings.pkl'), 'rb') as f:
        mappings = pickle.load(f)
        idx_to_meal_id = mappings['idx_to_meal_id']

    print("Generating base meal plan with VAE model...")
    vae_meal_plan = generate_meal_plan(user_profile, model, meal_nutrition_df, meal_optimizer, norm_params, idx_to_meal_id)

    print("Converting to intelligent Pakistani meal plan...")
    pakistani_meal_plan = generate_intelligent_pakistani_meal_plan(vae_meal_plan, enhanced_recipes_df, health_condition)

    return pakistani_meal_plan