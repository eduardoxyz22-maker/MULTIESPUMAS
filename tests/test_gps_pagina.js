/* 🛰️ EL GPS EN LA PÁGINA (13/10, §4ko). La lectura de la planilla trae `gps` (servidor 2026-10-13-a) y la página:
   1. Lo toma de la lectura (apiList → gpsTomar); con un servidor viejo (sin `gps`) todo queda como antes.
   2. «Salió» del GPS cuando nadie tocó «🚚 Ya salió»; el botón a mano manda (y solo ese se deshace). Solo hoy.
   3. Una caché del servidor de más de 10 minutos no se usa; si el GPS se calla, el «salió» de hoy se recuerda.
   4. La ficha del camión dice dónde está (en la calle, a cuánto de PTF, km/h, de cuándo es el reporte).
   5. Mis pedidos: el viaje dice «Salió HH:MM» con el GPS.
   6. El mapa de entregas (Hoy): un 🚚 por camión con su placa; el 🚚 estimado del recorrido no se dibuja si hay GPS.
   7. La ciudad (patio.js): cada camión con su punto del GPS en la escena, «salió» del GPS y David no reclama un camión que salió.
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
    STATE=[ V('Foton nuevo'), V('Foton nuevo', { turno:'PM' }), V('Carry'), V('Foton encarpado') ];
    CARGA_CHK={};
    window.__G={ t:Date.now()-60000, u:[
      { p:'6663CCP', pl:'6663-CCP', la:-17.762, lo:-63.1429, v:32, m:1, r:Date.now()-120000, c:'LUIS', dep:{ id:'ptf', n:'PTF', m:1455 }, f:1, s:'09:42', sd:'ptf', ul:'09:42', vu:'' },
      { p:'6409TIG', pl:'6409-TIG', la:P.lat, lo:P.lng, v:0, m:0, r:Date.now()-60000, c:'', dep:{ id:'ptf', n:'PTF', m:12 }, f:0, s:'', sd:'', ul:'', vu:'' } ] };
    window.__conGps=true;
    apiPost=function(pl){ var j={ ok:true, version:'2026-10-13-a', ahora:Date.now(), pedidos:JSON.parse(JSON.stringify(STATE)) }; if(window.__conGps) j.gps=JSON.parse(JSON.stringify(window.__G)); return Promise.resolve(j); };
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

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
