/* 📍 LOS ✅ DE HOY QUE EL GPS NO VIO EN LA PUERTA (15/11/2026, mejora 319; dueño: «319»).
   El ✅ se pone al salir el camión: desde las 18:00, «Para hacer» lista los ✅ de hoy donde el GPS no vio ningún camión parado en la puerta.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `GPS_NOPARO_PRUEBA` no hay renglón.
   2. A las 18:30: entran los ✅ de hoy sin parada en su puerta, cada uno con el porqué (la parada más cerca y a cuánto; sin pin; sin datos
      del GPS de su camión); no entran el que el GPS vio, el sin ✅, el que retira el cliente ni el de otro día. Antes de las 18:00, nada.
   3. «Sí, se entregó» lo saca de la lista (anotado en el aparato) sin guardar nada en la planilla.
   4. «📅 No salió» abre 📅 Reprogramar de siempre. Nada se marca ni se saca solo.
   5. Sin el día del GPS: nada.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_gps_noparo.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-05T18:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  const armar = () => ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer=function(){};
    try{ localStorage.removeItem('me_gps_noparo_ok'); localStorage.removeItem('me_gps_dia'); }catch(e){}
    var hoy=todayStr(), P=almUbic('ptf'), n=0;
    var pin=function(i){ return { lat:P.lat+0.02*i, lng:P.lng+0.01 }; };
    var V=function(id, veh, i, o){ n++; return Object.assign({ id:id, oc:'11-'+(700+n), cliente:'CLIENTE '+id.toUpperCase(), fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', vehiculo:veh,
      chofer:veh?(VEHICULOS[veh]||[])[0]:'', zona:'Norte', direccion:'Calle '+n, productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, chk:'ok' }], saldo:0, pagado:true,
      entregado:true, maps:i ? ('https://www.google.com/maps?q='+pin(i).lat+','+pin(i).lng) : '', ts:1, fotos:[], rev:3 }, o||{}); };
    STATE=[
      V('a1', 'Foton nuevo', 1),                       // el GPS se paró en su puerta
      V('a2', 'Foton nuevo', 6),                       // lejos de las paradas (~10 km de la más cerca)
      V('a3', 'Foton nuevo', 0),                       // sin pin
      V('a4', 'Foton encarpado', 3),                   // su camión no tiene datos del GPS hoy
      V('a5', 'Foton nuevo', 2, { entregado:false }),  // sin ✅
      V('a6', '', 4, { observaciones:'EL CLIENTE RECOGE DE FABRICA' }),   // lo retira el cliente
      V('a7', 'Foton nuevo', 5, { fecha:stockSumarDias(hoy,-1) })          // de ayer
    ];
    gpsDiaTomar({ f:hoy, t:Date.now(), u:{ '6663CCP':{ s:'09:00', ev:[['09:00','sal','ptf',0]], par:[ ['10:00','10:15', pin(1).lat, pin(1).lng, ['a1'], 0, 20] ] } } });
    window._env=[];
    apiPost=function(pl){ window._env.push(JSON.parse(JSON.stringify(pl))); return Promise.resolve({ ok:true }); };
  });

  console.log('\n── 1. Sin la bandera ──');
  await armar();
  let r = await ev(() => ({ x:gpsNoParoHacer(), L:gpsNoParoDatos().length }));
  chk('no hay renglón ni lista', r.x===null && r.L===0, r);

  console.log('\n── 2. A las 18:30 ──');
  r = await ev(() => {
    window.GPS_NOPARO_PRUEBA=1;
    var L=gpsNoParoDatos(), x=gpsNoParoHacer(), I=admHacerDatos().filter(function(o){ return o.k==='gps-noparo'; })[0]||null;
    return { ids:L.map(function(o){ return o.id; }), por:L.map(function(o){ return o.id+': '+o.por; }), x:x, en:!!I };
  });
  chk('entran a2, a3 y a4 (no a1 que el GPS vio, ni a5 sin ✅, ni a6 que retira, ni a7 de ayer)', r.ids && r.ids.slice().sort().join()==='a2,a3,a4', r.ids);
  chk('cada uno con su porqué: la parada más cerca y a cuánto · sin pin · sin datos del GPS de su camión', (function(P){ P=P.slice().sort(); return /^a2: la parada más cerca, a \d+,\d km$/.test(P[0]) && P[1]==='a3: el pedido no tiene pin: no se puede saber' && P[2]==='a4: el GPS no tiene datos de ese camión hoy'; })(r.por||[]), r.por);
  chk('«Para hacer»: «📍 3 entregas con ✅ hoy donde el GPS no paró cerca» con «Ver cuáles»', r.en && r.x && r.x.n===3 && r.x.t==='entregas con ✅ hoy donde el GPS no paró cerca' && r.x.b==='Ver cuáles' && r.x.fn==='gpsNoParoAbrir()', r.x);
  await page.clock.setFixedTime(new Date('2026-11-05T17:30:00-04:00'));
  r = await ev(() => gpsNoParoHacer());
  chk('a las 17:30 todavía no', r===null, r);
  await page.clock.setFixedTime(new Date('2026-11-05T18:30:00-04:00'));

  console.log('\n── 3-4. Confirmar ──');
  r = await ev(async () => {
    window._env=[];
    gpsNoParoAbrir();
    var box=document.getElementById('modal-box'), filas=box.querySelectorAll('.gnp-r').length, tit=(box.querySelector('h3')||{}).innerText;
    box.querySelector('.gnp-si[data-id="a2"]').click();
    await new Promise(function(ok){ setTimeout(ok, 100); });
    var despues=[].map.call(document.querySelectorAll('#modal-box .gnp-r'), function(x){ return x.getAttribute('data-id'); });
    return { filas:filas, tit:tit, despues:despues, n:gpsNoParoHacer().n, env:window._env.length, ent:findById('a2').entregado, ls:Object.keys(JSON.parse(localStorage.getItem('me_gps_noparo_ok')||'{}')) };
  });
  chk('la ventana lista los 3', r.filas===3 && /no paró cerca · 3/.test(r.tit), r);
  chk('«Sí, se entregó» lo saca de la lista (anotado en el aparato) sin guardar ni tocar el ✅', r.despues.slice().sort().join()==='a3,a4' && r.n===2 && r.env===0 && r.ent===true && r.ls.join()==='a2|2026-11-05', r);
  r = await ev(async () => {
    document.querySelector('#modal-box .gnp-no[data-id="a3"]').click();
    await new Promise(function(ok){ setTimeout(ok, 150); });
    var box=document.getElementById('modal-box');
    return { tit:(box.querySelector('h3')||{}).innerText||'', txt:box.innerText.slice(0,200), ent:findById('a3').entregado, env:window._env.length };
  });
  chk('«📅 No salió» abre 📅 Reprogramar (y no toca nada todavía)', /Reprogramar/i.test(r.tit+' '+r.txt) && r.ent===true && r.env===0, r);

  console.log('\n── 5. Sin el día del GPS ──');
  r = await ev(() => { try{ closeModal(); }catch(e){} GPS_DIA={ f:todayStr(), t:0, u:{} }; try{ localStorage.removeItem('me_gps_dia'); }catch(e){} GPS_VER++; return { L:gpsNoParoDatos().length, x:gpsNoParoHacer() }; });
  chk('sin GPS de hoy: nada', r.L===0 && r.x===null, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
