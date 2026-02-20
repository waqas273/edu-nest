import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Edit2, User, Users, GraduationCap, BookOpen,
    Mail, Linkedin, Instagram, Save, X, Search,
    Briefcase, Sparkles, Building, Camera, Loader2, ImageIcon
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary, validateImageFile } from '../../utils/cloudinaryUpload';
import toast from 'react-hot-toast';

const ManagerFaculty = () => {
    const { currentUser } = useAuth();
    const [faculty, setFaculty] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editMode, setEditMode] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Initial Form State
    const initialFormState = {
        fullName: '',
        designation: '',
        profilePic: '', // Will store Cloudinary URL
        bio: '',
        publications: [],
        education: [],
        expertise: [],
        courses: [],
        socials: { email: '', linkedin: '', instagram: '' }
    };

    const [formData, setFormData] = useState(initialFormState);

    // Dynamic Input States
    const [newExpertise, setNewExpertise] = useState('');
    const [newCourse, setNewCourse] = useState('');
    const [newEducation, setNewEducation] = useState('');

    // Image Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'faculty'),
            where('universityId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const facultyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFaculty(facultyData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleOpenModal = (member = null) => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (member) {
            setEditMode(member.id);
            setFormData(member);
            setPreviewUrl(member.profilePic);
        } else {
            setEditMode(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
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
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let finalPhotoUrl = formData.profilePic;

            if (selectedFile) {
                try {
                    finalPhotoUrl = await uploadToCloudinary(selectedFile);
                } catch (error) {
                    console.error("Image upload failed:", error);
                    toast.error("Failed to upload image.");
                    setUploading(false);
                    return;
                }
            }

            const dataToSave = {
                ...formData,
                profilePic: finalPhotoUrl,
                universityId: currentUser.uid
            };

            if (editMode) {
                await updateDoc(doc(db, 'faculty', editMode), dataToSave);
                toast.success("Faculty member updated!");
            } else {
                await addDoc(collection(db, 'faculty'), {
                    ...dataToSave,
                    createdAt: new Date()
                });
                toast.success("New faculty member added!");
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving faculty:", error);
            toast.error("Failed to save faculty member.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this faculty member?")) {
            await deleteDoc(doc(db, 'faculty', id));
            toast.success("Faculty member removed.");
        }
    };

    // Helper functions for dynamic arrays
    const addItem = (field, value, resetFn) => {
        if (!value) return;
        setFormData(prev => ({ ...prev, [field]: [...prev[field], value] }));
        resetFn('');;
    };

    const removeItem = (field, index) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const filteredFaculty = faculty.filter(f =>
        f.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="text-indigo-500" /> Faculty Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your university's academic staff and researchers</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                    <Plus size={20} /> Add Faculty Member
                </button>
            </header>

            {/* Search */}
            <div className="relative max-w-md mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search faculty by name or designation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all dark:text-white"
                />
            </div>

            {/* Faculty Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading faculty...</div>
            ) : filteredFaculty.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <User size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Faculty Added Yet</h3>
                    <p className="text-slate-500 dark:text-slate-500">Start building your team by adding faculty members.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredFaculty.map(member => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300"
                        >
                            {/* Card Header & Bio */}
                            <div className="p-6 pb-0">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 shadow-lg shrink-0">
                                            {member.profilePic ? (
                                                <img src={member.profilePic} alt={member.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-xl">
                                                    {member.fullName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {member.fullName}
                                                {member.editMode && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">Editing</span>}
                                            </h3>
                                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{member.designation}</p>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(member)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-indigo-500 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(member.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 italic">
                                    "{member.bio || 'No biography available.'}"
                                </p>

                                {/* Expertise Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {member.expertise?.slice(0, 3).map((tag, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-md border border-slate-200 dark:border-slate-700">
                                            #{tag}
                                        </span>
                                    ))}
                                    {member.expertise?.length > 3 && (
                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 rounded-md">+{member.expertise.length - 3}</span>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 dark:bg-slate-800" />

                            {/* Details Grid */}
                            <div className="bg-slate-50/50 dark:bg-white/5 p-6 space-y-4">
                                {/* Education */}
                                <div className="flex gap-3">
                                    <GraduationCap size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Education</h4>
                                        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                                            {member.education?.slice(0, 2).map((edu, i) => (
                                                <li key={i} className="line-clamp-1">{edu}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Courses */}
                                <div className="flex gap-3">
                                    <BookOpen size={18} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Courses Taught</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {member.courses?.length > 0 ? member.courses.map((course, i) => (
                                                <span key={i} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded">
                                                    {course}
                                                </span>
                                            )) : <span className="text-xs text-slate-400">No active courses</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Socials */}
                                <div className="flex gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
                                    {member.socials?.email && (
                                        <a href={`mailto:${member.socials.email}`} className="text-slate-400 hover:text-indigo-500 transition-colors">
                                            <Mail size={18} />
                                        </a>
                                    )}
                                    {member.socials?.linkedin && (
                                        <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                                            <Linkedin size={18} />
                                        </a>
                                    )}
                                    {member.socials?.instagram && (
                                        <a href={member.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">
                                            <Instagram size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="sticky top-0 bg-white dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center z-10">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {editMode ? 'Edit Faculty Member' : 'Add New Faculty Member'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                        <User size={16} /> Basic Information
                                    </h3>

                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Image Upload Column */}
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative group">
                                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg bg-slate-200 dark:bg-slate-800">
                                                    {previewUrl ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                            crossOrigin="anonymous"
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
                                            <p className="text-xs text-slate-500">Profile Picture</p>
                                        </div>

                                        {/* Text Inputs */}
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.fullName}
                                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g. Dr. Ahmad Khan"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Designation</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.designation}
                                                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="e.g. Associate Professor"
                                                />
                                            </div>
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Biography (2-3 lines)</label>
                                                <textarea
                                                    rows={3}
                                                    value={formData.bio}
                                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Brief intro about the professional career..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expertise & Education */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                        <GraduationCap size={16} /> Academic Branding
                                    </h3>

                                    {/* Expertise Tags */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Expertise Tags</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newExpertise}
                                                onChange={e => setNewExpertise(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="e.g. Machine Learning"
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('expertise', newExpertise, setNewExpertise))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addItem('expertise', newExpertise, setNewExpertise)}
                                                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-200"
                                            >Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.expertise.map((tag, i) => (
                                                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                                                    #{tag}
                                                    <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('expertise', i)} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Education List */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Education (Top Degrees)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newEducation}
                                                onChange={e => setNewEducation(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="e.g. PhD from Oxford University"
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('education', newEducation, setNewEducation))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addItem('education', newEducation, setNewEducation)}
                                                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-200"
                                            >Add</button>
                                        </div>
                                        <ul className="space-y-1 mt-2">
                                            {formData.education.map((edu, i) => (
                                                <li key={i} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-white/5 rounded-lg">
                                                    <span className="text-slate-700 dark:text-slate-300">{edu}</span>
                                                    <X size={14} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeItem('education', i)} />
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Smart Widgets & Engagement */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles size={16} /> Engagement & Widgets
                                    </h3>

                                    {/* Courses Taught */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Courses Taught</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCourse}
                                                onChange={e => setNewCourse(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="e.g. Introduction to AI"
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem('courses', newCourse, setNewCourse))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addItem('courses', newCourse, setNewCourse)}
                                                className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-200"
                                            >Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.courses.map((course, i) => (
                                                <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md">
                                                    {course}
                                                    <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItem('courses', i)} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Social Links */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <Mail size={14} /> Email
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.socials.email}
                                                onChange={e => setFormData({ ...formData, socials: { ...formData.socials, email: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="Official Email"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <Linkedin size={14} /> LinkedIn
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.socials.linkedin}
                                                onChange={e => setFormData({ ...formData, socials: { ...formData.socials, linkedin: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <Instagram size={14} /> Instagram
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.socials.instagram}
                                                onChange={e => setFormData({ ...formData, socials: { ...formData.socials, instagram: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="Profile URL"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {editMode ? 'Update Faculty' : 'Save Faculty'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagerFaculty;
