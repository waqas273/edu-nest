const HF_API_KEY = import.meta.env.VITE_HF_API_KEY;

export const checkToxicity = async (text) => {
    // Bad Word Fallback List (Simple, English)
    const BAD_WORDS = ['hate', 'kill', 'stupid', 'idiot', 'scam', 'badword'];
    const isToxicFallback = BAD_WORDS.some(word => text.toLowerCase().includes(word));

    if (isToxicFallback) return { isToxic: true, score: 0.99 };

    if (HF_API_KEY) {
        try {
            const response = await fetch(
                "https://api-inference.huggingface.co/models/unitary/toxic-bert",
                {
                    headers: { Authorization: `Bearer ${HF_API_KEY}` },
                    method: "POST",
                    body: JSON.stringify({ inputs: text }),
                }
            );
            const result = await response.json();
            // HF text classification returns [[{label, score}, ...]]
            // We check if top label is 'toxic' or score is high
            if (Array.isArray(result) && result[0]) {
                const toxicScore = result[0].find(r => r.label === 'toxic')?.score || 0;
                return { isToxic: toxicScore > 0.7, score: toxicScore };
            }
        } catch (error) {
            console.warn("Moderation API failed, using fallback.", error);
        }
    }

    return { isToxic: false, score: 0 };
};
