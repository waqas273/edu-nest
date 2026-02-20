import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, Eye, EyeOff, CheckCircle, XCircle,
    AlertCircle, ArrowLeft, ShieldCheck, Sun, Moon
} from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../firebase';
import { useTheme } from '../../context/ThemeContext';
import logo from '../../assets/EduNest.png';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    // Get oobCode from URL (Firebase appends this)
    const oobCode = searchParams.get('oobCode');

    const [passwords, setPasswords] = useState({ new: '', confirm: '' });
    const [showPassword, setShowPassword] = useState({ new: false, confirm: false });
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Password Requirements (matching ChangePassword.jsx)
    const requirements = [
        { label: 'At least 8 characters', test: (p) => p.length >= 8 },
        { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
        { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
        { label: 'One number', test: (p) => /\d/.test(p) },
        { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) }
    ];

    const strength = requirements.filter(req => req.test(passwords.new)).length;
    const isValid = strength === requirements.length && passwords.new === passwords.confirm && passwords.confirm.length > 0;

    // Verify the oobCode on mount
    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError('Invalid password reset link. Please request a new one.');
                setVerifying(false);
                return;
            }

            try {
                // Verify the code is valid and get associated email
                const email = await verifyPasswordResetCode(auth, oobCode);
                setUserEmail(email);
                setVerifying(false);
            } catch (err) {
                console.error('Code verification error:', err);
                if (err.code === 'auth/expired-action-code') {
                    setError('This password reset link has expired. Please request a new one.');
                } else if (err.code === 'auth/invalid-action-code') {
                    setError('This password reset link is invalid or has already been used.');
                } else {
                    setError('Failed to verify reset link. Please try again.');
                }
                setVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) return;

        setLoading(true);
        setError('');

        try {
            await confirmPasswordReset(auth, oobCode, passwords.new);
            setSuccess(true);
        } catch (err) {
            console.error('Password reset error:', err);
            if (err.code === 'auth/expired-action-code') {
                setError('This reset link has expired. Please request a new password reset.');
            } else if (err.code === 'auth/invalid-action-code') {
                setError('This reset link is invalid or has already been used.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please choose a stronger password.');
            } else {
                setError('Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Loading/Verifying State
    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Verifying reset link...</p>
                </motion.div>
            </div>
        );
    }

    // Success State
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#020617]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                            <CheckCircle className="text-white" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Reset!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Your password has been successfully updated. You can now log in with your new password.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all"
                        >
                            Go to Login
                            <ArrowLeft size={20} className="ml-2 rotate-180" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Error State (invalid/expired link)
    if (error && !userEmail) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#020617]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
                            <AlertCircle className="text-white" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Link Invalid</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
                        >
                            Request New Link
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full mt-4 py-3 text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                        >
                            <ArrowLeft size={18} className="mr-2" />
                            Back to Login
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Main Reset Form
    return (
        <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-[#020617] transition-colors duration-500 relative">
            {/* Navbar */}
            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                    <img src={logo} alt="EduNest" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:block opacity-90 group-hover:opacity-100 transition-opacity">EduNest</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </nav>

            {/* Left Visual Section */}
            <div className="hidden lg:flex w-[45%] bg-slate-950 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0f1e] to-slate-900" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5 }}
                    className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-[120px]"
                />
                <div className="relative z-10 px-12 text-center max-w-lg">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
                            <ShieldCheck className="text-white" size={48} />
                        </div>
                        <h2 className="text-5xl font-extrabold text-white mb-8 leading-tight tracking-tight">
                            Reset Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Password</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed font-light">Create a strong, secure password to protect your account.</p>
                    </motion.div>
                </div>
            </div>

            {/* Right Form Section */}
            <div className="w-full lg:w-[55%] relative flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-[420px] pt-16 sm:pt-0">
                    <div className="text-center mb-8">
                        <motion.h1 layoutId="auth-title" className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                            Create New Password
                        </motion.h1>
                        <motion.p layoutId="auth-subtitle" className="text-slate-500 dark:text-slate-400">
                            for <span className="text-emerald-500 font-medium">{userEmail}</span>
                        </motion.p>
                    </div>

                    {/* Error Alert */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mb-6 rounded-xl p-4 flex items-start gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
                            >
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* New Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword.new ? 'text' : 'password'}
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                    placeholder="Enter new password"
                                    className="w-full pl-12 pr-12 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Password Strength Indicator */}
                        {passwords.new && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-3"
                            >
                                {/* Strength Bar */}
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-all ${i < strength
                                                    ? strength <= 2
                                                        ? 'bg-red-500'
                                                        : strength <= 4
                                                            ? 'bg-yellow-500'
                                                            : 'bg-emerald-500'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Requirements List */}
                                <div className="grid grid-cols-1 gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                                    {requirements.map((req, i) => {
                                        const passed = req.test(passwords.new);
                                        return (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                {passed ? (
                                                    <CheckCircle size={16} className="text-emerald-500" />
                                                ) : (
                                                    <XCircle size={16} className="text-slate-400" />
                                                )}
                                                <span className={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                                                    {req.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword.confirm ? 'text' : 'password'}
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                    placeholder="Confirm new password"
                                    className="w-full pl-12 pr-12 py-3.5 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {/* Password Match Indicator */}
                            {passwords.confirm && (
                                <p className={`mt-2 text-sm flex items-center gap-1 ${passwords.new === passwords.confirm
                                        ? 'text-emerald-500'
                                        : 'text-red-500'
                                    }`}>
                                    {passwords.new === passwords.confirm ? (
                                        <><CheckCircle size={14} /> Passwords match</>
                                    ) : (
                                        <><XCircle size={14} /> Passwords do not match</>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={loading || !isValid}
                            whileHover={{ scale: isValid ? 1.02 : 1 }}
                            whileTap={{ scale: isValid ? 0.98 : 1 }}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                <>
                                    Reset Password
                                    <ShieldCheck size={20} />
                                </>
                            )}
                        </motion.button>

                        {/* Back to Login */}
                        <div className="text-center pt-4">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                            >
                                <ArrowLeft size={18} className="mr-2" />
                                Back to Login
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
