import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Brain, CheckCircle, ChevronRight, Sparkles, Target, Compass, ArrowRight } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { QUESTION_BANK } from '../../data/questionBank';

const FLASK_API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

// The order of categories MUST strictly match the trained pandas dataset columns:
// ['Logic_Coding', 'Math_Calc', 'Bio_Life', 'Chem_React', 'Human_Behavior', 'Design_Visuals', 'Physics_Nature']
const CATEGORY_ORDER = [
    'Computer Science',  // Logic_Coding
    'Mathematics',       // Math_Calc
    'Biology',           // Bio_Life
    'Chemistry',         // Chem_React
    'Psychology',        // Human_Behavior
    'Graphics / Design', // Design_Visuals
    'Physics',           // Physics_Nature
];

const InterestFinder = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();

    // ── State ──────────────────────────────────────────────────────────────────
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [history, setHistory]                 = useState([]);
    const [categoryAggregates, setCategoryAggregates] = useState({});

    // 3-Phase Strategy
    const [phase, setPhase]                             = useState(1);
    const [baselineCategoriesAsked, setBaselineCategoriesAsked] = useState([]);
    const [previousTopCategory, setPreviousTopCategory] = useState(null);
    const [lastRejectedCategory, setLastRejectedCategory] = useState(null);

    const [loading, setLoading] = useState(false);
    const [currentProbabilities, setCurrentProbabilities] = useState(null);
    const [finalInterest, setFinalInterest] = useState(null);

    // isDone: separate "finished" flag.
    // We cannot rely on `finalInterest !== null` alone because exploration result is `null`.
    const [isDone, setIsDone] = useState(false);
    const [isExplorationRequired, setIsExplorationRequired] = useState(false);

    // isFinishedRef: prevents finishProcess from being called multiple times due to stale closure.
    const isFinishedRef = useRef(false);

    const [hasStarted, setHasStarted] = useState(false);

    // ── Initialize: if user already has a high-confidence interest, show result ──
    useEffect(() => {
        if (userProfile?.interest && userProfile?.interestConfidence > 0.85) {
            setFinalInterest(userProfile.interest);
            setCurrentProbabilities({ [userProfile.interest]: userProfile.interestConfidence });
            setIsDone(true);
            setHasStarted(false);
        }
    }, [userProfile]);

    // ── Start Session ──────────────────────────────────────────────────────────
    const startSession = () => {
        // Reset the finished guard
        isFinishedRef.current = false;

        setHasStarted(true);
        setIsDone(false);
        setPhase(1);
        setBaselineCategoriesAsked([]);
        setHistory([]);
        setCategoryAggregates({});
        setCurrentProbabilities(null);
        setPreviousTopCategory(null);
        setLastRejectedCategory(null);
        setFinalInterest(null);
        setIsExplorationRequired(false);

        // Phase 1: start with first category's easiest question
        const categories = Object.keys(QUESTION_BANK);
        const firstCat   = categories[0];
        const q          = QUESTION_BANK[firstCat][0];
        setBaselineCategoriesAsked([firstCat]);
        setCurrentQuestion({ ...q, category: firstCat });
    };

    // ── Answer Handler ─────────────────────────────────────────────────────────
    const handleAnswer = async (value) => {
        // Guard: do nothing if session is already finished (prevents infinite loops)
        if (isFinishedRef.current) return;

        // Map button value → numeric score
        let score = 0.5;
        if (value === 3) score = 1.0;   // Yes, Absolutely
        if (value === 1) score = 0.0;   // No, Not Really

        console.log(`[Answer] Val: ${value}, Score: ${score}, Cat: ${currentQuestion.category}`);

        // 1. Update category aggregates
        const cat = currentQuestion.category;
        const newAggregates = { ...categoryAggregates };
        if (!newAggregates[cat]) newAggregates[cat] = { total: 0, count: 0 };

        if (value === 1 && (phase === 2 || phase === 3)) {
            // Rejection penalty in later phases: decay existing total by 40%
            newAggregates[cat].total  = newAggregates[cat].total * 0.6;
            newAggregates[cat].count += 1;
            console.log(`[Penalty] 40% decay on ${cat} → total: ${newAggregates[cat].total.toFixed(2)}`);
        } else {
            newAggregates[cat].total += score;
            newAggregates[cat].count += 1;
        }
        setCategoryAggregates(newAggregates);

        // 2. Append to history
        const newHistory = [...history, { id: currentQuestion.id, val: score }];
        setHistory(newHistory);

        // 3. Build 7-float feature vector for the ML model
        const vector = CATEGORY_ORDER.map(category => {
            if (newAggregates[category]) {
                const avg = newAggregates[category].total / newAggregates[category].count;
                return Math.max(0, Math.min(1, avg));
            }
            return 0.0;
        });

        try {
            const res = await axios.post(`${FLASK_API_URL}/predict-step`, { vector });
            const { probabilities } = res.data;
            setCurrentProbabilities(probabilities);

            const totalAsked    = newHistory.length;
            const sortedClasses = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
            let [topCat, topProb] = sortedClasses[0];
            const [secondCat]    = sortedClasses[1] || ['', 0];

            console.log(`[Prediction] Top: ${topCat} (${topProb.toFixed(3)}), Q#${totalAsked}`);

            // Heuristic Boost: compensate for a model that plateaus despite consistent "Yes" answers
            const topStats = newAggregates[topCat];
            if (topStats && topStats.count > 1) {
                const avgScore = topStats.total / topStats.count;
                if (avgScore >= 0.8) {
                    const boost = (topStats.count - 1) * 0.05; // +5% per additional question
                    topProb = Math.min(0.98, topProb + boost);
                    probabilities[topCat] = topProb;
                    setCurrentProbabilities({ ...probabilities });
                    console.log(`[Boost] ${topCat} confidence adjusted → ${topProb.toFixed(3)}`);
                }
            }

            // ─────────────────────────────────────────────────────────────────
            // CRITICAL FIX: Track phase in a LOCAL variable.
            //
            // React's setState is asynchronous — after calling setPhase(2),
            // the `phase` variable from the closure still holds the OLD value.
            // By updating `currentPhase` locally we get instant, synchronous
            // phase awareness within this single invocation.
            // ─────────────────────────────────────────────────────────────────
            let currentPhase = phase;
            const askedIds   = newHistory.map(h => h.id);

            // ── Helper: next unasked question from a specific category ──
            const getNextQ = (targetCat) => {
                const qs = QUESTION_BANK[targetCat] || [];
                const unasked = qs.filter(q => !askedIds.includes(q.id));
                if (unasked.length === 0) return null;
                unasked.sort((a, b) => a.diff - b.diff); // Easy → Hard progression
                return { ...unasked[0], category: targetCat };
            };

            // ── Helper: first category with remaining questions (skip excludes) ──
            const getAnyQ = (excludeCats = []) => {
                for (const [cls] of sortedClasses) {
                    if (excludeCats.includes(cls)) continue;
                    const q = getNextQ(cls);
                    if (q) return q;
                }
                return null;
            };

            // ═══════════════════════════════════════════════════════
            // PHASE 1 — BASELINE SAMPLING (one question per category)
            // ═══════════════════════════════════════════════════════
            if (currentPhase === 1) {
                // Early exit: model is already highly confident after at least 3 Qs
                if (topProb >= 0.75 && totalAsked >= 3) {
                    console.log(`[Phase] 1 → 2 early (conf ${topProb.toFixed(2)})`);
                    currentPhase = 2;
                    setPhase(2);
                    setPreviousTopCategory(topCat);
                    const q = getNextQ(topCat);
                    if (q) { setCurrentQuestion(q); return; }
                    // Fall through to Phase 2 logic if topCat already exhausted
                }

                // Continue asking one question per remaining category
                if (currentPhase === 1 && baselineCategoriesAsked.length < 7) {
                    const categories = Object.keys(QUESTION_BANK);
                    const nextCat    = categories.find(c => !baselineCategoriesAsked.includes(c));
                    if (nextCat) {
                        setBaselineCategoriesAsked(prev => [...prev, nextCat]);
                        const q = getNextQ(nextCat);
                        if (q) { setCurrentQuestion(q); return; }
                    }
                }

                // All 7 baselines answered → move to Phase 2
                if (currentPhase === 1) {
                    console.log('[Phase] 1 → 2 (baseline complete)');
                    currentPhase = 2;
                    setPhase(2);
                    setPreviousTopCategory(topCat);
                    const q = getNextQ(topCat);
                    if (q) { setCurrentQuestion(q); return; }
                    // If topCat exhausted, fall through to Phase 2 block below
                }
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 2 — DRILL-DOWN (adaptive, up to 18 total Qs)
            // ═══════════════════════════════════════════════════════
            if (currentPhase === 2) {
                // Confident enough → done
                if (topProb >= 0.95 && totalAsked >= 6) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }

                // Reached Phase 2 question cap
                if (totalAsked >= 18) {
                    if (topProb < 0.55) {
                        // Worst case: user answered ambiguously throughout
                        console.log('[Phase 2] Low confidence at cap → exploration required');
                        setIsExplorationRequired(true);
                        finishProcess(null, probabilities, topProb);
                        return;
                    }
                    // Switch to Phase 3 — update LOCAL var immediately
                    console.log('[Phase] 2 → 3 (max Qs reached)');
                    currentPhase = 3;
                    setPhase(3);
                    // Fall through to Phase 3 block below (do NOT run Phase 2 question logic)
                } else if (totalAsked >= 10 && topProb < 0.40) {
                    // WORST CASE FIX: after 10 Qs, if confidence is extremely low (all-Maybe scenario),
                    // switch to Phase 3 early rather than endlessly drilling one low-confidence category.
                    console.log(`[Phase] 2 → 3 (very low conf ${topProb.toFixed(2)} at Q${totalAsked})`);
                    currentPhase = 3;
                    setPhase(3);
                } else if (totalAsked >= 12 && topProb >= 0.40 && topProb < 0.95) {
                    // Stuck confidence → early Phase 3
                    console.log(`[Phase] 2 → 3 (plateau at Q${totalAsked})`);
                    currentPhase = 3;
                    setPhase(3);
                    // Fall through to Phase 3 block below
                }

                // Only run Phase 2 question selection if STILL in Phase 2
                if (currentPhase === 2) {
                    let targetCat = topCat;

                    if (value === 3) {
                        // YES → keep drilling in the current category
                        targetCat = currentQuestion.category;
                        setLastRejectedCategory(null);
                    } else if (value === 1) {
                        // NO → switch to highest-probability alternative
                        const alt = sortedClasses.find(([cls]) =>
                            cls !== currentQuestion.category && cls !== lastRejectedCategory
                        )?.[0];
                        targetCat = alt || topCat;
                        setLastRejectedCategory(currentQuestion.category);
                        console.log(`[Phase 2] Switch → ${targetCat}`);
                    } else {
                        // MAYBE → follow model, but stabilise if gap is narrow
                        if (previousTopCategory && topCat !== previousTopCategory) {
                            const prevProb = probabilities[previousTopCategory] || 0;
                            targetCat = (topProb - prevProb < 0.15) ? previousTopCategory : topCat;
                        } else {
                            targetCat = topCat;
                        }
                    }

                    setPreviousTopCategory(targetCat);

                    // Try preferred category
                    const q = getNextQ(targetCat);
                    if (q) {
                        // DEDUP guard: never show the same question twice
                        if (q.id === currentQuestion?.id) {
                            console.log('[Phase 2] Dedup: same question would repeat, trying fallback');
                            const fallback = getAnyQ([targetCat]);
                            if (fallback) { setCurrentQuestion(fallback); return; }
                            finishProcess(topCat, probabilities, topProb);
                            return;
                        }
                        setCurrentQuestion(q);
                        return;
                    }

                    // Target exhausted → fall back to any remaining question
                    const fallback = getAnyQ([]);
                    if (fallback) {
                        console.log(`[Phase 2] ${targetCat} exhausted, fallback → ${fallback.category}`);
                        setCurrentQuestion(fallback);
                        return;
                    }

                    // Truly nothing left → finish
                    console.log('[Phase 2] All questions exhausted → force finish');
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }
            }

            // ═══════════════════════════════════════════════════════
            // PHASE 3 — CONTRAST VERIFICATION (up to 25 total Qs)
            // ═══════════════════════════════════════════════════════
            if (currentPhase === 3) {
                // High confidence achieved → done
                if (topProb >= 0.90) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }
                // Absolute max questions reached → done
                if (totalAsked >= 25) {
                    finishProcess(topCat, probabilities, topProb);
                    return;
                }

                // Ask a question from the 2nd-highest category to create contrast
                const q = getNextQ(secondCat);
                if (q) { setCurrentQuestion(q); return; }

                // 2nd category exhausted → try any other (not the top one)
                const fallback = getAnyQ([topCat]);
                if (fallback) { setCurrentQuestion(fallback); return; }

                // Nothing left at all → finish
                finishProcess(topCat, probabilities, topProb);
                return;
            }

        } catch (error) {
            console.error('[InterestFinder] Prediction error:', error);
            setLoading(false);
        }
    };

    // ── Finish Process ─────────────────────────────────────────────────────────
    const finishProcess = async (result, probs, confidence) => {
        // Guard: called only once ever (prevents stale-closure re-entry loop)
        if (isFinishedRef.current) return;
        isFinishedRef.current = true;

        console.log(`[Finished] Interest: ${result ?? 'diverse'}, Confidence: ${confidence.toFixed(3)}`);

        setLoading(false);
        setFinalInterest(result);
        setIsDone(true); // triggers result screen regardless of whether result is null

        // Save to Firestore only when we have a definite result
        if (currentUser && result) {
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userRef, {
                    interest:           result,
                    interestDate:       new Date().toISOString(),
                    interestConfidence: confidence,
                });
                console.log(`[Firestore] Saved: ${result} @ ${confidence.toFixed(3)}`);
            } catch (e) {
                console.error('[Firestore] Save failed:', e);
            }
        }
    };

    const handleRecalculate = () => startSession();

    // ── RENDER: Result Screen ──────────────────────────────────────────────────
    // Show result if: session finished (isDone) OR user already had a stored result on load
    if (isDone || (userProfile?.interest && !hasStarted)) {
        const displayInterest     = finalInterest || userProfile?.interest;
        const displayConfidence   = currentProbabilities
            ? (currentProbabilities[displayInterest] ?? 0)
            : (userProfile?.interestConfidence ?? 0);

        return (
            <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans min-h-[80vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="relative w-full max-w-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10 p-8 md:p-14 overflow-hidden text-center"
                >
                    {/* Background Soft Gradients */}
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

                    {isExplorationRequired ? (
                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                                className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 mb-8 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                            >
                                <Compass size={48} strokeWidth={2} />
                            </motion.div>
                            <h2 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500 mb-4 tracking-tight">
                                Exploration Required
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 text-lg mb-10 max-w-md mx-auto leading-relaxed">
                                Your interests seem quite diverse — that's actually great! It means you're versatile.
                                Try our entry tests to discover your strongest subject.
                            </p>
                        </div>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                            >
                                <Target size={48} strokeWidth={2.5} />
                            </motion.div>

                            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5">
                                We Found a Good Fit!
                            </h2>

                            {/* Confidence bar */}
                            <div className="flex items-center gap-4 mb-10 w-full max-w-xs mx-auto">
                                <div className="h-2.5 flex-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round(displayConfidence * 100)}%` }}
                                        transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                                        className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full"
                                    />
                                </div>
                                <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400 tracking-wider">
                                    {Math.round(displayConfidence * 100)}% Match
                                </span>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-5xl md:text-[4rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500 mb-12 drop-shadow-sm leading-tight"
                            >
                                {displayInterest}
                            </motion.div>
                        </div>
                    )}

                    <div className="flex justify-center mt-4 relative z-10">
                        <button
                            onClick={handleRecalculate}
                            className="group relative px-10 py-4 rounded-2xl bg-slate-900 dark:bg-black hover:bg-slate-800 dark:hover:bg-slate-900 text-white font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] hover:-translate-y-1 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Retake Assessment
                            </span>
                            {/* Subtle shine sweep effect on hover */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out" />
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── RENDER: Welcome Screen ─────────────────────────────────────────────────
    if (!hasStarted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Ambient Background Glowing Orbs */}
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                    className="max-w-3xl w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] p-10 md:p-16 text-center shadow-[0_20px_80px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_80px_-15px_rgba(0,0,0,0.5)] border border-white/50 dark:border-white/10 relative"
                >
                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div 
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-10 border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
                        >
                            <Sparkles size={16} />
                            <span>AI-Powered Engine</span>
                        </motion.div>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                            className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(99,102,241,0.4)] rotate-3 hover:rotate-6 hover:scale-105 transition-transform duration-300"
                        >
                            <Brain size={56} strokeWidth={1.5} />
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-5xl md:text-[4rem] font-black text-slate-800 dark:text-white mb-6 tracking-tight leading-[1.1]"
                        >
                            Discover Your{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 drop-shadow-sm">
                                True Potential
                            </span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-12 leading-relaxed max-w-xl mx-auto"
                        >
                            Our adaptive AI analyzes your responses in real-time to pinpoint the perfect academic and career path for you. It's not just a test — it's a conversation about your future.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <button
                                onClick={startSession}
                                className="group relative px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-extrabold text-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-3">
                                    Start Assessment 
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </span>
                                {/* Hover sweep effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-black/10 to-transparent transition-transform duration-1000 ease-in-out" />
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── RENDER: Question Screen ────────────────────────────────────────────────
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

                        <motion.div
                            key={currentQuestion?.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="min-h-[100px] mb-8"
                        >
                            <h3 className="text-2xl font-medium text-slate-800 dark:text-white leading-relaxed">
                                {currentQuestion?.text}
                            </h3>
                        </motion.div>

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
