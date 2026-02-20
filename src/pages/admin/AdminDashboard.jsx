import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Users, Settings, TrendingUp, Shield, UserCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/ui/GlassCard';

const AdminDashboard = () => {
    const { logout, userProfile } = useAuth();
    const navigate = useNavigate();

    // Real Firestore stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalStudents: 0,
        totalManagers: 0,
        pendingApprovals: 0,
        loading: true
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersRef = collection(db, 'users');

                // Get all users
                const allUsersSnap = await getDocs(usersRef);
                const totalUsers = allUsersSnap.size;

                // Get students
                const studentsQuery = query(usersRef, where('role', '==', 'student'));
                const studentsSnap = await getDocs(studentsQuery);
                const totalStudents = studentsSnap.size;

                // Get managers
                const managersQuery = query(usersRef, where('role', '==', 'manager'));
                const managersSnap = await getDocs(managersQuery);
                const totalManagers = managersSnap.size;

                // Get pending manager approvals
                const pendingQuery = query(usersRef, where('role', '==', 'manager'), where('isApproved', '==', false));
                const pendingSnap = await getDocs(pendingQuery);
                const pendingApprovals = pendingSnap.size;

                setStats({
                    totalUsers,
                    totalStudents,
                    totalManagers,
                    pendingApprovals,
                    loading: false
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const statCards = [
        { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-blue-500 to-cyan-500' },
        { icon: UserCheck, label: 'Students', value: stats.totalStudents, color: 'from-green-500 to-emerald-500' },
        { icon: Shield, label: 'Managers', value: stats.totalManagers, color: 'from-purple-500 to-pink-500' },
        { icon: Clock, label: 'Pending Approvals', value: stats.pendingApprovals, color: 'from-orange-500 to-red-500' }
    ];

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10"
            >
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-2">
                    Admin <span className="text-neon-cyan glow-cyan">Control Panel</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                    Welcome back, {userProfile?.fullName || 'Administrator'}
                </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"
            >
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                    >
                        <GlassCard>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg`}>
                                <stat.icon className="text-white" size={24} />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{stat.label}</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                {stats.loading ? (
                                    <span className="animate-pulse">...</span>
                                ) : (
                                    stat.value
                                )}
                            </p>
                        </GlassCard>
                    </motion.div>
                ))}
            </motion.div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <GlassCard>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Users className="mr-3 text-cyan-500 dark:text-cyan-400" size={24} />
                            User Management
                        </h3>
                        <div className="space-y-3">
                            <motion.button
                                whileHover={{ x: 5 }}
                                className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 dark:bg-white/5 dark:border-transparent hover:border-cyan-500/30 hover:shadow-lg dark:hover:bg-cyan-500/10 transition-all"
                            >
                                <p className="font-semibold text-slate-900 dark:text-white">View All Users</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Manage student and manager accounts</p>
                            </motion.button>
                            <motion.button
                                whileHover={{ x: 5 }}
                                className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 dark:bg-white/5 dark:border-transparent hover:border-orange-500/30 hover:shadow-lg dark:hover:bg-orange-500/10 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Pending Approvals</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">Review manager registrations</p>
                                    </div>
                                    {stats.pendingApprovals > 0 && (
                                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-bold">
                                            {stats.pendingApprovals}
                                        </span>
                                    )}
                                </div>
                            </motion.button>
                        </div>
                    </GlassCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <GlassCard>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Settings className="mr-3 text-purple-500 dark:text-purple-400" size={24} />
                            System Settings
                        </h3>
                        <div className="space-y-3">
                            <motion.button
                                whileHover={{ x: 5 }}
                                className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 dark:bg-white/5 dark:border-transparent hover:border-purple-500/30 hover:shadow-lg dark:hover:bg-purple-500/10 transition-all"
                            >
                                <p className="font-semibold text-slate-900 dark:text-white">Database Management</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Configure Firestore collections</p>
                            </motion.button>
                            <motion.button
                                whileHover={{ x: 5 }}
                                className="w-full text-left p-4 rounded-xl bg-white border border-slate-200 dark:bg-white/5 dark:border-transparent hover:border-purple-500/30 hover:shadow-lg dark:hover:bg-purple-500/10 transition-all"
                            >
                                <p className="font-semibold text-slate-900 dark:text-white">Analytics & Reports</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">View system usage statistics</p>
                            </motion.button>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminDashboard;
