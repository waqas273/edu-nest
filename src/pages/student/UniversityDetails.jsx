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
    Bus, Search, Linkedin, Instagram, Calendar, DollarSign, X, Printer, Download
} from 'lucide-react';
import ApplyModal from './ApplyModal';
import eduNestLogo from '../../assets/EduNest.png';
import UserProfileDisplay from '../../components/UserProfileDisplay';
import ProgramCard from '../../components/ProgramCard';
import UserProfileModal from '../../components/UserProfileModal';
import { isScholarshipEligible } from '../../utils/scholarshipUtils';
import LeafletCampusView from '../../components/LeafletCampusView';

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

    // New States for Redesign
    const [programSearch, setProgramSearch] = useState('');
    const [scholarshipSearch, setScholarshipSearch] = useState('');
    const [scholarshipFilter, setScholarshipFilter] = useState('all'); // 'all' or 'eligible'
    const [isProgramDetailsModalOpen, setIsProgramDetailsModalOpen] = useState(false);
    const [selectedProgramDetails, setSelectedProgramDetails] = useState(null);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [approvalApplicationData, setApprovalApplicationData] = useState(null);
    const [approvalSequenceNumber, setApprovalSequenceNumber] = useState(null);
    const pdfRef = React.useRef(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const [reviewers, setReviewers] = useState({});
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null });

    // Review form state
    const [myExistingReview, setMyExistingReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Re-apply state tracking
    const [reapplyTimers, setReapplyTimers] = useState({});

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
                    // Store the full application data object instead of just status
                    appsMap[data.programId] = { id: doc.id, ...data };
                });
                setMyApplications(appsMap);

                // Derive a stable sequential-looking number from the student's own approved doc ID
                // (avoids cross-collection queries that violate student Firebase rules)
                const studentApproved = admissionsSnap.docs.find(d => d.data().status === 'accepted');
                if (studentApproved) {
                    // Generate a consistent number from doc ID characters
                    const docId = studentApproved.id;
                    const num = docId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 900 + 100;
                    setApprovalSequenceNumber(num);
                }

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

    // Handle Rejected Countdown Logic
    useEffect(() => {
        let interval;
        const activeTimers = Object.entries(reapplyTimers).filter(([_, timer]) => timer > 0);

        if (activeTimers.length > 0) {
            interval = setInterval(() => {
                setReapplyTimers(prev => {
                    const newTimers = { ...prev };
                    let changed = false;
                    for (const [progId, time] of Object.entries(newTimers)) {
                        if (time > 0) {
                            newTimers[progId] = time - 1;
                            changed = true;
                        }
                    }
                    return changed ? newTimers : prev;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [reapplyTimers]);

    // Computed Values
    const filteredPrograms = degrees.filter(p =>
        p.title?.toLowerCase().includes(programSearch.toLowerCase()) ||
        p.degreeType?.toLowerCase().includes(programSearch.toLowerCase())
    );

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

    // Calculate best eligible scholarship for the approved program
    const getBestScholarship = () => {
        if (!approvalApplicationData || !degrees || degrees.length === 0) return null;

        // Find the specific program from the degrees state (fetched from Firestore)
        const program = degrees.find(d =>
            d.title === approvalApplicationData.programName ||
            d.id === approvalApplicationData.programId
        );
        if (!program || !program.scholarships || program.scholarships.length === 0) return null;

        let bestScholarship = null;
        let maxGrant = 0;

        program.scholarships.forEach(s => {
            if (isScholarshipEligible(s, userProfile) === true) {
                const grantVal = parseFloat(s.grantPercentage || 0);
                if (grantVal > maxGrant) {
                    maxGrant = grantVal;
                    bestScholarship = s;
                }
            }
        });

        return bestScholarship;
    };

    // Helper: build the Application Reference ID
    const buildAppRefId = (appData) => {
        if (!university || !appData) return 'EDUNEST-UNI-0001';
        // Use first word of university name
        const shortName = (university.universityName || 'UNI').split(' ')[0].toUpperCase();
        // Use stored sequential approvalNumber if available, else derive a 4-digit hash
        const seqNum = appData.approvalNumber
            ? String(appData.approvalNumber).padStart(4, '0')
            : String((appData.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000 + 1000);
        return `EDUNEST-${shortName}-${seqNum}`;
    };

    // PDF Generation Logic for Admission Approval
    const generatePDFHTML = () => {
        if (!approvalApplicationData || !university) return '';

        const scholarship = getBestScholarship() || approvalApplicationData?.scholarshipInfo;
        const appRefId = buildAppRefId(approvalApplicationData);

        return `
            <div style="
                font-family: Arial, sans-serif;
                width: 794px;
                height: 1123px;
                margin: 0;
                background: white;
                color: #1e293b;
                position: relative;
                display: flex;
                flex-direction: column;
                padding: 0;
                overflow: hidden;
            ">
                <!-- Watermark: absolute inside the A4 container, behind all content -->
                <div style="
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    width: 65%;
                    opacity: 0.07;
                    z-index: 0;
                    pointer-events: none;
                ">
                    <img src="${eduNestLogo}" style="width:100%; height:auto; object-fit:contain;" crossorigin="anonymous" />
                </div>

                <!-- Main scrollable content (z-index above watermark) -->
                <div style="position: relative; z-index: 1; flex: 1; padding: 40px 48px 24px 48px;">

                    <!-- Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:18px; border-bottom:3px solid #0891b2; margin-bottom:26px;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <img src="${eduNestLogo}" style="width:56px; height:56px; border-radius:10px;" crossorigin="anonymous" />
                            <div>
                                <div style="font-size:26px; font-weight:800; color:#0891b2; letter-spacing:-0.5px;">EduNest</div>
                                <div style="font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:2px;">Official Admissions Office</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:14px; font-weight:700; color:#334155;">${university.universityName || 'University'}</div>
                            <div style="font-size:12px; color:#64748b;">${university.location || 'Campus'}</div>
                            <div style="font-size:12px; color:#64748b; margin-top:4px;">Date: ${new Date().toLocaleDateString('en-GB')}</div>
                        </div>
                    </div>

                    <!-- Title -->
                    <h1 style="text-align:center; font-size:22px; font-weight:800; color:#1e293b; letter-spacing:2px; text-transform:uppercase; margin-bottom:26px;">
                        Official Admission Approval
                    </h1>

                    <!-- Letter body -->
                    <div style="font-size:14px; line-height:1.8; color:#334155; margin-bottom:28px;">
                        Dear <strong>${approvalApplicationData.studentName || userProfile?.fullName || 'Student'}</strong>,<br/><br/>
                        Congratulations! On behalf of the Admissions Committee at
                        <strong>${university.universityName || 'our University'}</strong>,
                        we are thrilled to inform you that you have been admitted to the
                        <strong>${approvalApplicationData.programName || 'Degree Program'}</strong>.
                        <br/><br/>
                        Your academic history and personal achievements have impressed us, and we are confident
                        that you will be a valuable addition to our academic community.
                    </div>

                    <!-- Details table card — rgba so watermark peeks through -->
                    <div style="
                        background: rgba(248,250,252,0.65);
                        border: 1px solid #e2e8f0;
                        border-radius: 14px;
                        padding: 22px 24px;
                        margin-bottom: 28px;
                    ">
                        <div style="font-size:11px; font-weight:800; color:#0891b2; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">
                            Admission Details
                        </div>
                        <table style="width:100%; border-collapse:collapse;">
                            <tr>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:12px; color:#64748b; width:35%;"><strong>Student Name:</strong></td>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:13px; font-weight:700; color:#1e293b;">${approvalApplicationData.studentName || userProfile?.fullName || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:12px; color:#64748b;"><strong>Program Admitted:</strong></td>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:13px; font-weight:700; color:#1e293b;">${approvalApplicationData.programName || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:12px; color:#64748b;"><strong>Application Reference:</strong></td>
                                <td style="padding:9px 0; border-bottom:1px dashed #cbd5e1; font-size:13px; font-weight:700; color:#0891b2; font-family:monospace; letter-spacing:1.5px;">${appRefId}</td>
                            </tr>
                            <tr>
                                <td style="padding:9px 0; border-bottom:${scholarship ? '1px dashed #cbd5e1' : 'none'}; font-size:12px; color:#64748b;"><strong>Approval Date:</strong></td>
                                <td style="padding:9px 0; border-bottom:${scholarship ? '1px dashed #cbd5e1' : 'none'}; font-size:13px; font-weight:700; color:#1e293b;">
                                    ${approvalApplicationData.processedAt ? new Date(approvalApplicationData.processedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
                                </td>
                            </tr>
                            ${scholarship ? `
                            <tr>
                                <td style="padding:11px 0; font-size:12px; color:#64748b;"><strong>Scholarship Awarded:</strong></td>
                                <td style="padding:11px 0;">
                                    <span style="font-size:13px; font-weight:600; color:#92400e;">${scholarship.criteriaTitle || scholarship.scholarshipTitle || 'Merit Waiver'}</span>
                                    <span style="
                                        display:inline-block; margin-left:10px;
                                        padding:4px 14px;
                                        background:linear-gradient(135deg,#f59e0b,#d97706);
                                        color:white; border-radius:20px;
                                        font-size:12px; font-weight:700;
                                    ">
                                        ${String(scholarship.grantPercentage).includes('%') ? scholarship.grantPercentage : scholarship.grantPercentage + '%'} Fee Waiver
                                    </span>
                                </td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                </div>

                <!-- Footer: block element at bottom of the flex container — always same page -->
                <div style="
                    position: relative; z-index: 1;
                    padding: 12px 48px;
                    background: #f1f5f9;
                    border-top: 2px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                ">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <img src="${eduNestLogo}" style="width:20px; height:20px; border-radius:4px;" crossorigin="anonymous" />
                        <span style="font-size:12px; font-weight:800; color:#0891b2;">EduNest</span>
                        <span style="font-size:10px; color:#94a3b8; margin-left:4px;">Official Admissions Platform</span>
                    </div>
                    <div style="font-size:10px; color:#94a3b8;">&copy; ${new Date().getFullYear()} EduNest. All rights reserved.</div>
                </div>
            </div>
        `;
    };
    const handleDownloadPDF = async () => {
        setIsGeneratingPDF(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = pdfRef.current;
            const opt = {
                margin: [0, 0, 0, 0],
                filename: `Admission_Approval_${approvalApplicationData?.programName?.replace(/\s+/g, '_') || 'Letter'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to download PDF. Please try again.');
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
                <title>Admission Approval - ${approvalApplicationData?.programName || 'Program'}</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: Arial, sans-serif; background: white; }
                    img { max-width: 100%; }
                    @page { margin: 0; size: A4; }
                    @media print {
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        html, body { width: 794px; }
                    }
                </style>
            </head>
            <body>
                ${generatePDFHTML()}
                <script>
                    window.onload = function() {
                        setTimeout(function () { window.print(); }, 800);
                    };
                <\/script>
            </body>
        </html>
`);
        printWindow.document.close();
    };

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
                                    className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'; }} />
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
                            {activeTab === 'overview' ? (
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
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Campus &amp; Infrastructure</h3>
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
                                                            alt={`Campus ${idx + 1} `}
                                                            crossOrigin="anonymous"
                                                            className="w-full h-full object-cover hover:opacity-90 transition-opacity" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'; }} />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Campus Location Map */}
                                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <MapPin size={20} className="text-cyan-500" />
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Campus Location</h3>
                                            {university.location && (
                                                <span className="ml-auto text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <MapPin size={13} className="text-cyan-400" />
                                                    {university.location}
                                                </span>
                                            )}
                                        </div>
                                        <LeafletCampusView university={university} />
                                    </div>
                                </motion.div>
                            ) : activeTab === 'programs' ? (
                                <motion.div
                                    key="programs"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {/* Programs Header & Search */}
                                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Academic Programs</h3>
                                            <p className="text-sm text-slate-500">Explore {degrees.length} available degrees</p>
                                        </div>
                                        <div className="relative w-full md:w-80">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search programs..."
                                                value={programSearch}
                                                onChange={(e) => setProgramSearch(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {filteredPrograms.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                                            <BookOpen className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
                                            <h4 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                                                {programSearch ? "No matching programs found" : "Admissions Opening Soon"}
                                            </h4>
                                            <p className="text-slate-500">
                                                {programSearch ? "Try adjusting your search terms." : "No programs available at this time."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {filteredPrograms.map((degree, index) => {
                                                const applicationDoc = myApplications[degree.id];
                                                const hasAppliedStatus = applicationDoc?.status;
                                                const attemptsCount = applicationDoc?.attempts || 1;
                                                const maxAttemptsReached = attemptsCount >= 3;
                                                return (
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        key={degree.id}
                                                        className="group bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-all shadow-sm hover:shadow-xl hover:shadow-cyan-500/5"
                                                    >
                                                        <div className="p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                                                            {/* Logo/Icon */}
                                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-100 dark:border-cyan-500/20 flex flex-shrink-0 items-center justify-center">
                                                                <GraduationCap size={28} className="text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                                                            </div>

                                                            {/* Core Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                                                                        {degree.degreeType}
                                                                    </span>
                                                                    {university?.isAdmissionOpen !== false ? (
                                                                        <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                                                                            Admissions Open
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                                                                            Admissions Closed
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                                    {degree.title}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                                                    <div className="flex items-center gap-1.5 focus:outline-none">
                                                                        <Clock size={16} className="text-slate-400" />
                                                                        {degree.duration} ({degree.totalSemesters} Semesters)
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 focus:outline-none">
                                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">
                                                                            {degree.estimatedFee}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex flex-wrap lg:flex-col justify-end gap-3 w-full lg:w-48 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 lg:pl-6">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedProgramDetails(degree);
                                                                        setIsProgramDetailsModalOpen(true);
                                                                    }}
                                                                    className="flex-1 lg:flex-none py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white text-sm font-bold rounded-xl transition-colors border border-transparent dark:border-slate-700"
                                                                >
                                                                    View Details
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        if (hasAppliedStatus === 'accepted') {
                                                                            setApprovalApplicationData(applicationDoc);
                                                                            setIsApprovalModalOpen(true);
                                                                            return;
                                                                        }
                                                                        if (hasAppliedStatus === 'rejected') {
                                                                            if (maxAttemptsReached) return;

                                                                            // If already in countdown or finished, don't trigger again
                                                                            const currentTimer = reapplyTimers[degree.id];
                                                                            if (currentTimer === undefined) {
                                                                                // Start countdown
                                                                                setReapplyTimers(prev => ({ ...prev, [degree.id]: 3 }));
                                                                            } else if (currentTimer === 0 && university?.isAdmissionOpen !== false) {
                                                                                // Re-apply!
                                                                                setSelectedProgram(degree);
                                                                                setIsApplyModalOpen(true);
                                                                            }
                                                                            return;
                                                                        }
                                                                        if (!hasAppliedStatus && university?.isAdmissionOpen !== false) {
                                                                            setSelectedProgram(degree);
                                                                            setIsApplyModalOpen(true);
                                                                        }
                                                                    }}
                                                                    disabled={
                                                                        hasAppliedStatus === 'accepted'
                                                                            ? false
                                                                            : hasAppliedStatus === 'rejected'
                                                                                ? (maxAttemptsReached || reapplyTimers[degree.id] > 0 || (reapplyTimers[degree.id] === 0 && university?.isAdmissionOpen === false))
                                                                                : (!!hasAppliedStatus || university?.isAdmissionOpen === false)
                                                                    }
                                                                    className={`flex-1 lg:flex-none py-2.5 px-4 text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${hasAppliedStatus === 'accepted'
                                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 cursor-pointer"
                                                                            : hasAppliedStatus === 'rejected'
                                                                                ? maxAttemptsReached
                                                                                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 cursor-not-allowed border border-red-200 dark:border-red-900/30 shadow-none"
                                                                                    : reapplyTimers[degree.id] === undefined
                                                                                        ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 cursor-pointer"
                                                                                        : reapplyTimers[degree.id] > 0
                                                                                            ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 cursor-wait shadow-none"
                                                                                            : university?.isAdmissionOpen !== false
                                                                                                ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white hover:shadow-cyan-500/25 cursor-pointer"
                                                                                                : "bg-red-50 dark:bg-red-900/20 text-red-400 cursor-not-allowed border border-red-100 dark:border-red-900/30 shadow-none"
                                                                                : hasAppliedStatus
                                                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700 shadow-none"
                                                                                    : university?.isAdmissionOpen === false
                                                                                        ? "bg-red-50 dark:bg-red-900/20 text-red-400 cursor-not-allowed border border-red-100 dark:border-red-900/30 shadow-none"
                                                                                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white hover:shadow-cyan-500/25 cursor-pointer"
                                                                        }`}
                                                                >
                                                                    {hasAppliedStatus === 'accepted' ? (
                                                                        'Accepted'
                                                                    ) : hasAppliedStatus === 'rejected' ? (
                                                                        maxAttemptsReached ? (
                                                                            'Rejected (Max Attempts)'
                                                                        ) : reapplyTimers[degree.id] === undefined ? (
                                                                            `Rejected - Try Again (${3 - attemptsCount} left)`
                                                                        ) : reapplyTimers[degree.id] > 0 ? (
                                                                            `Wait ${reapplyTimers[degree.id]}s...`
                                                                        ) : university?.isAdmissionOpen !== false ? (
                                                                            'Apply Now'
                                                                        ) : (
                                                                            'Admissions Closed'
                                                                        )
                                                                    ) : hasAppliedStatus ? (
                                                                        'Applied'
                                                                    ) : university?.isAdmissionOpen === false ? (
                                                                        'Admissions Closed'
                                                                    ) : (
                                                                        'Apply Now'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            ) : activeTab === 'faculty' ? (
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
                                                                    crossOrigin="anonymous" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'; }} />
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
                            ) : activeTab === 'transport' ? (
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
                                                                <div key={idx} className={`relative overflow - hidden ${idx === 0 && item.vehicleImages.length === 1 ? 'col-span-2 md:col-span-4' : ''} `}>
                                                                    <img
                                                                        src={img}
                                                                        alt={`Vehicle ${idx + 1} `}
                                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                                        crossOrigin="anonymous" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'; }} />
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
                            ) : activeTab === 'scholarships' ? (
                                <motion.div
                                    key="scholarships"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    {/* Scholarships Header & Filters */}
                                    <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-yellow-100 dark:bg-yellow-500/10 rounded-xl">
                                                    <Sparkles size={24} className="text-yellow-600 dark:text-yellow-500" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scholarships & Grants</h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Available financial aid opportunities based on academic merit.</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                                <div className="relative w-full sm:w-64">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search scholarships..."
                                                        value={scholarshipSearch}
                                                        onChange={(e) => setScholarshipSearch(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-yellow-500/50 outline-none hover:border-yellow-300 transition-all dark:text-white"
                                                    />
                                                </div>
                                                <select
                                                    value={scholarshipFilter}
                                                    onChange={(e) => setScholarshipFilter(e.target.value)}
                                                    className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-yellow-500/50 outline-none cursor-pointer hover:border-yellow-300 transition-all"
                                                >
                                                    <option value="all">All Scholarships</option>
                                                    {currentUser && <option value="eligible">Only Eligible For Me</option>}
                                                </select>
                                            </div>
                                        </div>

                                        {(() => {
                                            let allScholarships = degrees.flatMap(p =>
                                                (p.scholarships || []).map(s => ({ ...s, programTitle: p.title || p.programName }))
                                            );

                                            // Apply Filters
                                            if (scholarshipSearch) {
                                                const searchLower = scholarshipSearch.toLowerCase();
                                                allScholarships = allScholarships.filter(s =>
                                                    s.scholarshipTitle?.toLowerCase().includes(searchLower) ||
                                                    s.programTitle?.toLowerCase().includes(searchLower) ||
                                                    s.criteriaTitle?.toLowerCase().includes(searchLower)
                                                );
                                            }

                                            if (scholarshipFilter === 'eligible' && currentUser) {
                                                allScholarships = allScholarships.filter(s => isScholarshipEligible(s, userProfile) === true);
                                            }

                                            // Sort by grant percentage
                                            allScholarships.sort((a, b) => parseFloat(b.grantPercentage) - parseFloat(a.grantPercentage));

                                            if (allScholarships.length === 0) {
                                                return (
                                                    <div className="text-center py-12 flex flex-col items-center border border-dashed border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                                            <Sparkles size={32} className="text-slate-400" />
                                                        </div>
                                                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                                            {scholarshipSearch || scholarshipFilter === 'eligible' ? 'No Matching Scholarships' : 'No Scholarships Added'}
                                                        </h4>
                                                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                                            {scholarshipSearch || scholarshipFilter === 'eligible'
                                                                ? 'Try adjusting your search criteria or filter settings.'
                                                                : 'This university has not listed any scholarship criteria for its programs yet.'}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {allScholarships.map((s, idx) => {
                                                        const isEligible = isScholarshipEligible(s, userProfile);
                                                        return (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                key={idx}
                                                                className="relative overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/50 rounded-2xl group hover:border-yellow-300 dark:hover:border-yellow-500/50 transition-all shadow-sm hover:shadow-xl hover:shadow-yellow-500/5"
                                                            >
                                                                {/* Decorative Type Indicator */}
                                                                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-yellow-300 to-amber-500" />

                                                                <div className="p-5 pl-7">
                                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                                                        <div>
                                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight mb-1 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                                                                                {s.scholarshipTitle || 'Merit Scholarship'}
                                                                            </h4>
                                                                            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">{s.programTitle}</p>
                                                                        </div>

                                                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                                                            <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-black rounded-full shadow-md whitespace-nowrap">
                                                                                {s.type === 'need' || String(s.grantPercentage).includes('%')
                                                                                    ? s.grantPercentage
                                                                                    : `${s.grantPercentage}% Off`}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 mb-4">
                                                                        <div className="flex items-start gap-2">
                                                                            <AlertCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                                                            <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                                                <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider block mb-1">Target Criteria</span>
                                                                                {s.criteriaTitle}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4">
                                                                        <div className="flex-1">
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Requirement</p>
                                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                                {s.type === 'position' ? (
                                                                                    s.position
                                                                                ) : s.type === 'kinship' || s.type === 'need' ? (
                                                                                    s.condition
                                                                                ) : (
                                                                                    <>{s.minPercentage}% {s.maxPercentage ? ` - ${s.maxPercentage}% ` : ''}</>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <div className="shrink-0 pl-4 border-l border-slate-200 dark:border-slate-800">
                                                                            {isEligible === true ? (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                                                                                    <CheckCircle2 size={14} /> Eligible
                                                                                </span>
                                                                            ) : isEligible === 'conditional' ? (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/30">
                                                                                    <AlertCircle size={14} /> Verify
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 px-2.5 py-1">
                                                                                    Not Eligible
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </motion.div>
                            ) : activeTab === 'reviews' ? (
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
                                                                            crossOrigin="anonymous" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80'; }} />
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
                            ) : null}
                        </AnimatePresence>
                        <UserProfileModal
                            isOpen={profileModal.isOpen}
                            onClose={() => setProfileModal({ isOpen: false, userId: null })}
                            userId={profileModal.userId}
                            readOnly={currentUser?.role === 'admin'}
                            hideChatButton={currentUser?.role === 'admin'}
                        />
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

                                            let chatExists = false;
                                            try {
                                                const chatSnap = await getDoc(chatRef);
                                                chatExists = chatSnap.exists();
                                            } catch (error) {
                                                // Firestore rules will throw a permission error if the chat document doesn't exist 
                                                // because `resource` is null and `resource.data` checking participants fails.
                                                // It is safe to assume it doesn't exist and proceed with creating it.
                                                console.log("Chat fetch failed (likely missing), proceeding to create it.");
                                            }

                                            if (!chatExists) {
                                                try {
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
                                                } catch (writeErr) {
                                                    console.error("Failed to initialize chat:", writeErr);
                                                }
                                            }
                                            navigate(`/ messages / ${chatId} `);
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

            {/* PROGRAM DETAILS MODAL */}
            <AnimatePresence>
                {isProgramDetailsModalOpen && selectedProgramDetails && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
                    >
                        <motion.div
                            onClick={() => setIsProgramDetailsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative w-full max-w-5xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 z-10" />

                            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsProgramDetailsModalOpen(false)}
                                    className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all z-20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </motion.button>

                                <div className="p-8 md:p-10">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                        <div className="lg:col-span-5 space-y-8">
                                            <div>
                                                <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-600/20 rounded-3xl flex items-center justify-center mb-6 border-2 border-cyan-200 dark:border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                                                    <GraduationCap size={44} className="text-cyan-600 dark:text-cyan-400" />
                                                </div>

                                                <div>
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 mb-3">
                                                        <span className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">{selectedProgramDetails.degreeType} PROGRAM</span>
                                                    </div>
                                                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                                                        {selectedProgramDetails.title}
                                                    </h2>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                                                        <Clock size={20} className="text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Duration</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProgramDetails.duration}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
                                                        <Calendar size={20} className="text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Total Semesters</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProgramDetails.totalSemesters}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                                                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                                                        <DollarSign size={20} className="text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Estimated Fee</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedProgramDetails.estimatedFee}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-7 space-y-8 lg:pl-6 border-t pt-8 lg:border-t-0 lg:pt-0 lg:border-l border-slate-200 dark:border-slate-800">
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <BookOpen className="text-cyan-500" size={20} />
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Program Overview</h3>
                                                </div>
                                                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/50 leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                                                    {selectedProgramDetails.description}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-4 mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="text-yellow-500" size={20} fill="currentColor" />
                                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Scholarships & Aid</h3>
                                                    </div>
                                                </div>

                                                {(!selectedProgramDetails.scholarships || selectedProgramDetails.scholarships.length === 0) ? (
                                                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 lg:h-40 flex flex-col items-center justify-center">
                                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No scholarships configured for this program.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 pb-6">
                                                        {selectedProgramDetails.scholarships.map((s, sIdx) => {
                                                            const isEligible = isScholarshipEligible(s, userProfile);
                                                            return (
                                                                <div
                                                                    key={sIdx}
                                                                    className="relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl group shadow-sm"
                                                                >
                                                                    <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-yellow-300 to-amber-500" />
                                                                    <div className="p-5 pl-7">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                                                                {s.criteriaTitle || s.scholarshipTitle || "Scholarship"}
                                                                            </h4>
                                                                            {s.grantPercentage && (
                                                                                <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-black rounded-full shadow-md whitespace-nowrap">
                                                                                    {String(s.grantPercentage).includes('%') ? s.grantPercentage : `${s.grantPercentage}% `} WAIVER
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                                            <div className="flex items-start gap-2">
                                                                                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                                                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                                                    {s.type === 'merit' || !s.type ? (
                                                                                        `Min ${s.minPercentage}% marks` + (s.maxPercentage ? ` up to ${s.maxPercentage}% ` : '')
                                                                                    ) : s.type === 'position' ? (
                                                                                        s.position
                                                                                    ) : s.type === 'kinship' ? (
                                                                                        s.condition
                                                                                    ) : (
                                                                                        s.condition || "Meeting specific criteria"
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                            <div className="shrink-0 flex items-center justify-end">
                                                                                {isEligible === true ? (
                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                                                                                        Eligible
                                                                                    </span>
                                                                                ) : isEligible === 'conditional' ? (
                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/30">
                                                                                        Verify
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                                                        Not Eligible
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hidden Element for PDF Generation */}
            {isApprovalModalOpen && approvalApplicationData && (
                <div style={{ display: 'none' }}>
                    <div ref={pdfRef} dangerouslySetInnerHTML={{ __html: generatePDFHTML() }} />
                </div>
            )}

            {/* Admission Approval Modal */}
            <AnimatePresence>
                {isApprovalModalOpen && approvalApplicationData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsApprovalModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Top Bar */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-cyan-500" />

                            <button
                                onClick={() => setIsApprovalModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center mb-8">
                                <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border-4 border-emerald-50 dark:border-emerald-500/10 shadow-lg shadow-emerald-500/20">
                                    <CheckCircle2 className="text-emerald-500 dark:text-emerald-400" size={40} />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Congratulations!</h2>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Your application has been officially accepted.</p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 mb-8">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <GraduationCap className="text-cyan-500" size={18} />
                                    Admission Details
                                </h3>

                                {(() => {
                                    const bestSch = getBestScholarship();
                                    const modalAppId = buildAppRefId(approvalApplicationData);

                                    return (
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">University</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{university?.universityName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Program</p>
                                                <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{approvalApplicationData.programName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Applicant</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{approvalApplicationData.studentName || userProfile?.fullName}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Approval Date</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{approvalApplicationData.processedAt ? new Date(approvalApplicationData.processedAt).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 mb-1">Application Reference</p>
                                                <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-md inline-block tracking-wider">
                                                    {modalAppId}
                                                </p>
                                            </div>
                                            {bestSch && (
                                                <div className="col-span-2 mt-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:to-amber-900/10 p-4 rounded-xl border border-yellow-200/50 dark:border-yellow-700/30 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
                                                        <Sparkles className="text-yellow-600 dark:text-yellow-400" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-500 mb-0.5">Scholarship Match</p>
                                                        <p className="text-sm font-black text-slate-800 dark:text-white">
                                                            {bestSch.criteriaTitle || bestSch.scholarshipTitle || 'Merit Waiver'}
                                                            <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full inline-block align-middle mb-0.5 shadow-sm shadow-yellow-500/20">
                                                                {String(bestSch.grantPercentage).includes('%') ? bestSch.grantPercentage : `${bestSch.grantPercentage}% `} OFF
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold transition-colors"
                                >
                                    <Printer size={18} /> Print Letter
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={isGeneratingPDF}
                                    className="flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50"
                                >
                                    {isGeneratingPDF ? (
                                        <><Loader2 size={18} className="animate-spin" /> Preparing...</>
                                    ) : (
                                        <><Download size={18} /> Download PDF</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
