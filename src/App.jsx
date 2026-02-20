import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { AnimatePresence } from 'framer-motion';

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layout/MainLayout';
import PublicLayout from './layout/PublicLayout';
import SplashScreen from './components/SplashScreen';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import VerifyEmail from './pages/auth/VerifyEmail';
import ManagerRegistration from './pages/auth/ManagerRegistration';
import PendingApproval from './pages/auth/PendingApproval';
import ResetPassword from './pages/auth/ResetPassword';
import AuthAction from './pages/auth/AuthAction';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';

// Common Components
import ChangePassword from './components/common/ChangePassword';
import GlobalToaster from './components/common/GlobalToaster';

import DashboardWrapper from './pages/DashboardWrapper';
import Universities from './pages/student/Universities';
import UniversityDetails from './pages/student/UniversityDetails';

import Roadmap from './pages/student/Roadmap';
import Messages from './pages/shared/Messages';
import Community from './pages/shared/Community';
import InterestAssessment from './pages/student/InterestAssessment';
import EntryTestPrep from './pages/student/EntryTestPrep';
import MockExam from './pages/student/MockExam';
import TestHistory from './pages/student/TestHistory';
import UserProfile from './pages/student/UserProfile';
import EditProfile from './pages/student/EditProfile';
import PendingRoadmaps from './pages/student/PendingRoadmaps';
import StudentDashboard from './pages/student/StudentDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import Approvals from './pages/admin/Approvals';
import Certificates from './pages/admin/Certificates';
import AdminSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import UniversityRatings from './pages/admin/UniversityRatings';
import ManagerPrograms from './pages/manager/ManagerPrograms';
import ManagerAdmissions from './pages/manager/ManagerAdmissions';
import ManagerProfile from './pages/manager/ManagerProfile';
import ManagerRatings from './pages/manager/ManagerRatings';
import ManagerFaculty from './pages/manager/ManagerFaculty';
import ManagerTransport from './pages/manager/ManagerTransport';
import ChatPage from './pages/ChatPage';

import UniversityOnboarding from './pages/UniversityOnboarding';
import StatusScreen from './components/StatusScreen';

import ManagerRoute from './components/ManagerRoute';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time (splash screen)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalToaster />
        <BrowserRouter>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <SplashScreen key="splash" />
            ) : (
              <div key="app">
                <Routes>
                  {/* 0. Landing Page (Standalone) */}
                  <Route path="/" element={<LandingPage />} />

                  {/* 1. Public Routes (Standalone - No Shared Navbar) */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/action" element={<AuthAction />} />

                  {/* 2. Public Layout Routes (Shared Navbar) */}
                  <Route element={<PublicLayout />}>
                    {/* Add other public pages here if any */}
                  </Route>

                  {/* 2. University Onboarding Flow (Using ManagerRoute) */}
                  <Route path="/university-onboarding" element={
                    <ManagerRoute>
                      <UniversityOnboarding />
                    </ManagerRoute>
                  } />
                  <Route path="/approval-status" element={
                    <ManagerRoute>
                      <StatusScreen />
                    </ManagerRoute>
                  } />

                  {/* 3. Protected Dashboard & Sidebar Routes */}
                  <Route element={<MainLayout />}>
                    {/* Shared Routes */}
                    <Route path="/university/:id" element={<UniversityDetails />} />

                    {/* Student Routes */}
                    <Route path="/student" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <Outlet />
                      </ProtectedRoute>
                    }>
                      <Route index element={<StudentDashboard />} />
                      <Route path="roadmap" element={<Roadmap />} />
                      <Route path="roadmap/:skill" element={<Roadmap />} />
                      <Route path="find-university" element={<Universities />} />

                      <Route path="messages" element={<ChatPage />} />
                      <Route path="messages/:chatId" element={<ChatPage />} />
                      <Route path="profile" element={<UserProfile />} />
                      <Route path="interest" element={<InterestAssessment />} />
                      <Route path="entry-test" element={<EntryTestPrep />} />
                      <Route path="entry-test/:type" element={<MockExam />} />
                      <Route path="history" element={<TestHistory />} />
                      <Route path="profile" element={<UserProfile />} />
                      <Route path="profile/edit" element={<EditProfile />} />
                      <Route path="roadmaps/all" element={<PendingRoadmaps />} />
                      <Route path="change-password" element={<ChangePassword />} />
                    </Route>

                    {/* Manager Dashboard (Using ManagerRoute) */}
                    <Route path="/manager/dashboard" element={
                      <ManagerRoute>
                        <ManagerDashboard />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-programs" element={
                      <ManagerRoute>
                        <ManagerPrograms />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-admissions" element={
                      <ManagerRoute>
                        <ManagerAdmissions />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-profile" element={
                      <ManagerRoute>
                        <ManagerProfile />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-ratings" element={
                      <ManagerRoute>
                        <ManagerRatings />
                      </ManagerRoute>
                    } />
                    <Route path="/manager/change-password" element={
                      <ManagerRoute>
                        <ChangePassword />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-faculty" element={
                      <ManagerRoute>
                        <ManagerFaculty />
                      </ManagerRoute>
                    } />
                    <Route path="/manager-transport" element={
                      <ManagerRoute>
                        <ManagerTransport />
                      </ManagerRoute>
                    } />

                    {/* Chat Routes (Shared) */}
                    <Route path="/chat" element={
                      <ProtectedRoute allowedRoles={['student', 'university_manager']}>
                        <ChatPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/chat/:chatId" element={
                      <ProtectedRoute allowedRoles={['student', 'university_manager']}>
                        <ChatPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/messages" element={
                      <ProtectedRoute allowedRoles={['student', 'university_manager']}>
                        <ChatPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/messages/:chatId" element={
                      <ProtectedRoute allowedRoles={['student', 'university_manager']}>
                        <ChatPage />
                      </ProtectedRoute>
                    } />

                    {/* Admin */}
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />

                    {/* Admin Sub-Pages */}
                    <Route path="/admin/users" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ManageUsers />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/approvals" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Approvals />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/certificates" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Certificates />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/university-ratings" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <UniversityRatings />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/settings" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/profile" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminProfile />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/community" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Community />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/change-password" element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ChangePassword />
                      </ProtectedRoute>
                    } />

                    {/* Unified Community Route */}
                    <Route path="/community" element={
                      <ProtectedRoute allowedRoles={['student', 'university_manager', 'admin']}>
                        <Community />
                      </ProtectedRoute>
                    } />

                    {/* Redirect old dashboard to /student */}
                    <Route path="/dashboard" element={<Navigate to="/student" replace />} />
                  </Route>

                  {/* 4. Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            )}
          </AnimatePresence>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider >
  );
}

export default App;
