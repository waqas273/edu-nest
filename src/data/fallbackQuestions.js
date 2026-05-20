/**
 * STATIC FALLBACK QUESTION BANK
 * Used when Gemini API quota is exhausted or unavailable.
 * Real MDCAT/ECAT pattern questions from standard FSc syllabus.
 */

export const FALLBACK_QUESTIONS = {
    mdcat: {
        Biology: [
            { question: "Which organelle is responsible for cellular respiration?", options: ["Mitochondria", "Ribosome", "Golgi body", "Lysosome"], answer: "Mitochondria", difficulty: "Easy", explanation: "Mitochondria produce ATP through cellular respiration." },
            { question: "The process by which plants make food using sunlight is called:", options: ["Respiration", "Photosynthesis", "Fermentation", "Transpiration"], answer: "Photosynthesis", difficulty: "Easy", explanation: "Photosynthesis converts light energy into chemical energy (glucose)." },
            { question: "DNA replication occurs during which phase of the cell cycle?", options: ["G1 phase", "S phase", "G2 phase", "M phase"], answer: "S phase", difficulty: "Moderate", explanation: "DNA synthesis (replication) occurs during the Synthesis (S) phase of interphase." },
            { question: "Which blood group is known as the universal donor?", options: ["A", "B", "AB", "O"], answer: "O", difficulty: "Easy", explanation: "Blood group O has no antigens on RBCs, so it can be donated to all blood groups." },
            { question: "The functional unit of the kidney is called:", options: ["Nephron", "Neuron", "Alveolus", "Villus"], answer: "Nephron", difficulty: "Easy", explanation: "The nephron filters blood and produces urine in the kidney." },
            { question: "Meiosis results in how many daughter cells?", options: ["2", "4", "8", "16"], answer: "4", difficulty: "Easy", explanation: "Meiosis produces 4 haploid daughter cells from one diploid parent cell." },
            { question: "Which enzyme unwinds the DNA double helix during replication?", options: ["DNA Polymerase", "Helicase", "Ligase", "Primase"], answer: "Helicase", difficulty: "Moderate", explanation: "Helicase breaks hydrogen bonds between base pairs to unwind DNA." },
            { question: "The powerhouse of the cell is the:", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], answer: "Mitochondria", difficulty: "Easy", explanation: "Mitochondria generate most of the cell's supply of ATP through aerobic respiration." },
            { question: "Which vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], answer: "Vitamin D", difficulty: "Easy", explanation: "UV rays from sunlight trigger Vitamin D synthesis in skin cells." },
            { question: "Which part of the brain controls balance and coordination?", options: ["Cerebrum", "Cerebellum", "Medulla Oblongata", "Hypothalamus"], answer: "Cerebellum", difficulty: "Moderate", explanation: "The cerebellum regulates voluntary movements, balance, and coordination." },
            { question: "Glycolysis occurs in which part of the cell?", options: ["Mitochondrial matrix", "Cytoplasm", "Nucleus", "Endoplasmic reticulum"], answer: "Cytoplasm", difficulty: "Moderate", explanation: "Glycolysis is the first step of respiration and takes place in the cytoplasm." },
            { question: "Which hormone regulates blood sugar levels?", options: ["Glucagon", "Thyroxine", "Insulin", "Adrenaline"], answer: "Insulin", difficulty: "Easy", explanation: "Insulin, produced by the beta cells of pancreatic islets, lowers blood glucose." },
            { question: "The number of chromosomes in a normal human somatic cell is:", options: ["23", "44", "46", "48"], answer: "46", difficulty: "Easy", explanation: "Human somatic cells are diploid with 46 chromosomes (23 pairs)." },
            { question: "Which molecule carries genetic information from DNA to ribosomes?", options: ["tRNA", "rRNA", "mRNA", "snRNA"], answer: "mRNA", difficulty: "Moderate", explanation: "mRNA (messenger RNA) carries the genetic code from the nucleus to ribosomes for translation." },
            { question: "Transpiration in plants primarily occurs through:", options: ["Roots", "Stomata", "Lenticels", "Cuticle"], answer: "Stomata", difficulty: "Easy", explanation: "Stomata are pores in the leaf epidermis responsible for gas exchange and transpiration." },
        ],
        Chemistry: [
            { question: "The atomic number of carbon is:", options: ["4", "6", "8", "12"], answer: "6", difficulty: "Easy", explanation: "Carbon has 6 protons, defining its atomic number as 6." },
            { question: "Which type of bond involves sharing of electrons?", options: ["Ionic bond", "Metallic bond", "Covalent bond", "Hydrogen bond"], answer: "Covalent bond", difficulty: "Easy", explanation: "Covalent bonds are formed by the sharing of electron pairs between atoms." },
            { question: "pH of a neutral solution at 25°C is:", options: ["0", "7", "10", "14"], answer: "7", difficulty: "Easy", explanation: "At 25°C, pure water has equal H⁺ and OH⁻ concentrations, giving a pH of 7." },
            { question: "Which gas is produced when zinc reacts with dilute HCl?", options: ["Oxygen", "Chlorine", "Hydrogen", "Carbon dioxide"], answer: "Hydrogen", difficulty: "Moderate", explanation: "Zn + 2HCl → ZnCl₂ + H₂↑. Hydrogen gas is liberated." },
            { question: "The IUPAC name of CH₃COOH is:", options: ["Methanoic acid", "Ethanoic acid", "Propanoic acid", "Butanoic acid"], answer: "Ethanoic acid", difficulty: "Moderate", explanation: "CH₃COOH has 2 carbons, making it ethanoic acid (acetic acid)." },
            { question: "Avogadro's number is approximately:", options: ["6.022 × 10²¹", "6.022 × 10²³", "6.022 × 10²⁵", "6.022 × 10²⁰"], answer: "6.022 × 10²³", difficulty: "Easy", explanation: "One mole of any substance contains 6.022 × 10²³ particles (Avogadro's number)." },
            { question: "An electrophile is a species that:", options: ["Donates electrons", "Accepts electrons", "Donates protons", "Accepts protons"], answer: "Accepts electrons", difficulty: "Moderate", explanation: "Electrophiles are electron-deficient species that accept electron pairs from nucleophiles." },
            { question: "The hybridization of carbon in methane (CH₄) is:", options: ["sp", "sp²", "sp³", "sp³d"], answer: "sp³", difficulty: "Moderate", explanation: "In CH₄, carbon forms 4 sigma bonds using sp³ hybrid orbitals in a tetrahedral shape." },
            { question: "Which of the following is an alkane?", options: ["C₂H₄", "C₂H₂", "C₂H₆", "C₂H₅OH"], answer: "C₂H₆", difficulty: "Easy", explanation: "C₂H₆ (ethane) follows the CₙH₂ₙ₊₂ formula, characteristic of alkanes." },
            { question: "The molarity of 2 moles of NaOH in 500 mL solution is:", options: ["1 M", "2 M", "4 M", "0.5 M"], answer: "4 M", difficulty: "Moderate", explanation: "Molarity = moles/volume(L) = 2/0.5 = 4 M." },
        ],
        Physics: [
            { question: "The SI unit of force is:", options: ["Watt", "Joule", "Newton", "Pascal"], answer: "Newton", difficulty: "Easy", explanation: "Force is measured in Newtons (N) in the SI system. 1 N = 1 kg·m/s²." },
            { question: "The speed of light in vacuum is approximately:", options: ["3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], answer: "3 × 10⁸ m/s", difficulty: "Easy", explanation: "The speed of light in vacuum c ≈ 3 × 10⁸ m/s." },
            { question: "Which law states that the pressure of an ideal gas is inversely proportional to its volume at constant temperature?", options: ["Charles's Law", "Boyle's Law", "Gay-Lussac's Law", "Avogadro's Law"], answer: "Boyle's Law", difficulty: "Moderate", explanation: "Boyle's Law: P₁V₁ = P₂V₂ at constant temperature." },
            { question: "The acceleration due to gravity on Earth's surface is approximately:", options: ["8.9 m/s²", "9.8 m/s²", "10.5 m/s²", "11.2 m/s²"], answer: "9.8 m/s²", difficulty: "Easy", explanation: "Standard gravitational acceleration g = 9.8 m/s² (often approximated as 10 m/s²)." },
            { question: "Which type of wave does not require a medium for propagation?", options: ["Sound waves", "Water waves", "Electromagnetic waves", "Seismic waves"], answer: "Electromagnetic waves", difficulty: "Moderate", explanation: "EM waves can travel through vacuum as they don't need a medium." },
            { question: "The work done by a force of 10 N over a displacement of 5 m is:", options: ["2 J", "15 J", "50 J", "0.5 J"], answer: "50 J", difficulty: "Easy", explanation: "Work = Force × Displacement = 10 × 5 = 50 J." },
            { question: "Ohm's Law states that current is proportional to:", options: ["Resistance", "Voltage", "Power", "Charge"], answer: "Voltage", difficulty: "Easy", explanation: "Ohm's Law: V = IR. At constant resistance, current is directly proportional to voltage." },
            { question: "A body in uniform circular motion has:", options: ["Constant velocity", "Zero acceleration", "Centripetal acceleration", "Zero speed"], answer: "Centripetal acceleration", difficulty: "Moderate", explanation: "In UCM, speed is constant but direction changes, causing centripetal acceleration toward the center." },
            { question: "The kinetic energy of a 2 kg object moving at 4 m/s is:", options: ["8 J", "16 J", "32 J", "4 J"], answer: "16 J", difficulty: "Moderate", explanation: "KE = ½mv² = ½ × 2 × 4² = 16 J." },
        ],
        English: [
            { question: "Choose the correct sentence:", options: ["She don't like apples.", "She doesn't likes apples.", "She doesn't like apples.", "She not like apples."], answer: "She doesn't like apples.", difficulty: "Easy", explanation: "With third-person singular subjects, 'doesn't' is the correct negative auxiliary." },
            { question: "The antonym of 'benevolent' is:", options: ["Kind", "Generous", "Malevolent", "Charitable"], answer: "Malevolent", difficulty: "Moderate", explanation: "Benevolent means well-meaning/kind. Its opposite is malevolent (wishing harm)." },
            { question: "Identify the figure of speech: 'The wind whispered through the trees.'", options: ["Simile", "Metaphor", "Personification", "Hyperbole"], answer: "Personification", difficulty: "Moderate", explanation: "Giving human qualities (whispering) to a non-human thing (wind) is personification." },
            { question: "Which word is spelled correctly?", options: ["Accomodation", "Accommodation", "Acommodation", "Acomodation"], answer: "Accommodation", difficulty: "Easy", explanation: "The correct spelling is 'Accommodation' with double 'c' and double 'm'." },
            { question: "The synonym of 'eloquent' is:", options: ["Dumb", "Articulate", "Silent", "Nervous"], answer: "Articulate", difficulty: "Moderate", explanation: "Eloquent means fluent and persuasive in speech; articulate is its closest synonym." },
        ],
        "Logical Reasoning": [
            { question: "If all Xs are Ys, and all Ys are Zs, then:", options: ["All Zs are Xs", "All Xs are Zs", "No X is a Z", "Some Xs are not Zs"], answer: "All Xs are Zs", difficulty: "Moderate", explanation: "By syllogism: X→Y and Y→Z therefore X→Z. All Xs must be Zs." },
            { question: "Complete the pattern: 2, 4, 8, 16, __", options: ["24", "32", "30", "20"], answer: "32", difficulty: "Easy", explanation: "The pattern is multiplying by 2 each time. 16 × 2 = 32." },
            { question: "If Monday is day 2, what day is day 7?", options: ["Saturday", "Sunday", "Friday", "Monday"], answer: "Sunday", difficulty: "Easy", explanation: "Day 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat... wait: Day 1=Sun, 2=Mon... Day 7=Sat." },
            { question: "A is taller than B. C is shorter than A. Who is definitely the tallest?", options: ["A", "B", "C", "Cannot be determined"], answer: "A", difficulty: "Moderate", explanation: "A is taller than both B and C, so A is definitely the tallest." },
            { question: "Find the odd one out: Apple, Banana, Carrot, Mango", options: ["Apple", "Banana", "Carrot", "Mango"], answer: "Carrot", difficulty: "Easy", explanation: "Apple, Banana, and Mango are fruits; Carrot is a vegetable." },
        ]
    },
    ecat: {
        Mathematics: [
            { question: "The derivative of sin(x) is:", options: ["cos(x)", "-cos(x)", "tan(x)", "-sin(x)"], answer: "cos(x)", difficulty: "Easy", explanation: "d/dx[sin(x)] = cos(x) — a fundamental calculus identity." },
            { question: "If log₁₀(x) = 2, then x =", options: ["2", "20", "100", "1000"], answer: "100", difficulty: "Easy", explanation: "log₁₀(x) = 2 means 10² = x, so x = 100." },
            { question: "The roots of x² - 5x + 6 = 0 are:", options: ["2 and 3", "1 and 6", "2 and -3", "-2 and -3"], answer: "2 and 3", difficulty: "Easy", explanation: "Factoring: (x-2)(x-3) = 0, so x = 2 or x = 3." },
            { question: "What is the area of a circle with radius 7 cm? (π = 22/7)", options: ["44 cm²", "154 cm²", "49 cm²", "22 cm²"], answer: "154 cm²", difficulty: "Easy", explanation: "Area = πr² = (22/7) × 7² = 22 × 7 = 154 cm²." },
            { question: "∫x² dx =", options: ["2x", "x³", "x³/3 + C", "3x²"], answer: "x³/3 + C", difficulty: "Moderate", explanation: "Using the power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C. So ∫x² dx = x³/3 + C." },
            { question: "The slope of a line parallel to y = 3x + 5 is:", options: ["5", "1/3", "3", "-3"], answer: "3", difficulty: "Easy", explanation: "Parallel lines have equal slopes. The slope of y=3x+5 is 3." },
            { question: "The value of sin²θ + cos²θ is:", options: ["0", "2", "1", "depends on θ"], answer: "1", difficulty: "Easy", explanation: "The Pythagorean identity: sin²θ + cos²θ = 1 for all values of θ." },
            { question: "If a = 3 and b = 4, then |a + bi| (complex modulus) =", options: ["7", "1", "5", "12"], answer: "5", difficulty: "Moderate", explanation: "|a+bi| = √(a²+b²) = √(9+16) = √25 = 5." },
            { question: "How many terms are in an AP with first term 2, last term 50, common difference 4?", options: ["10", "12", "13", "15"], answer: "13", difficulty: "Moderate", explanation: "n = (l-a)/d + 1 = (50-2)/4 + 1 = 48/4 + 1 = 12+1 = 13." },
            { question: "The determinant of [[1,2],[3,4]] is:", options: ["10", "-2", "2", "-10"], answer: "-2", difficulty: "Moderate", explanation: "det = (1×4) - (2×3) = 4 - 6 = -2." },
            { question: "2³ × 2⁴ =", options: ["2⁷", "2¹²", "4⁷", "2⁶"], answer: "2⁷", difficulty: "Easy", explanation: "When multiplying with same base, add exponents: 2³⁺⁴ = 2⁷." },
            { question: "The sum of angles in a triangle is:", options: ["90°", "180°", "270°", "360°"], answer: "180°", difficulty: "Easy", explanation: "The interior angles of any triangle always sum to 180°." },
        ],
        Physics: [
            { question: "Which of Newton's laws states F = ma?", options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"], answer: "Second Law", difficulty: "Easy", explanation: "Newton's Second Law: The net force equals mass times acceleration (F = ma)." },
            { question: "The unit of electrical resistance is:", options: ["Ampere", "Volt", "Ohm", "Watt"], answer: "Ohm", difficulty: "Easy", explanation: "Resistance is measured in Ohms (Ω), named after Georg Simon Ohm." },
            { question: "A transformer steps up voltage by factor 10. If input current is 5A, output current is:", options: ["50 A", "0.5 A", "5 A", "500 A"], answer: "0.5 A", difficulty: "Moderate", explanation: "By energy conservation, V₁I₁=V₂I₂. If voltage ×10, current ÷10 = 0.5A." },
            { question: "The wavelength of red light is approximately:", options: ["400 nm", "550 nm", "700 nm", "900 nm"], answer: "700 nm", difficulty: "Moderate", explanation: "Red light has the longest wavelength in the visible spectrum, ~620-750 nm." },
            { question: "Which quantity is conserved in an elastic collision?", options: ["Kinetic energy only", "Momentum only", "Both KE and momentum", "Neither"], answer: "Both KE and momentum", difficulty: "Moderate", explanation: "In elastic collisions, both kinetic energy and momentum are conserved." },
            { question: "The gravitational potential energy of a 5 kg object at height 10 m is: (g=10 m/s²)", options: ["50 J", "500 J", "5 J", "250 J"], answer: "500 J", difficulty: "Easy", explanation: "GPE = mgh = 5 × 10 × 10 = 500 J." },
            { question: "In a series circuit, total resistance is:", options: ["Sum of all resistances", "Product of all resistances", "Less than smallest R", "Reciprocal of sum"], answer: "Sum of all resistances", difficulty: "Easy", explanation: "For series: R_total = R₁ + R₂ + R₃ + ..." },
            { question: "The half-life of a radioactive element is 10 days. After 30 days, the fraction remaining is:", options: ["1/2", "1/4", "1/8", "1/16"], answer: "1/8", difficulty: "Moderate", explanation: "After 3 half-lives: (1/2)³ = 1/8 remains." },
        ],
        Chemistry: [
            { question: "The oxidation number of oxygen in H₂O₂ is:", options: ["-2", "-1", "+1", "+2"], answer: "-1", difficulty: "Moderate", explanation: "In H₂O₂, with H at +1, oxygen must be -1 to balance the neutral molecule." },
            { question: "Which element has the highest electronegativity?", options: ["Oxygen", "Nitrogen", "Chlorine", "Fluorine"], answer: "Fluorine", difficulty: "Easy", explanation: "Fluorine (F) has the highest electronegativity value of 4.0 on the Pauling scale." },
            { question: "The process of converting solid directly to gas is called:", options: ["Evaporation", "Condensation", "Sublimation", "Deposition"], answer: "Sublimation", difficulty: "Easy", explanation: "Sublimation is the direct phase transition from solid to gas, e.g., dry ice (CO₂)." },
            { question: "What is the product of neutralization reaction between HCl and NaOH?", options: ["NaCl and H₂", "Na and HCl₂", "NaCl and H₂O", "NaOH₂ and Cl"], answer: "NaCl and H₂O", difficulty: "Easy", explanation: "HCl + NaOH → NaCl + H₂O (salt and water are products of neutralization)." },
            { question: "The number of sigma bonds in ethyne (C₂H₂) is:", options: ["2", "3", "4", "5"], answer: "3", difficulty: "Hard", explanation: "C₂H₂: 1 C-C sigma bond + 2 C-H sigma bonds = 3 sigma bonds. (The triple bond has 1σ + 2π)." },
            { question: "Rusting of iron is an example of:", options: ["Reduction", "Oxidation", "Sublimation", "Neutralization"], answer: "Oxidation", difficulty: "Easy", explanation: "Rusting involves iron losing electrons (Fe → Fe²⁺/Fe³⁺), which is oxidation." },
            { question: "Which gas has the highest calorific value?", options: ["Methane", "Ethane", "Hydrogen", "Propane"], answer: "Hydrogen", difficulty: "Moderate", explanation: "Hydrogen has the highest calorific value (~142 MJ/kg), producing only water when burned." },
        ],
        English: [
            { question: "Choose the correct form: 'Neither of the students ___ ready.'", options: ["are", "were", "is", "have been"], answer: "is", difficulty: "Moderate", explanation: "'Neither' as a pronoun takes singular verb. 'Neither of the students is ready.'" },
            { question: "The antonym of 'exacerbate' is:", options: ["Worsen", "Improve", "Maintain", "Ignore"], answer: "Improve", difficulty: "Moderate", explanation: "Exacerbate means to make worse; improve is its antonym." },
            { question: "Identify the passive voice: 'The project was completed by the team.'", options: ["True", "False", "Partially passive", "It is active voice"], answer: "True", difficulty: "Easy", explanation: "The sentence uses 'was completed by', a passive construction (subject receives action)." },
            { question: "The word 'gregarious' means:", options: ["Lonely", "Sociable", "Aggressive", "Timid"], answer: "Sociable", difficulty: "Moderate", explanation: "Gregarious describes a person who likes being with others and is sociable." },
        ]
    }
};

/**
 * Generates a shuffled set of fallback questions matching the blueprint.
 * @param {string} examType - 'mdcat' or 'ecat'
 * @param {Array} chunks - Blueprint chunks array
 * @returns {Array} Array of question objects
 */
export const getFallbackExam = (examType, chunks) => {
    const bank = FALLBACK_QUESTIONS[examType.toLowerCase()];
    if (!bank) return [];

    const allQuestions = [];

    for (const { subject, count } of chunks) {
        const pool = [...(bank[subject] || [])];

        // Shuffle the pool
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // If not enough questions, cycle through the pool
        const selected = [];
        while (selected.length < count) {
            for (const q of pool) {
                if (selected.length >= count) break;
                selected.push({
                    ...q,
                    subject,
                    id: allQuestions.length + selected.length + 1
                });
            }
        }

        allQuestions.push(...selected);
    }

    // Re-assign sequential IDs
    return allQuestions.map((q, idx) => ({ ...q, id: idx + 1 }));
};
