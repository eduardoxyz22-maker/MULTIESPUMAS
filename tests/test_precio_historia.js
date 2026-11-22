/* 💵 QUIÉN LE CAMBIÓ EL PRECIO DESPUÉS DE CARGARLA (mejora 462, 22/11; el dueño la eligió de la muestra «cuidar la plata y los precios»).
   Cuida:
   1. Cambiar el precio de un renglón de una venta que ya está en la planilla deja `prH` adentro del pedido: quién, desde dónde, qué
      renglón, de cuánto a cuánto y el total de la venta antes y después; viaja a la planilla.
   2. Dos cambios seguidos: el segundo sale del primero (no de la planilla vieja).
   3. Un precio puesto POR PRIMERA VEZ (el renglón estaba sin precio: el precio obligatorio en una venta vieja) no es un cambio, ni el total
      que se movió por eso.
   4. Guardar otra cosa (la dirección, un pago) no anota nada; cambiar el producto por otro tampoco es un cambio de precio.
   5. Una venta NUEVA (todavía no está en la planilla) no anota; una ATC o una RPT tampoco.
   6. `heredarMarcas` lo pasa a todos los renglones; `deshDevolver` no lo toca.
   7. Lo dice la 🕓 Historia del pedido.
   8. Contabilidad → «💵 Precios del mes», con la contraseña: la lista, Copiar y el Excel (con la plata como número).
   9. En Playwright sin `PRH_PRUEBA`, apagado.
   Reloj clavado el martes 17/11/2026 10:00 de Bolivia. Red cortada, servidor simulado (`apiPost`), datos inventados.
   Se corre:  node tests/test_precio_historia.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  window.PRH_PRUEBA=true; window.FH_PRUEBA=true;
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._hoja={}; window._env=[];
  apiPost=function(payload){
    var a=payload&&payload.action;
    if(a==='save'){ var r=JSON.parse(JSON.stringify(payload.pedido)); r.rev=Date.now()+window._env.length; window._hoja[r.id]=r; window._env.push(JSON.parse(JSON.stringify(payload.pedido)));
      return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(r)), ahora:Date.now() }); }
    if(a==='list') return Promise.resolve({ ok:true, pedidos:Object.keys(window._hoja).map(function(k){ return JSON.parse(JSON.stringify(window._hoja[k])); }) });
    return Promise.resolve({ ok:true });
  };
  apiList=function(){ return apiPost({ action:'list' }); };
  window.confirm=function(){ return true; };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-11-20', oc:'11-201', vendedor:'Maria Flores',
    cliente:'CLIENTA DE PRUEBA', celular:'70000000', turno:'AM', zona:'Este', direccion:'Calle 1', maps:'', pagado:false, saldo:9550,
    ts:Date.now()-86400000, metodoPago:'~QR BISA 500 @2026-11-16 #1111', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
    garantia:'', nota:'1111', acuenta:500, facturarA:'', nit:'', nroDia:3, verificado:false, fotos:[],
    productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x200', cant:2, codigo:'ZZ1001', precio:4750 },
               { desc:'ALMOHADA', medida:'50x70', cant:2, codigo:'ZZ1002', precio:25 }] }, o); };
  window._cargar=function(lista){ window._hoja={}; lista.forEach(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; window._hoja[r.id]=r; });
    STATE=[]; STATE=mergePending(lista.map(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; return r; })); saveMirror(); };
  window._H=function(id){ return JSON.parse(JSON.stringify(prhDe(findById(id)))); };
  window._Hhoja=function(id){ var r=window._hoja[id]; return r ? prhDe(r).length : -1; };
  window._esperar=function(){ return new Promise(function(r){ setTimeout(r, 30); }); };
  /* cambia el precio de un renglón como lo hace la ficha («Corregir precios y montos»): el precio y el saldo, y guarda */
  window._precio=function(id, i, nuevo){ var p=findById(id), x=p.productos[i], d=r2((nuevo-(Number(x.precio)||0))*(Number(x.cant)||1));
    x.precio=nuevo; p.saldo=r2((Number(p.saldo)||0)+d); pagDonde('Contabilidad (Corregir precios)'); persistPedido(p); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-17T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  const espera = (ms) => page.clock.runFor(ms||400);
  const off = await ev(() => prhActivo());
  chk('0 · en Playwright sin PRH_PRUEBA queda apagado', off === false, off);
  await page.evaluate(BASE);

  console.log('\n── 1. cambiar un precio ──');
  let r = await ev(() => { _cargar([ _P({ id:'a1' }) ]); quienRol('conta'); setVendedorMem('');
    var t0=prhTotal(findById('a1')); _precio('a1', 0, 3900);
    return { t0:t0, H:_H('a1') }; });
  await espera();
  const e1 = r.H && r.H[0];
  chk('1a · un renglón: de 4.750 a 3.900, el código, cuántos, por Contabilidad, desde «Corregir precios»',
    r.H && r.H.length===1 && e1.r.length===1 && e1.r[0].de===4750 && e1.r[0].a===3900 && e1.r[0].c==='ZZ1001' && e1.r[0].u===2 && e1.q==='Contabilidad' && /Corregir precios/.test(e1.d), r);
  chk('1b · …y el total de la venta antes y después (10.050 → 8.350)', e1 && e1.tot && e1.tot.de===10050 && e1.tot.a===8350 && r.t0===10050, e1 && e1.tot);
  r = await ev(() => ({ n:_Hhoja('a1') }));
  chk('1c · viaja a la planilla adentro del pedido', r.n===1, r);

  console.log('\n── 2. dos cambios seguidos ──');
  r = await ev(async () => { setVendedorMem('Maria Flores'); _precio('a1', 1, 20); await _esperar(); _precio('a1', 1, 15); await _esperar(); window._a1=JSON.parse(JSON.stringify(window._hoja.a1)); return _H('a1'); });
  await espera();
  chk('2 · el segundo sale del primero: 25 → 20 y después 20 → 15, con el nombre de quien lo hizo',
    r.length===3 && r[1].r[0].de===25 && r[1].r[0].a===20 && r[2].r[0].de===20 && r[2].r[0].a===15 && r[2].q==='Maria Flores', r.map(e=>({ r:e.r, q:e.q })));

  console.log('\n── 3. precio puesto por primera vez ──');
  r = await ev(() => { _cargar([ _P({ id:'b1', productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x200', cant:1, codigo:'ZZ1001' }], saldo:4250 }) ]);
    var p=findById('b1'); p.productos[0].precio=4750; persistPedido(p); return _H('b1'); });
  await espera();
  chk('3a · ponerle el precio a un renglón que no tenía (venta vieja) NO es un cambio', r.length===0, r);
  r = await ev(() => { _cargar([ _P({ id:'b2', productos:[{ desc:'COLCHON TITANIO LATEX', medida:'160x200', cant:1, codigo:'ZZ1001' }], saldo:4250 }) ]);
    var p=findById('b2'); p.productos[0].precio=4750; p.saldo=4250; persistPedido(p); return _H('b2'); });
  chk('3b · …aunque el total también se mueva con eso', r.length===0, r);

  console.log('\n── 4. lo que no es un cambio de precio ──');
  r = await ev(() => { _cargar([ _P({ id:'c1' }) ]); var p=findById('c1'); p.direccion='Calle 2'; persistPedido(p); return _H('c1'); });
  chk('4a · cambiar la dirección no anota nada', r.length===0, r);
  r = await ev(() => { _cargar([ _P({ id:'c2' }) ]); var p=findById('c2'); p.metodoPago='~QR BISA 500 @2026-11-16 #1111 + Efectivo 1000 @2026-11-17 #1112'; p.saldo=8550; persistPedido(p); return _H('c2'); });
  chk('4b · registrar un pago (baja el saldo, el total sigue igual) no anota nada', r.length===0, r);
  r = await ev(() => { _cargar([ _P({ id:'c3' }) ]); var p=findById('c3'); p.productos[0]={ desc:'COLCHON TITANIO ICE', medida:'160x200', cant:2, codigo:'ZZ1009', precio:4750 }; persistPedido(p); return _H('c3'); });
  chk('4c · cambiar el producto por otro (mismo precio) no es un cambio de precio', r.length===0, r);

  console.log('\n── 5. venta nueva, ATC, RPT ──');
  r = await ev(() => { _cargar([]); var p=_P({ id:'n1' }); STATE.push(p); p.productos[0].precio=4000; persistPedido(p); return _H('n1'); });
  chk('5a · una venta NUEVA (todavía no está en la planilla) no anota', r.length===0, r);
  r = await ev(() => { _cargar([ _P({ id:'t1', oc:'ATC 11-010' }), _P({ id:'t2', oc:'RPT 11-011' }) ]);
    ['t1','t2'].forEach(function(id){ var p=findById(id); p.productos[0].precio=10; persistPedido(p); }); return [_H('t1').length, _H('t2').length]; });
  chk('5b · una ATC y una RPT tampoco', r.join()==='0,0', r);

  console.log('\n── 6. heredarMarcas y deshDevolver ──');
  r = await ev(() => { var H=[{ t:1, q:'X', d:'ficha', r:[{ c:'A', n:'A', de:10, a:5, u:1 }] }];
    var nuevos=heredarMarcas([{ desc:'A', medida:'1', cant:1, codigo:'X1', precio:5 }, { desc:'B', medida:'2', cant:3, codigo:'X2' }], [{ desc:'A', medida:'1', cant:1, codigo:'X1', precio:5, prH:H }]);
    var cur={ prH:H.slice(), precio:5 }; deshDevolver(cur, { prH:[] , precio:5 }, { prH:H, precio:5 });
    return { n:nuevos.map(function(x){ return (x.prH||[]).length; }), desh:cur.prH.length }; });
  chk('6a · `heredarMarcas` lo pasa a todos los renglones (también a uno nuevo)', r.n && r.n.join()==='1,1', r);
  chk('6b · `deshDevolver` no lo borra', r.desh===1, r);

  console.log('\n── 7. la historia del pedido ──');
  r = await ev(() => { _cargar([ window._a1 ]); return pedHistDatos(findById('a1')).filter(function(e){ return e.k==='precio'; }).map(function(e){ return e.html.replace(/<[^>]+>/g,''); }); });
  chk('7 · la 🕓 Historia dice quién cambió el precio, de cuánto a cuánto y el total',
    r.length===3 && /Contabilidad cambió el precio: COLCHON TITANIO LATEX 160x200 \(×2\): Bs 4\.750 → Bs 3\.900 · el total Bs 10\.050 → Bs 8\.350 · desde Contabilidad/.test(r[0]), r);

  console.log('\n── 8. «💵 Precios del mes» ──');
  r = await ev(() => { var b=document.getElementById('prm-btn'); var antes=b && !b.hidden; UNLOCKED=true; mostrarBotonesTodos(); var desp=b && !b.hidden;
    var L=prmDatos('2026-11').filter(function(x){ return x.tp==='cambio'; });
    prmAbrir(); var txt=(document.getElementById('prm')||{}).innerText||'';
    var copiado=null; var _ct=copyText; copyText=function(t){ copiado=t; }; prmCopiar(); copyText=_ct;
    var xl=null, _bx=buildXlsx, _db=downloadBlob; buildXlsx=function(h){ xl=h; return new Uint8Array([1]); }; downloadBlob=function(){}; prmExcel(); buildXlsx=_bx; downloadBlob=_db;
    closeModal();
    var fila=xl && xl[0].matrix[1];
    return { antes:antes, desp:desp, n:L.length, txt:txt.slice(0,3000), copiado:copiado && copiado.slice(0,3000), cab:xl && xl[0].matrix[0].map(function(c){ return c.v; }), fila:fila, nfilas:xl && xl[0].matrix.length }; });
  chk('8a · el botón aparece solo con la contraseña', r.antes===false && r.desp===true, r);
  chk('8b · lista los 3 cambios de noviembre de la venta a1', r.n===3, r.n);
  chk('8c · la ventana dice el pedido, la vendedora, de cuánto a cuánto y quién', /OC 11-201 · CLIENTA DE PRUEBA/.test(r.txt) && /Maria Flores/.test(r.txt) && /4\.750 → Bs 3\.900/.test(r.txt) && /Contabilidad/.test(r.txt), r.txt);
  chk('8d · «Copiar» arma el texto del mes', /Precios de noviembre/.test(r.copiado||'') && /3\.900/.test(r.copiado||''), r.copiado);
  const pr = r.fila && r.fila.find(c => c && c.t==='n' && c.s===2);
  chk('8e · el Excel: una fila por renglón cambiado, la plata como número con formato Bs', r.nfilas===4 && r.cab && r.cab[8]==='PRECIO ANTES (Bs)' && !!pr, { cab:r.cab, fila:r.fila });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien, '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
