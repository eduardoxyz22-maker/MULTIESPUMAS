/* 🧾 QUIÉN PUSO O SACÓ EL «ENTREGADO» (10/11, dueño: «quiero ver quién lo puso o qué pasó» → «si armalo»).
   El 10/11 el 11-096 (entrega el 13/11) apareció como ENTREGADO en Mis pedidos y nadie sabía quién lo había marcado.
   Lo que esta prueba cuida (falla contra lo publicado, 2026-11-10-f: `entHistDe` no existe):
   1. Marcar ✅ desde la ficha deja un renglón adentro del pedido (`eH`) con quién (el nombre elegido en «¿Quién está usando el
      panel?»), desde dónde, el aparato, la hora y para qué día era; viaja a la planilla.
   2. Sacarlo deja otro renglón; los dos quedan.
   3. «Deshacer» no borra el renglón de haberlo puesto: suma el de haberlo sacado.
   4. El ✅ Cierre de entregas dice que fue el cierre y quién cerró.
   5. Reprogramar un pedido ✅ a otro día: «cambio de fecha».
   6. ✏️ Editar el pedido conserva el registro (`heredarMarcas`).
   7. Guardar otra cosa (sin tocar el ✅) no anota nada; un ✅ que cambió OTRA página (sin F5) tampoco se le anota a quien guarda.
   8. Sin ninguna lectura de la planilla todavía, no se anota (no se sabe si cambió).
   9. La ficha de Administración y la de Mis pedidos lo muestran.
   Reloj clavado el martes 10/11/2026 15:00 de Bolivia. Red cortada, servidor simulado (`apiPost`), datos inventados.
   Se corre:  node tests/test_entregado_quien.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(e && e.error) c=false; c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  window.ENT_HIST_PRUEBA=true;
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  /* La planilla de mentira: guarda la fila tal cual llega y le pone sello. */
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
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-11-13', oc:'11-096', vendedor:'Mirian Salazar',
    cliente:'CLIENTA DE PRUEBA', celular:'70000000', turno:'AM', zona:'Este', direccion:'Calle 1', maps:'', pagado:true, saldo:0,
    ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
    garantia:'', nota:'1986', acuenta:0, facturarA:'', nit:'', nroDia:6, verificado:false, fotos:[],
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'180x190', cant:1, codigo:'CH1221', precio:7150 },
               { desc:'ALMOHADA', medida:'50x70', cant:2, codigo:'CD1403', precio:25 }] }, o); };
  /* Arranca con la planilla leída (como en el panel de verdad, después de la primera lectura). */
  window._cargar=function(lista){ window._hoja={}; lista.forEach(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; window._hoja[r.id]=r; });
    STATE=[]; STATE=mergePending(lista.map(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; return r; })); saveMirror(); };
  window._H=function(id){ var p=findById(id); return entHistDe(p).map(function(e){ return { v:e.v, q:e.q, d:e.d, a:e.a, f:e.f||'' }; }); };
  window._Hhoja=function(id){ var r=window._hoja[id]; return r ? entHistDe(r).length : -1; };
  window._esperar=function(){ return new Promise(function(r){ setTimeout(r, 30); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-10T15:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  const espera = (ms) => page.clock.runFor(ms||400);

  console.log('\n── 1-2. ✅ desde la ficha y después sacarlo ──');
  let r = await ev(() => { _cargar([ _P({ id:'a1' }) ]);
    quienRol('logistica'); setVendedorMem('');
    showView('admin'); toggleEntregado('a1');
    return { ent:findById('a1').entregado, H:_H('a1') }; });
  await espera();
  let r2 = await ev(() => ({ hoja:window._hoja.a1 ? window._hoja.a1.entregado : null, nHoja:_Hhoja('a1'), env:window._env.length }));
  chk('marcar ✅ desde la ficha deja UN renglón: puesto, por Logística, desde la ficha, el aparato y para qué día era',
      r.ent===true && r.H.length===1 && r.H[0].v===1 && r.H[0].q==='Logística' && /ficha/.test(r.H[0].d) && /\S/.test(r.H[0].a) && r.H[0].f==='2026-11-13', r);
  chk('…y viaja a la planilla adentro del pedido', r2.hoja===true && r2.nHoja===1, r2);

  r = await ev(() => { quienRol(''); setVendedorMem('Mirian Salazar'); toggleEntregado('a1'); return { ent:findById('a1').entregado, H:_H('a1') }; });
  await espera();
  chk('sacarlo suma otro renglón (los dos quedan), con el nombre de quien lo sacó', r.ent===false && r.H.length===2 && r.H[1].v===0 && r.H[1].q==='Mirian Salazar' && r.H[0].v===1, r.H);
  r = await ev(() => ({ n:_Hhoja('a1'), ent:window._hoja.a1.entregado }));
  chk('…y la planilla tiene los dos', r.n===2 && r.ent===false, r);

  console.log('\n── 3. Deshacer ──');
  r = await ev(async () => { _cargar([ _P({ id:'d1' }) ]); window.DESH_PRUEBA=true; quienRol('logistica'); setVendedorMem('');
    quickEntregado('d1'); await _esperar();
    var b=document.querySelector('#desh button, #desh .desh-btn'); var hayBoton=!!b;
    if(b) b.click(); await _esperar();
    return { hayBoton:hayBoton, ent:findById('d1').entregado, H:_H('d1') }; });
  await espera();
  if(r.hayBoton) chk('«Deshacer» no borra el renglón de haberlo puesto: suma el de haberlo sacado (desde Deshacer)',
      r.ent===false && r.H.length===2 && r.H[0].v===1 && /Entregó/.test(r.H[0].d) && r.H[1].v===0 && /Deshacer/.test(r.H[1].d), r);
  else chk('el botón «Deshacer» apareció', false, r);

  console.log('\n── 4. ✅ Cierre de entregas ──');
  r = await ev(() => { _cargar([ _P({ id:'c1', fecha:'2026-11-10' }) ]); quienRol('logistica'); setVendedorMem('');
    var p=findById('c1'); cierreEntMarcar(p, 'Ernesto', '2026-11-10', Date.now()); persistPedido(p);
    return { H:_H('c1') }; });
  await espera();
  chk('el Cierre de entregas dice que fue el cierre y quién cerró', !!r.H && r.H.length===1 && r.H[0].v===1 && /Cierre de entregas/.test(r.H[0].d) && /Ernesto/.test(r.H[0].d), r.H);

  console.log('\n── 5. Reprogramar un pedido ✅ ──');
  r = await ev(() => { _cargar([ _P({ id:'rp', fecha:'2026-11-10', entregado:true }) ]); quienRol('admin'); setVendedorMem('');
    reprogramarPedido('rp'); REPRO.fecha='2026-11-13'; REPRO.turno='AM'; reproConfirmar();
    return { ent:findById('rp').entregado, f:findById('rp').fecha, H:_H('rp') }; });
  await espera();
  chk('moverlo a otro día le saca el ✅ y queda «cambio de fecha», por Administración', r.ent===false && r.f==='2026-11-13' && r.H.length===1 && r.H[0].v===0 && /cambio de fecha/.test(r.H[0].d) && r.H[0].q==='Administración', r);

  console.log('\n── 6. ✏️ Editar conserva el registro ──');
  r = await ev(() => { var viejos=[{ desc:'A', medida:'1', cant:1, codigo:'X1', eH:[{ v:1, t:1, q:'Ernesto', d:'ficha', a:'Windows · ab12' }] }];
    var nuevos=heredarMarcas([{ desc:'A', medida:'1', cant:1, codigo:'X1' }, { desc:'B', medida:'2', cant:3, codigo:'X2' }], viejos);
    return nuevos.map(function(x){ return (x.eH||[]).length; }); });
  chk('`heredarMarcas` pasa el registro a todos los renglones (también a uno nuevo)', JSON.stringify(r)==='[1,1]', r);

  console.log('\n── 7. Guardar otra cosa / otra página ──');
  r = await ev(async () => { _cargar([ _P({ id:'o1', entregado:true }) ]); quienRol('logistica'); setVendedorMem('');
    var p=findById('o1'); p.observaciones='otra cosa'; persistPedido(p); await _esperar();
    var a=_H('o1').length;
    /* Otra página (sin F5, no conoce `eH`) le sacó el ✅ en la planilla; acá se lee y después se guarda otra cosa. */
    var h=JSON.parse(JSON.stringify(window._hoja.o1)); h.entregado=false; h.rev=Date.now()+99; window._hoja.o1=h;
    STATE=mergePending([JSON.parse(JSON.stringify(h))]); await _esperar();
    var q=findById('o1'); q.observaciones='otra cosa más'; persistPedido(q); await _esperar();
    return { a:a, b:_H('o1').length, ent:findById('o1').entregado }; });
  chk('guardar otra cosa sin tocar el ✅ no anota nada', r.a===0, r);
  chk('un ✅ que sacó otra página sin F5 no se le anota a quien guarda después', r.b===0 && r.ent===false, r);

  console.log('\n── 7b. Un «conflicto» trae el ✅ de la planilla ──');
  r = await ev(async () => { _cargar([ _P({ id:'o2' }) ]); quienRol('logistica'); setVendedorMem('');
    /* Otra página (sin F5, no conoce `eH`) le puso el ✅ en la planilla; acá se guarda otra cosa con el sello viejo → «conflicto». */
    var h=JSON.parse(JSON.stringify(window._hoja.o2)); h.entregado=true; h.rev=Date.now()+77; window._hoja.o2=h;
    var orig=apiPost, una=true;
    apiPost=function(payload){
      if(una && payload && payload.action==='save' && payload.pedido && payload.pedido.id==='o2'){ una=false;
        return Promise.resolve({ ok:false, error:'conflicto', pedido:JSON.parse(JSON.stringify(window._hoja.o2)), ahora:Date.now() }); }
      return orig(payload); };
    var p=findById('o2'); p.observaciones='otra cosa'; persistPedido(p); await _esperar(); await _esperar();
    apiPost=orig;
    var q=findById('o2'); var ent=!!(q && q.entregado);
    if(q){ q.observaciones='otra cosa más'; persistPedido(q); await _esperar(); }
    return { ent:ent, b:_H('o2').length, srv:ENT_SRV.o2 }; });
  chk('después de un «conflicto», el ✅ que trajo la planilla no se le anota a quien guarda después', r.b===0 && r.srv===true, r);

  console.log('\n── 8. Sin lectura de la planilla / venta de tienda ──');
  r = await ev(async () => { ENT_SRV={}; ENT_PROPIO={}; STATE=[ _P({ id:'s1' }) ]; quienRol('logistica');
    toggleEntregado('s1'); await _esperar();
    _cargar([ _P({ id:'t1', ts:Date.now(), fecha:'', entregado:false, observaciones:'', estado:'', nota:'55' }) ]);
    var tienda=esVentaTienda(findById('t1'));
    return { s1:_H('s1').length, tienda:tienda, noVa:entHistNoVa(Object.assign(findById('t1'),{})) }; });
  chk('sin ninguna lectura de la planilla todavía, no se anota (no se sabe si cambió)', r.s1===0, r);

  console.log('\n── 9. Se ve en las dos fichas ──');
  r = await ev(async () => { _cargar([ _P({ id:'v1' }) ]); quienRol('logistica'); setVendedorMem(''); toggleEntregado('v1'); await _esperar();
    closeModal(); showPedidoModal('v1'); await _esperar();
    var adm=(document.querySelector('#modal .ent-hist')||{}).textContent||'';
    closeModal(); showMisModal('v1'); await _esperar();
    var mis=(document.querySelector('#modal .ent-hist')||{}).textContent||'';
    closeModal(); return { adm:adm, mis:mis }; });
  chk('la ficha de Administración dice quién lo marcó', /Quién tocó «Entregado»/.test(r.adm) && /Logística/.test(r.adm) && /Marcado entregado/.test(r.adm) && /13\/11/.test(r.adm), r.adm);
  chk('…y la ficha de Mis pedidos también', /Quién tocó «Entregado»/.test(r.mis) && /Logística/.test(r.mis), r.mis);

  chk('sin errores de página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
