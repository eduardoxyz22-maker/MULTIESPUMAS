"""publish_atc.py — commit reporte-semanal-atc.html via GitHub API"""
import os, base64, json, urllib.request, urllib.parse

TOKEN = os.environ["GH_TOKEN"]
REPO  = os.environ["GITHUB_REPOSITORY"]
FILE  = "reporte-semanal-atc.html"
API   = f"https://api.github.com/repos/{REPO}/contents/{FILE}"

with open(FILE, "rb") as f:
    content = base64.b64encode(f.read()).decode()

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
}

# get current sha
sha = None
try:
    req = urllib.request.Request(API, headers=headers)
    with urllib.request.urlopen(req) as r:
        sha = json.loads(r.read())["sha"]
except Exception:
    pass

import datetime
fecha = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
body = {"message": f"Reporte Semanal ATC {fecha}", "content": content, "branch": "main"}
if sha:
    body["sha"] = sha

req = urllib.request.Request(API, data=json.dumps(body).encode(),
                              headers=headers, method="PUT")
with urllib.request.urlopen(req) as r:
    print(f"Publicado: {json.loads(r.read())['content']['html_url']}")
