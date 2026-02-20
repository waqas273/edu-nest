import React, { useMemo } from 'react';
import {
    CheckCircle, Circle, Map, User, Calendar,
    BookOpen, Trophy, Star, Shield, Zap
} from 'lucide-react';
import logo from '../../assets/EduNest.png';

const RoadmapPDF = ({ topics = [], skill, user }) => {
    // Helper to calculate analytics
    const stats = useMemo(() => {
        let total = 0;
        let completed = 0;
        topics.forEach(t => {
            total++;
            if (t.status === 'completed') completed++;
            if (t.subtopics) {
                t.subtopics.forEach(s => {
                    total++;
                    if (s.status === 'completed') completed++;
                });
            }
        });
        return { total, completed, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) };
    }, [topics]);

    // Split topics into pages (approximately 4 main topics per page for better layout)
    const TOPICS_PER_PAGE = 4;
    const pages = [];
    for (let i = 0; i < topics.length; i += TOPICS_PER_PAGE) {
        pages.push(topics.slice(i, i + TOPICS_PER_PAGE));
    }

    return (
        <div id="roadmap-pdf-export" className="bg-white font-sans text-slate-900" style={{ width: '800px' }}>
            {/* ========== PAGE 1: COVER PAGE ========== */}
            <div className="relative min-h-[1120px] p-12 flex flex-col" style={{ pageBreakAfter: 'always' }}>
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <img src={logo} alt="" className="w-[500px] h-[500px] object-contain" />
                </div>

                {/* Header with Logo */}
                <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="EduNest" className="w-16 h-16 object-contain" />
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">EduNest</h2>
                            <p className="text-sm text-slate-500 font-medium">AI-Powered Learning Platform</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-sm text-slate-500 font-medium">
                            <Calendar size={16} />
                            <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                {/* Cover Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
                            <Map size={18} />
                            Professional Learning Roadmap
                        </div>
                    </div>

                    <h1 className="text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        {skill}
                    </h1>

                    <p className="text-xl text-slate-500 font-medium max-w-lg mb-12">
                        A structured learning path designed for mastery
                    </p>

                    {/* User Info Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 w-full max-w-md mb-12">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                {user?.displayName?.charAt(0) || 'S'}
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-slate-900">{user?.displayName || 'Student'}</p>
                                <p className="text-sm text-slate-500">{user?.email || 'learner@edunest.com'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-6 w-full max-w-lg">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                            <Zap className="mx-auto mb-2 text-blue-600" size={24} />
                            <p className="text-3xl font-black text-blue-700">{stats.percentage}%</p>
                            <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Progress</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                            <Trophy className="mx-auto mb-2 text-purple-600" size={24} />
                            <p className="text-3xl font-black text-purple-700">{stats.completed}</p>
                            <p className="text-xs font-bold text-purple-500 uppercase tracking-wider">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-emerald-50 rounded-xl">
                            <BookOpen className="mx-auto mb-2 text-emerald-600" size={24} />
                            <p className="text-3xl font-black text-emerald-700">{stats.total}</p>
                            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Nodes</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-slate-400 text-xs font-medium relative z-10">
                    <p>Generated by EduNest AI • Your Path to Mastery</p>
                </div>
            </div>

            {/* ========== CONTENT PAGES ========== */}
            {pages.map((pageTopics, pageIdx) => (
                <div
                    key={pageIdx}
                    className="relative min-h-[1120px] p-10"
                    style={{ pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' }}
                >
                    {/* Watermark on every page */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                        <img src={logo} alt="" className="w-[400px] h-[400px] object-contain" />
                    </div>

                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-100 relative z-10">
                        <div className="flex items-center gap-3">
                            <img src={logo} alt="EduNest" className="w-8 h-8 object-contain" />
                            <span className="font-bold text-slate-900">{skill}</span>
                        </div>
                        <span className="text-sm text-slate-400 font-medium">Page {pageIdx + 2}</span>
                    </div>

                    {/* Tree Structure Content */}
                    <div className="relative z-10">
                        {pageTopics.map((topic, idx) => {
                            const globalIdx = pageIdx * TOPICS_PER_PAGE + idx;
                            return (
                                <div key={topic.id} className="mb-10 break-inside-avoid">
                                    {/* Main Topic Node */}
                                    <div className="flex items-start gap-4 mb-4">
                                        {/* Tree Node Circle */}
                                        <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-xl font-black border-3 
                                            ${topic.status === 'completed'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                                : 'bg-white border-slate-300 text-slate-700'
                                            }`}
                                            style={{ borderWidth: '3px' }}
                                        >
                                            {topic.status === 'completed' ? <CheckCircle size={28} /> : globalIdx + 1}
                                        </div>

                                        {/* Topic Content */}
                                        <div className="flex-1 pt-2">
                                            <h2 className="text-xl font-black text-slate-900 mb-1 leading-tight">
                                                {topic.title}
                                            </h2>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                {topic.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Subtopics Tree Branch */}
                                    {topic.subtopics && topic.subtopics.length > 0 && (
                                        <div className="ml-7 pl-7 border-l-2 border-slate-200">
                                            {/* Tree branches to subtopics */}
                                            <div className="relative">
                                                {topic.subtopics.map((sub, sIdx) => {
                                                    const isSubDone = sub.status === 'completed';
                                                    return (
                                                        <div key={sub.id} className="relative flex items-start gap-3 mb-3 break-inside-avoid">
                                                            {/* Horizontal connector line */}
                                                            <div className="absolute -left-7 top-3 w-5 h-0.5 bg-slate-200" />

                                                            {/* Sub Node Circle */}
                                                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2
                                                                ${isSubDone
                                                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-500'
                                                                    : 'bg-white border-slate-200 text-slate-400'
                                                                }`}
                                                            >
                                                                {isSubDone ? <CheckCircle size={14} /> : <Circle size={10} />}
                                                            </div>

                                                            {/* Subtopic Content */}
                                                            <div className="flex-1 pt-0.5">
                                                                <h3 className={`text-sm font-bold ${isSubDone ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                                    {sub.title}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 leading-snug">
                                                                    {sub.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Page Footer */}
                    <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="" className="w-4 h-4 object-contain opacity-50" />
                            <span>EduNest Learning Platform</span>
                        </div>
                        <span>Roadmap: {skill}</span>
                    </div>
                </div>
            ))}

            {/* ========== FINAL PAGE: SUMMARY ========== */}
            <div className="relative min-h-[1120px] p-12 flex flex-col" style={{ pageBreakBefore: 'always' }}>
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                    <img src={logo} alt="" className="w-[500px] h-[500px] object-contain" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="EduNest" className="w-10 h-10 object-contain" />
                        <span className="font-bold text-xl text-slate-900">EduNest</span>
                    </div>
                    <span className="text-sm text-slate-400 font-medium">Summary</span>
                </div>

                {/* Summary Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg">
                        <Trophy className="text-white" size={48} />
                    </div>

                    <h2 className="text-4xl font-black text-slate-900 mb-4">
                        {stats.percentage === 100 ? 'Roadmap Completed!' : 'Keep Learning!'}
                    </h2>

                    <p className="text-lg text-slate-500 font-medium max-w-md mb-12">
                        {stats.percentage === 100
                            ? 'Congratulations on completing your learning journey!'
                            : `You've completed ${stats.percentage}% of your ${skill} roadmap. Keep going!`}
                    </p>

                    {/* Final Stats */}
                    <div className="w-full max-w-sm bg-slate-50 rounded-2xl p-6 mb-12">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-medium">Total Topics</span>
                                <span className="text-xl font-black text-slate-900">{topics.length}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-medium">Total Nodes</span>
                                <span className="text-xl font-black text-slate-900">{stats.total}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-medium">Completed</span>
                                <span className="text-xl font-black text-emerald-600">{stats.completed}</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-center">
                                <span className="text-slate-900 font-bold">Overall Progress</span>
                                <span className="text-2xl font-black text-cyan-600">{stats.percentage}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-sm">
                        <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                                style={{ width: `${stats.percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src={logo} alt="EduNest" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-slate-900">EduNest</span>
                    </div>
                    <p className="text-sm text-slate-400">
                        AI-Powered Learning Platform • www.edunest.com
                    </p>
                    <p className="text-xs text-slate-300 mt-2">
                        Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RoadmapPDF;
