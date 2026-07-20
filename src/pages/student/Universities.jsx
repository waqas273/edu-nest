import React, { useState, useEffect, useMemo } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Star, ArrowRight,
    GraduationCap, Building2, Loader2,
    SearchX, Sparkles, SlidersHorizontal, Brain, Navigation
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    getUniversityScore,
    RECOMMENDATION_THRESHOLD
} from '../../utils/recommendationEngine';

const Universities = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuth();

    const {
        uniSearchTerm: searchTerm,
        setUniSearchTerm: setSearchTerm,
        uniRatingFilter: ratingFilter,
        setUniRatingFilter: setRatingFilter,
        universitiesCache,
        setUniversitiesCache
    } = useStudentState();

    const universities = universitiesCache || [];
    const [loading, setLoading] = useState(true);
    const [studentCoords, setStudentCoords] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('pending');

    // Fetch browser GPS dynamically in real-time when student lands on the page
    useEffect(() => {
        if (!navigator.geolocation) {
            setGpsStatus('denied');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStudentCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setGpsStatus('granted');
            },
            (error) => {
                console.log("Student GPS access denied/failed. Falling back to city text match.", error);
                setGpsStatus('denied');
            },
            { enableHighAccuracy: true }
        );
    }, []);

    useEffect(() => {
        if (universitiesCache) {
            setLoading(false);
            return;
        }

        const fetchUniversities = async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('role', '==', 'university_manager'),
                    where('status', '==', 'approved')
                );
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fetch ratings and degree programs for each university in parallel
                const universitiesEnriched = await Promise.all(data.map(async (uni) => {
                    const [reviewsSnap, degreesSnap] = await Promise.all([
                        getDocs(query(collection(db, 'reviews'), where('universityId', '==', uni.id))),
                        getDocs(query(collection(db, 'degrees'), where('universityId', '==', uni.id))),
                    ]);

                    const reviews = reviewsSnap.docs.map(d => d.data());
                    const avgRating = reviews.length > 0
                        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                        : null;

                    const degrees = degreesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                    return {
                        ...uni,
                        calculatedRating: avgRating,
                        reviewCount: reviews.length,
                        programsCount: degrees.length,
                        _degrees: degrees, // used by recommendation engine
                    };
                }));

                setUniversitiesCache(universitiesEnriched);
            } catch (err) {
                console.error('Error fetching universities:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUniversities();
    }, [universitiesCache, setUniversitiesCache]);

    // ── Scored & filtered universities ──────────────────────────────────────────
    const { recommended, allScored } = useMemo(() => {
        const hasProfile = userProfile?.interest && userProfile?.city;

        const scored = universities.map(uni => {
            const { score, interestScore, locationScore, ratingScore, matchingCount } =
                getUniversityScore(uni, userProfile, studentCoords);
            return {
                ...uni,
                _score: score,
                _interestScore: interestScore,
                _locationScore: locationScore,
                _ratingScore: ratingScore,
                _matchingCount: matchingCount,
                _isRecommended: hasProfile && score >= RECOMMENDATION_THRESHOLD,
            };
        });

        // Sort recommended first by score descending
        const recs = scored
            .filter(u => u._isRecommended)
            .sort((a, b) => b._score - a._score)
            .slice(0, 6);

        return { recommended: recs, allScored: scored };
    }, [universities, userProfile, studentCoords]);

    // ── Search + rating filter applied to ALL universities ───────────────────
    const filteredUnis = useMemo(() => {
        let result = [...allScored];

        if (searchTerm) {
            result = result.filter(uni =>
                uni.universityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                uni.location?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (ratingFilter === 'high') {
            result.sort((a, b) => (b.calculatedRating || 0) - (a.calculatedRating || 0));
        } else if (ratingFilter === '4.5') {
            result = result.filter(u => parseFloat(u.calculatedRating || 0) >= 4.5);
        } else if (ratingFilter === '4.0') {
            result = result.filter(u => parseFloat(u.calculatedRating || 0) >= 4.0);
        } else if (ratingFilter === '3.5') {
            result = result.filter(u => parseFloat(u.calculatedRating || 0) >= 3.5);
        }

        return result;
    }, [allScored, searchTerm, ratingFilter]);

    // ── Components ──────────────────────────────────────────────────────────────
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

    const UniCard = ({ uni, showScoreBadge = false }) => (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key={uni.id}
            className={`group relative bg-white dark:bg-white/[0.02] border rounded-3xl overflow-hidden hover:border-cyan-500/40 transition-all duration-500 backdrop-blur-xl hover:shadow-xl dark:hover:shadow-[0_0_60px_rgba(6,182,212,0.1)] flex flex-col
                ${showScoreBadge && uni._isRecommended
                    ? 'border-cyan-400/50 dark:border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-200 dark:border-white/10'
                }`}
        >
            {/* Recommended glow border top accent */}
            {showScoreBadge && uni._isRecommended && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 z-10" />
            )}

            {/* Image Container */}
            <div className="h-52 overflow-hidden relative">
                <img
                    src={uni.profilePic || uni.photoURL || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'}
                    alt={uni.universityName}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Recommendation Badge */}
                {showScoreBadge && uni._isRecommended && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/30">
                        <Sparkles size={10} />
                        {uni._score}% Match
                    </div>
                )}

                {/* Location Match Badge */}
                {showScoreBadge && uni._locationScore === 30 && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full shadow">
                        <Navigation size={8} /> In Your City
                    </div>
                )}

                {/* Rating Badge */}
                {uni.calculatedRating && (
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-slate-200 dark:border-white/10">
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

                {/* Matching Programs hint */}
                {showScoreBadge && uni._matchingCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl px-3 py-1.5">
                        <Brain size={12} />
                        {uni._matchingCount} program{uni._matchingCount !== 1 ? 's' : ''} matching your interest
                    </div>
                )}

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
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors duration-300 p-6 lg:p-10 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* ── GPS Warning Banner ── */}
                {gpsStatus === 'denied' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-2xl flex items-center justify-center gap-2 mb-4 animate-pulse shadow-sm"
                    >
                        <MapPin size={16} />
                        <span className="text-sm font-semibold">Location access is turned off. Please allow location access for better university recommendations.</span>
                    </motion.div>
                )}

                {/* ── Header ── */}
                <header className="relative py-16 flex flex-col items-center text-center space-y-10">
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

                    {/* Search + Filter */}
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
                                    <option value="4.5" className="bg-white dark:bg-slate-900">4.5+ Stars ★ (Elite)</option>
                                    <option value="4.0" className="bg-white dark:bg-slate-900">4.0+ Stars ★ (Top Tier)</option>
                                    <option value="3.5" className="bg-white dark:bg-slate-900">3.5+ Stars ★ (Solid)</option>
                                </select>
                                <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </motion.div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="space-y-16">

                        {/* ── Recommended For You Section ── */}
                        {recommended.length > 0 && !searchTerm && ratingFilter === 'all' && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/25 dark:border-cyan-500/20">
                                        <Brain size={16} className="text-cyan-500" />
                                        <span className="text-sm font-black text-slate-800 dark:text-white">
                                            Recommended for You
                                        </span>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
                                    {userProfile?.interest && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            Based on your interest in <span className="text-cyan-500 font-semibold">{userProfile.interest}</span>
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <AnimatePresence mode="popLayout">
                                        {recommended.map(uni => (
                                            <UniCard key={uni.id} uni={uni} showScoreBadge />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </motion.section>
                        )}

                        {/* ── All Universities Section ── */}
                        <section>
                            {recommended.length > 0 && !searchTerm && ratingFilter === 'all' && (
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <Building2 size={16} className="text-slate-500" />
                                        <span className="text-sm font-black text-slate-800 dark:text-white">All Universities</span>
                                    </div>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                    <span className="text-xs text-slate-500">{filteredUnis.length} institutions</span>
                                </div>
                            )}

                            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <AnimatePresence mode="popLayout">
                                    {filteredUnis.map((uni, index) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.04 }}
                                            key={uni.id}
                                        >
                                            <UniCard uni={uni} showScoreBadge={!searchTerm && ratingFilter === 'all'} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </section>

                        {/* ── Empty State ── */}
                        {filteredUnis.length === 0 && (
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
                )}
            </div>
        </div>
    );
};

export default Universities;
