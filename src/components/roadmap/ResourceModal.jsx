import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Youtube, BookOpen, ExternalLink, X } from 'lucide-react';
import { fetchVideos, fetchCourses } from '../../services/resourceService';

const ResourceModal = ({ isOpen, onClose, topic, skill }) => {
    const [activeTab, setActiveTab] = useState('videos');
    const [videos, setVideos] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && topic) {
            setLoading(true);
            const loadData = async () => {
                const vids = await fetchVideos(topic);
                const courses = fetchCourses(topic, skill);
                setVideos(vids);
                setCourses(courses);
                setLoading(false);
            };
            loadData();
        }
    }, [isOpen, topic, skill]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Lean Resources</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Curated materials for <span className="font-semibold text-blue-600 dark:text-blue-400">{topic}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
                        <X size={24} className="text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`flex-1 py-4 text-center font-medium transition flex items-center justify-center ${activeTab === 'videos' ? 'border-b-2 border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <Youtube size={20} className="mr-2" /> Video Tutorials
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex-1 py-4 text-center font-medium transition flex items-center justify-center ${activeTab === 'courses' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}
                    >
                        <BookOpen size={20} className="mr-2" /> Recommended Courses
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {activeTab === 'videos' && (
                                <motion.div
                                    key="videos"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {videos.map((vid, idx) => (
                                        <a key={vid.id || idx} href={vid.url} target="_blank" rel="noopener noreferrer" className="group">
                                            <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 relative">
                                                <img src={vid.thumbnail} alt={vid.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Youtube size={48} className="text-red-600 fill-white" />
                                                </div>
                                            </div>
                                            <h3 className="mt-3 font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-red-500 transition">{vid.title}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{vid.channel}</p>
                                        </a>
                                    ))}
                                    {videos.length === 0 && <p className="col-span-full text-center text-slate-500">No videos found.</p>}
                                </motion.div>
                            )}

                            {activeTab === 'courses' && (
                                <motion.div
                                    key="courses"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-4"
                                >
                                    {courses.map((course, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="h-16 w-16 bg-blue-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                                                <BookOpen size={32} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{course.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{course.provider}</p>
                                                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                                    {course.tags.map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-xs rounded-full text-slate-700 dark:text-slate-300">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <a href={course.url} target="_blank" rel="noopener noreferrer" className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center text-sm shadow-lg shadow-blue-500/20">
                                                Enroll <ExternalLink size={16} className="ml-2" />
                                            </a>
                                        </div>
                                    ))}
                                    {courses.length === 0 && (
                                        <div className="text-center py-10">
                                            <p className="text-slate-500">No specific courses found for this specific topic.</p>
                                            <p className="text-xs text-slate-400 mt-2">Try searching manually on Coursera or EdX.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResourceModal;
