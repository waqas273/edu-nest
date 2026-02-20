import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Microscope, Ruler, Clock, FileText } from 'lucide-react';

const EntryTestPrep = () => {
    const navigate = useNavigate();

    const TESTS = [
        { id: 'mdcat', name: 'MDCAT', full: 'Medical & Dental College Admission Test', icon: Microscope, color: 'bg-rose-500' },
        { id: 'ecat', name: 'ECAT', full: 'Engineering College Admission Test', icon: Ruler, color: 'bg-blue-500' },
    ];

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">Entry Test Preparation</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                    Take high-quality mock exams to prepare for your university entrance. Real-time simulation with instant results.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4">
                {TESTS.map(test => (
                    <motion.div
                        key={test.id}
                        whileHover={{ y: -5 }}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden relative group"
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 ${test.color} opacity-10 rounded-bl-full`} />

                        <div className={`w-16 h-16 ${test.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg`}>
                            <test.icon size={32} />
                        </div>

                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{test.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 h-12">{test.full}</p>

                        <div className="space-y-3 mb-8">
                            <div className="flex items-center text-slate-600 dark:text-slate-300">
                                <Clock size={18} className="mr-3 text-slate-400" />
                                {test.id === 'mdcat' ? '3.5 Hours' : '2 Hours'}
                            </div>
                            <div className="flex items-center text-slate-600 dark:text-slate-300">
                                <FileText size={18} className="mr-3 text-slate-400" />
                                {test.id === 'mdcat' ? '200 Questions' : '100 Questions'}
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/student/entry-test/${test.id}`)}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:shadow-lg transition transform active:scale-95"
                        >
                            Start Mock Exam
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default EntryTestPrep;
