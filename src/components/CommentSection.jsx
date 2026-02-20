import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, serverTimestamp, arrayUnion, arrayRemove, increment, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import CommentItem from './CommentItem';
import UserAvatar from './UserAvatar';
import { moderateContent } from '../services/aiModeration';
import { AnimatePresence, motion } from 'framer-motion';

const CommentSection = ({ postId, currentUser, userProfile }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const q = query(
            collection(db, 'posts', postId, 'comments'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setComments(commentsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching comments:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId]);

    // Self-Healing Comment Count Sync
    // If the post displays a wrong count (e.g. negative), this fixes it when the section loads.
    useEffect(() => {
        if (!loading && comments.length >= 0) {
            const syncCount = async () => {
                try {
                    const postRef = doc(db, 'posts', postId);
                    await updateDoc(postRef, {
                        replyCount: comments.length
                    });
                } catch (err) {
                    console.error("Failed to sync comment count:", err);
                }
            };
            syncCount();
        }
    }, [comments.length, loading, postId]);

    // Build Comment Tree (Memoized)
    const rootComments = useMemo(() => {
        const commentMap = {};
        const roots = [];

        // 1. Initialize map
        comments.forEach(c => {
            commentMap[c.id] = { ...c, children: [] };
        });

        // 2. Link children
        comments.forEach(c => {
            if (c.parentId && commentMap[c.parentId]) {
                commentMap[c.parentId].children.push(commentMap[c.id]);
            } else if (!c.parentId) {
                roots.push(commentMap[c.id]);
            }
        });

        // 3. Sort by newness (optional, but usually oldest first for comments)
        // They are already sorted by createdAt asc from query
        return roots;
    }, [comments]);

    const handleAddComment = async (parentId = null, text = newComment) => {
        if (!text.trim()) return;

        // Safety Check
        const moderationResult = await moderateContent(text);
        if (!moderationResult.isSafe) {
            alert(moderationResult.message || "Your comment was flagged as unsafe/toxic provided by AI Moderation.");
            return;
        }

        if (!parentId) setSubmitting(true);

        try {
            const batch = writeBatch(db);
            const newCommentRef = doc(collection(db, 'posts', postId, 'comments'));


            const commentData = {
                text: text,
                authorId: currentUser.uid,
                authorName: userProfile?.fullName || currentUser.displayName || 'Anonymous',
                authorPhoto: userProfile?.photoURL || userProfile?.profilePic || null,
                authorRole: userProfile?.role || 'user',
                parentId: parentId,
                likes: [],
                createdAt: serverTimestamp()
            };

            batch.set(newCommentRef, commentData);

            // Atomically increment post reply count
            const postRef = doc(db, 'posts', postId);
            batch.update(postRef, {
                replyCount: increment(1)
            });

            await batch.commit();

            if (!parentId) setNewComment('');
        } catch (err) {
            console.error("Failed to add comment:", err);
            setError("Failed to post comment");
        } finally {
            if (!parentId) setSubmitting(false);
        }
    };

    const handleLike = async (commentId) => {
        if (!currentUser) return;
        const comment = comments.find(c => c.id === commentId);
        if (!comment) return;

        const isLiked = comment.likes?.includes(currentUser.uid);
        const commentRef = doc(db, 'posts', postId, 'comments', commentId);

        try {
            await updateDoc(commentRef, {
                likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });
        } catch (err) {
            console.error("Error liking comment:", err);
        }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            const batch = writeBatch(db);
            const commentRef = doc(db, 'posts', postId, 'comments', commentId);
            const postRef = doc(db, 'posts', postId);

            batch.delete(commentRef);
            batch.update(postRef, {
                replyCount: increment(-1)
            });

            await batch.commit();
        } catch (err) {
            console.error("Error deleting comment:", err);
        }
    };

    return (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare size={20} />
                Comments ({comments.length})
            </h4>

            {/* New Root Comment Input */}
            <div className="flex items-start gap-3 mb-8">
                <UserAvatar
                    userId={currentUser?.uid}
                    src={userProfile?.photoURL || userProfile?.profilePic}
                    name={userProfile?.fullName}
                    size="md"
                />
                <div className="flex-1 relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(null);
                            }
                        }}
                    />
                    <button
                        onClick={() => handleAddComment(null)}
                        disabled={!newComment.trim() || submitting}
                        className="absolute bottom-2 right-2 p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
            </div>

            {/* Content & Tree */}
            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin text-cyan-500" />
                    </div>
                ) : rootComments.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400 text-sm italic">
                        No comments yet. Be the first to start the conversation!
                    </p>
                ) : (
                    <AnimatePresence initial={false}>
                        {rootComments.map(comment => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                level={0}
                                onReply={handleAddComment}
                                onLike={handleLike}
                                onDelete={handleDelete}
                                currentUserId={currentUser?.uid}
                                userProfile={userProfile}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default CommentSection;
