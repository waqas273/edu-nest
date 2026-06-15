import React, { useRef, useState, useEffect } from 'react';
import { motion, useTransform, useMotionTemplate, useMotionValue, useSpring, AnimatePresence, useInView, useMotionValueEvent } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, Users, Moon, Sun, GraduationCap, Map, ClipboardCheck, Building2, ShieldCheck,
    Cpu, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';
import TeamModal from '../components/TeamModal';
import logoImg from '../assets/EduNest.png';

// --- SUB-COMPONENTS ---

// 1. Magnetic Button (Framer Motion)
const MagneticButton = ({ children, className = "", onClick }) => {
    const ref = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);
        setPosition({ x: x * 0.15, y: y * 0.15 });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    const { x, y } = position;

    return (
        <motion.button
            ref={ref}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 180, damping: 18, mass: 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={className}
        >
            {children}
        </motion.button>
    );
};

// 2. Gravity Card (Pro Max)
const GravityCard = ({ children, className = "", title, icon: Icon, description }) => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 400, damping: 80 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 80 });

    function handleMouseMove({ currentTarget, clientX, clientY }) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const xPct = (clientX - left) / width - 0.5;
        const yPct = (clientY - top) / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            style={{
                rotateX: useTransform(mouseY, [-0.5, 0.5], [10, -10]),
                rotateY: useTransform(mouseX, [-0.5, 0.5], [-10, 10]),
                transformStyle: "preserve-3d",
            }}
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative group rounded-3xl overflow-hidden transition-all duration-300
                bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500/30
                dark:bg-slate-900 dark:border-slate-800 dark:hover:border-emerald-500/30 backdrop-blur-md
                ${className}`}
        >
            {/* Emerald Reveal Glow */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                          450px circle at ${mouseX}px ${mouseY}px,
                          rgba(16, 185, 129, 0.12),
                          transparent 75%
                        )
                    `,
                }}
            />

            <div className="relative z-10 h-full p-8 flex flex-col justify-between" style={{ transform: "translateZ(20px)" }}>
                <div>
                    <div className="mb-5 inline-flex p-3 rounded-2xl bg-emerald-500/10 w-fit text-emerald-600 dark:text-emerald-400 group-hover:scale-[1.08] transition-transform duration-300">
                        <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">{description}</p>
                </div>
                {children}
            </div>
        </motion.div>
    );
};

// 3. Stats Counter
const Counter = ({ value, label }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const count = useSpring(0, { stiffness: 50, damping: 20 });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            count.set(value);
        }
    }, [isInView, value, count]);

    useMotionValueEvent(count, "change", (latest) => {
        setDisplayValue(Math.floor(latest));
    });

    return (
        <div ref={ref} className="text-center">
            <h4 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 mb-1">
                {displayValue.toLocaleString()}+
            </h4>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{label}</p>
        </div>
    );
};

// Helper function to calculate static orbital coordinates
const getOrbitPosition = (deg, radius) => {
    const x = Math.cos(deg * Math.PI / 180) * radius;
    const y = Math.sin(deg * Math.PI / 180) * radius;
    return { x, y };
};

// Global scroll animation variants
const sectionVariants = {
    hidden: { opacity: 0, y: 35 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
};

// Staggered container variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.05
        }
    }
};

// Staggered item variants
const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 15 }
    }
};

// 4. FAQ Accordion Row
const FAQAccordion = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div 
            variants={itemVariants}
            className="border-b border-slate-200 dark:border-slate-800 last:border-0 py-4"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-2 font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-base"
            >
                <span className="flex items-center gap-3">
                    <HelpCircle className="text-emerald-500 flex-shrink-0" size={18} />
                    {question}
                </span>
                {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <p className="text-sm text-slate-550 dark:text-slate-400 pl-7 pr-4 py-2 leading-relaxed">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


const LandingPage = () => {
    const navigate = useNavigate();
    const { toggleTheme, isDark } = useTheme();
    const [isTeamOpen, setIsTeamOpen] = useState(false);
    const [activeBlueprint, setActiveBlueprint] = useState('mdcat'); // 'mdcat' | 'ecat'

    // Scroll targets
    const featuresRef = useRef(null);
    const blueprintRef = useRef(null);
    const partnersRef = useRef(null);
    const faqRef = useRef(null);

    const scrollToRef = (ref) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 selection:bg-emerald-500/20 font-sans overflow-x-hidden">

            {/* 1. GLASS NAV BAR */}
            <motion.header
                initial={{ y: -80 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/40 bg-white/80 dark:bg-slate-950/70"
            >
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    
                    {/* Brand */}
                    <div onClick={() => navigate('/')} className="flex items-center gap-4 cursor-pointer group">
                        <div className="w-14 h-14 flex items-center justify-center group-hover:scale-[1.08] transition-all duration-300">
                            <img src={logoImg} alt="EduNest Logo" className="w-full h-full object-contain filter drop-shadow-md" />
                        </div>
                        <span className="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">EduNest</span>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <button onClick={() => scrollToRef(featuresRef)} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Core Features</button>
                        <button onClick={() => scrollToRef(blueprintRef)} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Exam Blueprints</button>
                        <button onClick={() => scrollToRef(partnersRef)} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Analytics</button>
                        <button onClick={() => scrollToRef(faqRef)} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Support FAQ</button>
                        <button onClick={() => setIsTeamOpen(true)} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">About Team</button>
                    </nav>

                    {/* Action Items */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                        >
                            Log In
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-50 dark:hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </motion.header>

            {/* 2. HERO SECTION */}
            <section className="relative pt-40 pb-24 min-h-[90vh] flex items-center justify-center overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] bg-top">
                
                {/* Background atmosphere */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] rounded-full opacity-40 animate-pulse" style={{ animationDuration: '8s' }} />
                </div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
                    
                    {/* Left Info */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-8 text-center lg:text-left"
                    >
                        <motion.div
                            variants={itemVariants}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold mx-auto lg:mx-0 shadow-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Powering Pakistan's Tech Future
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="text-4xl md:text-5xl lg:text-[4rem] font-black tracking-tight leading-[1.12] text-slate-900 dark:text-white"
                        >
                            Build a Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Tech Career</span>,<br />
                            Right Here.
                        </motion.h1>

                        <motion.p
                            variants={itemVariants}
                            className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed mx-auto lg:mx-0"
                        >
                            Dynamic roadmaps, RAG textbook-grounded exam preparation, university admission matches, and peer networking resources tailored for Pakistani students.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <MagneticButton
                                onClick={() => navigate('/signup')}
                                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-full font-bold shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] transition-all text-base flex items-center justify-center gap-2"
                            >
                                Start Your Journey <ArrowRight size={18} />
                            </MagneticButton>
                        </motion.div>
                    </motion.div>

                    {/* Right Visual: Orbiting nodes hub (Preserved and Polished) */}
                    <div className="relative h-[480px] hidden lg:flex items-center justify-center [perspective:1500px]">
                        <motion.div
                            animate={{
                                y: [-15, 15],
                                rotateZ: [-3, 3],
                                rotateX: [8, -8]
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative w-[480px] h-[480px]"
                        >
                            {/* Central Logo Node */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white dark:bg-slate-900 rounded-full border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex items-center justify-center z-20">
                                <img src={logoImg} alt="Central Logo" className="w-16 h-16 object-contain opacity-90" />
                            </div>

                            {/* Orbiting Icons */}
                            {[0, 72, 144, 216, 288].map((deg, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center shadow-md dark:shadow-2xl z-10 text-slate-700 dark:text-slate-350 cursor-pointer"
                                    style={{ marginLeft: "-2rem", marginTop: "-2rem" }}
                                    animate={{
                                        x: [Math.cos(deg * Math.PI / 180) * 170, Math.cos((deg + 360) * Math.PI / 180) * 170],
                                        y: [Math.sin(deg * Math.PI / 180) * 170, Math.sin((deg + 360) * Math.PI / 180) * 170],
                                    }}
                                    transition={{
                                        duration: 25,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    whileHover={{ scale: 1.12 }}
                                >
                                    {[<Map key="map" />, <ClipboardCheck key="clip" />, <Building2 key="build" />, <GraduationCap key="grad" />, <ShieldCheck key="shield" />][i]}
                                </motion.div>
                            ))}

                            {/* Orbital Lines Overlay */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ animation: 'spin 60s linear infinite' }}>
                                <circle cx="50%" cy="50%" r="170" stroke="#10b981" strokeWidth="1" strokeDasharray="10 10" fill="none" className="dark:stroke-emerald-500 stroke-emerald-300" />
                                <circle cx="50%" cy="50%" r="110" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" fill="none" />
                            </svg>
                        </motion.div>
                    </div>

                </div>
            </section>

            {/* 3. STATS ROW */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="py-12 bg-white/40 dark:bg-white/5 border-y border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm"
            >
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <Counter value={10000} label="Students Enrolled" />
                    <Counter value={500} label="Career Roadmaps" />
                    <Counter value={25000} label="Tests Taken" />
                    <Counter value={400} label="Scholarships Listed" />
                </div>
            </motion.section>

            {/* 4. DYNAMIC MODULES GRID (Pillars of EduNest) */}
            <section 
                ref={featuresRef} 
                className="py-24 px-6 max-w-7xl mx-auto scroll-margin-top-12"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="mb-20 text-center"
                >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-xs uppercase mb-3 block">Integrated Student Workspace</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Experience the Core Pillars</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
                        Explore our student-facing features, built with textbooks and machine learning algorithms.
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[280px]"
                >
                    {/* Feature 1: Study Roadmaps (Large Card) */}
                    <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
                        <GravityCard
                            className="h-full"
                            title="Interactive Study Roadmaps"
                            description="Semester-by-semester course guides, recommended university pathways, and certificates custom-fitted to your tech skills and target careers."
                            icon={Map}
                        />
                    </motion.div>

                    {/* Feature 2: RAG Exam Prep */}
                    <motion.div variants={itemVariants}>
                        <GravityCard
                            className="h-full"
                            title="RAG-Based Exam Prep"
                            description="Textbook-grounded MDCAT/ECAT mock tests (using ChromaDB & Llama 3.3). Features negative marking, visibility warnings, and explanation panels."
                            icon={ClipboardCheck}
                        />
                    </motion.div>

                    {/* Feature 3: Degree Matcher */}
                    <motion.div variants={itemVariants}>
                        <GravityCard
                            className="h-full"
                            title="Field Recommendation"
                            description="Trained Machine Learning model (Random Forest) that processes interest questionnaires to recommend study majors, using custom comparison prompts."
                            icon={Cpu}
                        />
                    </motion.div>

                    {/* Feature 4: University Admissions */}
                    <motion.div variants={itemVariants}>
                        <GravityCard
                            className="h-full"
                            title="University Directory & Admissions"
                            description="Browse Pakistani university campuses, offered programs, and fee structures. Directly evaluate eligibility percentages and submit admission applications."
                            icon={Building2}
                        />
                    </motion.div>

                    {/* Feature 5: Peer Chats & Community */}
                    <motion.div variants={itemVariants}>
                        <GravityCard
                            className="h-full"
                            title="Community Boards & Chat"
                            description="Connect with peer groups through real-time chatting channels, direct message feeds, and public discussion forum threads."
                            icon={Users}
                        />
                    </motion.div>
                </motion.div>
            </section>

            {/* 5. INTERACTIVE BLUEPRINT SELECTOR */}
            <section 
                ref={blueprintRef} 
                className="py-20 bg-slate-100/50 dark:bg-slate-900/20 border-y border-slate-200/50 dark:border-slate-800/50 scroll-margin-top-12"
            >
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6 }}
                        className="mb-14 text-center"
                    >
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-xs uppercase mb-3 block">Exam Distributions</span>
                        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-4">Interactive Exam Blueprint Showcase</h2>
                        <p className="text-slate-550 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                            Switch between prep exam profiles to inspect subject weights, durations, and marking guidelines.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex justify-center mb-10"
                    >
                        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex gap-2">
                            <button
                                onClick={() => setActiveBlueprint('mdcat')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    activeBlueprint === 'mdcat'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                MDCAT Pattern (Medical)
                            </button>
                            <button
                                onClick={() => setActiveBlueprint('ecat')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                    activeBlueprint === 'ecat'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                            >
                                ECAT Pattern (Engineering)
                            </button>
                        </div>
                    </motion.div>

                    {/* Blueprint Display Card */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeBlueprint}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="grid md:grid-cols-2 gap-8 items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 rounded-3xl shadow-sm"
                        >
                            {/* Blueprint Parameters */}
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                    {activeBlueprint === 'mdcat' ? 'Medical Pattern' : 'Engineering Pattern'}
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                                    {activeBlueprint === 'mdcat' ? 'Medical & Dental College Admission Test' : 'Engineering College Admission Test'}
                                </h3>
                                <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
                                    {activeBlueprint === 'mdcat' 
                                        ? 'Generates exams targeting FSc Pre-Medical topics. Follows the official MDCAT pattern with custom-grounded question chunks.' 
                                        : 'Evaluates logical depth, math coordinates, and formulas in engineering areas. Strictly models UET requirements.'}
                                </p>

                                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Total Questions</p>
                                        <p className="text-base text-slate-800 dark:text-white font-extrabold">{activeBlueprint === 'mdcat' ? '180 MCQs' : '100 MCQs'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Duration</p>
                                        <p className="text-base text-slate-800 dark:text-white font-extrabold">{activeBlueprint === 'mdcat' ? '180 Mins' : '100 Mins'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Marking Scheme</p>
                                        <p className="text-base text-slate-800 dark:text-white font-extrabold">{activeBlueprint === 'mdcat' ? '+1 / 0' : '+4 / -1'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Subjects Distribution */}
                            <div className="space-y-4">
                                <h4 className="text-xs uppercase font-black tracking-wider text-slate-500 mb-2">Subject Distribution</h4>
                                {activeBlueprint === 'mdcat' ? (
                                    <>
                                        {[
                                            { name: 'Biology', count: 81, percent: 45 },
                                            { name: 'Chemistry', count: 45, percent: 25 },
                                            { name: 'Physics', count: 36, percent: 20 },
                                            { name: 'English & Logic', count: 18, percent: 10 }
                                        ].map(s => (
                                            <div key={s.name}>
                                                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350 mb-1">
                                                    <span>{s.name}</span>
                                                    <span>{s.count} Questions ({s.percent}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.percent}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {[
                                            { name: 'Mathematics', count: 30, percent: 30 },
                                            { name: 'Physics', count: 30, percent: 30 },
                                            { name: 'Chemistry', count: 30, percent: 30 },
                                            { name: 'English', count: 10, percent: 10 }
                                        ].map(s => (
                                            <div key={s.name}>
                                                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350 mb-1">
                                                    <span>{s.name}</span>
                                                    <span>{s.count} Questions ({s.percent}%)</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.percent}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* 6. PERFORMANCE ANALYTICS SHOWCASE */}
            <section 
                ref={partnersRef} 
                className="py-20 px-6 max-w-7xl mx-auto scroll-margin-top-12"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="mb-14 text-center"
                >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-xs uppercase mb-3 block">Progress & Insights</span>
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-3">Smart Performance Analytics Dashboard</h2>
                    <p className="text-slate-550 dark:text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                        Track your metrics, pinpoint curriculum weaknesses, and review detailed solved past paper history.
                    </p>
                </motion.div>

                {/* Dashboard Showcase Visual Card */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8"
                >
                    
                    {/* Diagnostic Metric 1 */}
                    <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2.5 py-1 rounded-full">Accuracy Rating</span>
                                <span className="text-xs text-slate-400">Past 10 Mock Exams</span>
                            </div>
                            <h4 className="text-4xl font-black text-slate-800 dark:text-white mb-2">82.4%</h4>
                            <p className="text-slate-500 text-xs leading-relaxed">Your accuracy is highest in Biology (88%) and lowest in Physics (71%). Focus on mechanics.</p>
                        </div>
                        <div className="mt-6 space-y-3">
                            {[
                                { subject: 'Biology', pct: 88, color: 'bg-emerald-500' },
                                { subject: 'Chemistry', pct: 79, color: 'bg-teal-500' },
                                { subject: 'Physics', pct: 71, color: 'bg-amber-500' }
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        <span>{item.subject}</span>
                                        <span>{item.pct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Diagnostic Metric 2 */}
                    <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase bg-teal-500/10 px-2.5 py-1 rounded-full">Speed Profile</span>
                                <span className="text-xs text-slate-400">Per MCQ Average</span>
                            </div>
                            <h4 className="text-4xl font-black text-slate-800 dark:text-white mb-2">48s <span className="text-xs font-normal text-slate-400">/ Question</span></h4>
                            <p className="text-slate-500 text-xs leading-relaxed">Great speed management! You complete biology questions faster, saving critical time for physics numericals.</p>
                        </div>
                        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 flex justify-between items-center text-center">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Optimal Speed</p>
                                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">60s</p>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Your Speed</p>
                                <p className="text-sm font-extrabold text-emerald-500">48s</p>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Efficiency</p>
                                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">+20%</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Diagnostic Metric 3 */}
                    <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/30 transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2.5 py-1 rounded-full">Topic Drilldown</span>
                                <span className="text-xs text-slate-400">Weak Chapters Identified</span>
                            </div>
                            <h4 className="text-4xl font-black text-slate-800 dark:text-white mb-2">3 <span className="text-xs font-normal text-slate-400">Needs Review</span></h4>
                            <p className="text-slate-500 text-xs leading-relaxed">The analytics model suggests reviewing these chapters based on recurring error metrics in mock tests.</p>
                        </div>
                        <div className="mt-6 space-y-2">
                            {[
                                { topic: 'Physics: Electrostatics', level: 'High Error Rate' },
                                { topic: 'Chemistry: Alkyl Halides', level: 'Moderate' },
                                { topic: 'Biology: Coordination', level: 'Time Sink' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900">
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{item.topic}</span>
                                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-bold uppercase">{item.level}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </motion.div>
            </section>

            {/* 7. SUPPORT FAQ (ACCORDION UI) */}
            <section 
                ref={faqRef} 
                className="py-20 px-6 max-w-4xl mx-auto scroll-margin-top-12"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="mb-14 text-center"
                >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-xs uppercase mb-3 block">Common Questions</span>
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-3">Frequently Asked Questions</h2>
                    <p className="text-slate-550 dark:text-slate-400 text-sm">
                        Answers to details regarding our vector-grounded prep engine and roadmap tools.
                    </p>
                </motion.div>

                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-3xl shadow-sm"
                >
                    <FAQAccordion 
                        question="How does the Retrieval-Augmented Generation (RAG) system guarantee mock exam accuracy?"
                        answer="Our RAG exam generator retrieves relevant textbook paragraphs from verified FSc intermediate textbook chapters stored in ChromaDB (for Biology, Chemistry, and Physics). When generating questions via Groq Llama 3.3, it forces the AI models to base all queries, incorrect options, and explanations exclusively on these retrieved paragraphs. This eliminates artificial hallucinations, ensuring questions are syllabus-compliant."
                    />
                    <FAQAccordion 
                        question="How does the Anti-Cheat Tab Tracking system operate during mock tests?"
                        answer="To simulate realistic entry-test environments, our testing interface monitors your browser window visibility. If you switch tabs, look up answers, or minimize the browser window while a mock test is active, the engine logs a warning. Upon the third tab-switch violation, the test is auto-submitted to enforce academic integrity."
                    />
                    <FAQAccordion 
                        question="How does the ML-powered Field Recommendation system find my optimal major?"
                        answer="The Field Recommendation portal utilizes a trained Machine Learning Random Forest Classifier model. It takes your interest answers, FSc results, and academic preferences to evaluate compatibility percentages for key tech and medical careers. Clashing outcomes are resolved on the backend using comparative models to present you with your top 3 matches."
                    />
                    <FAQAccordion 
                        question="Are the study roadmaps static or do they update dynamically?"
                        answer="Our Interactive Roadmaps are dynamically configured to fit your progress. They outline semester schedules, major tech domains, recommended third-party certification links, and structured video course options, enabling you to visualise your education pathway and complete targets at your own pace."
                    />
                    <FAQAccordion 
                        question="Can I communicate and coordinate with other students preparing for the same test?"
                        answer="Yes. EduNest features a real-time Community module with public forum threads, discussion groups, and direct messaging channels. You can join subject-focused study groups, share textbook notes, and coordinate study sessions with peers aiming for the same universities."
                    />
                    <FAQAccordion 
                        question="How does the dashboard track and analyze my historical mock exam scores?"
                        answer="Every exam attempt is recorded in detail. The dashboard analyzes your accuracy margins per subject, average time metrics per question, and common errors. It visually displays your score history in charts, pointing out weak chapters so you know exactly which textbook pages to review."
                    />
                </motion.div>
            </section>

            {/* 8. CALL TO ACTION */}
            <section className="py-24 px-6 max-w-6xl mx-auto text-center relative">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }} 
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="relative z-10 bg-slate-900 dark:bg-slate-900/50 border border-slate-800 rounded-3xl p-12 overflow-hidden shadow-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-slate-950 pointer-events-none" />
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 relative z-10">Ready to Advance Your Studies?</h2>
                    <p className="text-slate-400 text-base max-w-md mx-auto mb-8 relative z-10">
                        Join thousands of Pakistani students aligning their paths and preparing for entrance exams.
                    </p>
                    <div className="flex justify-center relative z-10">
                        <button
                            onClick={() => navigate('/signup')}
                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-base"
                        >
                            Sign Up for Free
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* 9. FOOTER */}
            <Footer onOpenTeamModal={() => setIsTeamOpen(true)} />

            {/* 10. TEAM MODAL */}
            <TeamModal isOpen={isTeamOpen} onClose={() => setIsTeamOpen(false)} />

        </div>
    );
};

export default LandingPage;
