import base64, json, os, sys, urllib.request, urllib.error

token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
repo  = os.environ.get("GITHUB_REPOSITORY", "eduardoxyz22-maker/MULTIESPUMAS")

if not token:
    print("Error: GH_TOKEN no definido", file=sys.stderr)
    sys.exit(1)

FILE = "dashboard-template.html"
api  = f"https://api.github.com/repos/{repo}/contents/{FILE}"
hdrs = {"Authorization": f"token {token}", "Content-Type": "application/json"}

sha = None
try:
    req = urllib.request.Request(api, headers=hdrs)
    with urllib.request.urlopen(req) as r:
        sha = json.load(r)["sha"]
    print("Template ya existe en main, omitiendo push.")
    sys.exit(0)
except urllib.error.HTTPError:
    pass

with open(FILE, "rb") as f:
    content = base64.b64encode(f.read()).decode()

payload = {"message": "Agregar dashboard-template.html a main", "content": content}

req = urllib.request.Request(api, data=json.dumps(payload).encode(), method="PUT", headers=hdrs)
try:
    with urllib.request.urlopen(req) as r:
        print("dashboard-template.html publicado en main OK")
except urllib.error.HTTPError as e:
    print(f"Error HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
    sys.exit(1)
