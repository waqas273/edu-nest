# Interest Assessment Module - Complete Step-by-Step Flow

The **Interest Assessment Module** in EduNest is an adaptive, AI-driven recommendation engine designed to evaluate a student's career or academic interests. It uses dynamic questioning, Natural Language Processing (via OpenRouter AI) for phrasing, and a Machine Learning model (Random Forest) for real-time classification and probability updates.

---

## 1. System Components & Setup

### A. The Question Bank (`questionBank.js`)
The system holds a predefined set of questions for 7 different career/academic categories:
1. Computer Science
2. Mathematics
3. Physics
4. Biology
5. Chemistry
6. Psychology
7. Graphics / Design

Each category contains 10 questions categorized by difficulty level (from 1 to 3). The assessment always starts with "Level 1" (easier, surface-level) questions.

### B. The Machine Learning Model (`train_model.py` & `app.py`)
- **Type**: Random Forest Classifier (`sklearn.ensemble.RandomForestClassifier`).
- **Training Data**: It is trained on a 15-dimensional vector (15 float numbers) where specific indices map to specific categories (e.g., indices 0, 1, 2 map to Computer Science).
- **Core Functionality**: Instead of just counting points, the model uses `predict_proba()` to return the **probability (confidence)** of the user belonging to each of the 7 categories based on their answers.

---

## 2. The Step-by-Step User Flow

### Step 1: Initialization & AI Phrasing
When the user clicks **"Start Assessment"**, the system selects the first question from the first category (Level 1).
However, it does not show the raw, static text to the user.
- The raw question (e.g., *"Do you enjoy learning how apps and websites are built?"*) is sent to the **OpenRouter API** (arcee-ai/trinity model).
- The AI acts as a friendly counselor and rephrases it: *"Hey there! 👋 Would you find it fun to learn how cool apps and websites are created? 📱💻"*
- This dynamically generated question is rendered on the screen.

### Step 2: User Input & Scoring
The user answers the question using one of three options:
- **Yes, Absolutely** (Score 1.0)
- **Maybe / Sometimes** (Score 0.5)
- **No, Not Really** (Score 0.0)

**The Rejection Penalty:** 
If the user answers "No" (1.0 goes to 0.0) during deeper phases of the test, a **40% penalty decay** is applied to that category's total score. This ensures the system does not stubbornly stick to a category the user is no longer interested in.

### Step 3: Vectorization & Backend Prediction
After every single answer, the React frontend calculates the *average score* for each category and maps it into a 15-number array (the "Vector").

**Example Vector Generation:**
If the user answered "Yes" to Computer Science, the average for CS is `1.0`. For all other unanswered categories, the average is `0.0`.
Vector = `[1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]`

This vector is sent to the Flask Backend (`/predict-step`). The Random Forest model processes it and returns probabilities:
* *Computer Science: 75%*
* *Mathematics: 10%*
* *Physics: 5% ...*

**Heuristic Boost:** If the user continuously answers "Yes" to a specific category, the React frontend adds a small +5% confidence boost to speed up the process and avoid infinite looping.

---

## 3. The 3-Phase Adaptive Engine

The genius of the module lies in how it selects the *next* question based on the ML model's probabilities. It operates in 3 distinct phases:

### Phase 1: Baseline Sampling (Questions 1 to 7)
The system asks exactly one introductory (Level 1) question from each of the 7 categories to build a baseline profile.
- **Early Exit:** If the user shows immediate, intense interest in one category (e.g., answers "Yes" 3 times in a row for CS) and the model's confidence crosses **75%**, the system skips the rest of the baseline and immediately jumps to Phase 2.

### Phase 2: Drill-Down (Questions 8 to 18)
The system now focuses entirely on the category with the **highest probability**.
- **Sticky / Switch Logic:**
  - If the user answers **"Yes"**, the system "sticks" to the top category and asks a slightly harder question (Level 2 or 3) from that same category.
  - If the user answers **"No"**, the system immediately triggers a "Force Switch" and starts asking questions from the **2nd highest probability** category to avoid annoying the user.
- **Success Criteria:** If the model's confidence for any single category hits **95%**, the assessment finishes early!

### Phase 3: Contrast Verification (Questions 19 to 25)
If by question 18 the model is still confused (e.g., CS is at 60% and Math is at 55%), the system enters Phase 3.
- In this phase, it actively asks questions from the **2nd top category** to create a sharp contrast and break the tie.
- If it still cannot find a clear winner (confidence remains below 50%) by question 25, the system concludes that the user has highly diverse interests.

---

## 4. Final Result & Storage

Once a phase concludes successfully, the assessment stops.
1. **Success Match:** If a clear winner is found (`Confidence > 85%-95%`), the UI displays a congratulatory screen showing the exact career fit (e.g., *"Computer Science - 95% Match"*).
2. **Exploration Required:** If the test ran out of questions without a clear winner, it politely tells the user: *"Exploration Required - You have diverse interests."*
3. **Database Save:** The final recommended category and its specific model confidence percentage are saved to the user's profile in **Firebase Firestore** (`users/{uid}`). Next time they log in, they don't have to take the test again.
