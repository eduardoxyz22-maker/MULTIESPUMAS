/* 🚫 EL CAMIÓN NO SALE EN FERIADOS (§4gy, revisión del 29/09, A1). El dueño: «No sale en feriados».

   Antes, `FERIADOS` solo lo miraba la fábrica (el día en que se manda a producir y se recoge en Moreno). El cupo, el
   «mañana» del camión y el día que promete el cuadrito no lo miraban: el jueves 24/12 el cuadrito decía «podés programar
   desde mañana, viernes 25/12» y el formulario guardaba una entrega en Navidad sin preguntar nada.

   ⚠️ LO QUE CUIDA (cada punto falla contra lo publicado, `040e1df`):
   1. `limTurno` de un feriado es 0 (como el domingo), y `proximoDiaEntrega()` salta el feriado (chofer, carga, ruta, mapa,
      WhatsApp «de mañana»): el jueves 24/12 el próximo camión es el sábado 26/12.
   2. El cuadrito del saldo no promete un feriado, en los seis casos: ✅ a mano, 📥 Moreno, 🏭 no hay, 📐 medida especial,
      ⏳ ya pedido a fábrica y 🚚 recogida programada. Carnaval 2027 (lunes y martes) y Todos Santos tras un domingo.
   3. El formulario: un pedido NUEVO para un feriado no se guarda y dice por qué; mover la fecha de uno a un feriado
      tampoco (sin la clave de Administración). Uno que YA estaba en un feriado se sigue pudiendo corregir, y
      Administración lo puede mover a un feriado (va con `forzar`, como el domingo).
   4. Lo que se ve: el cartel de cupos del formulario, el de Administración, la semana de ocupación, los avisos de
      📅 Reprogramar y los cupos del encabezado.

   Reloj CLAVADO en cada parte (diciembre de 2026, noviembre de 2026 y febrero de 2027): la regla depende del día.
   Se corre:  node tests/test_rev29_dias.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/a/pedidos_040e1df.html node tests/test_rev29_dias.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._SRV={ pedidos:[], stock:null, cerrados:[] };
  window._saves=[];
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    l.push({ id:'__dias_cerrados__', fecha:'', cliente:'🔒', observaciones:'🔒 '+(window._SRV.cerrados||[]).join(' ') });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec, op){
    var r=JSON.parse(JSON.stringify(rec)); r._op=op||null; window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); var g=JSON.parse(JSON.stringify(rec)); if(i>=0) window._SRV.pedidos[i]=g; else window._SRV.pedidos.push(g); }
    return Promise.resolve({ ok:true, pedido:rec });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window.LOG='PRODUCTOS TERMINADOS FAB.'; window.IMN='IM - PRODUCTOTERMINADO';
  window.PR={
    TIT:{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },     // ✅ hay a mano
    T140:{ desc:'TITANIO ICE', medida:'140x190', codigo:'CH1220' },    // 📥 hay en Moreno
    ORO:{ desc:'ORO BI RELAX', medida:'180x190', codigo:'CH1775' },    // 🏭 no hay
    PIL:{ desc:'PILLOW PEDIC', medida:'140x190', codigo:'CH1682' },    // ⏳ pedido a fábrica
    EUR:{ desc:'EUROPEDIC', medida:'140x190', codigo:'CH1765' }        // 🚚 recogida programada
  };
  window.K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); });
  /* Un stock inventado con los cinco productos. op.qf = día del pedido a fábrica de PIL; op.rec = día de la recogida de EUR. */
  window._stockTodo=function(op){
    op=op||{};
    var hoy=todayStr();
    var st={ c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3*3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[] };
    st.g[IMN]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-4*3600000, rs:{} };
    st.al[LOG]='log'; st.al[IMN]='otro';
    st.c.u[K.TIT]=2; st.c.u[K.T140]=0; st.c.u[K.ORO]=0; st.c.u[K.PIL]=0; st.c.u[K.EUR]=0;
    st.g[IMN].u[K.T140]=2; st.g[IMN].u[K.EUR]=5;
    st.p.push({ id:'pf1', k:K.PIL, u:5, total:5, tipo:'fabrica', fab:'MORENO', f:(op.qf||hoy), r:'' });
    st.p.push({ id:'rq1', k:K.EUR, u:5, tipo:'recogida', de:IMN, fab:'', f:hoy, esp:(op.rec||stockSumarDias(hoy,1)), r:'' });
    return st;
  };
  window._escenario=async function(stock, pedidos){
    window._SRV.stock=stock; window._SRV.pedidos=JSON.parse(JSON.stringify(pedidos||[]));
    STOCK_CARGADO=false;
    await refrescarEstado();
    ULTIMO_ERROR=''; CARGA_ESTADO='ok';
  };
  window._dia=function(v){ return { tipo:v.tipo, desde:v.desde||'', sale:v.sale||'', llega:v.llega||'', titulo:saldoTitulo(v) }; };
  window._nuevo=function(){ if(document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._renglon=function(o){
    var c=document.querySelectorAll('#f-productos .prod-card')[0];
    if(o.codigo!=null){ var e=c.querySelector('.prod-codigo'); e.value=o.codigo; ev(e); }
    if(o.cant!=null){ var q=c.querySelector('.prod-cant'); q.value=String(o.cant); ev(q); }
  };
  window._fecha=function(iso){ var f=document.getElementById('f-fecha'); f.value=iso; ev(f,'change'); };
  window._llenarDatos=function(cli){
    document.getElementById('f-vendedor').value='Maria Flores';
    document.getElementById('f-cliente').value=cli;
    document.getElementById('f-celular').value='70011122';
    document.getElementById('f-nota').value=String(2000+Math.floor(Math.random()*999));
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-saldo').value='1000';
  };
  window._guardar=async function(){ document.getElementById('f-submit').click(); for(var i=0;i<40;i++){ await _esperar(50); var b=document.getElementById('f-submit'); if(b && !b.disabled) break; } await _esperar(300); };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2,9), fecha:'', oc:'12-900', vendedor:'Maria Flores',
    cliente:'CLIENTE X', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle 1', maps:'', pagado:false, saldo:1000, ts:Date.now()-86400000,
    metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'1500', acuenta:0, facturarA:'', nit:'',
    nroDia:1, verificado:false, fotos:[], productos:[{ desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1 }] }, o); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1100, height:1000 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const dialogos=[];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-12-22T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const reloj = (iso) => page.clock.setFixedTime(new Date(iso));
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  /* ── 1. El cupo y el «mañana» del camión ── */
  const lim = await ev(() => ({
    nav:[limTurno('2026-12-25','AM'), limTurno('2026-12-25','PM')], an:[limTurno('2027-01-01','AM'), limTurno('2027-01-01','PM')],
    ts:limTurno('2026-11-02','AM'), carn:[limTurno('2027-02-08','AM'), limTurno('2027-02-09','PM')],
    normal:[limTurno('2026-12-24','AM'), limTurno('2026-12-24','PM')], sab:[limTurno('2026-12-26','AM'), limTurno('2026-12-26','PM')], dom:limTurno('2026-12-27','AM')
  }));
  chk('1a. Navidad, Año Nuevo, Todos Santos y Carnaval no tienen cupo (0 en AM y en PM)',
    lim.nav && lim.nav.join()==='0,0' && lim.an.join()==='0,0' && lim.ts===0 && lim.carn.join()==='0,0', lim);
  chk('1b. …y un día normal, el sábado y el domingo siguen como siempre (12/13, 15/0, 0)',
    lim.normal && lim.normal.join()==='12,13' && lim.sab.join()==='15,0' && lim.dom===0, lim);
  const pde = {};
  for (const [iso, k] of [['2026-12-24T10:00:00-04:00','jue24dic'], ['2026-10-31T10:00:00-04:00','sab31oct'], ['2027-02-06T10:00:00-04:00','sab06feb'],
                          ['2026-12-31T10:00:00-04:00','jue31dic'], ['2026-09-28T10:00:00-04:00','lun28sep'], ['2026-10-03T10:00:00-04:00','sab03oct']]) {
    await reloj(iso); pde[k] = await ev(() => proximoDiaEntrega());
  }
  chk('1c. el jueves 24/12 el próximo camión es el sábado 26/12 (el 25 es Navidad)', pde.jue24dic==='2026-12-26', pde);
  chk('1d. el sábado 31/10 es el martes 03/11 (domingo y Todos Santos), el sábado 06/02/2027 el miércoles 10/02 (Carnaval), el jueves 31/12 el sábado 02/01',
    pde.sab31oct==='2026-11-03' && pde.sab06feb==='2027-02-10' && pde.jue31dic==='2027-01-02', pde);
  chk('1e. un lunes normal sigue siendo el martes, y el sábado el lunes (§4ex)', pde.lun28sep==='2026-09-29' && pde.sab03oct==='2026-10-05', pde);

  /* ── 2. El cuadrito del saldo no promete un feriado ── */
  const cuad = async (iso, fn, op) => { await reloj(iso); return ev(async (a) => { await _escenario(_stockTodo(a.op), []); return (new Function('return ('+a.fn+')'))()(); }, { fn:fn.toString(), op:op||{} }); };
  const hay = await cuad('2026-12-24T10:00:00-04:00', () => _dia(saldoVeredicto(K.TIT, 1, '', '', true)));
  chk('2a. ✅ jueves 24/12: «podés programar desde el sábado 26/12», no el viernes 25 (Navidad)', hay.desde==='2026-12-26' && /26\/12/.test(hay.titulo) && !/25\/12/.test(hay.titulo), hay);
  const mor = await cuad('2026-12-30T10:00:00-04:00', () => _dia(saldoVeredicto(K.T140, 1, '', '', true)));
  chk('2b. 📥 Moreno el miércoles 30/12: se recoge el 31 y se entrega desde el sábado 02/01, no el 01/01 (Año Nuevo)', mor.desde==='2027-01-02', mor);
  const fab = await cuad('2026-12-22T10:00:00-04:00', () => _dia(saldoVeredicto(K.ORO, 1, '', '', true)));
  chk('2c. 🏭 no hay, el martes 22/12: sale de fábrica el jueves 24 y se entrega desde el sábado 26/12', fab.sale==='2026-12-24' && fab.desde==='2026-12-26', fab);
  const esp = await cuad('2026-12-22T10:00:00-04:00', () => _dia(saldoVeredictoEspecial({ k:'esp', total:1, x:{ desc:'TITANIO ICE', medida:'150x200', codigo:'' }, codOtro:null }, '', '')));
  chk('2d. 📐 medida especial, el martes 22/12: también desde el sábado 26/12', esp.desde==='2026-12-26', esp);
  const pil = await cuad('2026-12-23T10:00:00-04:00', () => _dia(saldoVeredicto(K.PIL, 1, '', '', true)), { qf:'2026-12-22' });
  chk('2e. ⏳ pedido a fábrica el martes 22/12 (sale el jueves 24): desde el sábado 26/12', pil.desde==='2026-12-26', pil);
  const eur = await cuad('2026-12-23T10:00:00-04:00', () => _dia(saldoVeredicto(K.EUR, 3, '', '', true)), { rec:'2026-12-24' });
  chk('2f. 🚚 recogida programada el jueves 24/12: desde el sábado 26/12', eur.desde==='2026-12-26', eur);
  const carn = await cuad('2027-02-05T10:00:00-04:00', () => _dia(saldoVeredicto(K.T140, 1, '', '', true)));
  chk('2g. 📥 Moreno el viernes 05/02/2027: se recoge el sábado y se entrega desde el miércoles 10/02 (Carnaval lunes y martes)', carn.desde==='2027-02-10', carn);
  const tsan = await cuad('2026-11-01T10:00:00-04:00', () => _dia(saldoVeredicto(K.TIT, 1, '', '', true)));
  chk('2h. ✅ domingo 01/11: desde el martes 03/11 (el lunes es Todos Santos)', tsan.desde==='2026-11-03', tsan);
  const norm = await cuad('2026-09-28T10:00:00-04:00', () => _dia(saldoVeredicto(K.TIT, 1, '', '', true)));
  chk('2i. un lunes normal (28/09) no cambia: desde el martes 29/09', norm.desde==='2026-09-29', norm);

  /* ── 3. El formulario ── */
  await reloj('2026-12-22T10:00:00-04:00');
  const f1 = await ev(async () => {
    await _escenario(_stockTodo({}), [ _P({ id:'pnav', fecha:'2026-12-25', turno:'AM', cliente:'YA EN NAVIDAD', oc:'12-801' }) ]);
    _nuevo(); _renglon({ codigo:'CH1201', cant:1 }); _llenarDatos('CLIENTE NAVIDAD'); _fecha('2026-12-25');
    await _esperar(300);
    var cupo=(document.getElementById('cupo-form')||{}).innerText||'';
    var n0=window._saves.length; window._toasts=[];
    await _guardar();
    var s=window._saves.slice(n0).filter(function(r){ return r.cliente==='CLIENTE NAVIDAD'; });
    var t=window._toasts.slice(-1)[0]||'';
    _fecha('2026-12-24'); await _esperar(300);
    var n1=window._saves.length;
    await _guardar();
    var s2=window._saves.slice(n1).filter(function(r){ return r.cliente==='CLIENTE NAVIDAD'; });
    return { cupo:cupo.replace(/\s+/g,' ').trim(), guardoNav:s.length, toast:t, guardo24:s2.length, fecha24:s2.length ? s2[s2.length-1].fecha : '' };
  });
  chk('3a. al elegir el 25/12 el cartel de cupos dice que es feriado (Navidad) y que el camión no sale', /feriado/i.test(f1.cupo||'') && /Navidad/.test(f1.cupo||''), f1.cupo);
  chk('3b. un pedido NUEVO para el 25/12 no se guarda, y el aviso dice por qué', f1.guardoNav===0 && /FERIADO/.test(f1.toast||'') && /Navidad/.test(f1.toast||''), f1);
  chk('3c. …y con el 24/12 se guarda normal', f1.guardo24===1 && f1.fecha24==='2026-12-24', f1);
  const f2 = await ev(async () => {
    await refrescarEstado();
    var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE NAVIDAD'; })[0]; if(!p) return { sinPedido:true };
    _nuevo(); editPedido(p.id); await _esperar(400);
    _fecha('2026-12-25'); await _esperar(300);
    var n0=window._saves.length; window._toasts=[];
    await _guardar();
    var s=window._saves.slice(n0).filter(function(r){ return r.id===p.id; });
    return { id:p.id, guardo:s.length, toast:window._toasts.slice(-1)[0]||'', fechaSrv:(window._SRV.pedidos.filter(function(x){ return x.id===p.id; })[0]||{}).fecha };
  });
  chk('3d. una vendedora que MUEVE un pedido al 25/12 no lo guarda, y el aviso dice por qué', f2.guardo===0 && /FERIADO/.test(f2.toast||'') && f2.fechaSrv==='2026-12-24', f2);
  const f3 = await ev(async () => {
    await refrescarEstado();
    _nuevo(); editPedido('pnav'); await _esperar(400);
    document.getElementById('f-direccion').value='Calle nueva 45';
    var n0=window._saves.length; window._toasts=[];
    await _guardar();
    var s=window._saves.slice(n0).filter(function(r){ return r.id==='pnav'; });
    var g=s[s.length-1]||{};
    return { guardo:s.length, fecha:g.fecha, dir:g.direccion, toast:window._toasts.slice(-1)[0]||'' };
  });
  chk('3e. un pedido que YA estaba en un feriado se puede corregir (la dirección) sin mover la fecha', f3.guardo===1 && f3.fecha==='2026-12-25' && f3.dir==='Calle nueva 45', f3);
  const f4 = await ev(async () => {
    await refrescarEstado();
    var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE NAVIDAD'; })[0]; if(!p) return { sinPedido:true };
    UNLOCKED=true;
    _nuevo(); editPedido(p.id); await _esperar(400);
    _fecha('2026-12-25'); await _esperar(300);
    var n0=window._saves.length; window._toasts=[];
    await _guardar();
    UNLOCKED=false;
    var s=window._saves.slice(n0).filter(function(r){ return r.id===p.id; });
    var g=s[s.length-1]||{};
    return { guardo:s.length, fecha:g.fecha, forzar:!!(g._op && g._op.forzar), toast:window._toasts.slice(-1)[0]||'' };
  });
  chk('3f. Administración sí lo puede mover al 25/12, y va con «forzar» (como el domingo)', f4.guardo===1 && f4.fecha==='2026-12-25' && f4.forzar, f4);

  /* ── 4. Lo que se ve en Administración y en el encabezado ── */
  await reloj('2026-12-22T10:00:00-04:00');
  const occ = await ev(async () => {
    await _escenario(_stockTodo({}), []);
    renderOcupacion();
    var el=document.getElementById('adm-ocupacion'); return el ? el.innerText.replace(/\s+/g,' ') : '';
  });
  chk('4a. la semana de ocupación marca el 25/12 como «Feriado — Navidad»', /Feriado — Navidad/.test(occ||''), (occ||'').slice(0,300));
  await reloj('2026-12-25T10:00:00-04:00');
  const adm = await ev(async () => {
    await refrescarEstado(); UNLOCKED=true;
    try{ showView('admin'); }catch(e){}
    await _esperar(200);
    try{ renderAdmin(); }catch(e){ return { err:String(e) }; }
    UNLOCKED=false;
    var el=document.getElementById('cupo-admin'); return { txt:el ? el.innerText.replace(/\s+/g,' ') : '' };
  });
  chk('4b. el cupo de Administración de un feriado dice que el camión no sale', /feriado: Navidad/.test(adm.txt||'') && /no sale/.test(adm.txt||''), adm);
  await reloj('2026-12-22T10:00:00-04:00');
  const rep = await ev(() => { var a=reproAvisos(_P({ fecha:'2026-12-23' }), '2026-12-25', 'AM'); return a.join(' | '); });
  chk('4c. 📅 Reprogramar al 25/12 avisa que es FERIADO (Navidad)', /FERIADO \(Navidad\)/.test(rep||''), rep);
  await reloj('2026-12-24T10:00:00-04:00');
  const est = await ev(async () => { await refrescarEstado(); updateStats(); return (document.getElementById('stat-hoy-l')||{}).innerText||''; });
  chk('4d. el jueves 24/12 el encabezado muestra los cupos del sábado 26/12 (solo AM)', /sábado 26\/12/i.test(est) && /solo AM/i.test(est), est);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e=>{ console.error(e); process.exit(1); });
