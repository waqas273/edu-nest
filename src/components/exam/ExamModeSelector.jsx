import { motion } from 'framer-motion';
import { Zap, Flag, BookOpen, ChevronRight, Shield, FlaskConical, Atom, Calculator, Globe, Brain, Lightbulb, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUBJECT_META = {
    Biology:          { icon: FlaskConical, color: 'from-emerald-500 to-green-600',   light: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300' },
    Chemistry:        { icon: Atom,         color: 'from-violet-500 to-purple-600',   light: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300' },
    Physics:          { icon: Zap,          color: 'from-amber-500 to-orange-600',    light: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' },
    English:          { icon: Globe,        color: 'from-cyan-500 to-sky-600',        light: 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/20 dark:border-cyan-700 dark:text-cyan-300' },
    'Logical Reasoning': { icon: Brain,     color: 'from-pink-500 to-rose-600',       light: 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-700 dark:text-pink-300' },
    Mathematics:      { icon: Calculator,   color: 'from-blue-500 to-indigo-600',     light: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
};

const MDCAT_SUBJECTS = [
    { s: 'Biology', c: 81 }, { s: 'Chemistry', c: 45 }, { s: 'Physics', c: 36 },
    { s: 'English', c: 9 },  { s: 'Logical Reasoning', c: 9 },
];
const ECAT_SUBJECTS = [
    { s: 'Mathematics', c: 30 }, { s: 'Physics', c: 30 },
    { s: 'Chemistry', c: 30 },   { s: 'English', c: 10 },
];

const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};
const item = {
    hidden: { opacity: 0, y: 24 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

export default function ExamModeSelector({ type, selectedSubject, setSelectedSubject, onStart, error, isGenerating }) {
    const navigate = useNavigate();
    const isMdcat   = type === 'mdcat';
    const subjects  = isMdcat ? MDCAT_SUBJECTS : ECAT_SUBJECTS;
    const accentCls = isMdcat
        ? 'from-rose-500 to-pink-600'
        : 'from-blue-500 to-indigo-600';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0f1e] p-4 relative overflow-hidden">
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-20">
                <button
                    onClick={() => navigate('/student/entry-test')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md transition-all shadow-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Entry Tests
                </button>
            </div>

            {/* Ambient orbs */}
            <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[130px] bg-rose-300/25 dark:bg-rose-500/10" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full blur-[130px] bg-indigo-300/25 dark:bg-indigo-500/10" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[100px] bg-blue-200/20 dark:bg-blue-900/10" />

            <motion.div
                variants={container} initial="hidden" animate="show"
                className="relative z-10 w-full max-w-2xl flex flex-col gap-5"
            >
                {/* ── Header ── */}
                <motion.div variants={item} className="text-center">
                    <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r ${accentCls} text-white text-xs font-black uppercase tracking-widest shadow-lg mb-5`}
                    >
                        <BookOpen size={13} />
                        {isMdcat ? 'Official Pattern · 2024–25' : 'Official Pattern · 2024–25'}
                    </motion.div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                        {type.toUpperCase()}{' '}
                        <span className={`bg-clip-text text-transparent bg-gradient-to-r ${accentCls}`}>
                            Preparation
                        </span>
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-3">
                        Choose your practice mode to begin
                    </p>
                </motion.div>

                {/* ── Full Mock Card ── */}
                <motion.button
                    variants={item}
                    whileHover={{ scale: 1.015, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedSubject(null)}
                    className={`relative w-full p-6 rounded-3xl border-2 text-left overflow-hidden transition-all duration-200 ${
                        selectedSubject === null
                            ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-slate-900 shadow-xl shadow-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    {/* Bg glow when selected */}
                    {selectedSubject === null && (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/5 pointer-events-none" />
                    )}
                    <div className="relative flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                            selectedSubject === null
                                ? `bg-gradient-to-br ${accentCls} text-white`
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                            <Flag size={26} />
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-black text-slate-900 dark:text-white">Full Mock Exam</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                {isMdcat
                                    ? '180 Questions · 180 Minutes · 5 Subjects · No Negative Marking'
                                    : '100 Questions · 100 Minutes · 4 Subjects · +4 / –1 Marking'}
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedSubject === null ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'
                        }`}>
                            {selectedSubject === null && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                    </div>
                </motion.button>

                {/* ── Subject Cards ── */}
                <motion.div variants={item}>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center mb-3">
                        — Or practice a single subject —
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {subjects.map(({ s, c }, idx) => {
                            const meta = SUBJECT_META[s] || SUBJECT_META['English'];
                            const Icon = meta.icon;
                            const isSelected = selectedSubject === s;
                            return (
                                <motion.button
                                    key={s}
                                    whileHover={{ scale: 1.04, y: -3 }}
                                    whileTap={{ scale: 0.97 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.06, type: 'spring', stiffness: 260, damping: 22 }}
                                    onClick={() => setSelectedSubject(s)}
                                    className={`relative p-4 rounded-2xl border-2 text-left flex flex-col gap-2 transition-all duration-200 overflow-hidden ${
                                        isSelected
                                            ? `border-2 ${meta.light} shadow-lg`
                                            : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                                    }`}
                                >
                                    {isSelected && (
                                        <motion.div
                                            layoutId="subject-glow"
                                            className={`absolute inset-0 opacity-20 bg-gradient-to-br ${meta.color} pointer-events-none`}
                                        />
                                    )}
                                    <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${
                                        isSelected ? `bg-gradient-to-br ${meta.color} text-white shadow-md` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="relative">
                                        <div className={`text-sm font-black ${isSelected ? '' : 'text-slate-800 dark:text-slate-200'}`}>{s}</div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>{c} questions · {c} mins</div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ── MDCAT info / ECAT warning ── */}
                <motion.div variants={item}>
                    {isMdcat ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                            <Shield size={18} className="text-emerald-500 flex-shrink-0" />
                            <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                <span className="font-black uppercase tracking-wider">No Negative Marking</span> — Every correct answer counts. Wrong answers carry no penalty.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                            <Shield size={18} className="text-amber-500 flex-shrink-0" />
                            <p className="text-amber-700 dark:text-amber-400 text-xs font-bold">
                                <span className="font-black uppercase tracking-wider">Negative Marking Active</span> — +4 for correct · –1 for incorrect answers. Avoid guessing.
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* ── Error ── */}
                {error && (
                    <motion.div variants={item} className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800 text-sm">
                        {error}
                    </motion.div>
                )}

                {/* ── CTA Button ── */}
                <motion.button
                    variants={item}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onStart}
                    disabled={isGenerating}
                    className={`w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-xl transition-all duration-200 ${
                        selectedSubject
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/50'
                            : `bg-gradient-to-r ${accentCls} shadow-blue-500/30 hover:shadow-blue-500/50`
                    } hover:shadow-2xl`}
                >
                    <Zap size={18} />
                    {selectedSubject ? `Start ${selectedSubject} Practice` : `Start Full ${type.toUpperCase()} Mock Exam`}
                    <ChevronRight size={18} />
                </motion.button>

                <motion.p variants={item} className="text-center text-xs text-slate-400 dark:text-slate-600">
                    Progress is auto-saved · Anti-cheat active · Official syllabus only
                </motion.p>
            </motion.div>
        </div>
    );
}
