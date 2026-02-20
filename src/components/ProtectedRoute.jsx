import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { currentUser, userProfile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            </div>
        );
    }

    // 1. Not Logged In
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Profile Loading (should be quick after auth, but safety check)
    if (!userProfile) {
        // If user is logged in but no profile, something is wrong or loading.
        // Might want to redirect to a setup page or show loading.
        return <div className="p-10 text-center">Loading User Profile...</div>;
    }

    // 3. Email Verification Check (Skip for Admin)
    // 3. Email Verification Check (Skip for Admin)
    // FIX: Using userProfile.emailVerified (Firestore) instead of currentUser.emailVerified (Auth)
    // because we use a custom OTP system that updates Firestore only.
    if (userProfile.emailVerified !== true && userProfile.role !== 'admin') {
        const verifyPath = '/verify-email';
        if (location.pathname !== verifyPath) {
            return <Navigate to={verifyPath} replace />;
        }
        return children; // Allow rendering children if already on verify page
    }

    // 4. Role Check
    if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
