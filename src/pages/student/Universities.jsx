import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Star, ArrowRight,
    GraduationCap, Building2, Loader2,
    SearchX, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

const Universities = () => {
    const navigate = useNavigate();
    const [universities, setUniversities] = useState([]);
    const [filteredUnis, setFilteredUnis] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', 'university_manager'),
                    where('status', '==', 'approved')
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch ratings and program counts for each university
                const universitiesWithRatings = await Promise.all(data.map(async (uni) => {
                    // Fetch reviews for rating
                    const reviewsQ = query(
                        collection(db, 'reviews'),
                        where('universityId', '==', uni.id)
                    );
                    const reviewsSnap = await getDocs(reviewsQ);
                    const reviews = reviewsSnap.docs.map(d => d.data());
                    const avgRating = reviews.length > 0
                        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                        : null;

                    // Fetch program count from degrees collection
                    const degreesQ = query(
                        collection(db, 'degrees'),
                        where('universityId', '==', uni.id)
                    );
                    const degreesSnap = await getDocs(degreesQ);
                    const programCount = degreesSnap.docs.length;

                    return {
                        ...uni,
                        calculatedRating: avgRating,
                        reviewCount: reviews.length,
                        programsCount: programCount
                    };
                }));

                setUniversities(universitiesWithRatings);
                setFilteredUnis(universitiesWithRatings);
            } catch (err) {
                console.error("Error fetching universities:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUniversities();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = [...universities];

        if (searchTerm) {
            result = result.filter(uni =>
                uni.universityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                uni.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (ratingFilter === 'high') {
            result.sort((a, b) => (b.calculatedRating || 0) - (a.calculatedRating || 0));
        }

        setFilteredUnis(result);
    }, [searchTerm, ratingFilter, universities]);

    const SkeletonCard = () => (
        <div className="bg-white/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-3xl p-6 space-y-6 animate-pulse">
            <div className="h-48 bg-slate-200 dark:bg-white/5 rounded-2xl w-full" />
            <div className="space-y-3">
                <div className="h-6 bg-slate-200 dark:bg-white/5 rounded-full w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-white/5 rounded-full w-1/2" />
            </div>
            <div className="h-12 bg-slate-200 dark:bg-white/5 rounded-2xl w-full" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors duration-300 p-6 lg:p-10 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* --- Header Section --- */}
                <header className="relative py-16 flex flex-col items-center text-center space-y-10">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="space-y-6 relative">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-white/5 border border-cyan-500/20 dark:border-white/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md"
                        >
                            <Sparkles size={14} className="animate-pulse" />
                            <span>Academic Discovery Engine</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl"
                        >
                            Find Your{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600">
                                Future
                            </span>
                        </motion.h1>

                        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg font-medium">
                            Access the network of top-tier verified institutions and mapped career roadmaps.
                        </p>
                    </div>

                    {/* Search Input */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full max-w-3xl relative group px-4"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/10 p-3 rounded-2xl shadow-xl dark:shadow-none group-focus-within:border-cyan-500/30 transition-all">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-500 transition-colors" size={22} />
                                <input
                                    type="text"
                                    placeholder="Search by name or city..."
                                    className="w-full pl-14 pr-6 py-4 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-base font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />
                            <div className="relative w-full md:w-auto">
                                <select
                                    className="appearance-none pl-4 pr-10 py-4 bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 text-sm font-semibold cursor-pointer w-full hover:text-slate-900 dark:hover:text-white transition-colors"
                                    value={ratingFilter}
                                    onChange={(e) => setRatingFilter(e.target.value)}
                                >
                                    <option value="all" className="bg-white dark:bg-slate-900">Sort: Default</option>
                                    <option value="high" className="bg-white dark:bg-slate-900">Sort: Top Rated</option>
                                </select>
                                <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </motion.div>
                </header>

                {/* --- Results Grid --- */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredUnis.map((uni, index) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={uni.id}
                                    className="group relative bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden hover:border-cyan-500/40 transition-all duration-500 backdrop-blur-xl hover:shadow-xl dark:hover:shadow-[0_0_60px_rgba(6,182,212,0.1)] flex flex-col"
                                >
                                    {/* Image Container */}
                                    <div className="h-52 overflow-hidden relative">
                                        <img
                                            src={uni.profilePic || uni.photoURL || 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?auto=format&fit=crop&w=800&q=80'}
                                            alt={uni.universityName}
                                            crossOrigin="anonymous"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                                        {/* Rating Badge */}
                                        {uni.calculatedRating && (
                                            <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-slate-200 dark:border-white/10">
                                                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                                <span className="text-sm font-bold text-slate-800 dark:text-white">{uni.calculatedRating}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                                                {uni.universityName}
                                            </h3>
                                            <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                                                <MapPin size={14} className="mr-1.5 text-cyan-500" />
                                                {uni.location || 'Location N/A'}
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">
                                            {uni.description || 'A premier institution committed to academic excellence.'}
                                        </p>

                                        <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <GraduationCap size={14} className="text-purple-500" />
                                                    <span>{uni.programsCount ?? 0} Programs</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Building2 size={14} className="text-blue-500" />
                                                    <span>Verified</span>
                                                </div>
                                            </div>
                                        </div>

                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigate(`/university/${uni.id}`)}
                                            className="w-full mt-auto py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-cyan-500 dark:hover:bg-cyan-500 text-slate-700 dark:text-white hover:text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center group/btn border border-slate-200 dark:border-white/10 hover:border-transparent"
                                        >
                                            View Profile
                                            <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* --- Empty State --- */}
                {!loading && filteredUnis.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-24 space-y-6 bg-white/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl"
                    >
                        <SearchX size={64} strokeWidth={1} className="mx-auto text-slate-300 dark:text-slate-700" />
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">No Results Found</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                No institutions match your search criteria.
                            </p>
                        </div>
                        <button
                            onClick={() => { setSearchTerm(''); setRatingFilter('all'); }}
                            className="px-6 py-3 bg-cyan-500 text-white font-semibold rounded-xl hover:bg-cyan-600 transition-all"
                        >
                            Reset Search
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Universities;
