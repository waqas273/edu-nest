import { useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function MouseSpotlight() {
    const { isDark } = useTheme();

    // Smooth spring physics
    const x = useSpring(0, { damping: 30, stiffness: 150, mass: 0.5 });
    const y = useSpring(0, { damping: 30, stiffness: 150, mass: 0.5 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            x.set(e.clientX - 300); // Center the 600px blob
            y.set(e.clientY - 300);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [x, y]);

    return (
        <motion.div
            style={{ x, y }}
            className={`fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-0 transition-opacity duration-500 ${isDark ? 'blur-[120px] opacity-25' : 'blur-[100px] opacity-15'
                }`}
            animate={{
                background: isDark
                    ? 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, rgba(188,19,254,0.2) 40%, rgba(0,0,0,0) 70%)'
                    : 'radial-gradient(circle, rgba(251,146,60,0.2) 0%, rgba(79,70,229,0.15) 40%, rgba(255,255,255,0) 70%)'
            }}
            transition={{ duration: 0.3 }}
        />
    );
}
