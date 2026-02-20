import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { AlertTriangle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDangerous = false,
    isLoading = false
}) => {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        className="fixed inset-0 z-[60] bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className={cn(
                            "fixed z-[70] w-full max-w-md p-6 rounded-3xl shadow-2xl border",
                            isDark
                                ? "bg-slate-900/90 border-white/10 text-white"
                                : "bg-white/90 border-white/40 text-slate-900"
                        )}
                        style={{
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)"
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className={cn(
                                "p-3 rounded-full flex items-center justify-center shrink-0",
                                isDangerous
                                    ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                    : "bg-cyan-100 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                            )}>
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold">{title}</h3>
                        </div>

                        {/* Content */}
                        <p className={cn(
                            "mb-8 leading-relaxed",
                            isDark ? "text-slate-400" : "text-slate-600"
                        )}>
                            {message}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl font-medium transition-colors",
                                    isDark
                                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl font-medium text-white shadow-lg transition-all active:scale-95 flex items-center gap-2",
                                    isDangerous
                                        ? "bg-gradient-to-r from-red-500 to-pink-600 shadow-red-500/30 hover:shadow-red-500/40"
                                        : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/30 hover:shadow-cyan-500/40",
                                    isLoading && "opacity-70 cursor-wait"
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    confirmText
                                )}
                            </button>
                        </div>

                        {/* Close Button (Top Right) */}
                        {!isLoading && (
                            <button
                                onClick={onClose}
                                className={cn(
                                    "absolute top-4 right-4 p-2 rounded-full transition-colors",
                                    isDark
                                        ? "text-slate-500 hover:text-white hover:bg-white/10"
                                        : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                )}
                            >
                                <X size={20} />
                            </button>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
