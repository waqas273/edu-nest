import { getFallbackExam } from '../data/fallbackQuestions';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * REAL EXAM BLUEPRINTS (Official Pakistan Pattern)
 *
 * MDCAT: 180 Questions, 180 Minutes (PMDC Pattern)
 *   Biology: 81 | Chemistry: 45 | Physics: 36 | English: 9 | Logical Reasoning: 9
 *
 * ECAT: 100 Questions, 100 Minutes (UET Pattern)
 *   Mathematics: 30 | Physics: 30 | Chemistry: 30 | English: 10
 *   Marking: +4 correct, -1 incorrect
 */
const EXAM_BLUEPRINTS = {
    mdcat: {
        totalQuestions: 180,
        durationMinutes: 180,
        negativeMarking: false,
        passingPercent: 55,
        chunks: [
            { subject: "Biology",          count: 81 },
            { subject: "Chemistry",        count: 45 },
            { subject: "Physics",          count: 36 },
            { subject: "English",          count: 9  },
            { subject: "Logical Reasoning",count: 9  }
        ]
    },
    ecat: {
        totalQuestions: 100,
        durationMinutes: 100,
        negativeMarking: true,
        correctMarks: 4,
        incorrectMarks: -1,
        passingPercent: 50,
        chunks: [
            { subject: "Mathematics", count: 30 },
            { subject: "Physics",     count: 30 },
            { subject: "Chemistry",   count: 30 },
            { subject: "English",     count: 10 }
        ]
    }
};

/**
 * Calls Gemini API for a single chunk of questions.
 * @param {string} examType - "mdcat" or "ecat"
 * @param {string} subject - Subject name
 * @param {number} count - Number of questions to generate
 * @param {number} chunkIndex - Current chunk index (for variety)
 * @returns {Array} Array of question objects
 */
const generateChunk = async (examType, subject, count, chunkIndex) => {
    const blueprint = EXAM_BLUEPRINTS[examType];
    const examName = examType.toUpperCase();

    // Difficulty distribution: 20% Easy, 60% Moderate, 20% Hard
    const easyCount = Math.round(count * 0.2);
    const hardCount = Math.round(count * 0.2);
    const moderateCount = count - easyCount - hardCount;

    const markingNote = blueprint.negativeMarking
        ? `Note: This exam has NEGATIVE MARKING (${blueprint.correctMarks} for correct, ${blueprint.incorrectMarks} for incorrect). Questions should test precise knowledge.`
        : `Note: No negative marking. Questions should be conceptual and application-based.`;

    const prompt = `You are an expert ${examName} examiner from Pakistan. Generate EXACTLY ${count} high-quality ${subject} MCQs for the official ${examName} entrance exam.

EXAM CONTEXT:
- Exam: ${examName} (${blueprint.totalQuestions} total questions, ${blueprint.durationMinutes} minutes)
- Subject: ${subject} (this batch)
- Batch: ${chunkIndex + 1} (ensure questions are UNIQUE and not repetitive)
- Syllabus: Standard Pakistani FSc/Intermediate Level
${markingNote}

DIFFICULTY BREAKDOWN (MANDATORY):
- Easy (${easyCount} questions): Direct factual recall, definitions, basic formulas
- Moderate (${moderateCount} questions): Application of concepts, multi-step reasoning
- Hard (${hardCount} questions): Complex problem-solving, integrated concepts, numerical calculations

STRICT RULES:
1. Generate EXACTLY ${count} questions — no more, no less.
2. All 4 options must be plausible (no obviously wrong distractors).
3. Questions must strictly follow the ${examName} official syllabus.
4. Use real scientific values, formulas, and terminology.
5. The correct answer MUST exactly match one of the 4 options.
6. Each question must be unique. Do NOT repeat concepts from previous batches.
7. Return ONLY a valid JSON array. No markdown, no explanation.

JSON format (strictly follow this):
[
  {
    "subject": "${subject}",
    "difficulty": "Easy | Moderate | Hard",
    "question": "Full question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Exact correct option string",
    "explanation": "One sentence explaining why this is correct."
  }
]

Generate the ${count} ${subject} questions now:`;

    const callWithRetry = async (retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: [
                        { role: 'system', content: 'You are an expert Pakistan exam question setter. Always respond with valid JSON arrays only.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.4,
                    max_tokens: 8192,
                    response_format: { type: 'json_object' }
                })
            });

            if (response.status === 429) {
                const waitMs = attempt * 30000; // 30s, 60s, 90s
                console.warn(`⏳ Rate limited (attempt ${attempt}/${retries}). Waiting ${waitMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`Groq Error (${subject}):`, errData);
                throw new Error(`Groq API Error ${response.status} for ${subject}: ${errData?.error?.message || response.statusText}`);
            }

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error(`Empty response from Groq for ${subject}`);

            // Groq with json_object returns an object, find the array inside
            let parsed;
            try {
                const obj = JSON.parse(content);
                // The array might be nested under any key
                parsed = Array.isArray(obj) ? obj : Object.values(obj).find(v => Array.isArray(v));
                if (!parsed) throw new Error('No array found in response');
            } catch {
                // Try direct parse as array
                content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
                parsed = JSON.parse(content);
            }

            if (!Array.isArray(parsed)) throw new Error(`Invalid JSON structure for ${subject}`);
            return parsed;
        }
        throw new Error(`Rate limit hit for ${subject} after ${retries} retries. Please try again shortly.`);
    };

    return await callWithRetry();
};

/**
 * Main AI generation: Generates a full exam by processing chunks sequentially.
 * @param {string} examType - "mdcat" or "ecat"
 * @param {function} onProgress - Callback to update UI with progress messages
 * @returns {Array} Full array of question objects with sequential IDs
 */
const generateFullExamFromAI = async (examType, onProgress) => {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is missing!');
    }

    const blueprint = EXAM_BLUEPRINTS[examType.toLowerCase()];
    if (!blueprint) throw new Error(`Invalid exam type: "${examType}". Use "mdcat" or "ecat".`);

    const allQuestions = [];
    const totalChunks = blueprint.chunks.length;

    onProgress?.(`🚀 Starting ${examType.toUpperCase()} generation — ${blueprint.totalQuestions} questions across ${totalChunks} subjects...`);

    for (let i = 0; i < totalChunks; i++) {
        const { subject, count } = blueprint.chunks[i];

        onProgress?.(
            `📚 Generating ${subject} questions (${i + 1}/${totalChunks})... ${allQuestions.length} / ${blueprint.totalQuestions} done`
        );

        try {
            const chunkQuestions = await generateChunk(examType.toLowerCase(), subject, count, i);

            // Validate and sanitize each question
            for (const q of chunkQuestions) {
                if (q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer) {
                    allQuestions.push({
                        id: allQuestions.length + 1,
                        subject: q.subject || subject,
                        difficulty: q.difficulty || "Moderate",
                        question: q.question,
                        options: q.options,
                        answer: q.answer,
                        explanation: q.explanation || ""
                    });
                }
            }

            console.log(`✅ ${subject}: ${chunkQuestions.length} questions generated. Total so far: ${allQuestions.length}`);

            // Delay between chunks to stay within Groq's token-per-minute limits
            if (i < totalChunks - 1) {
                onProgress?.(
                    `⏳ ${subject} done (${allQuestions.length}/${blueprint.totalQuestions}). Preparing next subject in 15s...`
                );
                await new Promise(resolve => setTimeout(resolve, 15000));
            }

        } catch (error) {
            console.error(`❌ Failed to generate ${subject}:`, error);
            throw new Error(`Failed during ${subject} generation: ${error.message}`);
        }
    }

    onProgress?.(`✅ All ${allQuestions.length} questions generated! Preparing your exam...`);
    return allQuestions;
};

/**
 * NEW: Generates a subject-specific practice test.
 * @param {string} examType - "mdcat" or "ecat"
 * @param {string} subject - Subject name
 * @param {function} onProgress - Progress callback
 */
export const generateSubjectExam = async (examType, subject, onProgress) => {
    const blueprint = EXAM_BLUEPRINTS[examType.toLowerCase()];
    const subjectInfo = blueprint.chunks.find(c => c.subject.toLowerCase() === subject.toLowerCase());
    const count = subjectInfo ? subjectInfo.count : 30;

    onProgress?.(`🚀 Preparing ${subject} practice test (${count} questions)...`);

    if (!GROQ_API_KEY) {
        onProgress?.('⚠️ No API key found. Loading offline questions...');
        const fallback = getFallbackExam(examType, [{ subject, count }]);
        return fallback.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }

    try {
        const questions = await generateChunk(examType.toLowerCase(), subject, count, 0);
        return questions.map((q, idx) => ({
            id: idx + 1,
            subject: q.subject || subject,
            difficulty: q.difficulty || "Moderate",
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || ""
        }));
    } catch (error) {
        console.warn(`${subject} AI generation failed, switching to fallback:`, error.message);
        onProgress?.('⚠️ AI unavailable. Loading offline questions...');
        const fallback = getFallbackExam(examType, [{ subject, count }]);
        return fallback.filter(q => q.subject.toLowerCase() === subject.toLowerCase());
    }
};

/**
 * Smart wrapper: Tries Groq AI first. On quota/network failure, uses static fallback.
 */
export const generateFullExam = async (examType, onProgress) => {
    const blueprint = EXAM_BLUEPRINTS[examType.toLowerCase()];
    if (!GROQ_API_KEY) {
        onProgress?.('⚠️ No API key found. Loading offline question bank...');
        return getFallbackExam(examType, blueprint.chunks);
    }

    try {
        return await generateFullExamFromAI(examType, onProgress);
    } catch (error) {
        console.warn('AI generation failed, switching to fallback:', error.message);
        onProgress?.('⚠️ AI unavailable. Loading offline question bank...');
        await new Promise(r => setTimeout(r, 1500));
        return getFallbackExam(examType, blueprint.chunks);
    }
};

/**
 * Returns the blueprint info for a given exam type (for UI display).
 * @param {string} examType - "mdcat" or "ecat"
 */
export const getExamBlueprint = (examType) => {
    return EXAM_BLUEPRINTS[examType?.toLowerCase()] || null;
};

