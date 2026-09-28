/* 🕔 LA HORA EN QUE ENTRA EL PEDIDO (dueño, 28/09) — y 🔁 la segunda vuelta del mismo día (§4gs).

   *«Logística y producción solo trabajan hasta las 17: si entra un pedido, la producción se inicia recién el siguiente día
   hábil»*. Y el sábado se trabaja medio día (corte a las 12:00). Lo demás, como estaba: *«es mucho kilombo, sería mejor que
   lo decida logística»* (quién se lleva el stock no cambia).
   Al ver la tabla con su ejemplo, el dueño corrigió dos cosas (§4gs):
   · *«si hay que ir a recoger da igual si son las 18 o las 11 o las 15: se cargó lunes, se recoge martes, se entrega
     miércoles»* → 📥 Moreno NO mira la hora: se recoge el día hábil siguiente y se entrega desde el otro.
   · *«se manda a producir martes a las 8 am, debería salir en 48 horas y las otras 24 son para recoger y entregar»* (el
     panel decía ~5 días: 3 de fábrica + 1) → 🏭 sale 48 h hábiles después de que arranca, ese día se recoge, y se entrega
     desde el siguiente. Lunes 18:00 → arranca el martes → sale el jueves → se entrega el viernes.

   ⚠️ LO QUE ESTA PRUEBA CUIDA:
   1. `diaArranque`: hoy si es día hábil y antes del corte (17:00; sábado 12:00); si no, el siguiente día hábil (sin domingos
      ni feriados).
   2. El cuadrito del formulario, lunes 28/09 a las 16:25 y a las 18:15:
      · 📥 HAY EN MORENO: a las dos horas «programá desde el miércoles 30/09», sin aviso de la hora;
      · 🏭 NO HAY (hay que fabricar): ~3 días (jueves 01/10) → ~4 días (viernes 02/10), y dice la cuenta (qué día se manda a
        producir, qué día sale de fábrica);
      · 📐 MEDIDA ESPECIAL: lo mismo;
      · ✅ DISPONIBLE (a mano) NO cambia: «desde mañana», sin el aviso de la hora.
   3. ⏳ Lo ya pedido a fábrica sale a las 48 h de pedido: el martes a la mañana, con el pedido a fábrica de ese día, promete el
      MISMO viernes que prometió «hay que fabricar» el lunes a las 18:15 (antes, la promesa se corría un día).
   4. La pregunta al guardar dice la cuenta.
   5. Sábado 11:30 vs 12:30, domingo, viernes a la noche y feriado (Todos Santos, lunes 02/11/2026).

   Datos SINTÉTICOS (el repo es público). Reloj clavado, hora de Bolivia.
   Se corre:  node tests/test_corte_horario.js   (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_7fe7551.html (o la de §4gq, 045c2d4) node tests/test_corte_horario.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

/* ── Lo que corre ANTES que la prueba: la «planilla» es `_SRV` (como en test_rev8_saldo.js) ── */
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
  window._saves=[];
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:r });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.IMN='IM - PRODUCTOTERMINADO';
  window.PR={ TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' } };
  window.K={ TIT:stockClave(PR.TIT) };
  /* El corte de HOY (sin el aviso de «corte viejo»): acá en fábrica y, si se pide, Moreno (IM). */
  window._stock=function(op){
    op=op||{};
    var st={ c:{ f:todayStr(), hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3*3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[IMN]={ f:todayStr(), hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-4*3600000, rs:{} };
    st.al[LOG]='log'; st.al[IMN]='otro';
    st.c.u[K.TIT]=op.aca||0;
    if(op.im) st.g[IMN].u[K.TIT]=op.im;
    if(op.p) st.p=op.p.map(function(q){ return Object.assign({}, q, { k:q.k||K.TIT }); });   // pedidos a fábrica (⏳ en producción)
    return st;
  };
  window._escenario=async function(stock){
    window._SRV.stock=stock; window._SRV.pedidos=[];
    STOCK_CARGADO=false;
    await refrescarEstado();
    ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._renglon=function(o){
    var c=document.querySelectorAll('#f-productos .prod-card')[0];
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.desc!=null){ var d=c.querySelector('.prod-desc'); d.value=o.desc; ev(d); ev(d,'change'); }
    if(o.otra!=null){ var m2=c.querySelector('.prod-medida'); m2.value='Otros'; ev(m2,'change'); var ot=c.querySelector('.prod-medida-otro'); ot.value=o.otra; ev(ot); }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._caja=function(){
    var b=document.querySelector('#f-productos .prod-card .prod-saldo');
    return b ? { hidden:!!b.hidden, cls:b.className, txt:b.innerText.replace(/\s+/g,' ').trim() } : { hidden:true, cls:'', txt:'' };
  };
  window._fecha=function(iso){ var f=document.getElementById('f-fecha'); f.value=iso; ev(f,'change'); };
  /* El cuadrito de un producto, en un pedido nuevo, con el stock de `op`. */
  window._ver=async function(op, linea, fecha){
    await _escenario(_stock(op));
    _nuevo(); _renglon(linea || { codigo:'CH1201', cant:1 });
    if(fecha) _fecha(fecha);
    await _esperar(500);
    return _caja();
  };
  window._llenarDatos=function(cli){
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value=cli||'CLIENTE NUEVO';
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*999));
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='1000';
  };
  window._guardar=async function(){ document.getElementById('f-submit').click(); for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(200); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.__dialogos=[];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { page.__dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  const reloj = (iso) => page.clock.setFixedTime(new Date(iso));
  await reloj('2026-09-28T10:00:00-04:00');
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  /* Contra un panel viejo algunas cosas no existen: cada bloque vuelve con `__error` en vez de cortar la prueba. */
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const arranque = async (iso) => { await reloj(iso); return ev(() => (typeof diaArranque==='function') ? diaArranque() : '(no existe diaArranque)'); };

  // ═══ 1. El día en que se empieza ═══════════════════════════════════════════════════════════════
  console.log('\n── 1. diaArranque: hoy antes del corte; si no, el siguiente día hábil ──');
  const casos = [
    ['2026-09-28T16:25:00-04:00', '2026-09-28', 'lunes 16:25 → hoy (lunes 28)'],
    ['2026-09-28T16:59:00-04:00', '2026-09-28', 'lunes 16:59 → hoy'],
    ['2026-09-28T17:00:00-04:00', '2026-09-29', 'lunes 17:00 en punto → martes 29 (ya cerró)'],
    ['2026-09-28T18:15:00-04:00', '2026-09-29', 'lunes 18:15 → martes 29'],
    ['2026-10-02T17:30:00-04:00', '2026-10-03', 'viernes 17:30 → sábado 03 (el sábado se trabaja)'],
    ['2026-10-03T11:30:00-04:00', '2026-10-03', 'sábado 11:30 → hoy (corte del sábado: 12:00)'],
    ['2026-10-03T12:30:00-04:00', '2026-10-05', 'sábado 12:30 → lunes 05 (el domingo no)'],
    ['2026-10-04T10:00:00-04:00', '2026-10-05', 'domingo 10:00 → lunes 05'],
    ['2026-11-01T10:00:00-04:00', '2026-11-03', 'domingo 01/11 → martes 03/11 (el lunes 02/11 es Todos Santos)'],
    ['2026-11-02T09:00:00-04:00', '2026-11-03', 'feriado lunes 02/11 a las 9 → martes 03/11'],
    ['2026-10-30T18:00:00-04:00', '2026-10-31', 'viernes 30/10 18:00 → sábado 31/10'],
  ];
  for (const [iso, esperado, txt] of casos) { const d = await arranque(iso); chk(txt, d===esperado, d); }

  // ═══ 2. El ejemplo del dueño: lunes 28/09, 16:25 y 18:15 ═══════════════════════════════════════
  console.log('\n── 2. El cuadrito del formulario, lunes 28/09 a las 16:25 y a las 18:15 ──');
  const ver = async (iso, op, linea, fecha) => { await reloj(iso); return ev(async (a) => _ver(a.op, a.linea, a.fecha), { op, linea, fecha }); };
  const LUN_16 = '2026-09-28T16:25:00-04:00', LUN_18 = '2026-09-28T18:15:00-04:00';

  let a = await ver(LUN_16, { aca:0, im:2 }), b = await ver(LUN_18, { aca:0, im:2 });
  chk('📥 Moreno, lunes 16:25: «programá desde el miércoles 30/09» (se recoge el martes)',
      /📥 HAY EN MORENO · se trae en 1 día: programá desde el miércoles 30\/09/.test(a.txt) && !/🕔/.test(a.txt), [a.txt, a.__error]);
  chk('📥 Moreno, lunes 18:15: TAMBIÉN «desde el miércoles 30/09» — «da igual si son las 18 o las 11 o las 15» (dueño)',
      /📥 HAY EN MORENO · se trae en 1 día: programá desde el miércoles 30\/09/.test(b.txt), [b.txt, b.__error]);
  chk('…y a las 18:15 no dice nada de la hora (no hay 🕔)', !/🕔|Ya pasaron/.test(b.txt), b.txt);

  a = await ver(LUN_16, { aca:0 }); b = await ver(LUN_18, { aca:0 });
  chk('🏭 hay que fabricar, lunes 16:25: «espere ~3 días» (se manda hoy, sale el miércoles, se entrega el jueves 01/10)',
      /🏭 NO HAY · decile al cliente que espere ~3 días/.test(a.txt) && !/🕔/.test(a.txt), [a.txt, a.__error]);
  chk('…y dice la cuenta: «🏭 Se manda a producir hoy, sale de fábrica el miércoles 30/09 (48 h) y ese día se recoge.»',
      /🏭 Se manda a producir hoy, sale de fábrica el miércoles 30\/09 \(48 h\) y ese día se recoge\./.test(a.txt), a.txt);
  chk('🏭 hay que fabricar, lunes 18:15: «espere ~4 días» — el viernes del dueño, no el sábado de antes',
      /🏭 NO HAY · decile al cliente que espere ~4 días/.test(b.txt), [b.txt, b.__error]);
  chk('…y dice por qué y la cuenta: «🕔 Ya pasaron las 17:00: se manda a producir el martes 29/09, sale de fábrica el jueves 01/10 (48 h) y ese día se recoge.»',
      /🕔 Ya pasaron las 17:00: se manda a producir el martes 29\/09, sale de fábrica el jueves 01\/10 \(48 h\) y ese día se recoge\./.test(b.txt), b.txt);

  a = await ver(LUN_16, { aca:0 }, null, '2026-09-29'); b = await ver(LUN_18, { aca:0 }, null, '2026-09-29');
  chk('…con la entrega para mañana, la línea roja: 16:25 «programá desde el jueves 01/10»',
      /Para el martes 29\/09 no llega: programá desde el jueves 01\/10/.test(a.txt), a.txt);
  chk('…18:15 «programá desde el viernes 02/10»',
      /Para el martes 29\/09 no llega: programá desde el viernes 02\/10/.test(b.txt), b.txt);

  a = await ver(LUN_16, { aca:2 }, { desc:'TITANIO ICE', otra:'150x200', cant:1 });
  b = await ver(LUN_18, { aca:2 }, { desc:'TITANIO ICE', otra:'150x200', cant:1 });
  chk('📐 medida especial, lunes 16:25: «espere ~3 días»', /📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~3 días/.test(a.txt), [a.txt, a.__error]);
  chk('📐 medida especial, lunes 18:15: «espere ~4 días» y el porqué',
      /📐 MEDIDA ESPECIAL · se fabrica a pedido: decile al cliente que espere ~4 días/.test(b.txt) && /🕔 Ya pasaron las 17:00: se manda a producir el martes 29\/09/.test(b.txt), b.txt);

  a = await ver(LUN_18, { aca:2 });
  chk('(control) ✅ lo que está a mano NO cambia a las 18:15: «podés programar desde mañana, martes 29/09», sin el aviso de la hora',
      /✅ DISPONIBLE · podés programar desde mañana, martes 29\/09/.test(a.txt) && !/🕔/.test(a.txt), [a.txt, a.__error]);

  // ═══ 3. ⏳ Lo ya pedido a fábrica ═══════════════════════════════════════════════════════════════
  console.log('\n── 3. ⏳ Lo ya pedido a fábrica sale a las 48 h: la promesa no se corre cuando logística lo pide ──');
  a = await ver('2026-09-29T10:00:00-04:00', { aca:0, p:[ { id:'pf1', k:null, u:5, total:5, tipo:'fabrica', fab:'MORENO', f:'2026-09-29', r:'' } ] });
  chk('⏳ martes 10:00, pedido a fábrica ese día: «espere ~3 días (llega el 01/10)» → se entrega desde el viernes 02/10, el mismo viernes que se prometió el lunes 18:15',
      /⏳ EN PRODUCCIÓN · decile al cliente que espere ~3 días \(llega el 01\/10\)/.test(a.txt), [a.txt, a.__error]);

  // ═══ 4. La pregunta al guardar ══════════════════════════════════════════════════════════════════
  console.log('\n── 4. La pregunta al guardar dice la cuenta ──');
  await reloj(LUN_18);
  let g = await ev(async () => {
    await _ver({ aca:0 }, null, '2026-10-05');
    _llenarDatos('CLIENTE 18 15');
    var n0=window._saves.length;
    await _guardar();
    return { guardo:window._saves.length>n0 };
  });
  const preg = page.__dialogos.find(t => /ANTES DE GUARDAR, MIRÁ EL SALDO/.test(t)) || '';
  chk('al guardar a las 18:15 algo que hay que fabricar, la pregunta de siempre sale…', !!preg, [preg.slice(0,200), g && g.__error]);
  chk('…con «~4 días» y «🕔 Ya pasaron las 17:00: se manda a producir el martes 29/09, sale de fábrica el jueves 01/10»',
      /espera ~4 días/.test(preg) && /🕔 Ya pasaron las 17:00: se manda a producir el martes 29\/09, sale de fábrica el jueves 01\/10 \(48 h\) y ese día se recoge\./.test(preg), preg.slice(0,500));
  chk('…y guarda igual (nunca frena la venta)', g && g.guardo, g);

  // ═══ 5. Sábado, domingo, viernes a la noche y feriado ═══════════════════════════════════════════════
  console.log('\n── 5. Sábado (medio día), domingo, viernes a la noche y feriado ──');
  a = await ver('2026-10-03T11:30:00-04:00', { aca:0 });
  b = await ver('2026-10-03T12:30:00-04:00', { aca:0 });
  chk('🏭 sábado 11:30: se manda hoy → sale el martes 06 (el domingo no cuenta) → se entrega el miércoles 07 → «~4 días»',
      /decile al cliente que espere ~4 días/.test(a.txt) && /🏭 Se manda a producir hoy, sale de fábrica el martes 06\/10/.test(a.txt) && !/🕔/.test(a.txt), [a.txt, a.__error]);
  chk('🏭 sábado 12:30: se manda el lunes 05 → sale el miércoles 07 → jueves 08 → «~5 días», y dice por qué',
      /decile al cliente que espere ~5 días/.test(b.txt) && /🕔 El sábado se trabaja hasta las 12:00: se manda a producir el lunes 05\/10, sale de fábrica el miércoles 07\/10/.test(b.txt), b.txt);

  a = await ver('2026-10-03T11:30:00-04:00', { aca:0, im:2 });
  b = await ver('2026-10-03T12:30:00-04:00', { aca:0, im:2 });
  chk('📥 sábado 11:30 y 12:30, igual: «logística lo recoge el lunes 05/10: programá desde el martes 06/10» (el domingo no se recoge)',
      /📥 HAY EN MORENO · logística lo recoge el lunes 05\/10: programá desde el martes 06\/10/.test(a.txt) && /📥 HAY EN MORENO · logística lo recoge el lunes 05\/10: programá desde el martes 06\/10/.test(b.txt) && !/🕔/.test(a.txt+b.txt),
      [a.txt, b.txt, a.__error]);
  a = await ver('2026-10-04T10:00:00-04:00', { aca:0, im:2 });
  chk('📥 domingo: se recoge mañana lunes → «se trae en 1 día: programá desde el martes 06/10»',
      /📥 HAY EN MORENO · se trae en 1 día: programá desde el martes 06\/10/.test(a.txt) && !/🕔/.test(a.txt), [a.txt, a.__error]);
  a = await ver('2026-10-02T18:00:00-04:00', { aca:0, im:2 });
  chk('📥 viernes 18:00: se recoge el sábado y el domingo no se entrega: «se trae en 1 día: programá desde el lunes 05/10»',
      /📥 HAY EN MORENO · se trae en 1 día: programá desde el lunes 05\/10/.test(a.txt), [a.txt, a.__error]);

  a = await ver('2026-11-02T10:00:00-04:00', { aca:0 });
  chk('🏭 feriado (Todos Santos, lunes 02/11): se manda el martes 03 → sale el jueves 05 → viernes 06 → «~4 días», y dice por qué',
      /🕔 Hoy es feriado \(Todos Santos\): se manda a producir el martes 03\/11, sale de fábrica el jueves 05\/11/.test(a.txt) && /espere ~4 días/.test(a.txt), [a.txt, a.__error]);
  a = await ver('2026-11-01T10:00:00-04:00', { aca:0, im:2 });
  chk('📥 domingo 01/11 (el lunes es feriado): «logística lo recoge el martes 03/11: programá desde el miércoles 04/11»',
      /logística lo recoge el martes 03\/11: programá desde el miércoles 04\/11/.test(a.txt), [a.txt, a.__error]);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
