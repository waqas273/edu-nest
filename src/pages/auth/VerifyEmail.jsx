import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle, ShieldX,
    ArrowLeft, CheckCircle,
    Sun, Moon, Edit, Timer
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import emailjs from '@emailjs/browser';
import logo from '../../assets/EduNest.png';
import toast from 'react-hot-toast';

// --- CONFIGURATION ---
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_dzmanwf';
const OTP_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID || 'template_a9wwo09';
const WELCOME_TEMPLATE_ID = 'template_welcome'; // Placeholder for Welcome Email
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'iEulg0kduLfrsPIKg';

// --- SHARED PIN INPUT ---
const PinInput = ({ length = 6, onComplete, value }) => {
    const inputRef = useRef([]);
    const [pins, setPins] = useState(new Array(length).fill(''));

    useEffect(() => {
        if (!value) setPins(new Array(length).fill(''));
    }, [value, length]);

    const handleLocalChange = (e, index) => {
        const val = e.target.value;
        if (isNaN(val)) return;

        const newPins = [...pins];
        newPins[index] = val.substring(val.length - 1);
        setPins(newPins);

        const combined = newPins.join('');
        onComplete(combined);

        if (val && index < length - 1 && inputRef.current[index + 1]) {
            inputRef.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !pins[index] && index > 0 && inputRef.current[index - 1]) {
            inputRef.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').split('').filter(char => !isNaN(char)).slice(0, length);
        if (data.length > 0) {
            const newPins = [...pins];
            data.forEach((char, i) => { newPins[i] = char; });
            setPins(newPins);
            const combined = newPins.join('');
            onComplete(combined);
            const lastIndex = Math.min(data.length, length - 1);
            if (inputRef.current[lastIndex]) inputRef.current[lastIndex].focus();
        }
    };

    return (
        <div className="flex justify-between gap-1 sm:gap-2">
            {pins.map((pin, index) => (
                <input
                    key={index}
                    ref={el => inputRef.current[index] = el}
                    type="text"
                    value={pin}
                    onChange={(e) => handleLocalChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    className="w-10 h-12 sm:w-12 sm:h-14 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-center text-xl font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                />
            ))}
        </div>
    );
};

const VerifyEmail = () => {
    const [loading, setLoading] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [globalError, setGlobalError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [timer, setTimer] = useState(30);

    const { signup } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    // Data passed from Signup
    const { email, password, role, fullName, generatedOtp: initialOtp } = location.state || {};
    // Store current valid OTP locally (handles resend scenarios)
    const [currentValidOtp, setCurrentValidOtp] = useState(initialOtp);

    // Redirect if no data
    useEffect(() => {
        if (!email || !currentValidOtp) {
            navigate('/signup');
        }
    }, [email, currentValidOtp, navigate]);

    // Timer Logic
    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleResend = async () => {
        setGlobalError('');
        setSuccessMsg('');
        setLoading(true);

        // Generate NEW OTP
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        // console.log("New OTP (Safety):", newCode); // Keep or remove
        setCurrentValidOtp(newCode);

        const templateParams = {
            to_name: fullName,
            to_email: email,
            otp: newCode,
        };

        try {
            await emailjs.send(EMAILJS_SERVICE_ID, OTP_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            setSuccessMsg(`New verification code sent to ${email}`);
            toast.success(`New verification code sent to ${email}`);
            setTimer(30);
        } catch (error) {
            console.error('EmailJS Error:', error);
            setGlobalError('Failed to send email. Please check your connection.');
            toast.error('Failed to send email.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setGlobalError('');

        if (otpCode.length !== 6) {
            toast.error('Please enter the full 6-digit code.');
            return setGlobalError('Please enter the full 6-digit code.');
        }

        // VERIFY OTP Logic
        if (otpCode !== currentValidOtp) {
            toast.error('Invalid verification code. Please try again.');
            return setGlobalError('Invalid verification code. Please try again.');
        }

        const loader = toast.loading("Verifying code & completing signup...");
        setLoading(true);
        try {
            // Create Firebase Account (Auth + Firestore)
            // Function returns the 'user' object (contains uid)
            const user = await signup(email, password, role, fullName);

            // FIX: Immediately update Firestore to verify email
            // Use user.uid because AuthContext creates docs using UID, not Email.
            if (user && user.uid) {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, { emailVerified: true });
            }

            // Welcome Email disabled as the template ('template_welcome') does not exist yet.
            // Leaving it out prevents the HTTP 400 Bad request.

            toast.success("Account verified successfully! Please sign in.", { id: loader });

            // Hard redirect to clear React state and ensure login page renders cleanly
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);

        } catch (err) {
            console.error('Registration Error:', err);
            let msg = err.message || 'An unexpected error occurred during signup.';

            if (err.code === 'auth/email-already-in-use') {
                // In cases where the Auth object was created successfully but network failed midway 
                // through the Firestore object creation on a previous attempt.
                msg = 'This email is already registered. Please navigate to the Login page.';
                toast.error(msg, { id: loader });
                navigate('/login');
                return;
            }
            setGlobalError(msg);
            toast.error(msg, { id: loader });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-[#020617] transition-colors duration-500 relative">

            <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
                <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                    <img src={logo} alt="EduNest" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-lg text-slate-900 dark:text-white hidden sm:block opacity-90 group-hover:opacity-100 transition-opacity">EduNest</span>
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
                        {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                        Back to Home <ArrowLeft size={16} className="rotate-180" />
                    </button>
                </div>
            </nav>

            {/* Left Section (Visual) */}
            <div className="hidden lg:flex w-[45%] bg-slate-950 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0f1e] to-slate-900" />
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }} className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-transparent blur-[120px]" />
                <div className="relative z-10 px-12 text-center max-w-lg">
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
                        <h2 className="text-5xl font-extrabold text-white mb-8 leading-tight tracking-tight">Verify Your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Identity</span></h2>
                        <p className="text-slate-400 text-lg leading-relaxed font-light">Secure your account to access EduNest features.</p>
                    </motion.div>
                </div>
            </div>

            {/* Right Section (Form) */}
            <div className="w-full lg:w-[55%] relative flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-[420px] pt-16 sm:pt-0">

                    <div className="text-center mb-8">
                        <motion.h1 layoutId="auth-title" className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Check Your Email</motion.h1>
                        <motion.p layoutId="auth-subtitle" className="text-slate-500 dark:text-slate-400">Enter the verification code to complete signup</motion.p>
                    </div>

                    <AnimatePresence>
                        {globalError && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 rounded-xl p-4 flex items-start gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400">
                                <ShieldX size={20} className="shrink-0" />
                                <p className="text-sm font-medium leading-tight pt-0.5">{globalError}</p>
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 rounded-xl p-4 flex items-start gap-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle size={20} className="shrink-0" />
                                <p className="text-sm font-medium leading-tight pt-0.5">{successMsg}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-6">
                        <div className="text-center bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">We've sent a 6-digit code to:</p>
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <span className="text-slate-900 dark:text-white font-bold">{email}</span>
                                <button onClick={() => navigate('/signup')} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"><Edit size={14} /></button>
                            </div>
                        </div>

                        <div className="flex justify-center py-4">
                            <PinInput length={6} onComplete={setOtpCode} value={otpCode} />
                        </div>

                        <div className="flex justify-between items-center text-sm px-1">
                            <button type="button" onClick={() => navigate('/signup')} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Go Back</button>
                            <div className="flex items-center gap-2 text-slate-500">
                                <Timer size={14} />
                                {timer > 0 ? <span>Resend in {formatTime(timer)}</span> : <button onClick={handleResend} className="text-emerald-500 font-bold hover:underline">Resend Code</button>}
                            </div>
                        </div>

                        <motion.button
                            onClick={handleVerify}
                            disabled={loading || otpCode.length < 6}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? 'Verifying...' : 'Verify & Complete'}
                                {!loading && <CheckCircle size={20} />}
                            </span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
