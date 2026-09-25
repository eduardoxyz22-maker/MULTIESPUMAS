/* 📦 REVISIÓN DEL STOCK (25/09): lo que se encontró revisando stock y «Qué producir».

   Lo que este test cuida:
   1. «DOS CÓDIGOS SON DOS PRODUCTOS» TAMBIÉN DESPUÉS DE RELEER LA FILA (§4cy).
      Al subir el Excel, un renglón con un código que el catálogo no conoce queda con su nombre
      crudo, aparte: «CH1297 SOMIER PARRILLA NEGRO» (10) no es el SOMIER NEGRO (3). Pero la fila
      del stock se vuelve a leer en CADA dispositivo (y en este al recargar, o a los 90 s):
      `leerStock` → `stockMigrar` resolvía esas claves crudas OTRA VEZ por nombre y las sumaba
      al producto del catálogo que se les parece → «hay 13 somieres negros», «hay 49 almohadas»
      (los dos ejemplos exactos de §4cy), y el pedido que trae el código CH1297 quedaba en 0 →
      «hay que fabricar». O sea: prometer 10 colchones que no hay, y mandar a fabricar 10 que sí.

   Datos SINTÉTICOS (los nombres son los del almacén que ya están en test_identidad; las
   cantidades, inventadas). Reloj de la página clavado en el 16/09/2026, 10:00 de Bolivia.

   Se corre:  node tests/test_rev_stock.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-09-16T14:00:00Z'));
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['existLeer','confirmarImportExist','leerStock','filaStock','stockMigrar','stockFusionar','stockClave','stockDeposito','stockAsignar','guardarStockUnir']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el módulo de stock', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  chk('el reloj de la página está clavado en el 16/09/2026', await page.evaluate(() => todayStr()==='2026-09-16'));

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
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
  });

  // ══ 1. Dos códigos son dos productos, también al releer la fila ═══════════
  console.log('\n── 1. Después de releer la fila del stock, un código desconocido sigue aparte ──');
  let r = await page.evaluate(() => {
    STATE=[]; STOCK=stockVacio(); STOCK_CARGADO=true; stockOlvidarIndice();
    var f=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:fmtFecha(todayStr()),AZ:'(Productos con existencia <> 0)'},
           {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.'},
           {G:'Código Producto',W:'Nombre Producto'},
           {G:'SR2012',  W:'SOMIER ROHO PEDIC 140X190',AY:'3'},
           {G:'CH1297',  W:'SOMIER PARRILLA NEGRO 140X190',AY:'10'},
           {G:'CD1403',  W:'ALMOHADA 50X70 EXPO 2019',AY:'21'},
           {G:'CH1001',  W:'Almohada Heaven Celeste 50x70',AY:'28'}];
    var R=existLeer(f); if(R.error) return {error:R.error};
    EXIST_IMP=R; renderImportExist(); confirmarImportExist();
    var hay=function(d,m,c){ stockOlvidarIndice(); var k=stockClave({desc:d,medida:m||'',codigo:c||''}); return {k:k, hay:stockDeposito(k)}; };
    var foto=function(){ return { negro:hay('SOMIER NEGRO','140x190'), parrilla:hay('SOMIER PARRILLA NEGRO 2 PLAZAS'),
      parrillaCod:hay('SOMIER PARRILLA NEGRO','140x190','CH1297'), almo:hay('ALMOHADA','50x70'), celeste:hay('Almohada Heaven Celeste','50x70') }; };
    var antes=foto();
    // Otro dispositivo (o este, al recargar o en el próximo refresco) lee la fila de la planilla:
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK=leerStock({observaciones:fila.observaciones});
    var despues=foto();
    // …y la revisión automática con lo releído: 5 SOMIER NEGRO para mañana, con 3 acá
    STATE=[_P({id:'n1', fecha:_adel(1), productos:[{desc:'SOMIER NEGRO',medida:'140x190',codigo:'',cant:5}]}),
           _P({id:'c1', fecha:_adel(2), productos:[{desc:'SOMIER PARRILLA NEGRO',medida:'140x190',codigo:'CH1297',cant:4}]})];
    REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
    var A=stockAsignar(), linea=function(id){ var g=A.pedidos.filter(function(x){ return x.p.id===id; })[0]; return g?g.lineas[0].ahora:'(nada)'; };
    // La junta (dos dispositivos, §4fz-b) también pasa por stockMigrar:
    var J=stockFusionar(null, STOCK, leerStock({observaciones:fila.observaciones}));
    return { antes:antes, despues:despues, negro:linea('n1'), parrillaCod:linea('c1'),
             junta:{ negro:J.c.u[antes.negro.k], parrilla:J.c.u[antes.parrilla.k] }, claves:Object.keys(STOCK.c.u).sort().join(' · ') };
  });
  if(r.error){ chk('el Excel sintético se lee', false, r.error); }
  else {
    chk('recién subido el Excel: SOMIER NEGRO 3 y SOMIER PARRILLA NEGRO 10, separados (como en test_identidad)',
        r.antes.negro.hay===3 && r.antes.parrilla.hay===10 && r.antes.parrilla.k!==r.antes.negro.k, JSON.stringify(r.antes));
    chk('⚠️ al RELEER la fila, el SOMIER NEGRO sigue en 3 (no 13: no se le suma el CH1297)',
        r.despues.negro.hay===3, r.despues.negro.k+' → '+r.despues.negro.hay);
    chk('⚠️ …y el SOMIER PARRILLA NEGRO sigue en 10, por nombre y por su código CH1297 (no 0 → «fabricar»)',
        r.despues.parrilla.hay===10 && r.despues.parrillaCod.hay===10 && r.despues.parrilla.k===r.antes.parrilla.k,
        r.despues.parrilla.k+' → '+r.despues.parrilla.hay+' · por código '+r.despues.parrillaCod.hay);
    chk('⚠️ la ALMOHADA 50x70 sigue en 21 y la Almohada Heaven Celeste (CH1001) en 28, no «49»',
        r.despues.almo.hay===21 && r.despues.celeste.hay===28, JSON.stringify([r.despues.almo, r.despues.celeste]));
    chk('⚠️ con lo releído, la revisión NO promete 5 SOMIER NEGRO habiendo 3, y el pedido con código CH1297 sí tiene los suyos',
        r.negro!=='ok' && r.parrillaCod==='ok', 'SOMIER NEGRO ×5 → '+r.negro+' · CH1297 ×4 → '+r.parrillaCod);
    chk('la junta entre dispositivos tampoco los suma (3 y 10)', r.junta.negro===3 && r.junta.parrilla===10, JSON.stringify(r.junta));
  }
  r = await page.evaluate(() => {
    /* Lo que SÍ tiene que seguir funcionando: (a) unirlo a mano con 🔗 manda, también al releer;
       (b) un conteo viejo sin códigos (§4co) se sigue juntando bajo la clave del catálogo. */
    var kP=stockClave({desc:'SOMIER PARRILLA NEGRO',medida:'140x190'}), kN=stockClave({desc:'SOMIER NEGRO',medida:'140x190'});
    document.body.insertAdjacentHTML('beforeend','<select id="stk-unir-a"><option value="'+kN.replace(/"/g,'&quot;')+'" selected></option></select>');
    guardarStockUnir(kP);
    var el=document.getElementById('stk-unir-a'); if(el) el.remove();
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK=leerStock({observaciones:fila.observaciones}); stockOlvidarIndice();
    var unidos=stockDeposito(stockClave({desc:'SOMIER NEGRO',medida:'140x190'}));
    var vieja={ c:{f:todayStr(), u:{'ECO FLEX|140X190':3, 'COLCHON ECO FLEX 2 PLAZAS 140X190CM FLEX|140X190':4}}, e:[] };
    var l=leerStock({observaciones:JSON.stringify(vieja)});
    var kEco=stockClave({desc:'NUEVO ECO FLEX',medida:'140x190'});
    return { unidos:unidos, kN:kN, eco:l.c.u[kEco], ecoClaves:Object.keys(l.c.u).join(' · ') };
  });
  chk('🔗 unido a mano al SOMIER NEGRO, al releer se cuentan juntos (3 + 10 = 13): la unión manda', r.unidos===13, r.kN+' → '+r.unidos);
  chk('un conteo viejo SIN códigos se sigue juntando bajo la clave del catálogo (3 + 4 = 7, §4co)', r.eco===7, r.ecoClaves);

  // ══ 2. 🔗 Unir: lo de los otros almacenes y el pedido que trae el código ══
  console.log('\n── 2. 🔗 Unir un producto con stock en Moreno y un pedido con su código ──');
  r = await page.evaluate(() => {
    /* Un producto que el catálogo no conoce (código ZZ0077): 2 acá y 5 en Moreno. El dueño lo une
       al NUEVO ECO FLEX del catálogo (3 acá). Hay un pedido por nombre (4) y otro que trae el
       código ZZ0077 (2), los dos por venir. */
    STOCK=stockVacio(); STOCK_CARGADO=true;
    var KC=stockClave({desc:'NUEVO ECO FLEX',medida:'140x190',codigo:'CH1332'});
    var KR=stockClaveCruda({desc:'ECO FLEX PREMIUM 140X190',medida:'140x190'});
    STOCK.c={ f:todayStr(), hora:'07:00:00', u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.', cod:{'CH1332':KC,'ZZ0077':KR}, t:Date.now()-3600000 };
    STOCK.c.u[KC]=3; STOCK.c.u[KR]=2;
    STOCK.g={'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{}, cod:{'ZZ0077':KR}, t:Date.now()-3600000, rs:{} }};
    STOCK.g['IM - PRODUCTOTERMINADO'].u[KR]=5;
    STOCK.al={'IM - PRODUCTOTERMINADO':'otro','PRODUCTOS TERMINADOS FAB.':'log'};
    STATE=[_P({id:'u1', fecha:_adel(1), productos:[{desc:'ECO FLEX PREMIUM',medida:'140x190',codigo:'',cant:4}]}),
           _P({id:'u2', fecha:_adel(2), productos:[{desc:'ECO FLEX PREMIUM',medida:'140x190',codigo:'ZZ0077',cant:2}]})];
    stockOlvidarIndice();
    var ver=function(){
      stockOlvidarIndice();
      var d=stockData(), o=d.lista.filter(function(x){ return x.k===KC; })[0], viejo=d.lista.filter(function(x){ return x.k===KR; })[0];
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
      var A=stockAsignar(), l=function(id){ var g=A.pedidos.filter(function(x){ return x.p.id===id; })[0]; return g?g.lineas[0]:null; };
      return { dep:o&&o.deposito, otros:o&&o.enOtros, comp:o&&o.comp, fab:o&&o.fabricar,
               viejo:viejo?{dep:viejo.deposito, otros:viejo.enOtros, comp:viejo.comp, fab:viejo.fabricar}:null,
               u1:l('u1')&&(l('u1').k+' → '+l('u1').ahora), u2:l('u2')&&(l('u2').k+' → '+l('u2').ahora), u2k:l('u2')&&l('u2').k, u2a:l('u2')&&l('u2').ahora };
    };
    document.body.insertAdjacentHTML('beforeend','<select id="stk-unir-a"><option value="'+KC.replace(/"/g,'&quot;')+'" selected></option></select>');
    guardarStockUnir(KR);
    var el=document.getElementById('stk-unir-a'); if(el) el.remove();
    var recien=ver();
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK=leerStock({observaciones:fila.observaciones});
    var releido=ver();
    return { KC:KC, recien:recien, releido:releido };
  });
  chk('⚠️ recién unido: el ECO FLEX tiene 5 acá (3 + 2) y los 5 de Moreno pasan con él, no quedan en el renglón viejo',
      r.recien.dep===5 && r.recien.otros===5 && !(r.recien.viejo && r.recien.viejo.otros), JSON.stringify(r.recien));
  chk('⚠️ el pedido que trae el código ZZ0077 sigue la unión: es el ECO FLEX y no queda «✗ no hay»',
      r.recien.u2k===r.KC && r.recien.u2a!=='no' && r.recien.comp===6, r.recien.u2+' · comprometido '+r.recien.comp);
  chk('⚠️ …y al releer la fila también: nada que fabricar para ese pedido (hay 5 acá y 5 en Moreno)',
      r.releido.u2k===r.KC && r.releido.u2a!=='no' && r.releido.fab===0 && !(r.releido.viejo && r.releido.viejo.fab),
      r.releido.u2+' · fabricar '+r.releido.fab+' · renglón viejo '+JSON.stringify(r.releido.viejo));

  // ══ 3. El detalle del producto no da por salido lo que falta ir a buscar ══
  console.log('\n── 3. Detalle de un producto: una línea 📥 de días pasados sigue pendiente ──');
  r = await page.evaluate(() => {
    /* Desde §4ey la marca dice DE DÓNDE («Recoger de IM», «Recoger de Banzer») y el detalle seguía
       preguntando por el texto viejo «Recoger de Moreno»: una línea 📥 con la fecha pasada —que
       sigue COMPROMETIDA, está en «Vendido sin entregar»— decía «Fecha pasada: se considera salido». */
    var K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:todayStr(), u:{}, solo0:true, alm:'PRODUCTOS TERMINADOS FAB.' }; STOCK.c.u[K]=0;
    STOCK.g={'IM - PRODUCTOTERMINADO':{f:todayStr(),u:{},t:1,rs:{}}}; STOCK.g['IM - PRODUCTOTERMINADO'].u[K]=5;
    STOCK.al={'IM - PRODUCTOTERMINADO':'otro'};
    var atras2=(function(){ var d=new Date(); d.setDate(d.getDate()-2); return isoLocal(d); })();
    STATE=[_P({id:'d1', cliente:'Ana', fecha:atras2, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:2,chk:'im'}]}),
           _P({id:'d2', cliente:'Beto', fecha:atras2, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1,chk:'im',chkDe:'Banzer'}]}),
           _P({id:'d3', cliente:'Caro', fecha:atras2, entregado:true, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1}]})];
    stockOlvidarIndice();
    var o=stockData().lista.filter(function(x){ return x.k===K; })[0];
    abrirStockPedidos(K);
    var sec=[].slice.call(document.querySelectorAll('#modal-box details')).map(function(d){
      return { tit:d.querySelector('summary').textContent, filas:[].slice.call(d.querySelectorAll('tbody tr')).map(function(tr){ return tr.textContent.replace(/\s+/g,' '); }) }; });
    closeModal();
    return { comp:o.comp, sec:sec };
  });
  const pend = (r.sec.filter(function(s){ return /Vendido sin entregar/.test(s.tit); })[0]||{filas:[]}).filas;
  chk('las dos líneas 📥 de hace 2 días siguen comprometidas (3 unidades)', r.comp===3, r.comp);
  chk('⚠️ en «Vendido sin entregar» dicen de dónde se recogen, no «Fecha pasada: se considera salido»',
      pend.length===2 && pend.every(function(t){ return !/se considera salido/.test(t) && /Recoger de/.test(t); }), pend.join(' | '));
  chk('…y lo entregado sigue en el historial como «Entregado»',
      r.sec.some(function(s){ return /Historial/.test(s.tit) && s.filas.some(function(t){ return /Entregado/.test(t); }); }), JSON.stringify(r.sec.map(function(s){ return s.tit; })));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
