import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    Check, X, Clock, User, GraduationCap, Search,
    ChevronDown, ChevronUp, Loader2, Calendar,
    FileText, Download, Mail, Users, Award,
    BookOpen, CheckCircle2, Phone, Eye, Printer, MessageCircle
} from 'lucide-react';
import {
    collection, query, where, onSnapshot,
    updateDoc, doc, addDoc, getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../../components/UserAvatar';
import UserProfileModal from '../../components/UserProfileModal';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import eduNestLogo from '../../assets/EduNest.png';


function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Application Detail Modal
const ApplicationDetailModal = ({ isOpen, onClose, application }) => {
    const pdfRef = useRef(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [startingChat, setStartingChat] = useState(false);
    const { currentUser, userProfile } = useAuth(); // Get current user
    const navigate = useNavigate(); // For navigation

    if (!isOpen || !application) return null;

    const profile = application.studentProfile || {};
    const educationHistory = profile.educationHistory || [];
    const testHistory = profile.testHistory || [];
    const studentPhoto = profile.profilePic || profile.photoURL || application.studentPhoto || '';

    // Generate PDF HTML content
    const generatePDFHTML = () => {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; background: white; color: #1e293b; position: relative;">
                <!-- Watermark -->
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 800; color: rgba(6, 182, 212, 0.06); pointer-events: none; z-index: 0; white-space: nowrap;">EDUNEST</div>
                
                <div style="position: relative; z-index: 1;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 15px; border-bottom: 3px solid #0891b2; margin-bottom: 25px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${eduNestLogo}" style="width: 45px; height: 45px; border-radius: 8px;" crossorigin="anonymous" />
                            <div>
                                <div style="font-size: 22px; font-weight: 800; color: #0891b2;">EduNest</div>
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px;">AI-Powered Education Platform</div>
                            </div>
                        </div>
                        <div style="padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 11px; text-transform: uppercase; background: ${application.status === 'accepted' ? '#d1fae5' : application.status === 'rejected' ? '#fee2e2' : '#fef3c7'}; color: ${application.status === 'accepted' ? '#065f46' : application.status === 'rejected' ? '#991b1b' : '#92400e'};">
                            ${(application.status || 'PENDING').toUpperCase()}
                        </div>
                    </div>
                    
                    <h1 style="text-align: center; font-size: 20px; margin-bottom: 20px; color: #334155;">📋 Student Application Form</h1>
                    
                    <!-- Student Profile -->
                    <div style="display: flex; gap: 18px; align-items: center; padding: 18px; background: linear-gradient(135deg, #f0f9ff, #f5f3ff); border-radius: 12px; margin-bottom: 20px; border: 1px solid #e0e7ff;">
                        ${studentPhoto ?
                `<img src="${studentPhoto}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.1);" crossorigin="anonymous" />` :
                `<div style="width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #0891b2, #8b5cf6); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700; border: 3px solid white;">${(profile.fullName || application.studentName || 'S').charAt(0).toUpperCase()}</div>`
            }
                        <div>
                            <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 4px 0;">${profile.fullName || application.studentName || 'N/A'}</h2>
                            <p style="color: #64748b; font-size: 12px; margin: 2px 0;">📧 ${profile.email || 'N/A'}</p>
                            <p style="color: #64748b; font-size: 12px; margin: 2px 0;">📱 ${profile.phoneNumber || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <!-- Program Details -->
                    <div style="margin-bottom: 18px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">🎓 Program Details</div>
                        <div style="display: flex; gap: 12px;">
                            <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Applied Program</div>
                                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${application.programName || application.degreeName || 'N/A'}</div>
                            </div>
                            <div style="flex: 1; padding: 10px; background: #f8fafc; border-radius: 6px;">
                                <div style="font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Application Date</div>
                                <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${application.submittedAt?.toDate ? application.submittedAt.toDate().toLocaleDateString() : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    ${profile.description ? `
                    <div style="margin-bottom: 18px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📝 Personal Statement</div>
                        <div style="background: #f0f9ff; padding: 12px; border-radius: 8px; border-left: 3px solid #0891b2; color: #334155; font-size: 12px; line-height: 1.6;">${profile.description}</div>
                    </div>` : ''}
                    
                    ${educationHistory.length > 0 ? `
                    <div style="margin-bottom: 18px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📚 Education History</div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead><tr style="background: #0891b2;">
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Degree</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Institution</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Year</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Grade</th>
                            </tr></thead>
                            <tbody>
                                ${educationHistory.map((edu, i) => `
                                    <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${edu.degreeName || edu.degree || 'N/A'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${edu.instituteName || edu.institute || 'N/A'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${edu.passingYear || edu.year || 'N/A'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">${edu.cgpa || edu.percentage || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${educationHistory.some(edu => edu.resultCard || edu.resultCardUrl) ? `
                        <div style="margin-top: 18px;">
                            <h4 style="color: #64748b; font-size: 12px; margin-bottom: 10px;">📎 Result Cards</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                                ${educationHistory.filter(edu => edu.resultCard || edu.resultCardUrl).map(edu => `
                                    <div style="flex: 0 0 calc(50% - 6px); border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                        <div style="background: #f8fafc; padding: 6px 10px; font-size: 10px; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">${edu.degreeName || edu.degree || 'Result'}</div>
                                        <img src="${edu.resultCard || edu.resultCardUrl}" style="width: 100%; height: 140px; object-fit: contain; padding: 8px; background: #fff;" crossorigin="anonymous" />
                                    </div>
                                `).join('')}
                            </div>
                        </div>` : ''}
                    </div>` : ''}
                    
                    ${testHistory.length > 0 ? `
                    <div style="margin-bottom: 18px; padding: 15px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;">
                        <div style="font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">📊 Test History</div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead><tr style="background: #0891b2;">
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Test</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Score</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">%</th>
                                <th style="padding: 8px; text-align: left; color: white; font-size: 10px;">Result</th>
                            </tr></thead>
                            <tbody>
                                ${testHistory.map((test, i) => `
                                    <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${test.testName || test.topic || 'Test'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${test.score || 0}/${test.totalQuestions || 0}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${test.percentage || 0}%</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: ${test.passed || test.status === 'pass' ? '#059669' : '#dc2626'};">${test.passed || test.status === 'pass' ? '✅ PASS' : '❌ FAIL'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>` : ''}
                    
                    <!-- Footer -->
                    <div style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center;">
                        <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                            <img src="${eduNestLogo}" style="width: 22px; height: 22px; border-radius: 4px;" crossorigin="anonymous" />
                            <span style="font-size: 14px; font-weight: 700; color: #0891b2;">EduNest</span>
                        </div>
                        <div style="font-size: 9px; color: #94a3b8;">Generated: ${new Date().toLocaleString()} | AI-Powered Education Platform</div>
                    </div>
                </div>
            </div>
        `;
    };

    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);

        try {
            // Open new window with content for Print to PDF
            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) {
                alert('Please allow popups for this site to download PDF');
                setIsGeneratingPDF(false);
                return;
            }

            const htmlContent = generatePDFHTML();

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Application_${(profile.fullName || application.studentName || 'Student').replace(/\s+/g, '_')}</title>
                    <style>
                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        body { font-family: Arial, sans-serif; background: white; }
                        img { max-width: 100%; }
                        @media print {
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        }
                        @page { margin: 10mm; size: A4; }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() { window.print(); }, 800);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Application - ${profile.fullName || application.studentName}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; }
                    img { max-width: 100%; }
                    @media print { 
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${generatePDFHTML()}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 800);
    };

    // Start Chat Function
    const handleStartChat = async () => {
        if (!currentUser || !application.studentId) return;

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
                if (chatData.participants.includes(application.studentId)) {
                    existingChatId = doc.id;
                }
            });

            if (existingChatId) {
                onClose();
                navigate(`/messages/${existingChatId}`);
            } else {
                // Create new chat
                const newChat = await addDoc(collection(db, 'chats'), {
                    participants: [currentUser.uid, application.studentId],
                    participantNames: {
                        [currentUser.uid]: userProfile?.fullName || 'Manager',
                        [application.studentId]: application.studentName || 'Student'
                    },
                    participantPhotos: {
                        [currentUser.uid]: userProfile?.photoURL || null,
                        [application.studentId]: application.studentPhoto || null
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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Application Details</h2>
                                    <p className="text-slate-500 text-sm mt-1">{application.programName || application.degreeName}</p>
                                </div>
                                <div className="flex items-center gap-2">

                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleStartChat}
                                        disabled={startingChat}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {startingChat ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <MessageCircle size={18} />
                                        )}
                                        Message
                                    </motion.button>


                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handlePrint}
                                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-semibold transition-all"
                                    >
                                        <Printer size={18} />
                                        Print
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500"
                                    >
                                        <X size={20} />
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] space-y-6">
                            {/* Status Banner */}
                            <div className={cn(
                                "p-4 rounded-xl flex items-center justify-between",
                                application.status === 'accepted' && "bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20",
                                application.status === 'rejected' && "bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20",
                                (!application.status || application.status === 'pending') && "bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        application.status === 'accepted' && "bg-green-500 text-white",
                                        application.status === 'rejected' && "bg-red-500 text-white",
                                        (!application.status || application.status === 'pending') && "bg-yellow-500 text-white"
                                    )}>
                                        {application.status === 'accepted' ? <Check size={20} /> :
                                            application.status === 'rejected' ? <X size={20} /> :
                                                <Clock size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Status: {application.status?.toUpperCase() || 'PENDING'}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Applied: {application.submittedAt?.toDate ? application.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Info */}
                            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                    <User size={18} className="text-cyan-500" />
                                    Personal Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Full Name</p>
                                        <p className="text-slate-900 dark:text-white font-medium">{profile.fullName || application.studentName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Email</p>
                                        <p className="text-slate-900 dark:text-white font-medium break-all">{profile.email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase mb-1">Phone Number</p>
                                        <p className="text-slate-900 dark:text-white font-medium flex items-center gap-1">
                                            <Phone size={14} className="text-slate-400" />
                                            {profile.phoneNumber || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Statement */}
                            {profile.description && (
                                <div className="bg-cyan-50 dark:bg-cyan-500/5 rounded-2xl p-5 border border-cyan-100 dark:border-cyan-500/10">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                                        <FileText size={18} className="text-cyan-500" />
                                        Personal Statement
                                    </h3>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{profile.description}</p>
                                </div>
                            )}

                            {/* Education History */}
                            {educationHistory.length > 0 && (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                        <GraduationCap size={18} className="text-purple-500" />
                                        Education History ({educationHistory.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {educationHistory.map((edu, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{edu.degreeName || 'Degree'}</p>
                                                    <p className="text-sm text-slate-500">{edu.instituteName || 'Institution'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-cyan-600 dark:text-cyan-400">{edu.cgpa || edu.percentage || 'N/A'}</p>
                                                    <p className="text-xs text-slate-400">{edu.passingYear || ''}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Test History */}
                            {testHistory.length > 0 && (
                                <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                        <Award size={18} className="text-amber-500" />
                                        Test History ({testHistory.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {testHistory.map((test, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5">
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{test.testName || 'Test'}</p>
                                                    <p className="text-sm text-slate-500">Score: {test.score || 0}/{test.totalQuestions || 0}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">{test.percentage || 0}%</p>
                                                    <span className={cn(
                                                        "text-xs font-bold px-2 py-0.5 rounded-full",
                                                        test.passed ? "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                                                    )}>
                                                        {test.passed ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hidden PDF Template */}
                        <div ref={pdfRef} className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {/* Watermark */}
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: '100px', fontWeight: '800', color: 'rgba(6, 182, 212, 0.05)', pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap', letterSpacing: '10px' }}>EDUNEST</div>

                            <div style={{ padding: '30px', position: 'relative', zIndex: 1 }}>
                                {/* Header with Logo */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: '3px solid #0891b2', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <img src={eduNestLogo} alt="EduNest" style={{ width: '50px', height: '50px', borderRadius: '8px' }} crossOrigin="anonymous" />
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0891b2' }}>EduNest</div>
                                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>AI-Powered Education Platform</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '8px 20px', borderRadius: '30px', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', background: application.status === 'accepted' ? '#d1fae5' : application.status === 'rejected' ? '#fee2e2' : '#fef3c7', color: application.status === 'accepted' ? '#065f46' : application.status === 'rejected' ? '#991b1b' : '#92400e' }}>
                                        {(application.status || 'PENDING').toUpperCase()}
                                    </div>
                                </div>

                                <h1 style={{ textAlign: 'center', fontSize: '22px', marginBottom: '20px', color: '#334155' }}>📋 Student Application Form</h1>

                                {/* Student Profile */}
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '20px', background: 'linear-gradient(135deg, #f0f9ff, #f5f3ff)', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e0e7ff' }}>
                                    {studentPhoto ? (
                                        <img src={studentPhoto} alt="Student" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} crossOrigin="anonymous" />
                                    ) : (
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #0891b2, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', fontWeight: '700', border: '3px solid white' }}>
                                            {(profile.fullName || application.studentName || 'S').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '5px' }}>{profile.fullName || application.studentName || 'N/A'}</h2>
                                        <p style={{ color: '#64748b', fontSize: '13px' }}>📧 {profile.email || 'N/A'}</p>
                                        <p style={{ color: '#64748b', fontSize: '13px' }}>📱 {profile.phoneNumber || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Program Details */}
                                <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>🎓 Program Details</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Applied Program</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{application.programName || application.degreeName || 'N/A'}</div>
                                        </div>
                                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Application Date</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{application.submittedAt?.toDate ? application.submittedAt.toDate().toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Statement */}
                                {profile.description && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>📝 Personal Statement</div>
                                        <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0891b2', color: '#334155', lineHeight: '1.6' }}>{profile.description}</div>
                                    </div>
                                )}

                                {/* Education History */}
                                {educationHistory.length > 0 && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', pageBreakInside: 'avoid' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>📚 Education History</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#0891b2' }}>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Degree</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Institution</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Year</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {educationHistory.map((edu, idx) => (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{edu.degreeName || edu.degree || 'N/A'}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{edu.instituteName || edu.institute || 'N/A'}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{edu.passingYear || edu.year || 'N/A'}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600' }}>{edu.cgpa || edu.percentage || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Result Cards */}
                                        {educationHistory.some(edu => edu.resultCard || edu.resultCardUrl) && (
                                            <div style={{ marginTop: '20px', pageBreakBefore: 'auto' }}>
                                                <h4 style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>📎 Attached Result Cards</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                                    {educationHistory.filter(edu => edu.resultCard || edu.resultCardUrl).map((edu, idx) => (
                                                        <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', pageBreakInside: 'avoid' }}>
                                                            <div style={{ background: '#f8fafc', padding: '8px 12px', fontWeight: '600', fontSize: '12px', color: '#334155', borderBottom: '1px solid #e2e8f0' }}>{edu.degreeName || edu.degree || 'Result Card'}</div>
                                                            <img src={edu.resultCard || edu.resultCardUrl} alt="Result Card" style={{ width: '100%', height: '180px', objectFit: 'contain', background: '#fff', padding: '8px' }} crossOrigin="anonymous" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Test History */}
                                {testHistory.length > 0 && (
                                    <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', pageBreakInside: 'avoid' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0891b2', textTransform: 'uppercase', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>📊 Test History</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#0891b2' }}>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Test Name</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Score</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Percentage</th>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: 'white', fontSize: '11px' }}>Result</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {testHistory.map((test, idx) => (
                                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{test.testName || 'Test'}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{test.score || 0}/{test.totalQuestions || 0}</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>{test.percentage || 0}%</td>
                                                        <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '600', color: test.passed ? '#059669' : '#dc2626' }}>{test.passed ? '✅ PASSED' : '❌ FAILED'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Footer */}
                                <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <img src={eduNestLogo} alt="EduNest" style={{ width: '25px', height: '25px', borderRadius: '4px' }} crossOrigin="anonymous" />
                                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#0891b2' }}>EduNest</span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                        Generated on {new Date().toLocaleString()} | AI-Powered Education Platform<br />
                                        This is an official document generated by EduNest
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );
};

// Ultra-Premium Application Card with Magnetic Hover
const ApplicationCard = ({ app, expanded, onToggle, onStatusUpdate, statusInfo, index, onViewProfile, onViewDetails }) => {
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

    const getStatusColor = (status) => {
        const s = status?.toLowerCase() || 'pending';
        return s === 'accepted' ? 'emerald' : s === 'rejected' ? 'red' : 'yellow';
    };

    const statusColor = getStatusColor(app.status);

    return (
        <motion.div
            ref={cardRef}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.02
            }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative perspective-1000"
        >
            <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className={cn(
                    "relative overflow-hidden rounded-3xl transition-all duration-500",
                    "bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl",
                    "border border-slate-200/60 dark:border-white/10",
                    "shadow-lg hover:shadow-2xl dark:shadow-black/40",
                    expanded && "ring-2 ring-cyan-500/50 dark:ring-cyan-400/50"
                )}
            >
                {/* Status Accent Bar */}
                <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.02 + 0.1 }}
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-1.5 origin-top",
                        statusColor === 'emerald' && "bg-gradient-to-b from-emerald-400 to-emerald-600",
                        statusColor === 'red' && "bg-gradient-to-b from-red-400 to-red-600",
                        statusColor === 'yellow' && "bg-gradient-to-b from-yellow-400 to-amber-600"
                    )}
                />

                {/* Shimmer Effect */}
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: index * 0.3,
                        ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100"
                />

                <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4 cursor-pointer" onClick={onToggle}>
                        {/* Avatar */}
                        <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                            className="flex-shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                onViewProfile && onViewProfile(app.studentId, {
                                    id: app.studentId,
                                    fullName: app.studentName,
                                    email: app.studentEmail,
                                    role: 'student',
                                    photoURL: app.studentPhoto
                                });
                            }}
                        >
                            <UserAvatar
                                userId={app.studentId}
                                src={app.studentPhoto}
                                name={app.studentName}
                                size="xl"
                                interactive={true}
                                className="ring-2 ring-cyan-200 dark:ring-cyan-500/30"
                            />
                        </motion.div>

                        {/* Main Content */}
                        <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="min-w-0 flex-grow">
                                    <motion.h3
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.02 + 0.05 }}
                                        className="text-xl font-black text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                                    >
                                        {app.studentName || 'Unknown Student'}
                                    </motion.h3>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.02 + 0.1 }}
                                        className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-600 dark:text-slate-400"
                                    >
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                                            <GraduationCap size={14} className="text-slate-500 dark:text-slate-400" />
                                            <span className="font-semibold">{app.programName || app.degreeName}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
                                            <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                                            <span className="text-xs">{app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleDateString() : 'Recent'}</span>
                                        </span>
                                    </motion.div>
                                </div>

                                {/* Status Badge */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15, delay: index * 0.02 + 0.15 }}
                                    className={cn(
                                        "px-4 py-2 rounded-full border-2 text-xs font-black uppercase tracking-wider shadow-lg flex-shrink-0",
                                        statusColor === 'emerald' && "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30",
                                        statusColor === 'red' && "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30",
                                        statusColor === 'yellow' && "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30"
                                    )}
                                >
                                    {statusInfo.label}
                                </motion.div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                {/* View Details Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => onViewDetails(app)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold transition-all"
                                >
                                    <Eye size={16} />
                                    <span className="text-sm">View Details</span>
                                </motion.button>

                                {(!app.status || app.status === 'pending') && (
                                    <div className="flex items-center gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => onStatusUpdate(app.id, 'accepted')}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all"
                                            title="Approve"
                                        >
                                            <Check size={18} strokeWidth={3} />
                                            <span className="text-sm">Approve</span>
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: -5 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => onStatusUpdate(app.id, 'rejected')}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold shadow-lg shadow-red-500/30 transition-all"
                                            title="Reject"
                                        >
                                            <X size={18} strokeWidth={3} />
                                            <span className="text-sm">Reject</span>
                                        </motion.button>
                                    </div>
                                )}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="ml-auto p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                >
                                    {expanded ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                                </motion.button>
                            </div>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-6 pt-6 border-t-2 border-slate-200 dark:border-white/10">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Academic Info */}
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <BookOpen size={16} className="text-cyan-500" />
                                                <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Quick Summary</p>
                                            </div>
                                            <div className="space-y-2">
                                                {[
                                                    { label: 'Phone', value: app.studentProfile?.phoneNumber || 'N/A' },
                                                    { label: 'Education', value: `${app.studentProfile?.educationHistory?.length || 0} records` },
                                                    { label: 'Tests', value: `${app.studentProfile?.testHistory?.length || 0} completed` }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-white/5">
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>

                                        {/* Contact Info */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="md:col-span-2 space-y-3"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <Mail size={16} className="text-cyan-500" />
                                                <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Application Details</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 rounded-2xl border border-slate-200 dark:border-white/5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-bold">Email Address</p>
                                                    <p className="text-sm text-slate-900 dark:text-white font-semibold truncate">{app.studentProfile?.email || app.studentEmail || 'N/A'}</p>
                                                </div>
                                                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/30 dark:to-slate-900/30 rounded-2xl border border-slate-200 dark:border-white/5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-bold">Applied Date</p>
                                                    <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-semibold">
                                                        <Calendar size={14} className="text-cyan-500" />
                                                        {app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            {app.studentProfile?.description && (
                                                <div className="p-4 bg-cyan-50 dark:bg-cyan-500/5 rounded-2xl border border-cyan-100 dark:border-cyan-500/10">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-bold">Personal Statement</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{app.studentProfile.description}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ManagerAdmissions = () => {
    const { currentUser } = useAuth();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedId, setExpandedId] = useState(null);
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null, userData: null });
    const [detailModal, setDetailModal] = useState({ isOpen: false, application: null });

    const openProfileModal = (userId, userData) => {
        setProfileModal({ isOpen: true, userId, userData });
    };

    const closeProfileModal = () => {
        setProfileModal({ isOpen: false, userId: null, userData: null });
    };

    const openDetailModal = (app) => {
        setDetailModal({ isOpen: true, application: app });
    };

    const closeDetailModal = () => {
        setDetailModal({ isOpen: false, application: null });
    };

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'admissions'),
            where('universityId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            data.sort((a, b) => {
                const dateA = a.submittedAt?.toDate?.() || a.appliedAt?.toDate?.() || new Date(0);
                const dateB = b.submittedAt?.toDate?.() || b.appliedAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
            setApplications(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching admissions:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleStatusUpdate = async (appId, newStatus) => {
        try {
            const appRef = doc(db, 'admissions', appId);
            await updateDoc(appRef, {
                status: newStatus,
                processedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    const getStatusInfo = (status) => {
        const s = status?.toLowerCase() || 'pending';
        switch (s) {
            case 'accepted':
                return { style: '', label: 'Accepted' };
            case 'rejected':
                return { style: '', label: 'Rejected' };
            default:
                return { style: '', label: 'Pending' };
        }
    };

    const filteredApplications = applications.filter(app => {
        const matchesSearch = app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.programName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || app.status?.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const stats = {
        total: applications.length,
        pending: applications.filter(a => !a.status || a.status === 'pending').length,
        accepted: applications.filter(a => a.status === 'accepted').length,
        rejected: applications.filter(a => a.status === 'rejected').length
    };

    return (
        <div className="min-h-screen p-6 md:p-10 relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">

            {/* Animated Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-5%] right-[-5%] w-[500px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        x: [0, -50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[100px]"
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="mb-10"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
                            >
                                Admissions <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 dark:from-cyan-400 dark:via-purple-400 dark:to-pink-400 animate-gradient">Portal</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2"
                            >
                                <Users size={16} /> Manage student applications
                            </motion.p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                    >
                        {[
                            { label: 'Total', value: stats.total, icon: FileText, color: 'cyan' },
                            { label: 'Pending', value: stats.pending, icon: Clock, color: 'yellow' },
                            { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, color: 'emerald' },
                            { label: 'Rejected', value: stats.rejected, icon: X, color: 'red' }
                        ].map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + idx * 0.05 }}
                                whileHover={{ y: -4 }}
                                className="p-5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        stat.color === 'cyan' && "bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
                                        stat.color === 'yellow' && "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                                        stat.color === 'emerald' && "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                        stat.color === 'red' && "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                    )}>
                                        <stat.icon size={18} />
                                    </div>
                                </div>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col lg:flex-row gap-4"
                    >
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by student or program..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium shadow-sm hover:shadow-md"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Status Filters */}
                        <div className="flex p-1.5 bg-white dark:bg-white/5 rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-x-auto shadow-sm">
                            {['all', 'pending', 'accepted', 'rejected'].map((filter, idx) => (
                                <motion.button
                                    key={filter}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setStatusFilter(filter)}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-sm font-black capitalize transition-all whitespace-nowrap",
                                        statusFilter === filter
                                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                    )}
                                >
                                    {filter}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </motion.header>

                {/* Applications List */}
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-40"
                    >
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
                            Loading applications...
                        </motion.p>
                    </motion.div>
                ) : filteredApplications.length === 0 ? (
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
                            <FileText size={48} className="text-slate-400 dark:text-slate-500" />
                        </motion.div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">No Applications Found</h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                            {statusFilter !== 'all' ? `No ${statusFilter} applications found.` : searchTerm ? "Try adjusting your search." : "Waiting for new applications."}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {filteredApplications.map((app, index) => (
                                <ApplicationCard
                                    key={app.id}
                                    app={app}
                                    index={index}
                                    expanded={expandedId === app.id}
                                    onToggle={() => setExpandedId(expandedId === app.id ? null : app.id)}
                                    onStatusUpdate={handleStatusUpdate}
                                    statusInfo={getStatusInfo(app.status)}
                                    onViewProfile={openProfileModal}
                                    onViewDetails={openDetailModal}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
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

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={profileModal.isOpen}
                onClose={closeProfileModal}
                userId={profileModal.userId}
                userData={profileModal.userData}
            />

            {/* Application Detail Modal */}
            <ApplicationDetailModal
                isOpen={detailModal.isOpen}
                onClose={closeDetailModal}
                application={detailModal.application}
            />
        </div>
    );
};

export default ManagerAdmissions;
