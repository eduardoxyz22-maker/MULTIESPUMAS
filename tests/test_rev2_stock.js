/* 📦 SEGUNDA REVISIÓN DEL STOCK (26/09): la pantalla 📦 Stock y reposición, botón por botón.

   Lo que este test cuida:
   1. 📋 CONTÉ A MANO NO MUEVE LO QUE NO SE TOCÓ.
      (a) Cada renglón venía con el número del ÚLTIMO CORTE (el Excel de hace 3 días: TITANIO 10),
          no con lo que hay hoy (salieron 6 → 4). Guardar sin tocarlo lo dejaba en 10 con fecha de
          hoy: el panel prometía 6 colchones que no están.
      (b) Lo que no toca, tampoco se mueve con las entregas de HOY (el conteo nuevo las descuenta).
      (c) Lo contado que no entra en la lista (muestra 60) no se pierde.
      (d) Los códigos del Excel (`c.cod`) sobreviven: sin ellos, al releer la fila `stockMigrar`
          volvía a sumar el CH1297 SOMIER PARRILLA NEGRO al SOMIER NEGRO (el arreglo del 25/09,
          deshecho por otro camino).

   Datos SINTÉTICOS. Reloj de la página clavado en el 16/09/2026, 10:00 de Bolivia.

   Se corre:  node tests/test_rev2_stock.js   (desde la raíz del repo)
   Contra otro panel:  PEDIDOS=/ruta/a/pedidos.html node tests/test_rev2_stock.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[], dialogos=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>{ dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date('2026-09-16T14:00:00Z'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['existLeer','confirmarImportExist','leerStock','abrirStockConteo','guardarStockConteo','abrirStockHistorial','abrirStockPedidos','stockDeposito','stockData']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el módulo de stock', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  chk('el reloj de la página está clavado en el 16/09/2026', await page.evaluate(() => todayStr()==='2026-09-16'));

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
    // El Excel de logística de hace 3 días (sintético): los dos somieres del §4cy y un TITANIO.
    window._subirExcelViejo=function(extra){
      STATE=[]; STOCK=stockVacio(); STOCK_CARGADO=true; stockOlvidarIndice();
      var f=[{},{C:'MORENO',X:'EXISTENCIAS ALMACEN  AL ',AR:fmtFecha(_adel(-3)),AZ:'(Productos con existencia <> 0)'},
             {F:'Almacén Inicial :',P:'01-05-003  PRODUCTOS TERMINADOS FAB.'},
             {G:'Código Producto',W:'Nombre Producto'},
             {G:'SR2012',  W:'SOMIER ROHO PEDIC 140X190',AY:'3'},
             {G:'CH1297',  W:'SOMIER PARRILLA NEGRO 140X190',AY:'10'},
             {G:'CH1201',  W:'TITANIO ICE 2.5PLZ 160X190CM',AY:'10'}].concat(extra||[]);
      var R=existLeer(f); if(R.error) return R.error;
      EXIST_IMP=R; renderImportExist(); confirmarImportExist(); stockOlvidarIndice();
      return '';
    };
    window._inputs=function(){ return [].slice.call(document.querySelectorAll('#modal-box input[id^="stk-"]')); };
  });

  // ══ 1. 📋 Conté a mano ═══════════════════════════════════════════════════
  console.log('\n── 1. 📋 Conté a mano: lo que no se tocó queda como estaba ──');
  let r = await page.evaluate(() => {
    var err=_subirExcelViejo(); if(err) return {error:err};
    var KT=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
    var kN=stockClave({desc:'SOMIER NEGRO',medida:'140x190'});
    var kP=stockClave({desc:'SOMIER PARRILLA NEGRO',medida:'140x190',codigo:'CH1297'});
    /* Desde el Excel salieron 6 TITANIO (anteayer y ayer) y HOY se entregó 1 más: hay 3.
       Del SOMIER PARRILLA hoy se entregaron 2: hay 8. */
    STATE=[_P({id:'a1', fecha:_adel(-2), entregado:true, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:3}]}),
           _P({id:'a2', fecha:_adel(-1), entregado:true, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:3}]}),
           _P({id:'a0', fecha:todayStr(), entregado:true, productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1}]}),
           _P({id:'a5', fecha:todayStr(), entregado:true, productos:[{desc:'SOMIER PARRILLA NEGRO',medida:'140x190',codigo:'CH1297',cant:2}]}),
           _P({id:'a3', fecha:_adel(2), productos:[{desc:'SOMIER NEGRO',medida:'140x190',codigo:'',cant:1}]}),
           _P({id:'a4', fecha:_adel(2), productos:[{desc:'SOMIER PARRILLA NEGRO',medida:'140x190',codigo:'CH1297',cant:1}]})];
    stockOlvidarIndice();
    var antes={ T:stockDeposito(KT), N:stockDeposito(kN), P:stockDeposito(kP) };
    abrirStockConteo();
    var puesto={}; _inputs().forEach(function(el){ puesto[el.getAttribute('data-k')]=el.value; });
    // Contaron SOLO el somier negro (hay 2) y dejaron lo demás como vino.
    _inputs().forEach(function(el){ if(el.getAttribute('data-k')===kN) el.value='2'; });
    guardarStockConteo(); stockOlvidarIndice();
    var despues={ T:stockDeposito(KT), N:stockDeposito(kN), P:stockDeposito(kP) };
    // Otro dispositivo (o este, al recargar) relee la fila guardada:
    var fila=window._guardadas.filter(function(x){ return x.id===STOCK_ID; }).pop();
    STOCK=leerStock({observaciones:fila.observaciones}); stockOlvidarIndice();
    var relei={ T:stockDeposito(stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'})),
                N:stockDeposito(stockClave({desc:'SOMIER NEGRO',medida:'140x190'})),
                P:stockDeposito(stockClave({desc:'SOMIER PARRILLA NEGRO',medida:'140x190',codigo:'CH1297'})) };
    // …y la revisión automática con lo releído: 3 SOMIER NEGRO pasado mañana, con 2 acá
    STATE.push(_P({id:'a6', fecha:_adel(3), productos:[{desc:'SOMIER NEGRO',medida:'140x190',codigo:'',cant:2}]}));
    REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
    var A=stockAsignar(), linea=function(id){ var g=A.pedidos.filter(function(x){ return x.p.id===id; })[0]; return g?g.lineas[0].ahora:'(nada)'; };
    return { antes:antes, puesto:puesto, despues:despues, relei:relei, KT:KT, kN:kN, kP:kP, a3:linea('a3'), a6:linea('a6'), claves:Object.keys(STOCK.c.u).sort().join(' · ') };
  });
  if(r.error){ chk('el Excel sintético se lee', false, r.error); }
  else {
    chk('antes de contar: TITANIO 3 (10 − 6 − 1 de hoy), SOMIER NEGRO 3, SOMIER PARRILLA 8 (10 − 2 de hoy)',
        r.antes.T===3 && r.antes.N===3 && r.antes.P===8, JSON.stringify(r.antes));
    chk('⚠️ el renglón viene con lo que hay HOY según el panel (TITANIO 3), no con el corte viejo (10)',
        String(r.puesto[r.KT])==='3' && String(r.puesto[r.kP])==='8', JSON.stringify(r.puesto));
    chk('⚠️ guardado sin tocarlo, el TITANIO sigue en 3 (no vuelve a 10: no se prometen 7 que no están)',
        r.despues.T===3, JSON.stringify(r.despues));
    chk('⚠️ …y el SOMIER PARRILLA sigue en 8: la entrega de hoy no se descuenta dos veces', r.despues.P===8, r.despues.P);
    chk('lo que SÍ se contó manda: SOMIER NEGRO 2', r.despues.N===2, r.despues.N);
    chk('⚠️ al RELEER la fila, el SOMIER NEGRO sigue en 2 y el PARRILLA (CH1297) en 8: no se suman (12)',
        r.relei.N===2 && r.relei.P===8 && r.relei.T===3, JSON.stringify(r.relei)+' · claves: '+r.claves);
    chk('⚠️ la revisión no promete 3 SOMIER NEGRO habiendo 2: el primero ✔, el de 2 no',
        r.a3==='ok' && r.a6!=='ok', 'a3 → '+r.a3+' · a6 → '+r.a6);
  }
  r = await page.evaluate(() => {
    /* (c) Un producto contado en el Excel que no entra en la lista de 60 (no se vende): antes
       desaparecía del conteo y quedaba «sin contar». */
    var extra=[];
    for(var i=0;i<70;i++) extra.push({G:'ZX'+(1000+i), W:'REPUESTO PRUEBA '+i+' 100X100', AY:String(1+i%4)});
    var err=_subirExcelViejo(extra); if(err) return {error:err};
    var viejos=Object.keys(STOCK.c.u).length;
    STATE=[_P({id:'b1', fecha:_adel(1), productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:1}]})];
    stockOlvidarIndice();
    var kR=stockClaveCruda({desc:'REPUESTO PRUEBA 69 100X100',medida:''}), antes=stockDeposito(kR);
    abrirStockConteo();
    var enLista=_inputs().length, estaba=_inputs().some(function(el){ return el.getAttribute('data-k')===kR; });
    guardarStockConteo(); stockOlvidarIndice();
    return { viejos:viejos, enLista:enLista, estaba:estaba, antes:antes, despues:stockDeposito(kR), n:Object.keys(STOCK.c.u).length };
  });
  if(r.error){ chk('el Excel sintético grande se lee', false, r.error); }
  else {
    chk('el conteo a mano muestra como mucho 60 renglones (el repuesto 69 no está en la lista)', r.enLista<=60 && !r.estaba, r.enLista+' renglones');
    chk('⚠️ lo contado que no entró en la lista NO se pierde: el repuesto sigue con su número',
        r.antes===2 && r.despues===2 && r.n===r.viejos, 'antes '+r.antes+' → después '+r.despues+' · claves '+r.viejos+' → '+r.n);
  }

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
