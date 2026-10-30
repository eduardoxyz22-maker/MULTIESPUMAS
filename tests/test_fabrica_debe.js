/* 🏭 «LO QUE NOS DEBE LA FÁBRICA» (30/10, propuesta 75, elegida por el dueño).
   Octubre: logística marcó «✓ Ya pedí» 36 veces y manda a fabricar renglones de clientes (🏭), pero el panel solo daba por llegado un «Ya pedí»
   si alguien tildaba la sugerencia en la vista previa del Excel (0 de 63). Resultado: 28 avisos «reclamá» (14 ya habían llegado), lo de verdad
   atrasado se borraba a los 7 días y se volvía a pedir, y apagar el 🏭 de un renglón borraba cuándo se pidió.

   FD1  Con el último almacén del archivo de los TRES, lo que entró en los tres juntos se asigna solo a lo pedido de ese producto, del más
        viejo al más nuevo: dos «Ya pedí» de SOFT (7 + 7) y entraron 10 entre PTF (+4) y Banzer (+6) → el primero cierra, el segundo queda con 3.
   FD2  Llegada parcial y tardía: un «Ya pedí» vencido hace 8 días (antes se borraba a los 7) recibe lo que mostró Moreno y queda «faltan 4».
   FD3  Un pase de PTF a Banzer (−3 / +3) no es una entrada: el «Ya pedí» de ese producto sigue abierto.
   FD4  Una recogida de Moreno ANOTADA (llegó a PTF y ya bajó a Moreno en el panel) tampoco: el «Ya pedí» de ese producto sigue abierto.
   FD5  El 🏭 de un cliente entra en el orden por fecha: lo que mostró el Excel queda anotado en `STOCK.fd` (el pedido no se toca).
   FD6  Lo pedido DESPUÉS de la hora del Excel no se cierra con ese Excel; lo que entra sin pedido queda como siempre (detección).
   FD7  El mismo archivo otra vez (o en otro equipo) no cierra dos veces; dos equipos con el mismo archivo anotan la MISMA recepción.
   FD8  La lista «🏭 Lo que nos debe la fábrica» arriba del Plan y de «Pedido a producción», por fábrica, con atraso y el reclamo para copiar.
   FD9  Antes de volver a pedir: «hay 97 pedidas el 22/10 que no llegaron: reclamá antes de pedir más». El «reclamá» del Plan, solo para
        lo que no apareció.
   FD10 «✓ Llegó», «✕ No se pidió» y «↩️ No llegó» en la lista.
   FD11 Apagar el 🏭 de algo pedido otro día guarda la llegada (`prodR`, `prodRt`) en vez de borrar `prodF`; el mismo día sigue siendo «quitar».
   FD12 La celda no crece sin tope: lo abierto se guarda 60 días y como mucho 40; lo de los 🏭, 80 renglones.
   FD13 La entrada de un «Ya pedí» vencido no se le asigna al pedido nuevo que sigue en camino (`stockDetectadoReparto`).
   Reloj CLAVADO (jueves 29/10/2026 17:20 de Bolivia). Red cortada, servidor simulado, Excel armados acá, datos inventados (el repo es público).
   Se corre:  node tests/test_fabrica_debe.js   ·  `PEDIDOS=<archivo>` corre contra otra página.
   Dientes:   contra `2f9ad92` (antes de la propuesta 75), 38 rojas de 46 (30/10). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const J=(x)=>JSON.stringify(x);
/* El mismo arranque que `test_stock_rev2_u2_turno.js` (servidor simulado, `_stock`, `_ped`, `_lin`, `_cargar`, `_fila`). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const corre = async (page, fn, arg) => page.evaluate(async ([src, arg]) => { try{ return await (0,eval)('('+src+')')(arg); }catch(e){ return { __error:String(e && e.stack || e) }; } }, [fn.toString(), arg]);

/* ── Un .xlsx de verdad (ZIP sin comprimir), con la forma del reporte de Moreno de los tres almacenes (el armado de test_existencias_tres). ── */
function crc32(buf){ let crc=0xFFFFFFFF; for(let n=0;n<buf.length;n++){ let c=(crc^buf[n])&0xFF; for(let k=0;k<8;k++) c=(c&1)?((c>>>1)^0xEDB88320):(c>>>1); crc=(crc>>>8)^c; } return (crc^0xFFFFFFFF)>>>0; }
function zip(files){
  const partes=[], central=[]; let off=0;
  files.forEach(f=>{
    const name=Buffer.from(f.name,'utf8'), data=Buffer.from(f.data,'utf8'), crc=crc32(data);
    const lh=Buffer.alloc(30); lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt32LE(crc,14); lh.writeUInt32LE(data.length,18); lh.writeUInt32LE(data.length,22); lh.writeUInt16LE(name.length,26);
    partes.push(lh,name,data);
    const ch=Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt32LE(crc,16); ch.writeUInt32LE(data.length,20); ch.writeUInt32LE(data.length,24); ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(off,42);
    central.push(ch,name); off+=30+name.length+data.length;
  });
  const cd=Buffer.concat(central), eocd=Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(files.length,8); eocd.writeUInt16LE(files.length,10); eocd.writeUInt32LE(cd.length,12); eocd.writeUInt32LE(off,16);
  return Buffer.concat(partes.concat([cd,eocd]));
}
const esc=(t)=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function reporte({ al, pie, bloques }){
  const celda=(ref,v)=> typeof v==='number' ? `<c r='${ref}' s='11'><v>${v}</v></c>` : `<c r='${ref}' t='inlineStr' s='11'><is><t>${esc(v)}</t></is></c>`;
  let n=0; const filas=[]; const fila=(cs)=>{ n++; filas.push(`<row r="${n}">${cs.map(([c,v])=>celda(c+n,v)).join('')}</row>`); };
  const cab='01-05-103  IM - PRODUCTOTERMINADO';
  fila([['C','MULTIESPUMAS']]);
  fila([['C','MORENO'],['X','EXISTENCIAS ALMACEN  AL '],['AR',al]]);
  fila([['BC','(Productos con existencia <> 0)']]);
  fila([['F','Almacén Inicial :'],['P',cab],['AK','Almacén Final :'],['AX',cab]]);
  fila([['C','Línea de Productos'],['BA','Cantidad']]);
  fila([['G','Código Producto'],['W','Nombre Producto'],['AZ',' CUI'],['BD','Unidad']]);
  let gral=0;
  bloques.forEach(b=>{
    fila([['Y',Number(b.cod)],['AE',b.alm]]);
    fila([['B','COLCHONES PROPIOS']]); fila([['D','HEAVEN']]);
    b.items.forEach(it=>fila([['G',it[0]],['W',it[1]],['AY',it[2]],['BD','PZA']]));
    const s=b.items.reduce((a,it)=>a+it[2],0);
    fila([['H','SUBTOTAL'],['M','HEAVEN'],['AV',s]]);
    fila([['Q','TOTAL :'],['U',b.alm],['AV',s]]); gral+=s;
  });
  fila([['AF','TOTAL GENERAL :'],['AV',gral]]);
  fila([['B','iv380_34'],['Z','Página 1 de 1'],['AZ','Fecha : '+pie+' - logistica']]);
  const hoja='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+filas.join('')+'</sheetData></worksheet>';
  return zip([ { name:'[Content_Types].xml', data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>' },
               { name:'xl/workbook.xml', data:'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>' },
               { name:'xl/worksheets/sheet1.xml', data:hoja } ]);
}
const LOG='PRODUCTOS TERMINADOS FAB.', BZ='Almacen Distribucion Banzer', IM='IM - PRODUCTOTERMINADO';
/* Los productos (códigos del catálogo; los nombres como los escribe el sistema de Moreno). */
const P = {
  SOFT:  ['COLT0048','COLCHON SOFT 140X190CM'],             // Sueña → Multiespumas
  TI180: ['CH1221','TITANIO ICE 3PLZ 180X190CM'],           // Heaven → Moreno
  TI160: ['CH1201','TITANIO ICE 2.5PLZ 160X190CM'],
  ALM:   ['CD1403','ALMOHADA 50X70'],
  TL140: ['CH1129','COLCHON TITANIO LATEX 140X190'],
  TL160: ['CH1130','COLCHON TITANIO LATEX 160X190'],
  TL180: ['CH1131','COLCHON TITANIO LATEX 180X190'],
  TL200: ['CH1132','COLCHON TITANIO LATEX 200X200'] };
const it=(p, n)=>[P[p][0], P[p][1], n];
/* El Excel de HOY a las 17:10 (los tres almacenes en un archivo), contra el de ayer a las 17:00:
     SOFT  PTF 1→5 (+4), Banzer 3→9 (+6)       = +10      · TI180 Moreno 0→1 (+1)     · TI160 PTF 10→7, Banzer 2→5 (pase)
     ALM   Moreno 0→4 (+4)                                · TL140 Moreno 0→2 (+2)     · TL160 recogida anotada (PTF 0→3, Moreno 5→2)
     TL180 PTF 0→2 (nadie lo pidió)                       · TL200 Moreno 0→2 (pedido DESPUÉS del Excel) */
const HOY_XLSX = reporte({ al:'29/10/2026', pie:'29/10/2026 17:10:00', bloques:[
  { cod:'105003', alm:LOG, items:[ it('SOFT',5), it('TI160',7), it('TL160',3), it('TL180',2) ] },
  { cod:'105025', alm:BZ,  items:[ it('SOFT',9), it('TI160',5) ] },
  { cod:'105103', alm:IM,  items:[ it('TI180',1), it('ALM',4), it('TL140',2), it('TL160',2), it('TL200',2) ] } ] });

async function abrir(browser, reloj){
  const ctx = await browser.newContext({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page._err=[]; page.on('pageerror', e => page._err.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(reloj));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(() => {
    /* El servidor simulado guarda lo que se le manda (la relectura de la planilla al subir un Excel trae lo último). */
    apiSave=function(rec){
      if(rec && rec.id==='__stock__'){ window._guardado=rec.observaciones; try{ window._SRV.stock=JSON.parse(rec.observaciones); }catch(e){} }
      else if(rec && rec.id){ var L=window._SRV.pedidos, i=L.findIndex(function(p){ return p.id===rec.id; }); var c=JSON.parse(JSON.stringify(rec)); if(i>=0) L[i]=c; else L.push(c); }
      return Promise.resolve({ ok:true, pedido:rec });
    };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    window._K={}; window._kk=function(c,d,m){ return _k(c,d,m); };
    window._q=function(id){ return (STOCK.p||[]).filter(function(q){ return q && q.id===id; })[0]||null; };
    window._lleg=function(q){ var n=0; ((q&&q.recs)||[]).forEach(function(r){ if(r && !r.an) n+=Number(r.u)||0; }); return n; };
    window._ya=function(id, k, u, f, esp, extra){ return Object.assign({ id:id, k:k, u:u, fab:'', f:f, arr:f, esp:esp, r:'', ya:1, t:_ts(f,'10:00:00') }, extra||{}); };
    /* El estado de AYER a la noche: los tres almacenes del 28/10 a las 17:00 (los dos turnos), los «Ya pedí» y una recogida de Moreno
       ya anotada como llegada (18:00, después del Excel de Moreno: el panel la restó de Moreno y la sumó a PTF). */
    window._base=function(){
      var K={ SOFT:_k('COLT0048','COLCHON SOFT','140x190'), TI180:_k('CH1221','TITANIO ICE','180x190'), TI160:_k('CH1201','TITANIO ICE','160x190'),
              ALM:_k('CD1403','ALMOHADA','50x70'), TL140:_k('CH1129','TITANIO LATEX','140x190'), TL160:_k('CH1130','TITANIO LATEX','160x190'),
              TL180:_k('CH1131','TITANIO LATEX','180x190'), TL200:_k('CH1132','TITANIO LATEX','200x200') };
      window._K=K;
      var st=_stock(function(s){
        s.c.u[K.SOFT]=1; s.c.u[K.TI160]=10;
        s.g[_BZ].u[K.SOFT]=3; s.g[_BZ].u[K.TI160]=2;
        s.g[_IM].u[K.TL160]=5;
        s.p=[ _ya('y1', K.SOFT, 7, '2026-10-22', '2026-10-26', { fab:'MULTI' }),
              _ya('y2', K.SOFT, 7, '2026-10-26', '2026-10-29', { fab:'MULTI' }),
              _ya('y3', K.TI180, 5, '2026-10-16', '2026-10-21', { fab:'MORENO' }),     // vencido hace 8 días: antes se borraba a los 7
              _ya('y4', K.TI180, 4, '2026-10-23', '2026-10-27', { fab:'MORENO' }),
              _ya('y5', K.TI160, 3, '2026-10-20', '2026-10-23', { fab:'MORENO' }),
              _ya('y6', K.ALM, 101, '2026-10-22', '2026-10-27', { fab:'MORENO' }),
              _ya('y7', K.TL140, 2, '2026-10-24', '2026-10-28', { fab:'MORENO' }),
              _ya('y8', K.TL160, 3, '2026-10-21', '2026-10-26', { fab:'MORENO' }),
              _ya('y9', K.TL200, 2, '2026-10-29', '2026-11-03', { fab:'MORENO', t:_ts('2026-10-29','17:15:00') }),   // pedido DESPUÉS del Excel de las 17:10
              { id:'rc1', k:K.TL160, u:3, f:'2026-10-27', esp:'2026-10-28', r:'', tipo:'recogida', de:_IM, t:_ts('2026-10-27','11:00:00'),
                recs:[ { id:'rr1', u:3, f:'2026-10-28', ts:_ts('2026-10-28','18:00:00'), se:0 } ] } ];
      }, { f:'2026-10-28', hora:'17:00:00', subido:'17:05:00', inc:true });
      var peds=[
        // un 🏭 de cliente pedido a Moreno el 21/10 (antes que el «Ya pedí» del 24/10 del mismo producto)
        _ped('p01', '2026-11-03', 'AM', [ _lin('CH1129|TITANIO LATEX|140x190', 1, { enProd:true, prodEn:'Moreno', prodF:'2026-10-21', chk:'no' }) ], { ts:_ts('2026-10-20','10:00:00') }),
        // lo vendido de almohadas para la semana que viene (el Plan quiere pedir más)
        _ped('a01', '2026-11-02', 'AM', [ _lin('CD1403|ALMOHADA|50x70', 60) ], { ts:_ts('2026-10-27','10:00:00') }),
        _ped('a02', '2026-11-03', 'PM', [ _lin('CD1403|ALMOHADA|50x70', 60) ], { ts:_ts('2026-10-27','10:00:00') }) ];
      return { st:st, peds:peds };
    };
  });
  return page;
}
/* Sube el archivo por el botón de verdad (`onExistArchivo`) y aprieta «Usar» en cada almacén (PTF → Banzer → Moreno). */
async function subirTres(page, buffer, name){
  await page.evaluate(()=>{ EXIST_IMP=null; try{ closeModal(); }catch(e){} });
  await page.setInputFiles('#exist-input', { name, mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await page.waitForFunction(()=>!!EXIST_IMP, null, { timeout:10000 }).catch(()=>{});
  return page.evaluate(async ()=>{
    var n=0, roles=[], alms=[];
    while(EXIST_IMP && n<5){ n++; var sel=document.getElementById('exist-rol'); roles.push(sel?sel.value:''); alms.push(EXIST_IMP.almacen); await confirmarImportExist(); }
    stockOlvidarIndice();
    return { n:n, roles:roles, alms:alms, toast:(window._toasts||[]).filter(function(t){ return /Depósito actualizado|Existencias de/.test(t); }).slice(-1)[0]||'' };
  });
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const RELOJ='2026-10-29T17:20:00-04:00';
  let page = await abrir(browser, RELOJ), r;

  // ═══ FD1-FD6: el archivo de los tres almacenes ═══
  console.log('\n── FD1-FD6. El Excel de los tres almacenes cierra lo pedido a la fábrica ──');
  r = await corre(page, async () => { var b=_base(); await _cargar(b.peds, b.st); return { y3:!!_q('y3'), n:(STOCK.p||[]).length }; });
  chk('FD0 (partida) el «Ya pedí» vencido hace 8 días sigue en la planilla al leerla (antes la poda lo borraba a los 7)', r && r.y3===true, r);
  const sub = await subirTres(page, HOY_XLSX, 'Excel_29102026_17_10_00_tres.xlsx');
  chk('FD0 (partida) se usaron los tres almacenes del archivo, en orden', sub.n===3 && J(sub.roles)===J(['log','sale','otro']), sub);
  r = await corre(page, async () => {
    var K=_K, q=function(id){ var x=_q(id); return x ? { r:x.r, u:Number(x.u)||0, lleg:_lleg(x), ids:((x.recs)||[]).filter(function(y){ return !y.an; }).map(function(y){ return String(y.id).slice(0,3)+(y.se?':se':''); }), enConteo:!!x.enConteo } : null; };
    var p01=findById('p01'), x01=p01 && p01.productos[0];
    var det=(STOCK.det||[]).filter(function(d){ return !d.an; }).map(function(d){ return { k:d.k, t:d.t, u:d.u }; });
    return { y1:q('y1'), y2:q('y2'), y3:q('y3'), y4:q('y4'), y5:q('y5'), y6:q('y6'), y7:q('y7'), y8:q('y8'), y9:q('y9'),
             fd:(STOCK.fd||[]).map(function(x){ return { u:x.u, f:x.f, l:!!x.l }; }), p01:{ prodU:x01.prodU, prodR:x01.prodR||'', prodF:x01.prodF, chk:x01.chk },
             det:det, kTL180:K.TL180, kSOFT:K.SOFT,
             tm:(STOCK.g[_IM].u||{})[K.TL160], toast:(window._toasts||[]).join(' | ') };
  });
  if(r.__error) console.log(r.__error);
  chk('FD1a SOFT: el «Ya pedí 7» del 22/10 se cerró solo con lo que entró (PTF +4 y Banzer +6), sin entrada nueva al depósito (`se`), y no mide la fábrica',
      r.y1 && r.y1.r==='2026-10-29' && r.y1.lleg===7 && r.y1.ids.length===1 && /^xf::se$/.test(r.y1.ids[0]) && r.y1.enConteo, r.y1);
  chk('FD1b …y el del 26/10 recibió el resto: llegaron 3, faltan 4 (del más viejo al más nuevo)', r.y2 && !r.y2.r && r.y2.lleg===3 && r.y2.u===4, r.y2);
  chk('FD2a TITANIO ICE 180: el vencido del 16/10 (5) toma lo que mostró Moreno: llegó 1, faltan 4 — el del 23/10 sigue entero', r.y3 && !r.y3.r && r.y3.lleg===1 && r.y3.u===4 && r.y4 && r.y4.lleg===0 && r.y4.u===4, [r.y3, r.y4]);
  chk('FD2b ALMOHADA: de 101 pedidas el 22/10 llegaron 4 (Moreno): faltan 97', r.y6 && r.y6.lleg===4 && r.y6.u===97, r.y6);
  chk('FD3 TITANIO ICE 160: el pase de PTF a Banzer (−3 / +3) NO es una entrada — el «Ya pedí 3» sigue abierto y sin nada', r.y5 && !r.y5.r && r.y5.lleg===0 && r.y5.u===3, r.y5);
  chk('FD4 TITANIO LATEX 160: la recogida anotada (PTF +3, Moreno ya restado) NO es una entrada — el «Ya pedí 3» sigue abierto', r.y8 && !r.y8.r && r.y8.lleg===0 && r.tm===2, [r.y8, r.tm]);
  chk('FD5a TITANIO LATEX 140: el 🏭 del cliente (pedido el 21/10) va primero y queda anotado en `STOCK.fd` (1)', r.fd && r.fd.length===1 && r.fd[0].u===1 && r.fd[0].f==='2026-10-29', r.fd);
  chk('FD5b …el pedido del cliente NO se toca (sin prodU, sin sello, la marca igual) y el «Ya pedí» del 24/10 recibe el otro: faltan 1', r.p01 && r.p01.prodU==null && !r.p01.prodR && r.p01.prodF==='2026-10-21' && r.y7 && r.y7.lleg===1 && r.y7.u===1, [r.p01, r.y7]);
  chk('FD6a lo pedido a las 17:15 (después del Excel de las 17:10) no se cierra con ese Excel', r.y9 && r.y9.lleg===0 && r.y9.u===2, r.y9);
  var dTL=(r.det||[]).filter(function(d){ return d.k===r.kTL180; })[0], dSO=(r.det||[]).filter(function(d){ return d.k===r.kSOFT; })[0];
  chk('FD6b lo que entró sin ningún pedido (TITANIO LATEX 180 +2) queda como siempre: detección sin asignar', dTL && dTL.t===2 && dTL.u===2, r.det);
  chk('FD6c la detección de SOFT en PTF (+4) quedó explicada por lo que se cerró (no vuelve a restarse de lo que viene)', dSO && dSO.t===4 && dSO.u===0, r.det);
  chk('FD6d el aviso del Excel dice que lo que entró cerró solo lo pedido a la fábrica', /cerró solo lo pedido a la fábrica/.test(sub.toast||''), sub.toast);
  const tras = await corre(page, async () => JSON.stringify(STOCK));

  // ═══ FD7: el mismo archivo otra vez, y dos equipos ═══
  console.log('\n── FD7. El mismo archivo dos veces; dos equipos con el mismo archivo ──');
  const sub2 = await subirTres(page, HOY_XLSX, 'DOC-20261029-WA0007.xlsx');
  r = await corre(page, async () => ({ y1:_q('y1').recs.length, y2:_lleg(_q('y2')), y3:_lleg(_q('y3')), fd:(STOCK.fd||[]).length }));
  chk('FD7a el mismo archivo otra vez no cierra nada de nuevo (ni en los «Ya pedí» ni en el 🏭)', sub2.n===3 && r.y1===1 && r.y2===3 && r.y3===1 && r.fd===1, [sub2.n, r]);
  r = await corre(page, async (tras) => {
    var b=_base(), base=b.st, A=leerStock({ observaciones:tras });
    // el otro equipo: mismo punto de partida, mismo archivo → las mismas recepciones (mismos ids)
    var B=leerStock({ observaciones:tras });
    var J=stockFusionar(leerStock({ observaciones:JSON.stringify(base) }), A, B);
    var ids=function(S, id){ var x=(S.p||[]).filter(function(q){ return q.id===id; })[0]; return ((x&&x.recs)||[]).map(function(y){ return y.id; }).sort(); };
    // y una junta SIN base (una fila vieja en la cola): tampoco duplica
    var U=stockFusionar(null, A, B);
    return { a:ids(A,'y2'), j:ids(J,'y2'), u:ids(U,'y2'), fdJ:(J.fd||[]).length, fdU:(U.fd||[]).length, llegJ:_lleg((J.p||[]).filter(function(q){ return q.id==='y2'; })[0]) };
  }, tras);
  chk('FD7b dos equipos con el mismo archivo: la junta deja UNA recepción por pedido (mismo id), también sin base, y un solo renglón del 🏭',
      r.a && r.a.length===1 && J(r.j)===J(r.a) && J(r.u)===J(r.a) && r.llegJ===3 && r.fdJ===1 && r.fdU===1, r);

  // ═══ FD8-FD9: la lista y el Plan ═══
  console.log('\n── FD8-FD9. La lista por fábrica, el reclamo y el Plan ──');
  r = await corre(page, async () => {
    var out={};
    var L=fdLista(); out.fabs=L.map(function(g){ return g.fab; });
    var por=function(fab, k){ var g=L.filter(function(x){ return x.fab===fab; })[0]; return g ? g.prods.filter(function(p){ return p.k===k; })[0] : null; };
    var s=por('MULTI', _K.SOFT), t=por('MORENO', _K.TI180), a=por('MORENO', _K.ALM), l=por('MORENO', _K.TL140);
    out.soft=s && { ped:s.pedidas, lleg:s.llegaron, falta:s.falta, atr:s.atraso };
    out.ti180=t && { ped:t.pedidas, lleg:t.llegaron, falta:t.falta, atr:t.atraso, fechas:t.fechas };
    out.alm=a && { ped:a.pedidas, lleg:a.llegaron, falta:a.falta, atr:a.atraso };
    out.tl140=l && { ped:l.pedidas, lleg:l.llegaron, falta:l.falta, its:l.items.map(function(i){ return i.t+':'+i.falta; }) };
    out.orden=(L.filter(function(g){ return g.fab==='MORENO'; })[0]||{ prods:[] }).prods.map(function(p){ return p.k.split('|')[0]+':'+p.atraso; }).slice(0,3);
    abrirStock(); await new Promise(function(ok){ setTimeout(ok, 300); });
    var caja=document.getElementById('fd-caja'), plan=document.getElementById('stk-plan');
    out.caja=!!caja; out.antesDelPlan=!!(caja && plan && (caja.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING));
    out.txt=caja ? caja.textContent.replace(/\s+/g,' ') : '';
    // con muchos productos se ven los más atrasados y «Ver los N que siguen»
    FD_TOPE=2; renderStock(); var mas=document.querySelector('#fd-caja .fd-mas');
    out.mas={ txt:mas?mas.textContent:'', filas:document.querySelectorAll('#fd-caja .fd-fab')[0].querySelectorAll('.fd-prod').length };
    if(mas) mas.click(); out.mas.todas=document.querySelectorAll('#fd-caja .fd-fab')[0].querySelectorAll('.fd-prod').length;
    FD_TOPE=6; FD_TODOS={}; renderStock();
    out.reclamo=fdReclamoTexto('MORENO'); out.reclamoMulti=fdReclamoTexto('MULTI');
    // el Plan: SOFT ya no avisa «reclamá»; TITANIO ICE 180 sí; y antes de volver a pedir almohadas, el aviso
    var fila=function(k){ return _fila(k); };
    var hs=document.createElement('div'); hs.innerHTML=planYaHtml(fila(_K.SOFT)); out.softPlan=hs.textContent;
    var ht=document.createElement('div'); ht.innerHTML=planYaHtml(fila(_K.TI180)); out.tiPlan=ht.textContent; out.tiVenc=ht.querySelectorAll('.pl-ya-venc').length;
    var oA=fila(_K.ALM), ha=document.createElement('div'); ha.innerHTML=planYaHtml(oA); out.almPlan=ha.textContent.replace(/\s+/g,' '); out.almFab=oA.fabricar; out.almAviso=oA.aviso;
    closeStock && closeStock();
    abrirPap(); await new Promise(function(ok){ setTimeout(ok, 500); });
    var cp=document.getElementById('fd-caja-pap'); out.pap=!!cp && /Lo que nos debe la fábrica/.test(cp.textContent);
    try{ cerrarPap(); }catch(e){}
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('FD8a la lista va por fábrica: Industrias Moreno y Multiespumas', r.fabs && r.fabs[0]==='MORENO' && r.fabs.indexOf('MULTI')>=0, r.fabs);
  chk('FD8b SOFT (Multiespumas): pedidas 14, llegaron 10, faltan 4, sin atraso todavía (el del 26/10 llega hoy)', r.soft && r.soft.ped===14 && r.soft.lleg===10 && r.soft.falta===4 && r.soft.atr===0, r.soft);
  chk('FD8c TITANIO ICE 180 (Moreno): pedidas 9 (16/10 y 23/10), llegó 1, faltan 8, 8 días de atraso (tenía que llegar el 21/10)',
      r.ti180 && r.ti180.ped===9 && r.ti180.lleg===1 && r.ti180.falta===8 && r.ti180.atr===8 && J(r.ti180.fechas)===J(['2026-10-16','2026-10-23']), r.ti180);
  chk('FD8d ALMOHADA: 101 pedidas, llegaron 4, faltan 97', r.alm && r.alm.ped===101 && r.alm.lleg===4 && r.alm.falta===97, r.alm);
  chk('FD8e TITANIO LATEX 140: el 🏭 del cliente ya llegó (✓) y el «Ya pedí» debe 1', r.tl140 && r.tl140.falta===1 && r.tl140.its.indexOf('prod:0')>=0 && r.tl140.its.indexOf('ya:1')>=0, r.tl140);
  chk('FD8f lo más atrasado primero', r.orden && /^TITANIO ICE:8/.test(r.orden[0]||''), r.orden);
  chk('FD8g en Stock la lista está ARRIBA del Plan', r.caja && r.antesDelPlan && /Lo que nos debe la fábrica/.test(r.txt) && /Industrias Moreno/.test(r.txt) && /Copiar el reclamo para Moreno/.test(r.txt), (r.txt||'').slice(0,240));
  chk('FD8h …y también arriba de «🏭 Pedido a producción»', r.pap===true, r.pap);
  chk('FD8k con muchos productos se ven los más atrasados y «👁️ Ver los N que siguen» abre el resto', r.mas && r.mas.filas===2 && /Ver los 4 que siguen/.test(r.mas.txt) && r.mas.todas===6, r.mas);
  chk('FD8i el reclamo para Moreno: por producto, cuánto falta, desde cuándo, y no nombra clientes',
      /RECLAMO A INDUSTRIAS MORENO/.test(r.reclamo||'') && /TITANIO ICE · 180X190: faltan 8 de 9/.test(r.reclamo||'') && /21\/10/.test(r.reclamo||'') && /ALMOHADA · 50X70: faltan 97/.test(r.reclamo||'') && !/CLIENTE/.test(r.reclamo||''), r.reclamo);
  chk('FD8j …lo que todavía no está atrasado no va (SOFT llega hoy): Multiespumas no tiene nada que reclamar', !r.reclamoMulti, r.reclamoMulti);
  chk('FD9a el Plan ya no dice «reclamá» de lo que SÍ apareció (SOFT del 22/10)', !/reclamá/.test(r.softPlan||''), r.softPlan);
  chk('FD9b …y lo sigue diciendo de lo que de verdad no llegó (TITANIO ICE 180, vencidos)', r.tiVenc>=1 && /reclamá/.test(r.tiPlan||''), r.tiPlan);
  chk('FD9c antes de volver a pedir almohadas: «Hay 97 pedidas el 22/10 que no llegaron: reclamá antes de pedir más»',
      r.almFab>0 && /Hay 97 pedidas el 22\/10 que no llegaron: reclamá antes de pedir más/.test(r.almPlan||'') && /Ya pedí/.test(r.almPlan||''), { fab:r.almFab, aviso:r.almAviso, txt:(r.almPlan||'').slice(0,300) });

  // ═══ FD10: los botones ═══
  console.log('\n── FD10. ✓ Llegó, ✕ No se pidió, ↩️ No llegó ──');
  r = await corre(page, async () => {
    var out={};
    fdNoSePidio('y4');                                   // sin nada llegado: se saca
    out.y4=!!_q('y4');
    fdNoSePidio('y3');                                   // con 1 llegado: se cierra en lo que llegó
    var y3=_q('y3'); out.y3={ r:y3 && y3.r, lleg:_lleg(y3), u:y3 && y3.u };
    fdLlego('y5');                                       // ✓ Llegó: se cierra sin entrada nueva al depósito
    var y5=_q('y5'); out.y5={ r:y5.r, lleg:_lleg(y5), ids:y5.recs.map(function(x){ return String(x.id).slice(0,3)+(x.se?':se':''); }), conteo:!!y5.enConteo };
    out.dep=_fila(_K.TI160).deposito;
    fdNoLlego('y1');                                     // ↩️ el Excel se equivocó: vuelve a faltar
    var y1=_q('y1'); out.y1={ r:y1.r, lleg:_lleg(y1), u:y1.u, lap:y1.recs.filter(function(x){ return !!x.an; }).length };
    var l=(STOCK.fd||[])[0] && STOCK.fd[0].l; fdProdNoLlego(l);
    out.fdAn=(STOCK.fd||[]).filter(function(x){ return !!x.an; }).length;
    var tl=fdLista().filter(function(g){ return g.fab==='MORENO'; })[0].prods.filter(function(p){ return p.k===_K.TL140; })[0];
    out.tl140=tl && tl.falta;
    // la lápida no revive al juntar con una copia vieja
    var viejo=JSON.parse(window._guardado); viejo.fd=(viejo.fd||[]).map(function(x){ var y=Object.assign({}, x); delete y.an; return y; });
    var jj=stockFusionar(null, STOCK, leerStock({ observaciones:JSON.stringify(viejo) }));
    out.lapida=(jj.fd||[]).every(function(x){ return !!x.an; });
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('FD10a «✕ No se pidió» sin nada llegado lo saca de la lista', r.y4===false, r);
  chk('FD10b «✕ No se pidió» con algo llegado lo cierra en lo que llegó (1)', r.y3 && r.y3.r && r.y3.lleg===1, r.y3);
  chk('FD10c «✓ Llegó» lo cierra, sin sumar al depósito (lo trae el Excel) y sin medir la fábrica', r.y5 && r.y5.r && r.y5.lleg===3 && /^xm::se$/.test((r.y5.ids||[])[0]||'') && r.y5.conteo && r.dep===7, [r.y5, r.dep]);
  chk('FD10d «↩️ No llegó» deja la recepción con lápida (nunca se borra) y vuelve a faltar todo', r.y1 && !r.y1.r && r.y1.lleg===0 && r.y1.u===7 && r.y1.lap===1, r.y1);
  chk('FD10e «↩️ No llegó» en el 🏭: vuelve a faltar 1, y la lápida no revive al juntar con una copia vieja', r.fdAn===1 && r.tl140===2 && r.lapida===true, r);

  // ═══ FD11: apagar el 🏭 ═══
  console.log('\n── FD11. Apagar el 🏭 de algo pedido otro día guarda la llegada ──');
  r = await corre(page, async () => {
    var out={}, p=findById('p01'), x=p.productos[0];
    setProdProduccion('p01', 0, 'Moreno'); closeModal();
    x=findById('p01').productos[0];
    out.apagar={ enProd:!!x.enProd, prodEn:x.prodEn, prodF:x.prodF, prodR:x.prodR, rt:Number(x.prodRt)>0, pend:enProduccionPendiente(x) };
    var btn=document.createElement('div'); btn.innerHTML=prodBtnsHtml ? prodBtnsHtml(findById('p01'), x, 0) : ''; out.lit=btn.querySelector('.prodon') ? true : false; out.btnTxt=(btn.textContent||'').replace(/\s+/g,' ');
    // corregir el pedido no pierde la llegada (heredarMarcas)
    var nuevos=heredarMarcas([{ codigo:x.codigo, desc:x.desc, medida:x.medida, cant:x.cant }], [x]); out.hereda={ prodF:nuevos[0].prodF, prodR:nuevos[0].prodR, rt:Number(nuevos[0].prodRt)>0 };
    // tocarlo de nuevo HOY lo deshace (vuelve a «pedido»)
    setProdProduccion('p01', 0, 'Moreno'); closeModal(); x=findById('p01').productos[0];
    out.deshace={ prodF:x.prodF, prodR:x.prodR||'', pend:enProduccionPendiente(x) };
    // marcado y desmarcado el MISMO día (un error): se va todo, como siempre
    STATE.push(_ped('p02', '2026-11-05', 'AM', [ _lin('CH1201|TITANIO ICE|160x190', 1) ])); stockOlvidarIndice();
    setProdProduccion('p02', 0, 'Moreno'); setProdProduccion('p02', 0, 'Moreno'); closeModal();
    var y=findById('p02').productos[0]; out.mismoDia={ enProd:!!y.enProd, prodF:y.prodF||'', prodR:y.prodR||'' };
    out.guardado=(window._SRV.pedidos.filter(function(q){ return q.id==='p01'; })[0]||{}).productos;
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('FD11a apagar el 🏭 de lo pedido el 21/10 guarda la llegada: queda `prodF` (21/10) y se pone `prodR` (hoy) con la hora', r.apagar && r.apagar.prodF==='2026-10-21' && r.apagar.prodR==='2026-10-29' && r.apagar.rt && !r.apagar.pend && r.apagar.enProd, r.apagar);
  chk('FD11b …y el botón se ve apagado, con «✓» de que llegó', r.lit===false && /🏭 MORENO ✓/.test(r.btnTxt||''), r.btnTxt);
  chk('FD11c corregir el pedido no pierde la llegada (heredarMarcas)', r.hereda && r.hereda.prodF==='2026-10-21' && r.hereda.prodR==='2026-10-29' && r.hereda.rt, r.hereda);
  chk('FD11d tocarlo de nuevo el mismo día lo deshace: vuelve a «pedido el 21/10»', r.deshace && r.deshace.prodF==='2026-10-21' && !r.deshace.prodR && r.deshace.pend, r.deshace);
  chk('FD11e marcado y desmarcado el mismo día (un error): se va todo, como siempre', r.mismoDia && !r.mismoDia.enProd && !r.mismoDia.prodF && !r.mismoDia.prodR, r.mismoDia);

  // ═══ FD12: la celda ═══
  console.log('\n── FD12. La celda del stock no crece sin tope ──');
  r = await corre(page, async () => {
    var out={}, hoy=todayStr();
    var S=leerStock({ observaciones:window._guardado });
    var base=(S.p||[]).length;
    for(var i=0;i<70;i++){ var f=stockSumarDias(hoy, -(i*1)); S.p.push({ id:'yy'+i, k:'PRODUCTO '+i+'|140X190', u:3, f:f, esp:stockSumarDias(f,4), r:'', ya:1, fab:'MORENO' }); }
    S.p.push({ id:'viejo', k:'PRODUCTO X|140X190', u:3, f:stockSumarDias(hoy,-61), esp:stockSumarDias(hoy,-57), r:'', ya:1, fab:'MORENO' });
    S.p.push({ id:'diez', k:'PRODUCTO Z|140X190', u:3, f:stockSumarDias(hoy,-20), esp:stockSumarDias(hoy,-16), r:'', ya:1, fab:'MORENO' });   // vencido hace 16 días
    S.fd=(S.fd||[]); for(var j=0;j<130;j++) S.fd.push({ id:'xf:t'+j, l:'lt'+j, u:1, f:stockSumarDias(hoy, -(j%50)) });
    S.fd.push({ id:'xf:viejo', l:'lv', u:1, f:stockSumarDias(hoy,-61) });
    stockPodar(S, hoy);
    var ab=(S.p||[]).filter(function(q){ return q.ya && !q.r; });
    out.abiertos=ab.length; out.viejo=ab.some(function(q){ return q.id==='viejo'; }); out.mas=ab.map(function(q){ return q.f; }).sort()[0];
    out.fd=(S.fd||[]).length; out.fdViejo=(S.fd||[]).some(function(x){ return x.id==='xf:viejo'; });
    // con pocos, el vencido hace 16 días se queda (antes se iba a los 7 días de su llegada esperada)
    var S2=leerStock({ observaciones:window._guardado }); S2.p.push({ id:'diez', k:'PRODUCTO Z|140X190', u:3, f:stockSumarDias(hoy,-20), esp:stockSumarDias(hoy,-16), r:'', ya:1, fab:'MORENO' });
    stockPodar(S2, hoy); out.diez=S2.p.some(function(q){ return q.id==='diez'; });
    // y lo que vuelve por una junta sin base sale podado otra vez
    var J=stockFusionar(null, S, S2); out.junta=(J.p||[]).filter(function(q){ return q.ya && !q.r; }).length; out.juntaFd=(J.fd||[]).length;
    // lo vencido hace días no guarda lo que solo servía para contarlo en camino (`arr`, `t`)
    var v=(S.p||[]).filter(function(q){ return q.id==='diez'; })[0]||(S2.p||[]).filter(function(q){ return q.id==='diez'; })[0];
    out.compacto=v ? (v.arr==null && v.t==null) : null;
    out.max=STOCK_DEBE_MAX; out.fdMax=STOCK_DEBE_FD_MAX; out.dias=STOCK_DEBE_TOPE_DIAS;
    STOCK=S; var fila=filaStock(); out.largo=fila.observaciones.length;
    return out;
  });
  if(r.__error) console.log(r.__error);
  chk('FD12a lo pedido que no llegó se guarda hasta 60 días y como mucho STOCK_DEBE_MAX (40, los más nuevos)', r.dias===60 && r.max===40 && r.abiertos===r.max && !r.viejo, r);
  chk('FD12b un «Ya pedí» vencido hace 16 días ya no se poda (antes, a los 7), y queda más corto (sin `arr` ni `t`)', r.diez===true && r.compacto===true, r);
  chk('FD12c lo de los 🏭 (`fd`): como mucho STOCK_DEBE_FD_MAX renglones (40) y nada de más de 60 días', r.fdMax===40 && r.fd===r.fdMax && !r.fdViejo, r);
  chk('FD12d una junta sin base no lo hace crecer', r.junta<=r.max && r.juntaFd<=r.fdMax, r);
  chk('FD12e la celda queda lejos de las 50.000 letras (con lo abierto y los 🏭 al tope)', r.largo<30000, r.largo);
  await page.context().close();

  // ═══ FD13: el reparto de lo detectado ═══
  console.log('\n── FD13. La entrada de un «Ya pedí» vencido no se le asigna al que sigue en camino ──');
  page = await abrir(browser, RELOJ);
  r = await corre(page, async () => {
    var K=_k('CH1221','TITANIO ICE','180x190');
    var st=_stock(function(s){
      s.p=[ _ya('v1', K, 5, '2026-10-16', '2026-10-21', { fab:'MORENO' }), _ya('w1', K, 5, '2026-10-28', '2026-11-02', { fab:'MORENO' }) ];
      s.det=[ { id:'d:t1', k:K, t:5, u:5, f:'2026-10-29', hora:'10:05:32', hu:'h' } ];
    }, { f:'2026-10-29' });
    await _cargar([], st);
    var rep=stockDetectadoReparto(K), o=_fila(K);
    return { n:rep.n, por:rep.por, enCamino:o.enCamino, seguro:stockEnCaminoSeguro(o) };
  });
  if(r.__error) console.log(r.__error);
  chk('FD13 la detección (5) es la llegada del vencido del 16/10: el del 28/10 sigue en camino entero (antes quedaba «ya llegó»)', r.por && r.por.v1===5 && !r.por.w1 && r.n===0 && r.seguro===5, r);
  await page.context().close();

  const errs=[];
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
