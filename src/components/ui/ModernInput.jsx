import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const ModernInput = ({
    label,
    type = 'text',
    value,
    onChange,
    icon: Icon,
    className,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;

    return (
        <div className={cn("relative mb-6", className)}>
            <div className={cn(
                "relative flex items-center bg-slate-50 dark:bg-slate-800/50 border rounded-xl transition-all duration-300",
                isFocused ? "border-blue-500 ring-2 ring-blue-500/20 shadow-lg" : "border-slate-200 dark:border-slate-700"
            )}>
                {Icon && (
                    <div className="pl-4 text-slate-400">
                        <Icon size={20} />
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={cn(
                        "w-full bg-transparent border-none focus:ring-0 px-4 py-3.5 pt-5 pb-2 text-slate-900 dark:text-white outline-none z-10",
                        Icon ? "pl-2" : ""
                    )}
                    {...props}
                />

                {/* Floating Label */}
                <motion.label
                    initial={false}
                    animate={{
                        y: isFocused || hasValue ? -12 : 0,
                        scale: isFocused || hasValue ? 0.75 : 1,
                        x: Icon ? 8 : 0
                    }}
                    className={cn(
                        "absolute left-4 text-slate-500 dark:text-slate-400 pointer-events-none origin-left transition-colors",
                        (isFocused || hasValue) && !Icon ? "translate-x-0" : Icon && !isFocused && !hasValue ? "translate-x-6" : ""
                    )}
                >
                    {label}
                </motion.label>
            </div>
        </div>
    );
};

export default ModernInput;
