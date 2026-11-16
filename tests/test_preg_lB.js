/* ❓ LAS 12 PREGUNTAS DE ADENTRO DEL GUARDADO DEL PEDIDO, EN LA VENTANA DEL PANEL (16/11/2026; dueño, con la captura del «¿Prender el
   MODO PRÁCTICA…?»: «¿no que mis alertas no salían ya esas feas?»). La 282 no las había pasado porque «pasarlas exige cortar el guardado
   en dos y volver a empezarlo»: ahora cada una es `preguntaYa(texto, o, _otraVez)` y, al contestar, `submitPedido` vuelve a empezar
   ENTERO con las respuestas recordadas.

   ⚠️ LO QUE ESTE TEST CUIDA (con `PREG_PRUEBA`, datos SINTÉTICOS, reloj clavado en el lunes 16/11/2026 10:00 de Bolivia):
   1. Un guardado que pregunta DOS cosas (día cerrado + ✅ que se mueve; precio + celular heredados): ninguna ventanita del navegador,
      la primera vez corta SIN guardar ni tomar el botón, al contestar pregunta la segunda, y con las dos en «sí» guarda UNA sola vez,
      con lo mismo que guardaba Aceptar (también el `forzar` del día cerrado).
   2. «No» en cualquiera de las dos corta sin guardar y deja el formulario como estaba (la pedida del día de antes no se toca); el «no»
      del precio/celular/sin monto/ATC marca en rojo lo de siempre; la próxima vez vuelve a preguntar desde el principio.
   3. Diez de los doce lugares, cada uno con su título y sus botones: ATC sin completar, precio, celular, «sin monto», el mes de la venta
      de tienda, los pagos ya registrados, borrar el adelanto (rojo), el flete cobrado, el día cerrado y el ✅ que se mueve.
   4. Sin la bandera (las pruebas de siempre): las mismas preguntas del navegador con el MISMO texto, y guarda una vez.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_preg_lB.js   ·  `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-11-16T10:00:00-04:00';   // lunes

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  loadFromServer=function(){};
  NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._saves=[];
  apiSave=function(rec, opts){ window._saves.push({ rec:JSON.parse(JSON.stringify(rec)), opts:opts||null }); return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(rec)) }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._preg=function(){ var o=document.querySelector('.preg-ov'); if(!o) return null;
    return { tit:o.querySelector('h4').textContent, ic:o.querySelector('.preg-i').textContent, sub:(o.querySelector('.preg-h small')||{}).textContent||'',
      lineas:[].map.call(o.querySelectorAll('.preg-b li'), function(x){ return x.textContent; }),
      no:(o.querySelector('.preg-no')||{}).textContent||null, si:o.querySelector('.preg-si').textContent,
      peligro:!!o.querySelector('.preg-pel'), n:document.querySelectorAll('.preg-ov').length }; };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-11-13', oc:'11-001', vendedor:'Carola Chavez',
    cliente:'CLIENTE INVENTADO', celular:'70000000', turno:'AM', zona:'Norte', direccion:'Calle Inventada 1', maps:'', pagado:false, saldo:3000,
    ts:Date.parse('2026-11-10T10:00:00-04:00'), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
    garantia:'', nota:'1001', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:false, fotos:[], rev:2,
    productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000 }] }, o); };
  window._dormir=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._abrir=async function(id, fn){ showView('form'); editPedido(id); await _dormir(250); if(fn) fn(); window._saves=[]; };
  window._estado=function(id){ var p=findById(id);
    return { saves:window._saves.length, ult:window._saves.length ? window._saves[window._saves.length-1] : null, edit:EDIT_ID,
             btn:document.getElementById('f-submit').disabled, memo:PREG_MEMO, p:p ? JSON.parse(JSON.stringify(p)) : null,
             toast:(document.getElementById('toast')||{}).textContent||'', preg:window._preg() }; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async (flag) => {
    const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage(); page.on('pageerror', e=>errores.push(e.message));
    page._dialogos=[]; page._resp=true;
    page.on('dialog', d=>{ page._dialogos.push(d.type()+'|'+d.message()); if(page._resp) d.accept(); else d.dismiss(); });
    await ctx.route(/^https?:\/\//, r=>r.abort());
    if(flag) await page.addInitScript(() => { window.PREG_PRUEBA=true; });
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' }); await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg).catch(e => ({ __err:String((e&&e.message)||e).slice(0,300) }));

  /* ═════════ A. Con la bandera ═════════ */
  const { ctx, page } = await nueva(true);
  const E = (id) => ev(page, (id) => window._estado(id), id);
  const toca = async (cual) => { await page.click('.preg-'+cual); await page.waitForTimeout(450); };
  const guardar = async () => { await ev(page, () => { submitPedido(); }); await page.waitForTimeout(450); };

  /* ── 1. Día cerrado + ✅ que se mueve: DOS preguntas, UN guardado ── */
  console.log('\n── 1. Dos preguntas en el mismo guardado (día cerrado + ✅ que se mueve) ──');
  const armarEntregado = (id) => ev(page, async (id) => {
    DIAS_CERRADOS=['2026-11-18']; UNLOCKED=true;
    STATE=[ _P({ id:id, entregado:true, verificado:true, vehiculo:'Foton nuevo', chofer:'Luis Pierre', cliente:'ENTREGADO INVENTADO',
      productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, eF:'2026-11-13', eT:1763046000000, eQ:'Ernesto' }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-fecha').value='2026-11-18'; segSet('f-turno','AM'); });
  }, id);
  await armarEntregado('e1');
  await guardar();
  let r = await E('e1');
  chk('1 · la primera vez corta SIN guardar, sin tomar el botón y deja el formulario abierto', r.saves===0 && !r.btn && r.edit==='e1' && r.p.fecha==='2026-11-13' && r.p.entregado===true, r);
  chk('1 · la ventana del panel del día cerrado, con sus botones', r.preg && r.preg.tit==='El 18/11/2026 está cerrado' && r.preg.ic==='🔒' && r.preg.no==='✏️ Elegir otro día' && r.preg.si==='🔒 Mover igual a ese día' && r.preg.n===1, r.preg);
  await toca('si');
  r = await E('e1');
  chk('1 · al contestar vuelve a empezar y pregunta la segunda (el ✅), todavía sin guardar', r.saves===0 && r.preg && /figura ENTREGADO \(lo confirmó Ernesto\)/.test(r.preg.tit) && r.preg.ic==='✅' &&
      r.preg.no==='No, volver sin guardar' && r.preg.si==='📅 No se entregó: moverlo' && r.preg.lineas.length===2 && /18\/11\/2026/.test(r.preg.lineas[0]) && r.preg.n===1, r.preg);
  await toca('si');
  r = await E('e1');
  chk('1 · con las dos en «sí» guarda UNA sola vez', r.saves===1 && !r.preg, { saves:r.saves, preg:r.preg });
  chk('1 · lo mismo que con «Aceptar»: el 18/11, sin el ✅ ni el registro del cierre, y con `forzar` (día cerrado)',
      r.ult && r.ult.rec.fecha==='2026-11-18' && r.ult.rec.entregado===false && !r.ult.rec.productos[0].eF && r.ult.opts && r.ult.opts.forzar===true, r.ult && { f:r.ult.rec.fecha, e:r.ult.rec.entregado, eF:r.ult.rec.productos[0].eF, o:r.ult.opts });
  chk('1 · la memoria de la tanda queda vacía', r.memo===null, r.memo);
  await page.waitForTimeout(600);
  r = await E('e1');
  chk('1 · y no vuelve a guardar más tarde', r.saves===1, r.saves);

  console.log('\n── 2. «No» corta sin guardar ──');
  await armarEntregado('e2');
  await guardar(); await toca('si');
  r = await E('e2');
  chk('2 · (el día cerrado en «sí», la del ✅ a la vista)', r.preg && /figura ENTREGADO/.test(r.preg.tit), r.preg);
  await toca('no');
  r = await E('e2');
  chk('2 · «No, volver sin guardar» en la segunda: no guarda nada y el formulario queda abierto con lo que escribió', r.saves===0 && !r.preg && r.edit==='e2' && !r.btn &&
      r.p.fecha==='2026-11-13' && r.p.entregado===true && r.p.productos[0].eF==='2026-11-13', { saves:r.saves, edit:r.edit, f:r.p.fecha, e:r.p.entregado });
  r = await ev(page, () => document.getElementById('f-fecha').value);
  chk('2 · el formulario sigue con el día que eligió (para cambiarlo)', r==='2026-11-18', r);
  await guardar();
  r = await E('e2');
  chk('2 · Guardar otra vez vuelve a preguntar desde la primera (no recuerda la tanda de antes)', r.saves===0 && r.preg && r.preg.tit==='El 18/11/2026 está cerrado', r.preg);
  await toca('no');
  r = await E('e2');
  chk('2 · «Elegir otro día» en la primera: no guarda y NO pasa a la segunda', r.saves===0 && !r.preg && r.edit==='e2', { saves:r.saves, preg:r.preg });

  /* ── 3. Precio y celular heredados: dos preguntas, un guardado; los «no» marcan en rojo ── */
  console.log('\n── 3. Precio + celular heredados (con la clave) ──');
  const armarViejo = (id) => ev(page, async (id) => {
    window.PRECIO_PRUEBA=1; window.CEL_PRUEBA=1; UNLOCKED=true; DIAS_CERRADOS=[];
    STATE=[ _P({ id:id, fecha:'2026-11-17', celular:'3456789', cliente:'VIEJO INVENTADO', productos:[{ desc:'TITANIO LATEX', medida:'160x190', cant:1 }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-obs').value='Llamar antes'; });
  }, id);
  await armarViejo('v1');
  await guardar();
  r = await E('v1');
  chk('3 · el precio heredado: la ventana del panel, sin guardar', r.saves===0 && r.preg && r.preg.tit==='Este pedido ya estaba guardado sin el precio' && r.preg.ic==='💵' &&
      r.preg.no==='✏️ Ponerle el precio' && r.preg.si==='💾 Guardar igual, sin precio' && /TITANIO LATEX/.test(r.preg.lineas[0]), r.preg);
  await toca('si');
  r = await E('v1');
  chk('3 · después, el celular heredado (sin guardar todavía)', r.saves===0 && r.preg && r.preg.tit==='«3456789» no es un celular de WhatsApp' && r.preg.ic==='📱' &&
      r.preg.sub==='Este pedido ya estaba guardado con ese número' && r.preg.no==='✏️ Corregirlo' && r.preg.si==='💾 Guardar igual, con ese número', r.preg);
  await toca('si');
  r = await E('v1');
  chk('3 · con las dos en «sí» guarda UNA vez, con el número y sin precio, y lo que se cambió', r.saves===1 && !r.preg && r.ult.rec.celular==='3456789' && !r.ult.rec.productos[0].precio && r.ult.rec.observaciones==='Llamar antes',
      r.ult && { s:r.saves, cel:r.ult.rec.celular, pr:r.ult.rec.productos[0].precio, obs:r.ult.rec.observaciones });
  await armarViejo('v2');
  await guardar(); await toca('no');
  r = await E('v2');
  let rojos = await ev(page, () => [].map.call(document.querySelectorAll('#f-productos .prod-precio.err'), function(e){ return e.closest('.prod-card').querySelector('.prod-desc').value; }));
  chk('3 · «Ponerle el precio»: no guarda, el precio en rojo con su aviso, y NO pregunta lo del celular', r.saves===0 && !r.preg && rojos.join()==='TITANIO LATEX' && /PRECIO/.test(r.toast), { saves:r.saves, rojos, toast:r.toast, preg:r.preg });
  await armarViejo('v3');
  await guardar(); await toca('si'); await toca('no');
  r = await E('v3');
  rojos = await ev(page, () => document.getElementById('f-celular').classList.contains('err'));
  chk('3 · «Corregirlo» (con el precio en «sí»): no guarda y el celular queda en rojo con su aviso', r.saves===0 && !r.preg && rojos===true && /no es de WhatsApp/.test(r.toast), { saves:r.saves, rojo:rojos, toast:r.toast });
  await ev(page, () => { window.PRECIO_PRUEBA=0; window.CEL_PRUEBA=0; });

  /* ── 4. La ATC vieja sin completar (con la clave) ── */
  console.log('\n── 4. ATC heredada sin fecha de compra ──');
  const armarAtc = (id) => ev(page, async (id) => {
    UNLOCKED=true;
    STATE=[ _P({ id:id, oc:'ATC 11-0'+id.slice(-1), fecha:'2026-11-17', cliente:'ATC INVENTADA', direccion:'Calle 3', saldo:0, nota:'',
      productos:[{ desc:'ORO ORTOPEDICO', medida:'140x190', cant:1, atc:{ mot:'Hundimiento', det:'hundido del lado derecho' } }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-direccion').value='Calle nueva 9'; });
  }, id);
  await armarAtc('a1');
  await guardar();
  r = await E('a1');
  chk('4 · la ventana del panel: «Esta ATC ya estaba guardada incompleta» y lo que le falta, sin guardar', r.saves===0 && r.preg && r.preg.tit==='Esta ATC ya estaba guardada incompleta' &&
      /^Le falta: .*fecha de compra/.test(r.preg.lineas[0]) && r.preg.ic==='🎧' &&
      r.preg.no==='✏️ Completarlo ahora' && r.preg.si==='💾 Guardar igual, sin completarlo', r.preg);
  await toca('no');
  r = await E('a1');
  let falta = await ev(page, () => document.getElementById('atc-falta').textContent);
  chk('4 · «Completarlo ahora»: no guarda y dice lo que falta', r.saves===0 && !r.preg && /fecha de compra/.test(falta), { saves:r.saves, falta });
  await armarAtc('a2');
  await guardar(); await toca('si');
  r = await E('a2');
  chk('4 · «Guardar igual»: guarda UNA vez con la dirección nueva y sin inventar la fecha de compra', r.saves===1 && !r.preg && r.ult.rec.direccion==='Calle nueva 9' && !(r.ult.rec.productos[0].atc||{}).fcom,
      r.ult && { s:r.saves, dir:r.ult.rec.direccion, atc:r.ult.rec.productos[0].atc });

  /* ── 5. La venta que ya estaba guardada sin monto (SALDO_PRUEBA) ── */
  console.log('\n── 5. Venta ya guardada sin monto ──');
  const armarSinMonto = (id) => ev(page, async (id) => {
    window.SALDO_PRUEBA=1; UNLOCKED=false;
    STATE=[ _P({ id:id, fecha:'2026-11-17', saldo:0, acuenta:0, cliente:'SIN MONTO INVENTADO', productos:[{ desc:'SOFT ICE', medida:'140x190', cant:1 }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-direccion').value='Calle nueva 5'; });
  }, id);
  await armarSinMonto('m1');
  await guardar();
  r = await E('m1');
  chk('5 · la ventana del panel: «sin monto», sin guardar', r.saves===0 && r.preg && r.preg.tit==='Esta venta ya estaba guardada sin monto' && r.preg.sub==='Ni saldo por cobrar ni pago' &&
      r.preg.no==='✏️ Poner el monto' && r.preg.si==='💾 Guardar igual así', r.preg);
  await toca('no');
  r = await E('m1');
  rojos = await ev(page, () => document.getElementById('f-saldo').classList.contains('err'));
  chk('5 · «Poner el monto»: no guarda y pide el saldo en rojo', r.saves===0 && !r.preg && rojos===true && /SALDO POR COBRAR/.test(r.toast), { saves:r.saves, rojo:rojos, toast:r.toast });
  await armarSinMonto('m2');
  await guardar(); await toca('si');
  r = await E('m2');
  chk('5 · «Guardar igual así»: UNA vez, con la dirección nueva', r.saves===1 && r.ult.rec.direccion==='Calle nueva 5', r.ult && { s:r.saves, dir:r.ult.rec.direccion });
  await ev(page, () => { window.SALDO_PRUEBA=0; UNLOCKED=true; });

  /* ── 6. La venta de tienda que pasa a otro mes ── */
  console.log('\n── 6. Venta de tienda: «¿la venta pasa a octubre de 2026?» ──');
  const armarTienda = (id) => ev(page, async (id) => {
    UNLOCKED=true;
    STATE=[ _P({ id:id, fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Charcas', entregado:true, verificado:true, nroDia:0, vendedor:'Fernando Peinado',
      nota:'9174', oc:'11-901', cliente:'TIENDA INVENTADA', acuenta:1480, saldo:0, pagado:true, metodoPago:'Efectivo %IMG1',
      ts:Date.parse('2026-11-02T10:15:00-04:00'), productos:[{ desc:'COLCHON CONFORT PLUS', medida:'140x190', cant:1, precio:1480 }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-fecha-venta').value='2026-10-30'; });
  }, id);
  await armarTienda('t1');
  await guardar();
  r = await E('t1');
  chk('6 · la ventana del panel con el mes nuevo y el de antes, sin guardar', r.saves===0 && r.preg && r.preg.tit==='¿La venta pasa a octubre de 2026?' && r.preg.ic==='📅' && /antes: noviembre/.test(r.preg.lineas[0]) &&
      r.preg.no==='✏️ Volver sin guardar' && r.preg.si==='📅 Sí, que cuente en octubre de 2026', r.preg);
  await toca('no');
  r = await E('t1');
  chk('6 · «Volver sin guardar»: no guarda nada', r.saves===0 && !r.preg && isoDia(r.p.ts)==='2026-11-02', { saves:r.saves, ts:r.p && r.p.ts });
  await armarTienda('t2');
  await guardar(); await toca('si');
  r = await E('t2');
  chk('6 · «Sí»: guarda UNA vez, del 30/10 a la misma hora', r.saves===1 && isoDia(r.ult.rec.ts)==='2026-10-30' && horaBo(r.ult.rec.ts)==='10:15', r.ult && { s:r.saves, d:isoDia(r.ult.rec.ts), h:horaBo(r.ult.rec.ts) });

  /* ── 7. Los pagos ya registrados (le cambian el «Monto total cobrado» a una venta pagada) ── */
  console.log('\n── 7. «Los pagos de esta venta ya están registrados» ──');
  const MP7='~Efectivo 3000 @2026-11-10 #1003 %IMGE3';
  const armarPagada = (id) => ev(page, async (a) => {
    UNLOCKED=true;
    STATE=[ _P({ id:a.id, fecha:'2026-11-17', cliente:'PAGADA INVENTADA', pagado:true, saldo:0, acuenta:0, nota:'1003', metodoPago:a.mp }) ]; saveMirror();
    await _abrir(a.id, function(){ document.getElementById('f-cobrado').value='3500'; document.getElementById('f-obs').value='Llamar antes'; });
  }, { id, mp:MP7 });
  await armarPagada('c1');
  await guardar();
  r = await E('c1');
  chk('7 · la ventana del panel con el pago registrado en un renglón, sin guardar', r.saves===0 && r.preg && r.preg.tit==='Los pagos de esta venta ya están registrados' &&
      /^13\/11\/2026|^10\/11\/2026/.test(r.preg.lineas[0]) && /Corregir este pago/.test(r.preg.lineas.join(' ')) && r.preg.no==='✏️ Volver sin guardar' && r.preg.si==='💾 Guardar lo demás', r.preg);
  await toca('no');
  r = await E('c1');
  chk('7 · «Volver sin guardar»: nada', r.saves===0 && !r.preg && r.edit==='c1', { saves:r.saves });
  await armarPagada('c2');
  await guardar(); await toca('si');
  r = await E('c2');
  chk('7 · «Guardar lo demás»: UNA vez, con las observaciones y el pago como estaba', r.saves===1 && r.ult.rec.observaciones==='Llamar antes' && r.ult.rec.metodoPago===MP7, r.ult && { s:r.saves, obs:r.ult.rec.observaciones, mp:r.ult.rec.metodoPago });

  /* ── 8. Quitar el adelanto registrado (el botón rojo) ── */
  console.log('\n── 8. «Se va a borrar un pago ya registrado» ──');
  const MP8='~Efectivo 500 @2026-11-10 #1101 %IMGA1 + QR BISA 1000 @2026-11-12 #1750 %IMGQ1';
  const armarAdelanto = (id) => ev(page, async (a) => {
    UNLOCKED=true;
    STATE=[ _P({ id:a.id, fecha:'2026-11-17', cliente:'ADELANTO INVENTADO', nota:'1101', acuenta:500, saldo:1500, metodoPago:a.mp }) ]; saveMirror();
    await _abrir(a.id, function(){ document.getElementById('f-acuenta').value='0'; document.getElementById('f-saldo').value='2000'; updateMetodoVisibility(); FORM_COMPS=[]; });
  }, { id, mp:MP8 });
  await armarAdelanto('b1');
  await guardar();
  r = await E('b1');
  chk('8 · la ventana del panel en ROJO, nombrando solo el adelanto que se va', r.saves===0 && r.preg && r.preg.tit==='Se va a borrar un pago ya registrado' && r.preg.ic==='🗑' && r.preg.peligro &&
      r.preg.lineas.length===2 && /500/.test(r.preg.lineas[0]) && /otros pagos quedan/.test(r.preg.lineas[1]) && r.preg.no==='No, volver sin guardar' && r.preg.si==='🗑 Guardar y borrar el pago', r.preg);
  await toca('no');
  r = await E('b1');
  chk('8 · «No»: nada se borra ni se guarda', r.saves===0 && !r.preg && r.p.metodoPago===MP8, { saves:r.saves, mp:r.p && r.p.metodoPago });
  await armarAdelanto('b2');
  await guardar(); await toca('si');
  r = await E('b2');
  chk('8 · «Guardar y borrar el pago»: UNA vez, se va el adelanto y el QR queda', r.saves===1 && r.ult.rec.metodoPago==='QR BISA 1000 @2026-11-12 #1750 %IMGQ1' && Number(r.ult.rec.acuenta)===0,
      r.ult && { s:r.saves, mp:r.ult.rec.metodoPago, a:r.ult.rec.acuenta });

  /* ── 9. El flete ya cobrado que se quiere bajar ── */
  console.log('\n── 9. «El recargo por entrega ya tiene … cobrados» ──');
  const armarFlete = (id) => ev(page, async (id) => {
    UNLOCKED=true;
    STATE=[ _P({ id:id, fecha:'2026-11-17', cliente:'FLETE INVENTADO', nota:'719', acuenta:0, saldo:0, pagado:true, direccion:'Vieja 1',
      metodoPago:'~Efectivo 1500 @2026-11-10 #719 %V10 + ^Efectivo 40 @2026-11-10 #720 %C720 + ^QR BISA 60 @2026-11-10 #721 %C721',
      productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:1500 }] }) ]; saveMirror();
    await _abrir(id, function(){ document.getElementById('f-envio').value='80'; document.getElementById('f-direccion').value='Av. Corregida 123'; });
  }, id);
  await armarFlete('f1');
  await guardar();
  r = await E('f1');
  chk('9 · la ventana del panel con lo cobrado y lo que puso, sin guardar', r.saves===0 && r.preg && /^El recargo por entrega ya tiene Bs 100,00 cobrados$/.test(r.preg.tit) && /80/.test(r.preg.sub) &&
      r.preg.no==='✏️ Volver sin guardar' && r.preg.si==='💾 Guardar el resto', r.preg);
  await toca('no');
  r = await E('f1');
  chk('9 · «Volver sin guardar»: nada', r.saves===0 && !r.preg && r.p.direccion==='Vieja 1', { saves:r.saves });
  await armarFlete('f2');
  await guardar(); await toca('si');
  r = await E('f2');
  let env = await ev(page, () => { var s=window._saves[window._saves.length-1]; return s ? envioCobrado(s.rec) : null; });
  chk('9 · «Guardar el resto»: UNA vez, con la dirección nueva y el flete cobrado entero (100)', r.saves===1 && r.ult.rec.direccion==='Av. Corregida 123' && env===100, r.ult && { s:r.saves, dir:r.ult.rec.direccion, env });

  chk('A · con la bandera, ninguna ventanita del navegador en todo el recorrido', page._dialogos.length===0, page._dialogos.slice(0,3));
  await ctx.close();

  /* ═════════ B. Sin la bandera: lo del navegador de siempre ═════════ */
  console.log('\n── B. Sin la bandera (las pruebas de siempre) ──');
  { const { ctx:ctx2, page:p2 } = await nueva(false);
    await ev(p2, async () => {
      DIAS_CERRADOS=['2026-11-18']; UNLOCKED=true;
      STATE=[ _P({ id:'n1', entregado:true, verificado:true, cliente:'ENTREGADO INVENTADO',
        productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, eF:'2026-11-13', eT:1763046000000, eQ:'Ernesto' }] }) ]; saveMirror();
      await _abrir('n1', function(){ document.getElementById('f-fecha').value='2026-11-18'; segSet('f-turno','AM'); });
      submitPedido();
    });
    await p2.waitForTimeout(500);
    const rb = await ev(p2, () => window._estado('n1'));
    chk('B · sin bandera: las dos preguntas del navegador con el texto de siempre', p2._dialogos.length===2 &&
        p2._dialogos[0]==='confirm|🔒 El 18/11/2026 está CERRADO: ese camión ya está armado.\n\n¿Mover igual el pedido a ese día?' &&
        /^confirm\|✅ Este pedido figura ENTREGADO \(lo confirmó Ernesto\)\.\n\nSi lo pasás al 18\/11\/2026 es porque no se entregó/.test(p2._dialogos[1]), p2._dialogos);
    chk('B · sin bandera: guarda una vez, como siempre, y sin la ventana del panel', rb.saves===1 && !rb.preg && rb.ult.rec.fecha==='2026-11-18' && rb.ult.rec.entregado===false, { s:rb.saves, preg:rb.preg });
    await ctx2.close(); }

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function isoDia(ts){ var d=new Date(Number(ts)-4*3600000); return d.toISOString().slice(0,10); }
function horaBo(ts){ var d=new Date(Number(ts)-4*3600000); return ('0'+d.getUTCHours()).slice(-2)+':'+('0'+d.getUTCMinutes()).slice(-2); }
