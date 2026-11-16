/* ❓ LAS PREGUNTAS DEL LOTE D EN LA VENTANA DEL PANEL (16/11/2026; dueño, con la captura del «¿Prender el MODO PRÁCTICA…?»: «¿no que mis
   alertas no salían ya esas feas?»). Los `confirm(`/`prompt(` de pedidos.html desde la pestaña Chofer hasta el final (cobros de la puerta,
   ubicación, repetir pedido, recogidas de Moreno, existencias, borrar un pedido, reprogramar, ubicar, la fábrica, recargar, el bot, la caja,
   los cupos, la rueda del mall, Claude) y el «¿Borrar este mensaje?» de chat.js pasan a `preguntaYa` / `preguntaTextoYa`.

   ⚠️ LO QUE ESTE TEST CUIDA (con `PREG_PRUEBA`, salvo §0):
   0. Sin la bandera: lo del navegador con el MISMO texto de siempre (las pruebas viejas contestan diálogos).
   1. El cobro del chofer: el monto (campo) y «te estás pasando» van de a uno; «No, no lo anoto» no anota; «Sí» anota UNA vez.
   2. Sacarle el ✅ desde Chofer: «No» lo deja; «Sí» lo saca UNA vez; si mientras tanto ya no tenía ✅, contestar no lo marca al revés.
   3. Deshacer los cobros de la puerta (💰 de la tabla): «Sí» deshace UNA vez; si mientras tanto ya no estaba pagada, NO cobra.
   4. La recogida de Moreno: «¿son las del Excel?» tiene dos respuestas que hacen algo (cerrar sin sumar / sumar), y «sumar» pregunta
      «¿llegaron igual?» en la misma tanda.
   5. Repetir un pedido con una edición abierta: «Volver a esa edición» no abre nada nuevo; «Abrir el pedido nuevo» sí.
   6. «🗑 Eliminar» de la ficha de Administración (era un `confirm` pegado en el onclick): la ventana en rojo, arriba de la ficha.
   7. «➕ Abrir cupos» pide la contraseña con un campo: Esc no abre; la mala no abre; la buena abre la ventana de los cupos.
   8. «Hay una versión nueva → Recargar» con un pedido sin guardar: «Seguir corrigiendo» no recarga; «Recargar igual» recarga.
   9. Copiar sin portapapeles: el texto en un campo, un solo botón.
   10. La ubicación GPS (campo con lo de antes): Cancelar no guarda; «Guardar» guarda UNA vez lo pegado.
   11. chat.js: «¿Borrar este mensaje?» en la ventana del panel; «No» no borra; «Sí» borra UNA vez.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_preg_lD.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CHATJS = path.resolve(path.dirname(PEDIDOS), 'chat.js');
const HOY = '2026-11-16T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:[] }); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, ic:o.querySelector('.preg-i').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'',
      lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }),
      no:(o.querySelector('.preg-no')||{}).textContent||null, si:o.querySelector('.preg-si').textContent, peligro:!!o.querySelector('.preg-pel'),
      campo:(o.querySelector('.preg-in')||{}).value, n:document.querySelectorAll('.preg-ov').length }; };
  var prod=function(d){ return [{ desc:d||'COLCHON PRUEBA', medida:'140x190', codigo:'', cant:1, precio:1000 }]; };
  STATE=[
    { id:'p1', oc:'11-901', fecha:'2026-11-18', turno:'AM', cliente:'CLIENTE UNO', celular:'70000001', vendedor:'Mirian Salazar', zona:'Norte', direccion:'Calle 1',
      maps:'https://www.google.com/maps?q=-17.70,-63.10', productos:prod('COLCHON UNO'), pagado:false, saldo:1000, acuenta:0, metodoPago:'', ts:Date.now()-864e5, rev:1 },
    { id:'p2', oc:'11-902', fecha:'2026-11-16', turno:'AM', cliente:'CLIENTE DOS', celular:'70000002', vendedor:'Mirian Salazar', zona:'Sur', direccion:'Calle 2',
      maps:'', productos:prod('COLCHON DOS'), pagado:false, saldo:1000, acuenta:0, metodoPago:'', entregado:true, ts:Date.now()-864e5, rev:1 },
    { id:'p3', oc:'11-903', fecha:'2026-11-16', turno:'AM', cliente:'CLIENTE TRES', celular:'70000003', vendedor:'Mirian Salazar', zona:'Este', direccion:'Calle 3',
      maps:'', productos:prod('COLCHON TRES'), pagado:true, saldo:0, acuenta:0, metodoPago:'', ts:Date.now()-864e5, rev:1 },
    { id:'p5', oc:'11-905', fecha:'2026-11-19', turno:'PM', cliente:'CLIENTE CINCO', celular:'70000005', vendedor:'Mirian Salazar', zona:'Oeste', direccion:'Calle 5',
      maps:'', productos:prod('COLCHON CINCO'), pagado:false, saldo:1000, acuenta:0, metodoPago:'', ts:Date.now()-864e5, rev:1 }
  ];
  saveMirror=function(){};
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };   // un cambio de pestaña relee: que traiga lo mismo
  window._api={ cobros:[], persist:[], paid:[], borrar:[], ubic:[] };
  aplicarCobros=function(p, arr){ window._api.cobros.push({ id:p.id, arr:JSON.parse(JSON.stringify(arr||[])) }); return Promise.resolve({ ok:true }); };
  persistPedido=function(p){ window._api.persist.push({ id:p.id, entregado:!!p.entregado }); return Promise.resolve({ ok:true }); };
  applyPaid=function(p){ window._api.paid.push(p.id); return true; };
  borrarConDeshacer=function(id){ window._api.borrar.push(id); };
  renderChofer=function(){}; renderChoferSiActivo=function(){};
  // Los cobros de la venta 3: dos de la puerta (sin recibo ni foto) y uno registrado con recibo.
  var _cobrosDe=cobrosDe;
  cobrosDe=function(p){ return (p && p.id==='p3') ? [{ metodo:'Efectivo', monto:300, fecha:'2026-11-15' }, { metodo:'QR', banco:'BNB', monto:200, fecha:'2026-11-15' },
                                                     { metodo:'QR', banco:'BCP', monto:500, fecha:'2026-11-14', nota:'R-77' }] : _cobrosDe(p); };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag, init) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:800 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page.on('dialog', d=>{ page._dialogos.push(d.type()+'|'+d.message()); if(d.type()==='prompt') d.accept(d.defaultValue()||'1'); else d.accept(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  const P = (page) => page.evaluate(() => window._preg());
  const A = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window._api)));
  const espera = (page, ms) => page.waitForTimeout(ms||90);

  /* 0. Sin la bandera: lo del navegador, con el mismo texto de siempre. */
  { const { ctx, page } = await nueva(false);
    await page.evaluate(() => { choQuitarCobro('p3', 0); });
    await page.evaluate(() => { showPedidoModal('p5'); }); await espera(page, 200);
    await page.click('#modal-box .fl-borrar'); await espera(page);
    const a = await A(page);
    chk('0 · sin bandera: «Quitar el cobro» y «Eliminar» de la ficha son el confirm del navegador, con el texto de siempre',
      page._dialogos[0]==='confirm|¿Quitar el cobro de Efectivo Bs 300,00?' && page._dialogos[1]==='confirm|¿Eliminar este pedido?', page._dialogos);
    chk('0 · sin bandera: Aceptar hace lo de siempre (quita el cobro, borra el pedido)', a.cobros.length===1 && a.borrar.join()==='p5', a);
    chk('0 · sin bandera: ninguna ventana del panel', !(await P(page)));
    await ctx.close(); }

  const { ctx, page } = await nueva(true);

  /* 1. El cobro del chofer: el monto y «te estás pasando», de a uno. */
  { await page.evaluate(() => { choCobrarMetodo('p1', 'Efectivo'); }); await espera(page);
    let p = await P(page);
    chk('1 · el monto: la ventana con el campo (trae lo que falta) y sus botones', p && p.tit==='¿Cuánto cobraste en Efectivo?' && p.campo==='1000' && p.si==='💰 Anotar el cobro' && p.sub==='CLIENTE UNO' &&
      p.lineas.indexOf('Falta: Bs 1.000,00')>=0, p);
    await page.fill('.preg-in', '1500'); await page.click('.preg-si'); await espera(page);
    p = await P(page);
    chk('1 · de más: la segunda pregunta, en ámbar, con lo que pasa', p && p.tit==='Te estás pasando: ¿lo anoto igual?' && p.no==='No, no lo anoto' && p.si==='💰 Anotarlo igual' && p.n===1 &&
      p.lineas.some(function(x){ return /son Bs 500,00 de más/.test(x); }), p);
    chk('1 · todavía no anotó nada', (await A(page)).cobros.length===0);
    await page.click('.preg-no'); await espera(page);
    chk('1 · «No, no lo anoto» no anota nada', (await A(page)).cobros.length===0 && !(await P(page)));
    await page.evaluate(() => { choCobrarMetodo('p1', 'Efectivo'); }); await espera(page);
    await page.fill('.preg-in', '1500'); await page.click('.preg-si'); await espera(page);
    await page.click('.preg-si'); await espera(page);
    let a = await A(page);
    chk('1 · «Anotarlo igual» anota el cobro UNA vez, como antes Aceptar', a.cobros.length===1 && a.cobros[0].id==='p1' && a.cobros[0].arr.length===1 &&
      a.cobros[0].arr[0].metodo==='Efectivo' && a.cobros[0].arr[0].monto===1500 && a.cobros[0].arr[0].fecha==='2026-11-16' && !(await P(page)), a.cobros);
    await page.evaluate(() => { choCobrarMetodo('p1', 'QR'); }); await espera(page);
    await page.fill('.preg-in', '800'); await page.keyboard.press('Enter'); await espera(page);
    a = await A(page);
    chk('1 · un monto que no se pasa: una sola pregunta (Enter acepta) y anota UNA vez', a.cobros.length===2 && a.cobros[1].arr[0].monto===800 && !(await P(page)), a.cobros);
    await page.evaluate(() => { choCobrarMetodo('p1', 'QR'); }); await espera(page); await page.keyboard.press('Escape'); await espera(page);
    chk('1 · Esc en el monto: no anota nada', (await A(page)).cobros.length===2 && !(await P(page))); }

  /* 2. Sacarle el ✅ desde Chofer. */
  { await page.evaluate(() => { choEntregado('p2'); }); await espera(page);
    let p = await P(page);
    chk('2 · «¿como NO entregada?»: la ventana del panel con sus botones', p && p.tit==='¿Marcar la entrega de CLIENTE DOS como NO entregada?' && p.no==='No, ya la entregué' && p.si==='↩️ Sí, no se entregó', p);
    await page.click('.preg-no'); await espera(page);
    let r = await page.evaluate(() => ({ e:findById('p2').entregado, a:window._api.persist.length }));
    chk('2 · «No, ya la entregué» la deja con ✅ y no guarda nada', r.e===true && r.a===0, r);
    await page.evaluate(() => { choEntregado('p2'); }); await espera(page); await page.click('.preg-si'); await espera(page);
    r = await page.evaluate(() => ({ e:findById('p2').entregado, a:JSON.parse(JSON.stringify(window._api.persist)) }));
    chk('2 · «Sí, no se entregó» le saca el ✅ UNA vez', r.e===false && r.a.length===1 && r.a[0].entregado===false, r);
    await page.evaluate(() => { findById('p2').entregado=true; choEntregado('p2'); }); await espera(page);
    await page.evaluate(() => { findById('p2').entregado=false; });   // mientras tanto, otra persona se lo sacó
    await page.click('.preg-si'); await espera(page);
    r = await page.evaluate(() => ({ e:findById('p2').entregado, a:window._api.persist.length }));
    chk('2 · si mientras tanto ya no tenía ✅, contestar «Sí» NO lo marca al revés', r.e===false && r.a===1, r); }

  /* 3. Deshacer los cobros de la puerta (💰 de la tabla). */
  { await page.evaluate(() => { quickCobrado('p3'); }); await espera(page);
    let p = await P(page);
    chk('3 · «¿Deshacer los 2 cobros?»: en rojo, con cada cobro y lo que no se toca', p && p.tit==='¿Deshacer los 2 cobros de la puerta?' && p.peligro && p.si==='↩️ Sí, deshacerlos' && p.no==='No, dejarlos' &&
      p.lineas.length===4 && p.lineas[2]==='Total: Bs 500,00' && /NO se toca/.test(p.lineas[3]), p);
    await page.click('.preg-no'); await espera(page);
    chk('3 · «No, dejarlos» no deshace nada', (await A(page)).cobros.length===2);
    await page.evaluate(() => { quickCobrado('p3'); }); await espera(page); await page.click('.preg-si'); await espera(page);
    let a = await A(page);
    chk('3 · «Sí, deshacerlos» deja solo el pago con recibo, UNA vez', a.cobros.length===3 && a.cobros[2].id==='p3' && a.cobros[2].arr.length===1 && a.cobros[2].arr[0].nota==='R-77' && a.paid.length===0, a.cobros[2]);
    await page.evaluate(() => { quickCobrado('p3'); }); await espera(page);
    await page.evaluate(() => { var q=findById('p3'); q.pagado=false; q.saldo=500; });   // mientras tanto, se deshizo en otro lado
    await page.click('.preg-si'); await espera(page);
    a = await A(page);
    chk('3 · si mientras tanto ya no estaba pagada, «Sí» no cobra (el 💰 no se repite)', a.cobros.length===3 && a.paid.length===0, a); }

  /* 4. La recogida de Moreno: «¿son las del Excel?» con dos respuestas que hacen algo. */
  { const arma = () => page.evaluate(() => {
      guardarStock=function(){}; renderStock=function(){}; renderAdmin=function(){}; stockRecogidaOfrecerLineas=function(){ return false; };
      stockRecogidaDetecciones=function(){ return [{ id:'d1', u:2, f:'2026-11-16', hora:'09:00', hu:'h1' }]; };
      STOCK.g={}; STOCK.p=[{ id:'q1', k:'COLCHON PRUEBA|140x190', u:2, tipo:'recogida', de:'Moreno', f:'2026-11-14' }];
    });
    const recs = () => page.evaluate(() => { var q=STOCK.p.filter(function(x){ return x.id==='q1'; })[0]; return JSON.parse(JSON.stringify((q && q.recs)||[])); });
    await arma();
    await page.evaluate(() => { recibirStockPedido('q1'); }); await espera(page);
    let p = await P(page);
    chk('4 · «¿son las del Excel?»: la ventana con las dos respuestas dichas', p && p.tit==='¿Son las que ya mostró el Excel de PTF?' && p.si==='✅ Sí, ya están en ese Excel' && p.no==='➕ No, llegaron después: sumarlas', p);
    await page.click('.preg-si'); await espera(page);
    let r = await recs();
    chk('4 · «Sí, ya están»: se cierra con la detección, sin sumarlas (se:1), UNA vez', r.length===1 && r[0].se===1 && r[0].u===2 && !(await P(page)), r);
    await arma();
    await page.evaluate(() => { recibirStockPedido('q1'); }); await espera(page); await page.click('.preg-no'); await espera(page);
    p = await P(page);
    chk('4 · «No, llegaron después»: en la misma tanda pregunta «¿Llegaron igual?» (Moreno no las tiene)', p && p.tit==='¿Llegaron igual?' && p.si==='📥 Sí, llegaron' && (await recs()).length===0, p);
    await page.click('.preg-no'); await espera(page);
    chk('4 · «No, no llegaron»: no anota nada', (await recs()).length===0 && !(await P(page)));
    await arma();
    await page.evaluate(() => { recibirStockPedido('q1'); }); await espera(page); await page.click('.preg-no'); await espera(page); await page.click('.preg-si'); await espera(page);
    r = await recs();
    chk('4 · «Sumarlas» + «Sí, llegaron»: UNA recepción que suma acá y no descuenta de Moreno (nr)', r.length===1 && !r[0].se && r[0].nr===1 && r[0].u===2 && !(await P(page)), r); }

  /* 5. Repetir un pedido con una edición abierta. */
  { await page.evaluate(() => { EDIT_ID='p1'; REPETIR_DE=''; });
    await page.evaluate(() => { repetirPedido('p5'); }); await espera(page);
    let p = await P(page);
    chk('5 · «Estabas editando…»: la ventana con «Volver» (seguro) y «Abrir el pedido nuevo»', p && p.tit==='Estabas editando el pedido de CLIENTE UNO (OC 11-901) y NO lo guardaste' && p.no==='✏️ Volver a esa edición' && p.si==='🔁 Abrir el pedido nuevo', p);
    await page.click('.preg-no'); await espera(page);
    let r = await page.evaluate(() => ({ ed:EDIT_ID, rep:REPETIR_DE, form:document.getElementById('view-form').classList.contains('active') }));
    chk('5 · «Volver a esa edición»: sigue la edición, no abre nada nuevo', r.ed==='p1' && r.rep==='' && r.form, r);
    await page.evaluate(() => { repetirPedido('p5'); }); await espera(page); await page.click('.preg-si'); await espera(page, 200);
    r = await page.evaluate(() => ({ ed:EDIT_ID, rep:REPETIR_DE, cli:document.getElementById('f-cliente').value }));
    chk('5 · «Abrir el pedido nuevo»: el pedido NUEVO con los datos del repetido', !r.ed && r.rep==='p5' && r.cli==='CLIENTE CINCO', r);
    await page.evaluate(() => { try{ resetForm(); }catch(e){} showView('admin'); }); await espera(page, 150); }

  /* 6. «🗑 Eliminar» de la ficha de Administración. */
  { await page.evaluate(() => { showPedidoModal('p5'); }); await espera(page, 200);
    await page.click('#modal-box .fl-borrar'); await espera(page);
    let p = await P(page);
    chk('6 · «Eliminar»: la ventana en rojo con el pedido y sus botones', p && p.peligro && p.tit==='¿Borrar el pedido OC 11-905?' && p.no==='No, dejarlo' && p.si==='🗑 Sí, borrar el pedido' && /CLIENTE CINCO/.test(p.sub), p);
    await page.click('.preg-no'); await espera(page);
    let r = await page.evaluate(() => ({ b:window._api.borrar.slice(), on:document.getElementById('modal').classList.contains('on') }));
    chk('6 · «No, dejarlo»: no borra y la ficha sigue abierta', r.b.length===0 && r.on, r);
    await page.click('#modal-box .fl-borrar'); await espera(page); await page.click('.preg-si'); await espera(page);
    r = await page.evaluate(() => ({ b:window._api.borrar.slice(), on:document.getElementById('modal').classList.contains('on') }));
    chk('6 · «Sí, borrar el pedido»: borra UNA vez (con su «Deshacer») y cierra la ficha', r.b.join()==='p5' && !r.on, r); }

  /* 7. «➕ Abrir cupos» pide la contraseña. */
  { await page.evaluate(() => { UNLOCKED=false; CUPX_CLAVE_OK=false; CUPX_VENTANA=null; localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); });
    await page.evaluate(() => { cupxAbrir('2026-11-18', 'AM'); }); await espera(page);
    let p = await P(page);
    chk('7 · la contraseña: la ventana con el campo vacío y «Seguir»', p && p.tit==='Abrir cupos pide la contraseña de Administración' && p.campo==='' && p.si==='🔓 Seguir', p);
    await page.keyboard.press('Escape'); await espera(page);
    let r = await page.evaluate(() => ({ v:CUPX_VENTANA, ok:CUPX_CLAVE_OK }));
    chk('7 · Esc: no abre nada', !r.v && !r.ok && !(await P(page)), r);
    await page.evaluate(() => { cupxAbrir('2026-11-18', 'AM'); }); await espera(page); await page.fill('.preg-in', 'mala'); await page.click('.preg-si'); await espera(page);
    r = await page.evaluate(() => ({ v:CUPX_VENTANA, ok:CUPX_CLAVE_OK }));
    chk('7 · la contraseña mala: no abre', !r.v && !r.ok && !(await P(page)), r);
    await page.evaluate(() => { cupxAbrir('2026-11-18', 'AM'); }); await espera(page); await page.fill('.preg-in', 'clave-de-prueba'); await page.keyboard.press('Enter'); await espera(page);
    r = await page.evaluate(() => ({ f:CUPX_VENTANA && CUPX_VENTANA.f, t:CUPX_VENTANA && CUPX_VENTANA.t, ok:CUPX_CLAVE_OK, h:(document.querySelector('#modal.on .modal-h h3')||{}).textContent||'' }));
    chk('7 · la buena: abre la ventana de los cupos de ese día y turno', r.ok && r.f==='2026-11-18' && r.t==='AM' && /Abrir cupos/.test(r.h), r);
    await page.evaluate(() => { try{ closeModal(); }catch(e){} }); }

  /* 9. Copiar sin portapapeles: el texto en un campo, un solo botón. */
  { await page.evaluate(() => { var ex=document.execCommand; document.execCommand=function(){ throw new Error('sin copiar'); }; fallbackCopy('PEDIDO DE PRUEBA · 2 colchones'); document.execCommand=ex; }); await espera(page);
    let p = await P(page);
    chk('9 · copiar a mano: el texto en el campo y un solo botón «Listo»', p && p.tit==='Copiá el pedido' && p.campo==='PEDIDO DE PRUEBA · 2 colchones' && p.no===null && p.si==='Listo', p);
    await page.click('.preg-si'); await espera(page); }

  /* 10. La ubicación GPS. */
  { await page.evaluate(() => { guardarUbicacion=function(p, norm){ window._api.ubic.push({ id:p.id, m:norm }); }; editarUbicacion('p1'); }); await espera(page);
    let p = await P(page);
    chk('10 · la ubicación: el campo con la de antes y «Guardar la ubicación»', p && p.tit==='Ubicación de CLIENTE UNO' && p.campo==='https://www.google.com/maps?q=-17.70,-63.10' && p.si==='📍 Guardar la ubicación', p);
    await page.click('.preg-no'); await espera(page);
    chk('10 · Cancelar: no guarda', (await A(page)).ubic.length===0 && !(await P(page)));
    await page.evaluate(() => { editarUbicacion('p1'); }); await espera(page); await page.fill('.preg-in', '-17.749444, -63.104556'); await page.click('.preg-si'); await espera(page);
    const a = await A(page);
    chk('10 · «Guardar la ubicación»: guarda UNA vez lo pegado', a.ubic.length===1 && a.ubic[0].id==='p1' && /-17\.749444/.test(a.ubic[0].m) && /-63\.104556/.test(a.ubic[0].m), a.ubic); }

  /* 11. chat.js: «¿Borrar este mensaje?» (el archivo, con `borrar` a la vista solo para la prueba). */
  { const src = fs.readFileSync(CHATJS, 'utf8').replace('/* ---------- arranque ---------- */', 'window.__chatBorrar=borrar; window.__chatC=C;\n/* ---------- arranque ---------- */');
    await page.addScriptTag({ content: src });
    await page.evaluate(() => {
      getVendedorMem=function(){ return 'Mirian Salazar'; };
      window._chat=[]; apiPost=function(o){ window._chat.push(o); return Promise.resolve({ ok:true, bt:Date.now() }); };
      __chatC.msgs['m1']={ i:'m1', c:'eq', t:Date.now()-60000, x:'me equivoqué de grupo', d:chatClave('Mirian Salazar') };
      __chatBorrar('m1');
    }); await espera(page);
    let p = await P(page);
    chk('11 · chat: «¿Borrar este mensaje?» en la ventana del panel, en rojo', p && p.tit==='¿Borrar este mensaje?' && p.peligro && p.no==='No, dejarlo' && p.si==='🗑 Sí, borrarlo', p);
    await page.click('.preg-no'); await espera(page);
    chk('11 · chat: «No, dejarlo» no borra', (await page.evaluate(() => window._chat.length))===0 && !(await P(page)));
    await page.evaluate(() => { __chatBorrar('m1'); }); await espera(page); await page.click('.preg-si'); await espera(page, 150);
    const r = await page.evaluate(() => ({ api:JSON.parse(JSON.stringify(window._chat)), bt:__chatC.msgs['m1'].bt }));
    chk('11 · chat: «Sí, borrarlo» lo borra UNA vez', r.api.length===1 && r.api[0].action==='chatBorrar' && r.api[0].id==='m1' && r.bt>0, r);
    const v = fs.readFileSync(PEDIDOS, 'utf8').match(/<script src="chat\.js\?v=([^"]+)"/);
    chk('11 · pedidos.html carga chat.js con el ?v= nuevo', v && v[1]==='20261116b', v && v[1]); }

  chk('1-11 · ninguna ventanita del navegador con la bandera', page._dialogos.length===0, page._dialogos);
  await ctx.close();

  /* 8. «Recargar» con un pedido sin guardar (al final: navega). */
  { const { ctx, page } = await nueva(true);
    await page.evaluate(() => { EDIT_ID='p1'; VER.nueva='2026-11-17-a'; verRecargar(); }); await espera(page);
    let p = await P(page);
    chk('8 · «Estás corrigiendo…»: la ventana con «Seguir corrigiendo» (seguro) y «Recargar igual»', p && p.tit==='Estás corrigiendo un pedido y todavía no lo guardaste' && p.no==='✏️ Seguir corrigiendo' && p.si==='🔄 Recargar igual', p);
    await page.click('.preg-no'); await espera(page, 200);
    chk('8 · «Seguir corrigiendo»: no recarga', !/nv=/.test(page.url()) && (await page.evaluate(() => EDIT_ID))==='p1', page.url());
    const fueA=[]; page.on('framenavigated', f => { if(f===page.mainFrame()) fueA.push(f.url()); });
    await page.evaluate(() => { window.__antes=1; verRecargar(); }); await espera(page);
    await Promise.all([ page.waitForNavigation({ waitUntil:'load' }).catch(()=>{}), page.click('.preg-si') ]); await espera(page, 200);
    const tras = await page.evaluate(() => ({ antes:typeof window.__antes, ed:EDIT_ID }));
    chk('8 · «Recargar igual»: recarga (UNA vez) con la versión nueva', fueA.filter(u => /nv=2026-11-17-a/.test(u)).length===1 && tras.antes==='undefined' && !tras.ed, { fueA, tras });
    chk('8 · sin ventanitas del navegador', page._dialogos.length===0, page._dialogos);
    await ctx.close(); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
