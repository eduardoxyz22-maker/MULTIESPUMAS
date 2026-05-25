#!/usr/bin/env python3
"""
Lee datos.xlsx (descargado desde Google Drive) y genera dashboard-comercial.html
stdlib pura — sin dependencias externas.
"""
import zipfile, xml.etree.ElementTree as ET, datetime, re, sys

# ── Utilidades Excel ───────────────────────────────────────────────────────────

def col_to_num(col_str):
    n = 0
    for c in col_str.upper():
        n = n * 26 + (ord(c) - ord('A') + 1)
    return n - 1

def get_shared_strings(z):
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    return [''.join(t.text or '' for t in si.iter(f'{{{ns}}}t')) for si in root]

def read_sheet(z, sheet_num, ss):
    root = ET.fromstring(z.read(f'xl/worksheets/sheet{sheet_num}.xml'))
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    data = {}
    for row in root.findall(f'.//{{{ns}}}row'):
        r_num = int(row.get('r', 0))
        data[r_num] = {}
        for c in row.findall(f'{{{ns}}}c'):
            ref = c.get('r', '')
            m = re.match(r'([A-Z]+)', ref)
            if not m:
                continue
            col_num = col_to_num(m.group(1))
            v = c.find(f'{{{ns}}}v')
            t = c.get('t', '')
            val = ''
            if v is not None and v.text is not None:
                if t == 's':
                    idx = int(v.text)
                    val = ss[idx] if idx < len(ss) else v.text
                else:
                    val = v.text
            data[r_num][col_num] = val
    return data

def gv(data, row, col, default=''):
    return data.get(row, {}).get(col, default)

def sf(s, d=0.0):
    try: return float(s)
    except: return d

def fmt_m(v):
    if v <= 0: return '$0'
    return '$' + f'{int(v):,}'.replace(',', '.')

# ── Leer datos ─────────────────────────────────────────────────────────────────
print('Leyendo datos.xlsx...')
try:
    with zipfile.ZipFile('datos.xlsx') as z:
        ss = get_shared_strings(z)

        # HEAVEN: sheet6  — cols: 0=Nombre,1=Ventas,2=Productos,3=Monto,4=MetaMin,5=%Min,6=MetaPres,7=%Pres,8=Ticket,9=PromProds,10=VxDia,11=Leads
        hv = read_sheet(z, 6, ss)
        heaven_rows = []
        for row in [3, 4, 5, 6]:
            nombre = gv(hv, row, 0).strip()
            if not nombre or nombre.upper().startswith('TOTAL'):
                continue
            ventas = int(sf(gv(hv, row, 1)))
            leads  = int(sf(gv(hv, row, 11)))
            heaven_rows.append({
                'nombre':    nombre,
                'ventas':    ventas,
                'productos': int(sf(gv(hv, row, 2))),
                'monto':     sf(gv(hv, row, 3)),
                'meta_min':  sf(gv(hv, row, 4)),
                'pct_min':   sf(gv(hv, row, 5)),
                'meta_pres': sf(gv(hv, row, 6)),
                'pct_pres':  sf(gv(hv, row, 7)),
                'ticket':    sf(gv(hv, row, 8)),
                'leads':     leads,
                'conv':      round(ventas / leads * 100) if leads > 0 else 0,
            })
        # fila de TOTAL Heaven
        for row in [7, 8]:
            if gv(hv, row, 0).upper().startswith('TOTAL'):
                hv_tot = row; break
        else:
            hv_tot = None
        heaven_total_ventas = int(sf(gv(hv, hv_tot, 1))) if hv_tot else sum(r['ventas'] for r in heaven_rows)
        heaven_total_monto  = sf(gv(hv, hv_tot, 3))      if hv_tot else sum(r['monto']  for r in heaven_rows)
        heaven_total_meta   = sf(gv(hv, hv_tot, 4))      if hv_tot else sum(r['meta_min'] for r in heaven_rows)
        heaven_pct_min      = sf(gv(hv, hv_tot, 5))      if hv_tot else (heaven_total_monto / heaven_total_meta if heaven_total_meta else 0)

        # SUEÑA: sheet5  — cols: 0=Nombre,1=Visitas,2=Ventas,3=Online,4=Prods,5=Monto,6=MetaMin,7=%Min,8=MetaPres,9=%Pres
        sv = read_sheet(z, 5, ss)
        suena_rows = []
        for row in [3, 4, 5]:
            nombre = gv(sv, row, 0).strip()
            if not nombre:
                continue
            ventas  = sf(gv(sv, row, 2))
            online  = sf(gv(sv, row, 3))
            monto   = sf(gv(sv, row, 5))
            tot_v   = ventas + online
            suena_rows.append({
                'nombre':       nombre,
                'visitas':      int(sf(gv(sv, row, 1))),
                'ventas':       int(ventas),
                'online':       int(online),
                'ventas_total': int(tot_v),
                'productos':    int(sf(gv(sv, row, 4))),
                'monto':        monto,
                'meta_min':     sf(gv(sv, row, 6)),
                'pct_min':      sf(gv(sv, row, 7)),
                'meta_pres':    sf(gv(sv, row, 8)),
                'pct_pres':     sf(gv(sv, row, 9)),
                'ticket':       monto / tot_v if tot_v > 0 else 0,
            })
        for row in [6, 7]:
            if gv(sv, row, 0).upper().startswith('TOTAL'):
                sv_tot = row; break
        else:
            sv_tot = None
        suena_total_ventas = (int(sf(gv(sv, sv_tot, 2))) + int(sf(gv(sv, sv_tot, 3)))) if sv_tot else sum(r['ventas_total'] for r in suena_rows)
        suena_total_monto  = sf(gv(sv, sv_tot, 5)) if sv_tot else sum(r['monto'] for r in suena_rows)
        suena_total_meta   = sf(gv(sv, sv_tot, 6)) if sv_tot else sum(r['meta_min'] for r in suena_rows)
        suena_pct_min      = sf(gv(sv, sv_tot, 7)) if sv_tot else (suena_total_monto / suena_total_meta if suena_total_meta else 0)

except FileNotFoundError:
    print('ERROR: datos.xlsx no encontrado. Ejecutar el workflow que lo descarga de Google Drive.', file=sys.stderr)
    sys.exit(1)

# ── KPIs globales ──────────────────────────────────────────────────────────────
gran_total_monto  = heaven_total_monto + suena_total_monto
gran_total_ventas = heaven_total_ventas + suena_total_ventas
gran_total_meta   = heaven_total_meta + suena_total_meta
gran_pct          = gran_total_monto / gran_total_meta if gran_total_meta else 0

now = datetime.datetime.now()
mes_map = {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
           7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'}
mes_label = mes_map[now.month] + ' ' + str(now.year)
fecha_gen = now.strftime('%d/%m/%Y %H:%M')

# ── Helpers HTML ───────────────────────────────────────────────────────────────
def bar_color(pct):
    return '#00B5AD' if pct >= 1.0 else ('#D97706' if pct >= 0.7 else '#CE2939')

def badge_cls(pct):
    return 'b-teal' if pct >= 1.0 else ('b-amber' if pct >= 0.7 else 'b-red')

def card_heaven(v):
    pct  = v['pct_min']
    bc   = bar_color(pct)
    bw   = round(min(pct, 1.5) / 1.5 * 100)
    pstr = f"{round(pct*100)}%"
    return f'''<div class="vc">
      <div class="vc-head">
        <div><div class="vc-name">{v['nombre']}</div><span class="badge {badge_cls(pct)}">{pstr} meta mín.</span></div>
        <div style="text-align:right"><div class="vc-monto">{fmt_m(v['monto'])}</div><div class="vc-monto-lbl">vendido</div></div>
      </div>
      <div class="vc-kpis">
        <div class="vk"><div class="vk-val">{v['ventas']}</div><div class="vk-lbl">Ventas</div></div>
        <div class="vk"><div class="vk-val">{fmt_m(v['ticket'])}</div><div class="vk-lbl">Ticket Prom.</div></div>
        <div class="vk"><div class="vk-val">{v['conv']}%</div><div class="vk-lbl">Conversión</div></div>
      </div>
      <div class="vc-bar-wrap">
        <div class="bar-lbl"><span>Meta mín: {fmt_m(v['meta_min'])}</span><span style="color:{bc};font-weight:800">{pstr}</span></div>
        <div class="bar-bg"><div class="bar-fg" style="width:{bw}%;background:{bc}"></div></div>
        <div class="bar-lbl" style="margin-top:4px"><span>Meta pres: {fmt_m(v['meta_pres'])}</span><span>{round(v['pct_pres']*100)}%</span></div>
      </div>
    </div>'''

def card_suena(v):
    pct  = v['pct_min']
    bc   = bar_color(pct)
    bw   = round(min(pct, 1.5) / 1.5 * 100)
    pstr = f"{round(pct*100)}%"
    return f'''<div class="vc">
      <div class="vc-head">
        <div><div class="vc-name">{v['nombre']}</div><span class="badge {badge_cls(pct)}">{pstr} meta mín.</span></div>
        <div style="text-align:right"><div class="vc-monto">{fmt_m(v['monto'])}</div><div class="vc-monto-lbl">vendido</div></div>
      </div>
      <div class="vc-kpis">
        <div class="vk"><div class="vk-val">{v['ventas_total']}</div><div class="vk-lbl">Ventas</div><div class="vk-hint">{v['online']} online</div></div>
        <div class="vk"><div class="vk-val">{fmt_m(v['ticket'])}</div><div class="vk-lbl">Ticket Prom.</div></div>
        <div class="vk"><div class="vk-val">{v['visitas']}</div><div class="vk-lbl">Visitas</div></div>
      </div>
      <div class="vc-bar-wrap">
        <div class="bar-lbl"><span>Meta mín: {fmt_m(v['meta_min'])}</span><span style="color:{bc};font-weight:800">{pstr}</span></div>
        <div class="bar-bg"><div class="bar-fg" style="width:{bw}%;background:{bc}"></div></div>
        <div class="bar-lbl" style="margin-top:4px"><span>Meta pres: {fmt_m(v['meta_pres'])}</span><span>{round(v['pct_pres']*100)}%</span></div>
      </div>
    </div>'''

def store_bar(pct, total_monto, total_meta):
    bc = bar_color(pct)
    bw = round(min(pct, 1.5) / 1.5 * 100)
    return f'''<div class="summary-bar">
    <div class="bar-lbl"><span>Meta mínima: {fmt_m(total_meta)}</span><span style="color:{bc};font-weight:800">{round(pct*100)}% cumplido</span></div>
    <div class="bar-bg"><div class="bar-fg" style="width:{bw}%;background:{bc}"></div></div>
  </div>'''

hv_cards = '\n'.join(card_heaven(v) for v in heaven_rows)
sv_cards = '\n'.join(card_suena(v) for v in suena_rows)
mc_cumpl_cls = 'c-teal' if gran_pct >= 1.0 else 'c-red'

HTML = f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard Comercial — {mes_label}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{--teal:#00B5AD;--teal-dk:#008F88;--teal-lt:#E6F7F6;--gray:#808080;--gray-lt:#F5F6F7;--gray-md:#E2E2E2;--red:#CE2939;--red-lt:#FDEAEC;--amber:#D97706;--amber-lt:#FEF3E2;--black:#1A1A1A;--white:#FFFFFF;--text:#2D2D2D;--muted:#6B6B6B}}
body{{background:var(--gray-lt);color:var(--text);font-family:'Inter',system-ui,sans-serif;min-height:100vh}}
.header{{background:var(--teal);padding:0 36px;display:flex;justify-content:space-between;align-items:stretch;box-shadow:0 3px 16px rgba(0,181,173,.35)}}
.hl{{display:flex;align-items:center;padding:16px 0}}
.logo{{border-right:1px solid rgba(255,255,255,.3);padding-right:24px;margin-right:24px}}
.logo-h{{font-size:1.75rem;font-weight:800;color:#fff;letter-spacing:.14em;line-height:1}}
.logo-s{{font-size:.68rem;color:rgba(255,255,255,.8);letter-spacing:.04em;margin-top:1px}}
.htitle h1{{font-size:.98rem;font-weight:600;color:#fff}}
.htitle p{{font-size:.7rem;color:rgba(255,255,255,.7);margin-top:3px}}
.hr{{display:flex;align-items:center;padding:16px 0;border-left:1px solid rgba(255,255,255,.25);margin-left:auto}}
.hstat{{text-align:center;padding:0 24px;border-right:1px solid rgba(255,255,255,.2)}}
.hstat:last-child{{border-right:none}}
.hstat-v{{font-size:1.5rem;font-weight:800;color:#fff;line-height:1}}
.hstat-l{{font-size:.62rem;color:rgba(255,255,255,.7);margin-top:3px;text-transform:uppercase;letter-spacing:.06em}}
.container{{padding:26px 36px;max-width:1400px;margin:0 auto}}
.metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:26px}}
.mc{{background:#fff;border-radius:12px;padding:20px 22px;border:1px solid var(--gray-md);position:relative;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.mc-bar{{position:absolute;left:0;top:0;bottom:0;width:5px;border-radius:12px 0 0 12px}}
.mc.c-teal .mc-bar{{background:var(--teal)}}.mc.c-gray .mc-bar{{background:var(--gray)}}.mc.c-amber .mc-bar{{background:var(--amber)}}.mc.c-red .mc-bar{{background:var(--red)}}
.mc-lbl{{font-size:.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px}}
.mc-val{{font-size:2rem;font-weight:800;line-height:1}}
.mc.c-teal .mc-val{{color:var(--teal)}}.mc.c-gray .mc-val{{color:var(--gray)}}.mc.c-amber .mc-val{{color:var(--amber)}}.mc.c-red .mc-val{{color:var(--red)}}
.mc-sub{{font-size:.68rem;color:var(--muted);margin-top:5px}}
.sec{{font-size:.68rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px;display:flex;align-items:center;gap:10px}}
.sec::after{{content:'';flex:1;height:1px;background:var(--gray-md)}}
.summary-bar{{background:#fff;border:1px solid var(--gray-md);border-radius:10px;padding:14px 20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.05)}}
.bar-lbl{{display:flex;justify-content:space-between;margin-bottom:5px;font-size:.7rem;font-weight:600;color:var(--muted)}}
.bar-bg{{height:10px;background:var(--gray-lt);border-radius:5px;overflow:hidden}}
.bar-fg{{height:100%;border-radius:5px}}
.vg{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:26px}}
.vc{{background:#fff;border:1px solid var(--gray-md);border-radius:12px;overflow:hidden;box-shadow:0 1px 5px rgba(0,0,0,.06)}}
.vc-head{{background:var(--black);padding:13px 18px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid var(--teal)}}
.vc-name{{font-size:.9rem;font-weight:700;color:#fff}}
.vc-monto{{font-size:1.4rem;font-weight:800;color:var(--teal);line-height:1}}
.vc-monto-lbl{{font-size:.58rem;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;text-align:right}}
.vc-kpis{{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--gray-lt)}}
.vk{{padding:10px 8px;text-align:center;border-right:1px solid var(--gray-lt)}}
.vk:last-child{{border-right:none}}
.vk-val{{font-size:1.05rem;font-weight:800;color:var(--black);line-height:1}}
.vk-lbl{{font-size:.58rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}}
.vk-hint{{font-size:.57rem;color:var(--muted);margin-top:1px}}
.vc-bar-wrap{{padding:12px 16px}}
.badge{{display:inline-block;padding:3px 9px;border-radius:20px;font-size:.66rem;font-weight:700;margin-top:4px}}
.b-teal{{background:var(--teal-lt);color:var(--teal-dk);border:1px solid #99DDD9}}
.b-amber{{background:var(--amber-lt);color:var(--amber);border:1px solid #FCD34D}}
.b-red{{background:var(--red-lt);color:var(--red);border:1px solid #F5C0C5}}
.footer{{text-align:center;padding:18px;font-size:.68rem;color:var(--muted);border-top:1px solid var(--gray-md);background:#fff;margin-top:28px}}
@media(max-width:768px){{.metrics{{grid-template-columns:repeat(2,1fr)}}.hr{{display:none}}}}
</style>
</head>
<body>
<div class="header">
  <div class="hl">
    <div class="logo"><div class="logo-h">HEAVEN</div><div class="logo-s">colchones &#10011;</div></div>
    <div class="htitle">
      <h1>Dashboard Comercial &mdash; {mes_label}</h1>
      <p>Generado: {fecha_gen} &nbsp;&bull;&nbsp; Datos desde Excel (Google Drive)</p>
    </div>
  </div>
  <div class="hr">
    <div class="hstat"><div class="hstat-v">{gran_total_ventas}</div><div class="hstat-l">Ventas totales</div></div>
    <div class="hstat"><div class="hstat-v">{fmt_m(gran_total_monto)}</div><div class="hstat-l">Monto total</div></div>
    <div class="hstat"><div class="hstat-v">{round(gran_pct*100)}%</div><div class="hstat-l">Cumpl. meta mín.</div></div>
  </div>
</div>
<div class="container">
  <div class="metrics">
    <div class="mc c-teal"><div class="mc-bar"></div><div class="mc-lbl">Monto Total Vendido</div><div class="mc-val">{fmt_m(gran_total_monto)}</div><div class="mc-sub">Heaven + Sueña</div></div>
    <div class="mc c-gray"><div class="mc-bar"></div><div class="mc-lbl">Ventas Concretadas</div><div class="mc-val">{gran_total_ventas}</div><div class="mc-sub">ambas tiendas</div></div>
    <div class="mc c-amber"><div class="mc-bar"></div><div class="mc-lbl">Meta Mínima Total</div><div class="mc-val">{fmt_m(gran_total_meta)}</div><div class="mc-sub">combinada</div></div>
    <div class="mc {mc_cumpl_cls}"><div class="mc-bar"></div><div class="mc-lbl">Cumplimiento</div><div class="mc-val">{round(gran_pct*100)}%</div><div class="mc-sub">vs meta mínima</div></div>
  </div>

  <div class="sec">Tienda Heaven &mdash; {fmt_m(heaven_total_monto)} vendido &bull; {heaven_total_ventas} ventas</div>
  {store_bar(heaven_pct_min, heaven_total_monto, heaven_total_meta)}
  <div class="vg">
    {hv_cards}
  </div>

  <div class="sec">Tienda Sueña &mdash; {fmt_m(suena_total_monto)} vendido &bull; {suena_total_ventas} ventas</div>
  {store_bar(suena_pct_min, suena_total_monto, suena_total_meta)}
  <div class="vg">
    {sv_cards}
  </div>
</div>
<div class="footer">HEAVEN Colchones &bull; Dashboard Comercial {mes_label} &bull; datos Google Drive &bull; {fecha_gen}</div>
</body>
</html>'''

with open('dashboard-comercial.html', 'w', encoding='utf-8') as f:
    f.write(HTML)

print(f'dashboard-comercial.html generado.')
print(f'Heaven: {heaven_total_ventas} ventas | {fmt_m(heaven_total_monto)} | {round(heaven_pct_min*100)}% meta mín.')
print(f'Sueña:  {suena_total_ventas} ventas | {fmt_m(suena_total_monto)} | {round(suena_pct_min*100)}% meta mín.')
print(f'Total:  {gran_total_ventas} ventas | {fmt_m(gran_total_monto)} | {round(gran_pct*100)}% meta mín.')
