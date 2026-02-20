import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Clock, LogOut } from 'lucide-react';

const PendingApproval = () => {
    const { logout } = useAuth();
    return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 dark:bg-slate-900 px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center"
            >
                <div className="mb-6 flex justify-center">
                    <div className="h-24 w-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 animate-pulse">
                        <Clock size={48} />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Approval Pending</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8">
                    Your university registration has been submitted and is currently being reviewed by our Admin team. This process usually takes 24-48 hours.
                </p>

                <button
                    onClick={logout}
                    className="flex items-center justify-center w-full py-3 px-6 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                >
                    <LogOut size={18} className="mr-2" />
                    Sign Out
                </button>
            </motion.div>
        </div>
    );
};

export default PendingApproval;
