import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, Calendar, Trophy, AlertCircle,
    CheckCircle, XCircle, Clock, Target, ArrowLeft,
    TrendingUp, Award, BookOpen
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Certificate from '../../components/Certificate';

const TestHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'test_history'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date(0)
            }));
            setHistory(historyData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching history:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pass':
            case 'passed': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'fail':
            case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'aborted': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pass':
            case 'passed': return <CheckCircle size={16} />;
            case 'fail':
            case 'failed': return <XCircle size={16} />;
            case 'aborted': return <AlertCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const handleViewCertificate = async (test) => {
        try {
            // Retrieve certificate for this test
            const certificatesRef = collection(db, 'certificates');
            const q = query(certificatesRef, where('testId', '==', test.id));
            const existingCerts = await getDocs(q);

            if (!existingCerts.empty) {
                const certificateData = existingCerts.docs[0].data();

                // Show certificate modal
                setSelectedCertificate({
                    studentName: certificateData.studentName,
                    email: certificateData.email,
                    skill: certificateData.skill,
                    score: certificateData.score,
                    date: formatDate(test.timestamp),
                    certificateId: certificateData.certificateId
                });
            } else {
                alert('Certificate not found. This may be an older test before the certificate system was implemented.');
            }

        } catch (error) {
            console.error('Error retrieving certificate:', error);
            alert('Failed to retrieve certificate. Please try again.');
        }
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch =
            item.skill?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.topicName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' ||
            (filterStatus === 'passed' && (item.status === 'pass' || item.status === 'passed')) ||
            (filterStatus === 'failed' && (item.status === 'fail' || item.status === 'failed' || item.status === 'aborted'));

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/student')}
                            className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
                        >
                            <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            Test History
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Track your academic performance and progress</p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search topic or skill..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div className="flex bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/5'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterStatus('passed')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === 'passed' ? 'bg-green-600 text-white shadow-lg shadow-green-600/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/5'}`}
                            >
                                Passed
                            </button>
                            <button
                                onClick={() => setFilterStatus('failed')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterStatus === 'failed' ? 'bg-red-600 text-white shadow-lg shadow-red-600/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/5'}`}
                            >
                                Failed
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-white/50 dark:bg-slate-900/30 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-3xl backdrop-blur-sm"
                    >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy size={32} className="text-slate-400 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No History Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {searchTerm || filterStatus !== 'all'
                                ? "Try adjusting your search or filters to see results."
                                : "You haven't taken any tests yet. Start a roadmap to begin!"
                            }
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl dark:shadow-none"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject / Skill</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Topic</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Percent</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Certificate</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredHistory.map((test, index) => {
                                        const isEligible = test.isGrandTest && (test.percentage || test.scoreObtained) >= 75;

                                        return (
                                            <motion.tr
                                                key={test.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all">
                                                            <BookOpen size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900 dark:text-white">{test.category || 'General'}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{test.skill}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <Target size={14} className="text-slate-400 dark:text-slate-500" />
                                                        <span className="text-slate-700 dark:text-slate-200 font-medium">
                                                            {test.topicName || test.topic || 'Unknown Topic'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
                                                        {test.scoreObtained !== undefined
                                                            ? `${test.scoreObtained}/${test.totalQuestions || 25}`
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp size={14} className={test.percentage >= 65 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} />
                                                        <span className={`font-bold ${test.percentage >= 65 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {test.percentage ?? test.score}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(test.status)}`}>
                                                        {getStatusIcon(test.status)}
                                                        <span className="capitalize">{test.status === 'pass' ? 'Passed' : test.status === 'fail' ? 'Failed' : test.status}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    {isEligible ? (
                                                        <button
                                                            onClick={() => handleViewCertificate(test)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold transition-colors border border-amber-200 dark:border-amber-500/20"
                                                        >
                                                            <Award size={14} /> View Certificate
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 dark:text-slate-600 italic">Not Eligible</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    {formatDate(test.timestamp)}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Certificate Modal */}
            {selectedCertificate && (
                <Certificate
                    isOpen={!!selectedCertificate}
                    onClose={() => setSelectedCertificate(null)}
                    data={selectedCertificate}
                />
            )}
        </div>
    );
};

export default TestHistory;
