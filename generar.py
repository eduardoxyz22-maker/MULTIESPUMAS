import urllib.request
import urllib.parse
import json
import time
import datetime
import calendar
from collections import defaultdict

TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjAyOTNmMTI5MWQ5YzVlOTVmODdiYTZhNDFlMjVjYmQ0YTY5NzllM2ZjYmNjYjQyZTY2ZTgxZDIxMTJmNTI4ZWUxNGFhZDJhNDQ0OGFhMWZhIn0.eyJhdWQiOiJhYmQ5OThhNi0wMjcwLTRkODAtYjE5Ni0xMmRmOTE3ZjQxYzciLCJqdGkiOiIwMjkzZjEyOTFkOWM1ZTk1Zjg3YmE2YTQxZTI1Y2JkNGE2OTc5ZTNmY2JjY2I0MmU2NmU4MWQyMTEyZjUyOGVlMTRhYWQyYTQ0NDhhYTFmYSIsImlhdCI6MTc3ODA0MDczNCwibmJmIjoxNzc4MDQwNzM0LCJleHAiOjE3OTg1ODg4MDAsInN1YiI6IjE0OTYyMjcxIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2MjEyNjIzLCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiODZmZmE4NzQtNDQ0My00ZjcyLWFjZmQtZWM3MDg5YTVjZjRmIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.n5PGBBmLgdOndg-M2oy2bRDtGx1MeO39vkVXW7Tq-wlBkQ2ts1wGJArctkigI-JRXYcyraRprfFY3jAkDRYTAqIwrXuhW6N14DRTZJQ7xVsXjqYfJp_xeaAziDKlyX_aSymVb7xzdioDAHRw04OqX7lkDtioGJPqQUO5TdEanLdCihudNXqVhNv7XbtaUABolI28wZ7PamQ8BYqSI6jsAJZHYn9MroTQcbrDrbBjtL3-WTl2H9yPnmikHykS47PUIaX-BWMCXuT2f9RgOpPQiShYo0tzxP8N9jji3qMKtIlgK72BG8M2ouz8g0aLxqWE1Sk3wE1_9fp_iENV7FcV4Q"
BASE_URL = "https://eanez.kommo.com/api/v4"
SUBDOMAIN = "eanez"

HEADERS = {
    "Authorization": "Bearer " + TOKEN,
    "Content-Type": "application/json",
}

def api_get(path, params=None):
    url = BASE_URL + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def fetch_all_leads(from_ts, to_ts=None):
    leads = []
    page = 1
    while True:
        params = {
            "limit": 250,
            "page": page,
            "with": "contacts",
            "filter[created_at][from]": from_ts,
        }
        if to_ts:
            params["filter[created_at][to]"] = to_ts
        try:
            data = api_get("/leads", params)
        except Exception:
            break
        embedded = data.get("_embedded", {})
        batch = embedded.get("leads", [])
        if not batch:
            break
        leads.extend(batch)
        links = data.get("_links", {})
        if "next" not in links:
            break
        page += 1
        time.sleep(0.2)
    return leads

def fetch_pipelines():
    data = api_get("/leads/pipelines")
    return data.get("_embedded", {}).get("pipelines", [])

def fetch_users():
    data = api_get("/users")
    return data.get("_embedded", {}).get("users", [])

def fmt_money(v):
    if v <= 0:
        return "$0"
    return "$" + "{:,}".format(int(v)).replace(",", ",")

def fmt_date(ts):
    return datetime.datetime.fromtimestamp(ts).strftime("%d/%m/%Y")

now = time.time()
now_dt = datetime.datetime.now()
mes_label_map = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}
mes_label = mes_label_map[now_dt.month] + " " + str(now_dt.year)
titulo = "Pipeline de Ventas — " + mes_label
fecha_str = now_dt.strftime("%d/%m/%Y %H:%M")

inicio_mes = datetime.datetime(now_dt.year, now_dt.month, 1)
from_ts = int(inicio_mes.timestamp())

print("Obteniendo pipelines...")
pipelines = fetch_pipelines()
stage_map = {}
for pl in pipelines:
    for st in pl.get("_embedded", {}).get("statuses", []):
        stage_map[st["id"]] = st["name"]

print("Obteniendo usuarios...")
users_raw = fetch_users()
user_map = {u["id"]: u.get("name", "Desconocido") for u in users_raw}

print("Obteniendo leads del mes actual...")
leads = fetch_all_leads(from_ts)
print("Total leads:", len(leads))

# Leads del mes anterior (mismo rango de dias)
if now_dt.month == 1:
    prev_month = 12
    prev_year = now_dt.year - 1
else:
    prev_month = now_dt.month - 1
    prev_year = now_dt.year

last_day_prev = calendar.monthrange(prev_year, prev_month)[1]
prev_day = min(now_dt.day, last_day_prev)
inicio_mes_prev = datetime.datetime(prev_year, prev_month, 1)
fin_mes_prev = datetime.datetime(prev_year, prev_month, prev_day, 23, 59, 59)
from_ts_prev = int(inicio_mes_prev.timestamp())
to_ts_prev = int(fin_mes_prev.timestamp())

print("Obteniendo leads del mes anterior...")
leads_prev = fetch_all_leads(from_ts_prev, to_ts_prev)
total_leads_prev = len(leads_prev)
prev_mes_short = mes_label_map[prev_month][:3]
cur_mes_short = mes_label_map[now_dt.month][:3]
dia_hoy = now_dt.day
diff_leads = len(leads) - total_leads_prev
diff_sign = "+" if diff_leads >= 0 else ""
diff_arrow = "&#9650;" if diff_leads > 0 else ("&#9660;" if diff_leads < 0 else "&mdash;")
diff_color = "#7FFFB0" if diff_leads >= 0 else "#FFB3B3"
print("Leads mes anterior:", total_leads_prev)

STAGE_ORDER = [
    "Incoming leads",
    "Nueva consulta",
    "Interesado",
    "Cotizacion enviada",
    "Agendado / Visita",
    "Compradores",
    "No Responden",
]

QUALIFIED_STAGES = {"Cotizacion enviada", "Agendado / Visita", "Compradores"}

stage_counts = defaultdict(int)
stage_values = defaultdict(float)

all_rows = []
vendor_data = defaultdict(lambda: {
    "total": 0,
    "value": 0.0,
    "compradores": 0,
    "no_resp": 0,
    "calificados": 0,
    "stagnant": 0,
    "stages": defaultdict(int),
})

suc_set = set()
usr_set = set()
stg_set = set()

total_value = 0.0
total_compradores = 0
total_no_resp = 0
total_calificados = 0
total_stagnant_7 = 0
total_stagnant_7_14 = 0
total_stagnant_14 = 0

for lead in leads:
    lid = lead.get("id", 0)
    lname = lead.get("name", "Sin nombre")
    status_id = lead.get("status_id")
    stage_name = stage_map.get(status_id, "Desconocido")
    responsible_id = lead.get("responsible_user_id")
    user_name = user_map.get(responsible_id, "Desconocido")
    value = float(lead.get("price", 0) or 0)
    created_at = lead.get("created_at", 0)
    updated_at = lead.get("updated_at", 0)
    days_float = (now - updated_at) / 86400.0
    days_int = int(days_float)
    created_str = fmt_date(created_at) if created_at else "—"

    tags = lead.get("_embedded", {}).get("tags", [])
    sucursal = tags[0]["name"] if tags else "Sin sucursal"

    contacts_emb = lead.get("_embedded", {}).get("contacts", [])
    contact_name = contacts_emb[0].get("name", "") if contacts_emb else ""

    stage_counts[stage_name] += 1
    stage_values[stage_name] += value
    total_value += value

    if stage_name == "Compradores":
        total_compradores += 1
    if stage_name == "No Responden":
        total_no_resp += 1
    if stage_name in QUALIFIED_STAGES:
        total_calificados += 1

    if days_int >= 7:
        total_stagnant_7 += 1
        if days_int >= 14:
            total_stagnant_14 += 1
        else:
            total_stagnant_7_14 += 1

    suc_set.add(sucursal)
    usr_set.add(user_name)
    stg_set.add(stage_name)

    vd = vendor_data[user_name]
    vd["total"] += 1
    vd["value"] += value
    vd["stages"][stage_name] += 1
    if stage_name == "Compradores":
        vd["compradores"] += 1
    if stage_name == "No Responden":
        vd["no_resp"] += 1
    if stage_name in QUALIFIED_STAGES:
        vd["calificados"] += 1
    if days_int >= 7:
        vd["stagnant"] += 1

    all_rows.append({
        "id": lid,
        "name": lname,
        "contact": contact_name,
        "stage": stage_name,
        "sucursal": sucursal,
        "user": user_name,
        "created": created_str,
        "days": round(days_float, 1),
        "days_int": days_int,
        "value": int(value),
    })

total_leads = len(leads)

stages_json_list = []
for sname in STAGE_ORDER:
    cnt = stage_counts.get(sname, 0)
    val = stage_values.get(sname, 0.0)
    pct = round(cnt / total_leads * 100) if total_leads > 0 else 0
    stages_json_list.append({"name": sname, "count": cnt, "value": int(val), "pct": pct})
for sname in stage_counts:
    if sname not in STAGE_ORDER:
        cnt = stage_counts[sname]
        val = stage_values[sname]
        pct = round(cnt / total_leads * 100) if total_leads > 0 else 0
        stages_json_list.append({"name": sname, "count": cnt, "value": int(val), "pct": pct})

conv_pct = round(total_compradores / total_leads * 100) if total_leads > 0 else 0
noresp_pct = round(total_no_resp / total_leads * 100) if total_leads > 0 else 0
calif_pct = round(total_calificados / total_leads * 100) if total_leads > 0 else 0
stag_pct = round(total_stagnant_7 / total_leads * 100) if total_leads > 0 else 0
ticket_avg = int(total_value / total_compradores) if total_compradores > 0 else 0

vendors_json_list = []
for vname, vd in sorted(vendor_data.items(), key=lambda x: -x[1]["total"]):
    vt = vd["total"]
    vc = vd["compradores"]
    vr = vd["no_resp"]
    vq = vd["calificados"]
    vs = vd["stagnant"]
    vconv = round(vc / vt * 100) if vt > 0 else 0
    vnoresp = round(vr / vt * 100) if vt > 0 else 0
    vcalif = round(vq / vt * 100) if vt > 0 else 0
    vstag = round(vs / vt * 100) if vt > 0 else 0
    vtick = int(vd["value"] / vc) if vc > 0 else 0
    stages_list = []
    for sname in STAGE_ORDER:
        stages_list.append({"stage": sname, "count": vd["stages"].get(sname, 0)})
    for sname in vd["stages"]:
        if sname not in STAGE_ORDER:
            stages_list.append({"stage": sname, "count": vd["stages"][sname]})
    vendors_json_list.append({
        "name": vname,
        "total": vt,
        "value": int(vd["value"]),
        "stages": stages_list,
        "kpis": {
            "conv_pct": vconv,
            "compradores": vc,
            "no_resp_pct": vnoresp,
            "no_resp": vr,
            "calif_pct": vcalif,
            "calificados": vq,
            "stagnant_pct": vstag,
            "ticket_avg": vtick,
        },
    })

suc_opts = sorted(suc_set)
usr_opts = sorted(usr_set)
stg_opts = sorted(stg_set)
etapas_json = STAGE_ORDER[:]

TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>__TITULO__ — Colchones Heaven</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --teal:#00B5AD;--teal-dk:#008F88;--teal-lt:#E6F7F6;--teal-mid:#00A09A;
  --gray:#808080;--gray-lt:#F5F6F7;--gray-md:#E2E2E2;
  --red:#CE2939;--red-lt:#FDEAEC;
  --amber:#D97706;--amber-lt:#FEF3E2;
  --black:#1A1A1A;--white:#FFFFFF;--text:#2D2D2D;--muted:#6B6B6B;
}
body{background:var(--gray-lt);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh}
.header{background:var(--teal);padding:0 36px;display:flex;justify-content:space-between;align-items:stretch;box-shadow:0 3px 16px rgba(0,181,173,.35)}
.hl{display:flex;align-items:center;gap:0;padding:16px 0}
.logo{border-right:1px solid rgba(255,255,255,.3);padding-right:24px;margin-right:24px}
.logo-h{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:.14em;line-height:1}
.logo-s{font-size:.68rem;color:rgba(255,255,255,.8);letter-spacing:.04em;margin-top:1px}
.htitle h1{font-size:.98rem;font-weight:600;color:#fff;letter-spacing:.01em}
.htitle p{font-size:.7rem;color:rgba(255,255,255,.7);margin-top:3px}
.hr{display:flex;align-items:center;gap:0;padding:16px 0;border-left:1px solid rgba(255,255,255,.25);margin-left:auto}
.hstat{text-align:center;padding:0 24px;border-right:1px solid rgba(255,255,255,.2)}
.hstat:last-child{border-right:none}
.hstat-v{font-size:1.5rem;font-weight:800;color:#fff;line-height:1}
.hstat-l{font-size:.62rem;color:rgba(255,255,255,.7);margin-top:3px;text-transform:uppercase;letter-spacing:.06em}
.container{padding:26px 36px;max-width:1500px;margin:0 auto}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}
.mc{background:#fff;border-radius:12px;padding:20px 22px;border:1px solid var(--gray-md);position:relative;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}
.mc-bar{position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:12px 0 0 12px}
.mc.c-teal .mc-bar{background:var(--teal)} .mc.c-gray .mc-bar{background:var(--gray)}
.mc.c-amber .mc-bar{background:var(--amber)} .mc.c-red .mc-bar{background:var(--red)}
.mc-lbl{font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}
.mc-val{font-size:2rem;font-weight:800;line-height:1}
.mc.c-teal .mc-val{color:var(--teal)} .mc.c-gray .mc-val{color:var(--gray)}
.mc.c-amber .mc-val{color:var(--amber)} .mc.c-red .mc-val{color:var(--red)}
.mc-sub{font-size:.68rem;color:var(--muted);margin-top:5px}
.sec{font-size:.68rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;display:flex;align-items:center;gap:10px}
.sec::after{content:'';flex:1;height:1px;background:var(--gray-md)}
.funnel{display:flex;border-radius:10px;overflow:hidden;border:1px solid var(--gray-md);height:40px;margin-bottom:26px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.fs{flex:1;display:flex;align-items:center;justify-content:center;font-size:.63rem;font-weight:700;color:#fff;cursor:default;transition:opacity .15s}
.fs:hover{opacity:.82}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px;margin-bottom:26px}
.sc{background:#fff;border:1px solid var(--gray-md);border-radius:10px;padding:15px 17px 13px;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.sc-bar{position:absolute;top:0;left:0;right:0;height:4px}
.sc-nm{font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
.sc-n{font-size:1.75rem;font-weight:800;color:var(--black);line-height:1}
.sc-d{font-size:.68rem;color:var(--muted);margin-top:4px}
.alert{background:var(--red-lt);border:1px solid #F5C0C5;border-left:4px solid var(--red);border-radius:8px;padding:13px 18px;margin-bottom:22px;display:flex;align-items:center;gap:12px;font-size:.82rem;color:#8B0012}
.alert span{font-size:1.2rem}
.alert b{color:var(--red);font-weight:700}
.tab-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px}
.tabs{display:flex;border:1px solid var(--gray-md);border-radius:8px;overflow:hidden;background:#fff}
.tab{padding:7px 20px;font-size:.76rem;font-weight:600;cursor:pointer;border:none;background:transparent;color:var(--muted);transition:all .15s;font-family:inherit}
.tab.active{background:var(--teal);color:#fff}
.tab:hover:not(.active){background:var(--teal-lt);color:var(--teal-dk)}
.controls{display:flex;gap:9px;margin-bottom:13px;flex-wrap:wrap;align-items:center}
.controls select,.controls input{background:#fff;border:1px solid var(--gray-md);color:var(--text);border-radius:8px;padding:7px 11px;font-size:.76rem;outline:none;font-family:inherit;cursor:pointer}
.controls select:focus,.controls input:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(0,181,173,.12)}
.rc{font-size:.72rem;color:var(--muted)}
.tw{background:#fff;border:1px solid var(--gray-md);border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}
.ts{max-height:530px;overflow-y:auto}
.ts::-webkit-scrollbar{width:5px} .ts::-webkit-scrollbar-track{background:var(--gray-lt)}
.ts::-webkit-scrollbar-thumb{background:var(--teal);border-radius:3px}
table{width:100%;border-collapse:collapse;font-size:.79rem}
thead th{background:var(--black);color:rgba(255,255,255,.75);padding:10px 13px;text-align:left;font-weight:600;font-size:.67rem;text-transform:uppercase;letter-spacing:.07em;border-bottom:3px solid var(--teal)}
tbody tr{border-bottom:1px solid var(--gray-lt);transition:background .12s}
tbody tr:hover{background:var(--teal-lt)}
tbody td{padding:9px 13px;color:var(--text);vertical-align:middle}
.badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:.66rem;font-weight:700}
.b-red{background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5}
.b-amber{background:var(--amber-lt);color:var(--amber);border:1px solid #FCD34D}
.b-teal{background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9}
.b-gray{background:var(--gray-lt);color:var(--gray);border:1px solid var(--gray-md)}
a{color:var(--teal-dk);text-decoration:none;font-weight:500}
a:hover{text-decoration:underline;color:var(--teal)}
.nd{text-align:center;padding:38px;color:var(--muted);font-size:.82rem}
.team-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:26px}
.tk{background:#fff;border:1px solid var(--gray-md);border-radius:10px;padding:14px 16px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.05);position:relative;overflow:hidden}
.tk::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.tk.c-teal::before{background:var(--teal)} .tk.c-red::before{background:var(--red)}
.tk.c-amber::before{background:var(--amber)} .tk.c-gray::before{background:var(--gray)}
.tk.c-purple::before{background:#7C3AED}
.tk-val{font-size:1.6rem;font-weight:800;line-height:1;margin-bottom:4px}
.tk.c-teal .tk-val{color:var(--teal)} .tk.c-red .tk-val{color:var(--red)}
.tk.c-amber .tk-val{color:var(--amber)} .tk.c-gray .tk-val{color:var(--gray)}
.tk.c-purple .tk-val{color:#7C3AED}
.tk-lbl{font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.tk-sub{font-size:.62rem;color:var(--muted);margin-top:3px}
.vg{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;margin-bottom:26px}
.vc{background:#fff;border:1px solid var(--gray-md);border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}
.vc-head{background:var(--black);padding:13px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid var(--teal)}
.vc-name{font-size:.9rem;font-weight:700;color:#fff}
.vc-total{font-size:1.5rem;font-weight:800;color:var(--teal);line-height:1}
.vc-total-lbl{font-size:.58rem;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;text-align:right}
.vc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:2px solid var(--gray-lt)}
.vk{padding:9px 8px;text-align:center;border-right:1px solid var(--gray-lt);position:relative}
.vk:last-child{border-right:none}
.vk-val{font-size:1.05rem;font-weight:800;line-height:1}
.vk-lbl{font-size:.58rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.vk-hint{font-size:.58rem;color:var(--muted);margin-top:1px}
.vk.good .vk-val{color:var(--teal)} .vk.warn .vk-val{color:var(--amber)}
.vk.bad .vk-val{color:var(--red)} .vk.neu .vk-val{color:var(--gray)}
.vc-kpis2{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid var(--gray-lt);background:var(--gray-lt)}
.vk2{padding:7px 8px;text-align:center;border-right:1px solid var(--gray-md)}
.vk2:last-child{border-right:none}
.vk2-val{font-size:.88rem;font-weight:700;color:var(--black);line-height:1}
.vk2-lbl{font-size:.57rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.vc-rows{padding:8px 0}
.vc-row{display:flex;align-items:center;padding:5px 16px;transition:background .12s;gap:8px}
.vc-row:hover{background:var(--teal-lt)}
.vc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.vc-sname{font-size:.75rem;color:var(--text);flex:1}
.vc-bwrap{width:80px;height:5px;background:var(--gray-lt);border-radius:3px;overflow:hidden}
.vc-bfill{height:100%;border-radius:3px}
.vc-cnt{font-size:.78rem;font-weight:700;color:var(--black);min-width:22px;text-align:right}
.vc-pct{font-size:.65rem;color:var(--muted);min-width:32px;text-align:right}
.footer{text-align:center;padding:18px;font-size:.68rem;color:var(--muted);border-top:1px solid var(--gray-md);background:#fff;margin-top:28px}
</style>
</head>
<body>
<div class="header">
  <div class="hl">
    <div class="logo"><div class="logo-h">HEAVEN</div><div class="logo-s">colchones &#10011;</div></div>
    <div class="htitle">
      <h1>__TITULO__</h1>
      <p>Generado: __FECHA__ &nbsp;&bull;&nbsp; Actualizacion diaria 11:00 AM</p>
    </div>
  </div>
  <div class="hr">
    <div class="hstat">
      <div style="display:flex;align-items:baseline;gap:10px;justify-content:center">
        <div class="hstat-v">__TOTAL__</div>
        <div style="font-size:1rem;font-weight:800;color:__DIFF_COLOR__">__DIFF_ARROW__ __DIFF_SIGN____DIFF_ABS__</div>
      </div>
      <div class="hstat-l">1-__DIA__ __CUR_MES_SHORT__ &nbsp;vs&nbsp; __PREV_TOTAL__ en __PREV_MES_SHORT__</div>
    </div>
    <div class="hstat"><div class="hstat-v">__VALOR__</div><div class="hstat-l">Valor total</div></div>
    <div class="hstat"><div class="hstat-v">__ESTANCADOS__</div><div class="hstat-l">Estancados</div></div>
  </div>
</div>
<div class="container">
  <div class="metrics">
    <div class="mc c-teal"><div class="mc-bar"></div><div class="mc-lbl">Leads del Mes</div><div class="mc-val">__TOTAL__</div><div class="mc-sub">creados en __MES_LABEL__</div></div>
    <div class="mc c-gray"><div class="mc-bar"></div><div class="mc-lbl">Valor Total Pipeline</div><div class="mc-val">__VALOR__</div><div class="mc-sub">deals con valor asignado</div></div>
    <div class="mc c-amber"><div class="mc-bar"></div><div class="mc-lbl">Estancados 7-14 dias</div><div class="mc-val">__STAG714__</div><div class="mc-sub">sin actividad reciente</div></div>
    <div class="mc c-red"><div class="mc-bar"></div><div class="mc-lbl">Estancados +14 dias</div><div class="mc-val">__STAG14__</div><div class="mc-sub">atencion urgente</div></div>
  </div>
  <div class="sec">Embudo del Mes</div>
  <div id="funnel" class="funnel"></div>
  <div class="sg" id="stages-grid"></div>
  <div class="alert"><span>&#9888;</span><div><b>__ESTANCADOS__ deals (__STAG_PCT__%)</b> llevan mas de 7 dias sin actividad &mdash; <b>__STAG14__</b> superan los 14 dias.</div></div>
  <div class="sec">KPIs del Equipo &mdash; __MES_LABEL__</div>
  <div class="team-kpis">
    <div class="tk c-teal"><div class="tk-val">__CONV_PCT__%</div><div class="tk-lbl">Tasa de Conversion</div><div class="tk-sub">__COMPRADORES__ compradores / __TOTAL__ leads</div></div>
    <div class="tk c-red"><div class="tk-val">__NORESP_PCT__%</div><div class="tk-lbl">Sin Respuesta del Cliente</div><div class="tk-sub">__NORESP_N__ el cliente no responde</div></div>
    <div class="tk c-amber"><div class="tk-val">__CALIF_PCT__%</div><div class="tk-lbl">Leads Calificados</div><div class="tk-sub">__CALIF_N__ en etapas avanzadas</div></div>
    <div class="tk c-purple"><div class="tk-val">__TICKET__</div><div class="tk-lbl">Ticket Promedio</div><div class="tk-sub">valor / compradores cerrados</div></div>
    <div class="tk c-gray"><div class="tk-val">__STAG_PCT__%</div><div class="tk-lbl">Estancados</div><div class="tk-sub">__ESTANCADOS__ sin actividad &gt;7d</div></div>
  </div>
  <div class="sec">Rendimiento por Vendedora</div>
  <div class="vg" id="vendors-grid"></div>
  <div class="tab-row">
    <div class="sec" style="margin:0;flex:1">Todos los Deals del Mes</div>
    <div class="tabs">
      <button class="tab active" onclick="setView('all')">Todos (__TOTAL__)</button>
      <button class="tab" onclick="setView('stagnant')">Estancados (__ESTANCADOS__)</button>
    </div>
  </div>
  <div class="controls">
    <select id="f-stage" onchange="render()"><option value="">Todas las etapas</option></select>
    <select id="f-user" onchange="render()"><option value="">Todos los responsables</option></select>
    <select id="f-suc" onchange="render()"><option value="">Todas las sucursales</option></select>
    <input id="f-days" type="number" placeholder="Dias min. estancado" oninput="render()" style="width:190px">
    <span id="rc" class="rc"></span>
  </div>
  <div class="tw"><div class="ts">
    <table>
      <thead><tr><th>#</th><th>Contacto / Deal</th><th>Etapa</th><th>Sucursal</th><th>Responsable</th><th>Creado</th><th>Dias sin act.</th><th>Valor</th><th>Estado</th></tr></thead>
      <tbody id="tbl"></tbody>
    </table>
  </div></div>
</div>
<div class="footer">HEAVEN Colchones &bull; Pipeline __MES_LABEL__ &bull; eanez.kommo.com &bull; __FECHA__</div>
<script>
const allRows=__ALL_ROWS_JSON__;
const stages=__STAGES_JSON__;
const sucOpts=__SUC_OPTS_JSON__;
const usrOpts=__USR_OPTS_JSON__;
const stgOpts=__STG_OPTS_JSON__;
const vendors=__VENDORS_JSON__;
const etapas=__ETAPAS_JSON__;
const SC={'Incoming leads':'#9CA3AF','Nueva consulta':'#00B5AD','Interesado':'#D97706','Cotizacion enviada':'#3B9ECB','Agendado / Visita':'#22A06B','Compradores':'#7C3AED','No Responden':'#CE2939'};
function kpiClass(val,g,w){return val>=g?'good':val>=w?'warn':'bad'}
function kpiClassInv(val,b,w){return val<=w?'good':val<=b?'warn':'bad'}
const vg=document.getElementById('vendors-grid');
vendors.forEach(v=>{
  const k=v.kpis;
  const maxStage=Math.max(...v.stages.map(s=>s.count),1);
  const val=v.value>0?'$'+v.value.toLocaleString('es-AR'):'--';
  const ticket=k.ticket_avg>0?'$'+k.ticket_avg.toLocaleString('es-AR'):'--';
  const stageRows=v.stages.filter(s=>s.count>0).map(s=>{
    const pct=Math.round(s.count/v.total*100);
    const w=Math.round(s.count/maxStage*100);
    return '<div class="vc-row"><div class="vc-dot" style="background:'+(SC[s.stage]||'#808080')+'"></div><div class="vc-sname">'+s.stage+'</div><div class="vc-bwrap"><div class="vc-bfill" style="background:'+(SC[s.stage]||'#808080')+';width:'+w+'%"></div></div><div class="vc-cnt">'+s.count+'</div><div class="vc-pct">'+pct+'%</div></div>';
  }).join('');
  vg.innerHTML+='<div class="vc"><div class="vc-head"><div class="vc-name">'+v.name+'</div><div><div class="vc-total">'+v.total+'</div><div class="vc-total-lbl">leads del mes</div></div></div>'
    +'<div class="vc-kpis">'
    +'<div class="vk '+kpiClass(k.conv_pct,5,2)+'"><div class="vk-val">'+k.conv_pct+'%</div><div class="vk-lbl">Conversion</div><div class="vk-hint">'+k.compradores+' compradores</div></div>'
    +'<div class="vk '+kpiClassInv(k.no_resp_pct,30,15)+'"><div class="vk-val">'+k.no_resp_pct+'%</div><div class="vk-lbl">Sin Respuesta</div><div class="vk-hint">'+k.no_resp+' no responden</div></div>'
    +'<div class="vk '+kpiClass(k.calif_pct,40,20)+'"><div class="vk-val">'+k.calif_pct+'%</div><div class="vk-lbl">Calificados</div><div class="vk-hint">'+k.calificados+' en embudo</div></div>'
    +'</div>'
    +'<div class="vc-kpis2">'
    +'<div class="vk2"><div class="vk2-val">'+ticket+'</div><div class="vk2-lbl">Ticket promedio</div></div>'
    +'<div class="vk2"><div class="vk2-val" style="color:'+(k.stagnant_pct>20?'var(--red)':k.stagnant_pct>10?'var(--amber)':'var(--teal)')+'">'+k.stagnant_pct+'%</div><div class="vk2-lbl">% Estancados</div></div>'
    +'<div class="vk2"><div class="vk2-val">'+val+'</div><div class="vk2-lbl">Valor total</div></div>'
    +'</div>'
    +'<div class="vc-rows">'+(stageRows||'<div style="padding:12px 16px;font-size:.74rem;color:var(--muted)">Sin leads activos</div>')+'</div></div>';
});
const fEl=document.getElementById('funnel');
stages.forEach(s=>{const g=document.createElement('div');g.className='fs';g.style.background=SC[s.name]||'#808080';g.style.flex=Math.max(s.count,1);g.title=s.name+': '+s.count+' deals';if(s.count>5)g.textContent=s.count;fEl.appendChild(g);});
const grid=document.getElementById('stages-grid');
stages.forEach(s=>{const c=SC[s.name]||'#808080';const v=s.value>0?'$'+s.value.toLocaleString('es-AR'):'--';grid.innerHTML+='<div class="sc"><div class="sc-bar" style="background:'+c+'"></div><div class="sc-nm">'+s.name+'</div><div class="sc-n">'+s.count+'</div><div class="sc-d">'+v+' &middot; '+s.pct+'%</div></div>';});
stgOpts.forEach(v=>document.getElementById('f-stage').innerHTML+='<option>'+v+'</option>');
usrOpts.forEach(v=>document.getElementById('f-user').innerHTML+='<option>'+v+'</option>');
sucOpts.forEach(v=>document.getElementById('f-suc').innerHTML+='<option>'+v+'</option>');
let view='all';
function setView(v){view=v;document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(i===0&&v==='all')||(i===1&&v==='stagnant')));document.getElementById('f-days').value=v==='stagnant'?7:'';render();}
function render(){
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const suc=document.getElementById('f-suc').value;
  const minD=parseFloat(document.getElementById('f-days').value)||(view==='stagnant'?7:0);
  const f=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc));
  document.getElementById('rc').textContent=f.length+' deals';
  const tbody=document.getElementById('tbl');
  if(!f.length){tbody.innerHTML='<tr><td colspan="9" class="nd">Sin deals con estos filtros</td></tr>';return;}
  tbody.innerHTML=f.map((r,i)=>{
    const c=SC[r.stage]||'#808080';
    const badge=r.days_int>14?'<span class="badge b-red">+14 dias</span>':r.days_int>=7?'<span class="badge b-amber">7-14 dias</span>':'<span class="badge b-teal">Al dia</span>';
    const dc=r.days_int>14?'var(--red)':r.days_int>=7?'var(--amber)':'var(--teal)';
    const val=r.value>0?'$'+r.value.toLocaleString('es-AR'):'--';
    const nm=r.contact||r.name;
    return '<tr><td style="color:var(--muted);width:36px">'+(i+1)+'</td>'
      +'<td><a href="https://eanez.kommo.com/leads/detail/'+r.id+'" target="_blank">'+nm+'</a>'+(r.contact?'<br><span style="font-size:.66rem;color:var(--muted)">#'+r.id+'</span>':'')+'</td>'
      +'<td><span style="color:'+c+';font-weight:700">'+r.stage+'</span></td>'
      +'<td style="color:var(--muted)">'+r.sucursal+'</td>'
      +'<td style="color:var(--muted);font-size:.75rem">'+r.user+'</td>'
      +'<td style="color:var(--muted)">'+r.created+'</td>'
      +'<td style="font-weight:800;color:'+dc+'">'+r.days_int+'d</td>'
      +'<td style="color:var(--teal-dk);font-weight:600">'+val+'</td>'
      +'<td>'+badge+'</td></tr>';
  }).join('');
}
render();
</script>
</body>
</html>"""

html = TEMPLATE
html = html.replace("__TITULO__", titulo)
html = html.replace("__FECHA__", fecha_str)
html = html.replace("__TOTAL__", str(total_leads))
html = html.replace("__VALOR__", fmt_money(total_value))
html = html.replace("__ESTANCADOS__", str(total_stagnant_7))
html = html.replace("__STAG714__", str(total_stagnant_7_14))
html = html.replace("__STAG14__", str(total_stagnant_14))
html = html.replace("__CONV_PCT__", str(conv_pct))
html = html.replace("__COMPRADORES__", str(total_compradores))
html = html.replace("__NORESP_PCT__", str(noresp_pct))
html = html.replace("__NORESP_N__", str(total_no_resp))
html = html.replace("__CALIF_PCT__", str(calif_pct))
html = html.replace("__CALIF_N__", str(total_calificados))
html = html.replace("__TICKET__", fmt_money(ticket_avg))
html = html.replace("__STAG_PCT__", str(stag_pct))
html = html.replace("__MES_LABEL__", mes_label)
html = html.replace("__PREV_TOTAL__", str(total_leads_prev))
html = html.replace("__PREV_MES_SHORT__", prev_mes_short)
html = html.replace("__CUR_MES_SHORT__", cur_mes_short)
html = html.replace("__DIA__", str(dia_hoy))
html = html.replace("__DIFF_ARROW__", diff_arrow)
html = html.replace("__DIFF_SIGN__", diff_sign)
html = html.replace("__DIFF_ABS__", str(abs(diff_leads)))
html = html.replace("__DIFF_COLOR__", diff_color)
html = html.replace("__ALL_ROWS_JSON__", json.dumps(all_rows, ensure_ascii=False))
html = html.replace("__STAGES_JSON__", json.dumps(stages_json_list, ensure_ascii=False))
html = html.replace("__SUC_OPTS_JSON__", json.dumps(suc_opts, ensure_ascii=False))
html = html.replace("__USR_OPTS_JSON__", json.dumps(usr_opts, ensure_ascii=False))
html = html.replace("__STG_OPTS_JSON__", json.dumps(stg_opts, ensure_ascii=False))
html = html.replace("__VENDORS_JSON__", json.dumps(vendors_json_list, ensure_ascii=False))
html = html.replace("__ETAPAS_JSON__", json.dumps(etapas_json, ensure_ascii=False))

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html generado correctamente.")
print("Leads:", total_leads, "| Valor:", fmt_money(total_value), "| Estancados:", total_stagnant_7)
