import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Printer, Award, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import EduNestLogo from '../assets/EduNest.png';
import Sign from '../assets/sign.png';
import Stamp from '../assets/stamp.png';

const Certificate = ({ isOpen, onClose, data }) => {
    const certificateRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !data) return null;

    const {
        studentName,
        email,
        skill,
        score,
        date,
        certificateId = `CERT-${Date.now().toString().slice(-6)}`
    } = data;

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        const element = certificateRef.current;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`EduNest_Certificate_${skill.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error("Certificate generation failed:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full mx-auto flex flex-col max-h-[90vh]"
                    >
                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-t-2xl no-print">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Award className="text-amber-500" /> Certificate Preview
                            </h3>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePrint}
                                    className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                >
                                    <Printer size={18} /> Print
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-70"
                                >
                                    {isGenerating ? 'Generating...' : <><Download size={18} /> Download PDF</>}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Certificate Content Area */}
                        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">

                            {/* THE CERTIFICATE */}
                            <div
                                ref={certificateRef}
                                className="w-[1123px] h-[794px] bg-white text-slate-900 relative shadow-2xl mx-auto flex-shrink-0 overflow-hidden border-[16px] border-double border-slate-900 select-none"
                                style={{
                                    transform: 'scale(0.8)',
                                    transformOrigin: 'center center'
                                }}
                            >
                                {/* Background Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                    <img src={EduNestLogo} alt="Watermark" className="w-[600px] h-[600px] object-contain grayscale" />
                                </div>

                                {/* Ornamental Corners */}
                                <div className="absolute top-6 left-6 w-24 h-24 border-t-4 border-l-4 border-amber-500" />
                                <div className="absolute top-6 right-6 w-24 h-24 border-t-4 border-r-4 border-amber-500" />
                                <div className="absolute bottom-6 left-6 w-24 h-24 border-b-4 border-l-4 border-amber-500" />
                                <div className="absolute bottom-6 right-6 w-24 h-24 border-b-4 border-r-4 border-amber-500" />

                                <div className="relative z-10 h-full flex flex-col py-10 px-16">

                                    {/* Header */}
                                    <div className="text-center mb-4">
                                        <div className="flex items-center justify-center gap-3 mb-2">
                                            <img src={EduNestLogo} alt="EduNest" className="h-12 object-contain" />
                                        </div>
                                        <h1 className="text-5xl font-black uppercase tracking-widest text-slate-900 font-serif mb-1">
                                            Certificate
                                        </h1>
                                        <h2 className="text-xl font-light text-slate-500 uppercase tracking-[0.2em]">
                                            of Achievement
                                        </h2>
                                    </div>

                                    {/* Body */}
                                    <div className="text-center space-y-5 flex-1">
                                        <p className="text-base text-slate-500 italic font-serif">This certifies that</p>

                                        <div className="border-b-2 border-slate-300 pb-1 px-12 inline-block min-w-[500px]">
                                            <h3 className="text-4xl font-bold font-serif text-slate-900 capitalize">
                                                {studentName}
                                            </h3>
                                        </div>

                                        <p className="text-base text-slate-600 leading-relaxed">
                                            <span className="block mb-1 font-serif italic text-slate-500">has successfully completed the comprehensive assessment for</span>
                                            <strong className="text-2xl text-indigo-700 block mt-2 font-bold uppercase">{skill}</strong>
                                        </p>

                                        <p className="text-sm text-slate-600 mt-3">
                                            Achieving a score of <strong className="text-emerald-600 text-lg">{score}%</strong> in the Final Certification Exam.
                                        </p>

                                        {/* Professional Paragraph */}
                                        <div className="max-w-3xl mx-auto mt-4 px-6">
                                            <p className="text-xs text-slate-600 leading-relaxed text-justify">
                                                This certificate recognizes the exceptional dedication and mastery demonstrated in completing a rigorous educational assessment.
                                                The recipient has shown comprehensive understanding of core concepts, practical application skills, and the ability to analyze
                                                complex scenarios. Through EduNest's advanced learning platform, this achievement reflects countless hours of study, practice,
                                                and commitment to academic excellence. This credential serves as a testament to the holder's proficiency and readiness to apply
                                                their knowledge in real-world contexts, marking a significant milestone in their educational journey.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Footer - Signatures */}
                                    <div className="w-full flex items-end justify-between mt-4 mb-2">
                                        {/* Date */}
                                        <div className="text-center">
                                            <div className="border-b-2 border-slate-400 pb-1 mb-1 w-40 mx-auto">
                                                <p className="text-sm font-medium text-slate-800">{date}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Date of Issue</p>
                                        </div>

                                        {/* Seal */}
                                        <div className="relative -mt-3">
                                            <img src={Stamp} alt="Official Seal" className="w-24 h-24 object-contain opacity-90 drop-shadow-xl" />
                                        </div>

                                        {/* Signature */}
                                        <div className="text-center">
                                            <div className="relative h-16 w-40 mb-1 flex items-end justify-center">
                                                <img src={Sign} alt="Signature" className="absolute bottom-0 w-32 object-contain" />
                                                <div className="w-full border-b-2 border-slate-400"></div>
                                            </div>
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Authorized Signature</p>
                                            <p className="text-xs text-slate-400">EduNest Administration</p>
                                        </div>
                                    </div>

                                    {/* Verification Footer */}
                                    <div className="w-full text-center border-t border-slate-200 pt-2 mt-2">
                                        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 tracking-wide flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck size={11} /> Verified
                                            </span>
                                            <span>•</span>
                                            <span>ID: {certificateId}</span>
                                            <span>•</span>
                                            <span>edu.nest273@gmail.com</span>
                                            <span>•</span>
                                            <span>www.edunest.com</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">© {new Date().getFullYear()} EduNest Learning Platform. All Rights Reserved.</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Certificate;
