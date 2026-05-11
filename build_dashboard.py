#!/usr/bin/env python3
"""
Heaven Colchones — Generador de dashboard Kommo CRM
Genera index.html con datos del mes actual.
"""

import json, os, time, urllib.request, urllib.error
from datetime import datetime, timezone
from collections import defaultdict
import calendar

# ── CONFIG ────────────────────────────────────────────────────────────────────
SUBDOMAIN = "eanez"
TOKEN     = os.environ.get("KOMMO_TOKEN", (
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjAyOTNmMTI5MWQ5YzVlOTVm"
    "ODdiYTZhNDFlMjVjYmQ0YTY5NzllM2ZjYmNjYjQyZTY2ZTgxZDIxMTJmNTI4ZWUxNGFh"
    "ZDJhNDQ0OGFhMWZhIn0.eyJhdWQiOiJhYmQ5OThhNi0wMjcwLTRkODAtYjE5Ni0xMmRm"
    "OTE3ZjQxYzciLCJqdGkiOiIwMjkzZjEyOTFkOWM1ZTk1Zjg3YmE2YTQxZTI1Y2JkNGE2"
    "OTc5ZTNmY2JjY2I0MmU2NmU4MWQyMTEyZjUyOGVlMTRhYWQyYTQ0NDhhYTFmYSIsImlh"
    "dCI6MTc3ODA0MDczNCwibmJmIjoxNzc4MDQwNzM0LCJleHAiOjE3OTg1ODg4MDAsInN1"
    "YiI6IjE0OTYyMjcxIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2MjEyNjIz"
    "LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJw"
    "dXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5v"
    "dGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiODZmZmE4NzQtNDQ0My00ZjcyLWFjZmQt"
    "ZWM3MDg5YTVjZjRmIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.n5PGBBm"
    "LgdOndg-M2oy2bRDtGx1MeO39vkVXW7Tq-wlBkQ2ts1wGJArctkigI-JRXYcyraRprfF"
    "Y3jAkDRYTAqIwrXuhW6N14DRTZJQ7xVsXjqYfJp_xeaAziDKlyX_aSymVb7xzdioDAHR"
    "w04OqX7lkDtioGJPqQUO5TdEanLdCihudNXqVhNv7XbtaUABolI28wZ7PamQ8BYqSI6js"
    "AJZHYn9MroTQcbrDrbBjtL3-WTl2H9yPnmikHykS47PUIaX-BWMCXuT2f9RgOpPQiShYo"
    "0tzxP8N9jji3qMKtIlgK72BG8M2ouz8g0aLxqWE1Sk3wE1_9fp_iENV7FcV4Q"
))
BASE = f"https://{SUBDOMAIN}.kommo.com/api/v4"
HDR  = {"Authorization": f"Bearer {TOKEN}", "User-Agent": "HeavenDashboard/2.0"}

# ── API ───────────────────────────────────────────────────────────────────────
def get(path, params=""):
    url = f"{BASE}{path}" + (f"?{params}" if params else "")
    req = urllib.request.Request(url, headers=HDR)
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())

def fetch_leads_month():
    now   = datetime.now(timezone.utc)
    start = int(datetime(now.year, now.month, 1, tzinfo=timezone.utc).timestamp())
    leads, page = [], 1
    while True:
        print(f"  leads page {page}…")
        data = get("/leads", f"limit=250&with=contacts&page={page}"
                   f"&filter[created_at][from]={start}")
        batch = data.get("_embedded", {}).get("leads", [])
        leads.extend(batch)
        if "next" not in data.get("_links", {}):
            break
        page += 1
        time.sleep(0.25)
    return leads

# ── FETCH ─────────────────────────────────────────────────────────────────────
print("Llamando a Kommo API…")
print("  1/3 pipelines…")
pipelines = get("/leads/pipelines").get("_embedded", {}).get("pipelines", [])
print("  2/3 users…")
users_raw = get("/users").get("_embedded", {}).get("users", [])
print("  3/3 leads del mes…")
raw_leads = fetch_leads_month()
print(f"  → {len(raw_leads)} leads")

# ── MAPS ──────────────────────────────────────────────────────────────────────
user_map  = {u["id"]: u["name"] for u in users_raw}
stage_map = {}   # id → {name, order, is_won, is_lost}
for pipe in pipelines:
    for st in pipe.get("_embedded", {}).get("statuses", []):
        stage_map[st["id"]] = {
            "name":    st["name"],
            "order":   st.get("sort", 0),
            "is_won":  st.get("type") == 142,
            "is_lost": st.get("type") == 143,
        }

NOW_TS = int(time.time())

def days_ago(ts):
    return max(0.0, (NOW_TS - (ts or NOW_TS)) / 86400)

def sucursal_from(lead):
    tags = [t["name"] for t in (lead.get("_embedded") or {}).get("tags") or []]
    if tags:
        return tags[0]
    for cf in (lead.get("custom_fields_values") or []):
        fn = (cf.get("field_name") or "").lower()
        if any(w in fn for w in ("sucursal", "tienda", "store", "plaza")):
            vals = cf.get("values") or []
            if vals:
                return vals[0].get("value", "—")
    return "—"

# ── PROCESS ───────────────────────────────────────────────────────────────────
now   = datetime.now(timezone.utc)
MONTH_LABEL_ES = {1:"Ene",2:"Feb",3:"Mar",4:"Abr",5:"May",6:"Jun",
                  7:"Jul",8:"Ago",9:"Sep",10:"Oct",11:"Nov",12:"Dic"}
MONTH_FULL_ES  = {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",
                  6:"Junio",7:"Julio",8:"Agosto",9:"Septiembre",
                  10:"Octubre",11:"Noviembre",12:"Diciembre"}
mes_label = f"{MONTH_FULL_ES[now.month]} {now.year}"
mes_short = f"{MONTH_LABEL_ES[now.month]} {now.year}"

deals = []
for lead in raw_leads:
    sid    = lead.get("status_id")
    sinfo  = stage_map.get(sid, {"name":"Desconocida","order":0,"is_won":False,"is_lost":False})
    upd    = lead.get("updated_at") or lead.get("created_at", NOW_TS)
    crea   = lead.get("created_at", NOW_TS)
    days   = days_ago(upd)
    conts  = (lead.get("_embedded") or {}).get("contacts") or []
    contact = conts[0].get("name", "") if conts else ""
    resp_id = lead.get("responsible_user_id")
    deals.append({
        "id":       lead["id"],
        "name":     lead.get("name") or f"Lead #{lead['id']}",
        "contact":  contact,
        "stage":    sinfo["name"],
        "stage_id": sid,
        "is_won":   sinfo["is_won"],
        "is_lost":  sinfo["is_lost"],
        "days":     round(days, 1),
        "days_int": int(days),
        "value":    lead.get("price") or 0,
        "user":     user_map.get(resp_id, f"ID {resp_id}"),
        "sucursal": sucursal_from(lead),
        "created":  datetime.fromtimestamp(crea, timezone.utc).strftime("%d/%m"),
    })

# ── METRICS ───────────────────────────────────────────────────────────────────
CALIF_STAGES  = {"Cotizacion enviada","Agendado / Visita","Compradores"}
NO_RESP_STAGE = "No Responden"

total        = len(deals)
compradores  = sum(1 for d in deals if d["stage"] == "Compradores" or d["is_won"])
no_resp_n    = sum(1 for d in deals if d["stage"] == NO_RESP_STAGE)
calificados  = sum(1 for d in deals if d["stage"] in CALIF_STAGES)
stag_7_14    = sum(1 for d in deals if 7 <= d["days_int"] < 15)
stag_14      = sum(1 for d in deals if d["days_int"] >= 15)
stag_any     = stag_7_14 + stag_14
valor_total  = sum(d["value"] for d in deals)
ticket_avg   = valor_total // max(compradores, 1)
conv_pct     = round(compradores / max(total, 1) * 100, 1)
noresp_pct   = round(no_resp_n   / max(total, 1) * 100, 1)
calif_pct    = round(calificados / max(total, 1) * 100, 1)
stag_pct     = round(stag_any   / max(total, 1) * 100, 1)

def fmt_val(v):
    if v == 0:
        return "—"
    s = f"{v:,.0f}".replace(",", ".")
    return f"${s}"

# ── STAGES SUMMARY ────────────────────────────────────────────────────────────
stage_acc = defaultdict(lambda: {"count": 0, "value": 0, "order": 0})
for d in deals:
    sid = d["stage_id"]
    stage_acc[d["stage"]]["count"] += 1
    stage_acc[d["stage"]]["value"] += d["value"]
    stage_acc[d["stage"]]["order"] = stage_map.get(sid, {}).get("order", 0)

stages_list = sorted(
    [{"name": k, **v, "pct": round(v["count"] / max(total, 1) * 100, 1)}
     for k, v in stage_acc.items()],
    key=lambda x: x["order"]
)

# ── VENDOR KPIs ───────────────────────────────────────────────────────────────
vend = defaultdict(lambda: {
    "total": 0, "value": 0, "stagnant": 0,
    "compradores": 0, "no_resp": 0, "calificados": 0,
    "stages": defaultdict(int),
})
for d in deals:
    u = d["user"]
    vend[u]["total"]  += 1
    vend[u]["value"]  += d["value"]
    vend[u]["stages"][d["stage"]] += 1
    if d["stage"] == "Compradores" or d["is_won"]:
        vend[u]["compradores"] += 1
    if d["stage"] == NO_RESP_STAGE:
        vend[u]["no_resp"] += 1
    if d["stage"] in CALIF_STAGES:
        vend[u]["calificados"] += 1
    if d["days_int"] >= 7:
        vend[u]["stagnant"] += 1

ETAPAS_ORDER = ["Nueva consulta","Interesado","Cotizacion enviada",
                "Agendado / Visita","Compradores","No Responden"]

vendors_list = []
for name, v in vend.items():
    t = max(v["total"], 1)
    c = max(v["compradores"], 1)
    vendors_list.append({
        "name":     name,
        "total":    v["total"],
        "value":    v["value"],
        "stagnant": v["stagnant"],
        "stages": [
            {"stage": e, "count": v["stages"].get(e, 0)}
            for e in ETAPAS_ORDER
        ],
        "kpis": {
            "conv_pct":     round(v["compradores"] / t * 100, 1),
            "no_resp_pct":  round(v["no_resp"]     / t * 100, 1),
            "calif_pct":    round(v["calificados"] / t * 100, 1),
            "avanz_pct":    round(sum(v["stages"].get(e, 0) for e in
                                      {"Agendado / Visita","Compradores"}) / t * 100, 1),
            "stagnant_pct": round(v["stagnant"] / t * 100, 1),
            "ticket_avg":   v["value"] // c,
            "compradores":  v["compradores"],
            "no_resp":      v["no_resp"],
            "calificados":  v["calificados"],
        },
    })
vendors_list.sort(key=lambda x: x["kpis"]["conv_pct"], reverse=True)

# ── FILTER OPTS ───────────────────────────────────────────────────────────────
stg_opts = sorted(set(d["stage"]    for d in deals))
usr_opts = sorted(set(d["user"]     for d in deals))
suc_opts = sorted(set(d["sucursal"] for d in deals))

# ── DATE ──────────────────────────────────────────────────────────────────────
gen_date = datetime.now().strftime("%d/%m/%Y %H:%M")

# ── JSON BLOBS ────────────────────────────────────────────────────────────────
all_rows_json  = json.dumps(deals,          ensure_ascii=False, separators=(",",":"))
stages_json    = json.dumps(stages_list,    ensure_ascii=False, separators=(",",":"))
suc_opts_json  = json.dumps(suc_opts,       ensure_ascii=False, separators=(",",":"))
usr_opts_json  = json.dumps(usr_opts,       ensure_ascii=False, separators=(",",":"))
stg_opts_json  = json.dumps(stg_opts,       ensure_ascii=False, separators=(",",":"))
vendors_json   = json.dumps(vendors_list,   ensure_ascii=False, separators=(",",":"))
etapas_json    = json.dumps(ETAPAS_ORDER,   ensure_ascii=False, separators=(",",":"))

# ── HTML ──────────────────────────────────────────────────────────────────────
HTML = f"""<!DOCTYPE html>
<html lang=\"es\">
<head>
<meta charset=\"UTF-8\">
<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">
<title>Pipeline {mes_short} &ndash; Colchones Heaven</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --teal:#00B5AD;--teal-dk:#008F88;--teal-lt:#E6F7F6;--teal-mid:#00A09A;
  --gray:#808080;--gray-lt:#F5F6F7;--gray-md:#E2E2E2;
  --red:#CE2939;--red-lt:#FDEAEC;
  --amber:#D97706;--amber-lt:#FEF3E2;
  --black:#1A1A1A;--white:#FFFFFF;--text:#2D2D2D;--muted:#6B6B6B;
}}
body{{background:var(--gray-lt);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh}}
.header{{background:var(--teal);padding:0 36px;display:flex;justify-content:space-between;align-items:stretch;box-shadow:0 3px 16px rgba(0,181,173,.35)}}
.hl{{display:flex;align-items:center;gap:0;padding:16px 0}}
.logo{{border-right:1px solid rgba(255,255,255,.3);padding-right:24px;margin-right:24px}}
.logo-h{{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:.14em;line-height:1}}
.logo-s{{font-size:.68rem;color:rgba(255,255,255,.8);letter-spacing:.04em;margin-top:1px}}
.htitle h1{{font-size:.98rem;font-weight:600;color:#fff;letter-spacing:.01em}}
.htitle p{{font-size:.7rem;color:rgba(255,255,255,.7);margin-top:3px}}
.hr{{display:flex;align-items:center;gap:0;padding:16px 0;border-left:1px solid rgba(255,255,255,.25);margin-left:auto}}
.hstat{{text-align:center;padding:0 24px;border-right:1px solid rgba(255,255,255,.2)}}
.hstat:last-child{{border-right:none}}
.hstat-v{{font-size:1.5rem;font-weight:800;color:#fff;line-height:1}}
.hstat-l{{font-size:.62rem;color:rgba(255,255,255,.7);margin-top:3px;text-transform:uppercase;letter-spacing:.06em}}
.container{{padding:26px 36px;max-width:1500px;margin:0 auto}}
.metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}}
.mc{{background:#fff;border-radius:12px;padding:20px 22px;border:1px solid var(--gray-md);position:relative;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.mc-bar{{position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:12px 0 0 12px}}
.mc.c-teal .mc-bar{{background:var(--teal)}} .mc.c-gray .mc-bar{{background:var(--gray)}}
.mc.c-amber .mc-bar{{background:var(--amber)}} .mc.c-red .mc-bar{{background:var(--red)}}
.mc-lbl{{font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}}
.mc-val{{font-size:2rem;font-weight:800;line-height:1}}
.mc.c-teal .mc-val{{color:var(--teal)}} .mc.c-gray .mc-val{{color:var(--gray)}}
.mc.c-amber .mc-val{{color:var(--amber)}} .mc.c-red .mc-val{{color:var(--red)}}
.mc-sub{{font-size:.68rem;color:var(--muted);margin-top:5px}}
.sec{{font-size:.68rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;display:flex;align-items:center;gap:10px}}
.sec::after{{content:'';flex:1;height:1px;background:var(--gray-md)}}
.funnel{{display:flex;border-radius:10px;overflow:hidden;border:1px solid var(--gray-md);height:40px;margin-bottom:26px;box-shadow:0 1px 4px rgba(0,0,0,.06)}}
.fs{{flex:1;display:flex;align-items:center;justify-content:center;font-size:.63rem;font-weight:700;color:#fff;cursor:default;transition:opacity .15s}}
.fs:hover{{opacity:.82}}
.sg{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px;margin-bottom:26px}}
.sc{{background:#fff;border:1px solid var(--gray-md);border-radius:10px;padding:15px 17px 13px;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)}}
.sc-bar{{position:absolute;top:0;left:0;right:0;height:4px}}
.sc-nm{{font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}}
.sc-n{{font-size:1.75rem;font-weight:800;color:var(--black);line-height:1}}
.sc-d{{font-size:.68rem;color:var(--muted);margin-top:4px}}
.alert{{background:var(--red-lt);border:1px solid #F5C0C5;border-left:4px solid var(--red);border-radius:8px;padding:13px 18px;margin-bottom:22px;display:flex;align-items:center;gap:12px;font-size:.82rem;color:#8B0012}}
.alert span{{font-size:1.2rem}} .alert b{{color:var(--red);font-weight:700}}
.tab-row{{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px}}
.tabs{{display:flex;border:1px solid var(--gray-md);border-radius:8px;overflow:hidden;background:#fff}}
.tab{{padding:7px 20px;font-size:.76rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--muted);transition:all .15s;font-family:inherit}}
.tab.active{{background:var(--teal);color:#fff}}
.tab:hover:not(.active){{background:var(--teal-lt);color:var(--teal-dk)}}
.controls{{display:flex;gap:9px;margin-bottom:13px;flex-wrap:wrap;align-items:center}}
.controls select,.controls input{{background:#fff;border:1px solid var(--gray-md);color:var(--text);border-radius:8px;padding:7px 11px;font-size:.76rem;outline:none;font-family:inherit;cursor:pointer}}
.controls select:focus,.controls input:focus{{border-color:var(--teal);box-shadow:0 0 0 3px rgba(0,181,173,.12)}}
.rc{{font-size:.72rem;color:var(--muted)}}
.tw{{background:#fff;border:1px solid var(--gray-md);border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.ts{{max-height:530px;overflow-y:auto}}
.ts::-webkit-scrollbar{{width:5px}} .ts::-webkit-scrollbar-track{{background:var(--gray-lt)}}
.ts::-webkit-scrollbar-thumb{{background:var(--teal);border-radius:3px}}
table{{width:100%;border-collapse:collapse;font-size:.79rem}}
thead th{{background:var(--black);color:rgba(255,255,255,.75);padding:10px 13px;text-align:left;font-weight:600;font-size:.67rem;text-transform:uppercase;letter-spacing:.07em;border-bottom:3px solid var(--teal)}}
tbody tr{{border-bottom:1px solid var(--gray-lt);transition:background .12s}}
tbody tr:hover{{background:var(--teal-lt)}}
tbody td{{padding:9px 13px;color:var(--text);vertical-align:middle}}
.badge{{display:inline-block;padding:3px 9px;border-radius:20px;font-size:.66rem;font-weight:700}}
.b-red{{background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5}}
.b-amber{{background:var(--amber-lt);color:var(--amber);border:1px solid #FCD34D}}
.b-teal{{background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9}}
.b-gray{{background:var(--gray-lt);color:var(--gray);border:1px solid var(--gray-md)}}
a{{color:var(--teal-dk);text-decoration:none;font-weight:500}}
a:hover{{text-decoration:underline;color:var(--teal)}}
.nd{{text-align:center;padding:38px;color:var(--muted);font-size:.82rem}}
.team-kpis{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:26px}}
.tk{{background:#fff;border:1px solid var(--gray-md);border-radius:10px;padding:14px 16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05);position:relative;overflow:hidden}}
.tk::before{{content:'';position:absolute;top:0;left:0;right:0;height:3px}}
.tk.c-teal::before{{background:var(--teal)}} .tk.c-red::before{{background:var(--red)}}
.tk.c-amber::before{{background:var(--amber)}} .tk.c-gray::before{{background:var(--gray)}}
.tk.c-purple::before{{background:#7C3AED}}
.tk-val{{font-size:1.6rem;font-weight:800;line-height:1;margin-bottom:4px}}
.tk.c-teal .tk-val{{color:var(--teal)}} .tk.c-red .tk-val{{color:var(--red)}}
.tk.c-amber .tk-val{{color:var(--amber)}} .tk.c-gray .tk-val{{color:var(--gray)}}
.tk.c-purple .tk-val{{color:#7C3AED}}
.tk-lbl{{font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}}
.tk-sub{{font-size:.62rem;color:var(--muted);margin-top:3px}}
.vg{{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;margin-bottom:26px}}
.vc{{background:#fff;border:1px solid var(--gray-md);border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.vc-head{{background:var(--black);padding:13px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid var(--teal)}}
.vc-name{{font-size:.9rem;font-weight:700;color:#fff}}
.vc-total{{font-size:1.5rem;font-weight:800;color:var(--teal);line-height:1}}
.vc-total-lbl{{font-size:.58rem;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;text-align:right}}
.vc-kpis{{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:2px solid var(--gray-lt)}}
.vk{{padding:9px 8px;text-align:center;border-right:1px solid var(--gray-lt);position:relative}}
.vk:last-child{{border-right:none}}
.vk-val{{font-size:1.05rem;font-weight:800;line-height:1}}
.vk-lbl{{font-size:.58rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}}
.vk-hint{{font-size:.58rem;color:var(--muted);margin-top:1px}}
.vk.good .vk-val{{color:var(--teal)}} .vk.warn .vk-val{{color:var(--amber)}}
.vk.bad .vk-val{{color:var(--red)}} .vk.neu .vk-val{{color:var(--gray)}}
.vc-kpis2{{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--gray-lt);background:var(--gray-lt)}}
.vk2{{padding:7px 8px;text-align:center;border-right:1px solid var(--gray-md)}}
.vk2:last-child{{border-right:none}}
.vk2-val{{font-size:.88rem;font-weight:700;color:var(--black);line-height:1}}
.vk2-lbl{{font-size:.57rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}}
.vc-rows{{padding:8px 0}}
.vc-row{{display:flex;align-items:center;padding:5px 16px;transition:background .12s;gap:8px}}
.vc-row:hover{{background:var(--teal-lt)}}
.vc-dot{{width:8px;height:8px;border-radius:50%;flex-shrink:0}}
.vc-sname{{font-size:.75rem;color:var(--text);flex:1}}
.vc-bwrap{{width:80px;height:5px;background:var(--gray-lt);border-radius:3px;overflow:hidden}}
.vc-bfill{{height:100%;border-radius:3px}}
.vc-cnt{{font-size:.78rem;font-weight:700;color:var(--black);min-width:22px;text-align:right}}
.vc-pct{{font-size:.65rem;color:var(--muted);min-width:32px;text-align:right}}
.footer{{text-align:center;padding:18px;font-size:.68rem;color:var(--muted);border-top:1px solid var(--gray-md);background:#fff;margin-top:28px}}
</style>
</head>
<body>

<div class=\"header\">
  <div class=\"hl\">
    <div class=\"logo\">
      <div class=\"logo-h\">HEAVEN</div>
      <div class=\"logo-s\">colchones &#10011;</div>
    </div>
    <div class=\"htitle\">
      <h1>Pipeline de Ventas &mdash; {mes_label}</h1>
      <p>Generado: {gen_date} &nbsp;&bull;&nbsp; Actualizacion diaria 11:00 AM</p>
    </div>
  </div>
  <div class=\"hr\">
    <div class=\"hstat\"><div class=\"hstat-v\">{total}</div><div class=\"hstat-l\">Leads del mes</div></div>
    <div class=\"hstat\"><div class=\"hstat-v\">{fmt_val(valor_total)}</div><div class=\"hstat-l\">Valor total</div></div>
    <div class=\"hstat\"><div class=\"hstat-v\">{stag_any}</div><div class=\"hstat-l\">Estancados</div></div>
  </div>
</div>

<div class=\"container\">

  <div class=\"metrics\">
    <div class=\"mc c-teal\"><div class=\"mc-bar\"></div>
      <div class=\"mc-lbl\">Leads del Mes</div>
      <div class=\"mc-val\">{total}</div>
      <div class=\"mc-sub\">creados en {mes_label}</div>
    </div>
    <div class=\"mc c-gray\"><div class=\"mc-bar\"></div>
      <div class=\"mc-lbl\">Valor Total Pipeline</div>
      <div class=\"mc-val\">{fmt_val(valor_total)}</div>
      <div class=\"mc-sub\">deals con valor asignado</div>
    </div>
    <div class=\"mc c-amber\"><div class=\"mc-bar\"></div>
      <div class=\"mc-lbl\">Estancados 7-14 dias</div>
      <div class=\"mc-val\">{stag_7_14}</div>
      <div class=\"mc-sub\">sin actividad reciente</div>
    </div>
    <div class=\"mc c-red\"><div class=\"mc-bar\"></div>
      <div class=\"mc-lbl\">Estancados +14 dias</div>
      <div class=\"mc-val\">{stag_14}</div>
      <div class=\"mc-sub\">atencion urgente</div>
    </div>
  </div>

  <div class=\"sec\">Embudo del Mes</div>
  <div id=\"funnel\" class=\"funnel\"></div>
  <div class=\"sg\" id=\"stages-grid\"></div>

  <div class=\"alert\"><span>&#9888;</span><div><b>{stag_any} deals ({stag_pct}%)</b> llevan mas de 7 dias sin actividad &mdash; <b>{stag_14}</b> superan los 14 dias.</div></div>

  <div class=\"sec\">KPIs del Equipo &mdash; {mes_label}</div>
  <div class=\"team-kpis\">
    <div class=\"tk c-teal\">
      <div class=\"tk-val\">{conv_pct}%</div>
      <div class=\"tk-lbl\">Tasa de Conversion</div>
      <div class=\"tk-sub\">{compradores} compradores / {total} leads</div>
    </div>
    <div class=\"tk c-red\">
      <div class=\"tk-val\">{noresp_pct}%</div>
      <div class=\"tk-lbl\">Sin Respuesta del Cliente</div>
      <div class=\"tk-sub\">{no_resp_n} el cliente no responde</div>
    </div>
    <div class=\"tk c-amber\">
      <div class=\"tk-val\">{calif_pct}%</div>
      <div class=\"tk-lbl\">Leads Calificados</div>
      <div class=\"tk-sub\">{calificados} en etapas avanzadas</div>
    </div>
    <div class=\"tk c-purple\">
      <div class=\"tk-val\">{fmt_val(ticket_avg)}</div>
      <div class=\"tk-lbl\">Ticket Promedio</div>
      <div class=\"tk-sub\">valor / compradores cerrados</div>
    </div>
    <div class=\"tk c-gray\">
      <div class=\"tk-val\">{stag_pct}%</div>
      <div class=\"tk-lbl\">Estancados</div>
      <div class=\"tk-sub\">{stag_any} sin actividad &gt;7d</div>
    </div>
  </div>

  <div class=\"sec\">Rendimiento por Vendedora</div>
  <div class=\"vg\" id=\"vendors-grid\"></div>

  <div class=\"tab-row\">
    <div class=\"sec\" style=\"margin:0;flex:1\">Todos los Deals del Mes</div>
    <div class=\"tabs\">
      <button class=\"tab active\" onclick=\"setView('all')\">Todos ({total})</button>
      <button class=\"tab\" onclick=\"setView('stagnant')\">Estancados ({stag_any})</button>
    </div>
  </div>

  <div class=\"controls\">
    <select id=\"f-stage\"  onchange=\"render()\"><option value=\"\">Todas las etapas</option></select>
    <select id=\"f-user\"   onchange=\"render()\"><option value=\"\">Todos los responsables</option></select>
    <select id=\"f-suc\"    onchange=\"render()\"><option value=\"\">Todas las sucursales</option></select>
    <input  id=\"f-days\"   type=\"number\" placeholder=\"Dias min. estancado\" oninput=\"render()\" style=\"width:190px\">
    <span   id=\"rc\"       class=\"rc\"></span>
  </div>

  <div class=\"tw\"><div class=\"ts\">
    <table>
      <thead><tr>
        <th>#</th><th>Contacto / Deal</th><th>Etapa</th><th>Sucursal</th>
        <th>Responsable</th><th>Creado</th><th>Dias sin act.</th><th>Valor</th><th>Estado</th>
      </tr></thead>
      <tbody id=\"tbl\"></tbody>
    </table>
  </div></div>

</div>

<div class=\"footer\">HEAVEN Colchones &nbsp;&bull;&nbsp; Pipeline {mes_label} &nbsp;&bull;&nbsp; {SUBDOMAIN}.kommo.com &nbsp;&bull;&nbsp; {gen_date}</div>

<script>
const allRows={all_rows_json};
const stages={stages_json};
const sucOpts={suc_opts_json};
const usrOpts={usr_opts_json};
const stgOpts={stg_opts_json};
const vendors={vendors_json};
const etapas={etapas_json};
const SC={{'Incoming leads':'#9CA3AF','Nueva consulta':'#00B5AD','Interesado':'#D97706','Cotizacion enviada':'#3B9ECB','Agendado / Visita':'#22A06B','Compradores':'#7C3AED','No Responden':'#CE2939'}};

function kpiClass(val,g,w){{return val>=g?'good':val>=w?'warn':'bad'}}
function kpiClassInv(val,b,w){{return val<=w?'good':val<=b?'warn':'bad'}}

const vg=document.getElementById('vendors-grid');
vendors.forEach(v=>{{
  const k=v.kpis;
  const maxStage=Math.max(...v.stages.map(s=>s.count),1);
  const val=v.value>0?'$'+v.value.toLocaleString('es-AR'):'—';
  const ticket=k.ticket_avg>0?'$'+k.ticket_avg.toLocaleString('es-AR'):'—';
  const stageRows=v.stages.filter(s=>s.count>0).map(s=>{{
    const pct=Math.round(s.count/v.total*100);
    const w=Math.round(s.count/maxStage*100);
    return `<div class=\"vc-row\">
      <div class=\"vc-dot\" style=\"background:${{SC[s.stage]||'#808080'}}\"></div>
      <div class=\"vc-sname\">${{s.stage}}</div>
      <div class=\"vc-bwrap\"><div class=\"vc-bfill\" style=\"background:${{SC[s.stage]||'#808080'}};width:${{w}}%\"></div></div>
      <div class=\"vc-cnt\">${{s.count}}</div>
      <div class=\"vc-pct\">${{pct}}%</div>
    </div>`;
  }}).join('');
  vg.innerHTML+=`<div class=\"vc\">
    <div class=\"vc-head\">
      <div class=\"vc-name\">${{v.name}}</div>
      <div><div class=\"vc-total\">${{v.total}}</div><div class=\"vc-total-lbl\">leads del mes</div></div>
    </div>
    <div class=\"vc-kpis\">
      <div class=\"vk ${{kpiClass(k.conv_pct,5,2)}}\">
        <div class=\"vk-val\">${{k.conv_pct}}%</div>
        <div class=\"vk-lbl\">Conversion</div>
        <div class=\"vk-hint\">${{k.compradores}} compradores</div>
      </div>
      <div class=\"vk ${{kpiClassInv(k.no_resp_pct,30,15)}}\">
        <div class=\"vk-val\">${{k.no_resp_pct}}%</div>
        <div class=\"vk-lbl\">Sin Respuesta del Cliente</div>
        <div class=\"vk-hint\">${{k.no_resp}} clientes no responden</div>
      </div>
      <div class=\"vk ${{kpiClass(k.calif_pct,40,20)}}\">
        <div class=\"vk-val\">${{k.calif_pct}}%</div>
        <div class=\"vk-lbl\">Calificados</div>
        <div class=\"vk-hint\">${{k.calificados}} en embudo</div>
      </div>
    </div>
    <div class=\"vc-kpis2\">
      <div class=\"vk2\"><div class=\"vk2-val\">${{ticket}}</div><div class=\"vk2-lbl\">Ticket promedio</div></div>
      <div class=\"vk2\"><div class=\"vk2-val\" style=\"color:${{k.stagnant_pct>20?'var(--red)':k.stagnant_pct>10?'var(--amber)':'var(--teal)}}\">${{k.stagnant_pct}}%</div><div class=\"vk2-lbl\">% Estancados</div></div>
      <div class=\"vk2\"><div class=\"vk2-val\">${{val}}</div><div class=\"vk2-lbl\">Valor total</div></div>
    </div>
    <div class=\"vc-rows\">${{stageRows||'<div style=\"padding:12px 16px;font-size:.74rem;color:var(--muted)\">Sin leads en etapas activas</div>'}}</div>
  </div>`;
}});

const fEl=document.getElementById('funnel');
stages.forEach(s=>{{const g=document.createElement('div');g.className='fs';g.style.background=SC[s.name]||'#808080';g.style.flex=Math.max(s.count,1);g.title=s.name+': '+s.count+' deals';if(s.count>5)g.textContent=s.count;fEl.appendChild(g);}});

const grid=document.getElementById('stages-grid');
stages.forEach(s=>{{const c=SC[s.name]||'#808080';const v=s.value>0?'$'+s.value.toLocaleString('es-AR'):'—';grid.innerHTML+=`<div class=\"sc\"><div class=\"sc-bar\" style=\"background:${{c}}\"></div><div class=\"sc-nm\">${{s.name}}</div><div class=\"sc-n\">${{s.count}}</div><div class=\"sc-d\">${{v}} &middot; ${{s.pct}}%</div></div>`;}});

stgOpts.forEach(v=>document.getElementById('f-stage').innerHTML+=`<option>${{v}}</option>`);
usrOpts.forEach(v=>document.getElementById('f-user').innerHTML+=`<option>${{v}}</option>`);
sucOpts.forEach(v=>document.getElementById('f-suc').innerHTML+=`<option>${{v}}</option>`);

let view='all';
function setView(v){{view=v;document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(i===0&&v==='all')||(i===1&&v==='stagnant')));document.getElementById('f-days').value=v==='stagnant'?7:'';render();}}

function render(){{
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const suc=document.getElementById('f-suc').value;
  const minD=parseFloat(document.getElementById('f-days').value)||(view==='stagnant'?7:0);
  const f=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc));
  document.getElementById('rc').textContent=f.length+' deals';
  const tbody=document.getElementById('tbl');
  if(!f.length){{tbody.innerHTML='<tr><td colspan=\"9\" class=\"nd\">Sin deals con estos filtros</td></tr>';return;}}
  tbody.innerHTML=f.map((r,i)=>{{
    const c=SC[r.stage]||'#808080';
    const badge=r.days_int>14?'<span class=\"badge b-red\">+14 dias</span>':r.days_int>=7?'<span class=\"badge b-amber\">7-14 dias</span>':'<span class=\"badge b-teal\">Al dia</span>';
    const dc=r.days_int>14?'var(--red)':r.days_int>=7?'var(--amber)':'var(--teal)';
    const val=r.value>0?'$'+r.value.toLocaleString('es-AR'):'—';
    const nm=r.contact||r.name;
    return `<tr><td style=\"color:var(--muted);width:36px\">${{i+1}}</td><td><a href=\"https://{SUBDOMAIN}.kommo.com/leads/detail/${{r.id}}\" target=\"_blank\">${{nm}}</a>${{r.contact?'<br><span style=\"font-size:.66rem;color:var(--muted)\">#'+r.id+'</span>':''}}</td><td><span style=\"color:${{c}};font-weight:700\">${{r.stage}}</span></td><td style=\"color:var(--muted)\">${{r.sucursal||'—'}}</td><td style=\"color:var(--muted);font-size:.75rem\">${{r.user}}</td><td style=\"color:var(--muted)\">${{r.created}}</td><td style=\"font-weight:800;color:${{dc}}\">${{r.days_int}}d</td><td style=\"color:var(--teal-dk);font-weight:600\">${{val}}</td><td>${{badge}}</td></tr>`;
  }}).join('');
}}
render();
</script>
</body>
</html>"""

with open("index.html", "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"✅ index.html generado: {total} leads, {mes_label}, {gen_date}")
