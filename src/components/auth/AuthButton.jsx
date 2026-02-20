import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const AuthButton = ({
    children,
    onClick,
    type = "button",
    disabled = false,
    loading = false,
    className
}) => {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={twMerge(
                clsx(
                    "relative w-full py-4 mt-6 overflow-hidden rounded-xl font-bold text-white shadow-lg transition-all",
                    "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600",
                    "shadow-emerald-500/25 dark:shadow-emerald-500/10",
                    "disabled:opacity-70 disabled:grayscale disabled:cursor-not-allowed",
                    className
                )
            )}
        >
            {/* Shine Effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Processing...</span>
                    </>
                ) : (
                    children
                )}
            </div>
        </motion.button>
    );
};

export default AuthButton;
