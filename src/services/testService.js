import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export const generateTest = async (skill, topic) => {
    try {
        // 1. Check Cache in Firestore
        // In a real app, you might want to compound query or just fetch all tests for valid efficiency
        // For now, let's skip cache check in this 'mock' emphasis implementation to ensure fresh 'demo' feel or simplicty
        // But here is how it would look:
        /*
        const q = query(collection(db, 'tests'), where('skill', '==', skill), where('topic', '==', topic));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
             return snapshot.docs[0].data();
        }
        */

        // 2. Call OpenAI (or Fallback)
        let questions = [];

        if (OPENAI_API_KEY) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "You are a teacher. Generate 5 multiple choice questions in JSON format." },
                            { role: "user", content: `Generate 5 MCQs for the topic '${topic}' in the skill '${skill}'. Format: [{ id, question, options: [a,b,c,d], answer: 'option string' }]` }
                        ]
                    })
                });
                const data = await response.json();
                // Parse JSON from content string... handling potential parsing errors
                // For safety in this demo, we might just default to mock if parsing fails
            } catch (err) {
                console.warn("OpenAI Call Failed, using mock.", err);
                questions = getMockQuestions(skill, topic);
            }
        } else {
            console.log("No API Key, using mock questions.");
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            questions = getMockQuestions(skill, topic);
        }

        // 3. Save to Firestore (Optional for caching future calls)
        // await addDoc(collection(db, 'tests'), { skill, topic, questions, createdAt: new Date() });

        return { skill, topic, questions };

    } catch (error) {
        console.error("Error generating test:", error);
        return { skill, topic, questions: getMockQuestions(skill, topic) };
    }
};

// Fallback Mock Data Generator
const getMockQuestions = (skill, topic) => {
    return [
        {
            id: 1,
            question: `What is a fundamental concept of ${topic}?`,
            options: [`Option A: Basic ${skill}`, `Option B: Advanced ${skill}`, "Option C: Irrelevant", "Option D: None"],
            answer: `Option A: Basic ${skill}`
        },
        {
            id: 2,
            question: "Which of the following is TRUE?",
            options: ["Sky is Green", `This topic defines ${skill}`, "Computers eat apples", "1+1=3"],
            answer: `This topic defines ${skill}`
        },
        {
            id: 3,
            question: "Key terminology used in this field is:",
            options: ["Flubber", "Flux Capacitor", "Variable/Function", "Magic"],
            answer: "Variable/Function"
        },
        {
            id: 4,
            question: "How do you apply this in real life?",
            options: ["By sleeping", "By Coding/Practicing", "By Eating", "By Running"],
            answer: "By Coding/Practicing"
        },
        {
            id: 5,
            question: "What comes next after this topic?",
            options: ["The End", "Advanced Modules", "Retirement", "Chaos"],
            answer: "Advanced Modules"
        }
    ];
};

export const generateGrandTestMock = () => {
    return Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        question: `Grand Test Question ${i + 1}: Integrated Concept...`,
        options: ["Concept A", "Concept B", "Concept C", "Concept D"],
        answer: "Concept A"
    }));
};
