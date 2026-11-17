/* 🏭⛔ (17/11) Lo que se fabrica no se promete antes de que llegue: la fecha de entrega de una medida especial (y de lo que logística ya
   mandó a fabricar para ese pedido) tiene que ser la del cuadrito o después. Frena a las vendedoras al reprogramar y al guardar el
   formulario; Eduardo, ROHO y Administración con la contraseña quedan libres. Caso real: 11-152 (especial 160x200 cargado el 13/11 para
   el 14/11, movido al 18/11 y al 19/11). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r=>r.abort());
  const page = await ctx.newPage(); const errores=[], dialogos=[];
  page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>{ dialogos.push(d.message()); d.accept(); });
  await page.addInitScript(() => { window.FAB_FRENO_PRUEBA=true; });
  await page.clock.setFixedTime(new Date('2026-11-17T10:00:00-04:00'));   // martes, antes del corte
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(350);
  await page.evaluate(() => {
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); if(AUTO_TIMER) clearInterval(AUTO_TIMER); }catch(e){}
    loadFromServer=function(){};
    var esp={ desc:'COLCHON ESPECIAL ORTOPEDICO D/C', medida:'160x200', codigo:'', cant:1, precio:4740 };
    window.P=function(o){ return Object.assign({ id:'e1', oc:'11-152', vendedor:'Jonathan Monje', cliente:'CLIENTE UNO', fecha:'2026-11-18', turno:'PM',
      productos:[Object.assign({}, esp)], saldo:4740, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:Date.now(), rev:1, fotos:[] }, o||{}); };
    STATE=[P()]; UNLOCKED=false;
  });
  let r = await page.evaluate(() => {
    var p=STATE[0], v=fabFrenoPedido(p, '2026-11-18'), lejos=fabFrenoPedido(p, '2026-11-30');
    return { n:v.length, txt:(v[0]||{}).txt, desde:(v[0]||{}).desde, lejos:lejos.length };
  });
  chk('1a una medida especial para mañana no llega: lo dice con el día desde el que se puede', r.n===1 && /medida especial/.test(r.txt) && /se puede entregar desde/.test(r.txt) && r.desde>'2026-11-18', r);
  chk('1b a un día lejano, nada', r.lejos===0, r);
  dialogos.length=0;
  r = await page.evaluate(() => { var p=STATE[0]; return { vend:reproStockConfirmar(p, '2026-11-19', 'AM'), lejos:reproStockConfirmar(p, '2026-11-30', 'AM') }; });
  chk('2a 📅 Reprogramar de una vendedora a un día que no llega: FRENA y lo dice', r.vend===false && dialogos.some(m=>/no llega a fabricarse/.test(m) && /Administración con la contraseña/.test(m)), { r, dialogos });
  chk('2b …a un día al que llega, sigue', r.lejos===true, r);
  r = await page.evaluate(() => { var a=reproStockConfirmar(P({ vendedor:'Eduardo Añez' }), '2026-11-19','AM'), b=reproStockConfirmar(P({ vendedor:'Roho' }), '2026-11-19','AM');
    UNLOCKED=true; var c=reproStockConfirmar(P(), '2026-11-19','AM'); UNLOCKED=false; return { a, b, c }; });
  chk('2c Eduardo, ROHO y Administración con la contraseña: libres', r.a===true && r.b===true && r.c===true, r);
  // 🏭 lo que logística mandó a fabricar para ESTE pedido (el 11-152: en producción en Moreno desde el 17/11)
  r = await page.evaluate(() => { var q=P(); q.productos[0].enProd=true; q.productos[0].prodEn='Moreno'; q.productos[0].prodF='2026-11-17';
    var v=fabFrenoPedido(q, '2026-11-19'); return { n:v.length, txt:(v[0]||{}).txt, desde:(v[0]||{}).desde }; });
  chk('3 en producción desde el 17/11 → sale de fábrica en 48 h: el 19/11 no llega (el 11-152)', r.n===1 && /se está fabricando para este pedido/.test(r.txt) && r.desde>='2026-11-20', r);
  // Entregado, ATC: no se mira
  r = await page.evaluate(() => ({ ent:fabFrenoPedido(P({ entregado:true }), '2026-11-18').length, atc:fabFrenoPedido(P({ oc:'ATC 11-001' }), '2026-11-18').length }));
  chk('4 un pedido entregado o una ATC no se frenan', r.ent===0 && r.atc===0, r);
  // El formulario
  dialogos.length=0;
  r = await page.evaluate(() => { STATE=[P({ fecha:'2026-11-30' })]; showView('form'); editPedido('e1'); return true; });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => {
    var prev=findById('e1'), same=fabFrenoForm(prev, true, false).length;
    document.getElementById('f-fecha').value='2026-11-18'; document.getElementById('f-fecha').dispatchEvent(new Event('change'));
    var corto=fabFrenoForm(prev, true, false).length, g=fabFrenoGuardar('Jonathan Monje', prev, true, false), gEdu=fabFrenoGuardar('Eduardo Añez', prev, true, false);
    return { same, corto, g, gEdu };
  });
  chk('5a editar sin tocar la fecha (ya cumple): nada', r.same===0, r);
  chk('5b la vendedora la pasa a mañana: el formulario NO guarda y lo dice', r.corto===1 && r.g===false && dialogos.some(m=>/no llega a fabricarse/.test(m)), { r, dialogos });
  chk('5c Eduardo: libre', r.gEdu===true, r);
  r = await page.evaluate(() => { window.FAB_FRENO_PRUEBA=false; var a=fabFrenoActivo(); window.FAB_FRENO_PRUEBA=true; return a; });
  chk('6 en Playwright apagado salvo FAB_FRENO_PRUEBA (las pruebas de siempre siguen con la pregunta)', r===false, r);
  chk('sin errores en la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`); process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
