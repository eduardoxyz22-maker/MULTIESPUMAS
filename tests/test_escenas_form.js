/* ✨ LAS ESCENAS DEL FORMULARIO DE PEDIDOS (§4if, 08/10).
   El dueño, con la muestra en video: «todas… quiero escenas wow», y «¿qué pasa con lo demás del formulario?»: lo demás queda
   igual. Lo que se prueba (pedidos inventados, reloj clavado en el jueves 08/10/2026 a las 10:00 de Bolivia):
     1. Los próximos 7 días debajo de la fecha: lo libre de cada uno (AM + PM), domingo cerrado, día lleno; tocar uno llena la fecha.
     2. El camión del turno debajo del turno: lugares de ese día y turno, el «tuyo», y el cartel con lo libre. Editando, el pedido
        ya está adentro (no se cuenta dos veces).
     3. El dibujo del cuadrito del saldo: colchones en PTF, el camioncito a Moreno, la fábrica.
     4. Al guardar un pedido NUEVO: la escena con la foto del camión, los productos que suben y «¡Pedido guardado!»; se cierra al
        tocar. En las pruebas automáticas no sale salvo que se pida (`FX_PRUEBA`), y nunca al corregir.
     5. Lo vendido en el mes por la vendedora (contra el mes pasado), y en la escena con lo que suma el pedido.
   Se corre:  node tests/test_escenas_form.js        Video:  VIDEO=/carpeta node tests/test_escenas_form.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_409a077.html node tests/test_escenas_form.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const VIDEO = process.env.VIDEO || '';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false;
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_mis_vendedor'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  window._saves=[];
  var n=0, P=function(f,t,veh,cli,vend,monto,ts){ n++; return { id:'fx'+n, fecha:f, turno:t, oc:'10-'+(100+n), vendedor:vend||'Mirian Salazar', cliente:cli||('CLIENTE '+n), celular:'7', zona:'Norte',
    direccion:'Calle '+n, maps:'', pagado:false, saldo:monto||1000, acuenta:0, ts:ts||Date.now()-86400000, metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:veh||'', chofer:'',
    garantia:'', nota:String(500+n), facturarA:'', nit:'', nroDia:n, verificado:false, fotos:[], productos:[{codigo:'CH1129',desc:'TITANIO LATEX',medida:'140x190',cant:1,precio:monto||1000}] }; };
  var L=[], i;
  for(i=0;i<9;i++) L.push(P('2026-10-09','AM'));
  for(i=0;i<3;i++) L.push(P('2026-10-09','PM'));
  for(i=0;i<14;i++) L.push(P('2026-10-10','AM'));
  for(i=0;i<12;i++) L.push(P('2026-10-12','AM')); for(i=0;i<13;i++) L.push(P('2026-10-12','PM'));
  /* Lo vendido por Maria Flores: este mes 2 ventas (3.000 + 2.500) y el mes pasado 11.000. */
  L.push(P('2026-10-20','AM','','CLIENTE MF1','Maria Flores',3000, new Date('2026-10-02T11:00:00-04:00').getTime()));
  L.push(P('2026-10-21','PM','','CLIENTE MF2','Maria Flores',2500, new Date('2026-10-05T11:00:00-04:00').getTime()));
  L.push(P('2026-09-28','AM','','CLIENTE MF3','Maria Flores',11000, new Date('2026-09-20T11:00:00-04:00').getTime()));
  window._SRV={ pedidos:L, stock:null };
  apiList=function(){
    var l=JSON.parse(JSON.stringify(window._SRV.pedidos));
    if(window._SRV.stock) l.push({ id:'__stock__', fecha:'', cliente:'📦 STOCK', observaciones:JSON.stringify(window._SRV.stock) });
    return Promise.resolve({ ok:true, pedidos:l });
  };
  apiSave=function(rec){
    var r=JSON.parse(JSON.stringify(rec)); r.rev=(Number(r.rev)||0)+1; window._saves.push(r);
    if(!/^__/.test(String(r.id))){ var i=window._SRV.pedidos.findIndex(function(p){ return p.id===r.id; }); if(i>=0) window._SRV.pedidos[i]=r; else window._SRV.pedidos.push(r); }
    return Promise.resolve({ ok:true, pedido:r });
  };
  downloadBlob=function(){};
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._stock=function(){
    var hoy=todayStr(), LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO';
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[IM]='otro';
    st.c.u[stockClave({ desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761' })]=6;
    st.g[IM].u[stockClave({ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107' })]=3;
    st.c.u[stockClave({ desc:'TITANIO LATEX', medida:'140x190', codigo:'CH1129' })]=60;
    return st;
  };
  var ev=function(e,t){ e.dispatchEvent(new Event(t||'input', { bubbles:true })); };
  window._cards=function(){ return document.querySelectorAll('#f-productos .prod-card'); };
  window._prod=function(i, cod, cant){
    while(_cards().length<=i) document.getElementById('f-add-prod').click();
    var c=_cards()[i], e=c.querySelector('.prod-codigo'); e.value=cod; ev(e); ev(e,'change');
    if(cant){ var q=c.querySelector('.prod-cant'); if(q){ q.value=String(cant); ev(q); ev(q,'change'); } }
  };
  window._llenar=function(){
    var set=function(id,v){ var e=document.getElementById(id); e.value=v; ev(e); ev(e,'change'); };
    set('f-vendedor','Maria Flores'); set('f-cliente','CLIENTE ROJAS'); set('f-celular','70011122'); set('f-nota','2345'); set('f-zona','Norte'); set('f-saldo','6940');
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const opts={ viewport:{ width:820, height:1000 }, timezoneId:'America/La_Paz' };
  if(VIDEO) opts.recordVideo={ dir:VIDEO, size:{ width:820, height:1000 } };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const pausa = ms => VIDEO ? page.waitForTimeout(ms) : Promise.resolve();
  const ver = async sel => { if(VIDEO) await page.evaluate(s=>{ var e=document.querySelector(s); if(e) e.scrollIntoView({behavior:'smooth', block:'center'}); }, sel); await pausa(900); };

  await ev(async()=>{ window._SRV.stock=window._stock(); STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    showView('form'); resetForm(); _llenar(); });
  await pausa(600);

  /* ── 1. Los próximos 7 días ── */
  console.log('\n── 1. Los próximos 7 días ──');
  await ver('#fx-dias');
  let r = await ev(()=>{ var b=[].slice.call(document.querySelectorAll('#fx-dias .fx-dia'));
    return b.map(function(x){ return { f:x.getAttribute('data-f'), t:x.innerText.replace(/\s+/g,' '), off:x.disabled }; }); });
  chk('hay 7 días desde mañana (la vendedora no agenda para hoy)', Array.isArray(r) && r.length===7 && r[0].f==='2026-10-09' && r[6].f==='2026-10-15', r);
  chk('viernes 09: 25 lugares − 12 pedidos = «13 libres»', r[0] && /VIE 09 13 libres/.test(r[0].t), r[0]);
  chk('sábado 10 (15, solo AM) con 14: «1 libre»; domingo 11 «cerrado» y no se toca; lunes 12 «lleno»',
    r[1] && /1 libre$/.test(r[1].t) && r[2] && /cerrado/.test(r[2].t) && r[2].off && r[3] && /lleno/.test(r[3].t), [r[1],r[2],r[3]]);
  try{ await page.click('#fx-dias .fx-dia[data-f="2026-10-09"]', {timeout:3000}); }catch(e){ await ev(()=>{ var f=document.getElementById('f-fecha'); f.value='2026-10-09'; f.dispatchEvent(new Event('change',{bubbles:true})); }); }   // la página de antes no tiene la tira
  await pausa(900);
  r = await ev(()=>({ fecha:document.getElementById('f-fecha').value, sel:!!document.querySelector('#fx-dias .fx-dia.sel[data-f="2026-10-09"]'), cupo:document.getElementById('cupo-form').innerText }));
  chk('tocar el viernes llena la fecha (y corre lo de siempre: el cartel de cupos lo dice)', r.fecha==='2026-10-09' && r.sel && /09\/10\/2026/.test(r.cupo), r);

  /* ── 2. El camión del turno ── */
  console.log('\n── 2. El camión del turno ──');
  await ver('#fx-camion');
  r = await ev(()=>{ var el=document.getElementById('fx-camion');
    return { visible:!el.hidden, slots:el.querySelectorAll('.fx-slot').length, llenos:el.querySelectorAll('.fx-slot:not(.tuyo)[stroke="#00B5AD"]').length, tuyo:el.querySelectorAll('.fx-slot.tuyo').length, t:el.innerText.replace(/\s+/g,' ') }; });
  chk('viernes AM: 12 lugares, 9 ocupados, el «tuyo» y «2 lugares libres además del tuyo»', r.visible && r.slots===12 && r.llenos===9 && r.tuyo===1 && /Viernes 09\/10 · turno AM/.test(r.t) && /2 lugares libres además del tuyo/.test(r.t), r);
  await page.click('#f-turno button[data-val="PM"]'); await pausa(1300);
  r = await ev(()=>{ var el=document.getElementById('fx-camion'); return { slots:el.querySelectorAll('.fx-slot').length, llenos:el.querySelectorAll('.fx-slot:not(.tuyo)[stroke="#00B5AD"]').length, t:el.innerText.replace(/\s+/g,' ') }; });
  chk('cambiar a PM: 13 lugares, 3 ocupados, «9 lugares libres además del tuyo»', r.slots===13 && r.llenos===3 && /9 lugares libres además del tuyo/.test(r.t), r);
  await page.click('#f-turno button[data-val="AM"]'); await pausa(1300);

  /* ── 3. El dibujo del cuadrito ── */
  console.log('\n── 3. El dibujo del cuadrito del saldo ──');
  await ev(()=>{ _prod(0,'CH1761',1); }); await page.waitForTimeout(VIDEO?2200:700); await ver('#f-productos .prod-card:nth-child(1)');
  await ev(()=>{ _prod(1,'CH1107',1); }); await page.waitForTimeout(VIDEO?2200:700); await ver('#f-productos .prod-card:nth-child(2)');
  await ev(()=>{ _prod(2,'CH2531',2); }); await page.waitForTimeout(VIDEO?2400:700); await ver('#f-productos .prod-card:nth-child(3)');
  r = await ev(()=>[].slice.call(_cards()).map(function(c){ var b=c.querySelector('.prod-saldo'); return { t:b?b.innerText.replace(/\s+/g,' ').slice(0,60):'', apila:!!(b&&b.querySelector('.fx-colchon')), va:!!(b&&b.querySelector('.fx-va')), humo:!!(b&&b.querySelector('.fx-humo')) }; }));
  chk('✅ DISPONIBLE lleva los colchones apilados', r[0] && /DISPONIBLE/.test(r[0].t) && r[0].apila, r[0]);
  chk('📥 HAY EN MORENO lleva el camioncito que va a buscarlo', r[1] && /MORENO/.test(r[1].t) && r[1].va, r[1]);
  chk('🏭 NO HAY lleva la fábrica trabajando', r[2] && /NO HAY/.test(r[2].t) && r[2].humo, r[2]);

  /* ── 5. Lo vendido en el mes ── */
  console.log('\n── 5. Lo vendido en el mes ──');
  await ver('#fx-mes');
  r = await ev(()=>{ var el=document.getElementById('fx-mes'); return { visible:!el.hidden, t:el.innerText.replace(/\s+/g,' '), w:(el.querySelector('.bar i')||{style:{}}).style.width }; });
  chk('«Vendido en octubre · Maria Flores»: Bs 5.500 en 2 ventas, 50% de lo de septiembre (Bs 11.000)', r.visible && /OCTUBRE · MARIA FLORES/.test(r.t) && /Bs 5\.500/.test(r.t) && /2 ventas este mes/.test(r.t) && /50% de lo de septiembre/.test(r.t) && r.w==='50%', r);

  /* ── 4. Guardar ── */
  console.log('\n── 4. La escena al guardar ──');
  await ev(()=>{ window.FX_PRUEBA=true; });
  await page.click('#f-submit');
  await page.waitForTimeout(700);
  r = await ev(()=>{ var e=document.getElementById('fx-escena'); return { on:!!(e && /\bon\b/.test(e.className)), img:!!(e && e.querySelector('.cam img[src*="camion-recorte.png"]')), bultos:e?e.querySelectorAll('.bulto').length:0 }; });
  chk('al guardar un pedido nuevo aparece la escena con la foto del camión y los productos que suben', r.on && r.img && r.bultos>=1, r);
  await page.waitForTimeout(VIDEO?7500:3500);
  try{ await page.waitForFunction(()=>/12\.440/.test((document.getElementById('fx-mes-n')||{}).textContent||''), null, {timeout:8000, polling:250}); }catch(e){ console.log('espera:', String(e.message).slice(0,160)); }
  r = await ev(()=>{ var e=document.getElementById('fx-escena'), s=document.getElementById('fx-sello');
    return { sello:s?s.innerText.replace(/\s+/g,' '):'', on:!!(s&&s.classList.contains('on')), sale:!!(e && e.querySelector('.cam.sale')), wa:document.getElementById('modal').classList.contains('on'), guardado:window._saves.some(function(x){ return x.cliente==='CLIENTE ROJAS'; }) }; });
  chk('el camión sale y aparece «¡Pedido guardado!» con el cliente, el día y el turno', r.on && r.sale && /¡Pedido guardado!/.test(r.sello) && /CLIENTE ROJAS/.test(r.sello) && /viernes 09\/10 · turno AM/.test(r.sello), r);
  chk('la escena muestra lo vendido en el mes con lo que suma el pedido (Bs 5.500 → 12.440)', /VENDIDO EN OCTUBRE/.test(r.sello) && /\+ Bs 6\.940 con este pedido/.test(r.sello) && /Bs 12\.440/.test(r.sello), r.sello);
  chk('el pedido se guardó igual y la ventana de WhatsApp de siempre quedó abajo', r.guardado && r.wa, r);
  await page.mouse.click(410, 960);
  await page.waitForTimeout(300);
  r = await ev(()=>{ var e=document.getElementById('fx-escena'); return { on:!!(e && /\bon\b/.test(e.className)), wa:document.getElementById('modal').classList.contains('on') }; });
  chk('tocar cierra la escena y queda la ventana de WhatsApp', !r.on && r.wa, r);

  /* ── En las pruebas automáticas no sale, y al corregir tampoco ── */
  r = await ev(async()=>{
    closeModal(); window.FX_PRUEBA=false;
    var p=window._SRV.pedidos.filter(function(x){ return x.cliente==='CLIENTE ROJAS'; })[0];
    showView('form'); resetForm(); _llenar(); document.getElementById('f-cliente').value='CLIENTE DOS'; _prod(0,'CH1129',1);
    var f=document.getElementById('f-fecha'); f.value='2026-10-13'; f.dispatchEvent(new Event('change',{bubbles:true}));
    await _esperar(400); document.getElementById('f-submit').click(); await _esperar(900);
    var sinPrueba=!!(document.getElementById('fx-escena') && /\bon\b/.test(document.getElementById('fx-escena').className));
    closeModal(); window.FX_PRUEBA=true;
    editPedido(p.id); await _esperar(500);
    var cam=document.getElementById('fx-camion'), mes=document.getElementById('fx-mes');
    var o={ sinPrueba:sinPrueba, slots:cam.querySelectorAll('.fx-slot').length, llenos:cam.querySelectorAll('.fx-slot:not(.tuyo)[stroke="#00B5AD"]').length, tuyo:cam.querySelectorAll('.fx-slot.tuyo').length, mesOculto:mes.hidden };
    document.getElementById('f-obs').value='corregido'; document.getElementById('f-submit').click(); await _esperar(1200);
    o.alCorregir=!!(document.getElementById('fx-escena') && /\bon\b/.test(document.getElementById('fx-escena').className));
    window.FX_PRUEBA=false; closeModal();
    return o;
  });
  chk('en las pruebas automáticas la escena no sale si no se pide (no tapa nada)', r.sinPrueba===false, r);
  chk('editando, el pedido ya está en el camión: 9 + el suyo = 10 de 12, sin contarlo dos veces; y sin la barra del mes', r.slots===12 && r.llenos===9 && r.tuyo===1 && r.mesOculto, r);
  chk('al corregir un pedido no sale la escena', r.alCorregir===false, r);

  /* ── 6. Pantalla ancha (§4ig): la agenda a la izquierda y el pedido en vivo a la derecha ── */
  console.log('\n── 6. Pantalla ancha: los costados ──');
  const ctx2 = await browser.newContext({ viewport:{ width:1920, height:960 }, timezoneId:'America/La_Paz' });
  const p2 = await ctx2.newPage(); p2.on('pageerror', e => errores.push(e.message)); p2.on('dialog', d => d.accept());
  await p2.route(/^https?:/, r => r.abort()); await p2.clock.setFixedTime(new Date('2026-10-08T10:00:00-04:00'));
  await p2.goto('file://' + PEDIDOS, { waitUntil:'load' }); await p2.waitForTimeout(300);
  await p2.evaluate(PREPARAR);
  const ev2 = async (fn, arg) => { try { return await p2.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev2(async()=>{ window._SRV.stock=window._stock(); STOCK_CARGADO=false; await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('form'); resetForm(); _llenar(); });
  await p2.waitForTimeout(400);
  r = await ev2(()=>{ var iz=document.getElementById('fx-izq'), de=document.getElementById('fx-der'), card=document.querySelector('#view-form .form-card').getBoundingClientRect();
    var a=iz.getBoundingClientRect(), b=de.getBoundingClientRect(), vis=function(id){ var e=document.getElementById(id); return !!e && getComputedStyle(e).display!=='none'; };
    return { izq:a.width>200 && a.right<=card.left, der:b.width>200 && b.left>=card.right, filas:iz.querySelectorAll('.fx-agd').length, adentro:vis('fx-dias')||vis('fx-mes'), pagina:document.documentElement.scrollWidth };
  });
  chk('desde 1300 px: la agenda a la izquierda y el pedido a la derecha del formulario, sin la tira de adentro repetida', r.izq && r.der && r.filas===7 && !r.adentro && r.pagina<=1920, r);
  try{ await p2.click('#fx-izq .fx-agd[data-f="2026-10-09"] .fx-tr[data-t="PM"]', {timeout:3000}); }catch(e){}
  await p2.waitForTimeout(500);
  r = await ev2(()=>({ fecha:document.getElementById('f-fecha').value, turno:segVal('f-turno'), cam:(document.getElementById('fx-izq-cam')||{}).innerText||'' }));
  chk('tocar el turno PM del viernes en la agenda elige el día Y el turno; el camión de la agenda lo muestra', r.fecha==='2026-10-09' && r.turno==='PM' && /Viernes 09\/10 · turno PM/.test(r.cam), r);
  await ev2(()=>{ _prod(0,'CH1761',1); var e=_cards()[0].querySelector('.prod-precio'); e.value='3500'; e.dispatchEvent(new Event('input',{bubbles:true})); });
  await p2.waitForTimeout(900);
  r = await ev2(()=>document.getElementById('fx-der').innerText.replace(/\s+/g,' '));
  chk('el pedido en vivo: cliente, día y turno, el producto con su estado, la suma, lo que falta y lo vendido en el mes',
    /CLIENTE ROJAS/.test(r) && /Viernes 09\/10 · turno PM/.test(r) && /ORO BI RELAX/.test(r) && /Disponible/.test(r) && /Bs 3\.500,00/.test(r) && /✓ Productos/.test(r) && /VENDIDO EN OCTUBRE/.test(r), r);
  await p2.setViewportSize({ width:1100, height:900 }); await p2.waitForTimeout(400);
  r = await ev2(()=>({ izq:getComputedStyle(document.getElementById('fx-izq')).display, dias:getComputedStyle(document.getElementById('fx-dias')).display }));
  chk('más angosto que 1300 px: sin costados, y la tira de días vuelve adentro del formulario', r.izq==='none' && r.dias!=='none', r);
  await ctx2.close();

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await ctx.close(); await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
