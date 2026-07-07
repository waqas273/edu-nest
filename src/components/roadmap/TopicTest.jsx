import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    AlertTriangle, CheckCircle, XCircle, Trophy,
    Shield, RotateCcw, EyeOff, Award, Target, HelpCircle, ArrowRight, ArrowLeft,
    Loader2, Sparkles, Brain
} from 'lucide-react';
import { addDoc, collection, serverTimestamp, setDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { generateTestQuestions, generateGrandTestQuestions } from '../../services/openaiService';

// Test Configuration
const TEST_CONFIG = {
    grand: { questions: 50, passingScore: 65 },
    topic: { questions: 25, passingScore: 65 },
    subtopic: { questions: 20, passingScore: 65 }
};

const TopicTest = ({
    isOpen,
    onClose,
    topic,
    skill,
    category,
    topics,
    onTestComplete,
    isGrandTest = false
}) => {
    const { currentUser } = useAuth();
    
    // Determine which config to use
    let configType = 'topic';
    if (isGrandTest) configType = 'grand';
    else if (topic && topic.isSubtopic) configType = 'subtopic';
    
    const config = TEST_CONFIG[configType];

    // Test State
    const [difficulty, setDifficulty] = useState(null); // 'Simple', 'Medium', 'Hard'
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
    const [score, setScore] = useState(0);

    // UI State
    const [loading, setLoading] = useState(false);
    const [testStatus, setTestStatus] = useState('selection'); // selection, loading, active, submitted, aborted
    const [showResult, setShowResult] = useState(false);

    // Anti-cheat
    const abortedRef = useRef(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setTestStatus('selection');
            setDifficulty(null);
            setQuestions([]);
            setCurrentIndex(0);
            setScore(0);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
            setShowResult(false);
        }
    }, [isOpen]);

    const startTest = async (selectedDifficulty) => {
        setDifficulty(selectedDifficulty);
        setLoading(true);
        setTestStatus('loading');

        try {
            let generatedQuestions;
            // Grand test usually mixes difficulties or defaults to Medium, but for now passing selected if grand
            const diff = isGrandTest ? 'Medium' : selectedDifficulty;

            if (isGrandTest) {
                generatedQuestions = await generateGrandTestQuestions(skill, topics, config.questions);
            } else {
                generatedQuestions = await generateTestQuestions(topic.title, skill, config.questions, diff);
            }

            setQuestions(generatedQuestions);
            setTestStatus('active');
            setCurrentIndex(0);
            setScore(0);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
            abortedRef.current = false;
        } catch (error) {
            console.error('Error loading questions:', error);
        } finally {
            setLoading(false);
        }
    };

    // ANTI-CHEAT: Visibility change detection
    useEffect(() => {
        if (testStatus !== 'active' || showResult) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && !abortedRef.current) {
                abortedRef.current = true;
                handleAbort();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [testStatus, showResult]);

    const handleAbort = async () => {
        setTestStatus('aborted');
        setShowResult(true);
        await saveTestHistory('aborted', { correctCount: 0, percentage: 0 });
    };

    const handleOptionSelect = (idx) => {
        if (isAnswerRevealed) return;
        setSelectedOption(idx);
        setIsAnswerRevealed(true);

        if (idx === questions[currentIndex].correctIndex) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswerRevealed(false);
        } else {
            handleFinishTest();
        }
    };

    const handleFinishTest = async () => {
        setTestStatus('submitted');
        setShowResult(true);

        const finalPercentage = Math.round((score / questions.length) * 100);
        const passed = finalPercentage >= config.passingScore;

        await saveTestHistory(passed ? 'pass' : 'fail', { correctCount: score, percentage: finalPercentage });

        if (!isGrandTest && onTestComplete) {
            await updateRoadmapProgress(passed);
        }
    };

    const saveTestHistory = async (status, scoreData) => {
        if (!currentUser) return;
        try {
            // Save test history
            const testHistoryRef = await addDoc(collection(db, 'test_history'), {
                userId: currentUser.uid,
                category: category || 'General',
                skill: skill,
                topicName: isGrandTest ? 'Grand Test' : topic.title,
                topicId: topic.id || 'grand',
                difficulty: difficulty,
                isGrandTest: isGrandTest,
                status: status,
                scoreObtained: scoreData.correctCount,
                percentage: scoreData.percentage,
                totalQuestions: questions.length,
                passingScore: config.passingScore,
                timestamp: serverTimestamp()
            });

            // Auto-create certificate for passed Grand Tests (>= 75%)
            if (isGrandTest && scoreData.percentage >= 75) {
                try {
                    const certificatesRef = collection(db, 'certificates');
                    const allCerts = await getDocs(certificatesRef);
                    const nextNumber = allCerts.size + 1;
                    const certificateId = `EDUNEST-273-${nextNumber}`;

                    await addDoc(certificatesRef, {
                        certificateId: certificateId,
                        userId: currentUser.uid,
                        studentName: currentUser?.displayName || 'Student',
                        email: currentUser?.email,
                        skill: skill,
                        score: scoreData.percentage,
                        testId: testHistoryRef.id,
                        category: category || 'General',
                        issuedDate: serverTimestamp()
                    });

                    console.log(`Certificate ${certificateId} created automatically`);
                } catch (certError) {
                    console.error('Error creating certificate:', certError);
                    // Don't fail the whole test save if certificate creation fails
                }
            }
        } catch (error) {
            console.error('Error saving test history:', error);
        }
    };

    const updateRoadmapProgress = async (passed) => {
        if (!topics) return;

        // Deep clone to safely mutate
        let updatedTopics = JSON.parse(JSON.stringify(topics));
        let found = false;

        // 1. Try to find/update Main Topic
        const mainIndex = updatedTopics.findIndex(t => t.id === topic.id);
        if (mainIndex !== -1) {
            found = true;
            if (passed) updatedTopics[mainIndex].status = 'completed';
        }

        // 2. If not found, look for Sub-Topic
        if (!found) {
            updatedTopics.forEach(t => {
                if (t.subtopics) {
                    const subIndex = t.subtopics.findIndex(s => s.id === topic.id);
                    if (subIndex !== -1) {
                        if (passed) t.subtopics[subIndex].status = 'completed';
                        // Optional: Check if all subtopics are done to complete main topic? 
                        // For now, let's keep them independent or user can mark main done manually.
                    }
                }
            });
        }

        // Calculate Global Progress
        // Simplified: Count Total Nodes (Main + Sub) vs Completed Nodes
        let totalNodes = 0;
        let completedNodes = 0;

        updatedTopics.forEach(t => {
            totalNodes++;
            if (t.status === 'completed') completedNodes++;

            if (t.subtopics && t.subtopics.length > 0) {
                t.subtopics.forEach(s => {
                    totalNodes++;
                    if (s.status === 'completed') completedNodes++;
                });
            }
        });

        // Avoid division by zero
        const newProgress = totalNodes === 0 ? 0 : Math.round((completedNodes / totalNodes) * 100);

        try {
            const sanitizedSkill = skill.replace(/[^a-zA-Z0-9]/g, '_');
            const docId = `${currentUser.uid}_${sanitizedSkill}`;
            await setDoc(doc(db, 'roadmaps', docId), {
                skill: skill,
                topics: updatedTopics,
                progress: newProgress,
                userId: currentUser.uid
            }, { merge: true });

            if (onTestComplete) {
                onTestComplete(updatedTopics, newProgress, passed);
            }
        } catch (error) {
            console.error('Error updating roadmap:', error);
        }
    };

    if (!isOpen) return null;

    const currentQuestion = questions[currentIndex];
    const finalPercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const passed = finalPercentage >= config.passingScore;

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-50 dark:bg-[#0f172a] font-sans text-slate-900 dark:text-slate-100 overflow-y-auto custom-scrollbar transition-colors duration-300">
            {/* Animated Background Overlay */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 dark:from-blue-900/20 via-white dark:via-[#0f172a] to-white dark:to-[#0f172a]" />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 15, repeat: Infinity, delay: 2 }}
                    className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-[100px]"
                />
            </div>

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                    {/* Back Button - Only visible on selection screen */}
                    {testStatus === 'selection' && (
                        <button
                            onClick={onClose}
                            className="p-2 mr-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400 transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/20">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                            {isGrandTest ? 'Final Certification' : topic.title}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                            {skill} • {testStatus === 'active' ? difficulty : 'Assessment'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                >
                    <XCircle size={24} />
                </button>
            </div>

            {/* SELECTION VIEW */}
            {testStatus === 'selection' && (
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                            Choose Your Challenge
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                            Select a difficulty level that matches your confidence. Higher levels provide deeper insights.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
                        {[
                            { id: 'Simple', color: 'emerald', icon: Shield, desc: 'Basic concepts & definitions' },
                            { id: 'Medium', color: 'yellow', icon: Target, desc: 'Application & scenarios' },
                            { id: 'Hard', color: 'red', icon: Trophy, desc: 'Complex analysis & edge cases' }
                        ].map((level, idx) => (
                            <motion.button
                                key={level.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => startTest(level.id)}
                                className={`group relative p-8 rounded-[2rem] border-2 text-left transition-all duration-300 hover:scale-105 overflow-hidden
                                    ${level.id === 'Simple' ? 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-500 dark:border-emerald-500/20 dark:bg-emerald-500/5' : ''}
                                    ${level.id === 'Medium' ? 'border-yellow-100 bg-yellow-50/50 hover:border-yellow-500 dark:border-yellow-500/20 dark:bg-yellow-500/5' : ''}
                                    ${level.id === 'Hard' ? 'border-red-100 bg-red-50/50 hover:border-red-500 dark:border-red-500/20 dark:bg-red-500/5' : ''}
                                `}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg
                                    ${level.id === 'Simple' ? 'bg-emerald-500 shadow-emerald-500/30' : ''}
                                    ${level.id === 'Medium' ? 'bg-yellow-500 shadow-yellow-500/30' : ''}
                                    ${level.id === 'Hard' ? 'bg-red-500 shadow-red-500/30' : ''}
                                `}>
                                    <level.icon size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{level.id}</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">{level.desc}</p>

                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={24} className={`
                                        ${level.id === 'Simple' ? 'text-emerald-500' : ''}
                                        ${level.id === 'Medium' ? 'text-yellow-500' : ''}
                                        ${level.id === 'Hard' ? 'text-red-500' : ''}
                                    `} />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {/* LOADING VIEW */}
            {testStatus === 'loading' && (
                <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
                    <div className="relative mb-8">
                        <Loader2 size={80} className="text-cyan-500 animate-spin relative z-10" />
                        <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-cyan-500/30 rounded-full blur-2xl"
                        />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 text-center">
                        Crafting {difficulty} Challenge
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse text-lg text-center max-w-md">
                        AI is generating questions with deep explanations...
                    </p>
                </div>
            )}

            {/* ACTIVE TEST VIEW */}
            {testStatus === 'active' && currentQuestion && (
                <div className="max-w-5xl mx-auto px-4 py-8 pb-32">

                    {/* Progress Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                        <div>
                            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1 block">
                                Question {currentIndex + 1} of {questions.length}
                            </span>
                            <div className="w-full md:w-96 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">

                            <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Score</span>
                                <span className="text-2xl font-black text-slate-900 dark:text-white">{score}</span>
                            </div>
                        </div>
                    </div>

                    {/* Question Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 md:p-12 rounded-[3rem] shadow-2xl mb-8 relative overflow-hidden"
                        >
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight mb-10">
                                {currentQuestion?.question}
                            </h3>

                            <div className="space-y-4">
                                {currentQuestion?.options?.map((option, idx) => {
                                    const isSelected = selectedOption === idx;
                                    const isCorrect = idx === currentQuestion?.correctIndex;
                                    const showResultStyles = isAnswerRevealed;

                                    let bgClass = "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700";
                                    let borderClass = "border-slate-200 dark:border-slate-700";
                                    let textClass = "text-slate-700 dark:text-slate-300";

                                    if (showResultStyles) {
                                        if (isCorrect) {
                                            bgClass = "bg-emerald-50 dark:bg-emerald-500/10";
                                            borderClass = "border-emerald-500";
                                            textClass = "text-emerald-700 dark:text-emerald-400";
                                        } else if (isSelected && !isCorrect) {
                                            bgClass = "bg-red-50 dark:bg-red-500/10";
                                            borderClass = "border-red-500";
                                            textClass = "text-red-700 dark:text-red-400";
                                        } else {
                                            bgClass = "opacity-50";
                                        }
                                    } else if (isSelected) {
                                        bgClass = "bg-blue-50 dark:bg-blue-500/10";
                                        borderClass = "border-blue-500";
                                        textClass = "text-blue-700 dark:text-blue-400";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            disabled={isAnswerRevealed}
                                            className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between group ${bgClass} ${borderClass} ${textClass}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border ${showResultStyles && isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className="text-lg font-medium">{option}</span>
                                            </div>
                                            {showResultStyles && isCorrect && <CheckCircle className="text-emerald-500" size={24} />}
                                            {showResultStyles && isSelected && !isCorrect && <XCircle className="text-red-500" size={24} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Enhanced Explanation Area */}
                    <AnimatePresence>
                        {isAnswerRevealed && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-[2.5rem] p-8 md:p-10 border border-indigo-100 dark:border-indigo-500/20 shadow-xl"
                            >
                                <div className="flex items-start gap-6">
                                    <div className="p-4 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm hidden md:block">
                                        <Brain size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-bold text-indigo-900 dark:text-white mb-4 flex items-center gap-2">
                                            Deep Dive Analysis <Sparkles size={16} className="text-yellow-500" />
                                        </h4>
                                        <div className="prose dark:prose-invert max-w-none text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed text-lg">
                                            {currentQuestion.explanation || "Detailed explanation required."}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button
                                        onClick={handleNext}
                                        className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3 shadow-xl"
                                    >
                                        {currentIndex === questions.length - 1 ? 'Finish Assessment' : 'Next Challenge'}
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* RESULT MODAL */}
            <AnimatePresence>
                {showResult && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[60] bg-slate-900/90 dark:bg-black/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-16 max-w-2xl w-full text-center relative border border-slate-200 dark:border-slate-800 shadow-2xl"
                        >
                            {/* Confetti Animation */}
                            {passed && !isGrandTest && (
                                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[3rem]">
                                    {[...Array(20)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ y: -50, x: Math.random() * 500, rotate: 0 }}
                                            animate={{ y: 800, rotate: 360 }}
                                            transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, ease: 'linear' }}
                                            className="absolute w-3 h-3 bg-cyan-500 rounded-full opacity-50"
                                            style={{ left: Math.random() * 100 + '%' }}
                                        />
                                    ))}
                                </div>
                            )}

                            {testStatus === 'aborted' ? (
                                <div className="text-center">
                                    <AlertTriangle size={80} className="text-red-500 mx-auto mb-6" />
                                    <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Test Terminated</h2>
                                    <p className="text-slate-500 mb-8">Anti-cheat system triggered.</p>
                                    <button onClick={onClose} className="px-8 py-3 bg-slate-200 rounded-xl font-bold">Close</button>
                                </div>
                            ) : (
                                <>
                                    <div className={`w-40 h-40 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl ${passed ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-orange-500 shadow-orange-500/40'}`}>
                                        {passed ? <Trophy size={64} className="text-white" /> : <RotateCcw size={80} className="text-white" />}
                                    </div>

                                    <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                                        {passed ? 'Outstanding!' : 'Keep Learning'}
                                    </h2>

                                    <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 font-medium">
                                        {passed
                                            ? `You've demonstrated ${difficulty} level mastery.`
                                            : 'Review the detailed explanations and try again.'}
                                    </p>

                                    <div className="flex justify-center gap-12 mb-12">
                                        <div className="text-center">
                                            <span className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Score</span>
                                            <span className="text-4xl font-black text-slate-900 dark:text-white">{finalPercentage}%</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Correct</span>
                                            <span className="text-4xl font-black text-slate-900 dark:text-white">{score}/{questions.length}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 justify-center">
                                        {!passed && (
                                            <button
                                                onClick={() => { setShowResult(false); setTestStatus('selection'); }}
                                                className="px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition"
                                            >
                                                Try Again
                                            </button>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="px-10 py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl font-bold transition shadow-xl"
                                        >
                                            {passed ? 'Continue Roadmap' : 'Close'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>,
        document.body
    );
};

export default TopicTest;
