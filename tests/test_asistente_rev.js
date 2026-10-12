/* 🔎 EDUARDO, REVISIÓN DEL 12/10 (2 Haiku + 2 Sonnet + Opus + Fable). Cada bloque es un error que encontraron y comprobaron.
   ⚠️ LO QUE ESTA PRUEBA CUIDA (rojo contra lo publicado, `e2f1021`):
   1. Al guardar: el aviso sale recién con el pedido GUARDADO (un click que la validación frena no deja nada), no en una venta de
      tienda, una ATC ni una RPT, ni «sin celular» para Eduardo/ROHO; su botón abre ESE pedido, no el formulario nuevo vacío.
   2. Un sábado el próximo camión es el lunes: no dice «Mañana se entregan…» ni «de mañana sin camión».
   3. Ir y volver de pestaña no repite el globo ni el «pop» del mismo aviso.
   4. Con la ventana abierta, el reloj de cada minuto no le saca el foco al buscador de la ayuda.
   5. Sin poder leer la planilla, no dice «✅ Todo en orden».
   6. «Sin ubicación» no cuenta las RPT ni las ATC.
   7. El WhatsApp del cliente no arma un celular de otra persona con un dígito de más.
   8. «👛 Quién tiene el efectivo» con una vendedora elegida nombra al chofer que tiene plata de sus ventas.
   9. Con el cierre de entregas esperando señal, no pide hacerlo de nuevo.
  10. En un celular de 360×640 la ventana de Eduardo no se sale por arriba en Nuevo pedido.
   Datos SINTÉTICOS. Se corre:  node tests/test_asistente_rev.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  try{ localStorage.removeItem('me_asis_vistos'); localStorage.removeItem('me_asis_mudo'); }catch(e){}
  window.POPS=0; var _pop=asisPop; asisPop=function(){ window.POPS++; };
  window.GLOBOS=0; var _gl=asisGlobo; asisGlobo=function(a, c, s){ window.GLOBOS++; return _gl(a, c, s); };
  var n=0;
  window.V=function(o){ n++; return Object.assign({ id:'r'+n, oc:'10-'+(500+n), nota:String(900+n), vendedor:'Mirian Salazar', cliente:'CLIENTE R'+n, fecha:proximoDiaEntrega(), turno:'AM',
    productos:[{desc:'COLCHON TITANIO',medida:'140x190',cant:1,precio:3000}], saldo:0, acuenta:0, pagado:true, metodoPago:'', entregado:false,
    ts:Date.now()-86400000, fotos:[], chofer:'', vehiculo:'', maps:'https://maps.app.goo.gl/x', celular:'70000001' }, o); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (cuando, vp) => {
    const page = await browser.newPage({ viewport:vp||{ width:1180, height:900 }, timezoneId:'America/La_Paz', hasTouch:!!vp });
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { window.ASIS_PRUEBA=1; });
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(1600);
    await page.evaluate(PREPARAR);
    return page;
  };
  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  /* ── miércoles 14/10/2026, 18:00 ── */
  let page = await abrir('2026-10-14T18:00:00-04:00');
  let ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  console.log('\n── 1. Al guardar ──');
  let r = await ev(async () => {
    STATE=[]; tabNuevoPedido(); await new Promise(function(res){ setTimeout(res, 400); });
    /* un click que la validación frena (sin vendedor): no se guarda nada y no queda ningún aviso */
    document.getElementById('f-cliente').value='PEPE'; document.getElementById('f-celular').value=''; document.getElementById('f-maps').value='';
    var b=document.getElementById('f-submit'); b.click(); b.click();
    await new Promise(function(res){ setTimeout(res, 900); });
    var frenado={ guardados:STATE.length, avisos:ASIS.alGuardar.length };
    ASIS.alGuardar=[];
    asisAlGuardar(V({ id:'t1', cliente:'DE TIENDA', maps:'', celular:'', fecha:'' }), true);
    asisAlGuardar(V({ id:'rp', oc:'RPT 10-001', cliente:'Tiendas Roho', maps:'', celular:'' }), false);
    asisAlGuardar(V({ id:'at', oc:'ATC 10-001', cliente:'RECLAMO', maps:'', celular:'' }), false);
    asisAlGuardar(V({ id:'ed', vendedor:'Eduardo Añez', cliente:'MULTICENTER', celular:'' }), false);
    var raros=ASIS.alGuardar.map(function(a){ return a.k; });
    ASIS.alGuardar=[];
    var p=V({ id:'ok1', cliente:'JUANA', maps:'', celular:'' }); STATE=[p];
    asisAlGuardar(p, false); asisAlGuardar(p, false);   // dos veces el mismo pedido: un aviso por cosa
    var ks=ASIS.alGuardar.map(function(a){ return a.k; });
    var map=ASIS.alGuardar.filter(function(a){ return /^g-map/.test(a.k); })[0];
    (new Function(map.b[1]))();
    await new Promise(function(res){ setTimeout(res, 900); });
    return { frenado:frenado, raros:raros, ks:ks, edit:EDIT_ID, cli:document.getElementById('f-cliente').value, foco:ASIS_FOCO && ASIS_FOCO.id };
  });
  chk('un click que la validación frena no deja avisos (antes, 4: los mismos dos repetidos)', r.frenado && r.frenado.guardados===0 && r.frenado.avisos===0, r.frenado);
  chk('venta de tienda, RPT y ATC: sin aviso; Eduardo: sin «te faltó el celular»', r.raros && r.raros.length===0, r.raros);
  chk('el mismo pedido guardado dos veces: un aviso de cada cosa, con su id', JSON.stringify(r.ks)==='["g-cel|ok1","g-map|ok1"]', r.ks);
  chk('«Abrir el pedido» abre ESE pedido y señala la ubicación (no el formulario nuevo vacío)', r.edit==='ok1' && r.cli==='JUANA' && r.foco==='f-maps', r);
  await ev(() => { try{ resetForm(); EDIT_ID=null; }catch(e){} ASIS.alGuardar=[]; });

  console.log('\n── 3. Ir y volver de pestaña no repite el globo ──');
  r = await ev(async () => {
    STATE=[V({ id:'s1', cliente:'SIN PIN', maps:'', fecha:'2026-10-20' })];
    var mv=document.getElementById('mis-vendedor'); showView('mis'); mv.value='Mirian Salazar'; renderMis(); asisRefrescar();
    var g0=GLOBOS, p0=POPS;
    for(var i=0;i<3;i++){ tabNuevoPedido(); await new Promise(function(res){ setTimeout(res, 150); }); asisRefrescar();
      showView('mis'); await new Promise(function(res){ setTimeout(res, 150); }); asisRefrescar(); }
    return { antes:g0, despues:GLOBOS, pops:POPS-p0 };
  });
  chk('tres idas y vueltas Mis pedidos ↔ Nuevo con el mismo aviso: ni un globo más ni un «pop»', r.despues===r.antes && r.pops===0, r);

  console.log('\n── 6. «Sin ubicación» sin RPT ni ATC ──');
  r = await ev(() => {
    STATE=[V({ id:'u1', cliente:'SIN PIN', maps:'', fecha:'2026-10-20' }), V({ id:'u2', oc:'RPT 10-002', cliente:'Tiendas Roho', maps:'', fecha:'2026-10-20' }),
           V({ id:'u3', oc:'ATC 10-002', cliente:'RECLAMO', maps:'', fecha:'2026-10-20' })];
    return asisAvisos().filter(function(a){ return /^sinub/.test(a.k); }).map(function(a){ return a.t; });
  });
  chk('cuenta 1 (no la reposición a Tiendas Roho ni la ATC)', r.length===1 && /^1 pedido sin ubicación/.test(r[0]), r);

  console.log('\n── 4. El buscador de la ayuda no pierde el foco ──');
  await ev(() => { asisAbrir('ayuda'); document.getElementById('asis-q').focus(); });
  await page.keyboard.type('pa');
  await ev(() => { nxBadges(); updateStats(); });
  await page.keyboard.type('go');
  r = await ev(() => ({ v:(document.getElementById('asis-q')||{}).value, foco:document.activeElement && document.activeElement.id }));
  chk('escribir «pa», pasa el minuto (nxBadges + updateStats), escribir «go» → «pago» y el cursor sigue ahí', r.v==='pago' && r.foco==='asis-q', r);

  console.log('\n── 5. Sin poder leer la planilla ──');
  r = await ev(() => { var st=STATE; STATE=[]; CARGA_ESTADO='error'; asisAbrir('avisos');
    var t=document.getElementById('asis-panel').innerText.replace(/\s+/g,' '); CARGA_ESTADO='ok'; STATE=st; asisCerrar(); return t; });
  chk('no dice «Todo en orden»: dice que no pudo leer y ofrece reintentar', !/Todo en orden/.test(r) && /No pude leer la planilla/.test(r) && /Volver a intentar/.test(r), r);

  console.log('\n── 7. El WhatsApp del cliente ──');
  r = await ev(() => ['775123456', '12367123456', '+54 9 11 6712 3456', '70111222', '+591 70111222', '70111222 / 76543210', 'Cel: 70111222'].map(function(x){ return x+'→'+misWaCliente(x); }));
  chk('un dígito de más u otro país: nada; los celulares de verdad: siguen', /775123456→$/.test(r[0]) && /12367123456→$/.test(r[1]) && /3456→$/.test(r[2]) &&
      /59170111222$/.test(r[3]) && /59170111222$/.test(r[4]) && /59170111222$/.test(r[5]) && /59170111222$/.test(r[6]), r);

  console.log('\n── 8. Quién tiene el efectivo, con una vendedora elegida ──');
  r = await ev(() => {
    var box=document.getElementById('cx-mano'); if(!box){ box=document.createElement('div'); box.id='cx-mano'; document.body.appendChild(box); }
    var orig=cuadreEfectivo; cuadreEfectivo=function(){ return { filas:[{ nombre:'Mirian Salazar', cobrado:500, ret:500, falta:0 }], fuera:[{ nombre:'Luis Pierre', monto:1000 }] }; };
    try{ cxManoPintar(); } finally { cuadreEfectivo=orig; }
    return box.innerText.replace(/\s+/g,' ');
  });
  chk('nombra al chofer que tiene Bs 1.000 de sus ventas y no dice «todo recogido»', /Luis Pierre/.test(r) && !/Todo el efectivo cobrado ya se recogió/.test(r), r);

  console.log('\n── 9. El cierre de entregas esperando señal ──');
  r = await ev(async () => {
    UNLOCKED=true; showView('admin'); await new Promise(function(res){ setTimeout(res, 300); });
    STATE=[V({ id:'c1', fecha:todayStr() })];
    cierreEntPendienteGuardar({ ids:['c1'], dias:{}, antes:{} });
    var ks=asisAvisos().map(function(a){ return a.k.split('|')[0]+':'+a.t; });
    cierreEntPendienteGuardar(null);
    return ks;
  });
  chk('dice «está esperando señal» y no «hacé el cierre de entregas»', r.some(function(k){ return /^cierre-pend:/.test(k); }) && !r.some(function(k){ return /^cierre:/.test(k); }), r);
  await page.close();

  console.log('\n── 2. Sábado a la tarde: el próximo camión es el lunes ──');
  page = await abrir('2026-10-17T18:00:00-04:00');
  ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  r = await ev(async () => {
    STATE=[V({ id:'l1', fecha:'2026-10-19', celular:'70111222' }), V({ id:'l2', fecha:'2026-10-19', celular:'70111223' })];
    showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Mirian Salazar'; renderMis();
    var m=asisAvisos().filter(function(a){ return /^m1/.test(a.k); }).map(function(a){ return a.t; });
    UNLOCKED=true; showView('admin'); await new Promise(function(res){ setTimeout(res, 300); });
    var a3=asisAvisos().filter(function(a){ return /^a3/.test(a.k); }).map(function(a){ return a.t; });
    return { dia:proximoDiaEntrega(), m:m, a3:a3 };
  });
  chk('Mis pedidos: «El lunes 19/10 se entregan 2 pedidos tuyos» (no «Mañana»)', r.dia==='2026-10-19' && r.m.length===1 && /^El lunes 19\/10 se entregan 2/.test(r.m[0]), r);
  chk('Administración: «2 pedidos del lunes 19/10 sin camión» (no «de mañana»)', r.a3.length===1 && /del lunes 19\/10 sin camión/.test(r.a3[0]) && !/mañana/.test(r.a3[0]), r);
  await page.close();

  console.log('\n── 10. Celular de 360×640 en Nuevo pedido ──');
  page = await abrir('2026-10-14T10:00:00-04:00', { width:360, height:640 });
  ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  r = await ev(async () => {
    tabNuevoPedido(); await new Promise(function(res){ setTimeout(res, 500); });
    asisAbrir('ayuda'); await new Promise(function(res){ setTimeout(res, 200); });
    var p=document.getElementById('asis-panel').getBoundingClientRect(), x=document.querySelector('#asis-panel .asis-x').getBoundingClientRect();
    return { pasos:document.body.classList.contains('con-pasos'), top:Math.round(p.top), xTop:Math.round(x.top), xAlto:Math.round(x.height) };
  });
  chk('la ventana entra en la pantalla: se ven ✕ y 🔊 (antes top=−55)', r.top>=0 && r.xTop>=0, r);
  chk('los botones de la cabecera miden 44 px para el dedo', r.xAlto>=44, r);
  r = await ev(async () => {
    asisCerrar(); var g=document.getElementById('f-submit'); g.scrollIntoView({ block:'center' });
    await new Promise(function(res){ setTimeout(res, 600); });
    var b=g.getBoundingClientRect(), y=document.getElementById('asis-yo'), cs=getComputedStyle(y);
    var el=document.elementFromPoint(b.right-6, b.top+b.height/2);
    return { tapa:!!el && !!el.closest('#asis'), op:cs.opacity, pe:cs.pointerEvents };
  });
  chk('con «Guardar» a la vista, Eduardo se corre y no tapa su esquina', !r.tapa && r.pe==='none', r);
  await page.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
