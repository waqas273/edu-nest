import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Linkedin, Briefcase, Code2, Rocket, Brain, Layers } from 'lucide-react';

const TeamModal = ({ isOpen, onClose }) => {

    // Config
    const supervisor = {
        name: "Mam Muskan Shahid",
        role: "Project Supervisor",
        avatar: "https://ui-avatars.com/api/?name=Muskan+Shahid&background=F59E0B&color=fff&size=128",
        color: "text-amber-600 dark:text-amber-450",
        bg: "bg-amber-500/5 dark:bg-amber-500/10",
        border: "border-amber-500/20 dark:border-amber-500/30",
        icon: Briefcase
    };

    const teamMembers = [
        {
            name: "Muhammad Waqas",
            role: "Team Leader & Full Stack Developer",
            avatar: "https://ui-avatars.com/api/?name=Muhammad+Waqas&background=10B981&color=fff&size=128",
            icon: Rocket,
            socials: ["#", "#"],
            isLeader: true
        },
        {
            name: "Muhammad Maaz",
            role: "Frontend Engineer",
            avatar: "https://ui-avatars.com/api/?name=Muhammad+Maaz&background=0EA5E9&color=fff&size=128",
            icon: Code2,
            socials: ["#", "#"]
        },
        {
            name: "Hammad Jaffar",
            role: "Backend Architect",
            avatar: "https://ui-avatars.com/api/?name=Hammad+Jaffar&background=8B5CF6&color=fff&size=128",
            icon: Layers,
            socials: ["#", "#"]
        },
        {
            name: "Abdullah Yonus",
            role: "AI Specialist",
            avatar: "https://ui-avatars.com/api/?name=Abdullah+Yonus&background=F43F5E&color=fff&size=128",
            icon: Brain,
            socials: ["#", "#"]
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        visible: { 
            opacity: 1, 
            scale: 1,
            y: 0,
            transition: { type: "spring", stiffness: 150, damping: 15 }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                >
                    {/* Modal Panel */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 30 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-xl custom-scrollbar text-slate-800 dark:text-slate-100"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-150 dark:bg-slate-900/50 text-slate-550 dark:text-slate-400 hover:bg-rose-500/10 hover:text-rose-600 transition-all duration-300 border border-transparent hover:border-rose-500/20"
                        >
                            <X size={18} />
                        </button>

                        {/* Main Content */}
                        <div className="p-8 md:p-12">

                            {/* Header */}
                            <div className="text-center mb-12">
                                <h3 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-emerald-400">
                                    The Minds Behind EduNest
                                </h3>
                                <p className="text-slate-550 dark:text-slate-400 mt-2 text-sm font-medium">
                                    Visionaries and Builders shaping the future of educational technology.
                                </p>
                            </div>

                            {/* SECTION 1: THE VISIONARY (Supervisor) */}
                            <div className="mb-12 flex justify-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    className={`relative w-full max-w-md p-6 rounded-2xl border ${supervisor.border} ${supervisor.bg} backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.05)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] flex flex-col items-center text-center group cursor-pointer transition-colors duration-300`}
                                >
                                    <div className="absolute -top-3 px-4 py-1 rounded-full bg-amber-500 text-white text-xs font-bold tracking-wider uppercase shadow-lg">
                                        Visionary Leader
                                    </div>

                                    <div className="relative mb-4 mt-2">
                                        <div className="absolute inset-0 rounded-full bg-amber-500 blur-md opacity-20 group-hover:opacity-45 transition-opacity" />
                                        <img src={supervisor.avatar} alt={supervisor.name} className="relative w-24 h-24 rounded-full border-2 border-amber-500 shadow-xl" />
                                        <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white dark:bg-slate-900 border border-amber-500 text-amber-500 shadow-md">
                                            <supervisor.icon size={14} />
                                        </div>
                                    </div>

                                    <h4 className="text-2xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-amber-500 dark:group-hover:text-amber-450 transition-colors">
                                        {supervisor.name}
                                    </h4>
                                    <p className={`text-sm font-bold ${supervisor.color} tracking-wide uppercase`}>
                                        {supervisor.role}
                                    </p>

                                    <div className="mt-4 pt-4 w-full border-t border-amber-500/10 dark:border-amber-500/20 text-xs text-slate-550 dark:text-amber-200/60 leading-relaxed italic">
                                        "Guiding the team towards excellence and innovation in EdTech."
                                    </div>
                                </motion.div>
                            </div>

                            {/* SECTION 2: THE BUILDERS (Team) */}
                            <div>
                                <h4 className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">
                                    Core Development Team
                                </h4>

                                <motion.div 
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                                >
                                    {teamMembers.map((member, index) => (
                                        <motion.div
                                            key={index}
                                            variants={itemVariants}
                                            whileHover={{ y: -6, scale: 1.03 }}
                                            className={`group relative p-5 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${
                                                member.isLeader 
                                                    ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] border-emerald-500/30 dark:border-emerald-500/45 shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-500/60' 
                                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5'
                                            }`}
                                        >
                                            {member.isLeader && (
                                                <div className="absolute -top-3 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md animate-pulse">
                                                    Team Leader
                                                </div>
                                            )}

                                            <div className="mb-4 relative">
                                                <img
                                                    src={member.avatar}
                                                    alt={member.name}
                                                    className={`w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 transition-colors ${
                                                        member.isLeader 
                                                            ? 'border-emerald-500' 
                                                            : 'border-slate-200 dark:border-slate-700 group-hover:border-emerald-500'
                                                    }`}
                                                />
                                                <div className={`absolute bottom-0 right-0 p-1.5 rounded-full bg-white dark:bg-slate-900 border transition-colors shadow-sm ${
                                                    member.isLeader 
                                                        ? 'border-emerald-500 text-emerald-500' 
                                                        : 'border-slate-200 dark:border-slate-700 group-hover:border-emerald-500 text-slate-400 group-hover:text-emerald-500'
                                                }`}>
                                                    <member.icon size={12} />
                                                </div>
                                            </div>

                                            <h5 className="font-bold text-slate-800 dark:text-white text-lg mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {member.name}
                                            </h5>
                                            <p className={`text-xs font-semibold mb-4 ${
                                                member.isLeader 
                                                    ? 'text-emerald-600 dark:text-emerald-450 font-bold' 
                                                    : 'text-slate-500 dark:text-slate-400 font-medium'
                                            }`}>
                                                {member.role}
                                            </p>

                                            <div className="flex gap-3 mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
                                                <a href="#" className="p-2 rounded-lg bg-slate-200/50 dark:bg-black/30 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white transition-colors">
                                                    <Linkedin size={14} />
                                                </a>
                                                <a href="#" className="p-2 rounded-lg bg-slate-200/50 dark:bg-black/30 text-slate-600 dark:text-slate-400 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white dark:hover:text-white transition-colors">
                                                    <Github size={14} />
                                                </a>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>

                        {/* Footer Line */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 opacity-20 dark:opacity-30" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TeamModal;
