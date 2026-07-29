import axios from 'axios';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Extracts 100% dynamic, structured admission requirements from prospectus text using Groq LLaMA-3.
 * Returns entry tests array, custom rules array, streams, document checklist, and baselines.
 * 
 * @param {string} prospectusText 
 * @returns {Promise<{
 *   minInterPercentage: number,
 *   minMatricPercentage: number,
 *   allowedInterStreams: string[],
 *   requireEntryTest: boolean,
 *   entryTests: Array<{testName: string, minScore: number}>,
 *   allowedDomicile: string,
 *   maxAgeLimit: number,
 *   minBachelorCgpa: number,
 *   requiredDocuments: string[],
 *   customRules: Array<{label: string, value: string}>,
 *   extraRequirements: string
 * }>}
 */
export const extractAdmissionRequirementsWithGroq = async (prospectusText) => {
    if (!prospectusText || !prospectusText.trim()) {
        throw new Error('Please enter some prospectus text first.');
    }

    if (!GROQ_API_KEY) {
        throw new Error('Groq API Key (VITE_GROQ_API_KEY) is missing in environment variables.');
    }

    const systemPrompt = `
You are an expert academic data extractor for Pakistani higher education institutions.
Extract structured, modular admission eligibility requirements from the given prospectus text.

Return ONLY a JSON object with these exact keys:
- "minInterPercentage": number (minimum FSc/Intermediate percentage required e.g. 60, default 60)
- "minMatricPercentage": number (minimum Matriculation percentage required e.g. 50, default 50)
- "allowedInterStreams": array of strings (e.g. ["Pre-Engineering", "ICS", "Pre-Medical", "A-Levels", "DAE"])
- "requireEntryTest": boolean (true if an entry test is required, false otherwise)
- "entryTests": array of objects e.g. [{"testName": "NTS NAT-IE", "minScore": 50}, {"testName": "FAST Entry Test", "minScore": 50}]
- "allowedDomicile": string (e.g. "Open Merit (All Pakistan)", "Punjab Only", "Sindh Only", "KPK Only")
- "maxAgeLimit": number (maximum age limit in years e.g. 24, 0 if no age limit)
- "minBachelorCgpa": number (minimum CGPA for MS/PhD degrees e.g. 2.5, 0 for BS/Undergrad)
- "requiredDocuments": array of strings e.g. ["Matric Marksheet", "FSc Marksheet", "CNIC / B-Form", "Test Scorecard", "Domicile"]
- "customRules": array of objects for specific conditions e.g. [{"label": "Math Requirement", "value": "Must have studied Math in FSc"}, {"label": "Attempt Limit", "value": "Must pass in 1st attempt"}]
- "extraRequirements": string (concise summary note)

Do not include any markdown formatting, backticks, or text outside the JSON object.
`;

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Prospectus Text:\n"${prospectusText}"` }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                }
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response received from Groq AI.');
        }

        const parsed = JSON.parse(content);

        // Normalize entryTests
        let entryTests = [];
        if (Array.isArray(parsed.entryTests) && parsed.entryTests.length > 0) {
            entryTests = parsed.entryTests.map(t => ({
                testName: t.testName || t.name || 'NTS NAT / University Test',
                minScore: parseFloat(t.minScore || t.score) || 50
            }));
        } else if (parsed.entryTestName) {
            entryTests = [{ testName: parsed.entryTestName, minScore: parseFloat(parsed.minTestScore) || 50 }];
        } else {
            entryTests = [{ testName: 'NTS NAT / University Test', minScore: 50 }];
        }

        // Normalize customRules
        let customRules = [];
        if (Array.isArray(parsed.customRules) && parsed.customRules.length > 0) {
            customRules = parsed.customRules.map(r => ({
                label: r.label || 'Special Criteria',
                value: r.value || r.rule || 'Condition detail'
            }));
        }

        return {
            minInterPercentage: parseFloat(parsed.minInterPercentage) || 60,
            minMatricPercentage: parseFloat(parsed.minMatricPercentage) || 50,
            allowedInterStreams: Array.isArray(parsed.allowedInterStreams) && parsed.allowedInterStreams.length > 0
                ? parsed.allowedInterStreams
                : ["Pre-Engineering", "ICS"],
            requireEntryTest: Boolean(parsed.requireEntryTest ?? true),
            entryTests,
            allowedDomicile: parsed.allowedDomicile || 'Open Merit (All Pakistan)',
            maxAgeLimit: parseInt(parsed.maxAgeLimit) || 0,
            minBachelorCgpa: parseFloat(parsed.minBachelorCgpa) || 0,
            requiredDocuments: Array.isArray(parsed.requiredDocuments) && parsed.requiredDocuments.length > 0
                ? parsed.requiredDocuments
                : ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"],
            customRules,
            extraRequirements: parsed.extraRequirements || ''
        };
    } catch (error) {
        console.error('Groq AI extraction failed:', error);
        throw error;
    }
};
