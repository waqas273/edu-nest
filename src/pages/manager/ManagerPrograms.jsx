import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    BookOpen, Plus, Trash2, X, Loader2, ArrowRight, GraduationCap,
    Clock, DollarSign, Search, Sparkles, Pencil, Layers,
    CheckCircle, Award, Calendar, Users, UploadCloud, Info, Check, ShieldAlert, Download, Wand2
} from 'lucide-react';
import { downloadSampleCSV } from '../../utils/csvSampleDownloader';
import { extractAdmissionRequirementsWithGroq } from '../../utils/groqService';
import {
    collection, query, where, onSnapshot,
    addDoc, deleteDoc, doc, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import ScholarshipManager from '../../components/ScholarshipManager';
import { EDUCATION_HIERARCHY } from '../../data/educationHierarchy';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

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

// Ultra-Premium Program Card
const ProgramCard = ({ program, onEdit, onDelete, onView, index }) => {
    const cardRef = useRef(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useTransform(mouseY, [-200, 200], [4, -4]), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-4, 4]), { stiffness: 300, damping: 30 });

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.02 }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative h-full"
        >
            <motion.div
                whileHover={{ y: -6 }}
                className="relative h-full overflow-hidden rounded-3xl bg-white dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] shadow-sm hover:shadow-xl dark:shadow-none hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 flex flex-col p-6"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
                
                {/* Glow ring */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center border border-cyan-200/50 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shadow-sm">
                        <GraduationCap size={24} />
                    </div>
                    {program.scholarships?.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                            <Sparkles size={11} fill="currentColor" />
                            <span className="text-[9px] font-black uppercase tracking-wider">Aid Available</span>
                        </div>
                    )}
                </div>

                <div className="mb-4 flex-1">
                    <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">{program.degreeType} • Program</p>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">{program.title}</h3>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                        <Clock size={12} className="text-slate-400" />
                        <span>{program.duration} ({program.totalSemesters} Semesters)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                        <DollarSign size={12} className="text-slate-400" />
                        <span>{program.estimatedFee}</span>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
                    <button
                        onClick={() => onView(program)}
                        className="text-xs font-bold text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400 flex items-center gap-1 group/btn"
                    >
                        <span>Details</span>
                        <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>

                    <div className="flex gap-1">
                        <button
                            onClick={() => onEdit(program)}
                            className="p-2 rounded-xl text-slate-455 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:text-cyan-400 dark:hover:bg-cyan-500/10 border border-slate-200 dark:border-white/[0.08] transition"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => onDelete(program.id)}
                            className="p-2 rounded-xl text-slate-455 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 border border-slate-200 dark:border-white/[0.08] transition"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// Helper: Flat list of all valid hierarchy strings for matching
const getFlatEducationOptions = () => {
    const list = [];
    EDUCATION_HIERARCHY.forEach(sys => {
        sys.levels.forEach(lvl => {
            if (lvl.groups && lvl.groups.length > 0) {
                lvl.groups.forEach(grp => {
                    list.push(`${sys.label} - ${lvl.label} - ${grp}`);
                });
            } else {
                list.push(`${sys.label} - ${lvl.label}`);
            }
        });
    });
    return list;
};

const findClosestEducationMatch = (text) => {
    if (!text) return 'Intermediate (Local Board) - Inter Part II (12th) - F.Sc Pre-Medical'; // Default fallback
    const flat = getFlatEducationOptions();
    
    // Normalize string
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanText = clean(text);

    // Exact matches or simplified matches
    if (cleanText.includes('premed') || (cleanText.includes('fsc') && cleanText.includes('med'))) {
        return flat.find(x => x.includes('Pre-Medical')) || flat[0];
    }
    if (cleanText.includes('preeng') || (cleanText.includes('fsc') && cleanText.includes('eng'))) {
        return flat.find(x => x.includes('Pre-Engineering')) || flat[0];
    }
    if (cleanText.includes('ics') && cleanText.includes('phys')) {
        return flat.find(x => x.includes('ICS (Physics)')) || flat[0];
    }
    if (cleanText.includes('ics') && cleanText.includes('stat')) {
        return flat.find(x => x.includes('ICS (Statistics)')) || flat[0];
    }
    if (cleanText.includes('ics')) {
        return flat.find(x => x.includes('ICS (Physics)')) || flat[0];
    }
    if (cleanText.includes('icom')) {
        return flat.find(x => x.includes('I.Com')) || flat[0];
    }
    if (cleanText.includes('matric') && cleanText.includes('comp')) {
        return flat.find(x => x.includes('Matriculation') && x.includes('Computer')) || flat[0];
    }
    if (cleanText.includes('matric') && (cleanText.includes('bio') || cleanText.includes('science'))) {
        return flat.find(x => x.includes('Matriculation') && x.includes('Biology')) || flat[0];
    }
    if (cleanText.includes('alevel') || cleanText.includes('aslevel')) {
        return flat.find(x => x.includes('A-Level')) || flat[0];
    }
    if (cleanText.includes('olevel')) {
        return flat.find(x => x.includes('O-Level')) || flat[0];
    }

    // Generic match
    let bestMatch = flat[0];
    let bestScore = 0;
    flat.forEach(opt => {
        const cleanOpt = clean(opt);
        let score = 0;
        const tokens = cleanText.split(/\s+/);
        tokens.forEach(tok => {
            if (tok && cleanOpt.includes(tok)) score += tok.length;
        });
        if (score > bestScore) {
            bestScore = score;
            bestMatch = opt;
        }
    });

    return bestMatch;
};

const ManagerPrograms = () => {
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const [activeView, setActiveView] = useState('programs'); // 'programs' | 'scholarships'

    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // AI Extraction state
    const [aiProspectusText, setAiProspectusText] = useState('');
    const [isExtractingAi, setIsExtractingAi] = useState(false);

    // CSV Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [parsedData, setParsedData] = useState([]);
    const [mappingColumns, setMappingColumns] = useState({});
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvRawLines, setCsvRawLines] = useState([]);

    // CSV Import State (Scholarships)
    const [isSchImportModalOpen, setIsSchImportModalOpen] = useState(false);
    const [schParsedData, setSchParsedData] = useState([]);
    const [schMappingColumns, setSchMappingColumns] = useState({});
    const [schCsvHeaders, setSchCsvHeaders] = useState([]);
    const [schCsvRawLines, setSchCsvRawLines] = useState([]);

    // Central Scholarship Directory (loaded from userProfile)
    const scholarshipDirectory = userProfile?.scholarshipDirectory || [];
    const [isScholarshipModalOpen, setIsScholarshipModalOpen] = useState(false);
    const [editingScholarshipId, setEditingScholarshipId] = useState(null);
    const [scholarshipFormData, setScholarshipFormData] = useState({
        title: '',
        scope: 'global', // 'global' | 'specific'
        tag: '',
        type: 'merit', // 'merit' | 'position' | 'kinship' | 'need'
        tiers: []
    });

    const initialFormData = {
        title: '',
        degreeType: 'BS',
        duration: '',
        totalSemesters: '',
        estimatedFee: '',
        description: '',
        scholarships: [],
        minInterPercentage: 60,
        minMatricPercentage: 50,
        allowedInterStreams: ["Pre-Engineering", "ICS"],
        requireEntryTest: true,
        entryTests: [{ testName: 'NTS NAT-IE / FAST Entry Test', minScore: 50 }],
        allowedDomicile: 'Open Merit (All Pakistan)',
        maxAgeLimit: 0,
        minBachelorCgpa: 0,
        requiredDocuments: ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"],
        customRules: [
            { label: "Math Requirement", value: "Must have studied Mathematics in FSc" }
        ],
        extraRequirements: ''
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

    // Helper handlers for dynamic arrays in Admission Policy Form Modal
    const addPolicyEntryTest = () => {
        setPolicyFormData(prev => ({
            ...prev,
            entryTests: [...(prev.entryTests || []), { testName: 'NTS NAT / FAST Test', minScore: 50 }]
        }));
    };

    const removePolicyEntryTest = (idx) => {
        setPolicyFormData(prev => ({
            ...prev,
            entryTests: (prev.entryTests || []).filter((_, i) => i !== idx)
        }));
    };

    const updatePolicyEntryTest = (idx, field, val) => {
        setPolicyFormData(prev => {
            const updated = [...(prev.entryTests || [])];
            updated[idx] = { ...updated[idx], [field]: val };
            return { ...prev, entryTests: updated };
        });
    };

    const addPolicyCustomRule = () => {
        setPolicyFormData(prev => ({
            ...prev,
            customRules: [...(prev.customRules || []), { label: 'Criteria Rule', value: 'Details...' }]
        }));
    };

    const removePolicyCustomRule = (idx) => {
        setPolicyFormData(prev => ({
            ...prev,
            customRules: (prev.customRules || []).filter((_, i) => i !== idx)
        }));
    };

    const updatePolicyCustomRule = (idx, field, val) => {
        setPolicyFormData(prev => {
            const updated = [...(prev.customRules || [])];
            updated[idx] = { ...updated[idx], [field]: val };
            return { ...prev, customRules: updated };
        });
    };

    // Central Admission Policies Directory state & handlers
    const admissionPoliciesDirectory = userProfile?.admissionPoliciesDirectory || [];
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
    const [editingPolicyId, setEditingPolicyId] = useState(null);
    const [policyFormData, setPolicyFormData] = useState({
        policyTitle: '',
        scope: 'global', // 'global' | 'specific'
        tag: '',
        minInterPercentage: 60,
        minMatricPercentage: 50,
        requireEntryTest: true,
        entryTests: [{ testName: 'NTS NAT-IE', minScore: 50 }],
        allowedDomicile: 'Open Merit (All Pakistan)',
        requiredDocuments: ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form"],
        customRules: []
    });

    const handleSaveAdmissionPolicy = async (e) => {
        e.preventDefault();
        if (!policyFormData.policyTitle) {
            alert("Policy Title is required!");
            return;
        }

        try {
            let updatedDirectory = [...admissionPoliciesDirectory];
            const newPolicy = {
                ...policyFormData,
                id: editingPolicyId || Math.random().toString(36).substring(7),
                tag: policyFormData.scope === 'global' ? '' : policyFormData.tag.toLowerCase().replace(/[^a-z0-9_-]/g, '')
            };

            if (editingPolicyId) {
                updatedDirectory = updatedDirectory.map(p => p.id === editingPolicyId ? newPolicy : p);
            } else {
                updatedDirectory.push(newPolicy);
            }

            await updateUserProfile(currentUser.uid, {
                admissionPoliciesDirectory: updatedDirectory
            });

            setIsPolicyModalOpen(false);
            setEditingPolicyId(null);
            alert("Admission Policy saved successfully!");
        } catch (err) {
            console.error("Failed to save policy:", err);
            alert("Failed to save Admission Policy.");
        }
    };

    const handleDeleteAdmissionPolicy = async (id) => {
        if (!window.confirm("Delete this admission policy template?")) return;
        try {
            const updatedDirectory = admissionPoliciesDirectory.filter(p => p.id !== id);
            await updateUserProfile(currentUser.uid, {
                admissionPoliciesDirectory: updatedDirectory
            });
        } catch (err) {
            console.error("Failed to delete policy:", err);
        }
    };

    // Auto-calculates final admission eligibility requirements: Merges Globals + selected Specific Policies
    const getMergedAdmissionRequirements = (selectedTags = []) => {
        const globals = admissionPoliciesDirectory.filter(p => p.scope === 'global');
        const selectedSpecifics = admissionPoliciesDirectory.filter(p => p.scope === 'specific' && selectedTags.includes(p.tag));
        const allMatching = [...globals, ...selectedSpecifics];

        if (allMatching.length === 0) {
            return {
                minInterPercentage: 60,
                minMatricPercentage: 50,
                allowedInterStreams: ["Pre-Engineering", "ICS"],
                requireEntryTest: true,
                entryTests: [{ testName: 'NTS NAT-IE / FAST Entry Test', minScore: 50 }],
                allowedDomicile: 'Open Merit (All Pakistan)',
                maxAgeLimit: 0,
                minBachelorCgpa: 0,
                requiredDocuments: ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"],
                customRules: [],
                extraRequirements: ''
            };
        }

        let minInter = 0;
        let minMatric = 0;
        let entryTests = [];
        let customRules = [];
        let requiredDocs = new Set();
        let streams = new Set();
        let domicile = 'Open Merit (All Pakistan)';

        allMatching.forEach(pol => {
            if (parseFloat(pol.minInterPercentage) > minInter) minInter = parseFloat(pol.minInterPercentage);
            if (parseFloat(pol.minMatricPercentage) > minMatric) minMatric = parseFloat(pol.minMatricPercentage);
            if (pol.allowedDomicile) domicile = pol.allowedDomicile;
            
            if (Array.isArray(pol.entryTests)) {
                pol.entryTests.forEach(t => {
                    if (!entryTests.some(et => et.testName === t.testName)) entryTests.push(t);
                });
            }
            if (Array.isArray(pol.customRules)) {
                pol.customRules.forEach(r => {
                    if (!customRules.some(cr => cr.label === r.label)) customRules.push(r);
                });
            }
            if (Array.isArray(pol.requiredDocuments)) {
                pol.requiredDocuments.forEach(d => requiredDocs.add(d));
            }
            if (Array.isArray(pol.allowedInterStreams)) {
                pol.allowedInterStreams.forEach(s => streams.add(s));
            }
        });

        return {
            minInterPercentage: minInter || 60,
            minMatricPercentage: minMatric || 50,
            allowedInterStreams: Array.from(streams).length > 0 ? Array.from(streams) : ["Pre-Engineering", "ICS"],
            requireEntryTest: entryTests.length > 0,
            entryTests: entryTests.length > 0 ? entryTests : [{ testName: 'NTS NAT-IE', minScore: 50 }],
            allowedDomicile: domicile,
            requiredDocuments: Array.from(requiredDocs).length > 0 ? Array.from(requiredDocs) : ["Matric Marksheet", "FSc Marksheet", "CNIC"],
            customRules,
            extraRequirements: allMatching.map(p => p.policyTitle).join(', ')
        };
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData(initialFormData);
        setEditingId(null);
    };

    const handleAiExtract = async () => {
        if (!aiProspectusText.trim()) {
            alert("Please paste prospectus text first.");
            return;
        }
        try {
            setIsExtractingAi(true);
            const result = await extractAdmissionRequirementsWithGroq(aiProspectusText);
            setPolicyFormData(prev => ({
                ...prev,
                minInterPercentage: result.minInterPercentage,
                minMatricPercentage: result.minMatricPercentage,
                allowedInterStreams: result.allowedInterStreams,
                requireEntryTest: result.requireEntryTest,
                entryTests: result.entryTests || [{ testName: 'NTS NAT', minScore: 50 }],
                allowedDomicile: result.allowedDomicile,
                maxAgeLimit: result.maxAgeLimit,
                minBachelorCgpa: result.minBachelorCgpa,
                requiredDocuments: result.requiredDocuments,
                customRules: result.customRules || [],
                extraRequirements: result.extraRequirements
            }));
            alert("✨ Comprehensive admission policy extracted using Groq AI and loaded into Policy Form!");
        } catch (err) {
            alert("AI Extraction error: " + (err.message || "Failed to extract requirements."));
        } finally {
            setIsExtractingAi(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.estimatedFee) {
            alert("Program Title and Fee are required!");
            return;
        }

        setSubmitting(true);

        try {
            // Automatically merge the global + selected specific scholarships
            const finalScholarships = getMergedScholarships(formData.scholarships);

            // Automatically merge the global + selected specific admission policies
            const finalRequirements = getMergedAdmissionRequirements(formData.admissionPolicies);

            const programData = {
                title: formData.title,
                degreeType: formData.degreeType,
                duration: formData.duration,
                totalSemesters: formData.totalSemesters,
                estimatedFee: formData.estimatedFee,
                description: formData.description,
                scholarshipTags: formData.scholarships,
                scholarships: finalScholarships,
                admissionPolicyTags: formData.admissionPolicies,
                
                // Merged requirements for student eligibility checking
                minInterPercentage: finalRequirements.minInterPercentage,
                minMatricPercentage: finalRequirements.minMatricPercentage,
                allowedInterStreams: finalRequirements.allowedInterStreams,
                requireEntryTest: finalRequirements.requireEntryTest,
                entryTests: finalRequirements.entryTests,
                entryTestName: finalRequirements.entryTests?.[0]?.testName || 'NTS NAT / University Test',
                minTestScore: finalRequirements.entryTests?.[0]?.minScore || 50,
                allowedDomicile: finalRequirements.allowedDomicile,
                maxAgeLimit: finalRequirements.maxAgeLimit || 0,
                minBachelorCgpa: finalRequirements.minBachelorCgpa || 0,
                requiredDocuments: finalRequirements.requiredDocuments,
                customRules: finalRequirements.customRules,
                extraRequirements: finalRequirements.extraRequirements,
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
            scholarships: program.scholarshipTags || [],
            admissionPolicies: program.admissionPolicyTags || []
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

    // --- CENTRAL SCHOLARSHIP DIRECTORY SAVE HANDLER ---
    const handleSaveScholarship = async (e) => {
        e.preventDefault();
        if (!scholarshipFormData.title) {
            alert("Title is required!");
            return;
        }
        if (scholarshipFormData.scope === 'specific' && !scholarshipFormData.tag) {
            alert("A specific tag identifier is required!");
            return;
        }

        try {
            let updatedDirectory = [...scholarshipDirectory];
            const newScholarship = {
                ...scholarshipFormData,
                id: editingScholarshipId || Math.random().toString(36).substring(7),
                tag: scholarshipFormData.scope === 'global' ? '' : scholarshipFormData.tag.toLowerCase().replace(/[^a-z0-9_-]/g, '')
            };

            if (editingScholarshipId) {
                updatedDirectory = updatedDirectory.map(s => s.id === editingScholarshipId ? newScholarship : s);
            } else {
                updatedDirectory.push(newScholarship);
            }

            await updateUserProfile(currentUser.uid, {
                scholarshipDirectory: updatedDirectory
            });

            // Clean & close
            setIsScholarshipModalOpen(false);
            setEditingScholarshipId(null);
            setScholarshipFormData({ title: '', scope: 'global', tag: '', type: 'merit', tiers: [] });
        } catch (error) {
            console.error("Error saving scholarship rule:", error);
            alert("Failed to save scholarship directory rule.");
        }
    };

    const handleDeleteScholarship = async (id) => {
        if (!window.confirm("Delete this scholarship rule? Programs currently referencing it will no longer display it.")) return;
        try {
            const updatedDirectory = scholarshipDirectory.filter(s => s.id !== id);
            await updateUserProfile(currentUser.uid, {
                scholarshipDirectory: updatedDirectory
            });
        } catch (error) {
            console.error("Failed to delete scholarship:", error);
        }
    };

    // --- CSV IMPORT LOGIC ---
    const handleFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        if (!file || !file.name.endsWith('.csv')) {
            alert("Please upload a valid CSV file!");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = parseCSV(text);
            if (lines.length < 2) {
                alert("The CSV file seems to be empty or missing headers.");
                return;
            }

            const headers = lines[0].map(h => h.trim());
            setCsvHeaders(headers);
            setCsvRawLines(lines.slice(1));

            // Auto mapping logic based on column names
            const initialMap = {};
            headers.forEach((header, index) => {
                const hLower = header.toLowerCase();
                if (hLower.includes('title') || hLower.includes('name') || hLower.includes('program')) {
                    initialMap['title'] = index;
                } else if (hLower.includes('level') || hLower.includes('type')) {
                    initialMap['degreeType'] = index;
                } else if (hLower.includes('duration') || hLower.includes('year')) {
                    initialMap['duration'] = index;
                } else if (hLower.includes('semester')) {
                    initialMap['totalSemesters'] = index;
                } else if (hLower.includes('fee') || hLower.includes('charges') || hLower.includes('price')) {
                    initialMap['estimatedFee'] = index;
                } else if (hLower.includes('description') || hLower.includes('overview') || hLower.includes('about')) {
                    initialMap['description'] = index;
                } else if (hLower.includes('inter') || hLower.includes('fsc')) {
                    initialMap['minInterPercentage'] = index;
                } else if (hLower.includes('matric')) {
                    initialMap['minMatricPercentage'] = index;
                } else if (hLower.includes('stream') || hLower.includes('discipline')) {
                    initialMap['allowedInterStreams'] = index;
                } else if (hLower.includes('require_test') || hLower.includes('require_entry')) {
                    initialMap['requireEntryTest'] = index;
                } else if (hLower.includes('test_name') || hLower.includes('entry_test')) {
                    initialMap['entryTestName'] = index;
                } else if (hLower.includes('test_score') || hLower.includes('min_test')) {
                    initialMap['minTestScore'] = index;
                } else if (hLower.includes('domicile')) {
                    initialMap['allowedDomicile'] = index;
                } else if (hLower.includes('age')) {
                    initialMap['maxAgeLimit'] = index;
                } else if (hLower.includes('cgpa')) {
                    initialMap['minBachelorCgpa'] = index;
                } else if (hLower.includes('document')) {
                    initialMap['requiredDocuments'] = index;
                } else if (hLower.includes('extra') || hLower.includes('criteria') || hLower.includes('requirement')) {
                    initialMap['extraRequirements'] = index;
                }
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

            const rawTagsString = getVal('scholarshipTags');
            const parsedTags = rawTagsString
                ? rawTagsString.split(',').map(t => t.trim().toLowerCase()).filter(t => t && t !== 'none')
                : [];

            const rawStreamsString = getVal('allowedInterStreams');
            const parsedStreams = rawStreamsString
                ? rawStreamsString.split(',').map(s => s.trim()).filter(Boolean)
                : ["Pre-Engineering", "ICS"];

            const rawDocsString = getVal('requiredDocuments');
            const parsedDocs = rawDocsString
                ? rawDocsString.split(',').map(d => d.trim()).filter(Boolean)
                : ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"];

            const rawReqTest = getVal('requireEntryTest').toLowerCase();
            const requireEntryTest = rawReqTest ? (rawReqTest === 'yes' || rawReqTest === 'true' || rawReqTest === '1') : true;

            return {
                id: idx,
                title: getVal('title'),
                degreeType: getVal('degreeType') || 'BS',
                duration: getVal('duration') || '4 Years',
                totalSemesters: getVal('totalSemesters') || '8',
                estimatedFee: getVal('estimatedFee'),
                description: getVal('description') || 'No description provided.',
                scholarshipTags: parsedTags,
                minInterPercentage: parseFloat(getVal('minInterPercentage')) || 60,
                minMatricPercentage: parseFloat(getVal('minMatricPercentage')) || 50,
                allowedInterStreams: parsedStreams,
                requireEntryTest: requireEntryTest,
                entryTestName: getVal('entryTestName') || 'NTS NAT / University Test',
                minTestScore: parseFloat(getVal('minTestScore')) || 50,
                allowedDomicile: getVal('allowedDomicile') || 'Open Merit (All Pakistan)',
                maxAgeLimit: parseInt(getVal('maxAgeLimit')) || 0,
                minBachelorCgpa: parseFloat(getVal('minBachelorCgpa')) || 0,
                requiredDocuments: parsedDocs,
                extraRequirements: getVal('extraRequirements') || ''
            };
        });
        setParsedData(processed);
    }, [csvRawLines, mappingColumns]);

    const handleImportSubmit = async () => {
        const invalidRows = parsedData.filter(d => !d.title || !d.estimatedFee);
        if (invalidRows.length > 0) {
            alert(`Cannot import. ${invalidRows.length} rows have missing Program Titles or Fees.`);
            return;
        }

        setSubmitting(true);
        try {
            const batchPromises = parsedData.map(d => {
                const mergedScholarships = getMergedScholarships(d.scholarshipTags);
                return addDoc(collection(db, 'degrees'), {
                    title: d.title,
                    degreeType: d.degreeType,
                    duration: d.duration,
                    totalSemesters: d.totalSemesters,
                    estimatedFee: d.estimatedFee,
                    description: d.description,
                    scholarshipTags: d.scholarshipTags,
                    scholarships: mergedScholarships,
                    minInterPercentage: d.minInterPercentage,
                    minMatricPercentage: d.minMatricPercentage,
                    allowedInterStreams: d.allowedInterStreams,
                    requireEntryTest: d.requireEntryTest,
                    entryTestName: d.entryTestName,
                    minTestScore: d.minTestScore,
                    allowedDomicile: d.allowedDomicile,
                    maxAgeLimit: d.maxAgeLimit,
                    minBachelorCgpa: d.minBachelorCgpa,
                    requiredDocuments: d.requiredDocuments,
                    extraRequirements: d.extraRequirements,
                    universityId: currentUser.uid,
                    universityName: userProfile?.universityName || 'Unknown University',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            });

            await Promise.all(batchPromises);
            setIsImportModalOpen(false);
            setCsvRawLines([]);
            setParsedData([]);
            alert("All programs imported and mapped successfully!");
        } catch (error) {
            console.error("Failed to import programs batch:", error);
            alert("Import failed.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- CSV IMPORT LOGIC (SCHOLARSHIPS) ---
    const handleSchFileDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
        if (!file || !file.name.endsWith('.csv')) {
            alert("Please upload a valid CSV file!");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = parseCSV(text);
            if (lines.length < 2) {
                alert("The CSV file seems to be empty or missing headers.");
                return;
            }

            const headers = lines[0].map(h => h.trim());
            setSchCsvHeaders(headers);
            setSchCsvRawLines(lines.slice(1));

            // Auto mapping
            const initialMap = {};
            headers.forEach((header, index) => {
                const hLower = header.toLowerCase();
                if (hLower.includes('title') || hLower.includes('name')) {
                    initialMap['title'] = index;
                } else if (hLower.includes('scope')) {
                    initialMap['scope'] = index;
                } else if (hLower.includes('tag')) {
                    initialMap['tag'] = index;
                } else if (hLower.includes('type') || hLower.includes('category')) {
                    initialMap['type'] = index;
                } else if (hLower.includes('criteria') || hLower.includes('education')) {
                    initialMap['criteriaTitle'] = index;
                } else if (hLower.includes('min')) {
                    initialMap['min'] = index;
                } else if (hLower.includes('max')) {
                    initialMap['max'] = index;
                } else if (hLower.includes('pos')) {
                    initialMap['position'] = index;
                } else if (hLower.includes('cond')) {
                    initialMap['condition'] = index;
                } else if (hLower.includes('grant') || hLower.includes('waiver') || hLower.includes('discount')) {
                    initialMap['grant'] = index;
                }
            });
            setSchMappingColumns(initialMap);
        };
        reader.readAsText(file);
    };

    // Group parsed CSV rows by scholarship title/tag
    useEffect(() => {
        if (schCsvRawLines.length === 0) return;

        const grouped = {};
        schCsvRawLines.forEach((line) => {
            const getVal = (field) => {
                const colIdx = schMappingColumns[field];
                return colIdx !== undefined ? (line[colIdx] || '').trim() : '';
            };

            const title = getVal('title');
            if (!title) return;

            const scope = getVal('scope').toLowerCase() === 'specific' ? 'specific' : 'global';
            const tag = scope === 'specific' ? getVal('tag').toLowerCase().replace(/[^a-z0-9_-]/g, '') : '';
            const type = getVal('type').toLowerCase() || 'merit';
            const criteriaTitle = findClosestEducationMatch(getVal('criteriaTitle'));

            const tier = {
                id: Math.random().toString(),
                min: getVal('min'),
                max: getVal('max'),
                position: getVal('position'),
                condition: getVal('condition'),
                grant: getVal('grant') || '0'
            };

            const key = `${title}_${scope}_${tag}_${type}`;
            if (!grouped[key]) {
                grouped[key] = {
                    title,
                    scope,
                    tag,
                    type,
                    criteriaTitle,
                    tiers: []
                };
            }
            grouped[key].tiers.push(tier);
        });

        setSchParsedData(Object.values(grouped));
    }, [schCsvRawLines, schMappingColumns]);

    const handleSchImportSubmit = async () => {
        const invalidRows = schParsedData.filter(s => !s.title || (s.scope === 'specific' && !s.tag));
        if (invalidRows.length > 0) {
            alert(`Cannot import. ${invalidRows.length} scholarships have missing Titles or Tags.`);
            return;
        }

        setSubmitting(true);
        try {
            const mergedDirectory = [...scholarshipDirectory];
            
            schParsedData.forEach((importedSch) => {
                const existingIdx = mergedDirectory.findIndex(s => s.title === importedSch.title || (importedSch.tag && s.tag === importedSch.tag));
                const newSch = {
                    id: Math.random().toString(36).substring(7),
                    title: importedSch.title,
                    scope: importedSch.scope,
                    tag: importedSch.tag,
                    type: importedSch.type,
                    criteriaTitle: importedSch.criteriaTitle,
                    tiers: importedSch.tiers
                };
                if (existingIdx > -1) {
                    mergedDirectory[existingIdx] = newSch;
                } else {
                    mergedDirectory.push(newSch);
                }
            });

            await updateUserProfile(currentUser.uid, {
                scholarshipDirectory: mergedDirectory
            });

            setIsSchImportModalOpen(false);
            setSchCsvRawLines([]);
            setSchParsedData([]);
            alert("All scholarships directory rules imported and merged successfully!");
        } catch (error) {
            console.error("Failed to import scholarships directory:", error);
            alert("Import failed.");
        } finally {
            setSubmitting(false);
        }
    };

    // CSV Import Modal for Admission Policies Directory
    const [isPolicyImportModalOpen, setIsPolicyImportModalOpen] = useState(false);
    const [polCsvRawLines, setPolCsvRawLines] = useState([]);
    const [polParsedData, setPolParsedData] = useState([]);

    const handlePolicyFileDrop = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
            if (lines.length <= 1) {
                alert("CSV file appears to be empty.");
                return;
            }

            const parseCSVLine = (str) => {
                const arr = [];
                let quote = false;
                let col = '';
                for (let c of str) {
                    if (c === '"') quote = !quote;
                    else if (c === ',' && !quote) {
                        arr.push(col.trim());
                        col = '';
                    } else col += c;
                }
                arr.push(col.trim());
                return arr;
            };

            const dataLines = lines.slice(1).map(parseCSVLine);
            setPolCsvRawLines(dataLines);

            setIsExtractingAi(true);
            const parsedList = [];

            try {
                for (let idx = 0; idx < dataLines.length; idx++) {
                    const line = dataLines[idx];
                    const getVal = (i) => (line[i] || '').replace(/^"|"$/g, '').trim();

                    const polTitle = getVal(0) || 'Admission Policy';
                    const scope = (getVal(1) || 'global').toLowerCase();
                    const tag = (getVal(2) || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
                    const promptText = getVal(3);

                    let extracted = {};
                    if (promptText && promptText.length > 5) {
                        // Use Groq AI LLaMA-3 to extract rich structured data from the prompt text
                        try {
                            extracted = await extractAdmissionRequirementsWithGroq(promptText);
                        } catch (err) {
                            console.warn(`Groq extraction fallback for row ${idx + 1}:`, err);
                        }
                    }

                    parsedList.push({
                        id: Math.random().toString(36).substring(7),
                        policyTitle: polTitle,
                        scope,
                        tag: scope === 'global' ? '' : tag,
                        minInterPercentage: extracted.minInterPercentage ?? parseFloat(getVal(3)) || 60,
                        minMatricPercentage: extracted.minMatricPercentage ?? parseFloat(getVal(4)) || 50,
                        allowedInterStreams: extracted.allowedInterStreams || ["Pre-Engineering", "ICS"],
                        requireEntryTest: extracted.requireEntryTest ?? true,
                        entryTests: extracted.entryTests || [{ testName: 'NTS NAT-IE', minScore: 50 }],
                        allowedDomicile: extracted.allowedDomicile || 'Open Merit (All Pakistan)',
                        maxAgeLimit: extracted.maxAgeLimit || 0,
                        minBachelorCgpa: extracted.minBachelorCgpa || 0,
                        requiredDocuments: extracted.requiredDocuments || ["Matric Marksheet", "FSc Marksheet", "CNIC"],
                        customRules: extracted.customRules || [],
                        extraRequirements: extracted.extraRequirements || promptText
                    });
                }
                setPolParsedData(parsedList);
            } catch (err) {
                console.error("Policy CSV processing error:", err);
                alert("Error processing CSV file.");
            } finally {
                setIsExtractingAi(false);
            }
        };
        reader.readAsText(file);
    };

    const handleBatchImportAdmissionPolicies = async () => {
        if (polParsedData.length === 0) return;
        setSubmitting(true);
        try {
            const mergedDirectory = [...admissionPoliciesDirectory, ...polParsedData];
            await updateUserProfile(currentUser.uid, {
                admissionPoliciesDirectory: mergedDirectory
            });

            setIsPolicyImportModalOpen(false);
            setPolCsvRawLines([]);
            setPolParsedData([]);
            alert("✨ All admission policies imported and merged successfully into Admission Policies Directory!");
        } catch (error) {
            console.error("Failed to import admission policies:", error);
            alert("Import failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPrograms = programs.filter(p =>
        (p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         p.degreeType?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen p-6 md:p-10 relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
            {/* Background Orbs */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                            Academic <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500">Console</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-455 text-sm font-medium">Manage your academic programs and scholarship policies</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Tab Switcher */}
                        <div className="flex bg-slate-200/60 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-300/40 dark:border-white/[0.06]">
                            <button
                                onClick={() => setActiveView('programs')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                    activeView === 'programs'
                                        ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]"
                                        : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70"
                                )}
                            >
                                Programs Directory
                            </button>
                            <button
                                onClick={() => setActiveView('scholarships')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                    activeView === 'scholarships'
                                        ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]"
                                        : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70"
                                )}
                            >
                                Scholarships Directory
                            </button>
                            <button
                                onClick={() => setActiveView('admission_policies')}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                    activeView === 'admission_policies'
                                        ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-white/[0.08]"
                                        : "text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white/70"
                                )}
                            >
                                Admission Policies Directory
                            </button>
                        </div>

                        {/* Import Button */}
                        {activeView === 'programs' && (
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="px-5 py-3 border border-slate-300 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/20 bg-white dark:bg-white/[0.04] text-slate-800 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
                            >
                                <UploadCloud size={14} /> Import Programs
                            </button>
                        )}
                        {activeView === 'scholarships' && (
                            <button
                                onClick={() => setIsSchImportModalOpen(true)}
                                className="px-5 py-3 border border-yellow-500/30 hover:border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
                            >
                                <UploadCloud size={14} /> Import Scholarships Directory
                            </button>
                        )}
                        {activeView === 'admission_policies' && (
                            <button
                                onClick={() => setIsPolicyImportModalOpen(true)}
                                className="px-5 py-3 border border-purple-500/30 hover:border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
                            >
                                <UploadCloud size={14} /> Import Admission Policies
                            </button>
                        )}
                    </div>
                </div>

                {/* ===== PROGRAMS DIRECTORY VIEW ===== */}
                {activeView === 'programs' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        
                        {/* Search & Actions Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl shadow-sm">
                            <div className="relative w-full sm:w-80 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search programs..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-xs font-medium transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                {/* Admission Toggle */}
                                <button
                                    onClick={async () => {
                                        if (!currentUser) return;
                                        const currentStatus = userProfile?.isAdmissionOpen !== false;
                                        await updateDoc(doc(db, 'users', currentUser.uid), { isAdmissionOpen: !currentStatus });
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition shadow-sm",
                                        userProfile?.isAdmissionOpen !== false
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                            : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                                    )}
                                >
                                    <span className={cn("w-2 h-2 rounded-full", userProfile?.isAdmissionOpen !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                    {userProfile?.isAdmissionOpen !== false ? "Admissions Open" : "Admissions Closed"}
                                </button>

                                {/* Manual Add Button */}
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 hover:opacity-95"
                                >
                                    <Plus size={16} /> Add Program
                                </button>
                            </div>
                        </div>

                        {/* List Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center py-32">
                                <Loader2 size={36} className="animate-spin text-cyan-500 mb-4" />
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Syncing dashboard...</p>
                            </div>
                        ) : filteredPrograms.length === 0 ? (
                            <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-white/[0.06] rounded-3xl bg-white dark:bg-white/[0.01]">
                                <BookOpen size={40} className="text-slate-350 dark:text-slate-700 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">No Academic Programs Offered</h3>
                                <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6">Create programs manually or import them using a CSV sheet.</p>
                                <button onClick={() => setIsModalOpen(true)} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition border border-slate-250 dark:border-white/[0.08]">Add Program</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ===== SCHOLARSHIPS DIRECTORY VIEW ===== */}
                {activeView === 'scholarships' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Scholarships Directory</h2>
                                <p className="text-slate-500 dark:text-slate-455 text-xs">Register global policies (auto-linked) and specific ones (mapped via Excel or forms)</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsSchImportModalOpen(true)}
                                    className="px-4 py-2.5 border border-slate-300 dark:border-white/[0.08] hover:border-slate-400 dark:hover:border-white/20 bg-white dark:bg-white/[0.04] text-slate-800 dark:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
                                >
                                    <UploadCloud size={14} /> Import CSV
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingScholarshipId(null);
                                        setScholarshipFormData({ title: '', scope: 'global', tag: '', type: 'merit', tiers: [] });
                                        setIsScholarshipModalOpen(true);
                                    }}
                                    className="px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center gap-1.5 hover:opacity-95"
                                >
                                    <Plus size={14} /> Add Scholarship Rule
                                </button>
                            </div>
                        </div>

                        {scholarshipDirectory.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/[0.06] rounded-3xl bg-white dark:bg-white/[0.01]">
                                <Award size={36} className="text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-slate-850 dark:text-white mb-0.5">No Scholarship Policies Defined</h3>
                                <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">Centralize your fee grants here to attach them to your courses.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {scholarshipDirectory.map((sch) => (
                                    <div key={sch.id} className="relative bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-5 overflow-hidden flex flex-col shadow-sm">
                                        <div className={cn("absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b", sch.scope === 'global' ? 'from-emerald-400 to-teal-500' : 'from-yellow-400 to-amber-500')} />
                                        
                                        <div className="flex justify-between items-start mb-3 pl-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{sch.title}</h4>
                                                <span className={cn("text-[9px] font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block border",
                                                    sch.scope === 'global'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                                )}>
                                                    {sch.scope === 'global' ? 'Global Policy (All courses)' : `Specific Policy (Tag: ${sch.tag})`}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingScholarshipId(sch.id);
                                                        setScholarshipFormData({
                                                            title: sch.title,
                                                            scope: sch.scope || 'global',
                                                            tag: sch.tag || '',
                                                            type: sch.type || 'merit',
                                                            tiers: sch.tiers || []
                                                        });
                                                        setIsScholarshipModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteScholarship(sch.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl pl-3 flex-1 border border-slate-100 dark:border-white/[0.04] text-xs">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Configured Tiers</div>
                                            {sch.tiers?.length === 0 ? (
                                                <p className="text-slate-400 font-medium">No tiers created. Click edit to configure ranges.</p>
                                            ) : (
                                                sch.tiers.map((tier, tIdx) => (
                                                    <div key={tIdx} className="flex justify-between items-center border-b last:border-b-0 border-slate-200 dark:border-white/[0.04] pb-1.5 last:pb-0 mb-1.5 last:mb-0 text-slate-600 dark:text-slate-350">
                                                        <span>
                                                            {sch.type === 'merit' ? `Marks ${tier.min}% to ${tier.max || 100}%` :
                                                             sch.type === 'position' ? `Position: ${tier.position}` :
                                                             sch.type === 'kinship' ? `Condition: ${tier.condition}` :
                                                             `Need: ${tier.condition}`}
                                                        </span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{tier.grant}% Off</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ===== ADMISSION POLICIES DIRECTORY VIEW ===== */}
                {activeView === 'admission_policies' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Central Admission Policies Directory</h2>
                                <p className="text-slate-500 dark:text-slate-455 text-xs">Create reusable admission policy templates (Global or Tag-specific) to auto-fill program requirements</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingPolicyId(null);
                                    setPolicyFormData({
                                        policyTitle: '',
                                        scope: 'global',
                                        tag: '',
                                        minInterPercentage: 60,
                                        minMatricPercentage: 50,
                                        requireEntryTest: true,
                                        entryTests: [{ testName: 'NTS NAT-IE', minScore: 50 }],
                                        allowedDomicile: 'Open Merit (All Pakistan)',
                                        requiredDocuments: ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form"],
                                        customRules: []
                                    });
                                    setIsPolicyModalOpen(true);
                                }}
                                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 flex items-center gap-1.5 hover:opacity-95"
                            >
                                <Plus size={14} /> Add Admission Policy Template
                            </button>
                        </div>

                        {admissionPoliciesDirectory.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/[0.06] rounded-3xl bg-white dark:bg-white/[0.01]">
                                <Award size={36} className="text-purple-400 mx-auto mb-3" />
                                <h3 className="text-base font-bold text-slate-850 dark:text-white mb-0.5">No Admission Policy Templates Created</h3>
                                <p className="text-slate-400 text-xs max-w-sm mx-auto mb-4">Create baseline policies here to apply them to your degree programs with 1 click.</p>
                                <button
                                    onClick={() => {
                                        setEditingPolicyId(null);
                                        setPolicyFormData({
                                            policyTitle: 'Standard Engineering & CS Policy',
                                            scope: 'global',
                                            tag: '',
                                            minInterPercentage: 60,
                                            minMatricPercentage: 50,
                                            requireEntryTest: true,
                                            entryTests: [{ testName: 'NTS NAT-IE / FAST Test', minScore: 50 }],
                                            allowedDomicile: 'Open Merit (All Pakistan)',
                                            requiredDocuments: ["Matric Marksheet", "FSc / Inter Marksheet", "CNIC / B-Form", "Test Scorecard"],
                                            customRules: [{ label: "Math Requirement", value: "Must have studied Mathematics in FSc" }]
                                        });
                                        setIsPolicyModalOpen(true);
                                    }}
                                    className="px-5 py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-bold"
                                >
                                    + Create Sample Policy Template
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {admissionPoliciesDirectory.map((pol) => (
                                    <div key={pol.id} className="relative bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-5 overflow-hidden flex flex-col shadow-sm">
                                        <div className={cn("absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b", pol.scope === 'global' ? 'from-purple-400 to-indigo-500' : 'from-cyan-400 to-blue-500')} />
                                        
                                        <div className="flex justify-between items-start mb-3 pl-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{pol.policyTitle}</h4>
                                                <span className={cn("text-[9px] font-black uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full inline-block border",
                                                    pol.scope === 'global'
                                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                                                        : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                                                )}>
                                                    {pol.scope === 'global' ? 'Global Policy Template' : `Tag Template (${pol.tag})`}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingPolicyId(pol.id);
                                                        setPolicyFormData(pol);
                                                        setIsPolicyModalOpen(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAdmissionPolicy(pol.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl pl-3 flex-1 border border-slate-100 dark:border-white/[0.04] text-xs">
                                            <div className="flex justify-between text-slate-600 dark:text-slate-350">
                                                <span>Min FSc / Matric:</span>
                                                <b className="text-slate-900 dark:text-white">{pol.minInterPercentage}% / {pol.minMatricPercentage}%</b>
                                            </div>
                                            <div className="flex justify-between text-slate-600 dark:text-slate-350">
                                                <span>Entry Tests ({pol.entryTests?.length || 0}):</span>
                                                <b className="text-cyan-500">{pol.entryTests?.map(t => t.testName).join(', ') || 'NTS NAT'}</b>
                                            </div>
                                            <div className="flex justify-between text-slate-600 dark:text-slate-350">
                                                <span>Domicile:</span>
                                                <b className="text-purple-500">{pol.allowedDomicile || 'Open Merit'}</b>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* ===== PROGRAM MANUAL ADD/EDIT MODAL ===== */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div onClick={handleCloseModal} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                        >
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="text-cyan-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingId ? "Edit Academic Offering" : "Add Academic Offering"}
                                    </h2>
                                </div>
                                <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <form id="programForm" onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Program Name/Title</label>
                                            <input required type="text" placeholder="e.g., Bachelor of Computer Science" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                                value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Degree Level</label>
                                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium cursor-pointer"
                                                value={formData.degreeType} onChange={e => setFormData({ ...formData, degreeType: e.target.value })}>
                                                <option value="Associate">Associate Degree</option>
                                                <option value="BS">Bachelor's (BS)</option>
                                                <option value="MS">Master's (MS)</option>
                                                <option value="PhD">Doctorate (PhD)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Per-Semester Fee Estimate</label>
                                            <input required type="text" placeholder="e.g., Rs. 95,000 / Semester" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                                value={formData.estimatedFee} onChange={e => setFormData({ ...formData, estimatedFee: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duration</label>
                                            <input required type="text" placeholder="e.g., 4 Years" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                                value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Semesters</label>
                                            <input required type="number" placeholder="e.g., 8" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                                value={formData.totalSemesters} onChange={e => setFormData({ ...formData, totalSemesters: e.target.value })} />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Course Overview</label>
                                            <textarea required rows={4} placeholder="Briefly introduce curriculum, highlights, etc..." className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium resize-none leading-relaxed"
                                                value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Dynamic Admission Requirements & Groq AI Section */}
                                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                    {/* Mapped Admission Policies Selection list */}
                                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Award size={16} className="text-purple-500" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Applicable Admission Eligibility Policies</h3>
                                        </div>
                                        
                                        {/* Informative notice for globals */}
                                        {admissionPoliciesDirectory.filter(p => p.scope === 'global').length > 0 && (
                                            <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-xs text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2 font-medium">
                                                <Info size={14} />
                                                <span>
                                                    {admissionPoliciesDirectory.filter(p => p.scope === 'global').map(p => `"${p.policyTitle}"`).join(', ')} (Global Policy) will be automatically linked to this program.
                                                </span>
                                            </div>
                                        )}

                                        {admissionPoliciesDirectory.filter(p => p.scope === 'specific').length === 0 ? (
                                            <p className="text-slate-400 text-xs">No program-specific policy templates created in Admission Policies Directory tab yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                {admissionPoliciesDirectory.filter(p => p.scope === 'specific').map((pol) => {
                                                    const isChecked = formData.admissionPolicies?.includes(pol.tag);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={pol.id}
                                                            onClick={() => {
                                                                const updated = isChecked
                                                                    ? (formData.admissionPolicies || []).filter(t => t !== pol.tag)
                                                                    : [...(formData.admissionPolicies || []), pol.tag];
                                                                setFormData({ ...formData, admissionPolicies: updated });
                                                            }}
                                                            className={cn("p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all text-xs font-semibold",
                                                                isChecked
                                                                    ? "border-purple-500 bg-purple-500/5 text-purple-600 dark:text-purple-400"
                                                                    : "border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01] hover:border-slate-300"
                                                            )}
                                                        >
                                                            <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                                                                isChecked ? "bg-purple-500 border-purple-500 text-white" : "border-slate-350 dark:border-slate-600"
                                                            )}>
                                                                {isChecked && <Check size={10} strokeWidth={4} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-bold text-slate-800 dark:text-slate-200">{pol.policyTitle}</div>
                                                                <div className="text-[10px] text-slate-400 opacity-80 mt-0.5">Tag: {pol.tag} (FSc Min: {pol.minInterPercentage}%)</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    </div>

                                    {/* Mapped Scholarships Selection list */}
                                    <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles size={16} className="text-yellow-500" fill="currentColor" />
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Applicable Scholarships</h3>
                                        </div>
                                        
                                        {/* Informative notice for globals */}
                                        {scholarshipDirectory.filter(s => s.scope === 'global').length > 0 && (
                                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2 font-medium">
                                                <Info size={14} />
                                                <span>
                                                    {scholarshipDirectory.filter(s => s.scope === 'global').map(s => `"${s.title}"`).join(', ')} (Global) will be automatically linked.
                                                </span>
                                            </div>
                                        )}

                                        {scholarshipDirectory.filter(s => s.scope === 'specific').length === 0 ? (
                                            <p className="text-slate-400 text-xs">No program-specific policies created in Scholarships Directory yet.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                {scholarshipDirectory.filter(s => s.scope === 'specific').map((sch) => {
                                                    const isChecked = formData.scholarships.includes(sch.tag);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={sch.id}
                                                            onClick={() => {
                                                                const updated = isChecked
                                                                    ? formData.scholarships.filter(t => t !== sch.tag)
                                                                    : [...formData.scholarships, sch.tag];
                                                                setFormData({ ...formData, scholarships: updated });
                                                            }}
                                                            className={cn("p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all text-xs font-semibold",
                                                                isChecked
                                                                    ? "border-yellow-500 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400"
                                                                    : "border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.01] hover:border-slate-300"
                                                            )}
                                                        >
                                                            <div className={cn("w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                                                                isChecked ? "bg-yellow-500 border-yellow-500 text-white" : "border-slate-350 dark:border-slate-600"
                                                            )}>
                                                                {isChecked && <Check size={10} strokeWidth={4} />}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-bold text-slate-800 dark:text-slate-200">{sch.title}</div>
                                                                <div className="text-[10px] text-slate-400 opacity-80 mt-0.5">Tag: {sch.tag}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition text-xs uppercase tracking-wider">Cancel</button>
                                <button type="submit" form="programForm" disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                                    {submitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                    {editingId ? "Save Changes" : "Create offering"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== CENTRAL SCHOLARSHIP EDIT MODAL ===== */}
            <AnimatePresence>
                {isScholarshipModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div onClick={() => setIsScholarshipModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[85vh]"
                        >
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <Award className="text-yellow-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingScholarshipId ? "Edit Scholarship Criteria" : "Create Scholarship Criteria"}
                                    </h2>
                                </div>
                                <button onClick={() => setIsScholarshipModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <form id="scholarshipForm" onSubmit={handleSaveScholarship} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scholarship Rule Title</label>
                                        <input required type="text" placeholder="e.g., Merit Fee Waiver" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                            value={scholarshipFormData.title} onChange={e => setScholarshipFormData({ ...scholarshipFormData, title: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scope of Policy</label>
                                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium cursor-pointer"
                                                value={scholarshipFormData.scope} onChange={e => setScholarshipFormData({ ...scholarshipFormData, scope: e.target.value })}>
                                                <option value="global">Global (Applies to all courses)</option>
                                                <option value="specific">Program-Specific (Selected courses)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type/Category</label>
                                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium cursor-pointer"
                                                value={scholarshipFormData.type} onChange={e => setScholarshipFormData({ ...scholarshipFormData, type: e.target.value })}>
                                                <option value="merit">Academic Merit-based</option>
                                                <option value="position">Position Holders</option>
                                                <option value="kinship">Kinship / Siblings</option>
                                                <option value="need">Need-based Financial Aid</option>
                                            </select>
                                        </div>
                                    </div>

                                    {scholarshipFormData.scope === 'specific' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Specific Tag Identifier (lowercase, no spaces)</label>
                                            <input required type="text" placeholder="e.g., women-tech" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-sm font-medium"
                                                value={scholarshipFormData.tag} onChange={e => setScholarshipFormData({ ...scholarshipFormData, tag: e.target.value })} />
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Tiers & Criteria Ranges</label>
                                        <ScholarshipManager
                                            value={scholarshipFormData.tiers.map(t => ({
                                                id: t.id,
                                                scholarshipTitle: scholarshipFormData.title,
                                                type: scholarshipFormData.type,
                                                criteriaTitle: t.criteriaTitle || scholarshipFormData.criteriaTitle || 'Intermediate (Local Board) - Inter Part II (12th) - F.Sc Pre-Medical',
                                                minPercentage: t.min,
                                                maxPercentage: t.max,
                                                position: t.position,
                                                condition: t.condition,
                                                grantPercentage: t.grant
                                            }))}
                                            onChange={(updatedFlatList) => {
                                                const rebuiltTiers = updatedFlatList.map(item => ({
                                                    id: item.id || Math.random().toString(),
                                                    criteriaTitle: item.criteriaTitle || '',
                                                    min: item.minPercentage || '',
                                                    max: item.maxPercentage || '',
                                                    position: item.position || '',
                                                    condition: item.condition || '',
                                                    grant: item.grantPercentage || ''
                                                }));
                                                const topCriteria = rebuiltTiers[0]?.criteriaTitle || '';
                                                setScholarshipFormData(prev => ({ 
                                                    ...prev, 
                                                    criteriaTitle: topCriteria,
                                                    tiers: rebuiltTiers 
                                                }));
                                            }}
                                        />
                                    </div>
                                </form>
                            </div>

                            <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                                <button type="button" onClick={() => setIsScholarshipModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition text-xs uppercase tracking-wider">Cancel</button>
                                <button type="submit" form="scholarshipForm" className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center gap-1.5">
                                    <CheckCircle size={14} /> Save Policy
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== CENTRAL ADMISSION POLICY EDIT MODAL ===== */}
            <AnimatePresence>
                {isPolicyModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div onClick={() => setIsPolicyModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[85vh]"
                        >
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <Award className="text-purple-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingPolicyId ? "Edit Admission Policy Template" : "Create Admission Policy Template"}
                                    </h2>
                                </div>
                                <button onClick={() => setIsPolicyModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <form id="policyForm" onSubmit={handleSaveAdmissionPolicy} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Policy Template Title</label>
                                        <input required type="text" placeholder="e.g., Standard Engineering & CS Criteria" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-medium"
                                            value={policyFormData.policyTitle} onChange={e => setPolicyFormData({ ...policyFormData, policyTitle: e.target.value })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Scope</label>
                                            <select className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-medium cursor-pointer"
                                                value={policyFormData.scope} onChange={e => setPolicyFormData({ ...policyFormData, scope: e.target.value })}>
                                                <option value="global">Global (Applies to all courses)</option>
                                                <option value="specific">Tag-Specific (e.g. computer science)</option>
                                            </select>
                                        </div>

                                        {policyFormData.scope === 'specific' && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Specific Tag Identifier</label>
                                                <input required type="text" placeholder="e.g. cs, engineering, medical" className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-250 dark:border-white/[0.08] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-sm font-medium"
                                                    value={policyFormData.tag} onChange={e => setPolicyFormData({ ...policyFormData, tag: e.target.value })} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Groq AI Prospectus Auto-Fill Card */}
                                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-300">
                                                <Wand2 size={14} /> Auto-Fill Policy with Groq AI (LLaMA-3)
                                            </div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Groq Powered</span>
                                        </div>
                                        <textarea
                                            rows={2}
                                            value={aiProspectusText}
                                            onChange={(e) => setAiProspectusText(e.target.value)}
                                            placeholder="Paste prospectus text here to extract policies automatically..."
                                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:border-purple-500"
                                        />
                                        <button
                                            type="button"
                                            disabled={isExtractingAi}
                                            onClick={handleAiExtract}
                                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-95 disabled:opacity-50"
                                        >
                                            {isExtractingAi ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                            {isExtractingAi ? "Extracting Policy..." : "✨ Auto-Fill Policy with AI"}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Intermediate %</label>
                                            <input type="number" min="0" max="100" value={policyFormData.minInterPercentage} onChange={e => setPolicyFormData({ ...policyFormData, minInterPercentage: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Min Matric %</label>
                                            <input type="number" min="0" max="100" value={policyFormData.minMatricPercentage} onChange={e => setPolicyFormData({ ...policyFormData, minMatricPercentage: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allowed Domicile</label>
                                            <select
                                                value={policyFormData.allowedDomicile}
                                                onChange={(e) => setPolicyFormData({ ...policyFormData, allowedDomicile: e.target.value })}
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                                            >
                                                <option value="Open Merit (All Pakistan)">Open Merit (All Pakistan)</option>
                                                <option value="Punjab Only">Punjab Domicile Only</option>
                                                <option value="Sindh Only">Sindh Domicile Only</option>
                                                <option value="KPK Only">KPK Domicile Only</option>
                                                <option value="Balochistan Only">Balochistan Domicile Only</option>
                                                <option value="Islamabad Capital Territory">Islamabad CT Only</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Dynamic Entry Tests Array Builder */}
                                    <div className="p-4 bg-slate-100/80 dark:bg-white/[0.02] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-white">
                                                <input
                                                    type="checkbox"
                                                    checked={policyFormData.requireEntryTest}
                                                    onChange={(e) => setPolicyFormData({ ...policyFormData, requireEntryTest: e.target.checked })}
                                                    className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                                                />
                                                Require Entry Test?
                                            </label>
                                            {policyFormData.requireEntryTest && (
                                                <button
                                                    type="button"
                                                    onClick={addPolicyEntryTest}
                                                    className="px-2.5 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold hover:bg-purple-500/30 transition flex items-center gap-1"
                                                >
                                                    <Plus size={12} /> Add Entry Test
                                                </button>
                                            )}
                                        </div>

                                        {policyFormData.requireEntryTest && (
                                            <div className="space-y-2">
                                                {policyFormData.entryTests?.map((t, tIdx) => (
                                                    <div key={tIdx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <input
                                                            type="text"
                                                            value={t.testName}
                                                            onChange={(e) => updatePolicyEntryTest(tIdx, 'testName', e.target.value)}
                                                            placeholder="Entry Test Name (e.g. NTS NAT-IE)"
                                                            className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400 font-medium">Min %:</span>
                                                            <input
                                                                type="number"
                                                                min="0" max="100"
                                                                value={t.minScore}
                                                                onChange={(e) => updatePolicyEntryTest(tIdx, 'minScore', parseFloat(e.target.value) || 0)}
                                                                className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold text-center"
                                                            />
                                                        </div>
                                                        {policyFormData.entryTests.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removePolicyEntryTest(tIdx)}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Dynamic Custom Rules Array Builder */}
                                    <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Custom Dynamic Criteria & Rules</span>
                                            <button
                                                type="button"
                                                onClick={addPolicyCustomRule}
                                                className="px-2.5 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold hover:bg-purple-500/30 transition flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add Custom Rule
                                            </button>
                                        </div>

                                        {policyFormData.customRules?.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 italic">No custom rules added. Click "+ Add Custom Rule" for degree-specific conditions.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {policyFormData.customRules?.map((r, rIdx) => (
                                                    <div key={rIdx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <input
                                                            type="text"
                                                            value={r.label}
                                                            onChange={(e) => updatePolicyCustomRule(rIdx, 'label', e.target.value)}
                                                            placeholder="Rule Label (e.g. Work Experience)"
                                                            className="w-1/3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={r.value}
                                                            onChange={(e) => updatePolicyCustomRule(rIdx, 'value', e.target.value)}
                                                            placeholder="Rule Value (e.g. Min 2 years corporate experience)"
                                                            className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removePolicyCustomRule(rIdx)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                                <button type="button" onClick={() => setIsPolicyModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition text-xs uppercase tracking-wider">Cancel</button>
                                <button type="submit" form="policyForm" className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                    <CheckCircle size={14} /> Save Policy Template
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== EXCEL / CSV IMPORT MODAL ===== */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <UploadCloud className="text-cyan-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Program Catalog</h2>
                                </div>
                                <button onClick={() => { setIsImportModalOpen(false); setCsvRawLines([]); setParsedData([]); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {csvRawLines.length === 0 ? (
                                    /* Upload Drop Area */
                                    <div className="h-full flex flex-col items-center justify-center border-3 border-dashed border-slate-250 dark:border-white/[0.08] hover:border-cyan-500/55 rounded-3xl p-10 bg-slate-50/50 dark:bg-white/[0.01] transition-all cursor-pointer relative group">
                                        <input
                                            type="file" accept=".csv"
                                            onChange={handleFileDrop}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Catalog CSV</h3>
                                        <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed mb-4">Drag and drop your prospectus CSV here or click to browse files.</p>
                                        
                                        {/* Quick Sample notice */}
                                        <div className="p-4 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] rounded-xl text-left max-w-md w-full text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                            <div className="font-bold uppercase tracking-wider mb-2 text-slate-400">💡 Recommended CSV Format Headers:</div>
                                            <code className="font-mono text-cyan-600 dark:text-cyan-400 font-bold block mb-3">Title, Level, Duration, Semesters, Fee, Description, Scholarships</code>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); downloadSampleCSV('programs'); }}
                                                className="w-full py-2 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 z-20 relative cursor-pointer"
                                            >
                                                <Download size={14} />
                                                Download Sample CSV Template
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Preview Panel & Column Mapping */
                                    <div className="space-y-6">
                                        
                                        {/* Step 1: Mapping panel */}
                                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-5 rounded-2xl">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">1. Confirm Column Matching</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                {[
                                                    { field: 'title', label: 'Program Title *' },
                                                    { field: 'degreeType', label: 'Degree Level' },
                                                    { field: 'duration', label: 'Duration' },
                                                    { field: 'totalSemesters', label: 'Semesters' },
                                                    { field: 'estimatedFee', label: 'Semester Fee *' },
                                                    { field: 'description', label: 'Overview' },
                                                    { field: 'scholarshipTags', label: 'Scholarships Tags' },
                                                ].map((col) => (
                                                    <div key={col.field} className="flex flex-col gap-1.5">
                                                        <span className="font-bold text-slate-400">{col.label}</span>
                                                        <select
                                                            value={mappingColumns[col.field] !== undefined ? mappingColumns[col.field] : ''}
                                                            onChange={(e) => setMappingColumns({ ...mappingColumns, [col.field]: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                                                            className="px-3 py-2 border border-slate-250 dark:border-white/[0.08] bg-white dark:bg-slate-900 rounded-lg text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-cyan-500/20"
                                                        >
                                                            <option value="">[Ignore Column]</option>
                                                            {csvHeaders.map((header, idx) => (
                                                                <option key={idx} value={idx}>{header}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Step 2: Live Grid Preview */}
                                        <div>
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">2. Preview Validated Rows ({parsedData.length} records)</h3>
                                            
                                            <div className="border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100 dark:bg-white/[0.04] text-slate-400 uppercase text-[9px] font-black border-b border-slate-200 dark:border-white/[0.06]">
                                                            <th className="p-4 w-16">Status</th>
                                                            <th className="p-4">Program Title</th>
                                                            <th className="p-4 w-24">Level</th>
                                                            <th className="p-4 w-24">Semesters</th>
                                                            <th className="p-4 w-32">Semester Fee</th>
                                                            <th className="p-4">Mapped Scholarships</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04] text-slate-600 dark:text-slate-350">
                                                        {parsedData.map((row, rIdx) => {
                                                            const isValid = row.title && row.estimatedFee;
                                                            const hasGlobals = scholarshipDirectory.filter(s => s.scope === 'global').length > 0;
                                                            return (
                                                                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                                                    <td className="p-4">
                                                                        {isValid ? (
                                                                            <span className="inline-flex p-1 rounded-lg bg-emerald-500/10 text-emerald-500"><Check size={12} strokeWidth={3} /></span>
                                                                        ) : (
                                                                            <span className="inline-flex p-1 rounded-lg bg-rose-500/10 text-rose-500" title="Missing Title or Fee"><ShieldAlert size={12} strokeWidth={3} /></span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{row.title || <span className="text-red-400 italic font-medium">[Required]</span>}</td>
                                                                    <td className="p-4">{row.degreeType}</td>
                                                                    <td className="p-4">{row.totalSemesters} Sem</td>
                                                                    <td className="p-4 font-semibold text-slate-800 dark:text-white">{row.estimatedFee || <span className="text-red-400 italic font-medium">[Required]</span>}</td>
                                                                    <td className="p-4">
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {hasGlobals && (
                                                                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">Global Auto-Applied</span>
                                                                            )}
                                                                            {row.scholarshipTags.map((tag) => {
                                                                                const match = scholarshipDirectory.find(s => s.tag === tag);
                                                                                return (
                                                                                    <span key={tag} className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold border",
                                                                                        match
                                                                                            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                                                                            : "bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400"
                                                                                    )} title={match ? `Matches: ${match.title}` : `Unregistered scholarship tag: will create placeholder`}>
                                                                                        {tag} {!match && '⚠️'}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <button
                                    onClick={() => { setCsvRawLines([]); setParsedData([]); }}
                                    disabled={csvRawLines.length === 0}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-250 dark:border-white/[0.08] text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition disabled:opacity-30"
                                >
                                    Reset File
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setIsImportModalOpen(false); setCsvRawLines([]); setParsedData([]); }}
                                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition text-xs uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleImportSubmit}
                                        disabled={csvRawLines.length === 0 || submitting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                        Start Import
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== SCHOLARSHIPS IMPORT MODAL ===== */}
            <AnimatePresence>
                {isSchImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                        >
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <UploadCloud className="text-yellow-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Scholarships Directory</h2>
                                </div>
                                <button onClick={() => { setIsSchImportModalOpen(false); setSchCsvRawLines([]); setSchParsedData([]); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {schCsvRawLines.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center border-3 border-dashed border-slate-250 dark:border-white/[0.08] hover:border-yellow-500/55 rounded-3xl p-10 bg-slate-50/50 dark:bg-white/[0.01] transition-all cursor-pointer relative group">
                                        <input
                                            type="file" accept=".csv"
                                            onChange={handleSchFileDrop}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Scholarships CSV</h3>
                                        <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed mb-4">Drag and drop your scholarships CSV here or click to browse.</p>
                                        
                                        <div className="p-4 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] rounded-xl text-left max-w-md w-full text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                            <div className="font-bold uppercase tracking-wider mb-2 text-slate-400">💡 Recommended CSV Columns:</div>
                                            <code className="font-mono text-yellow-600 dark:text-yellow-400 font-bold block mb-3">Title, Scope (global/specific), Tag, Type, Min, Max, Grant</code>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); downloadSampleCSV('scholarships'); }}
                                                className="w-full py-2 px-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 z-20 relative cursor-pointer"
                                            >
                                                <Download size={14} />
                                                Download Sample CSV Template
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-5 rounded-2xl">
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">1. Confirm Column Mapping</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                {[
                                                    { field: 'title', label: 'Scholarship Title *' },
                                                    { field: 'scope', label: 'Scope (Global/Specific)' },
                                                    { field: 'tag', label: 'Tag (if Specific)' },
                                                    { field: 'type', label: 'Type' },
                                                    { field: 'criteriaTitle', label: 'Criteria Title' },
                                                    { field: 'min', label: 'Min Requirement' },
                                                    { field: 'max', label: 'Max Requirement' },
                                                    { field: 'grant', label: 'Grant % *' },
                                                ].map((col) => (
                                                    <div key={col.field} className="flex flex-col gap-1.5">
                                                        <span className="font-bold text-slate-400">{col.label}</span>
                                                        <select
                                                            value={schMappingColumns[col.field] !== undefined ? schMappingColumns[col.field] : ''}
                                                            onChange={(e) => setSchMappingColumns({ ...schMappingColumns, [col.field]: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                                                            className="px-3 py-2 border border-slate-250 dark:border-white/[0.08] bg-white dark:bg-slate-900 rounded-lg text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-cyan-500/20"
                                                        >
                                                            <option value="">[Ignore Column]</option>
                                                            {schCsvHeaders.map((header, idx) => (
                                                                <option key={idx} value={idx}>{header}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-3">2. Preview Validated Scholarships ({schParsedData.length} unique rules)</h3>
                                                                              <div className="space-y-4">
                                                {schParsedData.map((row, rIdx) => {
                                                    const isValid = row.title && (row.scope === 'global' || row.tag);
                                                    return (
                                                        <div key={row.id || rIdx} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-2xl p-5 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all">
                                                            {/* Top Row: Basic Info */}
                                                            <div className="flex flex-wrap items-center justify-between gap-4 pb-3.5 border-b border-slate-150 dark:border-white/[0.05] mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    {isValid ? (
                                                                        <span className="inline-flex p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0"><Check size={14} strokeWidth={3} /></span>
                                                                    ) : (
                                                                        <span className="inline-flex p-1.5 rounded-xl bg-rose-500/10 text-rose-500 shrink-0" title="Missing Title or Tag"><ShieldAlert size={14} strokeWidth={3} /></span>
                                                                    )}
                                                                    <div>
                                                                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">{row.title || <span className="text-red-400 italic">[Required Title]</span>}</h4>
                                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                            <span className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border",
                                                                                row.scope === 'global'
                                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                                                            )}>
                                                                                {row.scope}
                                                                            </span>
                                                                            {row.tag && (
                                                                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 border border-slate-250 dark:border-white/[0.06]">
                                                                                    Tag: {row.tag}
                                                                                </span>
                                                                            )}
                                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                                                                Type: {row.type}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Bottom Row: Tiers & Education Mapping */}
                                                            <div>
                                                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Tiers & Target Education Class Mapping</div>
                                                                <div className="grid grid-cols-1 gap-2.5">
                                                                    {row.tiers.map((t, tIdx) => (
                                                                        <div key={tIdx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/[0.05] shadow-sm">
                                                                            {/* Left side: range & grant */}
                                                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-355">
                                                                                {t.min ? (
                                                                                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold">
                                                                                        {t.min}% - {t.max || 100}% Marks
                                                                                    </span>
                                                                                ) : t.position ? (
                                                                                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold max-w-[150px] truncate" title={t.position}>
                                                                                        {t.position}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 font-extrabold max-w-[150px] truncate" title={t.condition}>
                                                                                        {t.condition || 'Rule'}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-slate-300 dark:text-slate-700">→</span>
                                                                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                                                                    {t.grant}% Waiver
                                                                                </span>
                                                                            </div>

                                                                            {/* Right side: select */}
                                                                            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                                                                                <span className="text-[9px] text-slate-400 dark:text-slate-505 font-black uppercase tracking-wider">For Class:</span>
                                                                                <select
                                                                                    value={t.criteriaTitle}
                                                                                    onChange={(e) => {
                                                                                        const updatedTiers = row.tiers.map((item, idx) => idx === tIdx ? { ...item, criteriaTitle: e.target.value } : item);
                                                                                        const updated = schParsedData.map(s => s.title === row.title ? { ...s, criteriaTitle: updatedTiers[0].criteriaTitle, tiers: updatedTiers } : s);
                                                                                        setSchParsedData(updated);
                                                                                    }}
                                                                                    className="w-full md:w-[320px] px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-750 dark:text-slate-300 focus:outline-none cursor-pointer hover:border-slate-350 transition"
                                                                                >
                                                                                    {getFlatEducationOptions().map((opt, oIdx) => (
                                                                                        <option key={oIdx} value={opt}>{opt}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <button
                                    onClick={() => { setSchCsvRawLines([]); setSchParsedData([]); }}
                                    disabled={schCsvRawLines.length === 0}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-250 dark:border-white/[0.08] text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition disabled:opacity-30"
                                >
                                    Reset File
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setIsSchImportModalOpen(false); setSchCsvRawLines([]); setSchParsedData([]); }}
                                        className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition text-xs uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSchImportSubmit}
                                        disabled={schCsvRawLines.length === 0 || submitting}
                                        className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 flex items-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                        Start Import
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== PROGRAM VIEW DETAILS MODAL ===== */}
            <AnimatePresence>
                {isViewModalOpen && selectedProgram && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div onClick={() => setIsViewModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[90vh]"
                        >
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 z-10" />

                            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-8 md:p-10">
                                <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition z-25">
                                    <X size={20} />
                                </button>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    {/* Left */}
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="w-20 h-20 bg-cyan-500/10 rounded-2xl flex items-center justify-center border-2 border-cyan-200/30 text-cyan-600 dark:text-cyan-400 shadow-xl shadow-cyan-500/5">
                                            <GraduationCap size={40} />
                                        </div>
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">
                                                {selectedProgram.degreeType} PROGRAM
                                            </div>
                                            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{selectedProgram.title}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { icon: Clock, label: "Duration", value: selectedProgram.duration },
                                                { icon: Calendar, label: "Total Semesters", value: selectedProgram.totalSemesters },
                                                { icon: DollarSign, label: "Estimated Fee", value: selectedProgram.estimatedFee }
                                            ].map((stat, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/[0.05]">
                                                    <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400">
                                                        <stat.icon size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                                                        <p className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{stat.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right */}
                                    <div className="lg:col-span-7 space-y-6 lg:pl-6 border-t pt-6 lg:border-t-0 lg:pt-0 lg:border-l border-slate-200 dark:border-slate-800">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <BookOpen size={18} className="text-cyan-500" />
                                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Program Overview</h3>
                                            </div>
                                            <p className="p-5 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-150 dark:border-white/[0.05] leading-relaxed text-slate-600 dark:text-slate-300 text-xs font-semibold whitespace-pre-wrap">
                                                {selectedProgram.description}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Sparkles size={18} className="text-yellow-500" fill="currentColor" />
                                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Linked Scholarships Directory Policies</h3>
                                            </div>
                                            
                                            {!selectedProgram.scholarships || selectedProgram.scholarships.length === 0 ? (
                                                <div className="text-center p-8 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.05] text-slate-400 text-xs">
                                                    No scholarships configured for this program.
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                    {selectedProgram.scholarships.map((sch, sIdx) => (
                                                        <div key={sIdx} className="relative overflow-hidden bg-slate-50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/[0.05] rounded-xl p-4 pl-6">
                                                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-yellow-500" />
                                                            <div className="flex justify-between items-center gap-3">
                                                                <h4 className="font-bold text-slate-900 dark:text-white text-xs">{sch.criteriaTitle || sch.scholarshipTitle}</h4>
                                                                <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[9px] font-black rounded-full uppercase tracking-wider">{sch.grantPercentage}% Off</span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-2">
                                                                {sch.type === 'merit' || !sch.type ? (
                                                                    `Requirement: Min ${sch.minPercentage}% Marks`
                                                                ) : sch.type === 'position' ? (
                                                                    `Position: ${sch.position}`
                                                                ) : (
                                                                    `Condition: ${sch.condition}`
                                                                )}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ===== ADMISSION POLICIES DIRECTORY CSV IMPORT MODAL ===== */}
            <AnimatePresence>
                {isPolicyImportModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden"
                        >
                            <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-3">
                                    <UploadCloud className="text-purple-500" size={24} />
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Admission Policies Directory</h2>
                                </div>
                                <button onClick={() => { setIsPolicyImportModalOpen(false); setPolCsvRawLines([]); setPolParsedData([]); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {polCsvRawLines.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center border-3 border-dashed border-slate-250 dark:border-white/[0.08] hover:border-purple-500/55 rounded-3xl p-10 bg-slate-50/50 dark:bg-white/[0.01] transition-all cursor-pointer relative group">
                                        <input
                                            type="file" accept=".csv"
                                            onChange={handlePolicyFileDrop}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Admission Policies CSV</h3>
                                        <p className="text-xs text-slate-400 text-center max-w-xs leading-relaxed mb-4">Drag and drop your policies CSV sheet here or click to browse files.</p>
                                        
                                        <div className="p-4 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] rounded-xl text-left max-w-md w-full text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                                            <div className="font-bold uppercase tracking-wider mb-2 text-slate-400">💡 Recommended CSV Headers:</div>
                                            <code className="font-mono text-purple-600 dark:text-purple-400 font-bold block mb-3">Policy_Title, Scope, Tag, Min_Inter_Pct, Min_Matric_Pct, Allowed_Streams, Require_Entry_Test, Entry_Tests, Allowed_Domicile, Custom_Rules</code>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); downloadSampleCSV('admission_policies'); }}
                                                className="w-full py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 z-20 relative cursor-pointer"
                                            >
                                                <Download size={14} />
                                                Download Sample Policies CSV Template
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Previewing {polParsedData.length} Policy Rules Ready to Merge</h3>
                                            <button
                                                onClick={() => { setPolCsvRawLines([]); setPolParsedData([]); }}
                                                className="text-xs text-purple-500 font-bold hover:underline"
                                            >
                                                Upload Different CSV File
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {polParsedData.map((pol, idx) => (
                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                                                    <div className="flex justify-between items-center font-bold">
                                                        <span className="text-slate-900 dark:text-white">{pol.policyTitle}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 text-[10px] font-black uppercase">{pol.scope} {pol.tag && `(${pol.tag})`}</span>
                                                    </div>
                                                    <div className="text-slate-500">Min FSc: {pol.minInterPercentage}% | Min Matric: {pol.minMatricPercentage}%</div>
                                                    <div className="text-slate-500">Entry Tests: {pol.entryTests.map(t => t.testName).join(', ')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {polParsedData.length > 0 && (
                                <div className="flex-shrink-0 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                    <span className="text-xs text-slate-400 font-medium">{polParsedData.length} admission policy rules parsed</span>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => { setIsPolicyImportModalOpen(false); setPolCsvRawLines([]); setPolParsedData([]); }} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 text-xs uppercase tracking-wider">Cancel</button>
                                        <button type="button" onClick={handleBatchImportAdmissionPolicies} disabled={submitting} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                            {submitting ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                            Merge & Import {polParsedData.length} Policies
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManagerPrograms;