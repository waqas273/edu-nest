import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trash2, Search, Ban, UserX, Eye, Shield, HardHat, GraduationCap, Building2, MapPin, Globe, Mail, FileText, Hash, Calendar, X, CheckCircle, Instagram, Linkedin, Github, AlertTriangle } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import GlassCard from '../../components/ui/GlassCard';
import UserProfileModal from '../../components/UserProfileModal';

const ManageUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'universities'
    const [filterWarnings, setFilterWarnings] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null); // ID for View Profile Modal
    const [actionModal, setActionModal] = useState(null); // { type: 'delete' | 'ban', user: {...} }
    const [toast, setToast] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    // ... (fetch logic same)

    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleDelete = async (user) => {
        if (user.role === 'admin') return; // Security check
        try {
            await deleteDoc(doc(db, 'users', user.id));
            setUsers(users.filter(u => u.id !== user.id));
            setActionModal(null);
            showToast(`User "${user.fullName || user.email}" deleted successfully.`, 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Failed to delete user.', 'error');
        }
    };

    const handleBan = async (user) => {
        if (user.role === 'admin') return; // Security check
        try {
            // Step 1: Add to banned_emails collection (email as doc ID for O(1) lookup)
            await setDoc(doc(db, 'banned_emails', user.email.toLowerCase()), {
                bannedAt: serverTimestamp(),
                reason: 'Admin Action'
            });

            // Step 2: Update user status to 'banned' (triggers logout if active)
            await updateDoc(doc(db, 'users', user.id), {
                status: 'banned'
            });

            // Update local state to reflect the ban
            setUsers(users.map(u =>
                u.id === user.id ? { ...u, status: 'banned' } : u
            ));
            setActionModal(null);
            showToast(`User "${user.email}" has been permanently banned.`, 'success');
        } catch (error) {
            console.error('Error banning user:', error);
            showToast('Failed to ban user.', 'error');
        }
    };

    const handleUnban = async (user) => {
        try {
            // Step 1: Remove from banned_emails collection
            await deleteDoc(doc(db, 'banned_emails', user.email.toLowerCase()));

            // Step 2: Restore user status to 'approved'
            await updateDoc(doc(db, 'users', user.id), {
                status: 'approved'
            });

            // Update local state to reflect the unban
            setUsers(users.map(u =>
                u.id === user.id ? { ...u, status: 'approved' } : u
            ));
            setActionModal(null);
            showToast(`User "${user.email}" has been unbanned.`, 'success');
        } catch (error) {
            console.error('Error unbanning user:', error);
            showToast('Failed to unban user.', 'error');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (
            user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.universityName?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesWarning = filterWarnings ? (user.warningCount >= 3) : true;

        if (activeTab === 'banned') {
            return matchesSearch && user.status === 'banned';
        }

        if (user.status === 'banned') return false; // Hide banned users from other tabs

        if (activeTab === 'general') {
            return matchesSearch && matchesWarning && (user.role === 'student' || user.role === 'admin');
        } else {
            return matchesSearch && matchesWarning && user.role === 'university_manager';
        }
    });

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
            university_manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            student: 'bg-green-500/20 text-green-400 border-green-500/30'
        };
        return styles[role] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    const getStatusBadge = (status) => {
        const styles = {
            approved: 'bg-green-500/20 text-green-400 border-green-500/30',
            pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
            pending_details: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
        return styles[status] || styles.pending;
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 ${toast.type === 'error'
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                            }`}
                    >
                        {toast.type === 'error' ? <UserX size={20} /> : <CheckCircle size={20} />}
                        <span className="font-semibold">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Standardized Profile Detail Modal */}
            <UserProfileModal
                isOpen={!!selectedUserId}
                onClose={() => setSelectedUserId(null)}
                userId={selectedUserId}
                readOnly={true}
            />

            {/* Action Confirmation Modal */}
            <AnimatePresence>
                {actionModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setActionModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${actionModal.type === 'ban' ? 'bg-red-500/20' :
                                actionModal.type === 'unban' ? 'bg-green-500/20' :
                                    'bg-orange-500/20'
                                }`}>
                                {actionModal.type === 'ban' ? <Ban className="text-red-400" size={32} /> :
                                    actionModal.type === 'unban' ? <CheckCircle className="text-green-400" size={32} /> :
                                        <UserX className="text-orange-400" size={32} />
                                }
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2 tracking-tight">
                                {actionModal.type === 'ban' ? 'Permanent Ban?' :
                                    actionModal.type === 'unban' ? 'Restore User?' :
                                        'Confirm Deletion?'}
                            </h3>

                            <p className="text-slate-500 dark:text-slate-400 text-center mb-2">
                                {actionModal.user.fullName || actionModal.user.email}
                            </p>

                            <p className="text-sm text-slate-500 text-center mb-6 px-4">
                                {actionModal.type === 'ban' ? 'This blacklists their email. They will never be able to sign up with this email again.' :
                                    actionModal.type === 'unban' ? 'User access will be restored immediately.' :
                                        'User is removed but can sign up again. This is useful for clearing registration errors.'}
                            </p>

                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setActionModal(null)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (actionModal.type === 'ban') handleBan(actionModal.user);
                                        else if (actionModal.type === 'unban') handleUnban(actionModal.user);
                                        else handleDelete(actionModal.user);
                                    }}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${actionModal.type === 'ban' ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' :
                                        actionModal.type === 'unban' ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20' :
                                            'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20'
                                        }`}
                                >
                                    {actionModal.type === 'ban' ? 'Ban User' :
                                        actionModal.type === 'unban' ? 'Unban User' :
                                            'Yes, Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="flex items-center space-x-4 mb-3">
                        <div className="p-3 bg-cyan-600/10 rounded-2xl border border-cyan-600/20">
                            <Users className="text-cyan-400" size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Manage Users</h1>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">Oversee EduNest users & institutional partners</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tab Switcher */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex bg-slate-200 dark:bg-slate-800/50 p-1 rounded-2xl border border-slate-300 dark:border-white/5"
                >
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${activeTab === 'general'
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <Shield size={18} />
                        <span>Students</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('universities')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${activeTab === 'universities'
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <Building2 size={18} />
                        <span>Universities</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('banned')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${activeTab === 'banned'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-white/50 dark:hover:bg-white/5'}`}
                    >
                        <Ban size={18} />
                        <span>Banned</span>
                    </button>
                </motion.div>
            </div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 flex flex-col md:flex-row gap-4"
            >
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder={activeTab === 'general' ? "Search name or email..." : "Search university, name or license..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-xl"
                    />
                </div>
                <button
                    onClick={() => setFilterWarnings(!filterWarnings)}
                    className={`px-5 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all ${filterWarnings
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                >
                    <AlertTriangle size={20} className={filterWarnings ? "text-white" : "text-red-500"} />
                    <span>Risk Users (3+)</span>
                </button>
            </motion.div>

            {/* Table Area */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <GlassCard className="border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Synchronizing user data...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                        <th className="text-left py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">Identity</th>
                                        <th className="text-left py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">
                                            {activeTab === 'general' ? 'Contact' : 'Institutional Contact'}
                                        </th>
                                        <th className="text-left py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">Warnings</th>
                                        <th className="text-left py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">Role / Classification</th>
                                        <th className="text-left py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">Status</th>
                                        <th className="text-right py-5 px-6 text-xs uppercase tracking-widest text-slate-500 font-extrabold">Management</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-20 text-center">
                                                <div className="opacity-20 flex flex-col items-center">
                                                    <UserX size={64} className="mb-4 text-slate-400 dark:text-slate-500" />
                                                    <p className="text-xl font-bold text-slate-900 dark:text-white mb-1">No matches found</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your search criteria or tabs</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user, i) => (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="group hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                                            >
                                                <td className="py-5 px-6">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                            {user.fullName || 'Anonymous User'}
                                                        </p>
                                                        {activeTab === 'universities' && (
                                                            <p className="text-xs text-slate-400 mt-1 italic font-medium flex items-center">
                                                                <Building2 size={12} className="mr-1" />
                                                                {user.universityName || 'Not Formally Specified'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-mono">{user.email}</p>
                                                </td>
                                                <td className="py-5 px-6">
                                                    {user.warningCount > 0 ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${user.warningCount >= 3 ? 'bg-red-500 text-white animate-pulse' : 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'}`}>
                                                            <AlertTriangle size={12} fill="currentColor" />
                                                            {user.warningCount} Warning{user.warningCount > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs font-medium">-</span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-tighter border shadow-sm ${getRoleBadge(user.role)}`}>
                                                        {user.role?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-tighter border shadow-sm ${getStatusBadge(user.status)}`}>
                                                        {user.status?.toUpperCase() || (user.isApproved !== false ? 'ACTIVE' : 'PENDING')}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <div className="flex items-center justify-end space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {/* View Details Button */}
                                                        <button
                                                            onClick={() => setSelectedUserId(user.id)}
                                                            className="p-2.5 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-xl transition-all border border-transparent hover:border-cyan-400/50 shadow-lg shadow-transparent hover:shadow-cyan-400/10"
                                                            title="View Full Profile"
                                                        >
                                                            <Eye size={18} />
                                                        </button>

                                                        {/* Delete Button */}
                                                        {user.role !== 'admin' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => setActionModal({ type: 'delete', user })}
                                                                    className="p-2.5 text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl transition-all border border-transparent hover:border-orange-400/50"
                                                                    title="Standard Delete"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>

                                                                {/* Ban/Unban Button */}
                                                                {user.status === 'banned' ? (
                                                                    <button
                                                                        onClick={() => setActionModal({ type: 'unban', user })}
                                                                        className="p-2.5 text-green-400 hover:bg-green-500 hover:text-white rounded-xl transition-all border border-transparent hover:border-green-400/50"
                                                                        title="Unban User"
                                                                    >
                                                                        <CheckCircle size={18} />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setActionModal({ type: 'ban', user })}
                                                                        className="p-2.5 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-transparent hover:border-red-400/50"
                                                                        title="Permanent Email Ban"
                                                                    >
                                                                        <Ban size={18} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className="p-2.5 text-slate-700 bg-slate-800/50 rounded-xl border border-white/5 cursor-not-allowed" title="System Admins are immutable">
                                                                <Shield size={18} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </motion.div>
        </div >
    );
};

export default ManageUsers;
