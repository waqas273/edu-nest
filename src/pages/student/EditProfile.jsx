import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, Save, AlertTriangle, Loader2, ArrowLeft,
    User, Upload, Trash2, Plus, GraduationCap, X, ImageIcon, Mail,
    Globe, Linkedin, Github, Instagram
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadToCloudinary, validateImageFile } from '../../utils/cloudinaryUpload';
import toast from 'react-hot-toast';
import EducationSelector from '../../components/EducationSelector';

const EditProfile = () => {
    const navigate = useNavigate();
    const { currentUser, userProfile } = useAuth();
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Core Profile State
    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        photoURL: '',
        socialLinks: {
            instagram: '',
            linkedin: '',
            github: '',
            website: ''
        }
    });

    // Education State
    const [education, setEducation] = useState([]);

    // Image Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageError, setImageError] = useState(false);

    // Initial Data Load
    useEffect(() => {
        if (userProfile) {
            setFormData({
                displayName: userProfile.fullName || userProfile.displayName || currentUser?.displayName || '',
                bio: userProfile.bio || '',
                photoURL: userProfile.profilePic || userProfile.profilePictureUrl || currentUser?.photoURL || '',
                socialLinks: {
                    instagram: userProfile.socialLinks?.instagram || '',
                    linkedin: userProfile.socialLinks?.linkedin || '',
                    github: userProfile.socialLinks?.github || '',
                    website: userProfile.socialLinks?.website || ''
                }
            });

            // Parse Education (ensure it's an array)
            if (userProfile.educationHistory && Array.isArray(userProfile.educationHistory)) {
                // Map existing data to form structure (handle legacy field names)
                const loadedEdu = userProfile.educationHistory.map((item, idx) => ({
                    id: item.id || Date.now() + idx,
                    degree: item.degreeName || item.degree || '',
                    institute: item.instituteName || item.institute || '',
                    year: item.passingYear || item.year || '',
                    percentage: item.cgpa || item.percentage || '',
                    resultCardUrl: item.resultCard || item.resultCardUrl || '',
                    resultCardFile: null,
                    resultCardPreview: null
                }));
                setEducation(loadedEdu);
            }
        }
    }, [userProfile, currentUser]);

    // --- Handlers ---

    const handleChange = (e) => {
        if (e.target.name.startsWith('social_')) {
            const socialKey = e.target.name.replace('social_', '');
            setFormData({
                ...formData,
                socialLinks: {
                    ...formData.socialLinks,
                    [socialKey]: e.target.value
                }
            });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }

        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setImageError(false);
        // Clear manual URL input when file is selected
        setFormData(prev => ({ ...prev, photoURL: '' }));
    };

    const removeSelectedImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        // Restore original URL if exists
        setFormData(prev => ({
            ...prev,
            photoURL: userProfile?.profilePic || userProfile?.profilePictureUrl || currentUser?.photoURL || ''
        }));
    };

    // --- Education Handlers ---

    const handleAddEducation = () => {
        setEducation([
            ...education,
            {
                id: Date.now(),
                degree: '',
                institute: '',
                year: '',
                percentage: '',
                resultCardUrl: '',
                resultCardFile: null,
                resultCardPreview: null,
                isNew: true
            }
        ]);
    };

    const handleRemoveEducation = (id) => {
        if (window.confirm('Delete this education entry?')) {
            setEducation(education.filter(edu => edu.id !== id));
        }
    };

    const handleEducationChange = (id, field, value) => {
        setEducation(education.map(edu =>
            edu.id === id ? { ...edu, [field]: value } : edu
        ));
    };

    const handleEducationFile = (id, e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.isValid) {
            toast.error(validation.error);
            return;
        }

        const preview = URL.createObjectURL(file);
        setEducation(education.map(edu =>
            edu.id === id ? {
                ...edu,
                resultCardFile: file,
                resultCardPreview: preview
            } : edu
        ));
    };

    // --- Submit ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalPhotoUrl = formData.photoURL;

            // 1. Upload Main Profile Pic
            if (selectedFile) {
                setUploadingImage(true);
                try {
                    finalPhotoUrl = await uploadToCloudinary(selectedFile);
                } catch (uploadErr) {
                    console.error("Profile pic upload failed", uploadErr);
                    toast.error("Failed to upload profile picture");
                    setLoading(false);
                    setUploadingImage(false);
                    return;
                }
                setUploadingImage(false);
            }

            // 2. Upload Education Result Cards
            const processedEducation = await Promise.all(education.map(async (edu) => {
                let cardUrl = edu.resultCardUrl;

                if (edu.resultCardFile) {
                    try {
                        const uploaded = await uploadToCloudinary(edu.resultCardFile);
                        cardUrl = uploaded;
                    } catch (err) {
                        console.error(`Failed to upload result card for ${edu.degree}`, err);
                        toast.error(`Failed to upload result card for ${edu.degree}`);
                        // Continue implies we keep old URL or empty, depending on logic.
                    }
                }

                // Clean up object for Firestore (remove temp fields)
                return {
                    id: edu.id,
                    degreeName: edu.degree,
                    instituteName: edu.institute,
                    passingYear: edu.year,
                    cgpa: edu.percentage,
                    resultCard: cardUrl
                };
            }));

            // 3. Update Firebase Auth (Display Name & Photo)
            if (currentUser) {
                await updateProfile(currentUser, {
                    displayName: formData.displayName,
                    photoURL: finalPhotoUrl
                });
            }

            // 4. Update Firestore Profile
            const profileRef = doc(db, 'users', currentUser.uid);
            await setDoc(profileRef, {
                ...userProfile, // Merge existing
                fullName: formData.displayName,
                displayName: formData.displayName, // Redundant but safe
                bio: formData.bio,
                profilePic: finalPhotoUrl,
                photoURL: finalPhotoUrl, // Keep multiple fields synced for legacy support
                educationHistory: processedEducation,
                socialLinks: formData.socialLinks,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            toast.success("Profile updated successfully!");
            setTimeout(() => navigate('/student/profile'), 1000);

        } catch (error) {
            console.error("Update failed:", error);
            toast.error("Failed to update profile. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const currentPreview = previewUrl || formData.photoURL;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white pb-20 font-sans transition-colors duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/student/profile')}
                        className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
                        disabled={loading}
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Profile
                    </button>
                    <h1 className="text-lg font-bold">Edit Profile</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* SECTION 1: Basic Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <User className="text-indigo-500" /> Basic Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Profile Pic Column */}
                            <div className="md:col-span-1 flex flex-col items-center">
                                <div className="relative group mb-4">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-700 shadow-lg bg-slate-200 dark:bg-slate-800">
                                        {currentPreview && !imageError ? (
                                            <img
                                                src={currentPreview}
                                                alt="Preview"
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                                onError={() => setImageError(true)}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <ImageIcon size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition"
                                        title="Change Photo"
                                    >
                                        <Camera size={16} />
                                    </button>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {uploadingImage && <p className="text-xs text-indigo-500 animate-pulse">Uploading...</p>}
                            </div>

                            {/* Inputs Column */}
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="displayName"
                                        value={formData.displayName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Headline / Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                                        placeholder="Briefly describe your interests and goals..."
                                    />
                                    <p className="text-xs text-right text-slate-400 mt-1">{formData.bio.length}/200</p>
                                </div>
                            </div>
                        </div>

                        {/* Social Links Section */}
                        <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Social Profiles (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 flex items-center gap-2">
                                        <Instagram size={14} /> Instagram
                                    </label>
                                    <input
                                        type="url"
                                        name="social_instagram"
                                        value={formData.socialLinks.instagram}
                                        onChange={handleChange}
                                        placeholder="https://instagram.com/username"
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 flex items-center gap-2">
                                        <Linkedin size={14} /> LinkedIn
                                    </label>
                                    <input
                                        type="url"
                                        name="social_linkedin"
                                        value={formData.socialLinks.linkedin}
                                        onChange={handleChange}
                                        placeholder="https://linkedin.com/in/username"
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 flex items-center gap-2">
                                        <Github size={14} /> GitHub
                                    </label>
                                    <input
                                        type="url"
                                        name="social_github"
                                        value={formData.socialLinks.github}
                                        onChange={handleChange}
                                        placeholder="https://github.com/username"
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5 flex items-center gap-2">
                                        <Globe size={14} /> Website
                                    </label>
                                    <input
                                        type="url"
                                        name="social_website"
                                        value={formData.socialLinks.website}
                                        onChange={handleChange}
                                        placeholder="https://yourwebsite.com"
                                        className="w-full px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-sm transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* SECTION 2: Education History */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <GraduationCap className="text-indigo-500" /> Education History
                            </h2>
                            <button
                                type="button"
                                onClick={handleAddEducation}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <Plus size={16} /> Add Entry
                            </button>
                        </div>

                        <div className="space-y-6">
                            <AnimatePresence>
                                {education.map((edu, index) => (
                                    <motion.div
                                        key={edu.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 relative group"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEducation(edu.id)}
                                            className="absolute top-4 right-4 text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Remove"
                                        >
                                            <Trash2 size={18} />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                            <div className="md:col-span-2">
                                                <EducationSelector
                                                    value={edu.degree}
                                                    onChange={(val) => handleEducationChange(edu.id, 'degree', val)}
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Institute Name</label>
                                                <input
                                                    type="text"
                                                    value={edu.institute}
                                                    onChange={(e) => handleEducationChange(edu.id, 'institute', e.target.value)}
                                                    placeholder="e.g. Govt College Lahore"
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Year of Completion</label>
                                                <input
                                                    type="text"
                                                    value={edu.year}
                                                    onChange={(e) => handleEducationChange(edu.id, 'year', e.target.value)}
                                                    placeholder="e.g. 2024"
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Grade</label>
                                                <input
                                                    type="text"
                                                    value={edu.percentage}
                                                    onChange={(e) => handleEducationChange(edu.id, 'percentage', e.target.value)}
                                                    placeholder="e.g. 85%"
                                                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Result Card (Optional)</label>
                                                <div className="flex items-center gap-4">
                                                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                                                        <Upload size={16} className="text-slate-500" />
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Upload Image</span>
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleEducationFile(edu.id, e)} />
                                                    </label>

                                                    {(edu.resultCardPreview || edu.resultCardUrl) && (
                                                        <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden relative group/preview">
                                                            <img
                                                                src={edu.resultCardPreview || edu.resultCardUrl}
                                                                alt="Doc"
                                                                crossOrigin="anonymous"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {education.length === 0 && (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">No education records added yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/student/profile')}
                            className="px-6 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploadingImage}
                            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {loading ? 'Saving Changes...' : 'Save Profile'}
                        </button>
                    </div>

                </form >
            </div >
        </div >
    );
};

export default EditProfile;
