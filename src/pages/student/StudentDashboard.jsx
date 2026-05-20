import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
    User, Target, Award, Activity, Play, Clock,
    PenTool, Brain, BookOpen, Sparkles, ChevronRight, MessageCircle, Users
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

// Spotlight Card Component
const SpotlightCard = ({ children, className = "", onClick }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    const background = useTransform(
        [mouseX, mouseY],
        ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(99, 102, 241, 0.08), transparent 40%)`
    );

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            className={`relative overflow-hidden bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-2xl transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-500/20 shadow-lg dark:shadow-none ${className}`}
            style={{ background }}
        >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48ZmVDb2xvck1hdHJpeCB0eXBlPSJzYXR1cmF0ZSIgdmFsdWVzPSIwIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMC4wMyIvPjwvc3ZnPg==')] opacity-30 pointer-events-none" />
            {children}
        </motion.div>
    );
};

// Circular Progress Component
const CircularProgress = ({ value, size = 160 }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <defs>
                <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
                <filter id="neonGlow">
                    <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-200 dark:text-slate-800/50" />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius}
                stroke="url(#neonGradient)"
                strokeWidth="6" fill="none"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 2, ease: "easeOut" }}
                strokeLinecap="round"
                filter="url(#neonGlow)"
            />
            <text x="50%" y="50%" textAnchor="middle" dy=".35em" className="text-3xl font-bold fill-slate-900 dark:fill-white" transform={`rotate(90 ${size / 2} ${size / 2})`}>
                {value}%
            </text>
        </svg>
    );
};

// Mini Sparkline SVG
const Sparkline = ({ className = "" }) => (
    <svg className={`w-full h-12 opacity-20 ${className}`} viewBox="0 0 100 40">
        <path
            d="M0,30 Q25,10 50,20 T100,15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-indigo-400"
        />
    </svg>
);

// Shimmer Skeleton
const ShimmerBox = ({ className = "" }) => (
    <div className={`relative overflow-hidden bg-slate-800/30 rounded-xl ${className}`}>
        <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/20 to-transparent"
        />
    </div>
);

// Time Ago Helper
const timeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();
    const [stats, setStats] = useState({ posts: null, tests: null });
    const [recentTests, setRecentTests] = useState(null);
    const [activeRoadmap, setActiveRoadmap] = useState(undefined);
    const [recentPosts, setRecentPosts] = useState(null);

    const firstName = userProfile?.fullName?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'Student';

    useEffect(() => {
        if (!currentUser) return;
        const unsubs = [];

        try {
            // 1. Community Posts Count (Corrected)
            const postsRef = collection(db, 'posts');
            const postsQuery = query(postsRef, where('userId', '==', currentUser.uid));

            const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
                setStats(prev => ({ ...prev, posts: snapshot.size }));
            }, (error) => {
                console.error("Error fetching posts count:", error);
            });
            unsubs.push(unsubscribePosts);

            // 2. Test History
            const historyQuery = query(collection(db, 'test_history'), where('userId', '==', currentUser.uid));
            unsubs.push(onSnapshot(historyQuery, (snap) => {
                const allTests = snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date(0) }));
                allTests.sort((a, b) => b.timestamp - a.timestamp);
                setRecentTests(allTests.slice(0, 4));
                setStats(prev => ({ ...prev, tests: allTests.length }));
            }));

            // 3. Active Roadmap
            const roadmapQuery = query(collection(db, 'roadmaps'), where('userId', '==', currentUser.uid));
            unsubs.push(onSnapshot(roadmapQuery, (snap) => {
                setActiveRoadmap(!snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null);
            }));

            // 4. Live Community Feed - Last 3 posts
            const communityQuery = query(
                collection(db, 'posts'),
                orderBy('createdAt', 'desc'),
                limit(3)
            );
            unsubs.push(onSnapshot(communityQuery, (snap) => {
                const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRecentPosts(posts);
            }));

        } catch (err) {
            console.error("Dashboard Error:", err);
            setStats({ posts: 0, tests: 0 });
            setRecentTests([]);
            setActiveRoadmap(null);
            setRecentPosts([]);
        }

        return () => unsubs.forEach(unsub => unsub());
    }, [currentUser]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 30, stiffness: 200 } }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white pb-20 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Glow Orbs */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-indigo-300/20 dark:bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-300/20 dark:bg-purple-600/20 rounded-full blur-[150px] pointer-events-none" />

            {/* Command Center Header */}
            <div className="sticky top-4 z-50 max-w-7xl mx-auto mb-8 px-4">
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 20 }}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl dark:shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">Academic Portal</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Student Console</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/student/profile')}
                        className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl transition-all group"
                    >
                        {userProfile?.profilePic || currentUser?.photoURL ? (
                            <img
                                src={userProfile?.profilePic || currentUser?.photoURL}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {firstName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-sm font-medium text-slate-700 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{firstName}</span>
                    </button>
                </motion.div>
            </div>

            {/* Bento Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[minmax(120px,auto)]"
            >
                {/* Hero Section - Current Mission */}
                <motion.div variants={itemVariants} className="md:col-span-8 md:row-span-2">
                    <SpotlightCard className="h-full p-8 relative cursor-pointer" onClick={() => activeRoadmap && navigate(`/student/roadmap/${encodeURIComponent(activeRoadmap.skill)}`)}>
                        {activeRoadmap === undefined ? (
                            <div className="flex items-center justify-center h-full">
                                <ShimmerBox className="w-full h-48" />
                            </div>
                        ) : activeRoadmap ? (
                            <div className="flex flex-col md:flex-row gap-8 items-center h-full">
                                <div className="flex-shrink-0">
                                    <CircularProgress value={activeRoadmap.progress || 0} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Target className="text-indigo-400" size={18} />
                                            <span className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider">Current Mission</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/student/roadmaps/all');
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 relative z-10"
                                        >
                                            View All <ChevronRight size={12} />
                                        </button>
                                    </div>
                                    <h2 className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">Resuming: {activeRoadmap.skill}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                        Next: {activeRoadmap.topics?.find(t => t.status === 'unlocked' || t.status === 'in-progress')?.title || "Complete"}
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/student/roadmap/${encodeURIComponent(activeRoadmap.skill)}`);
                                        }}
                                        className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold shadow-lg shadow-indigo-600/50 flex items-center gap-2 hover:shadow-indigo-600/70 transition-all"
                                    >
                                        <Play size={18} fill="currentColor" />
                                        Continue
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full py-12">
                                <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
                                    <Target className="text-indigo-400" size={36} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">No Active Mission</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">Begin your learning journey</p>
                                <button onClick={() => navigate('/student/roadmap')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all">
                                    Start Mission
                                </button>
                            </div>
                        )}
                    </SpotlightCard>
                </motion.div>

                {/* Vertical Stack (Average Score Removed, Cards Resized) */}
                <motion.div variants={itemVariants} className="md:col-span-4 md:row-span-2 flex flex-col gap-5">
                    <SpotlightCard className="p-5 relative overflow-hidden flex-1 flex flex-col justify-center">
                        <Sparkline className="absolute top-0 right-0 h-20 opacity-10" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                    <Activity className="text-purple-400" size={20} />
                                </div>
                            </div>
                            <div className="text-4xl font-bold mb-1 text-slate-900 dark:text-white">
                                {stats.tests === null ? <ShimmerBox className="h-10 w-20" /> : stats.tests}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Tests Completed</div>
                        </div>
                    </SpotlightCard>

                    <SpotlightCard className="p-5 relative overflow-hidden flex-1 flex flex-col justify-center">
                        <Sparkline className="absolute top-0 right-0 h-20 opacity-10" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                    <User className="text-emerald-400" size={20} />
                                </div>
                            </div>
                            <div className="text-4xl font-bold mb-1 text-slate-900 dark:text-white">
                                {stats.posts === null ? <ShimmerBox className="h-10 w-20" /> : stats.posts}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">Community Posts</div>
                        </div>
                    </SpotlightCard>
                </motion.div>

                {/* Live Community Feed */}
                <motion.div variants={itemVariants} className="md:col-span-6">
                    <SpotlightCard className="p-6 h-full">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Users className="text-green-400" size={20} />
                                Live Community
                            </h3>
                        </div>

                        {recentPosts === null ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <ShimmerBox key={i} className="h-12" />)}
                            </div>
                        ) : recentPosts.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                {recentPosts.map((post, i) => (
                                    <div key={post.id} className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition">
                                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                            {post.username?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{post.content}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(post.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 dark:text-slate-500 py-4">No community activity yet</p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => navigate('/community')}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-bold shadow-lg shadow-green-600/30 flex items-center justify-center gap-2 hover:shadow-green-600/50 transition-all text-white relative z-10"
                        >
                            <MessageCircle size={18} />
                            Enter Community Hub
                        </motion.button>
                    </SpotlightCard>
                </motion.div>

                {/* Recent Intel (Tests) */}
                <motion.div variants={itemVariants} className="md:col-span-6">
                    <SpotlightCard className="p-6 h-full">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Clock className="text-indigo-400" size={20} />
                                Recent Tests
                            </h3>
                            <button
                                onClick={() => navigate('/student/history')}
                                className="text-sm text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1 relative z-10"
                            >
                                See All History <ChevronRight size={14} />
                            </button>
                        </div>

                        {recentTests === null ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <ShimmerBox key={i} className="h-14" />)}
                            </div>
                        ) : recentTests.length > 0 ? (
                            <div className="space-y-2">
                                {recentTests.slice(0, 3).map((test, i) => (
                                    <div
                                        key={test.id || i}
                                        className="flex items-center justify-between p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${test.status === 'pass' ? 'bg-green-400 shadow-lg shadow-green-400/50' : test.status === 'fail' ? 'bg-red-400 shadow-lg shadow-red-400/50' : 'bg-slate-400'}`} />
                                            <div>
                                                <p className="font-semibold text-sm text-slate-900 dark:text-white">{test.testName || test.topicName || test.topic || test.skill}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(test.timestamp)}</p>
                                            </div>
                                        </div>
                                        <div className={`text-lg font-bold ${test.status === 'pass' || test.status === 'completed' ? 'text-green-400' : test.status === 'fail' || test.status === 'aborted' ? 'text-red-400' : 'text-slate-400'}`}>
                                            {test.status === 'started' ? '...' : `${test.percentage || 0}%`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-slate-400 dark:text-slate-500">No recent tests</div>
                        )}
                    </SpotlightCard>
                </motion.div>

                {/* Quick Access Dock */}
                <motion.div variants={itemVariants} className="md:col-span-4">
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} onClick={() => navigate('/student/entry-test')} className="cursor-pointer">
                        <SpotlightCard className="p-6 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg shadow-rose-500/30">
                                    <PenTool size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Entry Test</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Practice exams</p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </motion.div>

                <motion.div variants={itemVariants} className="md:col-span-4">
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} onClick={() => navigate('/student/interest')} className="cursor-pointer">
                        <SpotlightCard className={`p-6 transition-all ${userProfile?.interest ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl shadow-lg ${userProfile?.interest ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-fuchsia-500/30' : 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30'}`}>
                                    {userProfile?.interest ? <Target size={24} className="text-white" /> : <Brain size={24} className="text-white" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">
                                        {userProfile?.interest ? "Academic Focus" : "Assessment"}
                                    </h4>
                                    <p className={`text-xs ${userProfile?.interest ? 'text-purple-600 dark:text-purple-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {userProfile?.interest || "Discover your field"}
                                    </p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </motion.div>

                <motion.div variants={itemVariants} className="md:col-span-4">
                    <motion.div whileHover={{ scale: 1.05, y: -2 }} onClick={() => navigate('/student/roadmap')} className="cursor-pointer">
                        <SpotlightCard className="p-6 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Roadmap</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Learning paths</p>
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div >
    );
};

export default StudentDashboard;
