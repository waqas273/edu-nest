import { useState } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Microscope, Ruler, Clock, FileText, ChevronRight, Zap, Shield, Target, Search, Play, Sparkles, Youtube, X, Bookmark, ArrowLeft } from 'lucide-react';
import { fetchVideos, getVideoEmbedUrl } from '../../services/resourceService';

const TESTS = [
    {
        id: 'mdcat',
        name: 'MDCAT',
        full: 'Medical & Dental College Admission Test',
        accent: 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30',
        textAccent: 'text-rose-600 dark:text-rose-400',
        gradient: 'from-rose-500 to-pink-600',
        glow: 'shadow-rose-500/25',
        border: 'hover:border-rose-300 dark:hover:border-rose-700',
        authority: 'Official MDCAT Syllabus & Pattern',
        icon: Microscope,
        duration: '180 Minutes',
        questions: '180 Questions',
        subjects: ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'],
        subjectCounts: [81, 45, 36, 9, 9],
        passing: '55%',
        negative: false,
    },
    {
        id: 'ecat',
        name: 'ECAT',
        full: 'Engineering College Admission Test',
        accent: 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
        textAccent: 'text-blue-600 dark:text-blue-400',
        gradient: 'from-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/25',
        border: 'hover:border-blue-300 dark:hover:border-blue-700',
        authority: 'Official ECAT Syllabus & Pattern',
        icon: Ruler,
        duration: '100 Minutes',
        questions: '100 Questions',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'English'],
        subjectCounts: [30, 30, 30, 10],
        passing: '50%',
        negative: true,
    },
];

const subjectColors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

const EntryTestPrep = () => {
    const navigate = useNavigate();

    const {
        prepSearchQuery: searchQuery,
        setPrepSearchQuery: setSearchQuery,
        prepVideos: videos,
        setPrepVideos: setVideos,
        prepActiveTab: activeTab,
        setPrepActiveTab: setActiveTab
    } = useStudentState();

    const [isSearching, setIsSearching] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [savedVideos, setSavedVideos] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('edunest_saved_videos') || '[]');
        } catch (e) {
            return [];
        }
    });

    const handleSearch = async (queryText) => {
        if (!queryText.trim()) return;
        setIsSearching(true);
        setActiveTab('search');
        try {
            const results = await fetchVideos(queryText, 'FSc entry test');
            setVideos(results || []);
        } catch (error) {
            console.error("Error searching videos:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSaveVideo = (video) => {
        setSavedVideos(prev => {
            const isSaved = prev.some(v => v.id === video.id);
            let updated;
            if (isSaved) {
                updated = prev.filter(v => v.id !== video.id);
            } else {
                updated = [...prev, video];
            }
            localStorage.setItem('edunest_saved_videos', JSON.stringify(updated));
            return updated;
        });
    };



    return (
        <div className="min-h-[90vh] flex flex-col items-center justify-center py-12 px-4 relative">
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-20">
                <button
                    onClick={() => navigate('/student')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md transition-all shadow-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Dashboard
                </button>
            </div>

            {/* Ambient Background Orbs */}
            <div className="pointer-events-none fixed top-0 left-1/4 w-96 h-96 bg-rose-300/20 dark:bg-rose-500/10 rounded-full blur-[120px]" />
            <div className="pointer-events-none fixed bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-[120px]" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-14 relative z-10"
            >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest mb-5">
                    <Zap size={12} />
                    AI-Powered Exam Preparation
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                    Entry Test{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-blue-600">
                        Preparation
                    </span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">
                    Practice with AI-generated questions that strictly follow official syllabus patterns.
                </p>
            </motion.div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl w-full relative z-10">
                {TESTS.map((test, i) => (
                    <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.15 }}
                        whileHover={{ y: -6 }}
                        className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl ${test.glow} transition-all duration-300 ${test.border}`}
                    >
                        {/* Top Gradient Band */}
                        <div className={`h-1.5 w-full bg-gradient-to-r ${test.gradient}`} />

                        <div className="p-8">
                            {/* Icon + Title */}
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${test.gradient} flex items-center justify-center text-white shadow-lg ${test.glow} mb-4`}>
                                        <test.icon size={28} />
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 dark:text-white">{test.name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{test.full}</p>
                                    <p className={`text-xs font-bold mt-1 ${test.textAccent}`}>{test.authority}</p>
                                </div>
                                {test.negative && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-amber-600 dark:text-amber-400">
                                        <Shield size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-wider">–ve Marking</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { icon: Clock, label: 'Duration', val: test.duration },
                                    { icon: FileText, label: 'Questions', val: test.questions },
                                ].map(({ icon: Icon, label, val }) => (
                                    <div key={label} className={`p-4 rounded-2xl border ${test.accent} flex items-center gap-3`}>
                                        <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm`}>
                                            <Icon size={16} className={test.textAccent} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white">{val}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subject Chips */}
                            <div className="mb-6">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Subjects Covered</p>
                                <div className="flex flex-wrap gap-2">
                                    {test.subjects.map((subj, idx) => (
                                        <div key={subj} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${subjectColors[idx % subjectColors.length]}`}>
                                            {subj}
                                            <span className="opacity-60 font-normal">({test.subjectCounts[idx]})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Passing Info */}
                            <div className="flex items-center gap-2 mb-7">
                                <Target size={14} className="text-slate-400" />
                                <span className="text-xs text-slate-400">Passing threshold: <span className="font-bold text-slate-700 dark:text-slate-300">{test.passing}</span></span>
                                {test.negative && (
                                    <span className="text-xs text-slate-400 ml-auto">+4 / –1 marking</span>
                                )}
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={() => navigate(`/student/entry-test/${test.id}`)}
                                className={`group/btn w-full py-4 bg-gradient-to-r ${test.gradient} text-white font-bold rounded-2xl shadow-lg ${test.glow} hover:shadow-xl hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-3 text-base`}
                            >
                                Begin Preparation
                                <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* AI Study Bot & Video Finder Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="w-full max-w-5xl mt-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl relative z-10"
            >
                {/* Header & Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <Sparkles size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">AI Concept Video Companion</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Instantly fetch and save high-yield entry test lectures from YouTube.</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 self-start md:self-center">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === 'search'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Search Lectures
                        </button>
                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                activeTab === 'saved'
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            Saved Lectures
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                activeTab === 'saved'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {savedVideos.length}
                            </span>
                        </button>
                    </div>
                </div>

                {activeTab === 'search' ? (
                    <>
                        {/* Input Area */}
                        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="flex gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Type any entry test topic... (e.g. Bohr's Atomic Model, Projectile Motion, Organic Chemistry)"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-md"
                            >
                                {isSearching ? 'Searching...' : 'Find Videos'}
                            </button>
                        </form>

                        {/* Topic Suggestion Chips */}
                        <div className="flex flex-wrap items-center gap-2 mb-6">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mr-1">Suggestions:</span>
                            {[
                                "Bohr's Atomic Model",
                                "Projectile Motion",
                                "Organic Chemistry",
                                "Cell Division",
                                "Integration by Parts"
                            ].map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => { setSearchQuery(topic); handleSearch(topic); }}
                                    className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>

                        {/* Video Results Grid */}
                        <div className="relative">
                            {isSearching && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Fetching best lectures from YouTube...</p>
                                </div>
                            )}

                            {!isSearching && videos.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
                                    <Youtube size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
                                    <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">Search above to display video tutorials</p>
                                </div>
                            )}

                            {!isSearching && videos.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                >
                                    {videos.map(video => {
                                        const isSaved = savedVideos.some(v => v.id === video.id);
                                        return (
                                            <div
                                                key={video.id}
                                                className="group/card bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                                            >
                                                <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center">
                                                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-300" />
                                                    
                                                    {/* Play Hover Button */}
                                                    <button
                                                        onClick={() => setSelectedVideo(video)}
                                                        className="absolute w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-300"
                                                    >
                                                        <Play size={20} fill="currentColor" />
                                                    </button>
                                                    
                                                    {/* Bookmark Save Button */}
                                                    <button
                                                        onClick={() => toggleSaveVideo(video)}
                                                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/60 text-white hover:bg-black/80 hover:scale-110"
                                                    >
                                                        <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} className={isSaved ? "text-amber-400" : ""} />
                                                    </button>

                                                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1">
                                                        <Youtube size={10} className="text-red-500" /> YouTube
                                                    </div>
                                                </div>
                                                <div className="p-4 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 leading-snug group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors">
                                                            {video.title}
                                                        </h4>
                                                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 font-medium">{video.channel}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedVideo(video)}
                                                        className="mt-4 w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Play size={12} fill="currentColor" /> Watch Lecture
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </div>
                    </>
                ) : (
                    /* Saved Tab View */
                    <div className="relative">
                        {savedVideos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
                                <Bookmark size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
                                <p className="text-slate-450 dark:text-slate-500 text-sm font-bold mb-1">No bookmarked lectures yet</p>
                                <p className="text-slate-400 dark:text-slate-650 text-xs max-w-xs text-center leading-relaxed">Search for FSc concepts inside the Search Lectures tab and click the bookmark button to save them here.</p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                {savedVideos.map(video => (
                                    <div
                                        key={video.id}
                                        className="group/card bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                                    >
                                        <div className="relative aspect-video overflow-hidden bg-black flex items-center justify-center">
                                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-300" />
                                            
                                            {/* Play Hover Button */}
                                            <button
                                                onClick={() => setSelectedVideo(video)}
                                                className="absolute w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover/card:translate-y-0 opacity-0 group-hover/card:opacity-100 transition-all duration-300"
                                            >
                                                <Play size={20} fill="currentColor" />
                                            </button>

                                            {/* Bookmark Save Button */}
                                            <button
                                                onClick={() => toggleSaveVideo(video)}
                                                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/60 text-white hover:bg-black/80 hover:scale-110"
                                            >
                                                <Bookmark size={16} fill="currentColor" className="text-amber-400" />
                                            </button>

                                            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1">
                                                <Youtube size={10} className="text-red-500" /> YouTube
                                            </div>
                                        </div>
                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 leading-snug group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors">
                                                    {video.title}
                                                </h4>
                                                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 font-medium">{video.channel}</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedVideo(video)}
                                                className="mt-4 w-full py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Play size={12} fill="currentColor" /> Watch Lecture
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                )}
            </motion.div>


            {/* Bottom Note */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-10 text-sm text-slate-400 dark:text-slate-600 text-center relative z-10"
            >
                Questions are dynamically generated by AI following official syllabi · Progress is auto-saved
            </motion.p>

            {/* Video Play Modal */}
            <AnimatePresence>
                {selectedVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition"
                            >
                                <X size={20} />
                            </button>
                            <div className="aspect-video w-full">
                                <iframe
                                    src={getVideoEmbedUrl(selectedVideo.id)}
                                    title={selectedVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-1">{selectedVideo.title}</h3>
                                <p className="text-slate-400 text-xs">{selectedVideo.channel} · Video Lecture</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EntryTestPrep;

