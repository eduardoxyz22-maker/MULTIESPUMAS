/* 📚 EL RESUMEN MENSUAL DEL PANEL SE ARMA CON LOS DATOS DE AHORA (§4ec).

   `ventasPanelIndex()` es lo vendido por producto y mes según el panel: alimenta las
   estimaciones de 60 y 90 días y la tendencia del plan del mes (🏭 Qué producir). La primera
   versión (§4du) lo guardaba y lo reusaba mientras `STATE.length` no cambiara — y la cantidad
   de pedidos no dice nada de su contenido: corregir 2 → 20 unidades, cambiar el producto, el
   mes de venta, o recibir del servidor la planilla corregida con la misma cantidad de filas,
   dejaban el plan con los números viejos. Lo encontró ChatGPT el 12/09.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que el resumen refleje cantidad, producto y mes de venta DESPUÉS de una corrección local
      (`upsert`), sin que cambie la cantidad de pedidos.
   2. Que una planilla corregida que baja del servidor (`refrescarEstado`) con la misma
      cantidad de filas también se refleje, y que reemplazar registros a igual longitud idem.
   3. Que el mes de venta sea el de CARGA (`contaFecha`): cambiar la fecha de entrega no lo mueve.
   4. Que unir productos a mano (STOCK.a) mueva las unidades a la clave unida.
   5. Que el plan del mes (`stockProducir`) use el resumen actualizado y que, recalculando varias
      veces, no duplique nada; y que todo coincida con una reconstrucción independiente.

   La red está cortada y el servidor es simulado (`apiPost` devuelve `window.__srv`): no se
   toca ninguna venta real. Datos sintéticos.

   Se corre:  node tests/test_ventas_panel.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());          // nada de red: la planilla real no se toca
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['ventasPanelIndex','ventasHistIndex','stockRangoMes','stockProducir','stockData','refrescarEstado','upsert','stockOlvidarIndice']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el resumen mensual (§4ec)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  const R = await page.evaluate(async () => {
    var K='COLCHON SOFT|140X190', K2='COLCHON SEMIORTOP.|140X190', casos=[];
    var chk=function(n, ok, det){ casos.push({n:n, ok:!!ok, det:det}); };
    /* El servidor simulado: contesta con lo que haya en window.__srv y acepta todo guardado. */
    window.__srv=[]; apiPost=function(payload){ if(payload.action==='list') return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window.__srv))}); return Promise.resolve({ok:true}); };
    CONNECTED=true;
    var ago=new Date(); ago.setMonth(7,15); ago.setHours(10,0,0,0);         // 15 de agosto de este año
    var sep=new Date(); sep.setMonth(8,3); sep.setHours(10,0,0,0);          // 3 de septiembre
    var y=ago.getFullYear(), mAgo=y+'-08', mSep=y+'-09', mOct=y+'-10';
    var mk=function(o){ return Object.assign({id:'s'+Math.random().toString(36).slice(2), fecha:y+'-08-16', ts:ago.getTime(), oc:'08-900', vendedor:'Carola Chavez', cliente:'CLIENTE PRUEBA', celular:'70000000', turno:'AM', zona:'Norte', direccion:'x', maps:'', pagado:true, saldo:0, estado:'', entregado:true, verificado:true, fotos:[], productos:[{desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:2}]}, o); };
    var A=mk({id:'sA'}), B=mk({id:'sB', productos:[{desc:'ALMOHADA', medida:'50x70', codigo:'CD1403', cant:3}]}), C=mk({id:'sC', vendedor:'Fernando Peinado', productos:[{desc:'COLCHON SEMIORTOP.', medida:'105x190', codigo:'COLT0037', cant:1}]});
    var base=[A,B,C].map(function(p){ return JSON.parse(JSON.stringify(p)); });
    STATE=JSON.parse(JSON.stringify(base)); STOCK.c={f:todayStr(), u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.'}; STOCK.a={}; STOCK.e=[]; STOCK.p=[]; STOCK.g={};
    if(typeof STOCK_MEMO!=='undefined') STOCK_MEMO={}; stockOlvidarIndice();
    var leer=function(k, m){ var i=ventasPanelIndex(); return ((i[k]||{})[m||mAgo])||0; };
    /* La reconstrucción de control: las mismas reglas, escritas aparte. */
    var rebuild=function(){ var idx={}; STATE.forEach(function(p){ if(!stockCuenta(p)||esRPT(p.oc)) return; var m=String(contaFecha(p)||fechaSalida(p)||'').slice(0,7); if(!m||m<'2026-08') return; (p.productos||[]).forEach(function(x){ if(esProdDeTienda(x)) return; var c=Number(x.cant)||0; if(!(c>0)) return; var k=stockClave(x); if(!k||k==='|') return; (idx[k]=idx[k]||{})[m]=((idx[k]||{})[m]||0)+c; }); }); return idx; };
    var eq=function(a,b){ return JSON.stringify(a)===JSON.stringify(b); };
    ventasPanelIndex();                                    // se arma una vez (la versión vieja lo cacheaba acá)
    chk('punto de partida: 2 SOFT vendidos en agosto', leer(K)===2, leer(K));
    // 1. cantidad
    var a=JSON.parse(JSON.stringify(A)); a.productos[0].cant=20; upsert(a);
    chk('⚠️ corregir 2 → 20 unidades (misma cantidad de pedidos) se ve en el resumen', leer(K)===20, leer(K));
    a=JSON.parse(JSON.stringify(A)); a.productos[0].cant=5; upsert(a);
    chk('bajar 20 → 5 también', leer(K)===5, leer(K));
    // 2. producto
    a=JSON.parse(JSON.stringify(A)); a.productos[0]={desc:'COLCHON SEMIORTOP.', medida:'140x190', codigo:'COLT0038', cant:5}; upsert(a);
    chk('cambiar el producto: el viejo queda en 0 y el nuevo se lleva las 5', leer(K)===0 && leer(K2)===5, leer(K)+' / '+leer(K2));
    // 3. fecha de venta (la de carga)
    a=JSON.parse(JSON.stringify(A)); a.ts=sep.getTime(); a.fecha=y+'-09-04'; a.productos[0].cant=5; upsert(a);
    chk('mover la venta a septiembre: sale de agosto y entra en septiembre', leer(K,mAgo)===0 && leer(K,mSep)===5, leer(K,mAgo)+' / '+leer(K,mSep));
    // 4. fecha de entrega no mueve el mes de venta
    a=JSON.parse(JSON.stringify(A)); a.ts=sep.getTime(); a.fecha=y+'-10-02'; a.productos[0].cant=5; upsert(a);
    chk('cambiar solo la fecha de ENTREGA (a octubre) no mueve el mes de venta', leer(K,mSep)===5 && leer(K,mOct)===0, leer(K,mSep)+' / '+leer(K,mOct));
    // 5. el servidor manda la planilla corregida con la misma cantidad de filas
    STATE=JSON.parse(JSON.stringify(base)); ventasPanelIndex();
    window.__srv=JSON.parse(JSON.stringify(base)); window.__srv[0].productos[0].cant=7;
    await refrescarEstado();
    chk('⚠️ refrescarEstado() con la planilla corregida (mismas filas): el resumen dice 7', STATE.length===3 && leer(K)===7, leer(K));
    // 6. reemplazo a igual longitud
    var D=mk({id:'sD', productos:[{desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:9}]});
    STATE=[JSON.parse(JSON.stringify(B)), JSON.parse(JSON.stringify(C)), D];
    chk('borrar un pedido y agregar otro (misma longitud): 9', leer(K)===9, leer(K));
    // 7. repetición
    var r1=leer(K), r2=leer(K), r3=leer(K);
    chk('recalcular tres veces seguidas no duplica', r1===9 && r2===9 && r3===9, r1+','+r2+','+r3);
    // 8. identidad: unión a mano
    STOCK.a={}; STOCK.a[K]='COLCHON SOFT UNIDO|140X190'; stockOlvidarIndice();
    var i8=ventasPanelIndex(); var movio=((i8['COLCHON SOFT UNIDO|140X190']||{})[mAgo]||0)===9 && !i8[K];
    STOCK.a={}; stockOlvidarIndice();
    chk('unir productos a mano (🔗) mueve las unidades a la clave unida', movio, Object.keys(i8).join(', '));
    // 9. el plan del mes y la copia para fábrica usan el resumen corregido
    STATE=JSON.parse(JSON.stringify(base)); a=JSON.parse(JSON.stringify(A)); a.productos[0].cant=20; upsert(a);
    var d=stockData(), P=stockProducir(d), f=null; P.bloques.forEach(function(Bq){ Bq.filas.forEach(function(x){ if(x.o.k===K) f=x; }); });
    var e60=f&&f.rango&&f.rango.est.filter(function(e){ return e.n==='60 d'; })[0];
    var H=ventasHistIndex()[K]||{}, MS=P.mes, mAnt=mesRestar(todayStr().slice(0,7),2);
    var esperado=(20+(H[mAnt]||0))/2*MS.dias/30.4;
    chk('el plan del mes (60 d) usa las 20 unidades corregidas', !!e60 && Math.abs(e60.v-esperado)<1e-6, e60?(e60.v.toFixed(2)+' esperado '+esperado.toFixed(2)):'sin fila en el plan');
    var P2=stockProducir(d), f2=null; P2.bloques.forEach(function(Bq){ Bq.filas.forEach(function(x){ if(x.o.k===K) f2=x; }); });
    chk('recalcular el plan da lo mismo (una sola pasada por STATE por plan)', f2 && f && f2.mes===f.mes && f2.mesNec===f.mesNec, f?(f.mesNec+' → '+(f2&&f2.mesNec)):'');
    // 10. control
    chk('el resumen coincide con una reconstrucción independiente', eq(ventasPanelIndex(), rebuild()), '');
    chk('no quedó ninguna caché por cantidad de pedidos', typeof VENTAS_PANEL_N==='undefined' && typeof VENTAS_PANEL_IDX==='undefined', '');
    return casos;
  });
  console.log('\n── El resumen mensual con datos sintéticos ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
