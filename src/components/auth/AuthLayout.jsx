import { useState, useEffect } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/EduNest.png';


const AuthLayout = ({ children, title, subtitle }) => {
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [mounted, setMounted] = useState(false);

    // Mouse Spotlight Logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        setMounted(true);
        const handleMouseMove = ({ clientX, clientY }) => {
            mouseX.set(clientX);
            mouseY.set(clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Adaptive Background Gradient based on theme
    const bgGradient = useMotionTemplate`radial-gradient(
        800px circle at ${mouseX}px ${mouseY}px,
        ${isDark ? 'rgba(29, 78, 216, 0.12)' : 'rgba(14, 165, 233, 0.12)'},
        transparent 80%
    )`;

    if (!mounted) return null;

    return (
        <div className={`min-h-screen w-full relative overflow-hidden transition-colors duration-700 selection:bg-emerald-500/30 ${isDark ? 'bg-[#020617] text-white' : 'bg-slate-50 text-slate-900'}`}>



            {/* Mouse Spotlight Layer */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
                style={{ background: bgGradient }}
            />

            {/* Ambient Background Mesh/Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] mix-blend-screen animate-pulse-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px] mix-blend-screen animate-pulse-slow delay-1000" />
            <div className="absolute top-[40%] left-[40%] w-[800px] h-[800px] rounded-full bg-indigo-500/5 blur-[150px] mix-blend-screen" />

            {/* Navbar / Top Controls */}
            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                    <img src={logo} alt="EduNest" crossOrigin="anonymous" className="w-8 h-8 object-contain drop-shadow-lg" />
                    <span className="font-bold text-lg hidden sm:block opacity-90 group-hover:opacity-100 transition-opacity tracking-tight">EduNest</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all active:scale-95 backdrop-blur-sm border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all backdrop-blur-sm border border-transparent hover:border-slate-300 dark:hover:border-slate-700">
                        Back to Home <ArrowLeft size={16} className="rotate-180" />
                    </button>
                </div>
            </nav>

            {/* Main Content Container */}
            <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // Custom spring-like easing
                    className="w-full max-w-[480px] relative"
                >
                    {/* Glassmorphic Card */}
                    <div className={`relative backdrop-blur-2xl rounded-[2rem] border shadow-2xl p-8 sm:p-12 overflow-hidden
                        ${isDark
                            ? 'bg-slate-900/40 border-white/5 shadow-black/40 ring-1 ring-white/5'
                            : 'bg-white/70 border-white/40 shadow-slate-200/60 ring-1 ring-white/40'
                        }`}
                    >
                        {/* Inner Glow Mesh */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-60 pointer-events-none 
                            ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-300/30'}`}
                        />

                        {/* Header */}
                        <div className="text-center mb-10 relative z-10">
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 animate-gradient-x bg-[length:200%_auto]"
                            >
                                {title}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                            >
                                {subtitle}
                            </motion.p>
                        </div>

                        {children}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
