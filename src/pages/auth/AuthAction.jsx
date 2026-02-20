import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Firebase Auth Action Handler
 * 
 * This page handles Firebase email action links (password reset, email verification, etc.)
 * Firebase will redirect here with mode and oobCode parameters.
 * 
 * URL format: /auth/action?mode=resetPassword&oobCode=xxx&apiKey=xxx&lang=en
 */
const AuthAction = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        const apiKey = searchParams.get('apiKey');
        const lang = searchParams.get('lang') || 'en';

        // Redirect based on action mode
        switch (mode) {
            case 'resetPassword':
                // Redirect to our custom reset password page with the oobCode
                navigate(`/reset-password?oobCode=${oobCode}&apiKey=${apiKey}&lang=${lang}`, { replace: true });
                break;
            case 'verifyEmail':
                // Handle email verification if needed
                navigate(`/verify-email-action?oobCode=${oobCode}&apiKey=${apiKey}&lang=${lang}`, { replace: true });
                break;
            case 'recoverEmail':
                // Handle email recovery if needed
                navigate(`/recover-email?oobCode=${oobCode}&apiKey=${apiKey}&lang=${lang}`, { replace: true });
                break;
            default:
                // Unknown mode, redirect to home
                console.error('Unknown auth action mode:', mode);
                navigate('/', { replace: true });
        }
    }, [searchParams, navigate]);

    // Show loading while redirecting
    return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#020617]">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Redirecting...</p>
            </div>
        </div>
    );
};

export default AuthAction;
