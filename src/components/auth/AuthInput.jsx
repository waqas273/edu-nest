import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const AuthInput = ({ label, icon: Icon, type = "text", value, onChange, placeholder, error, showPasswordToggle = false }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Determine the actual input type (handle password visibility)
    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className="relative mb-5 group">
            {/* Label */}
            <label className={clsx(
                "block text-xs font-bold uppercase tracking-wider mb-2 ml-1 transition-colors duration-300",
                error ? "text-red-500" : isFocused ? "text-emerald-500" : "text-slate-500 dark:text-slate-400"
            )}>
                {label}
            </label>

            {/* Input Container */}
            <motion.div
                animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={twMerge(
                    clsx(
                        "relative flex items-center w-full rounded-xl border transition-all duration-300 overflow-hidden bg-clip-padding",
                        // Base Styles
                        "bg-slate-50 dark:bg-slate-900/50",
                        // Border & Ring
                        error
                            ? "border-red-500/50 ring-2 ring-red-500/10"
                            : isFocused
                                ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-[0_4px_20px_rgba(16,185,129,0.1)]"
                                : "border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600"
                    )
                )}
            >
                {/* Icon */}
                <div className={clsx(
                    "pl-4 pr-3 transition-colors duration-300 flex items-center justify-center",
                    error ? "text-red-500" : isFocused ? "text-emerald-500 scale-110" : "text-slate-400"
                )}>
                    <Icon size={20} strokeWidth={2} />
                </div>

                {/* Actual Input */}
                <input
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    className="w-full py-3.5 pr-4 bg-transparent outline-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400/80 tracking-wide"
                />

                {/* Password Toggle */}
                {type === 'password' && showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="pr-4 text-slate-400 hover:text-emerald-500 transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 mt-2 ml-1 select-none overflow-hidden"
                    >
                        <AlertCircle size={12} className="text-red-500 shrink-0" strokeWidth={2.5} />
                        <p className="text-xs font-semibold text-red-500">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuthInput;
