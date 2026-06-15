"""
ingest.py - Vector Database Ingestion Utility for EduNest RAG Pipeline

This script scans the 'python_backend/data/syllabus' directory recursively,
extracts text from clean, text-selectable PDFs page-by-page, splits it into
800-character chunks with a 100-character overlap, computes embeddings using 
OpenRouter's 'openai/text-embedding-3-small' API, and indexes them in ChromaDB.
"""

import os
import sys
import re
import time
import pypdf
import chromadb
import requests
from dotenv import load_dotenv

# Ensure console output is in UTF-8
sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(BASE_DIR)
SYLLABUS_DIR = os.path.join(BASE_DIR, "data", "syllabus")
DB_PATH = os.path.join(BASE_DIR, "vector_db", "chroma")

# Load environment variables
load_dotenv(os.path.join(PARENT_DIR, ".env"))
api_key = os.environ.get("VITE_OPENROUTER_EXAM_KEY")

def split_text_recursively(text, chunk_size=800, chunk_overlap=100, separators=["\n\n", "\n", " ", ""]):
    """
    Custom lightweight recursive character text splitter.
    Splits text on paragraph, line, and word boundaries to maintain readability.
    """
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        if end == text_len:
            chunks.append(text[start:end].strip())
            break
            
        split_at = end
        chunk_text = text[start:end]
        
        found_separator = False
        for sep in separators:
            if not sep:
                continue
            idx = chunk_text.rfind(sep)
            # Ensure the split isn't too small to maintain density
            if idx != -1 and idx > chunk_overlap:
                split_at = start + idx
                found_separator = True
                break
                
        if not found_separator:
            split_at = end
            
        chunks.append(text[start:split_at].strip())
        start = max(start + 1, split_at - chunk_overlap)
        
    return chunks

def get_subject_meta(dir_name):
    """
    Maps folder names to standard subjects and classes.
    e.g., 'biology_11' -> ('Biology', '11th')
    """
    parts = dir_name.lower().split('_')
    subject_raw = parts[0]
    class_raw = parts[1] if len(parts) > 1 else "11"
    
    # Map subject name
    subject_map = {
        "biology": "Biology",
        "chemistry": "Chemistry",
        "physics": "Physics",
        "math": "Mathematics",
        "mathematics": "Mathematics"
    }
    
    subject = subject_map.get(subject_raw, subject_raw.capitalize())
    class_name = f"{class_raw}th"
    return subject, class_name

def get_embeddings(texts, retries=5, backoff_factor=2):
    """
    Generate embeddings for a list of texts using OpenRouter openai/text-embedding-3-small.
    Supports retries with exponential backoff.
    """
    if not api_key:
        raise ValueError("VITE_OPENROUTER_EXAM_KEY not found in environment variables.")
        
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/text-embedding-3-small",
        "input": texts
    }
    
    for attempt in range(retries):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                res_data = response.json()
                return [item["embedding"] for item in res_data.get("data", [])]
            elif response.status_code == 429:
                sleep_time = backoff_factor ** attempt
                print(f"\n[Warning] Rate limited (429). Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                sleep_time = backoff_factor
                print(f"\n[Warning] API Error {response.status_code}: {response.text}. Retrying...")
                time.sleep(sleep_time)
        except Exception as e:
            sleep_time = backoff_factor
            print(f"\n[Warning] Request exception: {e}. Retrying...")
            time.sleep(sleep_time)
            
    raise Exception(f"Failed to generate embeddings after {retries} attempts.")

def main():
    print("=" * 70)
    print("Initializing RAG Ingestion script...")
    if not api_key:
        print("Error: VITE_OPENROUTER_EXAM_KEY environment variable is missing!")
        sys.exit(1)
    print("OpenRouter API key loaded successfully.")

    # Connect to local ChromaDB SQLite client
    print(f"Connecting to ChromaDB persistent storage at: {DB_PATH}...")
    try:
        chroma_client = chromadb.PersistentClient(path=DB_PATH)
        # Recreate collection to ensure clean slate and correct dimension (1536)
        try:
            chroma_client.delete_collection("fsc_syllabus")
        except Exception:
            pass
        collection = chroma_client.create_collection("fsc_syllabus")
        print("Connected and created clean collection 'fsc_syllabus'.")
    except Exception as e:
        print(f"ChromaDB connection failed: {e}")
        sys.exit(1)

    print("=" * 70)
    print("STARTING DIRECTORY SCAN & INGESTION:")

    if not os.path.exists(SYLLABUS_DIR):
        print(f"Error: Syllabus directory not found at {SYLLABUS_DIR}")
        sys.exit(1)

    subdirs = [d for d in os.listdir(SYLLABUS_DIR) if os.path.isdir(os.path.join(SYLLABUS_DIR, d))]
    
    total_docs_indexed = 0
    total_chunks_indexed = 0

    for subdir in sorted(subdirs):
        subject, class_name = get_subject_meta(subdir)
        subdir_path = os.path.join(SYLLABUS_DIR, subdir)
        
        # Scan for PDFs inside the subject directory recursively
        pdf_files = []
        for root, _, files in os.walk(subdir_path):
            for file in files:
                if file.endswith(".pdf"):
                    pdf_files.append(os.path.join(root, file))
                    
        if not pdf_files:
            continue
            
        print(f"\nProcessing {subject} ({class_name}) - Found {len(pdf_files)} PDFs:")
        
        for pdf_path in sorted(pdf_files):
            file_basename = os.path.basename(pdf_path)
            print(f"  - Reading '{file_basename}'...", end=" ", flush=True)
            
            try:
                reader = pypdf.PdfReader(pdf_path)
                num_pages = len(reader.pages)
                file_chunks = []
                file_metadatas = []
                file_ids = []
                
                pages_indexed = 0
                for page_idx in range(num_pages):
                    if pages_indexed >= 15:
                        break
                    page = reader.pages[page_idx]
                    try:
                        page_text = page.extract_text()
                    except Exception:
                        continue
                    
                    if not page_text or len(page_text.strip()) < 10:
                        continue # Skip empty or image-only pages
                        
                    # Split page text into chunks
                    chunks = split_text_recursively(page_text, chunk_size=800, chunk_overlap=100)
                    
                    page_has_chunks = False
                    for chunk_idx, chunk in enumerate(chunks):
                        if len(chunk) < 20:
                            continue # Ignore tiny leftover chunks
                            
                        chunk_id = f"{subdir}_{file_basename.replace('.', '_')}_p{page_idx + 1}_c{chunk_idx}"
                        
                        file_ids.append(chunk_id)
                        file_chunks.append(chunk)
                        file_metadatas.append({
                            "subject": subject,
                            "class": class_name,
                            "filename": file_basename,
                            "page": page_idx + 1
                        })
                        page_has_chunks = True
                        
                    if page_has_chunks:
                        pages_indexed += 1
                
                if file_chunks:

                    print(f"Extracted {len(file_chunks)} chunks. Embedding in batches...", end=" ", flush=True)
                    
                    # Generate vector embeddings and insert in batches of 50
                    batch_size = 50
                    for offset in range(0, len(file_chunks), batch_size):
                        batch_end = offset + batch_size
                        batch_chunks = file_chunks[offset:batch_end]
                        batch_ids = file_ids[offset:batch_end]
                        batch_metadatas = file_metadatas[offset:batch_end]
                        
                        # Generate embeddings via OpenRouter API
                        batch_embeddings = get_embeddings(batch_chunks)
                        
                        collection.add(
                            ids=batch_ids,
                            documents=batch_chunks,
                            embeddings=batch_embeddings,
                            metadatas=batch_metadatas
                        )
                        print(".", end="", flush=True)
                    
                    print(f" Success. Indexed all chunks.")
                    total_docs_indexed += 1
                    total_chunks_indexed += len(file_chunks)
                else:
                    print("Skipped (No selectable text extracted).")
                    
            except Exception as e:
                print(f"FAILED: {e}")

    print("\n" + "=" * 70)
    print("INGESTION COMPLETION SUMMARY:")
    print(f"  - Total PDF files indexed:  {total_docs_indexed}")
    print(f"  - Total text chunks stored: {total_chunks_indexed}")
    print(f"  - Vector DB saved at:       {DB_PATH}")
    print("=" * 70)

if __name__ == "__main__":
    main()

