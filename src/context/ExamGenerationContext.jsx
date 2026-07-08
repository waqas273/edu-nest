import React, { createContext, useContext, useState, useRef } from 'react';
import { generateFullExam, generateSubjectExam } from '../services/aiExamService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

const ExamGenerationContext = createContext();

export const useExamGeneration = () => {
    const context = useContext(ExamGenerationContext);
    if (!context) {
        throw new Error('useExamGeneration must be used within an ExamGenerationProvider');
    }
    return context;
};

export const ExamGenerationProvider = ({ children }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [questions, setQuestions] = useState([]);
    const [examType, setExamType] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [activeTestDocId, setActiveTestDocId] = useState(null);
    const [error, setError] = useState(null);

    // Active exam session progress states
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [revealedAnswers, setRevealedAnswers] = useState({});
    const [endTime, setEndTime] = useState(null);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);


    // Keep track of generating state with a ref to avoid stale closure issues during navigation
    const isGeneratingRef = useRef(false);

    const startGenerationBackground = async (type, subject, currentUser) => {
        // Prevent concurrent double generations
        if (isGeneratingRef.current) return;

        setIsGenerating(true);
        isGeneratingRef.current = true;
        setLoadingStatus("Initializing AI engine...");
        setQuestions([]);
        setError(null);
        setExamType(type);
        setSelectedSubject(subject);
        setActiveTestDocId(null);
        
        // Reset active session progress on new generation
        setCurrentIdx(0);
        setAnswers({});
        setRevealedAnswers({});
        setEndTime(null);
        setTabSwitchCount(0);
        setIsFinished(false);
        setHasStarted(false);

        let docId = null;

        try {
            // 1. Create Firestore entry
            if (currentUser) {
                const docRef = await addDoc(collection(db, 'test_history'), {
                    userId: currentUser.uid,
                    testName: subject ? `${type.toUpperCase()} ${subject}` : `${type.toUpperCase()} Full Mock`,
                    category: 'Entry Test',
                    status: 'started',
                    timestamp: serverTimestamp(),
                    topicName: subject || 'Full Exam',
                    skill: type.toUpperCase()
                });
                docId = docRef.id;
                setActiveTestDocId(docId);
                console.log("[Exam Context] Created test document in Firestore:", docId);
            }

            // 2. Run generation
            const generatedQuestions = subject
                ? await generateSubjectExam(type, subject, setLoadingStatus)
                : await generateFullExam(type, setLoadingStatus);

            // 3. Set output
            setQuestions(generatedQuestions);
            setIsGenerating(false);
            isGeneratingRef.current = false;
            console.log("[Exam Context] Questions generated successfully count:", generatedQuestions.length);
            return { questions: generatedQuestions, docId };
        } catch (err) {
            console.error("[Exam Context] Generation failed:", err);
            setError(err.message);
            setIsGenerating(false);
            isGeneratingRef.current = false;
            
            if (docId) {
                try {
                    await updateDoc(doc(db, 'test_history', docId), { status: 'failed' });
                } catch (dbErr) {
                    console.error("[Exam Context] Failed to update doc to failed status:", dbErr);
                }
            }
            throw err;
        }
    };

    const resetGeneration = () => {
        setIsGenerating(false);
        isGeneratingRef.current = false;
        setLoadingStatus("");
        setQuestions([]);
        setExamType(null);
        setSelectedSubject(null);
        setActiveTestDocId(null);
        setError(null);

        // Reset progress states
        setCurrentIdx(0);
        setAnswers({});
        setRevealedAnswers({});
        setEndTime(null);
        setTabSwitchCount(0);
        setIsFinished(false);
        setHasStarted(false);
    };

    return (
        <ExamGenerationContext.Provider value={{
            isGenerating,
            loadingStatus,
            questions,
            examType,
            selectedSubject,
            activeTestDocId,
            error,
            startGenerationBackground,
            resetGeneration,
            setQuestions,
            setActiveTestDocId,

            // Active exam progress states and setters
            currentIdx,
            setCurrentIdx,
            answers,
            setAnswers,
            revealedAnswers,
            setRevealedAnswers,
            endTime,
            setEndTime,
            tabSwitchCount,
            setTabSwitchCount,
            isFinished,
            setIsFinished,
            hasStarted,
            setHasStarted
        }}>
            {children}
        </ExamGenerationContext.Provider>
    );
};
