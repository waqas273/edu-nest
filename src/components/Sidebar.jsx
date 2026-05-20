import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Map, MessageSquare, Users, User, LogOut,
    Settings, Shield, BookOpen, ClipboardCheck, Moon, Sun,
    Home, Search, PenTool, Star, Lock, Sparkles, Award, GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { clsx } from 'clsx';
import logo from '../assets/EduNest.png';

// --- FLOATING PARTICLES FOR SIDEBAR ---
const SidebarParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
        {[...Array(8)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${Math.random() * 100}%`,
                }}
                animate={{
                    y: [0, -20, 0],
                    opacity: [0.2, 0.5, 0.2],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                }}
            />
        ))}
    </div>
);

// --- ANIMATED NAV ITEM ---
const NavItem = ({ item, isActive, onClick, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <NavLink
            to={item.path}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative block"
        >
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                whileHover={{ x: 4 }}
                className={clsx(
                    "relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden",
                    isActive
                        ? "text-white font-semibold"
                        : "text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
            >
                {/* Hover Glow Background */}
                <motion.div
                    animate={{
                        opacity: isHovered && !isActive ? 1 : 0,
                        scale: isHovered ? 1 : 0.95
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-white/10 dark:to-white/5 rounded-xl"
                />

                {/* Active Background with Gradient */}
                {isActive && (
                    <motion.div
                        layoutId="activeNavBg"
                        className="absolute inset-0 rounded-xl overflow-hidden"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500" />
                        {/* Shine Effect */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                        />
                    </motion.div>
                )}

                {/* Icon with Animation */}
                <motion.div
                    animate={{
                        scale: isHovered || isActive ? 1.1 : 1,
                        rotate: isHovered ? [0, -5, 5, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                >
                    <item.icon
                        size={20}
                        className={clsx(
                            "transition-all duration-300",
                            isActive
                                ? "text-white drop-shadow-lg"
                                : "text-slate-600 group-hover:text-cyan-500 dark:text-slate-400 dark:group-hover:text-cyan-400"
                        )}
                    />
                </motion.div>

                {/* Label */}
                <span className="relative z-10 text-sm tracking-wide font-medium">
                    {item.label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                    <motion.div
                        layoutId="activeDot"
                        className="absolute right-3 w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50"
                        transition={{ type: "spring", stiffness: 300 }}
                    />
                )}
            </motion.div>
        </NavLink>
    );
};

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
    const { logout, userProfile, currentUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const settingsRef = useRef(null);

    // Mouse tracking for glow effect
    const mouseY = useMotionValue(0);
    const glowY = useSpring(mouseY, { stiffness: 500, damping: 50 });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseY.set(e.clientY - rect.top);
    };

    // Close settings on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Role-based menu items
    const getMenuItems = () => {
        const role = userProfile?.role;

        if (role === 'admin') {
            return [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
                { icon: Users, label: 'Manage Users', path: '/admin/users' },
                { icon: Star, label: 'University Ratings', path: '/admin/university-ratings' },
                { icon: Shield, label: 'Approvals', path: '/admin/approvals' },
                { icon: Award, label: 'Certificates', path: '/admin/certificates' },
                { icon: MessageSquare, label: 'Community', path: '/community' },
            ];
        }

        if (role === 'university_manager') {
            return [
                { icon: LayoutDashboard, label: 'Dashboard', path: '/manager/dashboard' },
                { icon: BookOpen, label: 'Programs', path: '/manager-programs' },
                { icon: Users, label: 'Faculty', path: '/manager-faculty' },
                { icon: Map, label: 'Transport', path: '/manager-transport' },
                { icon: ClipboardCheck, label: 'Admissions', path: '/manager-admissions' },
                { icon: Star, label: 'Ratings', path: '/manager-ratings' },
                { icon: MessageSquare, label: 'Messages', path: '/messages' },
                { icon: Users, label: 'Community', path: '/community' },
            ];
        }

        // Student menu (default)
        return [
            { icon: Home,            label: 'Dashboard',          path: '/student' },
            { icon: Map,             label: 'Roadmaps',           path: '/student/roadmap' },
            { icon: GraduationCap,   label: 'Programs',           path: '/student/programs' },
            { icon: Search,          label: 'Find University',     path: '/student/find-university' },
            { icon: ClipboardCheck,  label: 'Interest Assessment', path: '/student/interest' },
            { icon: PenTool,         label: 'Entry Test',         path: '/student/entry-test' },
            { icon: MessageSquare,   label: 'Messages',           path: '/messages' },
            { icon: Users,           label: 'Community',          path: '/community' },
        ];
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const getProfilePath = () => {
        if (userProfile?.role === 'admin') return '/admin/profile';
        if (userProfile?.role === 'university_manager') return '/manager-profile';
        if (userProfile?.role === 'student') return '/student/profile';
        return '#';
    };

    const getChangePasswordPath = () => {
        if (userProfile?.role === 'admin') return '/admin/change-password';
        if (userProfile?.role === 'university_manager') return '/manager/change-password';
        return '/student/change-password';
    };

    const menuItems = getMenuItems();
    const userRoleDisplay = userProfile?.role === 'university_manager' ? 'Uni Manager' : (userProfile?.role || 'User');

    let userName = userProfile?.fullName || currentUser?.email?.split('@')[0] || 'User';
    if (userProfile?.role === 'admin') {
        userName = 'EduNest Admin';
    } else if (userProfile?.role === 'university_manager') {
        userName = userProfile?.universityName || userName;
    }

    return (
        <>
            {/* Mobile Overlay with Blur */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                onMouseMove={handleMouseMove}
                className={clsx(
                    "fixed top-4 bottom-4 left-4 w-64 z-50 transition-transform duration-500",
                    isMobileOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0"
                )}
            >
                <div className="h-full w-full rounded-3xl flex flex-col overflow-hidden relative">

                    {/* Animated Background */}
                    <div className={clsx(
                        "absolute inset-0 rounded-3xl transition-all duration-500 z-0 overflow-hidden",
                        "bg-white/90 dark:bg-slate-900/95",
                        "border border-slate-200/50 dark:border-white/10",
                        "shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
                    )}>
                        {/* Gradient Orbs */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-cyan-400/30 to-blue-500/20 rounded-full blur-3xl"
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.3, 0.4, 0.3]
                            }}
                            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                            className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-br from-purple-400/30 to-pink-500/20 rounded-full blur-3xl"
                        />

                        {/* Mouse-following Glow */}
                        <motion.div
                            style={{ top: glowY }}
                            className="absolute -left-10 w-20 h-32 bg-gradient-to-r from-cyan-500/20 to-transparent blur-2xl pointer-events-none"
                        />

                        {/* Particles */}
                        <SidebarParticles />

                        {/* Right Border Gradient */}
                        <div className="absolute right-0 top-10 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent" />
                    </div>

                    {/* Content Layer */}
                    <div className="relative z-10 flex flex-col h-full backdrop-blur-sm">

                        {/* Logo Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 flex items-center gap-3"
                        >
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative group cursor-pointer"
                                onClick={() => {
                                    if (userProfile?.role === 'admin') navigate('/admin/dashboard');
                                    else if (userProfile?.role === 'university_manager') navigate('/manager/dashboard');
                                    else if (userProfile?.role === 'student') navigate('/student');
                                    else navigate('/');
                                }}
                            >
                                {/* Glow */}
                                <motion.div
                                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl blur-lg"
                                />
                                {/* Logo Container */}
                                <div className="relative p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                                    <motion.div
                                        animate={{ x: ['-100%', '200%'] }}
                                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                                    />
                                    <img src={logo} alt="EDUNEST" crossOrigin="anonymous" className="w-8 h-8 object-contain relative z-10" />
                                </div>
                            </motion.div>

                            <div>
                                <h1 className="text-xl font-black tracking-tight">
                                    <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                        EduNest
                                    </span>
                                </h1>
                                <div className="flex items-center gap-1">
                                    <Sparkles size={10} className="text-amber-500" />
                                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500">
                                        Pro Platform
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Navigation */}
                        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-hide">
                            {menuItems.map((item, index) => (
                                <NavItem
                                    key={item.path}
                                    item={item}
                                    index={index}
                                    isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                                    onClick={() => setIsMobileOpen(false)}
                                />
                            ))}
                        </nav>

                        {/* Footer (User & Settings) */}
                        <div className="p-4 mt-auto relative z-50">
                            <div className="relative z-50" ref={settingsRef}>
                                {/* Settings Popover */}
                                <AnimatePresence>
                                    {isSettingsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                            className={clsx(
                                                "absolute bottom-full left-0 w-full mb-3 p-2 rounded-2xl shadow-2xl overflow-hidden border z-50",
                                                "bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl",
                                                "border-slate-200 dark:border-white/10"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                {/* Theme Toggle */}
                                                <motion.button
                                                    whileHover={{ x: 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={toggleTheme}
                                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <motion.div
                                                            animate={{ rotate: theme === 'dark' ? 360 : 0 }}
                                                            transition={{ duration: 0.5 }}
                                                        >
                                                            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                                        </motion.div>
                                                        <span>Theme</span>
                                                    </div>
                                                    <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full relative p-0.5">
                                                        <motion.div
                                                            animate={{ x: theme === 'dark' ? 20 : 0 }}
                                                            className="w-4 h-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 shadow-lg"
                                                        />
                                                    </div>
                                                </motion.button>

                                                {/* Edit Profile */}
                                                {(userProfile?.role === 'university_manager' || userProfile?.role === 'student' || userProfile?.role === 'admin') && (
                                                    <motion.button
                                                        whileHover={{ x: 4 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => { navigate(getProfilePath()); setIsSettingsOpen(false); }}
                                                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium"
                                                    >
                                                        <User size={16} /> Update Profile
                                                    </motion.button>
                                                )}

                                                {/* Change Password */}
                                                <motion.button
                                                    whileHover={{ x: 4 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => { navigate(getChangePasswordPath()); setIsSettingsOpen(false); }}
                                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium"
                                                >
                                                    <Lock size={16} /> Change Password
                                                </motion.button>

                                                <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />

                                                {/* Logout */}
                                                <motion.button
                                                    whileHover={{ x: 4, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 transition-all text-sm font-medium"
                                                >
                                                    <LogOut size={16} /> Sign Out
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* User Card / Trigger */}
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={clsx(
                                        "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 group overflow-hidden relative",
                                        isSettingsOpen
                                            ? "bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30"
                                            : "hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                                    )}
                                >
                                    {/* Avatar with Gradient Border */}
                                    <div className="relative">
                                        <motion.div
                                            animate={{ rotate: isSettingsOpen ? 360 : 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500"
                                        >
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={userProfile?.profilePic || userProfile?.photoURL || currentUser?.photoURL || "https://placehold.co/100"}
                                                    alt={userName}
                                                    crossOrigin="anonymous"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = "https://placehold.co/100"; }}
                                                />
                                            </div>
                                        </motion.div>
                                        {/* Online Indicator */}
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{userName}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">{userRoleDisplay}</p>
                                    </div>

                                    <motion.div
                                        animate={{ rotate: isSettingsOpen ? 90 : 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Settings
                                            size={18}
                                            className={clsx(
                                                "transition-colors duration-300",
                                                isSettingsOpen ? "text-cyan-500" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white"
                                            )}
                                        />
                                    </motion.div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
