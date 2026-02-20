import * as tf from '@tensorflow/tfjs';
import * as toxicity from '@tensorflow-models/toxicity';

/**
 * AI Content Moderation Service
 * Uses TensorFlow.js Toxicity model to detect harmful content locally in the browser.
 * This eliminates the need for external API calls and resolves stability issues.
 */

let model = null;
let modelLoading = false;

// Labels to check
const labelsToDetection = [
    'identity_attack',
    'insult',
    'obscene',
    'severe_toxicity',
    'sexual_explicit',
    'threat',
    'toxicity'
];

/**
 * Loads the toxicity model if not already loaded.
 * @param {number} threshold - Confidence threshold (0-1).
 */
export const loadModerationModel = async (threshold = 0.8) => {
    if (model) return model;
    if (modelLoading) {
        // Wait for existing loading process
        while (modelLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (model) return model;
        }
    }

    modelLoading = true;
    try {
        console.log('Loading AI moderation model...');
        model = await toxicity.load(threshold, labelsToDetection);
        console.log('AI moderation model loaded successfully.');
        return model;
    } catch (error) {
        console.error('Failed to load toxicity model:', error);
        throw error;
    } finally {
        modelLoading = false;
    }
};

/**
 * Moderates text content locally using TensorFlow.js.
 * @param {string} text - The input text to analyze.
 * @returns {Object} - Result with isSafe status and details.
 */
export const moderateContent = async (text) => {
    if (!text || text.trim().length === 0) {
        return { isSafe: true, label: 'empty' };
    }

    // 1. Whitelist Check (Bypass AI for safe common words)
    const WHITELIST = ['hi', 'hello', 'hey', 'ok', 'okay', 'thanks', 'thank you', 'good', 'nice', 'great', 'wow', 'lol', 'yes', 'no'];
    const lowerText = text.toLowerCase().trim();
    if (WHITELIST.includes(lowerText) || WHITELIST.some(w => lowerText === w)) {
        return { isSafe: true, label: 'whitelisted' };
    }

    try {
        const activeModel = await loadModerationModel(0.85); // Raised threshold to 0.85
        const predictions = await activeModel.classify([text]);

        console.log("Full AI Predictions:", predictions);

        for (const prediction of predictions) {
            const hasMatch = prediction.results[0].match === true;
            const prob = prediction.results[0].probabilities[1]; // Probability of being toxic

            // Strict check: Match MUST be true AND probability > 0.85
            if (hasMatch && prob > 0.85) {
                const blockedCategory = prediction.label;
                console.log(`Blocked due to: ${blockedCategory} (Confidence: ${prob.toFixed(4)})`);

                return {
                    isSafe: false,
                    label: blockedCategory,
                    message: `AI Moderation: Your content was flagged as ${blockedCategory.replace('_', ' ')}.`
                };
            }
        }

        return {
            isSafe: true,
            label: 'safe'
        };

    } catch (error) {
        console.error('Local AI Moderation Error:', error);
        return {
            isSafe: true, // Fail open to avoid blocking users if model breaks
            label: 'error',
            message: 'Moderation check skipped due to error.'
        };
    }
};

/**
 * Quick check function for simple use
 */
export const isContentSafe = async (text) => {
    const result = await moderateContent(text);
    return result.isSafe;
};
