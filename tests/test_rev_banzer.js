/* 🔎 REVISIÓN DEL STOCK Y DE LOS ALMACENES DESPUÉS DE BANZER (26/09, noche).

   Lo publicado a las 17:15 (`39b833c`) hizo de Banzer un depósito del que salen camiones (§4ge).
   Esta prueba cuida lo que la revisión encontró después:
   1. ⚡ RENDIMIENTO. Desde Banzer cada renglón marcado pregunta de qué almacén sale, y cada pregunta
      normalizaba los nombres de los almacenes de nuevo (`normNombre`, `stockAlmLimpio`): la lista de
      carga de «Todos» con 900 pedidos tardaba ~1 s en un celular (antes 40 ms), la tabla de
      Administración medio segundo más por cada repintado. Las dos funciones son puras: se recuerdan.
   2. 🚛 La lista de carga no dice «Nada: todo lo de este camión se carga en .» cuando el camión lleva
      un pedido sin productos (no hay Banzer que nombrar).
   3. 🧓 La PÁGINA VIEJA (sin F5, `e2e613a`) no conoce `g[almacén].inc` («este Excel ya incluye las
      entregas del día»): al guardar el stock lo borraba, y al subir el Excel de Banzer no lo anotaba.
      Lo entregado desde Banzer el día de su Excel se descontaba DOS veces. El historial (`h`) sí
      guarda la respuesta: se repone de ahí, del mismo corte.
   4. 📜 El historial de cortes decía «(no sale camión)» para el Excel de Banzer subido con el diálogo
      de antes (rol 'otro'): Banzer SÍ es de salida.
   5. Y cuida lo que la revisión comprobó que está bien: repartir y «Aplicar» dos veces no cambia
      nada (en las dos modalidades), y la tabla, el detalle y «Qué producir» dicen el mismo número.

   Datos SINTÉTICOS (el repo es público). Reloj de la página clavado en el miércoles 23/09/2026, 18:30
   de Bolivia. La página vieja sale de git (`e2e613a`).

   Se corre:  node tests/test_rev_banzer.js   (desde la raíz del repo)
   Dientes contra el panel publicado:  PEDIDOS=/ruta/a/pedidos_39b833c.html node tests/test_rev_banzer.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-banzer-'));
const VIEJA = path.join(TMP, 'pedidos.html');
fs.writeFileSync(VIEJA, cp.execSync('git show e2e613a:pedidos.html', { maxBuffer:64*1024*1024 }));
fs.writeFileSync(path.join(TMP, 'productos-mes.js'), cp.execSync('git show e2e613a:productos-mes.js', { maxBuffer:64*1024*1024 }));
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=x=>JSON.stringify(x);

async function abrir(browser, ruta, errores){
  const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
  page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-09-23T22:30:00Z'));      // miércoles, 18:30 de Bolivia
  await page.goto('file://' + ruta, { waitUntil:'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._saves=[];
    apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    downloadBlob=function(){};
    window.J=function(x){ return JSON.stringify(x); };
    window.BANZER='01-05-025  Almacen Distribucion Banzer';
    window.IMN='IM - PRODUCTOTERMINADO';
    window.LOG='PRODUCTOS TERMINADOS FAB.';
    window._d=function(n){ return stockSumarDias(todayStr(), n); };
    window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
    window._tit=function(n,x){ return Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}, x||{}); };
    window._P=function(o){ return Object.assign({id:'p1',fecha:todayStr(),oc:'09-254',vendedor:'Maria Flores',
      cliente:'DON PRUEBA',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Calle 1',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Eyzaguirre',
      garantia:'',nota:'1503',acuenta:0,facturarA:'',nit:'1',nroDia:1,verificado:false,fotos:[]}, o); };
    /* Acá (el de fábrica), Banzer (anotado 'otro', como lo guardó el diálogo de antes) y Moreno (IM). */
    window._alm=function(aca, banzer, im, op){
      op=op||{};
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:op.fAca||todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-8*3600000 };
      if(aca!=null) STOCK.c.u[K]=aca;
      STOCK.g={};
      if(banzer!=null){ STOCK.g[BANZER]={ f:op.fBanzer||todayStr(), hora:op.hBanzer||'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-8*3600000, rs:{} }; STOCK.g[BANZER].u[K]=banzer; if(op.incBanzer) STOCK.g[BANZER].inc=true; }
      if(im!=null){ STOCK.g[IMN]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-8*3600000, rs:{} }; STOCK.g[IMN].u[K]=im; }
      STOCK.al={}; STOCK.al[LOG]='log'; if(banzer!=null) STOCK.al[BANZER]=op.alB||'otro'; if(im!=null) STOCK.al[IMN]='otro';
      STOCK.p=op.p||[]; STOCK.h=op.h||[];
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
    };
    window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===(k||K); })[0]||{}; };
    window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._sinAvance=function(){ var av=document.getElementById('revstk-avance'); if(av) av.remove(); };
    window._marcas=function(){ return STATE.map(function(p){ return p.id+':'+(p.productos||[]).map(function(x){ return (x.chk||'-')+(x.chkDe?('@'+recogerAlmCorto(x.chkDe)):'')+(x.chkDes?('['+x.chkDes.map(function(e){ return (e.de?recogerAlmCorto(e.de):"''")+':'+e.u; }).join(',')+']'):''); }).join(','); }).join(' '); };
  });
  return page;
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[], erroresV=[];
  const page = await abrir(browser, PEDIDOS, errores);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  chk('el reloj de la página está clavado en el miércoles 23/09/2026', await page.evaluate(() => todayStr()==='2026-09-23'));

  // ═══ 1. Rendimiento ═══════════════════════════════════════════════════════════════════
  console.log('\n── 1. ⚡ Con 900 pedidos marcados, los nombres de almacén no se normalizan miles de veces ──');
  let r = await ev(() => {
    var prods=[['TITANIO ICE','160x190','CH1201'],['ALMOHADA','50x70','CD1403'],['MEMORY FLEX','140x190',''],['ORO VISCOLASTICO','160x200',''],['SOMIER NEGRO','140x190','SR2012']];
    _alm(40, 30, 50, { fAca:_d(-2), fBanzer:_d(-2) });
    prods.forEach(function(p){ var k=stockClave({desc:p[0],medida:p[1],codigo:p[2]}); STOCK.c.u[k]=40; STOCK.g[BANZER].u[k]=30; STOCK.g[IMN].u[k]=50; });
    for(var q=0;q<40;q++) STOCK.p.push({ id:'rc'+q, k:stockClave({desc:prods[q%5][0],medida:prods[q%5][1],codigo:prods[q%5][2]}), u:1, tipo:'recogida', de:(q%2?BANZER:IMN), fab:'', f:_d(-3), esp:_d(-2), r:(q%3?_d(-2):'') });
    var marcas=[{},{chk:'ok'},{chk:'ok',chkDe:'Banzer'},{chk:'im'},{chk:'im',chkDe:'Banzer'},{chk:'no'},{chk:'ok',chkDes:[{de:'',u:1},{de:BANZER,u:1}]}];
    STATE=[];
    for(var i=0;i<900;i++){
      var pr=[];
      for(var j=0;j<2;j++){ var P=prods[(i+j)%5]; pr.push(Object.assign({desc:P[0],medida:P[1],codigo:P[2],cant:1+((i+j)%3)}, marcas[(i*3+j)%7])); }
      STATE.push(_P({ id:'p'+i, oc:'09-'+(100+i), fecha:_d((i%40)-25), entregado:(i%4===0), cliente:'C'+i, productos:pr }));
    }
    stockOlvidarIndice();
    var out={}, orig=String.prototype.normalize, n=0;
    String.prototype.normalize=function(){ n++; return orig.apply(this, arguments); };
    try{
      var a=performance.now();
      cargaBloquesHtml(STATE, ''); out.carga=n; n=0;
      stockData(); out.stock=n; n=0;
      STATE.forEach(function(p){ estadoStock(p); rowKind(p); }); out.fichas=n; n=0;
      stockAsignar(); out.revision=n; n=0;
      out.ms=Math.round(performance.now()-a);
    } finally { String.prototype.normalize=orig; }
    // …y lo recordado dice lo mismo que antes
    out.igual=[normNombre('  Carola  Chávez '), normNombre('Carola Chavez'), normNombre(null), normNombre(0),
               stockAlmLimpio('01-05-025  Almacen Distribucion Banzer'), stockAlmLimpio(''), stockAlmLimpio(null)];
    out.salida=[almEsSalida(BANZER), almEsSalida('Banzer'), almEsSalida(IMN), almEsSalida(LOG)];
    return out;
  });
  /* El panel publicado normalizaba 347.000 textos en la carga, 153.000 en el stock, 114.000 en las fichas y
     330.000 en la revisión (el de antes de Banzer: 2.600 · 32.000 · 1.300 · 52.000). Recordando, no pasa de mil. */
  chk('⚠️ la lista de carga de «Todos» (900 pedidos) no normaliza los nombres de nuevo en cada renglón',
      r.carga!=null && r.carga<5000, 'veces que se normalizó un texto: '+J([r.carga, r.__error]));
  chk('⚠️ …ni el stock, las fichas de Administración o la revisión automática',
      r.stock!=null && r.stock<5000 && r.fichas<5000 && r.revision<5000, J({stock:r.stock, fichas:r.fichas, revision:r.revision, ms:r.ms}));
  chk('…y lo recordado da lo mismo que calcularlo',
      J(r.igual)===J(['carola chavez','carola chavez','','0','Almacen Distribucion Banzer','','']) && J(r.salida)===J([true,true,false,false]),
      J([r.igual, r.salida]));

  // ═══ 2. La lista de carga con un pedido sin productos ════════════════════════════════
  console.log('\n── 2. 🚛 Un camión con un pedido sin productos no nombra un Banzer que no hay ──');
  r = await ev(async () => {
    _alm(5, 5, 0);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[] }),
            _P({ id:'b', fecha:proximoDiaEntrega(), vehiculo:'Camion 2', productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }) ];
    abrirCarga(); setCargaDia('manana'); await _esperar(120);
    var bloques=[].slice.call(document.querySelectorAll('#carga-body .carga-cam')).map(function(b){ return b.textContent.replace(/\s+/g,' '); });
    closeCarga();
    return { bloques:bloques };
  });
  const vacio=(r.bloques||[]).filter(b=>/Foton nuevo/.test(b))[0]||'', bz=(r.bloques||[]).filter(b=>/Camion 2/.test(b))[0]||'';
  chk('⚠️ sin productos: no dice «se carga en .» (no hay ningún Banzer que nombrar)', !!vacio && !/se carga en \./.test(vacio) && !/se carga en\s*$/.test(vacio), vacio.slice(0,200)||J(r.__error));
  chk('…y el camión que lleva todo de Banzer sí lo dice: «Nada: todo … se carga en Banzer»', /Nada: todo lo de este camión se carga en Banzer\./.test(bz), bz.slice(0,220));

  // ═══ 3. La página vieja y `inc` de Banzer ════════════════════════════════════════════
  console.log('\n── 3. 🧓 La página vieja no borra «el Excel de Banzer ya incluye las entregas del día» ──');
  const vieja = await abrir(browser, VIEJA, erroresV);
  // (a) el panel nuevo sube el Excel de Banzer de la tarde, que YA incluye las entregas de hoy
  const filaNueva = await ev(() => {
    _alm(4, 5, null, { alB:'sale', hBanzer:'17:30:00', incBanzer:true,
      h:[{ f:todayStr(), hora:'17:30:00', alm:BANZER, rol:'sale', n:1, u:5, ts:Date.now()-3600000, inc:true }] });
    return filaStock().observaciones;
  });
  // (b) la página vieja la lee y guarda el stock por cualquier cosa (acá: una entrada de 1)
  const deVieja = await vieja.evaluate((obs) => {
    STOCK=leerStock({observaciones:obs}); STOCK_CARGADO=true;
    STOCK.e=(STOCK.e||[]).concat([{ id:'eV1', f:todayStr(), k:K, u:1, fab:'', ts:Date.now() }]);
    var o=filaStock().observaciones; return { obs:o, inc:!!JSON.parse(o).g[BANZER].inc };
  }, filaNueva);
  chk('(así estaba) la página vieja guarda el stock SIN `inc` en la foto de Banzer', deVieja.inc===false, J(deVieja.inc));
  r = await ev((obs) => {
    STOCK=leerStock({observaciones:obs}); STOCK_CARGADO=true; stockOlvidarIndice();
    STATE=[ _P({ id:'e1', fecha:todayStr(), entregado:true, productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }) ];
    var o=_fila(); return { inc:!!STOCK.g[BANZER].inc, sale:o.enSale, dep:o.deposito };
  }, deVieja.obs);
  chk('⚠️ leída en el panel nuevo, la foto de Banzer sigue diciendo «ya incluye las entregas de hoy» (sale del historial)', r.inc===true, J([r, r.__error]));
  chk('⚠️ …y lo entregado hoy desde Banzer NO se descuenta dos veces: quedan 5 (el Excel de la tarde ya lo tiene afuera)', r.sale===5 && r.dep===5, J(r));
  // (c) la página vieja SUBE el Excel de Banzer marcando «ya incluye las entregas del día»
  const subeVieja = await vieja.evaluate(() => {
    STOCK=stockVacio(); STOCK_CARGADO=true; STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-8*3600000 }; STOCK.c.u[K]=4;
    EXIST_IMP={ fecha:todayStr(), sinFecha:false, hora:'17:30:00', almacen:BANZER, items:[{k:K,cant:5,cat:true,cod:'CH1201',desc:'TITANIO ICE'}], total:5, repetidos:0, malos:0, solo0:true, cods:{}, esLog:false, conocido:true };
    renderImportExist(); var i=document.getElementById('exist-inc'); if(i) i.checked=true;
    var s=document.getElementById('exist-rol'); if(s) s.value='otro';
    confirmarImportExist();
    return filaStock().observaciones;
  });
  r = await ev((obs) => {
    STOCK=leerStock({observaciones:obs}); STOCK_CARGADO=true; stockOlvidarIndice();
    STATE=[ _P({ id:'e1', fecha:todayStr(), entregado:true, productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }) ];
    var o=_fila(); return { inc:!!STOCK.g[BANZER].inc, sale:o.enSale, esSalida:almEsSalida(BANZER) };
  }, subeVieja);
  chk('⚠️ el Excel de Banzer subido desde la página vieja con «ya incluye las entregas del día» se respeta (5, no 3)', r.inc===true && r.sale===5 && r.esSalida===true, J([r, r.__error]));
  r = await ev(() => {
    var out={};
    // sin marcar la casilla (el historial dice inc:false) no se inventa nada
    _alm(4, 5, null, { hBanzer:'17:30:00', h:[{ f:todayStr(), hora:'17:30:00', alm:BANZER, rol:'otro', n:1, u:5, ts:Date.now()-3600000, inc:false }] });
    var S=leerStock({observaciones:filaStock().observaciones}); out.sinMarcar=!!S.g[BANZER].inc;
    // otro corte del mismo almacén (otra hora) con la casilla marcada no cuenta para ESTE corte
    _alm(4, 5, null, { hBanzer:'09:00:00', h:[{ f:todayStr(), hora:'17:30:00', alm:BANZER, rol:'otro', n:1, u:5, ts:Date.now()-3600000, inc:true }] });
    S=leerStock({observaciones:filaStock().observaciones}); out.otroCorte=!!S.g[BANZER].inc;
    // subido dos veces el mismo corte: manda la última respuesta (el historial va del más nuevo al más viejo)
    _alm(4, 5, null, { hBanzer:'17:30:00', h:[{ f:todayStr(), hora:'17:30:00', alm:BANZER, rol:'sale', n:1, u:5, ts:Date.now()-60000, inc:false },
                                               { f:todayStr(), hora:'17:30:00', alm:BANZER, rol:'sale', n:1, u:5, ts:Date.now()-3600000, inc:true }] });
    S=leerStock({observaciones:filaStock().observaciones}); out.ultima=!!S.g[BANZER].inc;
    return out;
  });
  chk('…sin la casilla marcada no se inventa: queda sin «ya incluye»', r.sinMarcar===false, J(r));
  chk('…la respuesta de OTRO corte (otra hora) no se le pega a este', r.otroCorte===false, J(r));
  chk('…y si el mismo corte se subió dos veces, manda la última respuesta', r.ultima===false, J(r));

  // ═══ 4. El historial de cortes ═══════════════════════════════════════════════════════
  console.log('\n── 4. 📜 El historial dice que de Banzer también sale camión ──');
  r = await ev(async () => {
    _alm(4, 5, 5, { h:[
      { f:todayStr(), hora:'10:30:33', alm:BANZER, rol:'otro', n:81, u:309, ts:Date.now()-3600000, inc:false },   // lo guardó el diálogo de antes
      { f:todayStr(), hora:'09:00:00', alm:IMN, rol:'otro', n:40, u:120, ts:Date.now()-7200000, inc:false },
      { f:_d(-1), hora:'09:00:00', alm:LOG, rol:'log', n:60, u:200, ts:Date.now()-86400000, inc:false } ] });
    abrirStockHistorial(); await _esperar(80);
    var filas=[].slice.call(document.querySelectorAll('#modal-box tbody tr')).map(function(t){ return t.textContent.replace(/\s+/g,' '); });
    closeModal();
    return { filas:filas };
  });
  const fB=(r.filas||[]).filter(t=>/Banzer/.test(t))[0]||'', fI=(r.filas||[]).filter(t=>/Moreno|IM/.test(t))[0]||'';
  chk('⚠️ el Excel de Banzer subido con el diálogo de antes dice «(también sale camión)»', /también sale camión/.test(fB) && !/no sale camión/.test(fB), fB.slice(0,160)||J(r.__error));
  chk('…y el de Moreno sigue diciendo «(no sale camión)»', /no sale camión/.test(fI), fI.slice(0,160));

  // ═══ 5. Lo que está bien y hay que cuidar ═══════════════════════════════════════════
  console.log('\n── 5. Repartir y aplicar dos veces no cambia nada · la tabla, el detalle y «Qué producir» cierran ──');
  const confs=[ { g:[1,2,5], lin:[3,2,4] }, { g:[0,4,5], lin:[7] }, { g:[3,4,5], lin:[5] }, { g:[0,3,3], lin:[2,2,2] } ];
  for (const c of confs) for (const todo of [false,true]) {
    r = await ev(async (s) => {
      _alm(s.c.g[0], s.c.g[1], s.c.g[2]);
      REVSTK_SOLO_VACIOS=!s.todo;
      STATE=s.c.lin.map(function(n,i){ return _P({ id:'q'+i, oc:'09-3'+i, fecha:_d(1+i), productos:[_tit(n)] }); });
      REVSTK=stockAsignar(); var c1=revStkCambios().length;
      aplicarStockRevisar(); await _esperar(400); _sinAvance();
      var m1=_marcas(); REVSTK=stockAsignar(); var c2=revStkCambios().length;
      REVSTK_SOLO_VACIOS=true;
      return { c1:c1, c2:c2, marcas:m1 };
    }, {c, todo});
    chk('acá '+c.g[0]+' · Banzer '+c.g[1]+' · IM '+c.g[2]+' · pedidos '+J(c.lin)+(todo?' · revisar TODO':'')+': después de «Aplicar», la revisión no propone nada más',
        r.c1>0 && r.c2===0, J(r));
  }
  r = await ev(() => {
    var out=[];
    [[2,3,4,[3,2]],[0,5,0,[6]],[5,0,5,[8]],[3,2,0,[1,1,1,1,1,1]]].forEach(function(s){
      _alm(s[0], s[1], s[2]);
      STATE=s[3].map(function(n,i){ return _P({ id:'x'+i, oc:'09-4'+i, fecha:_d(1+i), productos:[_tit(n)] }); });
      var o=_fila(), det=stockSaldoDetalleHtml(o).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
      var m=det.match(/= (\d+) unidades adicionales/);
      var f=stockProducirDe(o, stockMesSiguiente(todayStr()), ventasPanelIndex());
      out.push({ s:J(s), para:o.paraSalir, pedir:o.pedir, fab:o.fabricar, bruto:m?+m[1]:null, sem:f.sem });
    });
    return out;
  });
  chk('«Qué hacer», el detalle del saldo y «Qué producir» (7 días) dicen el mismo número',
      Array.isArray(r) && r.every(x=>x.bruto===x.pedir && x.sem===x.fab), J(r));

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  try{ fs.rmSync(TMP, { recursive:true, force:true }); }catch(e){}
  process.exit(FAIL?1:0);
})();
