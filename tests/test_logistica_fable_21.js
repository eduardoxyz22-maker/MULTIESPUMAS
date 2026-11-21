/* 🔎 (21/11) LO QUE ENCONTRÓ LA REVISIÓN DE LOGÍSTICA DE FABLE, ARREGLADO.
   1. «🚚 Salió el <camión>» venía con el RECOJO de una ATC tildado: un toque lo dejaba «✓ Recogido» aunque el cliente no estuviera
      (dueño, 19/11: «logística debe marcar recogido»). Ahora el recojo va sin tildar y, si se tilda, el resultado ofrece programar la devolución.
   2. 📅 Reprogramar un pedido con ✅ a la TARDE del mismo día lo dejaba ✅ (y fuera del cierre). Ahora pierde el ✅, como al pasarlo a otro día.
   Se corre: node tests/test_logistica_fable_21.js  ·  contra otra página: PEDIDOS=… */
'use strict';
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS = 0, FAIL = 0;
const chk = (n, ok, d) => { if (ok) { PASS++; console.log('✓ ' + n); } else { FAIL++; console.log('✗ ' + n + (d !== undefined ? ' · ' + JSON.stringify(d).slice(0, 500) : '')); } };
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window._k=function(cod, d, m){ return stockInfo({ codigo:cod, desc:d, medida:m }).k; };
  /* El stock base: los tres Excel de HOY a las 08:00 (antes de que salga el camión), sin nada más. */
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
  window._ts=function(f, h){ return new Date(f+'T'+h+'-04:00').getTime(); };
}

async function abrir(cuando){
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errores=[];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date(cuando));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  return { browser, page, errores };
}
(async () => {
  /* 1 · Salió el Carry con una entrega y el recojo de una ATC (lunes 23/11, regla nueva) */
  let A = await abrir('2026-11-23T09:10:00-04:00');
  const r1 = await A.page.evaluate(async () => {
    window.SALIO_PRUEBA = true;
    var hoy = todayStr(), L = function (c) { return { codigo:'CH1220', desc:'TITANIO ICE', medida:'140x190', cant:c, precio:1000, chk:'ok' }; };
    var V = _ped('p-001', hoy, [L(1)], { vehiculo:'Carry', chofer:'Omar', oc:'11-301' });
    var T = _ped('p-002', hoy, [], { vehiculo:'Carry', chofer:'Omar', oc:'ATC 11-009', cliente:'CLIENTE ATC RECOJO',
      productos:[{ codigo:'CH1220', desc:'TITANIO ICE', medida:'140x190', cant:1, atc:{ tipo:'gar', motivo:'Hundimiento', det:'se hundió del lado derecho', compra:'2026-05-02', rec:['colchon'] } }] });
    await _cargar([V, T], _stock());
    guardarDurable = function (p) { return Promise.resolve({ ok:true, pedido:p }); };
    refrescarEstadoYa = function () { return Promise.resolve(true); };
    salioAbrir('Carry', 'AM');
    var tild = salioTildados().slice(), html = (document.getElementById('modal-box') || {}).innerText || '';
    salioTildar('p-002', true);
    await salioConfirmar(); await new Promise(function (r) { setTimeout(r, 300); });
    var q = findById('p-002');
    return { tild:tild, aviso:/recojo · tildalo si lo recogió/.test(html), recogida:q.entregado, modal:((document.getElementById('modal-box') || {}).innerText || '').slice(0, 600),
             boton:!!document.querySelector('#modal-box button[onclick*="abrirProgramarDevAtc"]') };
  });
  chk('⚠️ 1a · «Salió el Carry» trae tildada la entrega pero NO el recojo de la ATC', r1.tild.length === 1 && r1.tild[0] === 'p-001', r1.tild);
  chk('1b · el recojo dice «tildalo si lo recogió»', r1.aviso);
  chk('1c · tildado a mano queda «✓ Recogido» y el resultado ofrece «🔁 Programar devolución»', r1.recogida === true && r1.boton && /falta programar la devolución/.test(r1.modal), r1.modal);
  chk('sin errores (1)', !A.errores.length, A.errores);
  await A.browser.close();

  /* 2 · Reprogramar un pedido con ✅ (miércoles 18/11, 11:00) */
  A = await abrir('2026-11-18T11:00:00-04:00');
  const r2 = await A.page.evaluate(async () => {
    var hoy = todayStr(), L = function () { return { codigo:'CH1220', desc:'TITANIO ICE', medida:'140x190', cant:1, precio:1000, chk:'ok', eF:hoy, eT:Date.now(), eQ:'Ernesto' }; };
    var mk = function (id, t) { return _ped(id, hoy, [L()], { vehiculo:'Carry', chofer:'Omar', entregado:true, turno:t || 'AM' }); };
    await _cargar([mk('p-001'), mk('p-002'), mk('p-003'), mk('p-004', 'PM')], _stock());
    persistPedido = function (p) { return Promise.resolve({ ok:true, pedido:p }); };
    var out = {};
    var a = findById('p-001'); await reproAplicar(a, stockSumarDias(hoy, 1), 'AM'); out.otroDia = a.entregado;
    var b = findById('p-002'); await reproAplicar(b, hoy, 'PM'); out.tarde = { e:b.entregado, eF:b.productos[0].eF || '', cierre:cierreEntHoy(hoy).some(function (p) { return p.id === 'p-002'; }) };
    var c = findById('p-003'); await reproAplicar(c, stockSumarDias(hoy, -1), 'AM'); out.pasado = c.entregado;
    var d = findById('p-004'); await reproAplicar(d, hoy, 'AM'); out.manana = d.entregado;
    out.fn = { amPm:entregadoSeMueve(mk('x'), hoy, null, 'PM'), pmAm:entregadoSeMueve(mk('y', 'PM'), hoy, null, 'AM'), sinTurno:entregadoSeMueve(mk('z'), hoy) };
    return out;
  });
  chk('2a · a otro día pierde el ✅ (como siempre)', r2.otroDia === false, r2);
  chk('⚠️ 2b · a la TARDE del mismo día pierde el ✅ y su registro, y vuelve al cierre de hoy', r2.tarde.e === false && r2.tarde.eF === '' && r2.tarde.cierre, r2.tarde);
  chk('2c · a un día que ya pasó queda ✅ (corregir el registro)', r2.pasado === true, r2);
  chk('2d · de la tarde a la MAÑANA del mismo día queda ✅ (salió antes)', r2.manana === true, r2);
  chk('2e · entregadoSeMueve: mañana → tarde sí, tarde → mañana no, sin turno como antes', r2.fn.amPm === true && r2.fn.pmAm === false && r2.fn.sinTurno === false, r2.fn);
  chk('sin errores (2)', !A.errores.length, A.errores);
  await A.browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
