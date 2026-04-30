import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    FileText,
    Users,
    TrendingUp,
    Plus,
    ArrowRight,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    LogOut,
    Loader2,
    Settings,
    MoreHorizontal
} from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';

// --- MINIMALIST COMPONENTS ---

const DashboardHeader = ({ userName, profileStatus, onLogout }) => {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-2">{date}</p>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome back, <span className="text-slate-500 dark:text-slate-400">{userName}</span>
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <div className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-colors",
                    profileStatus === 'Verified'
                        ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                        : "bg-amber-500/5 text-amber-600 border-amber-500/20 dark:text-amber-400"
                )}>
                    {profileStatus === 'Verified' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {profileStatus}
                </div>
                <button
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

const StatCard = ({ title, value, icon: Icon, colorClass, trend }) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 }
            }}
            transition={{ duration: 0.4 }}
            className="group relative p-6 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors duration-300 backdrop-blur-md"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-2.5 rounded-lg transition-colors", colorClass)}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                        <TrendingUp size={12} /> {trend}
                    </span>
                )}
            </div>

            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                {value}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {title}
            </div>
        </motion.div>
    );
};

const ActivityItem = ({ activity }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-slate-800 transition-all group">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {activity.content}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Post</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>{activity.createdAt?.toDate ? activity.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
            </p>
        </div>
        <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
    </div>
);

const ActionTile = ({ icon: Icon, label, path, navigate }) => (
    <button
        onClick={() => navigate(path)}
        className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-300 group w-full"
    >
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-colors">
            <Icon size={24} />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {label}
        </span>
    </button>
);

const ManagerDashboard = () => {
    const { logout, userProfile, currentUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalDegrees: 0,
        totalPosts: 0,
        totalStudents: 0,
        profileStatus: userProfile?.profileCompleted ? 'Verified' : 'Incomplete'
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const managerName = userProfile?.universityName || userProfile?.fullName || 'Manager';

    useEffect(() => {
        if (!currentUser) return;

        const fetchStats = async () => {
            try {
                // Total Degrees
                const degreesRef = collection(db, 'degrees');
                const degreesQuery = query(degreesRef, where('universityId', '==', currentUser.uid));
                const degreesSnap = await getDocs(degreesQuery);
                const degreesCount = degreesSnap.size;

                // Total Posts
                const postsRef = collection(db, 'posts');
                const postsQuery = query(postsRef, where('authorId', '==', currentUser.uid));
                const postsSnap = await getDocs(postsQuery);
                const postsCount = postsSnap.size;

                // Approved Admissions Count
                const admissionsRef = collection(db, 'admissions');
                const admissionsQuery = query(
                    admissionsRef,
                    where('universityId', '==', currentUser.uid),
                    where('status', '==', 'accepted')
                );
                const admissionsSnap = await getDocs(admissionsQuery);
                const approvedCount = admissionsSnap.size;

                setStats(prev => ({
                    ...prev,
                    totalDegrees: degreesCount,
                    totalPosts: postsCount,
                    totalStudents: approvedCount,
                    profileStatus: userProfile?.profileCompleted ? 'Verified' : 'Incomplete'
                }));
            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        // Fetch Recent Activity
        const activityRef = collection(db, 'posts');
        const activityQuery = query(
            activityRef,
            where('authorId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(4)
        );

        const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRecentActivity(posts);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching activity:", error);
            setLoading(false);
        });

        fetchStats();

        return () => {
            unsubscribeActivity();
        };
    }, [currentUser, userProfile]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 size={32} className="animate-spin text-slate-400 mb-4" />
                <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Loading Dashboard</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950 transition-colors duration-500 overflow-x-hidden p-6 sm:p-10 relative">

            {/* Subtle Texture/Glow */}
            <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto">

                <DashboardHeader
                    userName={managerName}
                    profileStatus={stats.profileStatus}
                    onLogout={handleLogout}
                />

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                    className="space-y-8"
                >
                    {/* STATS ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Active Degrees"
                            value={stats.totalDegrees}
                            icon={BookOpen}
                            colorClass="bg-blue-500/10 text-blue-500"
                            trend="+2 this month"
                        />
                        <StatCard
                            title="Community Posts"
                            value={stats.totalPosts}
                            icon={FileText}
                            colorClass="bg-purple-500/10 text-purple-500"
                            trend="High engagement"
                        />
                        <StatCard
                            title="Enrolled Students"
                            value={stats.totalStudents}
                            icon={Users}
                            colorClass="bg-orange-500/10 text-orange-500"
                            trend={stats.totalStudents > 0 ? `${stats.totalStudents} approved` : undefined}
                        />
                    </div>

                    {/* CONTENT SPLIT */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* LEFT: Recent Activity */}
                        <motion.div
                            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                            transition={{ duration: 0.4 }}
                            className="lg:col-span-2 p-6 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 backdrop-blur-md"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Activity</h3>
                                <button onClick={() => navigate('/community')} className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
                                    View Feed
                                </button>
                            </div>

                            <div className="space-y-2">
                                {recentActivity.length > 0 ? (
                                    recentActivity.map(activity => (
                                        <ActivityItem key={activity.id} activity={activity} />
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <Clock size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No recent activity recorded.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* RIGHT: Quick Actions */}
                        <motion.div
                            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                            transition={{ duration: 0.4 }}
                            className="space-y-4"
                        >
                            <div className="flex justify-between items-center px-1 mb-2">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quick Actions</h3>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                                <ActionTile
                                    icon={Plus}
                                    label="Add Degree Program"
                                    path="/manager-programs"
                                    navigate={navigate}
                                />
                                <ActionTile
                                    icon={Users}
                                    label="Manage Admissions"
                                    path="/manager-admissions" // Assuming path exists or placeholder
                                    navigate={navigate}
                                />
                                <ActionTile
                                    icon={Settings}
                                    label="Profile Settings"
                                    path="/manager-profile"
                                    navigate={navigate}
                                />
                            </div>
                        </motion.div>

                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default ManagerDashboard;
