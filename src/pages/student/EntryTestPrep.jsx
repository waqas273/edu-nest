import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Microscope, Ruler, Clock, FileText, ChevronRight, Zap, Shield, Target } from 'lucide-react';

const TESTS = [
    {
        id: 'mdcat',
        name: 'MDCAT',
        full: 'Medical & Dental College Admission Test',
        authority: 'PMDC — Pakistan Medical Commission',
        icon: Microscope,
        gradient: 'from-rose-500 to-pink-600',
        glow: 'shadow-rose-500/25',
        border: 'hover:border-rose-300 dark:hover:border-rose-700',
        accent: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30',
        textAccent: 'text-rose-600 dark:text-rose-400',
        duration: '180 Minutes',
        questions: '180 Questions',
        subjects: ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'],
        subjectCounts: [81, 45, 36, 9, 9],
        passing: '55%',
        negative: false,
    },
    {
        id: 'ecat',
        name: 'ECAT',
        full: 'Engineering College Admission Test',
        authority: 'UET — University of Engineering & Technology',
        icon: Ruler,
        gradient: 'from-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/25',
        border: 'hover:border-blue-300 dark:hover:border-blue-700',
        accent: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
        textAccent: 'text-blue-600 dark:text-blue-400',
        duration: '100 Minutes',
        questions: '100 Questions',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'English'],
        subjectCounts: [30, 30, 30, 10],
        passing: '50%',
        negative: true,
    },
];

const subjectColors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

const EntryTestPrep = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[90vh] flex flex-col items-center justify-center py-12 px-4 relative">
            {/* Ambient Background Orbs */}
            <div className="pointer-events-none fixed top-0 left-1/4 w-96 h-96 bg-rose-300/20 dark:bg-rose-500/10 rounded-full blur-[120px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-[120px]" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-14 relative z-10"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-5">
                    <Zap size={12} />
                    AI-Powered Exam Preparation
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Entry Test{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-blue-600">
                        Preparation
                    </span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
                    Practice with AI-generated questions that strictly follow official PMDC & UET exam patterns.
                </p>
            </motion.div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl w-full relative z-10">
                {TESTS.map((test, i) => (
                    <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.15 }}
                        whileHover={{ y: -6 }}
                        className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl ${test.glow} transition-all duration-300 ${test.border}`}
                    >
                        {/* Top Gradient Band */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${test.gradient}`} />

                        <div className="p-8">
                            {/* Icon + Title */}
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${test.gradient} flex items-center justify-center text-white shadow-lg ${test.glow} mb-4`}>
                                        <test.icon size={28} />
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 dark:text-white">{test.name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{test.full}</p>
                                    <p className={`text-xs font-bold mt-1 ${test.textAccent}`}>{test.authority}</p>
                                </div>
                                {test.negative && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-amber-600 dark:text-amber-400">
                                        <Shield size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">–ve Marking</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { icon: Clock, label: 'Duration', val: test.duration },
                                    { icon: FileText, label: 'Questions', val: test.questions },
                                ].map(({ icon: Icon, label, val }) => (
                                    <div key={label} className={`p-4 rounded-2xl border ${test.accent} flex items-center gap-3`}>
                                        <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm`}>
                                            <Icon size={16} className={test.textAccent} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white">{val}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subject Chips */}
                            <div className="mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subjects Covered</p>
                                <div className="flex flex-wrap gap-2">
                                    {test.subjects.map((subj, idx) => (
                                        <div key={subj} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${subjectColors[idx % subjectColors.length]}`}>
                                            {subj}
                                            <span className="opacity-60 font-normal">({test.subjectCounts[idx]})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Passing Info */}
                            <div className="flex items-center gap-2 mb-7">
                                <Target size={14} className="text-slate-400" />
                                <span className="text-xs text-slate-400">Passing threshold: <span className="font-bold text-slate-700 dark:text-slate-300">{test.passing}</span></span>
                                {test.negative && (
                                    <span className="text-xs text-slate-400 ml-auto">+4 / –1 marking</span>
                                )}
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={() => navigate(`/student/entry-test/${test.id}`)}
                                className={`group/btn w-full py-4 bg-gradient-to-r ${test.gradient} text-white font-bold rounded-2xl shadow-lg ${test.glow} hover:shadow-xl hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-3 text-base`}
                            >
                                Begin Preparation
                                <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Note */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-10 text-sm text-slate-400 dark:text-slate-600 text-center relative z-10"
            >
                Questions are dynamically generated by AI following official syllabi · Progress is auto-saved
            </motion.p>
        </div>
    );
};

export default EntryTestPrep;
