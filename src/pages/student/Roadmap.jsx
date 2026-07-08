import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudentState } from '../../context/StudentStateContext';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    Code, Calculator, Atom, Dna, FlaskConical, Brain,
    Palette, ChevronRight, CheckCircle, BookOpen, Lock, ArrowLeft,
    Loader2, Trash2, AlertTriangle, Sparkles, Rocket, Trophy, Zap, Map, Star, Award, Download, FileText, Search, X
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { generateRoadmap, generateFallbackRoadmap } from '../../services/openaiService';
import TopicResources from '../../components/roadmap/TopicResources';
import TopicTest from '../../components/roadmap/TopicTest';
import RoadmapPDF from '../../components/roadmap/RoadmapPDF';

// --- STATIC DATA ---
const CLASSES = [
    { id: 'cs', name: 'Computer Science', icon: Code, color: 'from-blue-500 to-cyan-500', accent: 'blue' },
    { id: 'math', name: 'Mathematics', icon: Calculator, color: 'from-indigo-500 to-purple-500', accent: 'indigo' },
    { id: 'phys', name: 'Physics', icon: Atom, color: 'from-violet-500 to-pink-500', accent: 'violet' },
    { id: 'bio', name: 'Biology', icon: Dna, color: 'from-emerald-500 to-teal-500', accent: 'emerald' },
    { id: 'chem', name: 'Chemistry', icon: FlaskConical, color: 'from-teal-500 to-cyan-500', accent: 'teal' },
    { id: 'psych', name: 'Psychology', icon: Brain, color: 'from-rose-500 to-orange-500', accent: 'rose' },
    { id: 'graph', name: 'Graphics', icon: Palette, color: 'from-orange-500 to-amber-500', accent: 'orange' },
];

const ROUTEMAP_DATA = {
    'Computer Science': [
        "C++", "Python", "Java", "JavaScript", "TypeScript", "C#", "Swift", "PHP", "Go (Golang)",
        "HTML5", "CSS3", "React.js", "Next.js", "Redux", "Tailwind CSS", "Bootstrap",
        "React Native", "SwiftUI",
        "Node.js", "Express.js", "Laravel", "WordPress", "Django", "FastAPI",
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Firebase", "Redis",
        "Data Structures", "Algorithms", "System Design", "OOP",
        "Git", "GitHub", "GitLab", "Docker", "Kubernetes", "Linux (Bash)", "Shell Scripting",
        "AWS", "Google Cloud", "CI/CD Pipelines", "Nginx",
        "Machine Learning", "Deep Learning", "Neural Networks", "TensorFlow", "PyTorch",
        "Natural Language Processing (NLP)", "Computer Vision", "Generative AI", "Pandas", "NumPy",
        "Cybersecurity Basics", "Ethical Hacking", "Cryptography", "Network Security", "Penetration Testing",
        "REST APIs", "GraphQL", "Postman", "WebSockets",
        "Agile", "Scrum", "Jira", "Figma", "Unit Testing"
    ],
    'Mathematics': ['Algebra', 'Calculus', 'Trigonometry', 'Geometry', 'Probability', 'Statistics', 'Logical Reasoning'],
    'Physics': ['Mechanics', 'Electricity & Magnetism', 'Waves', 'Optics', 'Modern Physics', 'Math Problem Solving', 'Experimental Analysis'],
    'Biology': ['Cell Biology', 'Genetics', 'Human Physiology', 'Ecology', 'Biotechnology Basics', 'Lab Skills', 'Scientific Observation'],
    'Chemistry': ['Organic', 'Inorganic', 'Physical', 'Calculations', 'Lab Safety', 'Analytical Techniques', 'Reaction Analysis'],
    'Psychology': ['Behavioral Analysis', 'Cognitive Psychology', 'Research Methodology', 'Data Interpretation', 'Communication Skills', 'Emotional Intelligence', 'Counseling Basics'],
    'Graphics': ['Photoshop', 'Illustrator', 'Logo Design', 'Color Theory', 'Typography', 'UI/UX Design', 'Creative Visualization'],
};

// --- 3D TILT CARD COMPONENT ---
const TiltCard = ({ children, className, onClick }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useTransform(y, [-100, 100], [15, -15]);
    const rotateY = useTransform(x, [-100, 100], [-15, 15]);

    const springConfig = { stiffness: 300, damping: 30 };
    const smoothRotateX = useSpring(rotateX, springConfig);
    const smoothRotateY = useSpring(rotateY, springConfig);

    const handleMouse = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouse}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                rotateX: smoothRotateX,
                rotateY: smoothRotateY,
                transformStyle: 'preserve-3d',
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

// --- FLOATING PARTICLES COMPONENT ---
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                }}
                animate={{
                    y: [0, -30, 0],
                    x: [0, Math.random() * 20 - 10, 0],
                    opacity: [0.2, 0.6, 0.2],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

const Roadmap = () => {
    const { currentUser, userProfile } = useAuth();
    const { skill } = useParams();
    const navigate = useNavigate();

    const {
        wizardStep, setWizardStep,
        selectedClass, setSelectedClass,
        selectedSkill, setSelectedSkill,
        isRoadmapActive, setIsRoadmapActive,
        topics, setTopics,
        progress, setProgress,
        loading,
        isGenerating,
        loadOrGenerateRoadmapBackground,
        resetRoadmapState,
        calculateProgress
    } = useStudentState();

    // Modal States & UI States
    const [hoveredCard, setHoveredCard] = useState(null);
    const [showGiveUpModal, setShowGiveUpModal] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [testTopic, setTestTopic] = useState(null);
    const [showGrandTest, setShowGrandTest] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTopics, setExpandedTopics] = useState(new Set()); // New state for accordion logic

    // Handle Deep Linking
    useEffect(() => {
        if (skill && currentUser) {
            setSelectedSkill(decodeURIComponent(skill));
            setIsRoadmapActive(true);
            loadOrGenerateRoadmapBackground(decodeURIComponent(skill), currentUser);
        }
    }, [skill, currentUser]);

    // Firestore Helpers
    const getDocId = (skillName) => {
        if (!currentUser) return null;
        const sanitizedSkill = skillName.replace(/[^a-zA-Z0-9]/g, '_');
        return `${currentUser.uid}_${sanitizedSkill}`;
    };

    // Event Handlers
    const toggleTopic = (topicId) => {
        setExpandedTopics(prev => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId);
            else next.add(topicId);
            return next;
        });
    };
    const handleClassSelect = (cls) => {
        setSelectedClass(cls);
        setWizardStep(2);
    };

    const handleSkillSelect = (skillName) => {
        setSelectedSkill(skillName);
    };

    const handleInitializeRoadmap = async () => {
        if (!selectedSkill) return;
        setIsRoadmapActive(true);
        await loadOrGenerateRoadmapBackground(selectedSkill, currentUser);
    };

    const handleBack = () => {
        if (isRoadmapActive) {
            setIsRoadmapActive(false);
            setWizardStep(2);
            // Optional: navigate back to list if URL was direct
            if (skill) navigate('/student/roadmap');
        } else if (wizardStep === 2) {
            setWizardStep(1);
            setSelectedClass(null);
            setSelectedSkill(null);
        }
    };

    const handleGiveUp = async () => {
        if (!currentUser || !selectedSkill) return;
        const docId = getDocId(selectedSkill);
        try {
            await deleteDoc(doc(db, 'roadmaps', docId));
            setShowGiveUpModal(false);
            resetRoadmapState();
        } catch (error) {
            console.error('Error deleting roadmap:', error);
        }
    };

    const handleMarkAsDone = async (topicId) => {
        if (!currentUser || !selectedSkill) return;

        let newTopics = [...topics];

        // Check if it's a sub-topic (will have 'sub' in ID or we traverse)
        // Actually, the easiest way is to traverse and find
        let found = false;

        // Find Main Topic
        newTopics = newTopics.map(t => {
            if (t.id === topicId) {
                found = true;
                return { ...t, status: 'completed' }; // Basic completion for main topic
            }
            // Find Sub Topic
            if (t.subtopics) {
                const subIndex = t.subtopics.findIndex(s => s.id === topicId);
                if (subIndex !== -1) {
                    found = true;
                    const newSubs = [...t.subtopics];
                    newSubs[subIndex] = { ...newSubs[subIndex], status: 'completed' };
                    return { ...t, subtopics: newSubs };
                }
            }
            return t;
        });

        const newProgress = calculateProgress(newTopics);
        setTopics(newTopics);
        setProgress(newProgress);

        const docId = getDocId(selectedSkill);
        try {
            await setDoc(doc(db, 'roadmaps', docId), {
                skill: selectedSkill,
                topics: newTopics,
                progress: newProgress,
                createdAt: serverTimestamp(),
                userId: currentUser.uid
            }, { merge: true });
        } catch (error) {
            console.error('Error updating roadmap:', error);
        }
    };

    const handleTestComplete = async (updatedTopics, newProgress, passed) => {
        setTopics(updatedTopics);
        setProgress(newProgress);
        // DB update is handled inside TopicTest but we need local state sync
    };

    // --- PDF DOWNLOAD ---
    // --- PDF DOWNLOAD ---
    const handleDownloadPDF = async () => {
        setIsExporting(true);
        // Wait for render
        setTimeout(async () => {
            const input = document.getElementById('roadmap-pdf-export');
            if (!input) {
                console.error("PDF Export element not found");
                setIsExporting(false);
                return;
            }

            try {
                const canvas = await html2canvas(input, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    windowWidth: 800
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');

                const imgWidth = 210; // A4 width in mm
                const pageHeight = 297; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                let heightLeft = imgHeight;
                let position = 0;

                // Add first page
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                // Add subsequent pages
                while (heightLeft > 0) {
                    position -= pageHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(`${selectedSkill}_Roadmap.pdf`);
            } catch (err) {
                console.error("PDF Download failed", err);
            } finally {
                setIsExporting(false);
            }
        }, 1000); // Increased delay to 1000ms just to be super safe with large DOM
    };

    // --- RENDER ---
    return (
        <div className="relative min-h-screen overflow-hidden text-slate-900 dark:text-white selection:bg-cyan-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] transition-colors duration-500" />
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
                <FloatingParticles />
            </div>

            {/* HIDDEN PDF EXPORT COMPONENT */}
            {isExporting && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ width: '800px' }}>
                    <RoadmapPDF topics={topics} skill={selectedSkill} user={currentUser} />
                </div>
            )}

            <div className="relative z-10 px-4 py-8 max-w-7xl mx-auto">
                {/* Header with Back Button */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        {(wizardStep > 1 || isRoadmapActive) && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleBack}
                                className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-lg text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </motion.button>
                        )}
                        {/* Breadcrumbs or Title */}
                        {!isRoadmapActive && wizardStep === 2 && (
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Selected Domain</span>
                                <h2 className="text-xl font-bold">{selectedClass?.name}</h2>
                            </div>
                        )}
                    </div>
                </motion.div>


                {!isRoadmapActive && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-16"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                        >
                            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 animate-gradient-x">
                                    {wizardStep === 1 ? 'Choose Your Domain' : 'Select Your Path'}
                                </span>
                            </h1>
                            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                                {wizardStep === 1
                                    ? 'Embark on a journey of knowledge. Select your field of expertise.'
                                    : `Unlock your potential in ${selectedClass?.name}`}
                            </p>
                        </motion.div>

                        {/* Step Indicator */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center justify-center gap-3 mt-8"
                        >
                            {[1, 2].map((step) => (
                                <div key={step} className="flex items-center gap-3">
                                    <motion.div
                                        animate={{
                                            scale: wizardStep >= step ? 1.1 : 1,
                                            backgroundColor: wizardStep >= step ? 'rgba(6, 182, 212, 1)' : 'rgba(148, 163, 184, 0.2)',
                                            color: wizardStep >= step ? '#fff' : '#94a3b8'
                                        }}
                                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md transition-colors duration-300"
                                    >
                                        {step}
                                    </motion.div>
                                    {step < 2 && (
                                        <div className={`w-12 h-1 rounded-full transition-colors duration-500 ${wizardStep > step ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* WIZARD INTERFACE */}
                <AnimatePresence mode="wait">
                    {/* STEP 1: DOMAIN SELECTION - ULTRA PRO MAX */}
                    {!isRoadmapActive && wizardStep === 1 && (
                        <motion.div
                            key="step-1"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 100, damping: 20 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        >
                            {CLASSES.map((cls, idx) => (
                                <TiltCard
                                    key={cls.id}
                                    onClick={() => handleClassSelect(cls)}
                                    className="cursor-pointer"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, rotateX: -10 }}
                                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                        transition={{
                                            delay: idx * 0.08,
                                            type: "spring",
                                            stiffness: 150
                                        }}
                                        whileHover={{ y: -8 }}
                                        onMouseEnter={() => setHoveredCard(cls.id)}
                                        onMouseLeave={() => setHoveredCard(null)}
                                        className="group relative h-72 perspective-1000"
                                    >
                                        {/* Card Glow Effect */}
                                        <motion.div
                                            animate={{
                                                opacity: hoveredCard === cls.id ? 0.6 : 0,
                                                scale: hoveredCard === cls.id ? 1.05 : 1
                                            }}
                                            transition={{ duration: 0.3 }}
                                            className={`absolute -inset-1 bg-gradient-to-r ${cls.color} rounded-3xl blur-xl`}
                                        />

                                        {/* My Interest Badge - Step 1 */}
                                        {userProfile?.interest === cls.name && (
                                            <div className="absolute top-6 right-6 z-20">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-purple-500 blur-md opacity-50 animate-pulse" />
                                                    <div className="relative px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-lg border border-purple-400/30 flex items-center gap-1">
                                                        <Sparkles size={10} />
                                                        Your Interest
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Main Card */}
                                        <div className="relative h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-500">

                                            {/* Gradient Overlay on Hover */}
                                            <motion.div
                                                animate={{
                                                    opacity: hoveredCard === cls.id ? 0.1 : 0
                                                }}
                                                className={`absolute inset-0 bg-gradient-to-br ${cls.color}`}
                                            />

                                            {/* Content */}
                                            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                                                {/* Floating Icon */}
                                                <motion.div
                                                    animate={{
                                                        y: hoveredCard === cls.id ? -8 : 0,
                                                        scale: hoveredCard === cls.id ? 1.15 : 1,
                                                        rotateY: hoveredCard === cls.id ? 10 : 0
                                                    }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                    className={`relative p-5 rounded-2xl bg-gradient-to-br ${cls.color} text-white shadow-2xl mb-6`}
                                                >
                                                    <cls.icon size={44} className="relative z-10" />
                                                </motion.div>

                                                {/* Title */}
                                                <motion.h3
                                                    className="text-2xl font-bold text-slate-800 dark:text-white mb-2"
                                                >
                                                    {cls.name}
                                                </motion.h3>

                                                {/* Start Label */}
                                                <motion.div
                                                    animate={{
                                                        opacity: hoveredCard === cls.id ? 1 : 0.7,
                                                        y: hoveredCard === cls.id ? 0 : 5
                                                    }}
                                                    className="flex items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400"
                                                >
                                                    Start Journey <ChevronRight size={14} />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </TiltCard>
                            ))}
                        </motion.div>
                    )}

                    {/* STEP 2: PATH SELECTION - ULTRA PRO MAX */}
                    {!isRoadmapActive && wizardStep === 2 && (
                        <motion.div
                            key="step-2"
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ type: "spring", stiffness: 100 }}
                            className="max-w-6xl mx-auto"
                        >
                            {/* Skills Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-16">
                                {ROUTEMAP_DATA[selectedClass?.name]?.map((skillName, idx) => (
                                    <div key={skillName} className="flex flex-col">
                                        <motion.button
                                            initial={{ opacity: 0, y: 30, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{
                                                delay: idx * 0.05,
                                                type: "spring",
                                                stiffness: 200
                                            }}
                                            whileHover={{ scale: 1.02, y: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSkillSelect(skillName)}
                                            className={`relative group p-6 rounded-2xl text-left transition-all duration-300 border 
                                                ${selectedSkill === skillName
                                                    ? `bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-2xl ring-4 ring-cyan-500/30`
                                                    : userProfile?.interest === skillName
                                                        ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-500 dark:border-purple-400 shadow-xl shadow-purple-500/10'
                                                        : 'bg-white dark:bg-slate-800/60 backdrop-blur-sm border-slate-200 dark:border-white/10 hover:border-cyan-500 dark:hover:border-cyan-400'
                                                }`}
                                        >
                                            {userProfile?.interest === skillName && (
                                                <div className="absolute -top-3 left-6 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                                    Recommended for You
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`p-2 rounded-lg 
                                                    ${selectedSkill === skillName ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                    <Zap size={20} className={selectedSkill === skillName ? 'text-yellow-300' : 'text-slate-400 dark:text-slate-300'} />
                                                </div>
                                                {selectedSkill === skillName && <CheckCircle size={20} className="text-cyan-400" />}
                                            </div>

                                            <span className={`text-lg font-bold block ${selectedSkill === skillName ? 'text-white dark:text-slate-900' : 'text-slate-800 dark:text-white'
                                                }`}>
                                                {skillName}
                                            </span>
                                        </motion.button>

                                        {/* Generate Button - Shows directly below selected skill */}
                                        <AnimatePresence>
                                            {selectedSkill === skillName && (
                                                <motion.button
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleInitializeRoadmap}
                                                    className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 text-sm overflow-hidden"
                                                >
                                                    <Rocket size={18} className="animate-bounce" />
                                                    Generate Roadmap
                                                    <ChevronRight size={16} />
                                                </motion.button>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}


                    {/* ROADMAP ACTIVE VIEW — ULTRA PRO REDESIGN */}
                    {isRoadmapActive && (
                        <motion.div
                            key="roadmap-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            {/* ── HERO HEADER ── */}
                            <motion.div
                                initial={{ opacity: 0, y: -30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 120 }}
                                className="relative overflow-hidden rounded-[2.5rem] mb-10 p-10 border border-white/20 dark:border-white/5"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(99,102,241,0.10) 50%, rgba(139,92,246,0.08) 100%)',
                                    backdropFilter: 'blur(32px)',
                                    WebkitBackdropFilter: 'blur(32px)',
                                    boxShadow: '0 32px 80px rgba(6,182,212,0.10), inset 0 1px 0 rgba(255,255,255,0.15)',
                                }}
                            >
                                {/* Decorative orbs */}
                                <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-purple-500/15 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                                <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                            <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                                AI Generated
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border ${
                                                progress === 100
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                            }`}>
                                                {progress === 100 ? '🎉 Completed' : `${progress}% Done`}
                                            </span>
                                        </div>

                                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 leading-tight">
                                            {selectedSkill}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-xl">
                                            Your personalized learning journey — step by step, topic by topic.
                                        </p>

                                        {/* Thin progress bar */}
                                        {topics.length > 0 && (
                                            <div className="mt-6 max-w-md">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Progress</span>
                                                    <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">{progress}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-sm shadow-cyan-500/50"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {topics.length > 0 && (
                                        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                                            <motion.button
                                                whileHover={{ scale: 1.04, y: -2 }}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setShowGrandTest(true)}
                                                className="group px-7 py-4 rounded-2xl font-black text-white text-base flex items-center gap-3 shadow-xl shadow-cyan-500/30 transition-all"
                                                style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)' }}
                                            >
                                                <Trophy size={22} className="group-hover:animate-bounce" />
                                                Grand Test
                                            </motion.button>

                                            <div className="flex gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={handleDownloadPDF}
                                                    className="flex-1 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all"
                                                >
                                                    <Download size={15} /> PDF
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setShowGiveUpModal(true)}
                                                    className="flex-1 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-400 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 size={15} /> Reset
                                                </motion.button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* ── STATS STRIP ── */}
                            {topics.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                                >
                                    {[
                                        { label: 'Total Topics', value: topics.length, icon: Map, color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
                                        { label: 'Completed', value: topics.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
                                        { label: 'Subtopics', value: topics.reduce((a, t) => a + (t.subtopics?.length || 0), 0), icon: Sparkles, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
                                        { label: 'Progress', value: `${progress}%`, icon: Award, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
                                    ].map((stat, i) => (
                                        <motion.div
                                            key={stat.label}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.1 + i * 0.07 }}
                                            className={`${stat.bg} backdrop-blur-sm rounded-2xl p-5 border border-white/50 dark:border-white/5 shadow-sm flex items-center gap-4`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} text-white flex items-center justify-center shadow-md shrink-0`}>
                                                <stat.icon size={22} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

                            {/* ── SEARCH ── */}
                            {!loading && topics.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mb-10"
                                >
                                    <div className="relative max-w-2xl mx-auto">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Search size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search topics and subtopics..."
                                            className="w-full pl-14 pr-14 py-4 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all text-base"
                                            style={{
                                                background: 'rgba(255,255,255,0.7)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid rgba(6,182,212,0.25)',
                                                boxShadow: '0 4px 24px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
                                            }}
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── LOADING ── */}
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-32"
                                >
                                    <div className="relative mb-8">
                                        <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles size={28} className="text-cyan-500 animate-pulse" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
                                        {isGenerating ? 'AI Building Your Roadmap...' : 'Loading Your Path...'}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
                                        {isGenerating ? 'Groq AI is crafting a personalized learning journey just for you.' : 'Retrieving your saved progress.'}
                                    </p>
                                    <div className="flex gap-2 mt-6">
                                        {[0, 1, 2].map(i => (
                                            <motion.div
                                                key={i}
                                                animate={{ y: [0, -10, 0] }}
                                                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                                                className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── TOPICS TIMELINE ── */}
                            {!loading && topics.length > 0 && (
                                <div className="relative max-w-5xl mx-auto pb-20">
                                    {/* Vertical spine */}
                                    <div className="absolute left-8 md:left-10 top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500/60 via-violet-500/40 to-indigo-500/60 hidden md:block rounded-full" />

                                    <div className="space-y-8">
                                        {topics
                                            .map(topic => {
                                                if (!searchTerm.trim()) return { ...topic, matchScore: 1, matchingSubtopics: new Set() };
                                                const searchLower = searchTerm.toLowerCase();
                                                const searchTerms = searchLower.split(/\s+/).filter(Boolean);
                                                let score = 0;
                                                const matchingSubtopics = new Set();
                                                if (topic.title?.toLowerCase().includes(searchLower)) score += 50;
                                                else if (searchTerms.some(term => topic.title?.toLowerCase().includes(term))) score += 20;
                                                if (topic.description?.toLowerCase().includes(searchLower)) score += 10;
                                                if (topic.subtopics) {
                                                    topic.subtopics.forEach(sub => {
                                                        const subTitle = sub.title?.toLowerCase() || '';
                                                        if (subTitle.includes(searchLower)) { score += 30; matchingSubtopics.add(sub.id); }
                                                        else if (searchTerms.some(term => subTitle.includes(term))) { score += 15; matchingSubtopics.add(sub.id); }
                                                    });
                                                }
                                                return { ...topic, matchScore: score, matchingSubtopics };
                                            })
                                            .filter(t => t.matchScore > 0)
                                            .sort((a, b) => b.matchScore - a.matchScore)
                                            .map((topic, idx) => {
                                                const shouldExpand = searchTerm && topic.matchingSubtopics.size > 0;
                                                const isExpanded = expandedTopics.has(topic.id) || shouldExpand;
                                                const isCompleted = topic.status === 'completed';

                                                return (
                                                    <motion.div
                                                        key={topic.id || `topic-${idx}`}
                                                        initial={{ opacity: 0, x: -30 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.07, type: 'spring', stiffness: 120 }}
                                                        className="relative flex gap-6"
                                                    >
                                                        {/* ── Spine dot ── */}
                                                        <div className="hidden md:flex flex-col items-center shrink-0 mt-8" style={{ width: '2.5rem' }}>
                                                            <motion.div
                                                                animate={{
                                                                    scale: isCompleted ? [1, 1.15, 1] : 1,
                                                                    boxShadow: isCompleted
                                                                        ? ['0 0 0 0px rgba(16,185,129,0.4)', '0 0 0 8px rgba(16,185,129,0)', '0 0 0 0px rgba(16,185,129,0)']
                                                                        : '0 0 0 0px rgba(6,182,212,0)'
                                                                }}
                                                                transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.3 }}
                                                                className={`w-9 h-9 rounded-full border-[3px] flex items-center justify-center text-xs font-black shadow-lg ${
                                                                    isCompleted
                                                                        ? 'bg-emerald-500 border-emerald-300 text-white'
                                                                        : 'bg-white dark:bg-slate-900 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                                                }`}
                                                            >
                                                                {isCompleted ? <CheckCircle size={16} /> : idx + 1}
                                                            </motion.div>
                                                        </div>

                                                        {/* ── Topic Card ── */}
                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className={`rounded-[1.75rem] overflow-hidden border transition-all duration-300 group ${
                                                                    isCompleted
                                                                        ? 'border-emerald-400/30 dark:border-emerald-500/20'
                                                                        : 'border-slate-200/60 dark:border-white/8 hover:border-cyan-400/40 dark:hover:border-cyan-500/30'
                                                                }`}
                                                                style={{
                                                                    background: isCompleted
                                                                        ? 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(255,255,255,0.8) 100%)'
                                                                        : 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.9) 100%)',
                                                                    backdropFilter: 'blur(24px)',
                                                                    WebkitBackdropFilter: 'blur(24px)',
                                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                                                                }}
                                                            >
                                                                {/* Card top */}
                                                                <div className="p-7 dark:bg-slate-900/70">
                                                                    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                                                        {/* Number badge */}
                                                                        <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${
                                                                            isCompleted
                                                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/30'
                                                                                : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/30'
                                                                        }`}>
                                                                            {isCompleted ? <CheckCircle size={24} /> : idx + 1}
                                                                        </div>

                                                                        <div className="flex-1 min-w-0">
                                                                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors">
                                                                                {topic.title}
                                                                            </h3>
                                                                            <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
                                                                                {topic.description}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions row */}
                                                                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/40 flex flex-wrap items-center justify-between gap-3">
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                                                                                onClick={() => setSelectedTopic(topic)}
                                                                                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition border border-blue-200/50 dark:border-blue-500/20"
                                                                            >
                                                                                <BookOpen size={14} /> Resources
                                                                            </motion.button>

                                                                            {topic.status !== 'completed' && topic.status !== 'ready_for_test' && (
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                                                                                    onClick={() => handleMarkAsDone(topic.id)}
                                                                                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition border border-emerald-200/50 dark:border-emerald-500/20"
                                                                                >
                                                                                    <CheckCircle size={14} /> Mark Done
                                                                                </motion.button>
                                                                            )}

                                                                            {(topic.status === 'completed' || topic.status === 'ready_for_test') && (
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                                                                                    onClick={() => { setSelectedTopic(null); setTestTopic(topic); }}
                                                                                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-500/30 hover:shadow-lg transition border border-transparent"
                                                                                >
                                                                                    <Trophy size={14} /> Take Test
                                                                                </motion.button>
                                                                            )}
                                                                        </div>

                                                                        {topic.subtopics && topic.subtopics.length > 0 && (
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                                                                onClick={() => toggleTopic(topic.id)}
                                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                                                                                    isExpanded
                                                                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                                                                }`}
                                                                            >
                                                                                <Sparkles size={13} />
                                                                                {isExpanded ? 'Hide Subtopics' : `${topic.subtopics.length} Subtopics`}
                                                                                <ChevronRight
                                                                                    size={14}
                                                                                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
                                                                                />
                                                                            </motion.button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* ── Subtopics panel ── */}
                                                                <AnimatePresence>
                                                                    {isExpanded && topic.subtopics && topic.subtopics.length > 0 && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            transition={{ duration: 0.35, ease: 'easeInOut' }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div
                                                                                className="px-7 pb-7"
                                                                                style={{
                                                                                    background: 'linear-gradient(180deg, rgba(6,182,212,0.04) 0%, rgba(99,102,241,0.04) 100%)',
                                                                                }}
                                                                            >
                                                                                <div className="h-px bg-gradient-to-r from-cyan-500/30 via-violet-500/20 to-transparent mb-6" />
                                                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                                                                                    <Sparkles size={11} /> Subtopics
                                                                                </p>
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {topic.subtopics.map((sub, sIdx) => {
                                                                                        const isSubCompleted = sub.status === 'completed';
                                                                                        return (
                                                                                            <motion.div
                                                                                                key={sub.id || `sub-${idx}-${sIdx}`}
                                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                                transition={{ delay: sIdx * 0.04 }}
                                                                                                className={`group relative rounded-2xl p-4 border transition-all duration-200 ${
                                                                                                    isSubCompleted
                                                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300/50 dark:border-emerald-500/20'
                                                                                                        : 'bg-white/70 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/40 hover:border-cyan-400/50 dark:hover:border-cyan-500/30 hover:shadow-md'
                                                                                                }`}
                                                                                            >
                                                                                                <div className="flex items-start justify-between gap-3">
                                                                                                    <div className="flex items-start gap-3 min-w-0">
                                                                                                        <span className={`shrink-0 mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                                                                                                            isSubCompleted
                                                                                                                ? 'bg-emerald-500 text-white'
                                                                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                                                                        }`}>
                                                                                                            {isSubCompleted ? '✓' : `${sIdx + 1}`}
                                                                                                        </span>
                                                                                                        <div className="min-w-0">
                                                                                                            <h4 className={`text-sm font-bold leading-snug ${
                                                                                                                isSubCompleted
                                                                                                                    ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70'
                                                                                                                    : 'text-slate-800 dark:text-slate-200 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-colors'
                                                                                                            }`}>
                                                                                                                {sub.title}
                                                                                                            </h4>
                                                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                                                                                                                {sub.description}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {/* Sub actions */}
                                                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                                                        <motion.button
                                                                                                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                                                                            onClick={() => setSelectedTopic({ ...sub, isSubtopic: true })}
                                                                                                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 transition"
                                                                                                            title="Resources"
                                                                                                        >
                                                                                                            <BookOpen size={12} />
                                                                                                        </motion.button>

                                                                                                        {!isSubCompleted ? (
                                                                                                            <motion.button
                                                                                                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                                                                                onClick={() => handleMarkAsDone(sub.id)}
                                                                                                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition"
                                                                                                                title="Mark Done"
                                                                                                            >
                                                                                                                <CheckCircle size={12} />
                                                                                                            </motion.button>
                                                                                                        ) : (
                                                                                                            <motion.button
                                                                                                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                                                                                                onClick={() => { setSelectedTopic(null); setTestTopic({ ...sub, isSubtopic: true }); }}
                                                                                                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-200 transition"
                                                                                                                title="Take Quiz"
                                                                                                            >
                                                                                                                <Zap size={12} />
                                                                                                            </motion.button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* MODALS */}
                <AnimatePresence>
                    {showGiveUpModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-700"
                            >
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Reset Roadmap?</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6">
                                    This will delete your current progress and you will have to generate a new path.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowGiveUpModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleGiveUp}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-lg shadow-red-500/30"
                                    >
                                        Yes, Reset
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {selectedTopic && (
                    <TopicResources
                        isOpen={!!selectedTopic}
                        topic={selectedTopic}
                        skill={selectedSkill}
                        onClose={() => setSelectedTopic(null)}
                        onMarkAsDone={handleMarkAsDone}
                    />
                )}

                {
                    testTopic && (
                        <TopicTest
                            isOpen={!!testTopic}
                            topic={testTopic}
                            skill={selectedSkill}
                            onClose={() => setTestTopic(null)}
                            onComplete={handleTestComplete}
                            topics={topics}
                        />
                    )
                }

                {/* Grand Test Modal - 50 Questions */}
                {showGrandTest && (
                    <TopicTest
                        isOpen={showGrandTest}
                        topic={{ title: 'Final Certification', id: 'grand-test' }}
                        skill={selectedSkill}
                        onClose={() => setShowGrandTest(false)}
                        onComplete={(passed, score) => {
                            setShowGrandTest(false);
                            if (passed) {
                                // Handle grand test completion - could add certificate logic here
                                console.log('Grand Test Passed!', score);
                            }
                        }}
                        topics={topics}
                        isGrandTest={true}
                    />
                )}
            </div>
        </div>
    );
};

export default Roadmap;

