import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/EduNest.png'; // Using the verified local asset

const SplashScreen = ({ onFinish }) => {
    const [progress, setProgress] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Progress Logic (3.5s total)
        const duration = 3500;
        const intervalTime = 30;
        const steps = duration / intervalTime;
        const increment = 100 / steps;

        const progressTimer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressTimer);
                    return 100;
                }
                return Math.min(prev + increment, 100);
            });
        }, intervalTime);

        // Exit Trigger
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 3200); // Start exit animation just before finish

        // Unmount Trigger
        const finishTimer = setTimeout(() => {
            if (onFinish) onFinish();
        }, 3800);

        return () => {
            clearInterval(progressTimer);
            clearTimeout(exitTimer);
            clearTimeout(finishTimer);
        };
    }, [onFinish]);

    return (
        <AnimatePresence>
            {!isExiting && (
                <motion.div
                    key="spotlight-splash"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                        opacity: 0,
                        scale: 1.05,
                        filter: "blur(20px)",
                        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
                    }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617] overflow-hidden"
                >
                    {/* The Spotlight (Radial Gradient) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-slate-950/50 to-transparent pointer-events-none"
                    />

                    {/* Logo Container (The Hero) */}
                    <div className="relative z-10 flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
                            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                            transition={{ duration: 1.2, type: "spring", bounce: 0.3 }}
                            className="relative group w-48 mb-8"
                        >
                            {/* The Logo */}
                            <img
                                src={logo}
                                alt="EduNest"
                                crossOrigin="anonymous"
                                className="w-full h-auto object-contain drop-shadow-2xl"
                            />

                            {/* The "Sheen" Effect */}
                            <motion.div
                                className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                initial={{ x: '-150%' }}
                                animate={{ x: '150%' }}
                                transition={{
                                    repeat: Infinity,
                                    repeatDelay: 2.5,
                                    duration: 1.5,
                                    ease: "easeInOut"
                                }}
                            />
                        </motion.div>

                        {/* Minimalist Progress Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="flex flex-col items-center w-64"
                        >
                            {/* Track & Bar */}
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ ease: "linear", duration: 0.1 }}
                                    style={{ boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)' }}
                                />
                            </div>

                            {/* Counter */}
                            <div className="mt-3 flex items-center justify-between w-full">
                                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                                    System Loading
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
