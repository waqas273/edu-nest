# EduNest - Complete Project Guide (Roman Urdu)

Yeh document EduNest project ki mukammal tafseel bayan karta hai. Isme bataya gaya hai ke project mein kya kya features hain, kon konsi technologies use hui hain, aur har module kis tarhan kaam karta hai.

---

## 1. Project Kya Hai? (Overview)
EduNest ek comprehensive educational platform hai jo students, university managers, aur system admins ke liye banaya gaya hai. Iska bunyadi maqsad students ko unki interest ke mutabiq sahi career ka intikhab karne, universities dhoondne, aur admissions ke liye apply karne mein madad karna hai. Is platform mein Artificial Intelligence (AI) aur Machine Learning (ML) ka bohat gehra istemal kiya gaya hai taake experience ko smart aur automated banaya ja sake.

---

## 2. Tech Stack (Konsi Technologies Istemal Hui Hain)

Yeh project modern technologies par mabni hai:

*   **Frontend (User Interface):** 
    *   **React (v19.2.0):** Pura frontend React pe bana hai.
    *   **Vite:** Fast development aur build tool.
    *   **Tailwind CSS:** Styling aur responsive design ke liye.
    *   **Framer Motion:** Smooth animations (jaise floating cards aur transitions) ke liye.
    *   **React Router DOM:** Pages ke darmiyan navigation aur role-based routes protect karne ke liye.
*   **Backend & Database:**
    *   **Firebase:** Pura platform serverless architecture pe hai jisme Firebase Authentication (Login/Signup) aur Cloud Firestore (Real-time NoSQL database) use hua hai.
*   **AI & Machine Learning (Smart Features):**
    *   **TensorFlow.js:** Browser ke andar directly run hota hai. Iska "Toxicity Model" community posts mein gaaliyan aur buri language detect karne ke liye use hota hai.
    *   **Python & Flask (Backend Microservice):** "Interest Assessment" module ke liye ek chota sa Python server banaya gaya hai. Isme **Scikit-Learn** ka Random Forest model train kiya gaya hai jo student ki field predict karta hai.
    *   **Google Gemini API:** Students ke liye step-by-step career "Roadmaps" aur uske "Quizzes" generate karne ke liye.
    *   *(CAP-2 Plan: Entry test generation ke liye open-source LLMs jese Llama 3 ya Mistral local server pe use honge).*
*   **Other Tools:**
    *   **EmailJS:** Account banate waqt 6-digit OTP email par bhejne ke liye.
    *   **HTML2PDF.js:** University managers ke liye student application ko directly PDF mein download karne ke liye.

---

## 3. User Roles (Platform Kon Use Kar Sakta Hai)

System ko teen (3) hisson mein taqseem kiya gaya hai:
1.  **Student:** Jo apply karega, apna career test dega, aur roadmap follow karega.
2.  **University Manager:** Jo apni university, programs, aur aane wali applications ko manage karega.
3.  **Platform Admin:** Jo pure system ko control karega aur naye managers ko approve karega.

---

## 4. Modules & Features (Kya Kya Banaya Gaya Hai)

### A. Authentication & Security (Login/Signup System)
*   **Role-Based Access:** Har user (Student, Manager, Admin) ka apna alag dashboard hai. Koi doosre ka dashboard nahi khol sakta.
*   **OTP Verification:** Signup ke waqt EmailJS ke zariye ek 6-digit code email pe aata hai account verify karne ke liye.
*   **Approval System:** Jab koi naya University Manager account banata hai, toh wo seedha andar nahi ja sakta. Uska account "Pending" state mein rehta hai jab tak Admin usko approve na kare.
*   **Password Management:** Forgot password aur change password ka mukammal secure flow majood hai.

### B. Student Portal (Student Ke Liye Features)
*   **Dashboard:** Yahan student apni applications ka current status aur apne roadmap ki progress dekh sakta hai.
*   **University Exploration:** Students filters laga kar universities search kar sakte hain. Har university ka apna ek detailed page hai jahan unki facilities, faculty, aur programs (degrees) show hote hain.
*   **Admissions & Scholarships:** 
    *   Student kisi bhi program mein direct apply kar sakta hai.
    *   Apply karte waqt system automatically check karta hai (marks waghera ki base pe) ke student kisi scholarship ke liye eligible hai ya nahi.
*   **AI Interest Assessment (ML Model):** Yeh ek quiz hai. Student answers select karta hai, data Python server pe jata hai, aur ML model (Scikit-Learn) batata hai ke is student ke liye "Computer Science" behtar hai ya "Medical" ya koi aur field.
*   **AI Learning Roadmaps:** Jo field select hoti hai, Google Gemini API us field ka ek complete step-by-step roadmap generate karti hai.
*   **Anti-Cheat Quizzes:** Roadmap ka har topic complete karne pe ek AI quiz hota hai. Isme tab-switching detection lagayi gayi hai (agar student cheat karne ke liye tab change kare toh pakra jaye).
*   **Entry Test UI:** MDCAT/ECAT tests ke liye ek khubsurat interface bana hua hai jisme timer aur grid shamil hai.

### C. University Manager Portal (University Ke Liye Features)
*   **Manager Dashboard:** Yahan analytics show hoti hain ke kitni applications aayin aur university ki rating kya chal rahi hai.
*   **Onboarding:** Manager apni university ka logo, pictures, aur details add kar sakta hai.
*   **Program & Scholarship Management:** Manager naye degree programs add kar sakta hai. Iske ilawa custom scholarships (jaise Merit, Need-based, Kinship) bana kar programs ke sath attach kar sakta hai.
*   **Admissions Management:**
    *   Manager ke paas sab students ki applications aati hain.
    *   Wo student ka poora profile aur result cards check kar sakta hai.
    *   Ek click pe application "Approve" ya "Reject" kar sakta hai (jis se student ko notification chali jati hai).
    *   Application ko PDF format mein download bhi kar sakta hai.
*   **Faculty & Transport:** University apni faculty list aur baso (buses) ke routes manage kar sakti hai.

### D. Administrator Portal (Admin Ke Liye Features)
*   **Admin Dashboard:** Platform ka total data (kitne users, kitni universities) show hota hai.
*   **Approvals:** Jo naye Managers apply karte hain, Admin unki details dekh kar unko Approve ya Reject karta hai.
*   **User Management:** Agar koi user terms violate kare, toh admin usko system se ban (block) kar sakta hai.

### E. Shared Features (Sab Ke Liye)
*   **Community Forum:** Yeh ek social media feed jesa hai jahan log sawalat pooch sakte hain ya updates de sakte hain. Iski sab se khaas baat yeh hai ke isme **AI Toxicity Moderation (TensorFlow.js)** lagi hui hai. Agar koi post mein gaali ya inappropriate baat likhta hai toh AI usko real-time mein detect kar ke block kar deta hai aur post nahi hone deta.
*   **Real-Time Chat:** Firebase ka istemal karte hue ek live chat application banayi gayi hai. Iske zariye students direct university managers se baat kar sakte hain.

---

## 5. CAP-2 (Aage Kya Banega - Future Plans)
Project ke doosre hisse (CAP-2) mein yeh cheezein implement ki jayengi:
1.  **Entry Test Module (Digital Twin):** Abhi sirf UI bana hai. Next phase mein apni khud ki train ki hui AI models (Llama 3 ya Mistral) use hongi jo bilkul real board exams jese past papers generate karengi. Isme external APIs (jaise OpenAI) use nahi hongi.
2.  **Intelligent Recommendation System:** Ek aesa algorithm banaya jayega jo student ke marks, location, aur interest ko dekhte hue usko khud automatically best universities aur programs recommend karega.

---
**Summary:**
EduNest ek mukammal aur advanced educational ecosystem hai jo purane manual admission process ko khatam kar ke AI aur modern web technologies ki madad se students aur universities dono ke liye zindagi asaan banata hai.
