import { useState, useEffect } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { useExamGeneration } from '../../context/ExamGenerationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Microscope, Ruler, Clock, FileText, ChevronRight, Zap, Shield, Target, Search, Play, Sparkles, Youtube, X, Bookmark, GraduationCap, FlaskConical, Brain, BookOpen, Atom } from 'lucide-react';
import { fetchVideos, getVideoEmbedUrl } from '../../services/resourceService';

const TESTS = [
    {
        id: 'mdcat',
        name: 'MDCAT',
        full: 'Medical & Dental College Admission Test',
        gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
        glowColorLight: 'rgba(244,63,94,0.08)',
        glowColorDark: 'rgba(244,63,94,0.15)',
        borderGlow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.12)] dark:hover:shadow-[0_0_40px_rgba(244,63,94,0.2)]',
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
        gradient: 'from-blue-500 via-indigo-500 to-violet-500',
        glowColorLight: 'rgba(59,130,246,0.08)',
        glowColorDark: 'rgba(59,130,246,0.15)',
        borderGlow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]',
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

const subjectGlassColors = [
    'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
    'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20',
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20',
    'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/20',
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

    const {
        hasStarted: hasStartedGlobal,
        isFinished: isFinishedGlobal,
        endTime: endTimeGlobal,
        examType: examTypeGlobal
    } = useExamGeneration();

    // Auto-redirect back to exam if there is an active exam in progress
    useEffect(() => {
        if (hasStartedGlobal && !isFinishedGlobal && endTimeGlobal && Date.now() < endTimeGlobal) {
            console.log(`[EntryTestPrep] Resuming active exam session: ${examTypeGlobal}`);
            navigate(`/student/entry-test/${examTypeGlobal}`);
        }
    }, [hasStartedGlobal, isFinishedGlobal, endTimeGlobal, examTypeGlobal, navigate]);

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

    // --- Video Card Component ---
    const VideoCard = ({ video }) => {
        const isSaved = savedVideos.some(v => v.id === video.id);
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group/card bg-white border border-slate-200 dark:bg-white/[0.04] dark:backdrop-blur-md dark:border-white/[0.08] rounded-2xl overflow-hidden hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg dark:hover:shadow-none hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300 flex flex-col"
            >
                <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-black/40">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    
                    {/* Play button */}
                    <button
                        onClick={() => setSelectedVideo(video)}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="w-14 h-14 rounded-full bg-red-600/90 backdrop-blur-sm text-white flex items-center justify-center shadow-lg shadow-red-500/30 transform scale-90 group-hover/card:scale-100 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                            <Play size={22} fill="currentColor" />
                        </div>
                    </button>
                    
                    {/* Bookmark */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSaveVideo(video); }}
                        className="absolute top-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 hover:scale-110 border border-white/10"
                    >
                        <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} className={isSaved ? "text-amber-400" : ""} />
                    </button>

                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] text-white/80 font-semibold flex items-center gap-1.5 border border-white/10">
                        <Youtube size={10} className="text-red-400" /> YouTube
                    </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white/90 text-sm line-clamp-2 leading-snug group-hover/card:text-indigo-600 dark:group-hover/card:text-white transition-colors">
                            {video.title}
                        </h4>
                        <p className="text-slate-400 dark:text-white/40 text-xs mt-1.5 font-medium">{video.channel}</p>
                    </div>
                    <button
                        onClick={() => setSelectedVideo(video)}
                        className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                        <Play size={12} fill="currentColor" /> Watch Lecture
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 relative overflow-hidden">
            {/* ===== AMBIENT BACKGROUND ===== */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-rose-400/[0.06] dark:bg-rose-500/[0.07] rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-blue-400/[0.06] dark:bg-blue-500/[0.07] rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-300/[0.04] dark:bg-indigo-500/[0.04] rounded-full blur-[200px]" />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(100,100,100,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(100,100,100,0.15) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">

                {/* ===== HERO SECTION ===== */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center mb-16"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-indigo-50 dark:bg-white/[0.06] backdrop-blur-md border border-indigo-100 dark:border-white/[0.08] text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-[0.2em] mb-6"
                    >
                        <Sparkles size={14} className="animate-pulse" />
                        AI-Powered Exam Preparation
                    </motion.div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white mb-5 tracking-tight leading-[1.1]">
                        Entry Test{' '}
                        <span className="relative inline-block">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-blue-500">
                                Preparation
                            </span>
                            {/* Shimmer underline */}
                            <span className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-blue-500 rounded-full opacity-50 dark:opacity-60" />
                        </span>
                    </h1>

                    <p className="text-slate-500 dark:text-white/40 max-w-lg mx-auto text-base md:text-lg leading-relaxed font-medium">
                        Practice with dynamically generated AI questions that mirror official syllabus patterns and difficulty.
                    </p>
                </motion.div>

                {/* ===== EXAM CARDS ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
                    {TESTS.map((test, i) => (
                        <motion.div
                            key={test.id}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            className={`group relative bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-3xl overflow-hidden transition-all duration-500 shadow-sm hover:shadow-xl dark:shadow-none ${test.borderGlow}`}
                        >
                            {/* Top gradient line */}
                            <div className={`h-1 dark:h-px w-full bg-gradient-to-r ${test.gradient} opacity-80 dark:opacity-60`} />
                            
                            {/* Card glow effect on hover (dark mode only) */}
                            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden dark:block" style={{ background: `radial-gradient(600px circle at 50% 30%, ${test.glowColorDark}, transparent 60%)` }} />

                            <div className="relative p-7 md:p-8">
                                {/* Header row */}
                                <div className="flex items-start justify-between mb-7">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${test.gradient} flex items-center justify-center text-white shadow-lg relative`}>
                                            <test.icon size={26} />
                                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${test.gradient} opacity-30 dark:opacity-40 blur-lg -z-10`} />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{test.name}</h2>
                                            <p className="text-slate-500 dark:text-white/40 text-sm font-medium mt-0.5">{test.full}</p>
                                        </div>
                                    </div>
                                    {test.negative && (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 backdrop-blur-sm border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-300">
                                            <Shield size={12} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">-ve Marking</span>
                                        </div>
                                    )}
                                </div>

                                {/* Authority badge */}
                                <div className="flex items-center gap-2 mb-6">
                                    <GraduationCap size={14} className="text-slate-400 dark:text-white/30" />
                                    <span className={`text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r ${test.gradient}`}>{test.authority}</span>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3 mb-7">
                                    {[
                                        { icon: Clock, label: 'Duration', val: test.duration },
                                        { icon: FileText, label: 'Questions', val: test.questions },
                                        { icon: Target, label: 'Passing', val: test.passing },
                                    ].map(({ icon: Icon, label, val }) => (
                                        <div key={label} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-center">
                                            <Icon size={16} className="mx-auto mb-2 text-slate-400 dark:text-white/30" />
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider mb-0.5">{label}</div>
                                            <div className="text-sm font-black text-slate-800 dark:text-white/90">{val}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Subjects */}
                                <div className="mb-7">
                                    <p className="text-[10px] font-black text-slate-400 dark:text-white/25 uppercase tracking-[0.2em] mb-3">Subjects Covered</p>
                                    <div className="flex flex-wrap gap-2">
                                        {test.subjects.map((subj, idx) => (
                                            <div key={subj} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-sm ${subjectGlassColors[idx % subjectGlassColors.length]}`}>
                                                {subj}
                                                <span className="opacity-50">({test.subjectCounts[idx]})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {test.negative && (
                                    <div className="flex items-center gap-2 mb-5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-500/[0.06] border border-amber-100 dark:border-amber-500/10 rounded-xl">
                                        <Shield size={13} className="text-amber-500 dark:text-amber-400/60" />
                                        <span className="text-xs text-amber-600 dark:text-amber-300/60 font-medium">+4 marks for correct, -1 for incorrect answer</span>
                                    </div>
                                )}

                                {/* CTA Button */}
                                <button
                                    onClick={() => navigate(`/student/entry-test/${test.id}`)}
                                    className={`relative w-full py-4 bg-gradient-to-r ${test.gradient} text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 text-base overflow-hidden group/btn`}
                                >
                                    {/* Shine sweep */}
                                    <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                    <span className="relative flex items-center gap-2">
                                        Begin Preparation
                                        <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ===== VIDEO COMPANION SECTION ===== */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.07] rounded-3xl p-6 md:p-8 mb-10 shadow-sm dark:shadow-none"
                >
                    {/* Section Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 dark:border-white/[0.06] pb-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg relative">
                                <Sparkles size={22} />
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 dark:opacity-40 blur-lg -z-10" />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">AI Concept Video Companion</h3>
                                <p className="text-slate-500 dark:text-white/35 text-sm font-medium">Instantly find high-yield entry test lectures from YouTube</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-100 dark:bg-white/[0.04] p-1.5 rounded-2xl border border-slate-200 dark:border-white/[0.06] self-start md:self-center">
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === 'search'
                                        ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]'
                                        : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'
                                }`}
                            >
                                Search Lectures
                            </button>
                            <button
                                onClick={() => setActiveTab('saved')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    activeTab === 'saved'
                                        ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]'
                                        : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70'
                                }`}
                            >
                                Saved
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    activeTab === 'saved'
                                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/30 dark:text-indigo-300'
                                        : 'bg-slate-200 text-slate-500 dark:bg-white/[0.06] dark:text-white/40'
                                }`}>
                                    {savedVideos.length}
                                </span>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'search' ? (
                        <>
                            {/* Search Bar */}
                            <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="flex gap-3 mb-5">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search any topic... (e.g. Bohr's Atomic Model, Projectile Motion)"
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-500/50 focus:border-indigo-300 dark:focus:border-indigo-500/30 text-sm font-medium transition-all backdrop-blur-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="px-7 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-2xl hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-indigo-500/20"
                                >
                                    {isSearching ? 'Searching...' : 'Find Videos'}
                                </button>
                            </form>

                            {/* Suggestion Chips */}
                            <div className="flex flex-wrap items-center gap-2 mb-7">
                                <span className="text-[10px] text-slate-400 dark:text-white/25 font-bold uppercase tracking-[0.15em] mr-1">Suggestions:</span>
                                {[
                                    "Bohr's Atomic Model",
                                    "Projectile Motion",
                                    "Organic Chemistry",
                                    "Cell Division",
                                    "Integration by Parts",
                                    "Newton's Laws"
                                ].map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => { setSearchQuery(topic); handleSearch(topic); }}
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80 text-xs font-semibold transition-all"
                                    >
                                        {topic}
                                    </button>
                                ))}
                            </div>

                            {/* Results */}
                            <div className="relative">
                                {isSearching && (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <div className="w-10 h-10 border-[3px] border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-slate-400 dark:text-white/30 text-sm font-medium">Fetching best lectures from YouTube...</p>
                                    </div>
                                )}

                                {!isSearching && videos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-100 dark:border-white/[0.06] rounded-3xl bg-slate-50/50 dark:bg-white/[0.01]">
                                        <Youtube size={48} className="text-slate-200 dark:text-white/10 mb-4" />
                                        <p className="text-slate-400 dark:text-white/25 text-sm font-bold mb-1">No videos yet</p>
                                        <p className="text-slate-300 dark:text-white/15 text-xs max-w-xs text-center">Search for any FSc concept above to find relevant video lectures</p>
                                    </div>
                                )}

                                {!isSearching && videos.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {videos.map((video, idx) => (
                                            <VideoCard key={video.id || idx} video={video} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Saved Tab */
                        <div className="relative">
                            {savedVideos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-100 dark:border-white/[0.06] rounded-3xl bg-slate-50/50 dark:bg-white/[0.01]">
                                    <Bookmark size={48} className="text-slate-200 dark:text-white/10 mb-4" />
                                    <p className="text-slate-400 dark:text-white/25 text-sm font-bold mb-1">No bookmarked lectures yet</p>
                                    <p className="text-slate-300 dark:text-white/15 text-xs max-w-xs text-center leading-relaxed">Search for FSc concepts in the Search tab and click the bookmark icon to save them here.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {savedVideos.map((video, idx) => (
                                        <VideoCard key={video.id || idx} video={video} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* ===== FOOTER NOTE ===== */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center text-slate-400 dark:text-white/15 text-xs font-medium tracking-wide"
                >
                    Questions are dynamically generated by AI following official syllabi · Progress is auto-saved
                </motion.p>
            </div>

            {/* ===== VIDEO PLAY MODAL ===== */}
            <AnimatePresence>
                {selectedVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/95 backdrop-blur-sm p-4 md:p-6"
                        onClick={() => setSelectedVideo(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="absolute right-4 top-4 z-10 w-10 h-10 rounded-xl bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-sm text-slate-700 dark:text-white flex items-center justify-center transition border border-slate-200 dark:border-white/10"
                            >
                                <X size={18} />
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
                            <div className="p-6 border-t border-slate-100 dark:border-white/[0.06]">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{selectedVideo.title}</h3>
                                <p className="text-slate-500 dark:text-white/40 text-xs font-medium">{selectedVideo.channel} · Video Lecture</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EntryTestPrep;
