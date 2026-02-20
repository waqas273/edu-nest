import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

/**
 * Custom Animated Toast Component
 * "Pro Max" style with glassmorphism and smooth animations.
 * 
 * @param {string} message - The text to display
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {function} onClose - Function to clear the toast
 */
const CustomToast = ({ message, type = 'info', onClose }) => {

    // Auto-dismiss safely handles by parent, but we can add a progress bar if we wanted.
    // Here we rely on the parent's setTimeout, but we provide a close button.

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // 5s auto close
        return () => clearTimeout(timer);
    }, [onClose]);

    const variants = {
        hidden: { opacity: 0, y: 50, scale: 0.9 },
        visible: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
    };

    const styles = {
        success: {
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            border: 'border-emerald-500/20 dark:border-emerald-500/30',
            text: 'text-emerald-800 dark:text-emerald-200',
            icon: <CheckCircle className="text-emerald-500" size={24} />
        },
        error: {
            bg: 'bg-red-500/10 dark:bg-red-500/20',
            border: 'border-red-500/20 dark:border-red-500/30',
            text: 'text-red-800 dark:text-red-200',
            icon: <XCircle className="text-red-500" size={24} />
        },
        warning: {
            bg: 'bg-amber-500/10 dark:bg-amber-500/20',
            border: 'border-amber-500/20 dark:border-amber-500/30',
            text: 'text-amber-800 dark:text-amber-200',
            icon: <AlertTriangle className="text-amber-500" size={24} />
        },
        info: {
            bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
            border: 'border-cyan-500/20 dark:border-cyan-500/30',
            text: 'text-cyan-800 dark:text-cyan-200',
            icon: <Info className="text-cyan-500" size={24} />
        }
    };

    const currentStyle = styles[type] || styles.info;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={variants}
                        className={`pointer-events-auto backdrop-blur-xl border shadow-2xl rounded-2xl p-4 min-w-[320px] max-w-md flex items-start gap-3 ${currentStyle.bg} ${currentStyle.border}`}
                        layout
                    >
                        <div className="shrink-0 mt-0.5">
                            {currentStyle.icon}
                        </div>
                        <div className="flex-1 mr-2">
                            <h4 className={`font-bold text-sm ${currentStyle.text} capitalize mb-0.5`}>
                                {type === 'error' ? 'Something went wrong' : type}
                            </h4>
                            <p className={`text-sm ${currentStyle.text} opacity-90 leading-relaxed font-medium`}>
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${currentStyle.text}`}
                        >
                            <X size={16} />
                        </button>

                        {/* Animated Progress Bar (Optional Visual Flair) */}
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className={`absolute bottom-0 left-0 h-1 ${type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-amber-500' : 'bg-cyan-500'} opacity-30 rounded-full rounded-t-none`}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomToast;
