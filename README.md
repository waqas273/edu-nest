# EduNest 🎓

![EduNest Banner](https://via.placeholder.com/1200x300.png?text=EduNest+-+Empowering+Student+Futures)

EduNest is a next-generation, AI-powered Educational Technology (EdTech) platform designed to bridge the gap between high school students and higher education institutions. By leveraging Machine Learning and Generative AI, EduNest offers personalized career counseling, intelligent entry test preparation, and a seamless university discovery ecosystem.

---

## 🌟 Key Features

### 👨‍🎓 For Students
* **AI Interest Assessment:** Discover your ideal career path through a dynamic, machine-learning-powered questionnaire (Random Forest).
* **Smart Entry Test Prep (RAG):** Generate sequence-aligned, syllabus-accurate mock exams (MDCAT/ECAT) on the fly using advanced Retrieval-Augmented Generation (ChromaDB + Groq).
* **University Discovery:** Explore detailed university profiles, campus maps (Leaflet), and program catalogs.
* **Direct Communication:** Chat directly with university admission managers.
* **Community Feed:** Engage with peers in a safe, AI-moderated (TensorFlow Toxicity) environment.
* **Interactive Roadmaps:** Track your educational journey step-by-step.

### 🏛️ For University Managers
* **Comprehensive Dashboards:** Manage university profiles, admission criteria, and faculty details.
* **Student Engagement:** Respond to student inquiries in real-time via the integrated chat system.
* **Program Management:** Add and update offered degrees and scholarships.

### 🛡️ For Administrators
* **System Oversight:** Approve or reject university onboarding requests.
* **User Management:** Oversee the entire ecosystem of students and managers.
* **Content Moderation:** Ensure platform safety and issue official certificates.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React 19, Vite
* **Styling & UI:** TailwindCSS, Framer Motion (Animations), Lucide React (Icons)
* **Routing & State:** React Router v7, Context API
* **Mapping:** Leaflet.js

### Backend & AI Microservice
* **BaaS:** Firebase (Authentication, Firestore, Storage)
* **AI Service:** Python, Flask
* **Machine Learning:** `scikit-learn`, `joblib` (Interest Classification)
* **GenAI & RAG:** ChromaDB (Vector Database), OpenRouter API, Groq API (Llama 3)
* **Moderation:** TensorFlow.js Toxicity Model

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* Firebase Account (for config)

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 2. Python AI Backend Setup
```bash
cd python_backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run the Flask server (runs on port 5001)
python app.py
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# AI & Media API Keys
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_OPENROUTER_EXAM_KEY=your_openrouter_exam_key
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```

---

## 📁 Project Structure

```text
EduNest/
├── src/                    # React Frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Role-based pages (student, manager, admin)
│   ├── context/            # React Context providers
│   ├── services/           # Firebase & AI API integrations
│   └── layout/             # Shared application layouts
├── python_backend/         # Flask AI Microservice
│   ├── app.py              # Main Flask application
│   ├── interest_model.pkl  # Trained Random Forest model
│   ├── vector_db/          # ChromaDB persistent storage
│   └── data/               # Past papers & syllabus mapping
├── functions/              # Firebase Cloud Functions
└── public/                 # Static assets
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📄 License
This project is licensed under the MIT License.
