import os, requests, json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get('VITE_GROQ_API_KEY'))

prompt = (
    "Generate 4 BEGINNER-LEVEL multiple choice questions on \"Electric Charges\" for \"Physics\".\n"
    "JSON Only: [{ \"question\": \"...\", \"options\": [\"A\",\"B\",\"C\",\"D\"], \"correctIndex\": 0, \"explanation\": \"...\" }]\n\n"
    "IMPORTANT INSTRUCTIONS FOR \"explanation\":\n"
    "1. Explain WHY the correct answer is the right choice.\n"
    "2. Use Simple, Professional English (Easy to understand).\n"
    "3. Length: Approximately 150 words.\n"
    "4. Do not simply repeat the question. Break down the concept clearly."
)

res = client.chat.completions.create(
    messages=[{'role': 'user', 'content': prompt}], 
    model='llama-3.3-70b-versatile'
)
print("---RAW OUTPUT---")
print(res.choices[0].message.content)
