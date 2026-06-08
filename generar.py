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
    "Isabel Robledo": dict(ini="IR", color="#00B5AD", suc="Mia Plaza",    metaCierres=45, metaMonto=250000),
    "Maria Flores":   dict(ini="MF", color="#2E6FE0", suc="Buenos Aires", metaCierres=40, metaMonto=160000),
    "Mirian Salazar": dict(ini="MS", color="#7A5AF0", suc="Mia Plaza",    metaCierres=35, metaMonto=160000),
    "Carola Chavez":  dict(ini="CC", color="#D98300", suc="Central",      metaCierres=35, metaMonto=150000),
    "Jonathan Monje": dict(ini="JM", color="#159A57", suc="Central",      metaCierres=8,  metaMonto=20000),
}
DEFAULT_COLORS = ["#00B5AD", "#2E6FE0", "#7A5AF0", "#D98300", "#159A57", "#DC4046", "#22A7C9"]

SUC_COLORS = {"Mia Plaza": "#00B5AD", "Buenos Aires": "#2E6FE0", "Central": "#D98300"}

# Clasificación de etapas del pipeline por palabras clave (case-insensitive).
STAGE_RULES = [
    ("compradores", ["compra", "comprador", "vendido", "ganado", "won", "pagad", "cerrad", "cliente"]),
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
    return dict(leads=0, cierres=0, value=0, noResp=0, agendado=0, interesado=0,
                cotizacion=0, nueva=0, calif=0, manual=0, bot=0, u24=0, nunca=0,
                tarde=0, backlog=0, resp_minutes=[], stage=defaultdict(int),
                leads_sd=0, wl=[0,0,0,0,0], wc=[0,0,0,0,0], wm=[0,0,0,0,0], wu=[0,0,0,0,0])

def aggregate(leads, stage_map, user_map, events, source_field_id, now_ts):
    vd = defaultdict(blank_vendor)
    suc_of = {}
    backlog_rows = []
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
        if cls == "compradores":
            d["cierres"] += 1; d["value"] += ld.get("price") or 0
            d["wc"][_wk] += 1; d["wm"][_wk] += ld.get("price") or 0
        elif cls == "no_resp":
            d["noResp"] += 1
        elif cls == "agendado":
            d["agendado"] += 1; d["calif"] += 1
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
            backlog_rows.append({"c": ld_name, "e": st["name"], "r": name,
                                 "d": int(round(stale_days)), "nh": never})
    return vd, suc_of, backlog_rows

# ─────────────────────────────────────────────────────────────────────────────
#  CONSTRUCCIÓN DE window.PANEL_DATA
# ─────────────────────────────────────────────────────────────────────────────
def build_panel_data(cur, prev, stage_map, user_map, events, source_field_id):
    now_ts = time.time()
    vcur, suc_of, backlog_rows = aggregate(cur, stage_map, user_map, events, source_field_id, now_ts)
    vprev, _, _  = aggregate(prev, stage_map, user_map, {}, source_field_id, now_ts)

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
        pv_ticket = round(pv["value"] / pv["cierres"]) if pv["cierres"] else 0
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
            "calif": d["calif"], "califPct": califpct,
            "noResp": d["noResp"], "noRespPct": norpct,
            "agendado": d["agendado"], "u24": u24pct, "promTxt": prom,
            "tarde": d["tarde"], "nunca": d["nunca"], "backlog": d["backlog"],
            "metaCierres": cfg.get("metaCierres", max(8, d["cierres"] + 5)),
            "metaMonto": cfg.get("metaMonto", max(20000, d["value"])),
            "v": v_tone,
            "prev": {"leads": prev_leads_sd, "cierres": pv["cierres"],
                     "visitas": pv["agendado"], "ticket": pv_ticket, "value": pv["value"]},
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
        ch = detect_channel(ld, source_field_id)
        ca = ch_agg[ch]; ca["leads"] += 1
        st = stage_map.get(ld.get("status_id"), {"cls": "other"})
        if st["cls"] == "compradores":
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
    bk_rows = backlog_rows[:40]

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
                   "pipeline": G_value, "ticket": G_ticket},
        "funnel2": funnel2, "stagesGlobal": stagesGlobal, "origin": origin,
        "channels": channels, "metrics": metrics,
        "leadsMomPct": round((G_leads - G_prev) / G_prev * 100) if G_prev else 0,
        "team": team, "funnel": funnel, "nav": nav, "stagesByV": stagesByV,
        "backlogRows": bk_rows, "alerts": alerts,
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
#  IA OPCIONAL (hornea el diagnóstico + agentes con la API de Anthropic)
# ─────────────────────────────────────────────────────────────────────────────
def bake_ai(pd):
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        print("   · sin ANTHROPIC_API_KEY → el panel llamará la IA en vivo")
        return pd
    G = pd["global"]
    team_lines = "\n".join(
        f"{t['name']} ({t['suc']}): {t['leads']} leads, {t['cierres']} cierres, "
        f"{t['conv']}% conv, {t['noResp']} no-responden, {t['backlog']} backlog, {t['u24']}% <24h"
        for t in pd["team"])
    prompt = (f"Eres analista comercial senior de Heaven Colchones (Bolivia). Mes {pd['month']} {pd['year']}. "
              f"Moneda Bs. Responde SOLO JSON: "
              f'{{"titular":"frase de máx 11 palabras","diagnostico":"2-3 frases con números",'
              f'"palancas":["a1","a2","a3"],"riesgo":"1 frase"}}\n'
              f"Leads {G['leads']} (prev {G['prevLeads']}), cierres {G['cierres']}, "
              f"conv {round(G['cierres']/G['leads']*100,1) if G['leads'] else 0}%, "
              f"pipeline Bs {G['pipeline']}, ticket Bs {G['ticket']}. "
              f"No responden {pd['metrics']['noResp']}, backlog {pd['metrics']['backlog']}.\n{team_lines}")
    try:
        body = json.dumps({"model": "claude-haiku-4-5-20251001", "max_tokens": 700,
                           "messages": [{"role": "user", "content": prompt}]}).encode()
        req = _rq.Request("https://api.anthropic.com/v1/messages", data=body, headers={
            "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"})
        with _rq.urlopen(req, timeout=60) as r:
            data = json.loads(r.read().decode())
        txt = "".join(b.get("text", "") for b in data.get("content", []))
        pd["ai_diagnostico"] = json.loads(txt[txt.find("{"):txt.rfind("}") + 1])
        print("   ✓ diagnóstico IA horneado")
    except Exception as e:
        print(f"   ⚠ IA no horneada: {e}")
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
        for st in (pl.get("_embedded", {}) or {}).get("statuses", []):
            stage_map[st["id"]] = {"name": st.get("name", "—"), "cls": classify_stage(st.get("name", ""))}

    print("  👥 usuarios…")
    users = fetch_paginated("/users", {}, "users", max_pages=10)
    user_map = {u["id"]: u.get("name", "") for u in users}

    print("  🔎 campo de origen…")
    try:
        cfs = fetch_paginated("/leads/custom_fields", {}, "custom_fields", max_pages=10)
        source_field_id = next((c["id"] for c in cfs
            if any(k in (c.get("code", "") + c.get("name", "")).lower()
                   for k in ["fuente", "origen", "source", "canal", "utm", "procedencia"])), None)
    except Exception:
        source_field_id = None

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

    print("  🧮 construyendo PANEL_DATA…")
    pd = build_panel_data(cur, prev, stage_map, user_map, events, source_field_id)
    if ARGS.bake_ai:
        print("  🤖 horneando IA…")
        pd = bake_ai(pd)

    print("  💾 escribiendo…")
    write_outputs(pd)
    print(f"✅ Listo · {pd['global']['leads']} leads · {pd['global']['cierres']} cierres · "
          f"conv {round(pd['global']['cierres']/pd['global']['leads']*100,1) if pd['global']['leads'] else 0}%")

if __name__ == "__main__":
    main()
