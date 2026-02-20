import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const AnimatedBackground = () => {
    const { isDark } = useTheme();

    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Base Gradient */}
            <div className={`absolute inset-0 transition-colors duration-500 ${isDark
                    ? 'bg-gradient-to-br from-[#020204] via-[#0a0520] to-[#020204]'
                    : 'bg-gradient-to-br from-[#F3F4F6] via-[#E5E7EB] to-[#F3F4F6]'
                }`} />

            {/* Floating Orbs */}
            <motion.div
                className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${isDark ? 'opacity-20' : 'opacity-10'
                    }`}
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)'
                }}
                animate={{
                    x: [0, 100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <motion.div
                className={`absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full blur-3xl transition-opacity duration-500 ${isDark ? 'opacity-15' : 'opacity-8'
                    }`}
                style={{
                    background: isDark
                        ? 'radial-gradient(circle, rgba(188,19,254,0.4) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)'
                }}
                animate={{
                    x: [0, -80, 0],
                    y: [0, 60, 0],
                    scale: [1, 1.1, 1]
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                }}
            />

            {/* Animated Grid */}
            <motion.div
                className={`absolute inset-0 transition-opacity duration-500 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.02]'
                    }`}
                style={{
                    backgroundImage: isDark
                        ? `linear-gradient(rgba(0,240,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,240,255,0.1) 1px, transparent 1px)`
                        : `linear-gradient(rgba(124,58,237,0.08) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(124,58,237,0.08) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}
                animate={{
                    backgroundPosition: ['0px 0px', '50px 50px']
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />

            {/* Scan Line */}
            <motion.div
                className={`absolute inset-x-0 h-px ${isDark
                        ? 'bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent'
                        : 'bg-gradient-to-r from-transparent via-indigo-400/20 to-transparent'
                    }`}
                animate={{
                    y: ['0vh', '100vh']
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
        </div>
    );
};

export default AnimatedBackground;
