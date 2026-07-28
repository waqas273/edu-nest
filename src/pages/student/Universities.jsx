import React, { useState, useEffect, useMemo } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, Star, ArrowRight,
    GraduationCap, Building2, Loader2,
    SearchX, Sparkles, SlidersHorizontal, Brain, Navigation, Award
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    getUniversityScore,
    RECOMMENDATION_THRESHOLD,
    isLocationMatch
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

    const allScored = useMemo(() => {
        const studentCity = userProfile?.city || '';

        const scored = universities.map(uni => {
            const { score, locationScore, matchingCount, distanceKm } =
                getUniversityScore(uni, userProfile, studentCoords);

            const isSameCity = (studentCity && isLocationMatch(uni.location, studentCity)) || locationScore >= 27;

            return {
                ...uni,
                _score: score,
                _locationScore: locationScore,
                _matchingCount: matchingCount,
                _distanceKm: distanceKm,
                _isSameCity: isSameCity,
            };
        });

        // Multi-tier Sorting:
        // 1. Same City Priority (_isSameCity === true)
        // 2. Distance in KM (_distanceKm ascending - nearest first)
        // 3. Recommendation Score (_score descending)
        // 4. Rating (calculatedRating descending)
        const sorted = [...scored].sort((a, b) => {
            const aSameCity = a._isSameCity ? 1 : 0;
            const bSameCity = b._isSameCity ? 1 : 0;
            if (bSameCity !== aSameCity) return bSameCity - aSameCity;

            if (typeof a._distanceKm === 'number' && typeof b._distanceKm === 'number' && a._distanceKm !== b._distanceKm) {
                return a._distanceKm - b._distanceKm;
            }

            if (b._score !== a._score) return b._score - a._score;

            return (parseFloat(b.calculatedRating) || 0) - (parseFloat(a.calculatedRating) || 0);
        });

        return sorted.map((uni, idx) => ({ ...uni, _rank: idx + 1 }));
    }, [universities, userProfile, studentCoords]);

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

    const UniCard = ({ uni }) => (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            key={uni.id}
            className="group relative bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden hover:border-cyan-500/40 transition-all duration-500 backdrop-blur-xl hover:shadow-xl flex flex-col"
        >
            <div className="h-52 overflow-hidden relative">
                <img
                    src={uni.profilePic || uni.photoURL || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'}
                    alt={uni.universityName}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Rank Badge */}
                {uni._rank && (
                    <div className={`absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full shadow-lg backdrop-blur-md ${
                        uni._rank === 1
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-amber-500/30'
                            : 'bg-slate-900/80 text-white border border-white/10'
                    }`}>
                        <Award size={11} className={uni._rank === 1 ? 'text-slate-900' : 'text-cyan-400'} />
                        Rank #{uni._rank} {uni._rank === 1 ? '· Top Match' : ''}
                    </div>
                )}

                {/* Location / Kilometers Distance Badge */}
                {typeof uni._distanceKm === 'number' ? (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                        <Navigation size={9} /> {uni._distanceKm} km away
                    </div>
                ) : uni._isSameCity ? (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                        <Navigation size={9} /> In Your City
                    </div>
                ) : null}

                {/* Rating Badge */}
                {uni.calculatedRating && (
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-slate-200 dark:border-white/10">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{uni.calculatedRating}</span>
                    </div>
                )}
            </div>

            <div className="p-6 flex flex-col flex-1 relative z-10">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {uni.universityName || 'Unnamed University'}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin size={12} className="text-cyan-500 flex-shrink-0" />
                        {uni.location || 'Location Not Specified'}
                    </p>
                </div>

                {uni.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {uni.description}
                    </p>
                )}

                {uni._matchingCount > 0 && (
                    <div className="mb-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <Sparkles size={13} />
                        {uni._matchingCount} program{uni._matchingCount > 1 ? 's' : ''} matching your interest
                    </div>
                )}

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <GraduationCap size={14} className="text-indigo-500" />
                        {uni.programsCount || 0} Programs
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-400">
                        <Building2 size={13} /> Verified
                    </span>
                </div>

                <button
                    onClick={() => navigate(`/university/${uni.id}`)}
                    className="mt-5 w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 hover:border-transparent transition-all duration-300 shadow-sm"
                >
                    View Profile <ArrowRight size={14} />
                </button>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050a18] pb-16 font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <Building2 className="text-cyan-500" size={32} />
                            Find Universities
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Discover accredited universities sorted by location proximity, program match & ratings
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-wrap items-center gap-3"
                    >
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or city..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:border-cyan-500 dark:text-white transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shadow-sm">
                            <SlidersHorizontal size={14} className="text-slate-400 ml-2.5" />
                            <select
                                value={ratingFilter}
                                onChange={(e) => setRatingFilter(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none pr-3 py-1.5 cursor-pointer"
                            >
                                <option value="all" className="dark:bg-slate-900">All Ratings</option>
                                <option value="high" className="dark:bg-slate-900">Highest Rated</option>
                                <option value="4.5" className="dark:bg-slate-900">★ 4.5+</option>
                                <option value="4.0" className="dark:bg-slate-900">★ 4.0+</option>
                                <option value="3.5" className="dark:bg-slate-900">★ 3.5+</option>
                            </select>
                        </div>
                    </motion.div>
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section>
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                        <Building2 size={16} className="text-cyan-500" />
                                        <span className="text-sm font-black text-slate-800 dark:text-white">Universities List</span>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                        {filteredUnis.length} institutions
                                    </span>
                                </div>
                                {userProfile?.interest && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Sorted by rank for <span className="text-cyan-500 font-semibold">{userProfile.interest}</span>
                                    </span>
                                )}
                            </div>

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
                                            <UniCard uni={uni} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </section>

                        {filteredUnis.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-24 space-y-6 bg-white/50 dark:bg-white/[0.01] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl"
                            >
                                <SearchX size={64} strokeWidth={1} className="mx-auto text-slate-300 dark:text-slate-700" />
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">No Universities Found</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                        We couldn't find any institutions matching your filters. Try clearing your search term or adjusting filters.
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
