import { useState, useEffect, useMemo } from 'react';
import { useStudentState } from '../../context/StudentStateContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, GraduationCap, Clock, DollarSign, Building2,
    MapPin, ChevronRight, X, SearchX,
    BookOpen, Sparkles, SlidersHorizontal, Lock, CheckCircle2,
    Award, Eye, Layers, FileText, Star, ExternalLink, Brain, Navigation
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    getProgramScore,
    RECOMMENDATION_THRESHOLD,
    isLocationMatch
} from '../../utils/recommendationEngine';

const DEGREE_TYPES = ['All', 'BS', 'MS', 'Other'];
const DURATION_OPTS = ['All', '2 Years', '3 Years', '4 Years', '5 Years'];

const checkDeadlineStatus = (d) => {
    if (!d) return { closed: false };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(d); dl.setHours(0, 0, 0, 0);
    return { closed: dl < today };
};

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    show: (i) => ({ opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24, delay: i * 0.04 } }),
};

const ProgramCard = ({ prog, uniName, uniLocation, uniId, isOpen, appStatus, onApply, onViewDetails, index }) => {
    const admOpen = isOpen !== false;
    const hasScholarship = prog.scholarships && prog.scholarships.length > 0;
    return (
        <motion.div
            custom={index} variants={cardVariants} initial="hidden" animate="show"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:border-cyan-400/40 dark:hover:border-cyan-500/30 transition-all duration-300"
        >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            {/* Scholarship tag */}
            {hasScholarship && (
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg shadow-amber-400/30">
                    <Award size={11} className="text-white" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Scholarship</span>
                </div>
            )}

            <div className="p-6 flex flex-col flex-1 relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20 border-2 border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                        <GraduationCap className="text-cyan-600 dark:text-cyan-400" size={26} />
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        !admOpen
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                    }`}>
                        {!admOpen ? 'Closed' : 'Open'}
                    </span>
                </div>

                {/* Program info */}
                <div className="mb-4 flex-1">
                    <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
                        {prog.degreeType || 'Degree'} · Program
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 min-h-[3rem]">
                        {prog.title || prog.programName || prog.name || 'Untitled'}
                    </h3>
                </div>

                {/* University info */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <Building2 size={13} className="text-indigo-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{uniName}</span>
                    {uniLocation && (
                        <>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-400 truncate">{uniLocation}</span>
                        </>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider"><Clock size={10} /> Duration</div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{prog.duration || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider"><DollarSign size={10} /> Fee/Sem</div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{prog.estimatedFee || 'N/A'}</span>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-auto">
                    <button
                        onClick={() => onViewDetails(prog, uniName, uniLocation, uniId, admOpen)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
                    >
                        <Eye size={14} /> Details
                    </button>
                    {appStatus ? (
                        <div className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm ${
                            appStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            appStatus === 'rejected' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}>
                            <CheckCircle2 size={14} />
                            {appStatus.charAt(0).toUpperCase() + appStatus.slice(1)}
                        </div>
                    ) : (
                        <button
                            disabled={!admOpen}
                            onClick={() => admOpen && onApply(prog, uniId)}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                !admOpen
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20'
                            }`}
                        >
                            {!admOpen ? <><Lock size={13} /> Closed</> : <>Apply <ChevronRight size={13} /></>}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ── Program Details Modal ──
const ProgramDetailsModal = ({ prog, uniName, uniLocation, uniId, isOpen, onClose, onApply }) => {
    if (!prog) return null;
    const admOpen = isOpen !== false;
    const hasScholarship = prog.scholarships && prog.scholarships.length > 0;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />
                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 24 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
                >
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20 border-2 border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
                                <GraduationCap size={32} className="text-cyan-600 dark:text-cyan-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                        {prog.degreeType || 'Degree'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                        admOpen ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                        {admOpen ? 'Admissions Open' : 'Admissions Closed'}
                                    </span>
                                    {hasScholarship && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                                            <Award size={10} /> Scholarship
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                    {prog.title || 'Untitled Program'}
                                </h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-500 transition-all ml-4 flex-shrink-0">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">

                        {/* University */}
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <Building2 size={18} className="text-indigo-400 flex-shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">University</p>
                                <p className="font-bold text-slate-800 dark:text-white">{uniName}</p>
                                {uniLocation && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{uniLocation}</p>}
                            </div>
                        </div>

                        {/* Key stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { icon: <Layers size={16} />, label: 'Degree Type', val: prog.degreeType || 'N/A' },
                                { icon: <Clock size={16} />, label: 'Duration', val: prog.duration || 'N/A' },
                                { icon: <FileText size={16} />, label: 'Semesters', val: prog.totalSemesters ? `${prog.totalSemesters} Semesters` : 'N/A' },
                                { icon: <DollarSign size={16} />, label: 'Fee / Semester', val: prog.estimatedFee || 'N/A' },
                            ].map((item, i) => (
                                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{item.icon}{item.label}</div>
                                    <p className="font-bold text-slate-800 dark:text-white text-sm">{item.val}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {prog.description && (
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen size={15} className="text-cyan-500" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Program Overview</p>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{prog.description}</p>
                            </div>
                        )}

                        {/* Scholarships */}
                        {hasScholarship && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Award size={16} className="text-amber-500" />
                                    <p className="font-black text-slate-800 dark:text-white">Scholarship Opportunities</p>
                                    <span className="ml-auto text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                                        {prog.scholarships.length} available
                                    </span>
                                </div>
                                <div className="space-y-2.5">
                                    {prog.scholarships.map((s, i) => (
                                        <div key={i} className="p-4 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">{s.criteriaTitle || 'Merit Scholarship'}</p>
                                                    {s.minPercentage && (
                                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                                            Minimum: <span className="font-black">{s.minPercentage}%</span> marks required
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-black text-sm shadow-md">
                                                    {s.grantPercentage}{String(s.grantPercentage).includes('%') ? '' : '%'} Off
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer CTA */}
                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => { onClose(); onApply(prog, uniId); }}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                !admOpen
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25'
                            }`}
                            disabled={!admOpen}
                        >
                            <ExternalLink size={15} />
                            {admOpen ? 'View University & Apply' : 'Admissions Closed'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default function StudentPrograms() {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();

    const {
        progSearch: search,
        setProgSearch: setSearch,
        progDegreeFilter: degreeFilter,
        setProgDegreeFilter: setDegreeFilter,
        progDurationFilter: durationFilter,
        setProgDurationFilter: setDurationFilter,
        progStatusFilter: statusFilter,
        setProgStatusFilter: setStatusFilter,
        progShowFilters: showFilters,
        setProgShowFilters: setShowFilters,
        programsCache,
        setProgramsCache,
        applicationsCache,
        setApplicationsCache
    } = useStudentState();

    const programs = programsCache || [];
    const applications = applicationsCache || {};
    const [loading, setLoading] = useState(true);
    const [detailModal, setDetailModal] = useState(null); // { prog, uniName, uniLocation, uniId, isOpen }
    const [studentCoords, setStudentCoords] = useState(null);

    // Fetch browser GPS dynamically in real-time when student lands on the page
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setStudentCoords({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Student GPS access denied/failed. Falling back to city text match.", error);
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    const handleViewDetails = (prog, uniName, uniLocation, uniId, isOpen) => {
        setDetailModal({ prog, uniName, uniLocation, uniId, isOpen });
    };

    useEffect(() => {
        if (programsCache && applicationsCache) {
            setLoading(false);
            return;
        }

        const fetchAll = async () => {
            try {
                // Fetch ALL universities & reviews in parallel for accurate rating scoring
                const [uniSnap, reviewsSnap] = await Promise.all([
                    getDocs(query(collection(db, 'users'), where('role', '==', 'university_manager'))),
                    getDocs(collection(db, 'reviews'))
                ]);

                const reviewsByUni = {};
                reviewsSnap.docs.forEach(d => {
                    const r = d.data();
                    if (r.universityId) {
                        if (!reviewsByUni[r.universityId]) reviewsByUni[r.universityId] = [];
                        reviewsByUni[r.universityId].push(r);
                    }
                });

                const unis = {};
                uniSnap.docs.forEach(d => {
                    const uData = d.data();
                    const uReviews = reviewsByUni[d.id] || [];
                    const avgRating = uReviews.length > 0
                        ? (uReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / uReviews.length).toFixed(1)
                        : null;

                    unis[d.id] = {
                        ...uData,
                        id: d.id,
                        calculatedRating: avgRating,
                        reviewCount: uReviews.length
                    };
                });

                // Fetch ALL programs from degrees collection
                const degSnap = await getDocs(collection(db, 'degrees'));
                const progs = degSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    uniData: unis[d.data().universityId] || null,
                }));

                // Fetch student's applications (correct collection: 'admissions')
                let appMap = {};
                if (currentUser) {
                    const appSnap = await getDocs(query(
                        collection(db, 'admissions'),
                        where('studentId', '==', currentUser.uid)
                    ));
                    appSnap.docs.forEach(d => { appMap[d.data().programId] = d.data().status; });
                }

                setProgramsCache(progs);
                setApplicationsCache(appMap);
            } catch (e) {
                console.error('Programs fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [currentUser, programsCache, applicationsCache, setProgramsCache, setApplicationsCache]);

    const filtered = useMemo(() => {
        return programs.filter(p => {
            const name = (p.title || p.programName || p.name || '').toLowerCase();
            const uni  = (p.uniData?.universityName || p.universityName || '').toLowerCase();
            const loc  = (p.uniData?.location || '').toLowerCase();
            const isOpen = p.uniData?.isAdmissionOpen !== false;

            if (search && !name.includes(search.toLowerCase()) && !uni.includes(search.toLowerCase()) && !loc.includes(search.toLowerCase())) return false;
            if (degreeFilter !== 'All' && p.degreeType !== degreeFilter) return false;
            if (statusFilter === 'open' && !isOpen) return false;
            if (statusFilter === 'closed' && isOpen) return false;
            return true;
        });
    }, [programs, search, degreeFilter, durationFilter, statusFilter]);

    // ── Recommendation Engine ──────────────────────────────────────────────────
    const recommendedPrograms = useMemo(() => {
        if (!userProfile?.interest) return [];
        const studentCity = userProfile?.city || '';
        return programs
            .map(p => {
                const { score, isInterestMatch, isLocalMatch } = getProgramScore(p, userProfile, studentCoords);
                const isSameCity = (studentCity && isLocationMatch(p.uniData?.location, studentCity)) || isLocalMatch;
                return { ...p, _score: score, _isInterestMatch: isInterestMatch, _isLocalMatch: isLocalMatch, _isSameCity: isSameCity };
            })
            .filter(p => p._isInterestMatch && (p._isSameCity || p._score >= RECOMMENDATION_THRESHOLD))
            .sort((a, b) => {
                const aLocal = a._isSameCity ? 1 : 0;
                const bLocal = b._isSameCity ? 1 : 0;
                if (bLocal !== aLocal) return bLocal - aLocal;
                return b._score - a._score;
            })
            .slice(0, 8);
    }, [programs, userProfile, studentCoords]);

    const activeFilters = [degreeFilter !== 'All', durationFilter !== 'All', statusFilter !== 'all'].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050a18] pb-16">

            {/* ── Hero Header ── */}
            <div className="relative overflow-hidden px-4 pt-10 pb-8 mb-2">
                <div className="pointer-events-none absolute -top-20 left-1/3 w-[500px] h-[400px] bg-cyan-400/10 dark:bg-cyan-500/5 rounded-full blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-10 right-1/4 w-[400px] h-[300px] bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-[80px]" />

                <div className="relative max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-widest mb-4"
                    >
                        <Sparkles size={12} className="animate-pulse" /> Verified Programs
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3"
                    >
                        Explore{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600">
                            Programs
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                        className="text-slate-500 dark:text-slate-400 text-base max-w-xl mx-auto"
                    >
                        Browse all verified degree programs across Pakistan's top universities
                    </motion.p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4">

                {/* ── Search + Filter Bar ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="sticky top-4 z-20 mb-6"
                >
                    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 flex items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search programs, universities, cities..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500 transition-colors"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={15} />
                                </button>
                            )}
                        </div>

                        {/* Filter toggle */}
                        <button
                            onClick={() => setShowFilters(f => !f)}
                            className={`relative flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border transition-all ${
                                showFilters || activeFilters > 0
                                    ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/25'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                            }`}
                        >
                            <SlidersHorizontal size={16} />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFilters > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-cyan-600 text-[10px] font-black flex items-center justify-center shadow">
                                    {activeFilters}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Expanded filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap gap-4">
                                    {/* Degree Type */}
                                    <div className="flex-1 min-w-[160px]">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Degree Type</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {DEGREE_TYPES.map(d => (
                                                <button key={d} onClick={() => setDegreeFilter(d)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                        degreeFilter === d
                                                            ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                                                    }`}>
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="min-w-[140px]">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Status</label>
                                        <div className="flex gap-1.5">
                                            {[['all','All'],['open','Open'],['closed','Closed']].map(([v, l]) => (
                                                <button key={v} onClick={() => setStatusFilter(v)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                        statusFilter === v
                                                            ? 'bg-cyan-500 text-white border-cyan-500'
                                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                                                    }`}>
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reset */}
                                    {activeFilters > 0 && (
                                        <button
                                            onClick={() => { setDegreeFilter('All'); setDurationFilter('All'); setStatusFilter('all'); }}
                                            className="self-end flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <X size={12} /> Reset
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* ── Results count ── */}
                {!loading && (
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-black text-slate-800 dark:text-white">{filtered.length}</span> programs found
                            {search && <span> for "<span className="text-cyan-600 dark:text-cyan-400 font-semibold">{search}</span>"</span>}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <BookOpen size={13} />
                            {programs.length} total programs
                        </div>
                    </div>
                )}

                {/* ── Recommended for You Spotlight ── */}
                {!loading && recommendedPrograms.length > 0 && !search && (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        {/* Section heading */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/25 dark:border-cyan-500/20">
                                <Brain size={15} className="text-cyan-500" />
                                <span className="text-sm font-black text-slate-800 dark:text-white">Recommended Programs</span>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
                            {userProfile?.interest && (
                                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                                    Matched to <span className="text-cyan-500 font-semibold">{userProfile.interest}</span>
                                </span>
                            )}
                        </div>

                        {/* Horizontal scroll strip */}
                        <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar">
                            {recommendedPrograms.map((prog) => {
                                const uniName = prog.uniData?.universityName || prog.universityName || 'Unknown University';
                                const uniLocation = prog.uniData?.location || '';
                                return (
                                    <motion.div
                                        key={prog.id}
                                        whileHover={{ y: -4, scale: 1.02 }}
                                        className="flex-shrink-0 w-72 relative bg-white dark:bg-slate-900 border border-cyan-400/40 dark:border-cyan-500/30 rounded-2xl overflow-hidden shadow-lg shadow-cyan-500/10 cursor-pointer"
                                        onClick={() => navigate(`/university/${prog.universityId}`)}
                                    >
                                        {/* Top gradient bar */}
                                        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />

                                        <div className="p-4">
                                            {/* Match Header */}
                                            <div className="flex items-center justify-end mb-3">
                                                {prog._isLocalMatch && (
                                                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase px-2 py-1 rounded-full border border-emerald-500/20">
                                                        <Navigation size={8} />
                                                        {userProfile.city}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Degree type */}
                                            <p className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">
                                                {prog.degreeType || 'Degree'} · Program
                                            </p>

                                            {/* Program title */}
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 mb-2 leading-tight">
                                                {prog.title || prog.programName || 'Untitled'}
                                            </h4>

                                            {/* University */}
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                <Building2 size={11} className="text-indigo-400 flex-shrink-0" />
                                                <span className="truncate">{uniName}</span>
                                                {uniLocation && (
                                                    <>
                                                        <span className="text-slate-300 dark:text-slate-700">·</span>
                                                        <MapPin size={10} className="flex-shrink-0" />
                                                        <span className="truncate">{uniLocation}</span>
                                                    </>
                                                )}
                                            </div>

                                            {/* Fee chip */}
                                            {prog.estimatedFee && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-2 py-1 rounded-lg">
                                                    <DollarSign size={9} /> {prog.estimatedFee}/sem
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.section>
                )}

                {/* ── Grid ── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array(8).fill(0).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 animate-pulse">
                                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                                <div className="space-y-2">
                                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full w-1/3" />
                                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4" />
                                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                    <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                </div>
                                <div className="h-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-28 text-center">
                        <SearchX size={64} strokeWidth={1} className="text-slate-300 dark:text-slate-700 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Programs Found</h3>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6 max-w-xs">
                            No programs match your current filters. Try adjusting your search.
                        </p>
                        <button
                            onClick={() => { setSearch(''); setDegreeFilter('All'); setDurationFilter('All'); setStatusFilter('all'); }}
                            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-all"
                        >
                            Clear All Filters
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map((prog, i) => (
                            <ProgramCard
                                key={prog.id}
                                prog={prog}
                                uniName={prog.uniData?.universityName || prog.universityName || 'Unknown University'}
                                uniLocation={prog.uniData?.location || ''}
                                uniId={prog.universityId}
                                isOpen={prog.uniData?.isAdmissionOpen}
                                appStatus={applications[prog.id]}
                                onViewDetails={handleViewDetails}
                                onApply={(p, uid) => navigate(`/university/${uid}`)}
                                index={i}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {detailModal && (
                <ProgramDetailsModal
                    prog={detailModal.prog}
                    uniName={detailModal.uniName}
                    uniLocation={detailModal.uniLocation}
                    uniId={detailModal.uniId}
                    isOpen={detailModal.isOpen}
                    onClose={() => setDetailModal(null)}
                    onApply={(p, uid) => navigate(`/university/${uid}`)}
                />
            )}
        </div>
    );
}
