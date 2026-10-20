/* 🧾 EL CUADRITO DEL VENDEDOR · VERIFICACIÓN FINAL DE §4ls (19/10, grupo «Cuadrito del vendedor», hallazgos CD-1 a CD-5).

   La verificación independiente de `18fb452` (antes de la reunión con logística del jueves 22/10) confirmó cinco cosas en el cuadrito
   del formulario, con la planilla real y con casos sintéticos. Esta prueba cuida los arreglos (las «FCU» fallan contra la página de
   antes, `22d4615`):

   FCU1 (CD-1) Lo 🏭 hecho a pedido para OTRO cliente, sin sello, que ya salió de fábrica antes del Excel vigente de PTF o Banzer, está
        (casi seguro) en ese Excel: se APARTA a su fecha. Con la reserva por fecha (decisión 3) el cuadrito se la prometía a otro
        «✅ DISPONIBLE» (la 10-162 el 13/10 y la 10-207 el 15/10, que después se fabricaron). Banzer 1, A 🏭 (pedido el 16/10, sale el
        19/10) para el 23/10, B para el 30/10: C para el 26/10 → «🏭 NO HAY», con «incluye 1 🏭 hecho a pedido para otro cliente»; sin B
        también; y la revisión automática ya no le propone a B «✔ hay» con esa unidad. Controles: recién pedido (sale después del Excel),
        sellado, con fecha pasada (§4co: salió) o de hoy con su turno ya fuera del Excel (decisión 2) → nada cambia; sin stock a mano no
        se aparta nada; la pestaña Stock (comp, aFab) no cambia.
   FCU2 (CD-2) La fecha elegida en un día LLENO: «📥 HAY EN MORENO» (y 🚚 / ⏳) decía «programá desde el sábado 24/10» y, para el 24/10, el
        mismo cuadrito decía «🏭 NO HAY». Ahora, como ya hacía «✅»: «para el viernes 23/10 (la fecha elegida) sí; para el sábado 24/10 ya
        no alcanza». Control: sin el día lleno, como siempre.
   FCU3 (CD-3) «105X190CM» en «Otros» (la 10-150) es la 105x190: antes «❓ NO RECONOZCO» con 3 en PTF y el pedido en una fila aparte del
        Stock. Controles: «105X190 + 2CM DE ALTURA C/CAJON» y «180X200CM» no se juntan con nada.
   FCU4 (CD-4) El chip del buscador: con Moreno, «✅ 2 a mano · +31 en Moreno» (antes «✅ 33 libres»). Sin Moreno, como siempre.
   FCU5 (CD-5) «Otro vendedor vendió lo mismo»: antes de abrir la ventana se relee la planilla y se rehace la cuenta. Si el otro vendió
        para DESPUÉS, el pedido sigue cubierto: sin ventana (una línea). Si vendió antes o el mismo día: la ventana dice los números de
        ahora («con la planilla de ahora, para el 22/10 ya no alcanza (faltan 1)» y lo que dice el cuadrito). Si la relectura falla o
        todavía no trae lo del otro: «puede que ya no alcance». Control: con «🏭 NO HAY» no sale nada (H2).

   Reloj CLAVADO: miércoles 21/10/2026, 10:00 de Bolivia (los Excel de hoy a las 08:00). Red cortada, datos sintéticos.
   Se corre:  node tests/test_stock_final_cuadrito.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_22d4615.html node tests/test_stock_final_cuadrito.js   (19/10: 17 de 32 rojas; las verdes son la
              partida, los controles y «sin errores») */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-10-21T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  window._SRV={ pedidos:[], stock:null, congelada:null };
  apiList=function(){
    var base=window._SRV.congelada || window._SRV.pedidos;
    var l=JSON.parse(JSON.stringify(base));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window.PR={
    TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
    ORO105:{ desc:'ORO ORTOPEDICO', medida:'105x190', codigo:'' },
    CONF:{ desc:'COLCHON CONFORT PLUS', medida:'140x190', codigo:'' }
  };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockInfo(PR[n]).k; });
  /* Los tres Excel de HOY a las 08:00 (`aca`, `ban`, `im`: {producto: unidades}); `inc` = el turno que ya trae ('am'). */
  window._stock=function(op){
    op=op||{};
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:op.p||[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    if(op.inc){ st.c.incT=op.inc; st.g[_BZ].incT=op.inc; }
    Object.keys(op.aca||{}).forEach(function(n){ st.c.u[K[n]||n]=op.aca[n]; });
    Object.keys(op.ban||{}).forEach(function(n){ st.g[_BZ].u[K[n]||n]=op.ban[n]; });
    Object.keys(op.im||{}).forEach(function(n){ st.g[_IM].u[K[n]||n]=op.im[n]; });
    return st;
  };
  window._n=0;
  window._ped=function(fecha, n, cant, extraProd, extra, turno){
    _n++;
    return Object.assign({ id:'p'+_n, oc:'OC 10-'+(800+_n), fecha:fecha, turno:turno||'AM', cliente:'CLIENTE '+_n, vendedor:'Maria Flores',
             celular:'7000000'+(_n%10), zona:'Norte', direccion:'Calle 1', maps:'', ts:Date.now()-2*86400000, entregado:false,
             productos:[Object.assign({}, PR[n], { cant:cant }, extraProd||{})] }, extra||{});
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); window._SRV.congelada=null; STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    SALDO_CACHE=null; try{ stockOlvidarIndice(); }catch(e){}
  };
  window._txt=function(h){ var d=document.createElement('div'); d.innerHTML=h||''; return (d.innerText||d.textContent||'').replace(/\s+/g,' ').trim(); };
  window._v=function(n, cant, fecha){
    var v=saldoVeredicto(K[n]||n, cant, '', fecha==null?'':fecha, true);
    return { tipo:v.tipo, pend:v.pend, pendFecha:v.pendFecha, libres:v.libres, desde:v.desde||'', fechaRes:v.fechaRes||'', soloFecha:v.soloFecha||'',
             fabVenc:v.fabVenc||0, titulo:saldoTitulo(v), caja:_txt(saldoCajaHtml(v)) };
  };
  window._fila=function(k){ var o=stockData().lista.filter(function(x){ return x.k===k; })[0]; return o ? { comp:o.comp, aFab:o.aFab, fabVenc:o.fabVenc||0, pedir:o.pedir, fabricar:o.fabricar } : null; };
  window._asig=function(){ var a=stockAsignar(); return { ok:a.tot.ok||0, no:a.tot.no||0, lineas:a.tot.lineas||0, aFab:a.tot.aFab||0 }; };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  window._renglon=function(i, o){
    var cards=document.querySelectorAll('#f-productos .prod-card');
    while(cards.length<=i){ addProdRow(); cards=document.querySelectorAll('#f-productos .prod-card'); }
    var c=cards[i], ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.desc!=null){ var d=c.querySelector('.prod-desc'); d.value=o.desc; ev(d); }
    if(o.medida!=null){ var m=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro');
      if(MEDIDAS.indexOf(o.medida)>=0){ m.value=o.medida; ev(m,'change'); } else { m.value='Otros'; ev(m,'change'); mo.value=o.medida; ev(mo); } }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._caja=function(i){
    saldoAvisosPintarYa();
    var c=document.querySelectorAll('#f-productos .prod-card')[i], b=c && c.querySelector('.prod-saldo');
    if(!b) return { existe:false };
    return { existe:true, hidden:!!b.hidden, txt:b.innerText.replace(/\s+/g,' ').trim(), tipo:(b._v||{}).tipo||'', k:(b._v||{}).k||'' };
  };
  window._fecha=function(f){ var e=document.getElementById('f-fecha'); e.value=f; e.dispatchEvent(new Event('change', { bubbles:true })); };
  window._modal=function(){ var m=document.getElementById('modal'), b=document.getElementById('modal-box'); return { on:m.classList.contains('on'), txt:(b.innerText||'').replace(/\s+/g,' ').trim() }; };
  window._toast=function(){ var t=document.getElementById('toast'); return { show:/show/.test(t.className), txt:(t.textContent||'').trim() }; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:950 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,500) }; } };

  const par = await ev(()=>({ hoy:todayStr(), prox:proximoDiaEntrega(), sale16:saldoSaleDeFabrica('2026-10-16'), sale21:saldoSaleDeFabrica('2026-10-21'), k:K }));
  chk('(partida) reloj del miércoles 21/10: mañana jueves 22; lo pedido a fábrica el 16/10 sale el 19/10 y lo pedido hoy, el 23/10',
      par.hoy==='2026-10-21' && par.prox==='2026-10-22' && par.sale16==='2026-10-19' && par.sale21==='2026-10-23' && par.k.TIT==='TITANIO ICE|160X190', par);

  /* ── FCU1 (CD-1) · 🏭 de OTRO pedido, sin sello, que ya salió de fábrica antes del Excel ── */
  const cd1 = async (op) => ev(async (op)=>{
    var peds=[ _ped(op.fA||'2026-10-23', 'TIT', 1, op.A, null, op.turnoA) ];      // A: 🏭 para el 23/10 (o la fecha que diga el caso)
    if(op.B) peds.push(_ped('2026-10-30', 'TIT', 1));                               // B: vendido para el 30/10, sin marcas
    await _cargar(peds, _stock(op.st||{ ban:{ TIT:1 } }));
    return { C:_v('TIT', 1, '2026-10-26'), fila:_fila(K.TIT), asig:_asig() };
  }, op);
  const A_PEND = { enProd:true, prodF:'2026-10-16', prodEn:'Moreno' };
  const r1a = await cd1({ A:A_PEND, B:true });
  chk('FCU1a. Banzer 1, A 🏭 sin sello que ya salió de fábrica (19/10, antes del Excel de hoy) para el 23/10, B para el 30/10: C para el 26/10 ya NO dice «✅ DISPONIBLE» (esa unidad es de A)',
      r1a.C && r1a.C.tipo!=='hay' && r1a.C.tipo==='pedir' && !/✅ DISPONIBLE/.test(r1a.C.titulo), r1a.C);
  chk('FCU1b. …y lo dice: «Pendientes hasta el 26/10 1 (incluye 1 🏭 hecho a pedido para otro cliente, que ya salió de fábrica)», total 2 (A + B)',
      r1a.C && r1a.C.fabVenc===1 && r1a.C.pend===2 && r1a.C.pendFecha===1 && /incluye 1 🏭 hecho a pedido para otro cliente, que ya salió de fábrica/.test(r1a.C.caja), r1a.C && r1a.C.caja);
  chk('FCU1c. la revisión automática tampoco le propone a B «✔ hay» con la unidad de A (antes tot.ok=1)', r1a.asig && r1a.asig.ok===0, r1a.asig);
  chk('FCU1d. (control) la pestaña Stock y el Plan no cambian: lo vendido sin entregar sigue siendo solo B (comp 1) y A sigue «lo trae la fábrica» (aFab 1)',
      r1a.fila && r1a.fila.comp===1 && r1a.fila.aFab===1, r1a.fila);
  const r1b = await cd1({ A:A_PEND, B:false });
  chk('FCU1e. sin B (nada vendido para después): C para el 26/10 tampoco se lleva la unidad de A → «🏭 NO HAY», pendientes 1 (la de A)',
      r1b.C && r1b.C.tipo==='pedir' && r1b.C.pend===1 && r1b.C.fabVenc===1, r1b.C);
  const r1c = await cd1({ A:{ enProd:true, prodF:'2026-10-21', prodEn:'Moreno' }, B:true });
  chk('FCU1f. (control) A recién pedido hoy (sale de fábrica el 23/10, DESPUÉS del Excel): esa unidad de Banzer no es la de A → C sigue «✅ DISPONIBLE» y la revisión propone ✔ a B',
      r1c.C && r1c.C.tipo==='hay' && r1c.C.fabVenc===0 && r1c.asig && r1c.asig.ok===1, [r1c.C && r1c.C.tipo, r1c.C && r1c.C.fabVenc, r1c.asig]);
  const r1d = await cd1({ A:{ enProd:true, prodF:'2026-10-16', prodEn:'Moreno', prodR:'2026-10-20' }, B:true });
  chk('FCU1g. (control) A SELLADO (llegó el 20/10): se reserva como siempre (comp), sin contarla dos veces → pendientes 2 (A + B), «🏭 NO HAY»',
      r1d.C && r1d.C.tipo==='pedir' && r1d.C.pend===2 && r1d.C.fabVenc===0, r1d.C);
  const r1e = await cd1({ A:A_PEND, B:true, fA:'2026-10-20' });
  chk('FCU1h. (control) A con fecha que YA PASÓ (20/10) y sin ✅: salió (§4co), no se aparta nada → C «✅ DISPONIBLE»',
      r1e.C && r1e.C.tipo==='hay' && r1e.C.fabVenc===0, r1e.C);
  const r1f = await cd1({ A:A_PEND, B:true, fA:'2026-10-21', turnoA:'AM', st:{ ban:{ TIT:1 }, inc:'am' } });
  chk('FCU1i. (control) A de HOY a la mañana con el Excel que ya trae la carga de la mañana (decisión 2): ya salió con el camión, no se aparta → C «✅ DISPONIBLE»',
      r1f.C && r1f.C.tipo==='hay' && r1f.C.fabVenc===0, r1f.C);
  const r1g = await cd1({ A:A_PEND, B:true, st:{} });
  chk('FCU1j. (control) sin nada a mano no hay qué apartar: pendientes 1 (solo B), sin la línea del 🏭',
      r1g.C && r1g.C.fabVenc===0 && r1g.C.pend===1 && !/hecho a pedido para otro cliente/.test(r1g.C.caja), r1g.C);
  const r1h = await cd1({ A:A_PEND, B:false, st:{ aca:{ TIT:1 }, ban:{ TIT:1 } } });
  chk('FCU1k. con 2 a mano (PTF 1 + Banzer 1) y la de A apartada, a C le queda 1: «✅ DISPONIBLE», Libres para el 26/10 1',
      r1h.C && r1h.C.tipo==='hay' && r1h.C.libres===1 && r1h.C.fabVenc===1, r1h.C);

  /* ── FCU2 (CD-2) · la fecha elegida en un día LLENO (viernes 23/10) ── */
  const lleno = async (stOp, extraP, dias) => ev(async (a)=>{
    var L=[]; (a.dias||['2026-10-23']).forEach(function(d){ for(var i=0;i<12;i++) L.push(_ped(d,'CONF',1,null,null,'AM')); for(var j=0;j<13;j++) L.push(_ped(d,'CONF',1,null,null,'PM')); });
    L.push(_ped('2026-10-24','TIT',1));
    var st=_stock(a.st); (a.p||[]).forEach(function(q){ q.k=K.TIT; st.p.push(q); });
    await _cargar(L, st);
    return { cupo:saldoDiaConCupo('2026-10-23',''), el23:_v('TIT',1,'2026-10-23'), el24:_v('TIT',1,'2026-10-24') };
  }, { st:stOp, p:extraP, dias:dias });
  const r2a = await lleno({ im:{ TIT:1 } });
  chk('(partida FCU2) el viernes 23/10 está lleno (12 AM + 13 PM): el primer día con cupo es el sábado 24/10', r2a.cupo && r2a.cupo.f==='2026-10-24', r2a.cupo);
  chk('FCU2a. 📥 Moreno 1, una vendida para el 24/10, elige el 23/10 (lleno): «para el viernes 23/10 (la fecha elegida) sí; para el sábado 24/10 ya no alcanza», sin «programá desde el sábado»',
      r2a.el23 && r2a.el23.tipo==='moreno' && r2a.el23.soloFecha==='2026-10-23' && /HAY EN MORENO/.test(r2a.el23.titulo) &&
      /para el viernes 23\/10 \(la fecha elegida\) sí; para el sábado 24\/10 ya no alcanza/.test(r2a.el23.titulo) && !/programá desde el sábado/.test(r2a.el23.titulo), r2a.el23 && r2a.el23.titulo);
  chk('FCU2b. (control) para el 24/10 el mismo cuadrito dice «🏭 NO HAY»: ahora no se contradicen', r2a.el24 && r2a.el24.tipo==='pedir', r2a.el24 && r2a.el24.titulo);
  const r2b = await lleno({}, [{ id:'fq1', u:1, tipo:'fabrica', fab:'MORENO', f:'2026-10-20' }]);
  chk('FCU2c. ⏳ lo que viene de fábrica (llega el 22/10), elige el 23/10 (lleno): «⏳ EN PRODUCCIÓN · llega el 22/10: para el viernes 23/10 (la fecha elegida) sí; para el sábado 24/10 ya no alcanza»',
      r2b.el23 && r2b.el23.tipo==='prod' && /EN PRODUCCIÓN · llega el 22\/10: para el viernes 23\/10 \(la fecha elegida\) sí; para el sábado 24\/10 ya no alcanza/.test(r2b.el23.titulo), r2b.el23 && r2b.el23.titulo);
  const r2c = await lleno({ im:{ TIT:1 } }, [{ id:'rq1', u:1, tipo:'recogida', de:'IM - PRODUCTOTERMINADO', f:'2026-10-21', llega:'2026-10-22' }]);
  chk('FCU2d. 🚚 la recogida programada para el 22/10, elige el 23/10 (lleno): «🚚 VIENE DE MORENO · logística lo trae el jueves 22/10: para el viernes 23/10 (la fecha elegida) sí; …ya no alcanza»',
      r2c.el23 && r2c.el23.tipo==='recogida' && /VIENE DE MORENO · logística lo trae el jueves 22\/10: para el viernes 23\/10 \(la fecha elegida\) sí; para el sábado 24\/10 ya no alcanza/.test(r2c.el23.titulo),
      r2c.el23 && r2c.el23.titulo);
  const r2d = await ev(async ()=>{ await _cargar([_ped('2026-10-24','TIT',1)], _stock({ im:{ TIT:1 } })); return _v('TIT',1,'2026-10-23'); });
  chk('FCU2e. (control) sin el día lleno: «📥 HAY EN MORENO · se trae en 1 día: programá desde el viernes 23/10», como siempre',
      r2d && r2d.tipo==='moreno' && !r2d.soloFecha && /programá desde el viernes 23\/10/.test(r2d.titulo), r2d && r2d.titulo);
  const r2e = await lleno({ aca:{ TIT:1 } }, null, ['2026-10-22','2026-10-23']);
  chk('FCU2f. (control) «✅» ya lo hacía y sigue igual (jueves y viernes llenos): «✅ DISPONIBLE para el viernes 23/10 (la fecha elegida) · para el sábado 24/10 ya no alcanza»',
      r2e.el23 && r2e.el23.tipo==='hay' && /DISPONIBLE para el viernes 23\/10 \(la fecha elegida\) · para el sábado 24\/10 ya no alcanza/.test(r2e.el23.titulo), r2e.el23 && r2e.el23.titulo);

  /* ── FCU3 (CD-3) · una medida estándar escrita con «CM» en «Otros» ── */
  const r3 = await ev(async ()=>{
    await _cargar([ _ped('2026-10-28', 'ORO105', 1, { medida:'105X190CM' }) ], _stock({ aca:{ ORO105:3 } }));
    var out={ k:K.ORO105, kCM:stockInfo({ desc:'ORO ORTOPEDICO', medida:'105X190CM' }).k, kEsp:stockInfo({ desc:'ORO ORTOPEDICO', medida:'105X190 + 2CM DE ALTURA C/CAJON' }).k,
              k180:stockInfo({ desc:'ORO ORTOPEDICO', medida:'180X200CM' }).k, kM:stockInfo({ desc:'ORO ORTOPEDICO', medida:'1,05 x 1,90' }).k };
    var L=stockData().lista; out.filas=L.filter(function(o){ return /^ORO ORTOPEDICO\|/.test(o.k); }).map(function(o){ return o.k+':'+o.comp; });
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, { desc:'ORO ORTOPEDICO', medida:'105X190CM', cant:1 }); out.caja=_caja(0);
    return out;
  });
  chk('FCU3a. «105X190CM» en «Otros» arma la MISMA clave que 105x190 (también «1,05 x 1,90»)', r3.kCM===r3.k && r3.kM===r3.k && r3.k==='ORO ORTOPEDICO|105X190', [r3.k, r3.kCM, r3.kM]);
  chk('FCU3b. …y el cuadrito dice «✅ DISPONIBLE» con lo que hay en PTF (antes «❓ NO RECONOZCO ESTE PRODUCTO»)',
      r3.caja && r3.caja.existe && !r3.caja.hidden && r3.caja.tipo==='hay' && r3.caja.k===r3.k && /DISPONIBLE/.test(r3.caja.txt) && !/NO RECONOZCO/.test(r3.caja.txt), r3.caja);
  chk('FCU3c. en Stock el pedido escrito «105X190CM» cuenta en la fila de la 105x190 (una sola fila, con lo vendido)',
      r3.filas && r3.filas.length===1 && r3.filas[0]==='ORO ORTOPEDICO|105X190:1', r3.filas);
  chk('FCU3d. (control) «105X190 + 2CM DE ALTURA C/CAJON» (otro producto) y «180X200CM» (no es una medida de siempre) NO se juntan con la 105x190',
      r3.kEsp!==r3.k && r3.k180!==r3.k && /180X200/.test(r3.k180), [r3.kEsp, r3.k180]);

  /* ── FCU4 (CD-4) · el chip del buscador con lo de Moreno ── */
  const r4 = await ev(async ()=>{
    await _cargar([], _stock({ ban:{ TIT:2 }, im:{ TIT:31 } }));
    _nuevo(); _fecha('2026-10-22');
    var conM=_txt(fxBuscaChip({ d:'TITANIO ICE', m:'160x190', code:'CH1201' }));
    await _cargar([], _stock({ ban:{ TIT:2 } }));
    var sinM=_txt(fxBuscaChip({ d:'TITANIO ICE', m:'160x190', code:'CH1201' }));
    return { conM:conM, sinM:sinM };
  });
  chk('FCU4a. Banzer 2 y Moreno 31: el chip dice «✅ 2 a mano · +31 en Moreno» (antes «✅ 33 libres»)', /✅ 2 a mano · \+31 en Moreno/.test(r4.conM||'') && !/33 libres/.test(r4.conM||''), r4.conM);
  chk('FCU4b. (control) sin nada en Moreno, como siempre: «✅ 2 libres»', /✅ 2 libres/.test(r4.sinM||''), r4.sinM);

  /* ── FCU5 (CD-5) · «Mientras guardabas, otro vendedor vendió lo mismo» ── */
  const cd5 = async (op) => ev(async (op)=>{
    try{ closeModal(); }catch(e){}
    var t=document.getElementById('toast'); t.className='toast'; t.textContent='';
    var A=_ped('2026-10-22', 'TIT', 2); A.id='pa';                                  // nuestro pedido, ya guardado
    var B=_ped(op.fB, 'TIT', 1); B.id='pb';                                         // lo que vendió el otro mientras tanto
    await _cargar([A, B], _stock({ aca:{ TIT:2 } }));
    if(op.vieja) window._SRV.congelada=[A];                                         // la relectura todavía no trae a B (caché de doGet)
    var cn=CONNECTED; if(op.sinRed) CONNECTED=false;
    var rec={ id:'pa', oc:A.oc, fecha:'2026-10-22' }, saldo=[{ k:K.TIT, u:2, libres:2, otros:1, faltan:1 }];
    var lin={ k:K.TIT, u:2, conocidos:[], nombre:'TITANIO ICE 160x190', tipo:op.tipo||'hay', fecha:'2026-10-22', porFecha:false };
    var r; try{ r=await saldoAvisoServidor(rec, saldo, { lineas:[lin] }); }finally{ CONNECTED=cn; window._SRV.congelada=null; }
    await new Promise(function(res){ setTimeout(res, 50); });
    var out={ modal:_modal(), toast:_toast() }; try{ closeModal(); }catch(e){}
    return out;
  }, op);
  const r5a = await cd5({ fB:'2026-10-24' });
  chk('FCU5a. el otro vendió para DESPUÉS (24/10) y nuestro pedido del 22/10 sigue cubierto (2 a mano): NO sale la ventana de alarma (antes «ya no hay saldo libre»)',
      r5a.modal && !r5a.modal.on, r5a.modal && r5a.modal.txt.slice(0,200));
  chk('FCU5b. …una línea: «Otro vendedor vendió … para otra fecha: tu pedido sigue cubierto para el 22/10»',
      r5a.toast && /Otro vendedor vendió TITANIO ICE 160x190 para otra fecha: tu pedido sigue cubierto para el 22\/10/.test(r5a.toast.txt), r5a.toast);
  const r5b = await cd5({ fB:'2026-10-22' });
  chk('FCU5c. el otro vendió para el MISMO día: la ventana sale con los números de ahora: «con la planilla de ahora, para el 22/10 ya no alcanza (faltan 1)» y lo que dice el cuadrito («🏭 NO HAY»)',
      r5b.modal && r5b.modal.on && /Mientras guardabas, otro vendedor vendió lo mismo/.test(r5b.modal.txt) &&
      /otro vendedor vendió 1 de TITANIO ICE 160x190: con la planilla de ahora, para el 22\/10 ya no alcanza \(faltan 1\)/.test(r5b.modal.txt) && /El cuadrito dice: «🏭 NO HAY/.test(r5b.modal.txt) &&
      /Tu pedido quedó guardado igual/.test(r5b.modal.txt), r5b.modal && r5b.modal.txt.slice(0,400));
  const r5c = await cd5({ fB:'2026-10-24', vieja:true });
  chk('FCU5d. la relectura todavía no trae lo del otro (la caché de 20 s de doGet): no se decide con ella → «para el 22/10 puede que ya no alcance (faltarían 1)», nunca el «ya no hay saldo libre» firme',
      r5c.modal && r5c.modal.on && /para el 22\/10 puede que ya no alcance \(faltarían 1\)/.test(r5c.modal.txt) && !/ya no hay saldo libre/.test(r5c.modal.txt), r5c.modal && r5c.modal.txt.slice(0,300));
  const r5d = await cd5({ fB:'2026-10-24', sinRed:true });
  chk('FCU5e. sin poder releer (sin conexión): igual, «puede que ya no alcance», con «Avisale al cliente que puede demorar (hay que mandar a producir)»',
      r5d.modal && r5d.modal.on && /puede que ya no alcance \(faltarían 1\)/.test(r5d.modal.txt) && /Avisale al cliente que puede demorar \(hay que mandar a producir\)/.test(r5d.modal.txt), r5d.modal && r5d.modal.txt.slice(0,300));
  const r5e = await cd5({ fB:'2026-10-22', tipo:'pedir' });
  chk('FCU5f. (control, H2) si ya veía «🏭 NO HAY», lo que vendió otro no le abre ninguna ventana', r5e.modal && !r5e.modal.on, r5e.modal && r5e.modal.txt.slice(0,160));

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.log('ERROR', e && e.stack || e); process.exit(1); });
