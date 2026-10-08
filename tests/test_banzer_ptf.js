/* 📍 BANZER O PTF: QUÉ TENER EN CADA DEPÓSITO, SEGÚN DÓNDE SE ENTREGA (§4ht, dueño 07/10).

   «Necesitamos saber, medir y determinar qué productos debemos tener en almacén Banzer y qué en almacén productos
   terminados fábrica, según los focos de calor de entrega y rotación, para ser más eficientes y tener el stock a la mano
   según la zona de entrega.» Lo que este test cuida (con ubicaciones INVENTADAS: el repo es público):
   1. El botón está en la barra de Stock y abre la pantalla, sin errores.
   2. Qué entregas cuentan: las que miden la rotación de los últimos 60 días (equipo + Eduardo a Multicenter). Afuera:
      RPT, las otras de Eduardo, ATC, ventas de tienda, lo de hace más de 60 días y lo que todavía no se entregó.
   3. De qué lado: el depósito más cerca en línea recta; «en el medio» = mitad y mitad; sin pin, por la zona escrita
      (aprendida de los pedidos de esa zona que SÍ tienen pin, sin mayúsculas); sin pin ni zona conocida, no cuenta.
   4. Qué hacer: «pasar N a Banzer» solo con lo que a PTF le sobra; si no sobra, «lo próximo que llegue»; Banzer de más =
      «no mandar más» (NUNCA traer de Banzer a fábrica); lo que rota poco no se reparte (todo en PTF); bien repartido.
      «Tener en total» es la MISMA cuenta de Stock (`stockNecesario`, la de «cuánto pedir»).
   5. La tabla: filtros, búsqueda y tocar un producto lo muestra solo en el mapa.
   6. El mapa: los dos depósitos con su nombre, los puntos con el color de su lado y la línea del medio.
   7. Los enlaces cortos que el panel no lee los abre el servidor (`apiGeocode`), los más nuevos primero; lo que no
      puede abrir se dice y esa entrega va por su zona.
   8. «📋 Copiar para logística» con lo que hay que mover.
   9. Solo mira: no guarda nada ni cambia el stock.
   10. En el celular (390 px) no se sale de la pantalla.
   11. La línea del dueño (07/10): izquierda Banzer, derecha PTF, 500 m de franja; sin línea, la regla de antes.
   12. El plan desplegable de 7, 15 y 30 días (07/10 a la noche, §4hv): qué tener en cada depósito (lo ya vendido + lo para
       tener, sumados), qué llevar de PTF a Banzer sin dejar a PTF debajo de lo suyo, qué traer de Moreno (primero a PTF; Sueña,
       de Multiespumas), nunca de Banzer a PTF, sin «pedir», con 0 en los dos depósitos, y la alerta «Recordá revisar la
       producción» cuando el Excel de Moreno tiene menos de lo que hay que traer.

   Se corre:  node tests/test_banzer_ptf.js   (desde la raíz del repo; PEDIDOS=<ruta> para otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const J=(x)=>JSON.stringify(x);
const PAGINA = path.resolve(process.env.PEDIDOS || 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1400,height:950}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-07T10:00:00-04:00'));   // miércoles: nada cae en domingo ni feriado
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + PAGINA, { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['abrirAlm','almZonaData','almCopiar','almGeoPedir','stockNecesario','abrirStock'].filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene la pantalla «📍 Banzer o PTF»', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    try{ localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_GEO); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._saves=[];
    apiSave=function(rec){ window._saves.push(rec); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    /* El servidor que abre enlaces: TEST1 lo ubica cerca de Banzer; MALO no lo puede abrir. */
    window._geo=[];
    apiGeocode=function(links){
      window._geo.push(links.slice());
      return Promise.resolve({ ok:true, version:'prueba', geo:links.map(function(u){
        return /TEST1/.test(u) ? { link:u, lat:-17.706, lng:-63.176 } : { link:u, lat:null, lng:null }; }) });
    };
    /* Leaflet de mentira que ANOTA lo que se dibuja (sin internet en la prueba). */
    window._mapa={ circulos:[], marcas:[], lineas:[], encuadres:0 };
    var capa=function(){ return { addTo:function(){ return this; }, clearLayers:function(){ window._mapa.circulos=[]; window._mapa.marcas=[]; window._mapa.lineas=[]; } }; };
    var marca=function(ll,o){ var m={ ll:ll, o:o||{}, tip:'', pop:'',
      bindPopup:function(t){ m.pop=t; return m; }, bindTooltip:function(t){ m.tip=t; return m; },
      addTo:function(){ window._mapa.marcas.push(m); return m; } }; return m; };
    window.L={
      map:function(){ return { invalidateSize:function(){}, fitBounds:function(){ window._mapa.encuadres++; }, setView:function(){ window._mapa.encuadres++; }, remove:function(){} }; },
      tileLayer:function(){ return { addTo:function(){ return this; } }; },
      layerGroup:capa,
      circle:function(ll,o){ return { addTo:function(){ window._mapa.circulos.push({ ll:ll, o:o }); return this; } }; },
      circleMarker:marca,
      polyline:function(ll,o){ return { addTo:function(){ window._mapa.lineas.push({ ll:ll, o:o }); return this; } }; }
    };
    window._d=function(n){ return stockSumarDias(todayStr(), -n); };
    window._q=function(lat,lng){ return 'https://www.google.com/maps?q='+lat+','+lng; };
    // Cerca de PTF (este), cerca de Banzer (norte) y sobre la línea.
    window.CERCA_P=[[-17.755,-63.135],[-17.760,-63.130],[-17.765,-63.140],[-17.752,-63.128],[-17.758,-63.137]];
    window.CERCA_B=[[-17.705,-63.175],[-17.710,-63.170],[-17.700,-63.165],[-17.712,-63.178],[-17.703,-63.172]];
    var P=ALM_UBIC[0], B=ALM_UBIC[1];
    // «En el medio» = sobre la línea de logística (08/10): un punto de la línea entre los dos depósitos. Con la del dueño era
    // el punto medio entre PTF y Banzer, que caía sobre su línea; la de logística pasa 1 km más al este.
    window.MEDIO=[-17.72997,-63.14015];
    var n=0;
    window._P=function(o){ n++; return Object.assign({ id:'t'+n, fecha:_d(3), oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'CLIENTE '+n,
      celular:'70000000', turno:'AM', zona:'', direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now(), metodoPago:'',
      observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'', garantia:'', nota:'', acuenta:0, facturarA:'', nit:'',
      nroDia:1, verificado:false, fotos:[] }, o); };
    var pr=function(cod, d, m, c){ return { desc:d, medida:m, codigo:cod, cant:c }; };
    window.A=function(c){ return pr('CH1201','TITANIO ICE','160x190',c); };      // pasar a Banzer
    window.C=function(c){ return pr('CH1761','ORO BI RELAX','140x190',c); };     // Banzer tiene de más
    window.D=function(c){ return pr('CH1129','TITANIO LATEX','140x190',c); };    // lo próximo que llegue
    window.E=function(c){ return pr('CH1051','ORO ORTOPEDICO','140x190',c); };   // se vende poco
    window.F=function(c){ return pr('CH1036','ORO ANATOMICO VISCOLASTICO','140x190',c); };   // bien repartido
    var cb=CERCA_B, cp=CERCA_P;
    STATE=[
      // A · TITANIO ICE 160x190: 6 cerca de Banzer (zona «Norte»), 2 cerca de PTF, 1 sin ubicar (zona que nadie tiene con mapa)
      _P({ fecha:_d(2),  zona:'Norte', maps:_q(cb[0][0],cb[0][1]), productos:[A(2)] }),
      _P({ fecha:_d(6),  zona:'Norte', maps:_q(cb[1][0],cb[1][1]), productos:[A(2)] }),
      _P({ fecha:_d(11), zona:'Norte', maps:_q(cb[2][0],cb[2][1]), productos:[A(2)] }),
      _P({ fecha:_d(3),  zona:'Este',  maps:_q(cp[0][0],cp[0][1]), productos:[A(2)] }),
      _P({ fecha:_d(5),  zona:'Zona Rara', productos:[A(1)] }),
      // …y lo que NO cuenta (todo cerca de Banzer, 5 unidades: si contara, cambiaba el reparto)
      _P({ fecha:_d(4),  oc:'RPT 10-001', cliente:'Mia Plaza', zona:'Norte', maps:_q(cb[3][0],cb[3][1]), productos:[A(5)] }),
      _P({ fecha:_d(4),  vendedor:'Eduardo Añez', cliente:'JUAN PEREZ', zona:'Norte', maps:_q(cb[3][0],cb[3][1]), productos:[A(5)] }),
      _P({ fecha:_d(4),  oc:'ATC 10-001', zona:'Norte', maps:_q(cb[3][0],cb[3][1]), productos:[A(5)] }),
      _P({ fecha:'', direccion:'SALIÓ DE TIENDA · Central', zona:'TIENDA', ts:new Date('2026-10-05T12:00:00-04:00').getTime(), productos:[A(5)] }),
      _P({ fecha:_d(70), zona:'Norte', maps:_q(cb[4][0],cb[4][1]), productos:[A(5)] }),
      _P({ fecha:stockSumarDias(todayStr(),1), zona:'Norte', maps:_q(cb[4][0],cb[4][1]), productos:[A(2)] }),   // vendido, sin entregar: comp
      // C · ORO BI RELAX 140x190: casi todo cerca de PTF (con Eduardo a Multicenter, que SÍ cuenta)
      _P({ fecha:_d(1),  zona:'Este', maps:_q(cp[1][0],cp[1][1]), productos:[C(2)] }),
      _P({ fecha:_d(7),  zona:'Este', maps:_q(cp[2][0],cp[2][1]), productos:[C(2)] }),
      _P({ fecha:_d(12), zona:'Este', maps:_q(cp[3][0],cp[3][1]), productos:[C(2)] }),
      _P({ fecha:_d(4),  zona:'Norte', maps:_q(cb[1][0],cb[1][1]), productos:[C(1)] }),
      _P({ fecha:_d(9),  vendedor:'Eduardo Añez', cliente:'MULTICENTER BODEGA', zona:'Este', maps:_q(cp[4][0],cp[4][1]), productos:[C(1)] }),
      // D · TITANIO LATEX 140x190: cerca de Banzer, uno por la zona escrita en minúsculas, uno con enlace corto
      _P({ fecha:_d(2),  zona:'Norte', maps:_q(cb[2][0],cb[2][1]), productos:[D(1)] }),
      _P({ fecha:_d(8),  zona:'Norte', maps:_q(cb[0][0],cb[0][1]), productos:[D(1)] }),
      _P({ fecha:_d(10), zona:'norte', productos:[D(1)] }),
      _P({ fecha:_d(5),  zona:'', maps:'https://maps.app.goo.gl/TEST1?g_st=ic', productos:[D(1)] }),
      // E · ORO ORTOPEDICO 140x190: dos entregas nomás (no rota), una con un enlace que el servidor no abre
      _P({ fecha:_d(3),  zona:'Norte', maps:_q(cb[3][0],cb[3][1]), productos:[E(1)] }),
      _P({ fecha:_d(6),  zona:'', maps:'https://maps.app.goo.gl/MALO', productos:[E(1)] }),
      // F · ORO ANATOMICO 140x190: mitad y mitad, con una entrega justo en el medio
      _P({ fecha:_d(1),  zona:'Este',  maps:_q(cp[0][0],cp[0][1]), productos:[F(2)] }),
      _P({ fecha:_d(9),  zona:'Este',  maps:_q(cp[1][0],cp[1][1]), productos:[F(2)] }),
      _P({ fecha:_d(4),  zona:'Norte', maps:_q(cb[4][0],cb[4][1]), productos:[F(2)] }),
      _P({ fecha:_d(13), zona:'Norte', maps:_q(cb[1][0],cb[1][1]), productos:[F(2)] }),
      _P({ fecha:_d(7),  zona:'Centro', maps:_q(MEDIO[0],MEDIO[1]), productos:[F(2)] })
    ];
    window.BANZER='01-05-025  Almacen Distribucion Banzer', window.LOG='PRODUCTOS TERMINADOS FAB.';
    STOCK=stockVacio(); STOCK_CARGADO=true;
    STOCK.c={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, alm:LOG, t:Date.now()-3600000 };
    STOCK.g={}; STOCK.g[BANZER]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    STOCK.al={}; STOCK.al[LOG]='log'; STOCK.al[BANZER]='sale';
    window.K={ A:stockClave(A(1)), C:stockClave(C(1)), D:stockClave(D(1)), E:stockClave(E(1)), F:stockClave(F(1)) };
    var pon=function(k,p,b){ STOCK.c.u[k]=p; STOCK.g[BANZER].u[k]=b; };
    pon(K.A,10,0); pon(K.C,2,6); pon(K.D,0,0); pon(K.E,0,3); pon(K.F,3,3);
    stockOlvidarIndice(); MAPA_COORDS={}; ALM_GEO_FALLO={}; ALM_GEO_PEDIDO=false; ALM_GEO_OK=0;
    saveMirror(); updateStats();
  });

  // ══ 1. El botón y la pantalla ═══════════════════════════════════════════════════════
  console.log('\n── 1. El botón está en Stock y abre la pantalla ──');
  let r = await page.evaluate(() => {
    abrirStock();
    window._antes={ state:JSON.stringify(STATE), stock:JSON.stringify(STOCK) };
    var b=[].slice.call(document.querySelectorAll('#stock-overlay button')).filter(function(x){ return /Banzer o PTF/.test(x.textContent); })[0];
    return { boton:!!b, enBarra:!!(b && !document.getElementById('stock-body').contains(b)),
             pedi:[].slice.call(document.querySelectorAll('#stock-overlay button')).some(function(x){ return /Pedí a fábrica/.test(x.textContent); }),
             abre:!!document.querySelector('#stock-overlay [onclick*="abrirStockPedido("]') };
  });
  chk('⚠️ la barra de Stock tiene el botón «📍 Banzer o PTF»', r.boton && r.enBarra, J(r));
  chk('⚠️ (dueño 08/10: «ellos crean su Excel y correo, quítalos») no hay botón «🏭 Pedí a fábrica» ni nada que abra ese formulario', !r.pedi && !r.abre, J(r));
  // Lo que el panel lee sin internet ANTES de abrir (el servidor contesta al toque y se mide después, en §7).
  const sinServidor = await page.evaluate(() => { var T=almZonaData().T; return { n:T.n, mapa:T.mapa, zona:T.zona, sin:T.sin, pend:T.pend.map(function(x){ return x.u.replace(/^https:\/\/maps\.app\.goo\.gl\//,''); }) }; });
  await page.click('#stock-overlay button:has-text("Banzer o PTF")');
  await page.waitForTimeout(400);
  r = await page.evaluate(() => ({ ov:document.getElementById('alm-overlay').style.display, tit:document.querySelector('#alm-overlay b').textContent,
    resumen:document.getElementById('alm-resumen').textContent.replace(/\s+/g,' '), info:document.getElementById('alm-info').textContent }));
  chk('la pantalla se abre arriba de Stock', r.ov==='flex' && /Banzer o PTF/.test(r.tit), J({ov:r.ov, tit:r.tit}));
  chk('…dice de qué fechas son las entregas y a cuánto están los depósitos (≈3,9 km)', /entregas del 09\/08 al 07\/10/.test(r.info) && /a 3,[89] km en línea recta/.test(r.info), r.info);
  chk('…y avisa que el punto de Banzer es aproximado (salió de su dirección escrita)', /punto de Banzer salió de su dirección escrita/.test(r.resumen), r.resumen.slice(0,200));
  chk('sin errores de JS al abrir', errors.length===0, errors.join(' | '));

  // ══ 2. Qué entregas cuentan ═════════════════════════════════════════════════════════
  console.log('\n── 2. Qué entregas cuentan ──');
  chk('⚠️ sin el servidor: 21 entregas que miden la rotación (17 por el mapa, 1 por la zona, 3 sin ubicar)',
    sinServidor.n===21 && sinServidor.mapa===17 && sinServidor.zona===1 && sinServidor.sin===3, J(sinServidor));
  chk('…con los dos enlaces cortos para pedirle al servidor, el más nuevo primero', J(sinServidor.pend)===J(['TEST1?g_st=ic','MALO']), J(sinServidor.pend));
  r = await page.evaluate(() => {
    var A=almZonaData(), f=function(k){ return A.filas.filter(function(x){ return x.k===k; })[0]||{}; };
    var fa=f(K.A);
    return { T:{ n:A.T.n, mapa:A.T.mapa, zona:A.T.zona, sin:A.T.sin, medio:A.T.medio, fallo:A.T.fallo, pend:A.T.pend.length },
             a:{ u:fa.u, n:fa.n, ub:fa.ub, sB:fa.sB, uSin:fa.uSin } };
  });
  chk('…ya con el servidor: TEST1 entra por el mapa y MALO queda sin ubicar (18 · 1 · 2)', r.T.n===21 && r.T.mapa===18 && r.T.zona===1 && r.T.sin===2 && r.T.pend===0 && r.T.fallo===1, J(r.T));
  chk('⚠️ TITANIO ICE: 9 unidades en 5 entregas — sin la RPT, Eduardo a otro cliente, la ATC, la venta de tienda, la de hace 70 días ni la de mañana',
    r.a.u===9 && r.a.n===5, J(r.a));
  chk('…6 de sus 8 unidades ubicadas cerca de Banzer (75 %) y 1 sin ubicar', Math.abs(r.a.sB-0.75)<1e-9 && Math.abs(r.a.ub-8)<1e-9 && r.a.uSin===1, J(r.a));
  chk('una entrega justo en el medio cuenta mitad y mitad', r.T.medio===1, J(r.T));

  // ══ 3. De qué lado, y la zona escrita ═══════════════════════════════════════════════
  console.log('\n── 3. El lado, el medio y la zona escrita ──');
  r = await page.evaluate(() => {
    var P=ALM_UBIC[0], B=ALM_UBIC[1];
    var cp=almLado({lat:CERCA_P[0][0], lng:CERCA_P[0][1]}), cb=almLado({lat:CERCA_B[0][0], lng:CERCA_B[0][1]}), me=almLado({lat:MEDIO[0], lng:MEDIO[1]});
    var Z=almZonas(), A=almZonaData(), fd=A.filas.filter(function(x){ return x.k===K.D; })[0]||{}, ff=A.filas.filter(function(x){ return x.k===K.F; })[0]||{};
    return { cp:[cp.P,cp.B], cb:[cb.P,cb.B], me:[me.P,me.B,!!me.medio], norte:Z['norte']?{n:Z['norte'].n,B:Z['norte'].B,nombre:Z['norte'].nombre}:null,
             rara:!!Z['zona rara'], d:{ ub:fd.ub, sB:fd.sB, uSin:fd.uSin }, f:{ ub:ff.ub, sB:ff.sB } };
  });
  chk('cerca de PTF cuenta para PTF, cerca de Banzer para Banzer, en el medio mitad y mitad', J(r.cp)===J([1,0]) && J(r.cb)===J([0,1]) && J(r.me)===J([0.5,0.5,true]), J(r));
  chk('⚠️ la zona «Norte» se aprende de sus pedidos con mapa (todos cerca de Banzer), rotulada como se escribe más', r.norte && r.norte.n>=3 && r.norte.B===r.norte.n && r.norte.nombre==='Norte', J(r.norte));
  chk('…y el pedido con zona «norte» (en minúsculas) y sin mapa cuenta para Banzer', r.d.ub===4 && r.d.sB===1 && r.d.uSin===0, J(r.d));
  chk('una zona que nadie tiene con mapa no ubica a nadie', r.rara===false);
  chk('ORO ANATOMICO: 4 de cada lado + 2 en el medio = 50 % Banzer', Math.abs(r.f.sB-0.5)<1e-9 && Math.abs(r.f.ub-10)<1e-9, J(r.f));

  // ══ 4. Qué hacer con cada producto ══════════════════════════════════════════════════
  console.log('\n── 4. Qué hacer: pasar, lo próximo que llegue, no mandar más, se vende poco, bien ──');
  r = await page.evaluate(() => {
    var A=almZonaData(), out={};
    A.filas.forEach(function(f){
      var nom=Object.keys(K).filter(function(x){ return K[x]===f.k; })[0]; if(!nom) return;
      out[nom]={ acc:f.acc, mover:f.mover, luego:f.luego, nivel:f.nivel, objP:f.objP, objB:f.objB, hoyP:f.hoyP, hoyB:f.hoyB, por:f.por, rot:f.o.rotacion,
                 necesario:Math.ceil(stockNecesario(f.o)-1e-9) };
    });
    // La cuenta de «cuánto pedir» no cambió con `stockNecesario`: la misma fórmula de siempre, a mano.
    var igual=stockData().lista.every(function(o){
      var hay=stockHaySalir(o); if(hay==null || o.descont) return stockCuantoPedir(o)===0;
      var nec=Math.max(o.comp, o.porDia*(o.lead+o.margen+(o.cubrir==null?STOCK_CUBRIR:o.cubrir)));
      return stockCuantoPedir(o)===Math.max(0, Math.ceil(nec-(hay+stockEnCaminoSeguro(o))-1e-9));
    });
    return { out:out, igual:igual };
  });
  const o=r.out;
  chk('«tener en total» es la cuenta de Stock (`stockNecesario`) en los cinco', ['A','C','D','F'].every(k=>o[k] && o[k].nivel===o[k].necesario) && o.E && o.E.nivel===0, J(Object.keys(o).map(k=>[k,o[k]&&o[k].nivel,o[k]&&o[k].necesario])));
  chk('…y «cuánto pedir» da lo mismo que antes', r.igual===true);
  /* La venta de tienda (5) cuenta para la ROTACIÓN, como en la tabla de Stock (14 en 15 días → 0,93/día × 8 días = 7,5 →
     tener 8), pero NO para el lado: no tiene dirección de entrega. */
  chk('⚠️ TITANIO ICE (rota, 75 % Banzer, tener 8): conviene PTF 2 · Banzer 6 → «pasar 6 a Banzer» (a PTF le sobran 8)',
    o.A && o.A.rot==='media' && o.A.nivel===8 && o.A.objP===2 && o.A.objB===6 && o.A.acc==='pasar' && o.A.mover===6 && o.A.luego===0, J(o.A));
  chk('⚠️ ORO BI RELAX (12 % Banzer, tener 5): Banzer tiene 6 y le tocan 1 → «no mandar más» (5 de más), nunca traer a PTF',
    o.C && o.C.objB===1 && o.C.objP===4 && o.C.acc==='noMas' && o.C.mover===5, J(o.C));
  chk('⚠️ TITANIO LATEX (todo Banzer, tener 3, sin nada en ningún lado): «lo próximo que llegue: 3 a Banzer»',
    o.D && o.D.objB===3 && o.D.objP===0 && o.D.acc==='llega' && o.D.luego===3 && o.D.mover===0, J(o.D));
  chk('ORO ORTOPEDICO (2 entregas: no rota): no se reparte, todo en PTF, y Banzer que tiene 3 → «no mandar más»',
    o.E && o.E.rot==='baja' && o.E.por==='poca' && o.E.objB===0 && o.E.acc==='noMas' && o.E.mover===3, J(o.E));
  chk('ORO ANATOMICO (50 %, tener 6): PTF 3 · Banzer 3 y hay 3 y 3 → «bien repartido»', o.F && o.F.objP===3 && o.F.objB===3 && o.F.acc==='bien', J(o.F));

  // ══ 5. La tabla ═════════════════════════════════════════════════════════════════════
  console.log('\n── 5. La tabla: filtros, búsqueda y tocar un producto ──');
  const tabla = () => page.evaluate(() => ({
    filas:[].slice.call(document.querySelectorAll('#alm-tabla tr[data-alm-k]')).map(function(tr){ return tr.querySelector('td').textContent.replace(/\s+/g,' ').trim(); }),
    chips:[].slice.call(document.querySelectorAll('#alm-tabla button')).map(function(b){ return b.textContent.trim(); }),
    texto:document.getElementById('alm-tabla').textContent.replace(/\s+/g,' ') }));
  r = await tabla();
  chk('arranca en «Para hacer»: los 4 que hay que mover, primero los que se pasan', r.filas.length===4 && /TITANIO ICE/.test(r.filas[0]) && /TITANIO LATEX/.test(r.filas[1]), J(r.filas));
  chk('…con los cuatro filtros y sus cuentas', J(r.chips)===J(['Para hacer (4)','🏪 Tener en Banzer (4)','Con entregas (5)','Todos (5)']), J(r.chips));
  chk('…y dice qué hacer con palabras', /Pasar 6 a Banzer/.test(r.texto) && /Lo próximo que llegue: 3 a Banzer/.test(r.texto) && /No mandar más a Banzer/.test(r.texto) && /se vende poco y tiene 3/.test(r.texto), r.texto.slice(0,300));
  chk('…con el total de lo que hay que mover arriba de la tabla',
    /pasar a Banzer 6 unidades de 1 producto · 🏭 de lo próximo que llegue, mandar a Banzer 3 de 1 producto · ✋ no mandar más a Banzer: 2 productos/.test(r.texto), r.texto.slice(0,500));
  chk('…sin proponer nunca traer de Banzer a PTF', !/(traer|pasar|llevar)[^.]{0,30}de Banzer/i.test(r.texto) && !/a PTF\b[^.]{0,10}(desde|de) Banzer/i.test(r.texto), r.texto.match(/[^.]{0,40}de Banzer[^.]{0,20}/i)||'');
  await page.click('#alm-tabla button:has-text("Tener en Banzer")');
  r = await tabla();
  chk('⚠️ «🏪 Tener en Banzer» muestra lo que conviene tener allá (no el ORO ORTOPEDICO, que rota poco)',
    r.filas.length===4 && !r.filas.some(f=>/ORTOPEDICO/.test(f)) && r.filas.some(f=>/TITANIO ICE/.test(f)) && r.filas.some(f=>/ANATOMICO/.test(f)), J(r.filas));
  await page.click('#alm-tabla button:has-text("Con entregas")');
  r = await tabla();
  chk('«Con entregas» muestra también el bien repartido', r.filas.length===5 && r.filas.some(f=>/ANATOMICO/.test(f)) && /Bien repartido/.test(r.texto), J(r.filas));
  await page.fill('#alm-q', 'oro');
  await page.waitForTimeout(350);
  r = await tabla();
  chk('⚠️ la búsqueda de arriba filtra (sin perder el foco): «oro» deja los tres ORO', r.filas.length===3 && r.filas.every(f=>/ORO/.test(f)) && await page.evaluate(() => document.activeElement===document.getElementById('alm-q')), J(r.filas));
  await page.fill('#alm-q', '');
  await page.waitForTimeout(350);
  await page.click('#alm-tabla tr[data-alm-k] >> text=TITANIO ICE');
  await page.waitForTimeout(250);
  r = await page.evaluate(() => ({ k:ALM_K, sel:!!document.querySelector('#alm-tabla tr[data-alm-k][style*="eef2ff"]'), tit:document.getElementById('alm-mapa-tit').textContent.replace(/\s+/g,' ') }));
  chk('tocar un producto lo muestra solo en el mapa (fila marcada y título del mapa)', r.k && /TITANIO ICE/.test(r.tit) && r.sel, J(r));

  // ══ 6. El mapa ══════════════════════════════════════════════════════════════════════
  console.log('\n── 6. El mapa ──');
  r = await page.evaluate(() => {
    var M=window._mapa, tips=M.marcas.filter(function(m){ return m.tip; }), puntos=M.marcas.filter(function(m){ return !m.tip && m.o.interactive!==false; });
    var manchas=M.marcas.filter(function(m){ return m.o.interactive===false; }).length+M.circulos.length;
    var col=function(c){ return puntos.filter(function(m){ return m.o.fillColor===c; }).length; };
    return { tips:tips.map(function(m){ return m.tip; }), banzerPop:(tips.filter(function(m){ return /Banzer/.test(m.tip); })[0]||{}).pop||'',
             puntos:puntos.length, P:col(ALM_COLOR.P), B:col(ALM_COLOR.B), M:col(ALM_COLOR.M), manchas:manchas, lineas:M.lineas.length,
             tit:document.getElementById('alm-mapa-tit').textContent.replace(/\s+/g,' ') };
  });
  chk('⚠️ los dos depósitos con su nombre: «🏭 PTF» y «🏪 Banzer»', J(r.tips)===J(['🏭 PTF','🏪 Banzer']), J(r.tips));
  chk('…el de Banzer dice que está ubicado por su dirección y abre Maps', /dirección escrita/.test(r.banzerPop) && /maps\.app\.goo\.gl\/YSbmsC6GRi2d4HRu6/.test(r.banzerPop), r.banzerPop.slice(0,160));
  chk('con TITANIO ICE elegido: sus 4 entregas con mapa, 3 azules (Banzer) y 1 verde (PTF), con su mancha cada una', r.puntos===4 && r.B===3 && r.P===1 && r.M===0 && r.manchas===4, J(r));
  chk('…y la línea punteada del medio', r.lineas===1);
  await page.evaluate(() => almVerProducto(''));
  await page.waitForTimeout(200);
  r = await page.evaluate(() => { var p=window._mapa.marcas.filter(function(m){ return !m.tip && m.o.interactive!==false; }); return { n:p.length, M:p.filter(function(m){ return m.o.fillColor===ALM_COLOR.M; }).length,
    tit:document.getElementById('alm-mapa-tit').textContent.replace(/\s+/g,' ') }; });
  chk('sin producto elegido: las 18 entregas con mapa, una violeta (sobre la línea)', r.n===18 && r.M===1 && /del lado de PTF 7/.test(r.tit) && /del lado de Banzer 10/.test(r.tit) && /sobre la línea 1/.test(r.tit), J(r));

  // ══ 7. Los enlaces cortos ═══════════════════════════════════════════════════════════
  console.log('\n── 7. Los enlaces cortos los abre el servidor ──');
  r = await page.evaluate(() => ({ geo:window._geo, coords:MAPA_COORDS['https://maps.app.goo.gl/TEST1?g_st=ic']||null, fallo:Object.keys(ALM_GEO_FALLO),
    guardado:(function(){ try{ return !!JSON.parse(localStorage.getItem(LS_GEO)||'{}')['https://maps.app.goo.gl/TEST1?g_st=ic']; }catch(e){ return false; } })(),
    texto:(document.getElementById('alm-geo')||{}).textContent||'' }));
  chk('⚠️ al abrir se le piden al servidor los 2 enlaces que el panel no lee, el más nuevo primero, UNA vez', r.geo.length===1 && J(r.geo[0])===J(['https://maps.app.goo.gl/TEST1?g_st=ic','https://maps.app.goo.gl/MALO']), J(r.geo));
  chk('…lo que abrió queda en el teléfono (para el mapa de entregas también)', r.coords && r.coords.lat===-17.706 && r.guardado, J(r.coords));
  chk('…y lo que no pudo abrir se dice y no se vuelve a pedir', J(r.fallo)===J(['https://maps.app.goo.gl/MALO']) && /no pudo abrir 1 enlace/.test(r.texto) && /ubicó 1 enlace más/.test(r.texto), r.texto);
  await page.evaluate(() => { cerrarAlm(); abrirAlm(); });
  await page.waitForTimeout(250);
  chk('cerrar y volver a abrir no le vuelve a preguntar al servidor', await page.evaluate(() => window._geo.length===1));

  // ══ 8. El texto para logística ══════════════════════════════════════════════════════
  console.log('\n── 8. «📋 Copiar para logística» ──');
  r = await page.evaluate(() => { var t=''; var v=copyText; copyText=function(x){ t=x; }; try{ almCopiar(); } finally { copyText=v; } return t; });
  chk('⚠️ dice qué pasar a Banzer, qué mandar de lo próximo que llegue y qué no mandar más',
    /PASAR DE PTF A BANZER\n• TITANIO ICE · 160x190: 6/.test(r) && /LO PRÓXIMO QUE LLEGUE[^\n]*\n• TITANIO LATEX · 140x190: 3/.test(r) &&
    /NO MANDAR MÁS A BANZER[^\n]*\n(• [^\n]+\n?)*• ORO BI RELAX · 140x190 \(tiene 6, conviene 1\)/.test(r) && /ORO ORTOPEDICO · 140x190 \(tiene 3\)/.test(r), r);
  chk('⚠️ arranca con qué TENER en Banzer, de mayor a menor, y cuánto hay hoy (lo demás, en PTF)',
    /TENER EN BANZER \(lo demás, en PTF\)\n• TITANIO ICE · 160x190: 6 \(hoy 0\)\n• ORO ANATOMICO VISCOLASTICO · 140x190: 3 \(hoy 3\)\n• TITANIO LATEX · 140x190: 3 \(hoy 0\)\n• ORO BI RELAX · 140x190: 1 \(hoy 6\)\n/.test(r), r);
  const mover = r.split('🚚')[1]||'';
  chk('…y en lo que hay que mover no está el bien repartido, ni nada para traer de Banzer', !/ANATOMICO/.test(mover) && !/(TRAER|DE BANZER A)/.test(r), mover);

  // ══ 9. Solo mira ════════════════════════════════════════════════════════════════════
  console.log('\n── 9. Solo mira: no guarda ni cambia nada ──');
  r = await page.evaluate(() => ({ state:JSON.stringify(STATE)===_antes.state, stock:JSON.stringify(STOCK)===_antes.stock, saves:window._saves.length }));
  chk('⚠️ los pedidos y el stock quedan EXACTAMENTE igual, y no se guardó nada', r.state && r.stock && r.saves===0, J(r));

  // ══ 10. Sin Leaflet y en el celular ═════════════════════════════════════════════════
  console.log('\n── 10. Sin el mapa cargado y en el celular ──');
  r = await page.evaluate(() => {
    var L0=window.L, E0=ensureLeaflet, pedido=0;
    window.L=undefined; ensureLeaflet=function(){ pedido++; };
    var err='';
    try{ ALM_MAPA=null; almPintarMapa(true); }catch(e){ err=e.message; }
    window.L=L0; ensureLeaflet=E0;
    return { pedido:pedido, err:err, tabla:document.querySelectorAll('#alm-tabla tr[data-alm-k]').length };
  });
  chk('sin internet para el mapa: lo pide y la tabla sigue andando', r.pedido===1 && !r.err && r.tabla>0, J(r));
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(() => { ALM_MAPA=null; almRefrescar(); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => {
    var ov=document.getElementById('alm-overlay'), body=document.getElementById('alm-body'), w=document.querySelector('#alm-tabla .prod-wrap');
    var q=document.getElementById('alm-q').getBoundingClientRect();
    return { pagina:document.documentElement.scrollWidth, ov:ov.scrollWidth, body:body.clientWidth, cuerpo:body.scrollWidth, wrap:w?w.clientWidth:0, q:Math.round(q.right) };
  });
  chk('⚠️ en el celular (390 px) nada se sale de la pantalla: la tabla scrollea adentro de su caja', r.pagina<=390 && r.ov<=390 && r.cuerpo<=r.body+1 && r.wrap>0 && r.wrap<=390 && r.q<=390, J(r));
  chk('sin errores de JS en toda la prueba', errors.length===0, errors.join(' | '));

  // ══ 11. La línea de logística (08/10; antes la del dueño, 07/10) ═══════════════════════
  console.log('\n── 11. La línea de logística: izquierda Banzer, derecha PTF ──');
  r = await page.evaluate(() => {
    var lado=function(lat,lng){ var l=almLado({lat:lat,lng:lng}); return l.medio?'medio':(l.B>0.5?'B':'P'); };
    var km=function(lat,lng){ return Math.round(almKm({lat:lat,lng:lng},ALM_UBIC[0])*10)/10+'/'+Math.round(almKm({lat:lat,lng:lng},ALM_UBIC[1])*10)/10; };
    var out={ hay:almHayLinea(), puntos:ALM_DIVISION.length,
      so:lado(-17.82,-63.23), soKm:km(-17.82,-63.23),          // sudoeste: más cerca de PTF, pero a la izquierda de la línea
      ne:lado(-17.70,-63.09), neKm:km(-17.70,-63.09),          // noreste: a la derecha de la línea
      oe:lado(-17.75,-63.16), oeKm:km(-17.75,-63.16),          // 1,8 km al oeste de PTF: más cerca de PTF, pero a la izquierda
      sobre:lado(-17.76136,-63.14496), a400:lado(-17.76136,-63.14496+0.4/106), a700:lado(-17.76136,-63.14496+0.7/106),
      // el quiebre de El Trompillo: la línea dobla al oeste casi horizontal
      bajoQuiebre:lado(-17.805,-63.150), sobreQuiebre:lado(-17.782,-63.162), quiebreLejos:lado(-17.84,-63.17),
      ptfLado:almLadoDeLinea({lat:ALM_UBIC[0].lat,lng:ALM_UBIC[0].lng}), bzLado:almLadoDeLinea({lat:ALM_UBIC[1].lat,lng:ALM_UBIC[1].lng}),
      norte:lado(-17.60,-63.20), sur:lado(-18.00,-63.20) };
    var L0=ALM_DIVISION; ALM_DIVISION=[];
    out.sinLinea={ so:lado(-17.82,-63.23), oe:lado(-17.75,-63.16) };
    ALM_DIVISION=L0;
    var lm=almLineaDivision(); out.dibujo={ n:lm.length, norte:lm[0][0]>ALM_DIVISION[0][0], sur:lm[lm.length-1][0]<ALM_DIVISION[ALM_DIVISION.length-1][0] };
    almRefrescar();
    out.resumen=document.getElementById('alm-resumen').textContent.replace(/\s+/g,' ');
    out.tit=document.getElementById('alm-mapa-tit').textContent.replace(/\s+/g,' ');
    out.lineaMapa=(window._mapa.lineas[0]||{ll:[]}).ll.length;
    return out;
  });
  chk('⚠️ hay línea de logística (41 puntos, de norte a sur)', r.hay && r.puntos===41, J({hay:r.hay, puntos:r.puntos}));
  chk('⚠️ una entrega al sudoeste, más cerca de PTF pero a la IZQUIERDA de la línea, va a Banzer', r.so==='B', J({so:r.so, km_ptf_banzer:r.soKm}));
  chk('una entrega al noreste, a la DERECHA de la línea, va a PTF', r.ne==='P', J({ne:r.ne, km_ptf_banzer:r.neKm}));
  chk('⚠️ una entrega 1,8 km al oeste de PTF (más cerca de PTF) cae a la IZQUIERDA de la línea de logística: va a Banzer', r.oe==='B', J({oe:r.oe, km_ptf_banzer:r.oeKm}));
  chk('sobre la línea y a 400 m: mitad y mitad; a 700 m ya es de su lado', r.sobre==='medio' && r.a400==='medio' && r.a700==='P', J({sobre:r.sobre, a400:r.a400, a700:r.a700}));
  chk('⚠️ el quiebre de El Trompillo: al sur del tramo horizontal es PTF, al norte (y al oeste de la avenida) es Banzer, y más al sur sigue PTF', r.bajoQuiebre==='P' && r.sobreQuiebre==='B' && r.quiebreLejos==='P', J({bajo:r.bajoQuiebre, sobre:r.sobreQuiebre, lejos:r.quiebreLejos}));
  chk('cada depósito queda de su lado (PTF a la derecha, Banzer a la izquierda)', r.ptfLado>0 && r.bzLado<0, J({ptf:r.ptfLado, banzer:r.bzLado}));
  chk('más allá de las puntas la línea sigue derecha (norte lejano a la izquierda: Banzer; sur lejano a la derecha: PTF)', r.norte==='B' && r.sur==='P', J({norte:r.norte, sur:r.sur}));
  chk('sin línea vuelve la regla de antes (el más cerca): esas dos entregas vuelven a PTF', r.sinLinea.so==='P' && r.sinLinea.oe==='P', J(r.sinLinea));
  chk('el mapa dibuja la línea del dueño estirada en las dos puntas', r.dibujo.n===43 && r.dibujo.norte && r.dibujo.sur && r.lineaMapa===43, J({dibujo:r.dibujo, lineaMapa:r.lineaMapa}));
  chk('el resumen y el mapa lo dicen con palabras', /según de qué lado de la línea cae: a la izquierda \(oeste\), Banzer; a la derecha \(este\), PTF\. A menos de 500 m/.test(r.resumen) && /La línea punteada es la división: a la izquierda, Banzer; a la derecha, PTF/.test(r.tit), r.resumen.slice(0,400));

  // ══ 12. El plan de 7, 15 y 30 días (07/10 a la noche) ═══════════════════════════════
  /* El dueño: «una pestaña desplegable que muestre qué tener en Banzer y qué tener en PTF para los próximos 7-15-30 días»,
     «sin cálculos de qué pedir a producción… mover más que todo a Banzer pero sin descuidar las entregas de PTF» y «por ahí
     logística se lleva 30 colchones a Banzer y deja a PTF con 3 de ese modelo y necesita 13». Con la pantalla publicada:
     «traer lo que ya está vendido y debería estar en cada almacén MÁS lo que debería tener para los próximos días… y lo mismo
     Banzer», «¿qué pasa cuando el saldo es 0 en ambos almacenes?», «no "pedir"… TRAER DE MORENO» y «si el Excel de Moreno
     muestra menos, una alerta de "recordá revisar la producción"». Las cuentas, a mano (tener = ya vendido + para tener):
       TITANIO ICE: 0,93/día (14 en 15 d), 75 % Banzer, 2 ya vendidos para mañana del lado de Banzer; PTF 10, Banzer 0.
         7 d → Banzer 2 + round(6,53×0,75=4,9)=5 → 7 · PTF round(1,63)=2 · llevar 7 (PTF queda con 3, no baja de su 2).
         15 d → Banzer 2+11=13 · PTF 4 · llevar SOLO 6 (PTF queda con 4) · traer 7 de Moreno a Banzer (para tener).
         30 d → Banzer 2+21=23 · PTF 7 · llevar 3 · traer 20 a Banzer.
       ORO BI RELAX: 0,53/día, 12,5 % Banzer; PTF 2, Banzer 6. 15 d → Banzer 1 · PTF 7: a PTF le faltan 5 y a Banzer le sobran
         5 → «5 de las entregas de PTF pueden salir de Banzer»; NUNCA llevar de Banzer a PTF.
       TITANIO LATEX: 0,27/día, todo Banzer; nada en ningún lado. 7/15/30 d → Banzer 2/4/8 → «Traer N de Moreno a Banzer».
       ORO ORTOPEDICO: no rota y nada vendido sin entregar → no entra al plan.
       ORO ANATOMICO: 0,67/día, 50 %; 3 y 3. 7 d → 2 y 2 (nada que hacer). 15 d → 5 y 5: traer 2 a PTF y 2 a Banzer.
       ESPECIAL SEMIORTOPEDICO (el caso del dueño, §12d): 0,4/día, 50 %; 6 ya vendidos del lado de PTF y 1 del de Banzer; 0 y 0.
         7 d → PTF 6+1=7 · Banzer 1+1=2 → «Traer 7 de Moreno a PTF (6 ya vendidos + 1 para tener)» y «Traer 2 a Banzer». */
  console.log('\n── 12. El plan de 7, 15 y 30 días: qué tener, qué llevar, qué traer y la alerta ──');
  const hayPlan = await page.evaluate(() => typeof almPintarPlan==='function' && typeof almPlanDe==='function' && typeof almCopiarPlan==='function');
  chk('⚠️ el panel tiene el plan desplegable de 7, 15 y 30 días', hayPlan);
  const hayAlerta = hayPlan && await page.evaluate(() => typeof almPlanAlertaDe==='function' && typeof almPlanAlertaTxt==='function');
  chk('⚠️ …con la alerta «Recordá revisar la producción» (el dueño, 07/10)', hayAlerta);
  if(hayPlan && hayAlerta){
  await page.setViewportSize({ width:1400, height:950 });
  const leerPlan = () => page.evaluate(() => {
    var A=ALM_DATA, out={}, nom=function(k){ return Object.keys(K).filter(function(x){ return K[x]===k; })[0]; };
    A.filas.forEach(function(f){ var n=nom(f.k); if(!n) return; out[n]={};
      [7,15,30].forEach(function(H){ var p=f.plan[H]; out[n][H]={ tB:p.tB, tP:p.tP, pasar:p.pasar, cubreB:p.cubreB, firmeB:p.firmeB, firmeP:p.firmeP, xB:p.xB, xP:p.xP, hP:p.hP, hB:p.hB,
        deM:p.deM.map(function(m){ return m.de+'→'+m.a+' '+m.u+(m.uF?(' ('+m.uF+' vend.)'):''); }), al:p.alerta?{ tr:p.alerta.tr, ex:p.alerta.ex, faltan:p.alerta.faltan, de:p.alerta.de }:null,
        mov:almPlanMovTxt(p,false).join(' | '), alTxt:almPlanAlertaTxt(p,false) }; }); });
    return out;
  });
  r = await page.evaluate(() => {
    almRefrescar();
    var igual=stockData().lista.every(function(o){ var s=0; (o.compIds||[]).forEach(function(e){ s+=e.c; }); return Math.abs(s-o.comp)<1e-9; });
    var det=document.getElementById('alm-plan');
    return { igual:igual, det:!!det, abierto:det?det.open:null, titulo:det?det.querySelector('summary').textContent:'', antesDelMapa:!!(det && det.nextElementSibling && det.nextElementSibling.id==='alm-mapa-caja') };
  });
  chk('⚠️ hay un desplegable «🗓️ Qué tener en Banzer y en PTF para 7, 15 y 30 días, y qué llevar», cerrado, arriba del mapa',
    r.det && r.abierto===false && /Qué tener en Banzer y en PTF para 7, 15 y 30 días/.test(r.titulo) && r.antesDelMapa, J({det:r.det, abierto:r.abierto, titulo:r.titulo, antes:r.antesDelMapa}));
  chk('`compIds` (pedido por pedido) suma lo mismo que `comp` en todos los productos', r.igual===true);
  let pl = await leerPlan();
  chk('⚠️ TITANIO ICE 7 días: Banzer 7 = 2 ya vendidos para mañana + 5 para tener · PTF 2 · llevar 7 de PTF (queda con 3)',
    pl.A && pl.A[7].tB===7 && pl.A[7].firmeB===2 && pl.A[7].xB===5 && pl.A[7].tP===2 && pl.A[7].pasar===7 && pl.A[7].deM.length===0 && /Llevar 7 de PTF a Banzer · PTF queda con 3/.test(pl.A[7].mov), J(pl.A&&pl.A[7]));
  chk('⚠️ TITANIO ICE 15 días: Banzer 13 · PTF 4 · llevar SOLO 6 (PTF queda con 4) y traer 7 de Moreno a Banzer (para tener)',
    pl.A && pl.A[15].tB===13 && pl.A[15].tP===4 && pl.A[15].pasar===6 && J(pl.A[15].deM)===J(['Moreno→Banzer 7']) && /Traer 7 de Moreno a Banzer \(para tener\)/.test(pl.A[15].mov), J(pl.A&&pl.A[15]));
  chk('…y 30 días: Banzer 23 · PTF 7 · llevar 3 · traer 20 a Banzer', pl.A && pl.A[30].tB===23 && pl.A[30].tP===7 && pl.A[30].pasar===3 && J(pl.A[30].deM)===J(['Moreno→Banzer 20']), J(pl.A&&pl.A[30]));
  chk('ORO BI RELAX 15 días: Banzer 1 · PTF 7 · a Banzer le sobran 5 y cubren entregas de PTF (no se trae ni se lleva nada a PTF)',
    pl.C && pl.C[15].tB===1 && pl.C[15].tP===7 && pl.C[15].pasar===0 && pl.C[15].cubreB===5 && pl.C[15].deM.length===0, J(pl.C&&pl.C[15]));
  chk('⚠️ TITANIO LATEX (0 en los dos) 7/15/30 días: Banzer 2 · 4 · 8 → «Traer 2/4/8 de Moreno a Banzer (para tener)», sin «pedir»',
    pl.D && pl.D[7].tB===2 && pl.D[15].tB===4 && pl.D[30].tB===8 && pl.D[7].tP===0 && J(pl.D[7].deM)===J(['Moreno→Banzer 2']) && J(pl.D[30].deM)===J(['Moreno→Banzer 8']) &&
    /Traer 2 de Moreno a Banzer \(para tener\)/.test(pl.D[7].mov) && !/pedir/i.test(pl.D[7].mov), J(pl.D));
  chk('ORO ANATOMICO 7 días: 2 y 2 con 3 y 3 → nada que hacer; 15 días: 5 y 5 → traer 2 a PTF (primero) y 2 a Banzer',
    pl.F && pl.F[7].tB===2 && pl.F[7].tP===2 && pl.F[7].pasar===0 && pl.F[7].deM.length===0 && pl.F[15].tB===5 && pl.F[15].tP===5 && J(pl.F[15].deM)===J(['Moreno→PTF 2','Moreno→Banzer 2']), J(pl.F&&[pl.F[7],pl.F[15]]));
  chk('ORO ORTOPEDICO (no rota, nada vendido) no tiene nada que tener', pl.E && pl.E[30].tB===0 && pl.E[30].tP===0, J(pl.E&&pl.E[30]));
  chk('⚠️ tener = ya vendido + para tener (suma, no el mayor), 7 ≤ 15 ≤ 30, y PTF NUNCA queda debajo de lo suyo por llevar a Banzer',
    Object.keys(pl).every(k=>[7,15,30].every(H=>pl[k][H].tB===pl[k][H].firmeB+pl[k][H].xB && pl[k][H].tP===pl[k][H].firmeP+pl[k][H].xP && (!pl[k][H].pasar || pl[k][H].hP-pl[k][H].pasar>=pl[k][H].tP)) &&
      pl[k][7].tB<=pl[k][15].tB && pl[k][15].tB<=pl[k][30].tB && pl[k][7].tP<=pl[k][15].tP && pl[k][15].tP<=pl[k][30].tP), J(pl));
  chk('⚠️ sin el Excel de Moreno no hay con qué comparar: ninguna alerta', Object.keys(pl).every(k=>[7,15,30].every(H=>!pl[k][H].al)), J(Object.keys(pl).map(k=>[k,pl[k][30].al])));

  // La pantalla: abrir, plazos, «Qué hacer» / «Todo el plan»
  const leerVista = () => page.evaluate(() => { var el=document.getElementById('alm-plan-in');
    return { chips:[].slice.call(el.querySelectorAll('button')).map(function(b){ return b.textContent.replace(/\s+/g,' ').trim(); }),
             filas:[].slice.call(el.querySelectorAll('tbody tr')).map(function(tr){ return tr.innerText.replace(/\s+/g,' ').trim(); }),
             alerta:(document.getElementById('alm-plan-alerta')||{}).textContent||'',
             texto:el.textContent.replace(/\s+/g,' ') }; });
  r = await page.evaluate(async () => { document.getElementById('alm-plan').open=true; await new Promise(function(x){ setTimeout(x,50); }); return 1; });
  const v7 = await leerVista();
  chk('⚠️ arranca en 7 días y «Qué hacer», con los tres plazos (y hasta qué fecha) y el botón de copiar',
    /^7 días · hasta el 14\/10$/.test(v7.chips[0]) && /^15 días · hasta el 22\/10$/.test(v7.chips[1]) && /^30 días · hasta el 06\/11$/.test(v7.chips[2]) &&
    v7.chips.some(c=>/Copiar el plan de 7 días/.test(c)) && v7.chips.some(c=>/^Qué hacer \(3\)$/.test(c)) && v7.chips.some(c=>/^Todo el plan \(4\)$/.test(c)), J(v7.chips));
  chk('…sin el botón ni el cartel de «Revisar la producción» cuando no hay nada que revisar', !v7.chips.some(c=>/Revisar la producción/.test(c)) && !v7.alerta, J(v7.chips));
  chk('«Qué hacer» de 7 días: TITANIO ICE (llevar 7, PTF queda con 3), TITANIO LATEX (traer 2 de Moreno a Banzer) y ⚠️ (F2) el BI RELAX: cargar 1 en Banzer',
    v7.filas.length===3 && /TITANIO ICE/.test(v7.filas[0]) && /Llevar 7 de PTF a Banzer · PTF queda con 3/.test(v7.filas[0]) &&
    /TITANIO LATEX/.test(v7.filas[1]) && /Traer 2 de Moreno a Banzer \(para tener\)/.test(v7.filas[1]) &&
    /BI RELAX/.test(v7.filas[2]) && /Cargar en Banzer 1 de las entregas de la zona de PTF/.test(v7.filas[2]), J(v7.filas));
  chk('…cada depósito dice cuánto tener y de qué es: «tener 7 · 2 ya vendidos + 5 para tener · hay 0»',
    /tener 7 2 ya vendidos \+ 5 para tener hay 0/.test(v7.filas[0]) && /tener 2 2 para tener hay 10/.test(v7.filas[0]), v7.filas[0]);
  chk('…con el total arriba: Banzer tener / hay, PTF tener / hay, lo que hay que llevar y lo que hay que traer de Moreno',
    /Para las entregas de los próximos 7 días: 🏪 Banzer tener 11 \(hay 9\) · 🏭 PTF tener 7 \(hay 15\) · 🚚 llevar 7 de PTF a Banzer · ↪️ 1 entrega de PTF sale de Banzer · 📥 traer 2 de Moreno/.test(v7.texto), v7.texto.slice(0,400));
  await page.evaluate(() => almPlanSetVer('todo'));
  const todo7 = await leerVista();
  chk('«Todo el plan» de 7 días: los 4 que hay que tener; el ORO ANATOMICO «cada depósito tiene lo suyo»',
    todo7.filas.length===4 && todo7.filas.some(f=>/ANATOMICO/.test(f) && /Cada depósito tiene lo suyo/.test(f)) && todo7.filas.some(f=>/BI RELAX/.test(f)), J(todo7.filas));
  await page.evaluate(() => almPlanSetH(15));
  const todo15 = await leerVista();
  chk('15 días: el BI RELAX dice que sus entregas de PTF pueden salir de Banzer, y nadie dice «llevar de Banzer a PTF»',
    todo15.filas.some(f=>/BI RELAX/.test(f) && /Cargar en Banzer 5 de las entregas de la zona de PTF/.test(f)) && !/de Banzer a PTF/i.test(todo15.texto), J(todo15.filas.filter(f=>/BI RELAX/.test(f))));
  chk('⚠️ nunca «pedir», «producir», «fabricar» ni «no alcanza» en la lista: lo que falta se TRAE de Moreno',
    !/pedir|producir|fabricar|no alcanza|ningún almacén/i.test(todo15.filas.join(' ')) && /Traer 7 de Moreno a Banzer/.test(todo15.texto), J(todo15.filas));
  r = await page.evaluate(() => { almRefrescar(); return document.getElementById('alm-plan').open; });
  const despues = await leerVista();
  chk('volver a pintar la pantalla (llega una lectura) no cierra el desplegable ni cambia el plazo', r===true && /^15 días/.test((despues.chips.filter(c=>/días · hasta/.test(c))[1]||'')) && despues.filas.length===todo15.filas.length, J({abierto:r, filas:despues.filas.length}));

  // ⚠️ El Excel de Moreno con menos de lo que hay que traer: la alerta (el dueño, 07/10)
  r = await page.evaluate(() => {
    window.IM='01-05-103 IM - PRODUCTOTERMINADO';
    STOCK.g[IM]={ f:todayStr(), hora:'09:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} }; STOCK.al[IM]='trae';
    STOCK.g[IM].u[K.D]=5; STOCK.g[IM].u[K.F]=3;
    stockOlvidarIndice(); almRefrescar();
    return 1;
  });
  pl = await leerPlan();
  chk('⚠️ TITANIO LATEX con 5 en Moreno: traer 2 (7 días) y 4 (15) entran en su Excel, sin alerta; a 30 días traer 8 → alerta, faltan 3',
    !pl.D[7].al && !pl.D[15].al && pl.D[30].al && pl.D[30].al.tr===8 && pl.D[30].al.ex===5 && pl.D[30].al.faltan===3, J([pl.D[7].al,pl.D[15].al,pl.D[30].al]));
  chk('⚠️ ORO ANATOMICO 15 días: traer 2 a PTF y 2 a Banzer (lo que falta entero, aunque Moreno tenga 3) → alerta, faltan 1',
    J(pl.F[15].deM)===J(['Moreno→PTF 2','Moreno→Banzer 2']) && pl.F[15].al && pl.F[15].al.tr===4 && pl.F[15].al.ex===3 && pl.F[15].al.faltan===1, J(pl.F[15]));
  chk('⚠️ …con la alerta escrita: «Recordá revisar la producción: para los próximos 15 días hay que traer 4 de Moreno y tenerlos, y el Excel de Moreno de hoy tiene 3. Falta 1.»',
    pl.F[15].alTxt==='⚠️ Recordá revisar la producción: para los próximos 15 días hay que traer 4 de Moreno y tenerlos, y el Excel de Moreno de hoy tiene 3. Falta 1.', pl.F[15].alTxt);
  r = await page.evaluate(() => {
    var d=ALM_DATA.filas.filter(function(x){ return x.k===K.D; })[0].plan[7], uno={ H:7, excel:[], alerta:{ tr:1, ex:0, faltan:1, de:'Moreno', f:todayStr(), deHoy:true, alms:[IM] } };
    return { d:almPlanAlertaTxt(d,false), uno:almPlanAlertaTxt(uno,false) };
  });
  chk('en singular: «traer 1 de Moreno y tenerlo… Falta 1.»', /hay que traer 1 de Moreno y tenerlo, y el Excel de Moreno de hoy no tiene ninguno\. Falta 1\.$/.test(r.uno) && r.d==='', J(r));
  chk('TITANIO ICE 15 días, que Moreno no tiene: «…y el Excel de Moreno de hoy no tiene ninguno. Faltan 7.»',
    pl.A[15].al && pl.A[15].al.faltan===7 && /hay que traer 7 de Moreno y tenerlos, y el Excel de Moreno de hoy no tiene ninguno\. Faltan 7\.$/.test(pl.A[15].alTxt), pl.A[15].alTxt);
  r = await page.evaluate(async () => {
    ALM_PLAN_VER='hacer'; almPlanSetH(15);
    var leer=function(){ var el=document.getElementById('alm-plan-in');
      return { chips:[].slice.call(el.querySelectorAll('button')).map(function(b){ return b.textContent.replace(/\s+/g,' ').trim(); }),
               filas:[].slice.call(el.querySelectorAll('tbody tr')).map(function(tr){ return tr.innerText.replace(/\s+/g,' ').trim(); }),
               cajas:el.querySelectorAll('tbody .alm-plan-al').length, alerta:((document.getElementById('alm-plan-alerta')||{}).textContent||'').replace(/\s+/g,' ') }; };
    var o={ hacer:leer() };
    var b=[].slice.call(document.querySelectorAll('#alm-plan-alerta button')).filter(function(x){ return /Ver cuáles/.test(x.textContent); })[0];
    if(b) b.click();
    o.prod=leer(); o.ver=ALM_PLAN_VER;
    var t=''; var v=copyText; copyText=function(x){ t=x; }; try{ almCopiarPlan(); } finally { copyText=v; }
    o.copia=t;
    STOCK.g[IM].f=stockSumarDias(todayStr(),-1); stockOlvidarIndice(); almRefrescar();
    o.ayer=ALM_DATA.filas.filter(function(x){ return x.k===K.F; })[0].plan[15];
    o.ayerTxt=almPlanAlertaTxt(o.ayer,false);
    o.ayerCaja=((document.getElementById('alm-plan-alerta')||{}).textContent||'').replace(/\s+/g,' ');
    STOCK.g[IM].f=todayStr(); stockOlvidarIndice(); almRefrescar();
    return o;
  });
  chk('⚠️ arriba del plan, el cartel: «Recordá revisar la producción: en 2 productos, el Excel de Moreno de hoy tiene menos de lo que hay que traer y tener para los próximos 15 días. Faltan 8 en total.»',
    /⚠️ Recordá revisar la producción: en 2 productos, el Excel de Moreno de hoy tiene menos de lo que hay que traer y tener para los próximos 15 días\. Faltan 8 en total\. Ver cuáles/.test(r.hacer.alerta), r.hacer.alerta);
  chk('…con su botón «⚠️ Revisar la producción (2)» y la alerta en cada fila que la tiene (2 cajas)',
    r.hacer.chips.some(c=>/^⚠️ Revisar la producción \(2\)$/.test(c)) && r.hacer.cajas===2, J({chips:r.hacer.chips, cajas:r.hacer.cajas}));
  chk('⚠️ «Ver cuáles» deja solo los 2 productos de la alerta (TITANIO ICE y ORO ANATOMICO)',
    r.ver==='prod' && r.prod.filas.length===2 && r.prod.filas.some(f=>/TITANIO ICE/.test(f)) && r.prod.filas.some(f=>/ANATOMICO/.test(f) && /Recordá revisar la producción/.test(f)) && !/Ver cuáles/.test(r.prod.alerta), J(r.prod.filas));
  chk('⚠️ con el Excel de Moreno de AYER lo dice: «el último Excel de Moreno, del 06/10»',
    /y el último Excel de Moreno, del 06\/10 tiene 3\. Falta 1\.$/.test(r.ayerTxt) && /el último Excel de Moreno, del 06\/10 tiene menos/.test(r.ayerCaja), J({txt:r.ayerTxt, caja:r.ayerCaja}));
  chk('«📋 Copiar el plan» de 15 días: llevar de PTF, traer de Moreno, ⚠️ revisar la producción, tener en Banzer y tener en PTF',
    /PLAN DE STOCK · próximos 15 días \(hasta el 22\/10\)/.test(r.copia) &&
    /🚚 LLEVAR DE PTF A BANZER \(PTF no baja de lo suyo\)\n• TITANIO ICE · 160x190: 6 \(PTF queda con 4\)/.test(r.copia) &&
    /📥 TRAER DE MORENO\n[\s\S]*• TITANIO ICE · 160x190: 7 a Banzer \(para tener\)/.test(r.copia) && /• TITANIO LATEX · 140x190: 4 a Banzer \(para tener\)/.test(r.copia) &&
    /• ORO ANATOMICO VISCOLASTICO · 140x190: 2 a PTF \(para tener\)\n• ORO ANATOMICO VISCOLASTICO · 140x190: 2 a Banzer \(para tener\)/.test(r.copia) &&
    /⚠️ RECORDÁ REVISAR LA PRODUCCIÓN: el Excel de Moreno de hoy tiene menos de lo que hay que traer y tener\n• TITANIO ICE · 160x190: traer 7, el Excel tiene 0 \(faltan 7\)\n• ORO ANATOMICO VISCOLASTICO · 140x190: traer 4, el Excel tiene 3 \(falta 1\)/.test(r.copia) &&
    /🏪 TENER EN BANZER\n• TITANIO ICE · 160x190: 13 = 2 ya vendidos \+ 11 para tener \(hay 0\)/.test(r.copia) && /🏭 TENER EN PTF \(no bajar de esto\)\n• ORO BI RELAX · 140x190: 7 = 7 para tener \(hay 2\)/.test(r.copia), r.copia);
  chk('…y el texto no dice «pedir», «producir», «fabricar» ni «no alcanza»', !/pedir|producir|fabricar|no alcanza/i.test(r.copia), r.copia.slice(0,200));

  // ⚠️ El caso del dueño: 0 en PTF y 0 en Banzer, con ventas ya hechas (ESPECIAL SEMIORTOPEDICO) + uno de Sueña
  r = await page.evaluate(() => {
    window._st0=JSON.stringify(STATE);
    var G=function(c){ return { desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107', cant:c }; };
    var S=function(c){ return { desc:'COLCHON SUEÑA ESSENTIAL', medida:'140x190', codigo:'CC1002', cant:c }; };
    var cb=CERCA_B, cp=CERCA_P, man=function(n){ return stockSumarDias(todayStr(), n); };
    K.G=stockClave(G(1)); K.S=stockClave(S(1));
    STATE=STATE.concat([
      _P({ fecha:_d(2),  zona:'Este',  maps:_q(cp[0][0],cp[0][1]), productos:[G(2)] }),     // lo entregado: 4 entregas, 6 unidades (0,4/día), mitad y mitad
      _P({ fecha:_d(5),  zona:'Norte', maps:_q(cb[0][0],cb[0][1]), productos:[G(2)] }),
      _P({ fecha:_d(8),  zona:'Este',  maps:_q(cp[1][0],cp[1][1]), productos:[G(1)] }),
      _P({ fecha:_d(11), zona:'Norte', maps:_q(cb[1][0],cb[1][1]), productos:[G(1)] }),
      _P({ fecha:man(1), zona:'Este',  maps:_q(cp[2][0],cp[2][1]), productos:[G(4)] }),     // ya vendido: 6 del lado de PTF…
      _P({ fecha:man(3), zona:'Este',  maps:_q(cp[3][0],cp[3][1]), productos:[G(2)] }),
      _P({ fecha:man(2), zona:'Norte', maps:_q(cb[2][0],cb[2][1]), productos:[G(1)] }),     // …y 1 del de Banzer
      _P({ fecha:man(1), zona:'Norte', maps:_q(cb[3][0],cb[3][1]), productos:[S(2)] })      // Sueña: se vende poco, todo a PTF
    ]);
    STOCK.c.u[K.G]=0; STOCK.g[BANZER].u[K.G]=0; STOCK.c.u[K.S]=0; STOCK.g[BANZER].u[K.S]=0;
    STOCK.g[IM].u={}; STOCK.g[IM].u[K.E]=4;                    // el Excel de Moreno está, pero no tiene ninguno de estos
    stockOlvidarIndice(); ALM_PLAN_VER='hacer'; almPlanSetH(7); almRefrescar();
    return 1;
  });
  pl = await leerPlan();
  chk('⚠️ ESPECIAL SEMIORTOPEDICO 7 días, con 0 en PTF y 0 en Banzer: PTF tener 7 = 6 ya vendidos + 1 para tener · Banzer tener 2 = 1 + 1',
    pl.G && pl.G[7].tP===7 && pl.G[7].firmeP===6 && pl.G[7].xP===1 && pl.G[7].tB===2 && pl.G[7].firmeB===1 && pl.G[7].xB===1 && pl.G[7].hP===0 && pl.G[7].hB===0, J(pl.G&&pl.G[7]));
  chk('⚠️ …«Traer 7 de Moreno a PTF (6 ya vendidos + 1 para tener)» y «Traer 2 de Moreno a Banzer (1 ya vendido + 1 para tener)»',
    pl.G && J(pl.G[7].deM)===J(['Moreno→PTF 7 (6 vend.)','Moreno→Banzer 2 (1 vend.)']) &&
    /Traer 7 de Moreno a PTF \(6 ya vendidos \+ 1 para tener\) \| 📥 Traer 2 de Moreno a Banzer \(1 ya vendido \+ 1 para tener\)/.test(pl.G[7].mov), pl.G&&pl.G[7].mov);
  chk('⚠️ …y como el Excel de Moreno no tiene ninguno: «Recordá revisar la producción… hay que traer 9 de Moreno y tenerlos, y el Excel de Moreno de hoy no tiene ninguno. Faltan 9.»',
    pl.G && pl.G[7].al && pl.G[7].alTxt==='⚠️ Recordá revisar la producción: para los próximos 7 días hay que traer 9 de Moreno y tenerlos, y el Excel de Moreno de hoy no tiene ninguno. Faltan 9.', pl.G&&pl.G[7].alTxt);
  chk('15 y 30 días: PTF 9 y 12, Banzer 4 y 7 (lo vendido no cambia; lo «para tener» crece)',
    pl.G && pl.G[15].tP===9 && pl.G[15].tB===4 && pl.G[30].tP===12 && pl.G[30].tB===7 && J(pl.G[30].deM)===J(['Moreno→PTF 12 (6 vend.)','Moreno→Banzer 7 (1 vend.)']), J(pl.G&&[pl.G[15],pl.G[30]]));
  chk('⚠️ el de Sueña se trae de Multiespumas («Traer 2 de Multiespumas a PTF (ya vendidos)»), aunque la entrega sea del lado de Banzer: se vende poco, todo a PTF',
    pl.S && pl.S[7].tP===2 && pl.S[7].tB===0 && J(pl.S[7].deM)===J(['Multiespumas→PTF 2 (2 vend.)']) && /Traer 2 de Multiespumas a PTF \(ya vendidos\)/.test(pl.S[7].mov), J(pl.S&&pl.S[7]));
  chk('…y sin el Excel de Multiespumas no hay alerta para él (el de Moreno no es su fábrica)', pl.S && !pl.S[7].al && !pl.S[30].al, J(pl.S&&pl.S[30].al));
  r = await page.evaluate(() => { var el=document.getElementById('alm-plan-in');
    var o={ filas:[].slice.call(el.querySelectorAll('tbody tr')).map(function(tr){ return tr.innerText.replace(/\s+/g,' ').trim(); }), texto:el.textContent.replace(/\s+/g,' ') };
    STOCK.g[IM].u[K.G]=5; stockOlvidarIndice(); almRefrescar();
    var p=ALM_DATA.filas.filter(function(x){ return x.k===K.G; })[0].plan[7]; o.cinco=almPlanAlertaTxt(p,false);
    var t=''; var v=copyText; copyText=function(x){ t=x; }; try{ almCopiarPlan(); } finally { copyText=v; }
    o.copia=t;
    return o; });
  chk('⚠️ en «Qué hacer» va PRIMERO (lo que más ya vendido hay que traer), con «tener 7 · 6 ya vendidos + 1 para tener · hay 0»',
    /ESPECIAL SEMIORTOPEDICO/.test(r.filas[0]) && /tener 7 6 ya vendidos \+ 1 para tener hay 0/.test(r.filas[0]) && /tener 2 1 ya vendido \+ 1 para tener hay 0/.test(r.filas[0]) && /Recordá revisar la producción/.test(r.filas[0]), J(r.filas.slice(0,2)));
  chk('…el total de arriba dice qué traer de cada fábrica y cuánto ya está vendido', /📥 traer 11 de Moreno y 2 de Multiespumas \(9 ya vendidos\)/.test(r.texto), r.texto.slice(0,400));
  chk('⚠️ con 5 en Moreno: «…y el Excel de Moreno de hoy tiene 5. Faltan 4.»', /hay que traer 9 de Moreno y tenerlos, y el Excel de Moreno de hoy tiene 5\. Faltan 4\.$/.test(r.cinco), r.cinco);
  chk('«📋 Copiar»: traer de Moreno y de Multiespumas por separado, con lo ya vendido de cada línea, y la alerta del SEMIORTOPEDICO',
    /📥 TRAER DE MORENO\n• ESPECIAL SEMIORTOPEDICO · 140x190: 7 a PTF \(6 ya vendidos \+ 1 para tener\)\n• ESPECIAL SEMIORTOPEDICO · 140x190: 2 a Banzer \(1 ya vendido \+ 1 para tener\)/.test(r.copia) &&
    /📥 TRAER DE MULTIESPUMAS\n• COLCHON SUEÑA ESSENTIAL · 140x190: 2 a PTF \(ya vendidos\)/.test(r.copia) &&
    /⚠️ RECORDÁ REVISAR LA PRODUCCIÓN[^\n]*\n• ESPECIAL SEMIORTOPEDICO · 140x190: traer 9, el Excel tiene 5 \(faltan 4\)/.test(r.copia) &&
    /🏭 TENER EN PTF \(no bajar de esto\)\n• ESPECIAL SEMIORTOPEDICO · 140x190: 7 = 6 ya vendidos \+ 1 para tener \(hay 0\)/.test(r.copia), r.copia);
  await page.evaluate(() => {
    STATE=JSON.parse(_st0); delete STOCK.c.u[K.G]; delete STOCK.g[BANZER].u[K.G]; delete STOCK.c.u[K.S]; delete STOCK.g[BANZER].u[K.S];
    delete STOCK.g[IM]; delete STOCK.al[IM]; delete K.G; delete K.S; stockOlvidarIndice(); ALM_PLAN_H=7; almRefrescar();
  });

  // ══ La revisión de Codex del 07/10 (F1-F3) y la regla del dueño del 08/10: el plan trabaja con los Excel del día ══
  r = await page.evaluate(() => {
    var o={}, sacar=function(){ var f=ALM_DATA.filas.filter(function(x){ return x.k===K.F; })[0]; return f && f.plan[7]; };
    var p0=JSON.stringify(STOCK.p||[]);
    // F1: «pedí a fábrica» anotado y nunca cerrado NO cubre nada (el panel no sabe cuándo llega)
    STOCK.p=[{ id:'fp1', k:K.F, u:10, fab:'Moreno', f:stockSumarDias(todayStr(),-30), esp:'', r:'' }];
    stockOlvidarIndice(); almRefrescar(); var r1=sacar(); o.fab={ cam:r1.cam, deM:r1.deM.length, ant:r1.tP };
    // …pero una RECOGIDA de Moreno ya programada sí (es el mismo «traer» en marcha)
    STOCK.p=[{ id:'rc1', k:K.F, u:2, tipo:'recogida', de:'01-05-103 IM - PRODUCTOTERMINADO', fab:'', f:todayStr(), esp:stockSumarDias(todayStr(),1), r:'' }];
    stockOlvidarIndice(); almRefrescar(); var r2=sacar(); o.rec={ cam:r2.cam };
    STOCK.p=JSON.parse(p0); stockOlvidarIndice(); almRefrescar();
    // F2: lo que sale de Banzer va en la copia para logística
    ALM_PLAN_H=15; var t=''; var v=copyText; copyText=function(x){ t=x; }; try{ almCopiarPlan(); } finally { copyText=v; } o.copia=t; ALM_PLAN_H=7;
    // F3: sin el Excel de PTF, nada de «cada depósito tiene lo suyo»
    var c0=STOCK.c; STOCK.c={ f:'', u:{}, hora:'' }; stockOlvidarIndice(); almRefrescar(); ALM_PLAN_VER='hacer'; almPintarPlan();
    var el=document.getElementById('alm-plan-in');
    o.sin={ banner:((document.getElementById('alm-plan-sinexcel')||{}).textContent||'').replace(/\s+/g,' '), texto:el.textContent.replace(/\s+/g,' '),
      filas:el.querySelectorAll('tbody tr').length, hayAlgunoSin:ALM_DATA.filas.some(function(f){ return f.plan[7].sinConteo; }) };
    STOCK.c=c0; stockOlvidarIndice(); almRefrescar();
    return o;
  });
  chk('⚠️ (F1, dueño 08/10) un «pedí a fábrica» anotado y nunca cerrado NO da por cubierto nada: el ORO ANATOMICO sigue sin movimiento propio y no se resta',
    r.fab.cam===0, J(r.fab));
  chk('…una recogida de Moreno ya programada SÍ se cuenta (es el mismo «traer» en marcha)', r.rec.cam===2, J(r.rec));
  chk('⚠️ (F2) la copia para logística dice qué entregas de PTF se cargan en Banzer',
    /↪️ CARGAR EN BANZER entregas de la zona de PTF \(a Banzer le sobran\)\n• ORO BI RELAX · 140x190: 5/.test(r.copia), r.copia.slice(0,600));
  chk('⚠️ (F3) sin el Excel de PTF: cartel rojo «Falta el Excel de PTF», los productos en «Qué hacer», «hay ?» y nunca «cada depósito tiene lo suyo»',
    r.sin.hayAlgunoSin && /Falta el Excel de PTF: \d+ productos? no se puede/.test(r.sin.banner) && r.sin.filas>0 &&
    /PTF tener \d+ \(hay \?\)/.test(r.sin.texto) && !/cada depósito tiene lo suyo/i.test(r.sin.texto), J(r.sin).slice(0,500));

  // Celular
  await page.setViewportSize({ width:390, height:844 });
  r = await page.evaluate(async () => {
    document.getElementById('alm-plan').open=true; almPlanSetVer('todo');
    await new Promise(function(x){ setTimeout(x,80); });
    var body=document.getElementById('alm-body'), w=document.querySelector('#alm-plan-in .prod-wrap');
    return { pagina:document.documentElement.scrollWidth, body:body.clientWidth, cuerpo:body.scrollWidth, wrap:w?w.clientWidth:0 };
  });
  chk('en el celular (390 px) el plan abierto no se sale: la tabla scrollea adentro de su caja', r.pagina<=390 && r.cuerpo<=r.body+1 && r.wrap>0 && r.wrap<=390, J(r));
  chk('sin errores de JS en el plan', errors.length===0, errors.join(' | '));
  }

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
