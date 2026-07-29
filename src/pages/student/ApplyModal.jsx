import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Send, User, GraduationCap, Phone, FileText,
    ClipboardList, Loader2, CheckCircle2,
    ShieldCheck, Sparkles, Fingerprint, BookOpen, Award, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { isScholarshipEligible } from '../../utils/scholarshipUtils';

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

    // Compute best eligible scholarship for this program
    const eligibleScholarship = (() => {
        if (!program?.scholarships || program.scholarships.length === 0) return null;
        if (!studentData.educationHistory && !userProfile) return null;
        let best = null;
        let maxGrant = 0;
        program.scholarships.forEach(s => {
            if (isScholarshipEligible(s, { ...userProfile, ...studentData }) === true) {
                const val = parseFloat(s.grantPercentage || 0);
                if (val > maxGrant) { maxGrant = val; best = s; }
            }
        });
        return best;
    })();

    // Fetch student profile and test history
    useEffect(() => {
        const fetchStudentData = async () => {
            if (!isOpen || !studentId) return;

            setLoadingProfile(true);
            let userData = {};
            let tests = [];

            try {
                const userDoc = await getDoc(doc(db, 'users', studentId));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }

            try {
                const testsQ = query(
                    collection(db, 'tests'),
                    where('userId', '==', studentId)
                );
                const testsSnap = await getDocs(testsQ);
                tests = testsSnap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));
            } catch (error) {
                console.error("Error fetching test history:", error);
            }

            setStudentData({
                fullName: userData.fullName || userProfile?.fullName || currentUser?.displayName || '',
                email: userData.email || userProfile?.email || currentUser?.email || '',
                profilePic: userData.profilePic || userData.photoURL || userProfile?.profilePic || currentUser?.photoURL || '',
                educationHistory: userData.educationHistory || userProfile?.educationHistory || [],
                testHistory: tests,
                interest: userData.interest || userProfile?.interest || ''
            });

            setLoadingProfile(false);
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

            // Check if there's an existing application (specifically a rejected one we are retrying)
            const existQ = query(
                collection(db, 'admissions'),
                where('studentId', '==', studentId),
                where('programId', '==', program.id)
            );
            const existSnap = await getDocs(existQ);

            let newAttempts = 1;
            if (!existSnap.empty) {
                const existingDoc = existSnap.docs[0].data();
                newAttempts = (existingDoc.attempts || 1) + 1;
            }

            const applicationData = {
                studentId: studentId,
                universityId: university.id,
                degreeId: program.id,
                degreeName: program.programName || program.name || program.title,
                programId: program.id,
                programName: program.programName || program.name || program.title,
                universityName: university.universityName || university.displayName,
                studentName: studentData.fullName,
                studentPhoto: studentData.profilePic,
                status: 'pending',
                appliedAt: serverTimestamp(),

                // Track number of attempts (max 3 allowed)
                attempts: newAttempts,

                // Clear out manager feedback on re-apply
                managerFeedback: null,

                // Attach scholarship info if eligible
                ...(eligibleScholarship ? { scholarshipInfo: eligibleScholarship } : {}),

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
                    submissionSource: 'v3_enhanced_reapply' // helps track successful reapplies
                }
            };

            if (!existSnap.empty) {
                // Update the existing rejected application
                const docId = existSnap.docs[0].id;
                await updateDoc(doc(db, 'admissions', docId), applicationData);
            } else {
                // Create new application
                await addDoc(collection(db, 'admissions'), {
                    ...applicationData,
                    submittedAt: serverTimestamp() // Only set on initial creation
                });
            }

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
                                    {/* Program Admission Requirements Card */}
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider">
                                                <Award size={16} /> Admission Eligibility Criteria
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                                University Standard
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-slate-500">Min FSc / Inter:</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{program?.minInterPercentage || 60}% Marks</span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-slate-500">Min Matric:</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{program?.minMatricPercentage || 50}% Marks</span>
                                            </div>
                                            {program?.allowedDomicile && (
                                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                    <span className="text-slate-500">Domicile:</span>
                                                    <span className="font-bold text-purple-600 dark:text-purple-400">{program.allowedDomicile}</span>
                                                </div>
                                            )}
                                            {program?.maxAgeLimit > 0 && (
                                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                    <span className="text-slate-500">Max Age Limit:</span>
                                                    <span className="font-bold text-slate-800 dark:text-white">{program.maxAgeLimit} Years</span>
                                                </div>
                                            )}
                                            {program?.minBachelorCgpa > 0 && (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                    <span className="text-slate-500">Min Bachelor CGPA:</span>
                                                    <span className="font-bold text-slate-800 dark:text-white">{program.minBachelorCgpa} / 4.0</span>
                                                </div>
                                            )}
                                            {Array.isArray(program?.entryTests) && program.entryTests.length > 0 ? (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 space-y-1">
                                                    <span className="text-slate-500 block font-medium">Accepted Entry Tests:</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {program.entryTests.map((t, tIdx) => (
                                                            <span key={tIdx} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-[10px] border border-cyan-500/20">
                                                                {t.testName} (Min {t.minScore}%)
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : program?.entryTestName && program?.entryTestName !== 'None' ? (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                    <span className="text-slate-500">Required Test:</span>
                                                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{program.entryTestName} (Min {program.minTestScore || 50}%)</span>
                                                </div>
                                            ) : null}

                                            {Array.isArray(program?.customRules) && program.customRules.length > 0 && (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                                                    <span className="text-purple-600 dark:text-purple-300 block font-bold text-[11px]">⚡ Specific Degree Criteria & Rules:</span>
                                                    <div className="space-y-1">
                                                        {program.customRules.map((cr, cIdx) => (
                                                            <div key={cIdx} className="flex items-center justify-between text-[11px]">
                                                                <span className="font-bold text-purple-700 dark:text-purple-300">{cr.label}:</span>
                                                                <span className="text-slate-600 dark:text-slate-300">{cr.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {program?.allowedInterStreams && program.allowedInterStreams.length > 0 && (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 space-y-1">
                                                    <span className="text-slate-500 block font-medium">Eligible Intermediate Streams:</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(Array.isArray(program.allowedInterStreams) ? program.allowedInterStreams : [program.allowedInterStreams]).map((st, sIdx) => (
                                                            <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold text-[10px] text-slate-700 dark:text-slate-200">
                                                                {st}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {program?.requiredDocuments && program.requiredDocuments.length > 0 && (
                                                <div className="col-span-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                                    <span className="text-emerald-600 dark:text-emerald-400 block font-bold text-[11px]">📋 Required Attachments Checklist:</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(Array.isArray(program.requiredDocuments) ? program.requiredDocuments : [program.requiredDocuments]).map((docItem, dIdx) => (
                                                            <span key={dIdx} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                                                                ✓ {docItem}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {program?.extraRequirements && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                                                📌 <b>Note:</b> {program.extraRequirements}
                                            </p>
                                        )}
                                    </div>

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

                                        {/* Scholarship Eligibility Banner */}
                                        {!loadingProfile && eligibleScholarship && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:to-amber-900/10 rounded-xl border border-yellow-300 dark:border-yellow-600/40 shadow-sm"
                                            >
                                                <div className="w-11 h-11 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                                                    <Award size={22} className="text-yellow-600 dark:text-yellow-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-0.5">🎉 Scholarship Eligible</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white">
                                                        {eligibleScholarship.criteriaTitle || eligibleScholarship.scholarshipTitle || 'Merit Waiver'}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">This scholarship will be auto-attached to your application</p>
                                                </div>
                                                <span className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-sm font-black rounded-full shadow-md shadow-yellow-400/30">
                                                    {String(eligibleScholarship.grantPercentage).includes('%') ? eligibleScholarship.grantPercentage : `${eligibleScholarship.grantPercentage}%`} OFF
                                                </span>
                                            </motion.div>
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
