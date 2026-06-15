#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET, re, sys, json, calendar, datetime, os

# ── Parametros por mes (via variables de entorno; defaults = comportamiento Mayo) ──
GLOBAL_SHEET  = os.environ.get('GLOBAL_SHEET', 'MAYO GLOBAL')   # pestana GLOBAL del mes
OUT_FILE      = os.environ.get('OUT_FILE', 'dashboard-comercial.html')  # archivo de salida
MES_NOMBRE_ENV = os.environ.get('MES_NOMBRE', '').strip()       # ej. "Junio" (opcional)
ANIO_ENV       = os.environ.get('ANIO', '').strip()             # ej. "2026" (opcional)
CERRADO_ENV    = os.environ.get('CERRADO', '').strip().lower() in ('1', 'true', 'yes', 'si', 'sí')

def col_to_num(col_str):
    n = 0
    for c in col_str.upper():
        n = n * 26 + (ord(c) - ord('A') + 1)
    return n - 1

def get_shared_strings(z):
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    return [''.join(t.text or '' for t in si.iter(f'{{{ns}}}t')) for si in root]

def build_sheet_map(z):
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    rns = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
    pns = 'http://schemas.openxmlformats.org/package/2006/relationships'
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid_to_target = {rel.get('Id'): rel.get('Target') for rel in rels.findall(f'{{{pns}}}Relationship')}
    name_to_file = {}
    for sheet in wb.findall(f'.//{{{ns}}}sheet'):
        name = sheet.get('name')
        rid = sheet.get(f'{{{rns}}}id')
        target = rid_to_target.get(rid, '')
        if target:
            name_to_file[name] = target.split('/')[-1]
    return name_to_file

def find_sheet_file(name_map, *candidates):
    def norm(s):
        return s.upper().replace('Ñ', 'N').strip()
    for c in candidates:
        if c in name_map:
            return name_map[c]
    targets = {norm(c) for c in candidates}
    for name, fil in name_map.items():
        if norm(name) in targets:
            return fil
    return None

def read_sheet_by_name(z, name_map, ss, *candidates):
    fil = find_sheet_file(name_map, *candidates)
    if not fil:
        raise KeyError(f'Hoja no encontrada: {candidates}')
    root = ET.fromstring(z.read(f'xl/worksheets/{fil}'))
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    data = {}
    for row in root.findall(f'.//{{{ns}}}row'):
        r_num = int(row.get('r', 0))
        data[r_num] = {}
        for c in row.findall(f'{{{ns}}}c'):
            ref = c.get('r', '')
            m = re.match(r'([A-Z]+)', ref)
            if not m: continue
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
            if not m: continue
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

def si(s, d=0):
    try: return int(float(s))
    except: return d

def _norm(s):
    return str(s).strip().upper().replace('Ñ', 'N')

def find_row(sheet, col, *labels, start=1, contains=False):
    """Primera fila (>= start) cuya columna `col` coincide con alguna etiqueta.
    Permite anclar por nombre/encabezado en vez de filas fijas, asi el layout
    tolera filas extra (p.ej. una vendedora mas en el ranking)."""
    tg = [_norm(l) for l in labels]
    for rn in sorted(k for k in sheet if k >= start):
        cell = _norm(gv(sheet, rn, col))
        if not cell:
            continue
        if (any(t in cell for t in tg) if contains else cell in tg):
            return rn
    return None

print('Leyendo datos.xlsx...')
try:
    with zipfile.ZipFile('datos.xlsx') as z:
        ss = get_shared_strings(z)
        name_map = build_sheet_map(z)
        hv = read_sheet_by_name(z, name_map, ss, 'HEAVEN')
        sv = read_sheet_by_name(z, name_map, ss, 'SUEÑA', 'SUENA', 'Sueña')
        mg = read_sheet_by_name(z, name_map, ss, GLOBAL_SHEET)
        ds = read_sheet_by_name(z, name_map, ss, 'Dashboard', 'DASHBOARD')
        try:
            mom_s = read_sheet_by_name(z, name_map, ss, 'MOM', 'Mom', 'mom') or {}
        except (KeyError, Exception):
            mom_s = {}
except FileNotFoundError:
    print('ERROR: datos.xlsx no encontrado.', file=sys.stderr)
    sys.exit(1)
except KeyError as e:
    print(f'ERROR: hoja faltante en el Excel: {e}', file=sys.stderr)
    sys.exit(1)

# ── Leer hoja MOM (comparativo mes anterior al mismo día) ──
mom_data = {}
mom_label = ''
if mom_s:
    _mom_hdr = None
    for rn in sorted(k for k in mom_s if k >= 1):
        if _norm(gv(mom_s, rn, 0)) == 'VENDEDOR':
            _mom_hdr = rn
            break
    if _mom_hdr:
        for rn in range(_mom_hdr + 1, 30):
            nm_raw = gv(mom_s, rn, 0).strip()
            if not nm_raw:
                continue
            if 'FECHA' in _norm(nm_raw) or _norm(nm_raw) in ('TOTAL', 'A FECHA'):
                cell1 = gv(mom_s, rn, 1).strip()
                if cell1:
                    mom_label = cell1
                continue
            mom_data[nm_raw.lower()] = {
                'leads':    si(gv(mom_s, rn, 1)),
                'ventas':   si(gv(mom_s, rn, 2)),
                'productos': si(gv(mom_s, rn, 3)),
                'monto':    round(float(gv(mom_s, rn, 4) or 0), 2),
            }
print(f'MOM: {len(mom_data)} vendedores, período "{mom_label}"')

now = datetime.datetime.now()
mes_map = {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
           7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'}
mes_num = {v.lower(): k for k, v in mes_map.items()}

# Mes: 1) variable MES_NOMBRE, 2) derivado de la hoja GLOBAL (ej. "JUNIO GLOBAL"), 3) fecha del sistema
if MES_NOMBRE_ENV:
    mes = MES_NOMBRE_ENV.title()
else:
    derivado = re.sub(r'\s*GLOBAL\s*$', '', GLOBAL_SHEET, flags=re.I).strip().title()
    mes = derivado if derivado.lower() in mes_num else mes_map[now.month]

anio = int(ANIO_ENV) if ANIO_ENV.isdigit() else now.year
mnum = mes_num.get(mes.lower(), now.month)
diasTot = calendar.monthrange(anio, mnum)[1]
# Mes en curso -> dia de hoy; mes cerrado o pasado -> mes completo
es_mes_actual = (anio == now.year and mnum == now.month)
dia_actual = diasTot if (CERRADO_ENV or not es_mes_actual) else min(now.day, diasTot)
print(f'Configuracion: mes={mes} {anio}, hoja_global={GLOBAL_SHEET!r}, salida={OUT_FILE!r}, dia={dia_actual}/{diasTot}, cerrado={CERRADO_ENV}')

# Crecimiento vs mes anterior por vendedor (seccion "KPIs ADICIONALES" -> "TIENDAS SUEÑA/HEAVEN")
# OJO: hay otra tabla "TIENDAS ..." arriba con productos; hay que anclar tras "KPIs ADICIONALES".
crec_lookup = {}
_kpi = find_row(mg, 0, 'KPIS ADICIONALES', contains=True) or 1
for _sec_lbl in ['TIENDAS SUE', 'TIENDAS HEAVEN']:
    _sec = find_row(mg, 0, _sec_lbl, start=_kpi, contains=True)
    if not _sec:
        continue
    _rn = _sec + 2  # +1 encabezado de columnas, +2 primer vendedor
    while _rn <= _sec + 12:
        nombre_raw = gv(mg, _rn, 0).strip()
        if not nombre_raw or nombre_raw.upper().startswith('TOTAL'):
            break
        crec_val = gv(mg, _rn, 4)
        if crec_val != '':
            crec_lookup[nombre_raw.lower()] = sf(crec_val)
        _rn += 1

# Nuevo record por vendedor (seccion "RANKING VENDEDORES" de la hoja GLOBAL)
record_lookup = {}
_rk = find_row(mg, 0, 'RANKING VENDEDORES', contains=True)
if _rk:
    _rn = _rk + 2  # +1 encabezado de columnas, +2 primer vendedor
    while _rn <= _rk + 20:
        nombre_raw = gv(mg, _rn, 1).strip()
        if not nombre_raw:
            break
        if not nombre_raw.upper().startswith('TOTAL'):
            record_lookup[nombre_raw.lower()] = bool(gv(mg, _rn, 5).strip())
        _rn += 1

vendedores = []

for row in range(3, 40):
    nombre = gv(hv, row, 0).strip()
    if not nombre or nombre.upper().startswith('TOTAL'): break
    ventas = si(gv(hv, row, 1))
    productos = si(gv(hv, row, 2))
    monto = sf(gv(hv, row, 3))
    leads = si(gv(hv, row, 11))
    ritmoDiario = monto / dia_actual if dia_actual > 0 else 0
    nombre_key = nombre.lower()
    vendedores.append({
        'id': nombre_key.replace(' ', '_'),
        'nombre': nombre.title(),
        'tienda': 'HEAVEN',
        'monto': round(monto, 2),
        'metaMin': round(sf(gv(hv, row, 4)), 2),
        'presupuesto': round(sf(gv(hv, row, 6)), 2),
        'ticketProm': round(sf(gv(hv, row, 8)), 2),
        'leads': leads,
        'ventasConcretadas': ventas,
        'productos': productos,
        'conversion': round(ventas / leads, 6) if leads > 0 else 0,
        'pctMin': round(sf(gv(hv, row, 5)), 6),
        'pctPres': round(monto / sf(gv(hv, row, 6)), 6) if sf(gv(hv, row, 6)) > 0 else 0,  # monto/presupuesto (ignora celda Excel)
        'pctTotal': 0,
        'comision': round(sf(gv(hv, row, 12)), 4),
        'bonoTitanio': round(sf(gv(hv, row, 14)), 4),
        'pctComision': round(sf(gv(hv, row, 13)), 6),
        'crecimientoVsAbril': round(crec_lookup[nombre_key], 6) if nombre_key in crec_lookup else None,
        'nuevoRecord': record_lookup.get(nombre_key, False),
        'ritmoDiario': round(ritmoDiario, 4),
        'proyeccion': round(monto + ritmoDiario * (diasTot - dia_actual), 2),
        'ingresoLead': round(monto / leads, 4) if leads > 0 else 0,
        'prodPorVenta': round(sf(gv(hv, row, 9)), 4),
        'momLeads':    mom_data[nombre_key]['leads']    if nombre_key in mom_data else None,
        'momVentas':   mom_data[nombre_key]['ventas']   if nombre_key in mom_data else None,
        'momProductos':mom_data[nombre_key]['productos'] if nombre_key in mom_data else None,
        'momMonto':    mom_data[nombre_key]['monto']    if nombre_key in mom_data else None,
    })

for row in range(3, 40):
    nombre = gv(sv, row, 0).strip()
    if not nombre or nombre.upper().startswith('TOTAL'): break
    ventas = si(gv(sv, row, 2))
    monto = sf(gv(sv, row, 5))
    leads = si(gv(sv, row, 13))
    ritmoDiario = monto / dia_actual if dia_actual > 0 else 0
    nombre_key = nombre.lower()
    vendedores.append({
        'id': nombre_key.replace(' ', '_'),
        'nombre': nombre.title(),
        'tienda': 'SUEÑA',
        'monto': round(monto, 2),
        'metaMin': round(sf(gv(sv, row, 6)), 2),
        'presupuesto': round(sf(gv(sv, row, 8)), 2),
        'ticketProm': round(sf(gv(sv, row, 10)), 2),
        'leads': leads,
        'ventasConcretadas': ventas,
        'productos': si(gv(sv, row, 4)),
        'conversion': round(ventas / leads, 6) if leads > 0 else 0,
        'pctMin': round(sf(gv(sv, row, 7)), 6),
        'pctPres': round(monto / sf(gv(sv, row, 8)), 6) if sf(gv(sv, row, 8)) > 0 else 0,  # monto/presupuesto (ignora celda Excel)
        'pctTotal': 0,
        'comision': round(sf(gv(sv, row, 14)), 4),
        'bonoTitanio': round(sf(gv(sv, row, 16)), 4),
        'pctComision': round(sf(gv(sv, row, 15)), 6),
        'crecimientoVsAbril': round(crec_lookup[nombre_key], 6) if nombre_key in crec_lookup else None,
        'nuevoRecord': record_lookup.get(nombre_key, False),
        'ritmoDiario': round(ritmoDiario, 4),
        'proyeccion': round(monto + ritmoDiario * (diasTot - dia_actual), 2),
        'ingresoLead': round(monto / leads, 4) if leads > 0 else 0,
        'prodPorVenta': round(sf(gv(sv, row, 11)), 4),
        'momLeads':    mom_data[nombre_key]['leads']    if nombre_key in mom_data else None,
        'momVentas':   mom_data[nombre_key]['ventas']   if nombre_key in mom_data else None,
        'momProductos':mom_data[nombre_key]['productos'] if nombre_key in mom_data else None,
        'momMonto':    mom_data[nombre_key]['monto']    if nombre_key in mom_data else None,
    })

tot_vend = sum(v['monto'] for v in vendedores)
for v in vendedores:
    v['pctTotal'] = round(v['monto'] / tot_vend, 6) if tot_vend > 0 else 0

# Comisiones por tienda (seccion "COMISIONES Y BONOS" del Dashboard)
_comm_sec = find_row(ds, 0, 'COMISIONES Y BONOS', contains=True) or 1
def _comm_of(rn):
    if not rn:
        return {'comisiones': 0, 'bonos': 0, 'totalPagado': 0, 'comisionados': 0}
    return {'comisiones': sf(gv(ds, rn, 1)), 'bonos': sf(gv(ds, rn, 2)),
            'totalPagado': sf(gv(ds, rn, 3)), 'comisionados': si(gv(ds, rn, 4))}
comm = {
    'SUEÑA': _comm_of(find_row(ds, 0, 'SUEÑA', 'SUENA', start=_comm_sec)),
    'HEAVEN': _comm_of(find_row(ds, 0, 'HEAVEN', start=_comm_sec)),
}
# Totales de tienda desde la fila TOTAL de cada hoja (no fila fija: tolera vendedores extra)
_sv_total = find_row(sv, 0, 'TOTAL', contains=True) or 6
_hv_total = find_row(hv, 0, 'TOTAL', contains=True) or 7
suena_leads = si(gv(sv, _sv_total, 13))
suena_ventas = si(gv(sv, _sv_total, 2)) + si(gv(sv, _sv_total, 3))
heaven_leads = si(gv(hv, _hv_total, 11))
heaven_ventas = si(gv(hv, _hv_total, 1))

# Cumplimiento por tienda: anclar a la seccion y buscar cada tienda por nombre
_tienda_sec = find_row(ds, 0, 'CUMPLIMIENTO DE METAS POR TIENDA', contains=True)
_t_start = (_tienda_sec + 1) if _tienda_sec else 1
tiendas = []
for nombre_t in ['SUEÑA', 'HEAVEN', 'OTROS', 'ROHO']:
    r = find_row(ds, 0, nombre_t, 'SUENA' if nombre_t == 'SUEÑA' else nombre_t, start=_t_start)
    if not r:
        print(f'AVISO: tienda {nombre_t} no encontrada en Dashboard', file=sys.stderr)
        tiendas.append({'id': nombre_t.lower(), 'nombre': nombre_t, 'monto': 0, 'metaMin': 0,
                        'presupuesto': 0, 'pctMin': 0, 'pctPres': 0, 'leads': None, 'conversion': None,
                        'comisiones': 0, 'bonos': 0, 'totalPagado': 0, 'comisionados': 0,
                        'crecimientoVsAbril': None, 'mesPasadoMonto': None})
        continue
    monto_t = sf(gv(ds, r, 1))
    diferencia = sf(gv(ds, r, 9))
    mes_pasado = round(monto_t - diferencia, 2) if diferencia != 0 else None
    leads_t = None
    conv_t = None
    if nombre_t == 'SUEÑA':
        leads_t = suena_leads
        conv_t = round(suena_ventas / suena_leads, 6) if suena_leads > 0 else None
    elif nombre_t == 'HEAVEN':
        leads_t = heaven_leads
        conv_t = round(heaven_ventas / heaven_leads, 6) if heaven_leads > 0 else None
    c = comm.get(nombre_t, {'comisiones': 0, 'bonos': 0, 'totalPagado': 0, 'comisionados': 0})
    tiendas.append({
        'id': nombre_t.lower(),
        'nombre': nombre_t,
        'monto': round(monto_t, 2),
        'metaMin': round(sf(gv(ds, r, 2)), 2),
        'presupuesto': round(sf(gv(ds, r, 4)), 2),
        'pctMin': round(sf(gv(ds, r, 3)), 6),
        'pctPres': round(monto_t / sf(gv(ds, r, 4)), 6) if sf(gv(ds, r, 4)) > 0 else 0,  # monto/presupuesto (ignora celda Excel)
        'leads': leads_t,
        'conversion': conv_t,
        'comisiones': round(c['comisiones'], 4),
        'bonos': round(c['bonos'], 4),
        'totalPagado': round(c['totalPagado'], 4),
        'comisionados': c['comisionados'],
        'crecimientoVsAbril': round(diferencia / mes_pasado, 6) if mes_pasado else None,
        'mesPasadoMonto': mes_pasado,
    })

# Totales globales: etiqueta en col H (idx 7), valor en col K (idx 10)
def _metric(*kw):
    rn = find_row(ds, 7, *kw, contains=True)
    return gv(ds, rn, 10) if rn else ''
global_data = {
    'leadsTotal': si(_metric('TOTAL LEADS')),
    'ventasConcretadas': si(_metric('VENTAS CONCRETADAS')),
    'conversionGlobal': round(sf(_metric('CONVERSI')), 8),
    'ticketPromGlobal': round(sf(_metric('TICKET PROMEDIO')), 2),
    'productosVendidos': si(_metric('PRODUCTOS VENDIDOS')),
}

# Clientes externos (seccion "VENTAS ... POR CLIENTE" de la hoja GLOBAL)
clientes = []
_cli = find_row(mg, 0, 'VENTAS TOTALES POR CLIENTE', 'VENTAS POR CLIENTE', contains=True)
if _cli:
    _rn = _cli + 2  # +1 encabezado de columnas, +2 primer cliente
    while _rn <= _cli + 30:
        nombre_c = gv(mg, _rn, 0).strip()
        if not nombre_c or nombre_c.upper() == 'TOTAL':
            break
        clientes.append({'nombre': nombre_c, 'productos': si(gv(mg, _rn, 2)), 'monto': round(sf(gv(mg, _rn, 3)), 2)})
        _rn += 1

periodo = {'mes': mes, 'anio': anio, 'diasTotales': diasTot, 'momLabel': mom_label}
if CERRADO_ENV:
    periodo['cerrado'] = True
data = {
    'periodo': periodo,
    'vendedores': vendedores,
    'tiendas': tiendas,
    'global': global_data,
    'clientes': clientes,
}

print('Leyendo dashboard-template.html...')
try:
    with open('dashboard-template.html', 'r', encoding='utf-8') as f:
        html = f.read()
except FileNotFoundError:
    print('ERROR: dashboard-template.html no encontrado.', file=sys.stderr)
    sys.exit(1)

data_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
html = html.replace(
    '<script>window.__resources = {};</script>',
    '<script>window.__resources = {};</script>\n  <script>window.__DATA__ = ' + data_json + ';</script>'
)

CDN_REACT    = 'https://unpkg.com/react@18/umd/react.production.min.js'
CDN_REACTDOM = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'
CDN_BABEL    = 'https://unpkg.com/@babel/standalone/babel.min.js'
CDN_XLSX     = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'

blob_map = {
    'blob:https://eduardoxyz22-maker.github.io/74e3f041-15e9-4c0c-b45a-f79ff8e00abc': CDN_REACT,
    'blob:https://eduardoxyz22-maker.github.io/beb4c7e9-0eca-4dbd-8d28-313b39065fef': CDN_REACTDOM,
    'blob:https://eduardoxyz22-maker.github.io/665418e3-42cc-4466-82fa-a60648dad3e7': CDN_BABEL,
    'blob:https://eduardoxyz22-maker.github.io/173704d7-2551-49a7-a5b8-0b23512e0f10': CDN_XLSX,
}
for blob_url, cdn_url in blob_map.items():
    html = html.replace(f'src="{blob_url}"', f'src="{cdn_url}"')

PARSE_INLINE = '''<script>
window.parseXlsxFile = async function(file) {
  var buf = await file.arrayBuffer();
  var wb = XLSX.read(buf, {type:"array"});
  function sh(n){var ws=wb.Sheets[n];return ws?XLSX.utils.sheet_to_json(ws,{header:1,defval:""}):null;}
  function sf(v){var n=parseFloat(v);return isNaN(n)?0:n;}
  function si(v){return Math.round(sf(v));}
  function title(s){return (""+s).trim().toLowerCase().split(" ").map(function(w){return w?w.charAt(0).toUpperCase()+w.slice(1):w;}).join(" ");}
  function shFind(names){for(var k=0;k<names.length;k++){var r=sh(names[k]);if(r)return r;}
    var keys=Object.keys(wb.Sheets);for(var k=0;k<keys.length;k++){var kn=keys[k].toUpperCase().replace(/\xd1/g,"N");
      for(var j=0;j<names.length;j++){if(kn===names[j].toUpperCase().replace(/\xd1/g,"N"))return sh(keys[k]);}}
    return null;}
  var hv=shFind(["HEAVEN"]),sv=shFind(["SUE\xd1A","SUENA","Sue\xf1a"]),mg=shFind(["MAYO GLOBAL"]),ds=shFind(["Dashboard"]);
  if(!hv||!sv||!mg||!ds) throw new Error("Hojas no encontradas. Verifica que el Excel tenga: HEAVEN, SUE\xd1A, MAYO GLOBAL, Dashboard.");
  var ahora=new Date();
  var meses=["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  var mes=meses[ahora.getMonth()+1],anio=ahora.getFullYear();
  var diasTot=new Date(anio,ahora.getMonth()+1,0).getDate();
  var dia=Math.min(ahora.getDate(),diasTot);
  var crecLookup={};
  function addCrec(a,b){for(var i=a;i<=b;i++){var r=mg[i];if(r&&(""+(r[0]||"")).trim()&&(""+(r[4]||""))!==""){crecLookup[(""+r[0]).trim().toLowerCase()]=sf(r[4]);}}}
  addCrec(52,55);addCrec(59,63);
  var recordLookup={};
  for(var ri=69;ri<=78;ri++){var rr=mg[ri];if(rr&&(""+(rr[1]||"")).trim()){recordLookup[(""+rr[1]).trim().toLowerCase()]=!!(""+(rr[5]||"")).trim();}}
  function nk(x){return (""+x).trim().toLowerCase();}
  var vends=[];
  for(var i=2;i<=5;i++){var r=hv[i];if(!r||!r[0]||("" +r[0]).toUpperCase().startsWith("TOTAL"))continue;
    var m=sf(r[3]),l=si(r[11]),v=si(r[1]),rd=dia>0?m/dia:0;
    var hk=nk(r[0]);
    vends.push({id:("" +r[0]).toLowerCase().replace(/ /g,"_"),nombre:title(r[0]),tienda:"HEAVEN",monto:m,
      metaMin:sf(r[4]),presupuesto:sf(r[6]),ticketProm:sf(r[8]),leads:l,ventasConcretadas:v,productos:si(r[2]),
      conversion:l>0?v/l:0,pctMin:sf(r[5]),pctPres:sf(r[6])>0?m/sf(r[6]):0,pctTotal:0,comision:sf(r[12]),
      bonoTitanio:sf(r[14]),pctComision:sf(r[13]),crecimientoVsAbril:(hk in crecLookup)?crecLookup[hk]:null,nuevoRecord:!!recordLookup[hk],
      ritmoDiario:rd,proyeccion:m+rd*(diasTot-dia),ingresoLead:l>0?m/l:0,prodPorVenta:sf(r[9])});}
  for(var i=2;i<=4;i++){var r=sv[i];if(!r||!r[0])continue;
    var m=sf(r[5]),l=si(r[13]),v=si(r[2]),rd=dia>0?m/dia:0;
    var sk=nk(r[0]);
    vends.push({id:("" +r[0]).toLowerCase().replace(/ /g,"_"),nombre:title(r[0]),tienda:"SUE\xd1A",monto:m,
      metaMin:sf(r[6]),presupuesto:sf(r[8]),ticketProm:sf(r[10]),leads:l,ventasConcretadas:v,productos:si(r[4]),
      conversion:l>0?v/l:0,pctMin:sf(r[7]),pctPres:sf(r[8])>0?m/sf(r[8]):0,pctTotal:0,comision:sf(r[14]),
      bonoTitanio:sf(r[16]),pctComision:sf(r[15]),crecimientoVsAbril:(sk in crecLookup)?crecLookup[sk]:null,nuevoRecord:!!recordLookup[sk],
      ritmoDiario:rd,proyeccion:m+rd*(diasTot-dia),ingresoLead:l>0?m/l:0,prodPorVenta:sf(r[11])});}
  var tot=vends.reduce(function(s,v){return s+v.monto;},0);
  vends.forEach(function(v){v.pctTotal=tot?v.monto/tot:0;});
  var tiendas=[];var tn=["SUE\xd1A","HEAVEN","OTROS","ROHO"];
  for(var ti=0;ti<4;ti++){var r=ds[18+ti];if(!r)continue;
    var mn=sf(r[1]),dif=sf(r[9]||0),mp=dif?mn-dif:null;
    var l=ti===0?si((sv[5]||[])[13]):ti===1?si((hv[6]||[])[11]):null;
    tiendas.push({id:tn[ti].toLowerCase().replace("\xf1","n"),nombre:tn[ti],monto:mn,metaMin:sf(r[2]),
      presupuesto:sf(r[4]),pctMin:sf(r[3]),pctPres:sf(r[4])>0?mn/sf(r[4]):0,leads:l,conversion:null,
      comisiones:0,bonos:0,totalPagado:0,comisionados:0,
      crecimientoVsAbril:mp?dif/mp:null,mesPasadoMonto:mp});}
  if(ds[26]){tiendas[0].comisiones=sf(ds[26][1]);tiendas[0].bonos=sf(ds[26][2]);tiendas[0].totalPagado=sf(ds[26][3]);tiendas[0].comisionados=si(ds[26][4]);}
  if(ds[27]){tiendas[1].comisiones=sf(ds[27][1]);tiendas[1].bonos=sf(ds[27][2]);tiendas[1].totalPagado=sf(ds[27][3]);tiendas[1].comisionados=si(ds[27][4]);}
  var g={leadsTotal:si((ds[26]||[])[10]),ventasConcretadas:si((ds[27]||[])[10]),
    conversionGlobal:sf((ds[28]||[])[10]),ticketPromGlobal:sf((ds[29]||[])[10]),
    productosVendidos:si((ds[30]||[])[10])};
  var cli=[];
  for(var i=28;i<=36;i++){var r=mg[i];if(r&&r[0]&&(""+r[0]).toUpperCase()!=="TOTAL")cli.push({nombre:""+r[0],productos:si(r[2]),monto:sf(r[3])});}
  return {periodo:{mes:mes,anio:anio,diasTotales:diasTot},vendedores:vends,tiendas:tiendas,global:g,clientes:cli};
};
</script>'''

html = html.replace(
    '  <script src="blob:https://eduardoxyz22-maker.github.io/1e6e7d73-36a9-4931-bc01-cada16e587e4"></script>',
    '  ' + PARSE_INLINE
)

html = html.replace(
    'ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));\n//# sourceMappingURL',
    '// Rendering handled by Babel JSX scripts in body\n//# sourceMappingURL'
)

html = html.replace('Dashboard Comercial \xb7 Mayo 2025', f'Dashboard Comercial \xb7 {mes} {anio}')
# Corregir el prerender estatico (evita el parpadeo "Mayo 2025" antes de hidratar)
html = html.replace('<div class="title-main">Mayo \xb7 2025</div>', f'<div class="title-main">{mes} \xb7 {anio}</div>')
html = html.replace('Fuente: <b>Mayo 2025</b>', f'Fuente: <b>{mes} {anio}</b>')
html = re.sub(r'ltima actualizaci\xf3n:.*?</span>',
              f'ltima actualizaci\xf3n: {now.strftime("%d/%m/%Y %H:%M")}</span>', html)

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'{OUT_FILE} generado — {mes} {anio}')
print(f'Vendedores: {len(vendedores)} | Tiendas: {len(tiendas)} | Clientes: {len(clientes)}')
print(f'Total global: Bs {sum(t["monto"] for t in tiendas):,.0f}')
