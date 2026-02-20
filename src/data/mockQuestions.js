// --- ULTRA PRO MAX DATA BANK ---
// Contains 200 MDCAT and 100 ECAT questions
// For demonstration, real questions are mixed with patterned questions to reach the target volume.

const BIOLOGY_TOPICS = ["Cell Structure", "Bioenergetics", "Genetics", "Evolution", "Reproduction"];
const PHYSICS_TOPICS = ["Force & Motion", "Work & Energy", "Waves", "Electrostatics", "Magnetism"];
const CHEMISTRY_TOPICS = ["Atomic Structure", "Chemical Bonding", "Gases", "Solids", "Organic Chemistry"];
const ENGLISH_TOPICS = ["Vocabulary", "Grammar", "Sentence Structure", "Comprehension"];
const MATH_TOPICS = ["Algebra", "Trigonometry", "Calculus", "Vectors", "Conics"];

// Helper to generate patterned questions
const generateQuestions = (subject, count, startId) => {
    return Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        question: `${subject} Question ${i + 1}: This is a simulated high-yield question covering key concepts of ${subject}.`,
        options: ["Option Alpha", "Option Beta", "Option Charlie", "Option Delta"],
        answer: "Option Beta",
        subject: subject
    }));
};

const MDCAT_REAL = [
    { id: 1, question: "Which organelle is known as the powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome", "Lysosome"], answer: "Mitochondria", subject: "Biology" },
    { id: 2, question: "The process of mRNA synthesis from DNA is called:", options: ["Translation", "Transcription", "Replication", "Mutation"], answer: "Transcription", subject: "Biology" },
    { id: 3, question: "Force is equal to rate of change of:", options: ["Momentum", "Velocity", "Energy", "Power"], answer: "Momentum", subject: "Physics" },
    { id: 4, question: "Which hybrid orbital has 33% s-character?", options: ["sp", "sp2", "sp3", "dsp2"], answer: "sp2", subject: "Chemistry" },
    { id: 5, question: "Choose the synonym of 'Enormous':", options: ["Tiny", "Huge", "Weak", "Soft"], answer: "Huge", subject: "English" },
    { id: 6, question: "Enzymes are chemically:", options: ["Lipids", "Proteins", "Carbohydrates", "Vitamins"], answer: "Proteins", subject: "Biology" },
    { id: 7, question: "The unit of electric potential is:", options: ["Ampere", "Volt", "Coulomb", "Ohm"], answer: "Volt", subject: "Physics" },
    { id: 8, question: "Benzene is an example of:", options: ["Alicyclic", "Aromatic", "Heterocyclic", "Saturated"], answer: "Aromatic", subject: "Chemistry" },
    // ... (Simulating more real questions)
];

const ECAT_REAL = [
    { id: 1, question: "If y = sin(2x), then dy/dx is:", options: ["cos(2x)", "2cos(2x)", "-2cos(2x)", "sin(x)"], answer: "2cos(2x)", subject: "Mathematics" },
    { id: 2, question: "The dot product of two perpendicular vectors is:", options: ["1", "0", "-1", "Maximum"], answer: "0", subject: "Physics" },
    { id: 3, question: "Which series of hydrogen spectrum lies in UV region?", options: ["Lyman", "Balmer", "Paschen", "Brackett"], answer: "Lyman", subject: "Chemistry" },
    { id: 4, question: "Which gate is called the universal gate?", options: ["AND", "OR", "NAND", "NOT"], answer: "NAND", subject: "Physics" },
    { id: 5, question: "The value of iota (i) raised to power 4 is:", options: ["1", "-1", "i", "-i"], answer: "1", subject: "Mathematics" },
    // ... (Simulating more real questions)
];

// Generate Full Sets
const mdcatGenerated = [
    ...MDCAT_REAL,
    ...generateQuestions("Biology", 68, 100),
    ...generateQuestions("Chemistry", 54, 200),
    ...generateQuestions("Physics", 54, 300),
    ...generateQuestions("English", 16, 400), // Updated to hit ~200 total
];

const ecatGenerated = [
    ...ECAT_REAL,
    ...generateQuestions("Mathematics", 30, 100),
    ...generateQuestions("Physics", 30, 200),
    ...generateQuestions("Chemistry", 30, 300),
    ...generateQuestions("English", 5, 400), // Updated to hit ~100 total
];

export const MOCK_DATA = {
    mdcat: mdcatGenerated.slice(0, 200), // Ensure exact 200
    ecat: ecatGenerated.slice(0, 100)    // Ensure exact 100
};
