/* 🧮 LOS ERRORES PUBLICADOS QUE CAMBIAN LO QUE SE PIDE (18/10, §4ls; revisión 2 de Stock, prioridad 1.1-1.4).

   LO QUE ESTA PRUEBA CUIDA (los ✗ fallan contra la página de antes, `6725424`):
   A  (1.1, Man-VM1 / VV1 / VA9) Programar la recogida que propone la fila («🏭 Pedí 2 esta semana · traé 2 de Moreno») ya no esconde lo
      que falta fabricar detrás de «🚚 Ya pedido»: el aviso sigue «pedir», la acción dice «🏭 Pedí 2 esta semana · ya viene la recogida de
      2», el producto sigue en la cinta y en el grupo «🏭 esta semana» del Plan (no en «✅ Alcanza»), con la casilla «Ya pedí», y la copia
      para la fábrica lo pide. (Control: lo pedido que alcanza sigue «🚚 Ya pedido».)
   B  (1.2, Cie-C2) El plazo medido de la fábrica usa solo el «llegó» (`prodR`) o el día REAL de la entrega (`eF`), nunca la fecha
      agendada ni un día que no llegó, y UNA muestra por pedido: el ✅ adelantado de un pedido con tres líneas 🏭 agendado para la semana
      que viene ya no lleva Moreno de 4 a 12 días; un ✅ sin `eF` no mide hasta el día agendado; tres líneas son una muestra.
   C  (1.3, V-REV-1 / V-REV-2) La «✗ no hay» marcada se vuelve a repartir por fecha: si llegó stock la revisión la propone ✔ (no
      «contradice a nadie») y Aplicar la escribe, en vez de dárselo a un pedido de entrega POSTERIOR; «💡 Para entregar antes» sigue
      después de Aplicar; lo en camino cubre la ✗ una sola vez en «✗ No alcanza» (también la que el filtro de días deja afuera). Las ✔
      de logística siguen protegidas.
   D  (1.4, VF1 / VF3) Después del corte de las 16:30 los días de venta se cuentan desde el día en que arranca la fábrica: «Pedir 7
      días» y «15 días» dan lo mismo a las 16:29, a las 16:31, a las 23:59 y el sábado a las 00:01; «🚚 Traé 1 de Moreno» no se prende a
      las 16:30 en un producto que se corta en 9 días; y con el «en producción» automático prendido, «📌 Hoy se piden N» (anotado a la
      mañana) y «🚨 Pedí N ya» de la tarde dicen el mismo número. El plazo de los avisos no cambia (16:31 → 5 días).

   Reloj CLAVADO (viernes 16/10/2026 de Bolivia; D cambia la hora en la misma página). Red cortada, datos sintéticos.
   Se corre:  node tests/test_stock_rev2_calculo.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_6725424.html node tests/test_stock_rev2_calculo.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

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
  window._copiado=''; copyText=function(t){ window._copiado=String(t); };
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
  window._n=0;
  window._ped=function(fecha, lineas, extra){
    var id='p'+(++window._n);
    return Object.assign({ id:id, oc:'OC 10-'+(800+window._n), fecha:fecha, turno:'AM', cliente:'CLIENTE '+id.toUpperCase(), vendedor:'Maria Flores',
             celular:'70000000', zona:'Norte', productos:lineas }, extra||{});
  };
  /* Ventas YA entregadas del equipo (una entrega por fecha): arman el ritmo de 15 días. */
  window._ventas=function(cod, desc, med, fechas, cant){
    return fechas.map(function(f){ return _ped(f, [{ codigo:cod, desc:desc, medida:med, cant:cant, precio:1000 }], { entregado:true }); });
  };
  window._cargar=async function(pedidos, stock){
    window._SRV.pedidos=pedidos||[]; window._SRV.stock=stock||_stock(); STOCK_CARGADO=false;
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    stockOlvidarIndice();
  };
  window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===k; })[0]||null; };
  window._txt=function(h){ var d=document.createElement('div'); d.innerHTML=h||''; return (d.innerText||d.textContent||'').replace(/\s+/g,' ').trim(); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (cuando) => {
    const page = await browser.newPage({ viewport:{ width:1300, height:1000 }, timezoneId:'America/La_Paz' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(PREPARAR);
    return page;
  };
  const ev = (page) => async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,500) }; } };

  /* ═══ A, B y C: viernes 16/10 a las 12:00 ═══ */
  const page = await abrir('2026-10-16T12:00:00-04:00');
  const E = ev(page);

  /* ── A. Programar la recogida que propone la fila (1.1) ── */
  const a = await E(async () => {
    var K=_k('CH1129','COLCHON TITANIO LATEX','140x190');
    /* 🎯 (18/10, §4ls, decisión 4, a conciencia) Con el punto de pedido y el objetivo (la venta de los últimos 26 días hábiles), las 12
       de antes en 6 entregas pedían solo 2 (las traía Moreno) y el caso dejaba de tener algo para fabricar. Ahora son 24 en 12 entregas
       (6 en los últimos 15 días: rotación media, 0,8 por día): objetivo 10, punto de pedido 8; con 6 en PTF y 2 en Moreno se pide
       10 − 6 = 4: traé 2 de Moreno y pedí 2, como antes. */
    var ventas=_ventas('CH1129','COLCHON TITANIO LATEX','140x190', ['2026-09-17','2026-09-19','2026-09-22','2026-09-24','2026-09-29','2026-10-01','2026-10-05','2026-10-07','2026-10-09','2026-10-12','2026-10-13','2026-10-15'], 2);
    await _cargar(ventas, _stock(function(st){ st.c.u[K]=6; st.g[_IM].u[K]=2; }));
    var o=_fila(K), antes={ aviso:o.aviso, fab:o.fabricar, rec:o.recoger, acc:sfAccion(o), grupo:planGrupoDe(o) };
    // la recogida que propone la fila, por el camino de la pantalla (su sugerencia y el día de mañana)
    abrirStockRecogida(K);
    var sug=Number((document.getElementById('stk-rec-u')||{}).value)||0;
    guardarStockRecogida(); try{ closeModal(); }catch(e){}
    var d=stockData(), o2=d.lista.filter(function(x){ return x.k===K; })[0];
    var cinta=_txt(stockCintaHtml(d)), plan=_txt(planYaHtml(o2));
    var casilla=(function(){ var dv=document.createElement('div'); dv.innerHTML=planYaHtml(o2); return !!dv.querySelector('input[type=checkbox]'); })();
    window._copiado=''; copiarStock();
    var hoyTxt=_txt(renderStockHoy ? renderStockHoy(d) : '');
    return { antes:antes, sug:sug, aviso:o2.aviso, fab:o2.fabricar, rec:o2.recoger, cam:o2.enCamino, acc:sfAccion(o2), grupo:planGrupoDe(o2),
             enCinta:/TITANIO LATEX/.test(cinta), plan:plan, casilla:casilla, copia:window._copiado, hoy:/TITANIO LATEX/.test(hoyTxt) };
  });
  chk('A0. (control) antes de tocar nada: «🏭 Pedí 2 esta semana · traé 2 de Moreno», aviso pedir',
      a.antes && a.antes.aviso==='pedir' && a.antes.fab===2 && a.antes.rec===2 && /Pedí 2 esta semana · traé 2 de Moreno/.test(a.antes.acc), a.antes||a);
  chk('A1. programar la recogida propuesta (2) deja el aviso en «pedir» (no «🚚 Ya pedido»): falta fabricar 2', a.sug===2 && a.cam===2 && a.aviso==='pedir' && a.fab===2 && a.rec===0, a);
  chk('A2. …y la acción dice «🏭 Pedí 2 esta semana · ya viene la recogida de 2»', /🏭 Pedí 2 esta semana · ya viene la recogida de 2/.test(a.acc||''), a.acc);
  chk('A3. …el producto sigue en el grupo «🏭 esta semana» del Plan (no en el chip «✅ Alcanza») y en la cinta', a.grupo==='sem' && a.enCinta===true, { grupo:a.grupo, cinta:a.enCinta });
  chk('A4. …con la casilla «Ya pedí 2»', a.casilla===true && /Ya pedí 2/.test(a.plan||''), a.plan);
  chk('A5. …y «📋 Copiar pedido a fábrica» lo pide («pedir 2», con los 2 en camino)', /PEDIDO A FÁBRICA[\s\S]*TITANIO LATEX[\s\S]*pedir 2[\s\S]*2 en camino/.test(a.copia||''), (a.copia||'').slice(0,300));

  const a6 = await E(async () => {
    var K=_k('CH1129','COLCHON TITANIO LATEX','140x190');
    // (control) lo pedido a fábrica que alcanza: 10 en camino y 4 en PTF → «🚚 Ya pedido», sin nada para fabricar
    var ventas=_ventas('CH1129','COLCHON TITANIO LATEX','140x190', ['2026-10-05','2026-10-07','2026-10-09','2026-10-12','2026-10-13','2026-10-15'], 2);
    await _cargar(ventas, _stock(function(st){ st.c.u[K]=4; st.p=[{ id:'fq-a6', k:K, u:10, fab:'MORENO', f:'2026-10-15', esp:'', r:'' }]; }));
    var o=_fila(K); return { aviso:o.aviso, fab:o.fabricar, acc:sfAccion(o), grupo:planGrupoDe(o) };
  });
  chk('A6. (control) lo pedido que ALCANZA sigue «🚚 Ya pedido» en el chip «✅ Alcanza» (sin nada para fabricar)', a6.aviso==='pedido' && a6.fab===0 && /Ya pedido/.test(a6.acc||'') && a6.grupo==='ok', a6);

  /* ── B. El plazo medido de la fábrica (1.2) ── */
  const b = await E(async () => {
    var lin=function(f, r, extra){ return Object.assign({ codigo:'CH1129', desc:'COLCHON TITANIO LATEX', medida:'140x190', cant:1, precio:1000, enProd:true, prodEn:'Moreno', prodF:f }, r?{ prodR:r }:{}, extra||{}); };
    // la base: 6 pedidos ya entregados con su «llegó»: 4 días cada uno → Moreno 4
    var base=[['2026-10-01','2026-10-05'],['2026-10-02','2026-10-06'],['2026-10-05','2026-10-09'],['2026-10-06','2026-10-10'],['2026-10-07','2026-10-11'],['2026-10-08','2026-10-12']]
      .map(function(fr){ return _ped(fr[1], [lin(fr[0], fr[1])], { entregado:true }); });
    var T0, M0, out={};
    await _cargar(base, _stock());
    T0=stockTiemposFabrica().de('MORENO'); M0=(stockMuestrasFabrica().MORENO||[]).length;
    out.base={ dias:T0.dias, n:M0 };
    // B1: la OC con tres líneas 🏭 del 30/09, agendada para el 20/10, marcada ✅ hoy (adelantada): el ✅ anota eF = hoy
    var p1=_ped('2026-10-20', [lin('2026-09-30'), lin('2026-09-30'), lin('2026-09-30')]);
    STATE=base.concat([p1]); p1.entregado=true; entregaAdelantadaAnotar(p1); stockOlvidarIndice();
    out.b1={ dias:stockTiemposFabrica().de('MORENO').dias, n:(stockMuestrasFabrica().MORENO||[]).length, eF:p1.productos[0].eF };
    // B2: ✅ de un pedido de fecha pasada, SIN «llegó» y sin el cierre (sin eF): no mide hasta la fecha agendada
    var p2=_ped('2026-10-14', [lin('2026-10-01')], { entregado:true });
    STATE=base.concat([p2]); stockOlvidarIndice();
    out.b2={ dias:stockTiemposFabrica().de('MORENO').dias, n:(stockMuestrasFabrica().MORENO||[]).length };
    // B3: el cierre anotó el día REAL (eF 14/10) en un pedido con tres líneas 🏭 del 08/10 → UNA muestra de 6 días
    var p3=_ped('2026-10-13', [lin('2026-10-08',null,{eF:'2026-10-14'}), lin('2026-10-08',null,{eF:'2026-10-14'}), lin('2026-10-08',null,{eF:'2026-10-14'})], { entregado:true });
    STATE=base.concat([p3]); stockOlvidarIndice();
    var m3=(stockMuestrasFabrica().MORENO||[]);
    out.b3={ n:m3.length, ult:m3.filter(function(s){ return s.r==='2026-10-14'; }).map(function(s){ return s.d; }) };
    // B4: un «llegó» con un día que todavía no pasó no mide
    var p4=_ped('2026-10-14', [lin('2026-10-10','2026-10-21')], { entregado:true });
    STATE=base.concat([p4]); stockOlvidarIndice();
    out.b4={ n:(stockMuestrasFabrica().MORENO||[]).length };
    STATE=base; stockOlvidarIndice();
    return out;
  });
  chk('B0. (control) seis pedidos con su «llegó» a los 4 días: Moreno 4, seis muestras', b.base && b.base.dias===4 && b.base.n===6, b.base||b);
  chk('B1. el ✅ adelantado de la OC con 3 líneas 🏭 del 30/09 (agendada el 20/10) NO lleva Moreno a 12 días: sigue 4, con UNA muestra más (hasta hoy)',
      b.b1 && b.b1.dias===4 && b.b1.n===7 && b.b1.eF==='2026-10-16', b.b1);
  chk('B2. un ✅ sin «llegó» ni el día real (sin eF) no mide hasta la fecha AGENDADA: ninguna muestra nueva', b.b2 && b.b2.n===6, b.b2);
  chk('B3. el día real del cierre (eF) mide, y tres líneas del mismo pedido son UNA muestra (6 días)', b.b3 && b.b3.n===7 && JSON.stringify(b.b3.ult)==='[6]', b.b3);
  chk('B4. un «llegó» con un día que todavía no pasó no mide', b.b4 && b.b4.n===6, b.b4);

  /* ── C. La ✗ marcada se vuelve a repartir (1.3) ── */
  const c1 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    var A=_ped('2026-10-17', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000, chk:'no' }]);
    var B=_ped('2026-10-22', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000 }]);
    // el Excel de hoy trae 1 en PTF (antes no había: por eso la ✗ del sábado)
    await _cargar([A,B], _stock(function(st){ st.c.u[K]=1; }));
    abrirStockRevisar();
    var cs=revStkCambios(), por={}; cs.forEach(function(g){ g.lineas.forEach(function(l){ por[g.p.id]=l.ahora; }); });
    var contra=REVSTK.tot.contra;
    aplicarStockRevisar(); await new Promise(function(r){ setTimeout(r,250); });
    var a=STATE.filter(function(p){ return p.id===A.id; })[0], b=STATE.filter(function(p){ return p.id===B.id; })[0];
    try{ closeModal(); }catch(e){}
    return { A:por[A.id]||'', B:por[B.id]||'', contra:contra, chkA:a.productos[0].chk||'', chkB:b.productos[0].chk||'' };
  });
  chk('C1. llegó 1 al PTF: la ✗ del sábado se reparte primero (se propone ✔) y el pedido del jueves queda ✗ (antes se lo llevaba el de después)',
      c1.A==='ok' && c1.B==='no', c1);
  chk('C2. …pasar la ✗ a ✔ no «contradice a nadie» y Aplicar la escribe', c1.contra===0 && c1.chkA==='ok' && c1.chkB==='no', c1);

  const c3 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // 1 en PTF apartado ✔ por logística para el 26/10; el del 19/10 sin marcar no tiene
    var C=_ped('2026-10-26', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000, chk:'ok' }]);
    var A=_ped('2026-10-19', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:1, precio:1000 }]);
    await _cargar([C,A], _stock(function(st){ st.c.u[K]=1; }));
    abrirStockRevisar();
    var s1=(REVSTK.soltar||[]).map(function(s){ return s.para.id+'←'+s.de.map(function(x){ return x.id; }).join(','); });
    aplicarStockRevisar(); await new Promise(function(r){ setTimeout(r,250); });
    try{ closeModal(); }catch(e){}
    var a=STATE.filter(function(p){ return p.id===A.id; })[0];
    abrirStockRevisar();
    var s2=(REVSTK.soltar||[]).map(function(s){ return s.para.id+'←'+s.de.map(function(x){ return x.id; }).join(','); });
    var tocaC=revStkCambios().some(function(g){ return g.p.id===C.id; });
    var c=STATE.filter(function(p){ return p.id===C.id; })[0];
    try{ closeModal(); }catch(e){}
    return { s1:s1, chkA:a.productos[0].chk||'', s2:s2, tocaC:tocaC, chkC:c.productos[0].chk, esperado:A.id+'←'+C.id };
  });
  chk('C3. (control) antes de Aplicar: el del 19/10 queda ✗ y «💡 Para entregar antes» sugiere soltar el apartado del 26/10', c3.chkA==='no' && JSON.stringify(c3.s1)===JSON.stringify([c3.esperado]), c3);
  chk('C4. DESPUÉS de Aplicar (la ✗ ya escrita), «💡» lo sigue sugiriendo', JSON.stringify(c3.s2)===JSON.stringify([c3.esperado]), c3);
  chk('C5. …y la ✔ de logística del 26/10 sigue protegida: la revisión no la toca', c3.tocaC===false && c3.chkC==='ok', c3);

  const c6 = await E(async () => {
    var K=_k('CH1151','SOMIER TITANIO LATEX','200x200');
    // 0 en PTF, 2 pedidos a fábrica en camino (vienen el lunes), una ✗ de 2 para el 19/10
    var A=_ped('2026-10-19', [{ codigo:'CH1151', desc:'SOMIER TITANIO LATEX', medida:'200x200', cant:2, precio:1000, chk:'no' }]);
    await _cargar([A], _stock(function(st){ st.c.u[K]=0; st.p=[{ id:'fq-c6', k:K, u:2, fab:'MORENO', f:'2026-10-15', esp:'', r:'' }]; }));
    var falta=function(){ var R=stockAsignar(); var f=(R.faltan||[]).filter(function(x){ return x.k===K; })[0]; return f?f.u:0; };
    REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos'; var todos=falta();
    REVSTK_DIAS='hoy'; var hoy=falta();      // el filtro de días deja la ✗ afuera de la 2ª vuelta
    REVSTK_DIAS='todos';
    return { todos:todos, hoy:hoy };
  });
  chk('C6. lo que ya viene en camino cubre la ✗ UNA vez: «✗ No alcanza» no pide los 2 que ya están pedidos', c6.todos===0, c6);
  chk('C7. …también con el filtro «Hoy» (la ✗ queda en la 1ª vuelta)', c6.hoy===0, c6);

  await page.close();

  /* ═══ D. Los días de venta desde que arranca la fábrica (1.4) ═══ */
  const pd = await abrir('2026-10-16T10:06:00-04:00');
  const ED = ev(pd);
  await ED(async () => {
    var K1=_k('CH1201','TITANIO ICE','160x190'), K2=_k('CH1129','COLCHON TITANIO LATEX','140x190');
    // K1: 5 vendidas en 5 entregas (0,333 por día), 3 en PTF y 10 en Moreno → a las 16:29 «✅ Alcanza» (0,333 × 9 = 3)
    // K2: 14 vendidas en 7 entregas de 2 (0,933 por día), 3 en PTF → pide fabricar
    var v1=_ventas('CH1201','TITANIO ICE','160x190', ['2026-10-06','2026-10-08','2026-10-10','2026-10-13','2026-10-15'], 1);
    var v2=_ventas('CH1129','COLCHON TITANIO LATEX','140x190', ['2026-10-05','2026-10-06','2026-10-08','2026-10-09','2026-10-12','2026-10-13','2026-10-15'], 2);
    await _cargar(v1.concat(v2), _stock(function(st){ st.c.u[K1]=3; st.g[_IM].u[K1]=10; st.c.u[K2]=3; }));
    window._K1=K1; window._K2=K2;
    window._foto=function(){
      stockOlvidarIndice();
      var d=stockData(), P={}; try{ stockProducir(d).bloques.forEach(function(B){ B.filas.forEach(function(f){ P[f.o.k]=f; }); }); }catch(e){}
      var f=function(k){ var o=d.lista.filter(function(x){ return x.k===k; })[0]||{}; var q=P[k]||{};
        var dv=document.createElement('div'); dv.innerHTML=stockAutoHtml(o); var inp=dv.querySelector('.pl-auto input');
        return { aviso:o.aviso, lead:o.lead, fab:o.fabricar, rec:o.recoger, sem:q.sem, quin:q.quin, acc:sfAccion(o), pin:inp?Number(inp.value):null }; };
      return { hoy:todayStr(), k1:f(K1), k2:f(K2) };
    };
  });
  // con el «en producción» automático PRENDIDO (para mirar el 📌): lo que el panel anota a la mañana, al subir el Excel
  const anot = await ED(() => { window.STOCK_AUTO_ACTIVO=true; var a=stockAutoAnotar(todayStr()); var e=(STOCK.ap||{})[_K2]||{}; return { n:a.length, u:(e[todayStr()]||[])[0] }; });
  await pd.clock.setFixedTime(new Date('2026-10-16T16:29:00-04:00'));
  const t1629 = await ED(() => _foto());
  await pd.clock.setFixedTime(new Date('2026-10-16T16:31:00-04:00'));
  const t1631 = await ED(() => { var r=_foto(); window.STOCK_AUTO_ACTIVO=false; STOCK.ap={}; return r; });   // apagado otra vez: lo anotado no cuenta mañana
  await pd.clock.setFixedTime(new Date('2026-10-16T23:59:00-04:00'));
  const t2359 = await ED(() => _foto());
  await pd.clock.setFixedTime(new Date('2026-10-17T00:01:00-04:00'));
  const t0001 = await ED(() => _foto());
  await pd.close();

  chk('D0. (control) 16:29: el plazo es 4 días; TITANIO ICE «✅ Alcanza» y TITANIO LATEX pide fabricar', t1629.k1 && t1629.k1.lead===4 && t1629.k1.aviso==='' && t1629.k2.fab>0, t1629);
  chk('D1. 16:31 (después del corte): el plazo de los AVISOS sí pasa a 5 días (la fábrica arranca mañana)', t1631.k1 && t1631.k1.lead===5 && t1631.k2.lead===5, { k1:t1631.k1&&t1631.k1.lead, k2:t1631.k2&&t1631.k2.lead });
  chk('D2. …pero «Pedir 7 días» y «15 días» dan lo MISMO que a las 16:29 (hoy no se cuenta otra vez como día de venta)',
      t1631.k2 && t1631.k2.fab===t1629.k2.fab && t1631.k2.sem===t1629.k2.sem && t1631.k2.quin===t1629.k2.quin, { a1629:t1629.k2, a1631:t1631.k2 });
  chk('D3. …y lo mismo a las 23:59 y el sábado a las 00:01 (los dos arrancan el sábado: el mismo pedido pide lo mismo)',
      t2359.k2 && t0001.k2 && t2359.k2.fab===t1629.k2.fab && t0001.k2.fab===t1629.k2.fab && t2359.k2.quin===t1629.k2.quin && t0001.k2.quin===t1629.k2.quin, { a2359:t2359.k2, a0001:t0001.k2 });
  chk('D4. (VF3) TITANIO ICE no se prende «🚚 Traé 1 de Moreno» a las 16:31 ni a las 23:59: sigue «✅ Alcanza» como a las 16:29 y el sábado',
      t1631.k1 && t1631.k1.aviso==='' && t1631.k1.rec===0 && t2359.k1.aviso==='' && t0001.k1.aviso==='', { a1631:t1631.k1, a2359:t2359.k1, a0001:t0001.k1 });
  chk('D5. con el automático prendido: lo anotado a las 10:06 («📌 Hoy se piden N») y «🚨 Pedí N ya» de las 16:31 dicen el MISMO número',
      anot && anot.u>0 && t1629.k2.pin===anot.u && t1631.k2 && t1631.k2.pin===anot.u && t1631.k2.fab===anot.u && new RegExp('Pedí '+anot.u+' ya').test(t1631.k2.acc||''),
      { anotado:anot, a1629:t1629.k2, a1631:t1631.k2 });

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
