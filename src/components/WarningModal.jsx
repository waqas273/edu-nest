import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Send, Loader2 } from 'lucide-react';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sendWarningEmail } from '../utils/emailService';
import toast from 'react-hot-toast';

const WarningModal = ({ isOpen, onClose, user }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendWarning = async (e) => {
        e.preventDefault();
        if (!message.trim() || !user) return;

        setLoading(true);
        try {
            // 1. Send Email
            // Note: We don't block on email failure, but we try it first.
            const newWarningCount = (user.warningCount || 0) + 1;

            const emailSent = await sendWarningEmail({
                to_name: user.fullName || user.displayName || 'User',
                to_email: user.email,
                warning_message: message,
                warning_count: newWarningCount
            });

            if (!emailSent) {
                toast.error("Could not send email notification (check console), but will log warning.");
            }

            // 2. Log to Firestore 'warnings' collection
            await addDoc(collection(db, 'warnings'), {
                userId: user.id,
                userEmail: user.email,
                message: message,
                sentAt: serverTimestamp(),
                sentBy: 'Admin' // In future could be current admin ID
            });

            // 3. Increment User's Warning Count
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                warningCount: increment(1)
            });

            toast.success("Warning sent and logged successfully");
            setMessage('');
            onClose();

        } catch (error) {
            console.error("Error sending warning:", error);
            toast.error("Failed to process warning");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900/30 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 flex items-center justify-between border-b border-red-100 dark:border-red-900/30">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <AlertTriangle size={20} className="fill-red-100 dark:fill-red-900/20" />
                                <h3 className="font-bold text-lg">Send Warning</h3>
                            </div>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold text-slate-900 dark:text-white">User:</span> {user?.fullName} ({user?.email})
                            </div>

                            <form onSubmit={handleSendWarning} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                                        Warning Message
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Explain the reason for this warning..."
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-900 dark:text-white text-sm"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || !message.trim()}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        Send Warning
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WarningModal;
