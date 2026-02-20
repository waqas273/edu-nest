import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Linkedin, Briefcase, Code2, Rocket, Brain, Layers } from 'lucide-react';

const TeamModal = ({ isOpen, onClose }) => {

    // Config
    const supervisor = {
        name: "Mam Muskan Shahid",
        role: "Project Supervisor",
        avatar: "https://ui-avatars.com/api/?name=Muskan+Shahid&background=F59E0B&color=fff&size=128",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        icon: Briefcase
    };

    const teamMembers = [
        {
            name: "Muhammad Waqas",
            role: "Full Stack Developer",
            avatar: "https://ui-avatars.com/api/?name=Muhammad+Waqas&background=10B981&color=fff&size=128",
            icon: Rocket,
            socials: ["#", "#"]
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Dark Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    >

                        {/* Modal Panel */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl custom-scrollbar"
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
                            >
                                <X size={20} />
                            </button>

                            {/* Main Content */}
                            <div className="p-8 md:p-12">

                                {/* Header */}
                                <div className="text-center mb-12">
                                    <h3 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400">
                                        The Minds Behind EduNest
                                    </h3>
                                    <p className="text-slate-400 mt-2">Visionaries and Builders shaping the future of education.</p>
                                </div>

                                {/* SECTION 1: THE VISIONARY (Supervisor) */}
                                <div className="mb-12 flex justify-center">
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        className={`relative w-full max-w-md p-6 rounded-2xl border ${supervisor.border} ${supervisor.bg} backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.1)] flex flex-col items-center text-center group`}
                                    >
                                        <div className="absolute -top-3 px-4 py-1 rounded-full bg-amber-500 text-white text-xs font-bold tracking-wider uppercase shadow-lg">
                                            Visionary Leader
                                        </div>

                                        <div className="relative mb-4 mt-2">
                                            <div className="absolute inset-0 rounded-full bg-amber-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity" />
                                            <img src={supervisor.avatar} alt={supervisor.name} className="relative w-24 h-24 rounded-full border-2 border-amber-500 shadow-xl" />
                                            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900 border border-amber-500 text-amber-500">
                                                <supervisor.icon size={14} />
                                            </div>
                                        </div>

                                        <h4 className="text-2xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
                                            {supervisor.name}
                                        </h4>
                                        <p className={`text-sm font-bold ${supervisor.color} tracking-wide uppercase`}>
                                            {supervisor.role}
                                        </p>

                                        <div className="mt-4 pt-4 w-full border-t border-amber-500/20 text-xs text-amber-200/60 leading-relaxed italic">
                                            "Guiding the team towards excellence and innovation in EdTech."
                                        </div>
                                    </motion.div>
                                </div>

                                {/* SECTION 2: THE BUILDERS (Team) */}
                                <div>
                                    <h4 className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-8">
                                        Core Development Team
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {teamMembers.map((member, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 + (index * 0.1) }}
                                                whileHover={{ y: -5 }}
                                                className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 flex flex-col items-center text-center"
                                            >
                                                <div className="mb-4 relative">
                                                    <img
                                                        src={member.avatar}
                                                        alt={member.name}
                                                        className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 group-hover:border-emerald-500 transition-colors"
                                                    />
                                                    <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900 border border-slate-700 group-hover:border-emerald-500 text-slate-400 group-hover:text-emerald-500 transition-colors">
                                                        <member.icon size={12} />
                                                    </div>
                                                </div>

                                                <h5 className="font-bold text-white text-lg mb-1 group-hover:text-emerald-400 transition-colors">
                                                    {member.name}
                                                </h5>
                                                <p className="text-xs text-slate-400 font-medium mb-4">
                                                    {member.role}
                                                </p>

                                                <div className="flex gap-3 mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <a href="#" className="p-1.5 rounded-lg bg-black/30 hover:bg-emerald-500 hover:text-white transition-colors">
                                                        <Linkedin size={14} />
                                                    </a>
                                                    <a href="#" className="p-1.5 rounded-lg bg-black/30 hover:bg-emerald-500 hover:text-white transition-colors">
                                                        <Github size={14} />
                                                    </a>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Footer Line */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500 opacity-30" />
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TeamModal;
