/* 💬 BLOKI CONTESTA MÁS, CON LOS NÚMEROS DEL PANEL (07/11, idea 9; dueño: «Idea 9 todas de Bloki»). Siete grupos de preguntas nuevas, cada
   una con una cuenta que el panel YA tiene (nada aparte, no gasta IA):
   1. 📈 Mis ventas: hoy / la semana / el mes (Proyección: `pryVentas`), contra el mes pasado a esta altura, la meta (de la vendedora y de la
      marca), la venta más grande y el ranking (solo con la contraseña).
   2. 💵 Cobranza: quiénes deben (`contaFaltaCobrar`, primero lo entregado), el efectivo sin rendir (= `misEfectivoDatos`), los avisos de
      Contabilidad (`ctaAvAbiertos`) y lo que no tiene N° de factura o remisión (`docVentaFalta`).
   3. 📋 Mis pedidos: sin stock (`semanaLinea`), sin camión o ubicación, «¿cuándo llega el pedido de…?» (fecha, camión, salió, GPS) y las
      entregas de la semana que viene.
   4. 🛏️ Productos: a cuánto se vende (lo cobrado de verdad: típico, más bajo, más alto), en qué medidas existe, lo más vendido.
   5. 🚚 Logística: qué falta cargar y en qué camión (`cargaVivaDatos`), qué recoger de Moreno (`admLugaresDatos`), qué falta tildar en el
      cierre y dónde está un camión (GPS).
   6. 📋 «¿Qué me falta hacer?»: el MISMO «Para hacer» de su pestaña (vendedora, logística, Contabilidad) con un botón por renglón.
   7. 💬 El mensaje al cliente: el texto (saldo con lo que dice Contabilidad, entrega con `nxMsgCliente`) y el botón de WhatsApp; Bloki no
      manda nada; si lo escrito no coincide con el pedido, usa lo del pedido y lo dice.
   🔒 Logística SIN la contraseña no ve plata (ventas, deudas, efectivo, el mensaje del saldo); entregas, carga, GPS y productos, sí. Una
   vendedora ve lo suyo. Lo que ya contestaba (stock, cupos, entregas, saldo de un cliente, códigos) sigue igual.
   Datos SINTÉTICOS. Reloj clavado el martes 10/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_bloki_mas.js   (desde la raíz del repo; PEDIDOS=<otro html> para los dientes) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._saves=[];
  apiSave=function(p){ var r=JSON.parse(JSON.stringify(p)); window._saves.push(r); return Promise.resolve({ ok:true, pedido:r }); };
  window._posts=[]; apiPost=function(p){ window._posts.push(p && p.action); return Promise.resolve({ ok:true }); };
  try{ ['me_asis_vistos','me_asis_mudo','me_asis_tour','me_asis_preg','me_quien_rol'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
  try{ localStorage.setItem('me_asis_tour','1'); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); }catch(e){}
  window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._ts=function(iso){ return new Date(iso+'-04:00').getTime(); };
  var n=0;
  window.V=function(o){ n++; return Object.assign({ id:'k'+n, oc:'11-'+(100+n), nota:String(900+n), vendedor:'Mirian Salazar', cliente:'CLIENTE '+n, fecha:'2026-11-11', turno:'AM',
    productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:2000, fdoc:'F', fdocn:'5'+n }], saldo:0, acuenta:0, pagado:true, metodoPago:'QR BISA 2000 @2026-11-02 #'+n,
    entregado:false, ts:_ts('2026-11-02T10:00:00'), fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'7'+String(1000000+n), zona:'Norte', nroDia:n }, o); };
  var ICE=function(c, pr, doc){ return { desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220', cant:c, precio:pr, fdoc:doc?'F':undefined, fdocn:doc?'77':undefined }; };
  window.FIX=function(){ n=0;
    return [
      /* MIRIAN (Heaven): octubre */
      V({ id:'oct1', oc:'10-010', cliente:'OCT UNO', fecha:'2026-10-05', entregado:true, ts:_ts('2026-10-02T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:5000 }], metodoPago:'QR BISA 5000 @2026-10-02 #10' }),
      V({ id:'oct2', oc:'10-020', cliente:'OCT DOS', fecha:'2026-10-20', entregado:true, ts:_ts('2026-10-15T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:4000 }], metodoPago:'QR BISA 4000 @2026-10-15 #11' }),
      V({ id:'raul', oc:'10-040', cliente:'RAUL ORTIZ', celular:'70022222', fecha:'2026-10-28', entregado:true, ts:_ts('2026-10-20T11:00:00'),
          productos:[ICE(1, 3000)], acuenta:900, saldo:2100, pagado:false, metodoPago:'~Efectivo 900 @2026-10-20 #12' }),
      /* MIRIAN: noviembre */
      V({ id:'lidia', oc:'11-040', cliente:'LIDIA CUELLAR', celular:'70033333', fecha:'2026-11-10', turno:'AM', vehiculo:'Carry', chofer:'Omar', ts:_ts('2026-11-03T11:00:00'),
          productos:[{ desc:'ORO ANATOMICO VISCOLASTICO', medida:'140x190', codigo:'CH1036', cant:1, precio:4000, chk:'ok' }], acuenta:2460, saldo:1540, pagado:false, metodoPago:'~Efectivo 2460 @2026-11-03 #13' }),
      V({ id:'ana', oc:'11-074', cliente:'ANA TERRAZAS', celular:'70044444', fecha:'2026-11-12', turno:'PM', ts:_ts('2026-11-05T11:00:00'),
          productos:[Object.assign(ICE(2, 3150), { chk:'no' })], metodoPago:'Efectivo 6300 @2026-11-05 #14' }),
      V({ id:'pedro', oc:'11-062', cliente:'PEDRO GUZMAN', celular:'70055555', fecha:'2026-11-11', turno:'AM', maps:'', ts:_ts('2026-11-10T09:00:00'),
          productos:[{ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129', cant:1, precio:2900 }], metodoPago:'QR BISA 2900 @2026-11-10 #15' }),
      V({ id:'atr', vendedor:'Carola Chavez', oc:'11-021', cliente:'SIN TILDAR', fecha:'2026-11-06', turno:'AM', vehiculo:'Carry', ts:_ts('2026-11-01T11:00:00') }),
      /* MARÍA FLORES (Heaven), JUAN PABLO (Sueña), EDUARDO (mayorista) */
      V({ id:'mf1', vendedor:'Maria Flores', cliente:'MF UNO', fecha:'2026-11-11', ts:_ts('2026-11-04T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:8000, fdoc:'R', fdocn:'9' }], metodoPago:'QR BISA 8000 @2026-11-04 #16' }),
      V({ id:'mf2', vendedor:'Maria Flores', cliente:'MF ICE', fecha:'2026-11-13', ts:_ts('2026-11-08T11:00:00'), productos:[ICE(1, 3150, true)], metodoPago:'QR BISA 3150 @2026-11-08 #17' }),
      V({ id:'jp1', vendedor:'Juan Pablo Paredes', cliente:'JP UNO', fecha:'2026-11-11', ts:_ts('2026-11-04T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:3000, fdoc:'F', fdocn:'8' }], metodoPago:'QR BISA 3000 @2026-11-04 #18' }),
      V({ id:'edu', vendedor:'Eduardo Añez', cliente:'MULTICENTER', fecha:'2026-11-11', ts:_ts('2026-11-04T11:00:00'), productos:[ICE(5, 2500)], metodoPago:'QR BISA 12500 @2026-11-04 #19' }),
      /* hoy: lo que se recoge de Moreno, en el Fotón nuevo */
      V({ id:'mor', vendedor:'Carola Chavez', oc:'11-090', cliente:'MOR UNO', fecha:'2026-11-10', turno:'PM', vehiculo:'Foton nuevo', ts:_ts('2026-11-06T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:2, precio:2000, chk:'im', fdoc:'F', fdocn:'1' }], metodoPago:'QR BISA 4000 @2026-11-06 #20' }),
      /* la semana que viene */
      V({ id:'sem1', oc:'11-150', cliente:'SEMANA UNO', fecha:'2026-11-16', ts:_ts('2026-11-07T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:2000, fdoc:'F', fdocn:'61', chk:'ok' }] }),
      V({ id:'sem2', oc:'11-151', cliente:'SEMANA DOS', fecha:'2026-11-18', turno:'PM', ts:_ts('2026-11-07T11:00:00'),
          productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:1, precio:2000, fdoc:'F', fdocn:'62', chk:'ok' }] }),
      /* filas del sistema: metas y el aviso de Contabilidad */
      { id:'__metas__', observaciones:JSON.stringify({ v:1, m:{ '2026-11':{ heaven:50000, vd:{ 'Mirian Salazar':[10000, 20000] } } } }) },
      { id:'__avisos_conta__', observaciones:JSON.stringify({ v:1, a:[{ id:'av1', k:'x', pid:'pedro', vend:'Mirian Salazar', cli:'PEDRO GUZMAN', nota:'', f:'2026-11-10', m:2900, met:'QR BISA',
        txt:'la foto dice Bs 2.800', t:_ts('2026-11-10T08:00:00'), por:'Contabilidad', ks:['monto'] }] }) }
    ];
  };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.BAN='01-05-025  Almacen Distribucion Banzer'; window.IMN='IM - PRODUCTOTERMINADO';
  window.STK=function(){
    var k=stockClave({ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220' }), ks=stockClave({ desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048' });
    var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[BAN]={ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[BAN]='sale'; st.al[IMN]='otro';
    st.c.u[k]=3; st.g[BAN].u[k]=2; st.g[IMN].u[ks]=5; st.c.u[ks]=10;
    STOCK=st; STOCK_CARGADO=true; stockOlvidarIndice(); SALDO_CACHE=null;
  };
  window.QUIEN=function(o){ o=o||{}; UNLOCKED=!!o.clave; quienRol(o.rol||''); setVendedorMem(o.v||''); var mv=document.getElementById('mis-vendedor'); if(mv) mv.value=''; };
  window.GPSON=function(){
    GPS={ t:Date.now(), u:{ '6409TIG':{ p:'6409TIG', pl:'6409-TIG', la:-17.78, lo:-63.18, v:32, m:1, r:Date.now()-120000, f:1, dep:{ id:'ptf', n:'PTF', m:2500 } } }, rec:relojMs() };
  };
  window.PREG=async function(q){
    if(!ASIS.abierto || ASIS.tab!=='ayuda') asisAbrir('ayuda');
    var inp=document.getElementById('asis-q'); inp.value=q; inp.dispatchEvent(new Event('input', { bubbles:true }));
    var f=inp.closest('form'); if(f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable:true }));
    await _esp(60);
    return ULT();
  };
  window.ULT=function(){
    var as=document.querySelectorAll('#asis-chat .bkp-a'), a=as[as.length-1];
    if(!a) return { t:'' };
    var T=function(sel){ return [].map.call(a.querySelectorAll(sel), function(x){ return x.innerText.replace(/\s+/g,' ').trim(); }); };
    return { t:a.innerText.replace(/\s+/g,' '), h:(a.querySelector('.bkp-t')||{}).innerText||'', mal:a.classList.contains('mal'), tag:(a.querySelector('.bkp-tag')||{}).textContent||'',
      nums:T('.bkp-n'), sub:T('.bkp-sub'), warn:T('.bkp-w'), filas:T('.bkp-fila'), lista:T('.bkp-li button'), btns:T('.bkp-acc button'), opc:T('.bkp-opc button'), cods:T('.bkp-cod'),
      msg:(a.querySelector('.bkp-msg')||{}).textContent||'', filaBtns:a.querySelectorAll('.bkp-fila button').length,
      onclick:[].map.call(a.querySelectorAll('.bkp-li button'), function(b){ return b.getAttribute('onclick'); }) };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.addInitScript(() => { window.ASIS_PRUEBA=1; try{ sessionStorage.setItem('me_quien_ok','1'); }catch(e){} });
  await page.clock.setFixedTime(new Date('2026-11-10T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1800);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try{ return await page.evaluate(fn, arg); }catch(e){ return { __err:String(e.message||e).slice(0,300) }; } };

  /* ---------------------------------------------------------------- 0 */
  console.log('\n── 0. Qué pregunta es ──');
  let r = await ev(() => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' });
    var T=function(q){ var o=blokiEntender(q); return o ? o.tipo : null; };
    var Q={ ventas:['¿Cuánto vendí hoy?','cuánto vendí esta semana','¿cuánto vendí este mes?','¿Cómo voy contra el mes pasado?','¿cuánto me falta para la meta de mi marca?','¿Cuál fue mi venta más grande?','¿quién vendió más este mes?','cuántos colchones vendí hoy'],
      deben:['¿Quiénes me deben?','clientes que me deben','cuánto me deben'], efectivo:['¿Cuánto efectivo tengo sin rendir?','efectivo en mi mano'],
      avisos:['¿Qué pagos tienen un aviso de Contabilidad?','avisos de contabilidad'], factura:['¿Qué ventas no tienen factura o remisión?','ventas sin factura'],
      sinstock:['¿Qué pedidos míos no tienen stock?','pedidos sin stock'], sincamion:['¿Cuáles no tienen camión o ubicación?','pedidos sin ubicación'],
      llega:['¿Cuándo llega el pedido de Lidia?','estado del pedido 11-040','11-040'], entregas:['¿Qué entrego la semana que viene?'],
      precio:['¿A cuánto se vende el Titanio Ice de 2 plazas?','precio del titanio ice 140'], medidas:['¿En qué medidas existe el cloud?','medidas del titanio ice'],
      top:['¿Qué es lo que más se vende este mes?','los más vendidos'], stock:['¿Cuándo vuelve a haber titanio ice 140?'],
      cargar:['¿Qué falta cargar hoy y en qué camión?','lista de carga'], moreno:['¿Qué hay que recoger de Moreno?','qué traemos de moreno'],
      cierre:['¿Qué falta tildar en el cierre de entregas?'], gps:['¿Dónde está el carry?','gps de los camiones','dónde anda omar'],
      hacer:['¿Qué me falta hacer hoy?','mis pendientes','¿qué tengo que hacer?'], mensaje:['Armame el mensaje para Raúl de que debe 2.100','Avisale a Lidia que llega mañana a la tarde'] };
    var mal=[]; Object.keys(Q).forEach(function(k){ Q[k].forEach(function(q){ var t=T(q); if(t!==k) mal.push(q+' → '+t+' (esperaba '+k+')'); }); });
    var viejos={ stock:T('¿hay titanio 140 para el jueves?'), cli:T('cuánto le falta pagar a la señora mendoza'), cli2:T('saldo de Juan Pérez'), cupo:T('¿hay lugar el sábado?'),
      ent:T('qué entrego mañana'), cod:T('código del titanio ice 140'), oc:T('saldo de la 11-034') };
    var ay=ASIS_AYUDA.filter(function(a){ return blokiEntender(a.q); }).map(function(a){ return a.q+' → '+blokiEntender(a.q).tipo; });
    var nada=['factura con nit extranjero','cómo anulo una venta','el cliente no contesta','hola','¿cómo hago el cierre de entregas?'].filter(function(q){ return blokiEntender(q); });
    return { mal:mal, viejos:viejos, ay:ay, nada:nada };
  });
  chk('las 40 preguntas de los 7 grupos se entienden como lo que son', r.mal && !r.mal.length, r.mal);
  chk('lo que ya contestaba sigue igual (stock, saldo, cupos, entregas, código)', r.viejos && r.viejos.stock==='stock' && r.viejos.cli==='cliente' && r.viejos.cli2==='cliente' && r.viejos.cupo==='cupos' &&
    r.viejos.ent==='entregas' && r.viejos.cod==='codigo' && r.viejos.oc==='cliente', r.viejos);
  chk('ninguna pregunta de la ayuda («¿Cómo …?») se toma por otra cosa; lo que no es nada sigue a la ayuda', r.ay && !r.ay.length && r.nada && !r.nada.length, r);

  /* ---------------------------------------------------------------- 1 */
  console.log('\n── 1. 📈 Mis ventas ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var V=pryVentas(), sum=function(f){ return V.filter(f).reduce(function(s,x){ return s+x.bs; }, 0); };
    var mesBs=sum(function(x){ return x.v==='Mirian Salazar' && x.ym==='2026-11'; }), hoyBs=sum(function(x){ return x.v==='Mirian Salazar' && x.reg==='2026-11-10'; });
    var mes=await PREG('¿cuánto vendí este mes?'), hoy=await PREG('¿Cuánto vendí hoy?'), sem=await PREG('¿cuánto vendí esta semana?');
    var meta=await PREG('¿cuánto me falta para la meta de mi marca?'), big=await PREG('¿Cuál fue mi venta más grande?');
    var otra=await PREG('¿cuánto vendió Maria Flores este mes?'), rankV=await PREG('¿quién vendió más este mes?'), pas=await PREG('¿cuánto vendí el mes pasado?');
    QUIEN({ clave:1 }); var eq=await PREG('¿cuánto vendió el equipo este mes?'), rank=await PREG('¿quién vendió más este mes?'), mf=await PREG('¿cuánto vendió Maria Flores este mes?');
    var eqBs=sum(function(x){ return x.amb==='tienda' && x.ym==='2026-11'; });
    QUIEN({ rol:'logistica' }); var log=await PREG('¿cuánto vendió el equipo este mes?');
    QUIEN({}); var nadie=await PREG('¿cuánto vendí este mes?');
    QUIEN({ v:'Mirian Salazar' });
    return { mes:mes, hoy:hoy, sem:sem, meta:meta, big:big, otra:otra, rankV:rankV, pas:pas, eq:eq, rank:rank, mf:mf, log:log, nadie:nadie,
      mesBs:fmtBs0(mesBs), hoyBs:fmtBs0(hoyBs), eqBs:fmtBs0(eqBs) };
  });
  chk('«cuánto vendí este mes»: lo de Proyección para noviembre (17.200 = 4.000 + 6.300 + 2.900 + 2.000 + 2.000), con ventas, unidades y lo que falta cobrar', r.mes && r.mesBs==='Bs 17.200' &&
    r.mes.h.indexOf('Vendiste para noviembre')>=0 && r.mes.h.indexOf(r.mesBs)>=0 && r.mes.nums.some(function(n){ return /^5 ventas/.test(n); }) && r.mes.nums.some(function(n){ return /^6 colchones y somieres/.test(n); }) && r.mes.nums.some(function(n){ return /falta cobrar/.test(n) && /1\.540/.test(n); }), r.mes);
  chk('…contra octubre A ESTA ALTURA (al 10/10 a las 10:00 solo estaba cargada la de 5.000): +244 %, y octubre entero 12.000', r.mes && r.mes.nums.some(function(n){ return /\+244 %/.test(n) && /octubre a esta altura/.test(n); }) &&
    r.mes.sub.some(function(s){ return /Octubre a esta altura \(día 10, 10:00\): Bs 5\.000 · entero: Bs 12\.000 · ¡ya lo pasaste!/.test(s); }), r.mes && r.mes.sub);
  chk('…su meta del mes (mínima 10.000 ya pasada, presupuesto 20.000: faltan 2.800) y la de Heaven del equipo (lleva 34.350)', r.mes && r.mes.sub.some(function(s){ return /Mínima de noviembre: Bs 10\.000 · ✅/.test(s); }) &&
    r.mes.sub.some(function(s){ return /Presupuesto: Bs 20\.000 · faltan Bs 2\.800/.test(s); }) && r.mes.sub.some(function(s){ return /Meta de Heaven \(todo el equipo\): Bs 50\.000 · lleva Bs 34\.350 \(69 %\)/.test(s); }), r.mes && r.mes.sub);
  chk('«hoy»: lo CARGADO hoy (PEDRO, 2.900)', r.hoy && r.hoyBs==='Bs 2.900' && /Vendiste hoy, martes 10\/11: Bs 2\.900 en 1 venta/.test(r.hoy.h), r.hoy && r.hoy.h);
  chk('«esta semana»: desde el lunes 09/11 (solo PEDRO)', r.sem && /esta semana \(desde el lunes 09\/11\): Bs 2\.900/.test(r.sem.h), r.sem && r.sem.h);
  chk('«la meta de mi marca»: la de Heaven y la suya', r.meta && r.meta.sub.some(function(s){ return /Meta de Heaven/.test(s); }) && r.meta.sub.some(function(s){ return /Presupuesto/.test(s); }), r.meta && r.meta.sub);
  chk('«mi venta más grande»: ANA TERRAZAS 6.300, abre el pedido', r.big && /Tu venta más grande para noviembre .*Bs 6\.300 · ANA TERRAZAS/.test(r.big.h) && r.big.lista.length===1, r.big && r.big.h);
  chk('una vendedora no ve lo de otra («lo ve ella o Administración») ni el ranking', r.otra && /Te muestro solo lo tuyo: lo de Maria lo ve ella/.test(r.otra.h) && r.rankV && /El ranking del equipo lo ve Administración/.test(r.rankV.h), [r.otra && r.otra.h, r.rankV && r.rankV.h]);
  chk('«el mes pasado»: octubre entero (12.000)', r.pas && /Vendiste para octubre \(el mes pasado\): Bs 12\.000 en 3 ventas/.test(r.pas.h), r.pas && r.pas.h);
  chk('con la contraseña: el equipo (sin Eduardo) y una fila por vendedora', r.eq && r.eq.h.indexOf(r.eqBs)>=0 && /El equipo vendió/.test(r.eq.h) && r.eq.filas.length===4 && /^1\. Mirian Salazar/.test(r.eq.filas[0]) &&
    r.eq.sub.some(function(s){ return /Sin Eduardo/.test(s); }), r.eq && { h:r.eq.h, f:r.eq.filas, eq:r.eqBs });
  chk('…«quién vendió más»: Mirian; y lo de María Flores (11.150)', r.rank && /vendió más Mirian Salazar: Bs 17\.200/.test(r.rank.h) && r.mf && /Maria vendió para noviembre .*Bs 11\.150/.test(r.mf.h), [r.rank && r.rank.h, r.mf && r.mf.h]);
  chk('🔒 Logística sin la contraseña no ve las ventas', r.log && /las ventas lo ven cada vendedora/i.test(r.log.h) && !/Bs/.test(r.log.h) && !r.log.nums.length, r.log && r.log.h);
  chk('sin saber quién es, lo pregunta', r.nadie && /Primero decime quién sos/.test(r.nadie.h), r.nadie && r.nadie.h);

  /* ---------------------------------------------------------------- 2 */
  console.log('\n── 2. 💵 Cobranza ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var deben=await PREG('¿Quiénes me deben?'), uno=await PREG('quién me debe, raul?'), ef=await PREG('¿Cuánto efectivo tengo sin rendir?'), E=misEfectivoDatos('Mirian Salazar');
    var av=await PREG('¿Qué pagos tienen un aviso de Contabilidad?'), fa=await PREG('¿Qué ventas no tienen factura o remisión?');
    var faL=STATE.filter(function(p){ return docVentaFalta(p) && mismoVendedor(p.vendedor, 'Mirian Salazar'); }).length;
    QUIEN({ clave:1 }); var eqEf=await PREG('¿cuánto efectivo hay sin rendir?'), eqDeb=await PREG('¿quiénes deben?');
    QUIEN({ rol:'logistica' }); var lDeb=await PREG('¿Quiénes me deben?'), lEf=await PREG('¿cuánto efectivo tengo sin rendir?'), lFa=await PREG('¿qué ventas no tienen factura?');
    QUIEN({ v:'Mirian Salazar' });
    return { deben:deben, uno:uno, ef:ef, E:{ tot:fmtBs(E.tot), c:fmtBs0(E.cobrado) }, av:av, fa:fa, faL:faL, eqEf:eqEf, eqDeb:eqDeb, lDeb:lDeb, lEf:lEf, lFa:lFa };
  });
  chk('«quiénes me deben»: 2 clientes, Bs 3.640; primero RAÚL (ya recibió, hace 13 días) y después LIDIA', r.deben && /2 clientes te deben Bs 3\.640,00\. Primero los que ya recibieron/.test(r.deben.h) &&
    /^RAUL ORTIZ · 10-040 entregado el 28\/10 · hace 13 días Bs 2\.100/.test(r.deben.lista[0]) && /^LIDIA CUELLAR/.test(r.deben.lista[1]), r.deben && { h:r.deben.h, l:r.deben.lista });
  chk('…cada uno abre su venta en Contabilidad (para registrar el pago)', r.deben && r.deben.onclick.every(function(o){ return /blokiAbrirVenta/.test(o); }), r.deben && r.deben.onclick);
  chk('«quién me debe, raul?» con un nombre: el saldo de ese cliente (como antes)', r.uno && /RAUL ORTIZ le falta pagar Bs 2\.100/.test(r.uno.h), r.uno && r.uno.h);
  chk('«efectivo sin rendir»: lo MISMO que «Efectivo en tu mano» (misEfectivoDatos)', r.ef && r.ef.h.indexOf(r.E.tot)>=0 && r.ef.nums.some(function(n){ return n.indexOf(r.E.c)>=0 && /recibido/.test(n); }) && r.ef.btns.some(function(b){ return /Ver los cobros/.test(b); }), { h:r.ef && r.ef.h, E:r.E });
  chk('«aviso de Contabilidad»: el de PEDRO con lo que dice, abre la venta', r.av && /Contabilidad pide revisar 1 pago/.test(r.av.h) && /PEDRO GUZMAN/.test(r.av.lista[0]) && /la foto dice Bs 2\.800/.test(r.av.lista[0]) &&
    r.av.btns.some(function(b){ return /Ver los avisos/.test(b); }), r.av && { h:r.av.h, l:r.av.lista });
  chk('«sin factura o remisión»: las suyas de noviembre sin N° (docVentaFalta), en rojo', r.fa && r.faL>0 && new RegExp('^🧾 '+r.faL+' venta').test(r.fa.h) && r.fa.mal && r.fa.lista.length===r.faL, r.fa && { h:r.fa.h, n:r.faL });
  chk('con la contraseña: el efectivo de cada vendedora y quiénes le deben al equipo', r.eqEf && /efectivo sin rendir/.test(r.eqEf.h) && r.eqEf.filas.some(function(f){ return /Mirian Salazar/.test(f); }) &&
    r.eqDeb && /le deben al equipo/.test(r.eqDeb.h), [r.eqEf && r.eqEf.h, r.eqDeb && r.eqDeb.h]);
  chk('🔒 Logística sin la contraseña: ni deudas, ni efectivo, ni facturas', r.lDeb && /lo ve su vendedora o Contabilidad/.test(r.lDeb.h) && !/Bs/.test(r.lDeb.t) && r.lEf && /el efectivo lo ven/i.test(r.lEf.h) && r.lFa && /lo ven cada vendedora/.test(r.lFa.h),
    [r.lDeb && r.lDeb.h, r.lEf && r.lEf.h, r.lFa && r.lFa.h]);

  /* ---------------------------------------------------------------- 3 */
  console.log('\n── 3. 📋 Mis pedidos ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[]; GPSON();
    CARGA_CHK={}; CARGA_CHK[cargaChkKey('2026-11-10', 'Carry', CARGA_SALIO)+'|09:12']=1;
    var ss=await PREG('¿Qué pedidos míos no tienen stock?'), sc=await PREG('¿Cuáles no tienen camión o ubicación?'), ll=await PREG('¿Cuándo llega el pedido de Lidia?');
    var oc=await PREG('11-074'), nada=await PREG('¿cuándo llega el pedido de Zacarías?'), prod=await PREG('¿cuándo llega el titanio ice 140?'), sem=await PREG('¿Qué entrego la semana que viene?');
    QUIEN({ rol:'logistica' }); var lll=await PREG('¿cuándo llega el pedido de lidia?');
    QUIEN({ v:'Mirian Salazar' });
    return { ss:ss, sc:sc, ll:ll, oc:oc, nada:nada, prod:prod, sem:sem, lll:lll };
  });
  chk('«sin stock»: ANA (✗ no hay) primero, PEDRO (⬜ sin revisar); no LIDIA (✔)', r.ss && /^📦 2 pedidos tuyos tienen algo sin stock/.test(r.ss.h) && /ANA TERRAZAS .*✗ 2× TITANIO ICE 140×190 · se entrega el jueves 12\/11 no hay/.test(r.ss.lista[0]) &&
    /PEDRO GUZMAN .*⬜ .*sin revisar/.test(r.ss.lista[1]) && !r.ss.lista.some(function(l){ return /LIDIA/.test(l); }) && r.ss.mal, r.ss && { h:r.ss.h, l:r.ss.lista });
  chk('«sin camión o ubicación»: PEDRO, sin camión para mañana y sin ubicación', r.sc && /1 sin camión hasta mañana, miércoles 11\/11 y 1 sin ubicación/.test(r.sc.h) && /PEDRO GUZMAN.*🚚 sin camión · 📍 sin ubicación/.test(r.sc.lista[0]), r.sc && { h:r.sc.h, l:r.sc.lista });
  chk('«cuándo llega el pedido de Lidia»: hoy a la mañana en el Carry; salió 09:12 y el GPS dice dónde está', r.ll && /LIDIA CUELLAR · 11-040: se entrega hoy, martes 10\/11 🌅 a la mañana/.test(r.ll.h) &&
    r.ll.nums.some(function(n){ return /Carry/.test(n) && /Omar/.test(n); }) && r.ll.sub.some(function(s){ return /salió a las 09:12/.test(s); }) && r.ll.sub.some(function(s){ return /en la calle/.test(s); }) &&
    r.ll.btns.some(function(b){ return /Abrir el pedido/.test(b); }), r.ll && { h:r.ll.h, n:r.ll.nums, s:r.ll.sub });
  chk('por la OC (11-074): ANA, jueves a la tarde, sin camión todavía, y «no hay» en la mercadería', r.oc && /ANA TERRAZAS · 11-074: se entrega el jueves 12\/11 🌆 a la tarde/.test(r.oc.h) && r.oc.nums.some(function(n){ return /sin camión/.test(n); }) &&
    r.oc.sub.some(function(s){ return /Sin stock/.test(s); }), r.oc && { h:r.oc.h, s:r.oc.sub });
  chk('un cliente que no está: lo dice; «el titanio ice 140» es del stock', r.nada && /No encontré «zacarias» entre tus pedidos/.test(r.nada.h) && r.prod && /TITANIO ICE 140x190/.test(r.prod.h), [r.nada && r.nada.h, r.prod && r.prod.h]);
  chk('«la semana que viene»: lunes 16/11 al sábado 21/11, sus 2 entregas', r.sem && /La semana que viene \(lunes 16\/11 al sábado 21\/11\) tenés 2 entregas/.test(r.sem.h) && r.sem.lista.length===2, r.sem && { h:r.sem.h, l:r.sem.lista });
  chk('Logística también ve cuándo llega un pedido (no es plata)', r.lll && /LIDIA CUELLAR/.test(r.lll.h), r.lll && r.lll.h);

  /* ---------------------------------------------------------------- 4 */
  console.log('\n── 4. 🛏️ Productos ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var pr=await PREG('¿A cuánto se vende el Titanio Ice de 2 plazas?'), med=await PREG('¿En qué medidas existe el titanio ice?'), dos=await PREG('¿en qué medidas existe el titanio?');
    var top=await PREG('¿Qué es lo que más se vende este mes?'), vuelve=await PREG('¿Cuándo vuelve a haber titanio ice 140?');
    var nIce=Object.keys(CODIGOS).filter(function(c){ return CODIGOS[c].d==='TITANIO ICE'; }).length;
    QUIEN({ rol:'logistica' }); var lpr=await PREG('precio del titanio ice 140');
    QUIEN({ v:'Mirian Salazar' });
    return { pr:pr, med:med, dos:dos, top:top, vuelve:vuelve, nIce:nIce, lpr:lpr };
  });
  chk('«a cuánto se vende»: lo cobrado de verdad en 60 días (3.150 típico, 3.000 el más bajo, 4 vendidos; sin el mayorista a 2.500)', r.pr && /TITANIO ICE 140x190 · CH1220, en las ventas de los últimos 60 días/.test(r.pr.h) &&
    /^Bs 3\.150 el precio típico$/.test(r.pr.nums[0]) && /^Bs 3\.000 el más bajo$/.test(r.pr.nums[1]) && /^Bs 3\.150 el más alto$/.test(r.pr.nums[2]) && /^4 vendidos$/.test(r.pr.nums[3]) &&
    r.pr.btns.some(function(b){ return /Ver su stock/.test(b); }), r.pr && { h:r.pr.h, n:r.pr.nums });
  chk('«en qué medidas existe el titanio ice»: cada medida con su código (CH1220 140x190)', r.med && new RegExp('TITANIO ICE existe en '+r.nIce+' medidas').test(r.med.h) && r.med.cods.some(function(c){ return /CH1220/.test(c) && /140x190/.test(c); }), r.med && { h:r.med.h, c:r.med.cods, n:r.nIce });
  chk('«el titanio» a secas: los modelos, cada uno con sus medidas', r.dos && /Encontré \d+ modelos con «titanio»/.test(r.dos.h) && r.dos.filas.some(function(f){ return /TITANIO ICE/.test(f); }) && r.dos.filas.some(function(f){ return /TITANIO LATEX/.test(f); }), r.dos && { h:r.dos.h, f:r.dos.filas });
  chk('«lo más vendido este mes»: TITANIO ICE primero (8 u.: 2 + 1 + 5 de Eduardo)', r.top && /Lo más vendido para noviembre/.test(r.top.h) && /^1\. TITANIO ICE · 140x190 8 u\.$/i.test(r.top.filas[0]) && /^2\. COLCHON SOFT/.test(r.top.filas[1]), r.top && { h:r.top.h, f:r.top.filas });
  chk('«cuándo vuelve a haber…» contesta con el stock (el cuadrito)', r.vuelve && /TITANIO ICE 140x190/.test(r.vuelve.h) && r.vuelve.nums.some(function(n){ return /PTF \+ Banzer/.test(n); }), r.vuelve && r.vuelve.h);
  chk('Logística ve los precios de los productos (no es plata de un cliente)', r.lpr && /precio típico/.test(r.lpr.t), r.lpr && r.lpr.h);

  /* ---------------------------------------------------------------- 5 */
  console.log('\n── 5. 🚚 Logística ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ rol:'logistica' }); BLOKI_P.chat=[]; GPSON(); CARGA_CHK={};
    var c0=await PREG('¿Qué falta cargar hoy y en qué camión?');
    var D=cargaVivaDatos(); D.porK['Carry'].lineas.forEach(function(l){ CARGA_CHK[l.key]=1; });
    var c1=await PREG('¿qué falta cargar hoy?'), mor=await PREG('¿Qué hay que recoger de Moreno?'), cie=await PREG('¿Qué falta tildar en el cierre de entregas?');
    var gps=await PREG('¿Dónde está el carry?'), todos=await PREG('gps de los camiones'), omar=await PREG('¿dónde anda omar?');
    GPS={ t:0, u:{}, rec:0 }; var sin=await PREG('¿dónde está el carry?');
    QUIEN({ v:'Mirian Salazar' }); var vcie=await PREG('¿qué falta tildar en el cierre de entregas?');
    return { c0:c0, c1:c1, mor:mor, cie:cie, gps:gps, todos:todos, omar:omar, sin:sin, vcie:vcie };
  });
  chk('«qué falta cargar hoy»: por camión (Carry: el ORO de LIDIA; Fotón nuevo: 2 SOFT de Moreno 📥 a la tarde)', r.c0 && /Hoy, martes 10\/11 falta cargar 3 productos en 2 camiones/.test(r.c0.h) &&
    r.c0.filas.some(function(f){ return /Carry/.test(f) && /ORO ANATOMICO/.test(f) && /faltan 1 de 1/.test(f); }) && r.c0.filas.some(function(f){ return /Foton nuevo/.test(f) && /📥/.test(f) && /🌆/.test(f); }), r.c0 && { h:r.c0.h, f:r.c0.filas });
  chk('…con los MISMOS tildes de la Lista de carga: tildado el Carry, queda solo el Fotón', r.c1 && /falta cargar 2 productos en 1 camión/.test(r.c1.h) && r.c1.filas.some(function(f){ return /Carry/.test(f) && /✅ listo/.test(f); }), r.c1 && { h:r.c1.h, f:r.c1.filas });
  chk('«recoger de Moreno»: los 2 SOFT de MOR UNO, abre el pedido', r.mor && /hay que ir a buscar 2: Moreno 2/.test(r.mor.h) && /^2× COLCHON SOFT 140x190 de Moreno · MOR UNO · Foton nuevo/.test(r.mor.lista[0]), r.mor && { h:r.mor.h, l:r.mor.lista });
  chk('«falta tildar en el cierre»: hoy 2 de 2 y 1 atrasado (06/11), con «✅ Hacer el cierre»', r.cie && /Hoy falta tildar 2 de 2 entregas/.test(r.cie.h) && r.cie.nums.some(function(n){ return /atrasados/.test(n) && /^1/.test(n); }) &&
    r.cie.lista.some(function(l){ return /SIN TILDAR/.test(l) && /era el viernes 06\/11/.test(l); }), r.cie && { h:r.cie.h, n:r.cie.nums, l:r.cie.lista });
  chk('«dónde está el carry»: lo del GPS (en la calle, a 2,5 km de PTF, 32 km/h) con «ver ↗»', r.gps && /Dónde está el Carry/.test(r.gps.h) && r.gps.filas.length===1 && /en la calle · a 2,5 km de PTF · 32 km\/h/.test(r.gps.filas[0]) && /ver ↗/.test(r.gps.filas[0]), r.gps && r.gps.filas);
  chk('…«gps de los camiones»: los cuatro; «dónde anda Omar»: su camión', r.todos && r.todos.filas.length===4 && r.omar && r.omar.filas.length===1 && /Carry/.test(r.omar.filas[0]), [r.todos && r.todos.filas.length, r.omar && r.omar.filas]);
  chk('sin GPS: lo dice (no inventa)', r.sin && /Ahora no tengo el GPS/.test(r.sin.h), r.sin && r.sin.h);
  chk('una vendedora: solo lo suyo del cierre y sin el botón', r.vcie && /Hoy falta tildar 1 de 1/.test(r.vcie.h) && !r.vcie.btns.length, r.vcie && { h:r.vcie.h, b:r.vcie.btns });

  /* ---------------------------------------------------------------- 6 */
  console.log('\n── 6. 📋 ¿Qué me falta hacer? ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[];
    var mine=STATE.filter(function(p){ return mismoVendedor(p.vendedor, 'Mirian Salazar'); }), I=misHacerDatos('Mirian Salazar', mine);
    var v=await PREG('¿Qué me falta hacer hoy?');
    QUIEN({ rol:'logistica' }); var A=admHacerDatos(), l=await PREG('¿qué me falta hacer?');
    QUIEN({ rol:'conta' }); CX_HACER_ULT=null; var c=await PREG('¿qué tengo que hacer?');
    QUIEN({}); var nadie=await PREG('¿qué me falta hacer?');
    /* el botón de un renglón lleva a su pestaña */
    QUIEN({ v:'Mirian Salazar' }); await PREG('mis pendientes');
    var b=[].filter.call(document.querySelectorAll('#asis-chat .bkp-a:last-child .bkp-fila button, #asis-chat .bkp-a .bkp-fila button'), function(){ return true; }).pop();
    if(b) b.click(); await _esp(400);
    var vista=asisVista();
    return { v:v, I:I.map(function(x){ return x.t; }), l:l, A:A.map(function(x){ return x.t; }), c:c, nadie:nadie, vista:vista };
  });
  chk('la vendedora: su «Para hacer» de Mis pedidos, el mismo orden, con un botón por renglón', r.v && /Tu «Para hacer», Mirian/.test(r.v.h) && r.v.filas.length===Math.min(10, r.I.length) &&
    r.v.filas[0].indexOf(r.I[0])>=0 && r.v.filaBtns===r.v.filas.length, r.v && { h:r.v.h, f:r.v.filas, I:r.I });
  chk('Logística: el de Administración (admHacerDatos)', r.l && /El «Para hacer» de logística/.test(r.l.h) && r.l.filas.length===Math.min(10, r.A.length) && (!r.A.length || r.l.filas[0].indexOf(r.A[0])>=0), r.l && { h:r.l.h, f:r.l.filas, A:r.A });
  chk('Contabilidad: lo principal de su pestaña (pagos, facturas, saldos)', r.c && /El «Para hacer» de Contabilidad/.test(r.c.h) && r.c.filas.some(function(f){ return /factura/.test(f); }), r.c && { h:r.c.h, f:r.c.filas });
  chk('sin saber quién es, lo pregunta; el botón lleva a su pestaña (Mis pedidos)', r.nadie && /Primero decime quién sos/.test(r.nadie.h) && r.vista==='mis', { n:r.nadie && r.nadie.h, vista:r.vista });

  /* ---------------------------------------------------------------- 7 */
  console.log('\n── 7. 💬 El mensaje al cliente ──');
  r = await ev(async () => {
    asisCerrar(); STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[]; window._posts=[]; window._saves=[];
    var raul=await PREG('Armame el mensaje para Raúl de que debe 2.100'), raul2=await PREG('armame el mensaje para raul de que debe 2.000');
    var lidia=await PREG('Avisale a Lidia que llega mañana a la tarde'), ana=await PREG('avisale a Ana que llega el jueves'), nadie=await PREG('armame el mensaje para Zacarías');
    var w0=window.open, abierto=''; window.open=function(u){ abierto=String(u); return null; };
    var b=[].filter.call(document.querySelectorAll('#asis-chat .bkp-acc button'), function(x){ return /Abrir WhatsApp/.test(x.textContent); });
    QUIEN({ v:'Mirian Salazar' }); var ana2=await PREG('avisale a Ana que llega el jueves');
    b=[].filter.call(document.querySelectorAll('#asis-chat .bkp-acc button'), function(x){ return /Abrir WhatsApp/.test(x.textContent); }).pop(); if(b) b.click();
    window.open=w0;
    QUIEN({ rol:'logistica' }); var lr=await PREG('armame el mensaje para raul de que debe'), ll=await PREG('avisale a lidia que llega hoy');
    QUIEN({ v:'Mirian Salazar' });
    return { raul:raul, raul2:raul2, lidia:lidia, ana:ana, nadie:nadie, abierto:abierto, posts:window._posts.slice(), saves:window._saves.length, lr:lr, ll:ll };
  });
  chk('«armame el mensaje para Raúl de que debe 2.100»: el texto con el saldo de Contabilidad, WhatsApp y Copiar', r.raul && /Mensaje del saldo para RAUL ORTIZ \(Bs 2\.100,00\)/.test(r.raul.h) &&
    /Hola Raul 👋, te escribimos de Heaven Colchones\./.test(r.raul.msg) && /quedó un saldo de Bs 2\.100,00/.test(r.raul.msg) && /Mirian Salazar$/.test(r.raul.msg) &&
    r.raul.btns.some(function(b){ return /Abrir WhatsApp/.test(b); }) && r.raul.btns.some(function(b){ return /Copiar/.test(b); }) && !r.raul.warn.length, r.raul && { h:r.raul.h, m:r.raul.msg, w:r.raul.warn });
  chk('…con otro monto: usa lo de Contabilidad y lo dice', r.raul2 && r.raul2.warn.some(function(w){ return /Escribiste Bs 2\.000,00, pero Contabilidad dice que debe Bs 2\.100,00/.test(w); }) && /Bs 2\.100,00/.test(r.raul2.msg), r.raul2 && r.raul2.warn);
  chk('«avisale a Lidia que llega mañana a la tarde»: el pedido dice HOY a la mañana → el mensaje usa eso y avisa', r.lidia && /Mensaje de la entrega para LIDIA CUELLAR \(11-040\)/.test(r.lidia.h) &&
    r.lidia.warn.some(function(w){ return /El pedido dice martes 10\/11 a la mañana: el mensaje usa eso\. Si cambió, primero reprogramalo/.test(w); }) && /Hola Lidia/.test(r.lidia.msg), r.lidia && { h:r.lidia.h, w:r.lidia.warn, m:r.lidia.msg });
  chk('«avisale a Ana que llega el jueves»: la confirmación con sus productos, sin aviso', r.ana && /ANA TERRAZAS/.test(r.ana.h) && /2 × TITANIO ICE 140x190/.test(r.ana.msg) && !r.ana.warn.length, r.ana && { m:r.ana.msg, w:r.ana.warn });
  chk('un cliente que no está: lo dice', r.nadie && /No encontré «zacarias» entre tus pedidos/.test(r.nadie.h), r.nadie && r.nadie.h);
  chk('«Abrir WhatsApp» abre wa.me con el texto; Bloki NO manda ni guarda nada', /^https:\/\/wa\.me\/59170044444\?text=Hola%20Ana/.test(r.abierto) && !r.posts.length && r.saves===0, { url:r.abierto.slice(0,80), posts:r.posts, saves:r.saves });
  chk('🔒 Logística sin la contraseña: el del saldo no; el de la entrega sí', r.lr && /El mensaje del saldo lo arma su vendedora o Contabilidad/.test(r.lr.h) && !r.lr.msg && r.ll && /Hola Lidia/.test(r.ll.msg), [r.lr && r.lr.h, r.ll && r.ll.h]);

  /* ---------------------------------------------------------------- 8 */
  console.log('\n── 8. En la ventana ──');
  r = await ev(async () => {
    STATE=FIX(); STK(); QUIEN({ v:'Mirian Salazar' }); BLOKI_P.chat=[]; localStorage.removeItem('me_asis_preg'); window._posts=[];
    SERVER_VER='2026-11-07-a';
    var a=await PREG('¿cuánto vendí este mes?');
    await _esp(3300);
    var ls=JSON.parse(localStorage.getItem('me_asis_preg')||'[]');
    var ns=await PREG('qué opinás del clima');
    return { tag:a.tag, ls:ls.length, posts:window._posts.slice(), ns:ns };
  });
  chk('cada respuesta dice «con los números del panel · no gasta», no se anota como «no sabe» y no llama al servidor', r.tag==='con los números del panel · no gasta' && r.ls===0 && !r.posts.length, r);
  chk('lo que no sabe: «no sé» con la lista nueva de lo que contesta', r.ns && /No tengo esa respuesta todavía/.test(r.ns.t) && /cuánto vendiste, quiénes te deben/.test(r.ns.t) && /qué falta cargar/.test(r.ns.t), r.ns && r.ns.t);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})();
