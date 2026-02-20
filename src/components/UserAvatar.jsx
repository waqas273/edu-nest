import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Smart Avatar Component
 * Displays user avatar with fallback to initials
 * Supports click-to-view profile functionality
 */

// Generate consistent color from name
const getAvatarColor = (name) => {
    const colors = [
        'from-cyan-500 to-blue-600',
        'from-purple-500 to-pink-600',
        'from-emerald-500 to-teal-600',
        'from-orange-500 to-red-600',
        'from-indigo-500 to-purple-600',
        'from-pink-500 to-rose-600',
        'from-amber-500 to-orange-600',
        'from-teal-500 to-cyan-600'
    ];

    if (!name) return colors[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name) => {
    if (!name) return '?';

    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Size configurations
const sizeConfig = {
    xs: {
        container: 'w-6 h-6',
        text: 'text-[10px]',
        icon: 10
    },
    sm: {
        container: 'w-8 h-8',
        text: 'text-xs',
        icon: 14
    },
    md: {
        container: 'w-10 h-10',
        text: 'text-sm',
        icon: 18
    },
    lg: {
        container: 'w-12 h-12',
        text: 'text-base',
        icon: 22
    },
    xl: {
        container: 'w-16 h-16',
        text: 'text-lg',
        icon: 28
    },
    '2xl': {
        container: 'w-20 h-20',
        text: 'text-xl',
        icon: 32
    },
    '3xl': {
        container: 'w-24 h-24',
        text: 'text-2xl',
        icon: 40
    }
};

const UserAvatar = ({
    userId,
    src,
    name,
    size = 'md',
    className = '',
    onClick,
    showOnlineStatus = false,
    isOnline = false,
    showBorder = false,
    interactive = true
}) => {
    const [imageError, setImageError] = useState(false);

    const config = sizeConfig[size] || sizeConfig.md;
    const initials = useMemo(() => getInitials(name), [name]);
    const gradientColor = useMemo(() => getAvatarColor(name), [name]);

    const hasValidImage = src && !imageError;

    const handleClick = () => {
        if (onClick && interactive) {
            onClick({ userId, name, src });
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <motion.div
            whileHover={interactive ? { scale: 1.05 } : undefined}
            whileTap={interactive ? { scale: 0.95 } : undefined}
            onClick={handleClick}
            className={cn(
                'relative rounded-full overflow-hidden flex-shrink-0',
                config.container,
                interactive && onClick && 'cursor-pointer',
                showBorder && 'ring-2 ring-white dark:ring-slate-800 shadow-lg',
                className
            )}
        >
            {hasValidImage ? (
                <img
                    src={src}
                    alt={name || 'User'}
                    crossOrigin="anonymous"
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div
                    className={cn(
                        'w-full h-full flex items-center justify-center bg-gradient-to-br text-white font-bold',
                        gradientColor,
                        config.text
                    )}
                >
                    {initials === '?' ? (
                        <User size={config.icon} />
                    ) : (
                        initials
                    )}
                </div>
            )}

            {/* Online Status Indicator */}
            {showOnlineStatus && (
                <div
                    className={cn(
                        'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-800',
                        size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3',
                        isOnline ? 'bg-green-500' : 'bg-slate-400'
                    )}
                />
            )}
        </motion.div>
    );
};

export default UserAvatar;
