/* 🕓 LA HISTORIA DEL PEDIDO (mejora 212, 14/11; dueño: «una línea de tiempo con todo lo que le pasó al pedido: cuándo se cargó, cada
   cambio de día con quién lo hizo, los pagos, los mensajes del bot, cuándo salió el camión y quién puso o sacó el ✅»).
   Lo que esta prueba cuida (falla contra lo de antes: `fhHistDe` y `pedHistDatos` no existen):
   1. 📅 Reprogramar deja un renglón adentro del pedido (`fH`): de qué día y turno a cuál, quién (el nombre elegido), desde dónde; viaja
      a la planilla y la planilla lo confirma.
   2. El botón de turno también; «↩️ Deshacer» suma otro renglón (no borra el anterior: `deshDevolver` lo saltea).
   3. Dos cambios seguidos con el guardado en el aire: el segundo sale de donde dejó el primero, no del día de la planilla.
   4. ✏️ Editar desde el formulario: el cambio de día queda, «desde el formulario del pedido», y `heredarMarcas` conserva lo de antes.
   5. La copia de la cola que se reenvía después de un F5 no lo anota dos veces.
   6. Guardar otra cosa no anota nada; un día que cambió OTRA página (sin F5) no se le anota a quien guarda después, y la historia lo dice
      como «sin nombre».
   7. Sin ninguna lectura de la planilla todavía, no se anota. Sin `FH_PRUEBA` (Playwright), ni se anota ni se dibuja.
   8. `heredarMarcas` pasa `fH` a todos los renglones.
   9. La línea de tiempo de un pedido inventado: la carga con el adelanto y Kommo, el cambio de día, el ✅ puesto y sacado, el cierre (sin
      repetir su renglón de `eH`), el pago del día de la entrega, en orden; colores (ámbar el día, rojo el ✅ sacado).
   10. El camión que salió (a mano), la respuesta del cliente al bot y el GPS que no se inventa.
   11. Se ve, cerrada, en la ficha de Administración y en la de Mis pedidos; abierta, sigue abierta al volver a dibujar la ficha.
   Reloj clavado el miércoles 18/11/2026 10:00 de Bolivia. Red cortada, servidor simulado (`apiPost`), datos inventados.
   Se corre:  node tests/test_historia_pedido.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(e && e.error) c=false; c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  window.FH_PRUEBA=true;
  CONNECTED=true; UNLOCKED=false; SERVER_AUTH='abierto';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  /* La planilla de mentira: guarda la fila tal cual llega y le pone sello. Con `_colgar`, el guardado espera a `_soltar()`. */
  window._hoja={}; window._env=[]; window._colgar=false; window._colgados=[];
  var guardar=function(payload){ var r=JSON.parse(JSON.stringify(payload.pedido)); r.rev=Date.now()+window._env.length; window._hoja[r.id]=r; window._env.push(JSON.parse(JSON.stringify(payload.pedido)));
    return { ok:true, pedido:JSON.parse(JSON.stringify(r)), ahora:Date.now() }; };
  window._soltar=function(){ var l=window._colgados; window._colgados=[]; l.forEach(function(x){ x.ok(guardar(x.payload)); }); };
  apiPost=function(payload){
    var a=payload&&payload.action;
    if(a==='save'){
      if(window._colgar) return new Promise(function(ok){ window._colgados.push({ payload:payload, ok:ok }); });
      return Promise.resolve(guardar(payload));
    }
    if(a==='list') return Promise.resolve({ ok:true, pedidos:Object.keys(window._hoja).map(function(k){ return JSON.parse(JSON.stringify(window._hoja[k])); }) });
    return Promise.resolve({ ok:true });
  };
  apiList=function(){ return apiPost({ action:'list' }); };
  window.confirm=function(){ return true; };
  window._P=function(o){ return Object.assign({ id:'p'+Math.random().toString(36).slice(2), fecha:'2026-11-19', oc:'11-142', vendedor:'Mirian Salazar',
    cliente:'CLIENTA INVENTADA', celular:'70000000', turno:'AM', zona:'Este', direccion:'Calle Inventada 1', maps:'', pagado:true, saldo:0,
    ts:Date.now(), metodoPago:'', observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
    garantia:'', nota:'1986', acuenta:0, facturarA:'', nit:'', nroDia:6, verificado:false, fotos:[],
    productos:[{ desc:'COLCHON TITANIO ICE', medida:'180x190', cant:1, codigo:'CH1221', precio:7150 },
               { desc:'ALMOHADA', medida:'50x70', cant:2, codigo:'CD1403', precio:25 }] }, o); };
  /* Arranca con la planilla leída (como en el panel de verdad, después de la primera lectura). */
  window._cargar=function(lista){ window._hoja={}; lista.forEach(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; window._hoja[r.id]=r; });
    STATE=[]; STATE=mergePending(lista.map(function(p){ var r=JSON.parse(JSON.stringify(p)); r.rev=1; return r; })); saveMirror(); };
  window._F=function(id){ var p=findById(id); return fhHistDe(p).map(function(e){ return { de:e.de, a:e.a, q:e.q, d:e.d, t:e.t }; }); };
  window._Fhoja=function(id){ var r=window._hoja[id]; return r ? fhHistDe(r).length : -1; };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms||30); }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1400, height:950 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time:new Date('2026-11-18T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error:String(e.message||e).slice(0,300) }));
  const espera = (ms) => page.clock.runFor(ms||400);

  console.log('\n── 1. 📅 Reprogramar ──');
  let r = await ev(() => { _cargar([ _P({ id:'r1' }) ]);
    quienRol('logistica'); setVendedorMem(''); showView('admin');
    reprogramarPedido('r1'); REPRO.fecha='2026-11-20'; REPRO.turno='PM'; reproConfirmar();
    return { hoy:todayStr(), f:findById('r1').fecha, F:_F('r1') }; });
  await espera();
  chk('el reloj está en el miércoles 18/11', r.hoy==='2026-11-18', r.hoy);
  chk('pasarlo al 20/11 a la tarde deja UN renglón: del 19/11 mañana al 20/11 tarde, por Logística, desde 📅 Reprogramar',
      r.f==='2026-11-20' && r.F.length===1 && r.F[0].de==='2026-11-19|AM' && r.F[0].a==='2026-11-20|PM' && r.F[0].q==='Logística' && /Reprogramar/.test(r.F[0].d), r);
  let r2 = await ev(() => ({ n:_Fhoja('r1'), f:window._hoja.r1 && window._hoja.r1.fecha, srv:FH_SRV.r1, t:_F('r1')[0].t }));
  chk('…viaja a la planilla adentro del pedido y la planilla lo confirma (`FH_SRV` con la hora del renglón)',
      r2.n===1 && r2.f==='2026-11-20' && r2.srv && r2.srv.k==='2026-11-20|PM' && r2.srv.t===r2.t, r2);

  console.log('\n── 2. El botón de turno y «Deshacer» ──');
  r = await ev(async () => { _cargar([ _P({ id:'d1' }) ]); window.DESH_PRUEBA=true; quienRol(''); setVendedorMem('Mirian Salazar');
    cambiarTurno('d1', 'PM'); await _esperar();
    var b=document.querySelector('#desh button, #desh .desh-btn'), hay=!!b;
    if(b) b.click(); await _esperar(); window.DESH_PRUEBA=false;
    closeModal();
    return { hay:hay, t:findById('d1').turno, F:_F('d1') }; });
  await espera();
  chk('el botón de turno anota «a la tarde», con el nombre elegido', r.F.length>=1 && r.F[0].de==='2026-11-19|AM' && r.F[0].a==='2026-11-19|PM' && r.F[0].q==='Mirian Salazar' && /turno/.test(r.F[0].d), r.F);
  if(r.hay) chk('«↩️ Deshacer» suma otro renglón (de la tarde a la mañana) y el primero queda', r.t==='AM' && r.F.length===2 && r.F[1].de==='2026-11-19|PM' && r.F[1].a==='2026-11-19|AM' && /Deshacer/.test(r.F[1].d), r);
  else chk('el botón «Deshacer» apareció', false, r);

  console.log('\n── 3. Dos cambios con el guardado en el aire ──');
  r = await ev(async () => { _cargar([ _P({ id:'c1' }) ]); quienRol('admin'); setVendedorMem(''); window._colgar=true;
    cambiarTurno('c1', 'PM'); await _esperar();
    reprogramarPedido('c1'); REPRO.fecha='2026-11-20'; REPRO.turno='AM'; reproConfirmar(); await _esperar();
    var antes=_F('c1');
    window._colgar=false; window._soltar(); await _esperar(60); window._soltar(); await _esperar(60);
    closeModal();
    return { antes:antes, despues:_F('c1'), hoja:_Fhoja('c1'), f:window._hoja.c1.fecha, tu:window._hoja.c1.turno }; });
  await espera();
  chk('el segundo sale de donde dejó el primero (19/11 tarde → 20/11 mañana), no del día de la planilla',
      r.antes.length===2 && r.antes[0].a==='2026-11-19|PM' && r.antes[1].de==='2026-11-19|PM' && r.antes[1].a==='2026-11-20|AM' && r.antes[1].q==='Administración', r.antes);
  chk('…y al confirmar la planilla no se suma ninguno más', r.despues.length===2 && r.hoja===2 && r.f==='2026-11-20' && r.tu==='AM', r);

  console.log('\n── 4. ✏️ Editar desde el formulario ──');
  r = await ev(async () => { _cargar([ _P({ id:'e1', pagado:false, saldo:0, productos:[{ desc:'COLCHON TITANIO ICE', medida:'180x190', cant:1, codigo:'CH1221', precio:7150,
      fH:[{ t:Date.now()-86400000, de:'2026-11-18|AM', a:'2026-11-19|AM', q:'Logística', d:'📅 Reprogramar' }] }] }) ]);
    quienRol(''); setVendedorMem('Mirian Salazar');
    showView('form'); editPedido('e1'); await _esperar(250);
    document.getElementById('f-fecha').value='2026-11-20'; segSet('f-turno','AM');
    submitPedido(); await _esperar(700);
    return { f:findById('e1').fecha, F:_F('e1'), hoja:_Fhoja('e1') }; });
  await espera(800);
  chk('cambiar el día en ✏️ Editar anota «desde el formulario del pedido», con el nombre elegido, y conserva el renglón de antes',
      r.f==='2026-11-20' && r.F.length===2 && r.F[0].a==='2026-11-19|AM' && r.F[1].de==='2026-11-19|AM' && r.F[1].a==='2026-11-20|AM' && r.F[1].q==='Mirian Salazar' && /formulario/.test(r.F[1].d), r);
  chk('…y eso es lo que llega a la planilla', r.hoja===2, r.hoja);

  console.log('\n── 5. La cola reenviada después de un F5 ──');
  r = await ev(async () => { _cargar([ _P({ id:'q1' }) ]); quienRol('logistica'); setVendedorMem('');
    var copia=JSON.parse(JSON.stringify(findById('q1'))); copia.fecha='2026-11-20';
    copia.productos.forEach(function(x){ x.fH=[{ t:Date.now()-60000, de:'2026-11-19|AM', a:'2026-11-20|AM', q:'Mirian Salazar', d:'formulario del pedido' }]; });
    var srv=JSON.parse(JSON.stringify(FH_SRV.q1));
    await apiSave(copia); await _esperar();
    return { srv:srv, n:fhHistDe(copia).length, hoja:_Fhoja('q1') }; });
  chk('un renglón que la planilla todavía no tiene (de este aparato, antes del F5) no se anota dos veces', r.srv && r.srv.t===0 && r.n===1 && r.hoja===1, r);

  console.log('\n── 6. Guardar otra cosa / otra página sin F5 ──');
  r = await ev(async () => { _cargar([ _P({ id:'o1' }) ]); quienRol('logistica'); setVendedorMem('');
    var p=findById('o1'); p.observaciones='otra cosa'; persistPedido(p); await _esperar();
    var a=_F('o1').length;
    reprogramarPedido('o1'); REPRO.fecha='2026-11-20'; REPRO.turno='AM'; reproConfirmar(); await _esperar(); closeModal();
    /* Otra página (sin F5, no conoce `fH`) lo pasó al sábado 21/11 en la planilla; acá se lee y después se guarda otra cosa. */
    var h=JSON.parse(JSON.stringify(window._hoja.o1)); h.fecha='2026-11-21'; h.rev=Date.now()+99; window._hoja.o1=h;
    STATE=mergePending([JSON.parse(JSON.stringify(h))]); await _esperar();
    var q=findById('o1'); q.observaciones='otra cosa más'; persistPedido(q); await _esperar();
    var b=_F('o1').length, fin=pedHistDatos(findById('o1')).slice(-1)[0];
    /* Y después alguien de acá lo pasa al lunes 23/11 a la tarde: el renglón sale del sábado, y el hueco queda «sin nombre». */
    quienRol(''); setVendedorMem('Isabel Robledo');
    reprogramarPedido('o1'); REPRO.fecha='2026-11-23'; REPRO.turno='PM'; reproConfirmar(); await _esperar(); closeModal();
    var F=_F('o1'), D=pedHistDatos(findById('o1'));
    return { a:a, b:b, fin:fin && { k:fin.k, html:fin.html }, F:F, kinds:D.map(function(e){ return e.k; }), raro:D.filter(function(e){ return e.k==='raro'; }).map(function(e){ return e.html; }) }; });
  chk('guardar otra cosa sin tocar el día no anota nada', r.a===0, r);
  chk('un día que cambió otra página sin F5 no se le anota a quien guarda después', r.b===1, r);
  chk('…y la historia lo dice al final, sin nombre', r.fin && r.fin.k==='raro' && /21\/11/.test(r.fin.html) && /sin actualizar/.test(r.fin.html), r.fin);
  chk('el cambio siguiente sale del sábado 21/11 (lo que dice la planilla), por Isabel',
      r.F.length===2 && r.F[1].de==='2026-11-21|AM' && r.F[1].a==='2026-11-23|PM' && r.F[1].q==='Isabel Robledo', r.F);
  chk('…y el hueco del medio queda como «lo pasaron al 21/11… no dejó nombre», justo antes', JSON.stringify(r.kinds.slice(1))==='["fecha","raro","fecha"]' &&
      r.raro.length===1 && /Lo pasaron al 21\/11/.test(r.raro[0]) && /estaba para el 20\/11/.test(r.raro[0]), r);

  console.log('\n── 7. Sin lectura de la planilla / sin FH_PRUEBA ──');
  r = await ev(async () => { FH_SRV={}; STATE=[ _P({ id:'s1' }) ]; quienRol('logistica');
    reprogramarPedido('s1'); REPRO.fecha='2026-11-20'; REPRO.turno='AM'; reproConfirmar(); await _esperar(); closeModal();
    return { f:findById('s1').fecha, n:_F('s1').length }; });
  chk('sin ninguna lectura de la planilla todavía, no se anota (no se sabe cómo estaba)', r.f==='2026-11-20' && r.n===0, r);
  r = await ev(async () => { window.FH_PRUEBA=false; _cargar([ _P({ id:'n1' }) ]); quienRol('logistica');
    reprogramarPedido('n1'); REPRO.fecha='2026-11-20'; REPRO.turno='AM'; reproConfirmar(); await _esperar(); closeModal();
    var n=fhHistDe(findById('n1')).length;
    showPedidoModal('n1'); await _esperar(); var adm=!!document.querySelector('#modal details.phx'); closeModal();
    window.FH_PRUEBA=true;
    return { f:findById('n1').fecha, n:n, adm:adm }; });
  chk('en Playwright sin `FH_PRUEBA` no se anota ni se dibuja (las pruebas de siempre siguen iguales)', r.f==='2026-11-20' && r.n===0 && r.adm===false, r);

  console.log('\n── 8. `heredarMarcas` ──');
  r = await ev(() => { var viejos=[{ desc:'A', medida:'1', cant:1, codigo:'X1', fH:[{ t:1, de:'2026-11-19|AM', a:'2026-11-20|PM', q:'Ernesto', d:'📅 Reprogramar' }] }];
    var nuevos=heredarMarcas([{ desc:'A', medida:'1', cant:1, codigo:'X1' }, { desc:'B', medida:'2', cant:3, codigo:'X2' }], viejos);
    return nuevos.map(function(x){ return (x.fH||[]).length; }); });
  chk('pasa `fH` a todos los renglones (también a uno nuevo)', JSON.stringify(r)==='[1,1]', r);

  console.log('\n── 9. La línea de tiempo de un pedido inventado ──');
  r = await ev(() => {
    window._h1=function(){
    var T=function(s){ return Date.parse(s+':00-04:00'); };
    var fH=[{ t:T('2026-11-15T18:05'), de:'2026-11-16|AM', a:'2026-11-17|PM', q:'Logística', d:'📅 Reprogramar' }];
    var eH=[{ v:1, t:T('2026-11-16T09:00'), q:'Mirian Salazar', d:'ficha (botón Entregado)', a:'Windows · ab12' },
            { v:0, t:T('2026-11-16T09:05'), q:'Logística', d:'Administración (botón Entregó)', a:'Windows · cd34' },
            { v:1, t:T('2026-11-17T19:02'), q:'Ernesto', d:'✅ Cierre de entregas (cierra Ernesto)', a:'Windows · cd34' }];
    var pr=function(o){ return Object.assign({ fH:fH, eH:eH, eF:'2026-11-17', eT:T('2026-11-17T19:02'), eQ:'Ernesto', klead:'987' }, o); };
    _cargar([ _P({ id:'h1', ts:T('2026-11-14T15:42'), vendedor:'Isabel Robledo', fecha:'2026-11-17', turno:'PM', entregado:true, pagado:true,
      acuenta:500, metodoPago:'~QR BISA 500 @2026-11-14 #1986 + Efectivo 1000 @2026-11-17 #2001 >Omar',
      productos:[ pr({ desc:'COLCHON TITANIO ICE', medida:'180x190', cant:1, codigo:'CH1221', precio:1500 }) ] }) ]);
    };
    _h1();
    var D=pedHistDatos(findById('h1'));
    return { kinds:D.map(function(e){ return e.k; }), txt:D.map(function(e){ return phxCuando(e)+' '+e.html.replace(/<[^>]+>/g,''); }) }; });
  chk('en orden: la carga, el cambio de día, el ✅ puesto, el ✅ sacado, el cierre y el pago del día de la entrega',
      JSON.stringify(r.kinds)==='["carga","fecha","ent","sacado","ent","pago"]', r);
  const T9=r.txt||[];
  chk('la carga: cuándo, quién, para qué día (el de antes del cambio), el adelanto y que vino de Kommo',
      /^14\/11 15:42 Lo cargó Isabel Robledo para el 16\/11 🌅/.test(T9[0]||'') && /Bs 500 a cuenta \(QR BISA\)/.test(T9[0]||'') && /Kommo/.test(T9[0]||''), T9[0]);
  chk('el cambio de día: «Logística lo pasó al 17/11 🌆 (estaba para el 16/11 🌅) · desde 📅 Reprogramar»',
      /^15\/11 18:05 Logística lo pasó al 17\/11 🌆 \(estaba para el 16\/11 🌅\) · desde 📅 Reprogramar/.test(T9[1]||''), T9[1]);
  chk('quién puso y quién sacó el ✅', /^16\/11 09:00 Mirian Salazar lo marcó entregado/.test(T9[2]||'') && /^16\/11 09:05 Logística le sacó el ✅/.test(T9[3]||''), [T9[2], T9[3]]);
  chk('el cierre de entregas, una sola vez (su renglón de `eH` no se repite)', /^17\/11 19:02 Entregado · cierre de Ernesto/.test(T9[4]||'') && T9.filter(function(t){ return /19:02/.test(t); }).length===1, T9[4]);
  chk('el pago del día de la entrega, sin hora, con quién lo recibió', /^17\/11 Pago · Bs 1\.?000 · Efectivo · nota 2001 · recibió Omar/.test(T9[5]||''), T9[5]);

  console.log('\n── 10. El camión que salió, el bot, lo que no se sabe ──');
  r = await ev(() => {
    _cargar([ _P({ id:'k1', fecha:'2026-11-18', turno:'AM', vehiculo:'Carry', chofer:'Omar', ts:Date.parse('2026-11-17T11:00:00-04:00') }),
              _P({ id:'k2', fecha:'2026-11-19', turno:'AM', ts:Date.parse('2026-11-01T11:00:00-04:00'), entregado:true }) ]);
    CARGA_CHK[cargaChkKey('2026-11-18', 'Carry', CARGA_SALIO)+'|09:40']=true;
    WA_RESP=[{ id:'k1', w:'w1', t:'18/11 08:15', txt:'¿A qué hora llega?', resp:'Entre las 9:00 y las 12:00', at:'' }];
    var D1=pedHistDatos(findById('k1')), D2=pedHistDatos(findById('k2'));
    var out={ k1:D1.map(function(e){ return e.k+' '+phxCuando(e)+' '+e.html.replace(/<[^>]+>/g,''); }), k2:D2.map(function(e){ return e.k+' '+phxCuando(e)+' '+e.html.replace(/<[^>]+>/g,''); }) };
    WA_RESP=[]; delete CARGA_CHK[cargaChkKey('2026-11-18', 'Carry', CARGA_SALIO)+'|09:40'];
    return out; });
  chk('la respuesta del cliente al bot va en su hora, con lo que le contestó', r.k1 && /^bot 18\/11 08:15 El cliente le escribió al bot: «¿A qué hora llega\?» · 🤖 le contestó/.test(r.k1[1]||''), r.k1);
  chk('…y después, cuándo salió el camión de ese día (marcado a mano, sin «lo dice el GPS»)', r.k1 && /^salio 18\/11 09:40 Salió el camión Carry \(Omar\)$/.test(r.k1[2]||''), r.k1);
  chk('un pedido de antes de que se anotara: la carga sin inventar para qué día, y el ✅ sin nombre «no quedó anotado»',
      r.k2 && /^carga 01\/11 11:00 Lo cargó Mirian Salazar$/.test(r.k2[0]||'') && /^raro sin hora Figura entregado: no quedó anotado quién lo marcó/.test(r.k2[1]||''), r.k2);

  console.log('\n── 11. Se ve en las dos fichas ──');
  r = await ev(async () => { _h1(); quienRol('logistica'); setVendedorMem('');
    showPedidoModal('h1'); await _esperar();
    var d=document.querySelector('#modal details.phx');
    var adm={ hay:!!d, abierta:!!(d && d.open), sum:d ? d.querySelector('summary').textContent : '', lis:d ? d.querySelectorAll('li.phx-i').length : 0,
      f:d ? d.querySelectorAll('li.phx-f').length : 0, r:d ? d.querySelectorAll('li.phx-r').length : 0, enFicha:!!(d && d.closest('.fl-b')) };
    if(d){ d.open=true; await _esperar(); }
    reabrirFicha('h1'); await _esperar();
    var d2=document.querySelector('#modal details.phx'), sigue=!!(d2 && d2.open);
    if(d2){ d2.open=false; await _esperar(); }
    closeModal();
    showMisModal('h1'); await _esperar();
    var m=document.querySelector('#modal details.phx');
    var mis={ hay:!!m, abierta:!!(m && m.open), sum:m ? m.querySelector('summary').textContent : '' };
    closeModal();
    return { adm:adm, sigue:sigue, mis:mis }; });
  chk('la ficha de Administración la trae cerrada: «🕓 Historia del pedido (6)», ámbar el cambio de día y rojo el ✅ sacado',
      r.adm && r.adm.hay && !r.adm.abierta && /🕓 Historia del pedido \(6\)/.test(r.adm.sum) && r.adm.lis===6 && r.adm.f===1 && r.adm.r===1 && r.adm.enFicha, r.adm);
  chk('abierta, sigue abierta al volver a dibujar la ficha del mismo pedido', r.sigue===true, r);
  chk('…y la ficha de Mis pedidos también la trae, cerrada', r.mis && r.mis.hay && !r.mis.abierta && /Historia del pedido \(6\)/.test(r.mis.sum), r.mis);

  chk('sin errores de página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
