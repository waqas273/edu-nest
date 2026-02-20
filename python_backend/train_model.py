import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Define Classes
CLASSES = [
    "Computer Science", "Mathematics", "Physics", "Biology", 
    "Chemistry", "Psychology", "Graphics / Design"
]

# Create Dummy Training Data
# 15 Features:
# 0-2: CS
# 3-4: Math
# 5-6: Physics
# 7-8: Biology
# 9-10: Chem
# 11-12: Psych
# 13-14: Graphics

X_train = [
    # CS H, others L
    [1.0, 1.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1.0, 0.5, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    # Math H
    [0, 0, 0, 1.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    # Physics H
    [0, 0, 0, 0, 0, 1.0, 1.0, 0, 0, 0, 0, 0, 0, 0, 0],
    
    # Bio H
    [0, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 0, 0, 0, 0, 0, 0],

    # Chem H
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 0, 0, 0, 0],

    # Psych H
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 0, 0],

    # Graphics H
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.0, 1.0],
]

y_train = [
    "Computer Science", "Computer Science",
    "Mathematics",
    "Physics",
    "Biology",
    "Chemistry",
    "Psychology",
    "Graphics / Design"
]

# Train Model
print("Training RandomForest Classifier...")
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Test
test_vector = np.array([1.0, 1.0, 1.0] + [0]*12).reshape(1, -1)
print("Testing prediction for CS vector:", model.predict_proba(test_vector))

# Save
OUTPUT_PATH = 'interest_model.pkl'
joblib.dump(model, OUTPUT_PATH)
print(f"Model saved to {OUTPUT_PATH}")
