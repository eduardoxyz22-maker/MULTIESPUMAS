/* 🔌 EL «EN PRODUCCIÓN» AUTOMÁTICO, APAGADO (18/10, §4ls).

   Decisión del dueño (18/10): el «en producción» automático (§4lr, 17/10) queda APAGADO hasta el jueves 22/10 (la reunión con
   logística). La revisión 2 midió que todavía no está listo: anota como pedido lo que nadie mandó a la fábrica, una página sin F5 lo
   borra y juntar copias revive lo que ya llegó. El código queda, detrás del interruptor `STOCK_AUTO_ACTIVO` (false).

   LO QUE ESTA PRUEBA CUIDA (los «AO» fallan contra la página de antes, `78e591a`, que no tenía interruptor):
   AO0  El interruptor existe y viene APAGADO.
   AO1  Subir el Excel de los tres almacenes del día NO anota nada (`STOCK.ap` vacío, sin lote en `STOCK.apL`) y el aviso no dice
        «el panel anotó lo que hay que pedir hoy»; el Plan sigue ofreciendo «Ya pedí». (Control: prendido, sí anota y lo dice.)
   AO2  Lo que ya esté guardado en `STOCK.ap` NO cuenta como «en camino»: «Pedir 7 días», «en camino» y los pedidos de la fila dan
        lo MISMO que sin la memoria. (Control: prendido, cuenta.)
   AO3  El cuadrito del vendedor (`saldoVeredicto`) no promete «⏳ en producción» lo anotado: da lo mismo que sin la memoria.
   AO4  La fila no muestra lo anotado (`stockAutoHtml` vacío) y «Ya pedí» se ofrece aunque haya algo anotado HOY; tildarlo no anula
        lo anotado.
   AO5  Llamadas directas: `stockAutoAnotar` y `stockAutoConsumir` no tocan nada.
   AO6  (Control, también verde antes) Lo guardado se sigue LEYENDO, GUARDANDO, JUNTANDO y PODANDO: no se pierde para cuando se prenda.

   Reloj CLAVADO: viernes 16/10/2026 (10:20 para el Excel, 12:00 para lo demás) de Bolivia. Red cortada, datos sintéticos.
   Se corre:  node tests/test_stock_rev2_auto_off.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_78e591a.html node tests/test_stock_rev2_auto_off.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

/* ── Un .xlsx de verdad (ZIP sin comprimir) con la forma del reporte de Moreno (como `test_existencias_tres.js`). ── */
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
function reporte({ al='16/10/2026', pie='16/10/2026 10:10:16', cab='01-05-103  IM - PRODUCTOTERMINADO', bloques }){
  const celda=(ref,v)=> typeof v==='number' ? `<c r='${ref}' s='11'><v>${v}</v></c>` : `<c r='${ref}' t='inlineStr' s='11'><is><t>${esc(v)}</t></is></c>`;
  let n=0; const filas=[]; const fila=(cs)=>{ n++; filas.push(`<row r="${n}">${cs.map(([c,v])=>celda(c+n,v)).join('')}</row>`); };
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
  if(pie) fila([['B','iv380_34'],['Z','Página 1 de 1'],['AZ','Fecha : '+pie+' - logistica']]);
  const hoja='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+filas.join('')+'</sheetData></worksheet>';
  return zip([ { name:'[Content_Types].xml', data:'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>' },
               { name:'xl/workbook.xml', data:'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>' },
               { name:'xl/worksheets/sheet1.xml', data:hoja } ]);
}
const LOG='PRODUCTOS TERMINADOS FAB.', BZ='Almacen Distribucion Banzer', IM='IM - PRODUCTOTERMINADO';
const TRES = () => reporte({ bloques:[
  { cod:'105003', alm:LOG, items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',13],['CH1129','COLCHON TITANIO LATEX 140X190',4]] },
  { cod:'105025', alm:BZ,  items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',7],['CH1129','COLCHON TITANIO LATEX 140X190',2]] },
  { cod:'105103', alm:IM,  items:[['CH1201','TITANIO ICE 2.5PLZ 160X190CM',30]] } ] });

/* La base: un stock de AYER en los tres almacenes (roles ya elegidos) y 10 TITANIO LATEX 140 vendidos para el martes: con 4 + 2 en
   PTF y Banzer, el panel pide fabricar. */
const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  apiSave=function(rec){ return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.K2=stockClave({desc:'TITANIO LATEX',medida:'140x190',codigo:'CH1129'});
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._base=function(){
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STATE=[{ id:'p-ao1', oc:'OC 10-901', fecha:'2026-10-20', turno:'AM', cliente:'CLIENTE AO1', vendedor:'Maria Flores', celular:'70000000', zona:'Norte',
             productos:[{ codigo:'CH1129', desc:'COLCHON TITANIO LATEX', medida:'140x190', cant:10, precio:1000 }] }];
    var ayer='2026-10-15';
    STOCK.c={ f:ayer, hora:'09:00:00', u:{}, solo0:true, alm:'${LOG}', t:Date.now()-86400000 }; STOCK.c.u[K]=11; STOCK.c.u[K2]=4;
    STOCK.g={}; STOCK.g['${BZ}']={ f:ayer, hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000, rs:{} }; STOCK.g['${BZ}'].u[K]=5; STOCK.g['${BZ}'].u[K2]=2;
    STOCK.g['${IM}']={ f:ayer, hora:'09:00:00', u:{}, solo0:true, t:Date.now()-86400000, rs:{} }; STOCK.g['${IM}'].u[K]=25;
    STOCK.al={}; STOCK.al['${LOG}']='log'; STOCK.al['${BZ}']='sale'; STOCK.al['${IM}']='otro';
    STOCK.p=[]; stockOlvidarIndice();
  };
`;

/* La página para las cuentas (como `test_stock_reunion.js`). */
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  window._stock=function(fn){
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(fn) fn(st);
    return st;
  };
  window._ped=function(id, fecha, lineas, extra){
    return Object.assign({ id:id, oc:'OC 10-'+id.slice(-3), fecha:fecha, turno:'AM', cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  /* Lo que el vendedor ve en el cuadrito y lo que dice la fila del Plan (sin la caché de la lectura). */
  window._ver=function(k){
    SALDO_CACHE=null; stockOlvidarIndice();
    var o=_fila(k), v=saldoVeredicto(k, 1, '', '', true);
    return { fab:o.fabricar, cam:o.enCamino, auto:(o.pedidos||[]).filter(function(q){ return q && q.auto; }).length, n:(o.pedidos||[]).length,
             tipo:v.tipo, llega:v.llega||'', prod:v.prod, txt:String(stockAutoHtml(o)) };
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ev = (page) => async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  /* ── AO1. Subir el Excel de los tres almacenes del día ── */
  const nuevaExcel = async () => {
    const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-10-16T10:20:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate((b)=>{ eval(b); _base(); }, BASE);
    return page;
  };
  const subirTres = async (page, prendido) => {
    await page.evaluate((on)=>{ if(on) window.STOCK_AUTO_ACTIVO=true; EXIST_IMP=null; try{ closeModal(); }catch(e){} }, prendido);
    await page.setInputFiles('#exist-input', { name:'Excel_16-10-2026_10_12_15.xlsx', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer:TRES() });
    await page.waitForFunction(()=>!!EXIST_IMP, null, { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(150);
    for(let i=0;i<3;i++){ await page.evaluate(async ()=>{ if(EXIST_IMP) confirmarImportExist(); await new Promise(function(r){ setTimeout(r,80); }); }); }
    await page.waitForTimeout(250);
    return page.evaluate(()=>{
      var o=_fila(K2), hoy=todayStr();
      var div=document.createElement('div'); div.innerHTML=o ? planYaHtml(o) : '';
      var ap=STOCK.ap||{}, n=0; Object.keys(ap).forEach(function(k){ n+=Object.keys(ap[k]||{}).length; });
      return { c:STOCK.c.f+' '+STOCK.c.hora, ptf:STOCK.c.u[K2], bz:STOCK.g['Almacen Distribucion Banzer'].u[K2], im:STOCK.g['IM - PRODUCTOTERMINADO'].f,
               fab:o&&o.fabricar, apN:n, apK2:((ap[K2]||{})[hoy]||null), apL:(STOCK.apL||[]).length,
               dice:(window._toasts||[]).some(function(t){ return /anotó lo que hay que pedir hoy/.test(t); }),
               toasts:(window._toasts||[]).filter(function(t){ return /actualizad/.test(t); }).map(function(t){ return t.slice(0,160); }),
               plan:div.innerText, casilla:!!div.querySelector('input[type=checkbox]:not(:checked)') };
    });
  };
  {
    const page = await nuevaExcel();
    const def = await page.evaluate(()=>({ tipo:typeof STOCK_AUTO_ACTIVO, val:(typeof STOCK_AUTO_ACTIVO!=='undefined') ? STOCK_AUTO_ACTIVO : null }));
    chk('AO0. el interruptor `STOCK_AUTO_ACTIVO` existe y viene APAGADO (decisión del dueño, 18/10)', def.tipo==='boolean' && def.val===false, def);
    const r = await subirTres(page, false);
    chk('AO1a. (control) los tres almacenes del día entraron: PTF 4, Banzer 2, IM al 16/10, y el panel pide fabricar', r.c==='2026-10-16 10:10:16' && r.ptf===4 && r.bz===2 && r.im==='2026-10-16' && r.fab>0, r);
    chk('AO1b. apagado, subir el Excel NO anota nada como pedido a la fábrica (STOCK.ap vacío, sin lote en apL)', r.apN===0 && r.apK2===null && r.apL===0, r);
    chk('AO1c. …y el aviso del Excel no dice «el panel anotó lo que hay que pedir hoy»', r.toasts.length>0 && !r.dice, r.toasts);
    chk('AO1d. …y el Plan sigue ofreciendo la casilla «Ya pedí»', r.casilla && /Ya pedí/.test(r.plan) && !/Hoy se piden/.test(r.plan), r.plan);
    await page.close();
  }
  {
    const page = await nuevaExcel();
    const r = await subirTres(page, true);
    chk('AO1e. (control) PRENDIDO, el mismo Excel anota «Pedir 7 días» y el aviso lo dice', r.apK2 && r.apK2[0]===r.fab && r.fab>0 && r.dice && /Hoy se piden/.test(r.plan), r);
    await page.close();
  }

  /* ── AO2-AO6. Lo guardado en STOCK.ap no cuenta, no se muestra y no se pierde ── */
  const page = await browser.newPage({ viewport:{ width:1200, height:1000 }, timezoneId:'America/La_Paz' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const E = ev(page);

  const a2 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var p=_ped('p-ao2', '2026-10-23', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:5, precio:1000 }]);
    await _cargar([p], _stock(function(st){ st.c.u[K]=0; st.g[_IM].u[K]=0; }));
    var sin=_ver(K);
    // lo que el panel anotó AYER (15/10) como pedido a la fábrica (10, más de lo vendido): vigente si estuviera prendido
    STOCK.ap={}; STOCK.ap[K]={ '2026-10-15':[10,0,0,0,Math.floor(Date.now()/1000)] };
    var off=_ver(K);
    window.STOCK_AUTO_ACTIVO=true; var on=_ver(K);
    window.STOCK_AUTO_ACTIVO=false; var off2=_ver(K);
    return { sin:sin, off:off, on:on, off2:off2 };
  });
  chk('AO2a. (control) sin la memoria: pide fabricar 5, nada en camino, el cuadrito dice «🏭 NO HAY» (pedir)', a2.sin && a2.sin.fab===5 && a2.sin.cam===0 && a2.sin.tipo==='pedir', a2.sin);
  chk('AO2b. apagado, lo anotado AYER no cuenta: «Pedir 7 días» 5, en camino 0, ningún pedido «auto» en la fila (= sin la memoria)',
      a2.off && a2.off.fab===a2.sin.fab && a2.off.cam===a2.sin.cam && a2.off.auto===0 && a2.off.n===a2.sin.n, a2.off);
  chk('AO3. apagado, el cuadrito del vendedor da lo MISMO que sin la memoria (no promete «⏳ en producción» lo anotado)',
      a2.off && a2.off.tipo===a2.sin.tipo && a2.off.llega===a2.sin.llega && a2.off.prod===a2.sin.prod, { sin:a2.sin, off:a2.off });
  chk('AO4a. apagado, la fila no muestra lo anotado («🏭 En producción…» no aparece)', a2.off && a2.off.txt==='', a2.off && a2.off.txt);
  chk('AO2c. (control) PRENDIDO, lo mismo cuenta: en camino 10, «Pedir 7 días» 0 y el cuadrito «⏳ en producción»', a2.on && a2.on.cam===10 && a2.on.fab===0 && a2.on.auto===1 && a2.on.tipo==='prod' && /En producción/.test(a2.on.txt), a2.on);
  chk('AO2d. apagado otra vez, vuelve a ser como sin la memoria (el interruptor no deja nada pegado)', a2.off2 && a2.off2.fab===5 && a2.off2.cam===0 && a2.off2.tipo==='pedir', a2.off2);

  const a4 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200'), hoy=todayStr();
    // lo anotado HOY (con la página prendida en otro equipo, por ejemplo)
    STOCK.ap={}; STOCK.ap[K]={}; STOCK.ap[K][hoy]=[5,0,0,0,1]; STOCK.p=[];
    var o=_fila(K), div=document.createElement('div'); div.innerHTML=planYaHtml(o);
    var antes=JSON.stringify(STOCK.ap);
    planYaPedi(K, true);
    var r={ plan:div.innerText, casilla:!!div.querySelector('input[type=checkbox]:not(:checked)'), apIgual:JSON.stringify(STOCK.ap)===antes,
            ya:(STOCK.p||[]).filter(function(q){ return q && q.ya && q.k===K; }).length };
    STOCK.p=[];
    return r;
  });
  chk('AO4b. apagado, con algo anotado HOY el Plan igual ofrece la casilla «Ya pedí 5»', a4.casilla && /Ya pedí 5/.test(a4.plan) && !/Hoy se piden/.test(a4.plan), a4);
  chk('AO4c. …y tildarlo anota el «Ya pedí» sin anular lo guardado del panel', a4.ya===1 && a4.apIgual===true, a4);

  const a5 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200'), hoy=todayStr();
    STOCK.ap={}; STOCK.ap[K]={ '2026-10-15':[5,0,0,0,1] }; STOCK.apL=['x1'];
    var antes=JSON.stringify({ ap:STOCK.ap, apL:STOCK.apL });
    var an=stockAutoAnotar(hoy), prod={}; prod[K]=3;
    var co=stockAutoConsumir(prod, hoy, 'lote-ao5');
    return { an:an.length, co:co.length, igual:JSON.stringify({ ap:STOCK.ap, apL:STOCK.apL })===antes };
  });
  chk('AO5. apagado, `stockAutoAnotar` y `stockAutoConsumir` no anotan, no cierran y no tocan lo guardado', a5.an===0 && a5.co===0 && a5.igual===true, a5);

  const a6 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    STOCK.ap={}; STOCK.ap[K]={ '2026-10-15':[5,1,0,0,7] }; STOCK.apL=['x1'];
    var leido=leerStock({ observaciones:JSON.stringify(STOCK) });
    var fila=filaStock();
    var b=stockVacio(), m=stockVacio(), s=stockVacio();
    m.ap={ A:{ '2026-10-15':[4,0,0,0,10] } }; s.ap={ A:{ '2026-10-15':[6,2,1,0,20] }, B:{ '2026-10-14':[2,0,0,0,5] } }; s.apL=['l2'];
    var F=stockFusionar(b, m, s);
    var P={ ap:{ A:{ '2026-10-01':[3,0,0,0,1] }, B:{ '2026-10-15':[3,0,0,0,1] } } }; stockPodar(P, '2026-10-16');
    return { leido:JSON.stringify(leido.ap||null), leidoL:JSON.stringify(leido.apL||null), fila:/"ap":\{/.test(fila.observaciones||''),
             F:JSON.stringify(F.ap), FL:JSON.stringify(F.apL||null), poda:Object.keys(P.ap) };
  });
  chk('AO6a. (control) apagado, leer la celda trae lo guardado entero (ap y apL)', /"2026-10-15":\[5,1,0,0,7\]/.test(a6.leido||'') && a6.leidoL==='["x1"]', a6);
  chk('AO6b. (control) apagado, guardar el stock lo sigue llevando a la celda', a6.fila===true, a6);
  chk('AO6c. (control) apagado, juntar dos copias junta lo anotado (el más nuevo manda, lo llegado es el mayor) y el lote', /"A":\{"2026-10-15":\[6,2,1,0,20\]\}/.test(a6.F||'') && /"B"/.test(a6.F||'') && a6.FL==='["l2"]', a6);
  chk('AO6d. (control) apagado, la poda sigue: lo de hace más de 12 días se va', JSON.stringify(a6.poda)==='["B"]', a6.poda);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
