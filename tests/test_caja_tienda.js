/* 🏬 LA CAJA DE VENTURA SUR, PARA CONTABILIDAD (14/11, mejora 254; el dueño la aprobó con la muestra del 14/11).

   LO QUE CUIDA (servidor de mentira; solo datos INVENTADOS; reloj CLAVADO el sábado 14/11/2026 a las 19:30 de Bolivia; para la prueba, Andrea,
   Fabián y dos vendedores inventados están en «Ventura Mall»):
   1. El botón: solo en Contabilidad y solo para las tiendas de `CAJA_TIENDAS` («🏬 Caja de Ventura Sur»); en el aparato del mall
      (`me_mall_aparato`) o con un vendedor de esa tienda elegido dice «🏬 Caja de hoy» (también en «Tu día»). En Playwright, solo con `CAJA_PRUEBA`.
   2. Ventas del día de la gente de la tienda, 🌅 mañana / 🌆 tarde por la hora de carga (corte 15:00): OC, vendedor, cliente, total, a cuenta,
      saldo, medio de pago y factura o remisión. Las de otras tiendas no entran.
   3. Cobros del día (los del Cuadre): de ventas de hoy y saldos viejos, por forma, con recibo, foto y quién recibió el efectivo; lo que cobró un
      chofer se dice aparte (no está en la caja).
   4. Efectivo: quedó de ayer + cobrado − retirado = debe haber (= «📒 Mayor y saldos»); el arqueo al cambio de turno y al cerrar, con la
      diferencia de cada turno.
   5. QR contra el banco: la tilde «está en el extracto» se guarda en `__caja_tienda__` (REESCRITAS: relee, junta y sello).
   6. Lo que falta, en rojo: pagos sin comprobante, ventas sin factura/remisión, efectivo fuera de la caja.
   7. 🔒 Cerrar: guarda el arqueo y la marca; después cambiar el arqueo o los tildes pide la contraseña; baja el Excel de 4 hojas (Ventas, Cobros,
      Efectivo, QR por banco: la plata con número y estilo 2) y arma el PDF con las firmas.
   8. ✅ La suma de las cajas de todos los días del mes = el Cuadre del mes de esa tienda (cobros por forma, efectivo cobrado y retirado, el
      saldo de «Mayor y saldos» al último día y las ventas de Contabilidad).
   9. La meta de la tienda (256) = la suma de sus vendedores; el contador de la gente (`mallResumenDia`) sale solo si existe.
   10. En el celular (390 px) la ventana no ensancha la página.
   11. (revisión del 14/11) Anotar lo contado no rearma la ventana: Tab lleva al campo siguiente, el guardado que vuelve repinta sin sacarle
       el foco ni lo tecleado, y el primer clic en «🔒 Cerrar la caja» cierra (también con el ratón apretado un rato sobre el borde del botón);
       con el servidor de antes de la 14-b no se guarda nada (campos apagados con un aviso; lo de la cola espera); los dos interruptores del
       aparato del mall se avisan; el efectivo de una venta de OTRA tienda que tiene alguien de la tienda se lista aparte, sin cambiar totales.
   Se corre:  node tests/test_caja_tienda.js   (PEDIDOS=… para correrla contra otra versión; SALIDA=<carpeta> deja capturas) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const SALIDA = process.env.SALIDA || '';

function PREPARAR(){
  var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_mall_aparato'); localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  /* la tienda del mall, con su gente (para la prueba) */
  VENDEDOR_SUCURSAL.unshift([/LUCIA PRUEBA/i, 'Ventura Mall'], [/RODRIGO PRUEBA/i, 'Ventura Mall'], [/FABIAN|GODOY/i, 'Ventura Mall'], [/ANDREA|ORIAS/i, 'Ventura Mall']);
  var ts=function(d, h){ return new Date(d+'T'+(h||'10:00')+':00-04:00').getTime(); };
  var n=0;
  /* una venta: la venta de tienda lleva «SALIÓ DE TIENDA · Ventura Mall»; `cobros` con textoCobros; `doc` = ['F'|'R', N°] */
  var V=function(o){
    n++;
    var p={ id:o.id, oc:o.oc||('11-'+(300+n)), nota:o.nota||String(7000+n), cliente:o.cliente||('CLIENTE '+n), celular:'7100000'+n, fecha:o.tienda?'':(o.fecha||'2026-11-25'),
      turno:o.tienda?'':'AM', zona:o.tienda?'TIENDA':'Sur', direccion:o.tienda?('SALIÓ DE TIENDA · '+(o.suc||'Ventura Mall')):'CALLE INVENTADA 1', maps:'',
      vendedor:o.v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:o.total }], acuenta:0,
      saldo:o.saldo||0, pagado:!(o.saldo>0), metodoPago:textoCobros(o.cobros||[]), ts:ts(o.dia, o.h), rev:1 };
    if(o.doc){ p.productos[0].fdoc=o.doc[0]; p.productos[0].fdocn=o.doc[1]; }
    return p;
  };
  var C=function(m, monto, f, nota, x){ return Object.assign({ metodo:m, monto:monto, fecha:f, nota:nota, comps:['IMG'+nota] }, x||{}); };
  var R=function(id, v, monto, dia, h){ var r=filaSistema('__ret_'+id+'__', retiroTitulo(), ''); r.vendedor=v; r.chofer='Contabilidad'; r.acuenta=monto; r.zona='FACTURADO'; r.nota='R'+id; r.ts=ts(dia, h||'12:00'); return r; };
  window._BASE=[
    /* martes 10/11: una OC de Rodrigo con adelanto por QR (el saldo lo cobra el chofer el 14/11) */
    V({ id:'v8', v:'Rodrigo Prueba', dia:'2026-11-10', h:'11:00', total:2500, saldo:0, fecha:'2026-11-14', doc:['R','90'],
        cobros:[C('QR', 2000, '2026-11-10', '5009', { banco:'Económico', anticipo:true }), C('Efectivo', 500, '2026-11-14', '5010', { recibio:'Luis Pierre' })] }),
    /* jueves 12/11 */
    V({ id:'v1', v:'Andrea Orias', dia:'2026-11-12', h:'10:30', total:6510, tienda:true, doc:['F','512'], cobros:[C('QR', 6510, '2026-11-12', '5001', { banco:'BISA' })] }),
    V({ id:'v2', v:'Fabián Godoy', dia:'2026-11-12', h:'16:10', total:8410, fecha:'2026-11-20', doc:['R','88'],
        cobros:[C('Efectivo', 3000, '2026-11-12', '5002', { anticipo:true }), C('QR', 3120, '2026-11-13', '5005', { banco:'BISA' })], saldo:2290 }),
    /* viernes 13/11 */
    V({ id:'v3', v:'Lucia Prueba', dia:'2026-11-13', h:'11:00', total:2580, tienda:true, cobros:[C('QR', 2580, '2026-11-13', '5003', { banco:'Ganadero' })] }),
    V({ id:'v4', v:'Rodrigo Prueba', dia:'2026-11-13', h:'18:05', total:1945, tienda:true, doc:['F','513'], cobros:[C('Tarjeta', 1945, '2026-11-13', '5004', { banco:'BISA' })] }),
    /* sábado 14/11 (hoy) */
    V({ id:'v5', v:'Andrea Orias', dia:'2026-11-14', h:'09:40', total:1200, tienda:true, doc:['F','515'], cobros:[C('Efectivo', 1200, '2026-11-14', '5006')] }),
    V({ id:'v7', v:'Lucia Prueba', dia:'2026-11-14', h:'10:15', total:4000, fecha:'2026-11-25', doc:['F','514'], saldo:2500, cobros:[C('Efectivo', 1500, '2026-11-14', '5008', { anticipo:true })] }),
    V({ id:'v6', v:'Fabián Godoy', dia:'2026-11-14', h:'17:20', total:2000, tienda:true, cobros:[C('Efectivo', 2000, '2026-11-14', '5007', { comps:[] })] }),
    /* de otras tiendas: no entran */
    V({ id:'o1', v:'Isabel Robledo', dia:'2026-11-14', h:'11:00', total:999, tienda:true, suc:'Central', doc:['F','1'], cobros:[C('Efectivo', 999, '2026-11-14', '6001')] }),
    V({ id:'o2', v:'Mirian Salazar', dia:'2026-11-13', h:'11:00', total:777, tienda:true, suc:'Mia Plaza', doc:['F','2'], cobros:[C('QR', 777, '2026-11-13', '6002', { banco:'BISA' })] })
  ];
  /* el adelanto de v2 y v7 es el anticipo (`acuenta`) */
  window._BASE.forEach(function(p){ var a=parseCobros(p.metodoPago).filter(function(c){ return c.anticipo; })[0]; if(a) p.acuenta=a.monto; });
  window._RET=[ R('f1', 'Fabián Godoy', 3000, '2026-11-13'), R('a1', 'Andrea Orias', 1000, '2026-11-14', '14:00') ];
  var ESC={ heaven:{ t:[['min',100,2],['pres',100,2.75]], bono:1 }, suena:{ t:[['min',100,2]], bono:0 } };
  window._METAS={ id:'__metas__', fecha:'', cliente:'🎯 METAS', rev:3, observaciones:JSON.stringify({ v:1, m:{ '2026-11':{ heaven:160000, suena:50000, t:2,
    vd:{ 'Andrea Orias':[60000,80000], 'Fabián Godoy':[60000,80000], 'Isabel Robledo':[125000,160000] }, esc:ESC } } }) };
  window._srv=null; window._saves=[];
  apiList=function(){ var L=JSON.parse(JSON.stringify(window._BASE)).concat(JSON.parse(JSON.stringify(window._RET))).concat([JSON.parse(JSON.stringify(window._METAS))]);
    if(window._srv) L.push(JSON.parse(JSON.stringify(window._srv))); return Promise.resolve({ ok:true, pedidos:L }); };
  apiSave=function(r, o){ window._saves.push({ rec:JSON.parse(JSON.stringify(r)), opts:o||null });
    if(String(r.id)==='__caja_tienda__'){ var g=JSON.parse(JSON.stringify(r)); g.rev=(Number(r.rev)||0)+1; window._srv=g; return Promise.resolve({ ok:true, pedido:g }); }
    return Promise.resolve({ ok:true, pedido:r }); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  window._descargas=[];
  downloadBlob=function(bytes, nombre){ window._descargas.push(nombre); };
  var _bx=buildXlsx; window._hojas=null; buildXlsx=function(sh){ window._hojas=JSON.parse(JSON.stringify(sh, function(k, v){ return (v instanceof Uint8Array) ? '[bytes]' : v; })); return _bx(sh); };
  window._pdf=null; hojasAPdf=function(box, nombre, titulo){ window._pdf={ nombre:nombre, titulo:titulo, n:box.querySelectorAll('.ai-pag').length, txt:box.innerText.replace(/\s+/g,' ') }; return Promise.resolve(window._pdf.n); };
  window._cargar=async function(){ await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https?:\/\//, r => r.abort());
    await page.clock.setFixedTime(new Date('2026-11-14T19:30:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { await _cargar(); });
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1280);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,400) }; } };
  const D0 = (r, d) => Object.assign({}, d, (r && !r.__err) ? r : {});
  let r;

  /* 1 · el botón */
  console.log('── 1. El botón ──');
  r = await ev(async () => {
    if(typeof cajaAbrir!=='function') return { falta:true };
    showView('conta'); await _esperar(150); renderConta();
    var sinFlag=document.getElementById('cjt-btns'), o={ sinFlag:!!(sinFlag && (sinFlag.hidden || !sinFlag.innerHTML.trim())) };
    window.CAJA_PRUEBA=1; renderConta();
    var b=[].slice.call(document.querySelectorAll('#cjt-btns button')).map(function(x){ return x.textContent.trim(); });
    o.btns=b; o.tiendas=CAJA_TIENDAS.slice();
    try{ localStorage.setItem('me_mall_aparato','1'); }catch(e){}
    renderConta(); o.aparato=[].slice.call(document.querySelectorAll('#cjt-btns button')).map(function(x){ return x.textContent.trim(); });
    o.libro=[].slice.call(document.querySelectorAll('#cx-top .cjt-abre')).map(function(x){ return x.textContent.trim(); });
    try{ localStorage.removeItem('me_mall_aparato'); }catch(e){}
    try{ localStorage.setItem('me_mis_vendedor','Fabián Godoy'); }catch(e){}
    o.vend=cajaBotonesHtml('x').indexOf('Caja de hoy')>=0;
    try{ localStorage.setItem('me_mis_vendedor','Isabel Robledo'); }catch(e){}
    o.otra=cajaBotonesHtml('x').indexOf('Caja de hoy')<0 && cajaBotonesHtml('x', true)==='';
    try{ localStorage.removeItem('me_mis_vendedor'); }catch(e){}
    renderConta();
    return o;
  }); r=D0(r, { btns:[], aparato:[] });
  chk('1a · en Playwright, sin CAJA_PRUEBA el botón no sale', r.sinFlag===true, r);
  chk('1b · con CAJA_PRUEBA, Contabilidad tiene UN botón y solo para Ventura Mall: «🏬 Caja de Ventura Sur»', r.btns.length===1 && r.btns[0]==='🏬 Caja de Ventura Sur' && r.tiendas.join()==='Ventura Mall', r);
  chk('1c · en el aparato del mall (me_mall_aparato=1) dice «🏬 Caja de hoy»', r.aparato.length===1 && r.aparato[0]==='🏬 Caja de hoy', r.aparato);
  chk('1d · con un vendedor de esa tienda elegido también es «Caja de hoy»; con uno de otra tienda, no (y «Tu día» no lo muestra)', r.vend===true && r.otra===true, r);

  /* 2-6 · la caja de hoy */
  console.log('── 2-6. La caja del sábado 14/11 ──');
  r = await ev(async () => {
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(50);
    var D=cajaDatos('2026-11-14', 'Ventura Mall');
    var pick=function(x){ return { oc:x.p.oc, v:x.p.vendedor, h:x.h, t:x.turno, total:x.total, cuenta:x.cuenta, saldo:x.saldo, med:x.medios.join('+'), doc:x.doc, docN:x.docN, falta:x.docFalta }; };
    return { titulo:_txt('#modal-box .modal-h h3'), txt:_txt('#cjt-cuerpo'),
      am:D.V.am.map(pick), pm:D.V.pm.map(pick), V:{ n:D.V.n, total:D.V.total, cuenta:D.V.cuenta, saldo:D.V.saldo },
      cob:D.cobros.map(function(c){ return { id:c.p.id, f:c.forma, m:c.monto, quien:c.quien||'', ch:!!c.chofer, en:!!c.enCaja, h:c.h, hoy:c.deHoy, comp:c.comps.length }; }),
      totCob:D.totCob, formas:D.formas.map(function(f){ return f.forma+':'+f.n+':'+f.monto; }),
      gente:D.gente.map(function(g){ return g.nombre; }),
      E:{ ayer:D.E.ayer, cob:D.E.cob, cobAm:D.E.cobAm, cobPm:D.E.cobPm, ret:D.E.ret, retAm:D.E.retAm, debe:D.E.debe, espAm:D.E.espAm, filas:D.E.filas.map(function(o){ return o.nombre+':'+o.debe; }) },
      F:{ n:D.F.n, sinComp:D.F.sinComp.map(function(c){ return c.p.id; }), sinDoc:D.F.sinDoc.map(function(x){ return x.p.id; }), fuera:D.F.efeFuera.length, chofer:D.F.efeChofer.map(function(c){ return c.p.id; }) },
      mys:(function(){ var S=mysSaldos('2026-11-14'), o={}; S.filas.forEach(function(f){ o[f.nombre]=f.saldo; }); return o; })() };
  }); r=D0(r, { am:[], pm:[], cob:[], formas:[], gente:[], E:{ filas:[] }, F:{ sinComp:[], sinDoc:[], chofer:[] }, V:{}, mys:{} });
  chk('2a · la ventana se llama «🏬 Caja de Ventura Sur» y dice el día', /Caja de Ventura Sur/.test(r.titulo) && /Sábado 14\/11\/2026 · hoy/.test(r.txt), [r.titulo, (r.txt||'').slice(0,160)]);
  chk('2b · la gente de la tienda ese día: Andrea, Fabián, Lucía y Rodrigo (sin el chofer)', r.gente.join('|')==='Andrea Orias|Fabián Godoy|Lucia Prueba|Rodrigo Prueba', r.gente);
  chk('2c · 🌅 mañana: la venta de tienda de Andrea (09:40, Bs 1.200 en efectivo, F 515) y la OC de Lucía (10:15, total 4.000, a cuenta 1.500, saldo 2.500)',
    r.am.length===2 && r.am[0].v==='Andrea Orias' && r.am[0].h==='09:40' && r.am[0].total===1200 && r.am[0].cuenta===1200 && r.am[0].med==='Efectivo' && r.am[0].doc==='F' && r.am[0].docN==='515'
    && r.am[1].v==='Lucia Prueba' && r.am[1].total===4000 && r.am[1].cuenta===1500 && r.am[1].saldo===2500, r.am);
  chk('2d · 🌆 tarde: la de Fabián (17:20, Bs 2.000) sin factura ni remisión: falta', r.pm.length===1 && r.pm[0].v==='Fabián Godoy' && r.pm[0].t==='pm' && r.pm[0].falta===true, r.pm);
  chk('2e · la venta de tienda de Central del mismo día no está; total del día Bs 7.200, a cuenta 4.700, saldo 2.500', r.V.n===3 && r.V.total===7200 && r.V.cuenta===4700 && r.V.saldo===2500 && !/CLIENTE 9\b/.test(r.txt), r.V);
  chk('3a · cobros del día: los tres en efectivo de la tienda + el saldo de la OC del 10/11 que cobró el chofer = Bs 5.200, todos en «Efectivo»',
    r.totCob===5200 && r.formas.join()==='Efectivo:4:5200' && r.cob.length===4, [r.totCob, r.formas]);
  var ch=(r.cob||[]).filter(function(c){ return c.id==='v8'; })[0]||{};
  chk('3b · el del chofer: lo recibió Luis Pierre, no está en la caja y es de una venta de otro día (saldo)', ch.quien==='Luis Pierre' && ch.ch===true && ch.en===false && ch.hoy===false, ch);
  chk('3c · los de la tienda los recibió quien vendió (en la caja); la hora es la de carga de la venta', r.cob.filter(function(c){ return c.id!=='v8'; }).every(function(c){ return c.en && c.h; }), r.cob);
  chk('4a · efectivo: quedó de ayer 0 + cobrado 4.700 (🌅 2.700 · 🌆 2.000) − retirado 1.000 (el retiro de Andrea de las 14:00, a la mañana) = debe haber Bs 3.700',
    r.E.ayer===0 && r.E.cob===4700 && r.E.cobAm===2700 && r.E.cobPm===2000 && r.E.ret===1000 && r.E.retAm===1000 && r.E.debe===3700, r.E);
  chk('4b · al cambio de turno tenía que haber 0 + 2.700 − 1.000 = Bs 1.700', r.E.espAm===1700, r.E.espAm);
  chk('4c · cada cuenta = su saldo de «📒 Mayor y saldos» al cierre del día (Andrea 200, Fabián 2.000, Lucía 1.500)',
    r.E.filas.join()==='Andrea Orias:200,Fabián Godoy:2000,Lucia Prueba:1500' && r.mys['Andrea Orias']===200 && r.mys['Fabián Godoy']===2000 && r.mys['Lucia Prueba']===1500, [r.E.filas, r.mys]);
  chk('6a · lo que falta: el pago de Fabián sin foto y su venta sin factura/remisión (2); el del chofer se dice aparte, no en rojo',
    r.F.n===2 && r.F.sinComp.join()==='v6' && r.F.sinDoc.join()==='v6' && r.F.fuera===0 && r.F.chofer.join()==='v8', r.F);
  chk('6b · la pantalla lo dice: «2 · Cobros del día», «🚚 chofer: no está en esta caja», «Lo que falta» con «📎 1 pago sin comprobante» y «🧾 1 venta sin N° de factura o remisión»',
    /2 · Cobros del día/.test(r.txt) && /chofer: no está en esta caja/.test(r.txt) && /1 pago sin comprobante/.test(r.txt) && /1 venta sin N° de factura o remisión/.test(r.txt), (r.txt||'').slice(0,400));

  /* 4 · el arqueo */
  r = await ev(async () => {
    window._saves=[];
    var am=document.getElementById('cjt-arq-am'); am.value='1700'; am.dispatchEvent(new Event('change'));
    var pm=document.getElementById('cjt-arq-pm'); pm.value='3650'; pm.dispatchEvent(new Event('change'));
    await _esperar(1100);
    var D=cajaDatos('2026-11-14', 'Ventura Mall'), sv=_saves.filter(function(s){ return s.rec.id==='__caja_tienda__'; }), ult=sv[sv.length-1];
    var obj=ult ? JSON.parse(ult.rec.observaciones) : null;
    return { A:D.A, txt:_txt('#cjt-cuerpo'), n:sv.length, juntar:!!(ult && ult.opts && ult.opts.juntar), obj:obj, sist:esFilaSistema({ id:'__caja_tienda__' }), fuera:fueraDeConta({ id:'__caja_tienda__' }),
      cola:getPending().filter(function(p){ return p.id==='__caja_tienda__'; }).length };
  }); r=D0(r, { A:{}, obj:null });
  chk('4d · contado al cambio 1.700 = cuadra; contado al cerrar 3.650 → faltan Bs 50, en el turno tarde', r.A.am===1700 && r.A.difAm===0 && r.A.pm===3650 && r.A.difCierre===-50 && r.A.difPm===-50, r.A);
  chk('4e · la pantalla: «✓ cuadra» a la mañana y «falta Bs 50,00 · turno tarde»', /✓ cuadra/.test(r.txt) && /falta Bs 50,00 · turno tarde/.test(r.txt), (r.txt||'').match(/Contado al cambio[\s\S]{0,260}/));
  var dk=r.obj && r.obj.d && r.obj.d['2026-11-14|Ventura Mall'];
  chk('4f · se guarda en «__caja_tienda__» con juntar, en el JSON {v:1, d:{"2026-11-14|Ventura Mall":{am:{c,t,por}, pm:{…}}}}',
    r.n>=1 && r.juntar && r.obj && r.obj.v===1 && dk && dk.am && dk.am.c===1700 && dk.pm && dk.pm.c===3650 && typeof dk.am.t==='number' && 'por' in dk.am, r.obj);
  chk('4g · la fila es del sistema: no es una venta y no queda en la cola', r.sist && r.fuera && r.cola===0, r);

  /* 5 · QR contra el banco (el viernes) y la junta con otro aparato */
  console.log('── 5. QR contra el banco ──');
  r = await ev(async () => {
    window._saves=[];
    cajaAbrir('2026-11-13', 'Ventura Mall'); await _esperar(50);
    var D=cajaDatos('2026-11-13', 'Ventura Mall');
    var q=D.QR.map(function(b){ return b.banco+':'+b.L.map(function(c){ return c.p.id+'/'+c.monto; }).join(',')+':'+b.monto; });
    /* otro aparato ya tildó el de Ganadero en la planilla */
    var cBnb=D.QR.filter(function(b){ return b.banco==='Ganadero'; })[0].L[0], cBisa=D.QR.filter(function(b){ return b.banco==='BISA'; })[0].L[0];
    var otra={}; otra['2026-11-13|Ventura Mall']={ qr:{} }; otra['2026-11-13|Ventura Mall'].qr[cBnb.cid]=1;
    var prev=window._srv ? JSON.parse(window._srv.observaciones) : { v:1, d:{} }; Object.keys(otra).forEach(function(k){ prev.d[k]=otra[k]; });
    window._srv=filaSistema('__caja_tienda__', 'x', JSON.stringify(prev)); window._srv.rev=7;
    var box=[].slice.call(document.querySelectorAll('#cjt-cuerpo .cjt-tilde input'));
    var inp=box.filter(function(i){ return /5005/.test(i.closest('tr').textContent); })[0];
    inp.checked=true; inp.dispatchEvent(new Event('change'));
    await _esperar(1100);
    var sv=_saves.filter(function(s){ return s.rec.id==='__caja_tienda__'; }), ult=sv[sv.length-1], obj=JSON.parse(ult.rec.observaciones);
    var D2=cajaDatos('2026-11-13', 'Ventura Mall');
    return { q:q, nQr:D.nQr, qr:Object.keys(obj.d['2026-11-13|Ventura Mall'].qr||{}).sort(), cB:cBisa.cid, cN:cBnb.cid, rev:ult.rec.rev, am14:(obj.d['2026-11-14|Ventura Mall']||{}).am,
      tild:D2.nQrT, txt:_txt('#cjt-cuerpo') };
  }); r=D0(r, { q:[], qr:[] });
  chk('5a · QR por cuenta: BISA (el saldo de la OC de Fabián, 3.120) y Ganadero (2.580); la tarjeta no, y lo de Mia Plaza tampoco', r.q.join('|')==='BISA:v2/3120:3120|Ganadero:v3/2580:2580' && r.nQr===2, r.q);
  chk('5b · tildar «está en el extracto» relee la planilla: queda el de Ganadero que tildó otro aparato y el de BISA de acá, con el sello leído (7), y no se pierde el arqueo del 14',
    r.qr && r.qr.length===2 && r.qr.indexOf(r.cB)>=0 && r.qr.indexOf(r.cN)>=0 && r.rev===7 && r.am14 && r.am14.c===1700, r);
  chk('5c · la caja lo cuenta: «2 de 2 tildados»', r.tild===2 && /2 de 2 tildados/.test(r.txt), r.tild);

  /* 5d · un arqueo de acá que perdió contra uno más nuevo de otro aparato no se vuelve a mandar */
  r = await ev(async () => {
    var prev=JSON.parse(window._srv.observaciones); prev.d['2026-11-13|Ventura Mall'].pm={ c:999, t:Date.now()+60000, por:'Otro aparato' };
    window._srv=filaSistema('__caja_tienda__', 'x', JSON.stringify(prev)); window._srv.rev=11;
    cajaArqueoPoner('2026-11-13', 'Ventura Mall', 'pm', '1000');
    await _esperar(1100);
    var D=cajaDatos('2026-11-13', 'Ventura Mall');
    return { pm:D.A.pm, quedan:Object.keys(CAJA_CAMBIOS).filter(function(k){ return CAJA_CAMBIOS[k]; }).length, cola:getPending().filter(function(p){ return p.id==='__caja_tienda__'; }).length };
  }); r=D0(r, {});
  chk('5d · dos aparatos anotan lo contado a la vez: gana el más nuevo (999, «Otro aparato») y lo de acá sale de lo pendiente (nada en la cola)', r.pm===999 && r.quedan===0 && r.cola===0, r);

  /* 7 · cerrar, la contraseña, el Excel y el PDF */
  console.log('── 7. Cerrar la caja ──');
  r = await ev(async () => {
    UNLOCKED=false; CAJA_CLAVE_OK=false; window._descargas=[]; window._hojas=null; window._saves=[];
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(50);
    document.getElementById('cjt-cerrar').click();
    await _esperar(1100);
    var D=cajaDatos('2026-11-14', 'Ventura Mall'), obj=JSON.parse(window._srv.observaciones).d['2026-11-14|Ventura Mall'];
    var o={ cerrada:D.cerrada, cerr:obj.cerr, desc:window._descargas.slice(), hojas:(window._hojas||[]).map(function(h){ return h.name; }), txt:_txt('#cjt-cuerpo'),
      dis:!!(document.getElementById('cjt-arq-pm')||{}).disabled, qrDis:[].slice.call(document.querySelectorAll('#cjt-cuerpo .cjt-tilde input')).every(function(i){ return i.disabled; }) };
    o.bloq=cajaArqueoPoner('2026-11-14', 'Ventura Mall', 'pm', '3700');
    o.pmSigue=cajaDatos('2026-11-14', 'Ventura Mall').A.pm;
    cajaClaveProbar('mala'); o.mala=cajaClavePuede();
    cajaClaveProbar('clave-de-prueba'); o.buena=cajaClavePuede();
    o.disDespues=!!(document.getElementById('cjt-arq-pm')||{}).disabled;
    /* la plata del Excel: número y estilo 2; cada `s` es un índice de cellXfs */
    var H=window._hojas||[], plata=[], malS=[];
    H.forEach(function(h){ (h.matrix||[]).forEach(function(row){ (row||[]).forEach(function(cv){ if(cv && typeof cv==='object'){ if(cv.t==='n' && cv.s===2) plata.push(cv.v); if(cv.s!=null && !/^\d+$/.test(String(cv.s))) malS.push(cv.s); } }); }); });
    o.plata=plata.length; o.malS=malS;
    o.ventas=(H[0]||{ matrix:[] }).matrix.length; o.cobros=(H[1]||{ matrix:[] }).matrix.length;
    var cobH=(H[1]||{ matrix:[[]] }).matrix[0].map(function(c){ return c.v; });
    o.cobH=cobH; o.link=((H[1]||{ matrix:[] }).matrix.slice(1).map(function(rw){ return rw[cobH.indexOf('COMPROBANTE')]; }).filter(function(c){ return c && c.link; })[0]||{}).s;
    o.efe=(H[2]||{ matrix:[] }).matrix.map(function(rw){ return (rw||[]).map(function(c){ return (c && typeof c==='object') ? c.v : c; }).join('|'); });
    await cajaPdf('2026-11-14', 'Ventura Mall'); o.pdf=window._pdf;
    UNLOCKED=true;
    return o;
  }); r=D0(r, { desc:[], hojas:[], efe:[], malS:[1] });
  chk('7a · «🔒 Cerrar la caja de hoy» guarda la marca (cuándo y quién) y la caja dice «Cerrada»', r.cerrada===true && r.cerr && typeof r.cerr.t==='number' && 'por' in r.cerr && /Caja cerrada/.test(r.txt), r.cerr);
  chk('7b · al cerrar baja el Excel con las 4 hojas: Ventas, Cobros, Efectivo y QR por banco', r.desc.length===1 && /^caja-ventura-sur-2026-11-14\.xlsx$/.test(r.desc[0]) && r.hojas.join('|')==='Ventas|Cobros|Efectivo|QR por banco', [r.desc, r.hojas]);
  chk('7c · cerrada y sin contraseña: lo contado y los tildes no se pueden tocar (los campos apagados; anotar no cambia nada)', r.dis===true && r.qrDis===true && r.bloq===false && r.pmSigue===3650, r);
  chk('7d · la contraseña de Administración lo abre (una mala, no)', r.mala===false && r.buena===true && r.disDespues===false, r);
  chk('7e · el Excel: la plata es número con el estilo 2, y ningún estilo que no sea un índice', r.plata>20 && r.malS.length===0, [r.plata, r.malS]);
  chk('7f · Ventas trae las 3 del día; Cobros los 4 con «COMPROBANTE» como enlace (estilo 28)', r.ventas===4 && r.cobros===5 && r.cobH.indexOf('COMPROBANTE')>=0 && r.link===28, [r.ventas, r.cobros, r.link]);
  chk('7g · Efectivo dice debe haber 3.700, el arqueo de los dos turnos y la diferencia del turno tarde (−50)',
    r.efe.some(function(t){ return /^= DEBE HABER EN LA CAJA\|3700$/.test(t); }) && r.efe.some(function(t){ return /^Al cambio de turno \(15:00\)\|1700\|1700\|0\|/.test(t); }) && r.efe.some(function(t){ return /^Diferencia del turno tarde\|\|\|-50/.test(t); }), r.efe);
  chk('7h · el PDF: hojas A4 de los informes, con las firmas «Entregó · vendedor del turno tarde» y «Recibió · Contabilidad»',
    r.pdf && r.pdf.n>=3 && r.pdf.nombre==='caja-ventura-sur-2026-11-14.pdf' && /Entregó · vendedor del turno tarde/.test(r.pdf.txt) && /Recibió · Contabilidad/.test(r.pdf.txt) && /Fabián Godoy/.test(r.pdf.txt), r.pdf && [r.pdf.n, r.pdf.nombre]);

  /* 8 · la suma de las cajas de todos los días = el Cuadre del mes de la tienda */
  console.log('── 8. Las cajas del mes = el Cuadre del mes ──');
  r = await ev(async () => {
    var T='Ventura Mall', gente=['Andrea Orias','Fabián Godoy','Lucia Prueba','Rodrigo Prueba'], esDe=function(v){ return gente.some(function(g){ return mismoVendedor(g, v); }); };
    var S={ cob:0, forma:{}, efeCob:0, ret:0, ventas:0, n:0 }, ult=null;
    for(var d='2026-11-01'; d<='2026-11-14'; d=stockSumarDias(d, 1)){
      var D=cajaDatos(d, T);
      S.cob=r2(S.cob+D.totCob); D.formas.forEach(function(f){ S.forma[f.forma]=r2((S.forma[f.forma]||0)+f.monto); });
      S.efeCob=r2(S.efeCob+D.E.cob); S.ret=r2(S.ret+D.E.ret); S.ventas=r2(S.ventas+D.V.total); S.n+=D.V.n; ult=D;
    }
    var pe={ modo:'mes', val:'2026-11' }, M={ cob:0, forma:{}, efeCob:0, ret:0 };
    cuadrePagos(pe, '').forEach(function(c){ if(!esDe(c.p.vendedor)) return; M.cob=r2(M.cob+c.monto); var k=cuadreForma(c); M.forma[k]=r2((M.forma[k]||0)+c.monto); });
    cuadreEfectivo(pe, '').filas.forEach(function(o){ if(!esDe(o.nombre)) return; M.efeCob=r2(M.efeCob+o.cobrado); M.ret=r2(M.ret+o.ret); });
    var mys=0; mysSaldos('2026-11-14').filas.forEach(function(f){ if(esDe(f.nombre)) mys=r2(mys+f.saldo); });
    showView('conta'); await _esperar(100); segSet('cta-mode','mes'); document.getElementById('cta-mes').value='2026-11'; document.getElementById('cta-vendedor').value=''; document.getElementById('cta-search').value='';
    var ven=0, nv=0; contaLista().forEach(function(p){ if(esDe(p.vendedor)){ ven=r2(ven+ventaTotal(p)); nv++; } });
    return { S:S, M:M, mys:mys, debeUlt:ult.E.debe, ven:ven, nv:nv };
  }); r=D0(r, { S:{ forma:{} }, M:{ forma:{} } });
  chk('8a · los cobros: Σ de las cajas del 01 al 14/11 = el Cuadre de noviembre de la gente de la tienda (Bs 24.355)', r.S.cob===r.M.cob && r.M.cob===24355, [r.S.cob, r.M.cob]);
  chk('8b · …y forma por forma (Efectivo, QR BISA, QR Ganadero, QR Económico, Tarjeta BISA)', JSON.stringify(Object.keys(r.S.forma).sort().map(function(k){ return [k, r.S.forma[k]]; }))===JSON.stringify(Object.keys(r.M.forma).sort().map(function(k){ return [k, r.M.forma[k]]; })) && Object.keys(r.M.forma).length===5, [r.S.forma, r.M.forma]);
  chk('8c · el efectivo cobrado (Bs 7.700) y lo retirado (Bs 4.000) = «Efectivo cobrado vs. retirado» del Cuadre', r.S.efeCob===r.M.efeCob && r.M.efeCob===7700 && r.S.ret===r.M.ret && r.M.ret===4000, [r.S, r.M]);
  chk('8d · lo que debe haber el último día (Bs 3.700) = los saldos de «📒 Mayor y saldos» de la gente de la tienda', r.debeUlt===r.mys && r.mys===3700, [r.debeUlt, r.mys]);
  chk('8e · las ventas: Σ de las cajas = Contabilidad → Ventas de noviembre por ingreso de esa gente (Bs 29.145, 8 ventas)', r.S.ventas===r.ven && r.ven===29145 && r.S.n===r.nv && r.nv===8, [r.S.ventas, r.ven, r.S.n, r.nv]);

  /* 9 · la meta de la tienda y el contador de la gente */
  console.log('── 9. La meta de la tienda y el contador ──');
  r = await ev(async () => {
    var D=cajaDatos('2026-11-14', 'Ventura Mall'), MT=metaDiaTienda('Ventura Mall', '2026-11-14'), suma=0, sumaHoy=0, sumaMin=0;
    Object.keys(MT.porVend).forEach(function(v){ var m=MT.porVend[v]; suma+=m.meta; sumaMin+=m.minima; sumaHoy=r2(sumaHoy+m.lleva); });
    var uno=metaDiaDatos('Andrea Orias', '2026-11-14'), dos=metaDiaDatos('Fabián Godoy', '2026-11-14');
    var otraT=metaDiaTienda('Mutualista', '2026-11-14');
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(30);
    var sin=_txt('#cjt-cuerpo');
    window.mallResumenDia=function(dia, t){ return dia==='2026-11-14' && t==='Ventura Mall' ? { horas:[{ h:17, atendidas:8, compraron:1 }, { h:18, atendidas:12, compraron:3 }], vendedores:[{ vendedor:'Andrea Orias', atendidas:5, compraron:2 }] } : null; };
    cajaPintar(); var con=_txt('#cjt-cuerpo'); var M2=cajaDatos('2026-11-14', 'Ventura Mall').mall;
    delete window.mallResumenDia;
    return { vend:Object.keys(MT.porVend), meta:MT.meta, minima:MT.minima, suma:suma, sumaMin:sumaMin, hoy:MT.lleva, sumaHoy:sumaHoy, a:uno && uno.pres.dia, f:dos && dos.pres.dia,
      aMin:uno && uno.min.dia, fMin:dos && dos.min.dia, aHoy:uno && uno.hoy, fHoy:dos && dos.hoy, igual:JSON.stringify(D.MT)===JSON.stringify(MT), otraT:otraT, sin:sin, con:con, M2:M2 };
  }); r=D0(r, { vend:[] });
  chk('9a · `metaDiaTienda` (la que lee «el mall en vivo»): la meta de la tienda = la suma de la de sus vendedores con metas (Andrea y Fabián), con la mínima y lo que lleva cada uno',
    r.vend.join()==='Andrea Orias,Fabián Godoy' && r.meta===r.suma && r.meta===r.a+r.f && r.meta>0 && r.minima===r.sumaMin && r.minima===r.aMin+r.fMin && r.hoy===r.sumaHoy && r.hoy===r.aHoy+r.fHoy && r.igual===true, r);
  chk('9a2 · una tienda sin nadie con metas guardadas: null', r.otraT===null, r.otraT);
  chk('9b · la caja lo muestra: «🎯 La meta de hoy de la tienda» con cada uno', /La meta de hoy de la tienda/.test(r.sin) && /Andrea Orias/.test(r.sin), (r.sin||'').match(/La meta de hoy[\s\S]{0,200}/));
  chk('9c · sin `mallResumenDia` no sale la gente atendida; con él, sale por hora y por vendedor', !/La gente que se atendió/.test(r.sin) && /La gente que se atendió/.test(r.con) && r.M2 && r.M2.horas.length===2 && r.M2.vend[0].v==='Andrea Orias' && r.M2.vend[0].c===2, r.M2);

  /* el resumen del día para leer de afuera (`cajaResumenDia`, el que lee «el mall en vivo») */
  r = await ev(async () => {
    var R=cajaResumenDia('Ventura Mall', '2026-11-14'), D=cajaDatos('2026-11-14', 'Ventura Mall');
    var R2=cajaResumenDia('Ventura Mall', '2026-11-13');
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(30);
    return { R:R, R2:R2, debe:D.E.debe, falt:D.F.n, kpi:_txt('#cjt-cuerpo .cjt-kpis') };
  }); r=D0(r, { R:{} });
  chk('9e · `cajaResumenDia(tienda, día)`: ventas 7.200, cobrado 5.200, efectivo cobrado 4.700, retirado 1.000, quedó de ayer 0, debe haber 3.700, contado 1.700 / 3.650, dif −50, cerrada, 2 en rojo',
    r.R.ventas===7200 && r.R.cobrado===5200 && r.R.efectivoCobrado===4700 && r.R.retirado===1000 && r.R.quedoAyer===0 && r.R.debeHaber===3700 && r.R.contadoAm===1700 && r.R.contadoPm===3650
    && r.R.dif===-50 && r.R.cerrada===true && r.R.faltan===2 && r.R.debeHaber===r.debe && r.R.faltan===r.falt, r.R);
  chk('9f · los números de arriba de la caja salen de ese resumen; el viernes: quedó 3.000 de ayer y se retiraron 3.000', /Bs 7\.200,00/.test(r.kpi) && /Bs 5\.200,00/.test(r.kpi) && /Bs 3\.700,00/.test(r.kpi) && r.R2 && r.R2.quedoAyer===3000 && r.R2.retirado===3000 && r.R2.debeHaber===0 && r.R2.cerrada===false, [r.kpi, r.R2]);

  /* el volver desde una venta */
  r = await ev(async () => {
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(30);
    var fila=[].slice.call(document.querySelectorAll('#cjt-cuerpo tr[onclick]')).filter(function(t){ return /11-30/.test(t.textContent); })[0];
    if(fila) fila.click(); await _esperar(50);
    var b=document.getElementById('pc-volver'), t=b ? b.textContent : '';
    if(b) b.click(); await _esperar(50);
    return { t:t, vuelve:!!document.getElementById('cjt-cuerpo') };
  }); r=D0(r, {});
  chk('9d · una venta se abre en su ficha de Contabilidad con «← Volver a la caja de Ventura Sur», que vuelve', /Volver a la caja de Ventura Sur/.test(r.t) && r.vuelve===true, r);

  /* 11 · la revisión del 14/11: el teclado y el clic, el servidor de antes, el aparato y el efectivo de ventas de otra tienda */
  console.log('── 11. La revisión del 14/11 ──');
  /* 11a-b · el jueves 12 (abierto): teclear lo contado, Tab al campo siguiente, el guardado que vuelve, y el clic de verdad en «Cerrar» */
  await ev(async () => { closeModal(); await _esperar(50); window._saves=[]; cajaAbrir('2026-11-12', 'Ventura Mall'); await _esperar(80); });
  await page.click('#cjt-arq-am'); await page.keyboard.type('0'); await page.keyboard.press('Tab'); await page.waitForTimeout(60);
  r = await ev(() => { var pm=document.getElementById('cjt-arq-pm'); if(pm) pm._antes=1; return { foco:(document.activeElement||{}).id||'', anot:_txt('#cjt-anot-am'), dif:_txt('#cjt-dif-am') }; }); r=D0(r, {});
  await page.keyboard.type('30');
  await page.waitForTimeout(1300);   // el guardado del «0» vuelve del servidor y la ventana se repinta
  let r2 = await ev(() => { var pm=document.getElementById('cjt-arq-pm'), ae=document.activeElement;
    return { otro:!!pm && !pm._antes, foco:(ae||{}).id||'', v:pm && pm.value, s:pm && pm.selectionStart, saves:_saves.filter(function(s){ return s.rec.id==='__caja_tienda__'; }).length }; }); r2=D0(r2, {});
  chk('11a · Tab desde «contado al cambio de turno» lleva a «contado al cerrar» (no se pierde el foco) y la diferencia de la mañana ya dice «✓ cuadra» con su «anotado»',
    r.foco==='cjt-arq-pm' && /✓ cuadra/.test(r.dif) && /^anotado/.test(r.anot), r);
  chk('11a2 · el guardado vuelve y repinta la ventana (otro campo) con el cursor y lo que se estaba tecleando en su lugar («30», al final)',
    r2.otro===true && r2.saves>=1 && r2.foco==='cjt-arq-pm' && r2.v==='30' && r2.s===2, r2);
  await page.keyboard.type('00');
  let clicOk=true; try{ await page.click('#cjt-cerrar', { timeout:3000 }); }catch(e){ clicOk=String(e.message).slice(0,120); }
  await page.waitForTimeout(300);
  r = await ev(() => { var D=cajaDatos('2026-11-12', 'Ventura Mall'); return { cerrada:D.cerrada, am:D.A.am, pm:D.A.pm, dif:D.A.difCierre }; }); r=D0(r, {});
  chk('11b · el primer clic en «🔒 Cerrar la caja» con lo contado recién tecleado cierra (y guarda 0 a la mañana y 3.000 al cerrar, que cuadran)',
    clicOk===true && r.cerrada===true && r.am===0 && r.pm===3000 && r.dif===0, [clicOk, r]);
  /* 11c · el miércoles 11 (abierto): el ratón apretado un rato sobre el borde de arriba del botón, como una persona */
  await page.waitForTimeout(1200);   // que vuelva el guardado del cierre de arriba (repinta la ventana)
  await ev(async () => { cajaAbrir('2026-11-11', 'Ventura Mall'); await _esperar(80); });
  await page.click('#cjt-arq-pm'); await page.keyboard.type('0');
  await page.locator('#cjt-cerrar').scrollIntoViewIfNeeded();
  const bb = await page.locator('#cjt-cerrar').boundingBox();
  await page.mouse.move(bb.x+bb.width/2, bb.y+3); await page.mouse.down(); await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(300);
  r = await ev(() => { var D=cajaDatos('2026-11-11', 'Ventura Mall'); return { cerrada:D.cerrada, pm:D.A.pm, anot:_txt('#cjt-cuerpo') }; }); r=D0(r, {});
  chk('11c · apretado 250 ms sobre el borde de arriba del botón: el «anotado» que aparece no corre el botón entre apretar y soltar, y la caja se cierra',
    r.cerrada===true && r.pm===0, { cerrada:r.cerrada, pm:r.pm });

  /* 11d-e · con el servidor de antes de la 14-b: se ve, pero no se guarda nada (tampoco lo que quedó en la cola) */
  await page.waitForTimeout(1200);   // que salga el guardado del cierre de 11c (con el servidor de antes ya no saldría: quedaría en la cola)
  r = await ev(async () => {
    window._saves=[]; SERVER_VER='2026-11-14-a';
    cajaAbrir('2026-11-10', 'Ventura Mall'); await _esperar(80);
    var dis=function(sel){ var L=[].slice.call(document.querySelectorAll(sel)); return L.length>0 && L.every(function(i){ return i.disabled; }); };
    var o={ aviso:_txt('#cjt-srv'), campos:dis('#cjt-arq-am, #cjt-arq-pm'), qr:dis('#cjt-cuerpo .cjt-tilde input'), cerrar:dis('#cjt-cerrar'), excel:/Excel/.test(_txt('#cjt-cuerpo .cjt-acc')) };
    o.arq=cajaArqueoPoner('2026-11-10', 'Ventura Mall', 'pm', '5');
    var D=cajaDatos('2026-11-10', 'Ventura Mall'), c=D.QR[0] && D.QR[0].L[0];
    if(c) cajaQrTildar('2026-11-10', 'Ventura Mall', c.cid, true);
    cajaCerrar('2026-11-10', 'Ventura Mall');
    await _esperar(1100);
    var D2=cajaDatos('2026-11-10', 'Ventura Mall'), sv=function(){ return _saves.filter(function(s){ return s.rec.id==='__caja_tienda__'; }).length; };
    o.saves=sv(); o.pm=D2.A.pm; o.tild=D2.nQrT; o.cerrada=D2.cerrada; o.cola0=getPending().filter(function(p){ return p.id==='__caja_tienda__'; }).length;
    /* lo anotado sin conexión (todavía no se sabía qué servidor era) queda en la cola: no sale hacia uno de antes, sí hacia la 14-b */
    SERVER_VER='';
    CAJA_CAMBIOS[cajaK(cajaDk('2026-11-10', 'Ventura Mall'), 'pm', [7, Date.now(), 'Prueba'])]=true; CAJA_VER++;
    reescritaEncolar(cajaFilaArmar(), CAJA_CAMBIOS);
    SERVER_VER='2026-11-14-a'; await flushPending();
    o.saves2=sv(); o.cola=getPending().filter(function(p){ return p.id==='__caja_tienda__'; }).length;
    SERVER_VER='2026-11-14-b'; await flushPending();
    o.saves3=sv(); o.cola3=getPending().filter(function(p){ return p.id==='__caja_tienda__'; }).length; o.pm3=cajaDatos('2026-11-10', 'Ventura Mall').A.pm;
    o.ver=(function(){ var x=window._srv && JSON.parse(window._srv.observaciones).d['2026-11-10|Ventura Mall']; return x && x.pm ? x.pm.c : null; })();
    SERVER_VER='';
    return o;
  }); r=D0(r, {});
  chk('11d · servidor 2026-11-14-a: la caja lo dice arriba, y lo contado, los tildes y «Cerrar» quedan apagados (el Excel sigue)',
    /necesita el servidor 2026-11-14-b/.test(r.aviso) && r.campos===true && r.qr===true && r.cerrar===true && r.excel===true, r);
  chk('11d2 · …y aunque se llame igual, no anota ni manda nada: ni lo contado, ni el tilde del QR, ni el cierre (nada en la cola)',
    r.arq===false && r.saves===0 && r.pm==null && r.tild===0 && r.cerrada===false && r.cola0===0, r);
  chk('11e · lo que quedó en la cola sin conexión no sale hacia el servidor de antes (sigue esperando); con la 14-b sale con sello y la cola se vacía',
    r.saves2===0 && r.cola===1 && r.saves3===1 && r.cola3===0 && r.pm3===7 && r.ver===7, r);

  /* 11f · los dos interruptores del aparato del mall (`me_mall_aparato`) se avisan */
  r = await ev(async () => {
    try{ localStorage.removeItem('me_mall_aparato'); }catch(e){}
    closeModal(); await _esperar(30); mallAparatoBtn(); cajaBotonesPintar();
    var btn=function(){ var b=document.getElementById('mall-ap-btn'); return b ? b.textContent+'|'+b.getAttribute('aria-pressed') : ''; }, caja=function(){ return (document.getElementById('cjt-btns')||{}).textContent||''; };
    var o={ b0:btn(), c0:caja() };
    cajaAparatoPoner(true); o.b1=btn(); o.c1=caja();
    cajaAparatoPoner(false); o.b2=btn(); o.c2=caja();
    mallAparatoCambiar(); o.c3=caja();
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(50);
    var cb=function(){ var i=document.querySelector('#cjt-cuerpo .cjt-aparato input'); return i ? i.checked : null; };
    o.k3=cb(); mallAparatoCambiar(); o.k4=cb(); o.c4=caja(); mallAparatoCambiar(); o.k5=cb();
    try{ localStorage.removeItem('me_mall_aparato'); }catch(e){}
    closeModal(); await _esperar(30);
    return o;
  }); r=D0(r, {});
  chk('11f · la casilla de la caja («Este aparato es la compu de Ventura Sur») cambia ahora el botón de Herramientas «🏬 Esta compu es la del mall»',
    /^🏬 Esta compu es la del mall\|false$/.test(r.b0) && /^🏬 ✓ Esta compu es la del mall\|true$/.test(r.b1) && /^🏬 Esta compu es la del mall\|false$/.test(r.b2), r);
  chk('11f2 · y el botón de Herramientas cambia el de la caja («Caja de hoy») y la casilla de la ventana abierta',
    /Caja de Ventura Sur/.test(r.c0) && /Caja de hoy/.test(r.c1) && /Caja de Ventura Sur/.test(r.c2) && /Caja de hoy/.test(r.c3) && r.k3===true && r.k4===false && /Caja de Ventura Sur/.test(r.c4) && r.k5===true, r);

  /* 11g · el efectivo que recibió alguien del mall por una venta de OTRA tienda (Andrea cargó una venta de tienda que «salió» de Central y
     cobró ella: la venta y el cobro son de Central, la plata está en su mano): aparte en la sección del efectivo, sin cambiar ningún total */
  r = await ev(async () => {
    var x=JSON.parse(JSON.stringify(window._BASE.filter(function(p){ return p.id==='o1'; })[0]));
    x.id='x1'; x.oc='11-399'; x.cliente='CLIENTE AJENO'; x.vendedor='Andrea Orias'; x.productos[0].precio=800; x.ts=new Date('2026-11-14T12:00:00-04:00').getTime();
    x.metodoPago=textoCobros([{ metodo:'Efectivo', monto:800, fecha:'2026-11-14', nota:'6100', comps:['IMG6100'] }]);
    window._BASE.push(x); await _cargar();
    var D=cajaDatos('2026-11-14', 'Ventura Mall');
    cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(60);
    var o={ aj:(D.E.ajenos||[]).map(function(z){ return z.p.cliente+'|'+z.tiendaTxt+'|'+z.quien+'|'+z.monto+'|'+z.h; }), ajeno:D.E.ajeno, cob:D.E.cob, debe:D.E.debe, totCob:D.totCob, nCob:D.cobros.length,
      enCobros:D.cobros.some(function(c){ return c.p.id==='x1'; }), tit:_txt('#cjt-ajenos-t'), fila:_txt('#cjt-ajenos tbody tr'), falta:D.F.n };
    window._hojas=null; cajaExcel('2026-11-14', 'Ventura Mall');
    o.xls=((window._hojas||[])[2]||{ matrix:[] }).matrix.map(function(rw){ return (rw||[]).map(function(c){ return (c && typeof c==='object') ? c.v : c; }).join('|'); }).filter(function(t){ return /OTRA TIENDA|CLIENTE AJENO/.test(t); });
    await cajaPdf('2026-11-14', 'Ventura Mall'); o.pdf=window._pdf && window._pdf.txt;
    var mys=0; mysSaldos('2026-11-14').filas.forEach(function(f){ if(f.nombre==='Andrea Orias') mys=f.saldo; }); o.mysA=mys;
    o.debeA=(D.E.filas.filter(function(f){ return f.nombre==='Andrea Orias'; })[0]||{}).debe;
    return o;
  }); r=D0(r, { aj:[], xls:[] });
  chk('11g · el efectivo de una venta de tienda de Central que cobró Andrea (Bs 800, 12:00): en «De ventas de otra tienda», con el cliente y de qué tienda es la venta',
    r.aj.join()==='CLIENTE AJENO|Central|Andrea Orias|800|12:00' && r.ajeno===800 && /De ventas de otra tienda · 1 · Bs 800,00/.test(r.tit) && /CLIENTE AJENO/.test(r.fila) && /Central/.test(r.fila) && /Andrea Orias/.test(r.fila), r);
  chk('11g2 · ningún total cambia de regla: los cobros siguen siendo los 4 de la tienda (Bs 5.200) y el efectivo cobrado y lo que debe haber lo incluyen (5.500 y 4.500, = «Mayor y saldos»)',
    r.enCobros===false && r.nCob===4 && r.totCob===5200 && r.cob===5500 && r.debe===4500 && r.debeA===r.mysA && r.mysA===1000 && r.falta===2, r);
  chk('11g3 · el Excel (hoja Efectivo) y el PDF lo dicen', r.xls.length===2 && /DE VENTAS DE OTRA TIENDA/.test(r.xls[0]) && /^Efectivo\|12:00\|CLIENTE AJENO\|11-399\|Central\|Andrea Orias\|800$/.test(r.xls[1]) && /de ventas de otra tienda: 1/.test(r.pdf||''), [r.xls, (r.pdf||'').match(/Cobrado hoy[\s\S]{0,120}/)]);

  if(SALIDA){ await page.setViewportSize({ width:1280, height:3000 }); await ev(async () => { cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(120); }); await page.screenshot({ path:path.join(SALIDA, 'mall_caja_1280.png'), fullPage:false }); await page.setViewportSize({ width:1280, height:900 }); }

  /* 10 · el celular */
  await ctx.close();
  ({ ctx, page } = await abrir(390));
  r = await page.evaluate(async () => { cajaAbrir('2026-11-14', 'Ventura Mall'); await _esperar(80);
    var anchas=[].slice.call(document.querySelectorAll('#cjt-cuerpo .cjt-sec')).filter(function(e){ return e.scrollWidth>e.clientWidth+1; }).map(function(e){ return (e.querySelector('h4')||{}).textContent; });
    return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, ok:!!document.getElementById('cjt-cuerpo'), anchas:anchas }; });
  chk('10 · en el celular (390 px) la caja no ensancha la página, y ninguna parte se sale de su recuadro (las tablas se corren adentro)', r.ok && r.sw<=r.iw && r.anchas.length===0, r);
  if(SALIDA){ await page.setViewportSize({ width:390, height:3600 }); await page.waitForTimeout(150); await page.screenshot({ path:path.join(SALIDA, 'mall_caja_390.png'), fullPage:false }); }

  chk('sin errores de JS', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
