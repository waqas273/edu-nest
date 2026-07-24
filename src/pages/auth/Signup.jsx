import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, GraduationCap, Building, ChevronRight, CheckCircle, ShieldCheck } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { db, auth } from '../../firebase';
import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

// EmailJS Config
const EMAILJS_SERVICE_ID = 'service_dzmanwf';
const OTP_TEMPLATE_ID = 'template_a9wwo09';
const EMAILJS_PUBLIC_KEY = 'iEulg0kduLfrsPIKg';

const Signup = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('student');
    const [emailError, setEmailError] = useState('');
    const [nameError, setNameError] = useState('');
    const [passwordCriteria, setPasswordCriteria] = useState({
        length: false,
        upper: false,
        lower: false,
        symbol: false
    });

    const navigate = useNavigate();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const handleNameChange = (e) => {
        const val = e.target.value;
        if (/^[a-zA-Z\s]*$/.test(val)) {
            setFullName(val);
            setNameError('');
        } else {
            setNameError('Only alphabets are allowed.');
        }
    };

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        setPasswordCriteria({
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            lower: /[a-z]/.test(val),
            symbol: /[!@#$%^&*]/.test(val)
        });
    };

    const handleEmailChange = (e) => {
        const val = e.target.value;
        setEmail(val);
        if (val && !emailRegex.test(val)) setEmailError("Invalid email format.");
        else setEmailError("");
    };

    const sendOtp = async () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const templateParams = { to_name: fullName, to_email: email, otp: code };

        try {
            await emailjs.send(EMAILJS_SERVICE_ID, OTP_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
            return code;
        } catch (error) {
            console.error('EmailJS Error Details:', error);
            if (error?.status === 412 || error?.text?.includes('412')) {
                throw new Error('EmailJS Service Error (412): Please check EmailJS Domain Whitelist or Re-connect Gmail Service.');
            }
            throw new Error('Failed to dispatch verification code. Please check EmailJS service.');
        }
    };

    const handleResult = async (e) => {
        e.preventDefault();

        // 1. Validation
        if (!email || !password || !fullName) {
            toast.error("All fields are mandatory.");
            return;
        }
        if (emailError || !emailRegex.test(email)) {
            toast.error("Invalid email address.");
            return;
        }

        if (!/^[a-zA-Z\s]+$/.test(fullName)) {
            toast.error("Invalid Name: Only alphabets are allowed.");
            return;
        }

        // Strong Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
        if (!passwordRegex.test(password)) {
            toast.error(
                <div>
                    <strong>Weak Password Security</strong>
                    <div className="text-xs mt-1 opacity-90">
                        • Min 8 characters<br />
                        • At least 1 Uppercase<br />
                        • At least 1 Lowercase<br />
                        • At least 1 Symbol (!@#$)
                    </div>
                </div>,
                { duration: 5000 }
            );
            return;
        }

        const loader = toast.loading("Checking system availability...");
        setLoading(true);

        try {
            // 2. Auth Check (This confirms if the email is already registered without querying protected Firestore)
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (methods.length > 0) {
                toast.error("Account already exists. Please login.", { id: loader });
                return;
            }

            // 4. Send OTP
            toast.loading("Dispatching secure verification code...", { id: loader });
            const code = await sendOtp();

            toast.success("Verification code dispatched!", { id: loader });

            setTimeout(() => {
                navigate('/verify-email', {
                    state: { email, password, fullName, role, generatedOtp: code }
                });
            }, 1000);

        } catch (err) {
            console.error("Signup Error:", err);
            toast.error(err.message, { id: loader });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Initialize Account"
            subtitle="Join the next generation of learners"
        >
            <form onSubmit={handleResult} className="mt-4">

                {/* Role Selection */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {[{ id: 'student', icon: GraduationCap, label: 'Student' }, { id: 'university_manager', icon: Building, label: 'Manager' }].map((r) => (
                        <div
                            key={r.id}
                            onClick={() => setRole(r.id)}
                            className={clsx(
                                "cursor-pointer border rounded-2xl p-4 flex flex-col items-center gap-2 transition-all duration-300 relative overflow-hidden group",
                                role === r.id
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
                            )}
                        >
                            <r.icon size={26} className={clsx("transition-transform duration-500", role === r.id ? "scale-110" : "group-hover:scale-105 opacity-70")} />
                            <span className="text-xs font-bold uppercase tracking-widest">{r.label}</span>

                            {role === r.id && (
                                <motion.div layoutId="role-check" className="absolute top-3 right-3 text-emerald-500">
                                    <CheckCircle size={16} className="fill-emerald-500/20" />
                                </motion.div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-1">
                    <AuthInput
                        label="Full Name"
                        icon={User}
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={handleNameChange}
                        error={nameError}
                    />

                    <AuthInput
                        label="Email Address"
                        icon={Mail}
                        type="email"
                        placeholder="name@edunest.com"
                        value={email}
                        onChange={handleEmailChange}
                        error={emailError}
                    />



                    <AuthInput
                        label="Password"
                        icon={Lock}
                        type="password"
                        placeholder="Create a strong password"
                        value={password}
                        onChange={handlePasswordChange}
                        showPasswordToggle
                    />

                    {/* Real-time Password Checklist */}
                    <div className="grid grid-cols-2 gap-2 mt-3 px-1">
                        {[
                            { label: '8+ Characters', valid: passwordCriteria.length },
                            { label: 'Uppercase Letter', valid: passwordCriteria.upper },
                            { label: 'Lowercase Letter', valid: passwordCriteria.lower },
                            { label: 'Special Symbol', valid: passwordCriteria.symbol },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className={clsx(
                                    "w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300",
                                    item.valid ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                                )}>
                                    {item.valid ? <CheckCircle size={10} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400/50" />}
                                </div>
                                <span className={clsx(
                                    "text-[11px] font-medium transition-colors duration-300",
                                    item.valid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                                )}>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-start gap-2 mt-4 px-1">
                    <ShieldCheck size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">
                        By registering, you agree to our Terms of Service. Your data is protected by industry-standard encryption.
                    </p>
                </div>

                <AuthButton type="submit" loading={loading} className="group">
                    <span className="flex items-center gap-2">
                        Initialize Account
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </AuthButton>

                <div className="mt-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
                    <span className="relative z-10 bg-white/50 dark:bg-slate-900/50 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest backdrop-blur-sm">Account Status</span>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Already have access?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors underline underline-offset-4 decoration-emerald-500/20 hover:decoration-emerald-500"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Signup;
