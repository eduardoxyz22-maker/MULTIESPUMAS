/* 🛰️ EL GPS EN LA PÁGINA (13/10, §4ko). La lectura de la planilla trae `gps` (servidor 2026-10-13-a) y la página:
   1. Lo toma de la lectura (apiList → gpsTomar); con un servidor viejo (sin `gps`) todo queda como antes.
   2. «Salió» del GPS cuando nadie tocó «🚚 Ya salió»; el botón a mano manda (y solo ese se deshace). Solo hoy.
   3. Una caché del servidor de más de 10 minutos no se usa; si el GPS se calla, el «salió» de hoy se recuerda.
   4. La ficha del camión dice dónde está (en la calle, a cuánto de PTF, km/h, de cuándo es el reporte).
   5. Mis pedidos: el viaje dice «Salió HH:MM» con el GPS.
   6. El mapa de entregas (Hoy): un 🚚 por camión con su placa; el 🚚 estimado del recorrido no se dibuja si hay GPS.
   7. La ciudad (patio.js): cada camión con su punto del GPS en la escena, «salió» del GPS y David no reclama un camión que salió.
   10-14. (§4kp, servidor 2026-10-13-b) el DÍA del servidor (`gpsDia`): un «salió» que fue a recoger a Moreno se deshace; el registro
      con palabras; «📍 Llegó» en Mis pedidos (no ✅); el cierre de entregas dice qué vio el GPS y tilda SOLO al tocar el botón; las
      paradas en el mapa; el recorrido del servidor (`gpsRuta`, solo con la 13-b); una lectura atrasada o de ayer no pisa.
   Datos SINTÉTICOS. Reloj clavado el miércoles 14/10/2026 a las 12:30 de Bolivia.
   Se corre:  node tests/test_gps_pagina.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-14T12:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    var hoy=todayStr(), P=almUbic('ptf'), n=0;
    var V=function(veh, o){ n++; return Object.assign({ id:'g'+n, oc:'10-'+(800+n), cliente:'CLIENTE '+n, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:veh,
      chofer:veh?(VEHICULOS[veh]||[])[0]:'', zona:'Norte', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok' }], saldo:0, pagado:true,
      entregado:false, maps:'https://www.google.com/maps?q='+(P.lat+0.01*n)+','+P.lng, ts:1, fotos:[] }, o||{}); };
    STATE=[ V('Foton nuevo'), V('Foton nuevo', { turno:'PM' }), V('Carry'), V('Foton encarpado'), V('', { productos:[{ desc:'MEMORY FLEX', medida:'160x200', cant:2, precio:5000, chk:'ok' }] }) ];
    CARGA_CHK={};
    window.__G={ t:Date.now()-60000, u:[
      { p:'6663CCP', pl:'6663-CCP', la:-17.762, lo:-63.1429, v:32, m:1, r:Date.now()-120000, c:'LUIS', dep:{ id:'ptf', n:'PTF', m:1455 }, f:1, s:'09:42', sd:'ptf', ul:'09:42', vu:'' },
      { p:'6409TIG', pl:'6409-TIG', la:P.lat, lo:P.lng, v:0, m:0, r:Date.now()-60000, c:'', dep:{ id:'ptf', n:'PTF', m:12 }, f:0, s:'', sd:'', ul:'', vu:'' } ] };
    window.__conGps=true;
    apiPost=function(pl){
      if(pl && pl.action==='gpsRuta'){ window.__rutaPedidos++; return Promise.resolve({ ok:true, version:window.__ver, ruta:JSON.parse(JSON.stringify(window.__RUTA||null)) }); }
      var j={ ok:true, version:window.__ver||'2026-10-13-a', ahora:Date.now(), pedidos:JSON.parse(JSON.stringify(STATE)) }; if(window.__conGps) j.gps=JSON.parse(JSON.stringify(window.__G));
      if(window.__DIA) j.gpsDia=JSON.parse(JSON.stringify(window.__DIA)); return Promise.resolve(j); };
    window.__rutaPedidos=0;
  });

  console.log('\n── 1. La lectura trae el GPS ──');
  let r = await ev(async () => {
    var hoy=todayStr(), antes=camionSalio(hoy, 'Foton nuevo');
    window.__conGps=false; await apiList({ entera:true }); var viejo=!!camionGps('Foton nuevo');
    window.__conGps=true; await apiList({ entera:true });
    return { antes:antes, viejo:viejo, g:camionGps('Foton nuevo'), c:camionGps('Carry'), ins:camionGps('Foton insumo') };
  });
  chk('sin GPS (servidor de antes): nada cambia', r.antes==='' && r.viejo===false, r);
  chk('con la lectura del servidor nuevo: cada camión por su placa (6663-CCP = Foton nuevo)', r.g && r.g.v===32 && r.c && r.c.f===0 && r.ins===null, r);

  console.log('\n── 2. «Salió» del GPS; el botón a mano manda ──');
  r = await ev(() => {
    var hoy=todayStr(), D=cargaVivaDatos(), c=D.porK['Foton nuevo'];
    var gps=camionSalio(hoy, 'Foton nuevo'), ayer=camionSalio('2026-10-13', 'Foton nuevo'), carry=camionSalio(hoy, 'Carry'), html=cvSalioHtml(D, c);
    camionSalioMarcar('Foton nuevo', true);
    var mano=camionSalio(hoy, 'Foton nuevo'), html2=cvSalioHtml(cargaVivaDatos(), cargaVivaDatos().porK['Foton nuevo']);
    camionSalioMarcar('Foton nuevo', false);
    return { gps:gps, ayer:ayer, carry:carry, html:html, mano:mano, html2:html2, vuelta:camionSalio(hoy, 'Foton nuevo') };
  });
  chk('el GPS dice que salió 09:42 → camionSalio = 09:42 (solo hoy)', r.gps==='09:42' && r.ayer==='', r);
  chk('el que está en PTF no salió', r.carry==='', r.carry);
  chk('la ficha dice «Salió a las 09:42 · lo dice el GPS», sin «deshacer»', /Salió a las 09:42<\/b> · lo dice el GPS/.test(r.html) && !/deshacer/.test(r.html), r.html);
  chk('…y dónde está: en la calle, a 1,5 km de PTF, 32 km/h, hace 2 min', /cvc-gps/.test(r.html) && /en la calle · a 1,5 km de PTF<\/b> · 32 km\/h · hace 2 min/.test(r.html), r.html);
  chk('«🚚 Ya salió» a mano manda (12:30) y se puede deshacer; deshecho, vuelve el del GPS', r.mano==='12:30' && /deshacer/.test(r.html2) && r.vuelta==='09:42', [r.mano, r.vuelta]);

  console.log('\n── 3. Caché vieja y GPS callado ──');
  r = await ev(async () => {
    var hoy=todayStr();
    window.__G.t=Date.now()-11*60000; await apiList({ entera:true });
    var vieja=camionGps('Foton nuevo') && camionGps('Foton nuevo').v;
    GPS.rec=relojMs()-11*60000;
    var callado=camionGps('Foton nuevo'), sigue=camionSalio(hoy, 'Foton nuevo');
    window.__G.t=Date.now()-60000; await apiList({ entera:true });
    return { vieja:vieja, callado:callado, sigue:sigue, vuelve:!!camionGps('Foton nuevo') };
  });
  chk('una caché del servidor de 11 minutos no se toma (queda la de antes)', r.vieja===32, r);
  chk('10 minutos sin noticias: no se muestra la posición, pero «salió 09:42» se recuerda', r.callado===null && r.sigue==='09:42', r);
  chk('…y con la próxima lectura vuelve', r.vuelve, r);

  console.log('\n── 5. Mis pedidos: el viaje ──');
  r = await ev(() => { var p=STATE.filter(function(x){ return x.vehiculo==='Foton nuevo'; })[0], v=pedidoViajeDatos(p); return v && v.pasos ? v.pasos.map(function(s){ return (s.hecho?'✓':'·')+s.lbl; }) : v; });
  chk('el pedido de un camión que salió (GPS) dice «Salió 09:42»', Array.isArray(r) && r.some(function(s){ return s==='✓Salió 09:42'; }), r);

  console.log('\n── 6. El mapa de entregas ──');
  r = await ev(() => {
    document.getElementById('mapa-overlay').style.display='flex';
    var marcas=[], estimados=0; var capa={ addTo:function(){ return capa; }, remove:function(){} };
    var obj=function(){ var o={ addTo:function(){ return o; }, bindPopup:function(t){ o.pop=t; return o; }, setLatLng:function(){ return o; } }; return o; };
    window.L={ layerGroup:function(){ return capa; }, polyline:obj, circleMarker:obj,
      divIcon:function(o){ if(/mapa-gps/.test(o.className||'')) marcas.push(o.className+' '+o.html); if(/mapa-ruta-camion/.test(o.className||'')) estimados++; return o; },
      marker:function(){ return obj(); } };
    MAPA={ removeLayer:function(){} }; MAPA_RUTA=true; MAPA_DIA='hoy'; MAPA_LIST=STATE.slice(); MAPA_COORDS={};
    STATE.forEach(function(p){ var g=coordsDeLink(p.maps); MAPA_COORDS[String(p.maps)]={ link:p.maps, lat:g.lat, lng:g.lng }; });
    var n=mapaGpsPintar(); var m=marcas.slice();
    mapaRutaPintar(); var panel=document.getElementById('mapa-ruta-panel').innerText.replace(/\s+/g,' ');
    MAPA_DIA='manana'; var manana=mapaGpsPintar();
    MAPA_DIA='hoy'; document.getElementById('mapa-overlay').style.display='none';
    return { n:n, m:m, estimados:estimados, panel:panel, manana:manana };
  });
  chk('Hoy: un 🚚 por camión con GPS, con su placa y la velocidad del que anda', r.n===2 && r.m.some(function(x){ return /anda/.test(x) && /6663-CCP<\/b> 32 km\/h/.test(x); }) && r.m.some(function(x){ return /dep/.test(x) && /6409-TIG/.test(x); }), r.m);
  chk('el recorrido no dibuja el 🚚 estimado de los camiones con GPS (sí el de los demás)', r.estimados===1, r.estimados);
  chk('el panel del recorrido dice dónde está cada uno', /🛰️ en la calle · a 1,5 km de PTF · 32 km\/h/.test(r.panel), r.panel);
  chk('Mañana: no se dibujan posiciones', r.manana===0, r.manana);

  console.log('\n── 7. La ciudad ──');
  await page.addScriptTag({ path: path.resolve(path.dirname(PEDIDOS), 'patio.js') });
  r = await ev(() => {
    CV_DIA='hoy'; var D=patioDatos(), C={}; D.cams.forEach(function(c){ C[c.k]=c; });
    var fn=C['Foton nuevo'], ca=C['Carry'], fe=C['Foton encarpado'];
    return { fn:{ salio:fn.salio, mano:fn.salioMano, gps:fn.gps }, ca:{ salio:ca.salio, gps:ca.gps }, fe:{ gps:fe.gps }, tarde:D.dia.tarde };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('el Foton nuevo sale del GPS (no a mano) y trae su punto en la escena, sobre una calle', r.fn && r.fn.salio==='09:42' && r.fn.mano===false && r.fn.gps && isFinite(r.fn.gps.x) && r.fn.gps.z%70===0 && r.fn.gps.f===1 && r.fn.gps.v===32 && /a 1,5 km de PTF/.test(r.fn.gps.donde), r.fn);
  chk('…y el punto del que anda en la calle no es el de PTF (el Carry, adentro)', r.ca.gps && (r.ca.gps.x!==r.fn.gps.x || r.ca.gps.z!==r.fn.gps.z), [r.fn.gps, r.ca.gps]);
  chk('el Carry, adentro de PTF; el Foton encarpado sin GPS', r.ca.salio==='' && r.ca.gps && r.ca.gps.f===0 && r.fe.gps===null, r);
  chk('a las 12:30 David reclama el que no salió (Foton encarpado o Carry), nunca el que el GPS ya vio salir', r.tarde && r.tarde.k!=='Foton nuevo', r.tarde);

  console.log('\n── 8. (13/10, dueño: «los 4 camiones salen en el mismo lugar… no coinciden») cada camión donde dice el GPS ──');
  r = await ev(() => {
    var t=Date.now()-60000;
    gpsTomar({ t:t, u:[
      { p:'6409TIG', pl:'6409-TIG', la:-17.7201, lo:-63.1630, v:0, m:0, r:t, c:'', dep:{ id:'banzer', n:'Banzer', m:35 }, f:0, s:'', vu:'' },
      { p:'6021URL', pl:'6021-URL', la:-17.7490, lo:-63.1430, v:0, m:0, r:t, c:'', dep:{ id:'ptf', n:'PTF', m:20 }, f:0, s:'', vu:'' },
      { p:'6663CCP', pl:'6663-CCP', la:-17.7489, lo:-63.1540, v:12, m:1, r:t, c:'', dep:{ id:'ptf', n:'PTF', m:1180 }, f:1, s:'', vu:'' },
      { p:'5655KSC', pl:'5655-KSC', la:-17.7623, lo:-63.0680, v:0, m:0, r:t, c:'', dep:{ id:'ptf', n:'PTF', m:8100 }, f:1, s:'', vu:'' } ] }, Date.now());
    var D=patioDatos(), C={}; D.cams.forEach(function(c){ C[c.k]=c; });
    return { tig:C['Carry'].gps, url:C['Foton insumo'].gps, ccp:C['Foton nuevo'].gps, ksc:C['Foton encarpado'].gps, donde:gpsDondeTxt(camionGps('Foton encarpado')), dondeCcp:gpsDondeTxt(camionGps('Foton nuevo')) };
  });
  chk('el Carry, en Banzer: «adentro» y en Banzer (la ciudad lo estaciona allá)', r.tig && r.tig.f===0 && r.tig.depId==='banzer', r.tig);
  chk('el Foton insumo, adentro de PTF', r.url && r.url.f===0 && r.url.depId==='ptf', r.url);
  chk('el Foton nuevo, en la calle a ~1 km al oeste de PTF (en la ciudad, a la izquierda de PTF, x<35)', r.ccp && r.ccp.f===1 && r.ccp.x<35 && r.ccp.x>-140, r.ccp);
  chk('el Foton encarpado, en la calle junto a Moreno (Moreno está en x 315, z −105 de la ciudad)', r.ksc && r.ksc.f===1 && Math.abs(r.ksc.x-315)<40 && Math.abs(r.ksc.z+105)<=70, r.ksc);
  chk('(13/10, dueño: «está atrás de la fábrica en plena calle») a 60 m del pin de Moreno: «en Moreno», aunque el servidor (13-a) no lo diga', r.ksc && r.ksc.enMor===true && r.donde==='en Moreno', [r.ksc && r.ksc.enMor, r.donde]);
  chk('…y uno en la calle a 1 km de PTF sigue «en la calle»', r.ccp && r.ccp.enMor===false && /^en la calle/.test(r.dondeCcp), [r.ccp && r.ccp.enMor, r.dondeCcp]);

  console.log('\n── 9. (dueño: «falta la pestaña recorrido gps y "lo que dijo el gps"») el recorrido del día y sus paradas ──');
  r = await ev(() => {
    try{ localStorage.removeItem('me_gps_hist'); }catch(e){} GPS_HIST={ f:'', u:{} };
    var P=almUbic('ptf'), b=Date.parse('2026-10-14T10:00:00-04:00'), m=60000;
    var pto=function(min, la, lo, v){ var x={ p:'6663CCP', la:la, lo:lo, v:v, m:1, f:1, r:b+min*m }; var u={}; u['6663CCP']=x; gpsHistAnotar(u); };
    pto(0, P.lat+0.03, P.lng, 35); pto(5, P.lat+0.0101, P.lng, 0); pto(5, P.lat+0.0101, P.lng, 0);   // el mismo reporte dos veces: uno solo
    pto(8, P.lat+0.0102, P.lng+0.0001, 1); pto(12, P.lat+0.0101, P.lng, 0); pto(14, P.lat+0.002, P.lng+0.01, 28);
    var h=gpsHistDe('Foton nuevo'), par=gpsParadas('Foton nuevo'), ev2=gpsEventosHoy(), guardado=null;
    try{ guardado=JSON.parse(localStorage.getItem('me_gps_hist')); }catch(e){}
    var D=patioDatos(), fn=D.cams.filter(function(c){ return c.k==='Foton nuevo'; })[0];
    return { n:h.length, par:par.map(function(s){ return { h:gpsHoraTxt(s.t0), dur:gpsDurTxt(s.t1-s.t0), cli:s.ped && s.ped.cliente, m:s.pm }; }), ev:ev2.map(function(e){ return e.h+' '+e.x.replace(/<[^>]+>/g,''); }),
      guardado:!!(guardado && guardado.u && guardado.u['6663CCP'] && guardado.u['6663CCP'].length===5), ruta:fn.gpsRuta.length, paradas:fn.gpsParadas, log:D.dia.gpsLog.length, desde:D.dia.gpsDesde,
      sin:D.sin.lineas.map(function(l){ return l.prod+'×'+l.u+':'+l.st; }) };
  });
  chk('cada reporte nuevo es un punto (el repetido no): 5', r.n===5, r.n);
  chk('queda guardado en el aparato (sobrevive al F5)', r.guardado, r.guardado);
  chk('una parada de 9 min a las 10:05, cerca de CLIENTE 1 (su pedido de hoy)', r.par.length===1 && r.par[0].h==='10:05' && r.par[0].dur==='9 min' && r.par[0].cli==='CLIENTE 1' && r.par[0].m<50, r.par);
  chk('«📡 Lo que dijo el GPS»: la parada, lo más nuevo primero', r.ev.length>=1 && /^10:05 6663-CCP se paró 9 min cerca de CLIENTE 1/.test(r.ev[0]), r.ev);
  chk('la ciudad recibe el rastro (5 puntos), la parada y el registro', r.ruta===5 && r.paradas.length===1 && r.paradas[0].cli==='CLIENTE 1' && r.log>=1 && r.desde==='10:00', r);
  chk('«Por cargar»: lo del pedido sin camión también (MEMORY FLEX ×2)', r.sin.some(function(x){ return /MEMORY FLEX/.test(x) && /×2/.test(x); }), r.sin);

  console.log('\n── 10. (§4kp, servidor 13-b) el día del servidor: «salió» que se deshace (Moreno), registro y paradas ──');
  r = await ev(async () => {
    var hoy=todayStr(), P=almUbic('ptf'), now=Date.now();
    STATE.push(Object.assign({}, STATE[3], { id:'g6', oc:'10-806', cliente:'CLIENTE SIN PIN', maps:'' }));
    /* 1) un servidor 13-a dijo que el Carry salió 08:02 (iba a Moreno) */
    window.__G.u[1]=Object.assign({}, window.__G.u[1], { la:-17.75, lo:-63.10, f:1, s:'08:02', sd:'ptf', ul:'08:02' });
    window.__G.t=now-60000; await apiList({ entera:true });
    var antes=camionSalio(hoy, 'Carry');
    /* 2) el 13-b: llegó a Moreno sin pararse en ningún pedido → no salió a repartir */
    window.__G.u[1]=Object.assign({}, window.__G.u[1], { la:-17.7623, lo:-63.0676, s:'', sd:'', ul:'', mor:1 });
    window.__DIA={ f:hoy, t:now, u:{
      '6663CCP':{ s:'09:42', sd:'ptf', ul:'09:42', vu:'', ev:[['09:42','sal','ptf','']],
        par:[['10:05','10:15',P.lat+0.0101,P.lng,['g1'],0,11], ['10:40','10:50',P.lat+0.0201,P.lng+0.0001,[],0,null], ['11:20','11:31',P.lat+0.0500,P.lng+0.0002,[],1,null]] },
      '6409TIG':{ s:'', sd:'', ul:'', vu:'', ev:[['08:02','sal','ptf','rec'],['08:21','lle','moreno','ptf'],['09:08','lle','ptf','moreno']], par:[] },
      '5655KSC':{ s:'08:40', sd:'banzer', ul:'08:40', vu:'12:10', ev:[['08:40','sal','banzer',''],['12:10','lle','ptf','banzer']], par:[['09:30','09:45',-17.80,-63.20,[],0,null]] } } };
    window.__ver='2026-10-13-b'; SERVER_VER='2026-10-13-b'; window.__rutaPedidos=0;   // (el apiPost de verdad anota SERVER_VER con cada respuesta)
    window.__RUTA={ f:hoy, u:{ '6663CCP':[[9*60+40, P.lat, P.lng, 0], [9*60+50, P.lat+0.005, P.lng, 30], [10*60+5, P.lat+0.0101, P.lng, 0]] } };
    await apiList({ entera:true });
    var D=gpsDiaCargar(), guardado=null; try{ guardado=JSON.parse(localStorage.getItem('me_gps_dia')); }catch(e){}
    return { antes:antes, despues:camionSalio(hoy, 'Carry'), fn:camionSalio(hoy, 'Foton nuevo'), hay:gpsDiaHay(), guardado:!!(guardado && guardado.f===hoy && guardado.u['6409TIG']),
      donde:gpsDondeTxt(camionGps('Carry')), ev:gpsEventosHoy().map(function(e){ return e.h+' '+e.ic+' '+e.x.replace(/<[^>]+>/g,''); }) };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('el 13-a dijo «salió 08:02»; el 13-b dice que fue a recoger a Moreno: el «salió» se DESHACE (no queda recordado)', r.antes==='08:02' && r.despues==='', r);
  chk('el Foton nuevo sigue con su salida de verdad (09:42); el día queda guardado en el aparato', r.fn==='09:42' && r.hay && r.guardado, r);
  chk('la ficha del camión dice «en Moreno»', r.donde==='en Moreno', r.donde);
  chk('«📡 Lo que dijo el GPS»: el viaje a recoger, la llegada a Moreno y la vuelta, con palabras', r.ev.some(function(e){ return /^08:02 ↩️ 6409-TIG salió de PTF — fue a recoger a Moreno: no cuenta como «salió»/.test(e); }) &&
      r.ev.some(function(e){ return /^08:21 📥 6409-TIG llegó a Moreno \(a recoger\) · venía de PTF/.test(e); }) && r.ev.some(function(e){ return /^09:08 🏁 6409-TIG llegó a PTF · venía de Moreno/.test(e); }), r.ev);
  chk('…y las paradas: 📍 la que el servidor nombró, 📍 la que la página reconoce (10:40, el pin de g2) y 🛑 la que no tiene pedido', r.ev.some(function(e){ return /^10:05 📍 6663-CCP se paró 10 min cerca de CLIENTE 1 · OC 10-801 \(11 m\)/.test(e); }) &&
      r.ev.some(function(e){ return /^10:40 📍 6663-CCP se paró 10 min cerca de CLIENTE 2/.test(e); }) && r.ev.some(function(e){ return /^09:30 🛑 5655-KSC se paró 15 min \(sin pedido de hoy cerca\)/.test(e); }), r.ev);

  console.log('\n── 11. 📍 «Llegó» en Mis pedidos: es una prueba, NO un ✅ ──');
  r = await ev(() => {
    var ids=['g1','g2','g3','g4','g5','g6'], out={};
    ids.forEach(function(id){ var p=findById(id), ll=gpsLlegadaDe(p); out[id]=ll ? (ll.veh+' '+gpsHoraTxt(ll.t0)+(ll.abierta?' abierta':'')+' '+ll.m+'m') : null; });
    var v=pedidoViajeDatos(findById('g1')).pasos.map(function(s){ return (s.hecho?'✓':'·')+s.ico+s.lbl; });
    var v4=pedidoViajeDatos(findById('g4')).pasos.map(function(s){ return (s.hecho?'✓':'·')+s.ico+s.lbl; });
    return { ll:out, v:v, v4:v4, ent:findById('g1').entregado };
  });
  chk('g1: la parada que el servidor le asignó (10:05, a 11 m)', r.ll.g1==='Foton nuevo 10:05 11m', r.ll);
  chk('g2: el servidor no la nombró, pero el camión SUYO se paró a 15 m de su pin → 10:40', r.ll.g2==='Foton nuevo 10:40 15m', r.ll);
  chk('g5 (sin camión): cualquier camión que se paró en su puerta → el Foton nuevo, 11:20, sigue ahí', /^Foton nuevo 11:20 abierta/.test(r.ll.g5||''), r.ll);
  chk('g3 (Carry), g4 (encarpado, el camión se paró lejos) y g6 (sin pin): nada', r.ll.g3===null && r.ll.g4===null && r.ll.g6===null, r.ll);
  chk('el viaje de g1: «Salió 09:42» hecho y «📍 Llegó 10:05» como paso actual, sin ✅', r.v[3]==='✓🚚Salió 09:42' && r.v[4]==='·📍Llegó 10:05' && r.ent===false, r.v);
  chk('el de g4 (sin parada en su puerta) sigue esperando el ✅ de siempre', r.v4[4]==='·✅Entregado', r.v4);

  console.log('\n── 12. ✅ Cierre de entregas: lo que vio el GPS, y tildar SOLO a pedido ──');
  r = await ev(() => {
    var guardados=0, ap=apiSave; apiSave=function(){ guardados++; return Promise.resolve({ ok:true }); };
    abrirCierreEntregas();
    var box=document.getElementById('modal-box'), t=box.innerText.replace(/\s+/g,' '), tild0=cierreEntTildados().length;
    var badge=function(id){ var i=box.querySelector('.cie-ent-chk[data-id="'+id+'"]'); var row=i && i.closest('.cie-row'); var b=row && row.querySelector('.cie-gps'); return b ? b.textContent : ''; };
    var b={ g1:badge('g1'), g2:badge('g2'), g3:badge('g3'), g4:badge('g4'), g5:badge('g5'), g6:badge('g6') };
    var btn=document.getElementById('cie-gps-tildar'), btnTxt=btn && btn.textContent;
    if(btn) btn.click();
    var sel=cierreEntTildados().slice().sort(), btn2=document.getElementById('cie-gps-tildar');
    closeModal(); apiSave=ap;
    return { t:t, tild0:tild0, b:b, btnTxt:btnTxt, sel:sel, btn2:!!btn2, guardados:guardados, ent:STATE.filter(function(p){ return p.entregado; }).length };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('al abrir, NADA viene tildado (dueño, 12/10) y el texto ya no dice «vienen tildados»', r.tild0===0 && /Nada viene tildado/.test(r.t) && !/vienen tildados como propuesta/.test(r.t), r.t.slice(0,300));
  chk('el resumen: el GPS vio la puerta de 3 de 6, 1 con el camión de vuelta sin pararse, 1 sin ubicación', /El GPS vio el camión en la puerta de 3 de 6 pedidos de hoy · 1 con el camión de vuelta sin haberse parado ahí · 1 sin ubicación/.test(r.t), r.t);
  chk('cada fila dice lo suyo: 📍 estuvo ahí (g1, g2), está ahí (g5), volvió sin pararse (g4), sin ubicación (g6), nada (g3)',
      /📍 el camión estuvo ahí de 10:05 a 10:15 \(10 min\)/.test(r.b.g1) && /de 10:40 a 10:50/.test(r.b.g2) && /está ahí desde las 11:20/.test(r.b.g5) &&
      /volvió sin pararse ahí/.test(r.b.g4) && /sin ubicación/.test(r.b.g6) && r.b.g3==='', r.b);
  chk('«📍 Tildar los 3 que vio el GPS» tilda g1, g2 y g5 — y nada más', /Tildar los 3 que vio el GPS/.test(r.btnTxt||'') && JSON.stringify(r.sel)==='["g1","g2","g5"]' && !r.btn2, [r.btnTxt, r.sel]);
  chk('…sin guardar nada ni marcar ✅: logística confirma con el botón de siempre', r.guardados===0 && r.ent===0, r);

  console.log('\n── 13. El mapa (paradas) y el recorrido del servidor ──');
  r = await ev(async () => {
    document.getElementById('mapa-overlay').style.display='flex';
    var circ=[]; var capa={ addTo:function(){ return capa; }, remove:function(){} };
    var obj=function(o){ var x={ o:o, addTo:function(){ return x; }, bindPopup:function(t){ x.pop=t; return x; }, setLatLng:function(){ return x; } }; return x; };
    window.L={ layerGroup:function(){ return capa; }, polyline:obj, circleMarker:function(ll, o){ var x=obj(o); circ.push(x); return x; }, divIcon:function(o){ return o; }, marker:function(){ return obj(); } };
    MAPA={ removeLayer:function(){} }; MAPA_DIA='hoy';
    GPS.rec=relojMs()-11*60000;   // las posiciones vencieron: las paradas se dibujan igual
    mapaGpsPintar();
    var pops=circ.map(function(c){ return (c.o.fillColor==='#22c55e'?'V ':'G ')+String(c.pop||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); });
    document.getElementById('mapa-overlay').style.display='none';
    window.__conGps=true; window.__G.t=Date.now()-60000; await apiList({ entera:true });
    GPS_RUTA_PED=0; GPS_RUTA_SRV=null; var n0=window.__rutaPedidos, h=gpsHistDe('Foton nuevo'); await new Promise(function(res){ setTimeout(res, 50); });
    var h2=gpsHistDe('Foton nuevo'), n1=window.__rutaPedidos; gpsHistDe('Foton nuevo'); var n2=window.__rutaPedidos;
    return { pops:pops, n0:n1-n0, n1:n2-n0, n2:n2-n0, h2:h2.length, h2a:h2[0] && gpsHoraTxt(h2[0][0]), ult:h2.length && gpsHoraTxt(h2[h2.length-1][0]), hs:h2.map(function(q){ return gpsHoraTxt(q[0]); }).join(',') };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('el mapa de Hoy dibuja las 4 paradas (verde = cerca de un pedido: 3), aunque las posiciones hayan vencido', r.pops.length===4 && r.pops.filter(function(x){ return x[0]==='V'; }).length===3 &&
      r.pops.some(function(x){ return /Foton nuevo · se paró a las 10:05 \(10 min\) cerca de CLIENTE 1/.test(x); }) && r.pops.every(function(x){ return /no es un ✅/.test(x); }), r.pops);
  chk('el recorrido se pide al servidor (gpsRuta) una vez, y no otra vez antes de 2 minutos', r.n0===1 && r.n1===1, [r.n0, r.n1]);
  chk('…y se junta: los puntos del servidor (09:40 a 10:05) y después los de este aparato (10:08 a 10:14)', r.hs==='09:40,09:50,10:05,10:08,10:12,10:14,12:28', r.hs);

  console.log('\n── 14. Un servidor 13-a no recibe «gpsRuta»; un día viejo o atrasado no pisa ──');
  r = await ev(async () => {
    var hoy=todayStr();
    SERVER_VER='2026-10-13-a'; GPS_RUTA_PED=0; var n=window.__rutaPedidos; await gpsRutaPedir(true); var conA=window.__rutaPedidos-n;
    SERVER_VER='2026-10-13-b';
    var t=gpsDiaCargar().t;
    gpsDiaTomar({ f:hoy, t:t-60000, u:{ '6409TIG':{ s:'07:00', ev:[], par:[] } } });
    var atrasado=camionSalio(hoy, 'Carry');
    gpsDiaTomar({ f:'2026-10-13', t:t+60000, u:{ '6409TIG':{ s:'07:00', ev:[], par:[] } } });
    var ayer=camionSalio(hoy, 'Carry');
    var D=patioDatos(), fn=D.cams.filter(function(c){ return c.k==='Foton nuevo'; })[0];
    return { conA:conA, atrasado:atrasado, ayer:ayer, srv:D.dia.gpsSrv, par:fn.gpsParadas.map(function(s){ return s.h0+' '+s.cli; }) };
  });
  if(r.__error) console.log('ERROR', r.__error);
  chk('con el servidor 13-a no se pide «gpsRuta» (caería en el guardado)', r.conA===0, r);
  chk('una lectura atrasada (t más viejo) y el día de ayer no cambian nada', r.atrasado==='' && r.ayer==='', r);
  chk('la ciudad: sabe que el registro es del servidor y nombra el cliente de cada parada', r.srv===true && r.par[0]==='10:05 CLIENTE 1' && r.par[1]==='10:40 CLIENTE 2' && r.par[2]==='11:20 CLIENTE 5', r.par);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
