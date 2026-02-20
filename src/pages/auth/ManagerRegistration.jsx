import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Building, MapPin, Upload, FileText } from 'lucide-react';

const ManagerRegistration = () => {
    const [formData, setFormData] = useState({
        universityName: '',
        location: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { currentUser, submitManagerDetails } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Mock Doc Upload - In real app, upload to Firebase Storage here
            const details = {
                ...formData,
                documentUrl: "mock_url_placeholder",
                submittedAt: new Date().toISOString()
            };
            await submitManagerDetails(currentUser.uid, details);
            navigate('/manager/pending');
        } catch (err) {
            console.error(err);
            alert("Error submitting form.");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 py-10">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8"
            >
                <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white">University Registration</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">Complete your profile to request Admin approval.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">University Name</label>
                            <div className="relative">
                                <input
                                    type="text" required
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.universityName}
                                    onChange={e => setFormData({ ...formData, universityName: e.target.value })}
                                />
                                <Building className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location (City, Country)</label>
                            <div className="relative">
                                <input
                                    type="text" required
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                                <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description / About</label>
                        <textarea
                            rows="4" required
                            className="w-full p-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Accreditation Document</label>
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                            <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                            <div className="text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                            </div>
                            <p className="text-xs text-slate-500 mt-1">PDF, JPG up to 10MB (Mock Upload)</p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-70"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit to Admin'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ManagerRegistration;
