#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generar.py  ·  Heaven Colchones — Panel Comercial
==================================================
Jala datos EN VIVO desde Kommo CRM, los mapea al contrato del panel rediseñado
(window.PANEL_DATA), inyecta el JSON en panel_template.html y publica:

    index.html          ← el panel (lo que sirve GitHub Pages)
    panel.html          ← copia idéntica
    panel_YYYY_MM.html  ← archivo histórico del mes

Uso:
    python generar.py                 # mes en curso
    python generar.py --month 5 --year 2026
    python generar.py --bake-ai       # hornea el análisis IA (usa ANTHROPIC_API_KEY)

Requisitos: solo librería estándar de Python 3. El token de Kommo se lee de la
variable de entorno KOMMO_TOKEN (NUNCA se escribe en el código ni en el HTML).
"""

import os, sys, json, time, re, argparse, calendar, datetime, shutil
from collections import defaultdict
from urllib import request as _rq, parse as _ps, error as _er

# ─────────────────────────────────────────────────────────────────────────────
#  CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────────────────
SUBDOMAIN = (os.environ.get("KOMMO_SUBDOMAIN", "") or "").strip() or "eanez"
WORKER_URL = (os.environ.get("PANEL_WORKER_URL", "") or "").strip() or "https://tight-limit-134e.eduardoxyz22.workers.dev"
BASE_URL  = f"https://{SUBDOMAIN}.kommo.com/api/v4"
TOKEN     = os.environ.get("KOMMO_TOKEN", "").strip()
_DIAG     = []   # mensajes de diagnóstico que se incrustan en index.html

HERE          = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_FILE = os.path.join(HERE, "panel_template.html")

ap = argparse.ArgumentParser(add_help=False)
ap.add_argument("--month", type=int, default=None)
ap.add_argument("--year",  type=int, default=None)
ap.add_argument("--bake-ai", action="store_true")
ap.add_argument("--no-archive", action="store_true")
ARGS, _ = ap.parse_known_args()

MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
         "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

# Identidad por vendedora (color, iniciales, sucursal, metas). Si entra una
# vendedora nueva no listada aquí, se le asignan valores por defecto seguros.
VENDOR_CFG = {
    "Isabel Robledo": dict(ini="IR", color="#00B5AD", suc="Mia Plaza",    metaCierres=45, metaMonto=120000),
    "Maria Flores":   dict(ini="MF", color="#2E6FE0", suc="Buenos Aires", metaCierres=40, metaMonto=105000),
    "Mirian Salazar": dict(ini="MS", color="#7A5AF0", suc="Mia Plaza",    metaCierres=35, metaMonto=120000),
    "Carola Chavez":  dict(ini="CC", color="#D98300", suc="Central",      metaCierres=35, metaMonto=135000),
    "Jonathan Monje": dict(ini="JM", color="#159A57", suc="Central",      metaCierres=8,  metaMonto=105000),
}
DEFAULT_COLORS = ["#00B5AD", "#2E6FE0", "#7A5AF0", "#D98300", "#159A57", "#DC4046", "#22A7C9"]

SUC_COLORS = {"Mia Plaza": "#00B5AD", "Buenos Aires": "#2E6FE0", "Central": "#D98300"}

# Clasificación de etapas del pipeline por palabras clave (case-insensitive).
STAGE_RULES = [
    ("compradores", ["compra", "comprador", "vendido", "ganado", "won", "pagad", "cerrad"]),
    ("no_resp",     ["no responde", "no resp", "sin respuesta", "perdido sin", "frio", "frío", "cold"]),
    ("perdido",     ["perdido", "cancelad", "descartad", "lost"]),
    ("agendado",    ["agendad", "visita", "cita", "agenda", "showroom"]),
    ("cotizacion",  ["cotiz", "propuest", "quot", "presupuest"]),
    ("interesado",  ["interesad", "negocia", "seguimiento", "interest"]),
    ("nueva",       ["nueva", "nuevo", "consulta", "entrante", "inbound", "primer", "lead"]),
]
STAGE_COLORS = {
    "Nueva consulta": "#27313F", "Interesado": "#2E6FE0", "Cotización enviada": "#7A4AD9",
    "Agendado / Visita": "#D98300", "Compradores": "#159A57", "No Responden": "#646E7B",
}

CH_ICON = {
    "Facebook Ads": "📘", "Instagram": "📷", "WhatsApp directo": "📱", "Google Ads": "🔍",
    "Orgánico/Web": "🌐", "Referido": "🤝", "Walk-in (Tienda)": "🚶",
    "Carga manual vendedora": "✍", "Automático (bot)": "⚙", "Otro": "📦",
}

# ─────────────────────────────────────────────────────────────────────────────
#  KOMMO API (stdlib, con reintento ante 429 y manejo de errores)
# ─────────────────────────────────────────────────────────────────────────────
def api_get(path, params=None, _retry=0):
    url = BASE_URL + path + ("?" + _ps.urlencode(params) if params else "")
    req = _rq.Request(url, headers={"Authorization": "Bearer " + TOKEN,
                                    "Content-Type": "application/json"})
    try:
        with _rq.urlopen(req, timeout=40) as r:
            if r.status == 204:
                return {}
            return json.loads(r.read().decode("utf-8"))
    except _er.HTTPError as e:
        if e.code == 429 and _retry < 4:           # rate limit → espera y reintenta
            time.sleep(2 ** _retry * 3)
            return api_get(path, params, _retry + 1)
        if e.code == 204:
            return {}
        try:
            _body = e.read().decode("utf-8")[:300]
        except Exception:
            _body = "(sin cuerpo)"
        _DIAG.append(f"{path} -> HTTP {e.code}: {_body}")
        raise
    except Exception:
        if _retry < 2:
            time.sleep(2)
            return api_get(path, params, _retry + 1)
        raise

def fetch_paginated(path, base_params, key, max_pages=500, sleep=0.18):
    out, page = [], 1
    while page <= max_pages:
        p = dict(base_params); p["page"] = page; p.setdefault("limit", 250)
        try:
            data = api_get(path, p)
        except Exception as e:
            print(f"   ⚠ {path} pág {page}: {e}", file=sys.stderr)
            break
        batch = (data.get("_embedded", {}) or {}).get(key, [])
        if not batch:
            break
        out.extend(batch)
        if "next" not in (data.get("_links", {}) or {}):
            break
        page += 1
        time.sleep(sleep)
    return out

# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS DE CLASIFICACIÓN
# ─────────────────────────────────────────────────────────────────────────────
def classify_stage(name):
    s = (name or "").lower()
    for cls, kws in STAGE_RULES:
        if any(k in s for k in kws):
            return cls
    return "other"

def norm_channel(s):
    s = (s or "").lower()
    if any(k in s for k in ["facebook", "fb ", "meta", "messenger"]): return "Facebook Ads"
    if "instagram" in s or "ig " in s:                                return "Instagram"
    if any(k in s for k in ["whatsapp", "wsp", "wa "]):               return "WhatsApp directo"
    if any(k in s for k in ["google", "gads", "adword", "sem"]):      return "Google Ads"
    if any(k in s for k in ["organic", "orgánic", "web", "seo"]):     return "Orgánico/Web"
    if any(k in s for k in ["referid", "recomend", "boca"]):          return "Referido"
    if any(k in s for k in ["walk", "tienda", "local", "show"]):      return "Walk-in (Tienda)"
    if any(k in s for k in ["manual", "vendedor"]):                   return "Carga manual vendedora"
    if any(k in s for k in ["bot", "automát", "auto"]):               return "Automático (bot)"
    return "Otro"

def contract_ts(lead, contract_field_id):
    """Timestamp del campo 'Fecha contrato' del lead, o None."""
    if not contract_field_id:
        return None
    for cf in (lead.get("custom_fields_values") or []):
        if cf.get("field_id") == contract_field_id:
            vals = cf.get("values") or []
            if vals:
                v = vals[0].get("value")
                try:
                    return int(v)
                except (TypeError, ValueError):
                    try:
                        return int(float(v))
                    except (TypeError, ValueError):
                        return None
    return None


def detect_channel(lead, source_field_id):
    if source_field_id:
        for cf in (lead.get("custom_fields_values") or []):
            if cf.get("field_id") == source_field_id:
                vals = cf.get("values") or [{}]
                ch = norm_channel(str(vals[0].get("value", "")))
                if ch != "Otro":
                    return ch
    for t in ((lead.get("_embedded", {}) or {}).get("tags") or []):
        ch = norm_channel(t.get("name", ""))
        if ch != "Otro":
            return ch
    return "Automático (bot)" if lead.get("created_by") == 0 else "Carga manual vendedora"

def detect_suc(vname, lead):
    for t in ((lead.get("_embedded", {}) or {}).get("tags") or []):
        n = t.get("name", "").lower()
        if "mia" in n or "plaza" in n:   return "Mia Plaza"
        if "buenos" in n or "aires" in n: return "Buenos Aires"
        if "central" in n:                return "Central"
    cfg = VENDOR_CFG.get(vname)
    return cfg["suc"] if cfg else "Sin sucursal"

# ─────────────────────────────────────────────────────────────────────────────
#  PERIODO
# ─────────────────────────────────────────────────────────────────────────────
now   = datetime.datetime.now()
YEAR  = ARGS.year  or now.year
MONTH = ARGS.month or now.month
DIM   = calendar.monthrange(YEAR, MONTH)[1]
CURDAY = now.day if (YEAR == now.year and MONTH == now.month) else DIM
m_start = datetime.datetime(YEAR, MONTH, 1)
m_end   = datetime.datetime(YEAR, MONTH, DIM, 23, 59, 59)
pmo = MONTH - 1 or 12
pyr = YEAR if MONTH > 1 else YEAR - 1
p_start = datetime.datetime(pyr, pmo, 1)
# Mes anterior COMPLETO (para comparativo semanal real). La métrica "mismo día"
# se calcula aparte filtrando por día <= CURDAY (leads_sd).
p_end   = datetime.datetime(pyr, pmo, calendar.monthrange(pyr, pmo)[1], 23, 59, 59)

# ─────────────────────────────────────────────────────────────────────────────
#  AGREGACIÓN POR VENDEDORA
# ─────────────────────────────────────────────────────────────────────────────
def blank_vendor():
    return dict(leads=0, cierres=0, value=0, pipeline=0, noResp=0, agendado=0, interesado=0,
                cotizacion=0, nueva=0, calif=0, manual=0, bot=0, u24=0, nunca=0,
                tarde=0, backlog=0, resp_minutes=[], respH_minutes=[], stage=defaultdict(int),
                leads_sd=0, cierres_sd=0, value_sd=0, agendado_sd=0,
                wl=[0,0,0,0,0], wc=[0,0,0,0,0], wm=[0,0,0,0,0], wu=[0,0,0,0,0])

def aggregate(leads, stage_map, user_map, events, source_field_id, now_ts, won_leads=None, human_msgs=None):
    vd = defaultdict(blank_vendor)
    suc_of = {}
    backlog_rows = []
    _pipe_seen = set()   # ids ya sumados al pipeline (evita doble conteo con won)
    for ld in leads:
        rid = ld.get("responsible_user_id")
        raw_name = user_map.get(rid)
        if not raw_name:
            continue
        # Los usuarios de Kommo vienen como "Nombre Apellido - Sucursal".
        # Separamos: el nombre limpio es la clave; el sufijo es la sucursal.
        if " - " in raw_name:
            name, _suc_suffix = [p.strip() for p in raw_name.split(" - ", 1)]
        else:
            name, _suc_suffix = raw_name.strip(), None
        d = vd[name]
        d["leads"] += 1
        # semana del mes (0..4) por fecha de creación + conteo "mismo día"
        _cre = ld.get("created_at", 0)
        try:
            _day = datetime.datetime.fromtimestamp(_cre).day
        except Exception:
            _day = 1
        _wk = min(4, (_day - 1) // 7)
        d["wl"][_wk] += 1
        if _day <= CURDAY:
            d["leads_sd"] += 1
        if name not in suc_of:
            suc_of[name] = _suc_suffix or detect_suc(name, ld)
        st = stage_map.get(ld.get("status_id"), {"name": "—", "cls": "other"})
        d["stage"][st["name"]] += 1
        cls = st["cls"]
        # PIPELINE = monto de leads con precio en cualquier etapa (menos perdidos)
        _pr = ld.get("price") or 0
        if _pr > 0 and cls != "perdido":
            d["pipeline"] += _pr; _pipe_seen.add(ld.get("id"))
        # Cierres/montos (cerrado) se cuentan por FECHA CONTRATO (bloque won), no aquí.
        if cls == "no_resp":
            d["noResp"] += 1
        elif cls == "agendado":
            d["agendado"] += 1; d["calif"] += 1
            if _day <= CURDAY: d["agendado_sd"] += 1
        elif cls == "cotizacion":
            d["cotizacion"] += 1; d["calif"] += 1
        elif cls == "interesado":
            d["interesado"] += 1; d["calif"] += 1
        elif cls == "nueva":
            d["nueva"] += 1
        if ld.get("created_by") == 0: d["bot"] += 1
        else:                          d["manual"] += 1
        # velocidad de respuesta vía eventos humanos
        ev = events.get(ld.get("id"))
        created = ld.get("created_at", 0)
        # primera respuesta HUMANA real (mensaje saliente de una persona, no bot)
        _hm = (human_msgs or {}).get(ld.get("id"))
        if _hm:
            d["respH_minutes"].append(max(0, (_hm - created) / 60))
        # "Sin seguimiento" = lead abierto que la vendedora no ha tocado/respondido +72h.
        # Excluye comprador y perdido (cerrados) y "No Responden" (el cliente no contesta,
        # no es falta de seguimiento de la vendedora).
        is_open = cls not in ("compradores", "perdido", "no_resp")
        stale_days = 0; never = False
        if ev and ev.get("first"):
            mins = max(0, (ev["first"] - created) / 60)
            d["resp_minutes"].append(mins)
            if mins <= 1440: d["u24"] += 1; d["wu"][_wk] += 1
            else:            d["tarde"] += 1
            stale_days = (now_ts - ev.get("last", ev["first"])) / 86400
            if stale_days > 3 and is_open:
                d["backlog"] += 1
        else:
            d["nunca"] += 1; never = True
            stale_days = (now_ts - created) / 86400
            if is_open:
                d["backlog"] += 1
        # fila de backlog real (lead estancado y abierto)
        if is_open and (stale_days > 3 or never):
            ld_name = (ld.get("name") or "").strip() or f"Lead #{ld.get('id')}"
            backlog_rows.append({"c": ld_name, "id": ld.get("id"), "e": st["name"], "r": name,
                                 "d": int(round(stale_days)), "nh": never})

    # ── VENTAS por FECHA CONTRATO (campo manual = lo que filtra Kommo) ──
    for ld in (won_leads or []):
        raw = user_map.get(ld.get("responsible_user_id"))
        if not raw:
            continue
        nm = raw.split(" - ", 1)[0].strip() if " - " in raw else raw.strip()
        dd = vd[nm]; price = ld.get("price") or 0
        dd["cierres"] += 1; dd["value"] += price
        if ld.get("id") not in _pipe_seen and price > 0:
            dd["pipeline"] += price; _pipe_seen.add(ld.get("id"))
        _ct = ld.get("_contract_ts") or 0
        try:
            _cd = datetime.datetime.fromtimestamp(_ct).day
        except Exception:
            _cd = 1
        _wk = min(4, (_cd - 1) // 7)
        dd["wc"][_wk] += 1; dd["wm"][_wk] += price
        if _cd <= CURDAY:
            dd["cierres_sd"] += 1; dd["value_sd"] += price
        if nm not in suc_of:
            suc_of[nm] = (raw.split(" - ", 1)[1].strip() if " - " in raw
                          else detect_suc(nm, ld))
    return vd, suc_of, backlog_rows

# ─────────────────────────────────────────────────────────────────────────────
#  CONSTRUCCIÓN DE window.PANEL_DATA
# ─────────────────────────────────────────────────────────────────────────────
def build_panel_data(cur, prev, stage_map, user_map, events, source_field_id, contact_phone=None, won=None, won_prev=None, pipe_by_name=None, human_msgs=None):
    now_ts = time.time()
    vcur, suc_of, backlog_rows = aggregate(cur, stage_map, user_map, events, source_field_id, now_ts, won_leads=won, human_msgs=human_msgs)
    vprev, _, _  = aggregate(prev, stage_map, user_map, {}, source_field_id, now_ts, won_leads=won_prev)

    names = list(vcur.keys())
    # ordena: por cierres desc, así el color/índice es estable
    names.sort(key=lambda n: (-vcur[n]["cierres"], -vcur[n]["leads"]))

    # ── calidad de datos REAL (recorre los leads del mes una vez) ──
    _abiertos_sin_valor = 0
    _sin_suc = 0
    _contact_leads = defaultdict(int)   # contact_id -> # de leads (para duplicados)
    for ld in cur:
        st = stage_map.get(ld.get("status_id"), {"cls": "other"})
        _is_open = st["cls"] not in ("compradores", "perdido")
        if _is_open and not (ld.get("price") or 0):
            _abiertos_sin_valor += 1
        # sin sucursal: ni tag ni sufijo de vendedora
        _has_suc = False
        for t in ((ld.get("_embedded", {}) or {}).get("tags") or []):
            n = t.get("name", "").lower()
            if any(k in n for k in ("mia", "plaza", "buenos", "aires", "central")):
                _has_suc = True; break
        if not _has_suc:
            rn = user_map.get(ld.get("responsible_user_id"), "")
            if " - " not in rn:
                _sin_suc += 1
        for c in ((ld.get("_embedded", {}) or {}).get("contacts") or []):
            if c.get("id"): _contact_leads[c["id"]] += 1
    _dup_contactos = sum(1 for c, n in _contact_leads.items() if n >= 2)
    _dup_fichas    = sum(n for c, n in _contact_leads.items() if n >= 2)

    # ── duplicados por TELÉFONO (mismo cliente en 2+ fichas) ──
    contact_phone = contact_phone or {}
    phone_groups = defaultdict(list)   # phone -> [(lead_id, vendor, stage)]
    for ld in cur:
        rn = user_map.get(ld.get("responsible_user_id"), "")
        vend = rn.split(" - ")[0].strip() if rn else "—"
        stg = stage_map.get(ld.get("status_id"), {"name": "—"})["name"]
        for c in ((ld.get("_embedded", {}) or {}).get("contacts") or []):
            ph = contact_phone.get(c.get("id"))
            if ph:
                phone_groups[ph].append((ld.get("id"), vend, stg))
                break
    dup_rows = []
    for ph, items in phone_groups.items():
        if len(items) >= 2:
            vends = sorted(set(i[1] for i in items))
            stgs  = sorted(set(i[2] for i in items))
            dup_rows.append({"phone": ph, "fichas": len(items),
                             "vendedoras": " · ".join(vends), "etapas": " · ".join(stgs),
                             "leadIds": [i[0] for i in items],
                             "estado": "Fusionar" if "Compradores" in stgs else "Revisar"})
    dup_rows.sort(key=lambda r: -r["fichas"])
    if contact_phone:   # solo si pudimos leer teléfonos, sustituye el conteo por el real
        _dup_contactos = len(dup_rows)
        _dup_fichas    = sum(r["fichas"] for r in dup_rows)

    team = []
    for i, name in enumerate(names):
        d = vcur[name]; pv = vprev.get(name, blank_vendor())
        cfg = VENDOR_CFG.get(name, {})
        u24pct = round(d["u24"] / d["leads"] * 100) if d["leads"] else 0
        v_tone = "green" if u24pct >= 70 else "amber" if u24pct >= 40 else "red"
        conv = round(d["cierres"] / d["leads"] * 100, 1) if d["leads"] else 0
        ticket = round(d["value"] / d["cierres"]) if d["cierres"] else 0
        avg_resp = (sum(d["resp_minutes"]) / len(d["resp_minutes"])) if d["resp_minutes"] else 0
        prom = (f"{avg_resp/60:.1f} h" if avg_resp >= 60 else f"{avg_resp:.0f} min") if avg_resp else "—"
        avg_h = (sum(d["respH_minutes"]) / len(d["respH_minutes"])) if d["respH_minutes"] else 0
        promH = (f"{avg_h/60:.1f} h" if avg_h >= 60 else f"{avg_h:.0f} min") if avg_h else "—"
        respHpct = round(len(d["respH_minutes"]) / d["leads"] * 100) if d["leads"] else 0
        califpct = round(d["calif"] / d["leads"] * 100) if d["leads"] else 0
        norpct   = round(d["noResp"] / d["leads"] * 100) if d["leads"] else 0
        pv_ticket = round(pv["value_sd"] / pv["cierres_sd"]) if pv["cierres_sd"] else 0
        prev_leads_sd = pv["leads_sd"]   # leads del mes anterior al mismo día -> MoM justo
        # semanal real (5 semanas: 1-7, 8-14, 15-21, 22-28, 29-31)
        u24w = [ (round(d["wu"][k] / d["wl"][k] * 100) if d["wl"][k] else None) for k in range(5) ]
        weekly      = {"c": d["wc"], "m": d["wm"], "u24": u24w}
        weekly_prev = {"c": pv["wc"], "m": pv["wm"]}
        team.append({
            "ini": cfg.get("ini") or "".join([p[0] for p in name.split()[:2]]).upper(),
            "name": name,
            "suc": suc_of.get(name, "Sin sucursal"),
            "color": cfg.get("color") or DEFAULT_COLORS[i % len(DEFAULT_COLORS)],
            "photo": "",
            "leads": d["leads"], "prevLeads": prev_leads_sd, "cierres": d["cierres"],
            "conv": conv, "ticket": ticket, "value": d["value"],
            "pipeline": (int(round(pipe_by_name.get(name, 0))) if pipe_by_name is not None else d["pipeline"]),
            "calif": d["calif"], "califPct": califpct,
            "noResp": d["noResp"], "noRespPct": norpct,
            "agendado": d["agendado"], "u24": u24pct, "promTxt": prom,
            "promH": promH, "respHPct": respHpct, "respHN": len(d["respH_minutes"]),
            "tarde": d["tarde"], "nunca": d["nunca"], "backlog": d["backlog"],
            "metaCierres": cfg.get("metaCierres", max(8, d["cierres"] + 5)),
            "metaMonto": cfg.get("metaMonto", max(20000, d["value"])),
            "v": v_tone,
            "prev": {"leads": prev_leads_sd, "cierres": pv["cierres_sd"],
                     "visitas": pv["agendado_sd"], "ticket": pv_ticket, "value": pv["value_sd"],
                     "leadsFull": pv["leads"], "cierresFull": pv["cierres"], "valueFull": pv["value"]},
            "origen": {"manual": d["manual"], "bot": d["bot"]},
            "weekly": weekly, "weeklyPrev": weekly_prev,
        })
        if prev_leads_sd == 0 and d["leads"] > 0:
            team[-1]["nuevo"] = True

    # ── globales ──
    G_leads   = sum(t["leads"] for t in team)
    G_prev    = sum(t["prevLeads"] for t in team)
    G_cierres = sum(t["cierres"] for t in team)
    G_value   = sum(t["value"] for t in team)
    G_pipeline = sum(t["pipeline"] for t in team)
    G_ticket  = round(G_value / G_cierres) if G_cierres else 0

    # ── etapas globales ──
    stage_tot = defaultdict(int)
    for n in names:
        for sn, c in vcur[n]["stage"].items():
            stage_tot[sn] += c
    total_st = sum(stage_tot.values()) or 1
    stagesGlobal = [{"name": sn, "count": c, "pct": round(c / total_st * 100),
                     "color": STAGE_COLORS.get(sn, "#9AA3AF")}
                    for sn, c in sorted(stage_tot.items(), key=lambda x: -x[1])]

    # ── métricas ──
    noResp = sum(t["noResp"] for t in team)
    backlog = sum(t["backlog"] for t in team)
    nunca = sum(t["nunca"] for t in team)
    agendado_tot = sum(t["agendado"] for t in team)
    interes_tot = sum(vcur[n]["interesado"] for n in names)
    _all_h = [m for n in names for m in vcur[n]["respH_minutes"]]
    _avg_h_g = (sum(_all_h) / len(_all_h)) if _all_h else 0
    metrics = {
        "promRespH": (f"{_avg_h_g/60:.1f} h" if _avg_h_g >= 60 else f"{_avg_h_g:.0f} min") if _avg_h_g else "—",
        "respHPct": round(len(_all_h) / G_leads * 100) if G_leads else 0,
        "noResp": noResp, "noRespPct": round(noResp / G_leads * 100) if G_leads else 0,
        "backlog": backlog, "backlogPct": round(backlog / G_leads * 100) if G_leads else 0,
        "criticos7d": 0,   # se calcula real más abajo desde backlog_rows
        "nuncaTocados": nunca,
        "sinSucursalFichas": _sin_suc,
        "sinSucursalPct": round(_sin_suc / G_leads * 100) if G_leads else 0,
        "abiertosSinValor": _abiertos_sin_valor,
        "abiertosSinValorPct": round(_abiertos_sin_valor / G_leads * 100) if G_leads else 0,
        "duplicadosTel": _dup_contactos, "duplicadosFichas": _dup_fichas,
        "interesado": interes_tot, "agendado": agendado_tot,
    }

    # ── origen / canales ──
    man = sum(t["origen"]["manual"] for t in team)
    bot = sum(t["origen"]["bot"] for t in team)
    tot_o = man + bot or 1
    origin = {"manual": man, "manualPct": round(man / tot_o * 100),
              "auto": bot, "autoPct": round(bot / tot_o * 100)}

    # canales agregados a partir de detect_channel sobre los leads del mes
    ch_agg = defaultdict(lambda: dict(leads=0, cierres=0, value=0))
    for ld in cur:
        ch_agg[detect_channel(ld, source_field_id)]["leads"] += 1
    for ld in (won or []):
        ca = ch_agg[detect_channel(ld, source_field_id)]
        ca["cierres"] += 1; ca["value"] += ld.get("price") or 0
    channels = []
    for ch, a in sorted(ch_agg.items(), key=lambda x: -x[1]["leads"]):
        conv = round(a["cierres"] / a["leads"] * 100) if a["leads"] else 0
        cls = "green" if (a["leads"] >= 5 and conv >= 10) else "red" if a["leads"] >= 5 else "muted"
        channels.append({
            "ic": CH_ICON.get(ch, "📦"), "name": ch, "leads": a["leads"],
            "pct": round(a["leads"] / (G_leads or 1) * 100), "cierres": a["cierres"],
            "conv": conv, "ticket": round(a["value"] / a["cierres"]) if a["cierres"] else 0,
            "pipeline": a["value"], "cls": cls,
        })

    # ── embudos ──
    def stage_sum(cls_list):
        return sum(c for n in names for sn, c in vcur[n]["stage"].items()
                   if classify_stage(sn) in cls_list)
    _cot = sum(vcur[n]['cotizacion'] for n in names)
    # Embudo monótono decreciente (cada etapa contiene a la siguiente):
    # Leads ⊇ Calificados (interesado+cotización+agendado+compradores) ⊇
    # En cotización/visita (cotización+agendado+compradores) ⊇ Compradores.
    _calif = metrics["interesado"] + _cot + agendado_tot + G_cierres
    _avanz = _cot + agendado_tot + G_cierres
    funnel2 = [
        {"n": "Leads del mes",          "v": G_leads,   "c": "#27313F"},
        {"n": "Calificados",            "v": _calif,    "c": "#2E6FE0"},
        {"n": "En cotización o visita", "v": _avanz,    "c": "#00B5AD"},
        {"n": "Compradores",            "v": G_cierres, "c": "#159A57"},
    ]
    funnel = [{"name": sn, "count": stage_tot.get(sn, 0)} for sn in
              ["Nueva consulta", "Interesado", "Cotización enviada",
               "Agendado / Visita", "Compradores", "No Responden"] if stage_tot.get(sn, 0)]
    if not funnel:  # fallback si los nombres de etapa no coinciden
        funnel = [{"name": s["name"], "count": s["count"]} for s in stagesGlobal[:6]]

    # ── stagesByV ──
    stagesByV = {n: [[sn, c] for sn, c in sorted(vcur[n]["stage"].items(), key=lambda x: -x[1])]
                 for n in names}

    # ── backlog real (top 40 más estancados) ──
    backlog_rows.sort(key=lambda r: r["d"], reverse=True)
    metrics["criticos7d"] = sum(1 for r in backlog_rows if r["d"] >= 7)
    bk_rows = backlog_rows[:300]   # todas las fichas sin seguimiento (tope de seguridad 300)

    # ── alertas accionables, generadas de los datos reales ──
    alerts = []
    convs = [(t, t["conv"]) for t in team if t["cierres"] >= 0 and t["leads"] >= 20 and not t.get("nuevo")]
    if convs:
        worst = min(convs, key=lambda x: x[1])[0]
        if worst["conv"] < 4 and worst["leads"] >= 20:
            alerts.append({"sev":"red","who":worst["name"],
                "t":f"Conversión {worst['conv']}% — la más baja del equipo",
                "d":f"{worst['cierres']} cierres sobre {worst['leads']} leads, bajo el umbral de 4%.",
                "act":"Coaching + auditar cotizaciones."})
    nr = sorted(team, key=lambda t: t["noRespPct"], reverse=True)
    if nr and nr[0]["noRespPct"] >= 40:
        top_nr = [t for t in team if t["noRespPct"] >= 40]
        names_nr = " / ".join(t["name"].split()[0] for t in top_nr[:3])
        tot_nr = sum(t["noResp"] for t in top_nr)
        alerts.append({"sev":"red","who":names_nr,
            "t":f"Vendedoras con alto % en “No responden”",
            "d":f"{names_nr} concentran {tot_nr:,} leads sin respuesta del cliente.".replace(",","."),
            "act":"Segunda cadencia de contacto por WhatsApp."})
    # umbral de backlog (sin seguimiento) por vendedora
    UMBRAL_BK = 25
    bk_top = sorted(team, key=lambda t: t["backlog"], reverse=True)
    if bk_top and bk_top[0]["backlog"] >= UMBRAL_BK:
        offenders = [t for t in team if t["backlog"] >= UMBRAL_BK]
        nm_bk = " / ".join(t["name"].split()[0] for t in offenders[:3])
        tot_bk = sum(t["backlog"] for t in offenders)
        alerts.append({"sev":"red","who":nm_bk,
            "t":f"Backlog de seguimiento sobre el umbral ({UMBRAL_BK}+)",
            "d":f"{nm_bk} acumulan {tot_bk} fichas abiertas sin seguimiento +72h.",
            "act":"Acción masiva: crear tarea a todo el backlog de la vendedora."})
    # (Sin alerta por "abiertos sin valor": en Heaven solo se carga monto al reservar o pagar,
    #  así que la mayoría de leads abiertos sin monto es lo normal y esperado, no un problema.)
    momp = round((G_leads-G_prev)/G_prev*100) if G_prev else 0
    if momp < -5:
        alerts.append({"sev":"amber","who":"Gerencia",
            "t":f"Leads ↓{abs(momp)}% vs mismo periodo de {MESES[pmo]} ({G_leads:,} vs {G_prev:,})".replace(",","."),
            "d":f"Comparado al día {CURDAY} de ambos meses. Caída de captación respecto al periodo equivalente.","act":"Revisar inversión en canales."})
    if nunca >= 20:
        worst_nh = max(team, key=lambda t: t["nunca"])
        alerts.append({"sev":"amber","who":worst_nh["name"],
            "t":f"{nunca} leads nunca tocados",
            "d":f"{worst_nh['name']} tiene {worst_nh['nunca']} sin primera acción registrada.",
            "act":"Repartir backlog en la reunión diaria."})
    # canal manual vs bot
    man_ch = next((c for c in channels if "manual" in c["name"].lower()), None)
    bot_ch = next((c for c in channels if "bot" in c["name"].lower()), None)
    if man_ch and bot_ch and bot_ch["conv"] >= 0 and man_ch["conv"] > 0:
        ratio = round(man_ch["conv"]/bot_ch["conv"]) if bot_ch["conv"] else man_ch["conv"]
        alerts.append({"sev":"green","who":"Equipo",
            "t":f"La carga manual convierte {ratio}× más que el bot" if bot_ch["conv"] else "La carga manual es la que convierte",
            "d":f"Manual {man_ch['conv']}% vs bot {bot_ch['conv']}%. Priorizar captación manual de calidad.",
            "act":"Documentar el playbook de la mejor vendedora."})
    if not alerts:
        alerts.append({"sev":"green","who":"Equipo","t":"Sin alertas críticas este mes",
            "d":"Los indicadores están dentro de rango.","act":"Mantener el ritmo de seguimiento."})

    # ── nav (con badges en vivo) ──
    nav = [
        {"id": "resumen", "label": "Resumen"},
        {"id": "equipo", "label": "Equipo", "badge": str(len(team))},
        {"id": "seguimiento", "label": "Seguimiento", "badge": str(backlog)},
        {"id": "alertas", "label": "Alertas", "badge": str(len(alerts))},
        {"id": "presentacion", "label": "Presentación"},
        {"id": "analisis", "label": "Análisis IA"},
        {"id": "conversion", "label": "Conversión"},
        {"id": "sucursales", "label": "Sucursales"},
        {"id": "proyeccion", "label": "Proyección"},
        {"id": "evolucion", "label": "Evolución"},
        {"id": "datos", "label": "Datos"},
    ]

    # ── archivos (historial) ──
    archives = build_archives()

    return {
        "month": MESES[MONTH], "year": YEAR, "prevMonth": MESES[pmo],
        "curDay": CURDAY, "daysInMonth": DIM,
        "updated": now.strftime("%d/%m %H:%M"),
        "archives": archives,
        "global": {"leads": G_leads, "prevLeads": G_prev, "cierres": G_cierres,
                   "pipeline": G_pipeline, "cerrado": G_value, "ticket": G_ticket},
        "funnel2": funnel2, "stagesGlobal": stagesGlobal, "origin": origin,
        "channels": channels, "metrics": metrics,
        "leadsMomPct": round((G_leads - G_prev) / G_prev * 100) if G_prev else 0,
        "team": team, "funnel": funnel, "nav": nav, "stagesByV": stagesByV,
        "backlogRows": bk_rows, "alerts": alerts, "dupRows": dup_rows[:50],
        "kommoBase": f"https://{SUBDOMAIN}.kommo.com",
        "workerUrl": WORKER_URL,
    }

def build_archives():
    """Una entrada por mes (sin duplicados). El mes en curso apunta a "#" (index.html en vivo);
    los meses pasados a su panel_YYYY_MM.html. Orden: más reciente primero."""
    months = {}  # (año, mes) -> archivo
    for f in os.listdir(HERE):
        if f.startswith("panel_") and f.endswith(".html"):
            stem = f[len("panel_"):-len(".html")]          # "2026_06"
            parts = stem.split("_")
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                months[(int(parts[0]), int(parts[1]))] = f
    months[(YEAR, MONTH)] = "#"                            # mes actual = en vivo (sobrescribe su archivo)
    out = []
    for (y, m) in sorted(months, key=lambda k: (k[0], k[1]), reverse=True)[:12]:
        out.append({"label": f"{MESES[m]} {y}", "url": months[(y, m)]})
    return out

# ─────────────────────────────────────────────────────────────────────────────
#  IA (hornea el diagnóstico + los 4 agentes con la API gratuita de Google Gemini)
# ─────────────────────────────────────────────────────────────────────────────
AI_ERRORS = {}  # último error por analista, para diagnóstico (se hornea en ai_debug)

def _ai_call(key, prompt, attempts=3, tag=""):
    """Llama a Gemini 2.5 Flash y devuelve un dict JSON (o None).
    Manejo correcto del tier gratis: ante HTTP 429 espera lo que pide la API
    (retryDelay, o ~35s) en vez de ametrallar; ante 400 cambia de config; y
    registra el último error en AI_ERRORS[tag] para poder diagnosticarlo."""
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           "gemini-2.5-flash:generateContent?key=" + key)
    def _post(gen_cfg):
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        if gen_cfg:
            payload["generationConfig"] = gen_cfg
        body = json.dumps(payload).encode()
        req = _rq.Request(url, data=body, headers={"content-type": "application/json"})
        with _rq.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    base = {"temperature": 0.5, "maxOutputTokens": 12000, "responseMimeType": "application/json"}
    cfgs = [dict(base, thinkingConfig={"thinkingBudget": 0}),  # 1º: sin "pensamiento", JSON puro
            base]                                              # 2º: igual pero sin tocar thinking
    last = ""
    waits_429 = 0
    for attempt in range(attempts):
        ci = 0
        while ci < len(cfgs):
            try:
                data = _post(cfgs[ci])
            except _er.HTTPError as e:
                body = ""
                try:
                    body = e.read().decode()
                except Exception:
                    pass
                qid = "; ".join(re.findall(r'"quota(?:Id|Metric)"\s*:\s*"([^"]+)"', body))
                last = f"HTTP {e.code}" + (f" [{qid}]" if qid else "") + f": {body[:200]}"
                if e.code == 429 and waits_429 < 4:
                    waits_429 += 1
                    m = re.search(r'"retryDelay"\s*:\s*"(\d+)', body)
                    wait = (int(m.group(1)) + 3) if m else 35
                    print(f"      ({tag}) 429 rate-limit: espero {min(wait,70)}s…")
                    time.sleep(min(wait, 70))
                    continue                       # reintenta el MISMO config, sin ráfaga
                if e.code == 400:
                    ci += 1                        # config rechazada → siguiente tier
                    continue
                time.sleep(5)                      # 5xx u otros: pequeña pausa y siguiente
                ci += 1
                continue
            except Exception as ex:
                last = str(ex)
                ci += 1
                continue
            cand = (data.get("candidates") or [{}])[0]
            parts = ((cand.get("content") or {}).get("parts")) or [{}]
            txt = "".join(p.get("text", "") for p in parts)
            txt = txt.replace("```json", "").replace("```", "").strip()
            s, e2 = txt.find("{"), txt.rfind("}")
            if s >= 0 and e2 > s:
                try:
                    return json.loads(txt[s:e2 + 1])
                except Exception as ex:
                    last = "json.loads: " + str(ex)
            else:
                last = "finishReason=" + str(cand.get("finishReason")) + " sin texto"
            ci += 1
        if attempt < attempts - 1:
            time.sleep(6 + 6 * attempt)            # backoff entre rondas: 6s, 12s
    if tag:
        AI_ERRORS[tag] = last[:420]
    print(f"      ({tag}) Gemini sin respuesta tras {attempts} rondas: {last[:120]}")
    return None


def _prev_bake():
    """Lee ai_diagnostico / ai_agentes del index.html ya publicado (corrida anterior),
    para reutilizarlos como red de seguridad si Gemini falla en esta corrida."""
    try:
        p = os.path.join(HERE, "index.html")
        if not os.path.exists(p):
            return {}
        html = open(p, encoding="utf-8").read()
        m = re.search(r"window\.PANEL_DATA\s*=\s*(\{.*?\});", html, re.S)
        if not m:
            return {}
        old = json.loads(m.group(1))
        return {"ai_diagnostico": old.get("ai_diagnostico"), "ai_agentes": old.get("ai_agentes") or {}}
    except Exception as ex:
        print(f"      (sin bake previo disponible: {ex})")
        return {}


def build_history(pd):
    """Serie histórica mensual (global + por vendedora) para la pestaña Evolución.
    Lee los paneles archivados (panel_YYYY_MM.html), sintetiza el mes anterior desde
    los campos prev* si no hay archivo, y agrega el mes en curso desde pd."""
    MES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    def _cv(c, l): return round(c / l * 100, 1) if l else 0
    def _pt(y, m, G, team):
        cerr = G.get("cerrado", G.get("value", 0) or 0)
        cier = G.get("cierres", 0)
        return {"y": y, "m": m, "label": f"{MES[m]} {str(y)[2:]}",
                "leads": G.get("leads", 0), "cierres": cier,
                "conv": _cv(cier, G.get("leads", 0)),
                "cerrado": cerr,
                "ticket": G.get("ticket") or (round(cerr / cier) if cier else 0),
                "team": {t.get("name", ""): {
                    "leads": t.get("leads", 0), "cierres": t.get("cierres", 0),
                    "conv": _cv(t.get("cierres", 0), t.get("leads", 0)),
                    "value": t.get("value", 0), "ticket": t.get("ticket", 0)}
                    for t in (team or []) if t.get("name")}}
    def _from_dash(d):
        """Adapta el formato viejo (window.DASH, p.ej. el panel de mayo) al moderno.
        'cerrado' sale de la etapa Compradores (es el 'Cerrado en el mes' de ese panel)."""
        G0 = d.get("global") or {}
        cerr = 0
        for s in (d.get("stages") or []):
            if "comprador" in str(s.get("name", "")).lower():
                cerr = s.get("value", 0) or 0
        G = {"leads": G0.get("leads", 0), "cierres": G0.get("cierres", 0),
             "cerrado": cerr or G0.get("pipeline", 0), "ticket": G0.get("ticket", 0)}
        team = [{"name": (t.get("name", "").split(" - ")[0]).strip(),
                 "leads": t.get("leads", 0), "cierres": t.get("cierres", 0),
                 "value": t.get("value", 0), "ticket": t.get("ticket", 0)}
                for t in (d.get("team") or [])]
        return G, team
    pts = {}
    import glob as _gl
    for p in sorted(_gl.glob(os.path.join(HERE, "panel_2???_??.html"))):
        mm = re.search(r"panel_(\d{4})_(\d{2})\.html$", p)
        if not mm:
            continue
        y, m = int(mm.group(1)), int(mm.group(2))
        if (y, m) == (YEAR, MONTH):
            continue  # el mes en curso sale de pd, no del archivo
        try:
            html = open(p, encoding="utf-8").read()
            j = re.search(r"window\.PANEL_DATA\s*=\s*(\{.*?\});", html, re.S)
            if j:
                old = json.loads(j.group(1))
                pts[(y, m)] = _pt(y, m, old.get("global") or {}, old.get("team") or [])
                continue
            j = re.search(r"window\.DASH\s*=\s*(\{.*?\});", html, re.S)
            if j:
                G0, t0 = _from_dash(json.loads(j.group(1)))
                pts[(y, m)] = _pt(y, m, G0, t0)
                print(f"      (historia: {os.path.basename(p)} leído en formato viejo DASH)")
        except Exception as ex:
            print(f"      (historia: no pude leer {os.path.basename(p)}: {ex})")
    # Mes anterior: el ARCHIVO del panel de ese mes manda (es el panel que corrió ese mes,
    # con todas sus ventas). El fetch en vivo solo rellena si no hay archivo — sabiendo que
    # puede subcontar cierres (no ve ventas de leads creados en meses previos).
    py, pm = (YEAR, MONTH - 1) if MONTH > 1 else (YEAR - 1, 12)
    team = pd.get("team") or []
    if (py, pm) not in pts and any((t.get("prev") or {}).get("leadsFull") or (t.get("prev") or {}).get("leads") for t in team):
        Gp = {"leads": sum((t.get("prev") or {}).get("leadsFull", 0) for t in team),
              "cierres": sum((t.get("prev") or {}).get("cierresFull", 0) for t in team),
              "cerrado": sum((t.get("prev") or {}).get("valueFull", 0) for t in team)}
        tp = [{"name": t["name"], "leads": (t.get("prev") or {}).get("leadsFull", 0),
               "cierres": (t.get("prev") or {}).get("cierresFull", 0),
               "value": (t.get("prev") or {}).get("valueFull", 0)} for t in team]
        if Gp["leads"]:
            pts[(py, pm)] = _pt(py, pm, Gp, tp)
        elif (py, pm) not in pts:
            # compatibilidad: si aún no hay *Full (corrida vieja), usa el corte al mismo día
            Gs = {"leads": pd["global"].get("prevLeads", 0),
                  "cierres": sum((t.get("prev") or {}).get("cierres", 0) for t in team),
                  "cerrado": sum((t.get("prev") or {}).get("value", 0) for t in team)}
            pts[(py, pm)] = _pt(py, pm, Gs, [])
    cur = _pt(YEAR, MONTH, pd["global"], team)
    cur["now"] = True                       # mes en curso (parcial)
    cur["cutDay"] = pd.get("curDay", 0)
    # corte del mes anterior al MISMO día, para que las flechas del mes en curso comparen parejo
    cur["prevSd"] = {"leads": pd["global"].get("prevLeads", 0),
                     "cierres": sum((t.get("prev") or {}).get("cierres", 0) for t in team),
                     "cerrado": sum((t.get("prev") or {}).get("value", 0) for t in team)}
    cur["prevSd"]["conv"] = _cv(cur["prevSd"]["cierres"], cur["prevSd"]["leads"])
    pts[(YEAR, MONTH)] = cur
    pd["history"] = [pts[k] for k in sorted(pts)]
    print(f"   ✓ historia: {len(pd['history'])} mes(es) → {[h['label'] for h in pd['history']]}")
    return pd


def build_wsp(pd):
    """Genera pd["wsp"]: resumen corto listo para copiar y pegar en el grupo de WhatsApp.
    Usa formato de WhatsApp (*negrita*, _cursiva_) y datos reales del mes."""
    try:
        G, M, team = pd["global"], pd["metrics"], pd["team"]
        def bs(v): return f"{int(round(v)):,}".replace(",", ".")
        conv = round(G["cierres"] / G["leads"] * 100, 1) if G["leads"] else 0
        hoy = datetime.date.today().strftime("%d/%m")
        rank = sorted(team, key=lambda t: (t["cierres"], t["value"]), reverse=True)
        medals = ["🥇", "🥈", "🥉"] + ["•"] * 10
        rank_lines = "\n".join(
            f"{medals[i]} {t['name'].split()[0]} ({t['suc']}): {t['cierres']} cierres · Bs {bs(t['value'])}"
            for i, t in enumerate(rank))
        peores_bk = sorted(team, key=lambda t: t["backlog"], reverse=True)[:2]
        bk_txt = " y ".join(f"{t['name'].split()[0]} ({t['backlog']})" for t in peores_bk if t["backlog"] > 0)
        crit = M.get("criticos7d", 0)
        meta_tot = sum(t.get("metaCierres", 0) for t in team)
        gap = max(0, meta_tot - G["cierres"])
        prev_line = ""
        h = pd.get("history") or []
        if len(h) >= 2:
            pm = h[-2]
            prev_line = (f"_Mes anterior ({pm['label']}): {pm['cierres']} cierres · "
                         f"Bs {bs(pm.get('cerrado', 0))} cerrado_\n")
        focos = [f"• {M['backlog']} fichas sin seguimiento +72h" + (f" — peores: {bk_txt}" if bk_txt else "")]
        if crit:
            focos.append(f"• {crit} fichas llevan *+7 días* sin tocar → rescatarlas HOY")
        if M.get("noResp"):
            focos.append(f"• {M['noResp']} en \"no responden\" — reactivar con oferta/recordatorio")
        pd["wsp"] = (
            f"*📊 Heaven Colchones — resumen {hoy}*\n\n"
            f"*Mes de {pd['month']}:* {G['leads']} leads · {G['cierres']} cierres ({conv}%) · "
            f"Bs {bs(G['cerrado'])} cerrado · pipeline Bs {bs(G['pipeline'])}\n"
            + prev_line +
            f"\n*🏆 Ranking de cierres*\n{rank_lines}\n\n"
            f"*⚠️ Focos de la semana*\n" + "\n".join(focos) + "\n\n"
            f"*🎯 Meta del mes:* {meta_tot} cierres — faltan {gap}. ¡Vamos equipo! 💪")
        print("   ✓ resumen WhatsApp generado")
    except Exception as ex:
        print(f"   ⚠ no se pudo generar el resumen WhatsApp: {ex}")
    return pd


def bake_ai(pd):
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        print("   · sin GEMINI_API_KEY → el panel mostrará la lectura base de IA")
        return pd
    G, M, team = pd["global"], pd["metrics"], pd["team"]
    ch = pd.get("channels", []) or []
    def _conv(c, l): return round(c / l * 100, 1) if l else 0
    mom = round((G["leads"] - G["prevLeads"]) / G["prevLeads"] * 100) if G.get("prevLeads") else 0

    # Línea por vendedora (versión rica, idéntica a la Sala de expertos del frontend)
    team_lines = "\n".join(
        f"{t['name']} (sucursal {t['suc']}): {t['leads']} leads (mes previo {t['prevLeads']}), "
        f"{t['cierres']} cierres, {_conv(t['cierres'], t['leads'])}% conv "
        f"[mes previo: {(t.get('prev') or {}).get('cierres', 0)} cierres, "
        f"{_conv((t.get('prev') or {}).get('cierres', 0), t['prevLeads'])}% conv, "
        f"cerrado Bs {(t.get('prev') or {}).get('value', 0)}], "
        f"{t['noResp']} no-responden ({t['noRespPct']}%), {t['backlog']} backlog, "
        f"{t['nunca']} nunca-tocados, {t['u24']}% <24h, 1ª resp humana {t.get('promH', '—')} "
        f"({t.get('respHPct', 0)}% de sus leads con mensaje humano), ticket Bs {t['ticket']}"
        for t in team)

    # Roll-up por sucursal
    roll = {}
    for t in team:
        b = roll.setdefault(t["suc"], {"leads": 0, "prev": 0, "cierres": 0, "value": 0, "n": 0})
        b["leads"] += t["leads"]; b["prev"] += t["prevLeads"]; b["cierres"] += t["cierres"]
        b["value"] += t["value"]; b["n"] += 1
    branch_lines = "\n".join(
        f"{s}: {b['n']} vendedora(s), {b['leads']} leads (mes previo {b['prev']}, "
        f"{round((b['leads'] - b['prev']) / (b['prev'] or 1) * 100)}%), {b['cierres']} cierres, "
        f"{_conv(b['cierres'], b['leads'])}% conv, cerrado Bs {b['value']}"
        for s, b in roll.items())

    ch_semi = "; ".join(f"{c['name']} {c['leads']} leads / {c['conv']}% conv / {c['cierres']} cierres" for c in ch)
    ch_dot = " · ".join(f"{c['name']} {c['leads']}/{c['conv']}%/{c['cierres']}" for c in ch)

    ctx = (
        f"Heaven Colchones (Bolivia), mes {pd['month']} {pd['year']}. Moneda Bs.\n"
        f"Global: {G['leads']} leads (mes previo {G['prevLeads']}, {mom}% MoM), {G['cierres']} cierres, "
        f"conversión {_conv(G['cierres'], G['leads'])}% (= {G['cierres']}/{G['leads']}), ticket Bs {G['ticket']}.\n"
        f"MES ANTERIOR ({pd.get('prevMonth', 'mes previo')}) CORTADO AL MISMO DÍA del mes (comparación pareja, NO es el total del mes): {G['prevLeads']} leads, "
        f"{sum((t.get('prev') or {}).get('cierres', 0) for t in team)} cierres, "
        f"{_conv(sum((t.get('prev') or {}).get('cierres', 0) for t in team), G['prevLeads'])}% conv, "
        f"cerrado Bs {sum((t.get('prev') or {}).get('value', 0) for t in team)}.\n"
        "COMPARA SIEMPRE contra el mes anterior: di explícitamente quién mejoró y quién retrocedió, "
        "citando ambas cifras (antes → ahora), tanto a nivel global como por vendedora.\n"
        f"DINERO (Bs): CERRADO {G['cerrado']} = producto YA entregado y facturado. "
        f"PIPELINE {G['pipeline']} = cerrado + reservado; el reservado (pipeline − cerrado = {G['pipeline'] - G['cerrado']}) "
        "son ventas con anticipo/pago parcial, prácticamente aseguradas. El pipeline NO son oportunidades inciertas ni dinero 'en riesgo'.\n"
        "MODELO DE NEGOCIO (respétalo siempre): venden colchones; solo se carga un monto cuando el cliente RESERVA o deja un pago parcial. "
        "Por eso la mayoría de los leads abiertos NO tienen monto, y eso es NORMAL y esperado — NO es un problema de datos ni de higiene. "
        "NO lo señales como defecto ni recomiendes 'cargar valor al cotizar'.\n"
        f"\"No responden\" {M['noResp']} ({M['noRespPct']}%). Sin seguimiento +72h: {M['backlog']} ({M['backlogPct']}%). Nunca tocados: {M['nuncaTocados']}.\n"
        "IMPORTANTE: cada lead SÍ está identificado por sucursal — se atribuye a la sucursal de su vendedora. "
        "Las 3 sucursales son Mia Plaza, Buenos Aires y Central.\n"
        f"Canales: {ch_semi}.\n"
        f"Roll-up por sucursal (con comparativo vs mes anterior):\n{branch_lines}\n"
        f"Equipo (con leads del mes vs mes anterior):\n{team_lines}")

    # Forma JSON de cada analista (compacta para que la respuesta NO se trunque)
    shape_agent = ('{"resumen":"2-3 frases","hallazgos":[{"t":"hallazgo con números","sev":"alto|medio|bajo"}],'
                   '"recomendaciones":[{"accion":"qué hacer","impacto":"resultado esperado"}]}')
    rule_a = (" Responde SOLO ese JSON válido, sin texto extra. Máx 3 hallazgos y 2 recomendaciones. "
              "Español de Bolivia, directo, con nombres propios y cifras. No repitas los totales globales: "
              "aporta el ángulo que solo tu especialidad vería.")
    negocio = ("Contexto de negocio: vende colchones; el PIPELINE en Bs = CERRADO (entregado y facturado) + RESERVADO "
               "(anticipos/pagos parciales), ingreso casi asegurado. Solo se carga un monto cuando el cliente reserva o "
               "paga, por eso la mayoría de los leads abiertos NO tiene monto y eso es NORMAL (no es problema de datos; "
               "no lo señales como defecto).")

    top = sorted(team, key=lambda t: t["cierres"], reverse=True)[0] if team else None
    worst_l = sorted([t for t in team if t["cierres"] > 0], key=lambda t: t["conv"])
    worst = worst_l[0] if worst_l else None
    g_conv = _conv(G["cierres"], G["leads"])

    # Un prompt CORTO por analista -> respuestas pequeñas, sin truncado; si una falla, se reintenta sola
    P = {}
    P["diagnostico"] = (
        "Eres analista comercial senior de Heaven Colchones (Bolivia). " + negocio + "\n"
        "DATOS DEL MES:\n" + ctx + "\n"
        f"Top en cierres: {top['name'] if top else '—'}. Más débil en conversión: {worst['name'] if worst else '—'}.\n"
        "Entrega un diagnóstico de portada. Responde SOLO JSON válido, sin texto extra, forma EXACTA:\n"
        '{"titular":"frase contundente máx 11 palabras","diagnostico":"2-3 frases con el insight central y números",'
        '"palancas":["acción 1","acción 2","acción 3"],"riesgo":"el mayor riesgo en 1 frase"}')
    P["crm"] = (
        "Eres el ANALISTA DE CRM (Kommo) de Heaven Colchones (Bolivia). " + negocio + "\n"
        "Tu ÚNICO tema es la HIGIENE del embudo: velocidad de primera respuesta (% <24h por vendedora), backlog +72h, "
        "leads nunca-tocados y \"no responden\" (rapidez de seguimiento). Di QUIÉN tiene el peor hábito de seguimiento y "
        "qué fichas rescatar primero. NO opines de ventas, ticket ni dinero.\n"
        f"Global de seguimiento: backlog +72h {M['backlog']} ({M['backlogPct']}%), nunca tocados {M['nuncaTocados']}, "
        f"\"no responden\" {M['noResp']} ({M['noRespPct']}%).\nEquipo:\n" + team_lines + "\n"
        "Forma EXACTA: " + shape_agent + rule_a)
    P["ventas"] = (
        "Eres el ANALISTA DE VENTAS de Heaven Colchones (Bolivia). " + negocio + "\n"
        "Tu ÚNICO tema es el RESULTADO comercial: conversión por vendedora (compradores/leads), ticket promedio, "
        "pipeline en Bs y dónde está el dinero. Compara por EFICIENCIA (no por volumen) y di quién deja dinero sobre la "
        "mesa. NO hables de disciplina de CRM ni de canales.\n"
        f"Global: {G['cierres']} cierres, {g_conv}% conv, cerrado Bs {G['cerrado']}, pipeline Bs {G['pipeline']} "
        f"(reservado Bs {G['pipeline'] - G['cerrado']}), ticket Bs {G['ticket']}.\nEquipo:\n" + team_lines + "\n"
        "Forma EXACTA: " + shape_agent + rule_a)
    P["comportamiento"] = (
        "Eres el ANALISTA DE COMPORTAMIENTO y CANALES de Heaven Colchones (Bolivia). " + negocio + "\n"
        f"Tu ÚNICO tema: por qué entran y por qué se enfrían los leads. El {M['noRespPct']}% termina en \"no responden\". "
        "NO hables de metas individuales ni de la disciplina de cada vendedora. Explica el PATRÓN: qué canal y qué etapa "
        f"pierde clientes, y cómo reactivar los {M['noResp']} que no responden.\n"
        f"Canales (leads/conv%/cierres): {ch_dot}.\n"
        "Forma EXACTA: " + shape_agent + rule_a)
    P["sintesis"] = (
        "Eres el DIRECTOR COMERCIAL de Heaven Colchones (Bolivia). " + negocio + "\n"
        "Combina operación de CRM, ventas y comportamiento en UN plan priorizado de 3 decisiones para la reunión de "
        "gerencia, ordenadas por impacto en Bs, cada una con responsable y meta concreta.\n"
        "DATOS DEL MES:\n" + ctx + "\n"
        "Responde SOLO JSON válido, sin texto extra, forma EXACTA:\n"
        '{"resumen":"3 frases con el veredicto del mes","hallazgos":[{"t":"prioridad con número","sev":"alto|medio|bajo"}],'
        '"recomendaciones":[{"accion":"iniciativa con responsable","impacto":"meta concreta en Bs o cierres"}]}'
        " Máx 3 hallazgos y 3 recomendaciones. Español de Bolivia, directo, con nombres y números.")

    def _ok(name, r):
        if not isinstance(r, dict):
            return False
        return bool(r.get("titular")) if name == "diagnostico" else bool(r.get("resumen"))

    # Llamadas chicas y espaciadas (los 10 RPM del tier gratis dan de sobra)
    order = ["diagnostico", "crm", "ventas", "comportamiento", "sintesis"]
    res = {}
    for name in order:
        time.sleep(1.5)
        r = _ai_call(key, P[name], tag=name)
        if _ok(name, r):
            res[name] = r
            print(f"   ✓ IA '{name}' OK")
        else:
            print(f"   · IA '{name}' vacío (se reintentará)")

    # Relleno de huecos: reintenta SOLO lo que faltó, tras una pausa (abre nueva ventana de RPM)
    missing = [n for n in order if n not in res]
    if missing:
        print(f"   ↻ reintentando: {missing}")
        time.sleep(8)
        for name in missing:
            time.sleep(2.5)
            r = _ai_call(key, P[name], tag=name)
            if _ok(name, r):
                res[name] = r
                print(f"   ✓ IA '{name}' OK (reintento)")
            else:
                print(f"   ⚠ IA '{name}' sin contenido tras reintento")

    # Red de seguridad: lo que falló incluso tras el reintento conserva el
    # análisis de la corrida anterior (mejor un análisis de hace horas que una tarjeta vacía)
    fallidos = [n for n in order if n not in res]
    if fallidos:
        prev = _prev_bake()
        for n in fallidos:
            old = prev.get("ai_diagnostico") if n == "diagnostico" else (prev.get("ai_agentes") or {}).get(n)
            if _ok(n, old):
                res[n] = old
                print(f"   ↺ '{n}' reutiliza el análisis de la corrida anterior")

    # Hornea cada pieza por separado (un fallo pierde UNA tarjeta, no todas)
    if _ok("diagnostico", res.get("diagnostico")):
        pd["ai_diagnostico"] = res["diagnostico"]
    agentes_out = {a: res[a] for a in ("crm", "ventas", "comportamiento", "sintesis") if _ok(a, res.get(a))}
    if agentes_out:
        pd["ai_agentes"] = agentes_out
    if fallidos:
        pd["ai_debug"] = {n: (("(rescatado con el análisis anterior) " if n in res else "")
                              + AI_ERRORS.get(n, "sin detalle")) for n in fallidos}
    print(f"   → IA horneada: diagnóstico={'sí' if 'ai_diagnostico' in pd else 'no'} · agentes={list(agentes_out)}")
    return pd

# ─────────────────────────────────────────────────────────────────────────────
#  RENDER + ESCRITURA
# ─────────────────────────────────────────────────────────────────────────────
def write_outputs(pd):
    if not os.path.exists(TEMPLATE_FILE):
        sys.exit(f"✗ Falta {TEMPLATE_FILE}. Sube panel_template.html al repo.")
    tpl = open(TEMPLATE_FILE, encoding="utf-8").read()
    data_block = "window.PANEL_DATA = " + json.dumps(pd, ensure_ascii=False) + ";"
    html = tpl.replace("__PANEL_DATA__", data_block)
    diag_comment = "<!-- DIAG_KOMMO\n" + "\n".join(_DIAG) + "\n-->\n"
    html = diag_comment + html

    # archiva el mes en curso ANTES de sobrescribir, si ya existía con datos previos
    arch_name = f"panel_{YEAR}_{MONTH:02d}.html"
    for out in ("index.html", "panel.html", arch_name):
        with open(os.path.join(HERE, out), "w", encoding="utf-8") as f:
            f.write(html)
    print(f"   ✓ index.html + panel.html + {arch_name}")

# ─────────────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────────────
def kommo_selftest():
    """Prueba directa de credenciales: /account dice si el token sirve."""
    _DIAG.append(f"subdominio={SUBDOMAIN} · token_len={len(TOKEN)} · token_prefix={TOKEN[:6] if TOKEN else '(vacio)'}")
    try:
        acc = api_get("/account")
        _DIAG.append(f"/account OK -> id={acc.get('id')} name={acc.get('name')}")
    except Exception as e:
        _DIAG.append(f"/account FALLO -> {type(e).__name__}: {e}")
    try:
        t = api_get("/leads", {"limit": 1})
        n = len((t.get('_embedded',{}) or {}).get('leads',[]))
        _DIAG.append(f"/leads?limit=1 OK -> devolvio {n} lead(s)")
    except Exception as e:
        _DIAG.append(f"/leads FALLO -> {type(e).__name__}: {e}")

def main():
    if not TOKEN:
        sys.exit("✗ Falta KOMMO_TOKEN (variable de entorno / secret de GitHub).")
    print(f"🏗  Heaven · {MESES[MONTH]} {YEAR}")
    kommo_selftest()
    for d in _DIAG: print("   ·", d)

    print("  📡 pipelines…")
    pls = fetch_paginated("/leads/pipelines", {}, "pipelines", max_pages=10)
    stage_map = {}
    for pl in pls:
        pl_main = pl.get("is_main", True)   # pipeline principal = el tablero Heaven Kommo
        for st in (pl.get("_embedded", {}) or {}).get("statuses", []):
            stage_map[st["id"]] = {"name": st.get("name", "—"),
                                   "cls": classify_stage(st.get("name", "")),
                                   "main": pl_main}

    print("  👥 usuarios…")
    users = fetch_paginated("/users", {}, "users", max_pages=10)
    user_map = {u["id"]: u.get("name", "") for u in users}

    print("  🔎 campo de origen…")
    try:
        cfs = fetch_paginated("/leads/custom_fields", {}, "custom_fields", max_pages=10)
        source_field_id = next((c["id"] for c in cfs
            if any(k in ((c.get("code") or "") + (c.get("name") or "")).lower()
                   for k in ["fuente", "origen", "source", "canal", "utm", "procedencia"])), None)
        contract_field_id = next((c["id"] for c in cfs
            if "contrato" in ((c.get("code") or "") + (c.get("name") or "")).lower()
            and c.get("type") in ("date", "date_time")), None)
        # buscar también campos de fecha por si el nombre no incluye "contrato"
        _date_fields = [f"{c.get('name','?')}#{c.get('id')}[{c.get('type','?')}]"
                        for c in cfs if c.get("type") in ("date", "date_time", "birthday")]
        _DIAG.append("campos_fecha=" + (" | ".join(_date_fields) if _date_fields else "ninguno"))
        _DIAG.append(f"contract_field_id={contract_field_id}")
    except Exception as _e:
        source_field_id = None; contract_field_id = None
        _DIAG.append(f"campos_error={_e}")

    print("  ⚡ eventos del mes…")
    raw_ev = fetch_paginated("/events", {
        "filter[entity][]": "lead",
        "filter[created_at][from]": int(m_start.timestamp()),
        "filter[created_at][to]":   int(m_end.timestamp()),
        "limit": 100}, "events", max_pages=400, sleep=0.15)
    events = {}
    for e in raw_ev:
        if e.get("created_by", 0) == 0:   # bot → ignora
            continue
        lid, ts = e.get("entity_id"), e.get("created_at", 0)
        if not lid:
            continue
        slot = events.setdefault(lid, {})
        slot["first"] = min(slot.get("first", ts), ts)
        slot["last"]  = max(slot.get("last", ts), ts)

    # Mensajes SALIENTES escritos por una persona (no el salesbot): la única señal
    # honesta de "alguien respondió al cliente". Eventos tipo outgoing_chat_message.
    print("  💬 mensajes humanos del mes…")
    human_msgs = {}
    try:
        raw_msg = fetch_paginated("/events", {
            "filter[entity][]": "lead",
            "filter[type]": "outgoing_chat_message",
            "filter[created_at][from]": int(m_start.timestamp()),
            "filter[created_at][to]":   int(m_end.timestamp()),
            "limit": 100}, "events", max_pages=300, sleep=0.15)
        for e in raw_msg:
            if e.get("created_by", 0) == 0:    # mensaje del bot → fuera
                continue
            lid, ts = e.get("entity_id"), e.get("created_at", 0)
            if not lid:
                continue
            if lid not in human_msgs or ts < human_msgs[lid]:
                human_msgs[lid] = ts
        print(f"     → {len(human_msgs)} leads con respuesta humana real")
    except Exception as _e:
        _DIAG.append(f"msgs_error={_e}")
        print(f"     ⚠ no pude traer mensajes humanos: {_e}")

    print("  📋 leads del mes…")
    cur = fetch_paginated("/leads", {
        "with": "contacts",
        "filter[created_at][from]": int(m_start.timestamp()),
        "filter[created_at][to]":   int(m_end.timestamp())}, "leads")
    print(f"     → {len(cur)} leads")

    print(f"  📋 leads {MESES[pmo]}…")
    prev = fetch_paginated("/leads", {
        "with": "contacts",
        "filter[created_at][from]": int(p_start.timestamp()),
        "filter[created_at][to]":   int(p_end.timestamp())}, "leads")
    print(f"     → {len(prev)} leads")

    # ── VENTANA AMPLIA (~300 días): base para pipeline total y ventas por contrato ──
    print("  📊 pipeline + ventas (ventana amplia)…")
    wide_start = m_start - datetime.timedelta(days=300)
    wide = fetch_paginated("/leads", {
        "with": "contacts",
        "filter[created_at][from]": int(wide_start.timestamp()),
        "filter[created_at][to]":   int(m_end.timestamp())},
        "leads", max_pages=40, sleep=0.12)
    ms, me = int(m_start.timestamp()), int(m_end.timestamp())
    ps, pe = int(p_start.timestamp()), int(p_end.timestamp())

    # CERRADO por FECHA CONTRATO: compradores cuyo campo cae en el mes
    won = []; won_prev = []
    if contract_field_id:
        for ld in wide:
            if stage_map.get(ld.get("status_id"), {}).get("cls") != "compradores":
                continue
            cts = contract_ts(ld, contract_field_id)
            if cts is None:
                continue
            ld["_contract_ts"] = cts
            if ms <= cts < me:
                won.append(ld)
            elif ps <= cts < pe:
                won_prev.append(ld)
    else:
        print("  ⚠ no encontré campo 'Fecha contrato'; uso estado actual", file=sys.stderr)
        for ld in cur:
            if stage_map.get(ld.get("status_id"), {}).get("cls") == "compradores":
                ld["_contract_ts"] = ld.get("created_at", 0); won.append(ld)
        for ld in prev:
            if stage_map.get(ld.get("status_id"), {}).get("cls") == "compradores":
                ld["_contract_ts"] = ld.get("created_at", 0); won_prev.append(ld)

    # PIPELINE TOTAL del vendedor = leads DEL MES con monto por cerrar (abiertos)
    # + lo cerrado del mes (comprador + fecha contrato). Ej: 30.000 por cerrar +
    # 20.000 ya en comprador = pipeline 50.000, cerrado 20.000.
    pipe_by_name = defaultdict(float)
    def _nm_of(uid):
        raw = user_map.get(uid)
        if not raw:
            return None
        return raw.split(" - ", 1)[0].strip() if " - " in raw else raw.strip()
    # componente ABIERTO: leads creados ESTE MES, abiertos, con monto
    for ld in cur:
        cls = stage_map.get(ld.get("status_id"), {}).get("cls")
        pr = ld.get("price") or 0
        if pr > 0 and cls not in ("perdido", "compradores"):
            nm = _nm_of(ld.get("responsible_user_id"))
            if nm:
                pipe_by_name[nm] += pr
    for ld in won:
        pr = ld.get("price") or 0
        nm = _nm_of(ld.get("responsible_user_id"))
        if nm and pr > 0:
            pipe_by_name[nm] += pr
    print(f"     → {len(won)} ventas mes · pipeline total Bs {int(sum(pipe_by_name.values()))}")

    # teléfonos de los contactos del mes (para detectar duplicados reales)
    print("  ☎️  contactos del mes…")
    contact_phone = {}
    try:
        raw_contacts = fetch_paginated("/contacts", {
            "filter[created_at][from]": int(m_start.timestamp()),
            "filter[created_at][to]":   int(m_end.timestamp())}, "contacts")
        for c in raw_contacts:
            cid = c.get("id"); phone = None
            for fld in (c.get("custom_fields_values") or []):
                if fld.get("field_code") == "PHONE":
                    vals = fld.get("values") or []
                    if vals: phone = str(vals[0].get("value") or "").strip()
                    break
            if cid and phone:
                contact_phone[cid] = phone
        print(f"     → {len(contact_phone)} con teléfono")
    except Exception as e:
        print(f"     ⚠ no se pudieron leer contactos ({e}); duplicados quedará vacío")

    print("  🧮 construyendo PANEL_DATA…")
    pd = build_panel_data(cur, prev, stage_map, user_map, events, source_field_id, contact_phone=contact_phone, won=won, won_prev=won_prev, pipe_by_name=pipe_by_name, human_msgs=human_msgs)
    print("  📈 armando historia mensual…")
    pd = build_history(pd)
    print("  📲 armando resumen WhatsApp…")
    pd = build_wsp(pd)
    if ARGS.bake_ai:
        print("  🤖 horneando IA…")
        pd = bake_ai(pd)

    print("  💾 escribiendo…")
    write_outputs(pd)
    print(f"✅ Listo · {pd['global']['leads']} leads · {pd['global']['cierres']} cierres · "
          f"conv {round(pd['global']['cierres']/pd['global']['leads']*100,1) if pd['global']['leads'] else 0}%")

if __name__ == "__main__":
    main()

# rebuild: asegurar index regenerado con botones->Kommo (workerUrl)
