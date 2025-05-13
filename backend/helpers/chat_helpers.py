# helpers/chat_helpers.py
import json
import nltk
nltk.download('punkt')
nltk.download('wordnet')
nltk.download('omw-1.4')
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
import matplotlib.pyplot as plt
import io
import base64

lemmatizer = WordNetLemmatizer()

def is_meal_update_command(message: str) -> bool:
    tokens = word_tokenize(message.lower())
    lemmas = [lemmatizer.lemmatize(token) for token in tokens]

    intent_keywords = {"replace", "change", "swap", "update", "new", "different", "another"}
    meal_keywords = {"breakfast", "lunch", "dinner", "snack", "supper", "meal"}

    found_intent = any(word in intent_keywords for word in lemmas)
    found_meal = any(word in meal_keywords for word in tokens)

    return found_intent and found_meal

def extract_meal_type(message: str) -> str | None:
    tokens = word_tokenize(message.lower())
    meal_map = {
        "breakfast": "breakfast",
        "lunch": "lunch",
        "dinner": "dinner",
        "supper": "dinner",
        "snack": "snack",
        "meal": None
    }

    for token in tokens:
        if token in meal_map:
            return meal_map[token]

    return None
def generate_visualization(visualization_data):
    """Generate a chart based on the provided visualization data."""
    if not visualization_data.get('values'):
        raise ValueError("Values for visualization are required.")
    print("here in helper")

    chart_type = visualization_data.get('chartType', 'bar')
    values = visualization_data['values']
    title = visualization_data.get('title', 'Nutritional Breakdown')

    plt.figure(figsize=(18, 10), dpi=150)
    plt.style.use('ggplot')

    if chart_type == "bar":
        bars = plt.bar(values.keys(), values.values(), color=['#2ecc71','#3498db','#e74c3c','#f1c40f'])
        for bar in bars:
            h = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., h, f'{h:g}', ha='center', va='bottom')
        plt.xlabel('Nutrients')
        plt.ylabel('Amount')
        plt.xticks(rotation=45, ha='right')

    elif chart_type == "pie":
        plt.pie(values.values(), labels=values.keys(), autopct='%1.1f%%',
                colors=['#2ecc71','#3498db','#e74c3c','#f1c40f'])

    plt.title(title, pad=15)
    plt.tight_layout()

    img_stream = io.BytesIO()
    plt.savefig(img_stream, format='png', bbox_inches='tight')
    img_stream.seek(0)
    plt.close()

    return base64.b64encode(img_stream.read()).decode('utf-8')
