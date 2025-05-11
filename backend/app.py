from flask import Flask
from flask_cors import CORS

# Create Flask app
app = Flask(__name__)

# Enable CORS to allow cross-origin requests (important for React Native)
#CORS(app)

# Import controllers (ensure this points to the correct module path)
try:
    # controllers/__init__.py
    from controllers.user_controller import *
    from controllers.medicalHistoryController import *
    from controllers.scan_controller import *
    from controllers.chat_controller import *
    from controllers.diet_plan_controller import *

except Exception as e:
    print(f"Error importing controllers: {e}")

if __name__ == "__main__":
    # Run the app, binding to all interfaces (0.0.0.0) so it's accessible on your network
    app.run(host="0.0.0.0", port=5000, use_reloader=False, debug=True)
