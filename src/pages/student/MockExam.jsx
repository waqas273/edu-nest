import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, X, ShieldAlert, Trophy, Loader2, Zap, Shield, Brain, Sparkles, Award } from 'lucide-react';
import ExamModeSelector from '../../components/exam/ExamModeSelector';
import { getExamBlueprint } from '../../services/aiExamService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useExamGeneration } from '../../context/ExamGenerationContext';

const MockExam = () => {
    const { type } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    // --- State Declarations ---
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
        questions: questions,
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

    // Constants — durations from blueprint
    const blueprint = getExamBlueprint(type);
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
            } else if (questions && questions.length > 0) {
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
    }, [examTypeGlobal, subjectGlobal, questions, isGenGlobal, loadStatusGlobal, errorGlobal, type, selectedSubject, setHasStarted, docIdGlobal]);

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

    const isPracticeMode = !!selectedSubject;
    const isCurrentRevealed = revealedAnswers[currentIdx];

    const handleReveal = () => {
        if (!selectedOption) return;
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
                {/* Ambient lights */}
                <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.05] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-purple-500/[0.05] rounded-full blur-[150px]" />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative z-10 w-full max-w-2xl bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-xl text-center p-6 md:p-10"
                >
                    {/* Top colored strip */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${passed ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}`} />

                    <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
                        passed ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-br from-orange-400 to-red-500 shadow-red-500/20'
                    }`}>
                        <Trophy size={36} className="text-white" />
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider mb-4 ${
                        passed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                        {passed ? 'Passed successfully' : 'Needs Practice'}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                        {passed ? 'Splendid Effort!' : 'Keep Pushing Forward!'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
                        {selectedSubject ? `${selectedSubject} Session` : `${type.toUpperCase()} Practice Exam`} Completed
                    </p>

                    {/* Stats overview bento style */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { label: isEcat ? 'Total Score' : 'Correct/Total', val: `${score}/${maxScore}`, color: 'text-indigo-600 dark:text-indigo-400' },
                            { label: 'Percentage', val: `${percentage}%`, color: passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400' },
                            { label: 'Time Taken', val: formatTime(DURATION - timeLeft), color: 'text-purple-600 dark:text-purple-400' },
                        ].map(({ label, val, color }) => (
                            <div key={label} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] rounded-2xl">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</div>
                                <div className={`text-xl font-black ${color}`}>{val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Detailed breakdown chips */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.05] p-3 rounded-2xl">
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Correct: {correctCount}
                        </div>
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 dark:text-red-400 bg-red-500/5">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Incorrect: {incorrectCount}
                        </div>
                        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-500/5">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            Skipped: {unattemptedCount}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => { resetGeneration(); navigate('/student/history'); }}
                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition border border-slate-200 dark:border-white/[0.06] text-sm">
                            View History
                        </button>
                        <button onClick={() => { resetGeneration(); navigate('/student/entry-test'); }}
                            className="flex-1 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 shadow-lg shadow-indigo-500/20 transition text-sm">
                            Return to Hub
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // --- GENERATING LOADING VIEW ---
    if (isGenerating) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.05] rounded-full blur-[150px]" />
                <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-purple-500/[0.05] rounded-full blur-[150px]" />

                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="relative z-10 flex flex-col items-center text-center max-w-md w-full"
                >
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-lg flex items-center justify-center">
                            <Brain size={42} className="text-indigo-500" />
                        </div>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-[-8px] rounded-[2rem] border-2 border-transparent border-t-indigo-500 border-r-purple-500 opacity-60"
                        />
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles size={12} className="animate-pulse" /> AI Generation Active
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        Preparing Practice
                    </h2>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mb-8">
                        Creating unique variations for {selectedSubject ? `${selectedSubject} mode` : `${type.toUpperCase()} mode`}
                    </p>

                    <div className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 text-left shadow-lg">
                        <p className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-2">⚡ Processing</p>
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
                            {loadingStatus || 'Starting backend synthesis...'}
                        </p>
                    </div>

                    <p className="text-xs text-slate-400 dark:text-slate-600 mt-5 font-semibold">Please keep this tab open</p>
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
                        className="bg-red-600 text-white p-8 rounded-3xl max-w-md text-center shadow-2xl border border-red-500"
                    >
                        <ShieldAlert size={56} className="mx-auto mb-4 animate-bounce" />
                        <h2 className="text-2xl font-black mb-2">Tab Switch Warning!</h2>
                        <p className="text-sm opacity-90 mb-6 leading-relaxed">
                            Leaving this page is not permitted. System will automatically submit your exam if you tab switch {3 - tabSwitchCount} more times.
                        </p>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:opacity-90 transition w-full"
                        >
                            Resume Session
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    if (hasStarted && !isFinished && (!questions || questions.length === 0 || !questions[currentIdx])) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-indigo-500" size={36} />
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Synchronizing state...</p>
                </div>
            </div>
        );
    }

    const q = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden select-none">
            <WarningModal />

            {/* Header */}
            <header className="relative z-20 px-4 md:px-6 py-4 flex justify-between items-center bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.06] sticky top-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => { if (window.confirm('Quit exam? Your progress will be saved as aborted.')) { resetGeneration(); navigate('/student/entry-test'); } }}
                        className="p-2.5 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition text-slate-400 hover:text-red-500 border border-transparent hover:border-red-500/20">
                        <X size={18} />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                    <div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            {selectedSubject ? `${type.toUpperCase()} · ${selectedSubject}` : `${type.toUpperCase()} Mock`}
                        </div>
                        <div className="text-sm font-black text-slate-850 dark:text-white mt-0.5">
                            Question {currentIdx + 1} <span className="text-slate-400 font-medium">of {questions.length}</span>
                        </div>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-xl font-mono font-bold text-xs flex items-center gap-2 border transition-all ${
                    timeLeft < 300
                        ? 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 animate-pulse'
                        : timeLeft < 600
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.06]'
                }`}>
                    <Clock size={14} />
                    {formatTime(timeLeft)}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-200 dark:bg-slate-900 w-full relative z-20">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "circOut", duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                />
            </div>

            {/* Main Area */}
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-6 flex flex-col justify-center relative z-10">
                <AnimatePresence mode="wait">
                    <motion.div key={currentIdx}
                        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="flex-1 flex flex-col justify-center"
                    >
                        {/* Question Card */}
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 md:p-8 shadow-sm dark:shadow-none mb-5">
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 mb-6">
                                <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-500/20">
                                    {q.subject}
                                </span>
                                {isPracticeMode && (
                                    <span className="ml-auto px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20">
                                        Practice Mode
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed mb-6">
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

                                    let cls = 'border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.12]';
                                    if (isCurrentRevealed) {
                                        if (showCorrect)  cls = 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-500/30';
                                        else if (isWrong) cls = 'border-red-500 bg-red-500/10 dark:border-red-500/30';
                                    } else if (isChosen) {
                                        cls = 'border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-md shadow-indigo-500/5';
                                    }

                                    return (
                                        <button key={idx}
                                            disabled={isCurrentRevealed}
                                            onClick={() => { if (!isCurrentRevealed) setSelectedOption(opt); }}
                                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${cls} ${
                                                isCurrentRevealed ? 'cursor-default' : 'cursor-pointer'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${
                                                showCorrect ? 'bg-emerald-500 text-white'
                                                : isWrong   ? 'bg-red-500 text-white'
                                                : isChosen  ? 'bg-indigo-500 text-white'
                                                : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </div>
                                            <span className={`text-sm font-medium flex-1 ${
                                                showCorrect ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                                : isWrong   ? 'text-red-600 dark:text-red-400 line-through opacity-70'
                                                : isChosen  ? 'text-indigo-600 dark:text-indigo-300 font-semibold'
                                                : 'text-slate-700 dark:text-slate-350'
                                            }`}>{opt}</span>
                                            {isCurrentRevealed && showCorrect && <CheckCircle className="text-emerald-500 flex-shrink-0" size={18} />}
                                            {isCurrentRevealed && isWrong && <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />}
                                            {!isCurrentRevealed && isChosen && <CheckCircle className="text-indigo-500 flex-shrink-0" size={18} />}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation Panel */}
                            <AnimatePresence>
                                {isPracticeMode && isCurrentRevealed && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className={`mt-4 p-5 rounded-2xl border-l-4 ${
                                            answers[currentIdx] === q.answer
                                                ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] border-emerald-500'
                                                : 'bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-amber-500'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award size={15} className={answers[currentIdx] === q.answer ? 'text-emerald-500' : 'text-amber-500'} />
                                                <p className={`text-xs font-black uppercase tracking-wider ${
                                                    answers[currentIdx] === q.answer ? 'text-emerald-600 dark:text-emerald-455' : 'text-amber-600 dark:text-amber-455'
                                                }`}>
                                                    {answers[currentIdx] === q.answer ? 'Correct!' : 'Incorrect · Correct answer: ' + q.answer}
                                                </p>
                                            </div>
                                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                                {q.explanation || 'This question tests your conceptual accuracy. Review relevant textbooks to reinforce your knowledge.'}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 pb-4">
                    <span className="text-xs text-slate-400 dark:text-slate-655 font-bold uppercase tracking-wider">
                        {Object.keys(answers).length} / {questions.length} Answered
                    </span>

                    <div className="flex items-center gap-3">
                        {isPracticeMode && !isCurrentRevealed ? (
                            <button
                                onClick={handleReveal}
                                disabled={!selectedOption}
                                className={`px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition text-sm ${
                                    selectedOption
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-200 dark:bg-white/[0.04] text-slate-400 dark:text-white/20 cursor-not-allowed'
                                }`}
                            >
                                <CheckCircle size={16} />
                                Check Answer
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!isPracticeMode && !selectedOption && !answers[currentIdx]}
                                className={`px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition text-sm ${
                                    isPracticeMode || selectedOption || answers[currentIdx]
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-95 shadow-md'
                                        : 'bg-slate-200 dark:bg-white/[0.04] text-slate-400 dark:text-white/20 cursor-not-allowed'
                                }`}
                            >
                                {currentIdx === questions.length - 1 ? 'Finish' : 'Next'}
                                <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MockExam;
