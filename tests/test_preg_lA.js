/* ❓ LOTE A DE «TODAS LAS PREGUNTAS EN LA VENTANA DEL PANEL» (16/11/2026; dueño, con la captura del «¿Prender el MODO PRÁCTICA…?»:
   «¿no que mis alertas no salían ya esas feas?»). Las preguntas de Contabilidad (pagos, recargos, montos, eliminar una venta), los
   retiros de efectivo, el cierre comercial, las claves del servidor y salir del formulario con imágenes sin guardar.

   ⚠️ LO QUE ESTE TEST CUIDA (con `PREG_PRUEBA`, salvo la sección 0):
   0. Sin la bandera (Playwright): la ventanita del navegador de SIEMPRE, con el MISMO texto, y lo de después corre en el acto.
   1. «Registrar pago» que pregunta DOS cosas (pago igual + mayor que el saldo): la primera vez no anota nada; «No» en la segunda no
      anota; «Sí» y «Sí» anota UNA vez (un guardado, un aviso).
   2. «Corregir precios y montos» bajando el adelanto: mientras espera NO toca nada (ni guarda ni vuelve «A cuenta» atrás); «Volver»
      hace lo del «no» de siempre («A cuenta» vuelve a lo guardado); «Guardar y borrar el pago» borra el adelanto UNA vez.
   3. El mes del cierre comercial (un `onchange`): mientras espera, el selector vuelve al mes de antes; «Sí» lo pone en el elegido.
   4. La clave de administración (`prompt`): mientras espera, «forzar» corta SIN el aviso rojo; con la clave, lo que la pidió sigue
      UNA vez; cancelar dice el aviso rojo de siempre.
   5. «💵 Anotar el monto» (`prompt`): el campo para escribir, Cancelar no anota, lo escrito se anota.
   6. Un retiro repetido: «No, es el mismo» no lo carga; «Es otro» lo carga UNA vez. Borrar un retiro: «No» lo deja, «Sí» lo borra.
   7. Eliminar una venta con plata (dos preguntas): «Sí» + «No» no borra; «Sí» + «Sí» borra UNA vez.
   8. Salir del formulario con una imagen sin guardar: «Quedarme» no sale ni la borra; «Salir» sale y la borra UNA vez.
   9. Cobranza de mayoristas, «Pagó las tildadas»: «No» no anota; «Sí» anota UNA vez.
   10. «⚠️ ¿El chofer recibió esta plata?»: botones que dicen lo que hacen, sin «tocá Aceptar».
   En todo: ninguna ventanita del navegador con la bandera.
   Datos SINTÉTICOS. Reloj clavado: lunes 16/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_preg_lA.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-16T10:00:00-04:00';

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  try{ localStorage.removeItem(LS_PEND); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  buildXlsx=function(){ return new Uint8Array([1]); }; downloadBlob=function(){};
  window.SRV=[]; window._guardados=0; window._fotosFuera=[];
  apiPost=function(b){
    if(b.action==='save'){
      window._guardados++;
      var c=JSON.parse(JSON.stringify(b.pedido)); c.rev=(Number(c.rev)||0)+1;
      window.SRV=window.SRV.filter(function(x){ return x.id!==c.id; }).concat([c]);
      return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(c))});
    }
    if(b.action==='delete'){ window.SRV=window.SRV.filter(function(x){ return x.id!==b.id; }); return Promise.resolve({ok:true}); }
    if(b.action==='list') return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))});
    return Promise.resolve({ok:true});
  };
  apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(window.SRV))}); },0); }); };
  apiBorrarFoto=function(f){ window._fotosFuera.push(f); return Promise.resolve({ok:true}); };
  fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AAAA'); };
  window.__FOTO='F0'; subirFoto=function(){ return Promise.resolve({ok:true, fotoId:window.__FOTO}); };
  window._toasts=[]; var _t=toast; toast=function(m, k){ window._toasts.push(String(m)); try{ return _t.apply(this, arguments); }catch(e){} };
  window._borrados=[]; borrarConDeshacer=function(id){ window._borrados.push(id); };
  window.hoy=todayStr();
  window.tsDe=function(f){ return new Date(f+'T12:00:00').getTime(); };
  window.P=function(o){
    var b={ turno:'AM', celular:'70000001', nit:'1', zona:'Norte', direccion:'Calle Inventada 1', fecha:window.hoy, maps:'', observaciones:'',
            estado:'', entregado:false, chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.tsDe(window.hoy),
            acuenta:0, saldo:0, pagado:true, metodoPago:'', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
    var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
  };
  window.R=function(o){ return filaDeRetiro({ id:o.id, fecha:o.fecha||window.hoy, entrega:o.entrega||'Carola Chavez', retira:o.retira||'Eduardo Añez',
                                              monto:o.monto, notas:o.notas||['10'], tipo:o.tipo||'Facturado', fotos:[], obs:'' }); };
  window.cargar=async function(filas){
    try{ closeModal(); }catch(e){}
    window.SRV=JSON.parse(JSON.stringify(filas)); setPending([]);
    STATE=[]; RETIROS=[];
    SAVE_ULTIMO={}; SAVE_REV={}; SAVE_EN_VUELO={}; SAVE_EN_ESPERA={};
    await refrescarEstado();
  };
  window.aVentas=async function(filas){
    await cargar(filas);
    showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas');
    await new Promise(function(r){ setTimeout(r,120); });
    CTA_ULTIMA='';
  };
  window.aCuadre=async function(filas){
    await cargar(filas);
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre');
    await new Promise(function(r){ setTimeout(r,120); });
  };
  window.boton=function(fn){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){ return new RegExp(fn).test(b.getAttribute('onclick')||''); })[0]||null; };
  window.tipear=function(o){ for(var id in o){ var e=document.getElementById(id); if(e) e.value=o[id]; } };
  window.subir=function(id, fid){ window.__FOTO=fid; ctaAdjuntar(id);
    return onCompElegido({ target:{ files:[new Blob(['x'],{type:'image/jpeg'})], dataset:{pedido:id} } }) || new Promise(function(r){ setTimeout(r,30); }); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, ic:o.querySelector('.preg-i').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'',
      lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }), peligro:o.querySelector('.preg-c').classList.contains('preg-pel'),
      no:(o.querySelector('.preg-no')||{}).textContent||null, si:o.querySelector('.preg-si').textContent,
      campo:(o.querySelector('.preg-in')||{}).value, n:document.querySelectorAll('.preg-ov').length }; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz', locale:'es-BO' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page._prompt='1500';
    page.on('dialog', d=>{ page._dialogos.push(d.type()+'|'+d.message()); if(d.type()==='prompt') d.accept(page._prompt); else d.accept(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  const si = async (page) => { await page.click('.preg-si'); await page.waitForTimeout(120); };
  const no = async (page) => { await page.click('.preg-no'); await page.waitForTimeout(120); };

  /* ═══ 0. Sin la bandera: las del navegador, con el mismo texto y sincrónicas ═══ */
  { const { ctx, page } = await nueva(false);
    const r = await page.evaluate(async () => {
      await aVentas([ P({ id:'S1', nota:'901', oc:'11-901', cliente:'PAGADA SIN MONTO', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMGV' }),
                      P({ id:'V2', nota:'902', oc:'11-902', cliente:'CON PLATA', acuenta:0, saldo:0, pagado:true, metodoPago:'QR BISA 1200 @'+hoy+' #902 %Q1' }) ]);
      ctaAnotarMonto('S1', 0); var cob=(cobrosDe(findById('S1'))[0]||{}).monto;      // sincrónico: ya está anotado
      ctaEliminarVenta('V2'); var bor=window._borrados.slice();
      return { cob, bor, ov:!!document.querySelector('.preg-ov') };
    });
    chk('0 · sin bandera: el prompt del navegador anota en el acto', r.cob===1500, r);
    chk('0 · sin bandera: las dos confirmaciones del navegador y la venta se borra en el acto', r.bor.join()==='V2', r.bor);
    chk('0 · sin bandera: el MISMO texto de siempre', page._dialogos.length===3 && /^prompt\|💵 ¿Cuánto se cobró\?\n\nPAGADA SIN MONTO/.test(page._dialogos[0]) &&
      /^confirm\|🗑 ELIMINAR ESTA VENTA\n\nCON PLATA/.test(page._dialogos[1]) && /^confirm\|Última confirmación\.\n\nSe van a borrar/.test(page._dialogos[2]), page._dialogos);
    chk('0 · sin bandera: ninguna ventana del panel', !r.ov);
    await ctx.close(); }

  const { ctx, page } = await nueva(true);

  /* ═══ 1. «Registrar pago»: pago igual + mayor que el saldo ═══ */
  const registrar = (nota, foto, monto) => page.evaluate(async (a) => {
    showContaModal('V1'); await subir('V1', a.foto);
    tipear({'cta-pago-monto':a.monto, 'cta-pago-nota':a.nota});
    window._guardados=0; window._toasts=[];
    boton('ctaRegistrarPago').click();
    await new Promise(function(r){ setTimeout(r,120); });
    var p=findById('V1'); return { n:cobrosDe(p).length, saldo:Number(p.saldo)||0, p:window._preg() };
  }, {nota, foto, monto});
  const estado1 = () => page.evaluate(() => { var p=findById('V1'); return { n:cobrosDe(p).length, saldo:Number(p.saldo)||0, g:window._guardados,
    ok:window._toasts.filter(function(t){ return /^Pago registrado/.test(t); }).length, p:window._preg() }; });
  await page.evaluate(async () => { await aVentas([ P({ id:'V1', nota:'80', oc:'11-080', cliente:'PAGO DOBLE', pagado:false, saldo:1000 }) ]); });
  let r = await registrar('81', 'R1', '700');
  chk('1 · el primer pago entra sin preguntar', r.n===1 && r.saldo===300 && !r.p, r);
  r = await registrar('81', 'R2', '700');
  chk('1 · el mismo pago otra vez: la ventana del panel «Ya hay un pago igual» y no anota nada', r.n===1 && r.saldo===300 && r.p && r.p.tit==='Ya hay un pago igual registrado' &&
    r.p.no==='No, es el mismo' && r.p.si==='Es otro pago: anotarlo' && /recibo 81/.test(r.p.sub), r);
  await si(page);
  r = await estado1();
  chk('1 · «Es otro pago» vuelve a correr y pregunta lo del saldo (todavía no anota)', r.n===1 && r.g===0 && r.p && r.p.tit==='El pago es mayor que el saldo' &&
    r.p.no==='✏️ Volver y corregir' && r.p.si==='💾 Registrarlo igual' && r.p.n===1, r);
  await no(page);
  r = await estado1();
  chk('1 · «Volver y corregir» no anota nada', r.n===1 && r.saldo===300 && r.g===0 && r.ok===0 && !r.p, r);
  r = await registrar('81', 'R3', '700');
  await si(page); await si(page);
  r = await estado1();
  chk('1 · «Sí» y «Sí»: anotado UNA vez (un guardado, un aviso)', r.n===2 && r.saldo===-400 && r.g===1 && r.ok===1 && !r.p, r);

  /* ═══ 2. Corregir precios y montos: bajar el adelanto ═══ */
  await page.evaluate(async () => { await aVentas([ P({ id:'X1', nota:'77', oc:'11-077', cliente:'ADELANTO', pagado:false, acuenta:500, saldo:2500,
    metodoPago:'~Efectivo 500 @'+hoy+' #77', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:3000}] }) ]); });
  r = await page.evaluate(async () => {
    showContaModal('X1'); document.getElementById('cta-acuenta').value='0'; ctaRecalc(); window._guardados=0;
    ctaGuardarMontos('X1'); await new Promise(function(r){ setTimeout(r,60); });
    var a=anticipoDe(findById('X1')); return { ant:a?Number(a.monto):0, acu:document.getElementById('cta-acuenta').value, g:window._guardados, p:window._preg() };
  });
  chk('2 · la ventana del panel (rojo) y mientras espera no toca nada: ni guarda ni vuelve «A cuenta» atrás', r.p && r.p.tit==='¿Borrar el pago ya registrado?' && r.p.peligro &&
    r.p.no==='✏️ Volver: dejar «A cuenta» como estaba' && r.p.si==='🗑 Guardar y borrar el pago' && r.ant===500 && r.acu==='0' && r.g===0, r);
  await no(page);
  r = await page.evaluate(() => { var a=anticipoDe(findById('X1')); return { ant:a?Number(a.monto):0, acu:document.getElementById('cta-acuenta').value, g:window._guardados, p:window._preg(),
    t:window._toasts.filter(function(t){ return /volvió a lo guardado/.test(t); }).length }; });
  chk('2 · «Volver» hace el «no» de siempre: «A cuenta» vuelve a 500 y no guarda', r.ant===500 && Number(r.acu)===500 && r.g===0 && r.t===1 && !r.p, r);
  r = await page.evaluate(async () => { document.getElementById('cta-acuenta').value='0'; ctaRecalc(); ctaGuardarMontos('X1'); await new Promise(function(r){ setTimeout(r,60); }); return window._preg(); });
  await si(page);
  r = await page.evaluate(() => { var p=findById('X1'), a=anticipoDe(p); return { ant:a?Number(a.monto):0, saldo:Number(p.saldo)||0, g:window._guardados, p:window._preg() }; });
  chk('2 · «Guardar y borrar el pago»: el adelanto se va UNA vez', r.ant===0 && r.saldo===2500 && r.g===1 && !r.p, r);

  /* ═══ 3. El mes del cierre comercial (onchange) ═══ */
  r = await page.evaluate(async () => {
    try{ closeModal(); }catch(e){}
    CCM.ym='2026-11'; CCM.ed={ ym:'2026-11' };
    var m=document.getElementById('ccm-mes'); m.value='2026-10'; ccmElegirMes('2026-10');
    await new Promise(function(r){ setTimeout(r,60); });
    return { ym:CCM.ym, sel:m.value, ed:!!CCM.ed, p:window._preg() };
  });
  chk('3 · cambiar de mes sin guardar: la ventana del panel, y el selector vuelve al mes de antes mientras espera', r.ym==='2026-11' && r.sel==='2026-11' && r.ed &&
    r.p && r.p.tit==='¿Cambiar de mes sin guardar?' && r.p.no==='✏️ Quedarme y guardar' && r.p.si==='Cambiar de mes igual', r);
  await no(page);
  r = await page.evaluate(() => ({ ym:CCM.ym, sel:document.getElementById('ccm-mes').value, ed:!!CCM.ed, p:window._preg() }));
  chk('3 · «Quedarme» deja el mes y lo escrito', r.ym==='2026-11' && r.sel==='2026-11' && r.ed && !r.p, r);
  await page.evaluate(() => { var m=document.getElementById('ccm-mes'); m.value='2026-10'; ccmElegirMes('2026-10'); });
  await page.waitForTimeout(60); await si(page);
  r = await page.evaluate(() => ({ ym:CCM.ym, sel:document.getElementById('ccm-mes').value, ed:CCM.ed }));
  chk('3 · «Cambiar de mes igual»: el selector y el cierre en el mes elegido', r.ym==='2026-10' && r.sel==='2026-10' && r.ed===null, r);

  /* ═══ 4. La clave de administración del servidor ═══ */
  r = await page.evaluate(async () => {
    SERVER_AUTH='clave'; ADMIN_KEY_LOCAL=''; try{ localStorage.removeItem(LS_ADMIN_KEY); }catch(e){}
    window._forz=[]; window._toasts=[];
    window._forzar=function(){ if(!asegurarClaveAdmin(window._forzar)) return 'corta'; window._forz.push('forzado con '+ADMIN_KEY_LOCAL); return 'sigue'; };
    var x=window._forzar(); await new Promise(function(r){ setTimeout(r,60); });
    return { x, forz:window._forz.slice(), rojo:window._toasts.filter(function(t){ return /hace falta la .*clave/.test(t); }).length, p:window._preg(), foco:document.activeElement && document.activeElement.className };
  });
  chk('4 · pide la clave en la ventana del panel (con su campo y el foco ahí)', r.p && r.p.tit==='🛡️ Clave para forzar días y turnos' && r.p.campo==='' && r.p.si==='💾 Guardar la clave' && /preg-in/.test(r.foco), r);
  chk('4 · mientras espera, lo que la pidió corta SIN el aviso rojo', r.x==='corta' && !r.forz.length && r.rojo===0, r);
  await page.fill('.preg-in', 'CLAVE-INVENTADA'); await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  r = await page.evaluate(() => ({ k:ADMIN_KEY_LOCAL, forz:window._forz.slice(), g:window._toasts.filter(function(t){ return /Clave para forzar guardada/.test(t); }).length, p:window._preg() }));
  chk('4 · con la clave escrita: se guarda y lo que la pidió sigue UNA vez', r.k==='CLAVE-INVENTADA' && r.forz.join()==='forzado con CLAVE-INVENTADA' && r.g===1 && !r.p, r);
  r = await page.evaluate(async () => { ADMIN_KEY_LOCAL=''; window._toasts=[]; var x=asegurarClaveAdmin(); await new Promise(function(r){ setTimeout(r,60); }); return x; });
  await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  r = await page.evaluate(() => ({ k:ADMIN_KEY_LOCAL, rojo:window._toasts.filter(function(t){ return /hace falta la .*clave/.test(t); }).length, p:window._preg() }));
  chk('4 · cancelar: sin clave y con el aviso rojo de siempre (una vez)', r.k==='' && r.rojo===1 && !r.p, r);
  await page.evaluate(() => { SERVER_AUTH=''; });

  /* ═══ 5. «💵 Anotar el monto» ═══ */
  await page.evaluate(async () => { await aVentas([ P({ id:'S1', nota:'901', oc:'11-901', cliente:'PAGADA SIN MONTO', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMGV' }) ]); });
  r = await page.evaluate(async () => { window._guardados=0; ctaAnotarMonto('S1', 0); await new Promise(function(r){ setTimeout(r,60); }); return window._preg(); });
  chk('5 · el prompt en la ventana del panel, con el cliente y su campo vacío', r && r.tit==='¿Cuánto se cobró?' && /PAGADA SIN MONTO/.test(r.sub) && r.campo==='' && r.si==='💵 Anotar el monto' && r.no==='Cancelar', r);
  await no(page);
  r = await page.evaluate(() => ({ m:(cobrosDe(findById('S1'))[0]||{}).monto, sm:!!(cobrosDe(findById('S1'))[0]||{}).sinMonto, g:window._guardados, p:window._preg() }));
  chk('5 · Cancelar no anota nada', r.sm && r.g===0 && !r.p, r);
  await page.evaluate(() => ctaAnotarMonto('S1', 0)); await page.waitForTimeout(60);
  await page.fill('.preg-in', '1.750'); await page.click('.preg-si'); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ m:(cobrosDe(findById('S1'))[0]||{}).monto, g:window._guardados, p:window._preg() }));
  chk('5 · lo escrito se anota UNA vez («1.750» = 1750)', r.m===1750 && r.g===1 && !r.p, r);

  /* ═══ 6. Retiros: el repetido y borrar ═══ */
  await page.evaluate(async () => {
    await aCuadre([ P({ id:'e1', nota:'10', oc:'11-010', cliente:'EFECTIVO', metodoPago:textoCobros([{metodo:'Efectivo',monto:1000,fecha:hoy,nota:'10',comps:['E1']}]) }),
                    R({ id:'__ret_bueno__', monto:400, notas:['10'] }) ]);
    abrirRetiros();
    document.getElementById('ret-entrega').value='Carola Chavez'; retEntregaCambio();
    document.getElementById('ret-monto').value='400';
    document.getElementById('ret-nota-nueva').value='10'; retAgregarNota();
    window._guardados=0; guardarRetiroForm();
  });
  await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n:RETIROS.length, g:window._guardados, p:window._preg() }));
  chk('6 · retiro repetido: la ventana del panel y todavía no carga nada', r.n===1 && r.g===0 && r.p && r.p.tit==='Ya hay un retiro igual cargado' && r.p.no==='No, es el mismo' && r.p.si==='Es otro: cargarlo igual', r);
  await no(page);
  r = await page.evaluate(() => ({ n:RETIROS.length, g:window._guardados, p:window._preg() }));
  chk('6 · «No, es el mismo» no lo carga', r.n===1 && r.g===0 && !r.p, r);
  await page.evaluate(() => guardarRetiroForm()); await page.waitForTimeout(80); await si(page);
  r = await page.evaluate(() => ({ n:RETIROS.length, g:window._guardados, p:window._preg() }));
  chk('6 · «Es otro: cargarlo igual» lo carga UNA vez', r.n===2 && r.g===1 && !r.p, r);
  r = await page.evaluate(async () => { var otro=RETIROS.filter(function(x){ return x.id!=='__ret_bueno__'; })[0]; window._otro=otro.id; borrarRetiro(otro.id); await new Promise(function(r){ setTimeout(r,60); }); return { n:RETIROS.length, p:window._preg() }; });
  chk('6 · borrar un retiro: la ventana del panel en rojo y no borra mientras espera', r.n===2 && r.p && /^¿Borrar el retiro de /.test(r.p.tit) && r.p.peligro && r.p.si==='🗑 Sí, borrar el retiro', r);
  await no(page);
  r = await page.evaluate(() => ({ n:RETIROS.length, p:window._preg() }));
  chk('6 · «No, dejarlo» lo deja', r.n===2 && !r.p, r);
  await page.evaluate(() => borrarRetiro(window._otro)); await page.waitForTimeout(60); await si(page); await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ n:RETIROS.length, srv:window.SRV.filter(esFilaRetiro).length }));
  chk('6 · «Sí, borrar el retiro» lo borra (pantalla y planilla)', r.n===1 && r.srv===1, r);
  await page.evaluate(() => { try{ closeRetiros(); }catch(e){} });

  /* ═══ 7. Eliminar una venta con plata (dos preguntas) ═══ */
  await page.evaluate(async () => { await aVentas([ P({ id:'V2', nota:'902', oc:'11-902', cliente:'CON PLATA', acuenta:0, saldo:0, pagado:true, metodoPago:'QR BISA 1200 @'+hoy+' #902 %Q1' }) ]); });
  r = await page.evaluate(async () => { window._borrados=[]; showContaModal('V2'); ctaEliminarVenta('V2'); await new Promise(function(r){ setTimeout(r,60); }); return window._preg(); });
  chk('7 · eliminar: la primera, en rojo, con el cliente arriba y lo que se lleva', r && r.tit==='¿Eliminar esta venta?' && r.peligro && /CON PLATA/.test(r.sub) &&
    r.lineas.some(function(x){ return /1\.200/.test(x) && /pagos anotados/.test(x); }) && !r.lineas.some(function(x){ return /¿Eliminarla\?/.test(x); }) && r.si==='🗑 Sí, eliminar la venta', r);
  await si(page);
  r = await page.evaluate(() => ({ b:window._borrados.slice(), p:window._preg() }));
  chk('7 · «Sí» → la última confirmación (todavía no borra)', !r.b.length && r.p && r.p.tit==='Última confirmación: ¿seguro?' && r.p.n===1, r);
  await no(page);
  r = await page.evaluate(() => ({ b:window._borrados.slice(), p:window._preg(), modal:document.getElementById('modal').classList.contains('show') }));
  chk('7 · «No» en la última: no borra', !r.b.length && !r.p, r);
  await page.evaluate(() => ctaEliminarVenta('V2')); await page.waitForTimeout(60); await si(page); await si(page);
  r = await page.evaluate(() => ({ b:window._borrados.slice(), p:window._preg() }));
  chk('7 · «Sí» y «Sí»: la borra UNA vez', r.b.join()==='V2' && !r.p, r);

  /* ═══ 8. Salir del formulario con una imagen sin guardar ═══ */
  r = await page.evaluate(async () => {
    try{ closeModal(); }catch(e){}
    showView('form'); await new Promise(function(r){ setTimeout(r,60); });
    EDIT_ID=null; FORM_COMPS=['IMG-INVENTADA']; window._fotosFuera=[];
    showView('mis'); await new Promise(function(r){ setTimeout(r,60); });
    return { form:document.getElementById('view-form').classList.contains('active'), comps:compsArr(FORM_COMPS), p:window._preg() };
  });
  chk('8 · salir con la imagen sin guardar: la ventana del panel y se queda en el formulario', r.form && r.comps.join()==='IMG-INVENTADA' && r.p && r.p.tit==='¿Salir sin guardar el pedido?' &&
    r.p.no==='✏️ Quedarme en el pedido' && r.p.si==='🗑 Salir y borrar la imagen' && r.p.peligro, r);
  await no(page);
  r = await page.evaluate(() => ({ form:document.getElementById('view-form').classList.contains('active'), comps:compsArr(FORM_COMPS), fuera:window._fotosFuera.slice(), p:window._preg() }));
  chk('8 · «Quedarme» no sale ni borra la imagen', r.form && r.comps.join()==='IMG-INVENTADA' && !r.fuera.length && !r.p, r);
  await page.evaluate(() => showView('mis')); await page.waitForTimeout(60); await si(page);
  r = await page.evaluate(() => ({ form:document.getElementById('view-form').classList.contains('active'), mis:document.getElementById('view-mis').classList.contains('active'), comps:compsArr(FORM_COMPS), fuera:window._fotosFuera.slice() }));
  chk('8 · «Salir y borrar»: sale a Mis pedidos y la imagen se borra UNA vez', !r.form && r.mis && !r.comps.length && r.fuera.join()==='IMG-INVENTADA', r);

  /* ═══ 9. Cobranza de mayoristas: «Pagó las tildadas» ═══ */
  await page.evaluate(async () => { await aVentas([ P({ id:'M1', nota:'33001', oc:'11-301', cliente:'MAYORISTA INVENTADO', vendedor:'Eduardo Añez', pagado:false, saldo:900 }) ]); });
  r = await page.evaluate(async () => {
    window._guardados=0; CBZ.sel={ M1:true }; CBZ.pago={ metodo:'QR', banco:'BISA', fecha:hoy, nota:'5501', comps:['CB1'] };
    cbzPagoRegistrar(); await new Promise(function(r){ setTimeout(r,60); });
    return { n:cobrosDe(findById('M1')).length, g:window._guardados, sel:Object.keys(CBZ.sel).length, p:window._preg() };
  });
  chk('9 · «Pagó las tildadas»: la ventana del panel y todavía no anota ni destilda', r.n===0 && r.g===0 && r.sel===1 && r.p && r.p.tit==='¿Registrar el pago de 1 OC por Bs 900,00?' &&
    r.p.no==='No, todavía no' && r.p.si==='✅ Sí, registrar el pago', r);
  await no(page);
  r = await page.evaluate(() => ({ n:cobrosDe(findById('M1')).length, g:window._guardados, sel:Object.keys(CBZ.sel).length, p:window._preg() }));
  chk('9 · «No» no anota nada', r.n===0 && r.g===0 && r.sel===1 && !r.p, r);
  await page.evaluate(() => cbzPagoRegistrar()); await page.waitForTimeout(60); await si(page); await page.waitForTimeout(100);
  r = await page.evaluate(() => { var p=findById('M1'); return { n:cobrosDe(p).length, saldo:Number(p.saldo)||0, g:window._guardados, sel:Object.keys(CBZ.sel).length }; });
  chk('9 · «Sí» anota UNA vez y la OC queda pagada', r.n===1 && r.saldo===0 && r.g===1 && r.sel===0, r);

  /* ═══ 10. ¿El chofer recibió esta plata? ═══ */
  r = await page.evaluate(() => ctaChoferCruceO('⚠️ ¿Luis Inventado recibió esta plata?\n\nEse día el pedido lo llevó el Carry (Omar), y Luis Inventado es del Fotón nuevo.\n\nSi la recibió Luis Inventado, tocá Aceptar. Si no, Cancelar y elegí al chofer que la cobró.', 'Luis Inventado'));
  chk('10 · la pregunta del chofer: botones que dicen lo que hacen, sin «tocá Aceptar»', r.titulo==='¿Luis Inventado recibió esta plata?' && r.si==='✅ Sí, la recibió Luis Inventado' &&
    r.no==='✏️ No, elijo al chofer que la cobró' && r.lineas.length===1 && !/Aceptar/.test(r.lineas[0]) && /Carry/.test(r.lineas[0]), r);

  chk('1-10 · ninguna ventanita del navegador con la bandera', page._dialogos.length===0, page._dialogos);
  await ctx.close();

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
