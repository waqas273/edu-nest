import axios from 'axios';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Extracts comprehensive structured admission requirements from unstructured prospectus text using Groq LLaMA-3.
 * @param {string} prospectusText 
 * @returns {Promise<{
 *   minInterPercentage: number,
 *   minMatricPercentage: number,
 *   allowedInterStreams: string[],
 *   requireEntryTest: boolean,
 *   entryTestName: string,
 *   minTestScore: number,
 *   allowedDomicile: string,
 *   maxAgeLimit: number,
 *   minBachelorCgpa: number,
 *   requiredDocuments: string[],
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
Extract structured admission eligibility requirements from the given prospectus text for automatic student evaluation.

Return ONLY a JSON object with these exact keys:
- "minInterPercentage": number (minimum FSc/Intermediate percentage required, default 60 if not specified, 0-100)
- "minMatricPercentage": number (minimum Matriculation percentage required, default 50 if not specified, 0-100)
- "allowedInterStreams": array of strings (e.g. ["Pre-Engineering", "ICS", "Pre-Medical", "A-Levels", "DAE", "Commerce", "Arts"], default ["Pre-Engineering", "ICS"] if unspecified)
- "requireEntryTest": boolean (true if an entry test is required, false otherwise)
- "entryTestName": string (e.g. "NTS NAT-IE", "MDCAT", "ECAT", "SAT", "University Entry Test", or "None")
- "minTestScore": number (minimum test score percentage required, default 50 if required, else 0)
- "allowedDomicile": string (e.g. "Open Merit (All Pakistan)", "Punjab Only", "Sindh Only", "KPK Only", "Balochistan Only")
- "maxAgeLimit": number (maximum age limit in years, 0 if no age limit specified)
- "minBachelorCgpa": number (minimum CGPA for MS/PhD degrees e.g. 2.5, 0 for BS/Undergrad)
- "requiredDocuments": array of strings (e.g. ["Matric Marksheet", "FSc Marksheet", "CNIC / B-Form", "Entry Test Scorecard", "Domicile Certificate", "Equivalence Certificate (IBCC)"])
- "extraRequirements": string (concise summary of any special conditions, subject rules, or attempt limits)

Do not include any markdown formatting, backticks, or explanation outside the JSON object.
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
        return {
            minInterPercentage: parseFloat(parsed.minInterPercentage) || 60,
            minMatricPercentage: parseFloat(parsed.minMatricPercentage) || 50,
            allowedInterStreams: Array.isArray(parsed.allowedInterStreams) && parsed.allowedInterStreams.length > 0
                ? parsed.allowedInterStreams
                : ["Pre-Engineering", "ICS"],
            requireEntryTest: Boolean(parsed.requireEntryTest ?? true),
            entryTestName: parsed.entryTestName || 'NTS NAT / University Test',
            minTestScore: parseFloat(parsed.minTestScore) || 50,
            allowedDomicile: parsed.allowedDomicile || 'Open Merit (All Pakistan)',
            maxAgeLimit: parseInt(parsed.maxAgeLimit) || 0,
            minBachelorCgpa: parseFloat(parsed.minBachelorCgpa) || 0,
            requiredDocuments: Array.isArray(parsed.requiredDocuments) && parsed.requiredDocuments.length > 0
                ? parsed.requiredDocuments
                : ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"],
            extraRequirements: parsed.extraRequirements || ''
        };
    } catch (error) {
        console.error('Groq AI extraction failed:', error);
        throw error;
    }
};
