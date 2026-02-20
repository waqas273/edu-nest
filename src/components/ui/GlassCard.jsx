import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const GlassCard = ({ children, className, hoverEffect = true, ...props }) => {
    return (
        <motion.div
            whileHover={hoverEffect ? { y: -5, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" } : {}}
            transition={{ type: "spring", stiffness: 300 }}
            className={cn(
                "glass-card-neon p-6 rounded-2xl relative overflow-hidden",
                className
            )}
            {...props}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default GlassCard;
