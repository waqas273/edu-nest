import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Search, ArrowLeft, Trash2, Building,
    MessageSquare, AlertTriangle, Loader2, Sparkles, User
} from 'lucide-react';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import UserProfileModal from '../../components/UserProfileModal';

const UniversityRatings = () => {
    const [universities, setUniversities] = useState([]);
    const [loadingUni, setLoadingUni] = useState(true);
    const [selectedUni, setSelectedUni] = useState(null);

    // Reviews State
    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const [reviewers, setReviewers] = useState({});
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null });
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Universities on Load
    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setLoadingUni(true);
        try {
            // Fetch users with role 'university_manager' who have a universityName
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'university_manager')
            );
            const snapshot = await getDocs(q);
            const uniList = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(u => u.universityName); // Ensure valid university profile
            setUniversities(uniList);
        } catch (error) {
            console.error("Error fetching universities:", error);
            toast.error("Failed to load universities");
        } finally {
            setLoadingUni(false);
        }
    };

    const handleSelectUni = async (uni) => {
        setSelectedUni(uni);
        setLoadingReviews(true);
        try {
            const reviewsQ = query(
                collection(db, 'reviews'),
                where('universityId', '==', uni.id),
                orderBy('createdAt', 'desc')
            );
            const snap = await getDocs(reviewsQ);
            const reviewsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setReviews(reviewsData);

            // Fetch Reviewer Details
            const studentIds = [...new Set(reviewsData.map(r => r.studentId).filter(Boolean))];
            if (studentIds.length > 0) {
                // Fetch in batches or all (assuming manageable size for admin)
                // Using 'in' query for simplicity (max 10), but for scalability might need parallel requests
                // Loop through batches of 10
                const usersMap = {};
                for (let i = 0; i < studentIds.length; i += 10) {
                    const batch = studentIds.slice(i, i + 10);
                    const usersQ = query(collection(db, 'users'), where('__name__', 'in', batch));
                    const usersSnap = await getDocs(usersQ);
                    usersSnap.docs.forEach(doc => {
                        usersMap[doc.id] = { id: doc.id, ...doc.data() };
                    });
                }
                setReviewers(usersMap);
            }
        } catch (error) {
            console.error("Error fetching reviews:", error);
            toast.error("Failed to load reviews");
        } finally {
            setLoadingReviews(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review? This cannot be undone.")) return;

        try {
            await deleteDoc(doc(db, 'reviews', reviewId));
            toast.success("Review deleted successfully");
            setReviews(reviews.filter(r => r.id !== reviewId));
        } catch (error) {
            console.error("Error deleting review:", error);
            toast.error("Failed to delete review");
        }
    };

    // calculate average rating for filtering/display
    const getAverageRating = (uniId) => {
        // This would require fetching reviews for ALL unis which is expensive.
        // For now, we just list unis.
        return null;
    };

    const filteredUniversities = universities.filter(u =>
        u.universityName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 md:p-10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
                        <Star className="text-yellow-500 fill-yellow-500" size={32} />
                        University Ratings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage reviews and ratings across all registered universities.
                    </p>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!selectedUni ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        {/* Search Bar */}
                        <div className="relative mb-8 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search universities..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all shadow-sm"
                            />
                        </div>

                        {loadingUni ? (
                            <div className="flex justify-center py-20">
                                <Loader2 size={40} className="animate-spin text-cyan-500" />
                            </div>
                        ) : filteredUniversities.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                                <Building size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <p className="text-slate-500">No universities found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredUniversities.map((uni, idx) => (
                                    <motion.div
                                        key={uni.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => handleSelectUni(uni)}
                                        className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                                <Building size={24} />
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ArrowLeft size={16} className="rotate-180 text-slate-400" />
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                            {uni.universityName}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                            {uni.email}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <button
                            onClick={() => setSelectedUni(null)}
                            className="flex items-center gap-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 mb-6 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            Back to Universities
                        </button>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <h2 className="text-2xl font-black mb-2">{selectedUni.universityName}</h2>
                                <p className="text-slate-500">Managing all reviews and feedback</p>
                            </div>

                            <div className="p-8">
                                {loadingReviews ? (
                                    <div className="flex justify-center py-20">
                                        <Loader2 size={40} className="animate-spin text-cyan-500" />
                                    </div>
                                ) : reviews.length === 0 ? (
                                    <div className="text-center py-16">
                                        <MessageSquare size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                                        <p className="text-slate-500">No reviews have been posted yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {reviews.map((review) => {
                                            const reviewer = reviewers[review.studentId] || {};
                                            return (
                                                <div key={review.id} className="relative group bg-slate-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-4">
                                                            <div
                                                                onClick={() => setProfileModal({ isOpen: true, userId: review.studentId })}
                                                                className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 cursor-pointer hover:scale-105 transition-transform border border-slate-300 dark:border-slate-700"
                                                            >
                                                                {reviewer.profilePic || reviewer.photoURL ? (
                                                                    <img
                                                                        src={reviewer.profilePic || reviewer.photoURL}
                                                                        alt="User"
                                                                        className="w-full h-full object-cover"
                                                                        crossOrigin="anonymous"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                        <User size={20} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4
                                                                    onClick={() => setProfileModal({ isOpen: true, userId: review.studentId })}
                                                                    className="font-bold text-slate-900 dark:text-white cursor-pointer hover:underline decoration-cyan-500 underline-offset-2"
                                                                >
                                                                    {reviewer.fullName || 'Unknown Student'}
                                                                </h4>
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                                    <span>{review.createdAt?.toDate?.().toLocaleDateString() || 'Date N/A'}</span>
                                                                    <span>•</span>
                                                                    <div className="flex gap-0.5">
                                                                        {[1, 2, 3, 4, 5].map(s => (
                                                                            <Star key={s} size={10} className={s <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-slate-300"} />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => handleDeleteReview(review.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title="Delete Review"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="mt-4 pl-[4rem]">
                                                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                                                            {review.comment}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                )}
                {/* Profile Modal */}
                <UserProfileModal
                    isOpen={profileModal.isOpen}
                    onClose={() => setProfileModal({ isOpen: false, userId: null })}
                    userId={profileModal.userId}
                    readOnly={true}
                    hideChatButton={true}
                />
            </AnimatePresence>
        </div >
    );
};

export default UniversityRatings;
