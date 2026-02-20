import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import LearningResources from './LearningResources';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Youtube, BookOpen, ExternalLink, X, Play, Bookmark,
    CheckCircle, Loader2, BookMarked, Trophy, ArrowRight,
    Search, Filter, MonitorPlay, GraduationCap, Trash2
} from 'lucide-react';
import { fetchVideos, getVideoEmbedUrl } from '../../services/resourceService';
import { COURSERA_DATASET } from '../../data/courseraData';
import { getRelatedKeywords } from '../../utils/skillKeywords';

const TopicResources = ({ isOpen, onClose, topic, skill, onMarkAsDone, onStartTest }) => {
    const [activeTab, setActiveTab] = useState('videos');
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [savedResources, setSavedResources] = useState([]);
    const [showToast, setShowToast] = useState(null);

    // --- ENHANCED FILTERING LOGIC ---
    const recommendedCourses = useMemo(() => {
        if (!skill) return [];

        const relatedKeywords = getRelatedKeywords(skill);
        // Add topic title to keywords for specificity
        const topicKeywords = topic ?
            topic.title.toLowerCase().split(/\s+/).filter(w => w.length > 3) : [];

        const scored = COURSERA_DATASET.map(course => {
            let score = 0;
            const title = (course["Course Name"] || '').toLowerCase();
            const tags = (course["Skills"] || '').toLowerCase();
            const rating = parseFloat(course["Course Rating"]);

            // Filter out clearly garbage data
            if (isNaN(rating) || rating < 3.0) return { ...course, score: -9999 };

            // 1. EXACT SKILL MATCH (Highest Priority)
            // If the course title explicitly contains the skill name
            if (title.includes(skill.toLowerCase())) score += 100;

            // 2. RELATED KEYWORD MATCH
            // Match against our mapped keywords (e.g., MERN -> React, Node, etc.)
            const keywordMatchCount = relatedKeywords.reduce((acc, keyword) => {
                return acc + (title.includes(keyword) ? 1 : 0) + (tags.includes(keyword) ? 0.5 : 0);
            }, 0);
            score += keywordMatchCount * 30;

            // 3. TOPIC SPECIFICITY
            // If the course matches the specific subtopic the user clicked
            const topicMatchCount = topicKeywords.reduce((acc, keyword) => {
                return acc + (title.includes(keyword) ? 1 : 0);
            }, 0);
            score += topicMatchCount * 80; // High weight for topic relevance

            // 4. QUALITY BOOST
            // High rated courses get a significant boost
            if (rating >= 4.5) score += rating * 15;
            else if (rating >= 4.0) score += rating * 5;

            // 5. PENALTIES
            // If it doesn't match any skill keywords at all, heavy penalty to avoid random noise
            if (keywordMatchCount === 0 && !title.includes(skill.toLowerCase())) {
                score -= 500;
            }

            return { ...course, score };
        });

        // Filter out low scores, sort by score, and deduplicate
        let results = scored
            .filter(c => c.score > 10) // Threshold to remove irrelevant noise
            .sort((a, b) => b.score - a.score); // Best match first

        // Deduplication based on title to avoid slight variations showing up
        const seenTitles = new Set();
        const uniqueResults = [];
        for (const course of results) {
            if (!seenTitles.has(course["Course Name"])) {
                seenTitles.add(course["Course Name"]);
                uniqueResults.push(course);
            }
        }

        return uniqueResults.slice(0, 15).map(c => ({
            id: c["Course URL"] + Math.random(), // Fallback ID
            title: c["Course Name"],
            provider: c["University"] || "Coursera",
            rating: c["Course Rating"],
            level: c["Difficulty Level"] || "All Levels",
            duration: "Self-paced",
            type: 'course',
            url: c["Course URL"],
            tags: c["Skills"],
            score: c.score // Keep score for debugging if needed
        }));
    }, [skill, topic]);

    // Local Storage Persistence
    const storageKey = `saved_resources_${skill?.replace(/\s+/g, '_').toLowerCase()}`;

    useEffect(() => {
        const loadSaved = () => {
            try {
                const stored = localStorage.getItem(storageKey);
                setSavedResources(stored ? JSON.parse(stored) : []);
            } catch (e) {
                console.error("Failed to load saved resources", e);
            }
        };
        loadSaved();
    }, [storageKey]);

    useEffect(() => {
        if (isOpen && topic) {
            setLoading(true);
            const loadVideos = async () => {
                try {
                    const vids = await fetchVideos(topic.title, skill);
                    setVideos(vids);
                } catch (error) {
                    console.error('Error loading videos:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadVideos();
        }
    }, [isOpen, topic, skill]);

    const displayToast = (message, type = 'success') => {
        setShowToast({ message, type });
        setTimeout(() => setShowToast(null), 3000);
    };

    const handleSaveResource = (resource, type) => {
        const newItem = {
            id: resource.id,
            uniqueId: `${type}-${resource.id}`,
            type,
            title: resource.title,
            url: resource.url,
            thumbnail: resource.thumbnail || null,
            provider: resource.provider || null,
            rating: resource.rating || null,
            channel: resource.channel || null
        };

        let newSaved;
        const exists = savedResources.some(item => item.uniqueId === newItem.uniqueId);

        if (exists) {
            newSaved = savedResources.filter(item => item.uniqueId !== newItem.uniqueId);
            displayToast('Removed from bookmarks', 'default');
        } else {
            newSaved = [...savedResources, newItem];
            displayToast('Added to bookmarks');
        }

        setSavedResources(newSaved);
        localStorage.setItem(storageKey, JSON.stringify(newSaved));
    };

    const isResourceSaved = (resource, type) => {
        return savedResources.some(item => item.uniqueId === `${type}-${resource.id}`);
    };

    const handleMarkLearningDone = () => {
        if (onMarkAsDone) onMarkAsDone(topic.id);
        displayToast('Marked as learned! Ready for test.');
    };

    return createPortal(
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    <div key="modal-backdrop" className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10 border border-slate-200 dark:border-slate-800"
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-20">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
                                            Learning Hub
                                        </span>
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">•</span>
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            {skill}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                        {topic?.title}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={28} />
                                </button>
                            </div>

                            {/* Navigation Tabs */}
                            <div className="flex-shrink-0 flex px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <button
                                    onClick={() => setActiveTab('videos')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'videos'
                                        ? 'border-red-500 text-red-600 dark:text-red-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <Youtube size={20} /> Video Tutorials
                                </button>
                                <button
                                    onClick={() => setActiveTab('courses')}
                                    className={`flex items-center gap-2 px-6 py-4 font-bold text-sm border-b-2 transition-all ${activeTab === 'courses'
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <BookOpen size={20} /> Recommended Courses
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
                                {loading ? (
                                    <div className="flex flex-col justify-center items-center h-full min-h-[400px]">
                                        <Loader2 size={48} className="animate-spin text-cyan-500 mb-4" />
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">Curating top resources for you...</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        {/* Videos Grid */}
                                        {activeTab === 'videos' && (
                                            <motion.div
                                                key="videos"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                            >
                                                {videos.map((vid, idx) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        key={`${vid.id}-${idx}`}
                                                        className="group flex flex-col"
                                                    >
                                                        <div
                                                            onClick={() => setSelectedVideo(vid)}
                                                            className="relative aspect-video rounded-2xl overflow-hidden shadow-lg cursor-pointer bg-slate-200 dark:bg-slate-800"
                                                        >
                                                            <img
                                                                src={vid.thumbnail}
                                                                alt={vid.title}
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80"; // Fallback: Generic video/tech image
                                                                }}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                                    <Play size={24} className="fill-white text-white ml-1" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 flex gap-3 items-start flex-1">
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-tight group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                                                                    {vid.title}
                                                                </h3>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                                    <MonitorPlay size={12} /> {vid.channel}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSaveResource(vid, 'video');
                                                                }}
                                                                className={`p-2 rounded-xl transition-all ${isResourceSaved(vid, 'video')
                                                                    ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-sm'
                                                                    }`}
                                                            >
                                                                {isResourceSaved(vid, 'video') ? <BookMarked size={16} /> : <Bookmark size={16} />}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}

                                        {/* Courses List */}
                                        {activeTab === 'courses' && (
                                            <motion.div
                                                key="courses"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="space-y-4 max-w-6xl mx-auto"
                                            >
                                                <LearningResources resources={recommendedCourses} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex-shrink-0 p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    <BookMarked size={16} className="text-yellow-500" />
                                    <span className="underline decoration-dashed underline-offset-4">
                                        {savedResources.length} saved items for {skill}
                                    </span>
                                </button>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={handleMarkLearningDone}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={18} />
                                        Mark as Done
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (onStartTest) onStartTest(topic);
                                            onClose();
                                        }}
                                        className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20 hover:scale-105"
                                    >
                                        <Trophy size={18} />
                                        Take Test
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* SAVED RESOURCES MODAL */}
                    <AnimatePresence>
                        {activeTab === 'saved' && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                                onClick={() => setActiveTab('videos')}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }}
                                    className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden flex flex-col border border-yellow-500/30 shadow-2xl shadow-yellow-500/10"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/20 rounded-xl text-yellow-600 dark:text-yellow-400">
                                                <BookMarked size={24} />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Your Saved Collection</h2>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    Curated resources for <strong>{skill}</strong>
                                                </p>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveTab('videos')} className="p-2 hover:bg-black/5 rounded-full">
                                            <X size={24} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
                                        {savedResources.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                                                <Bookmark size={64} className="mb-4 text-slate-300" />
                                                <p className="text-lg font-bold">No saved items yet</p>
                                                <p className="text-sm text-slate-500">Bookmark videos or courses to see them here.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {savedResources.map((item) => (
                                                    <div key={item.uniqueId} className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition group relative">
                                                        <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 relative">
                                                            {item.type === 'video' ? (
                                                                <>
                                                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                                        <Play size={16} className="text-white fill-white" />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                                                                    <GraduationCap size={32} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block
                                                                        ${item.type === 'video' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}
                                                                    `}>
                                                                    {item.type}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleSaveResource({ id: item.id }, item.type)}
                                                                    className="text-slate-400 hover:text-red-500 p-1"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                            <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2 text-sm mb-1">
                                                                {item.title}
                                                            </h4>

                                                            {item.type === 'video' ? (
                                                                <button
                                                                    onClick={() => setSelectedVideo(item)}
                                                                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mt-2"
                                                                >
                                                                    <Play size={12} /> Watch Now
                                                                </button>
                                                            ) : (
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-2"
                                                                >
                                                                    <ExternalLink size={12} /> View Course
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video Player & Toasts */}
                    <AnimatePresence>
                        {selectedVideo && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
                                onClick={() => setSelectedVideo(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    className="w-full max-w-5xl aspect-video relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => setSelectedVideo(null)}
                                        className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                                    >
                                        <X size={24} />
                                    </button>

                                    {getVideoEmbedUrl(selectedVideo.id) ? (
                                        <iframe
                                            src={getVideoEmbedUrl(selectedVideo.id)}
                                            title={selectedVideo.title}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center">
                                            <p className="text-white text-lg">Video link broken or unavailable.</p>
                                        </div>
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {showToast && (
                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                                className="fixed bottom-8 right-8 z-[10001] px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
                            >
                                <CheckCircle size={24} className="text-emerald-500" />
                                {showToast.message}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default TopicResources;
