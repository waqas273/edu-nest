# EduNest: Complete Tools & Technologies Stack (CAP-1 & CAP-2)

This document outlines the complete list of tools, frameworks, and libraries utilized throughout the EduNest project, categorized by their specific application and the module they power.

---

## 1. Frontend Development (Core Technologies)
The frontend of the platform is built for speed, responsiveness, and a modern user experience.

*   **React (v19.2.0):** The core JavaScript library used to build the entire interactive user interface, manage component states, and handle single-page application (SPA) behavior.
*   **Vite:** The build tool and development server used for ultra-fast Hot Module Replacement (HMR) and optimized production builds.
*   **Tailwind CSS (v3.4.19):** A utility-first CSS framework used exclusively for styling the application, ensuring a fully responsive, modern design without writing custom CSS files.
*   **Framer Motion (v12.27.3):** The animation library powering all micro-interactions, page transitions, and dynamic UI elements (like the floating 3D review cards and roadmap timeline animations).
*   **React Router DOM (v7.12.0):** Manages all client-side navigation and role-based route protection across the Student, Manager, and Admin portals.
*   **Lucide React:** The primary icon library used consistently throughout the platform for visual cues (e.g., dashboard icons, navigation bars).

## 2. Backend & Database (BaaS)
EduNest utilizes an integration of Firebase for real-time capabilities and a custom Python backend for heavy AI processing.

*   **Firebase (v12.7.0):** The primary Backend-as-a-Service (BaaS) provider powering the core platform mechanics.
    *   **Firebase Authentication:** Handles secure user sign-ups, logins, password resets, and role-based session management.
    *   **Cloud Firestore:** The NoSQL real-time database used to store and sync all platform data, including user profiles, university details, academic programs, scholarship logic, admission applications, and community posts.


## 3. Artificial Intelligence & Machine Learning
A hybrid approach utilizing both browser-side and server-side AI models to power the platform's intelligent features.

### Browser-Side AI (Community Moderation)
*   **TensorFlow.js (`@tensorflow/tfjs`):** Runs machine learning models directly within the user's browser for immediate feedback.
*   **TensorFlow Toxicity Model (`@tensorflow-models/toxicity`):** Used precisely in the **Community Forum Module**. It scans every new post created by users in real-time, detecting offensive language or toxicity and blocking the post before it reaches the database.

### Server-Side AI (Roadmaps & Assessments)
*   **Python (v3.x) & Flask:** The custom backend microservice architecture hosting the machine learning models that cannot run efficiently in the browser.
*   **Scikit-Learn (`scikit-learn`):** Used in the **Interest Assessment Module**. It powers the Random Forest Classifier model trained to predict a student's ideal career path based on their quiz responses.
*   **Pandas & NumPy:** Used in the Python backend for data manipulation and mathematical operations required by the Scikit-Learn models.
*   **Joblib:** Used to save (`.pkl`) and load the pre-trained machine learning model into the active Flask server.
*   **Google Gemini API (`@google/generative-ai`):** Used in the Node.js frontend to generate the dynamic, step-by-step learning roadmaps and topic quizzes based on the student's selected skills.
*   **Custom Local Models (Planned for CAP-2):** Specifically designated for the **Entry Test Module**. We will **not** be using external APIs like OpenAI. Instead, we will train our own custom model using open-source LLMs (like Llama 3 8B or Mistral 7B) on a custom dataset of past papers to generate strict JSON formats of professional-grade ECAT/MDCAT exam questions.

## 4. Utility & Service Integrations
Specific libraries used to handle precise micro-tasks within different modules.

*   **EmailJS (`@emailjs/browser`):** Used in the **Security/Authentication Module** to send real 6-digit OTP verification codes to users during the registration process without needing a dedicated SMTP server.
*   **HTML2PDF.js (`html2pdf.js`):** Used exclusively in the **Admissions Management Module**. It allows University Managers to instantly convert a student's React-based HTML application profile into a downloadable, formatted PDF document.
*   **date-fns:** Used across the platform (e.g., Community feed, Dashboards) for easily formatting and manipulating Firebase timestamps into human-readable formats ("2 hours ago", specific dates).
*   **UUID (`uuid`):** Used to generate unique identifiers, specifically for generating unique chat room IDs in the **Real-Time Messaging Module**.
*   **Axios:** Used to make API requests from the React frontend to the custom Python/Flask machine learning backend (for the Interest Assessment).
*   **CLSx & Tailwind Merge (`clsx`, `tailwind-merge`):** Utility libraries heavily used throughout the codebase to dynamically construct and merge Tailwind CSS class names safely based on component states (e.g., changing a button's color if an application is accepted or rejected).

---

## Module-to-Technology Mapping Summary

*   **Authentication:** Firebase Auth, React Router, EmailJS.
*   **University & Program Browsing:** React, Tailwind CSS, Firestore.
*   **Admissions & Scholarships:** Firestore, Framer Motion, HTML2PDF.js.
*   **Interest Assessment Assessment:** React (UI), Axios, Python, Flask, Scikit-Learn.
*   **Learning Roadmaps & Quizzes:** LLM API, Firestore.
*   **Community Forum:** Firestore (Real-time tracking), TensorFlow.js (Toxicity Moderation).
*   **Direct Messaging (Chat):** Firestore (Real-time snapshot listeners), UUID.
*   **Entry Test (CAP-2):** Custom Local Models (Llama 3 / Mistral), Custom Datasets, Python Backend (Batch Processing), Strict JSON parsing.
