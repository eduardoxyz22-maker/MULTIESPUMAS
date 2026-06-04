import urllib.request
import urllib.parse
import json
import time
import datetime
import calendar
import argparse
import sys
from collections import defaultdict

_ap = argparse.ArgumentParser(add_help=False)
_ap.add_argument("--month", type=int, default=None)
_ap.add_argument("--year",  type=int, default=None)
_ap.add_argument("--out",   type=str, default=None)
_args, _ = _ap.parse_known_args()

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

# --- Taxonomía de canales de origen ---
_CH_TAXONOMY = [
    (["facebook","instagram","meta","fb ads","fb_ads","fb "], "Facebook Ads"),
    (["google","adwords","sem","gads"], "Google Ads"),
    (["whatsapp","wpp","ws ","ws_"], "WhatsApp directo"),
    (["web","formulario","form","landing","online","sitio"], "Web / Formulario"),
    (["tienda","walk","presencial","local","fisic","visita directa"], "Walk-in (Tienda)"),
    (["llamada","call","telefono","tel ","tel_"], "Llamada entrante"),
    (["referido","referral","recomend","boca"], "Referidos"),
    (["manual","vendedor","carga","agente"], "Carga manual vendedora"),
]
_CH_ICONS = {
    "Facebook Ads": "&#128248;", "Google Ads": "&#128269;",
    "WhatsApp directo": "&#128172;", "Walk-in (Tienda)": "&#128694;",
    "Web / Formulario": "&#127760;", "Llamada entrante": "&#128222;",
    "Carga manual vendedora": "&#9997;", "Referidos": "&#128205;",
    "Automático": "&#9881;", "Otros": "&#128101;",
}

def _norm_channel(raw):
    """Normaliza un valor crudo al nombre de canal canónico."""
    if not raw:
        return None
    low = str(raw).lower().strip()
    for keys, name in _CH_TAXONOMY:
        if any(k in low for k in keys):
            return name
    return None

def _detect_channel(lead, sf_id):
    """Detecta el canal de origen de un lead (custom field > tags > created_by)."""
    # 1. Campo custom de fuente/origen
    if sf_id:
        for cf in lead.get("custom_fields_values") or []:
            if cf.get("field_id") == sf_id:
                vals = cf.get("values", [])
                if vals:
                    ch = _norm_channel(str(vals[0].get("value", "")))
                    if ch:
                        return ch
    # 2. Tags adicionales (el primero es sucursal, los siguientes podrían ser fuente)
    tags = lead.get("_embedded", {}).get("tags", [])
    for tag in tags[1:]:
        ch = _norm_channel(tag.get("name", ""))
        if ch:
            return ch
    # 3. Fallback: created_by 0 = automatico (integración), >0 = manual
    if lead.get("created_by", 0) == 0:
        return "Automático"
    return "Carga manual vendedora"

def _fmt_resp(m):
    """Formatea minutos a string legible."""
    if m < 60:
        return f"{int(m)} min"
    if m < 1440:
        return f"{m/60:.1f} h"
    return f"{int(m/1440)} d"

now = time.time()
now_dt = datetime.datetime.now()
if _args.month and _args.year:
    now_dt = datetime.datetime(
        _args.year, _args.month,
        min(now_dt.day, calendar.monthrange(_args.year, _args.month)[1])
    )
    now = now_dt.timestamp()
mes_label_map = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}
mes_label = mes_label_map[now_dt.month] + " " + str(now_dt.year)
titulo = "Dashboard CRM Diario — " + mes_label
fecha_str = now_dt.strftime("%d/%m/%Y %H:%M")

inicio_mes = datetime.datetime(now_dt.year, now_dt.month, 1)
from_ts = int(inicio_mes.timestamp())

print("Obteniendo pipelines...")
pipelines = fetch_pipelines()
stage_map = {}
STAGE_ORDER = []
_seen = set()
for pl in sorted(pipelines, key=lambda p: p.get("sort", 0)):
    for st in sorted(pl.get("_embedded", {}).get("statuses", []), key=lambda s: s.get("sort", 0)):
        sid, sname = st["id"], st["name"]
        stage_map[sid] = sname
        if sname not in _seen:
            STAGE_ORDER.append(sname)
            _seen.add(sname)
print("Etapas encontradas:", STAGE_ORDER)

def _find_stage(candidates, keywords, default):
    for s in candidates:
        if any(k.lower() in s.lower() for k in keywords):
            return s
    return default

COMPRADORES_STAGE  = _find_stage(STAGE_ORDER, ["compra","venta","cerr","buyer","won","sale","close"], "Compradores")
NO_RESP_STAGE      = _find_stage(STAGE_ORDER, ["no respond","sin resp","no answer","inactiv","perdid","lost"], "No Responden")
_q1 = _find_stage(STAGE_ORDER, ["interesado","interest"], None)
_q2 = _find_stage(STAGE_ORDER, ["agend","visit","cita","appointment"], None)
QUALIFIED_STAGES   = set(filter(None, [_q1, _q2, COMPRADORES_STAGE]))
# Etapas donde las vendedoras deben hacer seguimiento activo
_fs0 = _find_stage(STAGE_ORDER, ["entrante","incoming","inbound","nuevo lead"], None)
_fs1 = _find_stage(STAGE_ORDER, ["nueva consulta","nueva","consult"], None)
_fs2 = _find_stage(STAGE_ORDER, ["interesado","interest"], None)
_fs3 = _find_stage(STAGE_ORDER, ["cotiz","quote","presupuest"], None)
_fs4 = _find_stage(STAGE_ORDER, ["agend","visit","cita","appointment"], None)
FOLLOWUP_STAGES    = set(filter(None, [_fs0, _fs1, _fs2, _fs3, _fs4]))
print("Stage cierre:", COMPRADORES_STAGE, "| No-resp:", NO_RESP_STAGE, "| Calificados:", QUALIFIED_STAGES)
print("Etapas seguimiento:", FOLLOWUP_STAGES)

print("Obteniendo usuarios...")
users_raw = fetch_users()
user_map = {u["id"]: u.get("name", "Desconocido") for u in users_raw}

print("Obteniendo leads del mes actual...")
leads = fetch_all_leads(from_ts)
print("Total leads:", len(leads))

# --- Mejora #2: buscar custom field de origen/fuente ---
print("Buscando campo de origen en custom fields...")
source_field_id = None
try:
    _cf_resp = api_get("/leads/custom_fields")
    for _cf in _cf_resp.get("_embedded", {}).get("custom_fields", []):
        _fn = _cf.get("name", "").lower()
        _fc = (_cf.get("code") or "").lower()
        if any(k in _fn or k in _fc for k in ["fuente","origen","source","canal","utm","procedencia","origin"]):
            source_field_id = _cf["id"]
            print(f"  Campo origen: '{_cf['name']}' id={source_field_id}")
            break
    if not source_field_id:
        print("  Sin campo de origen específico — usando created_by para clasificar.")
except Exception as _e:
    print("  ⚠ Error custom fields:", _e)

# --- Mejora #1: obtener eventos del mes para tiempo de primera respuesta ---
print("Obteniendo eventos del mes...")
_events_all = []
_ev_page = 1
while True:
    try:
        _ev_data = api_get("/events", {
            "limit": 100, "page": _ev_page,
            "filter[entity][]": "lead",
            "filter[created_at][from]": from_ts,
        })
    except Exception as _e:
        print(f"  ⚠ Error eventos pág {_ev_page}:", _e)
        break
    _ev_batch = _ev_data.get("_embedded", {}).get("events", [])
    if not _ev_batch:
        break
    _events_all.extend(_ev_batch)
    if "next" not in _ev_data.get("_links", {}):
        break
    _ev_page += 1
    time.sleep(0.15)
    if _ev_page > 400:
        print("  ⚠ Límite paginación eventos alcanzado")
        break
print(f"  Eventos obtenidos: {len(_events_all)}")

# Construir diccionario lead_id -> timestamp primer evento humano
_lead_created_ts = {lead["id"]: lead.get("created_at", 0) for lead in leads}
_first_human_ev = {}
for _ev in _events_all:
    _ev_by = _ev.get("created_by", 0)
    if _ev_by == 0:
        continue  # evento de sistema/bot
    _eid = _ev.get("entity_id")
    if _eid not in _lead_created_ts:
        continue  # lead fuera del rango del mes
    _ets = _ev.get("created_at", 0)
    _lts = _lead_created_ts[_eid]
    if _ets <= _lts:
        continue  # evento anterior o simultáneo a la creación
    if _eid not in _first_human_ev or _ets < _first_human_ev[_eid]:
        _first_human_ev[_eid] = _ets

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

compradores_prev = 0
valor_prev = 0.0
vendor_leads_prev = defaultdict(int)
for _l in leads_prev:
    _sn = stage_map.get(_l.get("status_id"), "")
    if _sn == COMPRADORES_STAGE:
        compradores_prev += 1
    valor_prev += float(_l.get("price", 0) or 0)
    _rid = _l.get("responsible_user_id")
    vendor_leads_prev[user_map.get(_rid, "Desconocido")] += 1

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
vendor_suc_counts = defaultdict(lambda: defaultdict(int))

total_value = 0.0
total_compradores = 0
total_no_resp = 0
total_calificados = 0
total_stagnant_7 = 0
total_stagnant_7_14 = 0
total_auto = 0
total_manual = 0
created_by_count = defaultdict(int)

for lead in leads:
    lid = lead.get("id", 0)
    lname = lead.get("name", "Sin nombre")
    status_id = lead.get("status_id")
    stage_name = stage_map.get(status_id, "Desconocido")
    responsible_id = lead.get("responsible_user_id")
    user_name = user_map.get(responsible_id, "Desconocido")
    value = float(lead.get("price", 0) or 0)
    created_at = lead.get("created_at", 0)
    updated_at = lead.get("updated_at") or lead.get("created_at", 0)
    days_float = (now - updated_at) / 86400.0 if updated_at else 0
    days_int = int(days_float)
    created_str = fmt_date(created_at) if created_at else "—"

    tags = lead.get("_embedded", {}).get("tags", [])
    # Sucursal: prefer lead tag, fall back to vendor name ("Nombre - Sucursal")
    _tag_suc = tags[0]["name"] if tags else None
    _vendor_suc = user_name.split(" - ", 1)[1] if " - " in user_name else None
    sucursal = _tag_suc or _vendor_suc or "Sin sucursal"

    contacts_emb = lead.get("_embedded", {}).get("contacts", [])
    contact_name = contacts_emb[0].get("name", "") if contacts_emb else ""

    stage_counts[stage_name] += 1
    stage_values[stage_name] += value
    total_value += value

    if stage_name == COMPRADORES_STAGE:
        total_compradores += 1
    if stage_name == NO_RESP_STAGE:
        total_no_resp += 1
    if stage_name in QUALIFIED_STAGES:
        total_calificados += 1

    if days_int >= 3 and stage_name in FOLLOWUP_STAGES:
        total_stagnant_7 += 1
        if days_int >= 7:
            total_stagnant_7_14 += 1

    suc_set.add(sucursal)
    usr_set.add(user_name)
    stg_set.add(stage_name)
    vendor_suc_counts[user_name][sucursal] += 1

    vd = vendor_data[user_name]
    vd["total"] += 1
    vd["value"] += value
    vd["stages"][stage_name] += 1
    if stage_name == COMPRADORES_STAGE:
        vd["compradores"] += 1
    if stage_name == NO_RESP_STAGE:
        vd["no_resp"] += 1
    if stage_name in QUALIFIED_STAGES:
        vd["calificados"] += 1
    if days_int >= 3 and stage_name in FOLLOWUP_STAGES:
        vd["stagnant"] += 1

    created_by_id = lead.get("created_by", 0)
    if created_by_id == 0:
        total_auto += 1
    else:
        total_manual += 1
        created_by_count[user_map.get(created_by_id, "Desconocido")] += 1

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
        "updated_at": updated_at,
        "nh": lid not in _first_human_ev,
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
auto_pct = round(total_auto / total_leads * 100) if total_leads > 0 else 0
manual_pct = round(total_manual / total_leads * 100) if total_leads > 0 else 0
ticket_avg = int(total_value / total_compradores) if total_compradores > 0 else 0

# --- KPIs comparativos MoM ---
conv_prev   = round(compradores_prev / total_leads_prev * 100) if total_leads_prev > 0 else 0
ticket_prev = int(valor_prev / compradores_prev) if compradores_prev > 0 else 0

def _delta(cur, prev):
    d = cur - prev
    return d, ("+" if d >= 0 else ""), ("&#9650;" if d > 0 else ("&#9660;" if d < 0 else "&mdash;")), ("#7FFFB0" if d >= 0 else "#FFB3B3")

_dv, diff_valor_sign, diff_valor_arrow, diff_valor_color = _delta(int(total_value), int(valor_prev))
diff_valor = _dv
_dc, diff_conv_sign, diff_conv_arrow, diff_conv_color = _delta(conv_pct, conv_prev)
diff_conv = _dc
_dt, diff_ticket_sign, diff_ticket_arrow, diff_ticket_color = _delta(ticket_avg, ticket_prev)
diff_ticket = _dt

# --- Cuadrantes ---
_avg_conv_q  = sum(round(vd["compradores"]/vd["total"]*100) if vd["total"]>0 else 0 for vd in vendor_data.values()) / max(len(vendor_data), 1)
_avg_total_q = total_leads / max(len(vendor_data), 1)

# --- Proyeccion al cierre ---
dias_del_mes       = calendar.monthrange(now_dt.year, now_dt.month)[1]
dias_transcurridos = now_dt.day
_pace              = total_compradores / dias_transcurridos if dias_transcurridos > 0 else 0
base_proj          = int(_pace * dias_del_mes)
base_proj_val      = fmt_money(int(ticket_avg * base_proj))
mid_proj           = int(total_leads * dias_del_mes / dias_transcurridos * 0.04) if dias_transcurridos > 0 else 0
mid_proj_val       = fmt_money(int(ticket_avg * mid_proj))
rescue_extra       = int(total_stagnant_7 * 0.30)
rescue_val_extra   = fmt_money(int(ticket_avg * rescue_extra))

# === Canal de Origen — datos reales ===
channel_data = defaultdict(lambda: {"leads": 0, "compradores": 0, "value": 0.0})
for lead in leads:
    ch = _detect_channel(lead, source_field_id)
    channel_data[ch]["leads"] += 1
    if stage_map.get(lead.get("status_id"), "") == COMPRADORES_STAGE:
        channel_data[ch]["compradores"] += 1
    channel_data[ch]["value"] += float(lead.get("price", 0) or 0)

_ch_rows_data = sorted(channel_data.items(), key=lambda x: -x[1]["compradores"])
_ch_eligible = [(n, d) for n, d in _ch_rows_data if d["leads"] >= 5]
_max_conv = max((round(d["compradores"]/d["leads"]*100) for _, d in _ch_rows_data if d["leads"] > 0), default=1) or 1
_ch_best_name = max(_ch_eligible, key=lambda x: round(x[1]["compradores"]/x[1]["leads"]*100) if x[1]["leads"] else 0, default=(None, {}))[0] if _ch_eligible else None
_ch_worst_name = min(_ch_eligible, key=lambda x: round(x[1]["compradores"]/x[1]["leads"]*100) if x[1]["leads"] else 0, default=(None, {}))[0] if _ch_eligible else None

_ch_rows_html = ""
for ch_name, ch_d in _ch_rows_data:
    ch_leads = ch_d["leads"]
    ch_comp = ch_d["compradores"]
    ch_val = ch_d["value"]
    ch_pct = round(ch_leads / total_leads * 100) if total_leads > 0 else 0
    ch_conv = round(ch_comp / ch_leads * 100) if ch_leads > 0 else 0
    ch_ticket = int(ch_val / ch_comp) if ch_comp > 0 else 0
    bar_w = round(ch_conv / _max_conv * 100)
    is_best = ch_name == _ch_best_name
    is_worst = ch_name == _ch_worst_name
    bar_color = "#22c55e" if is_best else ("var(--red)" if is_worst else "var(--teal)")
    row_cls = ' class="ch-best"' if is_best else (' class="ch-worst"' if is_worst else "")
    icon = _CH_ICONS.get(ch_name, "&#128101;")
    ticket_str = fmt_money(ch_ticket) if ch_ticket > 0 else "&mdash;"
    val_str = fmt_money(int(ch_val)) if ch_val > 0 else "&mdash;"
    _ch_rows_html += f'        <tr{row_cls}><td>{icon} {ch_name}</td><td>{ch_leads:,}</td><td>{ch_pct}%</td><td>{ch_comp}</td><td>{ch_conv}%</td><td><div class="ch-bar-wrap"><div class="ch-bar-fill" style="width:{bar_w}%;background:{bar_color}"></div></div></td><td>{ticket_str}</td><td>{val_str}</td></tr>\n'

_otros_n = channel_data.get("Otros", {"leads": 0})["leads"]
_otros_pct = round(_otros_n / total_leads * 100) if total_leads > 0 else 0
if _otros_pct >= 10:
    _unclassified_alert = f'<div class="ch-alert"><span>&#9888;</span><div><b>{_otros_n} leads ({_otros_pct}%)</b> sin canal clasificado &mdash; etiqueta el origen en Kommo para mejorar la anal&iacute;tica.</div></div>'
else:
    _unclassified_alert = ""

if _ch_best_name and _ch_worst_name and _ch_best_name != _ch_worst_name:
    _b = channel_data[_ch_best_name]
    _w = channel_data[_ch_worst_name]
    _b_conv = round(_b["compradores"]/_b["leads"]*100) if _b["leads"] else 0
    _w_conv = round(_w["compradores"]/_w["leads"]*100) if _w["leads"] else 0
    _mult = round(_b_conv / max(_w_conv, 1), 1)
    _b_tick = fmt_money(int(_b["value"]/_b["compradores"])) if _b["compradores"] > 0 else ""
    _channel_insight = f'&#128161; <strong>{_ch_best_name} convierte {_mult}&times; m&aacute;s que {_ch_worst_name}</strong> ({_b_conv}% vs {_w_conv}%).'
    if _b_tick:
        _channel_insight += f' Ticket promedio en {_ch_best_name}: <strong>{_b_tick}</strong> &mdash; priorizar este canal tiene mayor retorno por lead captado.'
elif _ch_best_name:
    _b = channel_data[_ch_best_name]
    _b_conv = round(_b["compradores"]/_b["leads"]*100) if _b["leads"] else 0
    _channel_insight = f'&#128161; <strong>{_ch_best_name}</strong> es el canal con mayor tasa de conversi&oacute;n ({_b_conv}%).'
else:
    _channel_insight = '&#128161; Clasifica el origen de los leads en Kommo para obtener insights por canal.'

# === Velocidad de Respuesta — estadísticas reales ===
_resp_times_all = []  # (minutes, responsible_user_id)
for lead in leads:
    lid = lead["id"]
    uid = lead.get("responsible_user_id")
    if lid in _first_human_ev:
        dm = (_first_human_ev[lid] - lead.get("created_at", 0)) / 60.0
        if dm < 0:
            dm = 0.0
        _resp_times_all.append((dm, uid))

_resp_n = len(_resp_times_all)
_resp_avg = sum(t[0] for t in _resp_times_all) / _resp_n if _resp_n > 0 else 0
_resp_lt5_n = sum(1 for t in _resp_times_all if t[0] < 5)
_resp_lt1h_n = sum(1 for t in _resp_times_all if t[0] < 60)
_resp_lt5_pct = round(_resp_lt5_n / total_leads * 100) if total_leads > 0 else 0
_resp_lt1h_pct = round(_resp_lt1h_n / total_leads * 100) if total_leads > 0 else 0
_resp_cold_n = sum(
    1 for lead in leads
    if lead["id"] not in _first_human_ev
    or (_first_human_ev[lead["id"]] - lead.get("created_at", 0)) / 60.0 > 1440
)
_resp_cold_pct = round(_resp_cold_n / total_leads * 100) if total_leads > 0 else 0
_resp_avg_str = _fmt_resp(_resp_avg) if _resp_n > 0 else "N/A"
_resp_avg_color = "c-teal" if _resp_avg < 15 else ("c-amber" if _resp_avg < 60 else "c-red")
_resp_lt5_color = "c-teal" if _resp_lt5_pct >= 40 else ("c-amber" if _resp_lt5_pct >= 20 else "c-red")
_resp_lt1h_color = "c-teal" if _resp_lt1h_pct >= 70 else ("c-amber" if _resp_lt1h_pct >= 40 else "c-red")

_vresp = defaultdict(lambda: {"times": [], "cold": 0})
for (dm, uid) in _resp_times_all:
    uname = user_map.get(uid, "Desconocido")
    _vresp[uname]["times"].append(dm)
for lead in leads:
    lid = lead["id"]
    uname = user_map.get(lead.get("responsible_user_id"), "Desconocido")
    if lid not in _first_human_ev or (_first_human_ev[lid] - lead.get("created_at", 0)) / 60.0 > 1440:
        _vresp[uname]["cold"] += 1

_vresp_list = []
for vname, vrd in _vresp.items():
    vtimes = vrd["times"]
    vavg = sum(vtimes) / len(vtimes) if vtimes else None
    vlt5_pct = round(sum(1 for t in vtimes if t < 5) / len(vtimes) * 100) if vtimes else 0
    vlt24_n = sum(1 for t in vtimes if t < 1440)
    vslow_n = sum(1 for t in vtimes if t >= 1440)
    _vresp_list.append((vname, vavg, vlt24_n, vslow_n, vrd["cold"], vlt5_pct))
_vresp_list.sort(key=lambda x: x[1] if x[1] is not None else 99999)

_vendor_resp_html = ""
for (vname, vavg, vlt24_n, vslow_n, vcold, vlt5_pct) in _vresp_list:
    if vavg is None:
        avg_str = "Sin datos"
        badge = '<span class="badge b-gray">Sin datos</span>'
    elif vavg < 15:
        avg_str = f"<strong>{_fmt_resp(vavg)}</strong>"
        badge = '<span class="badge b-teal">&#128994; Excelente</span>'
    elif vavg < 60:
        avg_str = _fmt_resp(vavg)
        badge = '<span class="badge b-amber">&#128993; Aceptable</span>'
    else:
        avg_str = _fmt_resp(vavg)
        badge = '<span class="badge b-red">&#128308; Cr&iacute;tico</span>'
    _vendor_resp_html += f'        <tr><td><strong>{vname}</strong></td><td>{vlt5_pct}%</td><td>{avg_str}</td><td>{vcold}</td><td>{badge}</td></tr>\n'

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
    _hi_conv = vconv > _avg_conv_q
    _hi_vol  = vt >= _avg_total_q
    if _hi_conv and _hi_vol:
        _quadrant = "star"
    elif _hi_conv:
        _quadrant = "potential"
    elif _hi_vol:
        _quadrant = "volume"
    else:
        _quadrant = "critical"
    vendors_json_list.append({
        "name": vname,
        "total": vt,
        "prev_total": vendor_leads_prev.get(vname, 0),
        "value": int(vd["value"]),
        "stages": stages_list,
        "quadrant": _quadrant,
        "kpis": {
            "conv_pct": vconv,
            "compradores": vc,
            "no_resp_pct": vnoresp,
            "no_resp": vr,
            "calif_pct": vcalif,
            "calificados": vq,
            "stagnant_pct": vstag,
            "stagnant": vs,
            "ticket_avg": vtick,
            "created_manual": created_by_count.get(vname, 0),
        },
    })

vendor_primary_suc = {
    vname: max(sc, key=sc.get)
    for vname, sc in vendor_suc_counts.items()
}

suc_opts = sorted(suc_set)
usr_opts = sorted(usr_set)
stg_opts = sorted(stg_set)
etapas_json = STAGE_ORDER[:]

_top = max(vendors_json_list, key=lambda v: v["kpis"]["compradores"]) if vendors_json_list else {"name":"N/A","kpis":{"compradores":0,"conv_pct":0}}
top_vendor_name = _top["name"]
top_vendor_pct  = round(_top["kpis"]["compradores"] / total_compradores * 100) if total_compradores > 0 else 0
extra_conv      = max(0, int(total_leads * _top["kpis"]["conv_pct"] / 100) - total_compradores)

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
.origin-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:12px 0 22px}
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
.vc-head{background:var(--black);padding:13px 18px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--teal)}
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
.vk2-hint{font-size:.57rem;color:var(--muted);margin-top:1px}
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
/* Analisis ejecutivo */
.exec-summary{border-left:4px solid var(--teal);padding:15px 20px;margin:12px 0 22px;background:#fff;border-radius:0 10px 10px 0;border:1px solid var(--gray-md)}
.quadrant-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:12px 0 22px}
.quadrant{border-radius:10px;padding:14px;background:#fff;border:1px solid var(--gray-md);display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.q-star{border-left:4px solid #22c55e} .q-potential{border-left:4px solid #eab308} .q-volume{border-left:4px solid #3b82f6} .q-critical{border-left:4px solid var(--red)}
.q-label{font-weight:700;font-size:.78rem} .q-axis{font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.q-person{font-size:.8rem;line-height:1.5} .q-action{font-size:.7rem;color:var(--muted);font-style:italic}
.actions-row{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-top:18px;margin-bottom:24px}
.action-card{border-radius:10px;padding:13px;background:#fff;border:1px solid var(--gray-md);font-size:.75rem;line-height:1.55}
.action-card h4{margin:0 0 7px;font-size:.78rem} .action-card ol{margin:0;padding-left:16px} .action-card li{margin-bottom:5px}
.action-card.immediate{border-top:3px solid #22c55e} .action-card.short-term{border-top:3px solid #3b82f6}
.action-card.insight{border-top:3px solid #7C3AED} .action-card.risk{border-top:3px solid var(--red)}
/* Badges cuadrante */
.badge-q{display:inline-block;margin-top:5px;font-size:.62rem;font-weight:700;padding:3px 8px;border-radius:20px;pointer-events:none}
.badge-q.star{background:rgba(34,197,94,.12);color:#16a34a;border:1px solid rgba(34,197,94,.3)}
.badge-q.potential{background:rgba(234,179,8,.12);color:#b45309;border:1px solid rgba(234,179,8,.3)}
.badge-q.volume{background:rgba(59,130,246,.12);color:#2563eb;border:1px solid rgba(59,130,246,.3)}
.badge-q.critical{background:rgba(206,41,57,.12);color:var(--red);border:1px solid rgba(206,41,57,.3)}
.super-star-banner{background:linear-gradient(90deg,#7c3aed,#a855f7);color:#fff;font-size:.65rem;font-weight:800;padding:4px 10px;letter-spacing:.08em;text-transform:uppercase;border-radius:0 0 8px 8px;text-align:center;margin:-1px -1px 0 -1px}
.vc.is-super-star{border:2px solid #a855f7;box-shadow:0 0 16px rgba(168,85,247,.25)}
/* Proyeccion */
.scenarios-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0 24px}
.scenario{background:#fff;border-radius:10px;padding:16px;text-align:center;border:1px solid var(--gray-md);box-shadow:0 1px 4px rgba(0,0,0,.05)}
.scenario-base{border-top:3px solid var(--gray)} .scenario-mid{border-top:3px solid #3b82f6} .scenario-top{border-top:3px solid #22c55e}
.scenario h4{margin:0 0 6px;font-size:.74rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.scenario-num{font-size:1.9rem;font-weight:800;color:var(--black);line-height:1}
.scenario-val{font-size:.95rem;font-weight:700;color:var(--teal);margin:3px 0 7px} .scenario p{font-size:.68rem;color:var(--muted);margin:0}
/* Fila global automático vs manual */
.lead-origin-row{display:flex;align-items:center;gap:0;background:#fff;border:1px solid var(--gray-md);border-radius:12px;padding:0;margin-bottom:22px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06);position:relative}
.lo-card{display:flex;align-items:center;gap:16px;flex:1;padding:18px 24px}
.lo-auto{border-right:1px solid var(--gray-md)}
.lo-auto .lo-val{color:var(--gray)}
.lo-manual .lo-val{color:var(--teal)}
.lo-icon{font-size:2rem;opacity:.7;flex-shrink:0}
.lo-val{font-size:2.4rem;font-weight:800;line-height:1;margin-bottom:3px}
.lo-lbl{font-size:.72rem;font-weight:600;color:var(--text);line-height:1.4;max-width:200px}
.lo-pct{font-size:.66rem;color:var(--muted);margin-top:2px;font-weight:600}
.lo-vs{font-size:.72rem;font-weight:800;color:var(--muted);padding:0 4px;flex-shrink:0;letter-spacing:.04em}
.lo-bar-wrap{position:absolute;bottom:0;left:0;right:0;height:4px;background:var(--teal-lt)}
.lo-bar-fill{height:100%;background:var(--gray);border-radius:0}
/* Delta MoM */
.delta-mom{font-size:.65rem;font-weight:700;margin-left:4px;vertical-align:middle}
.delta-mom.up{color:#16a34a} .delta-mom.down{color:var(--red)} .delta-mom.flat{color:var(--gray)}
/* Velocidad de Respuesta */
.resp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0 16px}
.resp-ranking{background:#fff;border-radius:10px;border:1px solid var(--gray-md);overflow:hidden;margin-bottom:22px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
/* Canal de Origen */
.ch-wrap{background:#fff;border-radius:12px;border:1px solid var(--gray-md);overflow:hidden;margin:12px 0 4px;box-shadow:0 1px 5px rgba(0,0,0,.06)}
.ch-table{width:100%;border-collapse:collapse;font-size:.79rem}
.ch-table th{background:var(--black);color:rgba(255,255,255,.75);padding:9px 13px;text-align:left;font-weight:600;font-size:.66rem;text-transform:uppercase;letter-spacing:.06em;border-bottom:3px solid var(--teal)}
.ch-table td{padding:9px 13px;border-bottom:1px solid var(--gray-lt);vertical-align:middle}
.ch-table tr:last-child td{border-bottom:none}
.ch-table tr:hover td{background:var(--teal-lt)}
.ch-bar-wrap{width:80px;height:6px;background:var(--gray-lt);border-radius:3px;display:inline-block;vertical-align:middle}
.ch-bar-fill{height:100%;border-radius:3px}
.ch-best td{background:rgba(34,197,94,.07)} .ch-best td:nth-child(5){color:#15803d;font-weight:800}
.ch-worst td{background:rgba(206,41,57,.05)} .ch-worst td:nth-child(5){color:var(--red);font-weight:800}
.ch-insight{background:var(--teal-lt);border-top:1px solid #99DDD9;padding:12px 18px;font-size:.78rem;line-height:1.65;color:var(--text)}
.mock-badge{display:inline-block;font-size:.58rem;font-weight:700;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;padding:2px 6px;border-radius:20px;vertical-align:middle;margin-left:6px;letter-spacing:.02em}
.ch-alert{background:var(--amber-lt);border:1px solid #FCD34D;border-left:4px solid var(--amber);border-radius:8px;padding:11px 16px;margin-bottom:10px;display:flex;align-items:center;gap:10px;font-size:.8rem;color:#7C4B00}
.ch-alert span{font-size:1.1rem} .ch-alert b{color:var(--amber);font-weight:700}
@media(max-width:768px){.quadrant-grid,.actions-row,.scenarios-grid,.resp-kpis{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="header">
  <div class="hl">
    <div class="logo"><div class="logo-h">HEAVEN</div><div class="logo-s">colchones &#10011;</div></div>
    <div class="htitle">
      <h1>__TITULO__</h1>
      <p>Generado: __FECHA__ &nbsp;&bull;&nbsp; Actualizacion diaria 10:00 AM y 17:00 PM</p>
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
    <div class="hstat"><div class="hstat-v">__ESTANCADOS__</div><div class="hstat-l">Sin Seguimiento</div></div>
  </div>
</div>
<div class="container">
  <div class="metrics">
    <div class="mc c-teal"><div class="mc-bar"></div><div class="mc-lbl">Leads del Mes</div><div class="mc-val">__TOTAL__</div><div class="mc-sub">creados en __MES_LABEL__</div></div>
    <div class="mc c-gray"><div class="mc-bar"></div><div class="mc-lbl">Valor Total Pipeline</div><div class="mc-val">__VALOR__</div><div class="mc-sub">deals con valor asignado</div></div>
    <div class="mc c-amber"><div class="mc-bar"></div><div class="mc-lbl">Sin Seguimiento +72h</div><div class="mc-val">__STAG714__</div><div class="mc-sub">sin actividad reciente</div></div>
    <div class="mc c-red"><div class="mc-bar"></div><div class="mc-lbl">Sin Seguimiento +7 dias</div><div class="mc-val">__STAG14__</div><div class="mc-sub">atencion urgente</div></div>
  </div>
  <div class="lead-origin-row">
    <div class="lo-card lo-auto">
      <div class="lo-icon">&#9881;</div>
      <div class="lo-body">
        <div class="lo-val">__AUTO_N__</div>
        <div class="lo-lbl">Leads asignados autom&aacute;ticamente por el sistema</div>
        <div class="lo-pct">__AUTO_PCT__% del total</div>
      </div>
    </div>
    <div class="lo-vs">VS</div>
    <div class="lo-card lo-manual">
      <div class="lo-icon">&#9997;</div>
      <div class="lo-body">
        <div class="lo-val">__MANUAL_N__</div>
        <div class="lo-lbl">Leads ingresados manualmente por vendedoras</div>
        <div class="lo-pct">__MANUAL_PCT__% del total</div>
      </div>
    </div>
    <div class="lo-bar-wrap">
      <div class="lo-bar-fill" style="width:__AUTO_PCT__%"></div>
    </div>
  </div>
  <div class="sec">Origen de Leads &mdash; __MES_LABEL__</div>
  __UNCLASSIFIED_ALERT__
  <div class="ch-wrap">
    <table class="ch-table">
      <thead><tr><th>Canal</th><th>Leads</th><th>% Total</th><th>Cierres</th><th>Conversi&oacute;n</th><th>Conv. relativa</th><th>Ticket prom.</th><th>Pipeline</th></tr></thead>
      <tbody>
__CHANNELS_ROWS__
      </tbody>
    </table>
    <div class="ch-insight">__CHANNEL_INSIGHT__</div>
  </div>
  <div class="sec">Embudo del Mes</div>
  <div id="funnel" class="funnel"></div>
  <div class="sg" id="stages-grid"></div>
  <div class="alert"><span>&#9888;</span><div><b>__ESTANCADOS__ deals (__STAG_PCT__%)</b> llevan mas de 72h sin seguimiento &mdash; <b>__STAG14__</b> superan los 7 dias.</div></div>
  <div class="sec">KPIs del Equipo &mdash; __MES_LABEL__</div>
  <div class="team-kpis">
    <div class="tk c-teal"><div class="tk-val">__CONV_PCT__% <span class="delta-mom __DIFF_CONV_CLASS__">__DIFF_CONV_ARROW__ __DIFF_CONV_SIGN____DIFF_CONV__pp</span></div><div class="tk-lbl">Tasa de Conversion</div><div class="tk-sub">__COMPRADORES__ compradores / __TOTAL__ leads</div></div>
    <div class="tk c-red"><div class="tk-val">__NORESP_PCT__%</div><div class="tk-lbl">Sin Respuesta del Cliente</div><div class="tk-sub">__NORESP_N__ el cliente no responde</div></div>
    <div class="tk c-amber"><div class="tk-val">__CALIF_PCT__%</div><div class="tk-lbl">Leads Calificados</div><div class="tk-sub">__CALIF_N__ en etapas avanzadas</div></div>
    <div class="tk c-purple"><div class="tk-val">__TICKET__ <span class="delta-mom __DIFF_TICKET_CLASS__">__DIFF_TICKET_ARROW__</span></div><div class="tk-lbl">Ticket Promedio</div><div class="tk-sub">valor / compradores cerrados</div></div>
    <div class="tk c-gray"><div class="tk-val">__STAG_PCT__%</div><div class="tk-lbl">Sin Seguimiento</div><div class="tk-sub">__ESTANCADOS__ sin actividad &gt;72h</div></div>
  </div>
  <div class="sec">Velocidad de Respuesta &mdash; __MES_LABEL__</div>
  <div class="resp-kpis">
    <div class="tk __RESP_AVG_COLOR__"><div class="tk-val">__RESP_AVG_STR__</div><div class="tk-lbl">Tiempo Promedio Global</div><div class="tk-sub">meta: &lt;15 min</div></div>
    <div class="tk __RESP_LT5_COLOR__"><div class="tk-val">__RESP_LT5_PCT__%</div><div class="tk-lbl">Respondidos en &lt;5 min</div><div class="tk-sub">__RESP_LT5_N__ leads &mdash; ventana de oro</div></div>
    <div class="tk __RESP_LT1H_COLOR__"><div class="tk-val">__RESP_LT1H_PCT__%</div><div class="tk-lbl">Respondidos en &lt;1 hora</div><div class="tk-sub">__RESP_LT1H_N__ leads contactados a tiempo</div></div>
    <div class="tk c-red"><div class="tk-val">__RESP_COLD_N__</div><div class="tk-lbl">Leads Fr&iacute;os +24h / Sin Respuesta</div><div class="tk-sub">__RESP_COLD_PCT__% &mdash; requieren reactivaci&oacute;n</div></div>
  </div>
  <div class="resp-ranking">
    <table class="ch-table">
      <thead><tr><th>Vendedora</th><th>% en &lt;5 min</th><th>Tiempo prom. 1&ordf; respuesta</th><th>Fr&iacute;os / Sin contacto</th><th>Status</th></tr></thead>
      <tbody>
__VENDOR_RESP_ROWS__
      </tbody>
    </table>
  </div>
  <div class="sec">Análisis Ejecutivo &mdash; __MES_LABEL__</div>
  <div class="exec-summary">
    <div style="font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px">Diagnóstico del Mes</div>
    <p style="font-size:.82rem;line-height:1.65;color:var(--text)">
      El equipo generó <strong>__TOTAL__ leads</strong> con <strong>__COMPRADORES__ cierres</strong> (__CONV_PCT__% conversión)
      y <strong>__VALOR__</strong> en pipeline.
      <strong>__TOP_VENDOR__ concentra el __TOP_VENDOR_PCT__% de los cierres</strong> &mdash;
      la palanca principal de mejora es <strong>conversión y disciplina de seguimiento</strong>.
      Hay <strong>__ESTANCADOS__ deals sin seguimiento</strong> (__STAG_PCT__%) que representan oportunidades latentes.
    </p>
  </div>
  <div class="sec" style="margin-top:4px">Matriz de Rendimiento</div>
  <div class="quadrant-grid" id="quadrant-grid"></div>
  <div class="actions-row">
    <div class="action-card immediate">
      <h4>✅ Esta Semana</h4>
      <ol>
        <li>Llamar top 50 cotizaciones por valor &mdash; meta <strong>+10 cierres</strong></li>
        <li>Acompañar visitas de vendedoras CRÍTICO &mdash; ticket <strong>__TICKET__</strong></li>
        <li>Documentar playbook de <strong>__TOP_VENDOR__</strong> para replicarlo</li>
      </ol>
    </div>
    <div class="action-card short-term">
      <h4>📅 Este Mes</h4>
      <ol>
        <li>Activar los <strong>__STAG14__</strong> leads con +7 días sin contacto</li>
        <li>Revisar pipeline &ldquo;No Responden&rdquo; (<strong>__NORESP_N__</strong> leads)</li>
      </ol>
    </div>
    <div class="action-card insight">
      <h4>💡 Insight</h4>
      <p>Con <strong>__TOTAL__ leads</strong> el cuello de botella <strong>no es captación</strong> &mdash; es conversión.
      Si todas las vendedoras igualaran a <strong>__TOP_VENDOR__</strong> habría
      <strong>~__EXTRA_CONV__ cierres extra</strong> solo este mes.</p>
    </div>
    <div class="action-card risk">
      <h4>⚠️ Riesgo</h4>
      <p><strong>Concentración en __TOP_VENDOR__</strong> (__TOP_VENDOR_PCT__% de cierres).
      Dependencia estructural alta &mdash; replicar su método al equipo es prioridad #1.</p>
    </div>
  </div>
  <div class="sec">Rendimiento por Vendedora</div>
  <div class="vg" id="vendors-grid"></div>
  <div class="sec">Proyección al Cierre de __MES_LABEL__</div>
  <p style="font-size:.72rem;color:var(--muted);margin-bottom:0">Días transcurridos: <strong>__DIAS_TRANS__ / __DIAS_MES__</strong> &nbsp;&bull;&nbsp; Pace lineal basado en datos actuales.</p>
  <div class="scenarios-grid">
    <div class="scenario scenario-base">
      <h4>Escenario Base</h4>
      <div class="scenario-num">~__BASE_PROJ__</div>
      <div class="scenario-val">~__BASE_PROJ_VAL__</div>
      <p>Mantiene tendencia actual sin intervenciones</p>
    </div>
    <div class="scenario scenario-mid">
      <h4>+1pp Conversión (4%)</h4>
      <div class="scenario-num">~__MID_PROJ__</div>
      <div class="scenario-val">~__MID_PROJ_VAL__</div>
      <p>Coaching dirigido a vendedoras CRÍTICO</p>
    </div>
    <div class="scenario scenario-top">
      <h4>Rescate Sin Seguimiento (30%)</h4>
      <div class="scenario-num">+__RESCUE_EXTRA__</div>
      <div class="scenario-val">+__RESCUE_VAL_EXTRA__</div>
      <p>Llamada/WhatsApp a los __ESTANCADOS__ sin seguimiento</p>
    </div>
  </div>
  <div class="tab-row">
    <div class="sec" style="margin:0;flex:1">Todos los Deals del Mes</div>
    <div class="tabs">
      <button class="tab active" onclick="setView('all')">Todos (__TOTAL__)</button>
      <button class="tab" onclick="setView('stagnant')">Sin Seguimiento (__ESTANCADOS__)</button>
    </div>
  </div>
  <div class="controls">
    <select id="f-stage" onchange="render()"><option value="">Todas las etapas</option></select>
    <select id="f-user" onchange="render()"><option value="">Todos los responsables</option></select>
    <select id="f-suc" onchange="render()"><option value="">Todas las sucursales</option></select>
    <input id="f-days" type="number" placeholder="Dias min. sin seguimiento" oninput="render()" style="width:190px">
    <button onclick="document.getElementById('f-days').value=7;render()" style="background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5;border-radius:8px;padding:7px 13px;font-size:.73rem;font-weight:700;cursor:pointer;font-family:inherit">🔴 Solo críticos +7d</button>
    <button onclick="exportCSV()" style="background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9;border-radius:8px;padding:7px 13px;font-size:.73rem;font-weight:600;cursor:pointer;font-family:inherit">⬇ Exportar CSV</button>
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
const prevMesShort='__PREV_MES_SHORT__';
const COMPRADORES_STAGE='__COMPRADORES_STAGE__';
const NO_RESP_STAGE_JS='__NO_RESP_STAGE__';
const FOLLOWUP_STAGES=__FOLLOWUP_STAGES_JSON__;
const SC={'Incoming leads':'#9CA3AF','Nueva consulta':'#00B5AD','Interesado':'#D97706','Cotizacion enviada':'#3B9ECB','Agendado / Visita':'#22A06B','Compradores':'#7C3AED','No Responden':'#CE2939'};
function kpiClass(val,g,w){return val>=g?'good':val>=w?'warn':'bad'}
function kpiClassInv(val,b,w){return val<=w?'good':val<=b?'warn':'bad'}
const QL={'star':'&#9679; ESTRELLA','potential':'&#9670; POTENCIAL','volume':'&#9632; ALTO VOLUMEN','critical':'&#9675; CRÍTICO'};
const QC={'star':'star','potential':'potential','volume':'volume','critical':'critical'};
const qDesc={'star':'Alto volumen · Conversión superior','potential':'Buena conversión · Poco volumen','volume':'Mucho volumen · Conversión promedio','critical':'Bajo volumen · Baja conversión'};
const qAction={'star':'→ Documentar playbook y replicarlo al equipo','potential':'→ Aumentar volumen de leads asignados','volume':'→ Mejorar cierre: auditar cotizaciones y acompañar visitas','critical':'→ Coaching intensivo y revisión de pipeline'};
// Quadrant grid
const superStarName=vendors.reduce((best,v)=>v.kpis.conv_pct>best.kpis.conv_pct?v:best,vendors[0]).name;
const qg=document.getElementById('quadrant-grid');
[...vendors].sort((a,b)=>{const o={star:0,potential:1,volume:2,critical:3};return (o[a.quadrant]||3)-(o[b.quadrant]||3);}).forEach(v=>{
  const cls=v.quadrant||'critical';
  const val=v.value>0?'$'+v.value.toLocaleString('es-AR'):'--';
  const k=v.kpis;
  const isQStar=v.name===superStarName&&v.kpis.conv_pct>0;
  const qStarBanner=isQStar?'<div class="super-star-banner" style="margin:-14px -14px 6px -14px;border-radius:9px 9px 0 0">&#9819; SUPER ESTRELLA &mdash; MEJOR CONVERSIÓN &#9819;</div>':'';
  qg.innerHTML+='<div class="quadrant q-'+cls+(isQStar?' is-super-star':'')+'" style="'+(isQStar?'border:2px solid #a855f7;box-shadow:0 0 16px rgba(168,85,247,.25)':'')+'">'+qStarBanner
    +'<span class="q-label">'+QL[cls]+'</span><span class="q-axis">'+qDesc[cls]+'</span>'
    +'<div class="q-person"><strong>'+v.name+'</strong><br>'+v.total+' leads &middot; '+k.conv_pct+'% conv &middot; '+val+'</div>'
    +'<p class="q-action">'+(qAction[cls]||qAction['critical'])+'</p></div>';
});
// Vendor cards
const vg=document.getElementById('vendors-grid');
vendors.forEach(v=>{
  const isSuperStar=v.name===superStarName&&v.kpis.conv_pct>0;
  const k=v.kpis;
  const maxStage=Math.max(...v.stages.map(s=>s.count),1);
  const val=v.value>0?'$'+v.value.toLocaleString('es-AR'):'--';
  const ticket=k.ticket_avg>0?'$'+k.ticket_avg.toLocaleString('es-AR'):'--';
  const stageRows=v.stages.filter(s=>s.count>0).map(s=>{
    const pct=Math.round(s.count/v.total*100);
    const w=Math.round(s.count/maxStage*100);
    return '<div class="vc-row" style="cursor:pointer" title="Ver '+s.stage+' de '+v.name+'" onclick="filterByVendorStage(\\x27'+v.name+'\\x27,\\x27'+s.stage+'\\x27,event)"><div class="vc-dot" style="background:'+(SC[s.stage]||'#808080')+'"></div><div class="vc-sname">'+s.stage+'</div><div class="vc-bwrap"><div class="vc-bfill" style="background:'+(SC[s.stage]||'#808080')+';width:'+w+'%"></div></div><div class="vc-cnt">'+s.count+'</div><div class="vc-pct">'+pct+'%</div></div>';
  }).join('');
  const badge='<span class="badge-q '+(QC[v.quadrant]||'critical')+'">'+(QL[v.quadrant]||'CRÍTICO')+'</span>';
  const prevT=v.prev_total||0;
  const diffV=v.total-prevT;
  const diffVColor=diffV>0?'#16a34a':(diffV<0?'var(--red)':'var(--gray)');
  const diffVArrow=diffV>0?'&#9650;':(diffV<0?'&#9660;':'&mdash;');
  const diffVSign=diffV>0?'+':'';
  const superBanner=isSuperStar?'<div class="super-star-banner">&#9819; SUPER ESTRELLA &mdash; MEJOR CONVERSIÓN &#9819;</div>':'';
  vg.innerHTML+='<div class="vc'+(isSuperStar?' is-super-star':'')+'" style="cursor:pointer" onclick="filterByVendor(\\x27'+v.name+'\\x27)">'
    +superBanner
    +'<div class="vc-head"><div><div class="vc-name">'+v.name+'</div>'+badge+'</div><div style="text-align:right"><div style="display:flex;align-items:baseline;gap:8px;justify-content:flex-end"><div class="vc-total">'+v.total+'</div><div style="font-size:.95rem;font-weight:800;color:'+diffVColor+'">'+diffVArrow+' '+diffVSign+diffV+'</div></div><div class="vc-total-lbl">vs '+prevT+' en '+prevMesShort+'</div></div></div>'
    +'<div class="vc-kpis">'
    +'<div class="vk '+kpiClass(k.conv_pct,5,2)+'"><div class="vk-val">'+k.conv_pct+'%</div><div class="vk-lbl">Conversion</div><div class="vk-hint">'+k.compradores+' compradores</div></div>'
    +'<div class="vk '+kpiClassInv(k.no_resp_pct,30,15)+'"><div class="vk-val">'+k.no_resp_pct+'%</div><div class="vk-lbl">Sin Respuesta</div><div class="vk-hint">'+k.no_resp+' no responden</div></div>'
    +'<div class="vk '+kpiClass(k.calif_pct,40,20)+'"><div class="vk-val">'+k.calif_pct+'%</div><div class="vk-lbl">Calificados</div><div class="vk-hint">'+k.calificados+' en embudo</div></div>'
    +'</div>'
    +'<div class="vc-kpis2">'
    +'<div class="vk2"><div class="vk2-val">'+ticket+'</div><div class="vk2-lbl">Ticket promedio</div></div>'
    +'<div class="vk2"><div class="vk2-val" style="color:'+(k.stagnant_pct>20?'var(--red)':k.stagnant_pct>10?'var(--amber)':'var(--teal)')+'">'+k.stagnant_pct+'%</div><div class="vk2-lbl">Sin Seguimiento</div><div class="vk2-hint">'+k.stagnant+' leads</div></div>'
    +'<div class="vk2"><div class="vk2-val">'+val+'</div><div class="vk2-lbl">Valor total</div></div>'
    +'</div>'
    +'<div style="padding:6px 16px;font-size:.66rem;color:var(--muted);border-bottom:1px solid var(--gray-lt)">&#9997; <strong style="color:var(--text)">'+k.created_manual+'</strong> leads creados por ella &middot; <strong style="color:var(--text)">'+(v.total-k.created_manual)+'</strong> asignados automáticamente</div>'
    +'<div class="vc-rows">'+(stageRows||'<div style="padding:12px 16px;font-size:.74rem;color:var(--muted)">Sin leads activos</div>')+'</div></div>';
});
const fEl=document.getElementById('funnel');
stages.filter(s=>s.count>0).forEach(s=>{const g=document.createElement('div');g.className='fs';g.style.background=SC[s.name]||'#808080';g.style.flex=Math.max(s.count,1);g.title=s.name+': '+s.count+' deals';if(s.count>5)g.textContent=s.count;fEl.appendChild(g);});
const grid=document.getElementById('stages-grid');
stages.filter(s=>s.count>0).forEach(s=>{const c=SC[s.name]||'#808080';const v=s.value>0?'$'+s.value.toLocaleString('es-AR'):'--';grid.innerHTML+='<div class="sc"><div class="sc-bar" style="background:'+c+'"></div><div class="sc-nm">'+s.name+'</div><div class="sc-n">'+s.count+'</div><div class="sc-d">'+v+' &middot; '+s.pct+'%</div></div>';});
stgOpts.forEach(v=>document.getElementById('f-stage').innerHTML+='<option>'+v+'</option>');
usrOpts.forEach(v=>document.getElementById('f-user').innerHTML+='<option>'+v+'</option>');
sucOpts.forEach(v=>document.getElementById('f-suc').innerHTML+='<option>'+v+'</option>');
let view='all';
function setView(v){view=v;document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(i===0&&v==='all')||(i===1&&v==='stagnant')));document.getElementById('f-days').value=v==='stagnant'?3:'';render();}
function filterByVendor(name){document.getElementById('f-user').value=name;document.getElementById('f-stage').value='';view='all';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',i===0));document.getElementById('f-days').value='';render();document.getElementById('tbl').scrollIntoView({behavior:'smooth',block:'start'});}
function filterByVendorStage(name,stage,ev){if(ev)ev.stopPropagation();document.getElementById('f-user').value=name;document.getElementById('f-stage').value=stage;view='all';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',i===0));document.getElementById('f-days').value='';render();document.getElementById('tbl').scrollIntoView({behavior:'smooth',block:'start'});}
function exportCSV(){
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const suc=document.getElementById('f-suc').value;
  const minD=parseFloat(document.getElementById('f-days').value)||(view==='stagnant'?3:0);
  const rows=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc)).sort((a,b)=>b.value-a.value);
  const header='ID,Contacto,Deal,Etapa,Sucursal,Responsable,Creado,Dias sin act.,Valor';
  const lines=rows.map(r=>[r.id,(r.contact||r.name).replace(/,/g,' '),r.name.replace(/,/g,' '),r.stage,r.sucursal,r.user,r.created,r.days_int,r.value].join(','));
  const blob=new Blob([header+'\\n'+lines.join('\\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='deals_heaven.csv';a.click();
}
function render(){
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const suc=document.getElementById('f-suc').value;
  const minD=parseFloat(document.getElementById('f-days').value)||(view==='stagnant'?3:0);
  const onlyFollowup=(minD>0||view==='stagnant');
  const f=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc)&&(!onlyFollowup||FOLLOWUP_STAGES.includes(r.stage))).sort((a,b)=>b.value-a.value);
  document.getElementById('rc').textContent=f.length+' deals';
  const tbody=document.getElementById('tbl');
  if(!f.length){tbody.innerHTML='<tr><td colspan="9" class="nd">Sin deals con estos filtros</td></tr>';return;}
  tbody.innerHTML=f.map((r,i)=>{
    const c=SC[r.stage]||'#808080';
    const isWon=r.stage===COMPRADORES_STAGE;
    const isNoResp=r.stage===NO_RESP_STAGE_JS;
    const inFollowup=FOLLOWUP_STAGES.includes(r.stage);
    const badge=isWon?'<span class="badge b-teal">Ganado</span>':isNoResp?'<span class="badge b-gray">Sin respuesta</span>':(inFollowup&&r.days_int>=7)?'<span class="badge b-red">+7 dias</span>':(inFollowup&&r.days_int>=3)?'<span class="badge b-amber">+72h</span>':'<span class="badge b-teal">Al dia</span>';
    const dc=(isWon||isNoResp||!inFollowup)?'var(--muted)':r.days_int>=7?'var(--red)':r.days_int>=3?'var(--amber)':'var(--teal)';
    const rowBg=(isWon||isNoResp||!inFollowup)?'':r.days_int>=7?'background:rgba(206,41,57,.04)':r.days_int>=3?'background:rgba(217,119,6,.04)':'';
    const val=r.value>0?'$'+r.value.toLocaleString('es-AR'):'--';
    const nm=r.contact||r.name;
    return '<tr style="'+rowBg+'"><td style="color:var(--muted);width:36px">'+(i+1)+'</td>'
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
html = html.replace("__STAG714__", str(total_stagnant_7))    # +72h (3+ dias)
html = html.replace("__STAG14__", str(total_stagnant_7_14))  # +7 dias
html = html.replace("__CONV_PCT__", str(conv_pct))
html = html.replace("__COMPRADORES__", str(total_compradores))
html = html.replace("__NORESP_PCT__", str(noresp_pct))
html = html.replace("__NORESP_N__", str(total_no_resp))
html = html.replace("__CALIF_PCT__", str(calif_pct))
html = html.replace("__CALIF_N__", str(total_calificados))
html = html.replace("__TICKET__", fmt_money(ticket_avg))
html = html.replace("__STAG_PCT__", str(stag_pct))
html = html.replace("__AUTO_N__", str(total_auto))
html = html.replace("__AUTO_PCT__", str(auto_pct))
html = html.replace("__MANUAL_N__", str(total_manual))
html = html.replace("__MANUAL_PCT__", str(manual_pct))
html = html.replace("__MES_LABEL__", mes_label)
html = html.replace("__TOP_VENDOR__", top_vendor_name)
html = html.replace("__TOP_VENDOR_PCT__", str(top_vendor_pct))
html = html.replace("__EXTRA_CONV__", str(extra_conv))
html = html.replace("__DIFF_CONV_CLASS__", "up" if diff_conv >= 0 else "down")
html = html.replace("__DIFF_CONV_ARROW__", diff_conv_arrow)
html = html.replace("__DIFF_CONV_SIGN__", diff_conv_sign)
html = html.replace("__DIFF_CONV__", str(abs(diff_conv)))
html = html.replace("__DIFF_TICKET_CLASS__", "up" if diff_ticket >= 0 else "down")
html = html.replace("__DIFF_TICKET_ARROW__", diff_ticket_arrow)
html = html.replace("__DIAS_TRANS__", str(dias_transcurridos))
html = html.replace("__DIAS_MES__", str(dias_del_mes))
html = html.replace("__BASE_PROJ__", str(base_proj))
html = html.replace("__BASE_PROJ_VAL__", base_proj_val)
html = html.replace("__MID_PROJ__", str(mid_proj))
html = html.replace("__MID_PROJ_VAL__", mid_proj_val)
html = html.replace("__RESCUE_EXTRA__", str(rescue_extra))
html = html.replace("__RESCUE_VAL_EXTRA__", rescue_val_extra)
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
html = html.replace("__COMPRADORES_STAGE__", json.dumps(COMPRADORES_STAGE)[1:-1])
html = html.replace("__NO_RESP_STAGE__", json.dumps(NO_RESP_STAGE)[1:-1])
html = html.replace("__FOLLOWUP_STAGES_JSON__", json.dumps(list(FOLLOWUP_STAGES), ensure_ascii=False))
# Canal de Origen
html = html.replace("__CHANNELS_ROWS__", _ch_rows_html)
html = html.replace("__CHANNEL_INSIGHT__", _channel_insight)
html = html.replace("__UNCLASSIFIED_ALERT__", _unclassified_alert)
# Velocidad de Respuesta
html = html.replace("__RESP_AVG_STR__", _resp_avg_str)
html = html.replace("__RESP_AVG_COLOR__", _resp_avg_color)
html = html.replace("__RESP_LT5_PCT__", str(_resp_lt5_pct))
html = html.replace("__RESP_LT5_N__", str(_resp_lt5_n))
html = html.replace("__RESP_LT5_COLOR__", _resp_lt5_color)
html = html.replace("__RESP_LT1H_PCT__", str(_resp_lt1h_pct))
html = html.replace("__RESP_LT1H_N__", str(_resp_lt1h_n))
html = html.replace("__RESP_LT1H_COLOR__", _resp_lt1h_color)
html = html.replace("__RESP_COLD_N__", str(_resp_cold_n))
html = html.replace("__RESP_COLD_PCT__", str(_resp_cold_pct))
html = html.replace("__VENDOR_RESP_ROWS__", _vendor_resp_html)

with open("index_legacy.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index_legacy.html (dashboard clásico) generado.")
print("Leads:", total_leads, "| Valor:", fmt_money(total_value), "| Sin Seguimiento:", total_stagnant_7)


# ============================================================================
#  NUEVO PANEL REACT — genera index.html + panel.html autocontenidos
#  Lee panel.css, Icons.jsx, Panel.jsx, Views.jsx del mismo directorio y
#  produce un HTML con window.PANEL_DATA inyectado desde datos vivos de Kommo.
# ============================================================================
import json, os as _os, re as _re, glob as _glob

_SCRIPT_DIR = _os.path.dirname(_os.path.abspath(__file__))
_MESES_ES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio",
             "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
_VENDOR_COLORS = {
    "Isabel Robledo": "#00B5AD", "Maria Flores": "#2E6FE0",
    "Mirian Salazar": "#7A5AF0", "Carola Chavez": "#D98300", "Jonathan Monje": "#159A57",
}
_CH_ICON_MAP = {
    "Carga manual vendedora": "✍", "Automático (bot)": "⚙", "Walk-in (Tienda)": "🚶",
    "WhatsApp": "💬", "Facebook": "👥", "Instagram": "📷", "Web": "🌐", "Otros": "📦",
}

def _fmt_resp_plain(minutes):
    if minutes is None: return "—"
    if minutes < 60: return f"{int(round(minutes))} min"
    if minutes < 1440: return f"{minutes/60:.1f} h"
    return f"{int(round(minutes/1440))} d"

# --- team ---
_team_panel = []
for _ventry in vendors_json_list:
    _vname = _ventry["name"]
    _vd_p = vendor_data[_vname]
    _vt = _ventry["total"]
    _vc = _ventry["kpis"]["compradores"]
    _vr = _ventry["kpis"]["no_resp"]
    _vq = _ventry["kpis"]["calificados"]
    _vs = _ventry["kpis"]["stagnant"]
    _vtick = _ventry["kpis"]["ticket_avg"]
    _vrespd = next(((a,b,c,d,e,f) for (a,b,c,d,e,f) in _vresp_list if a == _vname), (_vname, None, 0, 0, 0, 0))
    _, _vavg, _vlt24, _vslow, _vnever, _ = _vrespd
    _vstatus = "red" if (_vnever > 10 or (_vavg is not None and _vavg >= 4320)) else (
               "amber" if (_vavg is None or _vavg >= 1440) else "green")
    # Kommo user names may include sucursal: "Nombre - Sucursal"
    if " - " in _vname:
        _clean_name, _suc_from_name = _vname.split(" - ", 1)
    else:
        _clean_name, _suc_from_name = _vname, None
    _ini = "".join(p[0].upper() for p in _clean_name.split()[:2])
    _suc = vendor_primary_suc.get(_vname, None) or _suc_from_name or "Sin sucursal"
    _agendado_c = _vd_p["stages"].get(_q2 or "Agendado / Visita", 0)
    _item = {
        "ini": _ini, "name": _clean_name, "suc": _suc,
        "color": _VENDOR_COLORS.get(_clean_name, _VENDOR_COLORS.get(_vname, "#6B7785")), "photo": "",
        "leads": _vt, "prevLeads": vendor_leads_prev.get(_vname, 0),
        "cierres": _vc, "conv": round(_vc / _vt * 100) if _vt > 0 else 0,
        "ticket": _vtick, "value": int(_vd_p["value"]),
        "calif": _vq, "califPct": round(_vq / _vt * 100) if _vt > 0 else 0,
        "noResp": _vr, "noRespPct": round(_vr / _vt * 100) if _vt > 0 else 0,
        "agendado": _agendado_c,
        "u24": _vlt24, "promTxt": _fmt_resp_plain(_vavg),
        "tarde": _vslow, "nunca": _vnever, "backlog": _vs,
        "metaCierres": 0, "metaMonto": 0, "v": _vstatus,
    }
    if vendor_leads_prev.get(_vname, 0) == 0 and _vt > 0:
        _item["nuevo"] = True
    _team_panel.append(_item)

# --- stagesGlobal ---
_STAGE_COLORS_P = {
    "Nueva consulta": "#27313F", "Interesado": "#2E6FE0",
    "Cotización enviada": "#7A4AD9", "Agendado / Visita": "#D98300",
    "Compradores": "#159A57", "No Responden": "#646E7B",
}
_stages_global_panel = []
for _sn in STAGE_ORDER:
    _cnt = stage_counts.get(_sn, 0)
    _stages_global_panel.append({
        "name": _sn, "count": _cnt,
        "pct": round(_cnt / total_leads * 100) if total_leads else 0,
        "color": _STAGE_COLORS_P.get(_sn, "#9AA3AF"),
    })
for _sn in stage_counts:
    if _sn not in STAGE_ORDER:
        _cnt = stage_counts[_sn]
        _stages_global_panel.append({
            "name": _sn, "count": _cnt,
            "pct": round(_cnt / total_leads * 100) if total_leads else 0,
            "color": "#9AA3AF",
        })

# --- channels ---
_channels_panel = []
for _cn, _cd in _ch_rows_data:
    _cl = _cd["leads"]; _cc = _cd["compradores"]; _cv = _cd["value"]
    _cpct = round(_cl / total_leads * 100) if total_leads else 0
    _cconv = round(_cc / _cl * 100) if _cl else 0
    _ctick = int(_cv / _cc) if _cc > 0 else 0
    _ccls = "green" if _cn == _ch_best_name else ("red" if _cn == _ch_worst_name else "muted")
    _channels_panel.append({
        "ic": _CH_ICON_MAP.get(_cn, "📦"), "name": _cn,
        "leads": _cl, "pct": _cpct, "cierres": _cc,
        "conv": _cconv, "ticket": _ctick, "pipeline": int(_cv), "cls": _ccls,
    })

# --- duplicates by contact name ---
_contact_groups = defaultdict(list)
for _cr in all_rows:
    _cn = (_cr.get("contact") or "").strip()
    if _cn and _cn.lower() not in ("", "sin nombre", "sin contacto"):
        _contact_groups[_cn].append(_cr)

_dup_groups = []
for _cn, _crow_list in _contact_groups.items():
    if len(_crow_list) > 1:
        _dup_groups.append({
            "phone": _cn,
            "n_fichas": len(_crow_list),
            "fichas": [{"name": r["name"]} for r in _crow_list],
            "rows": _crow_list,
        })
_dup_groups.sort(key=lambda g: -g["n_fichas"])
total_dup_groups = len(_dup_groups)
total_dup_fichas = sum(g["n_fichas"] for g in _dup_groups)
_resp_never_n = sum(1 for lead in leads if lead["id"] not in _first_human_ev)

# --- metrics ---
_sin_suc_n = sum(1 for r in all_rows
                 if not (r.get("sucursal") or "").strip()
                 or (r.get("sucursal") or "").strip().lower() == "sin sucursal")
_open_rows_p = [r for r in all_rows if r.get("stage") in FOLLOWUP_STAGES]
_open_sin_valor_p = sum(1 for r in _open_rows_p if not r.get("value"))
_metrics_panel = {
    "noResp": total_no_resp,
    "noRespPct": round(total_no_resp / total_leads * 100) if total_leads else 0,
    "backlog": total_stagnant_7,
    "backlogPct": round(total_stagnant_7 / total_leads * 100) if total_leads else 0,
    "criticos7d": total_stagnant_7_14,
    "nuncaTocados": _resp_never_n,
    "sinSucursalFichas": _sin_suc_n,
    "sinSucursalPct": round(_sin_suc_n / total_leads * 100) if total_leads else 0,
    "abiertosSinValor": _open_sin_valor_p,
    "openTotal": len(_open_rows_p),
    "duplicadosTel": total_dup_groups,
    "duplicadosFichas": total_dup_fichas,
    "interesado": stage_counts.get(_q1 or "Interesado", 0),
    "agendado": stage_counts.get(_q2 or "Agendado / Visita", 0),
}

_backlog_candidates = sorted(
    (r for r in all_rows if r.get("stage") in FOLLOWUP_STAGES and r.get("days_int", 0) >= 3),
    key=lambda r: -r.get("days_int", 0)
)[:50]
_backlog_leads_panel = [
    {
        "id": r["id"],
        "c": r["contact"] or r["name"],
        "e": r["stage"],
        "r": r["user"].split(" - ", 1)[0] if " - " in r["user"] else r["user"],
        "suc": r["sucursal"],
        "d": r["days_int"],
        "v": r["value"],
        "nh": r.get("nh", False),
    }
    for r in _backlog_candidates
]

# --- weekly closures (real, by vendor clean name, 5 weeks) ---
_weekly_closures_raw = defaultdict(lambda: [0, 0, 0, 0, 0])
for _wr in all_rows:
    if _wr.get("stage") == COMPRADORES_STAGE and _wr.get("updated_at"):
        _udt = datetime.datetime.fromtimestamp(_wr["updated_at"])
        _day = _udt.day
        _wi = 0 if _day <= 7 else (1 if _day <= 14 else (2 if _day <= 21 else (3 if _day <= 28 else 4)))
        _clean_v = _wr["user"].split(" - ", 1)[0] if " - " in _wr["user"] else _wr["user"]
        _weekly_closures_raw[_clean_v][_wi] += 1
_weekly_closures_panel = {k: list(v) for k, v in _weekly_closures_raw.items()}

# --- alert badge count (mirrors ViewAlertas JS logic) ---
_mom_pct_p = round((total_leads - total_leads_prev) / total_leads_prev * 100) if total_leads_prev else 0
_open_pct_al = round(_open_sin_valor_p / len(_open_rows_p) * 100) if _open_rows_p else 0
_worst_conv_al = min(
    (_v for _v in _team_panel if _v.get("cierres", 0) > 0),
    key=lambda _v: _v.get("conv", 100), default=None
)
_high_no_resp_al = [_v for _v in _team_panel if _v.get("noRespPct", 0) > 50]
_big_never_al = any(_v.get("nunca", 0) > 20 for _v in _team_panel)
_man_ch_al = next((c for c in _channels_panel if c.get("cls") == "green"), {})
_bot_ch_al = next((c for c in _channels_panel if c.get("cls") == "red"), {})
_mult_al = round(_man_ch_al.get("conv", 0) / max(_bot_ch_al.get("conv", 1), 1)) if _man_ch_al.get("conv") and _bot_ch_al.get("conv") else 0
_alert_badge_n = 0
if _open_pct_al > 30: _alert_badge_n += 1
if _worst_conv_al is not None and _worst_conv_al.get("conv", 100) < 5: _alert_badge_n += 1
if _high_no_resp_al: _alert_badge_n += 1
if _mom_pct_p < -5: _alert_badge_n += 1
if _big_never_al: _alert_badge_n += 1
if _mult_al >= 5: _alert_badge_n += 1
if _metrics_panel["backlogPct"] > 20: _alert_badge_n += 1
if _alert_badge_n == 0: _alert_badge_n = 1  # always show badge (green "no issues" card)

# --- funnel2 (donut breakdown) ---
_adv_stages_p = [_q1 or "Interesado", _fs3 or "Cotización enviada", _q2 or "Agendado / Visita"]
_funnel2_panel = [
    {"n": "Leads del mes", "v": total_leads, "c": "#27313F"},
    {"n": "Sin respuesta", "v": total_no_resp, "c": "#646E7B"},
    {"n": "Calificados", "v": total_calificados, "c": "#2E6FE0"},
    {"n": "En etapas avanz.", "v": sum(stage_counts.get(s, 0) for s in _adv_stages_p), "c": "#00B5AD"},
    {"n": "Compradores", "v": total_compradores, "c": "#159A57"},
]

# --- funnel (bar chart) ---
_funnel_panel = [{"name": sn, "count": stage_counts.get(sn, 0)} for sn in STAGE_ORDER]

# --- stagesByV ---
_stages_by_v_panel = {}
for _vn2, _vd2 in vendor_data.items():
    _sbv = [[s, _vd2["stages"][s]] for s in STAGE_ORDER if _vd2["stages"].get(s, 0) > 0]
    for _s2 in _vd2["stages"]:
        if _s2 not in STAGE_ORDER and _vd2["stages"][_s2] > 0:
            _sbv.append([_s2, _vd2["stages"][_s2]])
    _clean_key = _vn2.split(" - ", 1)[0] if " - " in _vn2 else _vn2
    _stages_by_v_panel[_clean_key] = _sbv

# --- archive list helper ---
def _build_archive_list_new():
    lst = []
    for _f in sorted(_glob.glob(_os.path.join(_SCRIPT_DIR, "panel_????_??.html")), reverse=True):
        _mm = _re.match(r'.*[/\\]panel_(\d{4})_(\d{2})\.html$', _f)
        if _mm:
            _ay, _am = int(_mm.group(1)), int(_mm.group(2))
            lst.append({"label": f"{_MESES_ES[_am]} {_ay}", "url": _os.path.basename(_f)})
    return lst

# --- build PANEL_DATA ---
_pipeline_total_p = int(total_value)
_ticket_avg_p = int(_pipeline_total_p / total_compradores) if total_compradores else 0
_fecha_str_p = now_dt.strftime("%d/%m %H:%M")

panel_data = {
    "month": mes_label_map[now_dt.month],
    "year": now_dt.year,
    "prevMonth": mes_label_map[prev_month],
    "curDay": now_dt.day,
    "daysInMonth": calendar.monthrange(now_dt.year, now_dt.month)[1],
    "fecha": _fecha_str_p,
    "archives": _build_archive_list_new(),
    "global": {
        "leads": total_leads,
        "prevLeads": total_leads_prev,
        "cierres": total_compradores,
        "pipeline": _pipeline_total_p,
        "ticket": _ticket_avg_p,
    },
    "funnel2": _funnel2_panel,
    "stagesGlobal": _stages_global_panel,
    "origin": {"manual": total_manual, "manualPct": manual_pct, "auto": total_auto, "autoPct": auto_pct},
    "channels": _channels_panel,
    "metrics": _metrics_panel,
    "leadsMomPct": _mom_pct_p,
    "team": _team_panel,
    "funnel": _funnel_panel,
    "nav": [
        {"id": "resumen", "label": "Resumen"},
        {"id": "equipo", "label": "Equipo", "badge": str(len(_team_panel))},
        {"id": "seguimiento", "label": "Seguimiento", "badge": str(total_stagnant_7)},
        {"id": "alertas", "label": "Alertas", "badge": str(_alert_badge_n)},
        {"id": "analisis", "label": "Análisis IA"},
        {"id": "conversion", "label": "Conversión"},
        {"id": "semanal", "label": "Semanal"},
        {"id": "sucursales", "label": "Sucursales"},
        {"id": "proyeccion", "label": "Proyección"},
        {"id": "datos", "label": "Datos"},
    ],
    "backlogLeads": _backlog_leads_panel,
    "weeklyClosures": _weekly_closures_panel,
    "stagesByV": _stages_by_v_panel,
    "dups": [
        {
            "phone": g["phone"],
            "n": g["n_fichas"],
            "fichas": [f["name"] for f in g["fichas"] if f.get("name")],
            "vends": sorted({r["user"] for r in g["rows"] if r.get("user")}),
            "etapas": sorted({r["stage"] for r in g["rows"] if r.get("stage")}),
        }
        for g in _dup_groups[:40]
    ],
}

# --- AI analysis baking (requires ANTHROPIC_API_KEY env var / GitHub Secret) ---
def _call_claude_api(_prompt, _max_tok=700):
    _key = _os.environ.get("ANTHROPIC_API_KEY", "")
    if not _key:
        return None
    _payload = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": _max_tok,
        "messages": [{"role": "user", "content": _prompt}]
    }).encode("utf-8")
    _req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=_payload,
        headers={"x-api-key": _key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    )
    try:
        with urllib.request.urlopen(_req, timeout=30) as _r:
            _resp = json.loads(_r.read())
            _raw = _resp["content"][0]["text"]
            try:
                return json.loads(_raw.strip())
            except Exception:
                _m2 = _re.search(r'\{[\s\S]*\}', _raw)
                if _m2:
                    return json.loads(_m2.group(0))
    except Exception as _e:
        print(f"  ⚠ Claude API: {_e}")
    return None

_G_ai = panel_data["global"]
_M_ai = _metrics_panel
_man_ch = next((c for c in _channels_panel if c.get("cls") == "green"), {})
_bot_ch = next((c for c in _channels_panel if c.get("cls") == "red"), {})

_team_lines_ai = "\n".join(
    f"{v['name']} (sucursal {v['suc']}): {v['leads']} leads (mes previo {v['prevLeads']}), "
    f"{v['cierres']} cierres, {round(v['cierres']/v['leads']*100) if v['leads'] else 0}% conv, "
    f"{v['noResp']} no-responden ({v['noRespPct']}%), {v['backlog']} backlog, "
    f"{v.get('nunca',0)} nunca-tocados, {v['u24']}% <24h, ticket Bs {v['ticket']}"
    for v in _team_panel
)
_br_ai = {}
for _vai in _team_panel:
    _bai = _br_ai.setdefault(_vai['suc'], dict(leads=0, prev=0, cierres=0, value=0, n=0))
    _bai['leads'] += _vai['leads']; _bai['prev'] += _vai['prevLeads']
    _bai['cierres'] += _vai['cierres']; _bai['value'] += _vai['value']; _bai['n'] += 1
_branch_lines_ai = "\n".join(
    f"{_s}: {_b['n']} vendedora(s), {_b['leads']} leads (mes previo {_b['prev']}, "
    f"{round((_b['leads']-_b['prev'])/(_b['prev'] or 1)*100)}%), {_b['cierres']} cierres, "
    f"{(_b['cierres']/_b['leads']*100 if _b['leads'] else 0):.1f}% conv, pipeline Bs {_b['value']}"
    for _s, _b in _br_ai.items()
)

_json_rule_ai = (
    'Responde SOLO JSON válido, sin texto extra, forma exacta:\n'
    '{"resumen":"2-3 frases","hallazgos":[{"t":"hallazgo con números","sev":"alto|medio|bajo"}],'
    '"recomendaciones":[{"accion":"qué hacer","impacto":"resultado esperado"}]}\n'
    'Máximo 4 hallazgos y 3 recomendaciones. Español de Bolivia, directo, con nombres y cifras.\n'
    'REGLAS ANTI-REPETICIÓN: NO menciones totales globales salvo que sean indispensables. '
    'Quédate ESTRICTAMENTE en tu dominio. Aporta un ángulo que solo tu especialidad vería.'
)
_ctx_ai = (
    f"Heaven Colchones (Bolivia), mes {mes_label_map[now_dt.month]} {now_dt.year}. Moneda Bs.\n"
    f"Global: {_G_ai['leads']} leads (mes previo {_G_ai['prevLeads']}, "
    f"{round((_G_ai['leads']-_G_ai['prevLeads'])/(_G_ai['prevLeads'] or 1)*100)}% MoM), "
    f"{_G_ai['cierres']} cierres, conversión {(_G_ai['cierres']/_G_ai['leads']*100 if _G_ai['leads'] else 0):.1f}%, "
    f"pipeline Bs {_G_ai['pipeline']}, ticket Bs {_G_ai['ticket']}.\n"
    f"\"No responden\" {_M_ai['noResp']} ({_M_ai['noRespPct']}%). "
    f"Sin seguimiento +72h: {_M_ai['backlog']} ({_M_ai['backlogPct']}%). "
    f"Nunca tocados: {_M_ai['nuncaTocados']}.\nCanales: "
    + "; ".join(f"{c['name']} {c['leads']} leads/{c['conv']}% conv/{c['cierres']} cierres" for c in _channels_panel)
    + f"\nRoll-up sucursales:\n{_branch_lines_ai}\nEquipo:\n{_team_lines_ai}"
)

_agent_prompts_ai = {
    "crm": (
        "Eres analista de OPERACIÓN DE CRM (Kommo). Tu único tema es la HIGIENE del pipeline: "
        "velocidad de primera respuesta (% <24h por vendedora), backlog +72h, leads \"nunca tocados\", "
        "\"no responden\" y calidad de datos (deals sin valor). NO opines de ventas ni dinero. "
        "Señala QUIÉN tiene el peor hábito de seguimiento y qué fichas rescatar primero.\n"
        f"Datos:\n{_team_lines_ai}\n"
        f"Backlog total {_M_ai['backlog']} (+72h), nunca tocados {_M_ai['nuncaTocados']}, "
        f"\"no responden\" {_M_ai['noResp']}, deals sin valor {_M_ai['abiertosSinValor']}.\n{_json_rule_ai}"
    ),
    "ventas": (
        "Eres analista de PERFORMANCE DE VENTAS. Tu único tema es el RESULTADO comercial: "
        "conversión por vendedora (compradores/leads), ticket promedio, pipeline en Bs y dónde está el dinero. "
        "NO hables de disciplina de CRM ni canales de origen. Compara vendedoras por eficiencia "
        "(no por volumen) y di quién deja dinero sobre la mesa.\n"
        f"Datos:\n{_team_lines_ai}\n"
        f"Global: {_G_ai['cierres']} cierres, {(_G_ai['cierres']/_G_ai['leads']*100):.1f}% conv, "
        f"pipeline Bs {_G_ai['pipeline']}, ticket Bs {_G_ai['ticket']}.\n{_json_rule_ai}"
    ),
    "comportamiento": (
        "Eres analista de COMPORTAMIENTO y CANALES. Tu único tema: por qué entran y por qué se enfrían los leads. "
        f"{_man_ch.get('name','Manual')} ({_man_ch.get('leads',0)} leads, {_man_ch.get('conv',0)}% conv, "
        f"{_man_ch.get('cierres',0)} cierres) vs {_bot_ch.get('name','Bot')} ({_bot_ch.get('leads',0)} leads, "
        f"{_bot_ch.get('conv',0)}% conv, {_bot_ch.get('cierres',0)} cierres). "
        f"El {_M_ai['noRespPct']}% termina en \"no responden\". NO hables de metas individuales. "
        "Explica el PATRÓN: qué canal/etapa pierde clientes y cómo reactivarlos.\n"
        "Canales: " + "; ".join(c['name'] + " " + str(c['leads']) + "/" + str(c['conv']) + "%/" + str(c['cierres']) for c in _channels_panel) + ". "
        + f"No-responden {_M_ai['noResp']} ({_M_ai['noRespPct']}%).\n{_json_rule_ai}"
    ),
    "sintesis": (
        "Eres el DIRECTOR COMERCIAL. Combina los análisis (CRM, ventas, comportamiento) en UN plan "
        "priorizado de 3 decisiones para la reunión de gerencia, ordenadas por impacto en Bs. "
        "Cada decisión debe nombrar responsable y meta concreta.\n"
        f"{_ctx_ai}\n"
        'Responde SOLO JSON: {"resumen":"3 frases con el veredicto del mes",'
        '"hallazgos":[{"t":"prioridad con número","sev":"alto|medio|bajo"}],'
        '"recomendaciones":[{"accion":"iniciativa con responsable","impacto":"meta concreta en Bs o cierres"}]} '
        "Máx 3 y 3. Español de Bolivia."
    ),
}

_top_v_ai = max(_team_panel, key=lambda v: v['cierres'], default={})
_worst_v_ai = min(
    (v for v in _team_panel if v.get('cierres', 0) > 0 and v.get('leads', 0) > 0),
    key=lambda v: v['cierres'] / v['leads'],
    default={}
)
_diag_prompt_ai = (
    f"Eres analista comercial senior de Heaven Colchones (Bolivia). Analiza el mes "
    f"{mes_label_map[now_dt.month]} {now_dt.year} y responde SOLO con JSON válido, sin texto extra:\n"
    '{"titular":"frase contundente de máx 11 palabras","diagnostico":"2-3 frases con insight central y números",'
    '"palancas":["acción 1","acción 2","acción 3"],"riesgo":"el mayor riesgo en 1 frase"}\n'
    f"Datos (Bs): Leads {_G_ai['leads']} (mes anterior {_G_ai['prevLeads']}, "
    f"{round((_G_ai['leads']-_G_ai['prevLeads'])/(_G_ai['prevLeads'] or 1)*100)}%). "
    f"Cierres {_G_ai['cierres']}, conversión {(_G_ai['cierres']/_G_ai['leads']*100 if _G_ai['leads'] else 0):.1f}%. "
    f"Pipeline Bs {_G_ai['pipeline']}, ticket Bs {_G_ai['ticket']}. "
    f"\"No responden\" {_M_ai['noResp']} ({_M_ai['noRespPct']}%). "
    f"Sin seguimiento +72h: {_M_ai['backlog']} ({_M_ai['backlogPct']}%). "
    f"Canal manual convierte {_man_ch.get('conv',0)}% vs {_bot_ch.get('conv',0)}% bot.\n"
    f"Equipo:\n{_team_lines_ai}\n"
    f"Top: {_top_v_ai.get('name','—')}. Más débil en conversión: {_worst_v_ai.get('name','—')}. "
    "Sé directo, específico con nombres y números, español de Bolivia."
)

_ai_agents_baked = {}
_ai_diagnostico_baked = None
if _os.environ.get("ANTHROPIC_API_KEY"):
    print("  Generando análisis IA con Claude (Haiku)...")
    for _aid_k, _aprompt_k in _agent_prompts_ai.items():
        _res_k = _call_claude_api(_aprompt_k)
        if _res_k:
            _ai_agents_baked[_aid_k] = _res_k
            print(f"    ✓ Agente {_aid_k}")
        else:
            print(f"    ✗ Agente {_aid_k} sin resultado")
    _ai_diagnostico_baked = _call_claude_api(_diag_prompt_ai)
    print(f"    {'✓' if _ai_diagnostico_baked else '✗'} Diagnóstico")
else:
    print("  ⚠ ANTHROPIC_API_KEY no configurado — análisis IA omitido (agrega el secret en GitHub)")

panel_data["ai_agents"] = _ai_agents_baked
panel_data["ai_diagnostico"] = _ai_diagnostico_baked

# --- Read source files ---
def _read_src(name):
    path = _os.path.join(_SCRIPT_DIR, name)
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"  ⚠ {name} no encontrado en {_SCRIPT_DIR}")
        return ""

_css_src = _read_src("panel.css")
_icons_jsx = _read_src("Icons.jsx")
_panel_jsx = _read_src("Panel.jsx")
_views_jsx = _read_src("Views.jsx")

# --- Archive old panel.html / index.html if they belong to a different month ---
_archive_saved_p = None
for _target_p in ["panel.html", "index.html"]:
    _tpath_p = _os.path.join(_SCRIPT_DIR, _target_p)
    if not _os.path.exists(_tpath_p):
        continue
    try:
        with open(_tpath_p, encoding="utf-8") as _ef:
            _ec = _ef.read()
        _my = _re.search(r'"year"\s*:\s*(\d{4})', _ec)
        _mm2 = _re.search(r'"month"\s*:\s*"([^"]+)"', _ec)
        if _my and _mm2:
            _oy = int(_my.group(1))
            _om_name = _mm2.group(1)
            _MES_NUM2 = {v: k for k, v in mes_label_map.items()}
            _om = _MES_NUM2.get(_om_name, 0)
            if _oy and _om and (_oy != now_dt.year or _om != now_dt.month):
                _aname = f"panel_{_oy}_{_om:02d}.html"
                _apath = _os.path.join(_SCRIPT_DIR, _aname)
                if not _os.path.exists(_apath):
                    with open(_apath, "w", encoding="utf-8") as _af:
                        _af.write(_ec)
                    _archive_saved_p = _aname
                    print(f"Histórico guardado: {_aname}")
                    break
    except Exception as _e:
        print(f"Aviso: no se pudo archivar {_target_p} ({_e})")

# Update archives list after archiving (new file may have just been created)
panel_data["archives"] = _build_archive_list_new()
_panel_data_json = json.dumps(panel_data, ensure_ascii=False)

# --- Compile JSX → plain JS using Node/Babel on the runner ---
import subprocess as _sp, tempfile as _tf, os as _os2

_COMPILE_SCRIPT = r"""
const babel = require('@babel/core');
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const result = babel.transformSync(src, {
  presets: [['@babel/preset-react', {runtime:'classic'}]],
  filename: 'panel.jsx'
});
process.stdout.write(result.code);
"""

def _compile_jsx(src, label):
    tmp_jsx = tmp_script = None
    try:
        with _tf.NamedTemporaryFile(mode='w', suffix='.jsx', delete=False, dir=_SCRIPT_DIR) as f:
            f.write(src)
            tmp_jsx = f.name
        with _tf.NamedTemporaryFile(mode='w', suffix='.js', delete=False, dir=_SCRIPT_DIR) as f:
            f.write(_COMPILE_SCRIPT)
            tmp_script = f.name
        r = _sp.run(
            ["node", tmp_script, tmp_jsx],
            capture_output=True,
            timeout=60,
            cwd=_SCRIPT_DIR
        )
        if r.returncode == 0:
            print(f"  JSX compilado: {label}")
            return r.stdout.decode("utf-8")
        else:
            print(f"  ⚠ Babel falló para {label}: {r.stderr.decode()[:300]}")
    except Exception as e:
        print(f"  ⚠ No se pudo compilar {label}: {e}")
    finally:
        for _p in (tmp_jsx, tmp_script):
            if _p:
                try: _os2.unlink(_p)
                except: pass
    return None

# Try to install @babel/core + preset-react if not present
def _ensure_babel():
    r = _sp.run(["node", "-e", "require('@babel/core')"], capture_output=True, cwd=_SCRIPT_DIR)
    if r.returncode != 0:
        print("  Instalando @babel/core @babel/preset-react...")
        _sp.run(["npm", "install", "--no-save", "@babel/core", "@babel/preset-react"],
                capture_output=True, cwd=_SCRIPT_DIR)

_ensure_babel()
_icons_js = _compile_jsx(_icons_jsx, "Icons.jsx")
_panel_js  = _compile_jsx(_panel_jsx,  "Panel.jsx")
_views_js  = _compile_jsx(_views_jsx,  "Views.jsx")

# Fall back to Babel-in-browser if compilation failed
_use_babel_cdn = not (_icons_js and _panel_js and _views_js)
if _use_babel_cdn:
    print("  ⚠ Usando Babel CDN como fallback")
    _icons_js  = _icons_jsx
    _panel_js  = _panel_jsx
    _views_js  = _views_jsx
    _script_type = 'type="text/babel"'
    _babel_cdn = '<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.0/babel.min.js" crossorigin="anonymous"></script>'
else:
    _script_type = ""
    _babel_cdn = ""

if _use_babel_cdn:
    # Babel CDN fallback: separate script tags with type="text/babel"
    _scripts_block = f"""<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.0/babel.min.js" crossorigin="anonymous"></script>
<script type="text/babel">
{_icons_js}
</script>
<script type="text/babel">
{_panel_js}
</script>
<script type="text/babel">
{_views_js}
</script>
<script type="text/babel">
(function() {{
  var el = document.getElementById("_loading");
  if (el) el.remove();
  try {{
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(window.Panel));
  }} catch(e) {{
    document.getElementById("root").innerHTML = '<p style="font-family:sans-serif;color:red;padding:20px">Error: ' + e.message + '</p>';
  }}
}})();
</script>"""
else:
    # Pre-compiled JS: single script block with full error handling
    _scripts_block = f"""<script>
(function() {{
  var _root = document.getElementById("root");
  function _err(msg) {{ _root.innerHTML = '<p style="font-family:sans-serif;color:red;padding:20px">Error: ' + msg + '</p>'; }}
  if (typeof React === 'undefined') {{ _err('React CDN no cargó'); return; }}
  try {{
{_icons_js}
  }} catch(e) {{ _err('Icons: ' + e.message); return; }}
  try {{
{_panel_js}
  }} catch(e) {{ _err('Panel: ' + e.message); return; }}
  try {{
{_views_js}
  }} catch(e) {{ _err('Views: ' + e.message); return; }}
  var el = document.getElementById("_loading");
  if (el) el.remove();
  try {{
    ReactDOM.createRoot(_root).render(React.createElement(window.Panel));
  }} catch(e) {{ _err('Mount: ' + e.message); }}
}})();
</script>"""

_html_out = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Heaven Colchones · Panel Comercial — {mes_label}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>{_css_src}</style>
<script>(function(){{try{{var t=localStorage.getItem('heaven_theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}}catch(e){{}}}})()</script>
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"><p id="_loading" style="font-family:sans-serif;padding:20px;color:#888">Cargando panel...</p></div>
<script>
window.PANEL_DATA={_panel_data_json};
window.fmtMoney=(n)=>"Bs "+Math.round(n).toLocaleString("en-US");
window.fmtK=(n)=>n>=1000?"Bs "+(n/1000).toFixed(n>=100000?0:1)+"k":"Bs "+Math.round(n);
window.convPct=(v)=>v&&v.leads?+(v.cierres/v.leads*100).toFixed(1):0;
</script>
{_scripts_block}
</body>
</html>"""

if _args.out:
    _out_files = [_args.out]
else:
    _out_files = ["panel.html", "index.html"]

for _out_name in _out_files:
    with open(_os.path.join(_SCRIPT_DIR, _out_name), "w", encoding="utf-8") as _of:
        _of.write(_html_out)

print(f"{', '.join(_out_files)} (React panel) generados — {total_leads} leads, {total_compradores} cierres.")
if _archive_saved_p:
    print(f"  → Histórico guardado: {_archive_saved_p}")
# ============================================================================
