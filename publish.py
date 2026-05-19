import base64
import json
import os
import urllib.request
import urllib.error
import sys
from datetime import datetime

token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
repo  = os.environ.get("GITHUB_REPOSITORY", "eduardoxyz22-maker/MULTIESPUMAS")

if not token:
    print("Error: GH_TOKEN no definido", file=sys.stderr)
    sys.exit(1)

api = f"https://api.github.com/repos/{repo}/contents/index.html"
headers = {"Authorization": f"token {token}", "Content-Type": "application/json"}

# Obtener SHA actual del archivo
req = urllib.request.Request(api, headers=headers)
with urllib.request.urlopen(req) as r:
    sha = json.load(r)["sha"]

# Leer y codificar index.html
with open("index.html", "rb") as f:
    content = base64.b64encode(f.read()).decode()

from datetime import timezone, timedelta
now = datetime.now(timezone(timedelta(hours=-4)))  # Bolivia UTC-4
timestamp = now.strftime("%d/%m/%Y %H:%M")

payload = json.dumps({
    "message": f"Dashboard {timestamp}",
    "content": content,
    "sha": sha,
}).encode()

req = urllib.request.Request(api, data=payload, method="PUT", headers=headers)
try:
    with urllib.request.urlopen(req) as r:
        print(f"Publicado OK — status {r.status}, Dashboard {timestamp}")
except urllib.error.HTTPError as e:
    print(f"Error HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
    sys.exit(1)
