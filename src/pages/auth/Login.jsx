import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import toast from 'react-hot-toast';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthInput from '../../components/auth/AuthInput';
import AuthButton from '../../components/auth/AuthButton';
import { motion } from 'framer-motion';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error("Please provide both email and password.");
            return;
        }

        const loader = toast.loading("Authenticating secure credentials...", {
            style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
        setLoading(true);

        try {
            // 1. Sign in via Firebase Auth
            const userCredential = await login(email, password);
            const user = userCredential.user;

            // 2. Firestore Fetch with Auto-Cleanup Logic
            try {
                const uidRef = doc(db, 'users', user.uid);
                const uidDoc = await getDoc(uidRef);

                if (uidDoc.exists()) {
                    const firestoreData = uidDoc.data();

                    // 5. Verify Email Status
                    if (firestoreData.emailVerified !== true) {
                        await signOut(auth);
                        toast.error("Email verification pending. Please check your inbox.", { id: loader });
                        return;
                    }

                    // 6. Security Check (Banned Status)
                    const bannedRef = collection(db, 'banned_users');
                    const bannedQuery = query(bannedRef, where('email', '==', email.toLowerCase()));
                    const bannedSnapshot = await getDocs(bannedQuery);

                    if (!bannedSnapshot.empty || firestoreData.status === 'banned') {
                        await signOut(auth);
                        toast.error("Access Denied: This account has been permanently banned.", { id: loader });
                        return;
                    }

                    // 7. Role Redirect
                    const userRole = firestoreData.role || 'student';
                    toast.success(`Welcome back, ${firestoreData.fullName || 'User'}!`, { id: loader });

                    setTimeout(() => {
                        if (userRole === 'admin') window.location.href = '/admin/dashboard';
                        else if (userRole === 'university_manager') window.location.href = '/manager/dashboard';
                        else if (userRole === 'student') window.location.href = '/student';
                        else window.location.href = '/';
                    }, 800);

                } else {
                    // --- SCENARIO B: Deleted User (Auto-Cleanup) ---
                    console.warn("⚠️ Profile MISSING. Auto-Cleaning...");
                    try {
                        await deleteUser(user);
                    } catch (cleanupErr) {
                        console.error("Cleanup Error (likely requires re-auth):", cleanupErr);
                        // If delete fails (requires-recent-login), we force signout anyway
                        await signOut(auth);
                    }

                    toast.error("Account identity missing. Redirecting to registration...", { id: loader });
                    setTimeout(() => navigate('/signup'), 1500);
                }

            } catch (firestoreErr) {
                console.error("Firestore Error:", firestoreErr);
                await signOut(auth);
                toast.error("Security handshake failed. Please check your connection.", { id: loader });
            }

        } catch (err) {
            console.error("Login Error:", err);
            let msg = "Invalid credentials.";
            if (err.code === 'auth/too-many-requests') {
                msg = "Too many attempts. Account locally locked for security.";
            }
            toast.error(msg, { id: loader });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="System Login"
            subtitle="Authenticate to access your dashboard"
        >
            <form onSubmit={handleLogin} className="mt-6">
                <AuthInput
                    label="Email Identity"
                    icon={Mail}
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <AuthInput
                    label="Security Key"
                    icon={Lock}
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    showPasswordToggle
                />

                <div className="flex justify-end pt-1 mb-2">
                    <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                    >
                        Forgot Credentials?
                    </button>
                </div>

                <AuthButton type="submit" loading={loading} className="group">
                    <span className="flex items-center gap-2">
                        Sign In to Dashboard
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </AuthButton>

                <div className="mt-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-white/10"></div></div>
                    <span className="relative z-10 bg-white/50 dark:bg-slate-900/50 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest backdrop-blur-sm">System Access</span>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        New to the platform?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="font-bold text-emerald-500 hover:text-emerald-400 transition-colors underline underline-offset-4 decoration-emerald-500/20 hover:decoration-emerald-500"
                        >
                            Initialize Registration
                        </button>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;
