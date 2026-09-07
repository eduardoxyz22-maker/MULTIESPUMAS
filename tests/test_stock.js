/* 📦 AVISAR ANTES DE QUEDARSE SIN LO QUE MÁS SALE (§4cn).

   Pedido del dueño: *"más tipo moda, que se entrega más seguido, y alerte sobre tener
   stock"*. No es la lista de faltantes —esa ya existe y mira lo que YA falta— sino el aviso
   ANTES: lo que más rota y se está por acabar, con los 3 días que tarda la fábrica
   (MORENO / MULTI) como referencia.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que NO invente un número de depósito. Sin conteo no hay aviso: un «tenés 4» inventado
      es peor que no decir nada, porque se le cree.
   2. Que el cálculo sea IDEMPOTENTE. El stock se recalcula desde el último conteo, no se va
      descontando: recalcular diez veces tiene que dar lo mismo. Un saldo que se descuenta
      solo se desvía para siempre con una sola entrega marcada dos veces.
   3. Que un conteo nuevo BORRE el error acumulado (es para lo que sirve contar).
   4. Que los borradores de Kommo y las filas del sistema no cuenten como movimiento.

   Se corre:  node tests/test_stock.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* El escenario: el ECO FLEX 2 PLAZAS es el que más sale (28 entregados en 28 días = 1
     por día). El PILLOW 3 PLAZAS sale poco (2 en 28 días). Y hay uno vendido sin entregar
     para pasado mañana. */
  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    STOCK={ c:{f:'',u:{}}, e:[] };
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    var eco =function(n){ return [{desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190',codigo:'E2',cant:n}]; };
    var pill=function(n){ return [{desc:'COLCHON PILLOW FLEX 3 PLAZAS',medida:'180x190',codigo:'P3',cant:n}]; };
    STATE=[];
    for(var i=1;i<=28;i++) STATE.push(P({id:'e'+i, fecha:atras(i), entregado:true, productos:eco(1)}));
    STATE.push(P({id:'q1', fecha:atras(3), entregado:true, productos:pill(1)}));
    STATE.push(P({id:'q2', fecha:atras(9), entregado:true, productos:pill(1)}));
    // Vendido y sin entregar, para pasado mañana
    STATE.push(P({id:'v1', fecha:adel(2), entregado:false, productos:eco(5)}));
    // 📥 Un borrador de Kommo: NO es una venta todavía, no puede contar
    STATE.push(P({id:'kommo-99', fecha:'', turno:'', estado:'Borrador Kommo', entregado:false, productos:eco(50)}));
    saveMirror(); updateStats();
  });

  await armar();

  // ══ 1. La rotación: qué sale más ═══════════════════════════════════════════
  console.log('\n── 1. Lo que más sale ──');
  let r = await page.evaluate(() => {
    var d=stockData();
    var eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    var pill=d.lista.filter(o=>/PILLOW/.test(o.desc))[0];
    return { eco:eco, pill:pill, primero:d.lista[0] && d.lista[0].desc, ventana:STOCK_VENTANA };
  });
  chk('mide la rotación sobre los últimos 28 días', r.ventana===28, r.ventana);
  chk('⚠️ el ECO FLEX sale 1 por día (28 entregados en 28 días)',
      Math.abs(r.eco.porDia-1)<0.02, r.eco.porDia+' · '+r.eco.salieron+' entregados');
  chk('…y el PILLOW mucho menos', r.pill.porDia<0.1, r.pill.porDia);
  chk('⚠️ el borrador de Kommo (50 unidades) NO cuenta como venta',
      r.eco.comp===5, r.eco.comp+' comprometidas (solo las 5 del pedido de verdad)');
  chk('…y lo vendido sin entregar para dentro de 2 días sí',
      r.eco.compPronto===5, r.eco.compPronto);

  // ══ 2. Sin conteo NO se inventa nada ═══════════════════════════════════════
  console.log('\n── 2. Sin haber contado el depósito ──');
  r = await page.evaluate(() => {
    var d=stockData(), eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    renderAdmin();
    return { deposito:eco.deposito, alcanza:eco.alcanza, aviso:eco.aviso,
             banner:(document.getElementById('adm-stock')||{}).textContent||'' };
  });
  chk('⚠️ el depósito queda en «sin contar», NO en cero ni en un número inventado',
      r.deposito===null, JSON.stringify(r.deposito));
  chk('…y por lo tanto no dice para cuántos días alcanza', r.alcanza===null, JSON.stringify(r.alcanza));
  chk('…lo marca como «sin contar», no como que falte', r.aviso==='sincontar', r.aviso);
  chk('⚠️ y NO aparece ningún aviso en Administración', r.banner.trim()==='', r.banner.slice(0,80));

  // ══ 3. Con el conteo, avisa ════════════════════════════════════════════════
  console.log('\n── 3. Después de contar el depósito ──');
  r = await page.evaluate(() => {
    STOCK={ c:{f:todayStr(), u:{}}, e:[] };
    STOCK.c.u[prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'})]=2;   // quedan 2, salen 1/día
    STOCK.c.u[prodRankKey({desc:'COLCHON PILLOW FLEX 3 PLAZAS',medida:'180x190'})]=30;
    var d=stockData();
    var eco=d.lista.filter(o=>/ECO FLEX/.test(o.desc))[0];
    var pill=d.lista.filter(o=>/PILLOW/.test(o.desc))[0];
    renderAdmin();
    return { eco:eco, pill:pill, primero:d.lista[0].desc,
             banner:(document.getElementById('adm-stock')||{}).textContent||'',
             fabrica:STOCK_DIAS_FABRICA, colchon:STOCK_COLCHON };
  });
  chk('la fábrica tarda 3 días (lo dijo el dueño)', r.fabrica===3, r.fabrica);
  chk('el depósito del ECO FLEX es 2', r.eco.deposito===2, r.eco.deposito);
  chk('⚠️ …alcanza para 2 días, menos que los 3 de fábrica → PEDIR YA',
      r.eco.aviso==='urgente' && Math.abs(r.eco.alcanza-2)<0.05, r.eco.aviso+' · '+r.eco.alcanza+' días');
  chk('⚠️ el que sale poco y tiene 30 en depósito NO molesta', r.pill.aviso==='', r.pill.aviso);
  chk('lo urgente va primero en la lista', /ECO FLEX/.test(r.primero), r.primero);
  chk('⚠️ y ahora SÍ avisa en Administración, diciendo cuál',
      /se acaba/.test(r.banner) && /ECO FLEX/.test(r.banner), r.banner.replace(/\s+/g,' ').slice(0,130));

  // ══ 4. La cuenta es idempotente ════════════════════════════════════════════
  console.log('\n── 4. Recalcular no cambia el resultado ──');
  r = await page.evaluate(() => {
    var k=prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'});
    var v=[]; for(var i=0;i<10;i++) v.push(stockDeposito(k));
    /* Y repintar tampoco: el bug clásico de un saldo que se descuenta es que cada
       repintado le come una unidad más. */
    for(var j=0;j<5;j++){ renderAdmin(); renderStock(); }
    v.push(stockDeposito(k));
    return { todos:v, iguales:v.every(function(x){ return x===v[0]; }) };
  });
  chk('⚠️ calcular el depósito 10 veces da SIEMPRE lo mismo', r.iguales===true, JSON.stringify(r.todos));
  chk('…y repintar la pantalla tampoco descuenta nada', r.todos[r.todos.length-1]===2, r.todos[r.todos.length-1]);

  // ══ 5. Entregar descuenta · llegar de fábrica suma ═════════════════════════
  console.log('\n── 5. Se mueve solo con las entregas ──');
  r = await page.evaluate(() => {
    var k=prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'});
    var antes=stockDeposito(k);
    // Se entrega el pedido de 5 unidades que estaba pendiente
    var p=STATE.filter(function(x){ return x.id==='v1'; })[0];
    p.entregado=true; p.fecha=todayStr();
    var despues=stockDeposito(k);
    // Llegan 10 de fábrica
    STOCK.e=STOCK.e.concat([{f:todayStr(), k:k, u:10, fab:'MORENO'}]);
    var conEntrada=stockDeposito(k);
    return { antes:antes, despues:despues, conEntrada:conEntrada };
  });
  chk('⚠️ al marcar entregadas 5 unidades, el depósito baja 5', r.despues===r.antes-5, r.antes+' → '+r.despues);
  chk('⚠️ …y llegan 10 de fábrica: sube a '+(r.despues+10), r.conEntrada===r.despues+10, r.conEntrada);
  /* Quedó en −3: se entregaron más de las que decía el conteo. NO es un error de cuenta,
     es la señal de que ese conteo quedó viejo — y la pantalla tiene que decirlo así, no
     mostrar un número raro. */
  const negativo = await page.evaluate(() => {
    STOCK={ c:{f:diasAtras(1), u:{}}, e:[] };
    STOCK.c.u[prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'})]=1;
    renderStock();
    var t=(document.getElementById('stock-body')||{}).textContent||'';
    return { dep:stockDeposito(prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'})), txt:t.replace(/\s+/g,' ') };
  });
  chk('un depósito negativo no se muestra como número raro', negativo.dep<0, negativo.dep);
  chk('⚠️ …dice que se entregó más de lo contado y que hay que volver a contar',
      /más de lo contado/.test(negativo.txt) && /volv[ée] a contar/.test(negativo.txt),
      (negativo.txt.match(/se entregaron[^·]*/)||[''])[0].slice(0,80));

  // ══ 6. Un conteo nuevo borra el error acumulado ════════════════════════════
  console.log('\n── 6. Volver a contar corrige la deriva ──');
  r = await page.evaluate(() => {
    var k=prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'});
    var calculado=stockDeposito(k);
    /* En el depósito hay 4 de verdad (se rompió uno, se prestó otro: el panel no puede
       saberlo). Se cuenta de nuevo y ESE número manda. */
    STOCK={ c:{f:todayStr(), u:{}}, e:[{f:todayStr(), k:k, u:99, fab:'X'}] };
    STOCK.c.u[k]=4;
    var despuesDeContar=stockDeposito(k);
    /* Las entradas ANTERIORES al conteo ya están adentro del conteo: si se sumaran,
       contarían dos veces. `guardarStock()` las poda. */
    guardarStock();
    var podadas=STOCK.e.length;
    return { calculado:calculado, despuesDeContar:despuesDeContar, podadas:podadas,
             guardada:(window._guardadas.filter(function(x){return x.id===STOCK_ID;})[0]||{}).observaciones||'' };
  });
  /* 4 contados + 99 que llegaron hoy − 5 que se entregaron HOY = 98.
     ⚠️ Las 5 de hoy se descuentan aunque el conteo también sea de hoy: no se sabe si el
     camión salió antes o después de contar, y se elige el lado que no deja sin avisar
     (quedar corto y pedir de más cuesta menos que quedarse sin vender). Está escrito así
     en `stockDeposito`. */
  chk('⚠️ el conteo nuevo manda sobre lo calculado', r.despuesDeContar===4+99-5,
      'calculado antes '+r.calculado+' · después de contar 4 (+99 de hoy −5 entregadas hoy) = '+r.despuesDeContar);
  chk('el conteo se guarda en la planilla como fila del sistema',
      /"c":/.test(r.guardada) && /"u":/.test(r.guardada), r.guardada.slice(0,90));

  r = await page.evaluate(() => {
    var k=prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'});
    // Una entrada VIEJA (anterior al conteo) tiene que podarse al guardar
    STOCK.e=[{f:'2020-01-01', k:k, u:77, fab:'VIEJA'}, {f:todayStr(), k:k, u:5, fab:'HOY'}];
    guardarStock();
    return { quedan:STOCK.e.length, total:stockEntradas(k) };
  });
  chk('⚠️ una entrada anterior al conteo se descarta (ya estaba contada)', r.quedan===1 && r.total===5,
      r.quedan+' entradas · '+r.total+' unidades');

  // ══ 7. Ida y vuelta por la planilla ════════════════════════════════════════
  console.log('\n── 7. Sobrevive el viaje a la planilla ──');
  r = await page.evaluate(() => {
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK={ c:{f:'',u:{}}, e:[] };                        // como si se recargara la página
    var leido=leerStock(fila);
    return { fecha:leido.c.f, nProds:Object.keys(leido.c.u).length,
             sistema:esFilaSistema(fila), sinFecha:fila.fecha==='' };
  });
  chk('lo guardado se vuelve a leer igual', !!r.fecha && r.nProds>0, r.fecha+' · '+r.nProds+' productos');
  chk('⚠️ la fila del stock es del SISTEMA: no es un pedido', r.sistema===true);
  chk('⚠️ …y va sin fecha, así no ocupa cupo de ningún camión', r.sinFecha===true);

  r = await page.evaluate(() => {
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK={ c:{f:'',u:{}}, e:[] };
    var lista=leerCierresDeLista(STATE.concat([fila]));
    return { enLista:lista.filter(function(p){ return p.id===STOCK_ID; }).length,
             cargado:!!STOCK.c.f };
  });
  chk('⚠️ al bajar la planilla, la fila del stock NO aparece como pedido', r.enLista===0, r.enLista);
  chk('…y el conteo queda cargado solo', r.cargado===true);
  chk('aguanta una fila rota sin reventar', await page.evaluate(() => {
    var x=leerStock({observaciones:'esto no es json'});
    var y=leerStock({});
    return x.c.f==='' && !x.e.length && y.c.f==='';
  }));

  // ══ 8. El mensaje para la fábrica ══════════════════════════════════════════
  console.log('\n── 8. El pedido a fábrica ──');
  r = await page.evaluate(() => {
    STATE=STATE.filter(function(p){ return p.id!=='v1'; });
    var k=prodRankKey({desc:'COLCHON ECO FLEX 2 PLAZAS',medida:'140x190'});
    STOCK={ c:{f:todayStr(), u:{}}, e:[] }; STOCK.c.u[k]=1;
    var copiado='';
    if(!window._copyOrig) window._copyOrig=window.copyText;
    window.copyText=function(t){ copiado=t; };
    copiarStock();
    window.copyText=window._copyOrig;
    return copiado;
  });
  chk('arma el mensaje para la fábrica', /PEDIDO A F[ÁA]BRICA/.test(r), r.split('\n')[0]);
  chk('⚠️ dice cuántas unidades pedir', /pedir \d+/.test(r), (r.match(/pedir \d+[^\n]*/)||[''])[0]);
  chk('…y por qué: lo que queda y lo que sale por día',
      /quedan 1/.test(r) && /por día/.test(r), (r.match(/quedan[^\n]*/)||[''])[0]);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
