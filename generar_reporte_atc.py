"""
generar_reporte_atc.py
Genera reporte-semanal-atc.html con datos frescos del tablero Trello ATC.
El HTML incluye botón de exportar CSV embebido.
"""
import os, json, urllib.request, urllib.parse, datetime, calendar

KEY   = os.environ["TRELLO_API_KEY"]
TOKEN = os.environ["TRELLO_TOKEN"]
BOARD = os.environ.get("TRELLO_BOARD_ID", "cFbJp9DO")
API   = "https://api.trello.com/1"

def get(path, extra=None):
    p = {"key": KEY, "token": TOKEN}
    if extra: p.update(extra)
    url = API + path + "?" + urllib.parse.urlencode(p)
    with urllib.request.urlopen(urllib.request.Request(url)) as r:
        return json.loads(r.read().decode())

def fetch():
    lists   = get(f"/boards/{BOARD}/lists",   {"fields":"id,name,pos","filter":"open"})
    members = get(f"/boards/{BOARD}/members", {"fields":"id,fullName,username"})
    cards   = get(f"/boards/{BOARD}/cards",   {
        "fields":"id,name,desc,idList,idMembers,labels,due,dueComplete,url,closed",
        "filter":"all"
    })
    return lists, members, cards

# ── helpers ──────────────────────────────────────────────────────────────
def card_status(c):
    if c.get("dueComplete"): return "Completada"
    if c.get("closed"):      return "Archivada"
    if c.get("due"):
        try:
            d = datetime.datetime.fromisoformat(c["due"].rstrip("Z"))
            if d < datetime.datetime.utcnow(): return "Vencida"
        except: pass
    return "Pendiente"

VENDORS = ["MIRIAN","ISABEL","CAROLA","MARIA","NORMA"]
PROBLEMS = {
    "Hundimiento":  ["UNDIDO","HUNDIMIENTO"],
    "Resortes":     ["RESORTE"],
    "Descosturado": ["DESCOSTURADO","RIBETE","COSTURA"],
    "Retapizado":   ["RETAPIZADO","RETAPIZ"],
    "Ruido":        ["RUIDO","SONIDO","SUENA"],
    "Patas/Sómier": ["PATA","SOMIER"],
    "Sin garantía": ["SIN GARANTIA","COTIZAR"],
}

def vendor_of(card):
    t = (card.get("desc","") + " " + card.get("name","")).upper()
    for v in VENDORS:
        if v in t: return v.capitalize()
    return "Otras"

def problems_of(card):
    t = (card.get("desc","") + " " + card.get("name","")).upper()
    return [k for k,kws in PROBLEMS.items() if any(w in t for w in kws)]

def fmt_date(iso):
    if not iso: return ""
    try: return datetime.datetime.fromisoformat(iso.rstrip("Z")).strftime("%d/%m/%Y")
    except: return iso[:10]

# ── build data ────────────────────────────────────────────────────────────
print("Conectando a Trello…")
lists, members_raw, cards = fetch()
print(f"  Listas: {len(lists)}  |  Tarjetas: {len(cards)}")

list_map   = {l["id"]: l["name"] for l in lists}
list_order = [l["id"] for l in lists]
member_map = {m["id"]: (m.get("fullName") or m["username"]) for m in members_raw}

rows = []
for c in cards:
    lid    = c.get("idList","")
    status = card_status(c)
    rows.append({
        "Tablero":     "ATC",
        "Lista":       list_map.get(lid,""),
        "Tarjeta":     c["name"],
        "Descripcion": c.get("desc","").strip().replace("\n"," | ").replace('"',"'"),
        "Vencimiento": fmt_date(c.get("due")),
        "Estado":      status,
        "Completada":  "Sí" if c.get("dueComplete") else "No",
        "Etiquetas":   ", ".join(lb.get("name","") for lb in c.get("labels",[])),
        "Asignado_a":  ", ".join(member_map.get(mid,mid) for mid in c.get("idMembers",[])),
        "Archivada":   "Sí" if c.get("closed") else "No",
        "URL":         c.get("url",""),
        "_vendor":     vendor_of(c),
        "_problems":   problems_of(c),
        "_list_name":  list_map.get(lid,""),
    })

active   = [r for r in rows if r["Archivada"]=="No"]
complete = [r for r in rows if r["Completada"]=="Sí"]
archived = [r for r in rows if r["Archivada"]=="Sí"]
critical = [r for r in active if r["Estado"] in ("Vencida","Pendiente")
            and r["Lista"] in ("ATC LISTAS PARA DEVOLVER PROD","ATC DEVUELTAS LOG")]

from collections import Counter
vendor_counts  = Counter(r["_vendor"] for r in active)
problem_counts = Counter(p for r in active for p in r["_problems"])

by_list = {}
for lid in list_order:
    lname = list_map[lid]
    by_list[lname] = {
        "activas":    sum(1 for r in rows if r["Lista"]==lname and r["Archivada"]=="No"),
        "completadas":sum(1 for r in rows if r["Lista"]==lname and r["Completada"]=="Sí"),
        "archivadas": sum(1 for r in rows if r["Lista"]==lname and r["Archivada"]=="Sí"),
    }

today  = datetime.date.today()
monday = today - datetime.timedelta(days=today.weekday())
sunday = monday + datetime.timedelta(days=6)
now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")

# ── CSV string (embedded in HTML) ─────────────────────────────────────────
header = ["Tablero","Lista","Tarjeta","Descripcion","Vencimiento","Estado",
          "Completada","Etiquetas","Asignado_a","Archivada","URL"]
csv_lines = [",".join(header)]
for r in rows:
    csv_lines.append(",".join(
        f'"{r[k]}"' if "," in str(r.get(k,"")) else str(r.get(k,""))
        for k in header
    ))
csv_data = "\\n".join(csv_lines).replace("`","\\`")

# ── vendor chart bars ────────────────────────────────────────────────────
max_v = max(vendor_counts.values(), default=1)
vendor_bars = ""
colors = {"Mirian":"#00B5AD","Maria":"#7C3AED","Isabel":"#D97706",
          "Carola":"#22A06B","Norma":"#3B9ECB","Otras":"#808080"}
for v, n in vendor_counts.most_common():
    pct = round(n/max_v*100)
    c   = colors.get(v,"#808080")
    vendor_bars += f"""
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:90px;font-size:.8rem;font-weight:600;color:#2D2D2D">{v}</div>
        <div style="flex:1;background:#F0F0F0;border-radius:4px;height:22px;overflow:hidden">
          <div style="width:{pct}%;background:{c};height:100%;border-radius:4px;
               display:flex;align-items:center;padding-left:8px;
               font-size:.72rem;font-weight:700;color:#fff;min-width:28px">{n}</div>
        </div>
      </div>"""

problem_bars = ""
max_p = max(problem_counts.values(), default=1)
prob_colors = ["#00B5AD","#7C3AED","#D97706","#CE2939","#22A06B","#3B9ECB","#808080"]
for i,(prob,n) in enumerate(problem_counts.most_common()):
    pct = round(n/max_p*100)
    c   = prob_colors[i % len(prob_colors)]
    problem_bars += f"""
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:110px;font-size:.78rem;font-weight:600;color:#2D2D2D">{prob}</div>
        <div style="flex:1;background:#F0F0F0;border-radius:4px;height:22px;overflow:hidden">
          <div style="width:{pct}%;background:{c};height:100%;border-radius:4px;
               display:flex;align-items:center;padding-left:8px;
               font-size:.72rem;font-weight:700;color:#fff;min-width:28px">{n}</div>
        </div>
      </div>"""

# ── list table rows ───────────────────────────────────────────────────────
list_rows = ""
for lid in list_order:
    lname = list_map[lid]
    d = by_list[lname]
    list_rows += f"""<tr>
      <td style="font-weight:600">{lname}</td>
      <td style="text-align:center;font-weight:800;color:#00B5AD">{d['activas']}</td>
      <td style="text-align:center;color:#22A06B">{d['completadas']}</td>
      <td style="text-align:center;color:#808080">{d['archivadas']}</td>
    </tr>"""

# ── critical cards ────────────────────────────────────────────────────────
crit_rows = ""
for r in critical[:20]:
    crit_rows += f"""<tr>
      <td><a href="{r['URL']}" target="_blank" style="color:#00B5AD;font-weight:600">{r['Tarjeta']}</a></td>
      <td style="font-size:.75rem;color:#666">{r['Lista']}</td>
      <td><span style="background:#FDEAEC;color:#CE2939;padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700">{r['Estado']}</span></td>
    </tr>"""
if not crit_rows:
    crit_rows = '<tr><td colspan="3" style="text-align:center;color:#666;padding:20px">Sin tarjetas críticas ✅</td></tr>'

# ── all cards table ───────────────────────────────────────────────────────
all_rows_html = ""
STATUS_STYLE = {
    "Completada": "background:#E6F9F0;color:#22A06B",
    "Archivada":  "background:#F0F0F0;color:#808080",
    "Pendiente":  "background:#FEF3E2;color:#D97706",
    "Vencida":    "background:#FDEAEC;color:#CE2939",
}
for i, r in enumerate(rows):
    st = STATUS_STYLE.get(r["Estado"], "")
    all_rows_html += f"""<tr style="{'background:rgba(206,41,57,.04)' if r['Estado']=='Vencida' else ''}">
      <td style="color:#999;font-size:.72rem">{i+1}</td>
      <td><a href="{r['URL']}" target="_blank" style="color:#00B5AD;font-weight:600;font-size:.8rem">{r['Tarjeta']}</a></td>
      <td style="font-size:.75rem;color:#444">{r['Lista']}</td>
      <td style="font-size:.75rem;color:#666">{r['_vendor']}</td>
      <td style="font-size:.75rem;color:#666">{r['Vencimiento']}</td>
      <td><span style="{st};padding:2px 8px;border-radius:20px;font-size:.7rem;font-weight:700">{r['Estado']}</span></td>
    </tr>"""

# ── HTML ──────────────────────────────────────────────────────────────────
HTML = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte Semanal ATC — Heaven Colchones</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#F5F6F7;font-family:'Inter',system-ui,sans-serif;color:#2D2D2D}}
.header{{background:#00B5AD;padding:20px 36px;display:flex;justify-content:space-between;
  align-items:center;box-shadow:0 3px 16px rgba(0,181,173,.35)}}
.logo-h{{font-size:1.6rem;font-weight:800;color:#fff;letter-spacing:.12em}}
.logo-s{{font-size:.65rem;color:rgba(255,255,255,.8);letter-spacing:.04em}}
.htitle h1{{font-size:1rem;font-weight:600;color:#fff}}
.htitle p{{font-size:.7rem;color:rgba(255,255,255,.75);margin-top:3px}}
.hbadge{{background:rgba(255,255,255,.2);border-radius:8px;padding:8px 18px;text-align:center}}
.hbadge-v{{font-size:1.8rem;font-weight:800;color:#fff;line-height:1}}
.hbadge-l{{font-size:.6rem;color:rgba(255,255,255,.8);text-transform:uppercase;letter-spacing:.06em}}
.container{{padding:28px 36px;max-width:1400px;margin:0 auto}}
.kpis{{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:28px}}
.kpi{{background:#fff;border-radius:12px;padding:18px 20px;border:1px solid #E2E2E2;
  box-shadow:0 1px 5px rgba(0,0,0,.06);position:relative;overflow:hidden}}
.kpi::before{{content:'';position:absolute;top:0;left:0;right:0;height:4px}}
.kpi.teal::before{{background:#00B5AD}} .kpi.green::before{{background:#22A06B}}
.kpi.red::before{{background:#CE2939}}  .kpi.amber::before{{background:#D97706}}
.kpi.purple::before{{background:#7C3AED}}
.kpi-v{{font-size:2rem;font-weight:800;line-height:1;margin-bottom:4px}}
.kpi.teal .kpi-v{{color:#00B5AD}} .kpi.green .kpi-v{{color:#22A06B}}
.kpi.red .kpi-v{{color:#CE2939}}  .kpi.amber .kpi-v{{color:#D97706}}
.kpi.purple .kpi-v{{color:#7C3AED}}
.kpi-l{{font-size:.65rem;font-weight:700;color:#6B6B6B;text-transform:uppercase;letter-spacing:.07em}}
.sec{{font-size:.68rem;font-weight:700;color:#00B5AD;text-transform:uppercase;
  letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:10px}}
.sec::after{{content:'';flex:1;height:1px;background:#E2E2E2}}
.grid2{{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:28px}}
.card{{background:#fff;border-radius:12px;padding:22px;border:1px solid #E2E2E2;
  box-shadow:0 1px 5px rgba(0,0,0,.06)}}
table{{width:100%;border-collapse:collapse;font-size:.8rem}}
thead th{{background:#1A1A1A;color:rgba(255,255,255,.75);padding:10px 13px;text-align:left;
  font-size:.67rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;
  border-bottom:3px solid #00B5AD}}
tbody tr{{border-bottom:1px solid #F5F6F7;transition:background .12s}}
tbody tr:hover{{background:#E6F7F6}}
tbody td{{padding:9px 13px;vertical-align:middle}}
.tw{{background:#fff;border:1px solid #E2E2E2;border-radius:12px;
  overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.ts{{max-height:500px;overflow-y:auto}}
.ts::-webkit-scrollbar{{width:5px}}
.ts::-webkit-scrollbar-thumb{{background:#00B5AD;border-radius:3px}}
a{{color:#00B5AD;text-decoration:none;font-weight:500}}
a:hover{{text-decoration:underline}}
#export-btn{{position:fixed;bottom:28px;right:28px;z-index:9999;
  background:#00B5AD;color:#fff;border:none;border-radius:10px;
  padding:12px 22px;font-size:.85rem;font-weight:700;font-family:inherit;
  cursor:pointer;box-shadow:0 4px 18px rgba(0,181,173,.45);
  display:flex;align-items:center;gap:8px;transition:background .15s,transform .1s}}
#export-btn:hover{{background:#008F88;transform:translateY(-2px)}}
.footer{{text-align:center;padding:18px;font-size:.68rem;color:#6B6B6B;
  border-top:1px solid #E2E2E2;background:#fff;margin-top:28px}}
@media(max-width:768px){{.kpis,.grid2{{grid-template-columns:1fr}}
  .container{{padding:16px}} .header{{flex-direction:column;gap:12px;text-align:center}}}}
</style>
</head>
<body>
<div class="header">
  <div style="display:flex;align-items:center;gap:20px">
    <div style="border-right:1px solid rgba(255,255,255,.3);padding-right:20px;margin-right:4px">
      <div class="logo-h">HEAVEN</div>
      <div class="logo-s">colchones ✚</div>
    </div>
    <div class="htitle">
      <h1>Reporte Semanal ATC</h1>
      <p>Semana {monday.strftime('%d/%m')} – {sunday.strftime('%d/%m/%Y')} &nbsp;·&nbsp; Generado: {now_str}</p>
    </div>
  </div>
  <div style="display:flex;gap:12px">
    <div class="hbadge"><div class="hbadge-v">{len(active)}</div><div class="hbadge-l">Activas</div></div>
    <div class="hbadge"><div class="hbadge-v">{len(complete)}</div><div class="hbadge-l">Completadas</div></div>
    <div class="hbadge"><div class="hbadge-v">{len(critical)}</div><div class="hbadge-l">Críticas</div></div>
  </div>
</div>

<div class="container">
  <div class="kpis">
    <div class="kpi teal"><div class="kpi-v">{len(rows)}</div><div class="kpi-l">Total tarjetas</div></div>
    <div class="kpi green"><div class="kpi-v">{len(complete)}</div><div class="kpi-l">Completadas</div></div>
    <div class="kpi red"><div class="kpi-v">{len(critical)}</div><div class="kpi-l">Críticas</div></div>
    <div class="kpi amber"><div class="kpi-v">{len(archived)}</div><div class="kpi-l">Archivadas</div></div>
    <div class="kpi purple"><div class="kpi-v">{round(len(complete)/max(len(rows),1)*100)}%</div><div class="kpi-l">% Resueltas</div></div>
  </div>

  <div class="sec">Estado por Lista</div>
  <div class="tw" style="margin-bottom:28px"><table>
    <thead><tr><th>Lista</th><th>Activas</th><th>Completadas</th><th>Archivadas</th></tr></thead>
    <tbody>{list_rows}</tbody>
  </table></div>

  <div class="grid2">
    <div class="card">
      <div class="sec">Casos por Vendedora</div>
      {vendor_bars}
    </div>
    <div class="card">
      <div class="sec">Problemas más frecuentes</div>
      {problem_bars}
    </div>
  </div>

  <div class="sec">Tarjetas Críticas</div>
  <div class="tw" style="margin-bottom:28px"><table>
    <thead><tr><th>Tarjeta</th><th>Lista</th><th>Estado</th></tr></thead>
    <tbody>{crit_rows}</tbody>
  </table></div>

  <div class="sec">Todas las Tarjetas ({len(rows)})</div>
  <div class="tw"><div class="ts"><table>
    <thead><tr><th>#</th><th>Tarjeta</th><th>Lista</th><th>Vendedora</th><th>Vencimiento</th><th>Estado</th></tr></thead>
    <tbody>{all_rows_html}</tbody>
  </table></div></div>
</div>

<div class="footer">HEAVEN Colchones · Reporte ATC Semanal · {today.strftime('%d/%m/%Y')}</div>

<button id="export-btn" onclick="exportCSV()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
  Exportar CSV
</button>

<script>
const CSV_DATA = `{csv_data}`;
function exportCSV() {{
  var blob = new Blob([CSV_DATA], {{type:'text/csv;charset=utf-8;'}});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ATC_Semanal_{today.strftime("%Y%m%d")}.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}}
</script>
</body>
</html>"""

with open("reporte-semanal-atc.html", "w", encoding="utf-8") as f:
    f.write(HTML)

print(f"reporte-semanal-atc.html generado — {len(rows)} tarjetas")
