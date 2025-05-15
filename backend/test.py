from google import genai
from google.genai import types

# Set up your API key (you'll need to get this from Google AI Studio)
GOOGLE_API_KEY = "AIzaSyDeZoVAprV4gHEvFIy290OZBD1dY5wkPxs"

genai_client = genai.Client(api_key=GOOGLE_API_KEY)

# Model ID for Gemini 2.5 Flash with thinking capabilities
MODEL_ID = "gemini-2.5-flash-preview-04-17"



response = genai_client.models.generate_content(
            model=MODEL_ID,
            contents="what is the capital of pakistan?",
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=200,
                thinking_config=types.ThinkingConfig(
                    thinking_budget=8192  # Allow the model to think through the problem
                )
            )
        )

        #response_text = response.choices[0].message.content
response_text = response.text

print(f"Gemini response: {response_text}")
