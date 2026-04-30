import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        try {
            setError('');
            setLoading(true);

            // Fetch sign-in methods to check if the account exists
            // This prevents the 400 Bad Request console error from sendPasswordResetEmail
            const signInMethods = await fetchSignInMethodsForEmail(auth, email);

            if (signInMethods.length === 0) {
                setError('Account does not exist. Please Register.');
                setLoading(false);
                return;
            }

            // Step 2: User exists, send password reset email with custom action handler URL
            const actionCodeSettings = {
                // This URL will receive the oobCode and redirect to our custom reset page
                url: `${window.location.origin}/auth/action`,
                handleCodeInApp: true,
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setSuccess(true);
        } catch (err) {
            if (err.code !== 'auth/user-not-found') {
                console.error('Password reset error:', err);
            }
            switch (err.code) {
                case 'auth/invalid-email':
                    setError('Please enter a valid email address.');
                    break;
                case 'auth/user-not-found':
                    setError('Account does not exist. Please Register.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many requests. Please try again later.');
                    break;
                default:
                    setError('Failed to send reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Floating Background Elements */}
            <motion.div
                className="absolute top-20 left-20 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl"
                animate={{
                    y: [0, -30, 0],
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            <motion.div
                className="absolute bottom-20 right-20 w-60 h-60 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
                animate={{
                    y: [0, 40, 0],
                    scale: [1, 1.1, 1],
                    rotate: [360, 180, 0]
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass-futuristic rounded-3xl p-8 md:p-10 relative overflow-hidden">
                    {/* Card Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/30"
                            >
                                <Mail className="text-white" size={32} />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-2">Forgot Password?</h1>
                            <p className="text-slate-400">
                                No worries! Enter your email and we'll send you a reset link.
                            </p>
                        </div>

                        {/* Success State */}
                        {success ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <div className="mb-6 p-6 rounded-2xl bg-green-500/10 border border-green-500/30">
                                    <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
                                    <h2 className="text-xl font-bold text-white mb-2">Check Your Email!</h2>
                                    <p className="text-slate-400 text-sm">
                                        Password reset link sent to <span className="text-cyan-400 font-semibold">{email}</span>
                                    </p>
                                    <p className="text-slate-500 text-xs mt-2">
                                        Didn't receive it? Check your spam folder or try again.
                                    </p>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setSuccess(false);
                                        setEmail('');
                                    }}
                                    className="w-full py-3 bg-white/5 border border-white/10 text-slate-300 font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 mb-4"
                                >
                                    Send to Another Email
                                </motion.button>

                                <Link
                                    to="/login"
                                    className="inline-flex items-center text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                                >
                                    <ArrowLeft size={18} className="mr-2" />
                                    Back to Login
                                </Link>
                            </motion.div>
                        ) : (
                            <>
                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center space-x-3"
                                    >
                                        <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </motion.div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email Input */}
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400 group-focus-within:text-cyan-300 transition-colors">
                                                <Mail size={20} />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300"
                                                disabled={loading}
                                            />
                                        </div>
                                    </motion.div>

                                    {/* Submit Button */}
                                    <motion.button
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        whileHover={{ scale: 1.02, boxShadow: "0px 0px 20px rgba(0,240,255,0.5)" }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                                    >
                                        <span className="relative z-10 flex items-center justify-center">
                                            {loading ? 'Sending...' : 'Send Reset Link'}
                                            {!loading && <Send className="ml-2" size={20} />}
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    </motion.button>
                                </form>

                                {/* Footer */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-8 text-center"
                                >
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center text-slate-400 hover:text-cyan-400 font-semibold transition-colors"
                                    >
                                        <ArrowLeft size={18} className="mr-2" />
                                        Back to Login
                                    </Link>
                                </motion.div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
