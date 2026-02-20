import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';
import { generateTest } from '../../services/testService';

const QuizModal = ({ isOpen, onClose, topic, skill, onPass }) => {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null); // { score, passed }
    const [currentQ, setCurrentQ] = useState(0);

    // Initial Load
    useEffect(() => {
        if (isOpen && topic) {
            setLoading(true);
            setResult(null);
            setAnswers({});
            setCurrentQ(0);

            generateTest(skill, topic).then(data => {
                setQuestions(data.questions);
                setLoading(false);
            });
        }
    }, [isOpen, topic, skill]);

    const handleOptionSelect = (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleSubmit = () => {
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.answer) correctCount++;
        });

        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= 65;
        setResult({ score, passed });

        if (passed) {
            onPass();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Loading State */}
                {loading && (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Generating AI Test...</h3>
                        <p className="text-slate-500">Our AI is crafting unique questions for {topic}.</p>
                    </div>
                )}

                {/* Result State */}
                {!loading && result && (
                    <div className="p-12 text-center space-y-6">
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${result.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                            {result.passed ? <Award size={48} /> : <AlertCircle size={48} />}
                        </motion.div>

                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{result.passed ? 'Test Passed!' : 'Test Failed'}</h2>
                            <p className="text-slate-500 mt-2 text-lg">You scored <span className="font-bold text-slate-900 dark:text-white">{result.score}%</span></p>
                        </div>

                        <div className="flex justify-center gap-4">
                            {!result.passed && (
                                <button
                                    onClick={() => { setResult(null); setAnswers({}); setCurrentQ(0); }}
                                    className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                >
                                    Retake Test
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className={`px-6 py-3 rounded-xl font-bold text-white transition shadow-lg ${result.passed ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-slate-500 hover:bg-slate-600'}`}
                            >
                                {result.passed ? 'Continue Roadmap' : 'Close'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Quiz Interface */}
                {!loading && !result && questions.length > 0 && (
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Question {currentQ + 1} of {questions.length}</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{topic}</p>
                            </div>
                            <div className="text-sm font-medium text-slate-500">
                                {Math.round(((currentQ + 1) / questions.length) * 100)}% Progress
                            </div>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto">
                            <h2 className="text-xl font-medium text-slate-900 dark:text-white mb-6 leading-relaxed">
                                {questions[currentQ].question}
                            </h2>
                            <div className="space-y-3">
                                {questions[currentQ].options.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleOptionSelect(questions[currentQ].id, opt)}
                                        className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 flex items-center ${answers[questions[currentQ].id] === opt
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0 ${answers[questions[currentQ].id] === opt ? 'border-blue-500' : 'border-slate-300 dark:border-slate-500'
                                            }`}>
                                            {answers[questions[currentQ].id] === opt && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                                        </div>
                                        <span className="font-medium">{opt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between">
                            <button
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(prev => prev - 1)}
                                className="px-6 py-2 text-slate-500 font-medium hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 transition"
                            >
                                Previous
                            </button>
                            {currentQ === questions.length - 1 ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={Object.keys(answers).length !== questions.length}
                                    className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:shadow-none transition transform active:scale-95"
                                >
                                    Submit Test
                                </button>
                            ) : (
                                <button
                                    onClick={() => setCurrentQ(prev => prev + 1)}
                                    className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition transform active:scale-95"
                                >
                                    Next Question
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default QuizModal;
