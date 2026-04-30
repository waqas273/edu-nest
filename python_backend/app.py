from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
from openai import OpenAI
import traceback
from dotenv import load_dotenv

# Load env from parent directory (where .env typically is in this project structure)
# Attempt to load from parent first, then current
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
load_dotenv() # Fallback to current dir

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Load Model ---
MODEL_PATH = 'interest_model.pkl'  # Updated to Random Forest model
model = None

try:
    if os.path.exists(MODEL_PATH):
        loaded_data = joblib.load(MODEL_PATH)
        if isinstance(loaded_data, dict) and 'model' in loaded_data:
            model = loaded_data['model']
        else:
            model = loaded_data
        print(f"Model loaded successfully from {MODEL_PATH}")
    else:
        print(f"WARNING: Model file not found at {MODEL_PATH}. Prediction endpoint will fail.")
except Exception as e:
    print(f"Error loading model: {e}")

# --- OpenRouter/OpenAI Setup ---
# Using VITE_OPENROUTER_API_KEY as requested
api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
openai_client = None

if api_key:
    openai_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    print("OpenRouter client initialized.")
else:
    print("WARNING: VITE_OPENROUTER_API_KEY environment variable not found. Dynamic generation might fail.")





@app.route('/predict-step', methods=['POST'])
def predict_step():
    """
    Incremental prediction for the Interest Assessment Module.
    Expects current vector (size 7).
    """
    try:
        data = request.get_json()
        current_vector = data.get('vector') # List of 7 floats

        if not current_vector or len(current_vector) != 7:
            return jsonify({"error": "Invalid vector. Expected 7 values."}), 400

        if not model:
             return jsonify({"error": "Model not loaded."}), 500

        # Create numpy array
        input_arr = np.array(current_vector).reshape(1, -1)
        
        # Get Probabilities
        probs = model.predict_proba(input_arr)[0]
        classes = model.classes_
        
        # Map to dict
        prob_dict = {cls: float(prob) for cls, prob in zip(classes, probs)}
        
        # Find Top Class
        max_class = max(prob_dict, key=prob_dict.get)
        max_prob = prob_dict[max_class]
        
        return jsonify({
            "probabilities": prob_dict,
            "top_class": max_class,
            "max_prob": max_prob
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/generate-dynamic', methods=['POST'])
def generate_dynamic():
    """
    Endpoint to generate a tie-breaker question using OpenRouter.
    Expects JSON: { "classA": "CS", "classB": "Math" }
    Returns JSON: { "question": "Question text...", "focus_class": "CS" }
    """
    try:
        data = request.get_json()
        class_a = data.get('classA')
        class_b = data.get('classB')

        if not class_a or not class_b:
            return jsonify({"error": "Missing classA or classB"}), 400
            
        # Randomly pick ONE to focus on for variety in the statement
        import random
        focus_class = random.choice([class_a, class_b])
        other_class = class_b if focus_class == class_a else class_a

        if not openai_client:
             # Fallback
             return jsonify({
                 "question": f"I would rather explore {focus_class} than {other_class}.",
                 "focus_class": focus_class,
                 "isFallback": True
             })

        # IMPROVED PROMPT: Strict Comparative Statement WITHOUT Field Names
        prompt = (
            f"Generate a single first-person comparative statement "
            f"that implies a preference for '{focus_class}' over '{other_class}' by comparing their activities. "
            f"CRITICAL: Do NOT use the names of the fields (e.g. do not say '{focus_class}' or '{other_class}'). "
            f"Instead, describe a specific task from each field. "
            f"Example: 'I would rather design a user interface than analyze a chemical reaction.' "
            f"Return ONLY the statement text."
        )

        response = openai_client.chat.completions.create(
            # Use a reliable model supported by OpenRouter (e.g. openai/gpt-3.5-turbo)
            model="openai/gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You mean a helpful assistant generating career inventory questions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=60,
            temperature=0.9,
            extra_headers={
                "HTTP-Referer": "http://localhost:5173", # Optional OpenRouter headers
                "X-Title": "AntiEduNest Dev",
            },
        )
        
        question_text = response.choices[0].message.content.strip().replace('"', '')
        
        return jsonify({
            "question": question_text,
            "focus_class": focus_class
        })

    except Exception as e:
        traceback.print_exc()
        # Fail safe
        return jsonify({
            "question": f"I prefer {class_a} over {class_b}.", 
            "focus_class": class_a
        })


if __name__ == '__main__':
    # Run on port 5001 to avoid React (3000) or other conflicts
    app.run(debug=True, port=5001)
