import { useState, useEffect } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { useExamGeneration } from '../../context/ExamGenerationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Microscope, Ruler, Clock, FileText, ChevronRight, Shield, Target, Search, Play, Sparkles, Youtube, X, Bookmark, GraduationCap, Flame, TrendingUp, Award, Loader2 } from 'lucide-react';
import { fetchVideos, getVideoEmbedUrl } from '../../services/resourceService';

const TESTS = [
    {
        id: 'mdcat',
        name: 'MDCAT',
        full: 'Medical & Dental College Admission Test',
        gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
        authority: 'Official MDCAT Syllabus & Pattern',
        icon: Microscope,
        duration: 180,
        questions: 180,
        subjects: [
            { name: 'Biology', count: 81, color: 'bg-emerald-500' },
            { name: 'Chemistry', count: 45, color: 'bg-violet-500' },
            { name: 'Physics', count: 36, color: 'bg-amber-500' },
            { name: 'English', count: 9, color: 'bg-cyan-500' },
            { name: 'Logical Reasoning', count: 9, color: 'bg-pink-500' },
        ],
        passing: 55,
        negative: false,
    },
    {
        id: 'ecat',
        name: 'ECAT',
        full: 'Engineering College Admission Test',
        gradient: 'from-blue-500 via-indigo-500 to-violet-500',
        authority: 'Official ECAT Syllabus & Pattern',
        icon: Ruler,
        duration: 100,
        questions: 100,
        subjects: [
            { name: 'Mathematics', count: 30, color: 'bg-blue-500' },
            { name: 'Physics', count: 30, color: 'bg-amber-500' },
            { name: 'Chemistry', count: 30, color: 'bg-violet-500' },
            { name: 'English', count: 10, color: 'bg-cyan-500' },
        ],
        passing: 50,
        negative: true,
    },
];

const EntryTestPrep = () => {
    const navigate = useNavigate();
    const [selectedExam, setSelectedExam] = useState('mdcat');

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

    useEffect(() => {
        if (hasStartedGlobal && !isFinishedGlobal && endTimeGlobal && Date.now() < endTimeGlobal) {
            console.log(`[EntryTestPrep] Resuming active exam session: ${examTypeGlobal}`);
            navigate(`/student/entry-test/${examTypeGlobal}`);
        }
    }, [hasStartedGlobal, isFinishedGlobal, endTimeGlobal, examTypeGlobal, navigate]);

    const [isSearching, setIsSearching] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [savedVideos, setSavedVideos] = useState(() => {
        try { return JSON.parse(localStorage.getItem('edunest_saved_videos') || '[]'); }
        catch { return []; }
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
            const updated = isSaved ? prev.filter(v => v.id !== video.id) : [...prev, video];
            localStorage.setItem('edunest_saved_videos', JSON.stringify(updated));
            return updated;
        });
    };

    const activeTest = TESTS.find(t => t.id === selectedExam);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Ambient Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-rose-300/20 dark:bg-rose-500/[0.06] rounded-full blur-[120px]" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-300/20 dark:bg-blue-500/[0.06] rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* ===== TOP: LEFT-ALIGNED HERO WITH EXAM SWITCHER ===== */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em]">AI-Powered Exam Preparation</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        Entry Test <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 via-purple-500 to-blue-500">Preparation</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl">
                        AI-generated questions following official syllabus patterns. Select your exam to begin.
                    </p>
                </motion.div>

                {/* ===== BENTO GRID LAYOUT ===== */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-10">

                    {/* --- LEFT: EXAM SELECTOR COLUMN --- */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="lg:col-span-4 flex flex-col gap-4"
                    >
                        {TESTS.map((test) => {
                            const isActive = selectedExam === test.id;
                            return (
                                <button
                                    key={test.id}
                                    onClick={() => setSelectedExam(test.id)}
                                    className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 group ${
                                        isActive
                                            ? 'bg-white dark:bg-white/[0.06] border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/5'
                                            : 'bg-white/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] hover:bg-white dark:hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${test.gradient} flex items-center justify-center text-white shadow-md`}>
                                            <test.icon size={22} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{test.name}</h3>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeExamDot"
                                                        className="w-2 h-2 rounded-full bg-indigo-500"
                                                    />
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{test.full}</p>
                                        </div>
                                        <ChevronRight size={18} className={`transition-all ${isActive ? 'text-indigo-500 translate-x-0' : 'text-slate-300 dark:text-slate-600 -translate-x-1 group-hover:translate-x-0'}`} />
                                    </div>
                                    {test.negative && (
                                        <div className="flex items-center gap-1 mt-3 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg w-fit">
                                            <Shield size={10} className="text-amber-500" />
                                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Negative Marking: +4 / -1</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        {/* Quick Info Tile */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-6 translate-x-6" />
                            <Award size={20} className="mb-3 opacity-80" />
                            <h4 className="text-sm font-bold mb-1">Pro Tip</h4>
                            <p className="text-xs text-white/70 leading-relaxed">
                                Take full mock tests under timed conditions to build exam stamina and accuracy.
                            </p>
                        </div>
                    </motion.div>

                    {/* --- RIGHT: EXAM DETAIL + STATS --- */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="lg:col-span-8"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTest.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="bg-white dark:bg-white/[0.04] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm dark:shadow-none"
                            >
                                {/* Card Header Gradient */}
                                <div className={`h-1.5 w-full bg-gradient-to-r ${activeTest.gradient}`} />

                                <div className="p-6 md:p-8">
                                    {/* Title Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <GraduationCap size={14} className="text-slate-400 dark:text-slate-500" />
                                                <span className={`text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r ${activeTest.gradient}`}>{activeTest.authority}</span>
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">{activeTest.name} Full Mock</h2>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/student/entry-test/${activeTest.id}`)}
                                            className={`relative px-8 py-3.5 bg-gradient-to-r ${activeTest.gradient} text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-sm overflow-hidden group/btn whitespace-nowrap`}
                                        >
                                            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                            <span className="relative flex items-center gap-2">
                                                Start Practice
                                                <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </span>
                                        </button>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                                        {[
                                            { icon: FileText, label: 'Total MCQs', value: activeTest.questions, suffix: '' },
                                            { icon: Clock, label: 'Duration', value: activeTest.duration, suffix: ' min' },
                                            { icon: Target, label: 'Passing', value: activeTest.passing, suffix: '%' },
                                            { icon: Flame, label: 'Difficulty', value: 'High', suffix: '' },
                                        ].map(({ icon: Icon, label, value, suffix }) => (
                                            <div key={label} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
                                                <Icon size={18} className="text-slate-400 dark:text-slate-500 mb-2" />
                                                <div className="text-2xl font-black text-slate-900 dark:text-white">{value}{suffix}</div>
                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Subject Breakdown with Visual Bars */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Subject Breakdown</h3>
                                            <span className="text-xs text-slate-400">{activeTest.subjects.length} subjects</span>
                                        </div>

                                        {/* Stacked bar visualization */}
                                        <div className="flex h-3 rounded-full overflow-hidden mb-5 bg-slate-100 dark:bg-white/[0.04]">
                                            {activeTest.subjects.map((subj) => (
                                                <motion.div
                                                    key={subj.name}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(subj.count / activeTest.questions) * 100}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                    className={`${subj.color} first:rounded-l-full last:rounded-r-full`}
                                                    title={`${subj.name}: ${subj.count}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Subject Legend */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {activeTest.subjects.map((subj) => (
                                                <div key={subj.name} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                                                    <div className={`w-3 h-3 rounded-full ${subj.color} flex-shrink-0`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{subj.name}</div>
                                                        <div className="text-[10px] text-slate-400">{subj.count} questions · {Math.round((subj.count / activeTest.questions) * 100)}%</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* ===== VIDEO COMPANION — FULL WIDTH ===== */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.07] rounded-3xl overflow-hidden shadow-sm dark:shadow-none mb-8"
                >
                    {/* Header */}
                    <div className="p-6 md:p-8 pb-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Video Companion</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Find entry test lectures from YouTube instantly</p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/50 dark:border-white/[0.05]">
                                {['search', 'saved'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                            activeTab === tab
                                                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white/70'
                                        } ${tab === 'saved' ? 'flex items-center gap-1.5' : ''}`}
                                    >
                                        {tab === 'search' ? 'Search' : 'Saved'}
                                        {tab === 'saved' && (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                activeTab === 'saved' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-200 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400'
                                            }`}>{savedVideos.length}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeTab === 'search' && (
                            <>
                                {/* Search Bar */}
                                <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchQuery); }} className="flex gap-2 mb-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search any topic (Bohr's Model, Projectile Motion...)"
                                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSearching || !searchQuery.trim()}
                                        className="px-5 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-30 transition-all text-sm"
                                    >
                                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                                    </button>
                                </form>

                                {/* Quick Tags */}
                                <div className="flex flex-wrap gap-1.5 mb-6">
                                    {["Bohr's Atomic Model", "Projectile Motion", "Organic Chemistry", "Cell Division", "Newton's Laws", "Integration"].map(t => (
                                        <button key={t} onClick={() => { setSearchQuery(t); handleSearch(t); }}
                                            className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.05] text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-white/[0.06] transition-all">
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Video Content Area */}
                    <div className="px-6 md:px-8 pb-6 md:pb-8">
                        {activeTab === 'search' ? (
                            <>
                                {isSearching && (
                                    <div className="flex flex-col items-center py-14">
                                        <Loader2 size={28} className="animate-spin text-indigo-500 mb-3" />
                                        <p className="text-slate-400 text-sm">Fetching lectures...</p>
                                    </div>
                                )}
                                {!isSearching && videos.length === 0 && (
                                    <div className="flex flex-col items-center py-14 border-2 border-dashed border-slate-100 dark:border-white/[0.05] rounded-2xl">
                                        <Youtube size={40} className="text-slate-200 dark:text-slate-700 mb-3" />
                                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Search a topic to find video lectures</p>
                                    </div>
                                )}
                                {!isSearching && videos.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {videos.map((video, idx) => (
                                            <VideoCard key={video.id || idx} video={video} isSaved={savedVideos.some(v => v.id === video.id)} onPlay={() => setSelectedVideo(video)} onToggleSave={() => toggleSaveVideo(video)} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {savedVideos.length === 0 ? (
                                    <div className="flex flex-col items-center py-14 border-2 border-dashed border-slate-100 dark:border-white/[0.05] rounded-2xl">
                                        <Bookmark size={40} className="text-slate-200 dark:text-slate-700 mb-3" />
                                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">No saved lectures</p>
                                        <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Bookmark videos from search to access them here</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {savedVideos.map((video, idx) => (
                                            <VideoCard key={video.id || idx} video={video} isSaved={true} onPlay={() => setSelectedVideo(video)} onToggleSave={() => toggleSaveVideo(video)} />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Footer */}
                <p className="text-center text-slate-400 dark:text-slate-600 text-xs font-medium">
                    Questions are dynamically generated by AI following official syllabi · Progress is auto-saved
                </p>
            </div>

            {/* ===== VIDEO MODAL ===== */}
            <AnimatePresence>
                {selectedVideo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90 backdrop-blur-sm p-4"
                        onClick={() => setSelectedVideo(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setSelectedVideo(null)}
                                className="absolute right-3 top-3 z-10 w-9 h-9 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-700 dark:text-white flex items-center justify-center transition">
                                <X size={16} />
                            </button>
                            <div className="aspect-video w-full">
                                <iframe src={getVideoEmbedUrl(selectedVideo.id)} title={selectedVideo.title} frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" />
                            </div>
                            <div className="p-5 border-t border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">{selectedVideo.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">{selectedVideo.channel}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Extracted Video Card
const VideoCard = ({ video, isSaved, onPlay, onToggleSave }) => (
    <div className="group/v bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden hover:shadow-md dark:hover:border-white/[0.12] transition-all flex flex-col">
        <div className="relative aspect-video overflow-hidden bg-slate-200 dark:bg-black/30">
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover/v:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <button onClick={onPlay} className="absolute inset-0 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover/v:opacity-100 scale-90 group-hover/v:scale-100 transition-all duration-300">
                    <Play size={18} fill="currentColor" />
                </div>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition">
                <Bookmark size={12} fill={isSaved ? "currentColor" : "none"} className={isSaved ? "text-amber-400" : ""} />
            </button>
        </div>
        <div className="p-3 flex-1 flex flex-col">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug mb-1">{video.title}</h4>
            <p className="text-[10px] text-slate-400 font-medium mb-auto">{video.channel}</p>
            <button onClick={onPlay}
                className="mt-2.5 w-full py-2 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 font-semibold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1">
                <Play size={10} fill="currentColor" /> Watch
            </button>
        </div>
    </div>
);

export default EntryTestPrep;
