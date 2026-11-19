/* ❓ LAS PREGUNTAS DEL PANEL CON BOTONES QUE DICEN QUÉ HACEN (15/11/2026, mejora 282; dueño: aprobado, «empezá por las que más salen»).
   En vez de la ventanita gris del navegador (Aceptar/Cancelar), una ventana del panel con dibujo, título, renglones y dos botones que dicen
   lo que hacen; el seguro tiene el foco, Esc y tocar afuera = el seguro. Esta tanda: el saldo antes de guardar, el pedido/número repetido,
   borrar un pedido, borrar un pago y «¿salió igual?» del camión.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin la bandera (Playwright): la del navegador, con el MISMO texto de siempre, y lo de después corre en el acto (sincrónico).
   2. Con `PREG_PRUEBA`, borrar un pedido: ninguna ventanita del navegador; la del panel con el título y los botones «No, dejarlo» / «🗑 Sí,
      borrar el pedido» (rojo); el foco en el seguro; Esc, tocar afuera y «No» no borran; «Sí» borra (por el camino de siempre).
   3. Arriba de una ficha abierta: Esc cierra SOLO la pregunta (la ficha sigue).
   4. El saldo antes de guardar: el producto, lo que pasa y «¿Le avisaste…?»; «✏️ Volver y corregir» no guarda; «💾 Guardar igual» sigue.
   5. ¿Pedido repetido?: «💾 Es otra compra: guardar» sigue y no vuelve a preguntar lo mismo.
   6. Borrar un pago: «No» lo deja; «Sí» lo borra y la venta vuelve a deber.
   7. «¿Salió el camión igual?»: «No, voy a tildar» no marca; «Sí» marca «salió».
   8. Tab va de un botón al otro; Enter aprieta el que tiene el foco (el seguro).
   Datos SINTÉTICOS. Reloj clavado: martes 10/11/2026, 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_preguntas_panel.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-10T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  window._saves=[]; apiSave=function(r){ window._saves.push(JSON.parse(JSON.stringify(r))); var x=JSON.parse(JSON.stringify(r)); x.rev=(Number(x.rev)||0)+1; return Promise.resolve({ ok:true, pedido:x }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  STATE=[
    { id:'p1', oc:'11-201', cliente:'ANA ROJAS', vendedor:'Carola Chavez', fecha:'2026-11-12', turno:'AM', productos:[{ desc:'COLCHON TITANIO ICE', medida:'140x190', cant:1, precio:3000 }], saldo:2500, acuenta:500, pagado:false,
      metodoPago:'~Efectivo 500 @2026-11-09 #77', ts:Date.now()-86400000, rev:1, fotos:[] },
    { id:'p2', oc:'11-202', cliente:'LUIS PEÑA', vendedor:'Carola Chavez', fecha:'2026-11-12', turno:'PM', productos:[{ desc:'COLCHON SOFT', medida:'90x190', cant:1, precio:1200 }], saldo:0, acuenta:0, pagado:true,
      metodoPago:'QR BISA 1200 @2026-11-09 #78', ts:Date.now()-86400000, rev:1, fotos:[] }
  ];
  saveMirror();
  window._borrados=[]; window.borrarConDeshacer=function(id){ window._borrados.push(id); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'', lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }),
      no:o.querySelector('.preg-no').textContent, si:o.querySelector('.preg-si').textContent, siColor:getComputedStyle(o.querySelector('.preg-si')).backgroundColor, foco:document.activeElement && document.activeElement.className,
      z:Number(getComputedStyle(o).zIndex) }; };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:800 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page.on('dialog', d=>{ page._dialogos.push(d.message()); d.accept(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    page._ctx=ctx; return page;
  };
  let r;

  console.log('\n── 1. Sin la bandera ──');
  let page = await nueva(false);
  r = await page.evaluate(() => { deletePedido('p1'); var a=window._borrados.slice(); var seguido=false;
    saldoPreguntaDatos=function(){ return { lineas:['• COLCHON TITANIO ICE 140x190 ×2: no hay saldo libre (faltan 2).'], items:[{ nom:'COLCHON TITANIO ICE 140x190', cant:2, txt:'no hay saldo libre (faltan 2).' }], primero:null, aQuien:'al cliente' }; };
    saldoPreguntarAlGuardar(null, false, false, function(){ seguido=true; });
    return { a:a, seguido:seguido, ov:!!document.querySelector('.preg-ov') }; });
  chk('1 sin bandera: la del navegador con el MISMO texto, y lo de después en el acto', page._dialogos[0]==='¿Eliminar el pedido de ANA ROJAS (N° 11-201)?' && r.a.join()==='p1' &&
      /^⚠️ ANTES DE GUARDAR, MIRÁ EL SALDO:\n\n• COLCHON TITANIO ICE 140x190 ×2: no hay saldo libre \(faltan 2\)\.\n\n¿Le avisaste al cliente cuánto tiene que esperar\?\n\n• Aceptar: guardar el pedido igual\.\n• Cancelar: volver al pedido sin guardar\.$/.test(page._dialogos[1]||'') && r.seguido && !r.ov, { d:page._dialogos, r });
  await page._ctx.close();

  console.log('\n── 2-8. Con la bandera ──');
  page = await nueva(true);
  r = await page.evaluate(async () => { deletePedido('p1'); await _esperar(80); return _preg(); });
  chk('2a borrar: la ventana del panel, sin la del navegador; título, lo que pasa y los dos botones', page._dialogos.length===0 && r && r.tit==='¿Borrar el pedido OC 11-201?' && /ANA ROJAS/.test(r.sub) && /TITANIO ICE/.test(r.sub) &&
      r.lineas[0]==='Sale de la planilla para todo el equipo.' && r.no==='No, dejarlo' && r.si==='🗑 Sí, borrar el pedido', r);
  chk('2b el «sí» de borrar va en rojo y el foco en el seguro', /rgb\(206, 41, 57\)/.test(r.siColor) && r.foco==='preg-no', r);
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ ov:!!document.querySelector('.preg-ov'), b:window._borrados.slice() }));
  chk('2c Esc cierra sin borrar', !r.ov && r.b.length===0, r);
  await page.evaluate(() => { deletePedido('p1'); }); await page.waitForTimeout(80);
  // (16/11) en el primer medio segundo tocar el fondo no contesta (el 2º clic de un doble clic): se prueba eso y después el toque de verdad.
  await page.mouse.click(15, 15); await page.waitForTimeout(60);
  r = await page.evaluate(() => ({ ov:!!document.querySelector('.preg-ov'), b:window._borrados.slice() }));
  chk('2d0 un toque al fondo enseguida (doble clic) no contesta nada', r.ov && r.b.length===0, r);
  await page.waitForTimeout(500);
  await page.mouse.click(15, 15); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ ov:!!document.querySelector('.preg-ov'), b:window._borrados.slice() }));
  chk('2d tocar afuera cierra sin borrar', !r.ov && r.b.length===0, r);
  await page.evaluate(() => { deletePedido('p1'); }); await page.waitForTimeout(80);
  await page.click('.preg-ov .preg-no'); await page.waitForTimeout(80);
  r = await page.evaluate(() => window._borrados.slice());
  chk('2e «No, dejarlo» no borra', r.length===0, r);
  await page.evaluate(() => { deletePedido('p1'); }); await page.waitForTimeout(80);
  await page.keyboard.press('Tab'); await page.waitForTimeout(30);
  r = await page.evaluate(() => document.activeElement.className);
  await page.keyboard.press('Tab'); await page.waitForTimeout(30);
  const r2 = await page.evaluate(() => document.activeElement.className);
  await page.keyboard.press('Enter'); await page.waitForTimeout(80);
  const r3 = await page.evaluate(() => ({ ov:!!document.querySelector('.preg-ov'), b:window._borrados.slice() }));
  chk('8 Tab va de un botón al otro; Enter aprieta el que tiene el foco (de vuelta en el seguro: no borra)', r==='preg-si' && r2==='preg-no' && !r3.ov && r3.b.length===0, [r, r2, r3]);
  await page.evaluate(() => { deletePedido('p1'); }); await page.waitForTimeout(80);
  await page.click('.preg-ov .preg-si'); await page.waitForTimeout(80);
  r = await page.evaluate(() => window._borrados.slice());
  chk('2f «🗑 Sí, borrar el pedido» borra por el camino de siempre', r.join()==='p1', r);

  r = await page.evaluate(async () => { showPedidoModal('p2'); await _esperar(150); deletePedido('p2'); await _esperar(80); var p=_preg(), z0=Number(getComputedStyle(document.getElementById('modal')).zIndex)||0; return { p:p, z0:z0 }; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  const fic = await page.evaluate(() => ({ ov:!!document.querySelector('.preg-ov'), modal:document.getElementById('modal').classList.contains('on') }));
  chk('3 arriba de una ficha abierta; Esc cierra SOLO la pregunta', r.p && r.p.z>r.z0 && !fic.ov && fic.modal, { r, fic });
  await page.evaluate(() => { try{ closeModal(); }catch(e){} });

  r = await page.evaluate(async () => { window._seg=0;
    saldoPreguntaDatos=function(){ return { lineas:['x'], items:[{ nom:'COLCHON TITANIO ICE 140x190', cant:2, txt:'no hay saldo libre (faltan 2). Hay que mandar a producir (avisá a logística): el cliente espera 4 días.' }], primero:null, aQuien:'al cliente' }; };
    saldoPreguntarAlGuardar(null, false, false, function(){ window._seg++; }); await _esperar(80); return _preg(); });
  chk('4a el saldo: el producto en el título, lo que pasa y «¿Le avisaste al cliente…?»; «✏️ Volver y corregir» / «💾 Guardar igual»',
      r && r.tit==='COLCHON TITANIO ICE 140x190 ×2' && /faltan 2/.test(r.lineas[0]) && r.lineas[1]==='¿Le avisaste al cliente cuánto tiene que esperar?' && r.no==='✏️ Volver y corregir' && r.si==='💾 Guardar igual', r);
  await page.click('.preg-ov .preg-no'); await page.waitForTimeout(60);
  r = await page.evaluate(async () => { var a=window._seg; saldoPreguntarAlGuardar(null, false, false, function(){ window._seg++; }); await _esperar(60); document.querySelector('.preg-ov .preg-si').click(); await _esperar(60); return [a, window._seg]; });
  chk('4b «Volver y corregir» no guarda; «Guardar igual» sigue', r[0]===0 && r[1]===1, r);

  r = await page.evaluate(async () => { window._seg=0; FX_DUP_OK='';
    fxDupBuscar=function(){ return [{ p:{ id:'p2', cliente:'LUIS PEÑA' }, porCel:true }]; }; fxDupTxt=function(d){ return 'LUIS PEÑA · 11-202 · 12/11'; };
    fxDupPreguntar(function(){ window._seg++; }); await _esperar(60); var p=_preg(); document.querySelector('.preg-ov .preg-si').click(); await _esperar(60);
    var a=window._seg; fxDupPreguntar(function(){ window._seg++; }); await _esperar(60); return { p:p, a:a, b:window._seg, otra:!!document.querySelector('.preg-ov') }; });
  chk('5 ¿pedido repetido?: «💾 Es otra compra: guardar» sigue y no vuelve a preguntar lo mismo', r.p && r.p.tit==='¿Pedido repetido? Este celular ya tiene un pedido' && r.p.si==='💾 Es otra compra: guardar' && r.a===1 && r.b===2 && !r.otra, r);

  r = await page.evaluate(async () => { ctaBorrarPago('p1', 0); await _esperar(80); var p=_preg(); document.querySelector('.preg-ov .preg-no').click(); await _esperar(60);
    var m0=findById('p1').metodoPago; ctaBorrarPago('p1', 0); await _esperar(80); document.querySelector('.preg-ov .preg-si').click(); await _esperar(150);
    var q=findById('p1'); try{ closeModal(); }catch(e){} return { p:p, m0:m0, m1:q.metodoPago, saldo:q.saldo, acuenta:q.acuenta }; });
  chk('6a borrar un pago: la pregunta dice qué y cuánto, y «No» lo deja', r.p && /^¿Borrar el ADELANTO de Bs 500,00\?$/.test(r.p.tit) && /lo que falta cobrar pasa de Bs 2\.500,00 a Bs 3\.000,00/.test(r.p.lineas[0]) && /Sí, borrar el adelanto/.test(r.p.si) && /Efectivo 500/.test(r.m0), r);
  chk('6b «Sí» lo borra: la venta vuelve a deber el total', !/Efectivo 500/.test(r.m1) && Number(r.saldo)===3000 && Number(r.acuenta)===0, r);

  r = await page.evaluate(async () => { cargaVivaDatos=function(){ return { porK:{ Carry:{ total:3, dentro:1 } } }; }; adelantoAlSalir=function(){};
    camionSalioMarcar('Carry', true); await _esperar(80); var p=_preg(); document.querySelector('.preg-ov .preg-no').click(); await _esperar(60);
    var a=!!salioClave(todayStr(), 'Carry'); camionSalioMarcar('Carry', true); await _esperar(80); document.querySelector('.preg-ov .preg-si').click(); await _esperar(80);
    return { p:p, a:a, b:!!salioClave(todayStr(), 'Carry') }; });
  chk('7 ¿salió el camión igual?: «No, voy a tildar» no marca; «Sí» marca «salió»', r.p && r.p.tit==='¿Salió el Carry igual?' && /tildar 2 bultos/.test(r.p.sub) && r.p.no==='No, voy a tildar' && !r.a && r.b, r);
  await page._ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
