import requests
import json
import os

with open('.env', 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_URL'):
            url = line.split('=')[1].strip()
        if line.startswith('VITE_SUPABASE_ANON_KEY'):
            key = line.split('=')[1].strip()

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}
r = requests.get(f"{url}/rest/v1/jutsus?select=*", headers=headers)
print(r.status_code)
print(r.text)
