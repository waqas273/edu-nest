# EduNest Project Implementation & Architecture Summary

This document outlines the complete list of modules, features, and technical components successfully implemented during the **CAP-1** phase of the EduNest project, alongside the architectural blueprints and pending features scheduled for development in **CAP-2**.

---

## Part 1: Completed Implementation (CAP-1)

The system has been developed with a modern tech stack (React, Tailwind CSS, Firebase, AI integrations) and is divided into three primary role-based portals: Student, University Manager, and Platform Admin.

### 1. Authentication & Security Module
*   **Role-Based Access Control (RBAC):** Secure routing and dedicated dashboards for Students, University Managers, and Admins.
*   **User Registration & Login:** Fully functional signup and login systems with email/password authentication.
*   **OTP Email Verification:** Secure 6-digit OTP verification system using EmailJS to validate new accounts.
*   **Password Management:** Secure "Forgot Password" flow with email reset links and in-app "Change Password" functionality.
*   **Session Management:** Secure login persistence, role verification middleware, and safe logout handling.
*   **Manager Approval Workflow:** University Manager accounts are placed in a "Pending" state upon registration and require manual Admin approval before gaining dashboard access.

### 2. Student Portal & Capabilities
*   **Student Dashboard:** A personalized hub displaying application statuses, learning progress, and quick links.
*   **University Exploration:**
    *   **Advanced Search & Filtering:** Students can search for universities by name, location, and apply multi-tier filters.
    *   **Detailed University Profiles:** Dedicated pages showing university galleries, descriptions, contact info, facilities, and faculty lists.
    *   **Program Catalog:** View available degree programs, semester fees, durations, and detailed course outlines.
*   **Admission System:**
    *   **Automated Application Submission:** Students can apply to specific programs directly through the platform.
    *   **Live Application Tracking:** A visual timeline showing the real-time status of applications (Pending, Accepted, Rejected).
    *   **Dynamic Scholarship Eligibility System:** Automatic matching algorithms that check a student's marks/criteria against university scholarships during the application process, offering instant fee waivers.
*   **AI-Powered Learning & Roadmap Module:**
    *   **Interest Assessment (ML Integration):** A dynamic questionnaire powered by a Python/Flask backend and Scikit-Learn to predict the best-fit career path for the student.
    *   **AI Roadmap Generation:** Integration with the Google Gemini API to generate customized, step-by-step learning roadmaps based on the student's chosen field.
    *   **Interactive Learning Path:** A visual timeline to track progress, mark topics as completed, and access curated external learning resources.
    *   **Topic Quizzes & Anti-Cheat System:** Auto-generated AI quizzes for completed topics, featuring tab-switching detection and fullscreen enforcement.
*   **Entry Test Simulation (*Frontend UI Only*):**
    *   A beautifully designed interface for simulating MDCAT and ECAT entry tests, including a timer, question navigation grid, and subject breakdowns. *(Backend to be implemented in CAP-2).*
*   **Student Profile Management:** Interface to update personal details, add academic history (GPAs, attached result cards), and upload a profile picture.

### 3. University Manager Portal
*   **Dynamic Manager Dashboard:** A centralized analytics hub showing total applications, active programs, and student feedback sentiment.
*   **Complete University Onboarding:** A comprehensive multi-step form for new managers to upload branding, facilities, and institutional details.
*   **Program & Scholarship Management:**
    *   Ability to add, edit, and delete detailed academic programs.
    *   **Advanced Scholarship Builder:** Create custom, multi-tier scholarship rules (Merit, Position, Need, Kinship) attached to specific programs.
*   **Admissions Management Dashboard:**
    *   Dashboard to monitor all incoming student applications.
    *   Read-only modals to securely view student academic profiles and documents.
    *   One-click **Approve** or **Reject** functionality that instantly updates the student's status.
    *   PDF Generation for professional printing of student applications.
*   **Faculty & Transport Management:** Interfaces to manage university faculty members and transportation bus routes.
*   **Reputation Hub:** A dedicated page to monitor student reviews and average star ratings.

### 4. Administrator Portal
*   **Admin Dashboard:** High-level metrics showing total users, universities, and pending approvals.
*   **User Management System:** Grid view to manage users, including detailed profiles, account deletion, and a "Ban" system to restrict bad actors.
*   **University Approval Queue:** A dedicated section to officially "Approve" or "Reject" newly registered University Managers.

### 5. Shared & Collaborative Features
*   **Community Forum:** 
    *   A shared newsfeed for Students, Managers, and Admins.
    *   **AI Toxicity Moderation:** Real-time AI scanning of all new posts to block offensive language before publishing.
    *   Official "Role Badges" (e.g., "UNI MANAGER") displayed on official posts.
*   **Real-Time Direct Messaging (Chat):** A secure, WhatsApp-style chat interface using Firestore for direct communication between Students and Managers.

---

## Part 2: Pending Implementation & Architecture (CAP-2)

The following core modules are scheduled for development in the CAP-2 phase, focusing on advanced AI processing, specific data structuring, and intelligent matching algorithms.

### 1. Entry Test Module (The "Digital Twin" Approach)
The primary research gap this project fills is the transition from "Random AI Generation" to **"Pattern Cloning."**
Most existing AI test generators use a simple text-to-question approach, outputting random MCQs that do not reflect the actual pressure, difficulty curves, or exact structure of a professional board exam. Our system will act as a "Digital Twin" of real past papers, enforcing a strict template that clones the exact subject distribution and a carefully calculated difficulty curve (Easy, Medium, Hard).

**Architectural Approach:**
*   **LLM Selection (No External API):** The system will **not** rely on external APIs (like OpenAI) for the entry test. Instead, we will train our own custom model utilizing advanced open-source Large Language Models, specifically **Llama 3 (8B)** or **Mistral 7B**. These models were explicitly selected over basic generators due to their superior reasoning capabilities and strict adherence to complex predefined JSON structures.
*   **Batch Processing Loop:** To prevent the LLM from crashing under the heavy token load of generating a full 200-question paper, the Python backend will utilize a smart batching loop. It will fetch questions in smaller, manageable chunks.
*   **Data Pipeline:** The backend will validate the JSON structure of each chunk and then compile the final paper directly into Firestore, delivering a seamless, single-click experience for the student on the frontend.
*   **Custom Dataset Grounding:** The generated questions will be grounded in a custom-built dataset derived directly from actual past papers to ensure ultimate relevance and accuracy.

**Strict JSON Output Requirement:**
Generating a professional-grade exam requires the AI to format its output flawlessly without breaking syntax. The required JSON schema for every generated question is strictly defined as follows:

```json
{
  "paper_number": 1,
  "sequence_in_paper": 1,
  "subject": "Biology",
  "topic": "Genetics",
  "difficulty": "Easy",
  "type": "MCQ",
  "question": "Which of the following is an example of a polygenic trait?",
  "options": {
    "A": "Color blindness",
    "B": "Blood group",
    "C": "Height",
    "D": "Tongue rolling"
  },
  "answer": "C"
}
```

### 2. Intelligent Recommendation System
The system will feature a robust recommendation engine designed to intelligently match students with the most suitable universities and programs based on multiple weighted variables.

**Filtering & Matching Logic:**
The recommendation algorithm will process the student's profile and cross-reference it against the university database using the following primary criteria:
*   **Location:** Matching the student's geographic location or preferences with university campuses to suggest highly relevant, accessible options.
*   **Interest / Program Match:** Utilizing the core domain determined by the interest assessment module to filter and prioritize universities offering specific, high-quality programs in the student's chosen field.


