import urllib.request
import json

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyDT74WLfgvn4s_BF-AM0PKn7zXVwh7-RLc"

data = {
    "contents": [
        {
            "parts": [{"text": "Hello"}]
        }
    ]
}

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(e)
