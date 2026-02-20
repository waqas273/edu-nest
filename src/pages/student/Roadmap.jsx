import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

    // UI State
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isRoadmapActive, setIsRoadmapActive] = useState(false);
    const [hoveredCard, setHoveredCard] = useState(null);

    // Roadmap Data State
    const [topics, setTopics] = useState([]);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Modal States
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
            loadOrGenerateRoadmap(decodeURIComponent(skill));
        }
    }, [skill, currentUser]);

    // Firestore Helpers
    const getDocId = (skillName) => {
        if (!currentUser) return null;
        const sanitizedSkill = skillName.replace(/[^a-zA-Z0-9]/g, '_');
        return `${currentUser.uid}_${sanitizedSkill}`;
    };

    const calculateProgress = (topicsArray) => {
        if (!topicsArray || topicsArray.length === 0) return 0;
        const completed = topicsArray.filter(t => t.status === 'completed').length;
        return Math.round((completed / topicsArray.length) * 100);
    };

    // Core Logic
    const loadOrGenerateRoadmap = async (skillName) => {
        if (!currentUser) return;
        setLoading(true);
        const docId = getDocId(skillName);

        try {
            const roadmapRef = doc(db, 'roadmaps', docId);
            const roadmapSnap = await getDoc(roadmapRef);

            if (roadmapSnap.exists()) {
                const data = roadmapSnap.data();
                // Ensure all topics are unlocked for viewing if coming from old data
                const processedTopics = (data.topics || []).map(t => ({
                    ...t,
                    status: t.status === 'locked' ? 'unlocked' : t.status
                }));
                // Ensure subtopics structure exists if upgrading from old data
                processedTopics.forEach(t => {
                    if (!t.subtopics) t.subtopics = [];
                    // Ensure subtopics are objects if they were strings in old versions
                    t.subtopics = t.subtopics.map((sub, idx) => {
                        if (typeof sub === 'string') {
                            return { id: `sub-${t.id}-${idx}`, title: sub, description: 'Explore this concept.', status: 'unlocked' };
                        }
                        return sub;
                    });
                });

                setTopics(processedTopics);
                setProgress(data.progress || 0);
            } else {
                setIsGenerating(true);
                let generatedTopics;
                try {
                    generatedTopics = await generateRoadmap(skillName);
                } catch (aiError) {
                    console.warn('OpenAI failed, using fallback:', aiError.message);
                    generatedTopics = generateFallbackRoadmap(skillName);
                }

                // Ensure they are all unlocked
                generatedTopics = generatedTopics.map(t => ({ ...t, status: 'unlocked' }));

                await setDoc(roadmapRef, {
                    skill: skillName,
                    topics: generatedTopics,
                    progress: 0,
                    createdAt: serverTimestamp(),
                    userId: currentUser.uid
                });

                setTopics(generatedTopics);
                setProgress(0);
            }
        } catch (error) {
            console.error('Error loading/generating roadmap:', error);
            setTopics(generateFallbackRoadmap(skillName).map(t => ({ ...t, status: 'unlocked' })));
        } finally {
            setLoading(false);
            setIsGenerating(false);
        }
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
        await loadOrGenerateRoadmap(selectedSkill);
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
            setTopics([]);
            setProgress(0);
            setIsRoadmapActive(false);
            setWizardStep(2);
            setSelectedSkill(null);
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

                    {/* ROADMAP LOADING & VIEW */}
                    {isRoadmapActive && (
                        <motion.div
                            key="roadmap-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            {/* Header */}
                            <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/20 dark:border-white/5 shadow-lg">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 uppercase tracking-wider">
                                            Beginner Level
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 uppercase tracking-wider">
                                            {progress === 100 ? 'Completed' : 'In Progress'}
                                        </span>
                                    </div>
                                    <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
                                        {selectedSkill}
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        Master this skill one step at a time. No restrictions.
                                    </p>
                                </div>

                                {topics.length > 0 && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleDownloadPDF}
                                            className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-xl font-bold transition flex items-center text-sm"
                                        >
                                            <Download size={16} className="mr-2" /> Download PDF
                                        </button>
                                        <button
                                            onClick={() => setShowGiveUpModal(true)}
                                            className="px-5 py-2.5 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl font-bold transition flex items-center text-sm"
                                        >
                                            <Trash2 size={16} className="mr-2" /> Reset Roadmap
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Progress Ring & Stats */}
                            {topics.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                    {/* Stats Card 1: Progress */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xl">
                                            {progress}%
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Progress</p>
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">Keep Going!</p>
                                        </div>
                                    </div>

                                    {/* Stats Card 2: Topics */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                            <Map size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Milestones</p>
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{topics.filter(t => t.status === 'completed').length} / {topics.length} Completed</p>
                                        </div>
                                    </div>

                                    {/* Stats Card 3: Status */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                                            <Award size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Achievements</p>
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{progress >= 65 ? 'Pass Certificate' : 'Learning...'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Loading State */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300 dark:border-slate-600">
                                    <div className="relative">
                                        <Loader2 size={64} className="text-cyan-500 animate-spin" />
                                        {isGenerating && (
                                            <Sparkles size={24} className="absolute -top-2 -right-2 text-yellow-500 animate-pulse" />
                                        )}
                                    </div>
                                    <h3 className="mt-8 text-2xl font-bold text-slate-800 dark:text-white">
                                        {isGenerating ? 'Building Beginner Roadmap...' : 'Retrieving Your Path...'}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-center">
                                        Creating fundamental steps tailored for absolute beginners.
                                    </p>
                                </div>
                            )}

                            {/* Start the Roadmap Button - At Top */}
                            {!loading && topics.length > 0 && (
                                <div className="text-center mb-10">
                                    <button
                                        onClick={() => setShowGrandTest(true)}
                                        className="px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 flex items-center mx-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-2xl shadow-cyan-500/40 hover:scale-105"
                                    >
                                        <Trophy className="mr-3" size={28} />
                                        Grand Test
                                    </button>
                                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                                        Test your knowledge across all topics suitable for beginners.
                                    </p>
                                </div>
                            )}

                            {/* Search Bar */}
                            {!loading && topics.length > 0 && (
                                <div className="mb-8">
                                    <div className="relative max-w-xl mx-auto">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Search size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search topics and sub-topics..."
                                            className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all shadow-lg"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                    {searchTerm && (
                                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">
                                            Showing results for "<span className="font-semibold text-cyan-500">{searchTerm}</span>"
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Timeline */}
                            {!loading && topics.length > 0 && (
                                <div id="roadmap-timeline" className="max-w-5xl mx-auto space-y-16 pb-20 p-4 relative">
                                    {/* Central Line for Tree Structure */}
                                    <div className="absolute left-8 md:left-[3.5rem] top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-600 opacity-20 hidden md:block" />

                                    {topics
                                        .map(topic => {
                                            if (!searchTerm.trim()) return { ...topic, matchScore: 1, matchingSubtopics: new Set() };

                                            const searchLower = searchTerm.toLowerCase();
                                            const searchTerms = searchLower.split(/\s+/).filter(Boolean); // Split by space for better matching

                                            let score = 0;
                                            const matchingSubtopics = new Set();

                                            // 1. Main Topic Title Match (Highest Weight)
                                            if (topic.title?.toLowerCase().includes(searchLower)) score += 50;
                                            else if (searchTerms.some(term => topic.title?.toLowerCase().includes(term))) score += 20;

                                            // 2. Main Topic Description Match
                                            if (topic.description?.toLowerCase().includes(searchLower)) score += 10;

                                            // 3. Subtopic Matches
                                            if (topic.subtopics) {
                                                topic.subtopics.forEach(sub => {
                                                    const subTitle = sub.title?.toLowerCase() || '';
                                                    const subDesc = sub.description?.toLowerCase() || '';

                                                    if (subTitle.includes(searchLower)) {
                                                        score += 30;
                                                        matchingSubtopics.add(sub.id);
                                                    }
                                                    else if (searchTerms.some(term => subTitle.includes(term))) {
                                                        score += 15;
                                                        matchingSubtopics.add(sub.id);
                                                    }

                                                    if (subDesc.includes(searchLower)) {
                                                        score += 5;
                                                        matchingSubtopics.add(sub.id);
                                                    }
                                                });
                                            }

                                            return { ...topic, matchScore: score, matchingSubtopics };
                                        })
                                        .filter(t => t.matchScore > 0)
                                        .sort((a, b) => b.matchScore - a.matchScore) // Sort by relevance
                                        .map((topic, idx) => {
                                            // Auto-expand if subtopics matched in search
                                            const shouldExpand = searchTerm && topic.matchingSubtopics.size > 0;
                                            const isExpanded = expandedTopics.has(topic.id) || shouldExpand;

                                            return (
                                                <div key={topic.id || `topic-${idx}`} className="relative z-10 w-full">
                                                    {/* Main Topic Node */}
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -50 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="relative ml-0 md:ml-24 mb-10"
                                                    >
                                                        {/* Connecting Dot to Main Line */}
                                                        <div className="absolute top-10 -left-[4.5rem] w-6 h-6 rounded-full bg-cyan-500 border-4 border-white dark:border-slate-900 shadow-xl hidden md:block z-10" />
                                                        <div className="absolute top-[2.75rem] -left-[3.5rem] w-12 h-0.5 bg-cyan-500/30 hidden md:block" />


                                                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-300">
                                                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 group-hover:bg-cyan-500/10 transition-colors" />

                                                            <div className="flex flex-col gap-6">
                                                                <div className="flex items-start gap-6">
                                                                    <span className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-cyan-500/30">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div>
                                                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                                                                            {topic.title}
                                                                        </h3>
                                                                        <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                                                                            {topic.description}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Main Topic Actions */}
                                                                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button onClick={() => setSelectedTopic(topic)} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                                                                            <BookOpen size={16} /> Resources
                                                                        </button>
                                                                        {topic.status !== 'completed' && topic.status !== 'ready_for_test' && (
                                                                            <button onClick={() => handleMarkAsDone(topic.id)} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition">
                                                                                <CheckCircle size={16} /> Done
                                                                            </button>
                                                                        )}
                                                                        {(topic.status === 'completed' || topic.status === 'ready_for_test') && (
                                                                            <button onClick={() => { setSelectedTopic(null); setTestTopic(topic); }} className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition shadow-sm">
                                                                                <Trophy size={16} /> Test
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Accordion Toggle - Ultra Pro Max Style */}
                                                                    {topic.subtopics && topic.subtopics.length > 0 && (
                                                                        <button
                                                                            onClick={() => toggleTopic(topic.id)}
                                                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${expandedTopics.has(topic.id)
                                                                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                                                }`}
                                                                        >
                                                                            <span className="uppercase tracking-wider">
                                                                                {expandedTopics.has(topic.id) ? 'Hide Topics' : `Show ${topic.subtopics.length} Topics`}
                                                                            </span>
                                                                            <ChevronRight
                                                                                size={16}
                                                                                className={`transition-transform duration-300 ${expandedTopics.has(topic.id) ? 'rotate-90' : 'rotate-0'}`}
                                                                            />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>


                                                    {/* Sub-Topics Tree - Collapsible */}
                                                    <AnimatePresence>
                                                        {(isExpanded) && topic.subtopics && topic.subtopics.length > 0 && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="relative ml-4 md:ml-36 space-y-4 border-l-2 border-slate-200 dark:border-slate-700 pl-8 pb-8 pt-2">
                                                                    {topic.subtopics.map((sub, sIdx) => {
                                                                        const isSubCompleted = sub.status === 'completed';
                                                                        return (
                                                                            <motion.div
                                                                                key={sub.id || `sub-${idx}-${sIdx}`}
                                                                                initial={{ opacity: 0, x: -20 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                transition={{ delay: sIdx * 0.05 }}
                                                                                className="relative group"
                                                                            >
                                                                                {/* Connector */}
                                                                                <div className="absolute top-8 -left-[2.1rem] w-8 h-0.5 bg-slate-200 dark:border-slate-700 bg-slate-300 dark:bg-slate-700" />
                                                                                <div className="absolute top-[1.85rem] -left-[2.35rem] w-2 h-2 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />

                                                                                <div className={`bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all duration-200 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSubCompleted ? 'border-l-4 border-l-green-500' : ''}`}>
                                                                                    <div>
                                                                                        <div className="flex items-center gap-3 mb-1">
                                                                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                                                                                                {idx + 1}.{sIdx + 1}
                                                                                            </span>
                                                                                            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                                                                {sub.title}
                                                                                            </h4>
                                                                                        </div>
                                                                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug max-w-2xl">
                                                                                            {sub.description}
                                                                                        </p>
                                                                                    </div>

                                                                                    {/* Sub-Topic Floating Actions */}
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button
                                                                                            onClick={() => setSelectedTopic({ ...sub, id: sub.id, isSubtopic: true })}
                                                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-blue-500 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                                                                                            title="Resources"
                                                                                        >
                                                                                            <BookOpen size={14} /> Learn
                                                                                        </button>
                                                                                        {!isSubCompleted && (
                                                                                            <button
                                                                                                onClick={() => handleMarkAsDone(sub.id)}
                                                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-emerald-500 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
                                                                                                title="Mark Done"
                                                                                            >
                                                                                                <CheckCircle size={14} /> Done
                                                                                            </button>
                                                                                        )}
                                                                                        {isSubCompleted && (
                                                                                            <>
                                                                                                <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-500">
                                                                                                    <CheckCircle size={14} /> Done
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => { setSelectedTopic(null); setTestTopic({ ...sub, id: sub.id, isSubtopic: true }); }}
                                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-purple-500 text-xs font-bold border border-slate-200 dark:border-slate-600 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                                                                                                    title="Take Quiz"
                                                                                                >
                                                                                                    <Zap size={14} /> Quiz
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )
                                        })}
                                </div>
                            )
                            }

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
