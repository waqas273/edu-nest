import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2, AlertTriangle, Shield, Loader2, User, Heart, MessageCircle, CornerDownRight } from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, orderBy, query, serverTimestamp, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import UserProfileModal from './UserProfileModal';
import CommentSection from './CommentSection';
import { moderateContent } from '../services/aiModeration';
import CustomToast from './ui/CustomToast';

/**
 * Shared Community Feed Component
 * Used by Admin, Student, and Manager dashboards
 * NOW WITH PROPER LIGHT/DARK MODE SUPPORT
 */

// Moderation logic moved to src/services/aiModeration.js

const CommunityFeed = () => {
    const { userProfile, currentUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [moderationStatus, setModerationStatus] = useState(null);
    const [toast, setToast] = useState(null);
    const [expandedPosts, setExpandedPosts] = useState(new Set()); // Tracks which posts have comments open
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null, userData: null });

    const openProfileModal = (userId, userData) => {
        setProfileModal({ isOpen: true, userId, userData });
    };

    const closeProfileModal = () => {
        setProfileModal({ isOpen: false, userId: null, userData: null });
    };

    useEffect(() => {
        const postsRef = collection(db, 'posts');
        const postsQuery = query(postsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const postsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(postsList);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching posts:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim() || posting) return;

        setPosting(true);
        setModerationStatus('analyzing');

        try {
            // Use moderateContent to get full object response
            const safetyResult = await moderateContent(newPost);

            if (!safetyResult.isSafe) {
                setModerationStatus('unsafe');
                showToast(
                    safetyResult.message || '⚠️ AI detected offensive content.',
                    'error'
                );
                setPosting(false);
                setTimeout(() => setModerationStatus(null), 3000);
                return;
            }

            setModerationStatus('safe');

            const postData = {
                content: newPost,
                authorId: currentUser.uid,
                authorName: userProfile?.fullName || 'Anonymous',
                authorRole: userProfile?.role || 'user',
                authorPhoto: userProfile?.photoURL || userProfile?.profilePic || userProfile?.profilePictureUrl || null,
                createdAt: serverTimestamp(),
                moderationScore: 0,
                moderationLabel: 'safe'
            };

            await addDoc(collection(db, 'posts'), postData);
            setNewPost('');
            showToast('✅ Post published successfully!', 'success');

        } catch (error) {
            console.error('Error creating post:', error);
            showToast('Failed to create post. Please try again.', 'error');
        } finally {
            setPosting(false);
            setTimeout(() => setModerationStatus(null), 1500);
        }
    };

    const handleLike = async (postId, currentLikes = []) => {
        if (!currentUser) return;

        const isLiked = currentLikes.includes(currentUser.uid);
        const postRef = doc(db, 'posts', postId);

        try {
            await updateDoc(postRef, {
                likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });
        } catch (error) {
            console.error('Error toggling like:', error);
            showToast('Failed to update like', 'error');
        }
    };

    const toggleComments = (postId) => {
        const newSet = new Set(expandedPosts);
        if (newSet.has(postId)) {
            newSet.delete(postId);
        } else {
            newSet.add(postId);
        }
        setExpandedPosts(newSet);
    };

    const handleDelete = async (post) => {
        const isOwner = currentUser?.uid === post.authorId;
        const isAdmin = userProfile?.role === 'admin';

        if (!isOwner && !isAdmin) {
            showToast('You do not have permission to delete this post', 'error');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this post?')) return;

        try {
            await deleteDoc(doc(db, 'posts', post.id));
            showToast('Post deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting post:', error);
            showToast('Failed to delete post', 'error');
        }
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-500/30';
            case 'university_manager':
                return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30';
            case 'student':
            default:
                return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30';
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'admin': return 'Admin';
            case 'university_manager': return 'Uni Manager';
            case 'student': return 'Student';
            default: return 'User';
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString();
    };

    return (
        <div className="w-full">
            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        key="toast-notification"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl ${toast.type === 'error'
                            ? 'bg-red-500/90 text-white border border-red-400/50'
                            : 'bg-green-500/90 text-white border border-green-400/50'
                            }`}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Post Form */}
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-lg mb-6">
                <form onSubmit={handlePost}>
                    <div className="flex items-start space-x-4">
                        <UserAvatar
                            userId={currentUser?.uid}
                            src={userProfile?.photoURL || userProfile?.profilePic}
                            name={userProfile?.fullName || currentUser?.displayName}
                            size="md"
                            className="shrink-0"
                        />
                        <div className="flex-1">
                            <textarea
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder="Share something with the community..."
                                className="w-full p-4 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                rows={3}
                                disabled={posting}
                            />

                            {/* Moderation Status */}
                            <AnimatePresence>
                                {moderationStatus && (
                                    <motion.div
                                        key="moderation-bar"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`mt-3 p-3 rounded-lg flex items-center space-x-2 text-sm ${moderationStatus === 'analyzing' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                                            moderationStatus === 'safe' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                                                'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                                            }`}
                                    >
                                        {moderationStatus === 'analyzing' && (
                                            <>
                                                <Loader2 className="animate-spin" size={16} />
                                                <span>AI is analyzing your content...</span>
                                            </>
                                        )}
                                        {moderationStatus === 'safe' && (
                                            <>
                                                <Shield size={16} />
                                                <span>Content approved ✓</span>
                                            </>
                                        )}
                                        {moderationStatus === 'unsafe' && (
                                            <>
                                                <AlertTriangle size={16} />
                                                <span>Content flagged - please be respectful</span>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex justify-end mt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={posting || !newPost.trim()}
                                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                                >
                                    {posting ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    <span>{posting ? 'Posting...' : 'Post'}</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Posts Feed */}
            {loading ? (
                <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto text-cyan-500 mb-4" size={32} />
                    <p className="text-slate-600 dark:text-slate-400">Loading posts...</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-12 shadow-lg text-center">
                    <MessageSquare className="mx-auto text-slate-400 dark:text-slate-600 mb-4" size={48} />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No posts yet</h3>
                    <p className="text-slate-600 dark:text-slate-400">Be the first to share something!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {posts.map((post, i) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        {/* Author Avatar - Clickable */}
                                        <UserAvatar
                                            userId={post.authorId}
                                            src={post.authorPhoto}
                                            name={post.authorName}
                                            size="lg"
                                            onClick={() => openProfileModal(post.authorId, {
                                                id: post.authorId,
                                                fullName: post.authorName,
                                                role: post.authorRole,
                                                photoURL: post.authorPhoto
                                            })}
                                        />

                                        <div className="flex-1 min-w-0">
                                            {/* Author Info */}
                                            <div className="flex items-center flex-wrap gap-2 mb-1">
                                                <p className="font-semibold text-slate-900 dark:text-white">{post.authorName}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(post.authorRole)}`}>
                                                    {getRoleDisplayName(post.authorRole)}
                                                </span>
                                            </div>

                                            {/* Post Content */}
                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{post.content}</p>

                                            {/* Timestamp & Actions */}
                                            <div className="flex items-center space-x-6 mt-3 text-xs">
                                                <span className="text-slate-500">
                                                    {formatTime(post.createdAt)}
                                                </span>

                                                <button
                                                    onClick={() => handleLike(post.id, post.likes || [])}
                                                    className={`flex items-center space-x-1.5 transition-colors ${post.likes?.includes(currentUser?.uid) ? 'text-pink-500' : 'text-slate-500 hover:text-pink-400'}`}
                                                >
                                                    <Heart size={14} fill={post.likes?.includes(currentUser?.uid) ? 'currentColor' : 'none'} />
                                                    <span>{post.likes?.length || 0}</span>
                                                </button>

                                                <button
                                                    onClick={() => toggleComments(post.id)}
                                                    className={`flex items-center space-x-1.5 transition-colors ${expandedPosts.has(post.id) ? 'text-cyan-500' : 'text-slate-500 hover:text-cyan-500'}`}
                                                >
                                                    <MessageCircle size={14} />
                                                    <span>
                                                        {Math.max(0, post.replyCount || post.replies?.length || 0)} Comments
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Comments Section */}
                                            <AnimatePresence>
                                                {expandedPosts.has(post.id) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <CommentSection
                                                            postId={post.id}
                                                            currentUser={currentUser}
                                                            userProfile={userProfile}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Smart Delete Button: Owner or Admin */}
                                    {(userProfile?.role === 'admin' || currentUser?.uid === post.authorId) && (
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleDelete(post)}
                                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors shrink-0"
                                            title={userProfile?.role === 'admin' ? "Delete post (Admin)" : "Delete your post"}
                                        >
                                            <Trash2 size={18} />
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={profileModal.isOpen}
                onClose={closeProfileModal}
                userId={profileModal.userId}
                userData={profileModal.userData}
                readOnly={userProfile?.role === 'admin'}
            />

            {/* Custom Animated Toast */}
            {toast && (
                <CustomToast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default CommunityFeed;
