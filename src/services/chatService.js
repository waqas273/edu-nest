import { db } from '../firebase';
import {
    collection, addDoc, query, where, getDocs,
    onSnapshot, orderBy, serverTimestamp, doc, updateDoc
} from 'firebase/firestore';

export const createChat = async (participants, names) => {
    // Check if chat exists
    const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', participants[0])
    );
    const snapshot = await getDocs(q);

    // Simple 2-person chat check (A bit naive, but works for demo)
    const existing = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(participants[1]);
    });

    if (existing) return existing.id;

    // Create new
    const docRef = await addDoc(collection(db, 'chats'), {
        participants,
        names, // Store names for easy UI rendering
        lastMessage: '',
        lastMessageTime: serverTimestamp()
    });
    return docRef.id;
};

export const sendMessage = async (chatId, text, senderId) => {
    // Add to messages subcollection
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
        text,
        senderId,
        createdAt: serverTimestamp()
    });

    // Update main chat doc
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp()
    });
};

export const subscribeToChats = (userId, callback) => {
    const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageTime', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(chats);
    });
};

export const subscribeToMessages = (chatId, callback) => {
    const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    });
};
