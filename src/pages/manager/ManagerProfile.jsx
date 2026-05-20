import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Building, MapPin, Phone,
    Globe, Mail, Save, Loader2, Camera,
    ArrowLeft, ShieldCheck, Sparkles, Upload,
    Image as ImageIcon, X, UploadCloud,
    Instagram, Linkedin, Github
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../../utils/cloudinaryUpload';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import LeafletLocationPicker from '../../components/LeafletLocationPicker';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ManagerProfile = () => {
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const navigate = useNavigate();
    const infrastructureInputRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        universityName: '',
        location: '',
        latitude: null,
        longitude: null,
        city: '',
        phone: '',
        website: '',
        description: '',
        fullName: '',
        socialLinks: {
            instagram: '',
            linkedin: '',
            github: '',
            website: ''
        }
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    // Infrastructure images state
    const [infrastructureFiles, setInfrastructureFiles] = useState([]);
    const [infrastructurePreviews, setInfrastructurePreviews] = useState([]);
    const [existingInfrastructureImages, setExistingInfrastructureImages] = useState([]);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                universityName: userProfile.universityName || '',
                location: userProfile.location || '',
                latitude: userProfile.latitude || null,
                longitude: userProfile.longitude || null,
                city: userProfile.city || '',
                phone: userProfile.phone || '',
                website: userProfile.website || '',
                description: userProfile.description || '',
                fullName: userProfile.fullName || '',
                socialLinks: {
                    instagram: userProfile.socialLinks?.instagram || '',
                    linkedin: userProfile.socialLinks?.linkedin || '',
                    github: userProfile.socialLinks?.github || '',
                    website: userProfile.socialLinks?.website || ''
                }
            });
            setImagePreview(userProfile.photoURL || '');
            setExistingInfrastructureImages(userProfile.infrastructureImages || []);
            setLoading(false);
        }
    }, [userProfile]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be less than 5MB');
                return;
            }
            setImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    // Handle Infrastructure Images Selection
    const handleInfrastructureSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validate each file
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                alert(`${file.name} is not an image file`);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`${file.name} is larger than 5MB`);
                return;
            }
        }

        // Limit to 10 total images
        const totalFiles = existingInfrastructureImages.length + infrastructureFiles.length + files.length;
        if (totalFiles > 10) {
            alert('Maximum 10 infrastructure images allowed');
            return;
        }

        setInfrastructureFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setInfrastructurePreviews(prev => [...prev, ...newPreviews]);

        if (infrastructureInputRef.current) infrastructureInputRef.current.value = '';
    };

    const removeNewInfrastructureImage = (index) => {
        setInfrastructureFiles(prev => prev.filter((_, i) => i !== index));
        setInfrastructurePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingInfrastructureImage = (index) => {
        setExistingInfrastructureImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setIsUploadingImage(false);

        try {
            let photoURL = userProfile?.photoURL || '';
            let infrastructureUrls = [...existingInfrastructureImages];

            // Upload profile image to Cloudinary if new file selected
            if (imageFile) {
                setIsUploadingImage(true);
                setUploadProgress('Uploading profile picture...');
                try {
                    photoURL = await uploadToCloudinary(imageFile);
                } catch (uploadError) {
                    console.error('Profile image upload error:', uploadError);
                    alert('Failed to upload profile image. Please try again.');
                    setIsSaving(false);
                    setIsUploadingImage(false);
                    return;
                }
            }

            // Upload infrastructure images to Cloudinary if any new files
            if (infrastructureFiles.length > 0) {
                setIsUploadingImage(true);
                setUploadProgress(`Uploading ${infrastructureFiles.length} infrastructure images...`);
                try {
                    const newUrls = await uploadMultipleToCloudinary(infrastructureFiles);
                    infrastructureUrls = [...infrastructureUrls, ...newUrls];
                } catch (uploadError) {
                    console.error('Infrastructure images upload error:', uploadError);
                    alert('Failed to upload infrastructure images. Please try again.');
                    setIsSaving(false);
                    setIsUploadingImage(false);
                    return;
                }
            }

            setUploadProgress('Saving profile...');

            await updateUserProfile(currentUser.uid, {
                ...formData,
                photoURL: photoURL,
                profilePictureUrl: photoURL,
                infrastructureImages: infrastructureUrls,
                profileCompleted: true,
                lastUpdated: new Date().toISOString()
            });

            // Reset file states
            setImageFile(null);
            setInfrastructureFiles([]);
            setInfrastructurePreviews([]);
            setExistingInfrastructureImages(infrastructureUrls);

            alert("Profile Updated Successfully!");
        } catch (error) {
            console.error("Profile Update Error:", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
            setIsUploadingImage(false);
            setUploadProgress('');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
                <Loader2 size={48} className="animate-spin text-cyan-600 dark:text-cyan-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-10 transition-colors duration-500 relative">
            {/* Background Gradient Blob */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl mx-auto">
                {/* Header Navigation */}
                <div className="flex items-center space-x-4 mb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow-md transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                            University <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400">Identity</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Configure your public institutional profile.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Identity Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl dark:shadow-black/20"
                    >
                        {/* Banner */}
                        <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-b border-slate-200 dark:border-white/5" />

                        <div className="px-8 pb-8 flex flex-col md:flex-row items-center md:items-end -mt-16 gap-6 relative z-10">
                            {/* Avatar Upload */}
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-3xl bg-white dark:bg-slate-800 p-1 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10">
                                    <div className="w-full h-full rounded-[1.3rem] overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Profile" crossOrigin="anonymous" className="w-full h-full object-cover" />
                                        ) : (
                                            <Building size={40} className="text-slate-400 dark:text-slate-500" />
                                        )}
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer">
                                            <Camera className="text-white" size={24} />
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                                <div className="absolute -bottom-2 -right-2 bg-cyan-500 text-white p-2 rounded-xl shadow-lg pointer-events-none">
                                    <Sparkles size={14} fill="currentColor" />
                                </div>
                            </div>

                            {/* Text Info */}
                            <div className="flex-1 text-center md:text-left mb-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {formData.universityName || 'New University'}
                                </h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                                        <Mail size={14} className="mr-2 text-cyan-500" />
                                        {currentUser?.email}
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5",
                                        userProfile?.profileCompleted
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    )}>
                                        <ShieldCheck size={12} />
                                        {userProfile?.profileCompleted ? 'Verified Identity' : 'Setup Required'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Form Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Section 1: General Info */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="space-y-6"
                        >
                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                                Institutional Details
                            </h3>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">University Name</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium shadow-sm"
                                        value={formData.universityName}
                                        onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Campus Manager</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium shadow-sm"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                </div>
                            </div>

                            <div className="group col-span-full">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                                    <MapPin size={14} className="text-cyan-500" />
                                    Campus Location
                                    <span className="normal-case font-normal text-slate-400 ml-1">
                                        — click map or search to update
                                    </span>
                                </label>
                                <LeafletLocationPicker
                                    initialLat={formData.latitude || 30.3753}
                                    initialLng={formData.longitude || 69.3451}
                                    initialLocationText={formData.location}
                                    onLocationSelected={({ latitude, longitude, city, location }) =>
                                        setFormData(prev => ({ ...prev, latitude, longitude, location, city }))
                                    }
                                />
                            </div>
                        </motion.div>

                        {/* Section 2: Contact Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-6"
                        >
                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                                Public Contact
                            </h3>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Official Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                                    <input
                                        type="tel"
                                        className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium shadow-sm"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">Website URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                                    <input
                                        type="url"
                                        className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium shadow-sm"
                                        value={formData.website}
                                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        placeholder="https://"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">About Institution</label>
                                <textarea
                                    rows={4}
                                    className="w-full p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium shadow-sm resize-none leading-relaxed"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief overview of your university..."
                                />
                            </div>
                        </motion.div>
                    </div>



                    {/* Social Profiles Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-xl"
                    >
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Globe size={16} className="text-cyan-500" />
                            Social Presence
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                                    <Instagram size={14} /> Instagram
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 transition-all font-medium shadow-sm"
                                        value={formData.socialLinks.instagram}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            socialLinks: { ...formData.socialLinks, instagram: e.target.value }
                                        })}
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                                    <Linkedin size={14} /> LinkedIn
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium shadow-sm"
                                        value={formData.socialLinks.linkedin}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                                        })}
                                        placeholder="https://linkedin.com/in/..."
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                                    <Github size={14} /> GitHub
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500/20 transition-all font-medium shadow-sm"
                                        value={formData.socialLinks.github}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            socialLinks: { ...formData.socialLinks, github: e.target.value }
                                        })}
                                        placeholder="https://github.com/..."
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                                    <Globe size={14} /> Website
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium shadow-sm"
                                        value={formData.socialLinks.website}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            socialLinks: { ...formData.socialLinks, website: e.target.value }
                                        })}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl"
                    >
                        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ImageIcon size={16} className="text-cyan-500" />
                            Infrastructure Images
                            <span className="text-xs font-normal normal-case text-slate-400">
                                ({existingInfrastructureImages.length + infrastructureFiles.length}/10)
                            </span>
                        </h3>

                        {/* Upload Area */}
                        <div
                            onClick={() => infrastructureInputRef.current?.click()}
                            className="p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl hover:border-cyan-500/50 hover:bg-white/50 dark:hover:bg-white/5 transition-all cursor-pointer text-center mb-4"
                        >
                            <UploadCloud size={32} className="mx-auto mb-2 text-cyan-500" />
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                Click to upload infrastructure images
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                JPEG, PNG, GIF, WebP • Max 5MB each • Up to 10 images
                            </p>
                        </div>
                        <input
                            ref={infrastructureInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleInfrastructureSelect}
                            className="hidden"
                        />

                        {/* Image Previews Grid */}
                        <AnimatePresence>
                            {(existingInfrastructureImages.length > 0 || infrastructurePreviews.length > 0) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="grid grid-cols-3 md:grid-cols-5 gap-3"
                                >
                                    {/* Existing Images */}
                                    {existingInfrastructureImages.map((url, index) => (
                                        <motion.div
                                            key={`existing-${index}`}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative group aspect-square"
                                        >
                                            <img
                                                src={url}
                                                alt={`Infrastructure ${index + 1}`}
                                                crossOrigin="anonymous"
                                                className="w-full h-full rounded-xl object-cover border border-slate-200 dark:border-white/10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExistingInfrastructureImage(index)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500/90 text-white text-[9px] font-bold rounded uppercase">
                                                Saved
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* New Previews */}
                                    {infrastructurePreviews.map((preview, index) => (
                                        <motion.div
                                            key={`new-${index}`}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative group aspect-square"
                                        >
                                            <img
                                                src={preview}
                                                alt={`New ${index + 1}`}
                                                crossOrigin="anonymous"
                                                className="w-full h-full rounded-xl object-cover border-2 border-cyan-500/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeNewInfrastructureImage(index)}
                                                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                                            >
                                                <X size={12} />
                                            </button>
                                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-cyan-500/90 text-white text-[9px] font-bold rounded uppercase">
                                                New
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Upload Progress */}
                    {isUploadingImage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center gap-3"
                        >
                            <Loader2 size={20} className="animate-spin text-cyan-500" />
                            <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                                {uploadProgress}
                            </span>
                        </motion.div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-8 border-t border-slate-200 dark:border-white/10">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isSaving}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl flex items-center gap-3 disabled:opacity-50 transition-all"
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            <span>{isSaving ? (isUploadingImage ? 'Uploading...' : 'Saving...') : 'Save Profile'}</span>
                        </motion.button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default ManagerProfile;
