import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import {
    collection, doc, getDoc, addDoc, query, where,
    orderBy, onSnapshot, updateDoc, serverTimestamp, getDocs, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import UserAvatar from '../components/UserAvatar';
import {
    Send, ArrowLeft, MessageSquare, Loader2,
    Check, CheckCheck, Search, Menu, X, Trash2, Clock
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ConfirmationModal from '../components/common/ConfirmationModal';
import UserProfileModal from '../components/UserProfileModal';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Trigger Delete (Opens Modal)
const handleDeleteChatClick = (chatIdToDelete, e) => {
    if (e) e.stopPropagation();
    setChatToDelete(chatIdToDelete);
    setIsDeleteModalOpen(true);
};

// Confirm Delete (Actual Action)
const confirmDeleteChat = async () => {
    if (!chatToDelete) return;

    setDeletingChat(chatToDelete);
    try {
        // Delete all messages in the chat first
        const messagesRef = collection(db, 'chats', chatToDelete, 'messages');
        const messagesSnap = await getDocs(messagesRef);
        const deletePromises = messagesSnap.docs.map(docSnap =>
            deleteDoc(doc(db, 'chats', chatToDelete, 'messages', docSnap.id))
        );
        await Promise.all(deletePromises);

        // Delete the chat document
        await deleteDoc(doc(db, 'chats', chatToDelete));

        // Navigate away if the deleted chat was active
        if (chatId === chatToDelete) {
            navigate('/messages');
        }
        setIsDeleteModalOpen(false);
        setChatToDelete(null);
    } catch (error) {
        console.error('Error deleting chat:', error);
        // Ideally use global toaster here, but for now console error is enough as we have a catch block
        alert('Failed to delete conversation. Please try again.');
    } finally {
        setDeletingChat(null);
    }
};



// Hook to fetch user details
const useUserDetails = (userId) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', userId));
                if (userDoc.exists()) {
                    setUser(userDoc.data());
                } else {
                    setUser({
                        displayName: 'Deleted User',
                        fullName: 'Deleted User',
                        photoURL: null,
                        isDeleted: true
                    });
                }
            } catch (error) {
                console.error("Error fetching user", error);
                setUser({
                    displayName: 'Deleted User',
                    fullName: 'Deleted User',
                    photoURL: null,
                    isDeleted: true
                });
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    return { user, loading };
};

// Premium Chat List Item with Magnetic Hover
const ChatListItem = ({ chat, isActive, onClick, currentUserId, currentUser, index }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        mouseX.set(x - rect.width / 2);
    };

    const otherId = chat.participants?.find(p => p !== currentUserId);
    const unreadCount = chat.unreadCount?.[currentUserId] || 0;

    // Fetch live user details for the other participant
    const { user: otherUser, loading } = useUserDetails(otherId);

    // Determine display name: 
    // 1. Live fetched name (best)
    // 2. Name from chat document (fallback)
    // 3. 'Unknown User' (last resort)
    const displayName = otherUser?.fullName || otherUser?.displayName || otherUser?.universityName ||
        (typeof chat.participantNames === 'object' ? chat.participantNames?.[otherId] : chat.participantNames?.find(n => n !== currentUser?.displayName)) ||
        'Unknown User';

    const photoURL = otherUser?.photoURL || otherUser?.profilePic || otherUser?.profilePictureUrl;

    return (
        <motion.button
            ref={cardRef}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => mouseX.set(0)}
            onClick={onClick}
            whileHover={{ x: 4 }}
            className={cn(
                "w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-300 relative overflow-hidden border",
                isActive
                    ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30"
                    : "hover:bg-slate-50 dark:hover:bg-white/5 border-transparent dark:border-transparent"
            )}
        >
            {/* Selection Indicator */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: isActive ? 1 : 0 }}
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 origin-top"
            />

            <div className="relative flex-shrink-0">
                <UserAvatar
                    userId={otherId}
                    name={displayName}
                    src={photoURL}
                    size="md"
                    showOnlineStatus={false}
                />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-lg"
                    >
                        {unreadCount}
                    </motion.div>
                )}
            </div>

            <div className="flex-1 min-w-0 text-left">
                {unreadCount > 0 && (
                    <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block mb-0.5">
                        New Message
                    </span>
                )}
                <p className={cn(
                    "text-sm truncate font-semibold transition-colors",
                    isActive ? "text-cyan-700 dark:text-cyan-400" : "text-slate-600 dark:text-slate-300"
                )}>
                    {loading ? 'Loading...' : displayName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {chat.lastMessage || 'No messages yet'}
                </p>
            </div>

            {isActive && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0"
                />
            )}
        </motion.button>
    );
};

// Premium Message Bubble
const MessageBubble = ({ message, isMe, formatTime, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: index * 0.01
            }}
            className={cn("flex", isMe ? 'justify-end' : 'justify-start')}
        >
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="max-w-[75%] relative group"
            >
                <div
                    className={cn(
                        "px-5 py-3 rounded-3xl shadow-lg backdrop-blur-sm relative",
                        isMe
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-700'
                    )}
                >
                    <p className="text-sm leading-relaxed break-words">{message.text}</p>
                </div>
                <div className={cn(
                    "flex items-center gap-1 mt-1 text-[10px]",
                    isMe ? "text-slate-400 justify-end" : "text-slate-500 dark:text-slate-400 justify-start"
                )}>
                    <Clock size={10} />
                    <span>{formatTime(message.createdAt)}</span>
                    {isMe && (
                        message.isRead
                            ? <CheckCheck size={12} className="text-cyan-400 ml-1" />
                            : <Check size={12} className="ml-1" />
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const ChatPage = () => {
    const { chatId } = useParams();
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // State
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUserId, setOtherUserId] = useState(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingChat, setDeletingChat] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Fetch details for active chat header
    const { user: headerUser, loading: headerLoading } = useUserDetails(otherUserId);

    // ... (rest of the component logic stays same until handleDeleteChat)

    // Header display data
    const headerDisplayName = headerUser?.fullName || headerUser?.displayName || headerUser?.universityName ||
        (activeChat && typeof activeChat.participantNames === 'object' ? activeChat.participantNames?.[otherUserId] : activeChat?.participantNames?.find(n => n !== currentUser?.displayName)) ||
        'Unknown User';

    const headerPhotoURL = headerUser?.photoURL || headerUser?.profilePic || headerUser?.profilePictureUrl;

    // Fetch all chats
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            chatsData.sort((a, b) => {
                const timeA = a.lastMessageTime?.toDate?.() || new Date(0);
                const timeB = b.lastMessageTime?.toDate?.() || new Date(0);
                return timeB - timeA;
            });
            setChats(chatsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Load active chat and messages
    useEffect(() => {
        if (!chatId || !currentUser) return;

        const chatRef = doc(db, 'chats', chatId);
        const unsubChat = onSnapshot(chatRef, (snap) => {
            if (snap.exists()) {
                const chatData = { id: snap.id, ...snap.data() };
                setActiveChat(chatData);
                const otherId = chatData.participants?.find(p => p !== currentUser.uid);
                setOtherUserId(otherId);
            }
        });

        const messagesQ = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubMessages = onSnapshot(messagesQ, async (snapshot) => {
            const messagesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(messagesData);

            // Mark unread as read
            const unreadMessages = snapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.isRead && data.senderId !== currentUser.uid;
            });

            for (const msgDoc of unreadMessages) {
                await updateDoc(doc(db, 'chats', chatId, 'messages', msgDoc.id), {
                    isRead: true
                });
            }

            if (unreadMessages.length > 0) {
                await updateDoc(chatRef, {
                    [`unreadCount.${currentUser.uid}`]: 0
                });
            }
        });

        return () => {
            unsubChat();
            unsubMessages();
        };
    }, [chatId, currentUser]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !chatId || sending) return;

        const messageText = newMessage.trim();
        setNewMessage('');
        setSending(true);

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                senderId: currentUser.uid,
                text: messageText,
                createdAt: serverTimestamp(),
                isRead: false
            });

            await updateDoc(doc(db, 'chats', chatId), {
                lastMessage: messageText,
                lastMessageTime: serverTimestamp(),
                [`unreadCount.${otherUserId}`]: (activeChat?.unreadCount?.[otherUserId] || 0) + 1
            });

            inputRef.current?.focus();
        } catch (error) {
            console.error('Error sending message:', error);
            setNewMessage(messageText);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const selectChat = (chat) => {
        if (!chat?.id) return;
        navigate(`/messages/${chat.id}`);
        setIsMobileSidebarOpen(false);
    };

    // Trigger Delete (Opens Modal)
    const handleDeleteChatClick = (chatIdToDelete, e) => {
        if (e) e.stopPropagation();
        setChatToDelete(chatIdToDelete);
        setIsDeleteModalOpen(true);
    };

    // Confirm Delete (Actual Action)
    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;

        setDeletingChat(chatToDelete);
        try {
            // Delete all messages in the chat first
            const messagesRef = collection(db, 'chats', chatToDelete, 'messages');
            const messagesSnap = await getDocs(messagesRef);
            const deletePromises = messagesSnap.docs.map(docSnap =>
                deleteDoc(doc(db, 'chats', chatToDelete, 'messages', docSnap.id))
            );
            await Promise.all(deletePromises);

            // Delete the chat document
            await deleteDoc(doc(db, 'chats', chatToDelete));

            // Navigate away if the deleted chat was active
            if (chatId === chatToDelete) {
                navigate('/messages');
            }
            // Close modal
            setIsDeleteModalOpen(false);
            setChatToDelete(null);
        } catch (error) {
            console.error('Error deleting chat:', error);
            // In a real app we'd use the toaster here
        } finally {
            setDeletingChat(null);
        }
    };

    const filteredChats = chats.filter(chat => {
        // Filter by Search Term
        let names = [];
        if (Array.isArray(chat.participantNames)) {
            names = chat.participantNames;
        } else if (chat.participantNames && typeof chat.participantNames === 'object') {
            names = Object.values(chat.participantNames);
        }

        const nameMatch = names.some(name =>
            name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const messageMatch = chat.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || messageMatch;

        // Filter by Tab (All/Unread)
        if (filter === 'unread') {
            const unreadCount = chat.unreadCount?.[currentUser?.uid] || 0;
            return matchesSearch && unreadCount > 0;
        }

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 size={56} className="text-cyan-500 mb-6" />
                </motion.div>
                <motion.p
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-slate-500 dark:text-slate-400 font-semibold text-lg"
                >
                    Loading conversations...
                </motion.p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-120px)] p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full max-w-7xl mx-auto flex gap-6"
            >
                {/* Sidebar */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "w-96 flex flex-col bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden",
                        isMobileSidebarOpen ? "block" : "hidden lg:flex"
                    )}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                    className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30"
                                >
                                    <MessageSquare className="text-white" size={24} />
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Messages</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                            />
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl relative">
                            <motion.div
                                layout
                                className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                                initial={false}
                                animate={{
                                    left: filter === 'all' ? '0.25rem' : '50%',
                                    width: 'calc(50% - 0.25rem)'
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            <button
                                onClick={() => setFilter('all')}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-lg relative z-10 transition-colors",
                                    filter === 'all' ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                All Chats
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-lg relative z-10 transition-colors",
                                    filter === 'unread' ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                Unread
                            </button>
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {filteredChats.length > 0 ? (
                                filteredChats.map((chat, idx) => (
                                    <ChatListItem
                                        key={chat.id}
                                        chat={chat}
                                        index={idx}
                                        isActive={chatId === chat.id}
                                        onClick={() => selectChat(chat)}
                                        currentUserId={currentUser?.uid}
                                        currentUser={currentUser}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-8 text-center text-slate-500 dark:text-slate-400"
                                >
                                    <MessageSquare className="mx-auto mb-3 opacity-50" size={32} />
                                    <p>
                                        {filter === 'unread'
                                            ? "No unread messages"
                                            : chats.length === 0 ? "No conversations yet" : "No conversations found"}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* Chat Window */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 flex flex-col bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
                >
                    {chatId && activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 flex items-center justify-between">
                                <div
                                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setProfileModalOpen(true)}
                                >
                                    <UserAvatar
                                        userId={otherUserId}
                                        name={headerDisplayName}
                                        src={headerPhotoURL}
                                        size="lg"
                                        showOnlineStatus={true}
                                    />
                                    <div>
                                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                                            {headerLoading ? 'Loading...' : headerDisplayName}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDeleteChatClick(chatId)}
                                    disabled={deletingChat === chatId}
                                    className="p-2.5 rounded-xl text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
                                    title="Delete conversation"
                                >
                                    {deletingChat === chatId ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={20} />
                                    )}
                                </motion.button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                        <MessageSquare size={48} className="mb-4 opacity-50" />
                                        <p>No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {messages.map((msg, index) => {
                                            const isMe = msg.senderId === currentUser?.uid;
                                            const showDate = index === 0 ||
                                                formatDate(msg.createdAt) !== formatDate(messages[index - 1]?.createdAt);

                                            return (
                                                <div key={msg.id}>
                                                    {showDate && (
                                                        <div className="text-center my-4">
                                                            <span className="text-xs text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                                                {formatDate(msg.createdAt)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <MessageBubble
                                                        message={msg}
                                                        isMe={isMe}
                                                        formatTime={formatTime}
                                                        index={index}
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </AnimatePresence>
                                )}
                            </div>

                            {/* Input */}
                            <motion.form
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                onSubmit={handleSend}
                                className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-white/10"
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all"
                                    />
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(6, 182, 212, 0.3)" }}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={!newMessage.trim() || sending}
                                        className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </motion.button>
                                </div>
                            </motion.form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner"
                            >
                                <MessageSquare size={48} className="text-slate-400 dark:text-slate-500" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select a Conversation</h3>
                            <p className="text-sm text-center max-w-md">
                                Choose a chat from the sidebar or start a new conversation
                            </p>
                        </div>
                    )}
                </motion.div>
            </motion.div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #06b6d4, #3b82f6); 
                    border-radius: 3px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: linear-gradient(180deg, #0891b2, #2563eb); 
                }
            `}</style>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteChat}
                title="Delete Conversation"
                message="Are you sure you want to delete this conversation? This action cannot be undone and all messages will be lost permanently."
                confirmText="Delete Chat"
                isDangerous={true}
                isLoading={deletingChat !== null}
            />

            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                userId={otherUserId}
                userData={headerUser}
                hideChatButton={true}
            />
        </div>
    );
};

export default ChatPage;
