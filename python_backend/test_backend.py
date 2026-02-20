import requests
import json

url = "http://127.0.0.1:5001/predict-step"
headers = {"Content-Type": "application/json"}
data = {
    "vector": [0.5] * 15
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:", json.dumps(response.json(), indent=2))
        print("Backend is HEALTHY.")
    else:
        print("Backend Error:", response.text)
except Exception as e:
    print(f"Connection Failed: {e}")
