import React, { useState, useEffect } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { motion } from 'framer-motion';
import { Map, Sparkles, Loader2, MapPin } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import LeafletGlobalMap from '../../components/LeafletGlobalMap';

const GlobalMap = () => {
    const {
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

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setStudentCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setGpsStatus('granted');
            },
            (error) => {
                console.log("Student GPS access denied/failed. Please allow Location access in browser settings.", error);
                setGpsStatus('denied');
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors duration-300 p-6 lg:p-10 flex flex-col h-full relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto w-full space-y-8 flex-1 flex flex-col">
                {/* ── GPS Warning Banner ── */}
                {gpsStatus === 'denied' && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-2xl flex items-center justify-center gap-2 mb-4 animate-pulse shadow-sm"
                    >
                        <MapPin size={16} />
                        <span className="text-sm font-semibold">Location access is turned off. Please allow location access to see nearest universities and accurate distances.</span>
                    </motion.div>
                )}

                {/* ── Header ── */}
                <header className="relative pt-6 pb-2 text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-500/10 dark:bg-white/5 border border-cyan-500/20 dark:border-white/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md"
                    >
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Interactive Exploration</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight"
                    >
                        Global{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600">
                            University Map
                        </span>
                    </motion.h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm md:text-base font-medium">
                        Explore verified institutions across the world and see their physical locations dynamically.
                    </p>
                </header>

                {/* ── Map Container ── */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full flex-1 min-h-[60vh] rounded-3xl overflow-hidden relative"
                >
                    {loading ? (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 size={32} className="animate-spin text-cyan-500" />
                                <span className="font-bold text-slate-500">Loading map data...</span>
                            </div>
                        </div>
                    ) : (
                        <LeafletGlobalMap 
                            universities={universities} 
                            studentCoords={studentCoords} 
                        />
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default GlobalMap;
