import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, Globe, Mail, FileText, Hash, Send, Upload, X, Image as ImageIcon, Loader2, Camera } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { uploadToCloudinary, uploadMultipleToCloudinary, validateImageFile } from '../utils/uploadToCloudinary';

const UniversityOnboarding = () => {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [formData, setFormData] = useState({
        universityName: '',
        location: '',
        website: '',
        officialEmail: '',
        description: '',
        licenseNumber: ''
    });

    // Logo state
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Infrastructure images state
    const [infrastructureFiles, setInfrastructureFiles] = useState([]);
    const [infrastructurePreviews, setInfrastructurePreviews] = useState([]);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    // Handle Logo Selection
    const handleLogoSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setError('');
    };

    const removeLogo = () => {
        setLogoFile(null);
        setLogoPreview(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    // Handle Infrastructure Images Selection
    const handleInfrastructureSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Validate each file
        for (const file of files) {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setError(`${file.name}: ${validation.error}`);
                return;
            }
        }

        // Limit to 10 images
        const totalFiles = infrastructureFiles.length + files.length;
        if (totalFiles > 10) {
            setError('Maximum 10 infrastructure images allowed');
            return;
        }

        // Add to state
        setInfrastructureFiles(prev => [...prev, ...files]);
        const newPreviews = files.map(f => URL.createObjectURL(f));
        setInfrastructurePreviews(prev => [...prev, ...newPreviews]);
        setError('');

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeInfrastructureImage = (index) => {
        setInfrastructureFiles(prev => prev.filter((_, i) => i !== index));
        setInfrastructurePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let logoUrl = null;
            let infrastructureUrls = [];

            // Upload logo if selected
            if (logoFile) {
                setUploadProgress({ current: 0, total: 1 + infrastructureFiles.length });
                try {
                    logoUrl = await uploadToCloudinary(logoFile, 'edunest/university-logos');
                    setUploadProgress(prev => ({ ...prev, current: 1 }));
                } catch (uploadError) {
                    setError('Failed to upload logo. Please try again.');
                    setLoading(false);
                    return;
                }
            }

            // Upload infrastructure images if selected
            if (infrastructureFiles.length > 0) {
                try {
                    infrastructureUrls = await uploadMultipleToCloudinary(
                        infrastructureFiles,
                        'edunest/university-infrastructure',
                        (current, total) => setUploadProgress({ current: (logoFile ? 1 : 0) + current, total: (logoFile ? 1 : 0) + total })
                    );
                } catch (uploadError) {
                    setError('Failed to upload infrastructure images. Please try again.');
                    setLoading(false);
                    return;
                }
            }

            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                ...formData,
                ...(logoUrl && { universityLogo: logoUrl }),
                ...(infrastructureUrls.length > 0 && { infrastructureImages: infrastructureUrls }),
                profileCompleted: true,
                status: 'pending',
                applicationDate: serverTimestamp()
            });

            navigate('/approval-status');

            setTimeout(() => {
                if (window.location.pathname !== '/approval-status') {
                    window.location.href = '/approval-status';
                }
            }, 500);
        } catch (error) {
            console.error('Error submitting onboarding form:', error);
            setError('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
            setUploadProgress({ current: 0, total: 0 });
        }
    };

    const isUploading = loading && uploadProgress.total > 0;

    return (
        <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-3xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl mb-6 shadow-xl shadow-blue-500/20">
                        <Building2 className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">University Onboarding</h1>
                    <p className="text-slate-400 text-lg">Tell us more about your institution to get started.</p>
                </motion.div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* University Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    <Building2 size={16} className="mr-2 text-blue-400" />
                                    University Name
                                </label>
                                <input
                                    required
                                    name="universityName"
                                    value={formData.universityName}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            {/* Location */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    <MapPin size={16} className="mr-2 text-blue-400" />
                                    Location
                                </label>
                                <input
                                    required
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="City, Country"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            {/* Website */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    <Globe size={16} className="mr-2 text-blue-400" />
                                    Website
                                </label>
                                <input
                                    required
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://www.university.edu"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>

                            {/* Official Email */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 flex items-center">
                                    <Mail size={16} className="mr-2 text-blue-400" />
                                    Official Email
                                </label>
                                <input
                                    required
                                    type="email"
                                    name="officialEmail"
                                    value={formData.officialEmail}
                                    onChange={handleChange}
                                    placeholder="contact@university.edu"
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>

                        {/* License Number */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                <Hash size={16} className="mr-2 text-blue-400" />
                                License / Registration Number
                            </label>
                            <input
                                required
                                name="licenseNumber"
                                value={formData.licenseNumber}
                                onChange={handleChange}
                                placeholder="Registration ID"
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        {/* University Logo Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                <Camera size={16} className="mr-2 text-blue-400" />
                                University Logo
                            </label>
                            <div className="flex items-center gap-4">
                                {logoPreview ? (
                                    <div className="relative">
                                        <img
                                            src={logoPreview}
                                            alt="Logo Preview"
                                            crossOrigin="anonymous"
                                            className="w-20 h-20 rounded-xl object-cover border-2 border-blue-500/30"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeLogo}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => logoInputRef.current?.click()}
                                        className="w-20 h-20 rounded-xl bg-slate-800/50 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition"
                                    >
                                        <Upload size={24} className="text-slate-500" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition text-sm font-medium"
                                    >
                                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                    </button>
                                    <p className="text-xs text-slate-500 mt-1">JPEG, PNG • Max 5MB</p>
                                </div>
                            </div>
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={handleLogoSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Infrastructure Images Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                <ImageIcon size={16} className="mr-2 text-blue-400" />
                                Infrastructure Images
                                <span className="ml-2 text-xs text-slate-500">({infrastructureFiles.length}/10)</span>
                            </label>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-500/50 hover:bg-white/5 transition cursor-pointer text-center"
                            >
                                <Upload size={32} className="mx-auto mb-2 text-blue-400" />
                                <p className="text-sm text-slate-300 font-medium">
                                    Click to upload infrastructure images
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    JPEG, PNG, GIF, WebP • Max 5MB each • Up to 10 images
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                multiple
                                onChange={handleInfrastructureSelect}
                                className="hidden"
                            />

                            {/* Image Previews Grid */}
                            <AnimatePresence>
                                {infrastructurePreviews.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="grid grid-cols-4 md:grid-cols-5 gap-3 mt-4"
                                    >
                                        {infrastructurePreviews.map((preview, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="relative group"
                                            >
                                                <img
                                                    src={preview}
                                                    alt={`Infrastructure ${index + 1}`}
                                                    crossOrigin="anonymous"
                                                    className="w-full aspect-square rounded-xl object-cover border border-white/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeInfrastructureImage(index)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 flex items-center">
                                <FileText size={16} className="mr-2 text-blue-400" />
                                Institutional Description
                            </label>
                            <textarea
                                required
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Briefly describe your university's mission and programs..."
                                className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                            />
                        </div>

                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
                                >
                                    <X className="text-red-400 flex-shrink-0" size={20} />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Upload Progress */}
                        {isUploading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-blue-400 font-medium">
                                        Uploading images... ({uploadProgress.current}/{uploadProgress.total})
                                    </span>
                                    <Loader2 size={16} className="animate-spin text-blue-400" />
                                </div>
                                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>{isUploading ? 'Uploading Images...' : 'Submitting...'}</span>
                                </>
                            ) : (
                                <>
                                    <span>Submit Application</span>
                                    <Send size={20} />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UniversityOnboarding;
