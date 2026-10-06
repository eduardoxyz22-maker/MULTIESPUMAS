/* 📅 EL CONTROL DEL CORTE, SEGUNDA PARTE (§4hs, 06/10/2026). El dueño, después de la auditoría del 06/10 (§4hq):
   «arreglemos lo que hay que arreglar del control de corte. Que no permita subir corte de días anteriores, tiene que ser
   del día. La hoja de Excel sí marca día y hora… ¿no habíamos quedado que las celdas de corte solo almacenaban X días y lo
   anterior se iba borrando para no llenarse? ¿De qué me sirve un stock de hace dos semanas? Si cada día te subo la lista
   actualizada».
     1  Solo el Excel del día: «existencias al» y cuándo se sacó (pie o nombre) tienen que ser de HOY; sin fecha, no entra.
        La hora sale del PIE primero (el mismo archivo con dos nombres da el mismo corte).
     2  Un corte no vuelve atrás: uno más viejo del mismo día no entra (sin «usarlo igual»); sin hora de un lado, la hora de
        subida del vigente decide si se puede saber.
     3  La celda guarda STOCK_CONTROL_DIAS días del control (detecciones, salidas, historial y sus diferencias, pedidos
        recibidos enteros), siempre el último corte de cada almacén, y sale marcada (`pv`) y con el historial sin `id`.
     4  Nombres cortos: detección, recepción y salida son huellas de ~15 letras, sin la evidencia repetida.
     5  Una página vieja (sin `pv`) que vuelve atrás un corte o borra el control: la lectura junta en vez de adoptar,
        y lo vuelve a guardar. Una copia vieja que no rompe nada se adopta como siempre.
     6  B2: la detección de ayer y la de hoy no ofrecen el mismo pedido dos veces, y dos tildes no lo pasan de lo pedido.
     7  B3: la recogida cerrada desde el control no se le resta otra vez a Moreno si su Excel ya es de ese momento.
     8  B5d: la ventana entre dos cortes del mismo día mira las dos puntas.
     9  B6: el Excel corregido compara contra lo que dijo la versión anterior (de más Y de menos) y anula sus salidas.
     10 B8: 🔗 Unir lleva también lo que anotó el control (detecciones, salidas, diferencias).
   La revisión independiente del mismo 06/10 (§4hs «Revisión»):
     11 Después del F5: la memoria de la pestaña que dejó la página vieja (sin `pv`) no se carga, y la fila del stock que
        quedó en la cola sale SIN sello, choca y se junta (queda el corte de hoy).
     12 La protección al leer no se apaga después de adoptar una copia vieja inocente.
     13 El mismo Excel subido dos veces conserva sus diferencias: el corregido compara contra lo que dijo la primera.
     14 El mismo archivo ya subido con la hora del NOMBRE (página de antes) no es «más viejo».
     15 Con un conteo a mano más nuevo, el Excel de la mañana no entra y lo dice con esas palabras.
     (7c-7d) Moreno sacado minutos antes que el de acá la misma mañana ya tenía la recogida descontada.
   Reloj clavado en el miércoles 07/10/2026 a las 15:00 de Bolivia. Red cortada, servidor simulado, datos sintéticos.
   Se corre:  node tests/test_corte_del_dia.js
   Dientes contra la página publicada:  PEDIDOS=/ruta/a/la/publicada.html node tests/test_corte_del_dia.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);
const RELOJ = '2026-10-07T15:00:00-04:00';

/* ── Un .xlsx de verdad, armado acá (ZIP sin comprimir: la página lee ese método), con la forma del reporte de Moreno:
      comillas simples, la cantidad sin encabezado (AY) y el pie «Fecha : dd/mm/aaaa hh:mm:ss - usuario». ── */
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
function reporte({ al, pie, alm='01-05-003  PRODUCTOS TERMINADOS FAB.', items=[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',13],['CH1129','COLCHON TITANIO LATEX 140X190',4]] }){
  const celda=(ref,v)=> typeof v==='number' ? `<c r='${ref}' s='11'><v>${v}</v></c>` : `<c r='${ref}' t='inlineStr' s='11'><is><t>${esc(v)}</t></is></c>`;
  const fila=(n,cs)=>`<row r="${n}">${cs.map(([c,v])=>celda(c+n,v)).join('')}</row>`;
  const filas=[ fila(2,[['C','MORENO']]),
    fila(3, al ? [['X','EXISTENCIAS ALMACEN  AL '],['AR',al],['AZ','(Productos con existencia <> 0)']] : [['X','EXISTENCIAS ALMACEN'],['AZ','(Productos con existencia <> 0)']]),
    fila(7,[['F','Almacén Inicial :'],['P',alm],['AK','Almacén Final :'],['AX',alm]]),
    fila(9,[['BA','Cantidad']]), fila(10,[['G','Código Producto'],['W','Nombre Producto'],['BD','Unidad']]) ];
  items.forEach((it,i)=>filas.push(fila(11+i,[['G',it[0]],['W',it[1]],['AY',it[2]],['BD','UND']])));
  if(pie) filas.push(fila(11+items.length+1,[['AF','Fecha : '+pie+' - logistica']]));
  const hoja='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+filas.join('')+'</sheetData></worksheet>';
  return zip([ { name:'[Content_Types].xml', data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>' },
               { name:'xl/workbook.xml', data:'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Hoja1" sheetId="1"/></sheets></workbook>' },
               { name:'xl/worksheets/sheet1.xml', data:hoja } ]);
}

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); localStorage.setItem('me_cierre_quien','Marisol'); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._guardadas=[];
  apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._ts=function(f,h){ return new Date(f+'T'+(h||'12:00:00')+'-04:00').getTime(); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'10-001',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  window.H=function(n,extra){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n,chk:'ok'},extra||{})]; };
  window.LOG='PRODUCTOS TERMINADOS FAB.', window.IM='IM - PRODUCTOTERMINADO';
  window._R=function(fecha, hora, cants, extra){
    var items=[]; var tot=0;
    Object.keys(cants).forEach(function(k){ var it=k===K?{cod:'CH1201',desc:'TITANIO ICE 2.5PLZ 160X190CM',medida:'160x190'}:{cod:'CH1129',desc:'COLCHON TITANIO LATEX 140X190',medida:'140x190'}; it.cant=cants[k]; it.cat=true; it.k=k; it.unidad='UND'; items.push(it); tot+=cants[k]; });
    return Object.assign({ fecha:fecha, sinFecha:false, almacen:LOG, items:items, total:tot, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{CH1201:K, CH1129:K2}, esLog:true, conocido:true, hora:hora||'' }, extra||{});
  };
  /* Un stock con corte de ayer a las 9:00: 10 de K y 4 de K2 acá, 20 de K en Moreno. */
  window._base=function(){
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-86400000 }; STOCK.c.u[K]=10; STOCK.c.u[K2]=4;
    STOCK.g={}; STOCK.g[IM]={ f:_atras(1), hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000 }; STOCK.g[IM].u[K]=20;
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[IM]='otro';
    STOCK.p=[]; STATE=[]; stockOlvidarIndice();
  };
  window._subir=function(R, tildar){
    EXIST_IMP=R; EXIST_CTRL_TODAS=true; renderImportExist();
    (tildar||[]).forEach(function(sel){ Array.from(document.querySelectorAll(sel)).forEach(function(el){ el.checked=true; }); });
    return _modalTxt();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  /* Sin nada propio en vuelo ni en la cola: la lectura adopta (o junta) como al abrir la página. */
  window._limpiarVuelo=function(){ try{ localStorage.removeItem(LS_PEND); }catch(e){} SAVE_ULTIMO={}; Object.keys(SAVE_EN_VUELO).forEach(function(k){ delete SAVE_EN_VUELO[k]; }); Object.keys(SAVE_EN_ESPERA).forEach(function(k){ delete SAVE_EN_ESPERA[k]; }); };
  window._modalTxt=function(){ return ((document.getElementById('modal-box')||{}).textContent||'').replace(/\\s+/g,' '); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate((b)=>{ eval(b); _base(); }, BASE);
    return page;
  };
  const seccion = async (nombre, fn) => {
    const page = await nueva();
    try{ await fn(page); }catch(e){ chk(nombre+' · la sección se cayó: '+String(e&&e.message||e).slice(0,200), false); }
    await page.close();
  };
  /* Sube un archivo por el botón de verdad (onExistArchivo) y devuelve lo que leyó la página y lo que muestra. */
  const subirArchivo = async (page, name, buffer) => {
    await page.evaluate(()=>{ EXIST_IMP=null; try{ closeModal(); }catch(e){} });
    await page.setInputFiles('#exist-input', { name, mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
    await page.waitForFunction(()=>!!EXIST_IMP || /no es de hoy|❌/.test((document.getElementById('modal-box')||{}).textContent||'') || (window._toasts||[]).some(function(t){ return /❌/.test(t); }), null, { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(150);
    return page.evaluate(()=>{
      var R=EXIST_IMP, b=document.getElementById('exist-usar');
      return { R: R ? { fecha:R.fecha, hora:R.hora, horaDe:R.horaDe, sacado:R.sacado||'', sinFecha:!!R.sinFecha, fechaDeHora:!!R.fechaDeHora, corte:existCorteId(R) } : null,
               txt:((document.getElementById('modal-box')||{}).textContent||'').replace(/\s+/g,' '), boton: b ? { hay:true, apagado:!!b.disabled } : { hay:false },
               noHoy:!!document.getElementById('exist-no-hoy'), toast:(window._toasts||[]).slice(-1)[0]||'' };
    });
  };

  // ═══ 1 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 1. Solo el Excel del día; la hora sale del pie (el mismo archivo con dos nombres = el mismo corte) ──');
  await seccion('1', async (page) => {
    const ayer = await subirArchivo(page, 'Excel_06102026_09_00_05_almacen_octubre.xlsx', reporte({ al:'06/10/2026', pie:'06/10/2026 09:00:01' }));
    const tras = await page.evaluate(()=>{ var a=JSON.stringify(STOCK.c); if(EXIST_IMP){ confirmarImportExist(); } return { igual:JSON.stringify(STOCK.c)===a, toast:(window._toasts||[]).slice(-1)[0]||'' }; });
    chk('1a · el Excel de AYER no entra: «no es de hoy», dice de qué día es y cuál se puede subir, sin botón para usarlo',
        ayer.noHoy && /de ayer, martes 06\/10/.test(ayer.txt) && /Solo se puede subir el de HOY, miércoles 07\/10/.test(ayer.txt) && ayer.boton.hay===false, J([ayer.txt.slice(0,300), ayer.boton]));
    chk('1a · …y si igual se confirma (una pestaña con la vista previa de antes), no toca el stock y lo dice', tras.igual===true && /Solo se puede subir el de HOY/.test(tras.toast), J(tras));
    const wa = await subirArchivo(page, 'DOC-20261007-WA0007.xlsx', reporte({ al:'07/10/2026', pie:'07/10/2026 08:50:12' }));
    const orig = await subirArchivo(page, 'Excel_07102026_08_50_15_almacen_octubre.xlsx', reporte({ al:'07/10/2026', pie:'07/10/2026 08:50:12' }));
    chk('1b · el de HOY entra: vista previa normal, botón encendido, la hora del PIE (08:50:12)',
        !!wa.R && wa.R.fecha==='2026-10-07' && wa.R.hora==='08:50:12' && wa.R.horaDe==='pie' && wa.boton.hay && !wa.boton.apagado && !wa.noHoy, J(wa.R));
    chk('1c · ⚠️ el MISMO archivo con el nombre original (08:50:15) y renombrado por WhatsApp da la MISMA hora y el MISMO corte',
        !!orig.R && orig.R.hora==='08:50:12' && orig.R.corte===wa.R.corte, J([orig.R, wa.R && wa.R.corte]));
    const sinPie = await subirArchivo(page, 'Excel_07102026_09_10_00_almacen_octubre.xlsx', reporte({ al:'07/10/2026', pie:'' }));
    chk('1d · sin pie, la hora sale del nombre (09:10:00)', !!sinPie.R && sinPie.R.hora==='09:10:00' && sinPie.R.horaDe==='nombre', J(sinPie.R));
    const sinAl = await subirArchivo(page, 'reporte.xlsx', reporte({ al:'', pie:'07/10/2026 08:30:00' }));
    chk('1e · sin «existencias al» pero con el pie de hoy: entra, con el día del pie, y lo dice', !!sinAl.R && sinAl.R.fecha==='2026-10-07' && sinAl.R.fechaDeHora && /se usa el día en que se sacó/.test(sinAl.txt) && sinAl.boton.hay, J(sinAl.R));
    const nada = await subirArchivo(page, 'reporte.xlsx', reporte({ al:'', pie:'' }));
    chk('1f · sin ninguna fecha (ni «existencias al», ni pie, ni nombre): no entra, «no dice de qué día es»', nada.noHoy && /no dice de qué día es/.test(nada.txt) && !nada.boton.hay, J(nada.txt.slice(0,200)));
    const sacadoAyer = await subirArchivo(page, 'reporte.xlsx', reporte({ al:'07/10/2026', pie:'06/10/2026 18:30:00' }));
    chk('1g · «existencias al» de hoy pero sacado AYER: tampoco («se sacó ayer»)', sacadoAyer.noHoy && /se sacó ayer, martes 06\/10/.test(sacadoAyer.txt), J(sacadoAyer.txt.slice(0,240)));
    const otroAlm = await subirArchivo(page, 'Excel_05102026_10_00_00_BANZER.xlsx', reporte({ al:'05/10/2026', pie:'05/10/2026 10:00:00', alm:'01-05-025  Almacen Distribucion Banzer' }));
    chk('1h · también para Banzer y Moreno: el del lunes no entra', otroAlm.noHoy && /del lunes 05\/10/.test(otroAlm.txt), J(otroAlm.txt.slice(0,200)));
  });

  // ═══ 2 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 2. Un corte no vuelve atrás: el más viejo del mismo día no entra; sin hora, decide la hora de subida ──');
  await seccion('2', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      /* vigente: hoy 16:00 → uno de hoy 09:00 no entra */
      STOCK.c={ f:todayStr(), hora:'16:00:00', inc:true, u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'16:05:00') }; STOCK.c.u[K]=5; STOCK.c.u[K2]=4;
      var txt=_subir(_R(todayStr(),'09:00:00',{[K]:7,[K2]:4})); var b=document.getElementById('exist-usar');
      out.viejo={ dice:/más viejo que el que ya está cargado/.test(txt), apagado:!!(b&&b.disabled), casilla:!!document.getElementById('exist-corte-viejo-ok') };
      await confirmarImportExist(); out.viejo.c=STOCK.c.hora==='16:00:00' && STOCK.c.u[K]===5; out.viejo.toast=window._toasts.slice(-1)[0]||'';
      /* vigente: hoy SIN hora, subido a las 08:00 → uno de hoy 09:00 sí (el vigente se contó antes de las 08:00) */
      _base(); STOCK.c={ f:todayStr(), hora:'', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'08:00:00') }; STOCK.c.u[K]=10; STOCK.c.u[K2]=4;
      var C1=stockConciliar(_R(todayStr(),'09:00:00',{[K]:10,[K2]:4}),'log',false); out.subidoAntes={ viejo:!!C1.corteViejo, ambiguo:!!C1.ambiguo };
      /* …pero subido a las 09:30: no se sabe cuál se contó antes → no entra, con el motivo */
      STOCK.c.t=_ts(todayStr(),'09:30:00');
      var C2=stockConciliar(_R(todayStr(),'09:00:00',{[K]:10,[K2]:4}),'log',false); txt=_subir(_R(todayStr(),'09:00:00',{[K]:10,[K2]:4}));
      out.subidoDespues={ viejo:!!C2.corteViejo, ambiguo:!!C2.ambiguo, dice:/falta la hora/.test(txt), apagado:!!(document.getElementById('exist-usar')||{}).disabled };
      /* y el que no trae hora contra un vigente con hora, el mismo día: tampoco */
      _base(); STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'09:05:00') }; STOCK.c.u[K]=10; STOCK.c.u[K2]=4;
      var C3=stockConciliar(_R(todayStr(),'',{[K]:10,[K2]:4}),'log',false); out.sinHora={ viejo:!!C3.corteViejo, ambiguo:!!C3.ambiguo };
      /* un Banzer más viejo que el suyo, igual */
      STOCK.g['Banzer']={ f:todayStr(), hora:'10:00:00', u:{}, solo0:true, t:_ts(todayStr(),'10:02:00') }; STOCK.g['Banzer'].u[K]=3;
      var RB=_R(todayStr(),'08:00:00',{[K]:9}); RB.almacen='Banzer'; RB.esLog=false;
      out.banzer=!!stockConciliar(RB,'sale',false).corteViejo;
      return out;
    });
    chk('2a · hoy 09:00 después de hoy 16:00: lo dice, apaga el botón, no hay «usarlo igual» y confirmar no reemplaza', r.viejo.dice && r.viejo.apagado && !r.viejo.casilla && r.viejo.c && /más viejo/.test(r.viejo.toast), J(r.viejo));
    chk('2b · vigente sin hora subido a las 08:00 y uno de las 09:00: entra (se sabe que es más nuevo)', !r.subidoAntes.viejo && !r.subidoAntes.ambiguo, J(r.subidoAntes));
    chk('2c · vigente sin hora subido a las 09:30 y uno de las 09:00: no se sabe → no entra, dice «falta la hora»', r.subidoDespues.viejo && r.subidoDespues.ambiguo && r.subidoDespues.dice && r.subidoDespues.apagado, J(r.subidoDespues));
    chk('2d · uno SIN hora contra un vigente de hoy con hora: no entra (ambiguo)', r.sinHora.viejo && r.sinHora.ambiguo, J(r.sinHora));
    chk('2e · Banzer: uno más viejo que el suyo tampoco', r.banzer===true);
  });

  // ═══ 3 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3. La celda guarda STOCK_CONTROL_DIAS días del control, el último corte de cada almacén, y sale marcada ──');
  await seccion('3', async (page) => {
    const r = await page.evaluate(() => {
      var out={ dias:STOCK_CONTROL_DIAS };
      var hoy=todayStr(), d=function(n){ return _atras(n); };
      STOCK.c={ f:hoy, hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(hoy,'09:05:00') }; STOCK.c.u[K]=10;
      STOCK.det=[ { id:'d:viejo', k:K, t:3, u:3, f:d(5), hora:'09:00:00', hu:'a' }, { id:'d:nuevo', k:K, t:2, u:2, f:d(1), hora:'09:00:00', hu:'b' } ];
      STOCK.sm=[ { id:'s:viejo', k:K, u:1, f:d(5), ts:_ts(d(5),'10:00:00'), m:'x', pre:1 },
                 { id:'m:mano-vieja', k:K, u:2, f:d(5), ts:_ts(d(5),'10:00:00'), m:'Multicenter', pre:0 },
                 { id:'m:mano-hoy', k:K, u:4, f:hoy, ts:_ts(hoy,'11:00:00'), m:'Multicenter', pre:0 } ];
      var hd=function(conAccion){ return [[K, 2, conAccion?[['cerro','fpX',2,'x:abc']]:[]], [K2, -1, []]]; };
      STOCK.h=[ { id:LOG+'|'+hoy+'|09:00:00', f:hoy, hora:'09:00:00', alm:LOG, rol:'log', n:2, u:14, ts:_ts(hoy,'09:05:00'), hu:'h0', d:hd(false) },
                { id:LOG+'|'+d(1)+'|09:00:00', f:d(1), hora:'09:00:00', alm:LOG, rol:'log', n:2, u:12, ts:_ts(d(1),'09:05:00'), hu:'h1', d:hd(true) },
                { id:LOG+'|'+d(2)+'|09:00:00', f:d(2), hora:'09:00:00', alm:LOG, rol:'log', n:2, u:12, ts:_ts(d(2),'09:05:00'), hu:'h2', d:hd(false) },
                { id:LOG+'|'+d(5)+'|09:00:00', f:d(5), hora:'09:00:00', alm:LOG, rol:'log', n:2, u:11, ts:_ts(d(5),'09:05:00'), hu:'h5', d:hd(true) },
                { id:IM+'|'+d(6)+'|09:00:00', f:d(6), hora:'09:00:00', alm:IM, rol:'otro', n:1, u:20, ts:_ts(d(6),'09:05:00'), hu:'i6', d:hd(true) } ];
      STOCK.p=[ { id:'fpViejo', k:K2, u:5, fab:'MORENO', f:d(9), r:d(5), total:5, ru:5, recs:[{ id:'x:v', u:5, f:d(5), ts:_ts(d(5),'09:10:00'), se:1, ev:{ c:[d(5),'09:00:00','h5'], d:'d:v' } }], enConteo:true },
                { id:'fpNuevo', k:K, u:2, fab:'MORENO', f:d(4), r:d(1), total:2, ru:2, recs:[{ id:'x:n', u:2, f:d(1), ts:_ts(d(1),'09:10:00'), se:1, ev:{ c:[d(1),'09:00:00','h1'], d:'d:n' } }], enConteo:true },
                { id:'fpPend', k:K, u:3, fab:'MORENO', f:d(20), r:'' } ];
      var fila=filaStock(), o=JSON.parse(fila.observaciones);
      var mira=function(S){ return { det:(S.det||[]).map(function(x){ return x.id; }), sm:(S.sm||[]).map(function(x){ return x.id; }),
        h:(S.h||[]).map(function(x){ return x.f.slice(5)+' '+(x.alm===IM?'IM':'PTF')+(x.d?(':'+x.d.length):''); }),
        p:(S.p||[]).map(function(q){ return q.id+(q.recs?'+recs':''); }) }; };
      out.guardada=mira(o); out.pv=o.pv; out.hSinId=(o.h||[]).every(function(x){ return x.id==null; });
      var L=leerStock({ observaciones:fila.observaciones }); out.leida=mira(L); out.idDeVuelta=(L.h||[]).every(function(x){ return !!x.id; });
      /* una copia de antes (con todo) juntada con la de ahora: lo podado no vuelve */
      var vieja=JSON.parse(JSON.stringify(o)); vieja.det=STOCK.det.concat([{ id:'d:viejo', k:K, t:3, u:3, f:d(5), hora:'09:00:00', hu:'a' }]);
      var Jx=stockFusionar(null, L, leerStock({ observaciones:JSON.stringify(vieja) })); out.junta=mira(Jx);
      out.largo=fila.observaciones.length;
      return out;
    });
    chk('3a · son 3 días («X días» del dueño)', r.dias===3, r.dias);
    chk('3b · detecciones: se va la de hace 5 días, queda la de ayer', J(r.guardada.det)===J(['d:nuevo']), J(r.guardada.det));
    chk('3c · salidas: se va la del control de hace 5 días y la anotada a mano ya adentro de un Excel; queda la de hoy (todavía baja el depósito)', J(r.guardada.sm)===J(['m:mano-hoy']), J(r.guardada.sm));
    chk('3d · historial: los cortes de los últimos 3 días + el último de Moreno (aunque sea viejo, sin diferencias); el de hoy con todas sus diferencias, los de antes solo con lo que tiene «↩️»',
        J(r.guardada.h)===J(['10-07 PTF:2','10-06 PTF:1','10-05 PTF','10-01 IM']), J(r.guardada.h));
    chk('3e · pedidos a fábrica: el recibido hace 5 días queda como muestra (sin recepciones), el de ayer entero, el pendiente siempre', J(r.guardada.p)===J(['fpViejo','fpNuevo+recs','fpPend']), J(r.guardada.p));
    chk('3f · la fila sale marcada «página al día» (pv 3) y el historial sin id; al leerla, el id vuelve', r.pv===3 && r.hSinId && r.idDeVuelta, J([r.pv, r.hSinId, r.idDeVuelta]));
    chk('3g · leer y juntar con una copia que traía lo viejo da lo mismo: lo podado no vuelve', J(r.leida)===J(r.guardada) && J(r.junta.det)===J(['d:nuevo']), J([r.leida, r.junta]));
  });

  // ═══ 4 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Nombres cortos: detección, recepción y salida ocupan ~15 letras, sin la evidencia repetida ──');
  await seccion('4', async (page) => {
    const r = await page.evaluate(async () => {
      STOCK.p=[{ id:'fp1', k:K, u:10, fab:'MORENO', f:_atras(2), esp:'', r:'' }];
      var R=_R(todayStr(),'09:00:00',{[K]:20,[K2]:1});   // +10 de K (sugiere fp1), −3 de K2 (salida sin explicar)
      _subir(R, ['.exist-sug[data-q="fp1"]', '.exist-sal']); await confirmarImportExist();
      var q=STOCK.p[0], rec=q.recs[0], det=STOCK.det[0], sal=STOCK.sm[0];
      return { rid:rec.id, did:det.id, sid:sal.id, corte:existCorteId(R), ev:Object.keys(rec.ev).sort(), detK:Object.keys(det).sort(), salK:Object.keys(sal).sort(),
               largoRec:JSON.stringify(rec).length, largoDet:JSON.stringify(det).length, largoSal:JSON.stringify(sal).length,
               prodC:'', idDet:existDetId(existCorteId(R), K)===det.id && existRecId(det.id,'fp1')===rec.id };
    });
    chk('4a · corte, detección, recepción y salida con nombres de huella (c…, d:…, x:…, s:…), de hasta 16 letras', /^c[0-9a-z]{8,15}$/.test(r.corte) && /^d:[0-9a-z]{8,14}$/.test(r.did) && /^x:[0-9a-z]{8,14}$/.test(r.rid) && /^s:[0-9a-z]{8,14}$/.test(r.sid) && r.idDet, J([r.corte, r.did, r.rid, r.sid]));
    chk('4b · la evidencia de la recepción guarda el corte, el corte anterior (`p`, para saber si Moreno ya la tenía restada), la detección y quién (sin `m`; `a` vacío = acá, no se guarda)', J(r.ev)===J(['c','d','p','q']), J(r.ev));
    chk('4c · la detección sin `ts` ni `alm` vacío; la salida sin `alm` vacío y con su corte (`c`)', r.detK.indexOf('ts')<0 && r.detK.indexOf('alm')<0 && r.salK.indexOf('alm')<0 && r.salK.indexOf('c')>=0, J([r.detK, r.salK]));
    chk('4d · cada cosa ocupa poco: recepción < 190 letras, detección < 140, salida < 170 (la auditoría midió ~358 / ~212 / ~213)', r.largoRec<190 && r.largoDet<140 && r.largoSal<170, J([r.largoRec, r.largoDet, r.largoSal]));
  });

  // ═══ 5 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 5. Una página vieja: si vuelve atrás un corte o borra el control, la lectura junta y vuelve a guardar ──');
  await seccion('5', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      /* La planilla, escrita por una página al día: corte de hoy 09:00, una detección, una salida y v2t. */
      STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'09:05:00') }; STOCK.c.u[K]=20; STOCK.c.u[K2]=4;
      STOCK.det=[{ id:'d:hoy', k:K, t:4, u:4, f:todayStr(), hora:'09:00:00', hu:'h' }];
      STOCK.sm=[{ id:'m:hoy', k:K2, u:1, f:todayStr(), ts:_ts(todayStr(),'11:00:00'), m:'Multicenter', pre:0 }];
      STOCK.v=2; STOCK.v2t=_ts(todayStr(),'09:05:00');
      var fila0=filaStock(); fila0.rev=5;
      STOCK=stockVacio(); STOCK_CARGADO=false; _limpiarVuelo();
      leerCierresDeLista([fila0], true);
      out.cargo={ c:STOCK.c.f+' '+STOCK.c.hora, det:STOCK.det.length, pv:STOCK.pv };
      /* Una página VIEJA guarda: volvió a subir el Excel del SÁBADO y no conoce det/sm/v/v2t/pv. */
      var vieja=JSON.parse(fila0.observaciones); delete vieja.det; delete vieja.sm; delete vieja.v; delete vieja.v2t; delete vieja.pv;
      vieja.c={ f:_atras(4), hora:'09:55:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'10:18:00') }; vieja.c.u[K]=50; vieja.c.u[K2]=50;
      var fila1=Object.assign({}, fila0, { observaciones:JSON.stringify(vieja), rev:6 });
      window._guardadas=[]; window._toasts=[]; _limpiarVuelo();
      leerCierresDeLista([fila1], true);
      await new Promise(function(res){ setTimeout(res, 50); });
      var st=window._guardadas.filter(function(g){ return String(g.id)===STOCK_ID; }).slice(-1)[0], so=st?JSON.parse(st.observaciones):null;
      out.junto={ c:STOCK.c.f+' '+STOCK.c.hora, uK:STOCK.c.u[K], det:(STOCK.det||[]).length, sm:(STOCK.sm||[]).length, v2t:STOCK.v2t===_ts(todayStr(),'09:05:00'),
                  aviso:window._toasts.some(function(t){ return /página VIEJA/.test(t); }),
                  guardo: so ? { c:so.c.f+' '+so.c.hora, det:(so.det||[]).length, pv:so.pv } : null };
      /* Otra vez la misma copia (mismo sello): no vuelve a guardar ni a avisar. */
      window._guardadas=[]; window._toasts=[]; _limpiarVuelo();
      leerCierresDeLista([fila1], true); await new Promise(function(res){ setTimeout(res, 50); });
      out.otraVez={ guardo:window._guardadas.length, aviso:window._toasts.length };
      /* Una copia vieja que NO rompe nada (mismo corte, el control ya vacío en la memoria): se adopta como siempre. */
      STOCK=stockVacio(); STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'09:05:00') }; STOCK.c.u[K]=20; STOCK.c.u[K2]=4;
      var filaA=filaStock(); filaA.rev=7; STOCK=stockVacio(); STOCK_CARGADO=false; _limpiarVuelo(); leerCierresDeLista([filaA], true);
      var vieja2=JSON.parse(filaA.observaciones); delete vieja2.pv; vieja2.c.u[K]=19;   // la página vieja anotó una salida a mano
      window._guardadas=[]; window._toasts=[]; _limpiarVuelo();
      leerCierresDeLista([Object.assign({}, filaA, { observaciones:JSON.stringify(vieja2), rev:8 })], true); await new Promise(function(res){ setTimeout(res, 50); });
      out.inocua={ uK:STOCK.c.u[K], guardo:window._guardadas.length, aviso:window._toasts.length };
      /* Y la junta de siempre (un conflicto) tampoco vuelve atrás un corte: base = mío = lunes, la otra = sábado. */
      var lunes={ f:_atras(2), hora:'09:00:00', u:{}, alm:LOG }; lunes.u[K]=8;
      var sab={ f:_atras(4), hora:'09:55:00', u:{}, alm:LOG }; sab.u[K]=50;
      var B=stockVacio(); B.c=lunes; var M=JSON.parse(JSON.stringify(B)); var S=stockVacio(); S.c=sab;
      out.junta=stockFusionar(B, M, S).c.f===_atras(2);
      return out;
    });
    chk('5a · lee la planilla escrita por una página al día (pv 3)', r.cargo.c.indexOf('09:00:00')>0 && r.cargo.det===1 && r.cargo.pv===3, J(r.cargo));
    chk('5b · ⚠️ la página vieja volvió a subir el Excel del sábado y borró el control: la lectura se queda con el corte de HOY y con el control',
        r.junto.c.indexOf('09:00:00')>0 && r.junto.c.indexOf('2026-10-07')===0 && r.junto.uK===20 && r.junto.det===1 && r.junto.sm===1 && r.junto.v2t, J(r.junto));
    chk('5c · …lo vuelve a guardar (marcado pv 3, con el corte de hoy y el control) y avisa que una computadora tiene la página vieja', !!r.junto.guardo && r.junto.guardo.c.indexOf('2026-10-07')===0 && r.junto.guardo.det===1 && r.junto.guardo.pv===3 && r.junto.aviso, J(r.junto));
    chk('5d · la misma copia otra vez no vuelve a guardar ni a avisar', r.otraVez.guardo===0 && r.otraVez.aviso===0, J(r.otraVez));
    chk('5e · una copia de página vieja que no rompe nada se adopta como siempre (sin guardar ni avisar)', r.inocua.uK===19 && r.inocua.guardo===0 && r.inocua.aviso===0, J(r.inocua));
    chk('5f · la junta de un conflicto tampoco vuelve atrás: base y mío del lunes, la otra del sábado → queda el lunes', r.junta===true);
  });

  // ═══ 6 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 6. B2: la detección de ayer y la de hoy no ofrecen dos veces el mismo pedido; dos tildes no pasan de lo pedido ──');
  await seccion('6', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      STOCK.p=[{ id:'P1', k:K, u:5, fab:'MORENO', f:_atras(6), esp:'', r:'' }, { id:'P2', k:K, u:5, fab:'MORENO', f:_atras(3), esp:'', r:'' }];
      /* ayer el Excel trajo +5 que nadie asignó */
      STOCK.det=[{ id:'d:ayer', k:K, t:5, u:5, f:_atras(1), hora:'09:00:00', hu:'zz' }];
      STOCK.c.u[K]=15;                               // el corte vigente (ayer) ya tiene esas 5
      var R=_R(todayStr(),'09:00:00',{[K]:20,[K2]:4});   // hoy +5 más
      _subir(R);
      out.sug=Array.from(document.querySelectorAll('.exist-sug')).map(function(c){ return [c.getAttribute('data-d')==='d:ayer'?'ayer':'hoy', c.getAttribute('data-q'), Number(c.getAttribute('data-u'))]; });
      /* alguien fuerza las dos contra P1 (una pestaña con la vista previa de antes): no pasa de 5 */
      Array.from(document.querySelectorAll('.exist-sug')).forEach(function(c){ c.setAttribute('data-q','P1'); c.checked=true; });
      await confirmarImportExist();
      var p1=STOCK.p.filter(function(q){ return q.id==='P1'; })[0];
      out.p1={ ru:p1.ru, r:p1.r, recs:(p1.recs||[]).length };
      return out;
    });
    chk('6a · la de ayer ofrece P1 (el más viejo) y la de hoy P2: ningún pedido se ofrece dos veces', J(r.sug)===J([['ayer','P1',5],['hoy','P2',5]]), J(r.sug));
    chk('6b · ⚠️ dos tildes contra el mismo pedido de 5 lo cierran con 5, no con 10', r.p1.ru===5 && r.p1.recs===1 && !!r.p1.r, J(r.p1));
  });

  // ═══ 7 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 7. B3: la recogida cerrada desde el control no se le resta otra vez a Moreno si su Excel ya es de ese momento ──');
  await seccion('7', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      var armar=function(imF, imH){
        _base(); STOCK.p=[{ id:'rc1', k:K, u:5, tipo:'recogida', de:IM, fab:'', f:_atras(1), esp:todayStr(), r:'' }];
        STOCK.g[IM]={ f:imF, hora:imH, u:{}, solo0:true, t:_ts(todayStr(),'09:58:00'), rs:{} }; STOCK.g[IM].u[K]=15;   // el Excel de Moreno, subido primero
        var R=_R(todayStr(),'09:55:00',{[K]:15,[K2]:4});   // acá +5: llegó la recogida
        _subir(R, ['.exist-sug[data-q="rc1"]']);
        return confirmarImportExist().then(function(){ return { im:STOCK.g[IM].u[K], rs:Object.keys(STOCK.g[IM].rs||{}).map(function(k){ var x=STOCK.g[IM].rs[k]; return [x.u, !!x.nr]; }), cerrada:!!STOCK.p[0].r }; });
      };
      out.mismoMomento=await armar(todayStr(),'09:55:00');
      out.imViejo=await armar(_atras(1),'09:00:00');
      out.im5minAntes=await armar(todayStr(),'09:50:00');          // (revisión) Moreno sacado 5 minutos ANTES que el de acá
      /* (revisión) El de acá es el de la TARDE (16:00) y el corte anterior de acá es de esta mañana (09:00): la recogida pasó en el día;
         el Excel de Moreno de esta mañana (09:00) todavía la tenía → se le resta. */
      _base(); STOCK.c.f=todayStr(); STOCK.c.hora='09:00:00';
      STOCK.p=[{ id:'rc1', k:K, u:5, tipo:'recogida', de:IM, fab:'', f:todayStr(), esp:todayStr(), r:'' }];
      STOCK.g[IM]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, t:_ts(todayStr(),'09:10:00'), rs:{} }; STOCK.g[IM].u[K]=20;
      _subir(_R(todayStr(),'16:00:00',{[K]:15,[K2]:4}), ['.exist-sug[data-q="rc1"]']); await confirmarImportExist();
      out.tarde={ im:STOCK.g[IM].u[K], cerrada:!!STOCK.p[0].r };
      return out;
    });
    chk('7a · el Excel de Moreno es de HOY a la misma hora (ya sin las 5): Moreno queda en 15, la marca dice «ya estaba» (0 unidades)', r.mismoMomento.cerrada && r.mismoMomento.im===15 && J(r.mismoMomento.rs)===J([[0,true]]), J(r.mismoMomento));
    chk('7b · el de Moreno es de AYER (todavía con las 5): se le restan, 10', r.imViejo.cerrada && r.imViejo.im===10 && J(r.imViejo.rs)===J([[5,false]]), J(r.imViejo));
    chk('7c · (revisión) el de Moreno sacado 5 minutos ANTES que el de acá, la misma mañana: ya la tenía, queda en 15', r.im5minAntes.cerrada && r.im5minAntes.im===15, J(r.im5minAntes));
    chk('7d · (revisión) el de acá es el de la tarde y el de Moreno el de esta mañana: la recogida pasó en el día, se le resta (20 → 15)', r.tarde.cerrada && r.tarde.im===15, J(r.tarde));
  });

  // ═══ 8 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 8. B5d: entre dos cortes del mismo día, la ventana mira las dos puntas ──');
  await seccion('8', async (page) => {
    const r = await page.evaluate(() => {
      var hoy=todayStr(), v=stockVentanaCorte({ f:hoy, hora:'09:00:00' }, { fecha:hoy, hora:'16:00:00' }, true);
      return { antes:stockMovEnVentana(hoy, _ts(hoy,'08:30:00'), v), medio:stockMovEnVentana(hoy, _ts(hoy,'12:00:00'), v), despues:stockMovEnVentana(hoy, _ts(hoy,'16:20:00'), v) };
    });
    chk('8 · cortes 09:00 y 16:00 de hoy: una salida de las 08:30 no entra, la de las 12:00 sí, la de las 16:20 NO (antes entraba)', r.antes===false && r.medio===true && r.despues===false, J(r));
  });

  // ═══ 9 ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 9. B6: el Excel corregido compara contra lo que dijo la versión anterior y anula sus salidas ──');
  await seccion('9', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      var R1=_R(todayStr(),'09:00:00',{[K]:6,[K2]:4});   // v1: 10 → 6, −4
      _subir(R1, ['.exist-sal']); await confirmarImportExist();
      out.v1=(STOCK.sm||[]).map(function(s){ return [s.u, !!s.an]; });
      var R2=_R(todayStr(),'09:00:00',{[K]:7,[K2]:4});   // corregido: eran 7 (−3)
      var C=stockConciliar(R2,'log',false), f=C.filas.filter(function(x){ return x.k===K; })[0]||{};
      out.v2={ mismo:!!C.mismoCorte, dif:f.dif, tipo:f.tipo, sinExplicar:f.sinExplicar, sug:(f.sug||[]).length };
      _subir(R2, ['.exist-sal']); await confirmarImportExist();
      out.despues=(STOCK.sm||[]).map(function(s){ return [s.u, !!s.an]; });
      out.depo=_fila(K).deposito;
      return out;
    });
    chk('9a · la versión equivocada anotó una salida de 4', J(r.v1)===J([[4,false]]), J(r.v1));
    chk('9b · ⚠️ la corregida compara contra lo esperado de ese corte: −3 (antes salía +1 «entrada sin explicar» y ofrecía cerrar un pedido)', r.v2.mismo && r.v2.dif===-3 && r.v2.tipo==='menos' && r.v2.sinExplicar===3 && r.v2.sug===0, J(r.v2));
    chk('9c · la salida de 4 queda anulada (lápida «corte reemplazado») y la nueva es de 3', J(r.despues)===J([[4,true],[3,false]]), J(r.despues));
  });

  // ═══ 10 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 10. B8: 🔗 Unir lleva también lo que anotó el control ──');
  await seccion('10', async (page) => {
    const r = await page.evaluate(() => {
      var hoy=todayStr();
      var S=stockVacio(); S.c={ f:hoy, hora:'09:00:00', u:{}, alm:LOG }; S.c.u[K]=10; S.c.u[K2]=2;
      S.a={}; S.a[K2]=K;                                   // K2 se unió a K
      S.det=[{ id:'d:1', k:K2, t:1, u:1, f:hoy, hora:'09:00:00', hu:'a' }];
      S.sm=[{ id:'m:1', k:K2, u:2, f:hoy, ts:_ts(hoy,'11:00:00'), m:'x', pre:0 }];
      S.h=[{ id:'h', f:hoy, hora:'09:00:00', alm:LOG, d:[[K2, 1, []]] }];
      var M=stockMigrar(S);
      return { det:M.det[0].k===K, sm:M.sm[0].k===K, hd:M.h[0].d[0][0]===K };
    });
    chk('10 · la detección, la salida anotada y la diferencia del historial pasan a la clave unida', r.det && r.sm && r.hd, J(r));
  });

  // ═══ 11 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 11. (revisión) Después del F5: la memoria y la cola que dejó la página vieja no entran tal cual ──');
  await seccion('11', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      var viejo=JSON.parse(JSON.stringify(STOCK)); delete viejo.pv;
      viejo.c={ f:_atras(4), hora:'09:55:00', u:{}, alm:LOG, solo0:true, t:Date.now() }; viejo.c.u[K]=50;
      /* (a) la memoria de la pestaña: sin pv (la dejó la página vieja) no se carga; con pv sí */
      sessionStorage.setItem(SS_SIS, JSON.stringify({ stock:viejo, arqueo:null, base:{} }));
      STOCK=stockVacio(); STOCK_CARGADO=false; sisCargarPestana(); out.cargoVieja=STOCK_CARGADO;
      var conPv=JSON.parse(JSON.stringify(viejo)); conPv.pv=3;
      sessionStorage.setItem(SS_SIS, JSON.stringify({ stock:conPv, arqueo:null, base:{} }));
      STOCK=stockVacio(); STOCK_CARGADO=false; sisCargarPestana(); out.cargoNueva=STOCK_CARGADO;
      try{ sessionStorage.removeItem(SS_SIS); }catch(e){}
      /* (b) la fila que dejó en la cola (sin pv, con el sello 8 que había leído): sale SIN sello, el servidor contesta conflicto con
         la de hoy, se junta y se guarda con el sello: queda el corte de HOY */
      STOCK=stockVacio(); STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'09:05:00') }; STOCK.c.u[K]=20; STOCK.c.u[K2]=4;
      STOCK_CARGADO=true; var hoyFila=filaStock(); var servidorObs=hoyFila.observaciones;
      STOCK=stockVacio(); STOCK_CARGADO=false; SIS_BASE={};
      var filaVieja={ id:STOCK_ID, fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(viejo), rev:8, _dev:pestanaId(), _t:Date.now(), _base:{ rev:8, obs:servidorObs } };
      var enviados=[];
      apiPost=function(pl){
        var c=JSON.parse(JSON.stringify(pl)); enviados.push(c);
        if(pl.action!=='save') return Promise.resolve({ ok:true });
        if((Number(pl.pedido.rev)||0)!==8) return Promise.resolve({ ok:false, error:'conflicto', pedido:{ id:STOCK_ID, fecha:'', cliente:'📦 STOCK', observaciones:servidorObs, rev:8 }, ahora:Date.now() });
        return Promise.resolve({ ok:true, pedido:Object.assign({}, pl.pedido, { rev:9 }) });
      };
      var res=await apiSaveAhora(filaVieja, {});
      var saves=enviados.filter(function(e){ return e.action==='save'; });
      var ult=saves.length ? JSON.parse(saves[saves.length-1].pedido.observaciones) : null;
      out.b={ ok:!!(res&&res.ok), n:saves.length, primeroSinSello:saves[0] && saves[0].pedido.rev===0, sf:saves[0] && saves[0].sf, segundoConSello:saves[1] && saves[1].pedido.rev===8,
              corte:ult && (ult.c.f+' '+ult.c.hora), uK:ult && ult.c.u[K], pv:ult && ult.pv };
      return out;
    });
    chk('11a · la memoria que dejó la página vieja en la pestaña (sin pv) no se carga; una con pv sí', r.cargoVieja===false && r.cargoNueva===true, J([r.cargoVieja, r.cargoNueva]));
    chk('11b · ⚠️ la fila de la página vieja que quedó en la cola sale SIN sello, choca, se junta y queda el corte de HOY (no el del sábado)',
        r.b.ok && r.b.n===2 && r.b.primeroSinSello && r.b.sf===3 && r.b.segundoConSello && /^\d{4}-\d{2}-\d{2} 09:00:00$/.test(r.b.corte) && r.b.uK===20 && r.b.pv===3, J(r.b));
  });

  // ═══ 12 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 12. (revisión) La protección al leer no se apaga después de adoptar una copia vieja inocente ──');
  await seccion('12', async (page) => {
    const r = await page.evaluate(async () => {
      var out={};
      STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:_ts(todayStr(),'09:05:00') }; STOCK.c.u[K]=20; STOCK.c.u[K2]=4;
      var f0=filaStock(); f0.rev=5; STOCK=stockVacio(); STOCK_CARGADO=false; _limpiarVuelo(); leerCierresDeLista([f0], true);
      /* una página vieja anota un pedido a fábrica (inocente): se adopta y la memoria queda sin pv */
      var o1=JSON.parse(f0.observaciones); delete o1.pv; o1.p=[{ id:'fpV', k:K, u:3, fab:'MORENO', f:todayStr(), esp:'', r:'' }];
      window._guardadas=[]; window._toasts=[]; _limpiarVuelo(); leerCierresDeLista([Object.assign({}, f0, { observaciones:JSON.stringify(o1), rev:6 })], true);
      await new Promise(function(res){ setTimeout(res, 50); });
      out.inocente={ p:(STOCK.p||[]).length, pv:STOCK.pv||0, guardo:window._guardadas.length };
      /* y después vuelve a subir el Excel del sábado */
      var o2=JSON.parse(JSON.stringify(o1)); o2.c={ f:_atras(4), hora:'09:55:00', u:{}, solo0:true, alm:LOG, t:Date.now() }; o2.c.u[K]=50;
      window._guardadas=[]; window._toasts=[]; _limpiarVuelo(); leerCierresDeLista([Object.assign({}, f0, { observaciones:JSON.stringify(o2), rev:7 })], true);
      await new Promise(function(res){ setTimeout(res, 50); });
      var st=window._guardadas.filter(function(g){ return String(g.id)===STOCK_ID; }).slice(-1)[0], so=st?JSON.parse(st.observaciones):null;
      out.atras={ c:STOCK.c.f, uK:STOCK.c.u[K], p:(STOCK.p||[]).length, guardo: so ? (so.c.f+' pv'+so.pv) : null, aviso:window._toasts.some(function(t){ return /página VIEJA/.test(t); }) };
      return out;
    });
    chk('12a · la copia vieja inocente (anotó un pedido a fábrica) se adopta, sin guardar', r.inocente.p===1 && r.inocente.guardo===0, J(r.inocente));
    chk('12b · ⚠️ …y la siguiente que vuelve atrás el corte NO entra: queda el de hoy (con el pedido que anotó), se reguarda y avisa', /^\d{4}-\d{2}-\d{2}$/.test(r.atras.c) && r.atras.uK===20 && r.atras.p===1 && !!r.atras.guardo && / pv3$/.test(r.atras.guardo) && r.atras.aviso, J(r.atras));
  });

  // ═══ 13 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 13. (revisión) El mismo Excel subido dos veces conserva sus diferencias: el corregido compara bien ──');
  await seccion('13', async (page) => {
    const r = await page.evaluate(async () => {
      var R1=_R(todayStr(),'09:00:00',{[K]:6,[K2]:4});
      _subir(R1, ['.exist-sal']); await confirmarImportExist();
      var d1=JSON.stringify((STOCK.h[0]||{}).d||null);
      _subir(_R(todayStr(),'09:00:00',{[K]:6,[K2]:4})); await confirmarImportExist();      // el MISMO archivo, desde otro equipo
      var d2=JSON.stringify((STOCK.h[0]||{}).d||null);
      var C=stockConciliar(_R(todayStr(),'09:00:00',{[K]:7,[K2]:4}),'log',false), f=C.filas.filter(function(x){ return x.k===K; })[0]||{};
      return { d1:d1, igual:d1===d2, hn:STOCK.h.filter(function(x){ return x.alm===LOG && x.f===todayStr(); }).length, corregido:{ esperado:f.esperado, dif:f.dif, tipo:f.tipo } };
    });
    chk('13a · subir el mismo archivo otra vez deja las diferencias de la primera (con la salida anotada) y un solo corte', r.igual && r.d1!=='null' && r.hn===1, J([r.d1, r.hn]));
    chk('13b · ⚠️ …y el Excel corregido compara contra lo esperado de ese corte: 10, −3 (antes: 6, +1)', r.corregido.esperado===10 && r.corregido.dif===-3 && r.corregido.tipo==='menos', J(r.corregido));
  });

  // ═══ 14 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 14. (revisión) El mismo archivo ya subido con la hora del NOMBRE (página de antes) no es «más viejo» ──');
  await seccion('14', async (page) => {
    /* El corte vigente lo subió la página de antes: hora del nombre (08:50:15), con su huella en el historial. */
    const prim = await subirArchivo(page, 'Excel_07102026_08_50_15_almacen_octubre.xlsx', reporte({ al:'07/10/2026', pie:'' }));
    await page.evaluate(async () => { await confirmarImportExist(); });
    const vig = await page.evaluate(() => STOCK.c.hora);
    /* La página nueva sube el MISMO archivo, que tiene el pie 08:50:12 */
    const otra = await subirArchivo(page, 'DOC-20261007-WA0007.xlsx', reporte({ al:'07/10/2026', pie:'07/10/2026 08:50:12' }));
    const otroContenido = await subirArchivo(page, 'DOC-20261007-WA0008.xlsx', reporte({ al:'07/10/2026', pie:'07/10/2026 08:50:12', items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',12],['CH1129','COLCHON TITANIO LATEX 140X190',4]] }));
    chk('14a · el mismo contenido, 3 segundos de diferencia: se usa la hora con la que ya está (08:50:15), no «más viejo»', vig==='08:50:15' && !!otra.R && otra.R.hora==='08:50:15' && otra.boton.hay && !otra.boton.apagado, J([vig, otra.R && otra.R.hora, otra.boton]));
    chk('14b · …pero OTRO contenido con una hora anterior sigue siendo más viejo (no se alinea)', !!otroContenido.R && otroContenido.R.hora==='08:50:12' && otroContenido.boton.apagado===true, J([otroContenido.R && otroContenido.R.hora, otroContenido.boton]));
  });

  // ═══ 15 ══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 15. (revisión) Con un conteo a mano más nuevo, el Excel de la mañana no entra y lo dice así ──');
  await seccion('15', async (page) => {
    const r = await page.evaluate(() => {
      STOCK.c={ f:todayStr(), u:{}, t:_ts(todayStr(),'14:00:00') }; STOCK.c.u[K]=9;   // 📋 Conté a mano, a las 14:00
      var C=stockConciliar(_R(todayStr(),'09:00:00',{[K]:10,[K2]:4}),'log',false);
      return { viejo:!!C.corteViejo, aMano:!!C.previoAMano, ambiguo:!!C.ambiguo, txt:existCorteViejoTxt(C) };
    });
    chk('15 · «Ya hay un conteo a mano de hoy (anotado a las 14:00), más nuevo que este Excel» (antes decía «otro Excel… falta la hora»)', r.viejo && r.aMano && !r.ambiguo && /conteo a mano de hoy de este depósito \(anotado a las 14:00\)/.test(r.txt), J(r));
  });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error('REVENTÓ', e); process.exit(1); });
