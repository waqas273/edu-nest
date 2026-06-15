# EduNest — AI Prompt Engineering & Entrance Exam Technical Guide

This guide provides a professional, conceptual, and comprehensive technical analysis of the **AI-Powered Entrance Exam Generation Module** in EduNest. It documents the core **Prompt Engineering Strategy**, curriculum blueprints, anti-cheat mechanisms, and operational workflows without displaying complex code blocks.

---

## 1. AI Prompt Engineering Strategy

The heart of the dynamic entrance exam generator lies in a highly structured, role-based prompting framework. By configuring specific instructions, the system forces the AI Large Language Model (Groq Llama 3.3) to act as a highly specialized human expert.

### A. Persona & Role Definition
The AI is initialized with a high-authority persona:
*   **System Role:** An expert Pakistani board question setter and entrance exam compiler.
*   **Target Audience:** Students preparing for competitive, high-stakes medical (MDCAT) and engineering (ECAT) admissions.
*   **Syllabus Level:** Pakistan's official Intermediate (FSc / HSSC) Federal and Provincial textbook boards.

### B. Dynamic Context Injection
Every time the generator requests a set of questions, it dynamically injects key parameters into the prompt:
*   **Exam Name:** Dynamic tag matching MDCAT or ECAT specifications.
*   **Subject Context:** The exact subject (e.g., Biology, Mathematics, Physics) to prevent general knowledge out-of-syllabus leaks.
*   **Batch Tracking:** Tracking numbers to ensure that each generated chunk produces entirely unique conceptual questions without repeating topics from previous batches.

---

## 2. Curriculum & Exam Blueprints

EduNest strictly replicates the official question distributions and grading parameters defined by Pakistan's state authorities:

### A. MDCAT Blueprint (PMDC Pattern)
*   **Total Questions:** 180 Multiple Choice Questions (MCQs)
*   **Official Duration:** 180 Minutes (1 minute per question)
*   **Negative Marking:** None (Every correct answer adds 1 mark; incorrect answers carry zero penalty)
*   **Passing Threshold:** 55%
*   **Subject Weightage:**
    *   *Biology:* 81 Questions
    *   *Chemistry:* 45 Questions
    *   *Physics:* 36 Questions
    *   *English:* 9 Questions
    *   *Logical Reasoning:* 9 Questions

### B. ECAT Blueprint (UET Pattern)
*   **Total Questions:** 100 Multiple Choice Questions (MCQs)
*   **Official Duration:** 100 Minutes (1 minute per question)
*   **Negative Marking:** Active (+4 marks for each correct choice, -1 mark deduction for each incorrect choice)
*   **Passing Threshold:** 50%
*   **Subject Weightage:**
    *   *Mathematics:* 30 Questions
    *   *Physics:* 30 Questions
    *   *Chemistry:* 30 Questions
    *   *English:* 10 Questions

---

## 3. Weighted Difficulty Breakdown

To mimic real entrance exam standards, the prompt enforces a strict mathematical distribution of question difficulties for every single subject chunk generated:

*   **Easy Questions (20%):** Designed to test direct factual recall, basic definitions, standard terminology, and direct single-variable formulas (e.g., matching a scientific unit or identifying a cell organelle).
*   **Moderate Questions (60%):** Designed to test application of concepts, multi-step logical reasoning, and conceptual comprehension (e.g., predicting an reaction outcome or identifying structural patterns).
*   **Hard Questions (20%):** Designed to test complex numerical calculations, multi-step problem solving, and integrated conceptual analysis (e.g., solving mathematical equations with constants).

---

## 4. Strict Output Formatting Rules

To ensure that the raw AI output seamlessly parses into the React user interface, the system gives the LLM strict constraints:

1.  **Format Restriction:** The AI must output only a valid, flat JSON list structure. Extra conversational text, introductory statements, or Markdown wrappers are strictly prohibited.
2.  **Required Attributes:** Every question object must contain five keys:
    *   *subject:* The active academic subject.
    *   *difficulty:* The calculated rating (Easy, Moderate, Hard).
    *   *question:* The conceptual query statement.
    *   *options:* Exactly four highly plausible choices (Option A, B, C, D) with no obviously simple distractors.
    *   *answer:* The exact string match of the correct option.
    *   *explanation:* A concise, single-sentence explanation detailing the mathematical or scientific reasoning behind the correct choice.

---

## 5. Execution Mechanics & API Safety

Generating up to 180 dynamic questions in real-time poses significant network and rate-limit challenges. The module uses a robust, two-tiered safety engine:

### A. Sequential Batch Chunking
Instead of requesting all questions in one massive request—which would exceed model token limits and crash the network—the system processes subjects sequentially (one by one) with visual loaders updating the student on progress.

### B. Cooldowns & Progressive Retry Logic
Between subject requests, the engine executes a progressive cooldown cycle:
*   A 15-second intentional delay is added between subject generations to stay well within free-tier API rate limits.
*   If a Rate Limit (HTTP 429) is detected, the engine executes a 3-phase automated retry loop, progressively waiting 30 seconds, 60 seconds, and 90 seconds before trying again.

### C. Safe Offline Fallback System
If the API key is absent, or if the model quota is completely exhausted, the app instantly switches to an internal, local database containing real, high-quality Intermediate-level questions. This ensures the student gets an identical exam experience without experiencing page crashes or endless loading indicators.

---

## 6. Advanced Anti-Cheat Core

To protect test integrity during live grand exams, the frontend implements three deep security layers:

*   **Tab Switch Tracker:** The application actively listens for page visibility shifts. If a student minimizes the browser, opens a split-screen, or switches tabs to look up answers, a high-alert warning modal blocks the screen. On the third violation, the test is automatically submitted.
*   **Context Menu Blocker:** Mouse right-clicks and standard text copying are completely disabled across the exam environment, preventing students from copy-pasting questions into external search engines.
*   **Unload Protection:** If a student attempts to close the browser, refresh the page, or navigate away from the test area, the system intercepts the unload, registers an aborted status, and instantly commits their current progress to Firestore so no academic progress is lost.
