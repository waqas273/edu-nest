import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const ChangePassword = () => {
    const { updatePassword, currentUser } = useAuth();
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Validation Requirements
    const requirements = [
        { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
        { id: 'upper', text: 'One uppercase letter', regex: /[A-Z]/ },
        { id: 'lower', text: 'One lowercase letter', regex: /[a-z]/ },
        { id: 'special', text: 'One special character (!@#$%^&*)', regex: /[!@#$%^&*]/ },
        { id: 'number', text: 'One number', regex: /[0-9]/ }
    ];

    const getStrength = (password) => {
        let score = 0;
        requirements.forEach(req => {
            if (req.regex.test(password)) score++;
        });
        return score;
    };

    const strength = getStrength(passwords.new);
    const isValid = strength === requirements.length && passwords.new === passwords.confirm && passwords.current.length > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValid) return;

        setLoading(true);
        try {
            await updatePassword(passwords.new);
            toast.success("Password updated successfully!");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            console.error("Change Password Error:", error);
            if (error.code === 'auth/requires-recent-login') {
                toast.error("Security check failed. Please logout and login again.");
            } else {
                toast.error(error.message || "Failed to update password");
            }
        } finally {
            setLoading(false);
        }
    };

    // Strength Meter Color
    const getStrengthColor = (score) => {
        if (score <= 2) return 'bg-red-500';
        if (score <= 4) return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-white/5 dark:to-transparent p-8 border-b border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 rotate-3">
                            <KeyRound className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security Checkup</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Update your access credentials</p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Current Password Field */}
                        <div className="space-y-2">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type={showPasswords.current ? "text" : "password"}
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                    className="w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                                    placeholder="Current Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* New Password Field */}
                        <div className="space-y-2">
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type={showPasswords.new ? "text" : "password"}
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    onFocus={() => setIsFocused(true)}
                                    className="w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-white"
                                    placeholder="New Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Strength Meter Bar */}
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-full flex-1 transition-all duration-300 ${i < strength ? getStrengthColor(strength) : 'bg-transparent'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Requirements List (Animated) */}
                        <AnimatePresence>
                            {(isFocused || passwords.new.length > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="grid grid-cols-2 gap-2 overflow-hidden"
                                >
                                    {requirements.map((req) => (
                                        <div key={req.id} className="flex items-center gap-2 text-xs">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${req.regex.test(passwords.new) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent'}`}>
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                            <span className={req.regex.test(passwords.new) ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400'}>
                                                {req.text}
                                            </span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Confirm Password Field */}
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type={showPasswords.confirm ? "text" : "password"}
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                className={`w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-950/50 border rounded-xl focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-900 dark:text-white ${passwords.confirm && passwords.new !== passwords.confirm
                                    ? 'border-red-500 focus:border-red-500'
                                    : 'border-slate-200 dark:border-white/10 focus:border-indigo-500'
                                    }`}
                                placeholder="Confirm New Password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {passwords.confirm && passwords.new !== passwords.confirm && (
                            <p className="text-xs text-red-500 flex items-center gap-1 pl-1">
                                <AlertTriangle size={12} /> Passwords do not match
                            </p>
                        )}

                        {/* Submit Action */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading || !isValid}
                            className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all relative overflow-hidden ${isValid
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">Updating...</span>
                            ) : (
                                <>
                                    <ShieldCheck size={20} />
                                    Update Password
                                </>
                            )}
                        </motion.button>

                        <p className="text-xs text-center text-slate-400">
                            Secure your account with a strong, unique password.
                        </p>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ChangePassword;
