/* 🚚 BANZER ES UN DEPÓSITO DEL QUE SALEN CAMIONES (dueño, 26/09).

   *«Salen camiones de la Banzer y de Productos Terminados Fábrica. Solo de Moreno hay que ir a
   traer.»* Hasta hoy el panel trataba a Banzer como a Moreno: un lugar al que hay que IR A BUSCAR
   («📥 recoger de Banzer» + «🚚 Programar la recogida»). Eso dejaba dos errores a la vez: una línea
   que en la realidad salía DIRECTO de Banzer y se entregaba se descontaba de ACÁ (`stockSalio` →
   `salidas`), y Banzer no bajaba nunca. Además el panel mandaba a «recoger» algo que ya podía salir.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Una línea que cubre Banzer queda «✔ hay en Banzer» (chk 'ok' + el lugar), SIN recogida.
   2. Entregada (o de fecha pasada), baja BANZER y no acá, con la misma regla de fecha que el depósito.
   3. Lo comprometido en Banzer no se reparte dos veces, y «Revisar saldo» mira el Excel de Banzer.
   4. El orden del dueño no cambia: acá → Banzer → IM, y «el que la cubre entera» antes que partir.
   5. La lista de carga viene en dos bloques («🏭 Cargar en fábrica» / «🏪 Cargar en Banzer») con
      tildes separadas; las de fábrica conservan la clave de siempre.
   6. El chofer, la hoja de ruta y el WhatsApp de la ruta dicen «(cargar en Banzer)».
   7. De Moreno se sigue yendo a buscar: «📥 recoger de IM», como siempre.
   8. La marca vieja «📥 Banzer» (chk 'im' + Banzer) se lee como «✔ hay en Banzer» sin reescribir nada;
      la revisión propone pasarla a ✔ y «Aplicar» la escribe. Una recogida de Banzer ya programada
      sigue funcionando como hoy.
   9. El diálogo de existencias tiene la opción nueva y viene elegida para Banzer.
   10. La ficha: «✔ Banzer» a mano.
   11. La tabla, «Qué hacer» y «Qué producir» cuentan acá + Banzer como lo disponible para salir.
   12. Ningún número negativo ni NaN.

   Datos SINTÉTICOS (el repo es público). Reloj de la página clavado en el miércoles 23/09/2026,
   18:30 de Bolivia (día hábil: «mañana» es el jueves 24).

   Se corre:  node tests/test_banzer_salida.js   (desde la raíz del repo)
   Dientes contra el panel de antes:  PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_banzer_salida.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=x=>JSON.stringify(x);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-09-23T22:30:00Z'));      // miércoles, 18:30 de Bolivia
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  /* Contra un panel viejo algunas cosas no existen: cada bloque se evalúa aparte y, si revienta,
     vuelve con `__error` y sus comprobaciones salen en rojo, sin cortar la prueba. */
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  chk('el reloj de la página está clavado en el miércoles 23/09/2026', await page.evaluate(() => todayStr()==='2026-09-23'));

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    // La carga de arranque queda reintentando sin red: que no pise nada a mitad de la prueba.
    CARGA_GEN++; CARGA_ESTADO='ok';
    try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._saves=[];
    apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(rec))}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    downloadBlob=function(){};
    window.BANZER='01-05-025  Almacen Distribucion Banzer';      // el nombre REAL del reporte de Moreno (§4ey)
    window.IMN='IM - PRODUCTOTERMINADO';
    window.LOG='PRODUCTOS TERMINADOS FAB.';
    window._d=function(n){ return stockSumarDias(todayStr(), n); };
    window.K=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
    window._tit=function(n,x){ return Object.assign({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}, x||{}); };
    window._alm0=function(n,x){ return Object.assign({desc:'ALMOHADA',medida:'50x70',codigo:'CD1403',cant:n}, x||{}); };
    window._P=function(o){ return Object.assign({id:'p1',fecha:todayStr(),oc:'09-254',vendedor:'Maria Flores',
      cliente:'DON PRUEBA',celular:'70000000',turno:'AM',zona:'Norte',direccion:'Calle 1',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'Foton nuevo',chofer:'Luis Eyzaguirre',
      garantia:'',nota:'1503',acuenta:0,facturarA:'',nit:'1',nroDia:1,verificado:false,fotos:[]}, o); };
    /* Los tres almacenes: acá (el de fábrica), Banzer y Moreno (IM). ⚠️ Banzer queda anotado 'otro'
       por defecto: así lo guardó el diálogo de antes cuando se subió su Excel (26/09, 10:30). El
       panel nuevo lo tiene que reconocer como depósito de salida igual, sin volver a subirlo. */
    window._alm=function(aca, banzer, im, op){
      op=op||{};
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:op.fAca||todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-8*3600000 };
      if(aca!=null) STOCK.c.u[K]=aca;
      STOCK.g={};
      if(banzer!=null){ STOCK.g[BANZER]={ f:op.fBanzer||todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-8*3600000, rs:{} }; STOCK.g[BANZER].u[K]=banzer; if(op.incBanzer) STOCK.g[BANZER].inc=true; }
      if(im!=null){ STOCK.g[IMN]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-8*3600000, rs:{} }; STOCK.g[IMN].u[K]=im; }
      STOCK.al={}; STOCK.al[LOG]='log'; if(banzer!=null) STOCK.al[BANZER]=op.alB||'otro'; if(im!=null) STOCK.al[IMN]='otro';
      STOCK.p=op.p||[];
      stockOlvidarIndice();
      REVSTK_SOLO_VACIOS=true; REVSTK_DIAS='todos';
    };
    window._fila=function(k){ return stockData().lista.filter(function(o){ return o.k===(k||K); })[0]||{}; };
    window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._sinAvance=function(){ var av=document.getElementById('revstk-avance'); if(av) av.remove(); };
    /* De dónde sale cada unidad de una línea que propone la revisión: «acá 3 + Banzer 2». */
    window._donde=function(l){
      var t=[]; if(l && l.deDep) t.push('acá '+l.deDep);
      ((l && l.almPor)||[]).forEach(function(e){ if(e.u>0) t.push(recogerAlmCorto(e.alm)+' '+e.u); });
      return t.join(' + ');
    };
    window._txt=function(sel){ var e=document.querySelector(sel); return e?e.textContent.replace(/\s+/g,' '):''; };
  });

  // ═══ 1. Una línea que cubre Banzer queda «✔ hay en Banzer», sin recogida ═══════════════
  console.log('\n── 1. Lo que cubre Banzer sale de ahí: «✔ hay en Banzer», sin recogida ──');
  let r = await ev(async () => {
    _alm(0, 5, 5);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(3)] }) ];
    var R=stockAsignar(), l=((R.pedidos[0]||{}).lineas||[])[0]||{};
    var out={ ahora:l.ahora, donde:_donde(l), traer:R.traerIM.map(function(o){ return o.u; }), im:R.tot.im };
    REVSTK=R; renderStockRevisar(); await _esperar(100);
    out.queda=[].slice.call(document.querySelectorAll('#modal-box tbody tr')).map(function(t){ var c=t.children; return c.length>3?c[3].textContent.replace(/\s+/g,' ').trim():''; }).join(' | ');
    window._saves=[];
    aplicarStockRevisar(); await _esperar(500); _sinAvance();
    var x=findById('a').productos[0], g=((window._saves[window._saves.length-1]||{}).productos||[])[0]||{};
    out.chk=x.chk; out.chkDe=x.chkDe||''; out.gChk=g.chk; out.gDe=g.chkDe||''; out.recogidas=(STOCK.p||[]).length;
    out.estado=estadoStock(findById('a')).txt;
    return out;
  });
  chk('⚠️ con 0 acá y 5 en Banzer, la revisión marca «✔ hay» desde Banzer (antes: «📥 recoger de Banzer»)', r.ahora==='ok' && r.donde==='Banzer 3', J([r.ahora, r.donde, r.__error]));
  chk('…no hay nada que ir a buscar: la lista para recoger queda vacía', Array.isArray(r.traer) && r.traer.length===0 && r.im===0, J([r.traer, r.im]));
  chk('…y la columna «Queda» de la revisión dice «✔ hay en Banzer»', /✔ hay en Banzer/.test(r.queda||''), r.queda);
  chk('⚠️ «Aplicar» escribe ✔ con el lugar (Banzer) y NO crea ninguna recogida', r.chk==='ok' && /banzer/i.test(r.chkDe||'') && r.recogidas===0, J([r.chk, r.chkDe, r.recogidas]));
  chk('…el lugar viaja a la planilla dentro del producto (sin columna nueva)', r.gChk==='ok' && /banzer/i.test(r.gDe||''), J([r.gChk, r.gDe]));
  chk('…y el pedido queda «En stock», no «Recoger de Banzer»', /En stock/.test(r.estado||'') && !/Recoger/.test(r.estado||''), r.estado);

  // ═══ 2. Entregada: baja Banzer, no acá ════════════════════════════════════════════════
  console.log('\n── 2. Lo que sale de Banzer se descuenta de Banzer, no de acá ──');
  r = await ev(() => {
    var out={}, o;
    // (a) Excel de acá y de Banzer de hoy a la mañana (no incluyen las entregas de hoy)
    _alm(4, 5, null);
    STATE=[ _P({ id:'e1', fecha:todayStr(), entregado:true, productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }),
            _P({ id:'e2', fecha:todayStr(), entregado:true, productos:[_tit(1,{chk:'ok'})] }),
            _P({ id:'e3', fecha:_d(-1), productos:[_tit(1,{chk:'ok', chkDe:'Banzer'})] }) ];     // ayer: ya está adentro del Excel de hoy
    o=_fila(); out.a={ dep:o.deposito, sale:o.enSale, para:o.paraSalir };
    // (b) el Excel de Banzer es de hace 2 días: lo de ayer sin ✓ (fecha pasada) SALIÓ, y salió de Banzer
    _alm(4, 5, null, { fBanzer:_d(-2) });
    STATE=[ _P({ id:'e4', fecha:_d(-1), productos:[_tit(2,{chk:'ok', chkDe:BANZER})] }) ];
    o=_fila(); out.b={ dep:o.deposito, sale:o.enSale, comp:o.comp };
    // (c) el Excel de Banzer de la tarde, «ya incluye las entregas de hoy»: lo de hoy no se descuenta
    _alm(4, 5, null, { incBanzer:true });
    STATE=[ _P({ id:'e5', fecha:todayStr(), entregado:true, productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }) ];
    o=_fila(); out.c={ dep:o.deposito, sale:o.enSale };
    // (d) una línea repartida: 1 de acá y 2 de Banzer, entregada hoy
    _alm(4, 5, null);
    STATE=[ _P({ id:'e6', fecha:todayStr(), entregado:true, productos:[_tit(3,{chk:'ok', chkDes:[{de:'',u:1},{de:'Banzer',u:2}]})] }) ];
    o=_fila(); out.d={ dep:o.deposito, sale:o.enSale };
    return out;
  });
  chk('⚠️ lo que salió de Banzer baja BANZER (5 − 2 = 3) y NO acá (4 − 1 = 3: solo lo que salió de fábrica)', r.a?.sale===3 && r.a?.dep===3, J([r.a, r.__error]));
  chk('…lo de ayer (antes del Excel de Banzer de hoy) ya está adentro: no se descuenta otra vez', r.a?.sale===3, J(r.a));
  chk('…y lo disponible para salir es acá + Banzer = 6', r.a?.para===6, J(r.a));
  chk('⚠️ una «✔ Banzer» de ayer sin ✓ se da por salida (como todo lo de fecha pasada), y sale de BANZER', r.b?.sale===3 && r.b?.dep===4 && r.b?.comp===0, J(r.b));
  chk('…con el Excel de Banzer de la tarde que ya incluye las entregas de hoy, lo de hoy no se descuenta dos veces', r.c?.sale===5 && r.c?.dep===4, J(r.c));
  chk('…y una línea repartida descuenta de cada lado lo suyo (acá 1, Banzer 2)', r.d?.dep===3 && r.d?.sale===3, J(r.d));

  // ═══ 3. Lo comprometido en Banzer no se reparte dos veces ══════════════════════════════
  console.log('\n── 3. Lo comprometido en Banzer no se reparte dos veces ──');
  r = await ev(() => {
    var out={};
    _alm(0, 3, 0);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), cliente:'PRIMERO', productos:[_tit(3,{chk:'ok', chkDe:'Banzer'})] }),
            _P({ id:'b', fecha:_d(2), cliente:'SEGUNDO', productos:[_tit(2)] }) ];
    var R=stockAsignar(), por={};
    R.pedidos.forEach(function(g){ por[g.p.id]=g.lineas[0]; });
    out.b=por.b?{ ahora:por.b.ahora, donde:_donde(por.b) }:null;
    out.faltan=R.faltan.map(function(o){ return o.u; }); out.traer=R.traerIM.map(function(o){ return o.u; });
    var o=_fila(); out.o={ comp:o.comp, para:o.paraSalir, revisar:!!o.revisarStock, fabricar:o.fabricar, recoger:o.recoger };
    // (b) 4 marcados «✔ Banzer» con 3 en el Excel de Banzer (y 5 acá): las marcas no cierran
    _alm(5, 3, 0);
    STATE=[ _P({ id:'c', fecha:proximoDiaEntrega(), productos:[_tit(4,{chk:'ok', chkDe:'Banzer'})] }) ];
    o=_fila(); out.rev={ revisar:!!o.revisarStock, aviso:o.aviso };
    abrirStockPedidos(K); out.detalle=_txt('#modal-box'); closeModal();
    return out;
  });
  chk('⚠️ los 3 de Banzer ya son del PRIMERO: el SEGUNDO queda ✗ no hay (antes se los llevaba como «recoger de Banzer»)', r.b && r.b.ahora==='no', J([r.b, r.__error]));
  chk('…lo que falta se pide a fábrica (2) y no hay nada para ir a buscar', J(r.faltan)==='[2]' && Array.isArray(r.traer) && r.traer.length===0, J([r.faltan, r.traer]));
  chk('…la tabla dice lo mismo: 5 vendidos, 3 para salir, fabricar 2, traer 0, y el saldo cierra', r.o?.comp===5 && r.o?.para===3 && r.o?.fabricar===2 && r.o?.recoger===0 && !r.o?.revisar, J(r.o));
  chk('⚠️ 4 marcados «✔ Banzer» con 3 en el Excel de Banzer → «Revisar saldo», aunque acá haya 5', r.rev?.revisar===true && r.rev?.aviso==='revisar', J(r.rev));
  chk('…y el detalle dice que es lo de Banzer lo que no cierra', /Banzer/.test((r.detalle||'').match(/Por qué pide revisar[^.]*\./)||''), ((r.detalle||'').match(/Por qué pide revisar[^.]*\./)||[''])[0]);

  // ═══ 4. El orden del dueño: acá → Banzer → IM, «el que la cubre entera» primero ═══════
  /* 21/09, textual: *«la idea es tener primero a la mano en fábrica que es de donde salen los
     camiones, luego banzer y si no hay pedir fabricar a IM o recoger de IM»*. El orden no cambia:
     de dónde sale cada unidad es lo mismo que antes; cambia la MARCA (Banzer ya no es «recoger»). */
  console.log('\n── 4. Primero lo de acá, después Banzer, IM al final (y «el que la cubre entera») ──');
  const casos = [
    { g:[2,4,5], n:2, ahora:'ok', donde:'acá 2',             que:'acá alcanza: ✔ hay (fábrica)' },
    { g:[0,4,5], n:2, ahora:'ok', donde:'Banzer 2',          que:'⚠️ acá no hay y Banzer alcanza: ✔ hay en Banzer (antes 📥 recoger)' },
    { g:[0,1,5], n:2, ahora:'im', donde:'IM 2',              que:'Banzer no la cubre entera: va entera a IM (un viaje, no dos)' },
    { g:[0,4,5], n:7, ahora:'im', donde:'Banzer 4 + IM 3', traer:3, que:'⚠️ no alcanza en ninguno: 4 salen de Banzer y a IM se va a buscar solo 3 (antes 7)' },
    { g:[3,4,5], n:5, ahora:'ok', donde:'acá 3 + Banzer 2',  que:'⚠️ primero lo de acá y después Banzer: ✔ repartido, sin recogida' }
  ];
  for (const c of casos) {
    r = await ev((s) => {
      _alm(s.g[0], s.g[1], s.g[2]);
      STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(s.n)] }) ];
      var R=stockAsignar(), l=R.pedidos[0].lineas[0];
      return { ahora:l.ahora, donde:_donde(l), traer:R.traerIM.reduce(function(n,o){ return n+o.u; },0) };
    }, c);
    chk(c.que, r.ahora===c.ahora && r.donde===c.donde && (c.traer==null || r.traer===c.traer),
        'acá '+c.g[0]+' · Banzer '+c.g[1]+' · IM '+c.g[2]+' → pedido de '+c.n+': '+J(r));
  }
  r = await ev(async () => {
    var out={};
    _alm(3, 4, 5);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(5)] }) ];
    REVSTK=stockAsignar(); aplicarStockRevisar(); await _esperar(500); _sinAvance();
    var x=findById('a').productos[0];
    out.split={ chk:x.chk, des:(x.chkDes||[]).map(function(e){ return (e.de?recogerAlmCorto(e.de):'acá')+':'+e.u; }).join(' ') };
    _alm(0, 4, 5);
    STATE=[ _P({ id:'b', fecha:proximoDiaEntrega(), productos:[_tit(7)] }) ];
    REVSTK=stockAsignar(); aplicarStockRevisar(); await _esperar(500); _sinAvance();
    var y=findById('b').productos[0];
    out.mix={ chk:y.chk, des:(y.chkDes||[]).map(function(e){ return (e.de?recogerAlmCorto(e.de):'IM')+':'+e.u; }).join(' '), corto:recogerCorto(y) };
    abrirCarga(); setCargaDia('manana'); await _esperar(150);
    out.carga=_txt('#carga-body'); closeCarga();
    return out;
  });
  chk('⚠️ la línea repartida acá + Banzer queda ✔ con el desglose (3 de acá, 2 de Banzer)', r.split?.chk==='ok' && r.split?.des==='acá:3 Banzer:2', J([r.split, r.__error]));
  chk('⚠️ la mezclada Banzer + IM queda 📥 (hay que ir a IM), con el desglose, y «recoger» dice solo «IM 3»', r.mix?.chk==='im' && r.mix?.des==='Banzer:4 IM:3' && r.mix?.corto==='IM 3', J(r.mix));
  chk('…y la lista de carga manda a buscar 3 a IM y a cargar 4 en Banzer', /RECOGER IM 3/.test(r.carga||'') && /4× TITANIO[^×]*Banzer|Cargar en Banzer[^×]*4×/.test(r.carga||''), (r.carga||'').slice(0,260));

  // ═══ 5. La lista de carga: dos bloques, tildes separadas ═════════════════════════════
  console.log('\n── 5. La lista de carga: «🏭 Cargar en fábrica» y «🏪 Cargar en Banzer» ──');
  r = await ev(async () => {
    var f=proximoDiaEntrega(), veh='Foton nuevo';
    _alm(5, 5, 0);
    STATE=[ _P({ id:'a', fecha:f, cliente:'ALFA', productos:[_tit(2,{chk:'ok', chkDe:'Banzer'}), _alm0(1,{chk:'ok'})] }),
            _P({ id:'b', fecha:f, cliente:'BETA', productos:[_tit(1,{chk:'ok'})] }),
            _P({ id:'c', fecha:f, cliente:'GAMA', productos:[_tit(3,{chk:'ok', chkDes:[{de:'',u:1},{de:'Banzer',u:2}]})] }) ];
    // una tilde de fábrica que ya estaba puesta, con la clave de siempre
    var kF=cargaChkKey(f, veh, 'TITANIO ICE 160x190');
    CARGA_CHK={}; CARGA_CHK[kF]=1; CARGA_CAMBIOS={};
    abrirCarga(); setCargaDia('manana'); await _esperar(150);
    var leer=function(){ return [].slice.call(document.querySelectorAll('#carga-body [data-carga-lugar]')).map(function(b){
      return { lugar:b.getAttribute('data-carga-lugar'), tit:(b.querySelector('.lb')||{textContent:''}).textContent.replace(/\s+/g,' ').trim(),
        filas:[].slice.call(b.querySelectorAll('label')).map(function(l){ var i=l.querySelector('input'); return { t:l.textContent.replace(/\s+/g,' ').trim(), k:i?i.getAttribute('data-k'):'', on:!!(i&&i.checked) }; }) };
    }); };
    var out={ f:f, kF:kF, bloques:leer() };
    var bz=out.bloques.filter(function(b){ return /Banzer/.test(b.tit); })[0];
    var fb=(bz&&bz.filas.filter(function(x){ return /TITANIO/.test(x.t); })[0])||null;
    out.kB=fb?fb.k:'';
    if(fb){ var inp=document.querySelector('#carga-body input[data-k="'+CSS.escape(fb.k)+'"]'); if(inp){ inp.click(); await _esperar(80); } }
    out.claves=Object.keys(CARGA_CHK);
    out.tras=leer();
    out.todo=_txt('#carga-body');
    closeCarga();
    return out;
  });
  {
    const B=r.bloques||[], fab=B.filter(b=>/Cargar en fábrica/.test(b.tit))[0], bz=B.filter(b=>/Cargar en Banzer/.test(b.tit))[0];
    chk('⚠️ la carga del camión viene en DOS bloques: «🏭 Cargar en fábrica» y «🏪 Cargar en Banzer»', !!fab && !!bz, J([B.map(b=>b.tit), r.__error]));
    const fT=fab && fab.filas.filter(x=>/TITANIO/.test(x.t))[0], fA=fab && fab.filas.filter(x=>/ALMOHADA/.test(x.t))[0], bT=bz && bz.filas.filter(x=>/TITANIO/.test(x.t))[0];
    chk('…en fábrica: 2 TITANIO (1 de BETA + 1 de GAMA) y la ALMOHADA; lo de Banzer no se carga acá', !!fT && /^2×/.test(fT.t) && !!fA && /^1×/.test(fA.t), J(fab&&fab.filas.map(x=>x.t)));
    chk('…en Banzer: 4 TITANIO (2 de ALFA + 2 de GAMA) y nada más', !!bT && /^4×/.test(bT.t) && bz.filas.length===1, J(bz&&bz.filas.map(x=>x.t)));
    chk('⚠️ la tilde de fábrica que ya estaba sigue con la MISMA clave de siempre, y tildada', !!fT && fT.k===r.kF && fT.on===true, J(fT));
    chk('…y NO tilda lo de Banzer: cada bloque tiene sus tildes', !!bT && bT.on===false && bT.k!==r.kF, J(bT));
    chk('⚠️ tildar lo de Banzer guarda una clave propia, con la fecha adelante (se poda sola como las otras)',
        !!r.kB && r.kB!==r.kF && (r.claves||[]).indexOf(r.kB)>=0 && (r.claves||[]).indexOf(r.kF)>=0 && r.kB.indexOf(r.f+'|')===0, J([r.kB, r.claves]));
    const bz2=(r.tras||[]).filter(b=>/Cargar en Banzer/.test(b.tit))[0], fab2=(r.tras||[]).filter(b=>/Cargar en fábrica/.test(b.tit))[0];
    chk('…después de tildarla: Banzer tildado y fábrica igual que antes', !!bz2 && bz2.filas[0].on===true && !!fab2 && fab2.filas.filter(x=>/TITANIO/.test(x.t))[0].on===true, J([bz2, fab2]));
    chk('…y en las paradas, el TITANIO de ALFA dice que se carga en Banzer', /CARGAR EN BANZER/.test(r.todo||''), ((r.todo||'').match(/ALFA.{0,160}/)||[''])[0]);
  }

  // ═══ 6. Chofer, hoja de ruta y WhatsApp de la ruta ═══════════════════════════════════
  console.log('\n── 6. El chofer, la hoja de ruta y el WhatsApp de la ruta dicen «(cargar en Banzer)» ──');
  r = await ev(async () => {
    _alm(5, 5, 0);
    STATE=[ _P({ id:'a', fecha:todayStr(), cliente:'ALFA', productos:[_tit(2,{chk:'ok', chkDe:'Banzer'}), _alm0(1,{chk:'ok'})] }),
            _P({ id:'b', fecha:todayStr(), cliente:'BETA', productos:[_tit(3,{chk:'ok', chkDes:[{de:'',u:1},{de:'Banzer',u:2}]})] }),
            _P({ id:'c', fecha:todayStr(), cliente:'GAMA', productos:[_tit(1,{chk:'im', chkDe:'Banzer'})] }) ];   // la marca de antes
    showView('chofer'); llenarSelectChoferes(); var s=document.getElementById('cho-nombre'); s.value='Luis Eyzaguirre'; CHO_FILTER='todos'; renderChofer(); await _esperar(100);
    var cards=[].slice.call(document.querySelectorAll('#cho-lista .cho-card')).map(function(c){ return c.textContent.replace(/\s+/g,' '); });
    abrirRuta(); setRutaDia('hoy'); await _esperar(100);
    var ruta=_txt('#ruta-body');
    var wa=''; var _c=window.copyText, _o=window.open; window.copyText=function(t){ wa=t; }; window.open=function(){ return null; };
    try{ rutaWhatsapp(0); } finally { window.copyText=_c; window.open=_o; }
    closeRuta();
    return { cards:cards, ruta:ruta, wa:wa };
  });
  {
    const cards=r.cards||[], cA=cards.filter(t=>/ALFA/.test(t))[0]||'', cB=cards.filter(t=>/BETA/.test(t))[0]||'', cC=cards.filter(t=>/GAMA/.test(t))[0]||'';
    const n=(t)=>((t||'').match(/cargar en Banzer/g)||[]).length;
    chk('⚠️ la tarjeta del chofer dice «(cargar en Banzer)» en el TITANIO que sale de allá (una vez: la ALMOHADA no)', /TITANIO ICE · 160x190 × 2 \(cargar en Banzer\)/.test(cA) && n(cA)===1, cA.slice(0,160)+' '+J(r.__error));
    chk('…la línea repartida dice cuántas: «(2 cargar en Banzer)»', /\(2 cargar en Banzer\)/.test(cB), cB.slice(0,160));
    chk('⚠️ la marca vieja «📥 Banzer» ya no manda a recoger: también dice «(cargar en Banzer)»', /\(cargar en Banzer\)/.test(cC) && !/recoger de Banzer/i.test(cC), cC.slice(0,160));
    chk('⚠️ la hoja de ruta lo dice en las tres', n(r.ruta)===3, (r.ruta||'').slice(0,240));
    chk('⚠️ …y el WhatsApp de la ruta también', n(r.wa)===3, (r.wa||'').split('\n').filter(l=>/🛏️/.test(l)).join(' / ').slice(0,300));
  }

  // ═══ 7. De Moreno se sigue yendo a buscar ════════════════════════════════════════════
  console.log('\n── 7. Moreno sigue siendo «📥 recoger» ──');
  r = await ev(async () => {
    _alm(0, 0, 5);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(2)] }) ];
    var R=stockAsignar(), l=R.pedidos[0].lineas[0];
    var out={ ahora:l.ahora, donde:_donde(l), traer:R.traerIM.map(function(o){ return o.u+' '+revStkAlmTxt(o); }) };
    REVSTK=R; aplicarStockRevisar(); await _esperar(500); _sinAvance();
    var x=findById('a').productos[0]; out.chk=x.chk; out.de=('chkDe' in x)?x.chkDe:'(no)';
    abrirCarga(); setCargaDia('manana'); await _esperar(150); out.carga=_txt('#carga-body'); closeCarga();
    showView('admin'); showPedidoModal('a'); await _esperar(150);
    out.botones=[].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).map(function(b){ return b.textContent.trim(); });
    closeModal();
    var o=_fila(); out.o={ aviso:o.aviso, recoger:o.recoger, fabricar:o.fabricar };
    // con Banzer que alcanza, no hay nada que ir a traer
    _alm(0, 5, 5); STATE=[ _P({ id:'b', fecha:proximoDiaEntrega(), productos:[_tit(2)] }) ];
    o=_fila(); out.o2={ aviso:o.aviso, recoger:o.recoger, fabricar:o.fabricar, pedir:o.pedir };
    return out;
  });
  chk('de Moreno sí hay que ir a buscar: «📥 recoger de IM», como siempre', r.ahora==='im' && r.donde==='IM 2' && (r.traer||[]).join()==='2 IM', J([r.ahora, r.donde, r.traer, r.__error]));
  chk('…«Aplicar» lo deja 📥 IM, sin almacén anotado (el vacío de siempre)', r.chk==='im' && r.de==='(no)', J([r.chk, r.de]));
  chk('…la lista de carga dice «📥 RECOGER IM»', /RECOGER IM/.test(r.carga||''), ((r.carga||'').match(/📥 RECOGER [A-Z]+/)||[''])[0]);
  chk('⚠️ la ficha ofrece «📥 IM» para recoger, y Banzer ya NO es un «📥»: es «✔ Banzer»', (r.botones||[]).indexOf('📥 IM')>=0 && (r.botones||[]).indexOf('📥 Banzer')<0 && (r.botones||[]).indexOf('✔ Banzer')>=0, J(r.botones));
  chk('…en la tabla: falta acá y en Banzer y hay en Moreno → 🚚 traer 2, fabricar 0', r.o?.aviso==='traer' && r.o?.recoger===2 && r.o?.fabricar===0, J(r.o));
  chk('⚠️ …pero si Banzer alcanza, no hay nada que traer ni pedir (antes: «🚚 Programar recogida»)', !!r.o2 && r.o2.aviso!=='traer' && r.o2.recoger===0 && r.o2.pedir===0, J(r.o2));

  // ═══ 8. La marca vieja «📥 Banzer» ════════════════════════════════════════════════════
  console.log('\n── 8. La marca de antes («📥 Banzer») se lee como «✔ hay en Banzer» ──');
  r = await ev(async () => {
    var out={};
    _alm(0, 5, 5);
    STATE=[ _P({ id:'v', fecha:proximoDiaEntrega(), productos:[_tit(2,{chk:'im', chkDe:'Banzer'})] }) ];
    var p=findById('v');
    out.estado=estadoStock(p).txt; out.fila=rowKind(p);
    var o=_fila(); out.o={ comp:o.comp, sale:o.enSale, aviso:o.aviso, recoger:o.recoger };
    showView('admin'); showPedidoModal('v'); await _esperar(150);
    out.on=[].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).filter(function(b){ return /\b(ok|im|no)\b/.test(b.className); }).map(function(b){ return b.textContent.trim(); });
    closeModal();
    var sinTocar=JSON.stringify(findById('v'));
    var R=stockAsignar(), l=((R.pedidos[0]||{}).lineas||[])[0]||null;
    out.intacto=(JSON.stringify(findById('v'))===sinTocar);
    out.l=l?{ antes:l.antes, ahora:l.ahora, cambia:!!l.cambia, contra:!!l.contra }:null;
    REVSTK=R; out.cambios=revStkCambios().length;
    aplicarStockRevisar(); await _esperar(500); _sinAvance();
    var y=findById('v').productos[0]; out.tras={ chk:y.chk, de:y.chkDe||'' };
    return out;
  });
  chk('⚠️ una marca de antes «📥 Banzer» se lee como «✔ hay en Banzer»: el pedido queda «En stock» y sin fila violeta', /En stock/.test(r.estado||'') && r.fila!=='im', J([r.estado, r.fila, r.__error]));
  chk('…y se cuenta como Banzer: 2 comprometidos, 5 en Banzer, nada que traer', r.o?.comp===2 && r.o?.sale===5 && r.o?.recoger===0 && r.o?.aviso!=='traer', J(r.o));
  chk('…en la ficha queda encendido «✔ Banzer» (no el 📥)', (r.on||[]).join(',')==='✔ Banzer', J(r.on));
  chk('…leerla y repartir no reescribe nada', r.intacto===true, J(r.intacto));
  chk('⚠️ la revisión propone pasarla a ✔ Banzer, sin llamarlo «cambia lo marcado a mano»', !!r.l && r.l.antes==='im' && r.l.ahora==='ok' && r.l.cambia && !r.l.contra && r.cambios===1, J([r.l, r.cambios]));
  chk('…y «Aplicar» la escribe: ✔ con Banzer', r.tras?.chk==='ok' && /banzer/i.test(r.tras?.de||''), J(r.tras));
  r = await ev(() => {
    var out={}, o;
    // entregada hoy con la marca de antes: baja Banzer, no acá
    _alm(4, 5, null);
    STATE=[ _P({ id:'v1', fecha:todayStr(), entregado:true, productos:[_tit(2,{chk:'im', chkDe:'Banzer'})] }) ];
    o=_fila(); out.ent={ dep:o.deposito, sale:o.enSale };
    // una recogida de Banzer ya programada (con la marca de antes) sigue como hoy: la cubre, y llega acá
    _alm(0, 3, 0, { p:[{ id:'rc1', k:K, u:2, tipo:'recogida', de:BANZER, fab:'', f:todayStr(), esp:proximoDiaEntrega(), r:'' }] });
    STATE=[ _P({ id:'v2', fecha:proximoDiaEntrega(), productos:[_tit(2,{chk:'im', chkDe:'Banzer'})] }) ];
    var R=stockAsignar(); REVSTK=R;
    o=_fila(); out.rec={ camino:o.enCamino, sale:o.enSale, cambios:revStkCambios().length, revisar:!!o.revisarStock, faltan:R.faltan.length };
    var q=STOCK.p[0]; q.total=2; stockRecsDe(q).push(stockRecNuevo(2, todayStr())); stockNormalizarRecepciones(STOCK); stockOlvidarIndice();
    o=_fila(); out.llego={ dep:o.deposito, sale:o.enSale, camino:o.enCamino };
    return out;
  });
  chk('⚠️ entregada con la marca de antes: baja BANZER (5 → 3) y acá queda en 4', r.ent?.sale===3 && r.ent?.dep===4, J([r.ent, r.__error]));
  chk('una recogida de Banzer ya programada sigue funcionando: 2 en camino, 1 libre en Banzer, la línea no se toca', r.rec?.camino===2 && r.rec?.sale===1 && r.rec?.cambios===0 && !r.rec?.revisar && r.rec?.faltan===0, J(r.rec));
  chk('…y al llegar suma acá y resta de Banzer, como hoy', r.llego?.dep===2 && r.llego?.sale===1 && r.llego?.camino===0, J(r.llego));

  // ═══ 9. El diálogo de existencias ═════════════════════════════════════════════════════
  console.log('\n── 9. El diálogo de existencias tiene la opción nueva ──');
  r = await ev(() => {
    var out={};
    var subir=function(alm, cant, hora){
      EXIST_IMP={ fecha:todayStr(), sinFecha:false, hora:hora||'', almacen:alm,
                  items:[{cod:'CH1201', desc:'TITANIO ICE 2.5PLZ 160X190CM', medida:'160x190', cant:cant, cat:true, k:K}],
                  total:cant, repetidos:0, malos:0, colCant:'G', solo0:true, cods:{CH1201:K},
                  esLog:normNombre(alm)===normNombre(STOCK_ALM_LOG)||(STOCK.al||{})[alm]==='log', conocido:!!(STOCK.al||{})[alm] };
      renderImportExist();
      var sel=document.getElementById('exist-rol');
      return { ops:sel?[].slice.call(sel.options).map(function(o){ return o.value+'='+o.textContent; }):[], val:sel?sel.value:'' };
    };
    var inicio=function(){
      STOCK=stockVacio(); STOCK_CARGADO=true;
      STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-8*3600000 }; STOCK.c.u[K]=4;
      STOCK.al={}; STOCK.al[LOG]='log'; STATE=[]; stockOlvidarIndice();
    };
    inicio();
    out.banzer=subir(BANZER, 7, '15:30:00');
    confirmarImportExist(); stockOlvidarIndice();
    out.tras={ al:STOCK.al[BANZER], g:(STOCK.g[BANZER]||{u:{}}).u[K], inc:!!(STOCK.g[BANZER]||{}).inc, aca:STOCK.c.u[K], sale:_fila().enSale };
    out.im=subir(IMN, 5, '08:00:00'); closeModal();
    // «fábrica» para el Excel de Banzer: pregunta antes de reemplazar el conteo de acá
    inicio(); subir(BANZER, 7, '15:30:00');
    document.getElementById('exist-rol').value='log';
    var msg='', _cf=window.confirm; window.confirm=function(m){ msg=String(m); return false; };
    try{ confirmarImportExist(); } finally { window.confirm=_cf; }
    closeModal();
    out.log={ msg:msg, alm:STOCK.c.alm, aca:STOCK.c.u[K] };
    // «ir a traer» para Banzer, elegido a mano: se pregunta (el dueño dijo que sale camión) y se respeta
    inicio(); subir(BANZER, 7, '15:30:00');
    document.getElementById('exist-rol').value='otro';
    var msg2=''; window.confirm=function(m){ msg2=String(m); return true; };
    try{ confirmarImportExist(); } finally { window.confirm=_cf; }
    out.trae={ msg:msg2, al:STOCK.al[BANZER], sale:(typeof almEsSalida==='function')?almEsSalida(BANZER):null,
               botones:recogerLista().map(function(A){ return A.corto; }) };
    return out;
  });
  chk('⚠️ el diálogo de existencias tiene tres opciones, con «🚚 … TAMBIÉN salen camiones (Banzer)»', r.banzer?.ops?.length===3 && r.banzer.ops.some(o=>/^sale=.*TAMBIÉN salen camiones/.test(o)), J([r.banzer?.ops, r.__error]));
  chk('⚠️ …y para el Excel de Banzer viene elegida la nueva', r.banzer?.val==='sale', J(r.banzer?.val));
  chk('⚠️ al confirmar, Banzer queda como depósito de salida con su conteo; el de fábrica no se toca', r.tras?.al==='sale' && r.tras?.g===7 && r.tras?.aca===4 && r.tras?.sale===7, J(r.tras));
  chk('…el Excel de la tarde queda anotado como «ya incluye las entregas del día» (para descontar como el de acá)', r.tras?.inc===true, J(r.tras));
  chk('el Excel de Moreno viene con «ir a traer» elegido, y no ofrece «salen camiones»', r.im?.val==='otro' && !(r.im?.ops||[]).some(o=>/^sale=/.test(o)), J(r.im));
  chk('elegir «fábrica» para Banzer sigue preguntando antes de reemplazar el conteo de acá, y nombra la opción de Banzer',
      /DEPÓSITO DE FÁBRICA/.test(r.log?.msg||'') && /TAMBIÉN salen camiones/.test(r.log?.msg||'') && r.log?.alm==='PRODUCTOS TERMINADOS FAB.' && r.log?.aca===4, J(r.log));
  chk('⚠️ elegir «ir a traer» para Banzer se pregunta, y si se confirma se respeta: vuelve a ser un 📥',
      /Banzer/.test(r.trae?.msg||'') && r.trae?.al==='trae' && r.trae?.sale===false && (r.trae?.botones||[]).indexOf('Banzer')>=0, J(r.trae));

  // ═══ 10. La ficha: «✔ Banzer» a mano ══════════════════════════════════════════════════
  console.log('\n── 10. En la ficha se marca a mano «✔ hay (fábrica)» o «✔ hay en Banzer» ──');
  r = await ev(async () => {
    _alm(3, 5, 5);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(2)] }) ];
    showView('admin'); showPedidoModal('a'); await _esperar(150);
    var tocar=function(t){ var b=[].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).filter(function(x){ return x.textContent.trim()===t; })[0]; if(b) b.click(); return !!b; };
    var on=function(){ return [].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).filter(function(b){ return /\b(ok|im|no)\b/.test(b.className); }).map(function(b){ return b.textContent.trim(); }); };
    var out={};
    window._saves=[];
    out.t1=tocar('✔ Banzer'); await _esperar(150);
    var x=findById('a').productos[0];
    out.m1={ chk:x.chk, de:x.chkDe||'', on:on(), g:(((window._saves[0]||{}).productos||[])[0]||{}).chkDe||'' };
    tocar('✔'); await _esperar(150);
    x=findById('a').productos[0]; out.m2={ chk:x.chk, de:('chkDe' in x)?x.chkDe:'(no)', on:on() };
    tocar('✔'); await _esperar(150);
    x=findById('a').productos[0]; out.m3={ chk:x.chk||'', on:on() };
    out.ayuda=_txt('#modal-box');
    closeModal();
    return out;
  });
  /* El botón guarda el nombre REAL del almacén cuando su Excel está cargado (§4ey: «01-05-025  Almacen
     Distribucion Banzer»), como el 📥 de antes; «Banzer» a mano y ese nombre son el mismo lugar (`recogerMismo`). */
  chk('⚠️ la ficha tiene «✔ Banzer»: marca «hay en Banzer» a mano y lo guarda en la planilla', r.t1===true && r.m1?.chk==='ok' && /banzer/i.test(r.m1?.de||'') && /banzer/i.test(r.m1?.g||'') && (r.m1?.on||[]).join()==='✔ Banzer', J([r.m1, r.__error]));
  chk('…tocar «✔» (fábrica) la pasa a fábrica: cambia de lugar, no se apaga', r.m2?.chk==='ok' && r.m2?.de==='(no)' && (r.m2?.on||[]).join()==='✔', J(r.m2));
  chk('…y tocar el mismo la desmarca', r.m3?.chk==='' && (r.m3?.on||[]).length===0, J(r.m3));

  // ═══ 11. La tabla, «Qué hacer» y «Qué producir» ══════════════════════════════════════
  console.log('\n── 11. Lo disponible para salir es acá + Banzer ──');
  r = await ev(async () => {
    _alm(0, 10, 0);
    STATE=[ _P({ id:'a', fecha:proximoDiaEntrega(), productos:[_tit(3)] }) ];
    var o=_fila(), out={ o:{ para:o.paraSalir, aviso:o.aviso, pedir:o.pedir, recoger:o.recoger, fabricar:o.fabricar } };
    out.hay=stockProducirDe(o, stockMesSiguiente(todayStr()), ventasPanelIndex()).hay;
    abrirStock(); await _esperar(150);
    out.th=[].slice.call(document.querySelectorAll('#stock-body table.stk-tabla')).map(function(t){ return [].slice.call(t.querySelectorAll('thead th')).map(function(h){ return h.textContent.replace(/\s+/g,' ').trim(); }); })
             .filter(function(h){ return h.some(function(x){ return /Acá en fábrica/.test(x); }); })[0]||[];
    var fila=document.querySelector('#stock-body tr[data-stock-k="'+CSS.escape(K)+'"]');
    out.celdas=fila?[].slice.call(fila.children).map(function(td){ return td.textContent.replace(/\s+/g,' ').trim(); }):[];
    closeStock();
    // 2 en Banzer + 5 en Moreno para 3 vendidos: 2 salen de Banzer, se trae 1 de Moreno, nada que fabricar
    _alm(0, 2, 5); STATE=[ _P({ id:'b', fecha:proximoDiaEntrega(), productos:[_tit(3)] }) ];
    o=_fila(); out.o2={ para:o.paraSalir, pedir:o.pedir, recoger:o.recoger, fabricar:o.fabricar, aviso:o.aviso };
    return out;
  });
  chk('⚠️ con 10 en Banzer y 3 vendidos no hay que traer ni pedir nada (antes: «🚚 traer de otro almacén»)', r.o?.para===10 && r.o?.aviso!=='traer' && r.o?.pedir===0 && r.o?.recoger===0 && r.o?.fabricar===0, J([r.o, r.__error]));
  chk('…«Qué producir» cuenta lo de Banzer en «Hay»', r.hay===10, J(r.hay));
  {
    const i=(r.th||[]).findIndex(t=>/En Banzer/.test(t));
    chk('⚠️ la tabla del stock tiene su columna «En Banzer», con los 10', i>=0 && /^10(?!\d)/.test((r.celdas||[])[i]||''), J([r.th, r.celdas]));
  }
  chk('⚠️ 2 en Banzer + 5 en Moreno para 3 vendidos: se trae 1, nada que fabricar', r.o2?.para===2 && r.o2?.pedir===1 && r.o2?.recoger===1 && r.o2?.fabricar===0 && r.o2?.aviso==='traer', J(r.o2));

  // ═══ 12. Ningún número negativo ni NaN ════════════════════════════════════════════════
  console.log('\n── 12. Sesenta escenarios al azar: nada negativo ni NaN ──');
  r = await ev(() => {
    var malos=[], seed=7, rnd=function(){ seed=(seed*16807)%2147483647; return seed/2147483647; };
    var marcas=[{},{chk:'ok'},{chk:'ok',chkDe:'Banzer'},{chk:'im'},{chk:'im',chkDe:'Banzer'},{chk:'no'},
                {chk:'ok',chkDes:[{de:'',u:1},{de:'Banzer',u:1}]},{chk:'im',chkDes:[{de:'Banzer',u:1},{de:'',u:1}]}];
    for(var t=0;t<60;t++){
      // ⚠️ el −1 de acá: un conteo viejo (negativo) no puede contagiar a Banzer ni a las cuentas
      _alm(Math.floor(rnd()*6)-1, Math.floor(rnd()*6), Math.floor(rnd()*6), { incBanzer:rnd()<0.3, fBanzer:_d(-Math.floor(rnd()*3)) });
      STATE=[];
      for(var i=0;i<5;i++){
        var m=marcas[Math.floor(rnd()*marcas.length)], n=1+Math.floor(rnd()*4);
        STATE.push(_P({ id:'x'+t+'_'+i, fecha:_d(Math.floor(rnd()*5)-2), entregado:rnd()<0.2, productos:[_tit(n, JSON.parse(JSON.stringify(m)))] }));
      }
      var o=_fila();
      ['enSale','paraSalir','pedir','recoger','fabricar','comp','enOtros'].forEach(function(c){ var v=o[c]; if(!(typeof v==='number' && isFinite(v) && v>=0)) malos.push(t+':'+c+'='+v); });
      var R=stockAsignar();
      R.pedidos.forEach(function(g){ g.lineas.forEach(function(l){ ['deDep','deIM','falta','hayDep','hayIM'].forEach(function(c){ var v=l[c]; if(v!=null && !(isFinite(v) && v>=0)) malos.push(t+':'+c+'='+v); }); }); });
      [R.faltan, R.traerIM].forEach(function(L){ L.forEach(function(x){ if(!(isFinite(x.u) && x.u>0)) malos.push(t+':lista u='+x.u); }); });
    }
    abrirStock(); var html=document.getElementById('stock-body').innerHTML; closeStock();
    var limpio=html.replace(/\s(data-[a-z-]+|onclick|title)="[^"]*"/g,'');
    return { malos:malos.slice(0,8), n:malos.length, nan:(limpio.match(/.{0,40}(NaN|undefined).{0,40}/)||[''])[0] };
  });
  chk('⚠️ 60 escenarios al azar: ningún saldo, pedido, recogida ni fabricación queda negativo ni NaN', r.n===0, J([r.malos, r.__error]));
  chk('…y la pantalla del stock no muestra NaN ni undefined', r.nan==='' , J(r.nan));

  // ═══ 13. Lo que queda alrededor ═══════════════════════════════════════════════════════
  console.log('\n── 13. Tildes que se podan, WhatsApp, Excel, formulario y «Conté el depósito» ──');
  r = await ev(async () => {
    var out={}, f=proximoDiaEntrega();
    _alm(4, 5, 0);
    STATE=[ _P({ id:'a', fecha:f, cliente:'ALFA', productos:[_tit(2,{chk:'ok', chkDe:'Banzer'})] }),
            _P({ id:'b', fecha:todayStr(), entregado:true, cliente:'BETA', productos:[_tit(3,{chk:'ok', chkDes:[{de:'',u:1},{de:'Banzer',u:2}]})] }) ];
    // (a) la tilde de Banzer se poda sola como las de fábrica (más de 10 días) y la de hoy queda
    var vieja=cargaChkKey(_d(-12), 'Foton nuevo', 'TITANIO ICE 160x190', 'Banzer'), nueva=cargaChkKey(f, 'Foton nuevo', 'TITANIO ICE 160x190', 'Banzer');
    var o={}; o[vieja]=1; o[nueva]=1;
    var txt=textoCargaChk(o); out.poda={ vieja:txt.indexOf(vieja)>=0, nueva:txt.indexOf(nueva)>=0 };
    // (b) el WhatsApp de «pedidos de mañana» (y del cierre)
    out.wa=envioProd(findById('a')).join(' / ');
    // (c) el Excel de la carga (el que se manda por correo): la columna REVISIÓN
    window._xl=null; var _b=buildXlsx; buildXlsx=function(sh){ window._xl=sh; return _b(sh); };
    try{ showView('admin'); await _esperar(120); segSet('adm-mode','todo'); QUICK_FILTER=''; admTopeReset(); exportExcel('todo'); } finally { buildXlsx=_b; }
    var M=(window._xl&&window._xl[0]&&window._xl[0].matrix)||[];
    out.excel=M.map(function(fila){ return (fila||[]).map(function(c){ return (c&&c.v!=null)?String(c.v):''; }).join(' | '); }).filter(function(t){ return /ALFA/.test(t); })[0]||'';
    // (d) corregir el pedido desde el formulario no le saca el lugar a la marca
    var her=heredarMarcas([{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:2}], findById('a').productos);
    out.her={ chk:her[0].chk, de:her[0].chkDe||'' };
    var her2=heredarMarcas([{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:3}], findById('b').productos);
    out.her2=JSON.stringify(her2[0].chkDes||null);
    // (e) «Conté el depósito»: lo que salió HOY de Banzer no se le suma al número de acá
    out.salidasAca=stockSalidas(K, todayStr(), '');
    // (f) la tira de botones: sin `flex:none` y con el nombre recortado a 12 letras
    STOCK.g['01-05-099  Deposito Central Norte Grande']={ f:todayStr(), u:{}, t:Date.now(), rs:{} }; STOCK.g['01-05-099  Deposito Central Norte Grande'].u[K]=1;
    STOCK.al['01-05-099  Deposito Central Norte Grande']='sale'; stockOlvidarIndice();
    showPedidoModal('a'); await _esperar(150);
    var tira=document.querySelector('#modal-box .prod-rev > span:last-child');
    out.flexNone=tira ? /flex:\s*none/.test(tira.getAttribute('style')||'') : null;
    out.largos=[].slice.call(document.querySelectorAll('#modal-box .prod-rev button')).map(function(b){ return b.textContent.trim(); }).filter(function(t){ return /^✔ ./.test(t); });
    closeModal();
    return out;
  });
  chk('la tilde de «Cargar en Banzer» se poda sola a los 10 días, como las de fábrica, y la de mañana queda', r.poda?.vieja===false && r.poda?.nueva===true, J([r.poda, r.__error]));
  chk('⚠️ el WhatsApp de «pedidos de mañana» dice «(CARGAR EN BANZER)»', /\(CARGAR EN BANZER\)/.test(r.wa||''), r.wa);
  chk('⚠️ el Excel de la carga dice en REVISIÓN que se carga en Banzer', /✔ HAY · \(CARGAR EN BANZER\)/.test(r.excel||''), (r.excel||'').slice(0,160));
  chk('⚠️ corregir el pedido desde el formulario conserva «✔ Banzer» y el desglose (antes volvía a «✔ acá»)', r.her?.chk==='ok' && r.her?.de==='Banzer' && /Banzer/.test(r.her2||''), J([r.her, r.her2]));
  chk('⚠️ «Conté el depósito» no le suma a acá lo que salió de Banzer (de las 3 de BETA, 1 salió de acá)', r.salidasAca===1, J(r.salidasAca));
  chk('la tira de botones de la ficha no lleva flex:none y el nombre largo va recortado a 12 letras', r.flexNone===false && (r.largos||[]).length===2 && (r.largos||[]).every(function(t){ return t.length<=2+12; }), J([r.flexNone, r.largos]));

  chk('sin errores de JavaScript', errores.length===0, errores.slice(0,3).join(' | '));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
