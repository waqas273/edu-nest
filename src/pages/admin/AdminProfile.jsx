import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    User, Mail, Camera, Save, Loader2, Shield,
    CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';
import { toast } from 'react-hot-toast';

const AdminProfile = () => {
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        photoURL: ''
    });
    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        if (currentUser) {
            setFormData({
                displayName: userProfile?.fullName || currentUser.displayName || '',
                email: currentUser.email || '',
                photoURL: userProfile?.profilePic || currentUser.photoURL || ''
            });
            setPreviewImage(userProfile?.profilePic || currentUser.photoURL || null);
        }
    }, [currentUser, userProfile]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let photoURL = formData.photoURL;

            // If a new file was selected (preview differs from original and file input has files)
            if (fileInputRef.current?.files[0]) {
                photoURL = await uploadToCloudinary(fileInputRef.current.files[0]);
            }

            // Ensure photoURL is never undefined
            const safePhotoURL = photoURL || '';

            // Update Firebase Auth Profile
            await updateProfile(currentUser, {
                displayName: formData.displayName,
                photoURL: safePhotoURL
            });

            // Update Firestore User Document
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                fullName: formData.displayName,
                profilePic: safePhotoURL,
                updatedAt: new Date()
            });

            // Note: Context usually auto-updates on auth change, 
            // but we might need to manually trigger a reload or just rely on the router/effect

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-2xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Shield size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Profile</h1>
                            <p className="text-slate-500 dark:text-slate-400">Manage your administrative identity</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Profile Picture Section */}
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl">
                                    <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                        {previewImage ? (
                                            <img
                                                src={previewImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                                onError={(e) => e.target.src = "https://placehold.co/400?text=Admin"}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <User size={48} />
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}>
                                            <Camera size={24} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-0 right-0 p-2.5 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-indigo-500 dark:text-indigo-400"
                                >
                                    <Camera size={18} />
                                </motion.button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Click to upload a new avatar (Max 5MB)
                            </p>
                        </div>

                        {/* Text Fields */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="Admin Name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 cursor-not-allowed"
                                        disabled
                                        title="Email cannot be changed"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <Shield size={16} className="text-emerald-500" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-500 ml-1">
                                    Email address is managed by the system and cannot be changed.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Saving Changes...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Profile
                                </>
                            )}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminProfile;
