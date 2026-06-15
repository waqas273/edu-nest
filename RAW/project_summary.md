# EduNest Project Summary & Status — 15 May 2026

## API Keys (Current, Active)

| Key Name | Value | Purpose |
|---|---|---|
| `VITE_GEMINI_API_KEY` | `REMOVED_FOR_SECURITY` | Backup only |
| `VITE_GROQ_API_KEY` | `REMOVED_FOR_SECURITY` | **Main AI — Exam + Roadmap** |

---

## Current AI Architecture

### 1. Advanced Exam Module (`src/services/aiExamService.js`)
- **Generation:** Groq API → `llama-3.3-70b-versatile`.
- **Modes:** Full-length Mock Exams & Subject-Specific Practice (Biology, Maths, etc.).
- **Persistence:** Real-time Firestore sync starting from test initialization. 
- **Strategy:** Chunked generation for full exams; direct generation for subject tests.
- **Stability:** Robust retry logic and offline fallback question bank.

### 2. Roadmap Generation (`src/services/openaiService.js`)
- **Primary:** Groq API → `llama-3.3-70b-versatile`
- **Speed:** Much faster than Gemini/OpenRouter.

### 3. Interest Assessment (`src/components/InterestModule/InterestFinder.jsx`)
- **Status:** AI Rephrasing REMOVED to ensure stability and speed.
- **Backend:** Uses local Flask ML model (`python app.py`).

---

## Real Exam Blueprints

### MDCAT (PMDC Pattern)
- **Total:** 180 MCQs | **Time:** 180 minutes
- **Subjects:** Biology (81), Chemistry (45), Physics (36), English (9), Logical Reasoning (9).

### ECAT (UET Pattern)
- **Total:** 100 MCQs | **Time:** 100 minutes
- **Marking:** +4 for correct, -1 for incorrect.
- **Subjects:** Mathematics (30), Physics (30), Chemistry (30), English (10).

---

## Running the Project

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — ML Backend
cd python_backend
python app.py
```

---

## Project Status (May 15)
- ✅ **Subject-wise Practice**: Enabled for all major MDCAT/ECAT subjects.
- ✅ **Session Persistence**: Test progress and 'Aborted' sessions are saved to Firestore.
- ✅ **Refined History UI**: Dashboard shows 'Started' and 'Aborted' test statuses.
- ✅ **Professional Blueprint**: Strictly follows MDCAT/ECAT question distribution.
