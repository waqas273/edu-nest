import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, User, GraduationCap, Phone, FileText,
    ClipboardList, Loader2, CheckCircle2,
    ShieldCheck, Sparkles, Fingerprint, BookOpen, Award, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const ApplyModal = ({ isOpen, onClose, university, program, studentId, onApplySuccess }) => {
    const { currentUser, userProfile } = useAuth();

    // Auto-filled from profile
    const [studentData, setStudentData] = useState({
        fullName: '',
        email: '',
        profilePic: '',
        educationHistory: [],
        testHistory: []
    });

    // Manual input fields
    const [formData, setFormData] = useState({
        phoneNumber: '',
        description: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Fetch student profile and test history
    useEffect(() => {
        const fetchStudentData = async () => {
            if (!isOpen || !studentId) return;

            setLoadingProfile(true);
            try {
                // Fetch user profile
                const userDoc = await getDoc(doc(db, 'users', studentId));
                const userData = userDoc.exists() ? userDoc.data() : {};

                // Fetch test history
                const testsQ = query(
                    collection(db, 'tests'),
                    where('userId', '==', studentId)
                );
                const testsSnap = await getDocs(testsQ);
                const tests = testsSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));

                setStudentData({
                    fullName: userData.fullName || userProfile?.fullName || currentUser?.displayName || '',
                    email: userData.email || currentUser?.email || '',
                    profilePic: userData.profilePic || userData.photoURL || userProfile?.profilePic || currentUser?.photoURL || '',
                    educationHistory: userData.educationHistory || [],
                    testHistory: tests,
                    interest: userData.interest || '' // Added Interest Field
                });
            } catch (error) {
                console.error("Error fetching student data:", error);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchStudentData();
    }, [isOpen, studentId, userProfile, currentUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!studentId || !university?.id || !program?.id) {
            alert("Error: Missing required data. Please try again.");
            return;
        }

        if (!formData.phoneNumber.trim()) {
            alert("Please enter your phone number.");
            return;
        }

        try {
            setIsSubmitting(true);

            await addDoc(collection(db, 'admissions'), {
                studentId: studentId,
                universityId: university.id,
                degreeId: program.id,
                degreeName: program.programName || program.name || program.title,
                programId: program.id,
                programName: program.programName || program.name || program.title,
                universityName: university.universityName || university.displayName,
                studentName: studentData.fullName,
                status: 'pending',
                submittedAt: serverTimestamp(),
                appliedAt: serverTimestamp(),

                // Complete student profile snapshot
                studentProfile: {
                    fullName: studentData.fullName,
                    email: studentData.email,
                    phoneNumber: formData.phoneNumber,
                    description: formData.description,
                    educationHistory: studentData.educationHistory,
                    testHistory: studentData.testHistory.map(t => ({
                        testName: t.testName || t.skill || 'Test',
                        score: t.score || 0,
                        totalQuestions: t.totalQuestions || 0,
                        percentage: t.percentage || 0,
                        passed: t.passed || false,
                        completedAt: t.completedAt || null
                    })),
                    submissionSource: 'v3_enhanced'
                }
            });

            setIsSuccess(true);

            setTimeout(() => {
                onApplySuccess(program.id);
                onClose();
                setIsSuccess(false);
                setFormData({ phoneNumber: '', description: '' });
            }, 2500);

        } catch (error) {
            console.error("Submission failure:", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xl"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl my-8"
                    >
                        {/* Glow Effects */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[80px]" />

                        <div className="p-8 space-y-8 relative z-10 max-h-[85vh] overflow-y-auto">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400">
                                        <ShieldCheck size={16} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Secure Application</span>
                                    </div>
                                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                                        Apply for Admission
                                    </h2>
                                    <div className="flex items-center space-x-2 text-slate-500 text-sm">
                                        <Sparkles size={14} className="text-purple-500" />
                                        <span>{program?.name || program?.programName || 'Program'}</span>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            {isSuccess ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center text-center space-y-6"
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-24 h-24 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center border border-green-200 dark:border-green-500/20 text-green-500"
                                    >
                                        <CheckCircle2 size={48} />
                                    </motion.div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Application Submitted!</h3>
                                        <p className="text-slate-500 max-w-sm">Your application has been sent to the university for review.</p>
                                    </div>
                                </motion.div>
                            ) : loadingProfile ? (
                                <div className="py-12 flex flex-col items-center">
                                    <Loader2 size={40} className="animate-spin text-cyan-500" />
                                    <p className="mt-4 text-slate-500">Loading your profile...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Auto-filled Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <User size={14} />
                                            Your Profile (Auto-filled)
                                        </h4>

                                        {/* Student Photo & Basic Info */}
                                        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-500/5 dark:to-purple-500/5 rounded-xl border border-cyan-100 dark:border-cyan-500/10">
                                            <div className="relative">
                                                {studentData.profilePic ? (
                                                    <img
                                                        src={studentData.profilePic}
                                                        alt={studentData.fullName}
                                                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                                                    />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl border-2 border-white shadow-lg">
                                                        {(studentData.fullName || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                                    <ShieldCheck size={10} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900 dark:text-white text-lg">{studentData.fullName || 'N/A'}</p>
                                                <p className="text-sm text-slate-500 break-all">{studentData.email || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Identified Interest (AI) */}
                                        {studentData.interest && (
                                            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                                                <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                                                    <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-purple-600 dark:text-purple-300 font-bold uppercase tracking-wider">AI Identified Interest</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {studentData.interest}
                                                    </p>
                                                </div>
                                                <div className="px-3 py-1 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-lg border border-purple-100 dark:border-purple-500/30">
                                                    Match
                                                </div>
                                            </div>
                                        )}

                                        {/* Education History */}
                                        {studentData.educationHistory.length > 0 && (
                                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                <label className="text-xs text-slate-500 uppercase flex items-center gap-1 mb-3">
                                                    <GraduationCap size={12} />
                                                    Education History ({studentData.educationHistory.length} records)
                                                </label>
                                                <div className="space-y-4">
                                                    {studentData.educationHistory.map((edu, idx) => (
                                                        <div key={idx} className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/5">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 dark:text-white">{edu.degreeName || 'Degree'}</p>
                                                                    <p className="text-sm text-slate-500">{edu.instituteName || 'Institution'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-cyan-600 dark:text-cyan-400">{edu.cgpa || edu.percentage || 'N/A'}</p>
                                                                    <p className="text-xs text-slate-400">{edu.passingYear || ''}</p>
                                                                </div>
                                                            </div>
                                                            {/* Result Card Image */}
                                                            {edu.resultCard && (
                                                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                                                        <ImageIcon size={12} />
                                                                        <span>Result Card Attached</span>
                                                                    </div>
                                                                    <a
                                                                        href={edu.resultCard}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                                                                    >
                                                                        <ExternalLink size={12} />
                                                                        View Result Card
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Test History */}
                                        {studentData.testHistory.length > 0 && (
                                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                <label className="text-xs text-slate-500 uppercase flex items-center gap-1 mb-3">
                                                    <Award size={12} />
                                                    Test History ({studentData.testHistory.length} tests)
                                                </label>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {studentData.testHistory.slice(0, 5).map((test, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm">
                                                            <span className="text-slate-700 dark:text-slate-300">{test.testName || test.skill || 'Test'}</span>
                                                            <span className={`font-medium ${test.passed ? 'text-green-500' : 'text-red-500'}`}>
                                                                {test.score || 0}/{test.totalQuestions || 0} ({test.percentage || 0}%)
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {studentData.testHistory.length > 5 && (
                                                        <p className="text-xs text-slate-400">+{studentData.testHistory.length - 5} more tests</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Manual Input Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <FileText size={14} />
                                            Additional Information
                                        </h4>

                                        {/* Phone Number */}
                                        <div className="space-y-2">
                                            <label className="text-sm text-slate-600 dark:text-slate-400">Phone Number *</label>
                                            <div className="relative">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    required
                                                    type="tel"
                                                    placeholder="+92 300 1234567"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/30 transition-all"
                                                    value={formData.phoneNumber}
                                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="text-sm text-slate-600 dark:text-slate-400">Personal Statement / Description</label>
                                            <textarea
                                                rows={4}
                                                placeholder="Tell us about yourself, your goals, and why you want to join this program..."
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/30 transition-all resize-none"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={isSubmitting}
                                        type="submit"
                                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send size={20} />
                                                Submit Application
                                            </>
                                        )}
                                    </motion.button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );
};

export default ApplyModal;
