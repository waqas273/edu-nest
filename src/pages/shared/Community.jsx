import { motion } from 'framer-motion';
import CommunityFeed from '../../components/CommunityFeed';
import { Users, Sparkles, TrendingUp, MessageSquare, Heart } from 'lucide-react';

/**
 * Unified Community Page
 * Serves Students, University Managers, and Admins
 */
const Community = () => {
    return (
        <div className="min-h-screen p-6 md:p-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500 relative">

            {/* Animated Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 60, 0],
                        y: [0, -30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 0],
                        y: [0, 40, 0],
                        scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-pink-500/10 dark:bg-pink-500/20 rounded-full blur-[120px]"
                />
            </div>

            <div className="max-w-5xl mx-auto relative z-10">
                {/* Premium Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mb-10"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
                            >
                                Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-400 dark:via-pink-400 dark:to-red-400 animate-gradient">Forum</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2"
                            >
                                <Users size={16} /> Connect, share, and grow with the EduNest community
                            </motion.p>
                        </div>

                        {/* Stats Cards - Fixed with explicit classes */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            className="flex gap-3"
                        >
                            {/* Active Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 }}
                                whileHover={{ y: -4, scale: 1.05 }}
                                className="flex flex-col items-center gap-1 px-4 py-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg"
                            >
                                <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/10">
                                    <MessageSquare size={18} className="text-cyan-600 dark:text-cyan-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Active</span>
                            </motion.div>

                            {/* Engaged Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.30 }}
                                whileHover={{ y: -4, scale: 1.05 }}
                                className="flex flex-col items-center gap-1 px-4 py-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg"
                            >
                                <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-500/10">
                                    <Heart size={18} className="text-pink-600 dark:text-pink-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Engaged</span>
                            </motion.div>

                            {/* Growing Badge */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35 }}
                                whileHover={{ y: -4, scale: 1.05 }}
                                className="flex flex-col items-center gap-1 px-4 py-3 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg"
                            >
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/10">
                                    <TrendingUp size={18} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Growing</span>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Welcome Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-500 dark:via-pink-500 dark:to-red-500 p-8 shadow-2xl mb-8"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -top-10 -right-10 bg-white/10 w-40 h-40 rounded-full blur-3xl"
                        />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="text-white" size={24} fill="currentColor" />
                                    <h3 className="text-2xl font-black text-white">Welcome to the Community!</h3>
                                </div>
                                <p className="text-white/90 font-medium">Share your thoughts, ask questions, and connect with peers from around the world.</p>
                            </div>
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ duration: 0.5 }}
                                className="hidden md:block p-4 rounded-2xl bg-white/20 backdrop-blur-sm"
                            >
                                <Users className="text-white" size={32} />
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.header>

                {/* Community Feed */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <CommunityFeed />
                </motion.div>
            </div>

            <style>{`
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};

export default Community;
