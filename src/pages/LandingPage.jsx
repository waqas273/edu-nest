import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue, useSpring, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, CheckCircle, Globe, Zap, Shield, Users,
    Play, Moon, Sun, Code, Sparkles, LayoutGrid, Terminal,
    Briefcase, GraduationCap, Map, ClipboardCheck, Building2, ShieldCheck,
    Cpu, Rocket, Trophy, BarChart3, TrendingUp, Award
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
        setPosition({ x: x * 0.2, y: y * 0.2 });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    const { x, y } = position;

    return (
        <motion.button
            ref={ref}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            className={`${className}`}
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

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

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
            className={`relative group rounded-2xl overflow-hidden transition-all duration-300
                bg-white border border-gray-200 shadow-xl hover:shadow-2xl hover:border-emerald-500/50
                dark:bg-white/5 dark:border-white/10 dark:hover:border-emerald-500/50 dark:shadow-none backdrop-blur-md
                ${className}`}
        >
            {/* Emerald Reveal Glow */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                          600px circle at ${mouseX}px ${mouseY}px,
                          rgba(16, 185, 129, 0.15),
                          transparent 80%
                        )
                    `,
                }}
            />

            <div className="relative z-10 h-full p-8 flex flex-col" style={{ transform: "translateZ(20px)" }}>
                <div className="mb-4 inline-flex p-3 rounded-xl bg-emerald-500/10 w-fit text-emerald-500 group-hover:scale-110 transition-transform duration-300">
                    <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 flex-grow">{description}</p>
                {children}
            </div>
        </motion.div>
    );
};

// 3. Smart Progress Analytics Card
const AnalyticsCard = () => {
    return (
        <div className="relative w-full overflow-hidden rounded-3xl bg-slate-900 border border-emerald-500/30 p-8 md:p-12 shadow-2xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-slate-900/80 z-0" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />

            {/* Floating Elements */}
            <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 z-10 hidden lg:block text-emerald-400 opacity-20"
            >
                <TrendingUp size={120} />
            </motion.div>

            <div className="relative z-20 grid lg:grid-cols-2 gap-8 items-center">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-4">
                        <BarChart3 size={12} /> ANALYTICS DASHBOARD
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                        Visualize Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Growth Journey</span>
                    </h2>
                    <p className="text-slate-400 mb-8 max-w-md">
                        Track your progress with detailed analytics. See how close you are to your dream university or job with our real-time skill score.
                    </p>

                    <div className="flex items-center gap-4 text-emerald-400 text-sm font-bold">
                        <span className="flex items-center gap-1"><CheckCircle size={16} /> Data-Driven Success</span>
                    </div>
                </div>

                {/* 3D Dashboard Visual */}
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="relative h-[320px] w-full bg-slate-800/80 rounded-xl border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl transform group-hover:rotate-y-2 transition-transform duration-500 perspective-1000 flex flex-col"
                >
                    {/* Dashboard Header */}
                    <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 bg-slate-900/50">
                        <span className="text-xs text-slate-400 font-mono">student_dashboard.exe</span>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="p-6 flex-1 flex flex-col gap-6">

                        {/* Skill Growth Graph */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <h4 className="text-xs text-slate-400 uppercase tracking-wider font-bold">Skill Growth</h4>
                                <span className="text-emerald-400 text-xs font-bold">+24% this week</span>
                            </div>
                            <div className="h-24 flex items-end justify-between gap-2">
                                {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        whileInView={{ height: `${h}%` }}
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        className="w-full bg-gradient-to-t from-emerald-500/20 to-emerald-500 rounded-t-sm relative group cursor-pointer"
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h}%
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Badges Earned */}
                        <div>
                            <h4 className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">Recent Badges</h4>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white"><Code size={16} /></div>
                                    <div>
                                        <p className="text-xs text-white font-bold">React Basic</p>
                                        <p className="text-[10px] text-emerald-400">Earned 2d ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white"><Trophy size={16} /></div>
                                    <div>
                                        <p className="text-xs text-white font-bold">Logic Master</p>
                                        <p className="text-[10px] text-blue-400">Top 5%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

// 4. Animated Stats Counter
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

    useEffect(() => {
        return count.onChange((latest) => {
            setDisplayValue(Math.floor(latest));
        });
    }, [count]);

    return (
        <div ref={ref} className="text-center">
            <h4 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 mb-2">
                {displayValue.toLocaleString()}+
            </h4>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{label}</p>
        </div>
    );
};


const LandingPage = () => {
    const navigate = useNavigate();
    const { toggleTheme, isDark } = useTheme();
    const [isTeamOpen, setIsTeamOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors duration-500 selection:bg-emerald-500/30 font-sans overflow-x-hidden">

            {/* 1. GLASS HEADER */}
            <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 backdrop-blur-lg border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-slate-950/60 transition-colors"
            >
                {/* Brand */}
                <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
                    <img src={logoImg} alt="EduNest" className="w-10 h-10 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300" />
                    <span className="font-bold text-xl tracking-tight hidden sm:block text-slate-800 dark:text-white">EduNest</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="relative px-6 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-lg hover:shadow-emerald-500/25 transition-all overflow-hidden group"
                    >
                        <span className="relative z-10 group-hover:text-emerald-300 dark:group-hover:text-emerald-600 transition-colors">Login</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                    </button>
                </div>
            </motion.header>

            {/* 2. HERO SECTION */}
            <section className="relative pt-40 pb-24 min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full opacity-40 animate-pulse-slow" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50 dark:opacity-100"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
                    <div className="space-y-8 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mx-auto lg:mx-0"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Powering Pakistan's Tech Future
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                            className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white"
                        >
                            Build a Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">Tech Career</span>,<br />
                            Right Here.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed mx-auto lg:mx-0"
                        >
                            Complete roadmaps, AI mock tests, and scholarship resources tailored for Pakistani students aiming for top universities and software houses.
                        </motion.p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <MagneticButton
                                onClick={() => navigate('/signup')}
                                className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-full font-bold shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.4)] transition-shadow text-lg flex items-center justify-center gap-2"
                            >
                                Start Your Journey <ArrowRight size={20} />
                            </MagneticButton>
                        </div>
                    </div>

                    {/* 3D Abstract Visual - Connecting Nodes */}
                    <div className="relative h-[500px] hidden lg:flex items-center justify-center perspective-[1500px]">
                        <motion.div
                            animate={{
                                y: [-20, 20],
                                rotateZ: [-5, 5],
                                rotateX: [10, -10]
                            }}
                            transition={{
                                duration: 10,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative w-[500px] h-[500px]"
                        >
                            {/* Central Hub */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white dark:bg-slate-900 rounded-full border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.15)] flex items-center justify-center z-20">
                                <img src={logoImg} className="w-16 h-16 opacity-90" />
                            </div>

                            {/* Orbital Nodes */}
                            {[0, 72, 144, 216, 288].map((deg, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute top-1/2 left-1/2 w-16 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-2xl z-10 text-slate-700 dark:text-slate-300"
                                    animate={{
                                        x: [Math.cos(deg * Math.PI / 180) * 180, Math.cos((deg + 360) * Math.PI / 180) * 180],
                                        y: [Math.sin(deg * Math.PI / 180) * 180, Math.sin((deg + 360) * Math.PI / 180) * 180],
                                    }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                >
                                    {[<Map />, <ClipboardCheck />, <Building2 />, <GraduationCap />, <ShieldCheck />][i]}
                                </motion.div>
                            ))}

                            {/* Connecting Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 animate-spin-slow" style={{ animationDuration: '60s' }}>
                                <circle cx="50%" cy="50%" r="180" stroke="#10b981" strokeWidth="1" strokeDasharray="10 10" fill="none" className="dark:stroke-emerald-500 stroke-emerald-300" />
                                <circle cx="50%" cy="50%" r="120" stroke="currentColor" strokeWidth="0.5" className="text-emerald-500" fill="none" />
                            </svg>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 3. STATS SECTION */}
            <section className="py-12 bg-white/50 dark:bg-white/5 border-y border-gray-100 dark:border-white/5 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
                    <Counter value={10000} label="Students Enrolled" />
                    <Counter value={500} label="Career Roadmaps" />
                    <Counter value={25000} label="Tests Taken" />
                    <Counter value={400} label="Scholarships" />
                </div>
            </section>

            {/* 4. CORE MODULES GRAVITY GRID */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="mb-16 text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-emerald-500 font-bold tracking-wider text-sm uppercase mb-2 block"
                    >
                        Gravity Powered
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4"
                    >
                        Experience the Future
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-lg"
                    >
                        Interact with our core modules. They respond to your presence.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 auto-rows-[280px]">

                    {/* 1. Interactive Roadmap (Large) */}
                    <GravityCard
                        className="md:col-span-2"
                        title="Interactive Roadmap"
                        description="Step-by-step career paths. Visualize your progress from novice to expert."
                        icon={Map}
                    />

                    {/* 2. Entry Test Prep */}
                    <GravityCard
                        title="Entry Test Prep"
                        description="Prepare for your university entrance exams (MDCAT, ECAT) with AI-generated mock tests."
                        icon={ClipboardCheck}
                    />

                    {/* 3. Find Universities */}
                    <GravityCard
                        title="Find Universities"
                        description="Explore top Pakistani universities, admission criteria, and fee structures."
                        icon={Building2}
                    />

                    {/* 4. Scholarship Hunt (Large) */}
                    <GravityCard
                        className="md:col-span-2"
                        title="Scholarship Hunt"
                        description="Find and check eligibility for scholarships."
                        icon={GraduationCap}
                    />

                    {/* 5. Safe Community */}
                    <GravityCard
                        title="Safe Community"
                        description="A moderated, focused space for students to discuss studies and career growth."
                        icon={ShieldCheck}
                    />
                </div>
            </section>

            {/* 5. ANALYTICS SPOTLIGHT SECTION (REPLACES MOCK INTERVIEW) */}
            <section className="py-20 px-6 max-w-7xl mx-auto">
                <div className="mb-12 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pro Max Features</h2>
                </div>
                <AnalyticsCard />
            </section>

            {/* 6. PRO FOOTER */}
            <Footer onOpenTeamModal={() => setIsTeamOpen(true)} />

            {/* 7. TEAM MODAL */}
            <TeamModal isOpen={isTeamOpen} onClose={() => setIsTeamOpen(false)} />

        </div>
    );
};

export default LandingPage;
