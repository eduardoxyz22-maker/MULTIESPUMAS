#!/usr/bin/env python3
"""
Genera index.html con dashboard Heaven Colchones desde datos de Kommo CRM.
Ejecutar: python3 generar_dashboard.py
"""

import urllib.request
import urllib.error
import json
import time
from datetime import datetime, timezone

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
SUBDOMAIN = "eanez"
TOKEN = (
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
)
BASE_URL = f"https://{SUBDOMAIN}.kommo.com/api/v4"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "User-Agent": "HeavenColchones-Dashboard/1.0",
}

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def api_get(path, params=""):
    url = f"{BASE_URL}{path}"
    if params:
        url += f"?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())


def fetch_all_leads():
    """Pagina automáticamente si hay más de 250 leads."""
    all_leads = []
    page = 1
    while True:
        print(f"  Fetching leads page {page}…")
        data = api_get("/leads", f"limit=250&with=contacts&page={page}")
        embedded = data.get("_embedded", {}).get("leads", [])
        all_leads.extend(embedded)
        links = data.get("_links", {})
        if "next" not in links:
            break
        page += 1
        time.sleep(0.3)
    return all_leads


# ─── FETCH DATA ───────────────────────────────────────────────────────────────

print("Conectando a Kommo API…")
print("  1/3 Pipelines…")
pipelines_raw = api_get("/leads/pipelines")
print("  2/3 Users…")
users_raw = api_get("/users")
print("  3/3 Leads…")
leads_raw = fetch_all_leads()
print(f"  Total leads obtenidos: {len(leads_raw)}")

# ─── PARSE ────────────────────────────────────────────────────────────────────

pipelines = pipelines_raw.get("_embedded", {}).get("pipelines", [])
users = users_raw.get("_embedded", {}).get("users", [])

# Map id → name
user_map = {u["id"]: u["name"] for u in users}

# Flatten stages across all pipelines
stage_map = {}  # stage_id → {name, pipeline_name, order}
for pipe in pipelines:
    for st in pipe.get("_embedded", {}).get("statuses", []):
        stage_map[st["id"]] = {
            "name": st["name"],
            "pipeline": pipe["name"],
            "order": st.get("sort", 0),
            "is_won": st.get("type") == 142,
            "is_lost": st.get("type") == 143,
        }

NOW_TS = int(time.time())

def days_since(ts):
    if not ts:
        return 0
    return max(0, (NOW_TS - ts) // 86400)

# Enrich leads
deals = []
for lead in leads_raw:
    stage_id = lead.get("status_id")
    stage_info = stage_map.get(stage_id, {"name": "Desconocida", "pipeline": "-", "order": 0, "is_won": False, "is_lost": False})

    contacts = lead.get("_embedded", {}).get("contacts", [])
    contact_name = contacts[0].get("name", "Sin nombre") if contacts else "Sin nombre"

    responsible_id = lead.get("responsible_user_id")
    responsible = user_map.get(responsible_id, f"ID {responsible_id}")

    updated_ts = lead.get("updated_at") or lead.get("created_at", NOW_TS)
    days_stale = days_since(updated_ts)

    # Detect sucursal from custom fields or tags
    custom_fields = lead.get("custom_fields_values") or []
    sucursal = "-"
    for cf in custom_fields:
        fname = (cf.get("field_name") or "").lower()
        if "sucursal" in fname or "tienda" in fname or "store" in fname:
            vals = cf.get("values", [])
            if vals:
                sucursal = vals[0].get("value", "-")
            break

    tags = [t["name"] for t in (lead.get("_embedded", {}).get("tags") or [])]
    if sucursal == "-" and tags:
        sucursal = tags[0]

    deals.append({
        "id": lead["id"],
        "name": lead.get("name", "Sin nombre"),
        "contact": contact_name,
        "stage_id": stage_id,
        "stage_name": stage_info["name"],
        "pipeline": stage_info["pipeline"],
        "is_won": stage_info["is_won"],
        "is_lost": stage_info["is_lost"],
        "responsible": responsible,
        "sucursal": sucursal,
        "value": lead.get("price", 0) or 0,
        "days_stale": days_stale,
        "created_at": lead.get("created_at", 0),
        "updated_at": updated_ts,
        "tags": tags,
    })

# ─── METRICS ──────────────────────────────────────────────────────────────────

active_deals = [d for d in deals if not d["is_won"] and not d["is_lost"]]
won_deals    = [d for d in deals if d["is_won"]]
lost_deals   = [d for d in deals if d["is_lost"]]

total_leads      = len(deals)
total_active     = len(active_deals)
total_won        = len(won_deals)
total_pipeline   = sum(d["value"] for d in active_deals)
stale_14         = len([d for d in active_deals if d["days_stale"] > 14])
stale_7          = len([d for d in active_deals if 7 <= d["days_stale"] <= 14])

# Stage funnel (active only)
from collections import defaultdict
stage_counts = defaultdict(lambda: {"count": 0, "value": 0, "name": "", "pipeline": ""})
for d in active_deals:
    sid = d["stage_id"]
    stage_counts[sid]["count"] += 1
    stage_counts[sid]["value"] += d["value"]
    stage_counts[sid]["name"] = d["stage_name"]
    stage_counts[sid]["pipeline"] = d["pipeline"]

funnel_stages = sorted(
    [{"id": k, **v} for k, v in stage_counts.items()],
    key=lambda x: stage_map.get(x["id"], {}).get("order", 0)
)

# KPIs by seller
seller_stats = defaultdict(lambda: {
    "total": 0, "won": 0, "lost": 0, "no_response": 0,
    "qualified": 0, "value": 0, "active": 0
})
for d in deals:
    s = d["responsible"]
    seller_stats[s]["total"] += 1
    if d["is_won"]:
        seller_stats[s]["won"] += 1
    elif d["is_lost"]:
        seller_stats[s]["lost"] += 1
    else:
        seller_stats[s]["active"] += 1
        seller_stats[s]["value"] += d["value"]
        if d["days_stale"] > 3:
            seller_stats[s]["no_response"] += 1
        if d["stage_name"] and any(w in d["stage_name"].lower() for w in ["calific", "interes", "prosp"]):
            seller_stats[s]["qualified"] += 1

seller_kpis = []
for name, st in seller_stats.items():
    total = st["total"] or 1
    seller_kpis.append({
        "name": name,
        "total": st["total"],
        "won": st["won"],
        "active": st["active"],
        "conversion": round(st["won"] / total * 100, 1),
        "no_response": st["no_response"],
        "qualified": st["qualified"],
        "avg_ticket": round(st["value"] / max(st["active"], 1)),
    })
seller_kpis.sort(key=lambda x: x["conversion"], reverse=True)

# ─── GENERATE HTML ────────────────────────────────────────────────────────────

gen_date = datetime.now().strftime("%d/%m/%Y %H:%M")

def fmt_currency(v):
    return f"${v:,.0f}".replace(",", "X").replace(".", ",").replace("X", ".")

def badge_color(days):
    if days > 14:
        return "badge-red"
    elif days >= 7:
        return "badge-yellow"
    return "badge-green"

def badge_label(days):
    if days > 14:
        return f"{days}d ⚠"
    elif days >= 7:
        return f"{days}d !"
    return f"{days}d"

# Build table rows
table_rows = []
for d in sorted(deals, key=lambda x: x["days_stale"], reverse=True):
    bc = badge_color(d["days_stale"])
    bl = badge_label(d["days_stale"])
    won_lost = ""
    if d["is_won"]:
        won_lost = '<span class="badge badge-green">Ganado</span>'
    elif d["is_lost"]:
        won_lost = '<span class="badge badge-red">Perdido</span>'
    else:
        won_lost = f'<span class="badge {bc}">{bl}</span>'

    table_rows.append(f"""
        <tr data-stage="{d['stage_name']}" data-resp="{d['responsible']}" data-days="{d['days_stale']}">
          <td>{d['contact']}</td>
          <td><span class="stage-pill">{d['stage_name']}</span></td>
          <td>{d['sucursal']}</td>
          <td>{d['responsible']}</td>
          <td>{fmt_currency(d['value'])}</td>
          <td>{won_lost}</td>
        </tr>""")

table_html = "\n".join(table_rows)

# Build funnel bars
max_count = max((s["count"] for s in funnel_stages), default=1)
funnel_html = ""
for s in funnel_stages:
    pct = round(s["count"] / total_leads * 100, 1) if total_leads else 0
    bar_w = round(s["count"] / max_count * 100) if max_count else 0
    funnel_html += f"""
      <div class="funnel-row">
        <div class="funnel-label">{s['name']}</div>
        <div class="funnel-bar-wrap">
          <div class="funnel-bar" style="width:{bar_w}%"></div>
        </div>
        <div class="funnel-stats">
          <span class="funnel-count">{s['count']}</span>
          <span class="funnel-pct">{pct}%</span>
        </div>
      </div>"""

# Build seller KPI cards
seller_html = ""
for sk in seller_kpis:
    seller_html += f"""
      <div class="seller-card">
        <div class="seller-name">{sk['name']}</div>
        <div class="seller-metrics">
          <div class="sm-item"><span class="sm-val">{sk['conversion']}%</span><span class="sm-lbl">Conversión</span></div>
          <div class="sm-item"><span class="sm-val">{sk['won']}</span><span class="sm-lbl">Ganados</span></div>
          <div class="sm-item"><span class="sm-val">{sk['no_response']}</span><span class="sm-lbl">Sin resp.</span></div>
          <div class="sm-item"><span class="sm-val">{sk['qualified']}</span><span class="sm-lbl">Calificados</span></div>
          <div class="sm-item"><span class="sm-val">{fmt_currency(sk['avg_ticket'])}</span><span class="sm-lbl">Ticket prom.</span></div>
          <div class="sm-item"><span class="sm-val">{sk['total']}</span><span class="sm-lbl">Total leads</span></div>
        </div>
      </div>"""

# Unique stages and reps for filters
all_stages = sorted(set(d["stage_name"] for d in deals))
all_reps   = sorted(set(d["responsible"] for d in deals))
stage_opts = "\n".join(f'<option value="{s}">{s}</option>' for s in all_stages)
rep_opts   = "\n".join(f'<option value="{r}">{r}</option>' for r in all_reps)

HTML = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Heaven Colchones — CRM Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {{
      --teal:   #00B5AD;
      --teal2:  #009590;
      --teal3:  #00D1C9;
      --dark:   #0F1923;
      --dark2:  #1A2533;
      --dark3:  #243040;
      --card:   #1E2D3D;
      --text:   #E8F0F7;
      --muted:  #8A9BB0;
      --border: #2A3F55;
      --red:    #E55353;
      --yellow: #F0A500;
      --green:  #2EC17E;
    }}
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Inter', sans-serif;
      background: var(--dark);
      color: var(--text);
      min-height: 100vh;
    }}

    /* ── HEADER ── */
    header {{
      background: linear-gradient(135deg, var(--dark2) 0%, #0D1F2D 100%);
      border-bottom: 2px solid var(--teal);
      padding: 20px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }}
    .header-brand {{ display: flex; align-items: center; gap: 14px; }}
    .header-logo {{
      width: 48px; height: 48px; border-radius: 12px;
      background: var(--teal); display: flex; align-items: center;
      justify-content: center; font-size: 22px; font-weight: 800; color: #fff;
    }}
    .header-title {{ font-size: 22px; font-weight: 700; }}
    .header-sub {{ font-size: 13px; color: var(--muted); margin-top: 2px; }}
    .header-badge {{
      background: var(--teal); color: #fff; border-radius: 8px;
      padding: 6px 14px; font-size: 12px; font-weight: 600;
    }}

    /* ── LAYOUT ── */
    main {{ max-width: 1400px; margin: 0 auto; padding: 32px 24px 60px; }}
    .section-title {{
      font-size: 13px; font-weight: 600; color: var(--teal);
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;
    }}

    /* ── METRIC CARDS ── */
    .metrics-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }}
    .metric-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 20px;
      position: relative;
      overflow: hidden;
      transition: transform .2s;
    }}
    .metric-card:hover {{ transform: translateY(-2px); }}
    .metric-card::before {{
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: var(--teal);
    }}
    .metric-card.red::before  {{ background: var(--red); }}
    .metric-card.green::before {{ background: var(--green); }}
    .metric-card.yellow::before {{ background: var(--yellow); }}
    .metric-icon {{ font-size: 28px; margin-bottom: 12px; }}
    .metric-value {{ font-size: 36px; font-weight: 800; line-height: 1; margin-bottom: 6px; }}
    .metric-label {{ font-size: 13px; color: var(--muted); font-weight: 500; }}
    .metric-sub {{ font-size: 11px; color: var(--muted); margin-top: 4px; }}

    /* ── TWO-COL LAYOUT ── */
    .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }}
    @media (max-width: 900px) {{ .two-col {{ grid-template-columns: 1fr; }} }}

    /* ── PANEL ── */
    .panel {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }}

    /* ── FUNNEL ── */
    .funnel-row {{ display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }}
    .funnel-label {{ min-width: 160px; font-size: 13px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
    .funnel-bar-wrap {{ flex: 1; background: var(--border); border-radius: 6px; height: 10px; }}
    .funnel-bar {{ height: 10px; border-radius: 6px; background: linear-gradient(90deg, var(--teal), var(--teal3)); transition: width .6s; }}
    .funnel-stats {{ display: flex; gap: 8px; min-width: 80px; justify-content: flex-end; }}
    .funnel-count {{ font-weight: 700; font-size: 14px; }}
    .funnel-pct {{ font-size: 12px; color: var(--muted); }}

    /* ── SELLER CARDS ── */
    .sellers-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 40px; }}
    .seller-card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
    }}
    .seller-name {{ font-size: 15px; font-weight: 700; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); color: var(--teal3); }}
    .seller-metrics {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }}
    .sm-item {{ display: flex; flex-direction: column; align-items: center; gap: 4px; }}
    .sm-val {{ font-size: 20px; font-weight: 700; }}
    .sm-lbl {{ font-size: 10px; color: var(--muted); text-align: center; }}

    /* ── TABLE ── */
    .table-controls {{ display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }}
    .table-controls input, .table-controls select {{
      background: var(--dark2);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      outline: none;
      font-family: inherit;
    }}
    .table-controls input {{ flex: 1; min-width: 200px; }}
    .table-controls input:focus, .table-controls select:focus {{ border-color: var(--teal); }}
    .table-wrap {{ overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th {{
      background: var(--dark3);
      color: var(--teal);
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .5px;
      white-space: nowrap;
    }}
    td {{ padding: 11px 16px; border-top: 1px solid var(--border); vertical-align: middle; }}
    tr:hover td {{ background: rgba(0,181,173,.06); }}
    .stage-pill {{
      background: rgba(0,181,173,.15);
      color: var(--teal3);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }}
    .badge {{ display: inline-block; border-radius: 6px; padding: 3px 9px; font-size: 11px; font-weight: 700; }}
    .badge-green  {{ background: rgba(46,193,126,.18); color: var(--green); }}
    .badge-yellow {{ background: rgba(240,165,0,.18);  color: var(--yellow); }}
    .badge-red    {{ background: rgba(229,83,83,.18);  color: var(--red); }}

    /* ── FOOTER ── */
    footer {{
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      margin-top: 20px;
    }}
    footer span {{ color: var(--teal); font-weight: 600; }}
  </style>
</head>
<body>

<header>
  <div class="header-brand">
    <div class="header-logo">HC</div>
    <div>
      <div class="header-title">Heaven Colchones — CRM Dashboard</div>
      <div class="header-sub">Pipeline activo · Datos en tiempo real desde Kommo</div>
    </div>
  </div>
  <div class="header-badge">Subdominio: {SUBDOMAIN} &nbsp;·&nbsp; {gen_date}</div>
</header>

<main>

  <!-- MÉTRICAS GLOBALES -->
  <div class="section-title">Métricas Globales</div>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-icon">📋</div>
      <div class="metric-value">{total_leads}</div>
      <div class="metric-label">Total Leads</div>
      <div class="metric-sub">{total_active} activos · {total_won} ganados · {len(lost_deals)} perdidos</div>
    </div>
    <div class="metric-card green">
      <div class="metric-icon">💰</div>
      <div class="metric-value">{fmt_currency(total_pipeline)}</div>
      <div class="metric-label">Valor Pipeline Activo</div>
      <div class="metric-sub">En {total_active} deals abiertos</div>
    </div>
    <div class="metric-card green">
      <div class="metric-icon">🏆</div>
      <div class="metric-value">{total_won}</div>
      <div class="metric-label">Compradores (Ganados)</div>
      <div class="metric-sub">Conversión: {round(total_won/total_leads*100,1) if total_leads else 0}% del total</div>
    </div>
    <div class="metric-card yellow">
      <div class="metric-icon">⏳</div>
      <div class="metric-value">{stale_7}</div>
      <div class="metric-label">Estancados 7–14 días</div>
      <div class="metric-sub">Requieren seguimiento urgente</div>
    </div>
    <div class="metric-card red">
      <div class="metric-icon">🚨</div>
      <div class="metric-value">{stale_14}</div>
      <div class="metric-label">Estancados +14 días</div>
      <div class="metric-sub">Críticos — posible pérdida</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon">👥</div>
      <div class="metric-value">{len(seller_kpis)}</div>
      <div class="metric-label">Vendedores Activos</div>
      <div class="metric-sub">Con leads asignados</div>
    </div>
  </div>

  <!-- EMBUDO + PIPELINE -->
  <div class="two-col">
    <div class="panel">
      <div class="section-title">Embudo por Etapa (activos)</div>
      {funnel_html if funnel_html else '<p style="color:var(--muted);font-size:13px">Sin datos de etapas.</p>'}
    </div>
    <div class="panel">
      <div class="section-title">Resumen del Pipeline</div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Deals activos</span>
          <span style="font-weight:700;font-size:18px;">{total_active}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Valor total activo</span>
          <span style="font-weight:700;font-size:18px;color:var(--teal);">{fmt_currency(total_pipeline)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Ticket promedio</span>
          <span style="font-weight:700;font-size:18px;">{fmt_currency(total_pipeline // max(total_active,1))}</span>
        </div>
        <div style="height:1px;background:var(--border);margin:4px 0;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Ganados</span>
          <span style="font-weight:700;font-size:18px;color:var(--green);">{total_won}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Perdidos</span>
          <span style="font-weight:700;font-size:18px;color:var(--red);">{len(lost_deals)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--muted);">Tasa de cierre</span>
          <span style="font-weight:700;font-size:18px;color:var(--green);">{round(total_won/(total_won+len(lost_deals))*100,1) if (total_won+len(lost_deals)) else 0}%</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:var(--yellow);">⚠ Atención requerida</span>
          <span style="font-weight:700;font-size:18px;color:var(--yellow);">{stale_7 + stale_14}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- KPIs VENDEDORAS -->
  <div class="section-title">KPIs por Vendedor/a</div>
  <div class="sellers-grid">
    {seller_html}
  </div>

  <!-- TABLA DEALS -->
  <div class="section-title">Todos los Deals</div>
  <div class="panel">
    <div class="table-controls">
      <input type="text" id="searchInput" placeholder="Buscar por contacto, etapa, responsable…" oninput="filterTable()" />
      <select id="stageFilter" onchange="filterTable()">
        <option value="">Todas las etapas</option>
        {stage_opts}
      </select>
      <select id="respFilter" onchange="filterTable()">
        <option value="">Todos los responsables</option>
        {rep_opts}
      </select>
      <select id="staleFilter" onchange="filterTable()">
        <option value="">Todos</option>
        <option value="ok">Al día (&lt;7d)</option>
        <option value="warn">7–14 días</option>
        <option value="crit">&gt;14 días</option>
      </select>
    </div>
    <div class="table-wrap">
      <table id="dealsTable">
        <thead>
          <tr>
            <th>Contacto</th>
            <th>Etapa</th>
            <th>Sucursal</th>
            <th>Responsable</th>
            <th>Valor</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody id="dealsBody">
          {table_html}
        </tbody>
      </table>
    </div>
    <div id="tableCount" style="font-size:12px;color:var(--muted);margin-top:12px;text-align:right;"></div>
  </div>

</main>

<footer>
  Dashboard generado el <span>{gen_date}</span> &nbsp;·&nbsp;
  Subdominio: <span>{SUBDOMAIN}.kommo.com</span> &nbsp;·&nbsp;
  Heaven Colchones CRM &nbsp;·&nbsp; {total_leads} leads procesados
</footer>

<script>
  function filterTable() {{
    const search = document.getElementById('searchInput').value.toLowerCase();
    const stage  = document.getElementById('stageFilter').value;
    const resp   = document.getElementById('respFilter').value;
    const stale  = document.getElementById('staleFilter').value;
    const rows   = document.querySelectorAll('#dealsBody tr');
    let visible  = 0;
    rows.forEach(row => {{
      const text  = row.textContent.toLowerCase();
      const rStage = row.dataset.stage || '';
      const rResp  = row.dataset.resp  || '';
      const days   = parseInt(row.dataset.days || '0', 10);
      let staleOk = true;
      if (stale === 'ok')   staleOk = days < 7;
      if (stale === 'warn') staleOk = days >= 7 && days <= 14;
      if (stale === 'crit') staleOk = days > 14;
      const show = (
        (!search || text.includes(search)) &&
        (!stage  || rStage === stage) &&
        (!resp   || rResp  === resp) &&
        staleOk
      );
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    }});
    document.getElementById('tableCount').textContent =
      visible + ' deal' + (visible !== 1 ? 's' : '') + ' mostrado' + (visible !== 1 ? 's' : '');
  }}
  filterTable();
</script>
</body>
</html>"""

# ─── WRITE FILE ───────────────────────────────────────────────────────────────
with open("index.html", "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"\n✅ index.html generado exitosamente con {total_leads} leads.")
print(f"   Abre el archivo en tu navegador para ver el dashboard.")
