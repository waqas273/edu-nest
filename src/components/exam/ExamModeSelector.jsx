import { motion } from 'framer-motion';
import { Zap, Flag, BookOpen, ChevronRight, Shield, FlaskConical, Atom, Calculator, Globe, Brain, ArrowLeft, Sparkles, Clock, FileText } from 'lucide-react';
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

export default function ExamModeSelector({ type, selectedSubject, setSelectedSubject, onStart, error, isGenerating }) {
    const navigate = useNavigate();
    const isMdcat   = type === 'mdcat';
    const subjects  = isMdcat ? MDCAT_SUBJECTS : ECAT_SUBJECTS;
    const accentGrad = isMdcat ? 'from-rose-500 to-pink-600' : 'from-blue-500 to-indigo-600';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-rose-300/15 dark:bg-rose-500/[0.06] rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-300/15 dark:bg-indigo-500/[0.06] rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Back */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/student/entry-test')}
                    className="flex items-center gap-2 px-4 py-2 mb-8 bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/[0.06] transition-all group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back
                </motion.button>

                {/* Layout: Left info + Right subject grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN — Exam Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-5 flex flex-col"
                    >
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-indigo-500" />
                                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">AI-Powered Practice</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                                {type.toUpperCase()}{' '}
                                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${accentGrad}`}>Practice</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                Choose your practice mode below — full mock or single subject focus.
                            </p>
                        </div>

                        {/* Full Mock Button */}
                        <button
                            onClick={() => setSelectedSubject(null)}
                            className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 mb-4 group ${
                                selectedSubject === null
                                    ? 'border-indigo-500 dark:border-indigo-400 bg-white dark:bg-white/[0.06] shadow-lg shadow-indigo-500/10'
                                    : 'border-slate-200 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.12]'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                                    selectedSubject === null ? `bg-gradient-to-br ${accentGrad} text-white` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                    <Flag size={22} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-lg font-black text-slate-900 dark:text-white">Full Mock Exam</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {isMdcat ? '180 MCQs · 180 Minutes · All Subjects' : '100 MCQs · 100 Minutes · All Subjects'}
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                    selectedSubject === null ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                    {selectedSubject === null && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            </div>
                        </button>

                        {/* Info Cards */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                                <Clock size={16} className="text-slate-400 mb-2" />
                                <div className="text-xl font-black text-slate-900 dark:text-white">{isMdcat ? '180' : '100'} min</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duration</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                                <FileText size={16} className="text-slate-400 mb-2" />
                                <div className="text-xl font-black text-slate-900 dark:text-white">{isMdcat ? '180' : '100'}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total MCQs</div>
                            </div>
                        </div>

                        {/* Marking Info */}
                        {isMdcat ? (
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800 rounded-xl mb-4">
                                <Shield size={16} className="text-emerald-500 flex-shrink-0" />
                                <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                    <span className="font-black uppercase tracking-wider">No Negative Marking</span> — Wrong answers carry no penalty.
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                                <Shield size={16} className="text-amber-500 flex-shrink-0" />
                                <p className="text-amber-700 dark:text-amber-400 text-xs font-bold">
                                    <span className="font-black uppercase tracking-wider">Negative Marking</span> — +4 for correct · -1 for incorrect.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm mb-4">
                                {error}
                            </div>
                        )}

                        {/* CTA */}
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onStart}
                            disabled={isGenerating}
                            className={`w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-3 shadow-xl transition-all duration-300 overflow-hidden relative group/btn ${
                                selectedSubject
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20'
                                    : `bg-gradient-to-r ${accentGrad} shadow-blue-500/20`
                            }`}
                        >
                            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <span className="relative flex items-center gap-2">
                                <Zap size={18} />
                                {selectedSubject ? `Start ${selectedSubject} Practice` : `Start Full ${type.toUpperCase()} Mock`}
                                <ChevronRight size={18} />
                            </span>
                        </motion.button>

                        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
                            Progress is auto-saved · Anti-cheat monitoring active
                        </p>
                    </motion.div>

                    {/* RIGHT COLUMN — Subject Selection Grid */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-7"
                    >
                        <div className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.07] rounded-3xl p-6 md:p-8">
                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">Subject Focus Mode</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Select a single subject to practice targeted questions</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subjects.map(({ s, c }, idx) => {
                                    const meta = SUBJECT_META[s] || SUBJECT_META['English'];
                                    const Icon = meta.icon;
                                    const isSelected = selectedSubject === s;
                                    return (
                                        <motion.button
                                            key={s}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 + idx * 0.06 }}
                                            whileHover={{ y: -3 }}
                                            onClick={() => setSelectedSubject(s)}
                                            className={`relative p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-300 overflow-hidden ${
                                                isSelected
                                                    ? `${meta.light} shadow-lg`
                                                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.05] hover:border-slate-300 dark:hover:border-white/[0.12] hover:shadow-md'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${meta.color} pointer-events-none`} />
                                            )}
                                            <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                isSelected ? `bg-gradient-to-br ${meta.color} text-white shadow-md` : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                                <Icon size={20} />
                                            </div>
                                            <div className="relative flex-1 min-w-0">
                                                <div className={`text-sm font-black ${isSelected ? '' : 'text-slate-800 dark:text-slate-200'}`}>{s}</div>
                                                <div className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>{c} questions · {c} min</div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                isSelected ? `border-current bg-current` : 'border-slate-300 dark:border-slate-600'
                                            }`}>
                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
