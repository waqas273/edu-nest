import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Edit2, User, Users, GraduationCap, BookOpen,
    Mail, Linkedin, Instagram, Save, X, Search,
    Briefcase, Sparkles, Building, Camera, Loader2, ImageIcon, UploadCloud, Download
} from 'lucide-react';
import { downloadSampleCSV } from '../../utils/csvSampleDownloader';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadToCloudinary, validateImageFile } from '../../utils/cloudinaryUpload';
import toast from 'react-hot-toast';

// Robust CSV Parser supporting quotes, escapes, and linebreaks
const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push("");
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') i++;
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== "") {
        lines.push(row);
    }
    return lines;
};

const ManagerFaculty = () => {
    const { currentUser } = useAuth();
    const [faculty, setFaculty] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editMode, setEditMode] = useState(null);
    const [uploading, setUploading] = useState(false);

    // CSV Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvRawLines, setCsvRawLines] = useState([]);
    const [mappingColumns, setMappingColumns] = useState({});
    const [parsedData, setParsedData] = useState([]);
    const [submitting, setSubmitting] = useState(false);

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

    // --- CSV IMPORT LOGIC ---
    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        if (!file || !file.name.endsWith('.csv')) {
            toast.error("Please upload a valid CSV file!");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = parseCSV(text);
            if (lines.length < 2) {
                toast.error("The CSV file seems to be empty or missing headers.");
                return;
            }

            const headers = lines[0].map(h => h.trim());
            setCsvHeaders(headers);
            setCsvRawLines(lines.slice(1));

            // Auto mapping
            const initialMap = {};
            headers.forEach((header, index) => {
                const hLower = header.toLowerCase();
                if (hLower.includes('name') || hLower.includes('full')) initialMap['fullName'] = index;
                else if (hLower.includes('designation') || hLower.includes('role')) initialMap['designation'] = index;
                else if (hLower.includes('bio') || hLower.includes('about')) initialMap['bio'] = index;
                else if (hLower.includes('email')) initialMap['email'] = index;
                else if (hLower.includes('linkedin')) initialMap['linkedin'] = index;
                else if (hLower.includes('instagram')) initialMap['instagram'] = index;
                else if (hLower.includes('publication')) initialMap['publications'] = index;
                else if (hLower.includes('education') || hLower.includes('degree')) initialMap['education'] = index;
                else if (hLower.includes('expert') || hLower.includes('skill')) initialMap['expertise'] = index;
                else if (hLower.includes('course') || hLower.includes('teach')) initialMap['courses'] = index;
            });
            setMappingColumns(initialMap);
        };
        reader.readAsText(file);
    };

    // Process mapped CSV lines to preview grid state
    useEffect(() => {
        if (csvRawLines.length === 0) return;

        const processed = csvRawLines.map((line, idx) => {
            const getVal = (field) => {
                const colIdx = mappingColumns[field];
                return colIdx !== undefined ? (line[colIdx] || '').trim() : '';
            };

            const parseArray = (str) => {
                if (!str) return [];
                return str.split(/[|;]/).map(item => item.trim()).filter(Boolean);
            };

            return {
                id: `preview-${idx}`,
                fullName: getVal('fullName') || 'Unnamed Faculty',
                designation: getVal('designation') || 'Faculty',
                bio: getVal('bio'),
                email: getVal('email'),
                linkedin: getVal('linkedin'),
                instagram: getVal('instagram'),
                publications: parseArray(getVal('publications')),
                education: parseArray(getVal('education')),
                expertise: parseArray(getVal('expertise')),
                courses: parseArray(getVal('courses')),
                profilePic: '', // Will be left blank for UI to show initials
            };
        });

        setParsedData(processed);
    }, [csvRawLines, mappingColumns]);

    const handleBatchSubmit = async () => {
        if (parsedData.length === 0) return;
        setSubmitting(true);

        try {
            const batchPromises = parsedData.map(async (f) => {
                const dataToSave = {
                    fullName: f.fullName,
                    designation: f.designation,
                    bio: f.bio,
                    profilePic: '',
                    socials: {
                        email: f.email,
                        linkedin: f.linkedin,
                        instagram: f.instagram
                    },
                    publications: f.publications,
                    education: f.education,
                    expertise: f.expertise,
                    courses: f.courses,
                    universityId: currentUser.uid,
                    createdAt: new Date()
                };
                return addDoc(collection(db, 'faculty'), dataToSave);
            });

            await Promise.all(batchPromises);
            setIsImportModalOpen(false);
            setCsvRawLines([]);
            setParsedData([]);
            toast.success(`${parsedData.length} faculty members imported successfully!`);
        } catch (error) {
            console.error("Failed to import faculty batch:", error);
            toast.error("Import failed.");
        } finally {
            setSubmitting(false);
        }
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
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <UploadCloud size={20} /> Import CSV
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all"
                    >
                        <Plus size={20} /> Add Faculty Member
                    </button>
                </div>
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

            {/* ===== CSV IMPORT MODAL ===== */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => { setIsImportModalOpen(false); setCsvRawLines([]); setParsedData([]); }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <UploadCloud size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Faculty via CSV</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Upload and map your faculty data</p>
                                    </div>
                                </div>
                                <button onClick={() => { setIsImportModalOpen(false); setCsvRawLines([]); setParsedData([]); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {csvRawLines.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-3xl bg-indigo-50 dark:bg-indigo-500/5 relative group transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-700">
                                        <input
                                            type="file" accept=".csv"
                                            onChange={handleFileDrop}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={28} className="text-indigo-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Faculty CSV</h3>
                                        <p className="text-sm text-slate-500 text-center max-w-sm mb-4">Drag and drop your CSV file here, or click to browse files.</p>
                                        {/* Premium Format Guide */}
                                        <div className="mt-8 w-full max-w-2xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm relative z-20">
                                            <div className="flex items-center gap-2 mb-4 justify-center">
                                                <Sparkles className="text-amber-500" size={16} />
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Optimal CSV Structure</span>
                                            </div>
                                            
                                            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                                                {/* Required */}
                                                {['Full Name', 'Designation'].map((header) => (
                                                    <div key={header} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                        {header}
                                                    </div>
                                                ))}
                                                {/* Recommended/Optional */}
                                                {['Email', 'Bio', 'Education', 'Expertise', 'Courses', 'Publications', 'LinkedIn', 'Instagram'].map((header) => (
                                                    <div key={header} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                                        {header}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-center items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Required Fields
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span> Optional Fields
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); downloadSampleCSV('faculty'); }}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer z-30"
                                                >
                                                    <Download size={14} />
                                                    Download Sample CSV Template
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Column Mapping Section */}
                                        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">1</div>
                                                Map Columns
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                                {['fullName', 'designation', 'email', 'publications', 'expertise'].map((field) => (
                                                    <div key={field} className="space-y-1">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field}</label>
                                                        <select
                                                            value={mappingColumns[field] !== undefined ? mappingColumns[field] : ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                                setMappingColumns(prev => ({ ...prev, [field]: val }));
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                                        >
                                                            <option value="">-- Ignore --</option>
                                                            {csvHeaders.map((header, idx) => (
                                                                <option key={idx} value={idx}>{header}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                                                {['bio', 'linkedin', 'instagram', 'education', 'courses'].map((field) => (
                                                    <div key={field} className="space-y-1">
                                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{field}</label>
                                                        <select
                                                            value={mappingColumns[field] !== undefined ? mappingColumns[field] : ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                                setMappingColumns(prev => ({ ...prev, [field]: val }));
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                                        >
                                                            <option value="">-- Ignore --</option>
                                                            {csvHeaders.map((header, idx) => (
                                                                <option key={idx} value={idx}>{header}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Preview Grid */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">2</div>
                                                    Data Preview <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{parsedData.length} entries</span>
                                                </h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {parsedData.slice(0, 12).map((member, i) => (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex flex-col gap-3">
                                                        <div className="flex gap-3">
                                                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                                                                {member.fullName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{member.fullName}</div>
                                                                <div className="text-xs text-indigo-600 dark:text-indigo-400 line-clamp-1">{member.designation}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                                                            {member.bio || 'No bio provided'}
                                                        </div>
                                                        {(member.expertise.length > 0 || member.education.length > 0) && (
                                                            <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                                                {member.expertise.slice(0, 2).map((tag, idx) => (
                                                                    <span key={idx} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium truncate max-w-[100px]">
                                                                        #{tag}
                                                                    </span>
                                                                ))}
                                                                {member.education.slice(0, 1).map((edu, idx) => (
                                                                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-medium flex items-center gap-1 truncate max-w-[120px]">
                                                                        <GraduationCap size={10} /> {edu}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {parsedData.length > 12 && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center flex-col text-slate-500">
                                                        <span className="text-xl font-bold">+{parsedData.length - 12}</span>
                                                        <span className="text-xs">more entries</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {csvRawLines.length > 0 && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                    <button
                                        onClick={() => { setCsvRawLines([]); setParsedData([]); }}
                                        disabled={submitting}
                                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
                                    >
                                        Reset File
                                    </button>
                                    <button
                                        onClick={handleBatchSubmit}
                                        disabled={parsedData.length === 0 || submitting}
                                        className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {submitting ? 'Importing...' : `Import ${parsedData.length} Faculty`}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagerFaculty;
