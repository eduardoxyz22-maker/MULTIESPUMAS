/* 📥 SUBIR EL EXCEL DE EXISTENCIAS DEL SISTEMA DE MORENO (§4cp).

   El dueño: *"estos son los almacenes… uno es de industrias moreno y el otro productos
   terminado fabrica que es el almacén de logística de donde salen los camiones. Subiendo
   este excel deberían ellos actualizar cada día el almacén."*

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que el archivo se LEA. El generador de Moreno escribe los atributos del XML con
      COMILLAS SIMPLES (`<c r='C2' t='s'>`): con el lector de comillas dobles el archivo se
      abría «bien» —352 filas— y no traía un solo dato. Es el bug que casi pasa desapercibido.
   2. Que la CANTIDAD salga de la columna correcta. En este reporte la cantidad NO tiene
      encabezado arriba: el título «Cantidad» está una fila más arriba y corrido varias
      columnas. Si se busca por el título, se lee la columna equivocada.
   3. Que los DOS almacenes NO se sumen. De uno salen los camiones (ese es «en depósito»);
      lo del otro está fabricado pero hay que ir a buscarlo, y cambia el consejo: traer en
      vez de pedir.
   4. Que reemplace y no acumule: subir el mismo archivo dos veces tiene que dar lo mismo.
   5. Que un archivo que NO es de existencias (el reporte de ventas) se rechace diciendo qué
      sacar, en vez de cargar cualquier cosa.

   Los .xlsx de `tests/datos/existencias_*.xlsx` son SINTÉTICOS: misma estructura exacta que
   el reporte real, cantidades inventadas. El repo es público y el inventario de la empresa
   no va acá.

   Se corre:  node tests/test_existencias.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const LOG = path.resolve('tests/datos/existencias_logistica.xlsx');
const FAB = path.resolve('tests/datos/existencias_fabrica.xlsx');
const ROHO= path.resolve('tests/datos/roho.xlsx');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['existLeer','onExistArchivo','confirmarImportExist','stockOtrosTxt','stockUnid']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el importador de existencias (§4cp)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  /* Escenario: se vende 1 TITANIO LATEX por día (28 en 28 días) y hay 4 vendidos sin
     entregar para pasado mañana. Del ECO FLEX 140 se vende poco. */
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    STOCK={ c:{f:'',u:{}}, e:[], p:[], a:{}, g:{}, al:{} };
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:[]}); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    window._adel=adel; window._atras=atras;
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'N',direccion:'x',maps:'',pagado:true,saldo:0,ts:Date.now(),
      metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,
      facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    STATE=[];
    for(var i=1;i<=28;i++) STATE.push(P({id:'t'+i, fecha:atras(i), entregado:true,
      productos:[{desc:'TITANIO LATEX',medida:'140x190',codigo:'',cant:1}]}));
    STATE.push(P({id:'v1', fecha:adel(2), entregado:false,
      productos:[{desc:'COLCHON TITANIO LATEX 140X190',medida:'',codigo:'CH1129',cant:4}]}));
    STATE.push(P({id:'x1', fecha:atras(3), entregado:true,
      productos:[{desc:'ECO FLEX',medida:'140x190',codigo:'',cant:2}]}));
    saveMirror(); updateStats();
    window.KT=stockClave({codigo:'CH1129'});
    window.KE=stockClave({codigo:'CH1332'});
    window.KA=stockClave({codigo:'CD1403'});
  });
  const subir = async (f) => { await page.setInputFiles('#exist-input', f); await page.waitForTimeout(700); };
  const leido = () => page.evaluate(() => {
    var R=window.EXIST_IMP;
    return R ? { alm:R.almacen, fecha:R.fecha, n:R.items.length, total:R.total, esLog:R.esLog, col:R.colCant,
                 items:R.items.map(function(i){ return {k:i.k, cod:i.cod, cant:i.cant, cat:i.cat}; }) } : null;
  });

  // ══ 1. Se lee de verdad (comillas simples) ════════════════════════════════
  console.log('\n── 1. El archivo se lee ──');
  await subir(LOG);
  let r = await leido();
  chk('⚠️ el reporte se lee aunque el XML use COMILLAS SIMPLES en los atributos', !!r && r.n>0, r?(r.n+' productos'):'no leyó nada');
  chk('saca el almacén del encabezado', r.alm==='PRODUCTOS TERMINADOS FAB.', r&&r.alm);
  chk('…y lo reconoce como el de logística sin preguntar', r.esLog===true, r&&r.esLog);
  chk('saca la fecha del reporte (dd/mm/aaaa → aaaa-mm-dd)', r.fecha==='2026-09-07', r&&r.fecha);
  chk('⚠️ toma la cantidad de la columna sin encabezado (AY), no de donde dice «Cantidad»',
      r.col==='AY', r&&r.col);
  chk('no cuenta las filas de agrupación, SUBTOTAL ni TOTAL', r.n===8, r&&r.n);
  chk('⚠️ una cantidad con decimales (esponja por metro) no se pierde ni se redondea',
      Math.abs(r.total-102.38)<0.001, r&&r.total);
  chk('el código en minúscula («ch1331») se resuelve igual', r.items.some(function(i){ return i.cod==='ch1331' && i.cat; }));
  chk('lo que no está en el catálogo entra igual, con su nombre', r.items.some(function(i){ return /PATAS/i.test(i.k) && !i.cat; }),
      (r.items.filter(function(i){ return !i.cat; }).map(function(i){ return i.k; }).join(' / ')));

  // ══ 2. Se aplica como conteo del depósito ═════════════════════════════════
  console.log('\n── 2. Queda como el conteo del depósito ──');
  r = await page.evaluate(() => {
    confirmarImportExist();
    var d=stockData(), t=d.lista.filter(function(o){ return o.k===KT; })[0];
    return { fecha:STOCK.c.f, n:Object.keys(STOCK.c.u).length, entradas:STOCK.e.length,
             titanio:stockDeposito(KT), eco:stockDeposito(KE), almo:stockDeposito(KA),
             porDia:t.porDia, comp:t.comp, aviso:t.aviso, guardada:!!window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).length };
  });
  chk('⚠️ el conteo queda con la FECHA DEL REPORTE, no con la de hoy', r.fecha==='2026-09-07', r.fecha);
  chk('…con los 8 productos del archivo', r.n===8, r.n);
  chk('…y se guarda en la planilla como fila del sistema', r.guardada===true);
  chk('⚠️ el TITANIO LATEX del Excel y el que cargó la vendedora son el mismo producto',
      r.titanio===4 && r.porDia>0.9, r.titanio+' en depósito · '+r.porDia+' por día');
  chk('el ECO FLEX 140 del Excel también se une al que se vendió', r.eco===2, r.eco);
  chk('las entradas sueltas se limpian: el conteo ya las incluye', r.entradas===0, r.entradas);

  // ══ 3. Subirlo dos veces no cambia nada ═══════════════════════════════════
  console.log('\n── 3. Subir el mismo archivo dos veces ──');
  await subir(LOG);
  r = await page.evaluate(() => {
    confirmarImportExist();
    return { titanio:stockDeposito(KT), n:Object.keys(STOCK.c.u).length, almo:stockDeposito(KA) };
  });
  chk('⚠️ no suma dos veces: reemplaza', r.titanio===4 && r.n===8 && r.almo===30, r.titanio+' · '+r.n+' · '+r.almo);

  // ══ 4. El segundo almacén NO se suma ══════════════════════════════════════
  console.log('\n── 4. El almacén de la fábrica va aparte ──');
  await subir(FAB);
  r = await leido();
  chk('lee el segundo almacén', r && r.alm==='IM - PRODUCTOTERMINADO', r&&r.alm);
  chk('⚠️ …y NO lo da por el de logística: pregunta qué es', r.esLog===false, r&&r.esLog);
  r = await page.evaluate(() => {
    document.getElementById('exist-rol').value='otro';
    confirmarImportExist();
    var d=stockData(), t=d.lista.filter(function(o){ return o.k===KT; })[0];
    renderStock();
    return { otros:Object.keys(STOCK.g), deposito:t.deposito, enOtros:t.enOtros, aviso:t.aviso, pedir:t.pedir,
             dep2:stockDeposito(KT), texto:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' '),
             rol:STOCK.al['IM - PRODUCTOTERMINADO'] };
  });
  chk('queda como almacén aparte', r.otros.length===1 && r.otros[0]==='IM - PRODUCTOTERMINADO', JSON.stringify(r.otros));
  chk('⚠️ los 25 de la fábrica NO se suman al depósito (de ahí no sale ningún camión)',
      r.deposito===4 && r.dep2===4, 'depósito '+r.deposito);
  /* §4cr renombró las columnas con las palabras del dueño: «Acá en fábrica» y «En Moreno»
     (antes «En depósito» / «En fábrica», que no decían dónde está parado el que mira). */
  chk('…se ven en su propia columna', r.enOtros===25 && /En Moreno/.test(r.texto) && /Acá en fábrica/.test(r.texto), r.enOtros);
  chk('⚠️ y como ya está fabricado, el consejo cambia: TRAER, no pedir',
      r.aviso==='traer' && /Traer de f[áa]brica/.test(r.texto), r.aviso);
  chk('el panel recuerda qué es ese almacén', r.rol==='otro', r.rol);
  const wa = await page.evaluate(() => {
    var t=''; var o=window.copyText; window.copyText=function(x){ t=x; }; copiarStock(); window.copyText=o; return t;
  });
  chk('⚠️ el mensaje para mandar separa «traer» de «pedir a fábrica»',
      /TRAER DE F[ÁA]BRICA/.test(wa) && /traer \d+/.test(wa), (wa.match(/traer[^\n]*/)||[''])[0].slice(0,90));

  r = await page.evaluate(() => {
    /* Con poco en la fábrica no alcanza: vuelve a ser un pedido, pero avisando que hay algo. */
    STOCK.g['IM - PRODUCTOTERMINADO'].u[KT]=1;
    var d=stockData(), t=d.lista.filter(function(o){ return o.k===KT; })[0];
    renderStock();
    return { aviso:t.aviso, enOtros:t.enOtros, texto:((document.getElementById('stock-body')||{}).textContent||'').replace(/\s+/g,' ') };
  });
  chk('si en la fábrica hay menos de lo que falta, sigue siendo pedido a fábrica',
      r.aviso!=='traer' && r.enOtros===1, r.aviso);
  /* Con aviso «pedir» el texto que corresponde es que hay algo pero no alcanza; el «para
     traer ya mismo» es el del rojo (PEDIR YA). Lo que importa en los dos casos: que no
     esconda que en la fábrica hay unidades. */
  chk('…pero avisa igual que hay 1 en la fábrica, y que no alcanza',
      /hay 1 en Moreno/.test(r.texto) && /no alcanza/.test(r.texto), (r.texto.match(/hay 1[^·]{0,45}/)||[''])[0]);

  // ══ 4b. Lo que NO está en el reporte está en CERO, no «sin contar» ════════
  console.log('\n── 4b. Lo que no figura en el corte ──');
  r = await page.evaluate(() => {
    /* El reporte lo dice él mismo: «(Productos con existencia <> 0)». Entonces un producto
       DEL CATÁLOGO que no aparece está agotado; uno que el catálogo no conoce puede estar
       ahí con otro nombre, y ese sí queda sin contar (§4cs). */
    var kCat=stockClave({codigo:'CH2299'});                       // DYNAMIC PEDIC 200x200: en el catálogo, no en el archivo
    var kNo =stockClave({desc:'MORFEO',medida:'140x190'});        // fuera del catálogo y del archivo
    return { solo0:STOCK.c.solo0, enCorte:(STOCK.c.u||{})[kCat]!=null,
             cat:stockDeposito(kCat), noCat:stockDeposito(kNo),
             esDelCatalogo:stockClaveDeCatalogo(kCat), noEsDelCatalogo:stockClaveDeCatalogo(kNo) };
  });
  chk('el panel se da cuenta de que el reporte solo lista lo que tiene existencia', r.solo0===true);
  chk('⚠️ un producto DEL CATÁLOGO que no figura en el corte está en CERO, no «sin contar»',
      r.enCorte===false && r.cat===0 && r.esDelCatalogo===true, 'depósito='+JSON.stringify(r.cat));
  chk('⚠️ …pero uno que el catálogo no conoce sigue «sin contar»: puede estar con otro nombre',
      r.noCat===null && r.noEsDelCatalogo===false, JSON.stringify(r.noCat));
  r = await page.evaluate(() => {
    STOCK.c.solo0=false;
    var v=stockDeposito(stockClave({codigo:'CH2299'}));
    STOCK.c.solo0=true;
    return v;
  });
  chk('…y si el reporte NO lo declara, se vuelve a no inventar nada', r===null, JSON.stringify(r));

  // ══ 5. Un archivo que no es de existencias ════════════════════════════════
  console.log('\n── 5. El archivo equivocado ──');
  r = await page.evaluate(() => {
    var vtas=[{A:'MULTIESPUMAS'},{J:'DETALLE VENTAS C/ ADICIONALES PARA ANALISI'},{N:'DEL',P:'01/07/2025'},
              {A:'TIPO OPERACION',AU:'NOMBRE PRODUCTO',AX:'CANTIDAD INV'},{A:'FACTURA',AU:'COLCHON X',AX:'3'}];
    return { ventas:existLeer(vtas).error, vacio:existLeer([]).error,
             otro:existLeer([{A:'CUALQUIER COSA'},{B:'nada que ver'}]).error };
  });
  chk('⚠️ el reporte de VENTAS se rechaza diciendo cuál hay que sacar',
      /VENTAS/.test(r.ventas) && /EXISTENCIAS ALMACEN/.test(r.ventas), r.ventas);
  chk('un archivo vacío no revienta', /vac[íi]o/i.test(r.vacio), r.vacio);
  chk('cualquier otro archivo tampoco', !!r.otro && /EXISTENCIAS/.test(r.otro), r.otro);
  await subir(ROHO);
  r = await page.evaluate(() => ({ imp:!!window.EXIST_IMP, toast:(document.getElementById('toast')||{}).textContent||'' }));
  chk('⚠️ el Excel de ROHO (que es de pedidos) no se carga como existencias',
      r.imp===false && /EXISTENCIAS/.test(r.toast), r.toast.slice(0,90));

  r = await page.evaluate(() => {
    var f=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:'07/09/2026'},
           {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.',AK:'Almacén Final :',AX:'01-05-103  IM - PRODUCTOTERMINADO'},
           {G:'Código Producto',W:'Nombre Producto'},{G:'CH1129',W:'COLCHON TITANIO LATEX 140X190',AY:'3'}];
    var futuro=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:'31/12/2099'},
           {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.'},
           {G:'Código Producto',W:'Nombre Producto'},{G:'CH1129',W:'COLCHON TITANIO LATEX 140X190',AY:'3'}];
    return { mezcla:existLeer(f).error, futuro:existLeer(futuro) };
  });
  chk('⚠️ un reporte que MEZCLA almacenes se rechaza: no serviría para contar ninguno',
      /mezcla almacenes/i.test(r.mezcla), r.mezcla);
  chk('una fecha futura no se acepta: se usa la de hoy y se avisa',
      r.futuro.sinFecha===true && r.futuro.fecha===new Date().toISOString().slice(0,10).replace(/x/,''), r.futuro.fecha);

  // ══ 6. Los pedidos a fábrica que ya deberían haber llegado ════════════════
  console.log('\n── 6. Pedidos a fábrica y el conteo nuevo ──');
  r = await page.evaluate(() => {
    STOCK.p=[{id:'fpA', k:KT, u:10, fab:'MORENO', f:window._atras(9), esp:'', r:''},
             {id:'fpB', k:KT, u:7,  fab:'MORENO', f:todayStr(), esp:'', r:''}];
    var v=existPedidosVencidos('2026-09-07');
    return { vencidos:v.length, cual:v[0]&&v[0].id };
  });
  chk('⚠️ un pedido a fábrica de hace 9 días ya debería haber llegado: está en el conteo nuevo',
      r.vencidos===1 && r.cual==='fpA', r.vencidos+' vencidos');
  await subir(LOG);
  r = await page.evaluate(() => {
    var txt=(document.getElementById('modal-box')||{}).textContent||'';
    confirmarImportExist();
    var d=stockData(), t=d.lista.filter(function(o){ return o.k===KT; })[0];
    var T=stockTiemposFabrica();
    return { avisa:/ya deber[íi]a/.test(txt), abiertos:(STOCK.p||[]).filter(function(q){ return !q.r; }).length,
             cerrado:(STOCK.p||[]).filter(function(q){ return q.id==='fpA'; })[0],
             enCamino:t.enCamino, deposito:t.deposito, medido:T.de('MORENO').medido };
  });
  chk('la pantalla avisa que hay pedidos que ya deberían haber llegado', r.avisa===true);
  chk('⚠️ …y al aplicar se cierran, así no se cuentan dos veces (ya están en el conteo)',
      r.abiertos===1 && r.cerrado.r==='2026-09-07' && r.cerrado.enConteo===true, r.abiertos+' abiertos');
  chk('…el que se pidió hoy sigue en camino', r.enCamino===7, r.enCamino);
  chk('…y el depósito es el del Excel, no el del Excel + lo pedido', r.deposito===4, r.deposito);
  chk('⚠️ cerrarlo así NO inventa un tiempo de fábrica: se sabe que estaba, no cuándo llegó',
      r.medido===false, 'medido: '+r.medido);

  // ══ 7. Ida y vuelta por la planilla ═══════════════════════════════════════
  console.log('\n── 7. Sobrevive el viaje a la planilla ──');
  r = await page.evaluate(() => {
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK=stockVacio();
    var l=leerStock(fila);
    return { c:Object.keys(l.c.u).length, fecha:l.c.f, g:Object.keys(l.g), al:l.al['IM - PRODUCTOTERMINADO'],
             fab:l.g['IM - PRODUCTOTERMINADO'] && Object.keys(l.g['IM - PRODUCTOTERMINADO'].u).length,
             sistema:esFilaSistema(fila), sinFecha:fila.fecha==='' };
  });
  chk('el conteo del depósito vuelve entero', r.c===8 && r.fecha==='2026-09-07', r.c+' · '+r.fecha);
  chk('⚠️ …y el otro almacén también, con lo que es', r.g.length===1 && r.fab===3 && r.al==='otro', JSON.stringify(r.g)+' · '+r.fab);
  chk('sigue siendo una fila del sistema sin fecha', r.sistema===true && r.sinFecha===true);
  chk('una fila vieja sin almacenes (§4co) se lee igual', await page.evaluate(() => {
    var l=leerStock({observaciones:JSON.stringify({c:{f:'2026-09-01',u:{'X|Y':3}},e:[]})});
    return l.c.f==='2026-09-01' && Object.keys(l.g).length===0 && !!l.al;
  }));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
