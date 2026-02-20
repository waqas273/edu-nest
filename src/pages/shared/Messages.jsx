import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { subscribeToChats, subscribeToMessages, sendMessage } from '../../services/chatService';
import {
    Send, User as UserIcon, MessageCircle, Search,
    MoreVertical, Smile, Paperclip, Mic, Phone,
    Video, Image as ImageIcon, CheckCheck, Clock
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Premium Chat Item with Hover Effects
const ChatItem = ({ chat, isSelected, onClick, getChatName, index }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        mouseX.set(x - rect.width / 2);
    };

    return (
        <motion.button
            ref={cardRef}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => mouseX.set(0)}
            onClick={onClick}
            whileHover={{ x: 4 }}
            className={cn(
                "w-full p-4 flex items-center gap-4 transition-all duration-300 border-b relative overflow-hidden group",
                isSelected
                    ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30"
                    : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
        >
            {/* Selection Indicator */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: isSelected ? 1 : 0 }}
                className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 origin-top"
            />

            {/* Avatar */}
            <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
                className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all",
                    isSelected
                        ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}
            >
                <UserIcon size={24} />
            </motion.div>

            {/* Chat Info */}
            <div className="flex-1 text-left min-w-0">
                <h3 className={cn(
                    "font-bold truncate text-sm transition-colors",
                    isSelected
                        ? "text-cyan-700 dark:text-cyan-400"
                        : "text-slate-900 dark:text-white"
                )}>
                    {getChatName(chat)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {chat.lastMessage || 'Start a conversation'}
                </p>
            </div>

            {/* Time Badge */}
            {isSelected && (
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
const MessageBubble = ({ message, isMe, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
                delay: index * 0.02
            }}
            className={cn("flex", isMe ? 'justify-end' : 'justify-start')}
        >
            <motion.div
                whileHover={{ scale: 1.02 }}
                className={cn(
                    "max-w-[70%] px-5 py-3 rounded-3xl shadow-lg backdrop-blur-sm relative group",
                    isMe
                        ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md border border-slate-200 dark:border-slate-700'
                )}
            >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <div className={cn(
                    "flex items-center gap-1 mt-1 text-[10px]",
                    isMe ? "text-white/70 justify-end" : "text-slate-400"
                )}>
                    <Clock size={10} />
                    <span>{new Date(message.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && <CheckCheck size={12} className="ml-1" />}
                </div>

                {/* Tooltip on Hover */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-1 rounded whitespace-nowrap">
                        {new Date(message.createdAt?.toDate?.() || Date.now()).toLocaleString()}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

const Messages = () => {
    const { userProfile } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        if (userProfile) {
            const unsub = subscribeToChats(userProfile.uid, setChats);
            return () => unsub();
        }
    }, [userProfile]);

    useEffect(() => {
        if (selectedChat) {
            const unsub = subscribeToMessages(selectedChat.id, setMessages);
            return () => unsub();
        }
    }, [selectedChat]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        await sendMessage(selectedChat.id, newMessage, userProfile.uid);
        setNewMessage('');
    };

    const getChatName = (chat) => {
        if (!chat.names) return 'Unknown User';
        return chat.names.find(n => n !== (userProfile.fullName || userProfile.email)) || 'Chat Partner';
    };

    const filteredChats = chats.filter(chat =>
        getChatName(chat).toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    className="w-96 flex flex-col bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
                >
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                    className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30"
                                >
                                    <MessageCircle className="text-white" size={24} />
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Messages</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{chats.length} conversations</p>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {filteredChats.length > 0 ? (
                                filteredChats.map((chat, idx) => (
                                    <ChatItem
                                        key={chat.id}
                                        chat={chat}
                                        index={idx}
                                        isSelected={selectedChat?.id === chat.id}
                                        onClick={() => setSelectedChat(chat)}
                                        getChatName={getChatName}
                                    />
                                ))
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-8 text-center text-slate-500 dark:text-slate-400"
                                >
                                    {chats.length === 0 ? "No active chats. Start one from a profile!" : "No conversations found"}
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
                    {selectedChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg"
                                    >
                                        <UserIcon size={24} />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">{getChatName(selectedChat)}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            Active now
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        <Phone size={20} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        <Video size={20} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                    >
                                        <MoreVertical size={20} />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                                <AnimatePresence mode="popLayout">
                                    {messages.map((msg, idx) => (
                                        <MessageBubble
                                            key={msg.id || idx}
                                            message={msg}
                                            isMe={msg.senderId === userProfile.uid}
                                            index={idx}
                                        />
                                    ))}
                                </AnimatePresence>
                                <div ref={scrollRef} />
                            </div>

                            {/* Input Area */}
                            <motion.form
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                onSubmit={handleSend}
                                className="p-6 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-white/10"
                            >
                                <div className="flex items-end gap-3">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Type your message..."
                                            className="w-full px-5 py-4 pr-32 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                            >
                                                <Paperclip size={18} />
                                            </motion.button>
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                            >
                                                <ImageIcon size={18} />
                                            </motion.button>
                                            <motion.button
                                                type="button"
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                            >
                                                <Smile size={18} />
                                            </motion.button>
                                        </div>
                                    </div>
                                    <motion.button
                                        type="submit"
                                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(6, 182, 212, 0.3)" }}
                                        whileTap={{ scale: 0.95 }}
                                        disabled={!newMessage.trim()}
                                        className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        <Send size={20} />
                                    </motion.button>
                                </div>
                            </motion.form>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner"
                            >
                                <MessageCircle size={48} className="text-slate-400 dark:text-slate-500" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Select a Conversation</h3>
                            <p className="text-sm">Choose a chat from the sidebar to start messaging</p>
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
        </div>
    );
};

export default Messages;

