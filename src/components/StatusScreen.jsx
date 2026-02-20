import { motion } from 'framer-motion';
import { Clock, XCircle, LogOut, MailQuestion } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlassCard from './ui/GlassCard';

const StatusScreen = () => {
    const { userProfile, logout } = useAuth();
    const status = userProfile?.status || 'pending';
    const reason = userProfile?.rejectionReason || 'No specific reason provided.';

    const content = {
        pending: {
            icon: <Clock className="text-orange-400" size={48} />,
            title: "Application Pending",
            message: "Your university partnership application is currently being reviewed by our administration. This process typically takes 1-2 business days.",
            color: "from-orange-500 to-amber-500"
        },
        rejected: {
            icon: <XCircle className="text-red-400" size={48} />,
            title: "Application Rejected",
            message: "We regret to inform you that your application has been rejected at this time.",
            subMessage: `Reason: ${reason}`,
            color: "from-red-500 to-rose-500"
        },
        default: {
            icon: <MailQuestion className="text-slate-400" size={48} />,
            title: "Status Unknown",
            message: "We couldn't determine your current application status. Please contact support.",
            color: "from-slate-500 to-slate-700"
        }
    };

    const display = content[status] || content.default;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <GlassCard className="p-8 text-center border-white/10">
                    <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${display.color} bg-opacity-20 flex items-center justify-center mb-6 shadow-lg shadow-white/5`}>
                        {display.icon}
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-4">{display.title}</h2>
                    <p className="text-slate-400 mb-6 leading-relaxed">
                        {display.message}
                    </p>

                    {display.subMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-8">
                            <p className="text-red-400 text-sm italic">{display.subMessage}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all border border-white/10"
                        >
                            Refresh Status
                        </motion.button>

                        <button
                            onClick={logout}
                            className="flex items-center justify-center w-full space-x-2 text-slate-500 hover:text-white transition-colors py-2"
                        >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </GlassCard>

                <p className="text-center mt-8 text-slate-600 text-sm">
                    EduNest University Management System &copy; 2026
                </p>
            </motion.div>
        </div>
    );
};

export default StatusScreen;
