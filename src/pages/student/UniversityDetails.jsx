import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    doc, getDoc, setDoc, collection, query, where, getDocs,
    orderBy, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Globe, Mail, Phone, BookOpen,
    Users, ArrowLeft, ExternalLink, Star, GraduationCap,
    Building2, Info, Loader2, Clock, CheckCircle2, AlertCircle,
    ChevronRight, Send, MessageCircle, Image as ImageIcon, Sparkles,
    Bus, Search, Linkedin, Instagram
} from 'lucide-react';
import ApplyModal from './ApplyModal';
import UserProfileDisplay from '../../components/UserProfileDisplay';
import ProgramCard from '../../components/ProgramCard';
import UserProfileModal from '../../components/UserProfileModal';
import { isScholarshipEligible } from '../../utils/scholarshipUtils';

const UniversityDetails = () => {
    const { id } = useParams();
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();

    const [university, setUniversity] = useState(null);
    const [degrees, setDegrees] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [transport, setTransport] = useState([]);
    const [myApplications, setMyApplications] = useState({});
    const [reviews, setReviews] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Search States for new tabs
    const [facultySearch, setFacultySearch] = useState('');
    const [transportSearch, setTransportSearch] = useState('');

    const [selectedProgram, setSelectedProgram] = useState(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [reviewers, setReviewers] = useState({});
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null });

    // Review form state
    const [myExistingReview, setMyExistingReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);

            const uniSnap = await getDoc(doc(db, 'users', id));
            if (!uniSnap.exists()) {
                setError("University not found");
                return;
            }
            const uniData = { id: uniSnap.id, ...uniSnap.data() };
            setUniversity(uniData);

            // Fetch Degrees
            const degreesQ = query(collection(db, 'degrees'), where('universityId', '==', id));
            const degreesSnap = await getDocs(degreesQ);
            const degreesData = degreesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDegrees(degreesData);

            // Fetch Faculty
            const facultyQ = query(collection(db, 'faculty'), where('universityId', '==', id));
            const facultySnap = await getDocs(facultyQ);
            const facultyData = facultySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFaculty(facultyData);

            // Fetch Transport
            const transportQ = query(collection(db, 'transport'), where('universityId', '==', id));
            const transportSnap = await getDocs(transportQ);
            const transportData = transportSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransport(transportData);

            if (currentUser) {
                const admissionsQ = query(
                    collection(db, 'admissions'),
                    where('universityId', '==', id),
                    where('studentId', '==', currentUser.uid)
                );
                const admissionsSnap = await getDocs(admissionsQ);
                const appsMap = {};
                admissionsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    appsMap[data.programId] = data.status;
                });
                setMyApplications(appsMap);

                // Check if user already reviewed this university
                const myReviewQ = query(
                    collection(db, 'reviews'),
                    where('universityId', '==', id),
                    where('studentId', '==', currentUser.uid)
                );
                const myReviewSnap = await getDocs(myReviewQ);
                if (!myReviewSnap.empty) {
                    const reviewDoc = myReviewSnap.docs[0];
                    setMyExistingReview({ id: reviewDoc.id, ...reviewDoc.data() });
                }
            }

            const reviewsQ = query(
                collection(db, 'reviews'),
                where('universityId', '==', id),
                orderBy('createdAt', 'desc')
            );
            const reviewsSnap = await getDocs(reviewsQ);
            const reviewsData = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReviews(reviewsData);

            // Fetch Reviewer Profiles
            const reviewerIds = [...new Set(reviewsData.map(r => r.studentId).filter(Boolean))];
            if (reviewerIds.length > 0) {
                const usersQ = query(collection(db, 'users'), where('__name__', 'in', reviewerIds.slice(0, 10))); // Limit to 10 for safety
                const usersSnap = await getDocs(usersQ);
                const usersMap = {};
                usersSnap.docs.forEach(doc => {
                    usersMap[doc.id] = { id: doc.id, ...doc.data() };
                });
                setReviewers(usersMap);
            }

        } catch (err) {
            console.error("Error fetching university:", err);
            setError("Failed to load university data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchData();
    }, [id, currentUser]);

    // Computed Values
    const averageRating = useMemo(() => {
        if (reviews.length === 0) return null;
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return (sum / reviews.length).toFixed(1);
    }, [reviews]);

    const filteredFaculty = faculty.filter(f =>
        f.fullName?.toLowerCase().includes(facultySearch.toLowerCase()) ||
        f.designation?.toLowerCase().includes(facultySearch.toLowerCase()) ||
        f.expertise?.some(e => e.toLowerCase().includes(facultySearch.toLowerCase()))
    );

    const filteredTransport = transport.filter(t =>
        t.route?.name?.toLowerCase().includes(transportSearch.toLowerCase()) ||
        t.vehicle?.number?.toLowerCase().includes(transportSearch.toLowerCase()) ||
        t.stops?.some(s => s.toLowerCase().includes(transportSearch.toLowerCase()))
    );

    // Submit new review
    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!currentUser || !reviewForm.comment.trim()) return;

        setIsSubmittingReview(true);
        try {
            await addDoc(collection(db, 'reviews'), {
                universityId: id,
                studentId: currentUser.uid,
                rating: reviewForm.rating,
                comment: reviewForm.comment.trim(),
                createdAt: serverTimestamp()
            });

            await fetchData();
            setReviewForm({ rating: 5, comment: '' });
        } catch (err) {
            console.error("Error submitting review:", err);
            alert("Failed to submit review");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#020204] flex flex-col items-center justify-center gap-4 transition-colors">
                <Loader2 size={48} className="animate-spin text-cyan-500" />
                <p className="text-slate-500 dark:text-slate-400 animate-pulse">Loading University...</p>
            </div>
        );
    }

    if (error || !university) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#020204] flex flex-col items-center justify-center p-6 text-center gap-6 transition-colors">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/20">
                    <AlertCircle size={40} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">University Not Found</h2>
                <p className="text-slate-500 max-w-md">{error || "The university doesn't exist."}</p>
                <button
                    onClick={() => navigate('/student/find-university')}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl transition-all"
                >
                    <ArrowLeft size={18} />
                    Back to Directory
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020204] text-slate-800 dark:text-white transition-colors">
            {/* Hero Header */}
            <header className="relative bg-gradient-to-b from-cyan-100/50 dark:from-cyan-900/20 to-transparent border-b border-slate-200 dark:border-white/5">
                <div className="container mx-auto px-6 py-8">
                    <button
                        onClick={() => navigate('/student/find-university')}
                        className="flex items-center gap-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mb-6 text-sm"
                    >
                        <ArrowLeft size={16} />
                        Back to Universities
                    </button>

                    <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* University Profile Picture */}
                        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                            {university.profilePic || university.photoURL ? (
                                <img
                                    src={university.profilePic || university.photoURL}
                                    alt="Logo"
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Building2 size={40} className="text-cyan-500" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                {averageRating && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-full">
                                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-semibold text-yellow-700 dark:text-white">{averageRating}</span>
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">({reviews.length})</span>
                                    </div>
                                )}
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3 break-words">
                                {university.universityName}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-cyan-500" />
                                    <span>{university.location || 'Location N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <GraduationCap size={16} className="text-purple-500" />
                                    <span>{degrees.length} Programs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={16} className="text-blue-500" />
                                    <span>{faculty.length} Faculty</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Bus size={16} className="text-emerald-500" />
                                    <span>{transport.length} Routes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#020204]/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/5">
                <div className="container mx-auto px-6">
                    <div className="flex gap-8 overflow-x-auto no-scrollbar">
                        {['overview', 'programs', 'faculty', 'transport', 'scholarships', 'reviews'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 text-sm font-semibold capitalize transition-all relative whitespace-nowrap ${activeTab === tab
                                    ? 'text-cyan-600 dark:text-cyan-400'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                            >
                                {tab === 'programs' ? 'Academic Programs' : tab}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 rounded-full"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-2 space-y-8">
                        <AnimatePresence mode="wait">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-8"
                                >
                                    {/* About Section */}
                                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Info size={20} className="text-cyan-500" />
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">About</h3>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                                            {university.description || "A premier institution committed to academic excellence."}
                                        </p>
                                    </div>

                                    {/* Infrastructure Gallery */}
                                    {university.infrastructureImages && university.infrastructureImages.length > 0 && (
                                        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                                <ImageIcon size={20} className="text-purple-500" />
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Campus & Infrastructure</h3>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {university.infrastructureImages.map((img, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        whileHover={{ scale: 1.02 }}
                                                        className="aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5"
                                                    >
                                                        <img
                                                            src={img}
                                                            alt={`Campus ${idx + 1}`}
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Programs Tab */}
                            {activeTab === 'programs' && (
                                <motion.div
                                    key="programs"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Available Programs</h3>
                                        <span className="text-sm text-slate-500">{degrees.length} programs</span>
                                    </div>

                                    {degrees.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                            <BookOpen className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                                            <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Admissions Opening Soon</h4>
                                            <p className="text-slate-500">No programs available at this time.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {degrees.map((degree, index) => (
                                                <ProgramCard
                                                    key={degree.id}
                                                    program={degree}
                                                    studentProfile={userProfile}
                                                    myApplicationStatus={myApplications[degree.id]}
                                                    index={index}
                                                    onApply={(p) => {
                                                        setSelectedProgram(p);
                                                        setIsApplyModalOpen(true);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Faculty Tab */}
                            {activeTab === 'faculty' && (
                                <motion.div
                                    key="faculty"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Distinguished Faculty</h3>
                                            <p className="text-sm text-slate-500">Meet the professors and researchers ({filteredFaculty.length} members)</p>
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search faculty..."
                                                value={facultySearch}
                                                onChange={(e) => setFacultySearch(e.target.value)}
                                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {filteredFaculty.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                            <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                                            <p className="text-slate-500">No faculty members found.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-6">
                                            {filteredFaculty.map((member) => (
                                                <div key={member.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/30 hover:shadow-xl">
                                                    {/* Header with Photo and Basic Info */}
                                                    <div className="p-6 flex flex-col md:flex-row gap-6">
                                                        <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex-shrink-0 border-2 border-indigo-200 dark:border-indigo-500/30 shadow-lg">
                                                            {member.profilePic ? (
                                                                <img
                                                                    src={member.profilePic}
                                                                    alt={member.fullName}
                                                                    className="w-full h-full object-cover"
                                                                    crossOrigin="anonymous"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-3xl">
                                                                    {member.fullName?.[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{member.fullName}</h4>
                                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mb-3">{member.designation}</p>
                                                            {member.bio && (
                                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic border-l-2 border-indigo-300 dark:border-indigo-600 pl-3 mb-4">
                                                                    "{member.bio}"
                                                                </p>
                                                            )}

                                                            {/* Contact Info */}
                                                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                                                {member.socials?.email && (
                                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                                        <Mail size={14} className="text-indigo-500" />
                                                                        <span>{member.socials.email}</span>
                                                                    </div>
                                                                )}
                                                                {member.socials?.linkedin && (
                                                                    <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                                                        <Linkedin size={14} />
                                                                        <span>LinkedIn</span>
                                                                    </a>
                                                                )}
                                                                {member.socials?.instagram && (
                                                                    <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-pink-600 hover:underline">
                                                                        <Instagram size={14} />
                                                                        <span>Instagram</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details Sections */}
                                                    <div className="bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        {/* Expertise */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <Sparkles size={14} className="text-amber-500" />
                                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expertise</h5>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {member.expertise && member.expertise.length > 0 ? member.expertise.map((tag, i) => (
                                                                    <span key={i} className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md font-medium">
                                                                        #{tag}
                                                                    </span>
                                                                )) : (
                                                                    <span className="text-xs text-slate-400 italic">Not specified</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Education */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <GraduationCap size={14} className="text-purple-500" />
                                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Education</h5>
                                                            </div>
                                                            <ul className="space-y-1.5">
                                                                {member.education && member.education.length > 0 ? member.education.map((edu, i) => (
                                                                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                                        <span className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 flex-shrink-0"></span>
                                                                        {edu}
                                                                    </li>
                                                                )) : (
                                                                    <li className="text-xs text-slate-400 italic">Not specified</li>
                                                                )}
                                                            </ul>
                                                        </div>

                                                        {/* Courses Taught */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <BookOpen size={14} className="text-cyan-500" />
                                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Courses Taught</h5>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {member.courses && member.courses.length > 0 ? member.courses.map((course, i) => (
                                                                    <span key={i} className="text-xs px-2 py-1 bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 rounded-md font-medium">
                                                                        {course}
                                                                    </span>
                                                                )) : (
                                                                    <span className="text-xs text-slate-400 italic">Not specified</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Transport Tab */}
                            {activeTab === 'transport' && (
                                <motion.div
                                    key="transport"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">University Transport</h3>
                                            <p className="text-sm text-slate-500">Routes and schedules ({filteredTransport.length} routes)</p>
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search routes..."
                                                value={transportSearch}
                                                onChange={(e) => setTransportSearch(e.target.value)}
                                                className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {filteredTransport.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                            <Bus className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                                            <p className="text-slate-500">No transport options found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {filteredTransport.map((item) => (
                                                <div key={item.id} className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-emerald-500/30 hover:shadow-xl transition-all">
                                                    {/* Images Gallery */}
                                                    {item.vehicleImages && item.vehicleImages.length > 0 && (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 h-48">
                                                            {item.vehicleImages.slice(0, 4).map((img, idx) => (
                                                                <div key={idx} className={`relative overflow-hidden ${idx === 0 && item.vehicleImages.length === 1 ? 'col-span-2 md:col-span-4' : ''}`}>
                                                                    <img
                                                                        src={img}
                                                                        alt={`Vehicle ${idx + 1}`}
                                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                                        crossOrigin="anonymous"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {(!item.vehicleImages || item.vehicleImages.length === 0) && (
                                                        <div className="h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                            <Bus size={48} className="text-slate-300 dark:text-slate-600" />
                                                        </div>
                                                    )}

                                                    {/* Content */}
                                                    <div className="p-6">
                                                        {/* Header with Route Name and Vehicle Badge */}
                                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                                            <div>
                                                                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{item.route?.name}</h4>
                                                                <div className="flex flex-wrap gap-2 text-xs">
                                                                    <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md font-bold">
                                                                        {item.vehicle?.number}
                                                                    </span>
                                                                    {item.vehicle?.model && (
                                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-md">
                                                                            {item.vehicle.model}
                                                                        </span>
                                                                    )}
                                                                    {item.vehicle?.capacity && (
                                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-md flex items-center gap-1">
                                                                            <Users size={10} /> {item.vehicle.capacity}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Schedule & Route */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            {/* Time Schedule */}
                                                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Schedule</div>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="text-center">
                                                                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{item.route?.departureTime || '--:--'}</div>
                                                                        <div className="text-[10px] text-slate-500 uppercase">Departure</div>
                                                                    </div>
                                                                    <div className="flex-1 px-4">
                                                                        <div className="h-px bg-gradient-to-r from-emerald-400 to-red-400 relative">
                                                                            <Bus size={12} className="absolute left-1/2 -translate-x-1/2 -top-1.5 text-slate-500 bg-slate-50 dark:bg-slate-800" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="text-lg font-bold text-red-500 dark:text-red-400">{item.route?.arrivalTime || '--:--'}</div>
                                                                        <div className="text-[10px] text-slate-500 uppercase">Arrival</div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Route Points */}
                                                            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Route</div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.route?.start}</div>
                                                                        <div className="text-[10px] text-slate-400">Start Point</div>
                                                                    </div>
                                                                    <ChevronRight size={20} className="text-slate-400" />
                                                                    <div className="flex-1 text-right">
                                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.route?.end}</div>
                                                                        <div className="text-[10px] text-slate-400">End Point</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* All Stops */}
                                                        {item.stops && item.stops.length > 0 && (
                                                            <div className="mb-4">
                                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                    <MapPin size={12} /> All Stops ({item.stops.length})
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {item.stops.map((stop, i) => (
                                                                        <span key={i} className="text-xs px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400 shadow-sm">
                                                                            {stop}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Contact Information - Visible Phone Numbers */}
                                                        <div className="bg-gradient-to-r from-slate-50 to-amber-50/50 dark:from-white/5 dark:to-amber-500/5 border border-slate-100 dark:border-white/5 rounded-xl p-4">
                                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                <Phone size={12} /> Contact Information
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {/* Driver Info */}
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                                        <Users size={18} className="text-emerald-600" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-[10px] text-slate-400 uppercase">Driver</div>
                                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.driver?.name || 'N/A'}</div>
                                                                        {item.driver?.phone && (
                                                                            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                                                <Phone size={12} /> {item.driver.phone}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Manager Info */}
                                                                {item.managerPhone && (
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                                                                            <Phone size={18} className="text-amber-600" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-[10px] text-slate-400 uppercase">Transport Manager</div>
                                                                            <div className="text-sm text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                                                                <Phone size={12} /> {item.managerPhone}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Scholarships Tab */}
                            {activeTab === 'scholarships' && (
                                <motion.div
                                    key="scholarships"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <Sparkles size={24} className="text-yellow-500" />
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scholarships & Grants</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Available financial aid opportunities based on academic merit.</p>
                                            </div>
                                        </div>

                                        {degrees.flatMap(p => p.scholarships || []).length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-white/5">
                                                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Program</th>
                                                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Criteria</th>
                                                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Required %</th>
                                                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Grant</th>
                                                            <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                        {degrees.flatMap(p => (p.scholarships || []).map(s => ({ ...s, programTitle: p.title || p.programName })))
                                                            .sort((a, b) => parseFloat(b.grantPercentage) - parseFloat(a.grantPercentage))
                                                            .map((s, idx) => {

                                                                const isEligible = isScholarshipEligible(s, userProfile);
                                                                return (
                                                                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                                        <td className="py-4 px-4">
                                                                            <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                                                {s.programTitle}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-4">
                                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                                                {s.criteriaTitle}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-4 px-4">
                                                                            <div className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                                {s.minPercentage}%
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-4">
                                                                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                                                                                {s.grantPercentage}% Off
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-4 text-right">
                                                                            {isEligible ? (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                                                                                    <CheckCircle2 size={14} /> Eligible
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 px-3 py-1.5">
                                                                                    Not Eligible
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 flex flex-col items-center">
                                                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                                                    <Sparkles size={32} className="text-slate-400" />
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Scholarships Added</h4>
                                                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                                    This university has not listed any scholarship criteria for its programs yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Reviews Tab */}
                            {activeTab === 'reviews' && (
                                <motion.div
                                    key="reviews"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {/* Rating Summary */}
                                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Student Reviews</h3>
                                            <p className="text-slate-500 text-sm">Feedback from verified students</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-slate-900 dark:text-white">{averageRating || 'N/A'}</div>
                                                <div className="text-xs text-cyan-600 dark:text-cyan-400">Rating</div>
                                            </div>
                                            <div className="w-px h-10 bg-slate-200 dark:bg-white/10" />
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-slate-900 dark:text-white">{reviews.length}</div>
                                                <div className="text-xs text-purple-600 dark:text-purple-400">Reviews</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Write Review Section */}
                                    {currentUser && (
                                        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                            {myExistingReview ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                        <CheckCircle2 size={20} />
                                                        <span className="font-semibold">You have already rated this university</span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="flex gap-0.5">
                                                                {[1, 2, 3, 4, 5].map((i) => (
                                                                    <Star key={i} size={14} className={i <= myExistingReview.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 dark:text-slate-700'} />
                                                                ))}
                                                            </div>
                                                            <span className="text-sm text-slate-500">Your rating</span>
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 text-sm">{myExistingReview.comment}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <form onSubmit={handleSubmitReview} className="space-y-4">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white">Write a Review</h4>

                                                    <div>
                                                        <label className="text-sm text-slate-500 mb-2 block">Your Rating</label>
                                                        <div className="flex gap-2">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    type="button"
                                                                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                                                    className="p-1 hover:scale-110 transition-transform"
                                                                >
                                                                    <Star
                                                                        size={24}
                                                                        className={star <= reviewForm.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 dark:text-slate-600'}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm text-slate-500 mb-2 block">Your Comment</label>
                                                        <textarea
                                                            value={reviewForm.comment}
                                                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                                            placeholder="Share your experience..."
                                                            rows={3}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                                                            required
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={isSubmittingReview || !reviewForm.comment.trim()}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
                                                    >
                                                        {isSubmittingReview ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                                        Submit Review
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    )}

                                    {/* Reviews List */}
                                    {reviews.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                            <Star className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                                            <p className="text-slate-500">No reviews yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {reviews.map((review) => {
                                                const reviewer = reviewers[review.studentId] || {};
                                                return (
                                                    <div key={review.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <motion.div
                                                                    whileHover={{ scale: 1.1 }}
                                                                    onClick={() => setProfileModal({ isOpen: true, userId: review.studentId })}
                                                                    className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 cursor-pointer border-2 border-white dark:border-slate-600 shadow-sm"
                                                                >
                                                                    {reviewer.profilePic || reviewer.photoURL ? (
                                                                        <img
                                                                            src={reviewer.profilePic || reviewer.photoURL}
                                                                            alt="User"
                                                                            className="w-full h-full object-cover"
                                                                            crossOrigin="anonymous"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold text-sm">
                                                                            {reviewer.fullName ? reviewer.fullName[0].toUpperCase() : 'U'}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                                <div>
                                                                    <h5
                                                                        onClick={() => setProfileModal({ isOpen: true, userId: review.studentId })}
                                                                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:underline decoration-cyan-500 decoration-2 underline-offset-2"
                                                                    >
                                                                        {reviewer.fullName || 'Student'}
                                                                    </h5>
                                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                        <span>{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Rating stars display */}
                                                            <div className="flex gap-0.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                                                {[1, 2, 3, 4, 5].map((star) => (
                                                                    <Star
                                                                        key={star}
                                                                        size={12}
                                                                        className={star <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 dark:text-slate-700'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-[3.25rem]">
                                                            {review.comment}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                            <UserProfileModal
                                isOpen={profileModal.isOpen}
                                onClose={() => setProfileModal({ isOpen: false, userId: null })}
                                userId={profileModal.userId}
                                readOnly={currentUser?.role === 'admin'}
                                hideChatButton={currentUser?.role === 'admin'}
                            />
                        </AnimatePresence>
                    </div>

                    {/* RIGHT COLUMN - Sticky Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-cyan-200 dark:border-cyan-500/20">
                                        <Building2 size={24} className="text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Connect Center</h3>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase">Email</label>
                                        <div className="flex items-center gap-3 mt-1 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                            <Mail size={16} className="text-slate-400 flex-shrink-0" />
                                            <span className="text-slate-800 dark:text-white text-sm break-all">{university.email || 'contact@university.edu'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase">Phone</label>
                                        <div className="flex items-center gap-3 mt-1 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                            <Phone size={16} className="text-slate-400 flex-shrink-0" />
                                            <span className="text-slate-800 dark:text-white text-sm">{university.phone || '+92 51 000 0000'}</span>
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={university.website || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full mt-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-cyan-600 dark:hover:bg-cyan-400 transition-all"
                                >
                                    Visit Website
                                    <ExternalLink size={16} />
                                </a>

                                {/* Message University Button */}
                                {currentUser && (
                                    <button
                                        onClick={async () => {
                                            const chatId = [currentUser.uid, id].sort().join('_');
                                            const chatRef = doc(db, 'chats', chatId);
                                            const chatSnap = await getDoc(chatRef);

                                            if (!chatSnap.exists()) {
                                                await setDoc(chatRef, {
                                                    participants: [currentUser.uid, id],
                                                    lastMessage: '',
                                                    lastMessageTime: serverTimestamp(),
                                                    unreadCount: {
                                                        [currentUser.uid]: 0,
                                                        [id]: 0
                                                    },
                                                    createdAt: serverTimestamp()
                                                });
                                            }
                                            navigate(`/messages/${chatId}`);
                                        }}
                                        className="flex items-center justify-center gap-2 w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
                                    >
                                        <MessageCircle size={18} />
                                        Message University
                                    </button>
                                )}
                            </div>

                            <div className="bg-cyan-50 dark:bg-cyan-500/5 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl p-5">
                                <div className="flex items-start gap-3">
                                    <Info size={18} className="text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">Secure Applications</h4>
                                        <p className="text-xs text-slate-500">All documents are encrypted during the admission process.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ApplyModal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                university={university}
                program={selectedProgram}
                studentId={currentUser?.uid}
                onApplySuccess={fetchData}
            />
        </div>
    );
};

export default UniversityDetails;
