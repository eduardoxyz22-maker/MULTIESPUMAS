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

import os, sys, json, time, argparse, calendar, datetime, shutil
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
                tarde=0, backlog=0, resp_minutes=[], stage=defaultdict(int),
                leads_sd=0, cierres_sd=0, value_sd=0, agendado_sd=0,
                wl=[0,0,0,0,0], wc=[0,0,0,0,0], wm=[0,0,0,0,0], wu=[0,0,0,0,0])

def aggregate(leads, stage_map, user_map, events, source_field_id, now_ts, won_leads=None):
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
def build_panel_data(cur, prev, stage_map, user_map, events, source_field_id, contact_phone=None, won=None, won_prev=None, pipe_by_name=None):
    now_ts = time.time()
    vcur, suc_of, backlog_rows = aggregate(cur, stage_map, user_map, events, source_field_id, now_ts, won_leads=won)
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
            "tarde": d["tarde"], "nunca": d["nunca"], "backlog": d["backlog"],
            "metaCierres": cfg.get("metaCierres", max(8, d["cierres"] + 5)),
            "metaMonto": cfg.get("metaMonto", max(20000, d["value"])),
            "v": v_tone,
            "prev": {"leads": prev_leads_sd, "cierres": pv["cierres_sd"],
                     "visitas": pv["agendado_sd"], "ticket": pv_ticket, "value": pv["value_sd"]},
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
    metrics = {
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
    convs = [(t, t["conv"]) for t in team if t["cierres"] >= 0 and t["leads"] >= 20]
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
    if G_cierres and metrics["abiertosSinValor"] and metrics["abiertosSinValor"] > G_leads*0.5:
        alerts.append({"sev":"red","who":"Datos / Gerencia",
            "t":"Muchos deals abiertos sin valor cargado",
            "d":"No se puede priorizar el pipeline por monto.",
            "act":"Cargar valor estimado al cotizar."})
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
def _ai_call(key, prompt):
    """Llama a Gemini 2.5 Flash y devuelve un dict JSON (o None). Reintenta sin
    config avanzada por si la cuenta/versión rechaza algún campo."""
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           "gemini-2.5-flash:generateContent?key=" + key)
    def _post(gen_cfg):
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        if gen_cfg:
            payload["generationConfig"] = gen_cfg
        body = json.dumps(payload).encode()
        req = _rq.Request(url, data=body, headers={"content-type": "application/json"})
        with _rq.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode())
    try:
        data = _post({"temperature": 0.5, "maxOutputTokens": 1500,
                      "responseMimeType": "application/json",
                      "thinkingConfig": {"thinkingBudget": 0}})
    except Exception:
        data = _post(None)                       # reintento sin config avanzada
    cand = (data.get("candidates") or [{}])[0]
    parts = ((cand.get("content") or {}).get("parts")) or [{}]
    txt = "".join(p.get("text", "") for p in parts)
    txt = txt.replace("```json", "").replace("```", "").strip()
    s, e = txt.find("{"), txt.rfind("}")
    return json.loads(txt[s:e + 1]) if s >= 0 and e > s else None


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
        f"{t['cierres']} cierres, {_conv(t['cierres'], t['leads'])}% conv, "
        f"{t['noResp']} no-responden ({t['noRespPct']}%), {t['backlog']} backlog, "
        f"{t['nunca']} nunca-tocados, {t['u24']}% <24h, ticket Bs {t['ticket']}"
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
        f"{_conv(b['cierres'], b['leads'])}% conv, pipeline Bs {b['value']}"
        for s, b in roll.items())

    ch_semi = "; ".join(f"{c['name']} {c['leads']} leads / {c['conv']}% conv / {c['cierres']} cierres" for c in ch)
    ch_dot = " · ".join(f"{c['name']} {c['leads']}/{c['conv']}%/{c['cierres']}" for c in ch)

    ctx = (
        f"Heaven Colchones (Bolivia), mes {pd['month']} {pd['year']}. Moneda Bs.\n"
        f"Global: {G['leads']} leads (mes previo {G['prevLeads']}, {mom}% MoM), {G['cierres']} cierres, "
        f"conversión {_conv(G['cierres'], G['leads'])}% (= {G['cierres']}/{G['leads']}), "
        f"pipeline Bs {G['pipeline']}, ticket Bs {G['ticket']}.\n"
        f"\"No responden\" {M['noResp']} ({M['noRespPct']}%). Sin seguimiento +72h: {M['backlog']} ({M['backlogPct']}%). "
        f"Nunca tocados: {M['nuncaTocados']}. Abiertos sin valor: {M['abiertosSinValor']} ({M['abiertosSinValorPct']}%).\n"
        "IMPORTANTE: cada lead SÍ está identificado por sucursal — se atribuye a la sucursal de su vendedora. "
        "Las 3 sucursales son Mia Plaza, Buenos Aires y Central.\n"
        f"Canales: {ch_semi}.\n"
        f"Roll-up por sucursal (con comparativo vs mes anterior):\n{branch_lines}\n"
        f"Equipo (con leads del mes vs mes anterior):\n{team_lines}")

    json_rule = (
        'Responde SOLO JSON válido, sin texto extra, forma exacta:\n'
        '{"resumen":"2-3 frases","hallazgos":[{"t":"hallazgo con números","sev":"alto|medio|bajo"}],'
        '"recomendaciones":[{"accion":"qué hacer","impacto":"resultado esperado"}]}\n'
        'Máximo 4 hallazgos y 3 recomendaciones. Español de Bolivia, directo, con nombres y cifras.\n'
        'REGLAS ANTI-REPETICIÓN: NO menciones los totales globales (leads, conversión global, pipeline) '
        'salvo que sean indispensables — otros analistas ya los cubren. Quédate ESTRICTAMENTE en tu dominio. '
        'No repitas hallazgos genéricos del mes; aporta un ángulo que solo tu especialidad vería.')

    agentes = {
        "crm": (
            "Eres analista de OPERACIÓN DE CRM (Kommo). Tu único tema es la HIGIENE del pipeline: "
            "velocidad de primera respuesta (% <24h por vendedora), backlog +72h, leads \"nunca tocados\", "
            "\"no responden\" y calidad de datos (deals sin valor, sin sucursal). NO opines de ventas, ticket ni "
            "dinero — eso es de otro analista. Señala QUIÉN tiene el peor hábito de seguimiento y qué fichas "
            "rescatar primero.\nDatos relevantes para ti:\n" + team_lines +
            f"\nBacklog total {M['backlog']} (+72h), nunca tocados {M['nuncaTocados']}, \"no responden\" {M['noResp']}.\n" + json_rule),
        "ventas": (
            "Eres analista de PERFORMANCE DE VENTAS. Tu único tema es el RESULTADO comercial: conversión por "
            "vendedora (compradores/leads), ticket promedio, pipeline en Bs y dónde está el dinero. NO hables de "
            "disciplina de CRM ni de canales de origen. Compara vendedoras por eficiencia (no por volumen) y di "
            "quién deja dinero sobre la mesa.\nDatos relevantes para ti:\n" + team_lines +
            f"\nGlobal: {G['cierres']} cierres, {_conv(G['cierres'], G['leads'])}% conv, pipeline Bs {G['pipeline']}, ticket Bs {G['ticket']}.\n" + json_rule),
        "comportamiento": (
            "Eres analista de COMPORTAMIENTO y CANALES. Tu único tema: por qué entran y por qué se enfrían "
            f"los leads. el {M['noRespPct']}% termina en \"no responden\". NO hables de metas individuales ni "
            "disciplina de cada vendedora. Explica el PATRÓN: qué canal/etapa pierde clientes y cómo reactivar "
            f"los {M['noResp']} que no responden.\nCanales: {ch_dot}.\n" + json_rule),
        "sintesis": (
            "Eres el DIRECTOR COMERCIAL. Ya tienes 3 análisis (CRM, ventas, comportamiento). NO los repitas: "
            "combínalos en UN plan priorizado de 3 decisiones para la reunión de gerencia, ordenadas por impacto "
            "en Bs. Cada decisión debe nombrar responsable y meta concreta.\n" + ctx +
            '\nResponde SOLO JSON: {"resumen":"3 frases con el veredicto del mes",'
            '"hallazgos":[{"t":"prioridad con número","sev":"alto|medio|bajo"}],'
            '"recomendaciones":[{"accion":"iniciativa con responsable","impacto":"meta concreta en Bs o cierres"}]} '
            "Máx 3 y 3. Español de Bolivia."),
    }

    # Diagnóstico de portada (mismo prompt que DiagnosticoMes en el frontend)
    top = sorted(team, key=lambda t: t["cierres"], reverse=True)[0] if team else None
    worst_l = sorted([t for t in team if t["cierres"] > 0], key=lambda t: t["conv"])
    worst = worst_l[0] if worst_l else None
    diag_team = "\n".join(
        f"{t['name']} ({t['suc']}): {t['leads']} leads, {t['cierres']} cierres, {t['conv']}% conv, "
        f"{t['noResp']} no-responden, {t['backlog']} backlog, {t['u24']}% actualiza <24h" for t in team)
    diag_prompt = (
        "Eres analista comercial senior de Heaven Colchones (Bolivia). "
        f"Analiza el mes {pd['month']} {pd['year']} y responde SOLO con JSON válido, sin texto extra, forma exacta:\n"
        '{"titular":"frase contundente de máx 11 palabras","diagnostico":"2-3 frases con el insight central y números",'
        '"palancas":["acción 1","acción 2","acción 3"],"riesgo":"el mayor riesgo en 1 frase"}\n'
        f"Datos (moneda Bs): Leads {G['leads']} (mes anterior {G['prevLeads']}, {mom}%). "
        f"Cierres {G['cierres']}, conversión {_conv(G['cierres'], G['leads'])}%. Pipeline Bs {G['pipeline']}, "
        f"ticket Bs {G['ticket']}. \"No responden\" {M['noResp']} ({M['noRespPct']}%). "
        f"Sin seguimiento +72h: {M['backlog']} ({M['backlogPct']}%).\nEquipo:\n{diag_team}\n"
        f"Top: {top['name'] if top else '—'}. Más débil en conversión: {worst['name'] if worst else '—'}. "
        "Sé directo, específico con nombres y números, español de Bolivia.")

    # Hornea el diagnóstico
    try:
        d = _ai_call(key, diag_prompt)
        if d and d.get("titular"):
            pd["ai_diagnostico"] = d
            print("   ✓ diagnóstico IA horneado (Gemini)")
        else:
            print("   ⚠ diagnóstico IA sin contenido — se omite")
    except Exception as e:
        print(f"   ⚠ diagnóstico IA no horneado: {e}")

    # Hornea los 4 agentes
    baked = {}
    for aid, prm in agentes.items():
        try:
            a = _ai_call(key, prm)
            if a and a.get("resumen"):
                baked[aid] = a
                print(f"   ✓ agente IA '{aid}' horneado")
            else:
                print(f"   ⚠ agente IA '{aid}' sin contenido — se omite")
        except Exception as e:
            print(f"   ⚠ agente IA '{aid}' no horneado: {e}")
    if baked:
        pd["ai_agentes"] = baked
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
    pd = build_panel_data(cur, prev, stage_map, user_map, events, source_field_id, contact_phone=contact_phone, won=won, won_prev=won_prev, pipe_by_name=pipe_by_name)
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
