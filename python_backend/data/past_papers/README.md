# RAG Past Papers Reference Directory

Place your past papers datasets (MDCAT/ECAT) in this directory. 

### Supported Formats:
1. **JSON Format (Recommended):**
   - `past_papers.json` containing lists of objects:
     ```json
     [
       {
         "subject": "Physics",
         "topic": "Electrostatics",
         "question": "What is the electric potential at...",
         "options": ["A", "B", "C", "D"],
         "answer": "A",
         "source": "MDCAT 2022"
       }
     ]
     ```
2. **PDF Format:**
   - Raw past papers PDFs (e.g., `mdcat_physics_2023.pdf`). The ingestion pipeline can split and parse these into the vector database.
