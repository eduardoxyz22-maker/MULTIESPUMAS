#!/usr/bin/env python3
import zipfile, xml.etree.ElementTree as ET, re, sys, json, calendar, datetime

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

print('Leyendo datos.xlsx...')
try:
    with zipfile.ZipFile('datos.xlsx') as z:
        ss = get_shared_strings(z)
        hv = read_sheet(z, 6, ss)
        sv = read_sheet(z, 5, ss)
        mg = read_sheet(z, 4, ss)
        ds = read_sheet(z, 3, ss)
except FileNotFoundError:
    print('ERROR: datos.xlsx no encontrado.', file=sys.stderr)
    sys.exit(1)

now = datetime.datetime.now()
mes_map = {1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',
           7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'}
mes = mes_map[now.month]
anio = now.year
diasTot = calendar.monthrange(anio, now.month)[1]
dia_actual = min(now.day, diasTot)

crec_lookup = {}
for r in list(range(53, 57)) + list(range(60, 65)):
    nombre_raw = gv(mg, r, 0).strip()
    crec_val = gv(mg, r, 4)
    if nombre_raw and crec_val != '':
        crec_lookup[nombre_raw.lower()] = sf(crec_val)

record_lookup = {}
for r in range(70, 80):
    nombre_raw = gv(mg, r, 1).strip()
    record_val = gv(mg, r, 5).strip()
    if nombre_raw:
        record_lookup[nombre_raw.lower()] = bool(record_val)

vendedores = []

for row in [3, 4, 5, 6]:
    nombre = gv(hv, row, 0).strip()
    if not nombre or nombre.upper().startswith('TOTAL'): continue
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
        'pctPres': round(sf(gv(hv, row, 7)), 6),
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
    })

for row in [3, 4, 5]:
    nombre = gv(sv, row, 0).strip()
    if not nombre: continue
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
        'pctPres': round(sf(gv(sv, row, 9)), 6),
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
    })

tot_vend = sum(v['monto'] for v in vendedores)
for v in vendedores:
    v['pctTotal'] = round(v['monto'] / tot_vend, 6) if tot_vend > 0 else 0

comm = {
    'SUEÑA': {'comisiones': sf(gv(ds, 27, 1)), 'bonos': sf(gv(ds, 27, 2)),
              'totalPagado': sf(gv(ds, 27, 3)), 'comisionados': si(gv(ds, 27, 4))},
    'HEAVEN': {'comisiones': sf(gv(ds, 28, 1)), 'bonos': sf(gv(ds, 28, 2)),
               'totalPagado': sf(gv(ds, 28, 3)), 'comisionados': si(gv(ds, 28, 4))},
}
suena_leads = si(gv(sv, 6, 13))
suena_ventas = si(gv(sv, 6, 2)) + si(gv(sv, 6, 3))
heaven_leads = si(gv(hv, 7, 11))
heaven_ventas = si(gv(hv, 7, 1))

tiendas = []
for r, nombre_t in [(19, 'SUEÑA'), (20, 'HEAVEN'), (21, 'OTROS'), (22, 'ROHO')]:
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
        'pctPres': round(sf(gv(ds, r, 5)), 6),
        'leads': leads_t,
        'conversion': conv_t,
        'comisiones': round(c['comisiones'], 4),
        'bonos': round(c['bonos'], 4),
        'totalPagado': round(c['totalPagado'], 4),
        'comisionados': c['comisionados'],
        'crecimientoVsAbril': round(diferencia / mes_pasado, 6) if mes_pasado else None,
        'mesPasadoMonto': mes_pasado,
    })

global_data = {
    'leadsTotal': si(gv(ds, 27, 10)),
    'ventasConcretadas': si(gv(ds, 28, 10)),
    'conversionGlobal': round(sf(gv(ds, 29, 10)), 8),
    'ticketPromGlobal': round(sf(gv(ds, 30, 10)), 2),
    'productosVendidos': si(gv(ds, 31, 10)),
}

clientes = []
for r in range(29, 38):
    nombre_c = gv(mg, r, 0).strip()
    if nombre_c and nombre_c.upper() != 'TOTAL':
        clientes.append({'nombre': nombre_c, 'productos': si(gv(mg, r, 2)), 'monto': round(sf(gv(mg, r, 3)), 2)})

data = {
    'periodo': {'mes': mes, 'anio': anio, 'diasTotales': diasTot},
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
  var hv=sh("HEAVEN"),sv=sh("SUENA")||sh("Sue\xf1a"),mg=sh("MAYO GLOBAL"),ds=sh("Dashboard");
  if(!hv||!sv||!mg||!ds) throw new Error("Hojas no encontradas. Verifica que el Excel tenga: HEAVEN, SUENA, MAYO GLOBAL, Dashboard.");
  var ahora=new Date();
  var meses=["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  var mes=meses[ahora.getMonth()+1],anio=ahora.getFullYear();
  var diasTot=new Date(anio,ahora.getMonth()+1,0).getDate();
  var dia=Math.min(ahora.getDate(),diasTot);
  var vends=[];
  for(var i=2;i<=5;i++){var r=hv[i];if(!r||!r[0]||("" +r[0]).toUpperCase().startsWith("TOTAL"))continue;
    var m=sf(r[3]),l=si(r[11]),v=si(r[1]),rd=dia>0?m/dia:0;
    vends.push({id:("" +r[0]).toLowerCase().replace(/ /g,"_"),nombre:""+r[0],tienda:"HEAVEN",monto:m,
      metaMin:sf(r[4]),presupuesto:sf(r[6]),ticketProm:sf(r[8]),leads:l,ventasConcretadas:v,productos:si(r[2]),
      conversion:l>0?v/l:0,pctMin:sf(r[5]),pctPres:sf(r[7]),pctTotal:0,comision:sf(r[12]),
      bonoTitanio:sf(r[14]),pctComision:sf(r[13]),crecimientoVsAbril:null,nuevoRecord:false,
      ritmoDiario:rd,proyeccion:m+rd*(diasTot-dia),ingresoLead:l>0?m/l:0,prodPorVenta:sf(r[9])});}
  for(var i=2;i<=4;i++){var r=sv[i];if(!r||!r[0])continue;
    var m=sf(r[5]),l=si(r[13]),v=si(r[2]),rd=dia>0?m/dia:0;
    vends.push({id:("" +r[0]).toLowerCase().replace(/ /g,"_"),nombre:""+r[0],tienda:"SUE\xd1A",monto:m,
      metaMin:sf(r[6]),presupuesto:sf(r[8]),ticketProm:sf(r[10]),leads:l,ventasConcretadas:v,productos:si(r[4]),
      conversion:l>0?v/l:0,pctMin:sf(r[7]),pctPres:sf(r[9]),pctTotal:0,comision:sf(r[14]),
      bonoTitanio:sf(r[16]),pctComision:sf(r[15]),crecimientoVsAbril:null,nuevoRecord:false,
      ritmoDiario:rd,proyeccion:m+rd*(diasTot-dia),ingresoLead:l>0?m/l:0,prodPorVenta:sf(r[11])});}
  var tot=vends.reduce(function(s,v){return s+v.monto;},0);
  vends.forEach(function(v){v.pctTotal=tot?v.monto/tot:0;});
  var tiendas=[];var tn=["SUE\xd1A","HEAVEN","OTROS","ROHO"];
  for(var ti=0;ti<4;ti++){var r=ds[18+ti];if(!r)continue;
    var mn=sf(r[1]),dif=sf(r[9]||0),mp=dif?mn-dif:null;
    var l=ti===0?si((sv[5]||[])[13]):ti===1?si((hv[6]||[])[11]):null;
    tiendas.push({id:tn[ti].toLowerCase().replace("\xf1","n"),nombre:tn[ti],monto:mn,metaMin:sf(r[2]),
      presupuesto:sf(r[4]),pctMin:sf(r[3]),pctPres:sf(r[5]),leads:l,conversion:null,
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
html = re.sub(r'ltima actualizaci\xf3n:.*?</span>',
              f'ltima actualizaci\xf3n: {now.strftime("%d/%m/%Y %H:%M")}</span>', html)

with open('dashboard-comercial.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f'dashboard-comercial.html generado — {mes} {anio}')
print(f'Vendedores: {len(vendedores)} | Tiendas: {len(tiendas)} | Clientes: {len(clientes)}')
print(f'Total global: Bs {sum(t["monto"] for t in tiendas):,.0f}')
