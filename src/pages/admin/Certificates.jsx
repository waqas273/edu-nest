import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Award, Eye, Calendar, User, Mail, Trophy } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import Certificate from '../../components/Certificate';

const Certificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    useEffect(() => {
        const certificatesRef = collection(db, 'certificates');
        const q = query(certificatesRef, orderBy('issuedDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const certsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                issuedDate: doc.data().issuedDate?.toDate() || new Date()
            }));
            setCertificates(certsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching certificates:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredCertificates = certificates.filter(cert =>
        cert.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificateId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.skill?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const handleViewCertificate = (cert) => {
        setSelectedCertificate({
            studentName: cert.studentName,
            email: cert.email,
            skill: cert.skill,
            score: cert.score,
            date: formatDate(cert.issuedDate),
            certificateId: cert.certificateId
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-8 relative overflow-hidden transition-colors duration-300">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-200/40 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-200/40 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Award size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                                Certificates Management
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">View and manage all issued certificates</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, ID, email, or skill..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Certificates Table */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-white/50 dark:bg-slate-900/30 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredCertificates.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-white/50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-3xl backdrop-blur-sm"
                    >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Award size={32} className="text-slate-400 dark:text-slate-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Certificates Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            {searchTerm ? "Try adjusting your search query." : "No certificates have been issued yet."}
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl dark:shadow-none"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Certificate ID</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Skill</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Issued</th>
                                        <th className="text-left py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredCertificates.map((cert, index) => (
                                        <motion.tr
                                            key={cert.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Award size={14} className="text-amber-500" />
                                                    <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                                        {cert.certificateId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <User size={14} className="text-slate-400" />
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {cert.studentName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} className="text-slate-400" />
                                                    <span className="text-slate-600 dark:text-slate-300 text-sm">
                                                        {cert.email}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                                    {cert.skill}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Trophy size={14} className="text-emerald-500" />
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        {cert.score}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">
                                                        {formatDate(cert.issuedDate)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <button
                                                    onClick={() => handleViewCertificate(cert)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-500/20"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Total Count */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Showing <strong className="text-slate-900 dark:text-white">{filteredCertificates.length}</strong> of <strong className="text-slate-900 dark:text-white">{certificates.length}</strong> certificates
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Certificate Modal */}
            {selectedCertificate && (
                <Certificate
                    isOpen={!!selectedCertificate}
                    onClose={() => setSelectedCertificate(null)}
                    data={selectedCertificate}
                />
            )}
        </div>
    );
};

export default Certificates;
