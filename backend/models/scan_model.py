import base64
import json
import numpy as np
import mysql.connector
from flask import jsonify
from datetime import datetime
from together import Together
from sentence_transformers import SentenceTransformer
import os

from configs.config import dbconfig

class scan_model():
    def __init__(self):
        self.client = Together(api_key="63269cd907596d9c031586061650084b73002400f24d0e1898d65edca00cc443")

        self.con = mysql.connector.connect(
            host=dbconfig['host'],
            user=dbconfig['username'],
            password=dbconfig['password'],
            database=dbconfig['database']
        )
        self.con.autocommit = True
        self.cur = self.con.cursor(dictionary=True)

        with open("./system_prompt.txt", "r") as file:
            self.system_prompt = file.read()
        with open("./system_prompt_2.txt", "r") as file:
            self.system_prompt_2 = file.read()


        with open("./recipes.json", "r", encoding="utf-8") as file:
            self.dataset = json.load(file)
        self.recipe_names = [rec["name"] for rec in self.dataset]
        self.recipe_name_embeddings = np.load("recipe_embeddings.npy")

        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')

    def encode_image_bytes(self, image_bytes):
        return base64.b64encode(image_bytes).decode('utf-8')

    def validate_json_response(self, response_text):
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            return None

    def analyze_image_with_gpt(self, image_bytes, prompt):
        try:
            base64_image = self.encode_image_bytes(image_bytes)
            
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                            }
                        ]
                    }
                ],
                max_tokens=1024,
                temperature=0.1,
                top_p=0.7,
                top_k=50,
                repetition_penalty=0,
                truncate=130560,
                stream=False
            )
            
            response_text = response.choices[0].message.content
            print("here")
            print(response_text)
            validated_response = self.validate_json_response(response_text)
            if validated_response:
                return validated_response, 200
            else:
                return {"error": "Invalid JSON response from server"}, 500
                
        except Exception as e:
            return {"error": str(e)}, 500

    # Update the find_closest_recipe_semantic method to return top 3 matches
    def find_closest_recipe_semantic(self, meal_name, top_n=3, threshold=0.50):
        query_vec = self.sentence_model.encode([meal_name], convert_to_numpy=True)[0]
        similarities = []
        for emb in self.recipe_name_embeddings:
            sim = np.dot(query_vec, emb) / (np.linalg.norm(query_vec)*np.linalg.norm(emb))
            similarities.append(sim)
        
        # Get indices of top N matches
        top_indices = np.argsort(similarities)[-top_n:][::-1]
        
        # Return top matches if they meet the threshold
        top_matches = []
        for idx in top_indices:
            if similarities[idx] >= threshold:
                top_matches.append({
                    "recipe": self.dataset[idx],
                    "similarity": float(similarities[idx])
                })
        
        return top_matches if top_matches else None
    # -----------------------------------------------------------------------
    # Insert a new scan record into the FoodScan table
    # -----------------------------------------------------------------------
    def insert_food_scan(self, user_id, scan_result_dict):
        """
        Insert a row in FoodScan and return the newly created scanId.
        - scan_result_dict can be any JSON that you want to store, or a string.
        """
        scan_date = datetime.now().strftime("%Y-%m-%d")
        scan_result_str = json.dumps(scan_result_dict)  # store result as JSON in text

        insert_query = """
        INSERT INTO FoodScan (userId, scanDate, scanResult)
        VALUES (%s, %s, %s)
        """
        self.cur.execute(insert_query, (user_id, scan_date, scan_result_str))
        return self.cur.lastrowid

    # -----------------------------------------------------------------------
    # Insert a new food item record into the FoodItem table
    # -----------------------------------------------------------------------
    def insert_food_item(self, scan_id, name, ingredients, calories, nutrition_value, safety_level):
        """
        Insert a row in FoodItem table.
        """
        insert_query = """
        INSERT INTO FoodItem (scanId, name, ingredients, calories, nutritionValue, safetyLevel)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        self.cur.execute(insert_query, (
            scan_id,
            name,
            ingredients,
            calories,
            nutrition_value,
            safety_level
        ))

    # -----------------------------------------------------------------------
    # SCAN: Meal
    # -----------------------------------------------------------------------
    def scan_meal_model(self, image_file, userId=None):
        # 1) Perform GPT analysis
        image_bytes = image_file.read()
        prompt = """Here is an image of a meal. Analyze this meal and provide the following information in JSON format:
        {
        "meal": {
            "name": "string"
        }
        }
        IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION IN THE RESPONSE. KEEP IT PURELY JSON. IF NO RELEVENT MEAL IS FOUND, RETURN RELEVENT ERROR RESPONSE.
        """
        gpt_result, status_code = self.analyze_image_with_gpt(image_bytes, prompt)
        
        # 2) If GPT analysis was successful, store in DB and find similar recipes
        if status_code == 200 and 'meal' in gpt_result and 'name' in gpt_result['meal']:
            meal_name = gpt_result['meal']['name']
            
            # Find top 3 similar recipes
            similar_recipes = self.find_closest_recipe_semantic(meal_name, top_n=3)
            
            # Add similar recipes to the result
            gpt_result['similarRecipes'] = similar_recipes if similar_recipes else []
            
            # Insert into FoodScan, store the raw GPT result
            scan_id = self.insert_food_scan(userId, gpt_result)
            
            # Return final to controller
            return {
                "scanId": scan_id,
                "gptResult": gpt_result
            }, 200
        else:
            return gpt_result, status_code  # error scenario

    
    # -----------------------------------------------------------------------
    # SCAN: Product
    # -----------------------------------------------------------------------
    def scan_product_model(self, image_file, userId=None):
        image_bytes = image_file.read()
        prompt = """Here is an image of product ingredients list. Provide the following in JSON:
        {
           "ingredients": ["string", "string"]
        }
        IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION. KEEP IT PURE JSON. IF NO RELEVENT INGREDIENTS ARE FOUND, RETURN RELEVENT ERROR RESPONSE.
        """
        gpt_result, status_code = self.analyze_image_with_gpt(image_bytes, prompt)

        if status_code == 200:
            scan_id = self.insert_food_scan(userId, gpt_result)
            return {
            "scanId": scan_id,
            "gptResult": gpt_result
        }, 200
        else:
            return gpt_result, status_code

    # -----------------------------------------------------------------------
    # SCAN: Nutrition
    # -----------------------------------------------------------------------
    def scan_nutrition_model(self, image_file, userId=None):
        image_bytes = image_file.read()
        prompt = """Here is an image of product nutrition label. Provide the following in JSON format:
        {
            "nutrition": {
                "servingSize": "string",
                "calories": "string",
                "totalFat": "string"
                "Saturated Fat": "string",
                "Trans Fat": "string",
                "Cholesterol": "string",
                "Sodium": "string",
                "Total Carbohydrate": "string",
                "Protein": "string",
                ...any additional keys...
            }
        }
        IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION IN THE RESPONSE. KEEP IT PURELY JSON. IF NO RELEVENT NUTRITIONAL VALUES ARE FOUND, RETURN RELEVENT ERROR RESPONSE.
        """
        gpt_result, status_code = self.analyze_image_with_gpt(image_bytes, prompt)
        if status_code == 200:
            scan_id = self.insert_food_scan(userId, gpt_result)
            return {
            "scanId": scan_id,
            "gptResult": gpt_result
        }, 200
        else:
            return gpt_result, status_code

    # -----------------------------------------------------------------------
    # PREDICT: Product Safety
    # -----------------------------------------------------------------------
    # def predict_product_safety_model(self, data):
    #     user_id = data.get('userId')
    #     product_name = data.get('productName', 'Unknown Product')
    #     ingredients_list = data.get('ingredients', [])
    #     nutrition = data.get('nutrition', {})
    #     calories = data.get('calories', '0')

    #     # 1) GPT call
    #     prompt = f"""Analyze this product data and provide safety assessment in JSON format:
    #     Product: {product_name}
    #     Ingredients: {', '.join(ingredients_list)}
    #     Nutrition: {json.dumps(nutrition)}
    #     Calories: {calories}

    #     Response format:
    #     {{
    #         "safetyScore": "number 1-10",
    #         "safetyRating": "safe/unsafe"
    #     }}
    #     IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION. KEEP IT PURELY JSON.
    #     """
    #     response = self.client.chat.completions.create(
    #         model="meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    #         messages=[
    #             {"role": "system", "content": self.system_prompt_2},
    #             {"role": "user", "content": prompt}
    #         ],
    #         max_tokens=512,
    #         temperature=0.1,
    #         top_p=0.7,
    #         top_k=50,
    #         repetition_penalty=0,
    #         truncate=130560,
    #         stream=False
    #     )

    #     result = self.validate_json_response(response.choices[0].message.content)
    #     if not result:
    #         return jsonify({"error": "Invalid JSON response from GPT"}), 500

    #     # 2) Insert a row in FoodScan with the raw GPT result
    #     scan_result_dict = {
    #         "scanType": "product",
    #         "productName": product_name,
    #         "ingredients": ingredients_list,
    #         "calories": calories,
    #         "gptSafetyResult": result
    #     }
    #     scan_id = self.insert_food_scan(user_id, scan_result_dict)

    #     # 3) Insert row in FoodItem
    #     #   - name = productName
    #     #   - ingredients = newline-joined or JSON
    #     #   - nutritionValue = str(nutrition)
    #     #   - safetyLevel = result["safetyRating"]
    #     #   - calories = int(calories) if convertible
    #     item_ingredients_str = "\n".join(ingredients_list)
    #     item_calories = 0
    #     try:
    #         item_calories = int(calories)
    #     except:
    #         pass
    #     item_safety_level = result.get("safetyRating", "unknown")
    #     item_nutrition_value = json.dumps(nutrition)

    #     self.insert_food_item(
    #         scan_id=scan_id,
    #         name=product_name,
    #         ingredients=item_ingredients_str,
    #         calories=item_calories,
    #         nutrition_value=item_nutrition_value,
    #         safety_level=item_safety_level
    #     )

    #     return jsonify(result), 200

    # # -----------------------------------------------------------------------
    # # PREDICT: Meal Safety
    # # -----------------------------------------------------------------------
    # def predict_meal_safety_model(self, data):
    #     user_id = data.get('userId')
    #     meal_name = data.get('mealName', 'Unknown Meal')

    #     # 1) Semantic search
    #     matched_recipe = self.find_closest_recipe_semantic(meal_name)
    #     if not matched_recipe:
    #         return jsonify({"error": "No matching recipe found via semantic search"}), 404

    #     recipe_nutrition = matched_recipe.get("nutrition", {})
    #     if not recipe_nutrition:
    #         return jsonify({"error": "No nutrition data in matched recipe"}), 404

    #     # 2) GPT prompt
    #     prompt = f"""Analyze this meal and provide safety assessment in JSON format:
    #     Meal: {matched_recipe["name"]}
    #     Nutrition: {json.dumps(recipe_nutrition)}
    #     {{
    #         "safetyScore": "number 1-10",
    #         "safetyRating": "safe/unsafe"
    #     }}
    #     IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION IN THE RESPONSE. KEEP IT PURELY JSON.
    #     """
    #     response = self.client.chat.completions.create(
    #         model="meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
    #         messages=[
    #             {"role": "system", "content": self.system_prompt_2},
    #             {"role": "user", "content": prompt}
    #         ],
    #         max_tokens=512,
    #         temperature=0.1,
    #         top_p=0.7,
    #         top_k=50,
    #         repetition_penalty=0,
    #         truncate=130560,
    #         stream=False
    #     )

    #     result = self.validate_json_response(response.choices[0].message.content)
    #     if not result:
    #         return jsonify({"error": "Invalid JSON response from GPT"}), 500

    #     # 3) Insert a row in FoodScan
    #     scan_result_dict = {
    #         "scanType": "meal",
    #         "mealName": matched_recipe["name"],
    #         "gptSafetyResult": result
    #     }
    #     scan_id = self.insert_food_scan(user_id, scan_result_dict)

    #     # 4) Insert a row in FoodItem
    #     # e.g. name = matched_recipe["name"], ingredients?
    #     # For a meal, we might do: ingredients = "No direct ingredients" or
    #     # if matched_recipe includes ingredients
    #     item_ingredients_str = ""
    #     if "ingredients" in matched_recipe:
    #         ing_list = [ing["name"] for ing in matched_recipe["ingredients"]]
    #         item_ingredients_str = "\n".join(ing_list)

    #     item_calories = 0
    #     # If the recipe nutrition has something like "Calories": "199 kcal"
    #     # we can parse out the numeric portion
    #     if "Calories" in recipe_nutrition:
    #         try:
    #             item_calories = int(recipe_nutrition["Calories"].split()[0])  # naive parse
    #         except:
    #             pass

    #     # nutritionValue = JSON
    #     item_nutrition_value = json.dumps(recipe_nutrition)
    #     item_safety_level = result.get("safetyRating", "unknown")

    #     self.insert_food_item(
    #         scan_id=scan_id,
    #         name=matched_recipe["name"],
    #         ingredients=item_ingredients_str,
    #         calories=item_calories,
    #         nutrition_value=item_nutrition_value,
    #         safety_level=item_safety_level
    #     )

    #     result["nutrition"] = recipe_nutrition
    #     return jsonify(result), 200


    def predict_meal_safety_model(self, data):
        """
        This method now expects the selected recipe name directly.
        """
        user_id = data.get('userId')
        meal_name = data.get('mealName', 'Unknown Meal')
        recipe_index = data.get('recipeIndex', -1)  # New parameter
        scan_id = data.get('scanId')
        
        if not scan_id:
            return jsonify({"error": "No scanId provided"}), 400
            
        # First, retrieve the saved scan result
        try:
            query = "SELECT scanResult FROM FoodScan WHERE scanId = %s AND userId = %s"
            self.cur.execute(query, (scan_id, user_id))
            result = self.cur.fetchone()
            
            if not result:
                return jsonify({"error": "Scan not found"}), 404
                
            scan_result = json.loads(result['scanResult'])
            
            # Get the selected recipe from the similarRecipes if specified
            selected_recipe = None
            
            if recipe_index != -1 and 'similarRecipes' in scan_result:
                try:
                    recipe_index = int(recipe_index)
                    if 0 <= recipe_index < len(scan_result['similarRecipes']):
                        selected_recipe = scan_result['similarRecipes'][recipe_index]['recipe']
                except (ValueError, IndexError):
                    pass
            
            # If no recipe selected or selection invalid, fall back to semantic search
            if not selected_recipe:
                matched_recipe = self.find_closest_recipe_semantic(meal_name, top_n=1)[0]['recipe'] if self.find_closest_recipe_semantic(meal_name, top_n=1) else None
                if not matched_recipe:
                    return jsonify({"error": "No matching recipe found"}), 404
            else:
                matched_recipe = selected_recipe
            
            recipe_nutrition = matched_recipe.get("nutrition", {})
            if not recipe_nutrition:
                return jsonify({"error": "No nutrition data in matched recipe"}), 404

            # Perform safety analysis with GPT
            prompt = f"""Analyze this meal and provide safety assessment in JSON format:
            Meal: {matched_recipe["name"]}
            Nutrition: {json.dumps(recipe_nutrition)}
            {{
                "safetyScore": "number 1-10",
                "safetyRating": "safe/unsafe"
            }}
            IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION IN THE RESPONSE. KEEP IT PURELY JSON.

            Note: Obviously high sodium and high sugar content are bad for health. So items with such things will rank very low as compared to others.
            """
            response = self.client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
                messages=[
                    {"role": "system", "content": self.system_prompt_2},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=512,
                temperature=0.1,
                top_p=0.7,
                top_k=50,
                repetition_penalty=0,
                stream=False
            )

            result = self.validate_json_response(response.choices[0].message.content)
            if not result:
                return jsonify({"error": "Invalid JSON response from GPT"}), 500

            # Update scan result
            final_scan_result = {
                "scanType": "meal",
                "mealName": matched_recipe["name"],
                "gptSafetyResult": result
            }
            updated_scan_result_str = json.dumps(final_scan_result)

            update_query = """
            UPDATE FoodScan
            SET scanResult = %s
            WHERE scanId = %s AND userId = %s
            """
            self.cur.execute(update_query, (updated_scan_result_str, scan_id, user_id))

            # Insert food item
            item_ingredients_str = ""
            if "ingredients" in matched_recipe:
                ing_list = [ing["name"] for ing in matched_recipe["ingredients"]]
                item_ingredients_str = "\n".join(ing_list)

            item_calories = 0
            if "Calories" in recipe_nutrition:
                try:
                    item_calories = int(recipe_nutrition["Calories"].split()[0])  # naive parse
                except:
                    pass

            item_nutrition_value = json.dumps(recipe_nutrition)
            item_safety_level = result.get("safetyRating", "unknown")

            self.insert_food_item(
                scan_id=scan_id,
                name=matched_recipe["name"],
                ingredients=item_ingredients_str,
                calories=item_calories,
                nutrition_value=item_nutrition_value,
                safety_level=item_safety_level
            )

            result["nutrition"] = recipe_nutrition
            return jsonify(result), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Similarly for product safety:
    def predict_product_safety_model(self, data):
        user_id = data.get('userId')
        product_name = data.get('productName', 'Unknown Product')
        ingredients_list = data.get('ingredients', [])
        nutrition = data.get('nutrition', {})
        calories = data.get('calories', '0')

        scan_id = data.get('scanId')
        if not scan_id:
            return jsonify({"error": "No scanId provided"}), 400

        prompt = f"""Analyze this product data and provide safety assessment in JSON format:
        Product: {product_name}
        Ingredients: {', '.join(ingredients_list)}
        Nutrition: {json.dumps(nutrition)}
        Calories: {calories}

        Response format:
        {{
            "safetyScore": "number 1-10",
            "safetyRating": "safe/unsafe"
        }}
        IMPORTANT: PLEASE DO NOT INCLUDE ANY OTHER INFORMATION. KEEP IT PURELY JSON.

        Note: Obviously high sodium and high sugar content are bad for health. So items with such things will rank very low as compared to others.

        DO NOT GIVE 4 RATING FOR ANY PRODUCT ALSO. GIVE LOWER OR HIGHER. FOR EXAMPLE, IF A PRODUCT IS NOODLES WITH HIGH SODIUMS, GIVE A RATING OF 2.
        """
        response = self.client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
            messages=[
                {"role": "system", "content": self.system_prompt_2},
                {"role": "user", "content": prompt}
            ],
            max_tokens=512,
            temperature=0.1,
            top_p=0.7,
            top_k=50,
            repetition_penalty=0,
            stream=False
        )

        result = self.validate_json_response(response.choices[0].message.content)
        if not result:
            return jsonify({"error": "Invalid JSON response from GPT"}), 500

        final_scan_result = {
            "scanType": "product",
            "productName": product_name,
            "ingredients": ingredients_list,
            "calories": calories,
            "gptSafetyResult": result
        }
        updated_scan_str = json.dumps(final_scan_result)
        update_query = """
        UPDATE FoodScan
        SET scanResult = %s
        WHERE scanId = %s AND userId = %s
        """
        self.cur.execute(update_query, (updated_scan_str, scan_id, user_id))

        item_ingredients_str = "\n".join(ingredients_list)
        item_calories = 0
        try:
            item_calories = int(calories)
        except:
            pass
        item_nutrition_value = json.dumps(nutrition)
        item_safety_level = result.get("safetyRating", "unknown")

        self.insert_food_item(
            scan_id=scan_id,
            name=product_name,
            ingredients=item_ingredients_str,
            calories=item_calories,
            nutrition_value=item_nutrition_value,
            safety_level=item_safety_level
        )

        return jsonify(result), 200


    def get_scan_history(self, user_id):
        """Get scan history for a user"""
        try:
            query = """
            SELECT scanId, scanDate, scanResult
            FROM FoodScan
            WHERE userId = %s
            ORDER BY scanDate DESC, scanId DESC
            """
            self.cur.execute(query, (user_id,))
            scans = self.cur.fetchall()
            
            formatted_scans = []
            for scan in scans:
                try:
                    scan_result = json.loads(scan['scanResult'])
                    
                    scan_info = {
                        'scanId': scan['scanId'],
                        'scanDate': scan['scanDate'].strftime('%Y-%m-%d'),
                        'type': 'unknown',
                        'title': 'Unknown Scan',
                        'details': {},
                        'hasError': False
                    }
                    
                    # Handle error cases
                    if 'error' in scan_result:
                        scan_info['type'] = 'error'
                        scan_info['title'] = 'Scan Error'
                        scan_info['hasError'] = True
                        scan_info['details'] = {
                            'errorMessage': scan_result['error']
                        }
                    # Handle meal scans (with or without scanType)
                    elif 'meal' in scan_result or (scan_result.get('scanType') == 'meal'):
                        scan_info['type'] = 'meal'
                        meal_name = scan_result.get('mealName') or scan_result.get('meal', {}).get('name', 'Unknown Meal')
                        scan_info['title'] = meal_name
                        scan_info['details'] = {
                            'mealName': meal_name
                        }
                        # Add safety info if available
                        if 'gptSafetyResult' in scan_result:
                            safety_result = scan_result['gptSafetyResult']
                            scan_info['details']['safetyRating'] = safety_result.get('safetyRating', 'N/A')
                            scan_info['details']['safetyScore'] = safety_result.get('safetyScore', 'N/A')
                    # Handle product scans
                    elif scan_result.get('scanType') == 'product':
                        scan_info['type'] = 'product'
                        scan_info['title'] = scan_result.get('productName', 'Unknown Product')
                        scan_info['details'] = {
                            'productName': scan_result.get('productName', 'Unknown'),
                            'ingredientCount': len(scan_result.get('ingredients', [])),
                            'calories': scan_result.get('calories', 'N/A')
                        }
                        # Add safety info if available
                        if 'gptSafetyResult' in scan_result:
                            safety_result = scan_result['gptSafetyResult']
                            scan_info['details']['safetyRating'] = safety_result.get('safetyRating', 'N/A')
                            scan_info['details']['safetyScore'] = safety_result.get('safetyScore', 'N/A')
                    # Handle standalone ingredients (no scanType)
                    elif 'ingredients' in scan_result and 'scanType' not in scan_result:
                        scan_info['type'] = 'ingredients'
                        ingredients = scan_result['ingredients']
                        scan_info['title'] = f"{len(ingredients)} Ingredients"
                        scan_info['details'] = {
                            'count': len(ingredients),
                            'sample': ingredients[:3] if len(ingredients) > 0 else [],
                            'allIngredients': ingredients
                        }
                    # Handle nutrition label scans
                    elif 'nutrition' in scan_result:
                        scan_info['type'] = 'nutrition'
                        scan_info['title'] = 'Nutrition Label'
                        nutrition = scan_result['nutrition']
                        scan_info['details'] = {
                            'calories': nutrition.get('calories', 'N/A'),
                            'servingSize': nutrition.get('servingSize', 'N/A'),
                            'totalFat': nutrition.get('totalFat', 'N/A'),
                            'fullNutrition': nutrition
                        }
                    # Unknown scan type
                    else:
                        scan_info['type'] = 'unknown'
                        scan_info['title'] = 'Unknown Scan Type'
                        scan_info['details'] = {
                            'rawData': scan_result
                        }
                    
                    formatted_scans.append(scan_info)
                    
                except Exception as parse_error:
                    # Handle JSON parsing errors
                    formatted_scans.append({
                        'scanId': scan['scanId'],
                        'scanDate': scan['scanDate'].strftime('%Y-%m-%d'),
                        'type': 'error',
                        'title': 'Invalid Scan Data',
                        'details': {
                            'errorMessage': f"Failed to parse scan data: {str(parse_error)}"
                        },
                        'hasError': True
                    })
            
            return jsonify({
                "scans": formatted_scans,
                "total": len(formatted_scans)
            }), 200
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500