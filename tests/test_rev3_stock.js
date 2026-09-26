/* 📦 TERCERA REVISIÓN DEL STOCK (26/09): lo que quedó REPORTADO y sin tocar en 📦 Stock y reposición.

   Lo que este test cuida:
   3. UNA LLEGADA QUE NO SUMABA: con el Excel de acá de la tarde marcado «ya incluye las entregas del
      día» (`c.inc`), lo que llegaba ese mismo día DESPUÉS de subirlo se descartaba por la fecha (y
      `filaStock` lo podaba al guardar). Con hora de los dos lados (`ts` y `c.t`) manda la hora; una
      entrada vieja sin hora queda como antes.

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

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
