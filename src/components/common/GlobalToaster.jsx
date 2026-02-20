import { Toaster } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

const GlobalToaster = () => {
    const { isDark } = useTheme();

    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                // Default options
                duration: 4000,
                style: {
                    background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.05)',
                    padding: '16px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    maxWidth: '400px',
                    boxShadow: isDark
                        ? '0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.1)'
                        : '0 10px 40px -10px rgba(148, 163, 184, 0.3)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                },

                // Specific types
                success: {
                    iconTheme: {
                        primary: '#10b981', // emerald-500
                        secondary: isDark ? '#020617' : '#fff',
                    },
                    style: {
                        border: isDark ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)',
                    }
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444', // red-500
                        secondary: isDark ? '#020617' : '#fff',
                    },
                    style: {
                        border: isDark ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    }
                },
                loading: {
                    iconTheme: {
                        primary: '#06b6d4', // cyan-500
                        secondary: isDark ? '#020617' : '#fff',
                    },
                    style: {
                        border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(6, 182, 212, 0.2)',
                    }
                },
            }}
        />
    );
};

export default GlobalToaster;
