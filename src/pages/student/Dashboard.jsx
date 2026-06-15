import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Code, TrendingUp, Clock, BookOpen, ExternalLink, Calendar, PenTool, Sparkles } from 'lucide-react';
import GlassCard from '../../components/ui/GlassCard';

const Dashboard = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();
    const firstName = userProfile?.fullName?.split(' ')[0] || 'Student';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80 } }
    };

    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-rose-500 rounded-3xl p-8 md:p-10 text-white shadow-2xl overflow-hidden"
            >
                {/* Animated Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-300/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center mb-3">
                            <Sparkles className="mr-2" size={28} />
                            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                                Welcome Back, {firstName}!
                            </h1>
                        </div>
                        <p className="text-blue-50 text-lg max-w-2xl leading-relaxed">
                            Continue your learning journey. You have <span className="font-bold text-white">3 pending tasks</span> in your roadmap today.
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Widgets Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                {/* Roadmap Progress Widget */}
                <motion.div variants={itemVariants}>
                    <GlassCard className="cursor-pointer" onClick={() => navigate('/roadmap')}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3">
                                    <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                                </div>
                                Roadmap Progress
                            </h3>
                        </div>
                        <div className="mb-3 flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">BSCS Roadmap</span>
                            <span className="font-bold text-slate-800 dark:text-white">65%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "65%" }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"
                            />
                        </div>
                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">Next:</span> Data Structures & Algorithms
                        </p>
                    </GlassCard>
                </motion.div>

                {/* Entry Test Widget */}
                <motion.div variants={itemVariants}>
                    <GlassCard className="cursor-pointer group" onClick={() => navigate('/entry-test')}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mr-3">
                                    <PenTool className="text-rose-600 dark:text-rose-400" size={20} />
                                </div>
                                Entry Test Prep
                            </h3>
                            <ExternalLink size={16} className="text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-rose-50/80 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800/30">
                                <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">MDCAT</span>
                                <span className="text-xs bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-rose-600 font-medium shadow-sm">Start</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-50/80 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">ECAT</span>
                                <span className="text-xs bg-white dark:bg-slate-800 px-3 py-1 rounded-lg text-blue-600 font-medium shadow-sm">Start</span>
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* My Interests Widget */}
                <motion.div variants={itemVariants}>
                    <GlassCard className="cursor-pointer" onClick={() => navigate('/interest')}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                                    <Code className="text-purple-600 dark:text-purple-400" size={20} />
                                </div>
                                My Interests
                            </h3>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">Edit</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['Web Dev', 'AI', 'Cyber Security', 'UI/UX'].map((tag) => (
                                <span key={tag} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200/50 dark:border-slate-600/50">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>

                {/* Recent Applications Widget */}
                <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
                    <GlassCard>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-3">
                                    <Clock className="text-orange-600 dark:text-orange-400" size={20} />
                                </div>
                                Recent Apps
                            </h3>
                            <ExternalLink size={16} className="text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition" />
                        </div>
                        <div className="space-y-3">
                            {[
                                { uni: 'LUMS', status: 'Pending', date: '12 Jan 2024' },
                                { uni: 'FAST NUCES', status: 'Approved', date: '10 Jan 2024' },
                            ].map((app, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50/80 dark:bg-slate-700/40 rounded-xl border border-slate-100/50 dark:border-slate-600/50">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-white text-sm">{app.uni}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                                            <Calendar size={12} className="mr-1" /> {app.date}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${app.status === 'Approved'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        }`}>
                                        {app.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            </motion.div>

            {/* Recommended Universities */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <GlassCard>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        Recommended Pathways
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Based on your interest in <span className="font-semibold text-blue-600 dark:text-blue-400">"AI"</span>, we recommend checking out top engineering and computer science university options.
                    </p>
                </GlassCard>
            </motion.div>
        </div>
    );
};

export default Dashboard;
