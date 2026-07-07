import React, { createContext, useContext, useState, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { generateRoadmap, generateFallbackRoadmap } from '../services/openaiService';

const StudentStateContext = createContext();

export const useStudentState = () => {
    const context = useContext(StudentStateContext);
    if (!context) {
        throw new Error('useStudentState must be used within a StudentStateProvider');
    }
    return context;
};

export const StudentStateProvider = ({ children }) => {
    // --- Roadmap State ---
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [isRoadmapActive, setIsRoadmapActive] = useState(false);
    const [topics, setTopics] = useState([]);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [roadmapError, setRoadmapError] = useState(null);

    // Keep track of generating state with a ref to avoid stale closure issues during navigation
    const isGeneratingRef = useRef(false);

    // Helper: Generate Firestore Document ID for Roadmap
    const getDocId = (skillName, currentUser) => {
        if (!currentUser) return null;
        const sanitizedSkill = skillName.replace(/[^a-zA-Z0-9]/g, '_');
        return `${currentUser.uid}_${sanitizedSkill}`;
    };

    const calculateProgress = (topicsArray) => {
        if (!topicsArray || topicsArray.length === 0) return 0;
        const completed = topicsArray.filter(t => t.status === 'completed').length;
        return Math.round((completed / topicsArray.length) * 100);
    };

    const loadOrGenerateRoadmapBackground = async (skillName, currentUser) => {
        if (!currentUser) return;
        if (isGeneratingRef.current) return;

        setLoading(true);
        setIsGenerating(true);
        isGeneratingRef.current = true;
        setRoadmapError(null);

        const docId = getDocId(skillName, currentUser);

        try {
            // Check Firestore for existing roadmap (for progress data only)
            const roadmapRef = doc(db, 'roadmaps', docId);
            const roadmapSnap = await getDoc(roadmapRef);

            if (roadmapSnap.exists()) {
                // Load from Firestore (cached with progress)
                console.log(`%c[EduNest Roadmap] 📂 Loading saved roadmap for "${skillName}" from Firestore`, 'color: #22c55e; font-weight: bold;');
                const data = roadmapSnap.data();
                const processedTopics = (data.topics || []).map(t => ({
                    ...t,
                    status: t.status === 'locked' ? 'unlocked' : t.status
                }));
                processedTopics.forEach(t => {
                    if (!t.subtopics) t.subtopics = [];
                    t.subtopics = t.subtopics.map((sub, idx) => {
                        if (typeof sub === 'string') {
                            return { id: `sub-${t.id}-${idx}`, title: sub, description: 'Explore this concept.', status: 'unlocked' };
                        }
                        return sub;
                    });
                });

                setTopics(processedTopics);
                setProgress(data.progress || 0);
                console.log(`[EduNest Roadmap] ✅ Loaded ${processedTopics.length} topics from cache`);
            } else {
                // Fresh generation from Groq AI
                console.log(`%c[EduNest Roadmap] 🤖 No saved roadmap found. Generating fresh AI roadmap for "${skillName}"...`, 'color: #6366f1; font-weight: bold; font-size: 13px;');
                
                let generatedTopics;
                try {
                    generatedTopics = await generateRoadmap(skillName);
                    console.log(`%c[EduNest Roadmap] ✅ AI generated ${generatedTopics?.length} topics`, 'color: green; font-weight: bold;');
                } catch (aiError) {
                    console.warn('[EduNest Roadmap] ⚠️ AI failed, using fallback:', aiError.message);
                    generatedTopics = generateFallbackRoadmap(skillName);
                }

                // Ensure they are all unlocked
                generatedTopics = generatedTopics.map(t => ({ ...t, status: 'unlocked' }));

                // Save to Firestore
                console.log('[EduNest Roadmap] 💾 Saving roadmap to Firestore...');
                await setDoc(roadmapRef, {
                    skill: skillName,
                    topics: generatedTopics,
                    progress: 0,
                    createdAt: serverTimestamp(),
                    userId: currentUser.uid
                });
                console.log('[EduNest Roadmap] ✅ Saved to Firestore');

                setTopics(generatedTopics);
                setProgress(0);
            }
        } catch (error) {
            console.error('[EduNest Roadmap] ❌ Error loading/generating roadmap:', error);
            setRoadmapError(error.message);
            // Fallback locally
            const fallback = generateFallbackRoadmap(skillName).map(t => ({ ...t, status: 'unlocked' }));
            setTopics(fallback);
        } finally {
            setLoading(false);
            setIsGenerating(false);
            isGeneratingRef.current = false;
        }
    };


    const resetRoadmapState = () => {
        setWizardStep(1);
        setSelectedClass(null);
        setSelectedSkill(null);
        setIsRoadmapActive(false);
        setTopics([]);
        setProgress(0);
        setLoading(false);
        setIsGenerating(false);
        isGeneratingRef.current = false;
        setRoadmapError(null);
    };

    // --- Universities Discovery State ---
    const [uniSearchTerm, setUniSearchTerm] = useState('');
    const [uniRatingFilter, setUniRatingFilter] = useState('all');
    const [universitiesCache, setUniversitiesCache] = useState(null);

    // --- Programs State ---
    const [progSearch, setProgSearch] = useState('');
    const [progDegreeFilter, setProgDegreeFilter] = useState('All');
    const [progDurationFilter, setProgDurationFilter] = useState('All');
    const [progStatusFilter, setProgStatusFilter] = useState('all');
    const [progShowFilters, setProgShowFilters] = useState(false);
    const [programsCache, setProgramsCache] = useState(null);
    const [applicationsCache, setApplicationsCache] = useState(null);

    // --- Entry Test Prep State ---
    const [prepSearchQuery, setPrepSearchQuery] = useState('');
    const [prepVideos, setPrepVideos] = useState([]);
    const [prepActiveTab, setPrepActiveTab] = useState('search');

    return (
        <StudentStateContext.Provider value={{
            // Roadmap
            wizardStep, setWizardStep,
            selectedClass, setSelectedClass,
            selectedSkill, setSelectedSkill,
            isRoadmapActive, setIsRoadmapActive,
            topics, setTopics,
            progress, setProgress,
            loading, setLoading,
            isGenerating, setIsGenerating,
            roadmapError,
            loadOrGenerateRoadmapBackground,
            resetRoadmapState,
            calculateProgress,

            // Universities
            uniSearchTerm, setUniSearchTerm,
            uniRatingFilter, setUniRatingFilter,
            universitiesCache, setUniversitiesCache,

            // Programs
            progSearch, setProgSearch,
            progDegreeFilter, setProgDegreeFilter,
            progDurationFilter, setProgDurationFilter,
            progStatusFilter, setProgStatusFilter,
            progShowFilters, setProgShowFilters,
            programsCache, setProgramsCache,
            applicationsCache, setApplicationsCache,

            // Entry Test Prep
            prepSearchQuery, setPrepSearchQuery,
            prepVideos, setPrepVideos,
            prepActiveTab, setPrepActiveTab
        }}>
            {children}
        </StudentStateContext.Provider>
    );
};
