import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Target, CheckCircle, Activity, TrendingUp, Play,
    Search, Trash2, CheckSquare, Square, Filter, Loader2, AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const PendingRoadmaps = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [roadmaps, setRoadmaps] = useState({ active: [], completed: [] });
    const [loading, setLoading] = useState(true);

    // Management State
    const [searchQuery, setSearchQuery] = useState("");
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    useEffect(() => {
        if (!currentUser) return;
        fetchRoadmaps();
    }, [currentUser]);

    const fetchRoadmaps = async () => {
        try {
            const roadmapsQuery = query(
                collection(db, 'roadmaps'),
                where('userId', '==', currentUser.uid)
            );

            const snapshot = await getDocs(roadmapsQuery);
            const allRoadmaps = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Separate into active and completed
            const active = allRoadmaps.filter(r => r.progress < 100);
            const completed = allRoadmaps.filter(r => r.progress === 100);

            setRoadmaps({ active, completed });
        } catch (error) {
            console.error('Error fetching roadmaps:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filterList = (list) => {
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(r =>
            r.skill?.toLowerCase().includes(q) ||
            r.domain?.toLowerCase().includes(q)
        );
    };

    const filteredActive = filterList(roadmaps.active);
    const filteredCompleted = filterList(roadmaps.completed);

    // Selection Logic
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size > 0) {
            setSelectedIds(new Set());
        } else {
            const allIds = [...filteredActive, ...filteredCompleted].map(r => r.id);
            setSelectedIds(new Set(allIds));
        }
    };

    // Delete Logic
    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        if (window.confirm("Permanently delete this roadmap? This allows you to generate it again fresh.")) {
            try {
                await deleteDoc(doc(db, 'roadmaps', id));
                // Optimistic Update
                setRoadmaps(prev => ({
                    active: prev.active.filter(r => r.id !== id),
                    completed: prev.completed.filter(r => r.id !== id)
                }));
                // Remove from selection if present
                if (selectedIds.has(id)) {
                    const newSet = new Set(selectedIds);
                    newSet.delete(id);
                    setSelectedIds(newSet);
                }
            } catch (error) {
                console.error("Delete failed:", error);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (window.confirm(`Permanently delete ${selectedIds.size} selected roadmaps?`)) {
            try {
                const batch = writeBatch(db);
                selectedIds.forEach(id => {
                    batch.delete(doc(db, 'roadmaps', id));
                });
                await batch.commit();

                // Refresh UI
                setRoadmaps(prev => ({
                    active: prev.active.filter(r => !selectedIds.has(r.id)),
                    completed: prev.completed.filter(r => !selectedIds.has(r.id))
                }));
                setSelectedIds(new Set());
                setIsSelectionMode(false);
            } catch (error) {
                console.error("Bulk delete failed:", error);
            }
        }
    };

    const getCurrentTopic = (roadmap) => {
        if (!roadmap.topics) return 'No topics';
        const currentTopic = roadmap.topics.find(t => t.status === 'unlocked' || t.status === 'in-progress');
        return currentTopic?.title || 'All Complete';
    };

    const handleRoadmapClick = (roadmap) => {
        if (isSelectionMode) {
            toggleSelection(roadmap.id);
        } else {
            navigate(`/student/roadmap/${encodeURIComponent(roadmap.skill)}`);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-20 transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <button
                            onClick={() => navigate('/student')}
                            className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition mb-2"
                        >
                            <ArrowLeft size={20} className="mr-2" />
                            Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Learning Paths</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Manage your active and completed journeys</p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by skill..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedIds(new Set());
                            }}
                            className={`p-2.5 rounded-xl border transition-all ${isSelectionMode ? 'bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:bg-slate-50'}`}
                            title="Toggle Selection Mode"
                        >
                            {isSelectionMode ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>

                        {isSelectionMode && (
                            <AnimatePresence>
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-2">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-bold whitespace-nowrap"
                                    >
                                        {selectedIds.size > 0 ? "Deselect All" : "Select All"}
                                    </button>
                                    {selectedIds.size > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold flex items-center gap-2"
                                        >
                                            <Trash2 size={16} /> Delete ({selectedIds.size})
                                        </button>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                        <p className="text-slate-500">Loading your paths...</p>
                    </div>
                ) : (
                    <>
                        {/* Empty Search State */}
                        {(filteredActive.length === 0 && filteredCompleted.length === 0) && (
                            <div className="text-center py-20 opacity-60">
                                <Search size={48} className="mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No roadmaps found</h3>
                                <p className="text-slate-500">Try adjusting your search terms</p>
                            </div>
                        )}

                        {/* Active Roadmaps Section */}
                        {filteredActive.length > 0 && (
                            <div className="mb-12">
                                <div className="flex items-center gap-3 mb-6">
                                    <Activity className="text-indigo-500 dark:text-indigo-400" size={24} />
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Roadmaps</h2>
                                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                                        {filteredActive.length}
                                    </span>
                                </div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {filteredActive.map((roadmap, idx) => (
                                        <motion.div
                                            key={roadmap.id}
                                            variants={itemVariants}
                                            whileHover={{ y: -5, scale: 1.01 }}
                                            onClick={() => handleRoadmapClick(roadmap)}
                                            className={`
                                                relative bg-white dark:bg-white/5 backdrop-blur-xl border rounded-2xl p-6 cursor-pointer transition-all group shadow-sm dark:shadow-none
                                                ${selectedIds.has(roadmap.id)
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10'
                                                    : 'border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-xl'
                                                }
                                            `}
                                        >
                                            {/* Selection Checkbox */}
                                            {isSelectionMode && (
                                                <div className="absolute top-4 right-4 z-20">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.has(roadmap.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                        {selectedIds.has(roadmap.id) && <CheckSquare size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Delete Button (Hover) */}
                                            {!isSelectionMode && (
                                                <button
                                                    onClick={(e) => handleDelete(roadmap.id, e)}
                                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title="Delete Roadmap"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}

                                            <div className="flex items-start justify-between mb-4 pr-8">
                                                <div className="w-12 h-12 bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500 dark:to-purple-600 rounded-xl flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-indigo-500/50">
                                                    <Target size={24} className="text-indigo-600 dark:text-white" />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {roadmap.skill}
                                            </h3>

                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 truncate">
                                                Current: {getCurrentTopic(roadmap)}
                                            </p>

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                    <span>Progress</span>
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{roadmap.progress || 0}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${roadmap.progress || 0}%` }}
                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                    />
                                                </div>
                                            </div>

                                            <button className="w-full py-2 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                                                <Play size={16} fill="currentColor" />
                                                Continue Learning
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        )}

                        {/* Completed Roadmaps Section */}
                        {filteredCompleted.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <CheckCircle className="text-green-500 dark:text-green-400" size={24} />
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Completed Roadmaps</h2>
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                                        {filteredCompleted.length}
                                    </span>
                                </div>

                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {filteredCompleted.map((roadmap, idx) => (
                                        <motion.div
                                            key={roadmap.id}
                                            variants={itemVariants}
                                            whileHover={{ y: -5, scale: 1.01 }}
                                            onClick={() => handleRoadmapClick(roadmap)}
                                            className={`
                                                relative bg-white dark:bg-white/5 backdrop-blur-xl border rounded-2xl p-6 cursor-pointer transition-all group shadow-sm dark:shadow-none
                                                ${selectedIds.has(roadmap.id)
                                                    ? 'border-green-500 ring-2 ring-green-500/20 bg-green-50/50 dark:bg-green-900/10'
                                                    : 'border-slate-200 dark:border-white/10 hover:border-green-500 hover:shadow-xl hover:shadow-green-500/20'
                                                }
                                            `}
                                        >
                                            {/* Selection Checkbox */}
                                            {isSelectionMode && (
                                                <div className="absolute top-4 right-4 z-20">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.has(roadmap.id) ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                        {selectedIds.has(roadmap.id) && <CheckSquare size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Delete Button (Hover) */}
                                            {!isSelectionMode && (
                                                <button
                                                    onClick={(e) => handleDelete(roadmap.id, e)}
                                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    title="Delete Roadmap"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}

                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-green-50 dark:bg-gradient-to-br dark:from-green-500 dark:to-emerald-600 rounded-xl flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-green-500/50">
                                                    <CheckCircle size={24} className="text-green-600 dark:text-white" />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                {roadmap.skill}
                                            </h3>

                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                                All topics mastered
                                            </p>

                                            {/* Progress Bar */}
                                            <div className="mb-4">
                                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                    <span>Progress</span>
                                                    <span className="font-bold text-green-600 dark:text-green-400">100%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full w-full bg-gradient-to-r from-green-500 to-emerald-500" />
                                                </div>
                                            </div>

                                            <button className="w-full py-2 bg-green-50 dark:bg-green-600/20 hover:bg-green-600 dark:hover:bg-green-600 text-green-600 dark:text-green-400 hover:text-white dark:hover:text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                                                <TrendingUp size={16} />
                                                Review
                                            </button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PendingRoadmaps;
