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
        // Load with a low threshold so we always get probabilities for evaluation
        const activeModel = await loadModerationModel(0.40);
        const predictions = await activeModel.classify([text]);

        // 1. Extract raw probability scores
        const scores = {};
        predictions.forEach(p => {
            scores[p.label] = p.results[0].probabilities[1];
        });

        console.log("Structured Moderation Scores:", JSON.stringify(scores, null, 2));

        // 2. Check for explicit statements of intent to cause physical harm ("future-tense violent intent")
        const violentIntentRegex = /(i\s+will|i'm\s+gonna|im\s+gonna|i\s+am\s+going\s+to|i'll)\s+(kill|murder|hurt|destroy|attack|beat|bomb|stab)\s+(you|him|her|them|everyone|anyone|this\s+place)/i;
        const hasViolentIntent = violentIntentRegex.test(text);

        // 3. HIGH Severity (BLOCK immediately)
        // Threat detection always overrides general toxicity
        if (scores.threat >= 0.60 || scores.severe_toxicity >= 0.75 || hasViolentIntent) {
            console.log(`[HIGH SEVERITY BLOCK] Threat: ${scores.threat.toFixed(3)}, Severe Tox: ${scores.severe_toxicity.toFixed(3)}, Violent Intent: ${hasViolentIntent}`);
            return {
                isSafe: false,
                severity: 'HIGH',
                action: 'BLOCK',
                label: 'threat_or_severe',
                message: 'AI Moderation: Content blocked immediately due to high severity violation (threat or extreme toxicity).'
            };
        }

        // 4. MEDIUM Severity (REVIEW status)
        if ((scores.threat >= 0.45 && scores.threat < 0.60) || scores.toxicity >= 0.70) {
            console.log(`[MEDIUM SEVERITY REVIEW] Threat: ${scores.threat.toFixed(3)}, Toxicity: ${scores.toxicity.toFixed(3)}`);
            return {
                isSafe: false, // Prevents immediate posting in 'CommunityFeed' without a separate review status flow
                severity: 'MEDIUM',
                action: 'REVIEW',
                label: 'high_toxicity_or_moderate_threat',
                message: 'AI Moderation: Content flagged for manual review due to potential policy violations.'
            };
        }

        // 5. LOW Severity (ALLOW)
        return {
            isSafe: true,
            severity: 'LOW',
            action: 'ALLOW',
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
