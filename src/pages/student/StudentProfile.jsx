import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Award, Target, TrendingUp, Calendar, User as UserIcon } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const StudentProfile = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();
    const [stats, setStats] = useState({ roadmaps: 0, testsPassed: 0, avgScore: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const fetchStats = async () => {
            try {
                // Fetch roadmaps
                const roadmapsQuery = query(collection(db, 'roadmaps'), where('userId', '==', currentUser.uid));
                const roadmapsSnap = await getDocs(roadmapsQuery);

                // Fetch test history
                const testsQuery = query(collection(db, 'test_history'), where('userId', '==', currentUser.uid));
                const testsSnap = await getDocs(testsQuery);
                const allTests = testsSnap.docs.map(d => d.data());
                const passedTests = allTests.filter(t => t.status === 'pass');
                const avg = passedTests.length > 0
                    ? Math.round(passedTests.reduce((acc, t) => acc + (t.score || 0), 0) / passedTests.length)
                    : 0;

                setStats({
                    roadmaps: roadmapsSnap.size,
                    testsPassed: passedTests.length,
                    avgScore: avg
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [currentUser]);

    const formatJoinDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/student')}
                    className="flex items-center text-slate-400 hover:text-white transition mb-6"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to Dashboard
                </button>

                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Decorative Gradient */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />

                    {/* Header Section */}
                    <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                            {userProfile?.profilePic || currentUser?.photoURL ? (
                                <img
                                    src={userProfile?.profilePic || currentUser?.photoURL}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500/30 shadow-lg shadow-indigo-500/50"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold border-4 border-indigo-500/30 shadow-lg shadow-indigo-500/50">
                                    {userProfile?.fullName?.charAt(0).toUpperCase() || currentUser?.displayName?.charAt(0).toUpperCase() || 'S'}
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-4xl font-bold mb-2">
                                {userProfile?.fullName || currentUser?.displayName || 'Student'}
                            </h1>
                            <p className="text-slate-400 text-lg mb-1">
                                {currentUser?.email}
                            </p>
                            <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-sm text-slate-400">
                                <div className="flex items-center gap-1">
                                    <UserIcon size={16} />
                                    <span>ID: {currentUser?.uid.slice(0, 8)}...</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    <span>Joined {formatJoinDate(currentUser?.metadata?.creationTime)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Target className="text-indigo-400" size={24} />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {loading ? '—' : stats.roadmaps}
                            </div>
                            <div className="text-sm text-slate-400">Active Roadmaps</div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Award className="text-green-400" size={24} />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {loading ? '—' : stats.testsPassed}
                            </div>
                            <div className="text-sm text-slate-400">Tests Passed</div>
                        </div>

                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 text-center">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <TrendingUp className="text-purple-400" size={24} />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {loading ? '—' : `${stats.avgScore}%`}
                            </div>
                            <div className="text-sm text-slate-400">Average Score</div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="relative z-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4">Account Information</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-slate-400">Full Name</span>
                                <span className="font-medium">{userProfile?.fullName || currentUser?.displayName || 'Not set'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-slate-400">Email Address</span>
                                <span className="font-medium">{currentUser?.email}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-slate-400">User ID</span>
                                <span className="font-medium font-mono text-xs">{currentUser?.uid}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-400">Email Verified</span>
                                <span className={`font-medium ${currentUser?.emailVerified ? 'text-green-400' : 'text-orange-400'}`}>
                                    {currentUser?.emailVerified ? 'Yes' : 'No'}
                                </span>
                            </div>

                            <div className="pt-4 mt-2 border-t border-white/10">
                                <div className="flex justify-between py-2 border-b border-white/5">
                                    <span className="text-slate-400">Identified Interest</span>
                                    <span className="font-bold text-emerald-400">{userProfile?.interest || 'Not Assessed'}</span>
                                </div>
                                {userProfile?.interestConfidence > 0 && (
                                    <div className="flex justify-between py-2">
                                        <span className="text-slate-400">AI Confidence</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${(userProfile.interestConfidence * 100)}%` }}
                                                />
                                            </div>
                                            <span className="font-medium">{(userProfile.interestConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Floating Edit Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/student/profile/edit')}
                    className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-2xl shadow-indigo-500/50 flex items-center justify-center hover:shadow-indigo-500/70 transition-all"
                >
                    <Edit2 size={24} />
                </motion.button>
            </div>
        </div>
    );
};

export default StudentProfile;
