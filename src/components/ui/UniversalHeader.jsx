import { motion } from 'framer-motion';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const UniversalHeader = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const isLandingPage = location.pathname === '/';

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Back Button */}
                {!isLandingPage && (
                    <motion.button
                        whileHover={{ scale: 1.05, x: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(-1)}
                        className="glass-futuristic px-4 py-2 rounded-xl flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back</span>
                    </motion.button>
                )}

                {isLandingPage && <div />}

                {/* Theme Toggle */}
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleTheme}
                    className="glass-futuristic p-3 rounded-full text-cyan-400 hover:text-cyan-300 transition-colors relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </motion.button>
            </div>
        </motion.header>
    );
};

export default UniversalHeader;
