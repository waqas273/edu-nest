import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Flag, X, ShieldAlert, Trophy, Loader2, BookOpen, Zap, Shield, Brain, ChevronRight } from 'lucide-react';
import ExamModeSelector from '../../components/exam/ExamModeSelector';
import { generateFullExam, generateSubjectExam, getExamBlueprint } from '../../services/aiExamService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useExamGeneration } from '../../context/ExamGenerationContext';

const MockExam = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    // --- State Declarations ---
    const [questions, setQuestions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [error, setError] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [activeTestDocId, setActiveTestDocId] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showWarning, setShowWarning] = useState(false);

    // Global background generation context hook
    const {
        isGenerating: isGenGlobal,
        loadingStatus: loadStatusGlobal,
        questions: qsGlobal,
        examType: examTypeGlobal,
        selectedSubject: subjectGlobal,
        activeTestDocId: docIdGlobal,
        error: errorGlobal,
        startGenerationBackground,
        resetGeneration,

        // Persisted session states from context
        currentIdx,
        setCurrentIdx,
        answers,
        setAnswers,
        revealedAnswers,
        setRevealedAnswers,
        endTime,
        setEndTime,
        tabSwitchCount,
        setTabSwitchCount,
        isFinished,
        setIsFinished,
        hasStarted,
        setHasStarted
    } = useExamGeneration();

    // Constants — durations from official blueprint
    const blueprint = getExamBlueprint(type);
    // For subject exams: 1 minute per question. For full exam: official duration.
    const getExamDuration = (subj) => {
        if (!subj) return blueprint ? blueprint.durationMinutes * 60 : (type === 'mdcat' ? 180 * 60 : 100 * 60);
        const chunk = blueprint?.chunks?.find(c => c.subject.toLowerCase() === subj.toLowerCase());
        return chunk ? chunk.count * 60 : 30 * 60; // 1 min per question
    };
    const DURATION = getExamDuration(selectedSubject);
    const [timeLeft, setTimeLeft] = useState(DURATION);

    // Set endTime globally once when the test starts
    useEffect(() => {
        if (hasStarted && !endTime) {
            const duration = getExamDuration(selectedSubject);
            setEndTime(Date.now() + duration * 1000);
        }
    }, [hasStarted, selectedSubject, endTime, setEndTime]);

    // State Refs for Event Listeners
    const isFinishedRef = useRef(false);
    const answersRef = useRef({});
    const questionsRef = useRef([]);
    const hasStartedRef = useRef(false);

    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);

    // Sync context generation state to local page state
    useEffect(() => {
        if (examTypeGlobal === type) {
            if (isGenGlobal) {
                setIsGenerating(true);
                setLoadingStatus(loadStatusGlobal);
            } else if (qsGlobal && qsGlobal.length > 0) {
                setQuestions(qsGlobal);
                setActiveTestDocId(docIdGlobal);
                setIsGenerating(false);
                if (selectedSubject !== subjectGlobal) {
                    setSelectedSubject(subjectGlobal);
                }
                setHasStarted(true);
            } else if (errorGlobal) {
                setError(errorGlobal);
                setIsGenerating(false);
            }
        }
    }, [examTypeGlobal, subjectGlobal, qsGlobal, isGenGlobal, loadStatusGlobal, errorGlobal, type, selectedSubject, subjectGlobal, setHasStarted]);

    // Sync refs
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);

    // Helper: Save/Update Result
    const saveResult = async (forced = false, reason = "Completed") => {
        if (!currentUser || !activeTestDocId) return;

        const currentAnswers = answersRef.current;
        const currentQs = questionsRef.current;
        const isEcat = type?.toLowerCase() === 'ecat';

        let correctCount = 0;
        let incorrectCount = 0;
        let unattemptedCount = 0;

        currentQs.forEach((q, idx) => {
            const userAns = currentAnswers[idx];
            if (userAns === undefined || userAns === null || userAns === '') {
                unattemptedCount++;
            } else if (userAns === q.answer) {
                correctCount++;
            } else {
                incorrectCount++;
            }
        });

        let score = correctCount;
        let maxScore = currentQs.length;
        if (isEcat) {
            score = (correctCount * 4) - incorrectCount;
            maxScore = currentQs.length * 4;
        }

        const percentage = maxScore > 0 ? Math.max(0, (score / maxScore) * 100).toFixed(1) : 0;

        try {
            await updateDoc(doc(db, 'test_history', activeTestDocId), {
                score: score,
                percentage: parseFloat(percentage),
                timeTaken: DURATION - timeLeft,
                completedAt: serverTimestamp(),
                status: forced ? 'aborted' : 'completed',
                terminationReason: reason,
                isFinal: true
            });
            console.log("Test result updated successfully:", reason);
        } catch (error) {
            console.error("Error updating result:", error);
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

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Internal Navigation unmount cleanup: DO NOT abort/delete the test globally
            // The state remains saved in the context and can be resumed on return.
        };
    }, []);

    // Timer
    useEffect(() => {
        if (isFinished || !hasStarted || !endTime) return;

        const updateTimer = () => {
            const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                handleSubmitExam();
            }
        };

        // Run immediately
        updateTimer();

        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [isFinished, hasStarted, endTime]);

    const formatTime = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    // isPracticeMode: subject tests reveal answers immediately
    const isPracticeMode = !!selectedSubject;
    const isCurrentRevealed = revealedAnswers[currentIdx];

    const handleReveal = () => {
        if (!selectedOption) return;
        // Lock the answer and reveal correct/wrong
        setAnswers(prev => ({ ...prev, [currentIdx]: selectedOption }));
        setRevealedAnswers(prev => ({ ...prev, [currentIdx]: true }));
    };

    const handleNext = () => {
        const updatedAnswers = selectedOption
            ? { ...answers, [currentIdx]: selectedOption }
            : answers;

        if (selectedOption) {
            setAnswers(updatedAnswers);
            setSelectedOption(null);
        }

        // Reset reveal state persists in revealedAnswers — just move forward
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
            setSelectedOption(null);
        } else {
            answersRef.current = updatedAnswers;
            handleSubmitExam();
        }
    };

    const handleSubmitExam = async (forced = false) => {
        setIsFinished(true);
        saveResult(forced, "Manual Submission");
    };

    // --- RESULT VIEW ---
    if (isFinished) {
        const isEcat = type?.toLowerCase() === 'ecat';
        let correctCount = 0;
        let incorrectCount = 0;
        let unattemptedCount = 0;

        questions.forEach((q, idx) => {
            const userAnswer = answers[idx] || (idx === currentIdx && selectedOption ? selectedOption : null);
            if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
                unattemptedCount++;
            } else if (userAnswer === q.answer) {
                correctCount++;
            } else {
                incorrectCount++;
            }
        });

        const total = questions.length;
        let score = correctCount;
        let maxScore = total;
        if (isEcat) {
            score = (correctCount * 4) - incorrectCount;
            maxScore = total * 4;
        }

        const percentage = maxScore > 0 ? Math.max(0, (score / maxScore) * 100).toFixed(1) : 0;
        const passed = parseFloat(percentage) >= (blueprint?.passingPercent || (isEcat ? 50 : 55));

        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] bg-emerald-200/30 dark:bg-emerald-500/10" />
                <div className="pointer-events-none absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] bg-blue-200/30 dark:bg-blue-500/10" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl text-center"
                >
                    <div className={`h-2 w-full ${passed ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-orange-400 to-red-500'}`} />
                    <div className="p-8 md:p-10">
                        <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-xl ${
                            passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-br from-orange-400 to-red-500 shadow-red-500/30'
                        }`}>
                            <Trophy size={44} className="text-white" />
                        </div>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 ${
                            passed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                            {passed ? '✓ Passed' : '✗ Needs Improvement'}
                        </div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-1">
                            {passed ? 'Excellent Work!' : 'Keep Practicing!'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            {selectedSubject ? `${selectedSubject} Practice` : `${type.toUpperCase()} Full Mock Exam`} · Completed
                        </p>

                        {/* Answers breakdown chips */}
                        <div className="flex justify-center gap-2 mb-6">
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 text-xs font-bold rounded-full">
                                Correct: {correctCount}
                            </span>
                            <span className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900 text-xs font-bold rounded-full">
                                Incorrect: {incorrectCount}
                            </span>
                            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-full">
                                Unattempted: {unattemptedCount}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                                { label: isEcat ? 'Marks Obtain' : 'Score', val: `${score}/${maxScore}`, color: 'text-emerald-500' },
                                { label: 'Percentage', val: `${percentage}%`, color: passed ? 'text-blue-500' : 'text-orange-500' },
                                { label: 'Time Taken', val: formatTime(DURATION - timeLeft), color: 'text-purple-500' },
                            ].map(({ label, val, color }) => (
                                <div key={label} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
                                    <div className={`text-2xl font-black ${color}`}>{val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button onClick={() => { resetGeneration(); navigate('/student/history'); }}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all text-sm">
                                View History
                            </button>
                            <button onClick={() => { resetGeneration(); navigate('/student/entry-test'); }}
                                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:shadow-lg transition-all text-sm">
                                Back to Tests
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isGenerating) {
        const isFull = !selectedSubject;
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden">
                <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-96 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="pointer-events-none absolute bottom-0 right-1/3 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-500/10 rounded-full blur-[120px]" />
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="relative mb-8">
                        <div className="w-28 h-28 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl flex items-center justify-center">
                            <Brain size={48} className="text-blue-500" />
                        </div>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500"
                        />
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
                        <Zap size={12} /> AI Generating
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
                        {selectedSubject ? `${selectedSubject} Practice` : `${type.toUpperCase()} Mock Exam`}
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mb-8">
                        {isFull
                            ? (type === 'mdcat' ? '180 Questions • 5 Subjects • Official Pattern' : '100 Questions • 4 Subjects • Official Pattern')
                            : `Subject-specific practice · Official ${type.toUpperCase()} pattern`
                        }
                    </p>
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-left shadow-xl mb-4">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">⚡ Live Status</p>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                            {loadingStatus || 'Initializing AI engine...'}
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-600">Please keep this tab open · Progress auto-saves</p>
                </motion.div>
            </div>
        );
    }

    if (!hasStarted) {
        const handleStart = async () => {
            setError(null);
            setIsGenerating(true);
            try {
                await startGenerationBackground(type, selectedSubject, currentUser);
            } catch (err) {
                setError(err.message);
                setIsGenerating(false);
            }
        };

        return (
            <ExamModeSelector
                type={type}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                onStart={handleStart}
                error={error}
                isGenerating={isGenerating}
            />
        );
    }

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
        <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col relative overflow-hidden select-none">
            <WarningModal />

            {/* Top Bar */}
            <header className="relative z-20 px-4 md:px-6 py-3 flex justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => { if (window.confirm('Quit exam? Your progress will be saved as aborted.')) { resetGeneration(); navigate('/student/entry-test'); } }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition text-slate-400 hover:text-red-500">
                        <X size={20} />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedSubject ? `${type.toUpperCase()} · ${selectedSubject}` : `${type.toUpperCase()} Full Mock`}
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                            Q {currentIdx + 1} <span className="text-slate-400 font-medium">of {questions.length}</span>
                            {isPracticeMode && blueprint?.chunks?.find(c => c.subject.toLowerCase() === selectedSubject?.toLowerCase())?.count !== questions.length && (
                                <span className="ml-2 text-[10px] text-amber-500 font-bold">
                                    (AI generated {questions.length})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-xl font-mono font-bold text-sm flex items-center gap-2 transition-all ${
                    timeLeft < 300
                        ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 animate-pulse'
                        : timeLeft < 600
                        ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}>
                    <Clock size={15} />
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
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div key={currentIdx}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="flex-1 flex flex-col"
                    >
                        {/* Question Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-100 dark:border-slate-800 mb-5 flex-1">
                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-5">
                                <span className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                    {q.subject}
                                </span>
                                {isPracticeMode && (
                                    <span className="ml-auto px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800">
                                        Practice Mode
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white leading-relaxed mb-6">
                                {q.question}
                            </h3>

                            {/* Options */}
                            <div className="grid grid-cols-1 gap-3 mb-4">
                                {q.options.map((opt, idx) => {
                                    const locked        = answers[currentIdx];
                                    const isChosen      = locked === opt || (!locked && selectedOption === opt);
                                    const isCorrect     = opt === q.answer;
                                    const isWrong       = isCurrentRevealed && isChosen && !isCorrect;
                                    const showCorrect   = isCurrentRevealed && isCorrect;

                                    let cls = 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30';
                                    if (isCurrentRevealed) {
                                        if (showCorrect)  cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
                                        else if (isWrong) cls = 'border-red-400 bg-red-50 dark:bg-red-900/20';
                                    } else if (isChosen) {
                                        cls = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10';
                                    }

                                    return (
                                        <motion.button key={idx}
                                            whileTap={!isCurrentRevealed ? { scale: 0.99 } : {}}
                                            onClick={() => { if (!isCurrentRevealed) setSelectedOption(opt); }}
                                            disabled={isCurrentRevealed}
                                            className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${cls} ${
                                                isCurrentRevealed ? 'cursor-default' : 'hover:border-blue-200 dark:hover:border-slate-700 cursor-pointer'
                                            }`}
                                        >
                                            <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-black ${
                                                showCorrect ? 'bg-emerald-500 text-white'
                                                : isWrong   ? 'bg-red-400 text-white'
                                                : isChosen  ? 'bg-blue-500 text-white'
                                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`font-medium flex-1 ${
                                                showCorrect ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                                : isWrong   ? 'text-red-600 dark:text-red-400 line-through opacity-70'
                                                : isChosen  ? 'text-blue-700 dark:text-blue-300'
                                                : 'text-slate-700 dark:text-slate-300'
                                            }`}>{opt}</span>
                                            {isCurrentRevealed && showCorrect && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                                                    <CheckCircle className="text-emerald-500" size={20} />
                                                </motion.div>
                                            )}
                                            {isCurrentRevealed && isWrong && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                                                    <AlertTriangle className="text-red-400" size={20} />
                                                </motion.div>
                                            )}
                                            {!isCurrentRevealed && isChosen && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto">
                                                    <CheckCircle className="text-blue-500" size={20} />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Explanation Panel — practice mode only, after reveal */}
                            <AnimatePresence>
                                {isPracticeMode && isCurrentRevealed && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, height: 0 }}
                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.35, ease: 'easeOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className={`mt-2 p-5 rounded-2xl border-l-4 ${
                                            answers[currentIdx] === q.answer
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
                                                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                                        }`}>
                                            <p className={`text-xs font-black uppercase tracking-widest mb-2 ${
                                                answers[currentIdx] === q.answer ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                            }`}>
                                                {answers[currentIdx] === q.answer ? '✓ Correct!' : '✗ Incorrect — Correct answer: ' + q.answer}
                                            </p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {q.explanation || 'This question tests your understanding of core concepts in ' + q.subject + '. Review your textbook for a detailed explanation.'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 pb-4">
                    <span className="text-xs text-slate-400 dark:text-slate-600">
                        {Object.keys(answers).length} answered · {questions.length - Object.keys(answers).length} remaining
                    </span>

                    <div className="flex items-center gap-3">
                        {/* Practice mode: show Check Answer button before reveal, Next after */}
                        {isPracticeMode && !isCurrentRevealed ? (
                            <button
                                onClick={handleReveal}
                                disabled={!selectedOption}
                                className={`px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                                    selectedOption
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 hover:scale-105'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <CheckCircle size={17} />
                                Check Answer
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!isPracticeMode && !selectedOption && !answers[currentIdx]}
                                className={`px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg ${
                                    isPracticeMode || selectedOption || answers[currentIdx]
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 hover:shadow-xl'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                }`}
                            >
                                {currentIdx === questions.length - 1 ? 'Finish' : 'Next'}
                                <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MockExam;
