import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    BookOpen, Plus, Trash2, X, Loader2, ArrowRight, GraduationCap,
    Clock, DollarSign, Search, Sparkles, Pencil, Trash, Layers,
    CheckCircle, Award, Calendar, Users
} from 'lucide-react';
import {
    collection, query, where, onSnapshot,
    addDoc, deleteDoc, doc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import EducationSelector from '../../components/EducationSelector';
import ScholarshipManager from '../../components/ScholarshipManager';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Ultra-Premium Program Card with Magnetic Hover
const ProgramCard = ({ program, onEdit, onDelete, onView, index }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-200, 200], [5, -5]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-5, 5]), { stiffness: 300, damping: 30 });

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.03
            }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative h-full perspective-1000"
        >
            <motion.div
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                className={cn(
                    "relative h-full overflow-hidden rounded-3xl transition-all duration-500",
                    // Enhanced light mode - solid white background with strong shadow
                    "bg-white dark:bg-slate-800/90",
                    // Stronger border visibility
                    "border-2 border-slate-200 dark:border-slate-600/50",
                    // Premium shadow for both modes
                    "shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)]",
                    "dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                )}
            >
                {/* Top Gradient Bar - Always visible */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />

                {/* Card Glow Effect on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />

                <div className="p-6 flex flex-col h-full relative z-10">
                    {/* Icon & Badge */}
                    <div className="flex justify-between items-start mb-4">
                        <motion.div
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center",
                                // Enhanced icon background
                                "bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-500/20 dark:to-blue-500/20",
                                "border-2 border-cyan-200 dark:border-cyan-500/30",
                                "shadow-lg shadow-cyan-500/10"
                            )}
                        >
                            <GraduationCap className="text-cyan-600 dark:text-cyan-400" size={28} />
                        </motion.div>

                        {program.scholarships?.length > 0 && (
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20, delay: index * 0.05 + 0.2 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-500/20 dark:to-amber-500/20 border-2 border-yellow-300 dark:border-yellow-500/30 shadow-lg shadow-yellow-500/20"
                            >
                                <Sparkles className="text-yellow-600 dark:text-yellow-400" size={12} fill="currentColor" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-700 dark:text-yellow-400">Scholarship</span>
                            </motion.div>
                        )}
                    </div>

                    {/* Type & Title */}
                    <div className="mb-4">
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.1 }}
                            className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1.5"
                        >
                            {program.degreeType} • Program
                        </motion.p>
                        <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 + 0.15 }}
                            className="text-xl font-bold text-slate-800 dark:text-white leading-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2"
                        >
                            {program.title}
                        </motion.h3>
                    </div>

                    {/* Meta Info with Icons */}
                    <div className="space-y-2.5 mb-6">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.2 }}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-medium"
                        >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                                <Clock size={14} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span>{program.duration} • {program.totalSemesters} Semesters</span>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 + 0.25 }}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-medium"
                        >
                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                                <DollarSign size={14} className="text-slate-500 dark:text-slate-400" />
                            </div>
                            <span>{program.estimatedFee}</span>
                        </motion.div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-5 border-t-2 border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <motion.button
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onView(program)}
                            className="text-sm font-bold text-slate-600 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 flex items-center gap-1.5 transition-colors group/btn"
                        >
                            <span>Details</span>
                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </motion.button>

                        <div className="flex items-center gap-1.5">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onEdit(program)}
                                className="p-2.5 rounded-xl text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 bg-slate-50 hover:bg-cyan-50 dark:bg-slate-700/50 dark:hover:bg-cyan-500/20 border border-slate-200 dark:border-slate-600 transition-all"
                                title="Edit"
                            >
                                <Pencil size={16} />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onDelete(program.id)}
                                className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-slate-50 hover:bg-red-50 dark:bg-slate-700/50 dark:hover:bg-red-500/20 border border-slate-200 dark:border-slate-600 transition-all"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </motion.button>
                        </div>
                    </div>
                </div>

                {/* Shimmer Effect */}
                <motion.div
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{
                        repeat: Infinity,
                        duration: 3,
                        delay: index * 0.3,
                        ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100"
                />
            </motion.div>
        </motion.div>
    );
};

const ManagerPrograms = () => {
    const { currentUser, userProfile } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const initialFormData = {
        title: '',
        degreeType: 'BS',
        duration: '',
        totalSemesters: '',
        estimatedFee: '',
        description: '',
        scholarships: []
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'degrees'),
            where('universityId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPrograms(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching programs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(initialFormData);
        setEditingId(null);
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.estimatedFee) {
            alert("Program Title and Fee are required!");
            return;
        }

        const cleanedScholarships = formData.scholarships.filter(s =>
            s.criteriaTitle.trim() !== '' && s.minPercentage !== '' && s.grantPercentage !== ''
        );

        setSubmitting(true);

        try {
            const programData = {
                ...formData,
                scholarships: cleanedScholarships,
                universityId: currentUser.uid,
                universityName: userProfile?.universityName || 'Unknown University',
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, 'degrees', editingId), programData);
            } else {
                await addDoc(collection(db, 'degrees'), {
                    ...programData,
                    createdAt: serverTimestamp()
                });
            }

            handleCloseModal();
        } catch (error) {
            console.error("Error saving program:", error);
            alert("Failed to save program.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (program) => {
        setEditingId(program.id);
        setFormData({
            title: program.title || '',
            degreeType: program.degreeType || 'BS',
            duration: program.duration || '',
            totalSemesters: program.totalSemesters || '',
            estimatedFee: program.estimatedFee || '',
            description: program.description || '',
            scholarships: program.scholarships || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this program? This action is irreversible.")) return;
        try {
            await deleteDoc(doc(db, 'degrees', id));
        } catch (error) {
            console.error("Error deleting program:", error);
            alert("Failed to delete.");
        }
    };

    const filteredPrograms = programs.filter(p =>
    (p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.degreeType?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen p-6 md:p-10 relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">

            {/* Animated Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-[120px]"
                />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12"
                >
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
                        >
                            Academic <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 dark:from-cyan-400 dark:via-purple-400 dark:to-pink-400 animate-gradient">Programs</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2"
                        >
                            <Users size={16} /> Curate your university's academic offerings
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-4 w-full md:w-auto"
                    >
                        {/* Search */}
                        <div className="relative flex-1 md:w-80 group">
                            <motion.div
                                whileFocus={{ scale: 1.02 }}
                                className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                            >
                                <Search className="text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={18} />
                            </motion.div>
                            <input
                                type="text"
                                placeholder="Search programs..."
                                className="block w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-sm hover:shadow-md"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Add Button */}
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(6, 182, 212, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsModalOpen(true)}
                            className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-cyan-500 dark:to-blue-500 text-white px-6 py-3.5 rounded-2xl font-bold shadow-xl shadow-slate-900/20 dark:shadow-cyan-500/20 flex items-center gap-2.5 transition-all whitespace-nowrap"
                        >
                            <Plus size={20} strokeWidth={3} />
                            <span>Add Program</span>
                        </motion.button>
                    </motion.div>
                </motion.header>

                {/* Content */}
                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-40"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                            <Loader2 size={56} className="text-cyan-500 mb-6" />
                        </motion.div>
                        <motion.p
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-slate-500 dark:text-slate-400 font-semibold text-lg"
                        >
                            Loading Academy...
                        </motion.p>
                    </motion.div>
                ) : filteredPrograms.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/30 backdrop-blur-xl"
                    >
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-28 h-28 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mb-6 shadow-inner"
                        >
                            <BookOpen size={48} className="text-slate-400 dark:text-slate-500" />
                        </motion.div>
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">No Programs Found</h3>
                        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
                            {searchTerm ? "Try adjusting your search terms." : "Start building your academic catalog by adding your first program."}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredPrograms.map((program, index) => (
                                <ProgramCard
                                    key={program.id}
                                    program={program}
                                    index={index}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onView={(p) => { setSelectedProgram(p); setIsViewModalOpen(true); }}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* ADD/EDIT MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border-2 border-slate-200 dark:border-white/10"
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 px-8 py-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        whileHover={{ rotate: 360 }}
                                        transition={{ duration: 0.5 }}
                                        className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30"
                                    >
                                        {editingId ? <Pencil size={24} className="text-white" /> : <Plus size={24} className="text-white" />}
                                    </motion.div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                            {editingId ? "Edit Program" : "Create New Program"}
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Configure academic program details</p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleCloseModal}
                                    className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-all"
                                >
                                    <X size={22} />
                                </motion.button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <form id="programForm" onSubmit={handleSubmit} className="space-y-8">

                                    {/* Primary Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="md:col-span-2"
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Program Title
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g., Bachelor of Computer Science"
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium shadow-sm"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.15 }}
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Degree Level
                                            </label>
                                            <div className="relative">
                                                <select
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all appearance-none cursor-pointer font-medium shadow-sm"
                                                    value={formData.degreeType}
                                                    onChange={e => setFormData({ ...formData, degreeType: e.target.value })}
                                                >
                                                    <option value="Associate">Associate Degree</option>
                                                    <option value="BS">Bachelor's (BS)</option>
                                                    <option value="MS">Master's (MS)</option>
                                                    <option value="PhD">Doctorate (PhD)</option>
                                                </select>
                                                <Layers size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 }}
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Estimated Fee
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g., $5,000 / Semester"
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium shadow-sm"
                                                value={formData.estimatedFee}
                                                onChange={e => setFormData({ ...formData, estimatedFee: e.target.value })}
                                            />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.25 }}
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Duration
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g., 4 Years"
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium shadow-sm"
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                                            />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 }}
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Total Semesters
                                            </label>
                                            <input
                                                required
                                                type="number"
                                                placeholder="e.g., 8"
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all font-medium shadow-sm"
                                                value={formData.totalSemesters}
                                                onChange={e => setFormData({ ...formData, totalSemesters: e.target.value })}
                                            />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.35 }}
                                            className="md:col-span-2"
                                        >
                                            <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                Program Overview
                                            </label>
                                            <textarea
                                                required
                                                rows={5}
                                                placeholder="Describe the curriculum, learning outcomes, and career prospects..."
                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 transition-all resize-none leading-relaxed font-medium shadow-sm"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </motion.div>
                                    </div>

                                    {/* Scholarships */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="pt-6 border-t-2 border-slate-200 dark:border-white/10"
                                    >
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-500/10 dark:to-amber-500/10">
                                                    <Sparkles size={20} className="text-yellow-600 dark:text-yellow-400" fill="currentColor" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Scholarship Criteria</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Define eligibility requirements</p>
                                                </div>
                                            </div>
                                        </div>
                                        <ScholarshipManager
                                            value={formData.scholarships}
                                            onChange={(newScholarships) => setFormData(prev => ({ ...prev, scholarships: newScholarships }))}
                                        />
                                    </motion.div>
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-8 py-6 border-t-2 border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800/50 flex justify-end gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(6, 182, 212, 0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    form="programForm"
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-xl shadow-cyan-500/30 flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                                                <Loader2 size={20} />
                                            </motion.div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={20} />
                                            {editingId ? "Save Changes" : "Create Program"}
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* VIEW MODAL */}
            <AnimatePresence>
                {isViewModalOpen && selectedProgram && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            onClick={() => setIsViewModalOpen(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] border-2 border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8"
                        >
                            <div className="text-center mb-8">
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-500/20 dark:to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5 border-2 border-cyan-200 dark:border-white/10 shadow-xl"
                                >
                                    <GraduationCap size={40} className="text-cyan-600 dark:text-white" />
                                </motion.div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{selectedProgram.title}</h2>
                                <p className="text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest text-xs">{selectedProgram.degreeType} PROGRAM</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {[
                                    { label: "Duration", value: selectedProgram.duration },
                                    { label: "Total Semesters", value: selectedProgram.totalSemesters },
                                    { label: "Estimated Fee", value: selectedProgram.estimatedFee }
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10"
                                    >
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{item.label}</span>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                                    </motion.div>
                                ))}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/10 max-h-40 overflow-y-auto custom-scrollbar"
                                >
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedProgram.description}</p>
                                </motion.div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setIsViewModalOpen(false)}
                                className="w-full py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-white/10 dark:to-white/5 dark:hover:from-white/20 dark:hover:to-white/10 text-slate-900 dark:text-white font-bold rounded-2xl transition-all shadow-lg"
                            >
                                Close Details
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: linear-gradient(180deg, #06b6d4, #3b82f6); 
                    border-radius: 3px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: linear-gradient(180deg, #0891b2, #2563eb); 
                }
                .animate-gradient {
                    background-size: 200% auto;
                    animation: gradient 3s ease infinite;
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
            `}</style>
        </div>
    );
};

export default ManagerPrograms;