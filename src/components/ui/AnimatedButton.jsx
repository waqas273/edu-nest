import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const AnimatedButton = ({ children, className, variant = 'primary', ...props }) => {
    const variants = {
        primary: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30",
        secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
        ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
        danger: "bg-red-500 text-white shadow-lg shadow-red-500/30"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all relative overflow-hidden group flex items-center justify-center",
                variants[variant],
                className
            )}
            {...props}
        >
            {/* Shine Effect */}
            {variant === 'primary' && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
            )}

            <span className="relative z-10 flex items-center">{children}</span>
        </motion.button>
    );
};

export default AnimatedButton;
