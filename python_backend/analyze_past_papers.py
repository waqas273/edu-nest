# -*- coding: utf-8 -*-
"""
analyze_past_papers.py - Solved past papers parsing and sequence mapping utility

This script processes python_backend/data/past_papers_extracted.json. It:
1. Splits the full raw text of each past paper into individual numbered questions.
2. Identifies the subject (Physics, Chemistry, Biology, Mathematics, English, Logical Reasoning)
   based on section headings.
3. Extracts questions, options, answers (via key matching), and matches them to textbook chapters.
4. Saves the sequence templates as a JSON map in 'python_backend/data/syllabus_weightage_map.json'.
"""

import os
import json
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
EXTRACTED_JSON_PATH = os.path.join(DATA_DIR, "past_papers_extracted.json")
OUTPUT_MAP_PATH = os.path.join(DATA_DIR, "syllabus_weightage_map.json")

# Define FSc Chapters Keywords Mapping
SUBJECT_CHAPTERS_KEYWORDS = {
    "Physics": {
        "Measurement & Vectors": ["dimension", "unit", "vector", "scalar", "base unit", "resistivity", "tangential velocity", "significant figure", "error"],
        "Newtonian Mechanics": ["force", "momentum", "velocity", "acceleration", "projectile", "missile", "ballistic", "mass", "friction", "inertia", "collision", "torque", "speed of light in vacuum", "displacement"],
        "Circular Motion": ["circular", "centripetal", "angular", "orbit", "rad/s", "disc", "rotates", "rotation", "moment of inertia", "hoop", "artificial gravity"],
        "Work and Energy": ["work", "joule", "power", "kinetic", "potential", "p.e.", "k.e.", "watt", "escape velocity", "efficiency"],
        "Fluid Dynamics": ["fluid", "viscosity", "terminal velocity", "torricelli", "pipe", "equation of continuity", "incompressible", "drag force", "streamline", "bernoulli"],
        "Waves and Oscillations": ["wave", "resonance", "tuning", "sound", "frequency", "wavelength", "standing wave", "beats", "amplitude", "simple harmonic", "pendulum", "time period", "string", "node", "antinode"],
        "Wave Optics": ["fringe", "slit", "young", "double slit", "interference", "michelson", "diffraction", "grating", "polarization", "optical fiber", "newton rings", "lens", "magnification", "telescope"],
        "Electrostatics & Circuits": ["charge", "electric field", "coulomb", "capacitor", "capacitance", "potential difference", "volt", "millikan", "resistor", "resistance", "ohm", "electric force", "electric flux", "time constant", "amplitude"],
        "Electromagnetism & Electronics": ["magnetic", "transformer", "choke", "inductance", "induction", "lenz", "emf", "current", "diode", "junction", "transistor", "amplifier", "gate", "nand", "nor", "op-amp", "led"],
        "Modern Physics & Nuclear": ["helium", "alpha particle", "beta ray", "radioactive", "nucleus", "decay", "x-ray", "gamma", "photon", "einstein", "photoelectric", "compton", "quark", "half-life", "cobalt", "laser", "black body", "fission", "fusion"]
    },
    "Chemistry": {
        "Stoichiometry": ["mole", "molar", "filtration", "separation", "solute", "solvent", "percentage yield", "stoichiometry", "limiting reactant", "avogadro", "mass spectrometer"],
        "Gases": ["gas", "effusion", "diffusion", "graham", "boyle", "charles", "pressure", "ideal gas", "kinetic molecular", "dalton", "plasma"],
        "Chemical Bonding": ["bond", "ionic", "covalent", "coordinate", "hybridization", "tetrahedral", "dipole moment", "london force", "hydrogen bonding", "sigma bond", "pi bond", "molecular orbital"],
        "States of Matter": ["solid", "liquid", "crystal", "evaporation", "boiling point", "vapor pressure", "melting", "osmotic", "colligative", "azeotropic", "miscible"],
        "Chemical Thermodynamics": ["heat", "enthalpy", "thermochemistry", "endothermic", "exothermic", "joules", "entropy", "bomb calorimeter", "hess's law"],
        "Chemical Equilibrium": ["equilibrium", "catalyst", "reversible", "solubility product", "kc", "kp", "ph", "buffer", "common ion"],
        "Electrochemistry": ["electroly", "cathode", "anode", "battery", "oxidation", "reduction", "galvanic", "electrode potential", "voltaic"],
        "Inorganic Chemistry & Periodicity": ["alkali", "alkaline", "halogen", "allotropic", "paramagnetism", "transition", "coordination", "tin", "lead", "sulphuric", "nitric", "nitrogen", "phosphorous", "clay", "gypsum"],
        "Organic Chemistry Basics": ["alkane", "alkene", "alkyne", "hydrocarbon", "isomerism", "cracking", "hybridization", "benzene", "resonance", "nomenclature"],
        "Functional Groups": ["aldehyde", "alcohol", "phenol", "ether", "ester", "ketone", "carboxylic", "amine", "haloalkane", "acetaldehyde", "formaldehyde", "ethanol"],
        "Biochemistry & Industrial": ["protein", "lipid", "fat", "carbohydrate", "starch", "cellulose", "enzyme", "polymer", "resin", "fermentation", "sugar", "casein", "nucleoprotein", "soap"]
    },
    "Biology": {
        "Cell Biology": ["cell", "cytoplasm", "cytosol", "membrane", "organelle", "ribosome", "golgi", "mitochondria", "lysosome", "plastid", "chloroplast", "vacuole", "mitosis", "meiosis", "karyokinesis"],
        "Biological Molecules": ["hemoglobin", "bilirubin", "water content", "protein", "amino acid", "lipid", "enzymes", "haemoglobin", "carbohydrate", "polysaccharide", "starch", "glycogen"],
        "Microbiology & Virology": ["virus", "hepatitis", "bacteria", "cocci", "bacilli", "syphilis", "treponema", "gonorrhoeae", "capsid", "bacteriophage", "hiv", "vaccine", "antibiotic"],
        "Kingdom Protista & Fungi": ["yeast", "fungi", "spore", "hyphae", "protozoa", "amoeba", "trypanosoma", "paramecium", "slime mold", "lichen"],
        "Kingdom Plantae": ["leaf", "fruit", "root", "stem", "auxins", "gibberellins", "abscisic", "photoperiod", "angiosperm", "gymnosperm", "bryophyte", "pteridophyte", "chlorophyll", "photosynthesis", "transpiration"],
        "Kingdom Animalia": ["shark", "fish", "class", "chondrichthyes", "mammals", "placental", "eutheria", "vertebrates", "invertebrates", "coelom", "sponges", "segmented", "insects"],
        "Human Physiology & Support": ["pain", "receptor", "neck", "joint", "bone", "lungs", "breathing", "heart rate", "blood pressure", "excretion", "kidney", "nephron", "nervous", "medulla", "cerebellum", "brain", "hormone", "pituitary", "thyroid"]
    },
    "Mathematics": {
        "Algebra & Numbers": ["equation", "root", "matrix", "determinant", "complex number", "quadratic", "sequence", "series", "permutation", "combination", "probability", "binomial"],
        "Trigonometry": ["trigonometric", "sine", "cosine", "tangent", "identity", "period", "height", "distance", "inverse"],
        "Calculus & Coordinates": ["limit", "derivative", "differential", "integration", "integral", "slope", "tangent", "line", "circle", "ellipse", "parabola", "hyperbola", "vector"]
    },
    "English": {
        "Vocabulary": ["meaning", "synonym", "antonym", "vexing", "vague", "mangled", "prodigious", "astounded", "sagacity", "grim", "indolently", "perish", "doze"],
        "Grammar & Prepositions": ["correct sentence", "spot the error", "preposition", "drenched", "lacked", "pacify", "disagree", "stuff", "glimpse", "impact", "dying"]
    },
    "Logical Reasoning": {
        "Logical Fallacies & Coding": ["coding", "sequence logic", "pattern match", "deduction", "syllogism", "cause and effect", "direction test", "ranking"]
    }
}

def clean_question_text(text):
    # Remove excessive line breaks, clean spacing
    cleaned = re.sub(r'\s+', ' ', text).strip()
    return cleaned

def parse_answer_key(text):
    """
    Finds and parses answer key blocks at the end of the text.
    Format: '1 C' or '17 C' or '46 D'
    """
    key_map = {}
    
    # Locate ANSWER KEY segment
    key_start = text.find("ANSWER KEY")
    if key_start == -1:
        key_start = text.find("Answer Key")
        
    if key_start != -1:
        key_text = text[key_start:]
        # Find matches of format '1 C', '46 D', '121 A', etc.
        matches = re.findall(r'\b(\d+)\s+([A-D|X])\b', key_text)
        for num, ans in matches:
            key_map[int(num)] = f"{ans}"
            
    return key_map

def map_topic_by_keywords(subject, question_text):
    if subject not in SUBJECT_CHAPTERS_KEYWORDS:
        return "General"
        
    q_lower = question_text.lower()
    for chapter, keywords in SUBJECT_CHAPTERS_KEYWORDS[subject].items():
        for kw in keywords:
            if kw in q_lower:
                return chapter
                
    # Return the first chapter as default fallback if no keywords match
    return list(SUBJECT_CHAPTERS_KEYWORDS[subject].keys())[0]

def parse_exam_questions(exam_type, text):
    """
    Extracts questions sequentially from raw text.
    Tracks subjects based on section titles.
    """
    questions = []
    
    # Normalize newline characters
    text = text.replace('\r\n', '\n')
    
    # 1. Parse Answer Key
    answer_key = parse_answer_key(text)
    print(f"    - Extracted {len(answer_key)} entries from Answer Key table.")
    
    # 2. Section Tracking: Split by lines to track headings
    lines = text.split('\n')
    current_subject = "Physics" # Default start subject
    
    # Subject section indicators
    subject_headers = {
        "PHYSICS": "Physics",
        "CHEMISTRY": "Chemistry",
        "BIOLOGY": "Biology",
        "ENGLISH": "English",
        "MATHEMATICS": "Mathematics",
        "MATH": "Mathematics",
        "LOGICAL REASONING": "Logical Reasoning"
    }
    
    # Match questions depending on MDCAT (Q.1 style) or ECAT (1. style)
    if exam_type == "mdcat":
        q_pattern = r'\n\s*(?:Q\s*[-.]\s*|\bQ\b\s*[-.]\s*|\bQ\b\s+|\bQ\b)(\d+)\b'
    else:
        q_pattern = r'\n\s*(\d+)\.\s+'
    
    # Find all question splits
    splits = re.split(q_pattern, text)
    # The first element is pre-question intro/header text
    # Following elements come in pairs: (q_num, q_content)
    
    intro_text = splits[0]
    
    # Process headers inside intro_text to find starting subject
    for header, subj in subject_headers.items():
        if header in intro_text.upper():
            current_subject = subj
            
    for i in range(1, len(splits), 2):
        try:
            q_num = int(splits[i])
            q_content = splits[i+1]
        except (ValueError, IndexError):
            continue
            
        # Parse subject header from the text leading to next question
        # If there are headers like 'CHEMISTRY' or 'ENGLISH' in the q_content before the next question,
        # we update the active subject for the NEXT questions.
        next_subject = current_subject
        for header, subj in subject_headers.items():
            # Match heading as a standalone word/line to prevent false triggers
            if re.search(r'\b' + re.escape(header) + r'\b', q_content):
                next_subject = subj
                
        # Split options (A, B, C, D)
        # Typical format: 'A) option1 B) option2 C) option3 D) option4' or on newlines
        options = []
        opt_matches = re.findall(r'\b([A-D])\s*[\)\.]\s*(.*?)(?=\b[A-D]\s*[\)\.]|$|\n)', q_content, re.DOTALL)
        
        # Format options as 'A) ...', 'B) ...'
        for letter, opt_text in opt_matches:
            clean_opt = clean_question_text(opt_text)
            # Remove trailing dots, newlines
            clean_opt = re.sub(r'Ans:\s*.*$', '', clean_opt).strip()
            options.append(f"{letter}) {clean_opt}")
            
        # Extract question stem (text before options)
        stem_text = q_content
        first_opt_idx = re.search(r'\b[A-D]\s*[\)\.]', q_content)
        if first_opt_idx:
            stem_text = q_content[:first_opt_idx.start()]
            
        clean_stem = clean_question_text(stem_text)
        
        # Clean question index headers (e.g. remove trailing 'PHYSICS' or 'BIOLOGY' indicators from question body)
        for header in subject_headers:
            clean_stem = re.sub(r'\b' + re.escape(header) + r'\b', '', clean_stem, flags=re.IGNORECASE).strip()
            
        # If options not matched correctly via regex, provide generic options
        if len(options) != 4:
            options = ["A) Option A", "B) Option B", "C) Option C", "D) Option D"]
            
        # Extract Answer
        ans = "A" # Default fallback
        if q_num in answer_key:
            ans_letter = answer_key[q_num]
            # Find the option matching the letter
            matching_opt = [o for o in options if o.startswith(ans_letter)]
            if matching_opt:
                ans = matching_opt[0]
            else:
                ans = f"{ans_letter}) Correct Option"
        else:
            # Fallback: check if 'Ans:' text is inside the question block
            ans_match = re.search(r'Ans:\s*(.*?)(?=\n|$)', q_content, re.IGNORECASE)
            if ans_match:
                ans_val = ans_match.group(1).strip()
                ans = clean_question_text(ans_val)
            else:
                ans = options[0] # Fallback to A
                
        # Determine FSc chapter
        chapter = map_topic_by_keywords(current_subject, clean_stem)
        
        # Determine difficulty level (heuristic based on question length and vocabulary)
        difficulty = "Moderate"
        if len(clean_stem) < 50:
            difficulty = "Easy"
        elif len(clean_stem) > 130 or any(x in clean_stem.lower() for x in ["calculate", "determine", "derive", "conservation", "hybridization"]):
            difficulty = "Hard"
            
        questions.append({
            "q_num": q_num,
            "subject": current_subject,
            "chapter": chapter,
            "difficulty": difficulty,
            "style_reference": {
                "question": clean_stem,
                "options": options,
                "answer": ans
            }
        })
        
        # Update active subject for the next question
        current_subject = next_subject
        
    return questions

def main():
    print("=" * 80)
    print("STARTING PAST PAPERS SEQUENTIAL PATTERN ANALYZER...")
    print(f"Reading raw data from: {EXTRACTED_JSON_PATH}")
    
    if not os.path.exists(EXTRACTED_JSON_PATH):
        print(f"Error: Raw past papers JSON file not found at {EXTRACTED_JSON_PATH}!")
        return
        
    with open(EXTRACTED_JSON_PATH, "r", encoding="utf-8") as f:
        extracted_data = json.load(f)
        
    syllabus_map = {
        "mdcat": {},
        "ecat": {}
    }
    
    for item in extracted_data:
        exam_type = item.get("exam_type", "").lower()
        year = item.get("year", "")
        text = item.get("text", "")
        
        if exam_type not in ["mdcat", "ecat"] or not year or len(text.strip()) < 1000:
            # Skip placeholders
            continue
            
        print(f"\nProcessing {exam_type.upper()} solved paper from Year {year}...")
        parsed_qs = parse_exam_questions(exam_type, text)
        
        if parsed_qs:
            print(f"  --> Extracted {len(parsed_qs)} sequential questions.")
            syllabus_map[exam_type][year] = parsed_qs
        else:
            print("  --> Warning: No questions extracted.")
            
    # Save output map
    print("\n" + "=" * 80)
    print(f"Writing final structural layout mapping to: {OUTPUT_MAP_PATH}")
    with open(OUTPUT_MAP_PATH, "w", encoding="utf-8") as out_f:
        json.dump(syllabus_map, out_f, indent=2, ensure_ascii=False)
        
    print("SUCCESS: syllabus_weightage_map.json is generated.")
    print("=" * 80)

if __name__ == "__main__":
    main()
