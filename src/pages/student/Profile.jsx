import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Phone, BookOpen, MapPin, Camera, Save, Loader2, CheckCircle, AlertCircle, Instagram, Linkedin, Github, Globe } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../firebase';

const Profile = () => {
    const { currentUser, userProfile, uploadProfileImage } = useAuth();

    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        academicHistory: '',
        city: '',
        socialLinks: {
            instagram: '',
            linkedin: '',
            github: '',
            website: ''
        }
    });
    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null

    // Initialize form data from existing profile
    useEffect(() => {
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                academicHistory: userProfile.academicHistory || '',
                city: userProfile.city || '',
                socialLinks: {
                    instagram: userProfile.socialLinks?.instagram || '',
                    linkedin: userProfile.socialLinks?.linkedin || '',
                    github: userProfile.socialLinks?.github || '',
                    website: userProfile.socialLinks?.website || ''
                }
            });
            if (userProfile.photoURL) {
                setPreviewUrl(userProfile.photoURL);
            }
        }
    }, [userProfile]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentUser?.uid) {
            console.error("No user logged in");
            setSaveStatus('error');
            return;
        }

        setIsSaving(true);
        setSaveStatus(null);

        try {
            let photoURL = userProfile?.photoURL || '';

            // Step 1: Upload Image if changed
            if (profileImage) {
                try {
                    photoURL = await uploadProfileImage(currentUser.uid, profileImage);
                } catch (uploadError) {
                    console.error("Image upload failed:", uploadError);
                    // Continue with existing photo URL
                    photoURL = userProfile?.photoURL || '';
                }
            }

            // Step 2: SANITIZE DATA - Replace undefined with empty strings
            // Firestore REJECTS undefined values
            const sanitizedData = {
                fullName: formData.fullName || '',
                phone: formData.phone || '',
                academicHistory: formData.academicHistory || '',
                city: formData.city || '',
                photoURL: photoURL || '',
                socialLinks: {
                    instagram: formData.socialLinks.instagram || '',
                    linkedin: formData.socialLinks.linkedin || '',
                    github: formData.socialLinks.github || '',
                    website: formData.socialLinks.website || ''
                },
                updatedAt: new Date().toISOString()
            };

            // Double check: remove any remaining undefined/null values
            Object.keys(sanitizedData).forEach(key => {
                if (sanitizedData[key] === undefined || sanitizedData[key] === null) {
                    sanitizedData[key] = '';
                }
            });

            console.log("Saving profile data:", sanitizedData); // Debug log

            // Step 3: Update Firestore Document
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, sanitizedData);

            // Step 4: Update Firebase Auth Profile (displayName & photoURL)
            if (auth.currentUser) {
                try {
                    await updateProfile(auth.currentUser, {
                        displayName: sanitizedData.fullName || auth.currentUser.displayName || '',
                        photoURL: sanitizedData.photoURL || auth.currentUser.photoURL || ''
                    });
                } catch (authError) {
                    console.warn("Auth profile update failed (non-critical):", authError);
                    // This is non-critical, continue showing success
                }
            }

            setSaveStatus('success');

            // Clear success message after 3 seconds
            setTimeout(() => setSaveStatus(null), 3000);

        } catch (err) {
            console.error("Profile update error:", err);
            console.error("Error code:", err.code);
            console.error("Error message:", err.message);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden"
            >
                {/* Header / Cover Area */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                <div className="px-8 pb-8">
                    <div className="relative flex items-end -mt-12 mb-6">
                        {/* Profile Picture Upload */}
                        <div className="relative group">
                            <div className="h-32 w-32 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User size={48} className="text-slate-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition transform hover:scale-105">
                                <Camera size={18} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>

                        <div className="ml-6 mb-2">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                                {userProfile?.fullName || 'Student Name'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 capitalize">{userProfile?.role}</p>
                        </div>
                    </div>

                    {/* Status Messages */}
                    {saveStatus === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3"
                        >
                            <CheckCircle size={20} className="text-green-500" />
                            <span className="text-green-500 font-medium">Profile updated successfully!</span>
                        </motion.div>
                    )}

                    {saveStatus === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
                        >
                            <AlertCircle size={20} className="text-red-500" />
                            <span className="text-red-500 font-medium">Failed to update profile. Please try again.</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                                Personal Information
                            </h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Enter your full name"
                                />
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="+92 300 0000000"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Academic History</label>
                            <div className="relative">
                                <textarea
                                    rows="3"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. BS Computer Science - GIFT University (2020-2024)"
                                    value={formData.academicHistory}
                                    onChange={(e) => setFormData({ ...formData, academicHistory: e.target.value })}
                                />
                                <BookOpen className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City / Location</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Gujranwala, Pakistan"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 mt-2">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                                Social Profiles <span className="text-sm font-normal text-slate-500 ml-2">(Optional)</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instagram</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="https://instagram.com/username"
                                            value={formData.socialLinks.instagram}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                                            })}
                                        />
                                        <Instagram className="absolute left-3 top-2.5 text-pink-500" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">LinkedIn</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="https://linkedin.com/in/username"
                                            value={formData.socialLinks.linkedin}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                                            })}
                                        />
                                        <Linkedin className="absolute left-3 top-2.5 text-blue-600" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GitHub</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="https://github.com/username"
                                            value={formData.socialLinks.github}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                socialLinks: { ...formData.socialLinks, github: e.target.value }
                                            })}
                                        />
                                        <Github className="absolute left-3 top-2.5 text-slate-700 dark:text-white" size={18} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                                    <div className="relative">
                                        <input
                                            type="url"
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="https://yourwebsite.com"
                                            value={formData.socialLinks.website}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                socialLinks: { ...formData.socialLinks, website: e.target.value }
                                            })}
                                        />
                                        <Globe className="absolute left-3 top-2.5 text-emerald-500" size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" size={18} />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2" size={18} />
                                        Save Profile
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
