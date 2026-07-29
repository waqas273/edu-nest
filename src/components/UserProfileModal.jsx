import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    X, Mail, Calendar, MapPin, Globe, Phone,
    GraduationCap, Award, Clock, FileText,
    User, Shield, Loader2, BookOpen, Trophy,
    Building, Briefcase, Star, MessageCircle,
    ExternalLink, ChevronRight, Sparkles,
    Instagram, Linkedin, Github, Grip, Edit
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WarningModal from './WarningModal';
import { AlertTriangle } from 'lucide-react';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Enhanced User Profile Modal
 * Shows complete user profile with chat functionality
 */

const UserProfileModal = ({ isOpen, onClose, userId, userData = null, hideChatButton = false, readOnly = false }) => {
    const navigate = useNavigate();
    const { currentUser, userProfile: viewerProfile } = useAuth();
    const [profile, setProfile] = useState(userData);
    const [loading, setLoading] = useState(!userData);
    const [testHistory, setTestHistory] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loadingExtras, setLoadingExtras] = useState(false);
    const [startingChat, setStartingChat] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);

    // Fetch user profile if not provided or incomplete
    useEffect(() => {
        if (isOpen && userId) {
            fetchUserProfile();
        }
    }, [isOpen, userId]);

    // Fetch additional data based on viewer's role
    useEffect(() => {
        if (isOpen && profile?.id) {
            fetchContextualData();
        }
    }, [isOpen, profile?.id]);

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = { id: userSnap.id, ...userSnap.data() };
                setProfile(data);
            } else {
                // Fallback for deleted users
                const deletedUser = {
                    id: userId,
                    fullName: 'Deleted User',
                    role: 'unknown',
                    photoURL: null,
                    isDeleted: true
                };
                setProfile(deletedUser);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (userData) setProfile(userData);
        } finally {
            setLoading(false);
        }
    };

    const fetchContextualData = async () => {
        if (!profile?.id || !currentUser) return;

        const isOwner = currentUser.uid === profile.id;
        const isAdmin = viewerProfile?.role === 'admin';
        const isManager = viewerProfile?.role === 'university_manager';

        setLoadingExtras(true);
        try {
            if (profile?.role === 'student' && (isOwner || isAdmin)) {
                // Fetch test results
                const testsQuery = query(
                    collection(db, 'test_history'),
                    where('userId', '==', profile.id),
                    orderBy('timestamp', 'desc'),
                    limit(10)
                );
                try {
                    const testsSnap = await getDocs(testsQuery);
                    const testsData = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setTestHistory(testsData);
                } catch (e) {
                    console.warn("Could not fetch test history:", e.message);
                }

                // Fetch applications
                const appsQuery = query(
                    collection(db, 'admissions'),
                    where('studentId', '==', profile.id),
                    limit(5)
                );
                try {
                    const appsSnap = await getDocs(appsQuery);
                    const appsData = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setApplications(appsData);
                } catch (e) {
                    console.warn("Could not fetch applications:", e.message);
                }
            }
        } catch (error) {
            console.error('Error fetching contextual data:', error);
        } finally {
            setLoadingExtras(false);
        }
    };

    // Start chat with this user
    const handleStartChat = async () => {
        if (readOnly || !currentUser || !profile?.id || currentUser.uid === profile.id) return;

        setStartingChat(true);
        try {
            // Check if chat already exists
            const chatsQuery = query(
                collection(db, 'chats'),
                where('participants', 'array-contains', currentUser.uid)
            );
            const chatsSnap = await getDocs(chatsQuery);

            let existingChatId = null;
            chatsSnap.forEach(doc => {
                const chatData = doc.data();
                if (chatData.participants.includes(profile.id)) {
                    existingChatId = doc.id;
                }
            });

            if (existingChatId) {
                // Navigate to existing chat
                onClose();
                navigate(`/messages/${existingChatId}`);
            } else {
                // Create new chat
                const newChat = await addDoc(collection(db, 'chats'), {
                    participants: [currentUser.uid, profile.id],
                    participantNames: {
                        [currentUser.uid]: viewerProfile?.fullName || 'User',
                        [profile.id]: profile.fullName || 'User'
                    },
                    participantPhotos: {
                        [currentUser.uid]: viewerProfile?.photoURL || null,
                        [profile.id]: profile.photoURL || profile.profilePic || null
                    },
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    lastMessageAt: serverTimestamp()
                });

                onClose();
                navigate(`/messages/${newChat.id}`);
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat. Please try again.');
        } finally {
            setStartingChat(false);
        }
    };

    // Navigate to university profile
    const handleViewUniversity = () => {
        if (profile?.id) {
            onClose();
            navigate(`/university/${profile.id}`);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin':
                return { label: 'Administrator', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: Shield };
            case 'university_manager':
                return { label: 'University Manager', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: Building };
            case 'student':
            default:
                return { label: 'Student', color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', icon: GraduationCap };
        }
    };

    if (!isOpen) return null;

    const roleBadge = profile ? getRoleBadge(profile.role) : null;
    const RoleIcon = roleBadge?.icon || User;
    const canChat = !readOnly && currentUser && profile?.id && currentUser.uid !== profile.id && !hideChatButton;
    const profilePhoto = profile?.photoURL || profile?.profilePic || profile?.profilePictureUrl;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl"
                    >
                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center">
                                <Loader2 size={48} className="animate-spin text-cyan-500 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">Loading profile...</p>
                            </div>
                        ) : profile ? (
                            <>
                                {/* Header with Cover & Avatar */}
                                <div className="relative">
                                    {/* Cover Image - Different colors based on role */}
                                    <div className={cn(
                                        "h-36",
                                        profile.role === 'university_manager'
                                            ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
                                            : profile.role === 'admin'
                                                ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600"
                                                : "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"
                                    )}>
                                        {/* Decorative elements */}
                                        <div className="absolute inset-0 overflow-hidden">
                                            <div className="absolute top-4 right-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                                            <div className="absolute bottom-4 left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                        </div>
                                    </div>

                                    {/* Close Button */}
                                    <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>

                                    {/* Avatar */}
                                    <div className="absolute -bottom-16 left-8">
                                        <div className="relative">
                                            <UserAvatar
                                                userId={profile.id}
                                                src={profilePhoto}
                                                name={profile.fullName}
                                                size="3xl"
                                                showBorder
                                                interactive={false}
                                            />
                                            {/* Online indicator */}
                                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white dark:border-slate-900" />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute -bottom-6 right-6 flex gap-2">
                                        {/* Edit Profile Button (Self Only) */}
                                        {!readOnly && currentUser?.uid === profile?.id && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                    onClose();
                                                    navigate('/student/profile');
                                                }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl shadow-lg hover:shadow-xl border border-slate-200 dark:border-white/10 transition-all"
                                            >
                                                <Edit size={18} />
                                                <span>Edit Profile</span>
                                            </motion.button>
                                        )}
                                        {/* Chat Button - Hidden if profile is Admin and viewer is not Admin */}
                                        {!hideChatButton && !readOnly && !(profile?.role === 'admin' && viewerProfile?.role !== 'admin') && (
                                            <motion.button
                                                whileHover={canChat ? { scale: 1.05 } : {}}
                                                whileTap={canChat ? { scale: 0.95 } : {}}
                                                onClick={handleStartChat}
                                                disabled={startingChat || !canChat}
                                                className={cn(
                                                    "flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl shadow-lg transition-all",
                                                    canChat
                                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-xl"
                                                        : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-70"
                                                )}
                                                title={!canChat ? (currentUser?.uid === profile?.id ? "You cannot message yourself" : "Chat unavailable") : "Start Chat"}
                                            >
                                                {startingChat ? (
                                                    <Loader2 size={18} className="animate-spin" />
                                                ) : (
                                                    <MessageCircle size={18} />
                                                )}
                                                <span>{startingChat ? 'Starting...' : 'Message'}</span>
                                            </motion.button>
                                        )}

                                        {/* View University Button (for managers) - Only visible to students */}
                                        {!readOnly && profile.role === 'university_manager' && profile.universityName && viewerProfile?.role === 'student' && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleViewUniversity}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl shadow-lg hover:shadow-xl border border-slate-200 dark:border-white/10 transition-all"
                                            >
                                                <Building size={18} />
                                                <span>View University</span>
                                                <ExternalLink size={14} />
                                            </motion.button>
                                        )}
                                        {/* Warning Button (Admin Only) */}
                                        {/* Check against viewerProfile.role because currentUser doesn't have role directly on it usually, unless custom claims. */}
                                        {viewerProfile?.role === 'admin' && currentUser?.uid !== profile?.id && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setShowWarningModal(true)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl shadow-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-200 dark:border-red-900/30"
                                            >
                                                <AlertTriangle size={18} />
                                                <span>Warn User</span>
                                            </motion.button>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="pt-20 px-8 pb-8 overflow-y-auto max-h-[calc(90vh-9rem)]">
                                    {/* Name & Role */}
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {profile.fullName || 'Unknown User'}
                                            {profile.verified && (
                                                <Sparkles size={20} className="text-cyan-500" fill="currentColor" />
                                            )}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className={cn(
                                                'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5',
                                                roleBadge?.color
                                            )}>
                                                <RoleIcon size={12} />
                                                {roleBadge?.label}
                                            </span>
                                            {profile.createdAt && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    Joined {formatDate(profile.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    {profile.bio && (
                                        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {profile.bio}
                                            </p>
                                        </div>
                                    )}

                                    {/* Contact Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {profile.interest && (
                                            <div className="flex flex-col gap-2 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 rounded-xl md:col-span-2 border border-purple-100 dark:border-purple-500/20 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md shadow-purple-500/20">
                                                        <Sparkles size={16} className="text-white" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs text-purple-600 dark:text-purple-300 font-bold uppercase tracking-wider">Academic Focus</p>
                                                        <p className="text-base font-black text-slate-900 dark:text-white truncate">
                                                            {profile.interest}
                                                        </p>
                                                    </div>
                                                    <div className="hidden sm:block px-3 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-lg border border-slate-100 dark:border-white/10 shadow-sm">
                                                        AI Verified
                                                    </div>
                                                </div>
                                                {profile.interestConfidence > 0 && (
                                                    <div className="w-full mt-1 flex items-center gap-2 px-1">
                                                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                                                style={{ width: `${(profile.interestConfidence * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                            {(profile.interestConfidence * 100).toFixed(0)}% Match
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {profile.email && (
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                <div className="p-2 bg-cyan-100 dark:bg-cyan-500/20 rounded-lg">
                                                    <Mail size={16} className="text-cyan-600 dark:text-cyan-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                        {profile.email}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {profile.phone && (
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                                                    <Phone size={16} className="text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {profile.phone}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {profile.location && (
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                <div className="p-2 bg-pink-100 dark:bg-pink-500/20 rounded-lg">
                                                    <MapPin size={16} className="text-pink-600 dark:text-pink-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Location</p>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {profile.location}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {profile.website && (
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                                                    <Globe size={16} className="text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Website</p>
                                                    <a
                                                        href={profile.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline truncate block"
                                                    >
                                                        {profile.website}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Social Media Links */}
                                    {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <Grip size={16} className="text-cyan-500" />
                                                Social Presence
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {profile.socialLinks.instagram && (
                                                    <a
                                                        href={profile.socialLinks.instagram}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
                                                    >
                                                        <Instagram size={18} />
                                                        <span className="text-sm font-medium">Instagram</span>
                                                    </a>
                                                )}
                                                {profile.socialLinks.linkedin && (
                                                    <a
                                                        href={profile.socialLinks.linkedin}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        <Linkedin size={18} />
                                                        <span className="text-sm font-medium">LinkedIn</span>
                                                    </a>
                                                )}
                                                {profile.socialLinks.github && (
                                                    <a
                                                        href={profile.socialLinks.github}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        <Github size={18} />
                                                        <span className="text-sm font-medium">GitHub</span>
                                                    </a>
                                                )}
                                                {profile.socialLinks.website && (
                                                    <a
                                                        href={profile.socialLinks.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                                    >
                                                        <Globe size={18} />
                                                        <span className="text-sm font-medium">Website</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* University Manager - Complete University Info */}
                                    {profile.role === 'university_manager' && (
                                        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                                            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                                                <Building size={20} />
                                                University Information
                                            </h3>

                                            {profile.universityName && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Institution</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                                        {profile.universityName}
                                                    </p>
                                                </div>
                                            )}

                                            {profile.description && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">About</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                        {profile.description}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-3 mt-4">
                                                {profile.officialEmail && (
                                                    <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl">
                                                        <p className="text-xs text-slate-500">Official Email</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{profile.officialEmail}</p>
                                                    </div>
                                                )}
                                                {profile.licenseNumber && (
                                                    <div className="p-3 bg-white/60 dark:bg-slate-800/40 rounded-xl">
                                                        <p className="text-xs text-slate-500">License #</p>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.licenseNumber}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Infrastructure Images for University Manager */}
                                            {profile.infrastructureImages && profile.infrastructureImages.length > 0 && (
                                                <div className="mt-4">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Campus Infrastructure</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {profile.infrastructureImages.map((img, idx) => (
                                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group border border-slate-200 dark:border-white/10">
                                                                <img
                                                                    src={img}
                                                                    alt={`Infrastructure ${idx + 1}`}
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}



                                            {/* View Full Profile Button - Only visible to students */}
                                            {!readOnly && viewerProfile?.role === 'student' && (
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleViewUniversity}
                                                    className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <span>View Complete University Profile</span>
                                                    <ChevronRight size={18} />
                                                </motion.button>
                                            )}
                                        </div>
                                    )}

                                    {/* Student - Test History */}
                                    {profile?.role === 'student' && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <BookOpen size={16} className="text-cyan-500" />
                                                Academic Test History
                                            </h3>

                                            {loadingExtras ? (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center">
                                                    <Loader2 size={20} className="animate-spin text-cyan-500 mr-2" />
                                                    <span className="text-sm text-slate-500">Loading test history...</span>
                                                </div>
                                            ) : testHistory.length > 0 ? (
                                                <div className="space-y-2">
                                                    {testHistory.map((test, idx) => (
                                                        <div
                                                            key={`test-${test.id || 'no-id'}-${idx}`}
                                                            className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "p-2 rounded-lg",
                                                                    (test.score || test.percentage) >= 80
                                                                        ? "bg-emerald-100 dark:bg-emerald-500/20"
                                                                        : (test.score || test.percentage) >= 60
                                                                            ? "bg-amber-100 dark:bg-amber-500/20"
                                                                            : "bg-red-100 dark:bg-red-500/20"
                                                                )}>
                                                                    <Trophy size={16} className={cn(
                                                                        (test.score || test.percentage) >= 80
                                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                                            : (test.score || test.percentage) >= 60
                                                                                ? "text-amber-600 dark:text-amber-400"
                                                                                : "text-red-600 dark:text-red-400"
                                                                    )} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        {test.category && (
                                                                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                                                {test.category}
                                                                            </span>
                                                                        )}
                                                                        {test.skill && (
                                                                            <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-100 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                                                {test.skill}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                        {test.topicName || test.testName || 'Assessment'}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {formatDate(test.timestamp || test.completedAt)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={cn(
                                                                    "text-xl font-black",
                                                                    (test.score || test.percentage) >= 80
                                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                                        : (test.score || test.percentage) >= 60
                                                                            ? "text-amber-600 dark:text-amber-400"
                                                                            : "text-red-600 dark:text-red-400"
                                                                )}>
                                                                    {test.score || test.percentage || 0}%
                                                                </p>
                                                                <p className="text-xs text-slate-500">Score</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                                                    <FileText size={32} className="mx-auto text-slate-400 mb-2" />
                                                    <p className="text-sm text-slate-500">No test records available yet</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Student - Applications */}
                                    {profile?.role === 'student' && applications.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                                <Briefcase size={16} className="text-purple-500" />
                                                Application History
                                            </h3>
                                            <div className="space-y-2">
                                                {applications.map((app, idx) => (
                                                    <div
                                                        key={`app-${app.id || 'no-id'}-${idx}`}
                                                        className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                {app.programName || 'Program Application'}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {app.universityName || ''} • {formatDate(app.appliedAt || app.submittedAt)}
                                                            </p>
                                                        </div>
                                                        <span className={cn(
                                                            'px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider',
                                                            app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                                app.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                                                                    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                        )}>
                                                            {app.status?.charAt(0).toUpperCase() + app.status?.slice(1) || 'Pending'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center">
                                <User size={48} className="text-slate-400 mb-4" />
                                <p className="text-slate-500 dark:text-slate-400">Profile not found</p>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )
            }
            <WarningModal
                isOpen={showWarningModal}
                onClose={() => setShowWarningModal(false)}
                user={profile}
            />
        </AnimatePresence >
    );
};


export default UserProfileModal;
