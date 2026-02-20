import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Edit2, Mail, MapPin, Link as LinkIcon,
    Github, Linkedin, ExternalLink, GraduationCap,
    Building2, Calendar, User, BookOpen, Globe, Instagram,
    Trophy, FileText, Loader2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/UserAvatar';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const UserProfile = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();
    const [testHistory, setTestHistory] = useState([]);
    const [loadingTests, setLoadingTests] = useState(true);

    useEffect(() => {
        if (currentUser?.uid) {
            fetchTestHistory();
        }
    }, [currentUser?.uid]);

    const fetchTestHistory = async () => {
        try {
            const testsQuery = query(
                collection(db, 'test_history'),
                where('userId', '==', currentUser.uid),
                orderBy('timestamp', 'desc'),
                limit(5)
            );
            const testsSnap = await getDocs(testsQuery);
            const testsData = testsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTestHistory(testsData);
        } catch (error) {
            console.error('Error fetching test history:', error);
        } finally {
            setLoadingTests(false);
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

    // Helper to robustly get education data
    const educationHistory = userProfile?.educationHistory || [];
    const socialLinks = userProfile?.socialLinks || {};

    // Helper to get display name & other info
    const displayName = userProfile?.fullName || userProfile?.displayName || currentUser?.displayName || 'Student';
    const email = currentUser?.email;
    const bio = userProfile?.bio || 'No bio added yet.';
    const profilePic = userProfile?.profilePic || userProfile?.profilePictureUrl || currentUser?.photoURL;
    const joinDate = currentUser?.metadata?.creationTime
        ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'N/A';

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white pb-20 font-sans transition-colors duration-300">
            {/* Top Navigation Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => navigate('/student')}
                            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition group"
                        >
                            <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Dashboard</span>
                        </button>

                        <button
                            onClick={() => navigate('/student/profile/edit')}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            <Edit2 size={16} />
                            <span>Edit Profile</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header / Cover Section */}
                <div className="relative mb-20 md:mb-24">
                    {/* Cover Image (Pattern/Gradient) */}
                    <div className="h-48 md:h-64 rounded-3xl overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900" />
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay" />
                    </div>

                    {/* Profile Overlap */}
                    <div className="absolute -bottom-16 left-8 md:left-12 flex items-end">
                        <div className="relative p-1.5 bg-white dark:bg-slate-900 rounded-full shadow-2xl">
                            <UserAvatar
                                src={profilePic}
                                name={displayName}
                                size="3xl"
                                className="w-32 h-32 md:w-40 md:h-40 border-4 border-white dark:border-slate-800"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT COLUMN: Sidebar Info */}
                    <div className="space-y-6">
                        {/* Name & Title Block (Mobile Centric fallback hidden on desktop if desired, but good for context) */}
                        <div className="pt-2">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{displayName}</h1>
                            <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-4">Student</p>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{bio}</p>
                        </div>

                        {/* Contact Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                <User size={16} /> Contact Info
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 dark:border-slate-600">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Email Address</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white break-all">{email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 dark:border-slate-600">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Member Since</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{joinDate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Social Links */}
                        {(socialLinks.github || socialLinks.linkedin || socialLinks.website || socialLinks.instagram) && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                                    <LinkIcon size={16} /> Social Profiles
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {socialLinks.instagram && (
                                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white hover:border-pink-500 hover:text-pink-500 transition-colors">
                                            <Instagram size={16} /> Instagram
                                        </a>
                                    )}
                                    {socialLinks.github && (
                                        <a href={socialLinks.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white hover:border-slate-900 hover:text-slate-900 dark:hover:border-white dark:hover:text-white transition-colors">
                                            <Github size={16} /> GitHub
                                        </a>
                                    )}
                                    {socialLinks.linkedin && (
                                        <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white hover:border-blue-500 hover:text-blue-500 transition-colors">
                                            <Linkedin size={16} /> LinkedIn
                                        </a>
                                    )}
                                    {socialLinks.website && (
                                        <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-white hover:border-emerald-500 hover:text-emerald-500 transition-colors">
                                            <Globe size={16} /> Website
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Academic Test History Section */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <Trophy size={24} />
                                    </div>
                                    Academic Performance
                                </h3>
                            </div>

                            {loadingTests ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                                </div>
                            ) : testHistory.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {testHistory.map((test, idx) => (
                                        <div
                                            key={test.id || idx}
                                            className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between hover:border-indigo-500/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg",
                                                    (test.score || test.percentage) >= 80
                                                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                        : (test.score || test.percentage) >= 60
                                                            ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                                            : "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                                )}>
                                                    {test.score || test.percentage || 0}%
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {test.category && (
                                                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                                                {test.category}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {formatDate(test.timestamp || test.completedAt)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                                                        {test.topicName || test.testName || 'Skill Assessment'}
                                                    </h4>
                                                </div>
                                            </div>
                                            <div className="hidden md:block">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-bold",
                                                    (test.score || test.percentage) >= 80
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                                                        : (test.score || test.percentage) >= 60
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                                )}>
                                                    {(test.score || test.percentage) >= 80 ? 'Excellent' : (test.score || test.percentage) >= 60 ? 'Good' : 'Needs Practice'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                        <FileText size={20} />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">No test records found.</p>
                                </div>
                            )}
                        </div>

                        {/* Education History Section */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                        <GraduationCap size={24} />
                                    </div>
                                    Education History
                                </h3>
                                <button
                                    onClick={() => navigate('/student/profile/edit')}
                                    className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                >
                                    + Add New
                                </button>
                            </div>

                            <div className="space-y-6">
                                {educationHistory.length > 0 ? (
                                    <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-8 pb-2">
                                        {educationHistory.map((edu, index) => (
                                            <div key={index} className="relative pl-8">
                                                {/* Timeline Dot */}
                                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500" />

                                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                                                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                                                        <div className="flex-1">
                                                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                                                {edu.degree}
                                                            </h4>
                                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-3">
                                                                <Building2 size={16} />
                                                                <span className="font-medium">{edu.institute}</span>
                                                            </div>
                                                            {edu.percentage && (
                                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                                                                    Grade/CGPA: {edu.percentage}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {edu.resultCardUrl && (
                                                            <a
                                                                href={edu.resultCardUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="group relative flex-shrink-0 w-full md:w-40 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800"
                                                            >
                                                                <img
                                                                    src={edu.resultCardUrl}
                                                                    alt="Result Card"
                                                                    crossOrigin="anonymous"
                                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                />
                                                                <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <span className="text-xs font-bold text-white flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                                                                        <ExternalLink size={12} /> View
                                                                    </span>
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                                            <BookOpen size={32} />
                                        </div>
                                        <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No education details added</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Enhance your profile by adding your educational background.</p>
                                        <button
                                            onClick={() => navigate('/student/profile/edit')}
                                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            Add Education
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
