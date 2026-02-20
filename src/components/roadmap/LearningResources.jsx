import React from 'react';
import { BookOpen, ExternalLink, Video, Star, Clock, BarChart } from 'lucide-react';

const LearningResources = ({ resources = [] }) => {
    if (!resources || resources.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
                    <BookOpen size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No courses found</h3>
                <p className="text-slate-500 text-sm">Try exploring other topics or check back later.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
            {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
            ))}
        </div>
    );
};

const ResourceCard = ({ resource }) => {
    const Icon = resource.type === 'video' ? Video : BookOpen;

    // Safer tag extraction
    const tags = resource.tags ? resource.tags.split(',') : [];
    const mainTag = tags[0] ? tags[0].trim() : (resource.level || 'Course');

    return (
        <div className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-300 h-full">

            {/* Header Area */}
            <div className="p-5 flex justify-between items-start border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {resource.type === 'video' ? 'Video Tutorial' : 'Course'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-sm max-w-[150px] truncate">
                        {mainTag}
                    </span>
                </div>
                {resource.rating && (
                    <div className="flex items-center gap-1 text-amber-500 font-bold bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs">{resource.rating}</span>
                    </div>
                )}
            </div>

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-3">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {resource.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            By {resource.provider}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <BarChart size={14} className="text-slate-400" />
                        <span className="truncate">{resource.level || 'All Levels'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <Clock size={14} className="text-slate-400" />
                        <span className="truncate">{resource.duration}</span>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 pt-0">
                <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-900/20 dark:hover:shadow-white/20 transition-all duration-300"
                >
                    Start Learning <ExternalLink size={16} />
                </a>
            </div>
        </div>
    );
};

export default LearningResources;
