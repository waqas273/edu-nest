import joblib
import numpy as np
import os

MODEL_PATH = 'interest_model.pkl'

print(f"Checking {MODEL_PATH}...")

if not os.path.exists(MODEL_PATH):
    print("Model file NOT found!")
    exit(1)

try:
    model = joblib.load(MODEL_PATH)
    print(f"Model loaded. Type: {type(model)}")
    
    # Check expected features if possible
    if hasattr(model, 'n_features_in_'):
        print(f"Expected features: {model.n_features_in_}")
    
    # Test Prediction with 15 zeros
    test_vector = [0.5] * 15
    print(f"Testing prediction with vector: {test_vector}")
    
    input_arr = np.array(test_vector).reshape(1, -1)
    probs = model.predict_proba(input_arr)[0]
    
    print("Prediction successful!")
    print(f"Classes: {model.classes_}")
    print(f"Probs: {probs}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
