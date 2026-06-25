import { getFallbackExam } from '../data/fallbackQuestions';

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
 * @param {string} [year] - Consistent past paper year
 * @returns {Array} Array of question objects
 */
const generateChunk = async (examType, subject, count, chunkIndex, year = null) => {
    const callWithRetry = async (retries = 3) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
            const response = await fetch(`${backendUrl}/api/generate-rag-exam`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    examType: examType.toLowerCase(),
                    subject: subject,
                    count: count,
                    year: year
                })
            });

            if (response.status === 429) {
                const waitMs = attempt * 15000; // 15s
                console.warn(`⏳ Rate limited (attempt ${attempt}/${retries}). Waiting ${waitMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitMs));
                continue;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error(`Backend RAG Error (${subject}):`, errData);
                throw new Error(`Backend Error ${response.status} for ${subject}: ${errData?.error || response.statusText}`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error(`Invalid response structure from backend RAG API for ${subject}`);
            }
            return data;
        }
        throw new Error(`Failed to generate ${subject} after ${retries} attempts.`);
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
    const blueprint = EXAM_BLUEPRINTS[examType.toLowerCase()];
    if (!blueprint) throw new Error(`Invalid exam type: "${examType}". Use "mdcat" or "ecat".`);

    const allQuestions = [];
    const totalChunks = blueprint.chunks.length;

    // Pick a random past paper year for consistent sequence template across all subjects in the full mock
    const years = examType.toLowerCase() === 'mdcat'
        ? ['2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017']
        : ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'];
    const selectedYear = years[Math.floor(Math.random() * years.length)];

    onProgress?.(`🚀 Starting ${examType.toUpperCase()} generation (Year ${selectedYear}) — ${blueprint.totalQuestions} questions across ${totalChunks} subjects...`);

    for (let i = 0; i < totalChunks; i++) {
        const { subject, count } = blueprint.chunks[i];

        onProgress?.(
            `📚 Generating ${subject} questions (${i + 1}/${totalChunks})... ${allQuestions.length} / ${blueprint.totalQuestions} done`
        );

        try {
            const chunkQuestions = await generateChunk(examType.toLowerCase(), subject, count, i, selectedYear);

            // Validate and sanitize each question (with template/default healing fallbacks to preserve question count)
            for (let idx = 0; idx < chunkQuestions.length; idx++) {
                const q = chunkQuestions[idx];
                const isValid = q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer;
                
                if (isValid) {
                    allQuestions.push({
                        id: allQuestions.length + 1,
                        subject: q.subject || subject,
                        difficulty: q.difficulty || "Moderate",
                        question: q.question,
                        options: q.options,
                        answer: q.answer,
                        explanation: q.explanation || ""
                    });
                } else {
                    console.warn(`⚠️ Warning: ${subject} question at index ${idx} failed validation:`, q);
                    allQuestions.push({
                        id: allQuestions.length + 1,
                        subject: q.subject || subject,
                        difficulty: q.difficulty || "Moderate",
                        question: q.question || `Practice question for ${subject}.`,
                        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
                        answer: q.answer || "Option A",
                        explanation: q.explanation || "Self-study practice question."
                    });
                }
            }

            console.log(`✅ ${subject}: ${chunkQuestions.length} questions generated. Total so far: ${allQuestions.length}`);

            // Delay between subjects to avoid API rate limits
            if (i < totalChunks - 1) {
                onProgress?.(
                    `⏳ ${subject} done (${allQuestions.length}/${blueprint.totalQuestions}). Preparing next subject in 5s...`
                );
                await new Promise(resolve => setTimeout(resolve, 5000));
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

    // Pick a random past paper year for subject-specific practice sequence template
    const years = examType.toLowerCase() === 'mdcat'
        ? ['2008', '2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017']
        : ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'];
    const selectedYear = years[Math.floor(Math.random() * years.length)];

    onProgress?.(`🚀 Preparing ${subject} practice test (${count} questions, Year ${selectedYear})...`);

    try {
        const questions = await generateChunk(examType.toLowerCase(), subject, count, 0, selectedYear);
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

