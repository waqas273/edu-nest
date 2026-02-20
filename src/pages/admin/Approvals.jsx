import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, Clock, Eye, AlertCircle, Send } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/ui/GlassCard';
import { sendApplicationStatusEmail } from '../../utils/emailService';

const Approvals = () => {
    const [pendingManagers, setPendingManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedManager, setSelectedManager] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const fetchPendingApprovals = async () => {
        try {
            const usersRef = collection(db, 'users');
            const pendingQuery = query(
                usersRef,
                where('role', '==', 'university_manager'),
                where('status', '==', 'pending')
            );
            const snapshot = await getDocs(pendingQuery);
            const pending = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPendingManagers(pending);
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    const [successMessage, setSuccessMessage] = useState('');

    const handleApprove = async (manager) => {
        setActionLoading(true);
        try {
            // 1. Update Firestore First
            await updateDoc(doc(db, 'users', manager.id), {
                status: 'approved',
                isApproved: true
            });

            // 2. Immediately update local state
            setPendingManagers(prev => prev.filter(m => m.id !== manager.id));
            setSelectedManager(null);

            // 3. Handle Email in a separate nested block
            try {
                console.log('Attempting to send approval email to:', manager.email);
                await sendApplicationStatusEmail({
                    to_name: manager.fullName || 'Manager',
                    to_email: manager.email,
                    status: 'Approved'
                });
                setSuccessMessage(`University "${manager.universityName}" approved & notification email sent.`);
            } catch (emailErr) {
                console.error("Email delivery failed:", emailErr);
                setSuccessMessage(`University approved, but notification email failed to send.`);
            }

            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error approving manager:', error);
            alert('Critical: Failed to update database. Please check your connection.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (manager) => {
        if (!rejectionReason) {
            alert('Please provide a reason for rejection.');
            return;
        }

        setActionLoading(true);
        try {
            // 1. Update Firestore First
            await updateDoc(doc(db, 'users', manager.id), {
                status: 'rejected',
                rejectionReason: rejectionReason,
                isApproved: false
            });

            // 2. Immediately update local state
            setPendingManagers(prev => prev.filter(m => m.id !== manager.id));
            setSelectedManager(null);
            setRejectionReason('');

            // 3. Handle Email in a separate nested block
            try {
                console.log('Attempting to send rejection email to:', manager.email);
                await sendApplicationStatusEmail({
                    to_name: manager.fullName || 'Manager',
                    to_email: manager.email,
                    status: 'Rejected',
                    reason: rejectionReason
                });
                setSuccessMessage(`Application rejected & notification email sent.`);
            } catch (emailErr) {
                console.error("Email delivery failed:", emailErr);
                setSuccessMessage(`Application rejected, but notification email failed to send.`);
            }

            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error rejecting manager:', error);
            alert('Critical: Failed to update database. Please check your connection.');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto relative">
            {/* Success Message Alert */}
            <AnimatePresence>
                {successMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-green-500/90 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-md border border-green-400/20"
                    >
                        <Check size={20} />
                        <span className="font-semibold">{successMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10"
            >
                <div className="flex items-center space-x-4 mb-3">
                    <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                        <Shield className="text-orange-500 dark:text-orange-400" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">University Approvals</h1>
                        <p className="text-slate-600 dark:text-slate-400">Review and moderate university partnership applications</p>
                    </div>
                </div>
            </motion.div>

            {/* Content Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List Column */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 px-2 flex items-center">
                        <Clock size={18} className="mr-2 text-orange-500 dark:text-orange-400" />
                        Pending Requests ({pendingManagers.length})
                    </h3>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto" />
                        </div>
                    ) : pendingManagers.length === 0 ? (
                        <GlassCard className="p-8 text-center border-slate-200 dark:border-white/5">
                            <Check className="text-green-500 dark:text-green-400 mx-auto mb-3" size={32} />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">No pending applications</p>
                        </GlassCard>
                    ) : (
                        <div className="space-y-3">
                            {pendingManagers.map((manager) => (
                                <motion.div
                                    key={manager.id}
                                    layoutId={manager.id}
                                    onClick={() => setSelectedManager(manager)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedManager?.id === manager.id
                                        ? 'bg-orange-500/10 border-orange-500/50'
                                        : 'bg-white border-slate-200 dark:bg-white/5 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                                            {manager.universityName?.charAt(0) || 'U'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">{manager.universityName || 'Unknown Uni'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{manager.email}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Column */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {selectedManager ? (
                            <motion.div
                                key={selectedManager.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <GlassCard className="p-8 border-slate-200 dark:border-white/10 h-full">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedManager.universityName}</h2>
                                            <p className="text-orange-500 dark:text-orange-400 text-sm font-medium">Application for Partnership</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <a href={selectedManager.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-slate-200 dark:bg-white/5 dark:border-white/10 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                                <Eye size={20} />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Representative</label>
                                                <p className="text-slate-900 dark:text-white font-medium">{selectedManager.fullName}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Official Email</label>
                                                <p className="text-slate-900 dark:text-white font-medium">{selectedManager.officialEmail}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Location</label>
                                                <p className="text-slate-900 dark:text-white font-medium">{selectedManager.location}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">License Number</label>
                                                <p className="text-slate-900 dark:text-white font-medium">{selectedManager.licenseNumber}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Website</label>
                                                <p className="text-slate-900 dark:text-white font-medium truncate">{selectedManager.website}</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Date Submitted</label>
                                                <p className="text-slate-900 dark:text-white font-medium">{selectedManager.applicationDate?.toDate().toLocaleDateString() || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Infrastructure Images */}
                                    {selectedManager.infrastructureImages && selectedManager.infrastructureImages.length > 0 && (
                                        <div className="mb-8">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Campus Infrastructure</span>
                                                <div className="h-px bg-slate-200 dark:bg-white/10 flex-1" />
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {selectedManager.infrastructureImages.map((img, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 dark:border-white/10 shadow-sm cursor-zoom-in">
                                                        <img
                                                            src={img}
                                                            alt={`Infrastructure ${idx + 1}`}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            onClick={() => window.open(img, '_blank')}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Description</label>
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-1 p-4 bg-slate-50 border border-slate-200 dark:bg-white/5 dark:border-white/5 rounded-xl">
                                            {selectedManager.description}
                                        </p>
                                    </div>

                                    <div className="border-t border-white/5 pt-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <textarea
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="Reason for rejection (required for reject)..."
                                                        className="w-full p-4 bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none"
                                                    />
                                                    <AlertCircle className="absolute right-4 top-4 text-slate-400 dark:text-slate-600" size={16} />
                                                </div>
                                                <button
                                                    onClick={() => handleReject(selectedManager)}
                                                    disabled={actionLoading || !rejectionReason}
                                                    className="w-full py-3 bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 hover:bg-red-500/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                                                >
                                                    <X size={20} />
                                                    <span>Reject Application</span>
                                                </button>
                                            </div>
                                            <div className="flex flex-col justify-end">
                                                <button
                                                    onClick={() => handleApprove(selectedManager)}
                                                    disabled={actionLoading}
                                                    className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 hover:shadow-green-600/40 transition-all flex items-center justify-center space-x-2 h-[100px] md:h-full"
                                                >
                                                    {actionLoading ? (
                                                        <div className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                                                    ) : (
                                                        <>
                                                            <Send size={20} />
                                                            <span>Approve Partnership</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center">
                                <div>
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Eye className="text-slate-400 dark:text-slate-600" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-500 dark:text-slate-400 mb-2">Select an application</h3>
                                    <p className="text-slate-400 dark:text-slate-600 text-sm max-w-xs mx-auto">Click on a university request from the left list to review their details and license information.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Approvals;
