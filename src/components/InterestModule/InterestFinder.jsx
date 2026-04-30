import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, CheckCircle, ChevronRight, Sparkles, Target, Compass, ArrowRight } from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { QUESTION_BANK } from '../../data/questionBank';

const FLASK_API_URL = 'http://localhost:5001';

// The order of categories matching the actual dataset columns (7 features)
// The order of categories MUST strictly match the trained pandas dataset columns:
// ['Logic_Coding', 'Math_Calc', 'Bio_Life', 'Chem_React', 'Human_Behavior', 'Design_Visuals', 'Physics_Nature']
const CATEGORY_ORDER = [
    "Computer Science",  // Logic_Coding
    "Mathematics",       // Math_Calc
    "Biology",           // Bio_Life
    "Chemistry",         // Chem_React
    "Psychology",        // Human_Behavior
    "Graphics / Design", // Design_Visuals
    "Physics"            // Physics_Nature
];

const InterestFinder = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();

    // --- State ---
    const [currentQuestion, setCurrentQuestion] = useState(null); // Type: { id, text, category, diff }
    const [history, setHistory] = useState([]); // Array of { questionId, answerVal }

    // Running Scores: { "Computer Science": { total: 5.0, count: 6 }, ... }
    const [categoryAggregates, setCategoryAggregates] = useState({});

    // 3-Phase Strategy State
    const [phase, setPhase] = useState(1); // 1: Baseline, 2: Drill-Down, 3: Contrast
    const [baselineCategoriesAsked, setBaselineCategoriesAsked] = useState([]);
    const [previousTopCategory, setPreviousTopCategory] = useState(null);
    const [lastRejectedCategory, setLastRejectedCategory] = useState(null); // Prevent ping-pong

    const [loading, setLoading] = useState(false);
    const [aiQuestionText, setAiQuestionText] = useState(null);
    const [currentProbabilities, setCurrentProbabilities] = useState(null);
    const [finalInterest, setFinalInterest] = useState(null);
    const [isExplorationRequired, setIsExplorationRequired] = useState(false);
    const [explorationReason, setExplorationReason] = useState("");

    // UI State
    const [hasStarted, setHasStarted] = useState(false);

    // Initialize logic
    useEffect(() => {
        if (userProfile?.interest && userProfile?.interestConfidence > 0.85) {
            setFinalInterest(userProfile.interest);
            setCurrentProbabilities({ [userProfile.interest]: userProfile.interestConfidence });
            setHasStarted(false); // Show result screen initially if already done
        } else {
            // Don't start automatically, show welcome screen
        }
    }, [userProfile]);

    const startSession = () => {
        setHasStarted(true);
        setPhase(1);
        setBaselineCategoriesAsked([]);
        setHistory([]);
        setCategoryAggregates({});
        setCurrentProbabilities(null);
        setPreviousTopCategory(null);
        setLastRejectedCategory(null);
        setFinalInterest(null);
        setIsExplorationRequired(false);

        // Phase 1: Start with first category's first question
        const categories = Object.keys(QUESTION_BANK);
        const firstCat = categories[0];
        const q = QUESTION_BANK[firstCat][0];
        setBaselineCategoriesAsked([firstCat]);
        setNextQuestionObj({ ...q, category: firstCat });
    };

    const setNextQuestionObj = (qObj) => {
        setCurrentQuestion(qObj);
        // Reset AI text for new question
        generateAiPhrasing(qObj.text);
    };

    const generateAiPhrasing = async (baseText) => {
        setLoading(true);
        setAiQuestionText(null); // Reset to null so we show loader

        try {
            const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
            if (!apiKey) {
                // Fallback to original text if missing key
                setAiQuestionText(baseText);
                setLoading(false);
                return;
            }

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "EduNest Interest AI",
                },
                body: JSON.stringify({
                    model: "arcee-ai/trinity-large-preview:free",
                    messages: [
                        {
                            role: "system",
                            content: "You are a friendly counselor. Rephrase this question for a student using SIMPLE English (A1/A2). Use emojis. Keep it under 35 words."
                        },
                        { role: "user", content: `Question: \"${baseText}\"` }
                    ],
                    max_tokens: 60,
                    temperature: 0.9
                })
            });

            if (response.ok) {
                const data = await response.json();
                const aiText = data.choices[0].message.content.replace(/^["']|["']$/g, '');
                setAiQuestionText(aiText);
            } else {
                // Fallback to original text on API error
                console.warn("OpenRouter API Error:", response.status);
                setAiQuestionText(baseText);
            }
        } catch (e) {
            // Fallback to original text on network error
            console.warn("Network Error:", e);
            setAiQuestionText(baseText);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = async (value) => {
        // Value: 3 (Yes) -> 1.0, 2 (Maybe) -> 0.5, 1 (No) -> 0.0
        let score = 0.5;
        if (value === 3) score = 1.0;
        if (value === 1) score = 0.0;

        console.log(`[Answer] Val: ${value}, Score: ${score}, Cat: ${currentQuestion.category}`);



        // 1. Update Aggregates
        const cat = currentQuestion.category;
        const newAggregates = { ...categoryAggregates };

        if (!newAggregates[cat]) newAggregates[cat] = { total: 0, count: 0 };

        // --- REJECTION PENALTY ---
        // If user says "No" (1) in Phase 2 or 3, apply a stronger penalty to decay the previous high score faster.
        if (value === 1 && (phase === 2 || phase === 3)) {
            // Reduce total by 40% immediately + add 0
            newAggregates[cat].total = newAggregates[cat].total * 0.6;
            // Count increases normally
            newAggregates[cat].count += 1;
            console.log(`[Penalty] Applied 40% decay to ${cat}. New Total: ${newAggregates[cat].total.toFixed(2)}`);

        } else {
            newAggregates[cat].total += score;
            newAggregates[cat].count += 1;
        }

        setCategoryAggregates(newAggregates);

        // 2. Update History
        const newHistory = [...history, { id: currentQuestion.id, val: score }];
        setHistory(newHistory);

        // 3. Construct Vector for Backend (7 floats based on exact dataset pattern)
        const vector = CATEGORY_ORDER.map(category => {
            if (newAggregates[category]) {
                let avg = newAggregates[category].total / newAggregates[category].count;
                return Math.max(0, Math.min(1, avg));
            }
            return 0.0; // Default if not asked yet
        });

        // 4. Predict
        try {
            const res = await axios.post(`${FLASK_API_URL}/predict-step`, { vector });
            const { top_class, max_prob, probabilities } = res.data;
            setCurrentProbabilities(probabilities);

            console.log(`[Prediction] Top: ${top_class} (${max_prob.toFixed(2)})`);



            // 5. 3-Phase Adaptive Logic
            const totalAsked = newHistory.length;
            const sortedClasses = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
            let [topCat, topProb] = sortedClasses[0];
            const [secondCat, secondProb] = sortedClasses[1];

            // --- HEURISTIC BOOST ---
            // If the model is stuck at a static probability (e.g. 0.65) despite more "Yes" answers,
            // we artificially boost the confidence based on the number of questions answered for the top category.
            const topStats = newAggregates[topCat];
            if (topStats && topStats.count > 1) {
                const avgScore = topStats.total / topStats.count;
                // Only boost if user is consistently positive (>0.8 avg)
                if (avgScore >= 0.8) {
                    const boost = (topStats.count - 1) * 0.05; // +5% per additional question
                    topProb = Math.min(0.98, topProb + boost);
                    // Update probabilities object for UI
                    probabilities[topCat] = topProb;
                    setCurrentProbabilities({ ...probabilities });
                    console.log(`[Heuristic Boost] Adjusted ${topCat} confidence to ${topProb.toFixed(2)} (Boost: ${boost.toFixed(2)})`);
                }
            }
            // -----------------------

            // === PHASE 1: BASELINE SAMPLING (Questions 1-7) ===
            if (phase === 1) {
                // Early ultra-high confidence check
                // LOWERED THRESHOLD: 0.95 -> 0.75 for faster drill-down
                // If user shows strong interest (Yes) + clear lead, switch to Phase 2 immediately
                if (topProb >= 0.75 && totalAsked >= 3) {
                    // Skip remaining baseline and start drilling down
                    setPhase(2);
                    setPreviousTopCategory(topCat);
                    console.log(`[Phase Switch] Early Exit Phase 1 due to high confidence (${topProb.toFixed(2)})`);
                    
                    const questions = QUESTION_BANK[topCat] || [];
                    const askedIds = newHistory.map(h => h.id);
                    const unasked = questions.filter(q => !askedIds.includes(q.id));

                    if (unasked.length > 0) {
                        unasked.sort((a, b) => a.diff - b.diff);
                        setNextQuestionObj({ ...unasked[0], category: topCat });
                        return;
                    }
                }

                // Continue baseline if not all categories covered
                if (baselineCategoriesAsked.length < 7) {
                    const categories = Object.keys(QUESTION_BANK);
                    const nextCat = categories.find(c => !baselineCategoriesAsked.includes(c));

                    if (nextCat) {
                        const q = QUESTION_BANK[nextCat][0]; // First question (diff 1)
                        setBaselineCategoriesAsked([...baselineCategoriesAsked, nextCat]);
                        setNextQuestionObj({ ...q, category: nextCat });
                        return;
                    }
                }

                // Baseline complete → Move to Phase 2
                setPhase(2);
                setPreviousTopCategory(topCat);
                console.log("[Phase Switch] Entering Phase 2");

                // Immediately trigger Phase 2 Question Selection
                const questions = QUESTION_BANK[topCat] || [];
                const askedIds = newHistory.map(h => h.id);
                const unasked = questions.filter(q => !askedIds.includes(q.id));

                if (unasked.length > 0) {
                    unasked.sort((a, b) => a.diff - b.diff);
                    setNextQuestionObj({ ...unasked[0], category: topCat });
                    return;
                }
            }

            // === PHASE 2: DRILL-DOWN (Questions 8-18) ===
            if (phase === 2) {
                // High confidence achieved → FINISH
                if (topProb >= 0.95 && totalAsked >= 6) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }

                // Check if we should transition to Phase 3 early (stuck confidence)
                if (totalAsked >= 12 && topProb >= 0.55 && topProb < 0.95) {
                    setPhase(3);
                }

                // Max questions for Phase 2
                if (totalAsked >= 18) {
                    if (topProb >= 0.55 && topProb < 0.95) {
                        setPhase(3);
                    } else if (topProb < 0.50) {
                        setIsExplorationRequired(true);
                        setExplorationReason("Your interests seem quite diverse. Try our entry tests!");
                        finishProcess(null, probabilities, topProb);
                        return;
                    } else {
                        finishProcess(topCat, probabilities, topProb);
                        return;
                    }
                }

                // Only execute Phase 2 question selection if still in Phase 2
                if (phase === 2) {
                    // STRICT STICKY / SWITCH LOGIC
                    let targetCategory = topCat;
                    console.log(`[Phase 2] Decision logic. Rejected: ${lastRejectedCategory}, CurrentTop: ${topCat}`);

                    if (value === 3) {
                        // User said YES (Absolutely) -> FORCE STICK to current category
                        targetCategory = currentQuestion.category;
                        // Clear rejection memory if they like this
                        setLastRejectedCategory(null);
                    } else if (value === 1) {
                        // User said NO (Not Really) -> FORCE SWITCH
                        // Switch to the highest probability category that isn't the current one AND not the last rejected one
                        const altCategory = sortedClasses.find(([cls]) =>
                            cls !== currentQuestion.category && cls !== lastRejectedCategory
                        )?.[0];

                        targetCategory = altCategory || topCat;

                        // Remember this rejection to prevent ping-pong
                        setLastRejectedCategory(currentQuestion.category);
                        console.log(`[Phase 2] Force Switch. New Target: ${targetCategory}`);
                    } else {
                        // User said MAYBE -> Let the model decide (Sticky to Top Probability)
                        if (previousTopCategory && topCat !== previousTopCategory) {
                            // If model wants to switch topCat, check if confirm
                            const prevProb = probabilities[previousTopCategory] || 0;
                            const gap = topProb - prevProb;
                            if (gap < 0.15) {
                                targetCategory = previousTopCategory;
                            } else {
                                targetCategory = topCat;
                            }
                        } else {
                            targetCategory = topCat;
                        }
                    }

                    setPreviousTopCategory(targetCategory);

                    const questions = QUESTION_BANK[targetCategory] || [];
                    const askedIds = newHistory.map(h => h.id);
                    const unasked = questions.filter(q => !askedIds.includes(q.id));

                    if (unasked.length > 0) {
                        // Difficulty progression: Easy → Medium → Hard
                        unasked.sort((a, b) => a.diff - b.diff);
                        setNextQuestionObj({ ...unasked[0], category: targetCategory });
                        return;
                    } else {
                        // If target exhausted, try alternative top (avoid recursion)
                        // find first category that has unasked questions
                        const availableCategory = sortedClasses.find(([cls]) => {
                            const qs = QUESTION_BANK[cls] || [];
                            const remaining = qs.filter(q => !askedIds.includes(q.id));
                            return remaining.length > 0;
                        })?.[0];

                        if (availableCategory) {
                            const qs = QUESTION_BANK[availableCategory];
                            const remaining = qs.filter(q => !askedIds.includes(q.id));
                            remaining.sort((a, b) => a.diff - b.diff);
                            setNextQuestionObj({ ...remaining[0], category: availableCategory });
                            console.log(`[Phase 2] Target exhausted. Fallback to: ${availableCategory}`);
                            return;
                        } else {
                            // Truly exhausted everything
                            finishProcess(topCat, probabilities, topProb);
                            return;
                        }
                    }
                }
            }

            // === PHASE 3: CONTRAST VERIFICATION (Questions 19-25) ===
            if (phase === 3) {
                // High confidence achieved → FINISH
                if (topProb >= 0.90) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }

                // Max questions overall
                if (totalAsked >= 25) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }

                // Ask from 2nd category to create contrast
                const questions = QUESTION_BANK[secondCat] || [];
                const askedIds = newHistory.map(h => h.id);
                const unasked = questions.filter(q => !askedIds.includes(q.id));

                if (unasked.length > 0) {
                    unasked.sort((a, b) => a.diff - b.diff);
                    setNextQuestionObj({ ...unasked[0], category: secondCat });
                    return;
                } else {
                    // No more contrast questions available
                    finishProcess(topCat, probabilities, topProb);
                }
            }

        } catch (error) {
            console.error("Prediction Error", error);
            setLoading(false);
        }
    };

    const finishProcess = async (result, probs, confidence) => {
        setLoading(false);
        setFinalInterest(result);

        console.log(`[Finished] Result: ${result}, Conf: ${confidence}`);

        if (currentUser && result && !isExplorationRequired) {
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    interest: result,
                    interestDate: new Date().toISOString(),
                    interestConfidence: confidence
                });
            } catch (e) {
                console.error("Save failed", e);
            }
        }
    };

    const handleRecalculate = () => {
        startSession(); // Start immediately for Retake
    };

    // --- RENDER HELPERS ---

    if (finalInterest || (userProfile?.interest && !hasStarted)) {
        return (
            <div className="max-w-4xl mx-auto p-8 font-sans">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/20 text-center relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-purple-500/10 pointer-events-none" />

                    {isExplorationRequired ? (
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 mb-6">
                                <Compass size={48} />
                            </div>
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500 mb-4">
                                Exploration Required
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-lg mb-8 max-w-lg mx-auto leading-relaxed">
                                {explorationReason || "We couldn't pinpoint a single strong interest. This is actually great! It means you're versatile."}
                            </p>
                        </div>
                    ) : (
                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 mb-6 shadow-glow">
                                <Target size={48} />
                            </div>
                            <h2 className="text-4xl font-bold text-slate-800 dark:text-white mb-2">
                                We Found a Good Fit!
                            </h2>
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500"
                                        style={{ width: `${currentProbabilities ? (currentProbabilities[finalInterest || userProfile.interest] * 100) : 0}%` }}
                                    />
                                </div>
                                <span className="font-mono font-bold text-emerald-500">
                                    {currentProbabilities ? (currentProbabilities[finalInterest || userProfile.interest] * 100).toFixed(0) :
                                        (userProfile?.interestConfidence * 100).toFixed(0)}% Match
                                </span>
                            </div>

                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 mb-10 drop-shadow-sm">
                                {finalInterest || userProfile.interest}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center gap-4 relative z-10">
                        <button onClick={() => navigate('/student')} className="px-8 py-4 rounded-xl bg-slate-900 dark:bg-black text-white font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-lg">
                            Go to Dashboard <ArrowRight size={18} />
                        </button>
                        <button onClick={handleRecalculate} className="px-8 py-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-bold hover:bg-slate-200 transition-colors">
                            Retake Assessment
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl w-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-3xl p-12 text-center shadow-2xl border border-white/20 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />

                    <div className="relative z-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-8 shadow-lg rotate-3 hover:rotate-6 transition-transform">
                            <Brain size={40} />
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                            Discover Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">True Potential</span>
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 leading-relaxed max-w-lg mx-auto">
                            Our AI-powered assessment analyzes your responses in real-time to pinpoint the perfect career path for you. It's not just a test; it's a conversation about your future.
                        </p>

                        <button
                            onClick={startSession}
                            className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Assessment <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 font-sans min-h-[80vh] flex flex-col justify-center">
            <motion.div
                key={currentQuestion?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-12 border border-white/20 relative"
            >
                {/* Decorative Gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                <Brain size={16} />
                                <span>AI Assessor</span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                                Q: {history.length + 1}
                            </span>
                        </div>



                        <AnimatePresence mode="wait">
                            {loading || !aiQuestionText ? (
                                <motion.div
                                    key="loader"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="min-h-[100px] mb-8 flex flex-col items-center justify-center"
                                >
                                    <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
                                    <span className="text-slate-400 text-sm animate-pulse">Curating question...</span>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={currentQuestion?.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="min-h-[100px] mb-8"
                                >
                                    <h3 className="text-2xl font-medium text-slate-800 dark:text-white leading-relaxed">
                                        {aiQuestionText}
                                    </h3>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="grid gap-3 mt-10">
                            <button onClick={() => handleAnswer(3)} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500 hover:text-white text-emerald-600 font-bold transition-all flex items-center gap-3">
                                <CheckCircle size={20} /> Yes, Absolutely
                            </button>
                            <button onClick={() => handleAnswer(2)} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold transition-all">
                                Maybe / Sometimes
                            </button>
                            <button onClick={() => handleAnswer(1)} className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-600 font-bold transition-all">
                                No, Not Really
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InterestFinder;
