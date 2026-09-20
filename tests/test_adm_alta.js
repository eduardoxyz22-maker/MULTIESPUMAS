/* 📦 ADMINISTRACIÓN Y STOCK: lo que se anotaba y se perdía (§4ev, los ALTA de §4er).

   1. La fila `__stock__` en vuelo la pisaba cualquier `list`: la recogida recién anotada
      desaparecía de la memoria y la siguiente anotación la BORRABA del servidor. Y con el
      servidor ocupado, la fila en cola se colaba en STATE y Administración la dibujaba como
      un pedido. (El arqueo del Cuadre tenía el mismo agujero.)
   2. Una recogida «dada por llegada» desde el Excel de existencias no se descontaba de
      Moreno: 5 unidades contadas dos veces hasta el próximo Excel de allá.
   3. El plan del mes de «Qué producir» contaba a Eduardo y a los pedidos puntuales aunque el
      cartel dijera «sin Eduardo»: una venta única de 40 subía «producir en octubre».

   Red cortada, servidor simulado, fixtures sintéticos, reloj clavado (las ventas de agosto
   del fixture 3 son fechas fijas). Se corre:  node tests/test_adm_alta.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_adm_alta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

const BASE = `
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true;
  document.getElementById('admin-lock').style.display='none';
  document.getElementById('admin-content').style.display='block';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); }catch(e){}
  if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO='ok'; NO_ENCOLAR={}; SAVE_ULTIMO={}; SAVE_REV={};
  window._guardadas=[];
  /* ⚠️ Los escenarios de «en vuelo» usan el apiSave REAL (es el que anota SAVE_ULTIMO, la
     protección de §4eo) y simulan solo el transporte (apiPost). Se guarda antes de pisarlo. */
  window._apiSaveReal=window._apiSaveReal||apiSave;
  apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
  apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
  window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
  window._atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
  window._adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
  window._P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
    cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
    ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:true,vehiculo:'',chofer:'',
    garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
  window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
  window.H=function(n){ return [{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}]; };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const nueva = async () => {
    const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
    page.on('pageerror', e=>errores.push(e.message));
    page.on('dialog', d=>d.accept());
    await page.route(/^https?:/, r=>r.abort());
    await page.clock.setFixedTime(new Date('2026-09-20T14:00:00Z'));   // ⏰ reloj clavado: el fixture 3 tiene ventas de agosto con fecha fija
    await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
    await page.waitForTimeout(300);
    return page;
  };

  // ═══ 1. La fila __stock__ en vuelo ═══════════════════════════════════════════════
  console.log('\n── 1. La fila del stock en vuelo no la pisa el list ──');
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({id:'x', fecha:window._adel(2), entregado:false, productos:H(1)}) ];
      STOCK=stockVacio();
      STOCK.c={ f:window._atras(1), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=1;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:window._atras(1), u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=10;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro' };
      stockOlvidarIndice();
      var filaVieja=filaSistema(STOCK_ID, '📦 STOCK DEL DEPÓSITO — fila del sistema, NO BORRAR', JSON.stringify(STOCK));
      var servidor={ stock:filaVieja, pedidos:JSON.parse(JSON.stringify(STATE)) };
      // el guardado tarda 800 ms, como en la vida real con la hoja cargada (apiSave real, transporte simulado)
      apiSave=window._apiSaveReal;
      apiPost=function(payload){
        if(payload && payload.action==='save'){ var copia=JSON.parse(JSON.stringify(payload.pedido)); return new Promise(function(res){ setTimeout(function(){ if(copia.id===STOCK_ID) servidor.stock=copia; res({ok:true, pedido:copia}); }, 800); }); }
        return Promise.resolve({ok:true});
      };
      apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(servidor.pedidos)).concat([JSON.parse(JSON.stringify(servidor.stock))])}); };
      // 1) se anota una recogida de 5
      abrirStockRecogida(K);
      document.getElementById('stk-rec-u').value='5'; document.getElementById('stk-rec-f').value=window._adel(1);
      guardarStockRecogida();
      var enMemoria1=(STOCK.p||[]).length;
      // 2) en el medio entra un refresco cualquiera: lee la fila VIEJA del servidor
      await refrescarEstado();
      var enMemoria2=(STOCK.p||[]).length;
      await new Promise(function(r){ setTimeout(r,1000); });    // el guardado termina
      var enServidor1=JSON.parse(servidor.stock.observaciones).p.length;
      // 3) se anota una segunda recogida de 2
      abrirStockRecogida(K);
      document.getElementById('stk-rec-u').value='2'; document.getElementById('stk-rec-f').value=window._adel(1);
      guardarStockRecogida();
      await new Promise(function(r){ setTimeout(r,1000); });
      var enServidor2=JSON.parse(servidor.stock.observaciones).p.map(function(q){ return q.u; });
      // 4) pasados los 90 s del guardado, el servidor vuelve a mandar
      SAVE_ULTIMO[STOCK_ID].t=Date.now()-100000;
      servidor.stock=filaSistema(STOCK_ID, 'x', JSON.stringify(Object.assign({}, STOCK, { p:[] })));
      await refrescarEstado();
      var enMemoria3=(STOCK.p||[]).length;
      abrirStock(); var ocupado=autoOcupado(); closeStock();
      return { enMemoria1:enMemoria1, enMemoria2:enMemoria2, enServidor1:enServidor1, enServidor2:enServidor2, enMemoria3:enMemoria3, ocupado:ocupado };
    }, BASE);
    chk('⚠️ la recogida anotada sigue en memoria aunque un list con la fila vieja vuelva antes que el guardado', r.enMemoria1===1 && r.enMemoria2===1, J(r));
    chk('⚠️ …y la segunda anotación llega al servidor CON la primera (5 y 2), no en su lugar', r.enServidor1===1 && r.enServidor2.join(',')==='5,2', J(r.enServidor2));
    chk('pasados los 90 s del guardado, lo que diga el servidor vuelve a mandar', r.enMemoria3===0, r.enMemoria3);
    chk('con la pantalla de stock abierta el tic de 2 minutos no refresca (autoOcupado = stock)', r.ocupado==='stock', r.ocupado);
    await page.close();
  }
  {
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      STATE=[ window._P({id:'x', productos:H(1)}) ];
      var servidorPedidos=JSON.parse(JSON.stringify(STATE));
      STOCK=stockVacio(); STOCK.c={ f:todayStr(), u:{}, solo0:true }; STOCK.c.u[K]=4; stockOlvidarIndice();
      apiSave=window._apiSaveReal;
      apiPost=function(payload){ return Promise.resolve(payload&&payload.action==='save' ? {ok:false, error:'busy'} : {ok:true}); };   // servidor ocupado → a la cola
      guardarStock();
      await new Promise(function(r){ setTimeout(r,50); });
      var enCola=getPending().map(function(p){ return p.id; });
      apiList=function(){ return Promise.resolve({ok:true, pedidos:JSON.parse(JSON.stringify(servidorPedidos))}); };
      await refrescarEstado();
      var idsState=STATE.map(function(p){ return p.id; });
      segSet('adm-mode','todo'); QUICK_FILTER=''; admTopeReset(); renderAdmin();
      var filas=Array.from(document.querySelectorAll('#tbl-pedidos tbody tr')).map(function(tr){ return tr.cells[5].textContent.trim(); });
      var conteoStock=STOCK.c.u[K];
      try{ localStorage.removeItem(LS_PEND); }catch(e){}
      return { enCola:enCola, idsState:idsState, filas:filas, conteoStock:conteoStock };
    }, BASE);
    chk('con el servidor ocupado la fila del stock queda en la cola…', r.enCola.indexOf('__stock__')>=0, J(r.enCola));
    chk('⚠️ …y el refresco NO la mete en STATE ni Administración la dibuja como un pedido', r.idsState.indexOf('__stock__')<0 && !r.filas.some(function(t){ return /STOCK DEL DEP/.test(t); }) && r.filas.length===1, J(r.filas));
    chk('…mientras el conteo anotado sigue en memoria (la cola lo va a mandar)', r.conteoStock===4, r.conteoStock);
    await page.close();
  }
  {
    // el arqueo del Cuadre: mismo agujero, misma protección
    const page = await nueva();
    const r = await page.evaluate(async (base) => {
      eval(base);
      ARQUEO={}; RETIROS=[];
      var hoy=todayStr(), mes=hoy.slice(0,7);
      STATE=[ window._P({id:'g1', nota:'960', oc:'09-960', metodoPago:'Efectivo 600 @'+hoy+' #960 %X', productos:[{desc:'G',cant:1,precio:600}]}) ];
      var arqViejo=filaSistema(ARQUEO_ID, 'arqueo', 'mes|'+mes+'|Efectivo=1000');   // lo que la planilla tenía de antes
      apiSave=window._apiSaveReal;
      apiPost=function(payload){ if(payload&&payload.action==='save'){ var copia=JSON.parse(JSON.stringify(payload.pedido)); window._guardadas.push(copia); return Promise.resolve({ok:true, pedido:copia}); } return Promise.resolve({ok:true}); };
      apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat([arqViejo])))}); },60); }); };
      var enVuelo=refrescarEstado();
      showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); document.getElementById('cua-vendedor').value=''; document.getElementById('cua-mes').value=mes; segSet('cua-mode','mes'); setCuadreModo('mes');
      setCuadreArqueo('Efectivo','600');                    // contabilidad anota lo contado HOY
      var anotado=cuadreArqueo('Efectivo');
      await enVuelo;
      var despues=cuadreArqueo('Efectivo');
      var inp=document.querySelector('.cua-arqueo');
      return { anotado:anotado, despues:despues, input:inp?inp.value:null, guardado:window._guardadas.filter(function(s){ return s.id===ARQUEO_ID; }).map(function(s){ return s.observaciones; }) };
    }, BASE);
    chk('⚠️ el arqueo recién anotado (600) no lo pisa un list en vuelo con la fila vieja (1000)', r.anotado===600 && r.despues===600 && r.input==='600', J(r));
    chk('…y lo que fue al servidor es el 600', r.guardado.length===1 && /Efectivo=600/.test(r.guardado[0]), J(r.guardado));
    await page.close();
  }

  // ═══ 2. Recogida dada por llegada desde el Excel ═══════════════════════════════
  console.log('\n── 2. La recogida cerrada por el Excel se descuenta de Moreno ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      STATE=[ window._P({id:'x', fecha:window._adel(2), entregado:false, productos:H(1)}) ];
      STOCK=stockVacio();
      STOCK.c={ f:window._atras(3), hora:'09:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=2;
      STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:window._atras(3), u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=10;
      STOCK.al={ 'PRODUCTOS TERMINADOS FAB.':'log', 'IM - PRODUCTOTERMINADO':'otro' };
      // ayer se anotó una recogida de 5 de Moreno para hoy
      STOCK.p=[{ id:'rc1', k:K, u:5, tipo:'recogida', de:'IM - PRODUCTOTERMINADO', fab:'', f:window._atras(1), esp:todayStr(), r:'' }];
      stockOlvidarIndice();
      var antes=stockData().lista.filter(function(o){ return o.k===K; })[0];
      var a={ deposito:antes.deposito, enOtros:antes.enOtros, enCamino:antes.enCamino, hay:antes.deposito+antes.enOtros+antes.enCamino };
      // hoy logística sube su Excel: ya tiene los 5 que llegaron (2+5 = 7) y se tilda «darlos por llegados»
      var items=[{cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:7, cat:true, k:K}];
      EXIST_IMP={ fecha:todayStr(), sinFecha:false, almacen:'PRODUCTOS TERMINADOS FAB.', items:items, total:7, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{CH1201:K}, esLog:true, conocido:true, hora:'16:00:00' };
      renderImportExist();
      var chkCerrar=document.getElementById('exist-cerrar-ped');
      var teniaCheck=!!chkCerrar && chkCerrar.checked;
      confirmarImportExist();
      var q=STOCK.p[0];
      var desp=stockData().lista.filter(function(o){ return o.k===K; })[0];
      return { antes:a, teniaCheck:teniaCheck, q:{r:q.r, enConteo:q.enConteo, ru:q.ru, u:q.u}, moreno:STOCK.g['IM - PRODUCTOTERMINADO'].u[K],
               despues:{ deposito:desp.deposito, enOtros:desp.enOtros, enCamino:desp.enCamino, hay:desp.deposito+desp.enOtros+desp.enCamino } };
    }, BASE);
    chk('antes: 2 acá + 5 libres en Moreno (10 − 5 en camino) + 5 en camino = 12 reales', r.antes.deposito===2 && r.antes.enOtros===5 && r.antes.enCamino===5, J(r.antes));
    chk('la ventana ofrece «darlos por llegados» tildado y al confirmar cierra la recogida', r.teniaCheck===true && !!r.q.r && r.q.enConteo===true && r.q.ru===5, J(r.q));
    chk('⚠️ …y Moreno queda en 5: 7 acá + 5 allá = 12 (antes seguía en 10 y el panel veía 17)', r.moreno===5 && r.despues.deposito===7 && r.despues.enOtros===5 && r.despues.enCamino===0 && r.despues.hay===12, J(r.despues)+' · moreno '+r.moreno);
    await page.close();
  }

  // ═══ 3. El plan del mes sin Eduardo ni pedidos puntuales ═══════════════════════
  console.log('\n── 3. «Qué producir» no cuenta a Eduardo ni a los pedidos puntuales ──');
  {
    const page = await nueva();
    const r = await page.evaluate((base) => {
      eval(base);
      var ago=new Date(2026,7,14,12,0,0).getTime();
      var armar=function(extra){
        STATE=[];
        [2,5,8,11].forEach(function(n,i){ STATE.push(window._P({id:'h'+i, fecha:window._atras(n), productos:H(2)})); });      // equipo: 4 entregas de 2, este mes
        [1,2,3].forEach(function(i){ STATE.push(window._P({id:'a'+i, fecha:'2026-08-2'+i, ts:ago, productos:H(2)})); });      // equipo en agosto: 3 entregas de 2
        (extra||[]).forEach(function(p){ STATE.push(p); });
        STOCK=stockVacio(); STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true }; STOCK.c.u[K]=0; stockOlvidarIndice();
        var d=stockData(), R=stockProducir(d), f=null;
        R.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
        var o=d.lista.filter(function(x){ return x.k===K; })[0];
        return { mes:f&&f.mes, mesNec:f&&f.mesNec, est:f&&f.rango?f.rango.est.map(function(e){ return e.n+'='+Math.round(e.v*10)/10; }):null, v30:o.v30, porDiaMes:o.porDiaMes, idx:(ventasPanelIndex()[K]||{})['2026-08']||0 };
      };
      var sin=armar([]);
      var conEdu=armar([ window._P({id:'edu', fecha:'2026-08-20', ts:ago, vendedor:'Eduardo Añez', cliente:'MULTICENTER', productos:H(40)}) ]);
      var conPunt=armar([ window._P({id:'mc', fecha:'2026-08-20', ts:ago, vendedor:'Carola Chavez', cliente:'MULTICENTER', productos:H(40)}) ]);
      var conRpt=armar([ window._P({id:'rpt', fecha:'2026-08-20', ts:ago, oc:'RPT 08-001', cliente:'Charcas', productos:H(40)}) ]);
      abrirStock(); var el=document.getElementById('producir'); var cabecera=el?el.textContent.replace(/\s+/g,' '):''; closeStock();
      return { sin:sin, conEdu:conEdu, conPunt:conPunt, conRpt:conRpt, cabecera:cabecera.slice(0,420) };
    }, BASE);
    chk('el equipo solo: agosto en el índice del panel = 6 (3 entregas de 2)', r.sin.idx===6 && r.sin.mes>0, J(r.sin));
    chk('⚠️ una venta única de 40 de EDUARDO en agosto no cambia «producir el mes que viene» (antes subía de 9 a 24)', r.conEdu.idx===6 && r.conEdu.mes===r.sin.mes && r.conEdu.mesNec===r.sin.mesNec && r.conEdu.v30===r.sin.v30, 'sin: '+J(r.sin)+' · con Eduardo: '+J(r.conEdu));
    chk('…ni un pedido PUNTUAL (MULTICENTER) del equipo', r.conPunt.idx===6 && r.conPunt.mes===r.sin.mes, 'con puntual: '+J(r.conPunt));
    chk('…ni una reposición de tienda', r.conRpt.idx===6 && r.conRpt.mes===r.sin.mes, 'con RPT: '+J(r.conRpt));
    chk('la cabecera del cuadro dice la verdad: sin Eduardo, puntuales ni reposiciones, y qué productos entran', /sin Eduardo, pedidos puntuales ni reposiciones/.test(r.cabecera) && /mismo mes del año pasado/.test(r.cabecera), r.cabecera.slice(0,240));
    await page.close();
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
