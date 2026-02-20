import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ManagerRoute = ({ children }) => {
    const { currentUser, userProfile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin h-10 w-10 text-cyan-500" />
            </div>
        );
    }

    // 1. Not Logged In
    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Profile Loading Safety
    if (!userProfile) {
        return <div className="p-10 text-center text-cyan-400">Loading profile...</div>;
    }

    // 3. Role Check
    if (userProfile.role !== 'university_manager') {
        return <Navigate to="/" replace />;
    }

    // 4. Lifecycle Logic
    const onboardingPath = '/university-onboarding';
    const statusPath = '/approval-status';

    // Case 1: Incomplete Profile
    if (!userProfile.profileCompleted) {
        if (location.pathname !== onboardingPath) {
            return <Navigate to={onboardingPath} replace />;
        }
    }
    // Case 2: Pending or Rejected Status
    else if (userProfile.status !== 'approved') {
        if (location.pathname !== statusPath) {
            return <Navigate to={statusPath} replace />;
        }
    }
    // Case 3: Approved (Dashboard Access)
    else {
        // If approved and trying to go back to onboarding/status, send to dashboard
        if (location.pathname === onboardingPath || location.pathname === statusPath) {
            return <Navigate to="/manager/dashboard" replace />;
        }
    }

    return children;
};

export default ManagerRoute;
