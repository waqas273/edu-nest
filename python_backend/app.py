from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
import sys

# Force UTF-8 encoding for stdout and stderr on Windows to prevent UnicodeEncodeError in task runner logs
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
import json
import re
import traceback
from openai import OpenAI
from dotenv import load_dotenv

# ── RAG Imports (lazy-loaded on first request to avoid slow startup) ──────────
_rag_collection = None

def get_rag_resources():
    """Lazy-load ChromaDB on first RAG request."""
    global _rag_collection
    if _rag_collection is None:
        try:
            import chromadb
            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            VECTOR_DB_PATH = os.path.join(BASE_DIR, "vector_db", "chroma")
            client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
            _rag_collection = client.get_collection("fsc_syllabus")
            print(f"[RAG] Loaded vector DB with {_rag_collection.count()} chunks.")
        except Exception as e:
            print(f"[RAG] Failed to load resources: {e}")
    return None, _rag_collection


def get_query_embedding(text):
    """Generate embedding for a query text using OpenRouter openai/text-embedding-3-small."""
    key = os.environ.get("VITE_OPENROUTER_EXAM_KEY")
    if not key:
        raise ValueError("VITE_OPENROUTER_EXAM_KEY is not configured in .env")
        
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/text-embedding-3-small",
        "input": text
    }
    import requests
    response = requests.post(url, headers=headers, json=payload, timeout=15)
    if response.status_code == 200:
        res_data = response.json()
        return res_data["data"][0]["embedding"]
    else:
        raise Exception(f"OpenRouter embedding call failed: {response.text}")


# Load env from parent directory (where .env typically is in this project structure)
# Attempt to load from parent first, then current
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))
load_dotenv() # Fallback to current dir

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- Load Model ---
MODEL_PATH = 'interest_model.pkl'  # Updated to Random Forest model
model = None

try:
    if os.path.exists(MODEL_PATH):
        loaded_data = joblib.load(MODEL_PATH)
        if isinstance(loaded_data, dict) and 'model' in loaded_data:
            model = loaded_data['model']
        else:
            model = loaded_data
        print(f"Model loaded successfully from {MODEL_PATH}")
    else:
        print(f"WARNING: Model file not found at {MODEL_PATH}. Prediction endpoint will fail.")
except Exception as e:
    print(f"Error loading model: {e}")

# --- OpenRouter/OpenAI Setup ---
# Using VITE_OPENROUTER_API_KEY as requested
api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
openai_client = None

if api_key:
    openai_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    print("OpenRouter client initialized.")
else:
    print("WARNING: VITE_OPENROUTER_API_KEY environment variable not found. Dynamic generation might fail.")

# --- Groq Setup (Secure RAG Inference) ---
groq_key = os.environ.get("VITE_GROQ_API_KEY")
groq_client = None

if groq_key:
    groq_client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=groq_key,
    )
    print("Groq client initialized for secure RAG pipeline.")
else:
    print("WARNING: VITE_GROQ_API_KEY environment variable not found. RAG generation might fail.")

def call_groq_completion_with_retry(client, prompt, model="llama-3.3-70b-versatile", retries=2):
    """Call Groq chat completion with retry logic."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            print(f"[Groq] Attempt {attempt + 1}/{retries + 1} calling model: {model}")
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=4096
            )
            content = response.choices[0].message.content
            print(f"[Groq] Response received ({len(content)} chars)")
            return content
        except Exception as e:
            last_err = e
            print(f"[Groq] Attempt {attempt + 1} failed: {e}")
    raise last_err




@app.route('/predict-step', methods=['POST'])
def predict_step():
    """
    Incremental prediction for the Interest Assessment Module.
    Expects current vector (size 7).
    """
    try:
        data = request.get_json()
        current_vector = data.get('vector') # List of 7 floats

        if not current_vector or len(current_vector) != 7:
            return jsonify({"error": "Invalid vector. Expected 7 values."}), 400

        if not model:
             return jsonify({"error": "Model not loaded."}), 500

        # Create numpy array
        input_arr = np.array(current_vector).reshape(1, -1)
        
        # Get Probabilities
        probs = model.predict_proba(input_arr)[0]
        classes = model.classes_
        
        # Map to dict
        prob_dict = {cls: float(prob) for cls, prob in zip(classes, probs)}
        
        # Find Top Class
        max_class = max(prob_dict, key=prob_dict.get)
        max_prob = prob_dict[max_class]
        
        return jsonify({
            "probabilities": prob_dict,
            "top_class": max_class,
            "max_prob": max_prob
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/generate-dynamic', methods=['POST'])
def generate_dynamic():
    """
    Endpoint to generate a tie-breaker question using OpenRouter.
    Expects JSON: { "classA": "CS", "classB": "Math" }
    Returns JSON: { "question": "Question text...", "focus_class": "CS" }
    """
    try:
        data = request.get_json()
        class_a = data.get('classA')
        class_b = data.get('classB')

        if not class_a or not class_b:
            return jsonify({"error": "Missing classA or classB"}), 400
            
        # Randomly pick ONE to focus on for variety in the statement
        import random
        focus_class = random.choice([class_a, class_b])
        other_class = class_b if focus_class == class_a else class_a

        if not openai_client:
             # Fallback
             return jsonify({
                 "question": f"I would rather explore {focus_class} than {other_class}.",
                 "focus_class": focus_class,
                 "isFallback": True
             })

        # IMPROVED PROMPT: Strict Comparative Statement WITHOUT Field Names
        prompt = (
            f"Generate a single first-person comparative statement "
            f"that implies a preference for '{focus_class}' over '{other_class}' by comparing their activities. "
            f"CRITICAL: Do NOT use the names of the fields (e.g. do not say '{focus_class}' or '{other_class}'). "
            f"Instead, describe a specific task from each field. "
            f"Example: 'I would rather design a user interface than analyze a chemical reaction.' "
            f"Return ONLY the statement text."
        )

        response = openai_client.chat.completions.create(
            # Use a reliable model supported by OpenRouter (e.g. openai/gpt-3.5-turbo)
            model="openai/gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You mean a helpful assistant generating career inventory questions."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=60,
            temperature=0.9,
            extra_headers={
                "HTTP-Referer": "http://localhost:5173", # Optional OpenRouter headers
                "X-Title": "AntiEduNest Dev",
            },
        )
        
        question_text = response.choices[0].message.content.strip().replace('"', '')
        
        return jsonify({
            "question": question_text,
            "focus_class": focus_class
        })

    except Exception as e:
        traceback.print_exc()
        # Fail safe
        return jsonify({
            "question": f"I prefer {class_a} over {class_b}.", 
            "focus_class": class_a
        })
def get_offline_fallback(subject, count):
    """Gets fallback questions from past_papers.json"""
    try:
        past_papers_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "past_papers.json")
        if os.path.exists(past_papers_path):
            with open(past_papers_path, "r", encoding="utf-8") as f:
                pool = json.load(f)
                subject_qs = [q for q in pool if q.get("subject", "").lower() == subject.lower()]
                if subject_qs:
                    import random
                    # If count is greater than available questions, repeat or pad
                    if len(subject_qs) >= count:
                        selected = random.sample(subject_qs, count)
                    else:
                        selected = [random.choice(subject_qs) for _ in range(count)]
                    
                    # Add IDs
                    formatted_selected = []
                    for idx, q in enumerate(selected):
                        formatted_selected.append({
                            "id": idx + 1,
                            "subject": q.get("subject", subject),
                            "difficulty": q.get("difficulty", "Moderate"),
                            "question": q.get("question"),
                            "options": q.get("options"),
                            "answer": q.get("answer"),
                            "explanation": q.get("explanation", "This is an offline fallback question."),
                            "chapter": q.get("topic", "curriculum syllabus")
                        })
                    return formatted_selected
    except Exception as e:
        print(f"Error loading offline fallback: {e}")
    
    # Absolute minimal fallback if even past_papers.json is missing or fails
    return [
        {
            "id": idx + 1,
            "subject": subject,
            "difficulty": "Moderate",
            "question": f"Default offline reference question for {subject} dynamic practice.",
            "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
            "answer": "Option A",
            "explanation": "This is a placeholder fallback question because the database was unreachable."
        }
        for idx in range(count)
    ]


def call_groq_completion_with_retry(groq_client, prompt, model="llama-3.3-70b-versatile", retries=3, backoff=2):
    import time
    for attempt in range(retries):
        try:
            response = groq_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert Pakistan entry test examiner. Always respond with raw JSON arrays only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.75,
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt < retries - 1:
                sleep_time = backoff ** attempt
                print(f"[RAG API] Groq call failed: {e}. Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                raise e
    raise Exception("Failed after max retries")


def get_query_embeddings_batch(texts):
    """Generate embeddings for a list of texts in a single OpenRouter API batch call."""
    key = os.environ.get("VITE_OPENROUTER_EXAM_KEY")
    if not key:
        raise ValueError("VITE_OPENROUTER_EXAM_KEY is not configured in .env")
        
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/text-embedding-3-small",
        "input": texts
    }
    import requests
    response = requests.post(url, headers=headers, json=payload, timeout=25)
    if response.status_code == 200:
        res_data = response.json()
        return [item["embedding"] for item in res_data.get("data", [])]
    else:
        raise Exception(f"OpenRouter batch embedding call failed: {response.text}")


def clean_and_enrich_questions(questions, subject):
    import re
    # Match patterns like: A) or A. or A - or (A) at the beginning of option text
    prefix_re = re.compile(r"^\s*\(?[A-D]\s*[\).\-]\s*")
    
    for q in questions:
        # Clean options
        if "options" in q and isinstance(q["options"], list):
            cleaned_opts = []
            for opt in q["options"]:
                if isinstance(opt, str):
                    cleaned_opts.append(prefix_re.sub("", opt).strip())
                else:
                    cleaned_opts.append(str(opt))
            q["options"] = cleaned_opts
            
        # Clean answer
        if q.get("answer") and isinstance(q["answer"], str):
            q["answer"] = prefix_re.sub("", q["answer"]).strip()
            
        # Enrich generic/fallback explanations
        explanation = q.get("explanation", "")
        if not explanation or "historical chronological pattern" in explanation or "offline fallback" in explanation:
            chapter_name = q.get("chapter", "curriculum syllabus")
            correct_ans = q.get("answer", "")
            q["explanation"] = (
                f"The correct answer is '{correct_ans}'. This is a verified past paper question for {subject} "
                f"from the topic/chapter '{chapter_name}'. For a detailed analysis, please refer to the corresponding FSc "
                f"Textbook board study materials."
            )
            
    return questions


def generate_explanations_for_batch(batch_qs, subject):
    if not groq_client:
        return None
        
    # Build a compact prompt
    prompt = f"You are an expert tutor for {subject}. Write a highly detailed, comprehensive, and clear explanation (at least 3 sentences) explaining the underlying scientific/logical concept, how the correct option is derived, and why the other options are incorrect for each of the following multiple choice questions.\n\n"
    
    questions_data = []
    for idx, q_info in enumerate(batch_qs):
        style = q_info["style_reference"]
        questions_data.append({
            "index": idx + 1,
            "question": style["question"],
            "options": style["options"],
            "answer": style["answer"]
        })
        
    prompt += json.dumps(questions_data, indent=2)
    prompt += "\n\nSTRICT INSTRUCTIONS:\n"
    prompt += f"1. Return a JSON object containing a single key 'explanations', which is a list of exactly {len(batch_qs)} strings.\n"
    prompt += "2. Each string must be a highly detailed, comprehensive explanation (at least 3 sentences) for the corresponding question.\n"
    prompt += "3. Do not include any HTML, markdown, backticks, or introduction. Return ONLY raw JSON.\n"
    
    try:
        # Use llama-3.1-8b-instant as it has high limits and is super fast for simple tutor tasks
        response = call_groq_completion_with_retry(
            groq_client, 
            prompt, 
            model="llama-3.1-8b-instant", 
            retries=2
        )
        data = json.loads(response)
        explanations = data.get("explanations", [])
        if isinstance(explanations, list) and len(explanations) == len(batch_qs):
            return explanations
    except Exception as e:
        print(f"[Sequence RAG API] Failed to generate AI explanations for batch: {e}")
        
    return None


def generate_questions_via_ai(subject, count, exam_type):
    if not groq_client:
        return None
        
    print(f"[AI Generator] Generating {count} questions for {subject} ({exam_type}) using AI...")
    
    batch_size = 10
    all_qs = []
    
    for offset in range(0, count, batch_size):
        batch_count = min(batch_size, count - offset)
        
        prompt = (
            f"You are an expert Pakistan entry test ({exam_type.upper()}) question setter.\n"
            f"Generate EXACTLY {batch_count} high-quality, unique multiple-choice questions (MCQs) for the subject '{subject}'.\n\n"
        )
        
        if subject.lower() == "english":
            prompt += (
                "Focus on entrance test English topics such as grammar, vocabulary, sentence correction, "
                "synonyms, antonyms, prepositions, and spot-the-error style questions.\n"
            )
        elif subject.lower() == "logical reasoning":
            prompt += (
                "Focus on entry test Logical Reasoning topics such as letter/number series, logical deductions, "
                "coding-decoding, logical games, patterns, and analytical reasoning.\n"
            )
        else:
            prompt += f"Focus on topics from the standard FSc {subject} curriculum.\n"
            
        prompt += (
            "\nSTRICT FORMATTING INSTRUCTIONS:\n"
            "1. Return ONLY a valid JSON list of objects. No intro, no markdown, no code blocks.\n"
            "2. Each object in the list must have these exact keys:\n"
            "   - 'question': The question text.\n"
            "   - 'options': A list of exactly 4 options. Do NOT prepend letters like A), B), C), D) to the options.\n"
            "   - 'answer': The correct option text (must match one of the options exactly).\n"
            "   - 'explanation': A comprehensive, highly detailed explanation of why the correct option is right, explaining the underlying concept thoroughly (3 sentences minimum).\n"
            "   - 'difficulty': 'Easy', 'Moderate', or 'Hard'.\n"
            "\n"
            "Example JSON output:\n"
            "[\n"
            "  {\n"
            "    \"question\": \"Choose the correct synonym of 'Aghast':\",\n"
            "    \"options\": [\"Critical\", \"Reluctant\", \"Horrified\", \"Happy\"],\n"
            "    \"answer\": \"Horrified\",\n"
            "    \"explanation\": \"'Aghast' means filled with horror or shock; hence 'Horrified' is the correct synonym. The other options do not carry this meaning: 'Critical' denotes expressing criticism or finding fault, 'Reluctant' means unwilling or hesitant, and 'Happy' is a state of pleasure or contentment. Thus, 'Horrified' is the only logical choice.\",\n"
            "    \"difficulty\": \"Moderate\"\n"
            "  }\n"
            "]"
        )
        
        try:
            # Call Groq (Llama-3.3-70b-versatile or Llama-3.1-8b-instant as fallback)
            model = "llama-3.3-70b-versatile"
            content = call_groq_completion_with_retry(groq_client, prompt, model=model, retries=2)
            parsed_data = json.loads(content)
            
            if isinstance(parsed_data, list):
                for q in parsed_data:
                    if q.get("question") and isinstance(q.get("options"), list) and len(q["options"]) == 4 and q.get("answer"):
                        all_qs.append({
                            "subject": subject,
                            "difficulty": q.get("difficulty", "Moderate"),
                            "question": q["question"],
                            "options": q["options"],
                            "answer": q["answer"],
                            "explanation": q.get("explanation", "AI generated practice question.")
                        })
            print(f"[AI Generator] Successfully generated batch of {batch_count} questions.")
        except Exception as e:
            print(f"[AI Generator] Error generating batch: {e}")
            try:
                content = call_groq_completion_with_retry(groq_client, prompt, model="llama-3.1-8b-instant", retries=1)
                parsed_data = json.loads(content)
                if isinstance(parsed_data, list):
                    for q in parsed_data:
                        if q.get("question") and isinstance(q.get("options"), list) and len(q["options"]) == 4 and q.get("answer"):
                            all_qs.append({
                                "subject": subject,
                                "difficulty": q.get("difficulty", "Moderate"),
                                "question": q["question"],
                                "options": q["options"],
                                "answer": q["answer"],
                                "explanation": q.get("explanation", "AI generated practice question.")
                            })
            except Exception as e2:
                print(f"[AI Generator] Retry failed: {e2}")
                
    if len(all_qs) >= count:
        return all_qs[:count]
    elif len(all_qs) > 0:
        import random
        while len(all_qs) < count:
            all_qs.append(random.choice(all_qs).copy())
        return all_qs
        
    return None


@app.route('/api/generate-rag-exam', methods=['POST'])
def generate_rag_exam():
    """
    Sequence-aligned RAG exam question generator.
    Replicates the exact chronological layout, topic order, and style of real past papers.
    Uses concurrency to deliver fast responses.
    Accepts JSON:
    {
        "examType": "mdcat" | "ecat",
        "subject": "Physics",
        "count": 10,
        "year": "2015" (optional)
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON request body."}), 400

        exam_type = data.get("examType", "mdcat").lower()
        subject = data.get("subject")
        count = data.get("count", 10)
        year = data.get("year")

        if not subject:
            return jsonify({"error": "Missing 'subject' parameter."}), 400

        try:
            count = int(count)
        except ValueError:
            count = 10

        print(f"[Sequence RAG API] Request: {exam_type.upper()} {subject} | Count: {count} | Year Option: {year}")

        # 1. Load syllabus weightage sequence map
        map_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "syllabus_weightage_map.json")
        sequence_map = {}
        if os.path.exists(map_path):
            try:
                with open(map_path, "r", encoding="utf-8") as f:
                    sequence_map = json.load(f)
            except Exception as e:
                print(f"[Sequence RAG API] Error loading sequence map: {e}")

        # 2. Get past paper sequence template for this exam type and subject
        subject_qs = []
        exam_years = sequence_map.get(exam_type, {})
        
        # Look for years that have valid questions for our target subject
        valid_years = []
        for yr, qs in exam_years.items():
            year_subject_qs = [q for q in qs if q.get("subject", "").lower() == subject.lower()]
            if year_subject_qs:
                valid_years.append(yr)

        selected_year = None
        if valid_years:
            if year and str(year) in valid_years:
                selected_year = str(year)
            else:
                import random
                selected_year = random.choice(valid_years)
            print(f"[Sequence RAG API] Using sequence template from {exam_type.upper()} Year {selected_year}")
            full_year_qs = exam_years[selected_year]
            # Filter and keep original question positions
            subject_qs = [q for q in full_year_qs if q.get("subject", "").lower() == subject.lower()]
        else:
            print(f"[Sequence RAG API] No template sequence found for {exam_type} - {subject}")

        # If sequence map is completely missing or empty, use fallback questions immediately
        if not subject_qs:
            print(f"[Sequence RAG API] Subject '{subject}' template sequence not found. Attempting AI generation...")
            ai_qs = generate_questions_via_ai(subject, count, exam_type)
            if ai_qs:
                for idx, q in enumerate(ai_qs):
                    q["id"] = idx + 1
                return jsonify(clean_and_enrich_questions(ai_qs, subject))
            print("[Sequence RAG API] Triggering absolute offline fallback.")
            fallback_questions = get_offline_fallback(subject, count)
            return jsonify(clean_and_enrich_questions(fallback_questions, subject))

        # 3. Create list of selected template question slots of length `count`
        # Shuffle templates to ensure unique combinations of topics and past paper styles
        import random
        shuffled_subject_qs = list(subject_qs)
        random.shuffle(shuffled_subject_qs)

        selected_template_qs = []
        for i in range(count):
            selected_template_qs.append(shuffled_subject_qs[i % len(shuffled_subject_qs)])

        # 4. Perform targeted vector search by batching the unique chapter embeddings
        unique_chapters = list(set([q["chapter"] for q in selected_template_qs]))
        print(f"[Sequence RAG API] Unique chapters to retrieve: {unique_chapters}")
        
        chapter_contexts = {}
        _, collection = get_rag_resources()
        
        if collection is not None:
            try:
                # Get embeddings for all unique chapters in one batch call
                chapter_vectors = get_query_embeddings_batch([f"{ch} {subject} FSc textbook syllabus" for ch in unique_chapters])
                
                for idx, chapter in enumerate(unique_chapters):
                    vector = chapter_vectors[idx]
                    # Query ChromaDB for this specific chapter (Retrieving 2 results to optimize token usage and avoid rate limits)
                    results = collection.query(
                        query_embeddings=[vector],
                        n_results=2,
                        where={"subject": subject}
                    )
                    if results and "documents" in results and results["documents"] and results["documents"][0]:
                        chapter_contexts[chapter] = results["documents"][0]
                    else:
                        chapter_contexts[chapter] = []
                print(f"[Sequence RAG API] Successfully retrieved textbook contexts for {len(chapter_contexts)} chapters.")
            except Exception as db_err:
                print(f"[Sequence RAG API] Database vector matching failed: {db_err}")
        else:
            print("[Sequence RAG API] Vector collection not loaded. Textbook context will be empty.")

        # Helper function to parse questions list safely
        def parse_questions_list(parsed_data, batch_qs):
            questions_list = None
            if isinstance(parsed_data, list):
                questions_list = parsed_data
            elif isinstance(parsed_data, dict):
                for k, val in parsed_data.items():
                    if isinstance(val, list):
                        questions_list = val
                        break
            
            parsed_results = []
            if questions_list and isinstance(questions_list, list):
                for idx, q in enumerate(questions_list):
                    if not isinstance(q, dict):
                        continue
                    ref_template = batch_qs[idx % len(batch_qs)]
                    options = q.get("options")
                    if not isinstance(options, list) or len(options) != 4:
                        options = ref_template["style_reference"]["options"]
                    parsed_results.append({
                        "subject": q.get("subject", subject),
                        "difficulty": q.get("difficulty", ref_template["difficulty"]),
                        "question": q.get("question") or ref_template["style_reference"]["question"],
                        "options": options,
                        "answer": q.get("answer") or ref_template["style_reference"]["answer"],
                        "explanation": q.get("explanation", "Grounded in textbook curriculum notes.")
                    })
            return parsed_results

        # Helper function to process a single batch concurrently
        def process_single_batch(batch_offset, batch_qs):
            batch_count = len(batch_qs)
            print(f"[Sequence RAG API - Worker] Starting batch offset {batch_offset} (size: {batch_count})...")
            
            # Build prompt matching the sequence structure
            prompt = f"You are an expert Pakistan entry test (MDCAT/ECAT) question setter. Generate EXACTLY {batch_count} high-quality, unique multiple-choice questions (MCQs) for the subject '{subject}' based strictly on the textbook context and past paper styles below.\n\n"
            
            for idx, q_info in enumerate(batch_qs):
                prompt += f"QUESTION POSITION {idx + 1}:\n"
                prompt += f"CHAPTER/TOPIC: {q_info['chapter']}\n"
                prompt += f"DIFFICULTY LEVEL: {q_info['difficulty']}\n"
                
                # Append retrieved textbook contexts
                chunks = chapter_contexts.get(q_info['chapter'], [])
                context_text = "\n\n".join(chunks) if chunks else "No book context available."
                prompt += f"TEXTBOOK CONTEXT:\n{context_text}\n"
                
                # Append style reference from past paper at this index
                style = q_info['style_reference']
                prompt += f"PAST PAPER STYLE REFERENCE:\n"
                prompt += f"Question: {style['question']}\n"
                prompt += f"Options: {style['options']}\n"
                prompt += f"Answer: {style['answer']}\n\n"

            prompt += "STRICT GENERATION INSTRUCTIONS:\n"
            prompt += f"1. Generate EXACTLY {batch_count} questions — no more, no less. Match the question positions in order.\n"
            prompt += "2. All questions must be strictly grounded in their respective textbook contexts. Do not use outside facts.\n"
            prompt += "3. Provide exactly 4 options for each question (A, B, C, D).\n"
            prompt += "4. Output a valid JSON list of objects containing the fields: 'subject', 'difficulty', 'question', 'options', 'answer', and 'explanation'.\n"
            prompt += "5. Match the difficulty level specified for each question position. Label the difficulty field exactly as 'Easy', 'Moderate', or 'Hard'.\n"
            prompt += "6. Write a comprehensive, detailed explanation (minimum 3 sentences) for each question, thoroughly explaining the scientific/logical principles involved, how the correct answer is derived from the context, and why the other options are wrong.\n"
            prompt += "7. Do NOT output any markdown, HTML, backticks, or preamble. Return ONLY the raw JSON array.\n\n"

            prompt += "JSON schema template:\n"
            prompt += "[\n"
            prompt += "  {\n"
            prompt += f"    \"subject\": \"{subject}\",\n"
            prompt += f"    \"difficulty\": \"Easy | Moderate | Hard\",\n"
            prompt += f"    \"question\": \"Question text...\",\n"
            prompt += f"    \"options\": [\"A) option1\", \"B) option2\", \"C) option3\", \"D) option4\"],\n"
            prompt += "    \"answer\": \"Exact matching option text or letter\",\n"
            prompt += "    \"explanation\": \"A highly detailed and comprehensive explanation (minimum 3 sentences) explaining the key concept, the reasoning behind the correct answer, and why other options are incorrect.\"\n"
            prompt += "  }\n"
            prompt += "]"

            # Execute API call with 3-tier resilient fallback
            batch_success = False
            batch_results = []
            
            if groq_client and chapter_contexts:
                # Tier 1: Try llama-3.3-70b-versatile
                try:
                    print(f"[Sequence RAG API - Worker] Trying Tier 1 (Llama 3.3 70B) for batch offset {batch_offset}...")
                    content = call_groq_completion_with_retry(groq_client, prompt, model="llama-3.3-70b-versatile", retries=1)
                    parsed_data = json.loads(content)
                    batch_results = parse_questions_list(parsed_data, batch_qs)
                    if batch_results and len(batch_results) == batch_count:
                        print(f"[Sequence RAG API - Worker] Tier 1 successful for batch offset {batch_offset}.")
                        batch_success = True
                except Exception as tier1_err:
                    print(f"[Sequence RAG API - Worker] Tier 1 failed: {tier1_err}. Trying Tier 2 (Llama 3.1 8B Instant)...")
                    
                    # Tier 2: Try llama-3.1-8b-instant (Higher Rate Limits)
                    try:
                        content = call_groq_completion_with_retry(groq_client, prompt, model="llama-3.1-8b-instant", retries=1)
                        parsed_data = json.loads(content)
                        batch_results = parse_questions_list(parsed_data, batch_qs)
                        if batch_results and len(batch_results) == batch_count:
                            print(f"[Sequence RAG API - Worker] Tier 2 successful for batch offset {batch_offset}.")
                            batch_success = True
                    except Exception as tier2_err:
                        print(f"[Sequence RAG API - Worker] Tier 2 failed: {tier2_err}.")

            # Tier 3: Zero-latency solved past paper fallback
            if not batch_success:
                print(f"[Sequence RAG API - Worker] Tier 3: Loading real past paper fallback questions for batch offset {batch_offset}...")
                
                # Generate AI explanations for this batch
                ai_explanations = generate_explanations_for_batch(batch_qs, subject)
                
                batch_results = []
                for idx, q_info in enumerate(batch_qs):
                    style = q_info["style_reference"]
                    
                    # Determine explanation text
                    exp_text = ""
                    if ai_explanations and idx < len(ai_explanations):
                        exp_text = ai_explanations[idx]
                        
                    if not exp_text:
                        # Dynamic clean fallback if AI explanation call fails
                        chapter_name = q_info.get("chapter", "curriculum syllabus")
                        exp_text = f"The correct answer is {style['answer']}. Please review the topic '{chapter_name}' in your FSc textbook for detailed study."
                        
                    batch_results.append({
                        "subject": subject,
                        "difficulty": q_info["difficulty"],
                        "question": style["question"],
                        "options": style["options"],
                        "answer": style["answer"],
                        "explanation": exp_text,
                        "chapter": q_info.get("chapter", "curriculum syllabus")
                    })
            return batch_results

        # 5. Process batches concurrently using ThreadPoolExecutor
        batch_size = 10
        all_generated_questions = []
        
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for offset in range(0, count, batch_size):
                batch_qs = selected_template_qs[offset:offset+batch_size]
                futures.append(executor.submit(process_single_batch, offset, batch_qs))
                
            # Collect results in order
            for idx, f in enumerate(futures):
                offset = idx * batch_size
                batch_qs = selected_template_qs[offset:offset+batch_size]
                try:
                    all_generated_questions.extend(f.result())
                except Exception as f_err:
                    print(f"[Sequence RAG API] Future retrieval failed for batch offset {offset}: {f_err}")
                    # Load real past paper fallback questions for this failed batch
                    ai_explanations = generate_explanations_for_batch(batch_qs, subject)
                    for idx, q_info in enumerate(batch_qs):
                        style = q_info["style_reference"]
                        
                        exp_text = ""
                        if ai_explanations and idx < len(ai_explanations):
                            exp_text = ai_explanations[idx]
                            
                        if not exp_text:
                            chapter_name = q_info.get("chapter", "curriculum syllabus")
                            exp_text = f"The correct answer is {style['answer']}. Please review the topic '{chapter_name}' in your FSc textbook for detailed study."
                            
                        all_generated_questions.append({
                            "subject": subject,
                            "difficulty": q_info["difficulty"],
                            "question": style["question"],
                            "options": style["options"],
                            "answer": style["answer"],
                            "explanation": exp_text,
                            "chapter": q_info.get("chapter", "curriculum syllabus")
                        })

        # 6. Assign final sequential ID values
        for idx, q in enumerate(all_generated_questions):
            q["id"] = idx + 1

        print(f"[Sequence RAG API] Successfully compiled {len(all_generated_questions)} final questions.")
        return jsonify(clean_and_enrich_questions(all_generated_questions, subject))

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-roadmap', methods=['POST'])
def generate_roadmap_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON request body."}), 400
            
        skill = data.get("skill")
        if not skill:
            return jsonify({"error": "Missing 'skill' parameter."}), 400
            
        print(f"[Roadmap API] Generating roadmap for skill: {skill}")
        
        prompt = (
            f"Generate a STRUCTURED learning roadmap for \"{skill}\".\n"
            f"Target Audience: Average Student.\n"
            f"Return ONLY a valid JSON array with STRICTLY 10 MAIN TOPICS.\n"
            f"Each Main Topic MUST have EXACTLY 7 SUBTOPICS.\n"
            f"Focus on deep technical details.\n"
            f"Format:\n"
            f"[\n"
            f"  {{\n"
            f"    \"title\": \"Topic Title\",\n"
            f"    \"description\": \"Detailed description of the topic\",\n"
            f"    \"subtopics\": [\"Subtopic 1\", \"Subtopic 2\", \"Subtopic 3\", \"Subtopic 4\", \"Subtopic 5\", \"Subtopic 6\", \"Subtopic 7\"]\n"
            f"  }}\n"
            f"]\n"
            f"Do not use \"...\". Provide actual content for all 10 topics and 7 subtopics each."
        )
        
        if groq_client:
            try:
                # Call Groq
                content = call_groq_completion_with_retry(
                    groq_client,
                    prompt,
                    model="llama-3.3-70b-versatile",
                    retries=2
                )
                
                print(f"\n[Roadmap API] AI Raw Output:\n{content}\n")
                
                # Robust JSON extraction
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                first_idx = content.find('[')
                last_idx = content.rfind(']')
                if first_idx != -1 and last_idx != -1:
                    content = content[first_idx:last_idx+1]
                    
                # Parse to ensure it is valid JSON
                parsed_data = json.loads(content)
                if isinstance(parsed_data, list):
                    return jsonify(parsed_data)
            except Exception as ai_err:
                print(f"[Roadmap API] AI Generation failed: {ai_err}")
                
        return jsonify({"error": "AI generation failed"}), 500
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-roadmap-test', methods=['POST'])
def generate_roadmap_test_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing JSON request body."}), 400
            
        topic = data.get("topic")
        skill = data.get("skill")
        count = data.get("count", 15)
        difficulty = data.get("difficulty", "Beginner")
        
        if not topic or not skill:
            return jsonify({"error": "Missing required parameters."}), 400
            
        print(f"[Roadmap Test API] Generating {count} questions for topic '{topic}' in skill '{skill}'")
        
        prompt = (
            f"Generate {count} {difficulty.upper()}-LEVEL multiple choice questions on \"{topic}\" for \"{skill}\".\n"
            f"Return ONLY a valid JSON array of objects. Do not use \"...\". Generate actual questions and options.\n"
            f"Format:\n"
            f"[\n"
            f"  {{\n"
            f"    \"question\": \"Actual question text here?\",\n"
            f"    \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"],\n"
            f"    \"correctIndex\": 0,\n"
            f"    \"explanation\": \"Detailed explanation here.\"\n"
            f"  }}\n"
            f"]\n\n"
            f"IMPORTANT INSTRUCTIONS FOR \"explanation\":\n"
            f"1. Explain WHY the correct answer is the right choice.\n"
            f"2. Use Simple, Professional English (Easy to understand).\n"
            f"3. Length: Approximately 3 to 4 sentences.\n"
            f"4. Do not simply repeat the question. Break down the concept clearly."
        )
        
        if groq_client:
            try:
                # Call Groq
                content = call_groq_completion_with_retry(
                    groq_client,
                    prompt,
                    model="llama-3.3-70b-versatile",
                    retries=2
                )
                
                print(f"\n[Roadmap Test API] AI Raw Output:\n{content}\n")
                
                # Robust JSON extraction
                import re
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                first_idx = content.find('[')
                last_idx = content.rfind(']')
                if first_idx != -1 and last_idx != -1:
                    content = content[first_idx:last_idx+1]
                    
                # Parse to ensure it is valid JSON
                parsed_data = json.loads(content)
                if isinstance(parsed_data, list):
                    return jsonify(parsed_data)
            except Exception as ai_err:
                print(f"[Roadmap Test API] AI Generation failed: {ai_err}")
                
        return jsonify({"error": "AI generation failed"}), 500
        
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Run on port 5001 to avoid React (3000) or other conflicts
    app.run(debug=True, port=5001)
