import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, Edit2, Map, Bus, Clock, Phone,
    Navigation, Save, X, Search, MapPin, User,
    Camera, Loader2, ImageIcon, Image as ImageIcon2, UploadCloud, Sparkles, Download
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

const ManagerTransport = () => {
    const { currentUser } = useAuth();
    const [transport, setTransport] = useState([]);
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
        vehicle: { number: '', model: '', capacity: '' },
        vehicleImages: [], // Array of URLs
        route: { name: '', start: '', end: '', departureTime: '', arrivalTime: '' },
        stops: [], // Array of strings
        driver: { name: '', phone: '' },
        managerPhone: '' // New Field
    };

    const [formData, setFormData] = useState(initialFormState);
    const [newStop, setNewStop] = useState('');

    // File Upload State
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'transport'),
            where('universityId', '==', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const transportData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTransport(transportData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleOpenModal = (item = null) => {
        setSelectedFiles([]);
        setPreviews([]);

        if (item) {
            setEditMode(item.id);
            setFormData({
                ...initialFormState,
                ...item,
                managerPhone: item.managerPhone || '' // Handle backward compatibility
            });
            // Show existing images as previews
            if (item.vehicleImages && item.vehicleImages.length > 0) {
                setPreviews(item.vehicleImages);
            }
        } else {
            setEditMode(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const validFiles = [];
        const newPreviews = [];

        files.forEach(file => {
            const validation = validateImageFile(file);
            if (validation.isValid) {
                validFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            } else {
                toast.error(`Error with ${file.name}: ${validation.error}`);
            }
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        setPreviews(prev => [...prev, ...newPreviews]);
    };

    const removeImage = (index) => {
        const imageToRemove = previews[index];

        // If it's a blob (new file)
        if (imageToRemove.startsWith('blob:')) {
            const blobIndex = selectedFiles.findIndex(f => URL.createObjectURL(f) === imageToRemove);
            if (blobIndex !== -1) {
                const newFiles = [...selectedFiles];
                newFiles.splice(blobIndex, 1);
                setSelectedFiles(newFiles);
            }
        } else {
            // It's an existing URL
            setFormData(prev => ({
                ...prev,
                vehicleImages: prev.vehicleImages.filter(url => url !== imageToRemove)
            }));
        }

        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);

        try {
            let finalImages = [...(formData.vehicleImages || [])];

            // Upload new files
            if (selectedFiles.length > 0) {
                try {
                    const uploadPromises = selectedFiles.map(file => uploadToCloudinary(file));
                    const uploadedUrls = await Promise.all(uploadPromises);
                    finalImages = [...finalImages, ...uploadedUrls];
                } catch (error) {
                    console.error("Image upload failed:", error);
                    toast.error("Failed to upload some images.");
                    setUploading(false);
                    return;
                }
            }

            const dataToSave = {
                ...formData,
                vehicleImages: finalImages,
                universityId: currentUser.uid
            };

            if (editMode) {
                await updateDoc(doc(db, 'transport', editMode), dataToSave);
                toast.success("Transport updated!");
            } else {
                await addDoc(collection(db, 'transport'), {
                    ...dataToSave,
                    createdAt: new Date()
                });
                toast.success("New transport added!");
            }
            setFormData({ vehicleNumber: '', vehicleModel: '', capacity: '', routeName: '', routeStart: '', routeEnd: '', departureTime: '', arrivalTime: '', driverName: '', driverPhone: '', managerPhone: '', stops: [''] });
            setEditMode(null);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving transport:", error);
            toast.error("Failed to save transport.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to remove this vehicle route?")) {
            await deleteDoc(doc(db, 'transport', id));
            toast.success("Transport route removed.");
        }
    };

    // Helper functions for dynamic stops
    const addStop = () => {
        if (!newStop) return;
        setFormData(prev => ({ ...prev, stops: [...prev.stops, newStop] }));
        setNewStop('');
    };

    const removeStop = (index) => {
        setFormData(prev => ({
            ...prev,
            stops: prev.stops.filter((_, i) => i !== index)
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
                // Vehicle
                if (hLower.includes('vehicle number') || hLower.includes('plate')) initialMap['vNumber'] = index;
                else if (hLower.includes('model') || hLower.includes('vehicle model')) initialMap['vModel'] = index;
                else if (hLower.includes('capacity') || hLower.includes('seats')) initialMap['vCapacity'] = index;
                // Route
                else if (hLower.includes('route name')) initialMap['rName'] = index;
                else if (hLower.includes('start') || hLower.includes('origin')) initialMap['rStart'] = index;
                else if (hLower.includes('end') || hLower.includes('destination')) initialMap['rEnd'] = index;
                else if (hLower.includes('departure')) initialMap['rDeparture'] = index;
                else if (hLower.includes('arrival')) initialMap['rArrival'] = index;
                // Driver
                else if (hLower.includes('driver name')) initialMap['dName'] = index;
                else if (hLower.includes('driver phone')) initialMap['dPhone'] = index;
                // Manager & Stops
                else if (hLower.includes('manager phone')) initialMap['mPhone'] = index;
                else if (hLower.includes('stops') || hLower.includes('points')) initialMap['stops'] = index;
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
                vehicle: {
                    number: getVal('vNumber') || 'Unnamed',
                    model: getVal('vModel'),
                    capacity: getVal('vCapacity')
                },
                route: {
                    name: getVal('rName') || 'Unnamed Route',
                    start: getVal('rStart'),
                    end: getVal('rEnd'),
                    departureTime: getVal('rDeparture'),
                    arrivalTime: getVal('rArrival')
                },
                driver: {
                    name: getVal('dName'),
                    phone: getVal('dPhone')
                },
                managerPhone: getVal('mPhone'),
                stops: parseArray(getVal('stops')),
                vehicleImages: [], // Left blank intentionally for CSV
            };
        });

        setParsedData(processed);
    }, [csvRawLines, mappingColumns]);

    const handleBatchSubmit = async () => {
        if (parsedData.length === 0) return;
        setSubmitting(true);

        try {
            const batchPromises = parsedData.map(async (t) => {
                const dataToSave = {
                    vehicle: t.vehicle,
                    route: t.route,
                    driver: t.driver,
                    managerPhone: t.managerPhone,
                    stops: t.stops,
                    vehicleImages: [],
                    universityId: currentUser.uid,
                    createdAt: new Date()
                };
                return addDoc(collection(db, 'transport'), dataToSave);
            });

            await Promise.all(batchPromises);
            setIsImportModalOpen(false);
            setCsvRawLines([]);
            setParsedData([]);
            toast.success(`${parsedData.length} transport routes imported successfully!`);
        } catch (error) {
            console.error("Failed to import transport batch:", error);
            toast.error("Import failed.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTransport = transport.filter(t =>
        t.route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Map className="text-emerald-500" /> Transport Fleet
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage university buses, routes, and schedules</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-500 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-bold transition-all"
                    >
                        <UploadCloud size={20} /> Import CSV
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all"
                    >
                        <Plus size={20} /> Add New Route
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className="relative max-w-md mb-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search route or bus number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all dark:text-white"
                />
            </div>

            {/* Transport Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading transport data...</div>
            ) : filteredTransport.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <Bus size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Transport Added Yet</h3>
                    <p className="text-slate-500 dark:text-slate-500">Add buses and routes for student convenience.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTransport.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:border-emerald-500/30 transition-all duration-300"
                        >
                            {/* Card Header: Route & Bus */}
                            <div className="relative h-40 overflow-hidden bg-slate-200 dark:bg-slate-800">
                                {item.vehicleImages && item.vehicleImages.length > 0 ? (
                                    <img
                                        src={item.vehicleImages[0]}
                                        alt="Vehicle"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Bus size={40} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(item)} className="p-2 bg-white/10 backdrop-blur-md rounded-lg text-white hover:bg-white/20">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-500/80 backdrop-blur-md rounded-lg text-white hover:bg-red-600/80">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="absolute bottom-4 left-4 text-white">
                                    <div className="bg-emerald-500 text-xs font-bold px-2 py-1 rounded-md inline-block mb-1">
                                        {item.vehicle.number}
                                    </div>
                                    <h3 className="text-lg font-bold">{item.route.name}</h3>
                                </div>
                            </div>

                            {/* Route Details */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-slate-900 dark:text-white">{item.route.departureTime}</p>
                                        <p className="text-xs text-slate-500">{item.route.start}</p>
                                    </div>
                                    <div className="flex-1 px-4 flex flex-col items-center">
                                        <div className="w-full h-px bg-slate-300 dark:bg-slate-700 relative">
                                            <div className="absolute left-0 -top-1 w-2 h-2 bg-slate-400 rounded-full" />
                                            <div className="absolute right-0 -top-1 w-2 h-2 bg-emerald-500 rounded-full" />
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Direct Route</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-900 dark:text-white">{item.route.arrivalTime}</p>
                                        <p className="text-xs text-slate-500">{item.route.end}</p>
                                    </div>
                                </div>

                                {/* Stops Accordion/List */}
                                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <MapPin size={12} /> Key Stops
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {item.stops.length > 0 ? item.stops.slice(0, 4).map((stop, i) => (
                                            <span key={i} className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                                                {stop}
                                            </span>
                                        )) : <span className="text-xs text-slate-400">No active stops listed</span>}
                                        {item.stops.length > 4 && (
                                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500">
                                                +{item.stops.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Driver & Manager Info */}
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <User size={14} className="text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Driver</p>
                                                <p className="text-sm text-slate-900 dark:text-white font-medium">{item.driver.name}</p>
                                            </div>
                                        </div>
                                        <a href={`tel:${item.driver.phone}`} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" title="Call Driver">
                                            <Phone size={14} />
                                        </a>
                                    </div>

                                    {item.managerPhone && (
                                        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg border border-amber-100 dark:border-amber-900/20">
                                            <span className="text-xs font-bold text-amber-600 dark:text-amber-500">Manager Contact</span>
                                            <a href={`tel:${item.managerPhone}`} className="text-xs font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-amber-600 transition-colors">
                                                <Phone size={12} /> {item.managerPhone}
                                            </a>
                                        </div>
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
                                    {editMode ? 'Edit Transport Route' : 'Add New Transport'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <X size={24} className="text-slate-500" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                                {/* Vehicle Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                        <Bus size={16} /> Vehicle Information
                                    </h3>

                                    {/* Image Uploads */}
                                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <div className="flex items-center gap-4 mb-4">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
                                            >
                                                <Camera size={16} />
                                                <span>Add Vehicle Photos</span>
                                            </button>
                                            <span className="text-xs text-slate-500">Supports multiple images</span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            {previews.map((src, idx) => (
                                                <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 group">
                                                    <img src={src} alt="Preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                            {previews.length === 0 && (
                                                <div className="flex flex-col items-center justify-center w-24 h-24 text-slate-400">
                                                    <ImageIcon2 size={24} />
                                                    <span className="text-[10px] mt-1">No Images</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bus Number</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.vehicle.number}
                                                onChange={e => setFormData({ ...formData, vehicle: { ...formData.vehicle, number: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                placeholder="LHR-1234"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Model/Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.vehicle.model}
                                                onChange={e => setFormData({ ...formData, vehicle: { ...formData.vehicle, model: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Hino Coaster 2024"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacity</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.vehicle.capacity}
                                                onChange={e => setFormData({ ...formData, vehicle: { ...formData.vehicle, capacity: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                placeholder="50 Seats"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Route & Schedule */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                        <Navigation size={16} /> Route & Schedule
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Route Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.route.name}
                                                onChange={e => setFormData({ ...formData, route: { ...formData.route, name: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Route 1 (North Campus)"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Start Point</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.route.start}
                                                    onChange={e => setFormData({ ...formData, route: { ...formData.route, start: e.target.value } })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="Main Terminal"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">End Point</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.route.end}
                                                    onChange={e => setFormData({ ...formData, route: { ...formData.route, end: e.target.value } })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="University Campus"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Departure Time</label>
                                                <input
                                                    type="time"
                                                    value={formData.route.departureTime}
                                                    onChange={e => setFormData({ ...formData, route: { ...formData.route, departureTime: e.target.value } })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Arrival Time</label>
                                                <input
                                                    type="time"
                                                    value={formData.route.arrivalTime}
                                                    onChange={e => setFormData({ ...formData, route: { ...formData.route, arrivalTime: e.target.value } })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Stops & Driver */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Stops */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                            <MapPin size={16} /> Stops List
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newStop}
                                                onChange={e => setNewStop(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white"
                                                placeholder="Add a stop..."
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStop())}
                                            />
                                            <button
                                                type="button"
                                                onClick={addStop}
                                                className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 rounded-lg hover:bg-emerald-200"
                                            >Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.stops.map((stop, i) => (
                                                <span key={i} className="flex items-center gap-1 text-sm p-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    {stop}
                                                    <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => removeStop(i)} />
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Driver Assignment & Manager */}
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                            <User size={16} /> Personnel Info
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver Name</label>
                                            <input
                                                type="text"
                                                value={formData.driver.name}
                                                onChange={e => setFormData({ ...formData, driver: { ...formData.driver, name: e.target.value } })}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                placeholder="Full Name"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Driver Phone</label>
                                                <input
                                                    type="tel"
                                                    value={formData.driver.phone}
                                                    onChange={e => setFormData({ ...formData, driver: { ...formData.driver, phone: e.target.value } })}
                                                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent dark:text-white focus:ring-2 focus:ring-emerald-500"
                                                    placeholder="0300-1234567"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-amber-600 dark:text-amber-500">Manager Contact</label>
                                                <input
                                                    type="tel"
                                                    value={formData.managerPhone}
                                                    onChange={e => setFormData({ ...formData, managerPhone: e.target.value })}
                                                    className="w-full px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/10 dark:text-white focus:ring-2 focus:ring-amber-500"
                                                    placeholder="0321-7654321"
                                                />
                                            </div>
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
                                        className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {editMode ? 'Update Transport' : 'Save Transport'}
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
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <UploadCloud size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Transport via CSV</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Upload and map your vehicle and route data</p>
                                    </div>
                                </div>
                                <button onClick={() => { setIsImportModalOpen(false); setCsvRawLines([]); setParsedData([]); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {csvRawLines.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 rounded-3xl bg-emerald-50 dark:bg-emerald-500/5 relative group transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700">
                                        <input
                                            type="file" accept=".csv"
                                            onChange={handleFileDrop}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="w-16 h-16 bg-white dark:bg-slate-800 shadow-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <UploadCloud size={28} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Transport CSV</h3>
                                        <p className="text-sm text-slate-500 text-center max-w-sm mb-4">Drag and drop your CSV file here, or click to browse files.</p>
                                        
                                        {/* Premium Format Guide */}
                                        <div className="mt-8 w-full max-w-4xl bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm relative z-20">
                                            <div className="flex items-center gap-2 mb-4 justify-center">
                                                <Sparkles className="text-amber-500" size={16} />
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Optimal CSV Structure</span>
                                            </div>
                                            
                                            <div className="flex flex-wrap justify-center gap-2 mx-auto">
                                                {/* Required */}
                                                {['Vehicle Number', 'Route Name', 'Route Start', 'Route End', 'Departure Time'].map((header) => (
                                                    <div key={header} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        {header}
                                                    </div>
                                                ))}
                                                {/* Recommended/Optional */}
                                                {['Vehicle Model', 'Capacity', 'Arrival Time', 'Stops', 'Driver Name', 'Driver Phone', 'Manager Phone'].map((header) => (
                                                    <div key={header} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                                        {header}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row justify-center items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Required Fields
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span> Optional Fields
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); downloadSampleCSV('transport'); }}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer z-30"
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
                                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">1</div>
                                                Map Columns
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {[
                                                    { field: 'vNumber', label: 'Vehicle Number' },
                                                    { field: 'vModel', label: 'Vehicle Model' },
                                                    { field: 'vCapacity', label: 'Capacity' },
                                                    { field: 'rName', label: 'Route Name' },
                                                    { field: 'rStart', label: 'Route Start' },
                                                    { field: 'rEnd', label: 'Route End' },
                                                    { field: 'rDeparture', label: 'Departure Time' },
                                                    { field: 'rArrival', label: 'Arrival Time' },
                                                    { field: 'dName', label: 'Driver Name' },
                                                    { field: 'dPhone', label: 'Driver Phone' },
                                                    { field: 'mPhone', label: 'Manager Phone' },
                                                    { field: 'stops', label: 'Stops (pipe separated)' }
                                                ].map(({ field, label }) => (
                                                    <div key={field} className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                                                        <select
                                                            value={mappingColumns[field] !== undefined ? mappingColumns[field] : ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                                                setMappingColumns(prev => ({ ...prev, [field]: val }));
                                                            }}
                                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
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
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">2</div>
                                                    Data Preview <span className="text-sm font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{parsedData.length} entries</span>
                                                </h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {parsedData.slice(0, 12).map((item, i) => (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex flex-col gap-3">
                                                        <div className="flex justify-between items-start mb-2 border-b border-slate-200 dark:border-slate-700/50 pb-2">
                                                            <div className="flex gap-2">
                                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                                    <Bus size={20} />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{item.route.name}</div>
                                                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded uppercase">{item.vehicle.number}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex items-start gap-2">
                                                                <MapPin size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">From</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.route.start}</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <MapPin size={14} className="text-rose-500 mt-0.5 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">To</div>
                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.route.end}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-slate-200 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                <Clock size={12} className="text-slate-400" />
                                                                {item.route.departureTime}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                                <User size={12} className="text-slate-400" />
                                                                {item.driver.name || 'No Driver'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {parsedData.length > 12 && (
                                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center flex-col text-slate-500">
                                                        <span className="text-xl font-bold">+{parsedData.length - 12}</span>
                                                        <span className="text-xs">more routes</span>
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
                                        className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {submitting ? 'Importing...' : `Import ${parsedData.length} Routes`}
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

export default ManagerTransport;
