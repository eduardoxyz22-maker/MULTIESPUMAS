/* 🏬🎡 LA TIENDA DEL MALL: EL MOSTRADOR, LA RUEDA Y EL RECONOCIMIENTO DEL DÍA (14/11, mejoras 252, 253 y 273).

   LO QUE CUIDA (servidor de mentira que guarda los toques por `id`; SOLO nombres y datos inventados; reloj clavado el sábado 14/11/2026):
   1. La rueda (`mallEstado`, pura): «Llegué» en orden de llegada, salvo que AYER en su turno uno haya tenido menos clientes; «Atiendo» pasa
      al final y el otro es el siguiente; con los dos atendiendo, nadie «le toca» y el primero que se libera toma el próximo, y el siguiente
      es para el que no atendió; «Es mío» no mueve la fila ni cuenta como cliente de la rueda; «Pausa»/«Volví» (al volver, el próximo es
      suyo); «Me fui» atendiendo = termina su cliente y recién ahí sale; cambio de turno con «Llegué» a las 15:00.
   2. `mallResumenDia`: atendidos, compraron, miraron (con motivo y medida), anotados, por hora, por vendedor y por turno; «Es mío» aparte.
   3. `mallParejo`: los del MISMO turno; ≤ 1 de diferencia = parejo; si no, dice por qué (la pausa larga) y quién arranca mañana.
   4. La barra del mostrador: solo en la compu del mall o con un vendedor del mall (y nunca en Playwright sin MALL_PRUEBA); a quién le
      toca, los botones, «Solo miró» con el motivo y la medida, el conteo de hoy; con un servidor viejo dice que falta y no anota nada.
   5. La cola durable: el toque queda en el aparato ANTES de mandarse; sin red no se pierde y se ve igual; un reintento no duplica (aunque
      se haya perdido la respuesta); la confirmación saca SOLO lo mandado.
   6. El toque automático: una venta NUEVA de un vendedor del mall (o desde la compu del mall) manda sola `fin` + `compro` + `ref` y cierra
      su atención; una edición, otro vendedor fuera del mall o una ATC, no.
   7. «Tu día» de un vendedor del mall: «Hoy atendiste N · compraron M (x %) · tu tienda: y %».
   8. El reconocimiento (273) en «Tu día» de todos: el que más vendió HOY (cargado hoy, sin Eduardo/ROHO/internos) «va ganando», desde las
      20:30 «del día», a la mañana también el de ayer; la mejor conversión con ≥ 5 clientes; la plata de otros solo con la contraseña.
   9. «🔄 ¿Fue parejo?» abre el cuadro de hoy y del día anterior.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_mall_rueda.js
   (PEDIDOS=… contra otra página; CAPTURAS=<carpeta> deja las capturas de la barra y del «¿Fue parejo?» en compu y celular) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAPTURAS = process.env.CAPTURAS || '';
const HOY='2026-11-14';
const hora = (hhmm, dia) => new Date((dia||HOY)+'T'+hhmm+':00-04:00');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=false; SERVER_VER='2026-11-14-b';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_mall_cola'); localStorage.removeItem('me_mall_aparato'); localStorage.removeItem('me_mis_vendedor'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  /* la tienda del mall con cuatro vendedores INVENTADOS */
  ['Ana Prueba','Beto Prueba','Caro Prueba','Dani Prueba'].forEach(function(v){ VENDEDORES.push(v); });
  VENDEDOR_SUCURSAL.unshift([/PRUEBA/i, 'Ventura Mall']);
  /* el servidor de mentira: guarda por id (idempotente), lee por día */
  window._srv={ toques:{}, envios:[], lecturas:0, red:'ok', hold:null };
  window._L=[]; window._saves=0;
  var resp=function(pl){
    if(pl.action==='mallToque'){
      var n=0, dup=0;
      pl.toques.forEach(function(t){ if(_srv.toques[t.id]) dup++; else{ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts), hora:hhmmDeTs(t.ts) }); n++; } });
      _srv.envios.push(pl.toques.map(function(t){ return t.id; }));
      if(_srv.red==='pierde') return Promise.reject(new Error('Failed to fetch'));   // guardó, pero la respuesta se perdió
      return Promise.resolve({ ok:true, n:n, dup:dup });
    }
    if(pl.action==='mallLeer'){
      _srv.lecturas++;
      var L=Object.keys(_srv.toques).map(function(k){ return _srv.toques[k]; }).filter(function(t){ return t.dia>=pl.desde && t.dia<=pl.hasta; });
      return Promise.resolve({ ok:true, toques:JSON.parse(JSON.stringify(L)) });
    }
    if(pl.action==='list') return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) });
    return Promise.resolve({ ok:true });
  };
  apiPost=function(pl){
    if((pl.action==='mallToque' || pl.action==='mallLeer') && _srv.red==='cae') return Promise.reject(new Error('Failed to fetch'));
    if(pl.action==='mallToque' && _srv.hold){ var h=_srv.hold; return new Promise(function(ok){ h.push(function(){ ok(resp(pl)); }); }).then(function(p){ return p; }); }
    return resp(pl);
  };
  apiSave=function(rec){ window._saves++; var g=JSON.parse(JSON.stringify(rec)); window._L=window._L.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  /* toques armados a mano para las funciones puras */
  window._n=0;
  window._ts=function(hhmm, dia){ return new Date((dia||'2026-11-14')+'T'+hhmm+':00-04:00').getTime(); };
  window._T=function(k, v, hhmm, x, dia){ var ts=_ts(hhmm, dia); _n++; return Object.assign({ id:'t'+ts+'_'+('00'+_n).slice(-3), ts:ts, tienda:'Ventura Mall', v:v, k:k, r:'', m:'', ref:'', ap:'PRUEBA' }, x||{}); };
  window._E=function(L, hhmm){ var e=mallEstado(L, _ts(hhmm)); return { turno:e.turno, fila:e.fila.map(function(f){ return f.v.split(' ')[0]+':'+f.estado; }).join(' '), le:e.leToca ? e.leToca.split(' ')[0] : null, ocup:!!e.ocupados }; };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._barra=function(){ var b=document.getElementById('mall-barra'); return { vis:!!b && !b.hidden && b.offsetParent!==null, txt:b ? b.innerText.replace(/\s+/g,' ').trim() : '' }; };
  window._cola=function(){ return mallCola().map(function(t){ return t.k+':'+t.v.split(' ')[0]+(t.r?(':'+t.r):'')+(t.m?(':'+t.m):''); }); };
  window._srvL=function(){ return Object.keys(_srv.toques).map(function(k){ return _srv.toques[k]; }).sort(function(a,b){ return a.ts-b.ts; }).map(function(t){ return t.k+':'+t.v.split(' ')[0]+(t.r?(':'+t.r):'')+(t.m?(':'+t.m):'')+(t.medida?(':'+t.medida):''); }); };
  window._clic=function(sel, txt){ var b=[].filter.call(document.querySelectorAll(sel), function(x){ return x.textContent.indexOf(txt)>=0; })[0]; if(!b) return false; b.click(); return true; };
  window._clicV=function(v, txt){ var c=[].filter.call(document.querySelectorAll('#mall-barra .mall-v'), function(x){ return x.getAttribute('data-v')===v; })[0]; if(!c) return false;
    var b=[].filter.call(c.querySelectorAll('button'), function(x){ return x.textContent.indexOf(txt)>=0; })[0]; if(!b || b.disabled) return false; b.click(); return true; };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, h, hh) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h||900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    await page.clock.setFixedTime(hora(hh||'09:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1280);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,300) }; } };
  const a = async (hhmm, dia) => page.clock.setFixedTime(hora(hhmm, dia));

  /* ============ 1 · LA RUEDA (pura) ============ */
  let r = await ev(() => {
    var L=[], o={};
    L.push(_T('llegue','Ana Prueba','09:00')); L.push(_T('llegue','Beto Prueba','09:05'));
    o.a=_E(L,'09:06');
    L.push(_T('atiendo','Ana Prueba','09:10')); o.b=_E(L,'09:11');
    L.push(_T('atiendo','Beto Prueba','09:12')); o.c=_E(L,'09:13');
    L.push(_T('fin','Beto Prueba','09:20',{ r:'anoto' })); o.d=_E(L,'09:21');                 // Beto se libera primero → toma el próximo
    L.push(_T('atiendo','Beto Prueba','09:22')); o.e=_E(L,'09:23');
    L.push(_T('fin','Ana Prueba','09:25',{ r:'miro', m:'precio' })); o.f=_E(L,'09:26');        // el siguiente es para Ana (no atendió)
    L.push(_T('fin','Beto Prueba','09:30',{ r:'compro', ref:'p1' })); o.g=_E(L,'09:31');
    L.push(_T('esmio','Ana Prueba','09:31')); o.h=_E(L,'09:32');                              // Es mío: no pierde el lugar
    L.push(_T('atiendo','Beto Prueba','09:33')); o.i=_E(L,'09:34');
    L.push(_T('fin','Ana Prueba','09:40',{ r:'compro', ref:'p2' })); o.j=_E(L,'09:41');
    L.push(_T('pausa','Ana Prueba','09:41')); o.k=_E(L,'09:42');
    L.push(_T('fin','Beto Prueba','09:45',{ r:'miro', m:'medida', medida:'140x190' })); o.l=_E(L,'09:46');
    L.push(_T('atiendo','Beto Prueba','09:50')); L.push(_T('fin','Beto Prueba','09:58',{ r:'anoto' }));
    L.push(_T('atiendo','Beto Prueba','10:00'));                                               // Ana en pausa: Beto atiende a todos
    L.push(_T('volvi','Ana Prueba','10:20')); o.m=_E(L,'10:21');                              // al volver, el próximo es para Ana
    L.push(_T('fin','Beto Prueba','10:30',{ r:'miro', m:'paseaba' })); o.n=_E(L,'10:31');
    L.push(_T('miro','Ana Prueba','10:35',{ m:'demora' })); o.o=_E(L,'10:36');                 // «Solo miró» suelto: un cliente de la rueda
    window._LA=L.slice();
    return o;
  });
  chk('1a · «Llegué»: en orden de llegada, le toca al primero', r.a.fila==='Ana:libre Beto:libre' && r.a.le==='Ana' && r.a.turno==='am', r.a);
  chk('1b · «Atiendo»: Ana atiende y pasa al final; el siguiente es Beto', r.b.fila==='Beto:libre Ana:atiende' && r.b.le==='Beto', r.b);
  chk('1c · los dos atendiendo: nadie «le toca» (el próximo lo toma el primero que se libere)', r.c.le===null && r.c.ocup===true && r.c.fila==='Ana:atiende Beto:atiende', r.c);
  chk('1d · Beto se libera primero → el próximo cliente es de Beto', r.d.le==='Beto', r.d);
  chk('1e · …y cuando Ana se libera, el siguiente es para Ana (la que no atendió)', r.f.le==='Ana' && r.f.fila==='Ana:libre Beto:atiende', r.f);
  chk('1f · con los dos libres, sigue el orden: Ana', r.g.le==='Ana' && r.g.fila==='Ana:libre Beto:libre', r.g);
  chk('1g · «Es mío»: Ana atiende fuera de la rueda, la fila no se mueve y el próximo es Beto', r.h.fila==='Ana:esmio Beto:libre' && r.h.le==='Beto', r.h);
  chk('1h · al terminar su «Es mío», Ana no perdió el lugar: le toca a ella', r.j.fila==='Ana:libre Beto:atiende' && r.j.le==='Ana', r.j);
  chk('1i · «Pausa»: con Ana en pausa, el próximo es Beto', r.k.fila==='Ana:pausa Beto:atiende' && r.k.le===null && r.l.le==='Beto', [r.k, r.l]);
  chk('1j · «Volví»: Ana vuelve y el próximo es para ella (pasa al frente)', r.m.fila==='Ana:libre Beto:atiende' && r.m.le==='Ana', r.m);
  chk('1k · «Solo miró» suelto (sin «Atiendo»): cuenta como su cliente y la pasa al final', r.o.fila==='Beto:libre Ana:libre' && r.o.le==='Beto', [r.n, r.o]);

  /* ayer en su turno: arranca primero el que tuvo menos */
  r = await ev(() => {
    var Y=[_T('llegue','Ana Prueba','09:00',null,'2026-11-13'), _T('llegue','Beto Prueba','09:02',null,'2026-11-13')];
    for(var i=0;i<5;i++) Y.push(_T('miro','Ana Prueba','10:0'+i,{ m:'precio' },'2026-11-13'));
    for(var j=0;j<3;j++) Y.push(_T('miro','Beto Prueba','11:0'+j,{ m:'precio' },'2026-11-13'));
    var H=[_T('llegue','Ana Prueba','09:00'), _T('llegue','Beto Prueba','09:05')];
    var o={ conAyer:_E(Y.concat(H),'09:06'), sinAyer:_E(H,'09:06') };
    var H2=H.concat([_T('atiendo','Beto Prueba','09:10')]); o.arranco=_E(Y.concat(H2),'09:11');
    var H3=H2.concat([_T('llegue','Caro Prueba','09:15')]); o.tarde=_E(Y.concat(H3),'09:16');   // llegó con la rueda andando: al final
    return o;
  });
  chk('1l · ayer Ana tuvo 5 clientes y Beto 3: hoy arranca Beto aunque llegó segundo', r.conAyer.fila==='Beto:libre Ana:libre' && r.conAyer.le==='Beto', r.conAyer);
  chk('1m · sin datos de ayer, arranca el que llegó primero', r.sinAyer.le==='Ana', r.sinAyer);
  chk('1n · el que llega con la rueda andando entra al final', r.tarde.fila==='Ana:libre Beto:atiende Caro:libre' && r.tarde.le==='Ana', r.tarde);

  /* cambio de turno */
  r = await ev(() => {
    var L=[_T('llegue','Ana Prueba','09:00'), _T('llegue','Beto Prueba','09:05'),
           _T('atiendo','Beto Prueba','14:50'), _T('mefui','Beto Prueba','14:58'), _T('mefui','Ana Prueba','15:00'),
           _T('llegue','Caro Prueba','15:01'), _T('llegue','Dani Prueba','15:03')];
    var o={ medio:_E(L,'15:04') };
    L.push(_T('fin','Beto Prueba','15:06',{ r:'anoto' })); o.fin=_E(L,'15:07');
    var R=mallResumenDia('2026-11-14','Ventura Mall', L);
    o.beto=R.porVend['Beto Prueba'] && [R.porVend['Beto Prueba'].at, R.porVend['Beto Prueba'].turno, R.porTurno.am.atendidos, R.porTurno.pm.atendidos];
    var e=mallEstado(L, _ts('15:07')); o.turnos=e.fila.map(function(f){ return f.turno; }).join(',');
    return o;
  });
  chk('1o · «Me fui» atendiendo: Beto termina a su cliente (sigue en la fila, «se va al terminar»); Ana se fue', r.medio.fila==='Beto:atiende Caro:libre Dani:libre' && r.medio.le==='Caro' && r.medio.turno==='pm', r.medio);
  chk('1p · al terminar, Beto sale; quedan los de la tarde, que entraron con «Llegué» a las 15:00', r.fin.fila==='Caro:libre Dani:libre' && r.turnos==='pm,pm', [r.fin, r.turnos]);
  chk('1q · el cliente que Beto terminó a las 15:06 cuenta para Beto, en la mañana', JSON.stringify(r.beto)==='[1,"am",1,0]', r.beto);

  /* ============ 2 · EL RESUMEN DEL DÍA ============ */
  r = await ev(() => { var R=mallResumenDia('2026-11-14','Ventura Mall', _LA); return JSON.parse(JSON.stringify(R)); });
  const RA=r, an=r.porVend && r.porVend['Ana Prueba'], be=r.porVend && r.porVend['Beto Prueba'];
  chk('2a · atendidos de la rueda 7 (Ana 2, Beto 5), compraron 1, miraron 4, anotaron 2 — el «Es mío» de Ana NO cuenta', RA.atendidos===7 && RA.compraron===1 && RA.miraron===4 && RA.anotaron===2, [RA.atendidos, RA.compraron, RA.miraron, RA.anotaron]);
  chk('2b · por vendedor: Ana 2 clientes (miró 2) + 1 «es mío» que compró; Beto 5 (compró 1, anotó 2)', an && an.at===2 && an.co===0 && an.miro===2 && an.esmio===1 && an.esmioCo===1 && be && be.at===5 && be.co===1 && be.anoto===2, [an, be]);
  chk('2c · los motivos: precio, medida (140x190), paseaba, demora; y el turno de cada uno (mañana)', RA.motivos.precio===1 && RA.motivos.medida===1 && RA.motivos.paseaba===1 && RA.motivos.demora===1 && RA.medidas['140x190']===1 && an.turno==='am' && be.turno==='am', [RA.motivos, RA.medidas]);
  chk('2d · la pausa de Ana: 39 minutos', an.pausaMin===39, an.pausaMin);
  chk('2e · por hora (por cuándo empezó la atención): 9 h 5 clientes (1 compró) · 10 h 2', JSON.stringify(RA.porHora)==='[{"h":9,"at":5,"co":1},{"h":10,"at":2,"co":0}]', RA.porHora);
  chk('2f · por turno: todo en la mañana, nada en la tarde', RA.porTurno.am.atendidos===7 && RA.porTurno.pm.atendidos===0 && RA.porTurno.am.porVend['Ana Prueba'].at===2, [RA.porTurno.am.atendidos, RA.porTurno.pm.atendidos]);

  /* ============ 3 · ¿FUE PAREJO? ============ */
  r = await ev(() => {
    var o={};
    o.dis=mallParejo(mallResumenDia('2026-11-14','Ventura Mall', _LA)).am;
    var L=[_T('llegue','Ana Prueba','09:00'), _T('llegue','Beto Prueba','09:05'), _T('miro','Ana Prueba','09:10',{m:'precio'}), _T('miro','Beto Prueba','09:11',{m:'precio'}),
           _T('miro','Ana Prueba','09:12',{m:'precio'}), _T('llegue','Caro Prueba','15:10'), _T('llegue','Dani Prueba','15:12'), _T('miro','Caro Prueba','15:20',{m:'vuelve'})];
    for(var i=0;i<4;i++) L.push(_T('miro','Dani Prueba','16:0'+i,{m:'vuelve'}));
    var P=mallParejo(mallResumenDia('2026-11-14','Ventura Mall', L)); o.am=P.am; o.pm=P.pm;
    o.solo=mallParejo(mallResumenDia('2026-11-14','Ventura Mall', [_T('llegue','Ana Prueba','09:00'), _T('miro','Ana Prueba','09:10')])).am;
    return o;
  });
  chk('3a · Beto 5 y Ana 2: «no fue parejo», por la pausa larga de Ana, y mañana arranca primero Ana', r.dis.ok===false && r.dis.dif===3 && /estuvo 39 min en pausa/.test(r.dis.porque) && /Mañana arranca primero Ana Prueba/.test(r.dis.porque) && r.dis.arranca==='Ana Prueba', r.dis);
  chk('3b · 2 y 1 en la mañana: parejo (1 de diferencia es parejo)', r.am.ok===true && r.am.dif===1 && /Parejo/.test(r.am.porque), r.am);
  chk('3c · la tarde se compara sola (Caro 1, Dani 4): no fue parejo, sin pausa larga, mañana arranca Caro', r.pm.ok===false && r.pm.dif===3 && r.pm.filas.map(f=>f.v).join()==='Dani Prueba,Caro Prueba' && /No hubo una pausa larga/.test(r.pm.porque) && /arranca primero Caro/.test(r.pm.porque), r.pm);
  chk('3d · con uno solo en el turno no hay con quién comparar', r.solo.solo===true && r.solo.ok===true, r.solo);

  /* ============ 4 · LA BARRA DEL MOSTRADOR ============ */
  r = await ev(() => { mallAparatoCambiar(); var o={ sinBandera:_barra().vis }; mallAparatoCambiar(); return o; });
  chk('4a · en Playwright, sin MALL_PRUEBA, la barra no aparece ni en la compu del mall', r.sinBandera===false, r);
  r = await ev(async () => {
    window.MALL_PRUEBA=1; window.MIS_TOP_PRUEBA=1; window.RECO_PRUEBA=1;
    var o={};
    setVendedorMem('Carola Chavez'); mallBarraPintar(); o.otra=_barra().vis;
    setVendedorMem('Ana Prueba'); mallBarraPintar(); o.vend=_barra().vis;
    setVendedorMem('Carola Chavez'); mallBarraPintar(); o.otra2=_barra().vis;
    mallAparatoCambiar(); o.ap=_barra().vis; o.btn=document.getElementById('mall-ap-btn').textContent;
    o.txt=_barra().txt;
    return o;
  });
  chk('4b · con una vendedora de otra tienda y la compu sin marcar: no hay barra', r.otra===false && r.otra2===false, r);
  chk('4c · con un vendedor del mall elegido: aparece la barra', r.vend===true, r);
  chk('4d · «🏬 Esta compu es la del mall» (Herramientas): aparece la barra aunque el vendedor sea de otra tienda', r.ap===true && /✓ Esta compu es la del mall/.test(r.btn), r.btn);
  chk('4e · sin nadie: «Nadie en la rueda» y los botones «Llegué» de los cuatro del mall', /Nadie en la rueda/.test(r.txt) && /Llegué: Ana/.test(r.txt) && /Llegué: Dani/.test(r.txt) && /0 compraron/.test(r.txt) && /0 solo miró/.test(r.txt), r.txt);

  await a('09:00'); r = await ev(async () => { _clic('#mall-barra .mall-llega button', 'Llegué: Ana'); await _esperar(80); return { cola:_cola(), srv:_srvL() }; });
  await a('09:04'); r = await ev(async () => { _clic('#mall-barra .mall-llega button', 'Llegué: Beto'); await _esperar(80); return { cola:_cola(), srv:_srvL(), b:_barra().txt }; });
  chk('4f · «Llegué»: el toque llega al servidor y la cola queda vacía; le toca a Ana', r.cola.length===0 && r.srv.join()==='llegue:Ana,llegue:Beto' && /Le toca a Ana Prueba/.test(r.b), r);
  await a('09:10'); r = await ev(async () => { var ok=_clicV('Ana Prueba','Atiendo'); await _esperar(80); var c=document.querySelector('#mall-barra .mall-v[data-v="Ana Prueba"]'); return { ok:ok, b:_barra().txt, reloj:!!(c && c.querySelector('.mall-reloj')), srv:_srvL() }; });
  chk('4g · «🙋 Atiendo»: Ana atendiendo con su reloj, le toca a Beto', r.ok && /Le toca a Beto Prueba/.test(r.b) && /Atendiendo/.test(r.b) && r.reloj && r.srv.pop()==='atiendo:Ana', r);
  await a('09:18'); r = await ev(async () => { var o={}; o.ab=_clicV('Ana Prueba','Solo miró'); await _esperar(30); o.mot=_barra().txt;
    o.me=_clic('#mall-barra .mall-v[data-v="Ana Prueba"] .mall-mot button', 'Medida'); await _esperar(30); o.med=_barra().txt;
    o.ok=_clic('#mall-barra .mall-v[data-v="Ana Prueba"] .mall-mot button', '140x190'); await _esperar(80); o.srv=_srvL(); o.b=_barra().txt; return o; });
  chk('4h · «👀 Solo miró» pregunta por qué (precio, medida, demora, paseaba, vuelve) y con «Medida», cuál', /¿Por qué no compró\?/.test(r.mot) && /Precio/.test(r.mot) && /Paseaba/.test(r.mot) && /Vuelve/.test(r.mot) && /¿Qué medida buscaba\?/.test(r.med) && /Sin decir/.test(r.med), r.med);
  chk('4i · elegido: cierra la atención de Ana como «miró · medida · 140x190» y el conteo de hoy dice 1 solo miró', r.srv.pop()==='fin:Ana:miro:medida:140x190' && /1 solo miró/.test(r.b) && !/¿Por qué no compró/.test(r.b), r);
  await a('09:20'); r = await ev(async () => { _clicV('Beto Prueba','Es mío'); await _esperar(80); return { b:_barra().txt, srv:_srvL().pop() }; });
  chk('4j · «💛 Es mío» de Beto: no mueve la rueda (le sigue tocando a Beto cuando se libere; ahora a Ana)', r.srv==='esmio:Beto' && /Le toca a Ana Prueba/.test(r.b) && /Es mío/.test(r.b), r.b);
  await a('09:25'); r = await ev(async () => { _clicV('Beto Prueba','Anotó'); await _esperar(80); return { b:_barra().txt, srv:_srvL().pop() }; });
  chk('4k · Beto termina su «Es mío» (anotó) y no perdió el lugar: le toca a Beto; «1 es mío» aparte, 0 anotados de la rueda', r.srv==='fin:Beto:anoto' && /Le toca a Beto Prueba/.test(r.b) && /1 es mío/.test(r.b) && /0 anotados/.test(r.b), r.b);
  await a('09:30'); r = await ev(async () => { _clicV('Beto Prueba','Pausa'); await _esperar(60); var o={ p:_barra().txt }; await new Promise(ok=>setTimeout(ok,10)); return o; });
  await a('09:50'); r = await ev(async () => { var o={ p:_barra().txt }; _clicV('Beto Prueba','Volví'); await _esperar(80); o.v=_barra().txt; o.srv=_srvL().slice(-2); return o; });
  chk('4l · «☕ Pausa» y «✅ Volví»: en pausa le toca a Ana; al volver, a Beto', /Le toca a Ana Prueba/.test(r.p) && /En pausa/.test(r.p) && /Le toca a Beto Prueba/.test(r.v) && r.srv.join()==='pausa:Beto,volvi:Beto', r);

  /* servidor viejo */
  r = await ev(async () => { SERVER_VER='2026-11-14-a'; mallBarraPintar(true); var b=_barra().txt, dis=[].every.call(document.querySelectorAll('#mall-barra .mall-v button'), function(x){ return x.disabled || /cargar la venta/.test(x.textContent); });
    var t=mallTocar('atiendo','Ana Prueba'), n=mallCola().length; SERVER_VER='2026-11-14-b'; mallBarraPintar(true); return { b:b, dis:dis, t:t, n:n }; });
  chk('4m · con el servidor de antes: la barra dice que falta el servidor nuevo, los botones no andan y no se anota nada', /necesita el servidor nuevo \(2026-11-14-b\)/.test(r.b) && r.dis && r.t===null && r.n===0, r);

  /* ============ 5 · LA COLA DURABLE ============ */
  await a('10:00'); r = await ev(async () => { _srv.red='cae'; _clicV('Beto Prueba','Atiendo'); await _esperar(80);
    var o={ cola:_cola(), ls:(localStorage.getItem('me_mall_cola')||'').indexOf('"atiendo"')>=0, b:_barra().txt, srv:_srvL().length }; return o; });
  chk('5a · sin red: el toque queda guardado en el aparato (localStorage) y la rueda lo muestra igual', r.cola.join()==='atiendo:Beto' && r.ls && /Le toca a Ana Prueba/.test(r.b) && /1 toque espera/.test(r.b), r);
  r = await ev(async () => { _srv.red='pierde'; await mallEnviar(); var o={ cola:_cola(), n:Object.keys(_srv.toques).length };
    _srv.red='ok'; await mallEnviar(); await mallEnviar(); o.cola2=_cola(); o.n2=Object.keys(_srv.toques).length; o.envios=_srv.envios.slice(-2).map(function(x){ return x.length; });
    var vis={}, dup=0; _srvL(); Object.keys(_srv.toques).forEach(function(k){ var t=_srv.toques[k]; var f=t.k+t.v+t.ts; if(vis[f]) dup++; vis[f]=1; }); o.dup=dup; o.b=_barra().txt; return o; });
  chk('5b · la respuesta se pierde: el servidor ya lo tenía, pero en el aparato sigue esperando', r.cola.join()==='atiendo:Beto', r);
  chk('5c · el reintento no lo duplica (mismo id) y la cola queda vacía; mandar otra vez no manda nada', r.cola2.length===0 && r.n2===r.n && r.dup===0 && !/toque espera/.test(r.b), r);
  await a('10:05');
  r = await ev(async () => { _srv.hold=[]; mallTocar('fin','Beto Prueba',{ r:'anoto' }); await _esperar(30);
    mallTocar('miro','Ana Prueba',{ m:'precio' }); await _esperar(30);   // un toque nuevo mientras viaja el primero (no sale: uno por vez)
    var o={ antes:_cola(), enVuelo:_srv.hold.length };
    var h1=_srv.hold.shift(); h1(); await _esperar(80);                   // llega la confirmación del primero; el segundo sale y queda viajando
    o.despues=_cola(); o.enVuelo2=_srv.hold.length;
    var h=_srv.hold; _srv.hold=null; h.forEach(function(f){ f(); }); await _esperar(80);
    await mallEnviar(); o.fin=_cola(); o.srv=_srvL().slice(-2); return o; });
  chk('5d · uno por vez, y la confirmación saca SOLO lo mandado: el toque que entró mientras viajaba el primero sigue en la cola hasta su confirmación',
    r.antes.join()==='fin:Beto:anoto,miro:Ana:precio' && r.enVuelo===1 && r.despues.join()==='miro:Ana:precio' && r.enVuelo2===1 && r.fin.length===0 && r.srv.join()==='fin:Beto:anoto,miro:Ana:precio', r);

  /* ============ 6 · EL TOQUE AUTOMÁTICO AL GUARDAR UNA VENTA ============ */
  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value='2026-11-16'; segSet('f-turno','AM');
    if(o.tipo){ segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value=o.vend; applyVendedorLite();
    document.getElementById('f-cliente').value='CLIENTE INVENTADO '+o.vend.split(' ')[0].toUpperCase();
    document.getElementById('f-celular').value='70000000';
    document.getElementById('f-zona').value='Sur'; document.getElementById('f-direccion').value='CALLE FALSA 123';
    var n=document.getElementById('f-nota'); if(n) n.value='4321';
    if(o.tipo==='ATC'){ segSet('f-atc-tipo','gar'); document.getElementById('f-atc-motivo').value='Hundimiento';
      document.getElementById('f-atc-detalle').value='hundido en el medio, no retoma su forma'; document.getElementById('f-atc-compra').value='2025-03-10';
      var pz=document.getElementById('f-pz-col'); if(pz) pz.checked=true; }
    var box=document.getElementById('f-productos'); box.innerHTML=''; addProdRow('TITANIO LATEX','140x190','',1,''); box.lastElementChild.querySelector('.prod-precio').value='3200';
    refreshDelButtons();
    if(o.tipo!=='ATC'){ segSet('f-pagado','NO'); document.getElementById('f-saldo').value='3200'; }
    try{ updateMetodoVisibility(); }catch(e){}
  }, o);
  const guardar = () => ev(async () => { var n0=window._saves, s0=Object.keys(_srv.toques).length; submitPedido(); await _esperar(500); try{ closeModal(); }catch(e){}
    var ult=window._L[window._L.length-1]; return { guardo:window._saves>n0, id:ult && ult.id, nuevos:Object.keys(_srv.toques).length-s0, srv:_srvL().slice(-1)[0],
      ref:(function(){ var L=Object.keys(_srv.toques).map(function(k){ return _srv.toques[k]; }).sort(function(a,b){ return a.ts-b.ts; }); var t=L[L.length-1]; return t ? t.ref : ''; })() }; });
  await a('10:30'); await ev(async () => { mallAparatoCambiar(); mallTocar('atiendo','Ana Prueba'); await _esperar(80); });   // la compu ya no es la del mall; Ana atiende
  await a('10:40'); await llenar({ vend:'Ana Prueba' }); r = await guardar();
  const r6b = await ev(() => { var e=mallEstado(mallToquesParaEstado(), Date.now()), f=e.fila.filter(function(x){ return x.v==='Ana Prueba'; })[0]; return { est:f && f.estado, R:mallResumenDia().porVend['Ana Prueba'] }; });
  chk('6a · una venta NUEVA de Ana (del mall) manda sola «fin · compró» con el id del pedido', r.guardo && r.nuevos===1 && r.srv==='fin:Ana:compro' && r.ref===r.id, r);
  chk('6b · …y cierra la atención abierta de Ana: queda libre y cuenta como compra', r6b.est==='libre' && r6b.R.co===1, r6b);
  await a('10:50'); await llenar({ vend:'Carola Chavez' }); r = await guardar();
  chk('6c · una venta de una vendedora de otra tienda, en una compu que no es del mall: nada', r.guardo && r.nuevos===0, r);
  await a('10:55'); await ev(() => { mallAparatoCambiar(); });
  await llenar({ vend:'Carola Chavez' }); r = await guardar();
  chk('6d · la misma venta desde la compu del mall: sí (lo cargado en el mostrador es una venta del mostrador)', r.guardo && r.nuevos===1 && r.srv==='fin:Carola:compro', r);
  await a('11:00'); r = await ev(async () => { var n0=Object.keys(_srv.toques).length, id=window._L[window._L.length-1].id; editPedido(id); await _esperar(300);
    document.getElementById('f-cliente').value='CLIENTE INVENTADO CORREGIDO'; submitPedido(); await _esperar(500); try{ closeModal(); }catch(e){}
    return { nuevos:Object.keys(_srv.toques).length-n0, saves:window._saves }; });
  chk('6e · corregir una venta (edición) no manda nada', r.nuevos===0, r);
  await a('11:05'); await llenar({ vend:'Ana Prueba', tipo:'ATC' }); r = await guardar();
  chk('6f · una ATC de Ana no es una venta: nada', r.guardo && r.nuevos===0, r);
  r = await ev(() => { var o=mallVentaHecha({ id:'pEdu', oc:'11-900', vendedor:'Eduardo Añez', productos:[] }); return o; });
  chk('6g · desde la compu del mall, Eduardo no cuenta (ni ROHO ni los internos)', r===null, r);

  /* ============ 7 · «TU DÍA» DE UN VENDEDOR DEL MALL ============ */
  await a('11:10');
  r = await ev(async () => { await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; showView('mis'); MIS_TODOS=false;
    var mv=document.getElementById('mis-vendedor'); mv.value='Ana Prueba'; renderMis(); await _esperar(250);
    var e=document.getElementById('mis-mall'); var R=mallResumenDia(), p=R.porVend['Ana Prueba'];
    var o={ txt:e ? e.innerText.replace(/\s+/g,' ').trim() : '', at:p.at, co:p.co, t:[R.atendidos, R.compraron] };
    mv.value='Carola Chavez'; renderMis(); await _esperar(150); o.otra=!!document.getElementById('mis-mall'); return o; });
  const pc=(c,t)=>Math.round(100*c/t);
  chk('7a · «Tu día» de Ana: «Hoy atendiste N · compraron M (x %) · tu tienda: y %»', r.txt.indexOf('Hoy atendiste '+r.at+' · compraron '+r.co+' ('+pc(r.co,r.at)+' %) · tu tienda: '+pc(r.t[1],r.t[0])+' %')>=0, r);
  chk('7b · una vendedora de otra tienda no tiene ese renglón', r.otra===false, r);

  /* ============ 8 · EL RECONOCIMIENTO DEL DÍA (273) ============ */
  r = await ev(async () => {
    var ts=function(d, h){ return new Date(d+'T'+h+':00-04:00').getTime(); }, n=0;
    var V=function(v, bs, d, h){ n++; window._L.push({ id:'rv'+n, oc:'11-'+(800+n), nota:'N'+n, cliente:'CLIENTE INVENTADO '+n, celular:'7100000'+n, fecha:'2026-11-20', turno:'AM', zona:'Norte', direccion:'CALLE 1',
      maps:'', vendedor:v, productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'', cant:1, precio:bs }], saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo '+bs+' @'+d+' #rv'+n, ts:ts(d, h||'10:00'), rev:1 }); };
    V('Isabel Robledo', 9000, '2026-11-14'); V('Isabel Robledo', 3000, '2026-11-14');
    V('Maria Flores', 10000, '2026-11-14');
    V('Eduardo Añez', 90000, '2026-11-14'); V('ROHO', 50000, '2026-11-14'); V('ALBA', 70000, '2026-11-14');
    V('Mirian Salazar', 40000, '2026-11-13');                 // ayer: Mirian
    V('Isabel Robledo', 20000, '2026-11-13');
    await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok';
    /* el mall (otros tres inventados): Eli 5 clientes / 3 compraron, Fede 6 / 2, Gabi 4 / 4 (menos de 5: no entra); Ana y Beto tienen menos de 5 */
    ['Eli Prueba','Fede Prueba','Gabi Prueba'].forEach(function(v){ VENDEDORES.push(v); });
    var L=[], m=0, T=function(k, v, x){ m++; var t=ts('2026-11-14','12:'+('0'+m).slice(-2)); return Object.assign({ id:'r'+m, ts:t, tienda:'Ventura Mall', v:v, k:k, r:'', m:'', ref:'', ap:'X' }, x||{}); };
    for(var i=0;i<3;i++) L.push(T('fin','Eli Prueba',{ r:'compro' })); for(i=0;i<2;i++) L.push(T('miro','Eli Prueba',{ m:'precio' }));
    for(i=0;i<2;i++) L.push(T('fin','Fede Prueba',{ r:'compro' })); for(i=0;i<4;i++) L.push(T('miro','Fede Prueba',{ m:'precio' }));
    for(i=0;i<4;i++) L.push(T('fin','Gabi Prueba',{ r:'compro' }));
    window._recoMall=L; return true; });
  const verReco = async (v, unl) => ev(async (o) => { UNLOCKED=!!o.unl; showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value=o.v; renderMis(); await _esperar(200);
    var e=document.getElementById('mis-reco'); return { txt:e ? e.innerText.replace(/\s+/g,' ').trim() : '', d:recoDatos() }; }, { v:v, unl:unl });
  await a('11:30');
  r = await verReco('Maria Flores', false);
  chk('8a · a las 11:30 «Vendedor del día · va ganando Isabel» (12.000, cargado hoy; Eduardo, ROHO y ALBA no cuentan)', /Vendedor del día · va ganando Isabel Robledo/.test(r.txt) && r.d.vend && r.d.vend.v==='Isabel Robledo' && r.d.vend.bs===12000, r);
  chk('8b · sin la contraseña, Maria ve SOLO el nombre (sin la plata de Isabel)', !/Bs/.test(r.txt), r.txt);
  chk('8c · a la mañana (antes de las 12:00) también el de ayer: Mirian', /Ayer: 🏆 vendedor del día Mirian Salazar/.test(r.txt) && r.d.ayer && r.d.ayer.dia==='2026-11-13', r.txt);
  r = await verReco('Isabel Robledo', false);
  chk('8d · Isabel ve «¡sos vos!» y SU monto', /Isabel Robledo ¡sos vos!/.test(r.txt) && /Bs 12\.000/.test(r.txt), r.txt);
  r = await verReco('Maria Flores', true);
  chk('8e · con la contraseña se ve la plata del que va ganando', /Bs 12\.000/.test(r.txt), r.txt);
  await ev(() => { _recoMall.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts), hora:hhmmDeTs(t.ts) }); }); MALL.recoT=0; return mallLeerDia('2026-11-14'); });
  await a('14:00');
  r = await verReco('Maria Flores', false);
  chk('8f · 🎯 «Mejor conversión · va ganando Eli» (3 de 5 = 60 %; Gabi 4 de 4 no llega a 5 clientes); a la tarde ya no sale lo de ayer', /Mejor conversión · va ganando Eli Prueba/.test(r.txt) && r.d.conv && r.d.conv.v==='Eli Prueba' && r.d.conv.co===3 && r.d.conv.at===5 && !/Ayer/.test(r.txt), [r.txt, r.d.conv]);
  r = await verReco('Eli Prueba', false);
  chk('8g · Eli ve su conversión con los números', /Eli Prueba ¡sos vos! · 3 de 5 \(60 %\)/.test(r.txt), r.txt);
  await a('20:45');
  r = await verReco('Maria Flores', false);
  chk('8h · desde las 20:30: «Vendedor del día: Isabel» y «Mejor conversión: Eli» (ya no «va ganando»)', /Vendedor del día: Isabel Robledo/.test(r.txt) && /Mejor conversión: Eli Prueba/.test(r.txt) && !/va ganando/.test(r.txt), r.txt);
  r = await ev(() => { window.RECO_PRUEBA=0; var h=misRecoHtml('Maria Flores'); window.RECO_PRUEBA=1; return h; });
  chk('8i · en Playwright sin RECO_PRUEBA no sale', r==='', r);

  /* ============ 9 · «¿FUE PAREJO?» ============ */
  await a('15:30');
  r = await ev(async () => { UNLOCKED=false; mallBarraPintar(true); _clic('#mall-barra button', '¿Fue parejo?'); await _esperar(250);
    var b=document.getElementById('modal-box'); return { txt:b ? b.innerText.replace(/\s+/g,' ') : '', mpj:!!(b && b.querySelector('.mpj')) }; });
  chk('9a · «🔄 ¿Fue parejo?» abre el cuadro de hoy por turno (mañana y tarde), con la explicación', r.mpj && /¿Fue parejo\?/.test(r.txt) && /Hoy · 14\/11/.test(r.txt) && /Mañana/.test(r.txt) && /Tarde/.test(r.txt) && /mismo turno/.test(r.txt), r.txt.slice(0,400));
  chk('9b · compara SOLO a los que estuvieron en la rueda: Carola vendió desde la compu del mall sin tocar «Llegué» → no entra en la comparación',
    /Ana Prueba/.test(r.txt) && /Beto Prueba/.test(r.txt) && !/Carola Chavez/.test(r.txt), r.txt.slice(0,700));
  await ev(() => closeModal());

  if(CAPTURAS){
    /* Una barra «de verdad» con nombres INVENTADOS, para las capturas: la tarde, dos atendiendo y la mañana ya cerrada. */
    const escena = async () => ev(async () => {
      await _esperar(100); _srv.toques={}; localStorage.removeItem('me_mall_cola'); MALL.dias={}; MALL.mandados={}; MALL.ui={};
      VENDEDORES=VENDEDORES.filter(function(v){ return !/^(Eli|Fede|Gabi) Prueba$/.test(v); });
      var ts=function(h){ return new Date('2026-11-14T'+h+':00-04:00').getTime(); }, n=0;
      var T=function(k, v, h, x){ n++; return Object.assign({ id:'c'+n, ts:ts(h), tienda:'Ventura Mall', v:v, k:k, r:'', m:'', ref:'', ap:'X' }, x||{}); };
      var L=[T('llegue','Ana Prueba','09:00'), T('llegue','Beto Prueba','09:03')];
      var mot=['precio','medida','paseaba','vuelve','demora'];
      for(var i=0;i<7;i++){ var v=i%2 ? 'Beto Prueba' : 'Ana Prueba', h='09:'+(10+i*6); L.push(T('atiendo', v, h)); L.push(T('fin', v, '09:'+(13+i*6), i%3===0 ? { r:'compro' } : (i%3===1 ? { r:'anoto' } : { r:'miro', m:mot[i%5], medida:'140x190' }))); }
      L.push(T('mefui','Ana Prueba','14:58')); L.push(T('mefui','Beto Prueba','15:00'));
      L.push(T('llegue','Caro Prueba','15:01')); L.push(T('llegue','Dani Prueba','15:04'));
      L.push(T('atiendo','Caro Prueba','15:10')); L.push(T('fin','Caro Prueba','15:18',{ r:'compro' }));
      L.push(T('atiendo','Dani Prueba','15:20')); L.push(T('esmio','Caro Prueba','15:24'));
      L.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts), hora:hhmmDeTs(t.ts) }); });
      await mallLeerDia('2026-11-14'); setVendedorMem('Dani Prueba'); showView('mis'); window.scrollTo(0,0); mallBarraPintar(true); await _esperar(1200); return true; });
    await a('15:31'); await escena();
    await page.locator('#mall-barra').screenshot({ path:path.join(CAPTURAS, 'mall_rueda_barra_1280.png') });
    await ev(async () => { var t=document.getElementById('toast'); if(t) t.className='toast'; showView('form'); window.scrollTo(0,0); await _esperar(500); });
    await page.screenshot({ path:path.join(CAPTURAS, 'mall_rueda_pagina_1280.png'), clip:{ x:0, y:0, width:1280, height:760 } });
    await ev(async () => { mallParejoAbrir(); await _esperar(300); });
    await page.locator('#modal-box').screenshot({ path:path.join(CAPTURAS, 'mall_rueda_parejo_1280.png') });
    await ev(() => closeModal());
  }
  chk('sin errores de la página (1280 px)', errores.length===0, errores);
  await ctx.close();

  /* ============ 10 · EN EL CELULAR ============ */
  ({ ctx, page } = await abrir(390, CAPTURAS ? 1500 : 844, '15:31'));
  r = await ev(async () => {
    window.MALL_PRUEBA=1; mallAparatoCambiar(); await _esperar(100);   // que termine la primera lectura de la barra
    var ts=function(h){ return new Date('2026-11-14T'+h+':00-04:00').getTime(); }, n=0;
    var T=function(k, v, h, x){ n++; return Object.assign({ id:'c'+n, ts:ts(h), tienda:'Ventura Mall', v:v, k:k, r:'', m:'', ref:'', ap:'X' }, x||{}); };
    var L=[T('llegue','Ana Prueba','09:00'), T('llegue','Beto Prueba','09:03'), T('miro','Ana Prueba','09:20',{ m:'precio' }), T('fin','Beto Prueba','09:40',{ r:'compro' }), T('miro','Ana Prueba','10:20',{ m:'medida', medida:'160x200' }),
           T('mefui','Ana Prueba','14:58'), T('mefui','Beto Prueba','15:00'), T('llegue','Caro Prueba','15:01'), T('llegue','Dani Prueba','15:04'),
           T('atiendo','Caro Prueba','15:10'), T('fin','Caro Prueba','15:18',{ r:'compro' }), T('atiendo','Dani Prueba','15:20'), T('esmio','Caro Prueba','15:24')];
    L.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts), hora:hhmmDeTs(t.ts) }); });
    await mallLeerDia('2026-11-14'); window.scrollTo(0,0); mallBarraPintar(true); await _esperar(1200);
    var b=document.getElementById('mall-barra').getBoundingClientRect();
    return { sw:document.documentElement.scrollWidth, iw:window.innerWidth, der:Math.round(b.right), izq:Math.round(b.left), txt:_barra().txt };
  });
  chk('10a · en el celular (390 px) la barra entra entera y no ensancha la página (la tarde: los dos atendiendo, la mañana pareja)', r.sw<=r.iw && r.der<=r.iw && r.izq>=0 && /Mostrador/.test(r.txt) && /Están todos atendiendo/.test(r.txt) && /La mañana: ✅ Pareja/.test(r.txt), r);
  if(CAPTURAS){
    await ev(async () => { var t=document.getElementById('toast'); if(t) t.className='toast'; await _esperar(400); });
    await page.locator('#mall-barra').screenshot({ path:path.join(CAPTURAS, 'mall_rueda_barra_390.png') });
    await ev(async () => { mallParejoAbrir(); await _esperar(300); });
    await page.locator('#modal-box').screenshot({ path:path.join(CAPTURAS, 'mall_rueda_parejo_390.png') });
  }
  chk('sin errores de la página', errores.length===0, errores);
  await ctx.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
