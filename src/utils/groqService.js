import axios from 'axios';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Extracts structured admission requirements from unstructured prospectus text using Groq LLaMA-3.
 * @param {string} prospectusText 
 * @returns {Promise<{minInterPercentage: number, minMatricPercentage: number, entryTestName: string, minTestScore: number, extraRequirements: string}>}
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
Extract structured admission eligibility requirements from the given text.

Return ONLY a JSON object with these exact keys:
- "minInterPercentage": number (minimum FSc/Intermediate percentage required, default 60 if not specified, 0-100)
- "minMatricPercentage": number (minimum Matriculation percentage required, default 50 if not specified, 0-100)
- "entryTestName": string (name of required test e.g. "NTS NAT-IE", "MDCAT", "ECAT", "SAT", "University Entry Test", or "None" if not required)
- "minTestScore": number (minimum required test passing percentage/marks, default 50 if test required, else 0)
- "extraRequirements": string (concise summary of stream, subject rules, domicile, CGPA, or special conditions)

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
            entryTestName: parsed.entryTestName || 'NTS / University Test',
            minTestScore: parseFloat(parsed.minTestScore) || 50,
            extraRequirements: parsed.extraRequirements || ''
        };
    } catch (error) {
        console.error('Groq AI extraction failed:', error);
        throw error;
    }
};
