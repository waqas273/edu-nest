import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GraduationCap, Percent, ArrowRight, Sparkles, Layers, AlertCircle } from 'lucide-react';
import EducationSelector from './EducationSelector';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const ScholarshipManager = ({ value = [], onChange }) => {
    // Internal state: Array of Groups
    // Group Structure: { id: string, educationString: string, tiers: [ { id: string, min: string, grant: string } ] }
    const [groups, setGroups] = useState([]);

    // 1. Sync extraction: Convert flat prop array to grouped internal state
    useEffect(() => {
        // Group by criteriaTitle
        const grouped = {};
        value.forEach(item => {
            const title = item.criteriaTitle || '';
            if (!grouped[title]) {
                grouped[title] = [];
            }
            grouped[title].push(item);
        });

        const newGroups = Object.keys(grouped).map(title => ({
            id: uuidv4(), // Temporary UI ID
            educationString: title,
            tiers: grouped[title].map(item => ({
                id: item.id || uuidv4(),
                min: item.minPercentage,
                grant: item.grantPercentage
            }))
        }));

        // Only update if strictly different to avoid loops (simple length/content check could be added if needed, but for now relying on user interaction triggers)
        // actually, to avoid blowing away local edits while typing, we should only sync if the simplified structure is wildly different
        // For now, we will simply INITIALIZE from props, but subsequent updates will be driven by local state pushing changes UP.
        // We only reset if value becomes empty externally (e.g. form reset)
        if (value.length === 0 && groups.length > 0) {
            setGroups([]);
        } else if (groups.length === 0 && value.length > 0) {
            setGroups(newGroups);
        }
    }, [value.length]); // Dependency reduced to length to avoid infinite loops on object identity

    // 2. Helper to broadcast changes
    const broadcastChange = (updatedGroups) => {
        const flatList = [];
        updatedGroups.forEach(group => {
            group.tiers.forEach(tier => {
                flatList.push({
                    id: tier.id,
                    criteriaTitle: group.educationString,
                    minPercentage: tier.min,
                    grantPercentage: tier.grant
                });
            });
        });
        onChange(flatList);
    };

    const addGroup = () => {
        const newGroup = {
            id: uuidv4(),
            educationString: '',
            tiers: [{ id: uuidv4(), min: '', grant: '' }]
        };
        const updated = [...groups, newGroup];
        setGroups(updated);
        // We generally don't broadcast empty groups until they have valid data, 
        // but for consistency we can, the parent validator will likely strip empty ones or we can filter them.
        broadcastChange(updated);
    };

    const removeGroup = (groupId) => {
        const updated = groups.filter(g => g.id !== groupId);
        setGroups(updated);
        broadcastChange(updated);
    };

    const updateGroupEducation = (groupId, newString) => {
        const updated = groups.map(g =>
            g.id === groupId ? { ...g, educationString: newString } : g
        );
        setGroups(updated);
        broadcastChange(updated);
    };

    const addTier = (groupId) => {
        const updated = groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    tiers: [...g.tiers, { id: uuidv4(), min: '', grant: '' }]
                };
            }
            return g;
        });
        setGroups(updated);
        broadcastChange(updated);
    };

    const removeTier = (groupId, tierId) => {
        const updated = groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    tiers: g.tiers.filter(t => t.id !== tierId)
                };
            }
            return g;
        });
        // If no tiers left, remove group? Or just leave empty? Let's leave empty.
        setGroups(updated);
        broadcastChange(updated);
    };

    const updateTier = (groupId, tierId, field, val) => {
        const updated = groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    tiers: g.tiers.map(t => t.id === tierId ? { ...t, [field]: val } : t)
                };
            }
            return g;
        });
        setGroups(updated);
        broadcastChange(updated);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Scholarship Criteria</label>
                    <p className="text-xs text-slate-400">Define eligibility tiers for different education levels.</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addGroup}
                    className="text-xs font-bold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={14} strokeWidth={3} /> Add Education Class
                </motion.button>
            </div>

            {groups.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20"
                >
                    <Sparkles size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-500">No active scholarship criteria</p>
                </motion.div>
            ) : (
                <div className="grid gap-6">
                    <AnimatePresence mode='popLayout'>
                        {groups.map((group, index) => (
                            <motion.div
                                key={group.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group/card relative overflow-hidden bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20"
                            >
                                {/* Decorative Gradient Header */}
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />

                                <div className="p-6 pl-8">
                                    {/* Header with Selector */}
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                                        <div className="flex-1 min-w-[300px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-md">
                                                    <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">Target Education</span>
                                            </div>
                                            <EducationSelector
                                                value={group.educationString}
                                                onChange={(val) => updateGroupEducation(group.id, val)}
                                                allowAny={true}
                                                placeholder="Select Class (e.g. Intermediate)..."
                                            />
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            type="button"
                                            onClick={() => removeGroup(group.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all self-start"
                                        >
                                            <Trash2 size={18} />
                                        </motion.button>
                                    </div>

                                    {/* Tiers Section */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4 px-2">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                                <Layers size={12} /> Eligibility Tiers
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {group.tiers.map((tier, tIdx) => (
                                                    <motion.div
                                                        key={tier.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="flex items-center gap-3 group/tier relative"
                                                    >
                                                        {/* Min % Input */}
                                                        <div className="relative flex-1">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                <span className="text-xs font-bold text-slate-400">Min</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                placeholder="85"
                                                                className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white focus:border-indigo-500 outline-none transition-all placeholder:font-normal"
                                                                value={tier.min}
                                                                onChange={(e) => updateTier(group.id, tier.id, 'min', e.target.value)}
                                                            />
                                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                                <Percent size={12} className="text-slate-400" />
                                                            </div>
                                                        </div>

                                                        <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />

                                                        {/* Grant % Input */}
                                                        <div className="relative flex-1">
                                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                                <span className="text-xs font-bold text-emerald-500">Grant</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                placeholder="50"
                                                                className="w-full pl-12 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 ring-1 ring-emerald-500/10 rounded-lg text-sm font-bold text-emerald-700 dark:text-emerald-400 focus:border-emerald-500 outline-none transition-all placeholder:font-normal"
                                                                value={tier.grant}
                                                                onChange={(e) => updateTier(group.id, tier.id, 'grant', e.target.value)}
                                                            />
                                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                                <Percent size={12} className="text-emerald-500/50" />
                                                            </div>
                                                        </div>

                                                        {/* Delete Tier */}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTier(group.id, tier.id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => addTier(group.id)}
                                            className="mt-4 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14} /> Add Scholarship Tier
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default ScholarshipManager;
