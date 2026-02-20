import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Flag, X, ShieldAlert, Trophy, BarChart2 } from 'lucide-react';
import { MOCK_DATA } from '../../data/mockQuestions';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const MockExam = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const questions = MOCK_DATA[type] || [];

    // Constants
    const DURATION = type === 'mdcat' ? 3.5 * 60 * 60 : 2 * 60 * 60; // 3.5 hrs or 2 hrs

    // State Refs for Event Listeners
    const isFinishedRef = useRef(false);
    const answersRef = useRef({});
    const questionsRef = useRef(questions);

    // State
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(DURATION);
    const [isFinished, setIsFinished] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync refs
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);

    // Helper: Save Result (Fire and Forget)
    const saveResult = async (forced = false, reason = "Completed") => {
        if (!currentUser) return;

        const currentAnswers = answersRef.current;
        const currentQs = questionsRef.current;

        let correctCount = 0;
        currentQs.forEach((q, idx) => {
            if (currentAnswers[idx] === q.answer) correctCount++;
        });

        const score = correctCount;
        const total = currentQs.length;
        const percentage = ((score / total) * 100).toFixed(1);

        try {
            await addDoc(collection(db, 'test_history'), {
                userId: currentUser.uid,
                testName: type.toUpperCase() + ' Mock Exam',
                score: score,
                totalQuestions: total,
                percentage: parseFloat(percentage),
                timeTaken: DURATION - timeLeft, // Note: Time might be slightly off in unmount, acceptable
                completedAt: serverTimestamp(),
                forcedSubmission: forced,
                terminationReason: reason,
                category: 'Entry Test'
            });
            console.log("Test result saved successfully:", reason);
        } catch (error) {
            console.error("Error saving result:", error);
        }
    };

    // Anti-Cheat: Visibility & Navigation
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !isFinishedRef.current) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= 3) {
                        setIsFinished(true); // Trigger UI update
                        saveResult(true, "Tab Switch Limit Exceeded"); // Auto-save
                    } else {
                        setShowWarning(true);
                    }
                    return newCount;
                });
            }
        };

        const handleBeforeUnload = (e) => {
            if (!isFinishedRef.current) {
                e.preventDefault();
                e.returnValue = ''; // Browser prompt
                // We can't robustly await save here, but we can try
                saveResult(true, "Browser Closed/Refreshed");
            }
        };

        const handleContextMenu = (e) => e.preventDefault();

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => { });
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('beforeunload', handleBeforeUnload);

            // Check if unmounting while test is active (Internal Navigation)
            // We use the Ref to check the latest state during cleanup
            if (!isFinishedRef.current) {
                // We cannot use async/await comfortably here for all browsers, but triggering it works for most
                saveResult(true, "Navigated Away / Aborted");
            }

            if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
        };
    }, []);

    // Timer
    useEffect(() => {
        if (isFinished) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmitExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isFinished]);

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const handleNext = () => {
        if (selectedOption) {
            setAnswers(prev => ({ ...prev, [currentIdx]: selectedOption }));
            setSelectedOption(null);
        }

        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            handleSubmitExam();
        }
    };

    const handleSubmitExam = async (forced = false) => {
        setIsFinished(true);
        if (document.exitFullscreen) document.exitFullscreen().catch(() => { });

        // Calculate Result
        let correctCount = 0;
        questions.forEach((q, idx) => {
            const userAnswer = answers[idx] || (idx === currentIdx ? selectedOption : null);
            if (userAnswer === q.answer) correctCount++;
        });

        const score = correctCount;
        const total = questions.length;
        const percentage = ((score / total) * 100).toFixed(1);

        // Save to Firestore
        if (currentUser && !isSubmitting) {
            setIsSubmitting(true);
            try {
                await addDoc(collection(db, 'test_history'), {
                    userId: currentUser.uid,
                    testName: type.toUpperCase() + ' Mock Exam',
                    score: score,
                    totalQuestions: total,
                    percentage: parseFloat(percentage),
                    timeTaken: DURATION - timeLeft,
                    completedAt: serverTimestamp(),
                    forcedSubmission: forced,
                    category: 'Entry Test'
                });
            } catch (error) {
                console.error("Error saving result:", error);
            }
        }
    };

    // --- RESULT VIEW ---
    if (isFinished) {
        const correctCount = questions.reduce((acc, q, idx) => {
            const userAnswer = answers[idx] || (idx === currentIdx && selectedOption ? selectedOption : null);
            return userAnswer === q.answer ? acc + 1 : acc;
        }, 0);
        const percentage = ((correctCount / questions.length) * 100).toFixed(1);

        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-slate-200/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05]" />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl text-center"
                >
                    <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                        <Trophy size={48} className="text-white" />
                    </div>

                    <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-2">Exam Completed!</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">Here is your performance summary</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Score</div>
                            <div className="text-3xl font-black text-emerald-500">{correctCount} <span className="text-base text-slate-400">/ {questions.length}</span></div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Percentage</div>
                            <div className="text-3xl font-black text-blue-500">{percentage}%</div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Time Taken</div>
                            <div className="text-3xl font-black text-purple-500">{formatTime(DURATION - timeLeft)}</div>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate('/student/entry-test')}
                            className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:shadow-lg transition-all"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (questions.length === 0) return <div className="p-10 text-center">Loading Questions...</div>;

    // --- WARNING MODAL ---
    const WarningModal = () => (
        <AnimatePresence>
            {showWarning && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                        className="bg-red-500 text-white p-8 rounded-3xl max-w-md text-center shadow-2xl"
                    >
                        <ShieldAlert size={64} className="mx-auto mb-4" />
                        <h2 className="text-3xl font-bold mb-2">Anti-Cheat Warning!</h2>
                        <p className="text-lg opacity-90 mb-6">
                            Tab switching is detected. Your exam will be <b>automatically submitted</b> if you do this {3 - tabSwitchCount} more times.
                        </p>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold hover:bg-neutral-100 transition"
                        >
                            I Understand
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden select-none">
            <WarningModal />

            {/* Top Bar */}
            <header className="relative z-20 px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (window.confirm("Quit exam? Progress will be lost.")) {
                                navigate('/student/entry-test');
                            }
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-red-500"
                    >
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{type.toUpperCase()} Mock</h2>
                        <div className="text-lg font-black text-slate-900 dark:text-white">Question {currentIdx + 1} <span className="text-slate-400 font-medium">/ {questions.length}</span></div>
                    </div>
                </div>

                <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg flex items-center gap-2 shadow-sm ${timeLeft < 300 ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
                    <Clock size={18} />
                    {formatTime(timeLeft)}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-200 dark:bg-slate-800 w-full relative z-20">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "circOut", duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
            </div>

            {/* Content Area */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIdx}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Question Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 shadow-xl border border-slate-200 dark:border-slate-800 mb-6 flex-1">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800">
                                    {q.subject}
                                </span>
                            </div>

                            <h3 className="text-2xl md:text-3xl font-medium text-slate-900 dark:text-white leading-relaxed mb-10">
                                {q.question}
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                {q.options.map((opt, idx) => {
                                    const isSelected = selectedOption === opt || answers[currentIdx] === opt;
                                    return (
                                        <motion.button
                                            key={idx}
                                            whileHover={{ scale: 1.01, backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => setSelectedOption(opt)}
                                            className={`relative group w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between ${isSelected
                                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10'
                                                : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 group-hover:border-blue-400 group-hover:text-blue-500'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={`text-lg font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                                                    {opt}
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <CheckCircle className="text-blue-500 fill-blue-100 dark:fill-blue-900/20" size={24} />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="flex items-center justify-end pt-4">

                    <button
                        onClick={handleNext}
                        disabled={!selectedOption && !answers[currentIdx]}
                        className={`px-8 py-4 rounded-2xl font-bold text-lg flex items-center gap-3 transition-all shadow-xl ${selectedOption || answers[currentIdx]
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 hover:shadow-2xl'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {currentIdx === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
                        <ArrowRight size={20} />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default MockExam;
