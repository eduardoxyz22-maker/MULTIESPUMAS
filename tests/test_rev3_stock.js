/* 📦 TERCERA REVISIÓN DEL STOCK (26/09): lo que quedó REPORTADO y sin tocar en 📦 Stock y reposición.

   Lo que este test cuida:
   1. EL DETALLE DE UN PRODUCTO: el grupo «Sin stock de días pasados · pendientes de reprogramar» no
      salía NUNCA (`stockSalio` da falso para un ✗, así que caía en «Vendido sin entregar»). Ahora
      esas líneas van a su grupo, y la CUENTA no se mueve (§4de: un «✗ no hay» con la fecha pasada
      sigue comprometido): los dos grupos suman lo que dice la tarjeta «Comprometido».
   3. UNA LLEGADA QUE NO SUMABA: con el Excel de acá de la tarde marcado «ya incluye las entregas del
      día» (`c.inc`), lo que llegaba ese mismo día DESPUÉS de subirlo se descartaba por la fecha (y
      `filaStock` lo podaba al guardar). Con hora de los dos lados (`ts` y `c.t`) manda la hora; una
      entrada vieja sin hora queda como antes.
   4. LA REVISIÓN CON «TOCAR SOLO LAS LÍNEAS SIN MARCAR» DESTILDADA: una línea 📥 cuya recogida ya
      está programada (`STOCK.p`, la camioneta en camino) no encontraba esas unidades —ya no están en
      Moreno ni llegaron acá— y la pasaba a ✗ no hay. Ahora la recogida programada la cubre primero,
      como en la primera vuelta de la revisión normal.

   Datos SINTÉTICOS. Reloj de la página clavado en el miércoles 16/09/2026, 18:30 de Bolivia.

   Se corre:  node tests/test_rev3_stock.js   (desde la raíz del repo)
   Contra otro panel:  PEDIDOS=/ruta/a/pedidos.html node tests/test_rev3_stock.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=x=>JSON.stringify(x);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:390,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-09-16T22:30:00Z'));      // 18:30 de Bolivia
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockData','stockPedidosDetalle','abrirStockPedidos','abrirStockPedido','guardarStockPedido',
    'abrirStockEntrada','guardarStockEntrada','recibirStockPedido','stockEntradaVale','filaStock','leerStock','stockAsignar','revStkCambios']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el módulo de stock', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  chk('el reloj de la página está clavado en el miércoles 16/09/2026', await page.evaluate(() => todayStr()==='2026-09-16'));

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    // La carga de arranque queda reintentando sin red: que no pise nada a mitad de la prueba.
    CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    window._adel=function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    window._tit=function(n,x){ return [Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n},x||{})]; };
    window._K=function(){ return stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'}); };
    // El depósito de acá (Excel de la mañana, sintético), con el TITANIO en `u`.
    window._stockAca=function(u, extra){
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c=Object.assign({ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', t:Date.now()-8*3600000 }, extra||{});
      STOCK.c.u[_K()]=u;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log' };
      stockOlvidarIndice();
    };
  });

  // ══ 1. El detalle: «Sin stock de días pasados · pendientes de reprogramar» ═══════════
  console.log('\n── 1. Detalle de un producto: los ✗ de días pasados van a su grupo, y la cuenta no cambia ──');
  let r = await page.evaluate(() => {
    _stockAca(2);
    var K=_K();
    STATE=[_P({id:'nh1', cliente:'Ana',   fecha:_adel(-2), estado:'No hay', productos:_tit(1,{chk:'no'})}),   // ✗ de días pasados
           _P({id:'nh2', cliente:'Beto',  fecha:_adel(-1), estado:'No hay', productos:_tit(2,{chk:'no'})}),   // ✗ de días pasados
           _P({id:'pen', cliente:'Caro',  fecha:_adel(1),  productos:_tit(3)}),                               // sin marcar, para mañana
           _P({id:'nhF', cliente:'Dani',  fecha:_adel(2),  productos:_tit(1,{chk:'no'})}),                    // ✗ pero todavía no es su día
           _P({id:'imV', cliente:'Eva',   fecha:_adel(-1), productos:_tit(1,{chk:'im'})}),                    // 📥 de ayer: hay, en Moreno
           _P({id:'ent', cliente:'Fede',  fecha:_adel(-3), entregado:true, productos:_tit(1)})];
    stockOlvidarIndice();
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0];
    var G=stockPedidosDetalle(K);
    var ids=function(g){ return (G[g]||[]).map(function(e){ return e.p.id; }).sort(); };
    var suma=function(g){ return (G[g]||[]).reduce(function(n,e){ return n+e.u; },0); };
    abrirStockPedidos(K);
    var sec=[].slice.call(document.querySelectorAll('#modal-box details')).map(function(d){
      return { tit:d.querySelector('summary').textContent.replace(/\s+/g,' '), filas:[].slice.call(d.querySelectorAll('tbody tr')).map(function(tr){ return tr.textContent.replace(/\s+/g,' '); }) }; });
    var txt=(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' ');
    closeModal();
    return { comp:o.comp, noHay:o.noHay, atr:ids('atrasados'), pen:ids('pendientes'), his:ids('historico'), uAtr:suma('atrasados'), uPen:suma('pendientes'),
             sec:sec, tarjeta:(txt.match(/Comprometido\s*(\d+)/)||[])[1], vacio:/No hay pedidos pendientes que consuman stock/.test(txt) };
  });
  chk('⚠️ la cuenta no cambia: los 2 ✗ de días pasados siguen COMPROMETIDOS (1+2 + 3 + 1 + 1 = 8, §4de)', r.comp===8 && r.tarjeta==='8', r.comp+' · tarjeta '+r.tarjeta);
  chk('⚠️ los ✗ de días pasados van a «Sin stock de días pasados · pendientes de reprogramar» (antes ese grupo no salía nunca)',
      J(r.atr)===J(['nh1','nh2']) && r.uAtr===3, J(r.atr)+' · '+r.uAtr);
  const secAtr=r.sec.filter(s=>/Sin stock de días pasados/.test(s.tit))[0];
  chk('…y el grupo se ve en la pantalla, con los dos pedidos', !!secAtr && secAtr.filas.length===2 && /Ana/.test(secAtr.filas.join('|')) && /Beto/.test(secAtr.filas.join('|')), J(r.sec.map(s=>s.tit)));
  chk('…y dice que siguen dentro de «Comprometido» (si no, «Vendido sin entregar» no cierra con la tarjeta)', !!secAtr && /Comprometido/.test(secAtr.tit), secAtr?secAtr.tit:'');
  chk('en «Vendido sin entregar» queda el resto: el de mañana, el ✗ que todavía no es de días pasados y el 📥 de ayer',
      J(r.pen)===J(['imV','nhF','pen']) && r.uPen===5, J(r.pen)+' · '+r.uPen);
  chk('⚠️ los dos grupos suman lo comprometido (3 + 5 = 8)', r.uAtr+r.uPen===r.comp, (r.uAtr+r.uPen)+' vs '+r.comp);
  chk('…y lo entregado sigue en el historial', J(r.his)===J(['ent']), J(r.his));
  r = await page.evaluate(() => {
    // Solo ✗ de días pasados: NO puede decir «No hay pedidos pendientes que consuman stock» — consumen.
    _stockAca(0);
    var K=_K();
    STATE=[_P({id:'nh1', cliente:'Ana', fecha:_adel(-2), estado:'No hay', productos:_tit(2,{chk:'no'})})];
    stockOlvidarIndice();
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0];
    abrirStockPedidos(K);
    var txt=(document.getElementById('modal-box').textContent||'').replace(/\s+/g,' ');
    closeModal();
    return { comp:o.comp, vacio:/No hay pedidos pendientes que consuman stock/.test(txt), grupo:/Sin stock de días pasados/.test(txt) };
  });
  chk('con solo ✗ de días pasados no dice «No hay pedidos pendientes que consuman stock»: están comprometidos', r.comp===2 && !r.vacio, J(r));

  // ══ 3. Una llegada después del Excel de la tarde «que ya incluye las entregas del día» ═══
  console.log('\n── 3. Llegada anotada DESPUÉS de subir el Excel de la tarde (c.inc) ──');
  r = await page.evaluate(() => {
    // Excel de acá de las 17:00, subido a las 17:30 y marcado «ya incluye las entregas del día». Son las 18:30.
    _stockAca(2, { hora:'17:00:00', inc:true, t:Date.now()-3600000 });
    var K=_K();
    STATE=[_P({id:'x1', fecha:_adel(2), productos:_tit(1)})];
    stockOlvidarIndice();
    var antes=stockData().lista.filter(function(x){ return x.k===K; })[0].deposito;
    abrirStockEntrada();
    var sel=document.getElementById('stk-ent-k'); sel.value=K;
    document.getElementById('stk-ent-u').value='5';
    guardarStockEntrada();
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0];
    // «recargar»: la fila que sale al servidor, leída de nuevo
    var S2=leerStock(filaStock());
    return { antes:antes, dep:o.deposito, e:(STOCK.e||[]).map(function(x){ return x.u; }), eRelei:(S2.e||[]).filter(function(x){ return x.k===K; }).map(function(x){ return x.u; }) };
  });
  chk('⚠️ la llegada de las 18:30 SUMA: 2 + 5 = 7 acá (antes quedaba en 2, descartada por la fecha)', r.antes===2 && r.dep===7, J(r));
  chk('⚠️ …y no se poda al guardar ni al releer la fila', J(r.e)==='[5]' && J(r.eRelei)==='[5]', J(r));
  r = await page.evaluate(() => {
    // Lo mismo por «✅ Llegó» de un pedido a fábrica anotado hace 3 días.
    _stockAca(2, { hora:'17:00:00', inc:true, t:Date.now()-3600000 });
    var K=_K();
    STOCK.p=[{ id:'fpX', k:K, u:4, fab:'MORENO', f:_adel(-3), esp:'', r:'' }];
    STATE=[_P({id:'x1', fecha:_adel(2), productos:_tit(1)})];
    stockOlvidarIndice();
    abrirStockEntrada();
    var inp=document.getElementById('stk-rec-fpX'); if(inp) inp.value='4';
    recibirStockPedido('fpX');
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0];
    var q=STOCK.p.filter(function(x){ return x.id==='fpX'; })[0]||{};
    return { dep:o.deposito, r:q.r||'', ru:q.ru, eRec:(STOCK.e||[]).filter(function(x){ return x.rec; }).map(function(x){ return x.u; }) };
  });
  chk('⚠️ «✅ Llegó» de un pedido a fábrica después del Excel de la tarde: la recepción suma 4 acá (2 → 6)', r.dep===6 && J(r.eRec)==='[4]' && r.ru===4, J(r));
  r = await page.evaluate(() => {
    var T=Date.parse('2026-09-16T21:30:00Z');       // 17:30 de Bolivia: cuándo se subió el Excel
    var hoy='2026-09-16', ayer='2026-09-15', man='2026-09-17';
    var inc={ c:{ f:hoy, inc:true, t:T } }, sinInc={ c:{ f:hoy, t:T } }, incSinHora={ c:{ f:hoy, inc:true } };
    var V=function(S,f,ts){ return stockEntradaVale(S,f,ts); };
    return {
      incDespues: V(inc,hoy,T+60000),        // anotada después de subirlo: vale (el arreglo)
      incAntes:   V(inc,hoy,T-60000),        // anotada antes: ya está en el Excel
      incSinTs:   V(inc,hoy,undefined),      // entrada vieja sin hora: como antes, no vale
      incMan:     V(inc,man,undefined),      // del día siguiente: vale
      incAyer:    V(inc,ayer,T+60000),       // con fecha de antes del corte: nunca
      sinIncDesp: V(sinInc,hoy,T+60000), sinIncAntes: V(sinInc,hoy,T-60000), sinIncSinTs: V(sinInc,hoy,undefined), sinIncAyer: V(sinInc,ayer,undefined),
      corteSinHora: V(incSinHora,hoy,T+60000),   // un corte sin `t` (panel viejo): manda la fecha, como antes
      sinCorte: V({c:{f:''}},ayer,undefined)
    };
  });
  chk('⚠️ con «ya incluye las entregas del día»: lo anotado DESPUÉS de subirlo vale', r.incDespues===true, J(r));
  chk('…lo anotado antes, no (ya está en el Excel), y una entrada vieja sin hora tampoco (queda como hoy)', r.incAntes===false && r.incSinTs===false, J(r));
  chk('…lo del día siguiente vale, y lo fechado antes del corte nunca', r.incMan===true && r.incAyer===false, J(r));
  chk('sin «ya incluye»: igual que antes (después vale, antes no, sin hora vale, de ayer no)',
      r.sinIncDesp===true && r.sinIncAntes===false && r.sinIncSinTs===true && r.sinIncAyer===false, J(r));
  chk('un corte sin hora (de un panel viejo) sigue mandando por la fecha, y sin corte vale todo', r.corteSinHora===false && r.sinCorte===true, J(r));

  // ══ 4. La revisión con «Tocar solo las líneas sin marcar» destildada ═════════════════
  console.log('\n── 4. Revisión de todo: una línea 📥 con la recogida ya programada no pasa a ✗ ──');
  await page.evaluate(() => {
    window._IM='IM - PRODUCTOTERMINADO';
    /* Acá 0. Moreno tenía `enMoreno`; se programó traer `prog` (la camioneta va mañana temprano).
       Los pedidos: `lineas` = [{id, u, chk, chkDe, dias}]. */
    window._rev=function(enMoreno, prog, lineas){
      _stockAca(0);
      var K=_K();
      STOCK.g={}; STOCK.g[_IM]={ f:todayStr(), u:{}, hora:'08:00:00', solo0:true, cod:{}, t:Date.now()-6*3600000, rs:{} };
      STOCK.g[_IM].u[K]=enMoreno;
      STOCK.al[_IM]='otro';
      STOCK.p=prog ? [{ id:'rc1', k:K, u:prog, tipo:'recogida', de:_IM, fab:'', f:todayStr(), esp:_adel(1), r:'' }] : [];
      STATE=lineas.map(function(l){
        var x={ chk:l.chk||'' }; if(l.chkDe) x.chkDe=l.chkDe;
        return _P({ id:l.id, cliente:'Cli '+l.id, fecha:_adel(l.dias||1), productos:_tit(l.u, x) });
      });
      stockOlvidarIndice();
      REVSTK_DIAS='todos';
    };
    window._plan=function(R){
      var por={}; REVSTK=R;                          // revStkCambios() mira la propuesta guardada
      R.pedidos.forEach(function(g){ por[g.p.id]=g.lineas.map(function(l){ return { antes:l.antes, ahora:l.ahora, cambia:!!l.cambia, contra:!!l.contra, deIM:l.deIM, alm:recogerPorTxt(l.almPor), desg:(l.ahora==='no'?revStkDesglose(l):'') }; })[0]; });
      return { por:por, cambios:revStkCambios().map(function(g){ return g.p.id; }), no:R.tot.no, im:R.tot.im,
               faltan:R.faltan.map(function(o){ return o.u; }), traer:R.traerIM.map(function(o){ return o.u; }) };
    };
  });
  r = await page.evaluate(() => {
    _rev(3, 3, [{ id:'a', u:3, chk:'im' }]);
    var out={};
    REVSTK_SOLO_VACIOS=true; out.solo=_plan(stockAsignar());
    REVSTK_SOLO_VACIOS=false; out.todo=_plan(stockAsignar());
    REVSTK_SOLO_VACIOS=true;
    return out;
  });
  chk('con la casilla marcada (lo normal) la línea 📥 se conserva: la recogida la cubre', r.solo.cambios.length===0 && r.solo.no===0, J(r.solo));
  chk('⚠️ destildada, la línea 📥 con su recogida en camino NO pasa a ✗ no hay (antes: «estaba 📥, queda ✗»)',
      r.todo.por.a && r.todo.por.a.ahora==='im' && !r.todo.por.a.cambia && r.todo.cambios.length===0 && r.todo.no===0, J(r.todo));
  chk('…y no pide fabricar ni ir a buscar de nuevo lo que ya viene', r.todo.faltan.length===0 && r.todo.traer.length===0, J(r.todo));

  r = await page.evaluate(async () => {
    // Lo mismo apretando los botones: abrir, destildar, Aplicar.
    _rev(3, 3, [{ id:'a', u:3, chk:'im' }]);
    showView('admin'); await new Promise(function(res){ setTimeout(res,150); });
    _rev(3, 3, [{ id:'a', u:3, chk:'im' }]);
    abrirStockRevisar(); revStkSoloVacios();
    var boton=document.querySelector('[onclick="aplicarStockRevisar()"]');
    if(boton) aplicarStockRevisar(); else closeModal();
    await new Promise(function(res){ setTimeout(res,400); });
    var av=document.getElementById('revstk-avance'); if(av) av.remove();
    REVSTK_SOLO_VACIOS=true;
    return { boton:!!boton, chk:findById('a').productos[0].chk, estado:findById('a').estado||'' };
  });
  chk('⚠️ apretando «Aplicar» con la casilla destildada, el pedido sigue 📥 (antes quedaba ✗ «No hay» con la camioneta en camino)',
      r.chk==='im', J(r));

  r = await page.evaluate(() => {
    var out={};
    // (b) La recogida cubre 2 de 3 y en Moreno queda 1 libre: 📥 entera, y a buscar solo 1.
    _rev(3, 2, [{ id:'a', u:3, chk:'im' }]);
    REVSTK_SOLO_VACIOS=false; out.parcial=_plan(stockAsignar());
    // (c) Dos pedidos: el 📥 (con su recogida de 2) y uno nuevo que entra en los 2 que quedan en Moreno.
    _rev(4, 2, [{ id:'a', u:2, chk:'im', dias:1 }, { id:'b', u:2, dias:2 }]);
    REVSTK_SOLO_VACIOS=false; out.dos=_plan(stockAsignar());
    REVSTK_SOLO_VACIOS=true;  out.dosSolo=_plan(stockAsignar());
    // (d) No alcanza: la recogida trae 3 y el pedido es de 4 → ✗, pero dice que 3 vienen en camino, y fabricar 1.
    _rev(3, 3, [{ id:'a', u:4, chk:'im' }]);
    REVSTK_SOLO_VACIOS=false; out.falta=_plan(stockAsignar());
    // (e) La marca dice Banzer y la recogida viene de IM: la línea pasa a decir IM (de ahí sale la camioneta).
    _rev(3, 3, [{ id:'a', u:3, chk:'im', chkDe:'Banzer' }]);
    REVSTK_SOLO_VACIOS=false; out.lugar=_plan(stockAsignar());
    REVSTK_SOLO_VACIOS=true;
    return out;
  });
  chk('recogida de 2 + 1 libre en Moreno: la línea de 3 sigue 📥 y a buscar queda solo 1 (no 3)',
      r.parcial.por.a.ahora==='im' && !r.parcial.por.a.cambia && r.parcial.por.a.deIM===3 && J(r.parcial.traer)==='[1]' && r.parcial.no===0, J(r.parcial));
  chk('⚠️ dos pedidos: el 📥 se queda con SU recogida y el nuevo se lleva los 2 libres de Moreno (antes: el nuevo quedaba ✗)',
      r.dos.por.a.ahora==='im' && !r.dos.por.a.cambia && r.dos.por.b.ahora==='im' && r.dos.no===0 && r.dos.faltan.length===0, J(r.dos));
  chk('…que es lo mismo que propone la revisión normal (casilla marcada)', r.dosSolo.por.b && r.dosSolo.por.b.ahora==='im', J(r.dosSolo));
  chk('si la recogida no alcanza: ✗ (una línea a medias no reserva), fabricar 1, y el porqué nombra lo que viene en camino',
      r.falta.por.a.ahora==='no' && J(r.falta.faltan)==='[1]' && /3 [^·]*camino/.test(r.falta.por.a.desg), J(r.falta));
  chk('la marca decía Banzer y la recogida viene de IM: se propone IM (el lugar de donde sale la camioneta)',
      r.lugar.por.a.ahora==='im' && r.lugar.por.a.cambia && r.lugar.por.a.alm==='IM', J(r.lugar));

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
