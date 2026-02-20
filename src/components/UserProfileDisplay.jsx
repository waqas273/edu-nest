import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'lucide-react';

/**
 * UserProfileDisplay - Reusable component to display user info
 * Always fetches LIVE data from Firestore to ensure consistency
 * 
 * @param {string} userId - The user's UID to fetch
 * @param {object} timestamp - Optional Firestore timestamp to display
 * @param {string} size - 'sm' | 'md' | 'lg' for avatar size
 */
const UserProfileDisplay = ({ userId, timestamp, size = 'md' }) => {
    const [userData, setUserData] = useState(null);
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
                    setUserData(userDoc.data());
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId]);

    // Size configurations
    const sizeClasses = {
        sm: { avatar: 'w-8 h-8', text: 'text-xs', icon: 14 },
        md: { avatar: 'w-10 h-10', text: 'text-sm', icon: 18 },
        lg: { avatar: 'w-12 h-12', text: 'text-base', icon: 22 }
    };

    const config = sizeClasses[size] || sizeClasses.md;

    // Format timestamp
    const formatTime = (ts) => {
        if (!ts) return null;
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex items-center gap-3 animate-pulse">
                <div className={`${config.avatar} rounded-full bg-slate-200 dark:bg-white/10`} />
                <div className="space-y-1">
                    <div className="h-3 w-20 bg-slate-200 dark:bg-white/10 rounded" />
                    {timestamp && <div className="h-2 w-16 bg-slate-200 dark:bg-white/5 rounded" />}
                </div>
            </div>
        );
    }

    // Get initials for fallback avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const displayName = userData?.fullName || userData?.displayName || userData?.universityName || 'Anonymous';
    const photoURL = userData?.photoURL;

    return (
        <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`${config.avatar} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-cyan-500/20 dark:to-purple-500/20 border border-slate-300 dark:border-white/10 flex items-center justify-center shadow-sm`}>
                {photoURL ? (
                    <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-slate-600 dark:text-white font-bold" style={{ fontSize: config.icon * 0.7 }}>
                        {getInitials(displayName)}
                    </span>
                )}
            </div>

            {/* Name & Time */}
            <div className="min-w-0">
                <p className={`font-bold text-slate-900 dark:text-white truncate ${config.text}`}>
                    {displayName}
                </p>
                {timestamp && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(timestamp)}
                    </p>
                )}
            </div>
        </div>
    );
};

export default UserProfileDisplay;
