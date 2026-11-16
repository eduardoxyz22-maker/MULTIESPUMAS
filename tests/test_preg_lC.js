/* ❓ LAS PREGUNTAS DEL LOTE C EN LA VENTANA DEL PANEL (16/11/2026; dueño: «¿no que mis alertas no salían ya esas feas?»).
   El lote C (renglones 27279-42884 de `pedidos.html`) pasó las ventanitas del navegador a `preguntaYa` / `preguntaTextoYa` / `avisoVentana`.

   ⚠️ LO QUE ESTE TEST CUIDA (con `window.PREG_PRUEBA`, salvo la §0):
   0. Sin la bandera, 📅 Reprogramar pregunta con la del navegador, con el MISMO texto de siempre, y mueve UNA vez.
   1. 📅 Reprogramar un ✅ entregado a un domingo: DOS preguntas de a una; mientras no se contesta no se mueve nada; con las dos en «sí»
      mueve UNA vez (lo mismo que antes con Aceptar: con `forzar`); «No, dejarlo» no mueve.
   2. 📅 Reprogramar con «¿El cliente todavía no sabe el día?» (`FMOV_PRUEBA`): «Ya eligió» mueve al día; «Todavía no sabe» lo pasa a
      «avisa cuándo» (sin fecha) y NO lo mueve.
   3. El selector 🧾 Cotización con un pedido a medio cargar (casilla/selector): mientras espera, el botón vuelve a 📄 OC; «Seguir con el
      pedido» no cambia nada; «Pasarlo a cotización» lo pasa (y se borra lo de la venta, como siempre).
   4. 🔑 Cambiar contraseña: los dos campos y los dos avisos («Muy corta», «No coinciden») en la ventana; solo con las dos iguales cambia.
   5. ✏️ Editar con un pedido NUEVO a medio llenar: «Volver al pedido nuevo» no abre nada; «Descartarlo» abre la edición.
   6. «＋ Nuevo pedido» con una edición abierta: «Volver a la edición» la deja; «Empezar uno nuevo» la suelta.
   7. Borrar una foto de la entrega: «No» no borra; «Sí» borra ESA foto una vez.
   8. Descartar un borrador de Kommo: «No» no descarta; «Sí» descarta una vez.
   9. 🏪 Venta de tienda con una cotización a medio cargar: esperando no cambia nada; «Es otra» abre una vacía; «Sí, es esa» pasa lo de la
      cotización.
   10. 🔁 Programar la devolución de una ATC el día de su recojo, a un domingo: dos preguntas; con las dos en «sí» guarda UNA vez con
       `forzar`.
   11. AM⇄PM de la ficha chica, destildar la carga, sacar una ATC de Trello y deshacer «salió»: «No» no hace nada; «Sí», UNA vez.
   En todo lo de la bandera: ninguna ventanita del navegador.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026, 10:00 de Bolivia.   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_preg_lC.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-16T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; SERVER_VER='2026-11-16-a'; SERVER_AUTH='';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_ADMIN); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };   // una lectura no cambia nada
  apiSave=function(r){ return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(r)) }); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, ic:o.querySelector('.preg-i').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'',
      lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }),
      no:(o.querySelector('.preg-no')||{}).textContent||null, si:o.querySelector('.preg-si').textContent, pel:!!o.querySelector('.preg-pel'),
      campo:(o.querySelector('.preg-in')||{}).value, n:document.querySelectorAll('.preg-ov').length }; };
  /* Lo que hace «sí»: se anota en vez de ir a la planilla. */
  window._mov=[]; reproAplicar=function(p, f, t, forzar){ window._mov.push([String(p.id), f, t, !!forzar]); return Promise.resolve({ ok:true }); };
  window._per=[]; persistPedido=function(p, o){ window._per.push({ id:String(p.id), fecha:p.fecha, fotos:(p.fotos||[]).slice(), o:o||null, avisa:(typeof avisaDe==='function') ? avisaDe(p) : '' }); return Promise.resolve({ ok:true }); };
  window._fbor=[]; borrarFotoSiNadieLaUsa=function(fid){ window._fbor.push(fid); };
  window._desc=[]; descartarBorradorHacer=function(id, callado){ window._desc.push([id, !!callado]); return Promise.resolve('ok'); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var mk=function(id, x){ return Object.assign({ id:id, oc:'11-0'+id.slice(-2), nota:'1234'+id.slice(-1), vendedor:'Carola Chavez', cliente:'CLIENTE '+id.toUpperCase(), celular:'7001234'+id.slice(-1),
    productos:[{ desc:'COLCHON PRUEBA', medida:'140x190', codigo:'', cant:1, precio:1000 }], fecha:'2026-11-18', turno:'AM', zona:'Centro', direccion:'Calle 1', maps:'',
    pagado:false, metodoPago:'', cobradoBs:0, acuenta:0, saldo:1000, observaciones:'', garantia:'', facturarA:'', nit:'', estado:'', entregado:false, verificado:false,
    vehiculo:'', chofer:'', nroDia:1, ts:Date.parse('2026-11-10T10:00:00-04:00'), fotos:[], rev:3 }, x||{}); };
  window._mk=mk;
  STATE=[
    mk('p01', { fecha:'2026-11-16', entregado:true }),                                   // 1. ✅ entregado hoy
    mk('p02', { fecha:'2026-11-17', observaciones:'El cliente confirmará la fecha' }),   // 2. la de relleno
    mk('p03', { fecha:'2026-11-17', observaciones:'El cliente confirmará la fecha' }),
    mk('p04', {}),                                                                       // 5-6. para editar
    mk('p05', { fotos:['foto-a','foto-b'] }),                                            // 7. fotos
    mk('a06', { oc:'ATC 11-006', fecha:'2026-11-16', productos:[{ desc:'COLCHON PRUEBA', medida:'140x190', cant:1, atc:{ mot:'hundimiento', det:'Se hundió en el medio', fcom:'2026-05-01' } }] })   // 10. ATC
  ];
  BORRADORES=[ { id:'kommo-9001', estado:'borrador', cliente:'KOMMO PRUEBA', vendedor:'Carola Chavez', productos:[], fecha:'', turno:'' } ];
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag, init) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:860 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page.on('dialog', d=>{ page._dialogos.push(d.type()+'|'+d.message()); if(d.type()==='prompt') d.accept('ESCRITO'); else d.accept(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    if(init) await page.addInitScript(init);
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  const preg = (page) => page.evaluate(() => window._preg());
  const si = async (page) => { await page.click('.preg-si'); await page.waitForTimeout(90); };
  const no = async (page) => { await page.click('.preg-no'); await page.waitForTimeout(90); };

  /* 0. Sin la bandera: lo del navegador, con el mismo texto y una sola vez. */
  { const { ctx, page } = await nueva(false);
    const r = await page.evaluate(() => { REPRO={ id:'p01', kind:'admin', fecha:'2026-11-22', turno:'AM' }; reproConfirmar(); return { mov:window._mov, ov:!!document.querySelector('.preg-ov') }; });
    chk('0 · sin bandera: dos ventanitas del navegador con el texto de siempre (entregado y «Ojo»)',
      page._dialogos.length===2 && /^confirm\|✅ Este pedido figura ENTREGADO/.test(page._dialogos[0]) && /^confirm\|⚠️ Ojo:\n\n   • Es DOMINGO/.test(page._dialogos[1]) && /¿Reprogramar igual\?$/.test(page._dialogos[1]), page._dialogos);
    chk('0 · sin bandera: mueve UNA vez, con forzar, y sin ventana del panel', r.mov.length===1 && r.mov[0].join()==='p01,2026-11-22,AM,true' && !r.ov, r);
    await ctx.close(); }

  const { ctx, page } = await nueva(true, () => { window.COT_PRUEBA=1; });

  /* 1. 📅 Reprogramar un ✅ entregado a un domingo: dos preguntas, y lo suyo UNA vez. */
  { await page.evaluate(() => { REPRO={ id:'p01', kind:'admin', fecha:'2026-11-22', turno:'AM' }; reproConfirmar(); });
    let p = await preg(page), m = await page.evaluate(() => window._mov.length);
    chk('1 · Reprogramar un ✅: la ventana del panel «figura ENTREGADO» con sus botones, y todavía no movió nada',
      p && /figura ENTREGADO: ¿pasarlo al/.test(p.tit) && p.no==='No, dejarlo' && p.si==='📅 No se entregó: moverlo' && p.lineas.length===2 && m===0, { p, m });
    await si(page);
    p = await preg(page); m = await page.evaluate(() => window._mov.length);
    chk('1 · al contestar sigue con la segunda: «¿Reprogramar igual?» con el domingo; todavía no movió', p && p.tit==='¿Reprogramar igual?' && /DOMINGO/.test(p.lineas.join()) && p.si==='📅 Reprogramar igual' && m===0, { p, m });
    await si(page);
    let r = await page.evaluate(() => ({ mov:window._mov.slice(), p:window._preg(), memo:PREG_MEMO }));
    chk('1 · con las dos en «sí» mueve UNA vez, con forzar (lo mismo que Aceptar)', r.mov.length===1 && r.mov[0].join()==='p01,2026-11-22,AM,true' && !r.p && r.memo===null, r);
    await page.evaluate(() => { window._mov=[]; REPRO={ id:'p01', kind:'admin', fecha:'2026-11-22', turno:'AM' }; reproConfirmar(); });
    await no(page);
    r = await page.evaluate(() => ({ mov:window._mov.slice(), p:window._preg() }));
    chk('1 · «No, dejarlo» no mueve nada (ni pregunta lo otro)', r.mov.length===0 && !r.p, r); }

  /* 2. «¿El cliente todavía no sabe el día?» */
  { await page.evaluate(() => { window.FMOV_PRUEBA=true; window._mov=[]; window._per=[]; REPRO={ id:'p02', kind:'admin', fecha:'2026-11-19', turno:'AM' }; reproConfirmar(); });
    let p = await preg(page);
    chk('2 · «¿El cliente todavía no sabe el día?» en la ventana, con lo que dicen las observaciones y los dos caminos',
      p && p.tit==='¿El cliente todavía no sabe el día?' && /confirmará/.test(p.sub) && /^📅 Ya eligió: moverlo al /.test(p.no) && p.si==='📦 Todavía no sabe', p);
    await no(page);
    let r = await page.evaluate(() => ({ mov:window._mov.slice(), per:window._per.slice(), ya:!!FMOV_YA['p02|2026-11-19'], p:window._preg() }));
    chk('2 · «Ya eligió» lo mueve a ese día UNA vez y no lo pasa a «avisa cuándo»', r.mov.length===1 && r.mov[0].join()==='p02,2026-11-19,AM,false' && r.per.length===0 && r.ya && !r.p, r);
    await page.evaluate(() => { window._mov=[]; window._per=[]; REPRO={ id:'p03', kind:'admin', fecha:'2026-11-19', turno:'AM' }; reproConfirmar(); });
    await si(page);
    r = await page.evaluate(() => ({ mov:window._mov.slice(), per:window._per.slice(), p:window._preg() }));
    chk('2 · «Todavía no sabe» lo pasa a «avisa cuándo» (sin fecha, volver a llamar el 19/11) y NO lo mueve',
      r.mov.length===0 && r.per.length===1 && r.per[0].id==='p03' && r.per[0].fecha==='' && r.per[0].avisa==='2026-11-19' && !r.p, r);
    await page.evaluate(() => { window.FMOV_PRUEBA=false; }); }

  /* 3. El selector 🧾 con un pedido a medio cargar */
  { await page.evaluate(() => { closeModal(); showView('form'); resetForm();
      var s=function(id, v){ var e=document.getElementById(id); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
      s('f-vendedor','Carola Chavez'); s('f-cliente','JUAN PRUEBA'); s('f-nota','123456');
      document.querySelector('#f-doc-tipo button[data-val="COT"]').click(); });
    let p = await preg(page);
    let r = await page.evaluate(() => ({ tipo:docTipoSel(), act:(document.querySelector('#f-doc-tipo .active')||{}).dataset.val, nota:document.getElementById('f-nota').value }));
    chk('3 · 🧾 con un pedido a medio cargar: la ventana (roja: se borra la nota) y, mientras espera, el botón vuelve a 📄 OC sin tocar nada',
      p && p.tit==='¿Pasar este pedido a cotización?' && p.pel && /la nota de venta \(123456\)/.test(p.lineas.join()) && p.no==='Seguir con el pedido' && p.si==='🧾 Pasarlo a cotización' &&
      r.tipo==='OC' && r.act==='OC' && r.nota==='123456', { p, r });
    await no(page);
    r = await page.evaluate(() => ({ tipo:docTipoSel(), cotiz:document.getElementById('view-form').classList.contains('cotizando'), nota:document.getElementById('f-nota').value, cli:document.getElementById('f-cliente').value }));
    chk('3 · «Seguir con el pedido» no cambia nada', r.tipo==='OC' && !r.cotiz && r.nota==='123456' && r.cli==='JUAN PRUEBA', r);
    await page.evaluate(() => document.querySelector('#f-doc-tipo button[data-val="COT"]').click());
    await si(page);
    r = await page.evaluate(() => ({ tipo:docTipoSel(), cotiz:document.getElementById('view-form').classList.contains('cotizando'), nota:document.getElementById('f-nota').value, cli:document.getElementById('f-cliente').value, p:window._preg() }));
    chk('3 · «Pasarlo a cotización» lo pasa: el cliente queda y la nota se borra (como siempre)', r.tipo==='COT' && r.cotiz && r.nota==='' && r.cli==='JUAN PRUEBA' && !r.p, r);
    await page.evaluate(() => { cotSalir(); resetForm(); }); }

  /* 4. 🔑 Cambiar contraseña */
  { await page.evaluate(() => changePass()); await page.waitForTimeout(60);
    let p = await preg(page);
    chk('4 · el campo de la contraseña en la ventana del panel', p && p.tit==='Nueva contraseña' && p.campo==='' && p.si==='Seguir', p);
    await page.fill('.preg-in', 'ab'); await page.keyboard.press('Enter'); await page.waitForTimeout(90);
    p = await preg(page);
    chk('4 · «Muy corta» en la ventana, con un solo botón', p && p.tit==='Muy corta' && p.no===null && p.si==='Entendido', p);
    await si(page);
    await page.evaluate(() => changePass()); await page.waitForTimeout(60);
    await page.fill('.preg-in', 'abcd'); await page.keyboard.press('Enter'); await page.waitForTimeout(90);
    p = await preg(page);
    chk('4 · con 4 o más pide repetirla', p && p.tit==='Repetí la nueva contraseña' && p.campo==='' && p.si==='💾 Cambiar la contraseña', p);
    await page.fill('.preg-in', 'abce'); await page.keyboard.press('Enter'); await page.waitForTimeout(90);
    p = await preg(page);
    let ls = await page.evaluate(() => localStorage.getItem(LS_ADMIN));
    chk('4 · distintas: «No coinciden» y no cambia nada', p && p.tit==='No coinciden' && p.no===null && ls===null, { p, ls });
    await si(page);
    await page.evaluate(() => changePass()); await page.waitForTimeout(60);
    await page.fill('.preg-in', 'abcd'); await page.keyboard.press('Enter'); await page.waitForTimeout(90);
    await page.fill('.preg-in', 'abcd'); await page.keyboard.press('Enter'); await page.waitForTimeout(90);
    let r = await page.evaluate(() => ({ ls:localStorage.getItem(LS_ADMIN), bien:sha256('abcd'), p:window._preg() }));
    chk('4 · iguales: la contraseña cambia (la misma cuenta de siempre)', r.ls===r.bien && !r.p, r);
    await page.evaluate(() => { try{ localStorage.removeItem(LS_ADMIN); }catch(e){} }); }

  /* 5. ✏️ Editar con un pedido NUEVO a medio llenar */
  { await page.evaluate(() => { showView('form'); resetForm(); var e=document.getElementById('f-cliente'); e.value='NUEVO A MEDIO'; editPedido('p04'); });
    let p = await preg(page), r = await page.evaluate(() => ({ ed:EDIT_ID, cli:document.getElementById('f-cliente').value }));
    chk('5 · Editar con un pedido nuevo a medio llenar: la ventana roja, y mientras espera no abre nada',
      p && p.tit==='¿Descartar el pedido nuevo que estás llenando?' && p.pel && p.no==='📝 Volver al pedido nuevo' && p.si==='🗑 Descartarlo y abrir la otra' && r.ed===null && r.cli==='NUEVO A MEDIO', { p, r });
    await no(page);
    r = await page.evaluate(() => ({ ed:EDIT_ID, cli:document.getElementById('f-cliente').value, form:document.getElementById('view-form').classList.contains('active') }));
    chk('5 · «Volver al pedido nuevo» lo deja como estaba', r.ed===null && r.cli==='NUEVO A MEDIO' && r.form, r);
    await page.evaluate(() => editPedido('p04')); await si(page); await page.waitForTimeout(150);
    r = await page.evaluate(() => ({ ed:EDIT_ID, cli:document.getElementById('f-cliente').value, p:window._preg() }));
    chk('5 · «Descartarlo y abrir la otra» abre la edición de ese pedido', r.ed==='p04' && r.cli==='CLIENTE P04' && !r.p, r); }

  /* 6. «＋ Nuevo pedido» con una edición abierta */
  { await page.evaluate(() => { showView('mis'); tabNuevoPedido(); });
    let p = await preg(page), r = await page.evaluate(() => ({ ed:EDIT_ID, mis:document.getElementById('view-mis').classList.contains('active') }));
    chk('6 · «＋ Nuevo pedido» con una edición abierta: la ventana, y mientras espera sigue donde estaba',
      p && p.tit==='¿Empezar un pedido nuevo sin guardar la edición?' && /CLIENTE P04/.test(p.sub) && p.no==='✏️ Volver a la edición' && p.si==='＋ Empezar uno nuevo' && r.ed==='p04' && r.mis, { p, r });
    await no(page);
    r = await page.evaluate(() => ({ ed:EDIT_ID, form:document.getElementById('view-form').classList.contains('active') }));
    chk('6 · «Volver a la edición» la deja abierta', r.ed==='p04' && r.form, r);
    await page.evaluate(() => { showView('mis'); tabNuevoPedido(); }); await si(page);
    r = await page.evaluate(() => ({ ed:EDIT_ID, form:document.getElementById('view-form').classList.contains('active'), cli:document.getElementById('f-cliente').value }));
    chk('6 · «Empezar uno nuevo» la suelta y deja el formulario vacío', r.ed===null && r.form && r.cli==='', r); }

  /* 7. Borrar una foto de la entrega */
  { await page.evaluate(() => { window._per=[]; quitarFoto('p05', 0); });
    let p = await preg(page);
    chk('7 · borrar una foto: la ventana roja con sus botones', p && p.tit==='¿Borrar esta foto de la entrega?' && p.pel && p.no==='No, dejarla' && p.si==='🗑 Sí, borrarla', p);
    await no(page);
    let r = await page.evaluate(() => ({ per:window._per.slice(), fotos:findById('p05').fotos.slice(), bor:window._fbor.slice() }));
    chk('7 · «No, dejarla» no borra nada', r.per.length===0 && r.fotos.join()==='foto-a,foto-b' && r.bor.length===0, r);
    await page.evaluate(() => quitarFoto('p05', 0)); await si(page);
    r = await page.evaluate(() => ({ per:window._per.slice(), fotos:findById('p05').fotos.slice(), bor:window._fbor.slice() }));
    chk('7 · «Sí, borrarla» borra ESA foto UNA vez', r.per.length===1 && r.fotos.join()==='foto-b' && r.bor.join()==='foto-a', r); }

  /* 8. Descartar un borrador de Kommo */
  const borr = () => page.evaluate(() => { BORRADORES=[ { id:'kommo-9001', estado:'borrador', cliente:'KOMMO PRUEBA', vendedor:'Carola Chavez', productos:[], fecha:'', turno:'' } ]; descartarBorrador('kommo-9001'); });
  { await borr();
    let p = await preg(page);
    chk('8 · descartar un borrador de Kommo: la ventana roja', p && p.tit==='¿Descartar la venta de KOMMO PRUEBA que vino de Kommo?' && p.pel && p.si==='🗑 Sí, descartarla', p);
    await no(page);
    let r = await page.evaluate(() => window._desc.slice());
    chk('8 · «No, dejarla» no descarta', r.length===0, r);
    await borr(); await si(page);
    r = await page.evaluate(() => window._desc.slice());
    chk('8 · «Sí, descartarla» descarta UNA vez (lo de siempre, avisando)', r.length===1 && r[0].join()==='kommo-9001,false', r); }

  /* 9. 🏪 Venta de tienda con una cotización a medio cargar */
  { await page.evaluate(() => { showView('form'); resetForm(); window._rep=[]; cotVentaFoto=function(){ return { marca:'foto' }; }; cotVentaReponer=function(F){ window._rep.push(F); };
      COT_VENTA={ id:'cot-x', num:'COT 11-077', total:1000, dia:'2026-11-14' }; abrirVentaTienda(); });
    let p = await preg(page), r = await page.evaluate(() => ({ vt:VENTA_TIENDA, cv:COT_VENTA && COT_VENTA.id }));
    chk('9 · venta de tienda con una cotización: la ventana con los dos caminos, y mientras espera no cambia nada',
      p && /^¿Esta venta de tienda es la de la cotización COT 11-077/.test(p.tit) && p.no==='Es otra: una venta nueva' && p.si==='🧾 Sí, es esa' && r.vt===false && r.cv==='cot-x', { p, r });
    await no(page);
    r = await page.evaluate(() => ({ vt:VENTA_TIENDA, cv:COT_VENTA, rep:window._rep.length }));
    chk('9 · «Es otra» abre una venta de tienda vacía (sin lo de la cotización)', r.vt===true && r.cv===null && r.rep===0, r);
    await page.evaluate(() => { VENTA_TIENDA=false; resetForm(); COT_VENTA={ id:'cot-x', num:'COT 11-077', total:1000, dia:'2026-11-14' }; abrirVentaTienda(); });
    await si(page);
    r = await page.evaluate(() => ({ vt:VENTA_TIENDA, rep:window._rep.slice() }));
    chk('9 · «Sí, es esa» pasa lo de la cotización UNA vez', r.vt===true && r.rep.length===1 && r.rep[0].marca==='foto', r);
    await page.evaluate(() => { VENTA_TIENDA=false; resetForm(); }); }

  /* 10. 🔁 Programar la devolución de una ATC el día de su recojo, a un domingo */
  { await page.evaluate(() => { window._per=[];
      var d=document.createElement('div'); d.id='_pdev'; d.innerHTML='<input type="date" id="pdev-fecha" value="2026-11-22"><div class="seg" id="pdev-turno"><button type="button" data-val="AM" class="active">AM</button><button type="button" data-val="PM">PM</button></div>';
      document.body.appendChild(d); guardarProgramarDevAtc('a06'); });
    let p = await preg(page), n = await page.evaluate(() => window._per.length);
    chk('10 · devolución el día del recojo: «¿Ya lo recogieron?» en la ventana, sin guardar todavía', p && p.tit==='¿Ya lo recogieron?' && /HOY/.test(p.sub) && p.no==='No, todavía no' && p.si==='Sí, ya lo recogieron' && n===0, { p, n });
    await si(page);
    p = await preg(page); n = await page.evaluate(() => window._per.length);
    chk('10 · sigue con «¿Programar la devolución igual?» (domingo)', p && p.tit==='¿Programar la devolución igual?' && /DOMINGO/.test(p.lineas.join()) && p.si==='🔁 Programarla igual' && n===0, { p, n });
    await si(page);
    let r = await page.evaluate(() => ({ per:window._per.slice(), p:window._preg() }));
    chk('10 · con las dos en «sí» guarda UNA vez, al domingo y con forzar', r.per.length===1 && r.per[0].id==='a06' && r.per[0].fecha==='2026-11-22' && r.per[0].o && r.per[0].o.forzar===true && !r.p, r);
    /* «No» en la segunda: no guarda */
    await page.evaluate(() => { var q=findById('a06'); q.fecha='2026-11-16'; q.turno='AM'; q.productos[0].atc={ mot:'hundimiento', det:'Se hundió en el medio', fcom:'2026-05-01' }; window._per=[];
      if(!document.getElementById('pdev-fecha')){ var d=document.createElement('div'); d.id='_pdev'; d.innerHTML='<input type="date" id="pdev-fecha" value="2026-11-22"><div class="seg" id="pdev-turno"><button type="button" data-val="AM" class="active">AM</button></div>'; document.body.appendChild(d); }
      guardarProgramarDevAtc('a06'); });
    await si(page); await no(page);
    r = await page.evaluate(() => ({ per:window._per.slice(), p:window._preg() }));
    chk('10 · «No, dejarlo» en la segunda no guarda', r.per.length===0 && !r.p, r); }

  /* 11. Las simples: «No» no hace nada, «Sí» hace lo suyo UNA vez (con lo de afuera anotado en vez de ir a la planilla). */
  { await page.evaluate(() => { closeModal(); window._h=[];
      cambiarTurno=function(id, a){ window._h.push('turno|'+id+'|'+a); };
      guardarCargaChk=function(){ window._h.push('carga'); }; renderCarga=function(){};
      realDelete=function(id){ window._h.push('borrar|'+id); return Promise.resolve(); }; renderAtc=function(){}; atctPintar=function(){};
      setCargaChk=function(k, v){ window._h.push('salio|'+v); };
      STATE.push(window._mk('atc-tre-x1', { oc:'ATC 11-090', cliente:'TRELLO PRUEBA' })); });
    const casos=[
      ['AM⇄PM de la ficha chica', "admTurnoCambiar('p04')", '¿Pasarlo al turno de la tarde?', '🌆 Pasar a la tarde', 'turno|p04|PM'],
      ['destildar la carga', 'limpiarCargaChk()', '¿Destildar todo lo cargado de esta vista?', '🧹 Destildar todo', 'carga'],
      ['sacar una ATC traída de Trello', "atctSacar('atc-tre-x1')", '¿Sacar del panel la ATC 11-090 de TRELLO PRUEBA?', '🗑 Sí, sacarla', 'borrar|atc-tre-x1'],
      ['deshacer «salió»', "CARGA_CHK[cargaChkKey('2026-11-16', 'Carry', CARGA_SALIO)+'|09:00']=true; camionSalioMarcar('Carry', false)", '¿Deshacer «salió» del Carry?', '↩️ Sí, deshacer', 'salio|false']
    ];
    for(const c of casos){
      await page.evaluate((x) => { window._h=[]; (0, eval)(x); }, c[1]);
      let p = await preg(page);
      if(!p){ chk('11 · '+c[0]+': la ventana del panel', false, await page.evaluate(() => ({ h:window._h, ids:STATE.map(function(q){ return q.id; }), chk:Object.keys(CARGA_CHK).length }))); continue; }
      await no(page);
      let h = await page.evaluate(() => window._h.slice());
      chk('11 · '+c[0]+': la ventana del panel y «No» no hace nada', p && p.tit===c[2] && p.si===c[3] && /^No, dej/.test(p.no) && h.length===0, { p, h });
      await page.evaluate((x) => { window._h=[]; (0, eval)(x); }, c[1]);
      await si(page);
      h = await page.evaluate(() => window._h.slice());
      chk('11 · '+c[0]+': «Sí» lo hace UNA vez', h.length===1 && h[0]===c[4], h);
    } }

  chk('con la bandera: ninguna ventanita del navegador', page._dialogos.length===0, page._dialogos);
  await ctx.close();
  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
