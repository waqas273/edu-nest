import { useAuth } from '../context/AuthContext';
import StudentDashboard from './student/StudentDashboard';
import AdminDashboard from './admin/AdminDashboard';
import ManagerDashboard from './manager/ManagerDashboard';

const DashboardWrapper = () => {
    const { userProfile } = useAuth();

    if (!userProfile) return null; // Or generic loading

    switch (userProfile.role) {
        case 'admin':
            return <AdminDashboard />;
        case 'university_manager':
            return <ManagerDashboard />;
        case 'student':
        default:
            return <StudentDashboard />;
    }
};

export default DashboardWrapper;
