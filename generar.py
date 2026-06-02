import urllib.request
import urllib.parse
import urllib.error
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

def api_get(path, params=None, _retries=4):
    url = BASE_URL + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    _last = None
    for _attempt in range(_retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            # 429 (rate limit) y 5xx son transitorios -> reintentar con backoff
            if e.code in (429, 500, 502, 503, 504) and _attempt < _retries - 1:
                _wait = 2 ** _attempt  # 1s, 2s, 4s, 8s
                print(f"  ⚠ {path} HTTP {e.code}, reintento en {_wait}s...")
                time.sleep(_wait)
                _last = e
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            if _attempt < _retries - 1:
                _wait = 2 ** _attempt
                print(f"  ⚠ {path} error de red ({e}), reintento en {_wait}s...")
                time.sleep(_wait)
                _last = e
                continue
            raise
    if _last:
        raise _last

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

def fetch_compradores_mes(status_id, from_ts, to_ts=None):
    """Leads actualmente en Compradores, actualizados (cerrados) en el período dado."""
    leads_out = []
    page = 1
    while True:
        param_list = [
            ("limit", 250), ("page", page), ("with", "contacts"),
            ("filter[updated_at][from]", from_ts),
            ("filter[statuses][][id]", status_id),
        ]
        if to_ts:
            param_list.append(("filter[updated_at][to]", to_ts))
        try:
            data = api_get("/leads", param_list)
        except Exception:
            break
        batch = (data.get("_embedded") or {}).get("leads", [])
        if not batch:
            break
        leads_out.extend(batch)
        if "next" not in data.get("_links", {}):
            break
        page += 1
        time.sleep(0.2)
    return leads_out

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
_fs1 = _find_stage(STAGE_ORDER, ["nueva consulta","nueva","consult"], None)
_fs2 = _find_stage(STAGE_ORDER, ["interesado","interest"], None)
_fs3 = _find_stage(STAGE_ORDER, ["cotiz","quote","presupuest"], None)
_fs4 = _find_stage(STAGE_ORDER, ["agend","visit","cita","appointment"], None)
FOLLOWUP_STAGES    = set(filter(None, [_fs1, _fs2, _fs3, _fs4, COMPRADORES_STAGE]))
# Etapas "avanzadas": si un lead llegó aquí, ALGUIEN lo trabajó (lo movió de etapa),
# aunque Kommo registre el cambio como hecho por el bot (created_by=0). Por eso un
# lead en estas etapas NO se considera "sin gestión humana" aunque no tenga evento
# humano explícito.
ADVANCED_STAGES    = set(filter(None, [_q1, _fs3, _q2, COMPRADORES_STAGE]))
print("Stage cierre:", COMPRADORES_STAGE, "| No-resp:", NO_RESP_STAGE, "| Calificados:", QUALIFIED_STAGES)
print("Etapas seguimiento:", FOLLOWUP_STAGES)
print("Etapas avanzadas (=gestionado):", ADVANCED_STAGES)
_compradores_sid = next((k for k, v in stage_map.items() if v == COMPRADORES_STAGE), None)

print("Obteniendo usuarios...")
users_raw = fetch_users()
user_map = {u["id"]: u.get("name", "Desconocido") for u in users_raw}

print("Obteniendo leads del mes actual...")
leads = fetch_all_leads(from_ts)
print("Total leads:", len(leads))
# Pre-inyectar fecha de contrato en cada lead del mes actual
for _l in leads:
    _l["_contract_ts"] = get_contract_ts(_l, contract_date_field_id)

# --- Mejora #2: buscar custom fields de origen y fecha de contrato ---
print("Buscando custom fields (origen, fecha contrato)...")
source_field_id = None
contract_date_field_id = None
try:
    _cf_resp = api_get("/leads/custom_fields")
    for _cf in _cf_resp.get("_embedded", {}).get("custom_fields", []):
        _fn = _cf.get("name", "").lower()
        _fc = (_cf.get("code") or "").lower()
        if not source_field_id and any(k in _fn or k in _fc for k in ["fuente","origen","source","canal","utm","procedencia","origin"]):
            source_field_id = _cf["id"]
            print(f"  Campo origen: '{_cf['name']}' id={source_field_id}")
        if not contract_date_field_id and any(k in _fn or k in _fc for k in ["contrato","contract","fecha_cierre","cierre","close_date","sale_date","fecha_venta","fecha cierre","fecha contrato"]):
            contract_date_field_id = _cf["id"]
            print(f"  Campo fecha contrato: '{_cf['name']}' id={contract_date_field_id}")
    if not source_field_id:
        print("  Sin campo de origen específico — usando created_by para clasificar.")
    if not contract_date_field_id:
        print("  Sin campo de fecha contrato — usando updated_at como fecha de cierre.")
except Exception as _e:
    print("  ⚠ Error custom fields:", _e)

def get_contract_ts(lead, field_id):
    """Extrae el timestamp de fecha de contrato del lead (custom field)."""
    if not field_id:
        return None
    for cf in lead.get("custom_fields_values") or []:
        if cf.get("field_id") == field_id:
            vals = cf.get("values") or []
            if vals:
                v = vals[0].get("value")
                try:
                    return int(v)
                except (TypeError, ValueError):
                    pass
    return None

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

# Solo los leads creados automáticamente (bot/ads) necesitan medición de primera respuesta.
# Los creados manualmente por una vendedora ya estaban en contacto con el cliente.
_auto_lead_ids = {lead["id"] for lead in leads if lead.get("created_by", 0) == 0}
_lead_created_ts = {lead["id"]: lead.get("created_at", 0) for lead in leads}

# Tipos de evento que SÍ representan gestión real de la vendedora sobre el lead
# (no automatización de creación/vínculo/asignación). Basado en los tipos reales
# de este Kommo: la integración hace entity_linked a los segundos de crear el lead,
# por eso solo contamos acciones genuinas de la persona.
_ACTION_EV_TYPES = {
    "lead_status_changed",    # movió el lead de etapa
    "entity_tag_added",       # lo marcó (ej. tag "Atendido")
    "entity_direct_message",  # mensaje directo al cliente
    "common_note_added",      # nota / registro de llamada
    "geo_note_added",         # nota con ubicación (visita)
}

_first_human_ev = {}
for _ev in _events_all:
    if _ev.get("created_by", 0) == 0:
        continue  # automatización del sistema/bot
    if _ev.get("type") not in _ACTION_EV_TYPES:
        continue  # creación, vínculo, cambio de campo... no es gestión real
    _eid = _ev.get("entity_id")
    if _eid not in _auto_lead_ids:
        continue  # solo leads entrantes automáticos
    _ets = _ev.get("created_at", 0)
    _lts = _lead_created_ts.get(_eid, 0)
    if _ets <= _lts:
        continue  # evento anterior o simultáneo a la creación
    if _eid not in _first_human_ev or _ets < _first_human_ev[_eid]:
        _first_human_ev[_eid] = _ets

# --- DIAGNÓSTICO de leads fríos (solo a los logs de Actions, NO al HTML público) ---
# Clasifica POR QUÉ un lead automático aparece como "frío" para entender si es
# un problema real de seguimiento o si la integración registra las acciones como bot.
try:
    from collections import Counter as _Counter
    _ev_by_entity = {}
    for _ev in _events_all:
        _ev_by_entity.setdefault(_ev.get("entity_id"), []).append(_ev)
    _lead_stage_now = {l["id"]: stage_map.get(l.get("status_id"), "") for l in leads}

    _diag = _Counter()
    _diag_action_by_bot_types = _Counter()  # tipos de acción real pero created_by=0
    _diag_only_types = _Counter()           # qué tipos tienen los leads sin gestión humana
    _cold_sample = []
    for _lid in _auto_lead_ids:
        _evs = _ev_by_entity.get(_lid, [])
        _lts = _lead_created_ts.get(_lid, 0)
        # ¿tuvo gestión humana válida (lo que cuenta como NO frío)?
        _has_human_action = (
            _lid in _first_human_ev
            and (_first_human_ev[_lid] - _lts) / 60.0 <= 4320
        )
        if _has_human_action:
            _diag["1_gestionado_<=72h"] += 1
            continue
        # es frío -> ¿hubo gestión humana EN ALGÚN MOMENTO (aunque sea >72h)?
        _human_actions = [
            e for e in _evs
            if e.get("type") in _ACTION_EV_TYPES
            and e.get("created_by", 0) != 0
            and e.get("created_at", 0) > _lts
        ]
        if _human_actions:
            # sí lo tocó una persona, pero tarde -> LENTO, no abandonado
            _diag["2_humano_pero_>72h"] += 1
            _first_late = min(e.get("created_at", 0) for e in _human_actions)
            _horas = (_first_late - _lts) / 3600.0
            if _horas <= 168:
                _diag["2a_entre_72h_y_7_dias"] += 1
            elif _horas <= 336:
                _diag["2b_entre_7_y_14_dias"] += 1
            else:
                _diag["2c_mas_de_14_dias"] += 1
        elif not _evs:
            _diag["3_sin_ningun_evento"] += 1
        else:
            # ¿hay acciones reales pero SOLO atribuidas al bot (created_by==0)?
            _action_bot = [
                e for e in _evs
                if e.get("type") in _ACTION_EV_TYPES
                and e.get("created_by", 0) == 0
                and e.get("created_at", 0) > _lts
            ]
            # ¿llegó a una etapa avanzada? -> alguien lo trabajó (atribución perdida al bot)
            _stage_now = _lead_stage_now.get(_lid, "")
            if _stage_now in ADVANCED_STAGES:
                _diag["4a_avanzo_etapa_SIN_evento_humano(=trabajado)"] += 1
            elif _action_bot:
                _diag["4b_solo_accion_del_bot_estancado(=abandono)"] += 1
                for e in _action_bot:
                    _diag_action_by_bot_types[e.get("type")] += 1
            else:
                _diag["5_solo_eventos_no_gestion(=abandono)"] += 1
            for e in _evs:
                _diag_only_types[e.get("type")] += 1
        if len(_cold_sample) < 5:
            _cold_sample.append((_lid, [(e.get("type"), e.get("created_by")) for e in _evs]))

    print("\n===== DIAGNÓSTICO LEADS FRÍOS =====")
    print(f"  Total leads automáticos: {len(_auto_lead_ids)}")
    for k in sorted(_diag):
        print(f"  {k}: {_diag[k]}")
    print(f"  Tipos de acción real atribuidos al BOT (created_by=0): {dict(_diag_action_by_bot_types)}")
    print(f"  Tipos de evento presentes en leads fríos: {dict(_diag_only_types)}")
    print("  Muestra de 5 leads fríos (lead_id -> [(tipo, created_by)...]):")
    for _lid, _types in _cold_sample:
        print(f"    {_lid}: {_types}")
    print("===================================\n")

    # --- DIAGNÓSTICO LEADS LENTOS (+24h): ¿qué evento cuenta como 1ª acción? ---
    # Hipótesis: los mensajes de WhatsApp se registran como created_by=0 (integración),
    # así que la "1ª acción humana" termina siendo un cambio de etapa días después.
    _slow_first_type = _Counter()       # tipo del evento que marcó la 1ª acción humana
    _slow_dm_exists_as_bot = 0          # leads lentos que SÍ tienen un mensaje directo, pero del bot, ANTES de la 1ª acción humana
    _dm_attribution = _Counter()        # cómo se atribuyen TODOS los entity_direct_message
    for _ev in _events_all:
        if _ev.get("type") == "entity_direct_message":
            _dm_attribution["bot(0)" if _ev.get("created_by", 0) == 0 else "humano"] += 1
    for _lid in _auto_lead_ids:
        if _lid not in _first_human_ev:
            continue
        _fts = _first_human_ev[_lid]
        _lts = _lead_created_ts.get(_lid, 0)
        if (_fts - _lts) / 60.0 <= 4320:
            continue  # no es lento
        # ¿qué tipo de evento marcó esa primera acción humana?
        for _ev in _ev_by_entity.get(_lid, []):
            if (_ev.get("created_by", 0) != 0 and _ev.get("type") in _ACTION_EV_TYPES
                    and _ev.get("created_at", 0) == _fts):
                _slow_first_type[_ev.get("type")] += 1
                break
        # ¿hubo un mensaje directo (aunque sea del bot) ANTES de esa primera acción humana?
        for _ev in _ev_by_entity.get(_lid, []):
            if (_ev.get("type") == "entity_direct_message"
                    and _lts < _ev.get("created_at", 0) < _fts):
                _slow_dm_exists_as_bot += 1
                break
    print("===== DIAGNÓSTICO LEADS TARDÍOS (+72h) =====")
    print(f"  Atribución de TODOS los mensajes directos: {dict(_dm_attribution)}")
    print(f"  Tipo de evento que marca la 1ª acción humana en leads lentos: {dict(_slow_first_type)}")
    print(f"  Leads lentos que tenían un mensaje directo (del bot) ANTES de la 1ª acción humana: {_slow_dm_exists_as_bot}")
    print("===========================================\n")
except Exception as _e:
    print("  ⚠ Error diagnóstico fríos:", _e)

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
for _l in leads_prev:
    _l["_contract_ts"] = get_contract_ts(_l, contract_date_field_id)
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

# Agrupar leads por contacto principal para detectar duplicados (mismo cliente, varios leads)
contact_to_leads = defaultdict(list)

all_rows = []
vendor_data = defaultdict(lambda: {
    "total": 0,
    "value": 0.0,
    "compradores": 0,
    "no_resp": 0,
    "calificados": 0,
    "stagnant": 0,
    "auto": 0,
    "manual": 0,
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
    updated_at = lead.get("updated_at", 0)
    days_float = (now - updated_at) / 86400.0
    days_int = int(days_float)
    created_str = fmt_date(created_at) if created_at else "—"

    tags = lead.get("_embedded", {}).get("tags", [])
    sucursal = tags[0]["name"] if tags else "Sin sucursal"

    contacts_emb = lead.get("_embedded", {}).get("contacts", [])
    contact_name = contacts_emb[0].get("name", "") if contacts_emb else ""
    # ID del contacto principal (para agrupar duplicados del mismo cliente)
    _main_cid = None
    for _c in contacts_emb:
        if _c.get("is_main"):
            _main_cid = _c.get("id")
            break
    if _main_cid is None and contacts_emb:
        _main_cid = contacts_emb[0].get("id")

    stage_counts[stage_name] += 1
    stage_values[stage_name] += value
    total_value += value

    if stage_name == COMPRADORES_STAGE:
        _ct_chk = lead.get("_contract_ts")
        if not _ct_chk or (datetime.datetime.fromtimestamp(_ct_chk).year == now_dt.year and
                            datetime.datetime.fromtimestamp(_ct_chk).month == now_dt.month):
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

    vd = vendor_data[user_name]
    vd["total"] += 1
    vd["value"] += value
    vd["stages"][stage_name] += 1
    if stage_name == COMPRADORES_STAGE:
        _ct_chk2 = lead.get("_contract_ts")
        if not _ct_chk2 or (datetime.datetime.fromtimestamp(_ct_chk2).year == now_dt.year and
                              datetime.datetime.fromtimestamp(_ct_chk2).month == now_dt.month):
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
        vd["auto"] += 1
    else:
        total_manual += 1
        vd["manual"] += 1
        created_by_count[user_map.get(created_by_id, "Desconocido")] += 1

    _row = {
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
        "dup": False,
    }
    all_rows.append(_row)
    if _main_cid:
        contact_to_leads[_main_cid].append(_row)

total_leads = len(leads)

# Leads creados este mes pero con fecha contrato = mes anterior → van al archivo prev
# Funciona con o sin contract_date_field_id: si el campo no se encontró por nombre,
# escanea todos los custom fields numéricos del lead buscando fechas en el mes anterior.
_prev_cross_from_cur = []
for _l in leads:
    if stage_map.get(_l.get("status_id")) != COMPRADORES_STAGE:
        continue
    _ct_l = _l.get("_contract_ts")
    if not _ct_l:
        # Buscar cualquier campo de fecha con valor en el mes anterior
        for _cf in _l.get("custom_fields_values") or []:
            for _cfv in (_cf.get("values") or []):
                try:
                    _v = int(_cfv.get("value", 0) or 0)
                    if from_ts_prev <= _v <= to_ts_prev:
                        _ct_l = _v
                        _l["_contract_ts"] = _ct_l
                        break
                except (TypeError, ValueError, OSError):
                    pass
            if _ct_l:
                break
    if _ct_l:
        _cd_l = datetime.datetime.fromtimestamp(_ct_l)
        if _cd_l.year == prev_year and _cd_l.month == prev_month:
            _prev_cross_from_cur.append(_l)
if _prev_cross_from_cur:
    print(f"  → {len(_prev_cross_from_cur)} leads de este mes con fecha contrato en mes anterior")

# === Cierres cross-month: leads de meses anteriores cerrados este mes ===
# Usa fecha de contrato (si existe) como fuente de verdad del mes de cierre.
# Si no hay campo de contrato, cae en updated_at como antes.
_leads_cross = []
_cross_value = 0.0
_prev_cross_from_fetch = []
if _compradores_sid:
    print("Obteniendo cierres cross-month (leads anteriores cerrados este mes)...")
    try:
        # Si hay fecha de contrato, ampliar ventana a 90 días para capturar
        # contratos firmados este mes pero actualizados antes.
        # Ampliar ventana 90 días para capturar contratos firmados antes del mes
        _cross_from = int((inicio_mes - datetime.timedelta(days=90)).timestamp())
        _cross_raw = fetch_compradores_mes(_compradores_sid, _cross_from)
        _ids_this = {l["id"] for l in leads}
        _prev_cross_from_fetch = []
        for _l in _cross_raw:
            if _l["id"] in _ids_this:
                continue
            _ct = get_contract_ts(_l, contract_date_field_id)
            # Si no se encontró el campo por nombre, escanear todos los campos de fecha
            if not _ct:
                for _cf2 in _l.get("custom_fields_values") or []:
                    for _cfv2 in (_cf2.get("values") or []):
                        try:
                            _v2 = int(_cfv2.get("value", 0) or 0)
                            if _v2 > 0:
                                _d2 = datetime.datetime.fromtimestamp(_v2)
                                if (_d2.year == now_dt.year and _d2.month == now_dt.month) or \
                                   (_d2.year == prev_year  and _d2.month == prev_month):
                                    _ct = _v2
                                    break
                        except (TypeError, ValueError, OSError):
                            pass
                    if _ct:
                        break
            _l["_contract_ts"] = _ct
            if _ct:
                _cd = datetime.datetime.fromtimestamp(_ct)
                _is_cur  = (_cd.year == now_dt.year and _cd.month == now_dt.month)
                _is_prev = (_cd.year == prev_year  and _cd.month == prev_month)
            else:
                _is_cur  = (_l.get("updated_at", 0) >= from_ts)
                _is_prev = False
            if _is_cur:
                _leads_cross.append(_l)
                _ids_this.add(_l["id"])
                _cuid = _l.get("responsible_user_id")
                _cname = user_map.get(_cuid, "Desconocido")
                _cval = float(_l.get("price", 0) or 0)
                _cross_value += _cval
                vendor_data[_cname]["compradores"] += 1
                vendor_data[_cname]["value"] += _cval
                total_compradores += 1
            elif _is_prev:
                _prev_cross_from_fetch.append(_l)
        if _leads_cross:
            print(f"  → {len(_leads_cross)} cierres este mes (cross-month, por {'fecha contrato' if contract_date_field_id else 'updated_at'})")
        else:
            print("  → Sin cierres cross-month este mes")
        if _prev_cross_from_fetch:
            print(f"  → {len(_prev_cross_from_fetch)} cierres detectados para mes anterior (se patchearán)")
    except Exception as _xe:
        print(f"  ⚠ Cross-month: {_xe}")
        _prev_cross_from_fetch = []

# === Detección de fichas duplicadas (mismo teléfono en contactos distintos) ===
# Un duplicado real = la misma persona cargada como 2+ fichas de contacto diferentes.
# Traemos el teléfono de TODOS los contactos del mes y agrupamos por teléfono normalizado.
def _norm_phone(raw):
    """Deja solo dígitos y toma los últimos 8 (ignora prefijos país/área variables)."""
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    return digits[-8:] if len(digits) >= 8 else digits

_all_cids = list(contact_to_leads.keys())
print(f"Contactos del mes a verificar: {len(_all_cids)}")

_contact_info = {}  # cid -> {"name":..., "phone":..., "phone_norm":...}
for _i in range(0, len(_all_cids), 50):
    _batch = _all_cids[_i:_i + 50]
    _qs = urllib.parse.urlencode([("filter[id][]", c) for c in _batch], doseq=True)
    try:
        _cdata = api_get("/contacts?" + _qs + "&limit=250")
    except Exception as _e:
        print("  ⚠ Error contactos:", _e)
        continue
    for _c in _cdata.get("_embedded", {}).get("contacts", []):
        _phone = ""
        for _cf in _c.get("custom_fields_values") or []:
            if (_cf.get("field_code") or "").upper() == "PHONE":
                _vals = _cf.get("values") or []
                if _vals:
                    _phone = str(_vals[0].get("value", ""))
                break
        _contact_info[_c["id"]] = {
            "name": _c.get("name", ""),
            "phone": _phone,
            "phone_norm": _norm_phone(_phone),
        }
    time.sleep(0.15)

# Agrupar contactos por teléfono normalizado
_phone_to_cids = defaultdict(set)
for _cid, _info in _contact_info.items():
    _pn = _info.get("phone_norm")
    if _pn and len(_pn) >= 7:  # teléfono válido
        _phone_to_cids[_pn].add(_cid)

# Duplicado = teléfono presente en 2+ fichas DISTINTAS
_dup_groups = []
for _pn, _cids in _phone_to_cids.items():
    if len(_cids) < 2:
        continue
    _fichas = []
    _all_g_rows = []
    for _cid in _cids:
        _info = _contact_info.get(_cid, {})
        _rws = contact_to_leads.get(_cid, [])
        _all_g_rows.extend(_rws)
        _fichas.append({
            "cid": _cid,
            "name": _info.get("name") or f"Contacto #{_cid}",
            "phone": _info.get("phone", ""),
            "rows": _rws,
        })
    _dup_groups.append({
        "phone": next((f["phone"] for f in _fichas if f["phone"]), _pn),
        "fichas": _fichas,
        "n_fichas": len(_cids),
        "rows": _all_g_rows,
    })
_dup_groups.sort(key=lambda g: -g["n_fichas"])

# Marcar las filas que pertenecen a una ficha duplicada (para la pestaña "Duplicados")
for _g in _dup_groups:
    for _r in _g["rows"]:
        _r["dup"] = True

total_dup_groups = len(_dup_groups)       # personas duplicadas (teléfonos repetidos)
total_dup_fichas = sum(g["n_fichas"] for g in _dup_groups)  # fichas involucradas
total_dup_leads = sum(len(g["rows"]) for g in _dup_groups)
print(f"Teléfonos repetidos en fichas distintas: {total_dup_groups}")

_dup_rows_html = ""
for _g in _dup_groups[:50]:
    # Listar cada ficha: nombre (link) con su cantidad de leads
    _fichas_html = "<br>".join(
        f'<a href="https://eanez.kommo.com/contacts/detail/{f["cid"]}" target="_blank">'
        f'<strong>{f["name"]}</strong></a> '
        f'<span style="color:var(--muted);font-size:.7rem">({len(f["rows"])} lead{"s" if len(f["rows"])!=1 else ""})</span>'
        for f in _g["fichas"]
    )
    _vend = ", ".join(sorted({r["user"] for r in _g["rows"]}))
    _stgs = ", ".join(sorted({r["stage"] for r in _g["rows"]}))
    _dup_rows_html += (
        f'        <tr>'
        f'<td style="font-weight:700">{_g["phone"]}</td>'
        f'<td style="text-align:center"><span class="badge b-red">{_g["n_fichas"]} fichas</span></td>'
        f'<td style="font-size:.78rem">{_fichas_html}</td>'
        f'<td style="color:var(--muted);font-size:.74rem">{_vend}</td>'
        f'<td style="color:var(--muted);font-size:.74rem">{_stgs}</td>'
        f'</tr>\n'
    )

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
ticket_avg = int((total_value + _cross_value) / total_compradores) if total_compradores > 0 else 0

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
mid_proj           = int(total_leads * dias_del_mes / dias_transcurridos * (conv_pct / 100 + 0.01)) if dias_transcurridos > 0 else 0
_mid_conv_pct_lbl  = conv_pct + 1
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

# === Velocidad de Respuesta — solo leads automáticos (entrantes) ===
# Base: leads con created_by==0. Los manuales no necesitan "primera respuesta".
_auto_leads = [lead for lead in leads if lead["id"] in _auto_lead_ids]
_total_auto_resp_base = len(_auto_leads)

_resp_times_all = []  # (minutes, responsible_user_id)
for lead in _auto_leads:
    lid = lead["id"]
    uid = lead.get("responsible_user_id")
    if lid in _first_human_ev:
        dm = (_first_human_ev[lid] - lead.get("created_at", 0)) / 60.0
        if dm < 0:
            dm = 0.0
        _resp_times_all.append((dm, uid))

_resp_n = len(_resp_times_all)
# Promedio global: solo tiempos ≤72h (consistente con la tabla por vendedora)
_resp_times_fast = [t[0] for t in _resp_times_all if t[0] <= 4320]
_resp_avg = sum(_resp_times_fast) / len(_resp_times_fast) if _resp_times_fast else 0
# % actualizados en <24h sobre base automática total
_resp_lt24_n = sum(1 for t in _resp_times_all if t[0] < 1440)
# Porcentajes sobre base automática (no total del mes)
_resp_base = _total_auto_resp_base or 1
_resp_lt24_pct = round(_resp_lt24_n / _resp_base * 100)
# Abandono real: nunca hubo acción humana registrada Y el lead sigue estancado en
# una etapa inicial (no llegó a Interesado/Cotización/Agendado/Compradores). Si llegó
# a una etapa avanzada, ALGUIEN lo movió aunque Kommo lo registre como bot.
def _reached_advanced(lead):
    return stage_map.get(lead.get("status_id"), "") in ADVANCED_STAGES

_resp_never_n = sum(
    1 for lead in _auto_leads
    if lead["id"] not in _first_human_ev and not _reached_advanced(lead)
)
# IDs de los leads abandonados (para marcarlos en la tabla -> pestaña "Sin gestión")
_abandoned_ids = {
    lead["id"] for lead in _auto_leads
    if lead["id"] not in _first_human_ev and not _reached_advanced(lead)
}
for _r in all_rows:
    _r["nohuman"] = _r["id"] in _abandoned_ids
# Tardías: sí hubo acción humana, pero después de 72h
_resp_slow_n = sum(
    1 for lead in _auto_leads
    if lead["id"] in _first_human_ev
    and (_first_human_ev[lead["id"]] - lead.get("created_at", 0)) / 60.0 > 4320
)
_resp_cold_n = _resp_never_n  # para el tile de alerta crítica usamos solo los abandonados
_resp_cold_pct = round(_resp_cold_n / _resp_base * 100)
_resp_slow_pct = round(_resp_slow_n / _resp_base * 100)
_resp_avg_str = _fmt_resp(_resp_avg) if _resp_avg > 0 else "N/A"
# Promedio en horas para el color: verde <24h, ámbar 24-72h, rojo >72h
_resp_avg_color = "c-teal" if _resp_avg < 1440 else ("c-amber" if _resp_avg < 4320 else "c-red")
_resp_lt24_color = "c-teal" if _resp_lt24_pct >= 70 else ("c-amber" if _resp_lt24_pct >= 40 else "c-red")

_vresp = defaultdict(lambda: {"times": [], "slow": 0, "never": 0})
for (dm, uid) in _resp_times_all:
    uname = user_map.get(uid, "Desconocido")
    _vresp[uname]["times"].append(dm)
    if dm > 4320:
        _vresp[uname]["slow"] += 1
for lead in _auto_leads:
    lid = lead["id"]
    uname = user_map.get(lead.get("responsible_user_id"), "Desconocido")
    if lid not in _first_human_ev and not _reached_advanced(lead):
        _vresp[uname]["never"] += 1

_vresp_list = []
for vname, vrd in _vresp.items():
    vtimes = vrd["times"]
    # Para el promedio y ranking: excluir tiempos >4320 min (>72h) para no distorsionar
    # (las tardías se muestran en columna separada; el promedio refleja actualizaciones ágiles)
    vtimes_fast = [t for t in vtimes if t <= 4320]
    vavg = sum(vtimes_fast) / len(vtimes_fast) if vtimes_fast else None
    # % de leads que actualizó en menos de 24h (sobre todos los que tocó)
    vlt24_pct = round(sum(1 for t in vtimes if t < 1440) / len(vtimes) * 100) if vtimes else 0
    _vresp_list.append((vname, vavg, vlt24_pct, vrd["slow"], vrd["never"]))
_vresp_list.sort(key=lambda x: x[1] if x[1] is not None else 99999)

_vendor_resp_html = ""
for (vname, vavg, vlt24_pct, vslow, vnever) in _vresp_list:
    # Umbrales: Excelente <24h (1440 min), Aceptable 24h-72h, Crítico ≥72h o >10 nunca tocados
    # vnever>10 se verifica ANTES de vavg is None: una vendedora con todos sus leads abandonados
    # (vavg=None) pero >10 nunca tocados debe mostrar Crítico, no "Sin datos".
    if vnever > 10:
        avg_str = _fmt_resp(vavg) if vavg is not None else "Sin datos"
        badge = '<span class="badge b-red">&#128308; Cr&iacute;tico</span>'
    elif vavg is None:
        avg_str = "Sin datos"
        badge = '<span class="badge b-gray">Sin datos</span>'
    elif vavg >= 4320:
        avg_str = _fmt_resp(vavg)
        badge = '<span class="badge b-red">&#128308; Cr&iacute;tico</span>'
    elif vavg >= 1440:
        avg_str = _fmt_resp(vavg)
        badge = '<span class="badge b-amber">&#128993; Aceptable</span>'
    else:
        avg_str = f"<strong>{_fmt_resp(vavg)}</strong>"
        badge = '<span class="badge b-teal">&#128994; Excelente</span>'
    never_cls = ' style="color:var(--red);font-weight:700"' if vnever > 10 else ""
    _vendor_resp_html += (
        f'        <tr><td><strong>{vname}</strong></td>'
        f'<td>{vlt24_pct}%</td>'
        f'<td>{avg_str}</td>'
        f'<td>{vslow}</td>'
        f'<td{never_cls}>{vnever}</td>'
        f'<td>{badge}</td></tr>\n'
    )

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
            "auto": vd["auto"],
            "manual": vd["manual"],
            "auto_pct": round(vd["auto"] / vt * 100) if vt > 0 else 0,
            "manual_pct": round(vd["manual"] / vt * 100) if vt > 0 else 0,
        },
    })

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
body{background:linear-gradient(135deg,#e6fffe 0%,#f4f7ff 45%,#eef2ff 100%);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh}
@keyframes grad-move{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.header{background:linear-gradient(135deg,#00B5AD,#0f766e,#1e3a5f,#1d4ed8,#0f5c8a,#00B5AD);background-size:300% 300%;animation:grad-move 12s ease infinite;padding:0 36px;display:flex;justify-content:space-between;align-items:stretch;box-shadow:0 4px 20px rgba(0,0,0,.25)}
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
.container{padding:36px 36px 26px;max-width:1500px;margin:0 auto 0;background:#f4fffe;border-radius:0;position:relative;z-index:1}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}
.origin-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:12px 0 22px}
.mc{background:rgba(255,255,255,.75);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:12px;padding:20px 22px;border:1px solid rgba(255,255,255,.7);position:relative;box-shadow:0 2px 10px rgba(0,0,0,.08);transition:transform .18s ease,box-shadow .18s ease}
.mc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.13)}
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
.sg{display:flex;flex-direction:column;gap:6px;margin-bottom:26px;background:#fff;border:1px solid var(--gray-md);border-radius:12px;padding:18px 22px;box-shadow:0 1px 5px rgba(0,0,0,.06)}
.sb-row{display:grid;grid-template-columns:190px 1fr 72px 96px;align-items:center;gap:14px;padding:4px 0}
.sb-label{display:flex;align-items:center;gap:9px;font-size:.78rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sb-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.sb-bar-wrap{background:var(--gray-lt);border-radius:20px;height:15px;overflow:hidden}
.sb-bar-fill{height:100%;border-radius:20px;min-width:2px}
.sb-count{font-size:.82rem;font-weight:800;color:var(--black);text-align:right;white-space:nowrap}
.sb-pct{font-size:.67rem;font-weight:500;color:var(--muted)}
.sb-val{font-size:.72rem;color:var(--muted);text-align:right;white-space:nowrap}
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
thead th{background:var(--black);color:rgba(255,255,255,.75);padding:10px 13px;text-align:left;font-weight:600;font-size:.67rem;text-transform:uppercase;letter-spacing:.07em;border-bottom:3px solid var(--teal);position:sticky;top:0;z-index:10}
tbody tr{border-bottom:1px solid var(--gray-lt);transition:background .12s;cursor:pointer}
tbody tr:hover{background:var(--teal-lt)}
tbody tr.hl-row{background:rgba(254,240,138,.55)!important;box-shadow:inset 4px 0 0 rgba(217,119,6,.7)!important;outline:none}
tbody td{padding:9px 13px;color:var(--text);vertical-align:middle}
.badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:.66rem;font-weight:700}
.b-red{background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5}
.b-amber{background:var(--amber-lt);color:var(--amber);border:1px solid #FCD34D}
.b-teal{background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9}
.b-gray{background:var(--gray-lt);color:var(--gray);border:1px solid var(--gray-md)}
a{color:var(--teal-dk);text-decoration:none;font-weight:500}
a:hover{text-decoration:underline;color:var(--teal)}
.nd{text-align:center;padding:38px;color:var(--muted);font-size:.82rem}
.team-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:26px}
.tk{background:rgba(255,255,255,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.65);border-radius:10px;padding:14px 16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.07);position:relative;transition:transform .18s ease,box-shadow .18s ease}
.tk:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.13)}
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
@keyframes rp{0%,100%{box-shadow:0 0 0 0 rgba(206,41,57,.5)}65%{box-shadow:0 0 0 7px rgba(206,41,57,0)}}
.b-red{animation:rp 2.4s ease-out infinite}
[data-tip]{position:relative}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);background:rgba(12,18,28,.93);color:#fff;padding:9px 14px;border-radius:9px;font-size:.69rem;line-height:1.55;text-align:center;pointer-events:none;z-index:300;max-width:240px;font-weight:400;box-shadow:0 5px 18px rgba(0,0,0,.28);white-space:normal}
[data-tip]:hover::before{content:'';position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:rgba(12,18,28,.93);pointer-events:none;z-index:300}
.pres-btn{position:fixed;bottom:22px;right:22px;background:var(--teal);color:#fff;border:none;border-radius:50px;padding:11px 22px;font-size:.78rem;font-weight:700;cursor:pointer;z-index:1000;box-shadow:0 4px 16px rgba(0,181,173,.45);transition:all .2s;font-family:inherit;letter-spacing:.03em}
.pres-btn:hover{background:var(--teal-dk);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,181,173,.5)}
body.pres .ch-wrap,body.pres .ch-alert,body.pres .lead-origin-row,body.pres .tab-row,body.pres .controls,body.pres .rc,body.pres .tw,body.pres #dup-tbl,body.pres .resp-ranking,body.pres .exec-summary{display:none!important}
body.pres .tk{padding:20px 22px}
body.pres .tk-val{font-size:2.1rem}
body.pres .metrics{grid-template-columns:repeat(4,1fr)}
body.pres .mc-val{font-size:2.6rem}
body.pres .team-kpis{grid-template-columns:repeat(6,1fr)}
body.pres .container{max-width:100%;padding:28px 48px}
</style>
</head>
<body>
<div id="scroll-bar" style="position:fixed;top:0;left:0;height:3px;width:0%;background:linear-gradient(90deg,var(--teal),#3b82f6);z-index:9999;transition:width .1s linear;pointer-events:none"></div>
<button class="pres-btn" onclick="togglePres()" title="Modo presentación para reuniones de equipo">&#9654; Presentaci&oacute;n</button>
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
        <div class="hstat-v" data-v="__TOTAL__">__TOTAL__</div>
        <div style="font-size:1rem;font-weight:800;color:__DIFF_COLOR__">__DIFF_ARROW__ __DIFF_SIGN____DIFF_ABS__</div>
      </div>
      <div class="hstat-l">1-__DIA__ __CUR_MES_SHORT__ &nbsp;vs&nbsp; __PREV_TOTAL__ en __PREV_MES_SHORT__</div>
    </div>
    <div class="hstat"><div class="hstat-v">__VALOR__</div><div class="hstat-l">Valor total</div></div>
    <div class="hstat"><div class="hstat-v" data-v="__ESTANCADOS__">__ESTANCADOS__</div><div class="hstat-l">Sin Seguimiento</div></div>
  </div>
</div>
<div class="container">
  <div class="metrics">
    <div class="mc c-teal"><div class="mc-bar"></div><div class="mc-lbl">Leads del Mes</div><div class="mc-val" data-v="__TOTAL__">__TOTAL__</div><div class="mc-sub">creados en __MES_LABEL__</div></div>
    <div class="mc c-gray"><div class="mc-bar"></div><div class="mc-lbl">Valor Total Pipeline</div><div class="mc-val">__VALOR__</div><div class="mc-sub">deals con valor asignado</div></div>
    <div class="mc c-amber"><div class="mc-bar"></div><div class="mc-lbl">Sin Seguimiento +72h</div><div class="mc-val" data-v="__STAG714__">__STAG714__</div><div class="mc-sub">sin actividad reciente</div></div>
    <div class="mc c-red"><div class="mc-bar"></div><div class="mc-lbl">Sin Seguimiento +7 dias</div><div class="mc-val" data-v="__STAG14__">__STAG14__</div><div class="mc-sub">atencion urgente</div></div>
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
    <div class="tk c-teal" data-tip="Leads que llegaron a etapa Compradores vs. total del mes"><div class="tk-val"><span class="c-num" data-v="__CONV_PCT__">__CONV_PCT__</span>% <span class="delta-mom __DIFF_CONV_CLASS__">__DIFF_CONV_ARROW__ __DIFF_CONV_SIGN____DIFF_CONV__pp</span></div><div class="tk-lbl">Tasa de Conversion</div><div class="tk-sub">__COMPRADORES__ compradores / __TOTAL__ leads</div></div>
    <div class="tk c-red" data-tip="Leads en etapa 'No Responden' — el cliente dejó de contestar"><div class="tk-val"><span class="c-num" data-v="__NORESP_PCT__">__NORESP_PCT__</span>%</div><div class="tk-lbl">Sin Respuesta del Cliente</div><div class="tk-sub">__NORESP_N__ el cliente no responde</div></div>
    <div class="tk c-amber" data-tip="En etapas Interesado, Cotización enviada, Agendado/Visita o Compradores"><div class="tk-val"><span class="c-num" data-v="__CALIF_PCT__">__CALIF_PCT__</span>%</div><div class="tk-lbl">Leads Calificados</div><div class="tk-sub">__CALIF_N__ en etapas avanzadas</div></div>
    <div class="tk c-purple" data-tip="Valor promedio de los cierres registrados en el mes"><div class="tk-val">__TICKET__ <span class="delta-mom __DIFF_TICKET_CLASS__">__DIFF_TICKET_ARROW__</span></div><div class="tk-lbl">Ticket Promedio</div><div class="tk-sub">valor / compradores cerrados</div></div>
    <div class="tk c-gray" data-tip="Leads en etapas activas sin ninguna actividad en Kommo en las últimas 72h"><div class="tk-val"><span class="c-num" data-v="__STAG_PCT__">__STAG_PCT__</span>%</div><div class="tk-lbl">Sin Seguimiento</div><div class="tk-sub">__ESTANCADOS__ sin actividad &gt;72h</div></div>
    <div class="tk __DUP_COLOR__" data-tip="Contactos con el mismo teléfono registrado en 2 o más fichas de Kommo"><div class="tk-val"><span class="c-num" data-v="__DUP_N__">__DUP_N__</span></div><div class="tk-lbl">Fichas Duplicadas</div><div class="tk-sub">__DUP_GROUPS__ tel&eacute;fonos en 2+ fichas</div></div>
  </div>
  <div class="sec">Velocidad de Actualizaci&oacute;n del CRM &mdash; __MES_LABEL__ <span style="font-size:.6rem;font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0">Tiempo hasta la 1&ordf; acci&oacute;n registrada en Kommo (mover etapa, etiqueta o nota) &middot; solo leads entrantes autom&aacute;ticos (__AUTO_N__)</span></div>
  <div style="background:#FEF9E7;border:1px solid #F4D03F;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:.74rem;color:#7D6608;line-height:1.5"><b>&#9888; Importante:</b> Esta secci&oacute;n NO mide la respuesta real al cliente por WhatsApp &mdash; la integraci&oacute;n no registra esos mensajes de forma confiable en Kommo. Mide cu&aacute;nto tarda la vendedora en <b>actualizar la ficha en el CRM</b> (mover de etapa, etiquetar o dejar nota). Un n&uacute;mero alto puede significar que atendi&oacute; al cliente pero tard&oacute; en reflejarlo en el sistema.</div>
  <div class="resp-kpis">
    <div class="tk __RESP_AVG_COLOR__" data-tip="Promedio de tiempo hasta la 1ª acción en Kommo — considera solo leads automáticos actualizados en ≤72h para excluir outliers"><div class="tk-val">__RESP_AVG_STR__</div><div class="tk-lbl">Tiempo Promedio Global</div><div class="tk-sub">leads actualizados en &le;72h</div></div>
    <div class="tk __RESP_LT24_COLOR__" data-tip="% de leads automáticos donde la vendedora registró la primera acción en Kommo en menos de 24 horas"><div class="tk-val"><span class="c-num" data-v="__RESP_LT24_PCT__">__RESP_LT24_PCT__</span>%</div><div class="tk-lbl">Actualizados en &lt;24h</div><div class="tk-sub">__RESP_LT24_N__ leads &mdash; reflejados a tiempo</div></div>
    <div class="tk c-amber" data-tip="Leads automáticos donde la primera acción en Kommo tardó más de 72 horas desde que llegó el lead"><div class="tk-val"><span class="c-num" data-v="__RESP_SLOW_N__">__RESP_SLOW_N__</span></div><div class="tk-lbl">Actualizados tarde (+72 h)</div><div class="tk-sub">__RESP_SLOW_PCT__% &mdash; CRM actualizado &gt;72h despu&eacute;s</div></div>
    <div class="tk c-red" style="cursor:pointer" onclick="setView('nohuman');document.getElementById('tbl').scrollIntoView({behavior:'smooth',block:'start'})" data-tip="Leads asignados por el bot sin ninguna acción humana ni avance de etapa — clic para ver en la tabla"><div class="tk-val"><span class="c-num" data-v="__RESP_COLD_N__">__RESP_COLD_N__</span></div><div class="tk-lbl">Nunca tocados &#128269;</div><div class="tk-sub">__RESP_COLD_PCT__% &mdash; el bot los movi&oacute;, ninguna acci&oacute;n humana ni avance &middot; clic para ver</div></div>
  </div>
  <div class="resp-ranking">
    <table class="ch-table">
      <thead><tr><th>Vendedora</th><th>% en &lt;24h</th><th>Tiempo prom. (&le;72h)</th><th>Tard&iacute;as (+72h)</th><th>Nunca tocados</th><th>Status</th></tr></thead>
      <tbody>
__VENDOR_RESP_ROWS__
      </tbody>
    </table>
    <div style="font-size:.7rem;color:var(--muted);margin-top:8px;line-height:1.5"><b>Criterio del Status:</b> &#128994; <b>Excelente</b> = actualiza el CRM en menos de 24h en promedio &middot; &#128993; <b>Aceptable</b> = entre 24h y 72h &middot; &#128308; <b>Cr&iacute;tico</b> = tarda m&aacute;s de 72h en promedio <u>o</u> tiene m&aacute;s de 10 leads nunca tocados. El tiempo promedio considera solo los leads actualizados dentro de las 72h.</div>
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
        <li>Etiquetar sucursal en leads sin clasificar</li>
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
      <h4>+1pp Conversi&oacute;n (__MID_CONV_PCT_LBL__%)</h4>
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
      <button class="tab" onclick="setView('nohuman')">Nunca tocados (__RESP_COLD_N__)</button>
      <button class="tab" onclick="setView('dup')">Duplicados (__DUP_LEADS_N__)</button>
    </div>
  </div>
  <div class="controls">
    <input id="f-search" type="search" placeholder="&#128269; Buscar nombre o contacto..." oninput="render()" style="width:230px">
    <select id="f-stage" onchange="render()"><option value="">Todas las etapas</option></select>
    <select id="f-user" onchange="render()"><option value="">Todos los responsables</option></select>
    <select id="f-suc" onchange="render()"><option value="">Todas las sucursales</option></select>
    <input id="f-days" type="number" placeholder="Dias min. sin seguimiento" oninput="render()" style="width:190px">
    <button onclick="document.getElementById('f-days').value=7;render()" style="background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5;border-radius:8px;padding:7px 13px;font-size:.73rem;font-weight:700;cursor:pointer;font-family:inherit">🔴 Solo críticos +7d</button>
    <button onclick="exportCSV()" style="background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9;border-radius:8px;padding:7px 13px;font-size:.73rem;font-weight:600;cursor:pointer;font-family:inherit">⬇ Exportar CSV</button>
    <span id="rc" class="rc"></span>
  </div>
  <div class="tw"><div class="ts">
    <table id="main-tbl">
      <thead><tr><th>#</th><th>Contacto / Deal</th><th>Etapa</th><th>Sucursal</th><th>Responsable</th><th>Creado</th><th>Dias sin act.</th><th>Valor</th><th>Estado</th></tr></thead>
      <tbody id="tbl"></tbody>
    </table>
    <table id="dup-tbl" style="display:none" class="ch-table">
      <thead><tr><th>Tel&eacute;fono</th><th>Fichas</th><th>Contactos duplicados (clic enlaza a Kommo)</th><th>Vendedoras involucradas</th><th>Etapas</th></tr></thead>
      <tbody id="dup-tbl-body"></tbody>
    </table>
  </div></div>
</div>
<div class="footer">HEAVEN Colchones &bull; Pipeline __MES_LABEL__ &bull; eanez.kommo.com &bull; __FECHA__</div>
<script>
const allRows=__ALL_ROWS_JSON__;
const dupGroups=__DUP_GROUPS_JSON__;
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
const _stgTot=stages.reduce((s,x)=>s+x.count,0);
stages.filter(s=>s.count>0).forEach(s=>{const c=SC[s.name]||'#808080';const v=s.value>0?'$'+s.value.toLocaleString('es-AR'):'--';const bw=_stgTot>0?(s.count/_stgTot*100).toFixed(1):0;grid.innerHTML+='<div class="sb-row"><div class="sb-label"><span class="sb-dot" style="background:'+c+'"></span>'+s.name+'</div><div class="sb-bar-wrap"><div class="sb-bar-fill" style="width:'+bw+'%;background:'+c+'"></div></div><div class="sb-count">'+s.count+' <span class="sb-pct">'+s.pct+'%</span></div><div class="sb-val">'+v+'</div></div>';});
stgOpts.forEach(v=>document.getElementById('f-stage').innerHTML+='<option>'+v+'</option>');
usrOpts.forEach(v=>document.getElementById('f-user').innerHTML+='<option>'+v+'</option>');
sucOpts.forEach(v=>document.getElementById('f-suc').innerHTML+='<option>'+v+'</option>');
let view='all';
function renderDups(){
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const tbody=document.getElementById('dup-tbl-body');
  let filtered=dupGroups;
  if(stage||user){filtered=dupGroups.filter(g=>g.rows.some(r=>(!stage||r.stage===stage)&&(!user||r.user===user)));}
  document.getElementById('rc').textContent=filtered.length+' grupos';
  if(!filtered.length){tbody.innerHTML='<tr><td colspan="5" class="nd">Sin duplicados con estos filtros</td></tr>';return;}
  tbody.innerHTML=filtered.map(g=>{
    const fichasHtml=g.fichas.map(f=>'<a href="https://eanez.kommo.com/contacts/detail/'+f.cid+'" target="_blank"><strong>'+f.name+'</strong></a> <span style="color:var(--muted);font-size:.7rem">('+f.n_leads+' lead'+(f.n_leads!==1?'s':'')+')</span>').join('<br>');
    const vend=[...new Set(g.rows.map(r=>r.user))].join(', ');
    const stgs=[...new Set(g.rows.map(r=>r.stage))].join(', ');
    return '<tr><td style="font-weight:700">'+g.phone+'</td><td style="text-align:center"><span class="badge b-red">'+g.n_fichas+' fichas</span></td><td style="font-size:.78rem">'+fichasHtml+'</td><td style="color:var(--muted);font-size:.74rem">'+vend+'</td><td style="color:var(--muted);font-size:.74rem">'+stgs+'</td></tr>';
  }).join('');
}
function setView(v){
  view=v;
  document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(i===0&&v==='all')||(i===1&&v==='stagnant')||(i===2&&v==='nohuman')||(i===3&&v==='dup')));
  document.getElementById('f-days').value=v==='stagnant'?3:'';
  const isDup=(v==='dup');
  document.getElementById('main-tbl').style.display=isDup?'none':'';
  document.getElementById('dup-tbl').style.display=isDup?'':'none';
  if(isDup){renderDups();}else{render();}
}
function filterByVendor(name){document.getElementById('f-user').value=name;document.getElementById('f-stage').value='';view='all';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',i===0));document.getElementById('f-days').value='';render();document.getElementById('tbl').scrollIntoView({behavior:'smooth',block:'start'});}
function filterByVendorStage(name,stage,ev){if(ev)ev.stopPropagation();document.getElementById('f-user').value=name;document.getElementById('f-stage').value=stage;view='all';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',i===0));document.getElementById('f-days').value='';render();document.getElementById('tbl').scrollIntoView({behavior:'smooth',block:'start'});}
function exportCSV(){
  const stage=document.getElementById('f-stage').value;
  const user=document.getElementById('f-user').value;
  const suc=document.getElementById('f-suc').value;
  const minD=parseFloat(document.getElementById('f-days').value)||(view==='stagnant'?3:0);
  const srch=(document.getElementById('f-search').value||'').trim().toLowerCase();
  const rows=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc)&&(view!=='dup'||r.dup)&&(view!=='nohuman'||r.nohuman)&&(!srch||(r.name||'').toLowerCase().includes(srch)||(r.contact||'').toLowerCase().includes(srch))).sort((a,b)=>b.value-a.value);
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
  const srch=(document.getElementById('f-search').value||'').trim().toLowerCase();
  const onlyFollowup=(view==='stagnant');
  const onlyDup=(view==='dup');
  const onlyNohuman=(view==='nohuman');
  const f=allRows.filter(r=>r.days>=minD&&(!stage||r.stage===stage)&&(!user||r.user===user)&&(!suc||r.sucursal===suc)&&(!onlyFollowup||FOLLOWUP_STAGES.includes(r.stage))&&(!onlyDup||r.dup)&&(!onlyNohuman||r.nohuman)&&(!srch||(r.name||'').toLowerCase().includes(srch)||(r.contact||'').toLowerCase().includes(srch))).sort((a,b)=>b.value-a.value);
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
    const rowBg=(isWon||isNoResp||!inFollowup)?'':r.days_int>=14?'background:rgba(206,41,57,.11);box-shadow:inset 4px 0 0 rgba(206,41,57,.65)':r.days_int>=7?'background:rgba(206,41,57,.06);box-shadow:inset 3px 0 0 rgba(206,41,57,.35)':r.days_int>=3?'background:rgba(217,119,6,.07);box-shadow:inset 3px 0 0 rgba(217,119,6,.5)':'';
    const val=r.value>0?'$'+r.value.toLocaleString('es-AR'):'--';
    const nm=r.contact||r.name;
    const hlCls=_hl.has(r.id)?' hl-row':'';
    return '<tr class="'+hlCls+'" style="'+rowBg+'" onclick="toggleHl('+r.id+',this)"><td style="color:var(--muted);width:36px">'+(i+1)+'</td>'
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
const _hl=new Set();
function toggleHl(id,el){if(_hl.has(id)){_hl.delete(id);el.classList.remove('hl-row');}else{_hl.add(id);el.classList.add('hl-row');}}
render();

window.addEventListener('scroll',function(){var el=document.getElementById('scroll-bar');var pct=(document.documentElement.scrollTop||document.body.scrollTop)/(document.documentElement.scrollHeight-document.documentElement.clientHeight)*100;el.style.width=Math.min(pct,100)+'%';});
function togglePres(){
  var on=document.body.classList.toggle('pres');
  document.querySelector('.pres-btn').innerHTML=on?'&#10005; Salir':'&#9654; Presentaci&oacute;n';
  if(on&&document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function(){});
  else if(!on&&document.fullscreenElement) document.exitFullscreen().catch(function(){});
}
function countUp(el,end){var dur=900,s=performance.now();(function step(now){var p=Math.min((now-s)/dur,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(e*end);if(p<1)requestAnimationFrame(step);else el.textContent=end;})(s);}
window.addEventListener('load',function(){document.querySelectorAll('[data-v]').forEach(function(el){var v=parseInt(el.getAttribute('data-v'),10);if(!isNaN(v)&&v>0)countUp(el,v);});});
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
html = html.replace("__MID_CONV_PCT_LBL__", str(_mid_conv_pct_lbl))
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
html = html.replace("__COMPRADORES_STAGE__", COMPRADORES_STAGE)
html = html.replace("__NO_RESP_STAGE__", NO_RESP_STAGE)
html = html.replace("__FOLLOWUP_STAGES_JSON__", json.dumps(list(FOLLOWUP_STAGES), ensure_ascii=False))
# Grupos de duplicados para la pestaña JS
_dup_groups_js = [
    {
        "phone": g["phone"],
        "n_fichas": g["n_fichas"],
        "fichas": [{"cid": f["cid"], "name": f["name"], "n_leads": len(f["rows"])} for f in g["fichas"]],
        "rows": [{"stage": r["stage"], "user": r["user"]} for r in g["rows"]],
    }
    for g in _dup_groups
]
html = html.replace("__DUP_GROUPS_JSON__", json.dumps(_dup_groups_js, ensure_ascii=False))
# Canal de Origen
html = html.replace("__CHANNELS_ROWS__", _ch_rows_html)
html = html.replace("__CHANNEL_INSIGHT__", _channel_insight)
html = html.replace("__UNCLASSIFIED_ALERT__", _unclassified_alert)
# Velocidad de Respuesta
html = html.replace("__RESP_AVG_STR__", _resp_avg_str)
html = html.replace("__RESP_AVG_COLOR__", _resp_avg_color)
html = html.replace("__RESP_LT24_PCT__", str(_resp_lt24_pct))
html = html.replace("__RESP_LT24_N__", str(_resp_lt24_n))
html = html.replace("__RESP_LT24_COLOR__", _resp_lt24_color)
html = html.replace("__RESP_COLD_N__", str(_resp_cold_n))
html = html.replace("__RESP_COLD_PCT__", str(_resp_cold_pct))
html = html.replace("__RESP_SLOW_N__", str(_resp_slow_n))
html = html.replace("__RESP_SLOW_PCT__", str(_resp_slow_pct))
html = html.replace("__VENDOR_RESP_ROWS__", _vendor_resp_html)
# Fichas duplicadas (mismo teléfono en contactos distintos)
_dup_color = "c-red" if total_dup_groups >= 10 else ("c-amber" if total_dup_groups >= 1 else "c-teal")
html = html.replace("__DUP_N__", str(total_dup_fichas))
html = html.replace("__DUP_GROUPS__", str(total_dup_groups))
html = html.replace("__DUP_LEADS_N__", str(total_dup_leads))
html = html.replace("__DUP_COLOR__", _dup_color)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("index.html generado correctamente.")
print("Leads:", total_leads, "| Valor:", fmt_money(total_value), "| Sin Seguimiento:", total_stagnant_7)


# ============================================================================
#  BLOQUE DE INTEGRACIÓN — pegar al FINAL de generar.py
#  (después de:  print("index.html generado correctamente.")  ... )
#
#  No toca nada de tu lógica actual. Solo lee los datos que ya calculaste y
#  escribe un SEGUNDO archivo: panel.html (el dashboard rediseñado).
#  Tu index.html clásico sigue intacto.
# ============================================================================
import json
from dashboard_data import build_dash

# Metas por monto ($) por vendedora — persistentes entre corridas.
# Si no existe metas.json, build_dash pone un default razonable (~110% del valor del mes).
try:
    with open("metas.json", encoding="utf-8") as _mf:
        _metas_monto = json.load(_mf)
except Exception:
    _metas_monto = {}

# Calidad de datos (usa números que ya tienes; ajusta si cambian de nombre).
_sin_suc = sum(1 for r in all_rows if not (r.get("sucursal") or "").strip()
               or (r.get("sucursal") or "").strip().lower() == "sin sucursal")
_open_rows = [r for r in all_rows if r.get("stage") in FOLLOWUP_STAGES]
_open_sin_valor = sum(1 for r in _open_rows if not r.get("value"))
_quality = {
    "sinSucursalPct": round(_sin_suc / total_leads * 100) if total_leads else 0,
    "sinSucursal": _sin_suc,
    "sinValorPct": round(_open_sin_valor / len(_open_rows) * 100) if _open_rows else 0,
    "sinValorOpen": _open_sin_valor,
    "openTotal": len(_open_rows),
    "dupTel": total_dup_groups,
    "dupFichas": total_dup_fichas,
    "nohuman": sum(1 for r in all_rows if r.get("nohuman")),
    "total": total_leads,
}

# Duplicados en el formato que consume el panel.
_dups_panel = [
    {
        "phone": g["phone"],
        "n": g["n_fichas"],
        "fichas": [f["name"] for f in g["fichas"] if f.get("name")],
        "vends": sorted({(r["user"] or "").split(" - ")[0] for r in g["rows"] if r.get("user")}),
        "etapas": sorted({r["stage"] for r in g["rows"] if r.get("stage")}),
    }
    for g in _dup_groups[:40]
]

# Canales: pasa la lista (nombre, dict) tal como la tienes en channel_data.
_channels = list(channel_data.items()) if "channel_data" in dir() else None

dash = build_dash(
    vendors_json_list=vendors_json_list,
    vresp_list=_vresp_list,
    leads=leads + _leads_cross,
    leads_prev=leads_prev,
    user_map=user_map,
    stage_map=stage_map,
    comprador_stage=COMPRADORES_STAGE,
    now_dt=now_dt,
    prev_year=prev_year,
    prev_month=prev_month,
    totals=dict(
        leads=total_leads,
        prev_leads=total_leads_prev,
        compradores=total_compradores,
        value=total_value + _cross_value,
        ticket=ticket_avg,
    ),
    all_rows=all_rows,
    followup_stages=FOLLOWUP_STAGES,
    channels=_channels,
    dups=_dups_panel,
    quality=_quality,
    metas_monto=_metas_monto,
    stages_global=stages_json_list,
    origin=dict(auto=total_auto, manual=total_manual,
                auto_pct=auto_pct, manual_pct=manual_pct),
)

with open("panel.template.html", encoding="utf-8") as _pf:
    _panel = _pf.read()
_panel = _panel.replace("__DASH_JSON__", json.dumps(dash, ensure_ascii=False))
_panel = _panel.replace("__MES_LABEL__", mes_label)

# Build archive list for history dropdown (populated after possible archive step below)
import glob as _glob
_MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
def _build_archive_list():
    lst = []
    for _f in sorted(_glob.glob("panel_????_??.html"), reverse=True):
        _mm = _re.match(r'panel_(\d{4})_(\d{2})\.html', _f)
        if _mm:
            _ay, _am = int(_mm.group(1)), int(_mm.group(2))
            lst.append({"label": f"{_MESES_ES[_am-1]} {_ay}", "url": _f})
    return lst

# Archivo histórico: si el panel.html existente pertenece a un mes distinto,
# guardamos una copia con el nombre del mes antes de sobreescribir.
import os as _os, re as _re
_archive_saved = None
_panel_path = "panel.html"
if _os.path.exists(_panel_path):
    try:
        with open(_panel_path, encoding="utf-8") as _ef:
            _existing = _ef.read()
        _m = _re.search(r'window\.DASH\s*=\s*(\{.*?\});', _existing, _re.DOTALL)
        if _m:
            _old_dash = json.loads(_m.group(1))
            _old_year  = _old_dash.get("year")
            _old_month_name = _old_dash.get("month", "")
            _MES_NUM = {"Enero":1,"Febrero":2,"Marzo":3,"Abril":4,"Mayo":5,"Junio":6,
                        "Julio":7,"Agosto":8,"Septiembre":9,"Octubre":10,"Noviembre":11,"Diciembre":12}
            _old_month = _MES_NUM.get(_old_month_name, 0)
            if _old_year and _old_month and (_old_year != now_dt.year or _old_month != now_dt.month):
                _archive_name = f"panel_{_old_year}_{_old_month:02d}.html"
                if not _os.path.exists(_archive_name):
                    with open(_archive_name, "w", encoding="utf-8") as _af:
                        _af.write(_existing)
                    _archive_saved = _archive_name
                    print(f"Histórico guardado: {_archive_name}")
    except Exception as _e:
        print(f"Aviso: no se pudo archivar panel anterior ({_e})")

_panel = _panel.replace("__ARCHIVE_LIST__", json.dumps(_build_archive_list(), ensure_ascii=False))
with open(_panel_path, "w", encoding="utf-8") as _pf:
    _pf.write(_panel)

print("panel.html (dashboard rediseñado) generado correctamente.")
if _archive_saved:
    print(f"  → Archivo histórico disponible en GitHub Pages como panel_{_old_year}_{_old_month:02d}.html")

# === Patchear archivo del mes anterior con cierres de fecha contrato ===
_all_prev_cross = _prev_cross_from_cur + _prev_cross_from_fetch
if _all_prev_cross:
    _prev_archive = f"panel_{prev_year}_{prev_month:02d}.html"
    print(f"Patcheando {_prev_archive} con {len(_all_prev_cross)} cierres del mes anterior...")
    try:
        if not _os.path.exists(_prev_archive):
            print(f"  ⚠ {_prev_archive} no existe aún — se creará al final del mes o al próximo cierre de mes")
        else:
            with open(_prev_archive, encoding="utf-8") as _paf:
                _prev_content = _paf.read()
            _pm = _re.search(r'window\.DASH\s*=\s*(\{.*?\});', _prev_content, _re.DOTALL)
            if not _pm:
                print(f"  ⚠ No se encontró DASH en {_prev_archive}")
            else:
                _pdash = json.loads(_pm.group(1))
                _pbv = _pdash.get("weekly", {}).get("byVendor", {})
                _pn = 5
                if _pbv:
                    _pn = len(next(iter(_pbv.values()), {}).get("curC", [0]*5))

                def _pwi(day): return min((day - 1) // 7, _pn - 1)

                _padded = 0
                for _pcl in _all_prev_cross:
                    if stage_map.get(_pcl.get("status_id")) != COMPRADORES_STAGE:
                        continue
                    _pct = _pcl.get("_contract_ts")
                    _pwi_idx = _pwi(datetime.datetime.fromtimestamp(_pct).day) if _pct else _pn - 1
                    _pvn  = user_map.get(_pcl.get("responsible_user_id"), "Desconocido")
                    _ppr  = int(float(_pcl.get("price", 0) or 0))
                    if _pvn not in _pbv:
                        _pbv[_pvn] = {"curC":[0]*_pn,"curM":[0]*_pn,"prevC":[0]*_pn,"prevM":[0]*_pn}
                    _pbv[_pvn]["curC"][_pwi_idx] += 1
                    _pbv[_pvn]["curM"][_pwi_idx] += _ppr
                    for _ptv in _pdash.get("team", []):
                        if _ptv.get("name") == _pvn:
                            _ptv["cierres"] = _ptv.get("cierres", 0) + 1
                            _ptv["value"]   = _ptv.get("value", 0) + _ppr
                            if _ptv.get("leads", 0) > 0:
                                _ptv["conv"] = round(_ptv["cierres"] / _ptv["leads"] * 100)
                            break
                    _padded += 1
                _pdash["weekly"]["byVendor"] = _pbv
                _pg = _pdash.get("global", {})
                _pg["cierres"] = _pg.get("cierres", 0) + _padded
                _pdash["global"] = _pg

                with open("panel.template.html", encoding="utf-8") as _ptf:
                    _ptmpl = _ptf.read()
                _prev_mes_label = mes_label_map[prev_month] + " " + str(prev_year)
                _parch_list = [{"label": mes_label, "url": "panel.html"}]
                _pout = _ptmpl.replace("__DASH_JSON__", json.dumps(_pdash, ensure_ascii=False))
                _pout = _pout.replace("__MES_LABEL__", _prev_mes_label)
                _pout = _pout.replace("__ARCHIVE_LIST__", json.dumps(_parch_list, ensure_ascii=False))
                with open(_prev_archive, "w", encoding="utf-8") as _paf2:
                    _paf2.write(_pout)
                print(f"  → {_prev_archive} actualizado con {_padded} cierres (fecha contrato {mes_label_map[prev_month]})")
    except Exception as _pe:
        print(f"  ⚠ Error patcheando {_prev_archive}: {_pe}")
# ============================================================================
