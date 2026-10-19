/* 📅 EL CUADRITO DEL VENDEDOR RESERVA POR FECHA (18/10, §4ls, decisión 3 del dueño).

   El dueño (18/10): para prometer un día, el cuadrito descuenta SOLO lo vendido sin entregar con fecha hasta ese día —no lo vendido
   para dentro de 10 días— más lo de este pedido, con el reparto por fecha de la revisión automática; abajo sigue diciendo cuánto hay
   pendiente en total. La revisión 2 (09-16/10) midió 10 de 104 renglones que dijeron «🏭 NO HAY» con stock reservando por fecha, 7
   de ellos ALMOHADA 50x70 (35 a mano, 34 vendidas, 4 hasta su fecha).

   LO QUE ESTA PRUEBA CUIDA (las «CF» fallan contra la página de antes, `238c12a`, que descontaba TODO lo pendiente):
   CF1  El caso de la ALMOHADA 50x70 en el formulario: 35 a mano (PTF 2 + Banzer 33), 4 vendidas para mañana y 30 para el 30/10;
        2 más para mañana → «✅ DISPONIBLE», con «Pendientes hasta el 22/10 4 · Libres para el 22/10 31», la segunda línea
        «Pendiente en total: 34 (30 para después del 22/10)» y el aviso ámbar «… le va a faltar 1: hay que reponer antes del 30/10».
   CF2  (control, verde también antes) La misma venta para el 31/10 (DESPUÉS de las otras): lo de antes se lleva lo que hay → no
        está a mano; el número dice el total, como siempre (no hay nada para después de esa fecha).
   CF3  Sin fecha elegida, el día que se mira es el primero con cupo (mañana).
   CF4  Lo de después que no se puede reponer a tiempo: «… el pedido de ese día se atrasaría. Avisá a logística»; con Moreno que
        llega antes, «hay que reponer antes del…».
   CF5  Moreno también reserva por fecha: 5 en Moreno, 4 vendidas para el 30/10 y 2 para el 23/10 → «📥 HAY EN MORENO» (antes «🏭»).
   CF6  La reserva que viaja al servidor manda el libre A LA FECHA (31), no el total (1).
   CF7  La pregunta al guardar: con stock a la fecha no pregunta nada; sin stock a la fecha dice «no hay saldo libre para el …».
   CF8  (H2) «Otro vendedor vendió lo mismo» no sale si ya veía «🏭 NO HAY» (mandar a producir) o «🛑 YA NO SE FABRICA»; con «hay»
        sí, y con la reserva por fecha dice «para el 22/10 puede que ya no alcance».
   CF9  Bloki al guardar no manda el mensaje «se fabrica» de lo que sí hay para su fecha.
   CF10 El buscador de productos dice «✅ 31 libres al 22/10».
   CF11 (H6) Un código AGOTADO completado desde el histórico dice «🏭 NO HAY» (antes gris, «No encuentro este producto»); un
        «Med.Esp.» del histórico entra con la medida de su nombre (160x200) y dice «📐 MEDIDA ESPECIAL».
   CF12 (H7) La medida escrita en el NOMBRE con «Medida» vacía: hay cuadrito (✅ con stock; 📐 con una medida especial).
   (Controles, verdes antes y después) Sin nada para después, los números y el texto son los de siempre; lo DISCONTINUADO sigue
   descontando todo lo pendiente (no se repone); la pestaña Stock no cambia.

   Reloj CLAVADO: miércoles 21/10/2026, 10:00 de Bolivia (mañana es el jueves 22; lo que se manda a producir hoy sale el viernes 23 y
   se entrega desde el sábado 24). Red cortada, datos sintéticos.
   Se corre:  node tests/test_stock_rev2_cuadrito_fecha.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_238c12a.html node tests/test_stock_rev2_cuadrito_fecha.js   (18/10: 23 de 31 rojas; las 8 verdes son
              la partida, CF2, CF8c, los tres controles y «sin errores») */
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
  window._SRV={ pedidos:[], stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){ return Promise.resolve({ ok:true, pedido:rec }); };
  window._LOG='PRODUCTOS TERMINADOS FAB.'; window._BZ='Almacen Distribucion Banzer'; window._IM='IM - PRODUCTOTERMINADO';
  window.PR={
    ALM:{ desc:'ALMOHADA', medida:'50x70', codigo:'CD1403' },
    TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
    JUN:{ desc:'ESPECIAL JUNIOR', medida:'105x190', codigo:'CH1075' },       // discontinuado (x:1)
    ORO:{ desc:'ORO ORTOPEDICO', medida:'180x190', codigo:'' }
  };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockInfo(PR[n]).k; });
  /* El stock: los tres Excel de HOY a las 08:00 (`aca`, `ban`, `im`: {producto: unidades}). */
  window._stock=function(op){
    op=op||{};
    var hoy=todayStr(), t=new Date(hoy+'T08:00:00-04:00').getTime();
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:00:00', u:{}, solo0:true, alm:_LOG, cod:{}, t:t, inc:false }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[_BZ]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{}, inc:false };
    st.g[_IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:t, rs:{} };
    st.al[_LOG]='log'; st.al[_BZ]='sale'; st.al[_IM]='otro';
    Object.keys(op.aca||{}).forEach(function(n){ st.c.u[K[n]]=op.aca[n]; });
    Object.keys(op.ban||{}).forEach(function(n){ st.g[_BZ].u[K[n]]=op.ban[n]; });
    Object.keys(op.im||{}).forEach(function(n){ st.g[_IM].u[K[n]]=op.im[n]; });
    return st;
  };
  window._n=0;
  window._ped=function(fecha, n, cant, extra){
    _n++;
    return Object.assign({ id:'p'+_n, oc:'OC 10-'+(800+_n), fecha:fecha, turno:'AM', cliente:'CLIENTE '+_n, vendedor:'Maria Flores',
             celular:'7000000'+(_n%10), zona:'Norte', direccion:'Calle 1', maps:'', ts:Date.now()-86400000, entregado:false,
             productos:[Object.assign({}, PR[n], { cant:cant })] }, extra||{});
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    SALDO_CACHE=null; stockOlvidarIndice();
  };
  window._v=function(n, cant, fecha){
    var v=saldoVeredicto(K[n], cant, '', fecha==null?'':fecha, true);
    return { tipo:v.tipo, color:v.color, libres:v.libres, libresTotal:v.libresTotal, pend:v.pend, pendFecha:v.pendFecha, pendDespues:v.pendDespues,
             fechaRes:v.fechaRes||'', desde:v.desde||'', despues:v.despues||null, faltan:v.faltan, sinLibre:!!v.sinLibre,
             titulo:saldoTitulo(v), alerta:(v.sinLibre ? saldoAlertaTxt(v) : ''), html:(function(){ var d=document.createElement('div'); d.innerHTML=saldoCajaHtml(v); return d.innerText.replace(/\s+/g,' ').trim(); })() };
  };
  /* El formulario, como lo llena una vendedora. */
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  window._renglon=function(i, o){
    var cards=document.querySelectorAll('#f-productos .prod-card');
    while(cards.length<=i){ addProdRow(); cards=document.querySelectorAll('#f-productos .prod-card'); }
    var c=cards[i], ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.desc!=null){ var d=c.querySelector('.prod-desc'); d.value=o.desc; ev(d); }
    if(o.medida!=null){ var m=c.querySelector('.prod-medida'), mo=c.querySelector('.prod-medida-otro');
      if(o.medida==='' ){ m.value=''; ev(m,'change'); }
      else if(MEDIDAS.indexOf(o.medida)>=0){ m.value=o.medida; ev(m,'change'); }
      else { m.value='Otros'; ev(m,'change'); mo.value=o.medida; ev(mo); } }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._caja=function(i){
    saldoAvisosPintarYa();
    var c=document.querySelectorAll('#f-productos .prod-card')[i], b=c && c.querySelector('.prod-saldo');
    if(!b) return { existe:false, hidden:true, cls:'', txt:'' };
    return { existe:true, hidden:!!b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim(), tipo:(b._v||{}).tipo||'', med:(c.querySelector('.prod-medida-otro')||{}).value||'' };
  };
  window._fecha=function(f){ var e=document.getElementById('f-fecha'); e.value=f; e.dispatchEvent(new Event('change', { bubbles:true })); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{width:1300,height:950}, timezoneId:'America/La_Paz' });
  page.on('pageerror', e=>errores.push(e.message));
  const dialogos=[]; page.on('dialog', d=>{ dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date(RELOJ));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,500) }; } };

  const reloj = await ev(()=>({ hoy:todayStr(), prox:proximoDiaEntrega(), arr:diaArranque(), sale:saldoSaleDeFabrica(diaArranque()), rec:saldoDiaRecoge() }));
  chk('(partida) reloj clavado: hoy 21/10, mañana 22/10, lo que se pide hoy sale el 23/10, Moreno se recoge el 22/10',
      reloj.hoy==='2026-10-21' && reloj.prox==='2026-10-22' && reloj.sale==='2026-10-23' && reloj.rec==='2026-10-22', reloj);

  /* ── CF1. ALMOHADA 50x70: el caso real, en el formulario ── */
  const cf1 = await ev(async()=>{
    var peds=[_ped('2026-10-22','ALM',4)]; for(var i=0;i<30;i++) peds.push(_ped('2026-10-30','ALM',1));
    await _cargar(peds, _stock({ aca:{ALM:2}, ban:{ALM:33} }));
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, Object.assign({}, PR.ALM, { cant:2 }));
    return { caja:_caja(0), v:_v('ALM', 2, '2026-10-22') };
  });
  chk('CF1a. ALMOHADA 50x70 (35 a mano, 4 vendidas para mañana y 30 para el 30/10), 2 más para mañana: «✅ DISPONIBLE», verde',
      cf1.caja && /✅ DISPONIBLE/.test(cf1.caja.txt) && /ps-verde/.test(cf1.caja.cls) && cf1.v.tipo==='hay', cf1);
  chk('CF1b. …los números dicen que son A LA FECHA: «Pendientes hasta el 22/10 4 · Libres para el 22/10 31»',
      cf1.caja && /En almacén 35 · Pendientes hasta el 22\/10 4 · Libres para el 22\/10 31/.test(cf1.caja.txt), cf1.caja && cf1.caja.txt);
  chk('CF1c. …y la segunda línea dice el total: «Pendiente en total: 34 (30 para después del 22/10)»',
      cf1.caja && /Pendiente en total: 34 \(30 para después del 22\/10\)/.test(cf1.caja.txt), cf1.caja && cf1.caja.txt);
  chk('CF1d. …y el aviso ámbar: a lo vendido para después le va a faltar 1, hay que reponer antes del 30/10 (el Plan ya lo pide)',
      cf1.caja && /a lo vendido para después del 22\/10 le va a faltar 1: hay que reponer antes del 30\/10\. El Plan de stock ya lo pide\./.test(cf1.caja.txt) &&
      cf1.v.despues && cf1.v.despues.u===1 && cf1.v.despues.antes==='2026-10-30' && !cf1.v.despues.atrasa, [cf1.caja && cf1.caja.txt, cf1.v.despues]);
  chk('CF1e. …el veredicto lleva lo de la fecha y lo total por separado (libres 31 a la fecha, 1 en total; pendientes 4 + 30)',
      cf1.v.libres===31 && cf1.v.libresTotal===1 && cf1.v.pend===34 && cf1.v.pendFecha===4 && cf1.v.pendDespues===30 && cf1.v.fechaRes==='2026-10-22', cf1.v);

  /* ── CF2 y CF3. La misma venta para DESPUÉS de las otras, y sin fecha ── */
  const cf2 = await ev(async()=>{ _fecha('2026-10-31'); return { caja:_caja(0), v:_v('ALM', 2, '2026-10-31'), sin:_v('ALM', 2, '') }; });
  chk('CF2a. para el 31/10 (después de las 34 vendidas) lo que hay ya está vendido: NO es «✅ DISPONIBLE» (FIFO por fecha)',
      cf2.v.tipo!=='hay' && cf2.v.sinLibre && cf2.caja && !/✅ DISPONIBLE/.test(cf2.caja.txt), cf2.v);
  chk('CF2b. …y como no hay nada para después del 31/10, los números son los de siempre: «Pendientes de entrega 34 · Libres 1 · Faltan 1 (34 pendientes + 2 de este pedido − 35 en almacén)», sin línea de total',
      cf2.caja && /Pendientes de entrega 34 · Libres 1 · Faltan 1 \(34 pendientes \+ 2 de este pedido − 35 en almacén\)/.test(cf2.caja.txt) && !/Pendiente en total/.test(cf2.caja.txt), cf2.caja && cf2.caja.txt);
  chk('CF3. sin fecha elegida se mira el primer día con cupo (22/10): «✅ DISPONIBLE · podés programar desde mañana»',
      cf2.sin.tipo==='hay' && cf2.sin.fechaRes==='2026-10-22' && /desde mañana/.test(cf2.sin.titulo), cf2.sin);

  /* ── CF4. Lo de después que no se puede reponer a tiempo ── */
  const cf4 = await ev(async()=>{
    await _cargar([_ped('2026-10-22','TIT',1), _ped('2026-10-23','TIT',2)], _stock({ aca:{TIT:3} }));
    var a=_v('TIT', 1, '2026-10-22');
    await _cargar([_ped('2026-10-22','TIT',1), _ped('2026-10-23','TIT',2)], _stock({ aca:{TIT:3}, im:{TIT:5} }));
    var b=_v('TIT', 1, '2026-10-22');
    return { a:a, b:b };
  });
  chk('CF4a. TITANIO 160x190: 3 a mano, 1 vendida para el 22/10 y 2 para el 23/10, 1 más para el 22/10: «✅ DISPONIBLE» (hay para su fecha)',
      cf4.a.tipo==='hay' && cf4.a.libres===2 && cf4.a.pendFecha===1 && cf4.a.pendDespues===2, cf4.a);
  chk('CF4b. …pero la del 23/10 no llega a reponerse (la fábrica entrega desde el 24/10): «… el pedido de ese día se atrasaría. Avisá a logística»',
      cf4.a.despues && cf4.a.despues.atrasa==='2026-10-23' && /no llega antes del 23\/10: el pedido de ese día se atrasaría\. Avisá a logística/.test(cf4.a.html), [cf4.a.despues, cf4.a.html]);
  chk('CF4c. con 5 en Moreno (se traen el 22/10 y salen el 23/10) sí llega: «hay que reponer antes del 23/10», sin «se atrasaría»',
      cf4.b.tipo==='hay' && cf4.b.despues && !cf4.b.despues.atrasa && cf4.b.despues.antes==='2026-10-23' && /hay que reponer antes del 23\/10/.test(cf4.b.html) && !/se atrasaría/.test(cf4.b.html), [cf4.b.despues, cf4.b.html]);

  /* ── CF5. Moreno también reserva por fecha ── */
  const cf5 = await ev(async()=>{
    var peds=[]; for(var i=0;i<4;i++) peds.push(_ped('2026-10-30','TIT',1));
    await _cargar(peds, _stock({ im:{TIT:5} }));
    return _v('TIT', 2, '2026-10-23');
  });
  chk('CF5. 0 a mano, 5 en Moreno, 4 vendidas para el 30/10, 2 para el 23/10: «📥 HAY EN MORENO · programá desde el 23/10» (antes «🏭 NO HAY»)',
      cf5.tipo==='moreno' && cf5.desde==='2026-10-23' && cf5.libres===5 && cf5.pendDespues===4 && /HAY EN MORENO/.test(cf5.titulo), cf5);

  /* ── CF6, CF7, CF9, CF10. La reserva al servidor, la pregunta al guardar, Bloki y el buscador, con la ALMOHADA de CF1 ── */
  const cf6 = await ev(async()=>{
    var peds=[_ped('2026-10-22','ALM',4)]; for(var i=0;i<30;i++) peds.push(_ped('2026-10-30','ALM',1));
    await _cargar(peds, _stock({ aca:{ALM:2}, ban:{ALM:33} }));
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, Object.assign({}, PR.ALM, { cant:2 }));
    _caja(0);
    var r=saldoReservaArmar();
    var preg=saldoConfirmarAlGuardar(null, false, false);
    var rec=_ped('2026-10-22','ALM',2); rec.id='p-bloki'; rec.vendedor='Maria Flores';
    var M=asisMsgEspera(rec);
    var chip=fxBuscaChip({ d:'ALMOHADA', m:'50x70', code:'CD1403' });
    return { envio:r && r.envio, linea:r && r.lineas && r.lineas[0], preg:preg, M:M ? (M.t+' · '+M.x) : null, chip:String(chip).replace(/<[^>]+>/g,'') };
  });
  const dlg6 = dialogos.splice(0);
  chk('CF6. la reserva que viaja al servidor manda el libre A LA FECHA que se prometió (31), no el total (1)',
      cf6.envio && cf6.envio.lineas && cf6.envio.lineas[0].libres===31 && cf6.envio.lineas[0].u===2 && cf6.envio.lineas[0].tipo===undefined, cf6.envio);
  chk('CF7a. guardar la ALMOHADA para mañana no pregunta nada (hay para su fecha)', cf6.preg===true && dlg6.length===0, [cf6.preg, dlg6]);
  chk('CF9. Bloki no le arma al vendedor el mensaje «se fabrica» de lo que sí hay para su fecha', cf6.M===null, cf6.M);
  chk('CF10. el buscador de productos dice «✅ 31 libres al 22/10»', /✅ 31 libres al 22\/10/.test(cf6.chip), cf6.chip);

  const cf7 = await ev(async()=>{
    await _cargar([_ped('2026-10-30','TIT',1)], _stock({}));
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, Object.assign({}, PR.TIT, { cant:1 }));
    var c=_caja(0), v=_v('TIT', 1, '2026-10-22');
    var preg=saldoConfirmarAlGuardar(null, false, false);
    return { c:c, v:v, preg:preg };
  });
  const dlg7 = dialogos.splice(0);
  chk('CF7b. sin stock: la pregunta dice «no hay saldo libre para el 24/10 (faltan 1)» —el día que se miró— y el cuadrito «Faltan para el 24/10 1»',
      dlg7.length===1 && /no hay saldo libre para el 24\/10 \(faltan 1\)/.test(dlg7[0]) && cf7.c && /Faltan para el 24\/10 1/.test(cf7.c.txt) && /Pendiente en total: 1 \(1 para después del 24\/10\)/.test(cf7.c.txt),
      [dlg7, cf7.c && cf7.c.txt, cf7.v.fechaRes]);

  /* ── CF8 (H2). La ventana «otro vendedor vendió lo mismo» ── */
  const cf8 = await ev(async()=>{
    try{ closeModal(); }catch(e){}
    var rec={ id:'p-h2', oc:'OC 10-999' }, s=[{ k:K.TIT, u:1, libres:-1, otros:1, faltan:3 }];
    saldoAvisoServidor(rec, s, { lineas:[{ k:K.TIT, nombre:'TITANIO ICE 160x190', tipo:'pedir' }] });
    var a=document.getElementById('modal').classList.contains('on'); try{ closeModal(); }catch(e){}
    saldoAvisoServidor(rec, s, { lineas:[{ k:K.TIT, nombre:'TITANIO ICE 160x190', tipo:'nofab' }] });
    var b=document.getElementById('modal').classList.contains('on'); try{ closeModal(); }catch(e){}
    saldoAvisoServidor(rec, [{ k:K.TIT, u:1, libres:1, otros:1, faltan:1 }], { lineas:[{ k:K.TIT, nombre:'TITANIO ICE 160x190', tipo:'hay' }] });
    var c=document.getElementById('modal').classList.contains('on'), ct=document.getElementById('modal-box').innerText.replace(/\s+/g,' '); try{ closeModal(); }catch(e){}
    saldoAvisoServidor(rec, [{ k:K.TIT, u:1, libres:1, otros:1, faltan:1 }], { lineas:[{ k:K.TIT, nombre:'TITANIO ICE 160x190', tipo:'hay', porFecha:true, fecha:'2026-10-22' }] });
    var d=document.getElementById('modal').classList.contains('on'), dt=document.getElementById('modal-box').innerText.replace(/\s+/g,' '); try{ closeModal(); }catch(e){}
    return { a:a, b:b, c:c, ct:ct, d:d, dt:dt };
  });
  chk('CF8a. (H2) si el vendedor ya veía «🏭 NO HAY» (mandar a producir), lo que vendió otro no le abre ninguna ventana', cf8.a===false, cf8);
  chk('CF8b. (H2) …ni si veía «🛑 YA NO SE FABRICA»', cf8.b===false, cf8);
  chk('CF8c. (control) si veía «✅ hay», la ventana sale como siempre: «ya no hay saldo libre (faltan 1)»',
      cf8.c===true && /otro vendedor vendió 1 de TITANIO ICE 160x190: ya no hay saldo libre \(faltan 1\)/.test(cf8.ct), cf8.ct && cf8.ct.slice(0,200));
  chk('CF8d. con la reserva por fecha dice «para el 22/10 puede que ya no alcance (faltarían 1)» (el servidor no sabe la fecha del otro)',
      cf8.d===true && /para el 22\/10 puede que ya no alcance \(faltarían 1\)/.test(cf8.dt), cf8.dt && cf8.dt.slice(0,200));

  /* ── CF11 (H6). El código agotado del histórico y el «Med.Esp.» ── */
  const cf11 = await ev(async()=>{
    await _cargar([], _stock({ aca:{TIT:2} }));
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, { codigo:'COLT0089', cant:1 });
    var a=_caja(0);
    var d0=(document.querySelectorAll('#f-productos .prod-card')[0].querySelector('.prod-desc')||{}).value;
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, { codigo:'CH1779', cant:1 });
    var b=_caja(0);
    var pa=productoDeAlmacen('CH1779');
    return { a:a, d0:d0, b:b, pa:pa };
  });
  chk('CF11a. (H6) un código agotado que solo está en el histórico (COLT0089) completa el renglón y el cuadrito dice «🏭 NO HAY», no gris',
      cf11.a && cf11.a.existe && !cf11.a.hidden && cf11.a.tipo==='pedir' && /NO HAY/.test(cf11.a.txt) && !/No encuentro/.test(cf11.a.txt) && /SEMIORTOPEDICO/i.test(cf11.d0||''), cf11.a);
  chk('CF11b. (H6) un «Med.Esp.» del histórico (CH1779, «ORO BI RELAX Med.Esp. 2.5PLZ 160X200CM») entra con 160x200 y el cuadrito dice «📐 MEDIDA ESPECIAL»',
      cf11.pa && cf11.pa.m==='160x200' && cf11.b && cf11.b.med==='160x200' && cf11.b.tipo==='especial' && /MEDIDA ESPECIAL/.test(cf11.b.txt), [cf11.pa, cf11.b]);

  /* ── CF12 (H7). La medida escrita en el nombre ── */
  const cf12 = await ev(async()=>{
    var st=_stock({}); st.c.u[stockInfo({ desc:'ORO ORTOPEDICO', medida:'180x190' }).k]=6;
    await _cargar([], st);
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, { desc:'ORO ORTOPEDICO 180X190', medida:'', cant:1 });
    var a=_caja(0);
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, { desc:'TITANIO ICE 180X200', medida:'', cant:1 });
    var b=_caja(0);
    var r=null; _nuevo(); _fecha('2026-10-22'); _renglon(0, { desc:'ORO ORTOPEDICO 180X190', medida:'', cant:1 }); _caja(0); r=saldoReservaArmar();
    return { a:a, b:b, r:r && r.envio };
  });
  chk('CF12a. (H7) «ORO ORTOPEDICO 180X190» con «Medida» vacía: aparece el cuadrito y dice «✅ DISPONIBLE» con los 6 de PTF',
      cf12.a && cf12.a.existe && !cf12.a.hidden && cf12.a.tipo==='hay' && /En almacén 6/.test(cf12.a.txt), cf12.a);
  chk('CF12b. (H7) «TITANIO ICE 180X200» con «Medida» vacía: «📐 MEDIDA ESPECIAL · se fabrica a pedido»',
      cf12.b && cf12.b.existe && !cf12.b.hidden && cf12.b.tipo==='especial' && /MEDIDA ESPECIAL/.test(cf12.b.txt), cf12.b);
  const stockKOro = 'ORO ORTOPEDICO|180X190';
  chk('CF12c. (H7) …y ese renglón viaja en la reserva del servidor (con los 6 libres)', cf12.r && cf12.r.lineas && cf12.r.lineas.length===1 && cf12.r.lineas[0].libres===6 && cf12.r.lineas[0].k===stockKOro, cf12.r);

  /* ── CF13. Lo que encontraron los verificadores (§4ls, corrector) ── */
  const cf13 = await ev(async()=>{
    var out={};
    /* (1) «⏳ EN PRODUCCIÓN» también avisa lo de después: 0 a mano, 1 pedida a fábrica el 19/10 (sale hoy), 1 vendida para el 23/10 y
       un pedido de 1 para el 22/10. */
    var st=_stock({ aca:{TIT:0} }); st.p=[{ id:'fq1', k:K.TIT, u:1, fab:'MORENO', f:'2026-10-19', esp:'', r:'' }];
    await _cargar([_ped('2026-10-23','TIT',1)], st);
    out.prod=_v('TIT', 1, '2026-10-22');
    /* (2) La fecha elegida ANTES del primer día con cupo (Eduardo agenda para hoy): 2 a mano y 2 vendidas para mañana. */
    await _cargar([_ped('2026-10-22','TIT',2)], _stock({ aca:{TIT:2} }));
    out.hoy=_v('TIT', 1, '2026-10-21');
    /* (3) Con el nombre a medio escribir no sale el cuadrito («TITANIO ICE 1», «TITANIO ICE 160X19»). */
    await _cargar([], _stock({ aca:{TIT:5} }));
    _nuevo(); _fecha('2026-10-22'); _renglon(0, { desc:'TITANIO ICE 1', medida:'', cant:1 }); out.medio1=_caja(0);
    _nuevo(); _fecha('2026-10-22'); _renglon(0, { desc:'TITANIO ICE 160X19', medida:'', cant:1 }); out.medio2=_caja(0);
    _nuevo(); _fecha('2026-10-22'); _renglon(0, { desc:'TITANIO ICE 160X190', medida:'', cant:1 }); out.entero=_caja(0);
    /* (4) La medida sacada del nombre no se repite en el nombre. */
    out.nombre=saldoNombre({ desc:'TITANIO ICE 160X190', medida:'160x190', medTxt:1 });
    /* (5) «Hay que reponer antes del 24/10» con el 24/10 = el primer día que llega lo que se manda a producir HOY: lo dice. */
    await _cargar([_ped('2026-10-24','TIT',3)], _stock({ aca:{TIT:0}, im:{TIT:3} }));
    out.reponer=_v('TIT', 1, '2026-10-23');
    _nuevo();
    return out;
  });
  chk('CF13a. ⏳ EN PRODUCCIÓN con lo vendido para después: el aviso de que a lo de después le va a faltar SÍ sale (antes, nada)',
      cf13.prod && cf13.prod.tipo==='prod' && cf13.prod.despues && cf13.prod.despues.u===1 && /le va a faltar 1/.test(cf13.prod.html||''), cf13.prod);
  chk('CF13b. la fecha elegida (hoy) antes del primer día con cupo: «✅ DISPONIBLE para el … (la fecha elegida) · para el jue 22/10 ya no alcanza» (antes prometía «desde mañana»)',
      cf13.hoy && cf13.hoy.tipo==='hay' && /\(la fecha elegida\)/.test(cf13.hoy.titulo||'') && /ya no alcanza/.test(cf13.hoy.titulo||'') && !/podés programar/.test(cf13.hoy.titulo||''), cf13.hoy && cf13.hoy.titulo);
  chk('CF13c. con el nombre a medio escribir («TITANIO ICE 1», «TITANIO ICE 160X19») no hay cuadrito; con «TITANIO ICE 160X190» sí',
      cf13.medio1 && (!cf13.medio1.existe || cf13.medio1.hidden) && cf13.medio2 && (!cf13.medio2.existe || cf13.medio2.hidden) && cf13.entero && cf13.entero.existe && !cf13.entero.hidden && cf13.entero.tipo==='hay',
      [cf13.medio1, cf13.medio2, cf13.entero && cf13.entero.tipo]);
  chk('CF13d. la medida sacada del nombre no se repite («TITANIO ICE 160X190», no «… 160X190 160x190»)', cf13.nombre==='TITANIO ICE 160X190', cf13.nombre);
  chk('CF13e. reponer justo para el primer día que llega lo de hoy: dice que hay que mandarlo a producir HOY, antes de las 16:30',
      cf13.reponer && cf13.reponer.despues && cf13.reponer.despues.hoy && /producir HOY, antes de las 16:30/.test(cf13.reponer.html||''), cf13.reponer);

  /* ── Controles: lo que NO cambia ── */
  const ctl = await ev(async()=>{
    await _cargar([_ped('2026-10-22','TIT',1)], _stock({ aca:{TIT:6} }));
    _nuevo(); _fecha('2026-10-22');
    _renglon(0, Object.assign({}, PR.TIT, { cant:1 }));
    var a=_caja(0);
    await _cargar([_ped('2026-10-30','JUN',2)], _stock({ aca:{JUN:2} }));
    var j=_v('JUN', 1, '2026-10-22');
    var peds=[_ped('2026-10-22','ALM',4)]; for(var i=0;i<30;i++) peds.push(_ped('2026-10-30','ALM',1));
    await _cargar(peds, _stock({ aca:{ALM:2}, ban:{ALM:33} }));
    var o=stockData().lista.filter(function(x){ return x.k===K.ALM; })[0];
    return { a:a, j:j, o:{ comp:o.comp, pedir:o.pedir, fabricar:o.fabricar, aviso:o.aviso, paraSalir:o.paraSalir } };
  });
  chk('(control) sin nada vendido para después, el cuadrito dice lo de siempre: «En almacén 6 · Pendientes de entrega 1 · Libres 5», sin línea de total ni aviso',
      ctl.a && /✅ DISPONIBLE/.test(ctl.a.txt) && /En almacén 6 · Pendientes de entrega 1 · Libres 5/.test(ctl.a.txt) && !/Pendiente en total/.test(ctl.a.txt) && !/reponer/.test(ctl.a.txt), ctl.a && ctl.a.txt);
  chk('(control) lo DISCONTINUADO sigue descontando todo lo pendiente (no se repone): 2 a mano y 2 vendidas para el 30/10 → no es «hay»',
      ctl.j.tipo!=='hay' && ctl.j.libres===0, ctl.j);
  chk('(control) la pestaña Stock no cambia: la ALMOHADA sigue con 34 vendidas y 35 para cargar', ctl.o.comp===34 && ctl.o.paraSalir===35, ctl.o);

  chk('ningún error de JavaScript en la página', errores.length===0, errores.slice(0,5));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(1); });
