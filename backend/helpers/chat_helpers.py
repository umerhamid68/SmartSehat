# helpers/chat_helpers.py
import json
import io
import base64
import matplotlib.pyplot as plt

def is_meal_update_command(message: str) -> bool:
    message = message.lower()

    intent_keywords = ["replace", "change", "swap", "update", "different", "new", "another"]
    meal_keywords = ["breakfast", "lunch", "dinner", "supper", "snack", "meal"]

    found_intent = any(word in message for word in intent_keywords)
    found_meal = any(word in message for word in meal_keywords)

    return found_intent and found_meal

def extract_meal_type(message: str) -> str | None:
    message = message.lower()

    meal_map = {
        "breakfast": "breakfast",
        "lunch": "lunch",
        "dinner": "dinner",
        "supper": "dinner",
        "snack": "snack",
        "meal": None  # fallback
    }

    for word in meal_map:
        if word in message:
            return meal_map[word]

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
