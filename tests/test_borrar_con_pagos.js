/* 🗑️🔑 BORRAR UNA VENTA CON PAGOS PIDE LA CONTRASEÑA (mejora 461, 22/11; el dueño la eligió de la muestra «cuidar la plata y los precios»).
   Cuida:
   1. Sin la contraseña puesta, borrar una venta con pagos registrados pide la contraseña de Administración en la ventana del panel: la
      ventana dice cuánto se cobró, de qué fecha y con qué, y que esos pagos salen del Cuadre.
   2. Con una contraseña mala no se borra; con la buena, sí.
   3. Con la contraseña puesta (`UNLOCKED`) igual pregunta, sin pedirla: «No» la deja, «Sí» la borra.
   4. Sin pagos se borra como siempre (sin la ventana nueva).
   5. Una «PAGADA sin monto» con comprobante también la pide; el flete cobrado cuenta.
   6. Los tres caminos que borran un pedido pasan por la puerta: la ficha de Administración, la Lista de carga y Contabilidad (que con
      pagos no hace además su «Última confirmación»).
   7. En Playwright sin `BORRAR_CLAVE_PRUEBA`, apagado.
   Reloj clavado el martes 17/11/2026 10:00 de Bolivia. Red cortada, servidor simulado (`apiPost`), datos inventados.
   Se corre:  node tests/test_borrar_con_pagos.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  window.BORRAR_CLAVE_PRUEBA=true; window.PREG_PRUEBA=true;
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba')); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._hoja={}; window._borrados=[];
  apiPost=function(payload){
    var a=payload&&payload.action;
    if(a==='list') return Promise.resolve({ ok:true, pedidos:Object.keys(window._hoja).map(function(k){ return JSON.parse(JSON.stringify(window._hoja[k])); }) });
    if(a==='delete'){ window._borrados.push(payload.id); delete window._hoja[payload.id]; return Promise.resolve({ ok:true }); }
    if(a==='save'){ var r=JSON.parse(JSON.stringify(payload.pedido)); r.rev=Date.now(); window._hoja[r.id]=r; return Promise.resolve({ ok:true, pedido:r }); }
    return Promise.resolve({ ok:true });
  };
  apiList=function(){ return apiPost({ action:'list' }); };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-11-20', oc:'11-301', vendedor:'Isabel Robledo',
    cliente:'CLIENTE DE PRUEBA', celular:'70000000', turno:'AM', zona:'Este', direccion:'Calle 1', maps:'', pagado:false, saldo:3000,
    ts:Date.now()-86400000, metodoPago:'~QR BISA 500 @2026-11-16 #1111 + Efectivo 1000 @2026-11-17 #1112', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
    garantia:'', nota:'1111', acuenta:500, facturarA:'', nit:'', nroDia:3, verificado:false, fotos:[],
    productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x200', cant:1, codigo:'ZZ1001', precio:4500 }] }, o); };
  window._cargar=function(lista){ window._hoja={}; window._borrados=[]; lista.forEach(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; window._hoja[r.id]=r; });
    STATE=[]; STATE=mergePending(lista.map(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; return r; })); saveMirror(); };
  window._ov=function(){ var ov=document.querySelector('.preg-ov'); if(!ov) return null;
    return { tit:(ov.querySelector('#preg-tit')||{}).textContent||'', txt:ov.innerText, clave:!!ov.querySelector('.preg-in[type="password"]'), si:(ov.querySelector('.preg-si')||{}).textContent||'' }; };
  window._contestar=function(si, clave){ var ov=document.querySelector('.preg-ov'); if(!ov) return false; var i=ov.querySelector('.preg-in'); if(i && clave!=null) i.value=clave;
    (si ? ov.querySelector('.preg-si') : ov.querySelector('.preg-no')).click(); return true; };
  window._esta=function(id){ return !!findById(id); };
  window._tic=function(){ return new Promise(function(r){ setTimeout(r, 20); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  const dialogos=[]; page.on('dialog', d => { dialogos.push(d.message().slice(0,100)); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-17T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  const espera = (ms) => page.clock.runFor(ms||500);

  const off = await ev(() => borrarClaveActivo());
  chk('0 · en Playwright sin BORRAR_CLAVE_PRUEBA queda apagado', off === false, off);
  await page.evaluate(BASE);

  console.log('\n── 1-2. sin la contraseña puesta ──');
  let r = await ev(() => { _cargar([ _P({ id:'a1' }) ]); borrarConDeshacer('a1'); return { ov:_ov(), esta:_esta('a1') }; });
  chk('1a · pide la contraseña en la ventana del panel (campo tapado) y todavía no borra', r.ov && r.ov.clave && /contraseña/i.test(r.ov.tit) && r.esta===true, r.ov && r.ov.tit);
  chk('1b · dice cuánto se cobró, de qué fecha y con qué, y que sale del Cuadre',
    r.ov && /Bs 1\.500 en pagos registrados/.test(r.ov.txt) && /16\/11 · QR BISA · Bs 500 \(a cuenta\)/.test(r.ov.txt) && /17\/11 · Efectivo · Bs 1\.000/.test(r.ov.txt) && /SALEN del Cuadre/.test(r.ov.txt), r.ov && r.ov.txt);
  await ev(() => _contestar(true, 'otra-cosa')); await espera();
  r = await ev(() => ({ esta:_esta('a1'), ov:_ov(), toast:((document.getElementById('toast')||{}).textContent||''), b:window._borrados.slice() }));
  chk('2a · con una contraseña mala NO se borra y lo dice', r.esta===true && !r.ov && r.b.length===0 && /no es la contraseña/.test(r.toast), r);
  await ev(() => { borrarConDeshacer('a1'); _contestar(true, 'clave-de-prueba'); }); await espera(1500);
  r = await ev(() => ({ esta:_esta('a1'), b:window._borrados.slice() }));
  chk('2b · con la buena, se borra (también de la planilla)', r.esta===false && r.b.join()==='a1', r);
  await ev(() => { _cargar([ _P({ id:'a2' }) ]); borrarConDeshacer('a2'); _contestar(false); }); await espera();
  r = await ev(() => ({ esta:_esta('a2'), b:window._borrados.slice() }));
  chk('2c · «No, dejarla» no borra', r.esta===true && r.b.length===0, r);

  console.log('\n── 3. con la contraseña puesta ──');
  r = await ev(() => { _cargar([ _P({ id:'u1' }) ]); UNLOCKED=true; borrarConDeshacer('u1'); return { ov:_ov() }; });
  chk('3a · igual pregunta, sin pedir la contraseña', r.ov && !r.ov.clave && /pagos registrados/.test(r.ov.tit) && /Sí, borrarla con sus pagos/.test(r.ov.si), r.ov);
  await ev(() => _contestar(false)); await espera();
  r = await ev(() => _esta('u1'));
  chk('3b · «No» la deja', r===true, r);
  await ev(() => { borrarConDeshacer('u1'); _contestar(true); }); await espera(1500);
  r = await ev(() => ({ esta:_esta('u1'), b:window._borrados.slice() }));
  chk('3c · «Sí» la borra', r.esta===false && r.b.join()==='u1', r);

  console.log('\n── 4. sin pagos ──');
  r = await ev(() => { UNLOCKED=false; _cargar([ _P({ id:'s1', metodoPago:'', acuenta:0 }) ]); borrarConDeshacer('s1'); return { ov:_ov() }; });
  await espera(1500);
  let r2 = await ev(() => ({ esta:_esta('s1'), b:window._borrados.slice() }));
  chk('4 · sin pagos se borra como siempre, sin la ventana', !r.ov && r2.esta===false && r2.b.join()==='s1', { r, r2 });

  console.log('\n── 5. «PAGADA sin monto» y flete ──');
  r = await ev(() => { _cargar([ _P({ id:'m1', metodoPago:'Efectivo %IMG1', acuenta:0, pagado:true, saldo:0 }) ]); var B=borrarPagosDe(findById('m1')); borrarConDeshacer('m1'); var o=_ov(); _contestar(false); return { B:B, ov:o }; });
  chk('5a · una «PAGADA sin monto» con su comprobante también pide la contraseña', r.ov && r.ov.clave && /PAGADA \(sin el monto anotado\)/.test(r.ov.txt) && r.B.sinM===true, r);
  r = await ev(() => { var B=borrarPagosDe(_P({ metodoPago:'^Efectivo 150 @2026-11-17 #1113', acuenta:0 })); return B; });
  chk('5b · un flete ya cobrado cuenta como pago', r.bs===150 && r.L.length===1 && r.L[0].fl===true, r);
  r = await ev(() => [ borrarPagosDe({ id:'__ret_x__', metodoPago:'Efectivo 100 @2026-11-17' }).L.length, borrarPagosDe(_P({ id:'kommo-1', estado:BORRADOR_EST })).L.length ]);
  chk('5c · un retiro o un borrador de Kommo no cuentan', r.join()==='0,0', r);

  console.log('\n── 6. los caminos de borrar ──');
  r = await ev(async () => { _cargar([ _P({ id:'f1' }) ]); fichaEliminar('f1'); var o1=_ov(); _contestar(true); await _tic(); var o2=_ov(); _contestar(false); await _tic(); return { o1:o1 && o1.tit, o2:o2 && o2.tit, esta:_esta('f1') }; });
  await espera();
  chk('6a · la ficha de Administración: primero «¿Eliminar…?», después la contraseña', /Borrar el pedido/.test(r.o1||'') && /contraseña/i.test(r.o2||'') && r.esta===true, r);
  r = await ev(async () => { _cargar([ _P({ id:'l1' }) ]); eliminarDesdeCarga('l1'); var o1=_ov(); _contestar(true); await _tic(); var o2=_ov(); _contestar(false); await _tic(); return { o1:o1 && o1.tit, o2:o2 && o2.tit, esta:_esta('l1') }; });
  await espera();
  chk('6b · la Lista de carga, igual', /Borrar el pedido/.test(r.o1||'') && /contraseña/i.test(r.o2||'') && r.esta===true, r);
  r = await ev(async () => { _cargar([ _P({ id:'k1' }) ]); UNLOCKED=true; ctaEliminarVenta('k1'); var o1=_ov(); _contestar(true); await _tic(); var o2=_ov(); _contestar(true); await _tic(); var o3=_ov(); return { o1:o1 && o1.tit, o2:o2 && o2.tit, o3:o3 && o3.tit }; });
  await espera(1500);
  r2 = await ev(() => ({ esta:_esta('k1'), b:window._borrados.slice() }));
  chk('6c · Contabilidad: «¿Eliminar esta venta?» y la de los pagos (sin además «Última confirmación»), y borra', /Eliminar esta venta/.test(r.o1||'') && /pagos registrados/.test(r.o2||'') && !r.o3 && r2.esta===false && r2.b.join()==='k1', { r, r2 });
  chk('ninguna ventanita gris del navegador', dialogos.length===0, dialogos);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
