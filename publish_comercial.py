import base64, json, os, sys, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta

token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
repo  = os.environ.get("GITHUB_REPOSITORY", "eduardoxyz22-maker/MULTIESPUMAS")

if not token:
    print("Error: GH_TOKEN no definido", file=sys.stderr)
    sys.exit(1)

FILE = "dashboard-comercial.html"
api  = f"https://api.github.com/repos/{repo}/contents/{FILE}"
hdrs = {"Authorization": f"token {token}", "Content-Type": "application/json"}

sha = None
try:
    req = urllib.request.Request(api, headers=hdrs)
    with urllib.request.urlopen(req) as r:
        sha = json.load(r)["sha"]
except urllib.error.HTTPError:
    pass  # archivo nuevo

with open(FILE, "rb") as f:
    content = base64.b64encode(f.read()).decode()

now = datetime.now(timezone(timedelta(hours=-4)))
timestamp = now.strftime("%d/%m/%Y %H:%M")

payload = {"message": f"Dashboard comercial {timestamp}", "content": content}
if sha:
    payload["sha"] = sha

req = urllib.request.Request(api, data=json.dumps(payload).encode(), method="PUT", headers=hdrs)
try:
    with urllib.request.urlopen(req) as r:
        print(f"Publicado OK — Dashboard comercial {timestamp}")
except urllib.error.HTTPError as e:
    print(f"Error HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
    sys.exit(1)
