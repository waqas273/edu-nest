import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Trash2, CornerDownRight, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { formatDistanceToNow } from 'date-fns';

const CommentItem = ({
    comment,
    level = 0,
    onReply,
    onLike,
    onDelete,
    currentUserId,
    userProfile,
    usersMap = {},
    openProfileModal
}) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitReply = async () => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);
        try {
            await onReply(comment.id, replyText);
            setReplyText('');
            setIsReplying(false);
            setShowReplies(true); // Auto-expand when replying
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasChildren = comment.children && comment.children.length > 0;
    const isLiked = comment.likes?.includes(currentUserId);

    // Helper for displaying names
    const getDisplayAuthorName = (commentObj) => {
        if (commentObj.authorRole === 'admin') return 'EduNest Admin';
        if (commentObj.authorRole === 'university_manager') {
            const mappedUser = usersMap[commentObj.authorId];
            if (mappedUser && mappedUser.universityName) {
                return mappedUser.universityName;
            }
            return commentObj.authorName || 'University Representative';
        }
        return commentObj.authorName || 'Anonymous';
    };

    // Indentation limit to avoid too much nesting UI
    const nextLevel = level < 3 ? level + 1 : level;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex flex-col ${level > 0 ? 'mt-3' : 'mt-4'}`}
        >
            <div className="flex items-start gap-3">
                {/* Connector Line for Nested Replies */}
                {level > 0 && (
                    <CornerDownRight size={16} className="text-slate-300 dark:text-slate-600 mt-2 shrink-0" />
                )}

                <UserAvatar
                    userId={comment.authorId}
                    src={comment.authorPhoto}
                    name={getDisplayAuthorName(comment)}
                    size={level === 0 ? "sm" : "xs"}
                    onClick={openProfileModal ? () => openProfileModal(comment.authorId, {
                        id: comment.authorId,
                        fullName: getDisplayAuthorName(comment),
                        role: comment.authorRole,
                        photoURL: comment.authorPhoto
                    }) : undefined}
                    className={openProfileModal ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                />

                <div className="flex-1 min-w-0">
                    <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-2xl rounded-tl-none">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`font-bold text-sm text-slate-800 dark:text-gray-200 ${openProfileModal ? 'cursor-pointer hover:underline' : ''}`}
                                    onClick={openProfileModal ? () => openProfileModal(comment.authorId, {
                                        id: comment.authorId,
                                        fullName: getDisplayAuthorName(comment),
                                        role: comment.authorRole,
                                        photoURL: comment.authorPhoto
                                    }) : undefined}
                                >
                                    {getDisplayAuthorName(comment)}
                                </span>
                                {comment.authorRole === 'admin' && (
                                    <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">Admin</span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                    {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                            {comment.text}
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 mt-1 ml-2">
                        <button
                            onClick={() => onLike(comment.id)}
                            className={`flex items-center gap-1 text-xs font-medium transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}
                        >
                            <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
                            <span>{comment.likes?.length || 0}</span>
                        </button>

                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-cyan-500 transition-colors"
                        >
                            <span className="cursor-pointer">Reply</span>
                        </button>

                        {(currentUserId === comment.authorId || userProfile?.role === 'admin') && (
                            <button
                                onClick={() => onDelete(comment.id)}
                                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>

                    {/* Reply Input */}
                    <AnimatePresence>
                        {isReplying && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 flex items-center gap-2"
                            >
                                <div className="h-8 w-0.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                <input
                                    autoFocus
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Replying to ${getDisplayAuthorName(comment)}...`}
                                    className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                                />
                                <button
                                    onClick={handleSubmitReply}
                                    disabled={!replyText.trim() || isSubmitting}
                                    className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl disabled:opacity-50 transition-colors"
                                >
                                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nested Replies Toggle */}
                    {hasChildren && (
                        <div className="mt-2">
                            {!showReplies && (
                                <button
                                    onClick={() => setShowReplies(true)}
                                    className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                                >
                                    <div className="w-6 h-[1px] bg-slate-200 dark:bg-slate-700" />
                                    View {comment.children.length} replies
                                    <ChevronDown size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Recursive Children Rendering */}
            <AnimatePresence>
                {hasChildren && showReplies && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="ml-4 pl-4 border-l-2 border-slate-100 dark:border-white/5"
                    >
                        {comment.children.map(child => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                level={nextLevel}
                                onReply={onReply}
                                onLike={onLike}
                                onDelete={onDelete}
                                currentUserId={currentUserId}
                                userProfile={userProfile}
                                usersMap={usersMap}
                                openProfileModal={openProfileModal}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default CommentItem;
