import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
    Star, Loader2, MessageSquare, Quote, TrendingUp,
    Award, ThumbsUp, BarChart3, Users, Sparkles,
    Heart, Mail, Calendar, User
} from 'lucide-react';
import UserProfileDisplay from '../../components/UserProfileDisplay';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Ultra-Premium Review Card with Magnetic Hover
const ReviewCard = ({ review, index }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-150, 150], [3, -3]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-3, 3]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.05
            }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative perspective-1000"
        >
            <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                    "relative overflow-hidden rounded-3xl transition-all duration-500",
                    "bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl",
                    "border border-slate-200/60 dark:border-white/10",
                    "shadow-lg hover:shadow-2xl dark:shadow-black/40",
                    "before:absolute before:inset-0 before:bg-gradient-to-br before:from-yellow-500/5 before:to-orange-500/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500"
                )}
            >
                {/* Top Gradient Bar */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 400 }}
                    className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 origin-left"
                />

                {/* Shimmer Effect */}
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: index * 0.4,
                        ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100"
                />

                <div className="p-6 relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-5">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.15 }}
                            className="flex items-center gap-3"
                        >
                            <UserProfileDisplay
                                userId={review.studentId}
                                timestamp={review.createdAt}
                                size="md"
                            />
                        </motion.div>

                        {/* Star Rating */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.05 + 0.2 }}
                            className="flex gap-1 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-500/10 dark:to-amber-500/10 px-3 py-2 rounded-full border border-yellow-200 dark:border-yellow-500/20 shadow-lg"
                        >
                            {[1, 2, 3, 4, 5].map((star) => (
                                <motion.div
                                    key={star}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.05 + 0.2 + star * 0.05, type: "spring", stiffness: 500 }}
                                >
                                    <Star
                                        size={16}
                                        className={star <= (review.rating || 0)
                                            ? 'text-yellow-500 fill-yellow-500'
                                            : 'text-slate-300 dark:text-slate-600'}
                                    />
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Comment */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 + 0.25 }}
                        className="relative"
                    >
                        <Quote size={24} className="absolute -top-2 -left-2 text-slate-200 dark:text-slate-700 opacity-50" />
                        <div className="pl-6 pt-4">
                            <p className="text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed">
                                "{review.comment || 'No written feedback provided.'}"
                            </p>
                        </div>
                    </motion.div>

                    {/* Footer Badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 + 0.3 }}
                        className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <Calendar size={12} />
                            <span>{review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-bold">
                            <ThumbsUp size={12} />
                            <span>Verified</span>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ManagerRatings = () => {
    const { currentUser } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const fetchReviews = async () => {
            try {
                const reviewsRef = collection(db, 'reviews');
                const reviewsQuery = query(reviewsRef, where('universityId', '==', currentUser.uid));
                const reviewsSnap = await getDocs(reviewsQuery);

                const reviewsData = await Promise.all(
                    reviewsSnap.docs.map(async (reviewDoc) => {
                        const data = reviewDoc.data();
                        let studentName = data.studentName || null;

                        if (!studentName && data.studentId) {
                            try {
                                const studentDoc = await getDoc(doc(db, 'users', data.studentId));
                                if (studentDoc.exists()) {
                                    studentName = studentDoc.data().fullName || 'Anonymous';
                                }
                            } catch (err) {
                                console.log('Could not fetch student name');
                            }
                        }

                        return {
                            id: reviewDoc.id,
                            ...data,
                            studentName: studentName || 'Anonymous'
                        };
                    })
                );

                reviewsData.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                setReviews(reviewsData);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [currentUser]);

    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : '0.0';

    // Rating Distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
        stars: rating,
        count: reviews.filter(r => r.rating === rating).length,
        percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
    }));

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 size={56} className="text-cyan-500 mb-6" />
                </motion.div>
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-slate-500 dark:text-slate-400 font-semibold text-lg"
                >
                    Loading reputation data...
                </motion.p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500 relative">

            {/* Animated Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 80, 0],
                        y: [0, -40, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-5%] right-[-5%] w-[550px] h-[550px] bg-yellow-500/10 dark:bg-yellow-500/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -60, 0],
                        y: [0, 40, 0],
                        scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-5%] left-[-5%] w-[550px] h-[550px] bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-[120px]"
                />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mb-10"
                >
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
                    >
                        Reputation <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-pink-600 dark:from-yellow-400 dark:via-orange-400 dark:to-pink-400 animate-gradient">Hub</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2"
                    >
                        <Award size={16} /> Monitor institutional performance and student feedback
                    </motion.p>
                </motion.header>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Average Rating */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 shadow-xl group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Star size={120} className="text-slate-900 dark:text-white" />
                        </div>
                        <div className="relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-yellow-500/30"
                            >
                                <Star className="text-white" size={28} fill="currentColor" />
                            </motion.div>
                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Average Rating</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-6xl font-black text-slate-900 dark:text-white">{averageRating}</h2>
                                <span className="text-slate-400 font-bold text-lg">/ 5.0</span>
                            </div>
                            <div className="flex gap-1 mt-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={18}
                                        className={star <= Math.round(parseFloat(averageRating))
                                            ? 'text-yellow-500 fill-yellow-500'
                                            : 'text-slate-300 dark:text-slate-600'}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Total Reviews */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="relative overflow-hidden rounded-3xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 shadow-xl group"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <MessageSquare size={120} className="text-slate-900 dark:text-white" />
                        </div>
                        <div className="relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/30"
                            >
                                <MessageSquare className="text-white" size={28} />
                            </motion.div>
                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Total Reviews</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-6xl font-black text-slate-900 dark:text-white">{reviews.length}</h2>
                                <span className="text-slate-400 font-bold text-lg">Feedback</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 font-semibold">From verified students</p>
                        </div>
                    </motion.div>

                    {/* Sentiment */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-purple-600 dark:to-indigo-700 p-8 shadow-2xl text-white"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -bottom-8 -right-8 bg-white/10 w-40 h-40 rounded-full blur-3xl"
                        />
                        <div className="relative z-10">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                            >
                                <TrendingUp size={28} />
                            </motion.div>
                            <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-2">Student Sentiment</p>
                            <h3 className="text-3xl font-black mb-2">
                                {parseFloat(averageRating) >= 4 ? 'Excellent' : parseFloat(averageRating) >= 3 ? 'Positive' : 'Growing'}
                            </h3>
                            <p className="text-white/80 text-sm font-semibold">Keep up the great work!</p>
                        </div>
                    </motion.div>
                </div>

                {/* Distribution Chart (Optional - can be added) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-12 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <BarChart3 size={24} className="text-cyan-500" />
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Rating Distribution</h3>
                    </div>
                    <div className="space-y-3">
                        {ratingDistribution.map((dist, idx) => (
                            <motion.div
                                key={dist.stars}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + idx * 0.05 }}
                                className="flex items-center gap-4"
                            >
                                <div className="flex items-center gap-1 w-20">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{dist.stars}</span>
                                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                </div>
                                <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${dist.percentage}%` }}
                                        transition={{ delay: 0.5 + idx * 0.05 + 0.2, duration: 0.8, type: "spring" }}
                                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                                    />
                                </div>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 w-16 text-right">{dist.count} reviews</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Reviews Section */}
                <div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center gap-3 mb-8"
                    >
                        <Quote size={24} className="text-cyan-500" />
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Student Feedback</h3>
                        <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-200 to-transparent dark:from-white/10" />
                    </motion.div>

                    {reviews.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl"
                        >
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-28 h-28 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner"
                            >
                                <Star size={48} className="text-slate-400 dark:text-slate-500" />
                            </motion.div>
                            <h4 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">No Ratings Yet</h4>
                            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                                Student reviews will appear here once submitted.
                            </p>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            <AnimatePresence mode="popLayout">
                                {reviews.map((review, index) => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        index={index}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};

export default ManagerRatings;
