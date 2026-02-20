import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    Clock, DollarSign, ArrowRight, GraduationCap,
    Sparkles, CheckCircle2, ChevronRight, Lock
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ProgramCard = ({ program, studentProfile, onApply, myApplicationStatus, index = 0 }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-200, 200], [5, -5]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-5, 5]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    const eligibleScholarship = null; // Logic removed from display
    const isClosed = checkDeadlineStatus(program.applicationDeadline).closed;


    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.05
            }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative h-full perspective-1000"
        >
            <div className={cn(
                "relative h-full flex flex-col overflow-hidden rounded-3xl transition-all duration-500",
                "bg-white dark:bg-slate-800/90",
                "border-[1.5px] border-slate-200 dark:border-slate-600/50",
                "shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
                "dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            )}>
                {/* Top Gradient Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                <div className="p-6 flex flex-col h-full relative z-10">
                    {/* Header: Icon & Badge */}
                    <div className="flex justify-between items-start mb-5">
                        <div className={cn(
                            "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                            "bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20",
                            "border-2 border-cyan-200 dark:border-cyan-500/30",
                            "shadow-lg shadow-cyan-500/10"
                        )}>
                            <GraduationCap className="text-cyan-600 dark:text-cyan-400" size={28} />
                        </div>

                        {/* Status Badge */}
                        <div className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap",
                            isClosed
                                ? "bg-slate-100 dark:bg-slate-700/50 text-slate-500 border-slate-200 dark:border-slate-600"
                                : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                        )}>
                            {isClosed ? "Closed" : "Open"}
                        </div>
                    </div>

                    {/* Program Info */}
                    <div className="mb-5 space-y-2">
                        <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest truncate">
                            {program.degreeType || 'Degree'} • Program
                        </p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-[3.5rem]">
                            {program.title || program.programName || program.name || 'Untitled Program'}
                        </h3>
                    </div>



                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                        <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <Clock size={12} /> Duration
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                {program.duration || 'N/A'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <DollarSign size={12} /> Fee / Sem
                            </div>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                {program.estimatedFee || 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-5 border-t border-slate-100 dark:border-slate-700 mt-auto">
                        {myApplicationStatus ? (
                            <div className={cn(
                                "flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm",
                                myApplicationStatus === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                    myApplicationStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            )}>
                                <CheckCircle2 size={18} />
                                {myApplicationStatus.charAt(0).toUpperCase() + myApplicationStatus.slice(1)}
                            </div>
                        ) : (
                            <button
                                disabled={isClosed}
                                onClick={() => !isClosed && onApply(program)}
                                className={cn(
                                    "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 group/btn",
                                    isClosed
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-cyan-500/25 dark:shadow-cyan-500/10 hover:shadow-cyan-500/40"
                                )}
                            >
                                {isClosed ? (
                                    <> <Lock size={16} /> Applications Closed </>
                                ) : (
                                    <> Apply Now <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" /> </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Helper for deadlines
const checkDeadlineStatus = (deadlineStr) => {
    if (!deadlineStr) return { closed: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    return { closed: deadline < today };
};

export default ProgramCard;
