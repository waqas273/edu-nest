import React, { useState, useEffect } from 'react';
import { EDUCATION_HIERARCHY } from '../data/educationHierarchy';
import { ChevronRight, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EducationSelector = ({ value, onChange, placeholder = "Select Education Class", allowAny = false }) => {
    // value format: "System - Level - Group" or "System - Level" (if Group is Any)
    // e.g., "Matriculation (Local Board) - Matric Part II (10th) - Science Group (Computer)"

    // Internal state to track selection steps
    const [selectedSystem, setSelectedSystem] = useState(null);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Initial parsing of the prop value
    useEffect(() => {
        if (value) {
            const parts = value.split(' - ');
            // Try to find matching system
            const sys = EDUCATION_HIERARCHY.find(s => s.label === parts[0]);
            if (sys) {
                setSelectedSystem(sys);
                // System - Level - Group
                if (parts.length >= 2) {
                    const lvl = sys.levels.find(l => l.label === parts[1]);
                    if (lvl) {
                        setSelectedLevel(lvl);
                        if (parts.length === 3) {
                            setSelectedGroup(parts[2]);
                        } else if (allowAny && parts.length === 2) {
                            // Implied "Any" if length is 2 and we permit it
                            setSelectedGroup('Any');
                        }
                    }
                }
            }
        }
    }, []);

    // Effect: Construct the full string whenever selection changes
    useEffect(() => {
        if (selectedSystem && selectedLevel && selectedGroup) {
            let fullString = `${selectedSystem.label} - ${selectedLevel.label}`;

            // Only append group if it's NOT "Any"
            if (selectedGroup !== 'Any') {
                fullString += ` - ${selectedGroup}`;
            }

            if (fullString !== value) {
                onChange(fullString);
            }
        }
    }, [selectedSystem, selectedLevel, selectedGroup]);

    const handleSystemChange = (e) => {
        const sysId = e.target.value;
        const sys = EDUCATION_HIERARCHY.find(s => s.id === sysId);
        setSelectedSystem(sys);
        setSelectedLevel(null);
        setSelectedGroup(null);
        if (!sys) onChange('');
    };

    const handleLevelChange = (e) => {
        const lvlId = e.target.value;
        if (!selectedSystem) return;
        const lvl = selectedSystem.levels.find(l => l.id === lvlId);
        setSelectedLevel(lvl);
        setSelectedGroup(null);
    };

    const handleGroupChange = (e) => {
        setSelectedGroup(e.target.value);
    };

    return (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/50">

            <div className="flex items-center gap-2 mb-2">
                <Layers size={14} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Education Selection</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* 1. System Selector */}
                <select
                    value={selectedSystem?.id || ''}
                    onChange={handleSystemChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all cursor-pointer"
                >
                    <option value="">Select Education System...</option>
                    {EDUCATION_HIERARCHY.map(sys => (
                        <option key={sys.id} value={sys.id}>{sys.label}</option>
                    ))}
                </select>

                {/* 2. Level Selector (Cascading) */}
                <AnimatePresence>
                    {selectedSystem && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center gap-2 mb-1 pl-1">
                                <span className="text-slate-300 text-xs">↳</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Class / Level</span>
                            </div>
                            <select
                                value={selectedLevel?.id || ''}
                                onChange={handleLevelChange}
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all cursor-pointer"
                            >
                                <option value="">Select Class / Level...</option>
                                {selectedSystem.levels.map(lvl => (
                                    <option key={lvl.id} value={lvl.id}>{lvl.label}</option>
                                ))}
                            </select>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 3. Group Selector (Cascading) */}
                <AnimatePresence>
                    {selectedLevel && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center gap-2 mb-1 pl-1">
                                <span className="text-slate-300 text-xs">↳</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400">Group / Major</span>
                            </div>
                            <select
                                value={selectedGroup || ''}
                                onChange={handleGroupChange}
                                className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 focus:border-indigo-500 outline-none text-sm transition-all cursor-pointer font-medium text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Select Group...</option>
                                {allowAny && (
                                    <option value="Any" className="font-bold text-indigo-600 dark:text-indigo-400">Any Group / Major</option>
                                )}
                                {selectedLevel.groups.map(grp => (
                                    <option key={grp} value={grp}>{grp}</option>
                                ))}
                            </select>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Visual Confirmation */}
            <AnimatePresence>
                {selectedSystem && selectedLevel && selectedGroup && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-start gap-2 border border-indigo-100 dark:border-indigo-500/20"
                    >
                        <div className="mt-0.5 min-w-[16px]">
                            <ChevronRight size={16} className="text-indigo-500" />
                        </div>
                        <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 leading-relaxed">
                            {selectedSystem.label} <span className="text-indigo-300 dark:text-indigo-600">•</span> {selectedLevel.label}
                            {selectedGroup !== 'Any' && (
                                <> <span className="text-indigo-300 dark:text-indigo-600">•</span> <span className="underline decoration-indigo-300 underline-offset-2">{selectedGroup}</span></>
                            )}
                            {selectedGroup === 'Any' && (
                                <> <span className="text-indigo-300 dark:text-indigo-600">•</span> <span className="italic opacity-70">Any Group</span></>
                            )}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EducationSelector;
