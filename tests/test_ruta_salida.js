/* 🏭🏪 DE DÓNDE SALE EL CAMIÓN EN EL RECORRIDO (12/10). El dueño, mirando el recorrido del mapa: «¿toma en cuenta si sale de PTF
   o Banzer, según como dividimos y pusimos en PTF o Banzer?». Antes TODO arrancaba en PTF.
   Lo que cuida (rojo contra lo publicado `f233130`, que no tiene `rutaSalida`):
   1. Un camión con todo de acá (o sin marcar) sale de PTF; con todo «✔ hay en Banzer», de Banzer; con las dos, PTF y después Banzer.
   2. Lo que se trae de Moreno (📥) carga en PTF (logística lo deja ahí antes).
   3. La primera parada es la más cerca del ÚLTIMO depósito (con Banzer, la más cerca de Banzer).
   4. El panel del recorrido lo dice («sale de Banzer», «carga en PTF y en Banzer») y el mapa marca 🏪 Banzer.
   5. La Hoja de ruta ordena con la misma regla y lo dice al lado del chofer.
   6. Sin ningún camión asignado, el panel lo dice (antes no salía nada) con el botón para asignarlos.
   Datos SINTÉTICOS. Se corre:  node tests/test_ruta_salida.js */
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
  await page.clock.setFixedTime(new Date('2026-10-14T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(1500);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r = await ev(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    loadFromServer=function(){}; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    var hoy=todayStr(), n=0;
    var P=almUbic('ptf'), B=almUbic('banzer');
    var cerca=function(g, dLat, dLng){ return 'https://www.google.com/maps?q='+(g.lat+dLat)+','+(g.lng+dLng); };
    var V=function(ch, x, maps){ n++; return { id:'s'+n, oc:'10-'+(700+n), cliente:'C'+n, fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', chofer:ch, vehiculo:'',
      productos:[Object.assign({ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000 }, x)], saldo:0, pagado:true, entregado:false, maps:maps, ts:1, fotos:[] }; };
    STATE=[
      V('Acá', {}, cerca(P, 0.01, 0.0)), V('Acá', { chk:'ok' }, cerca(P, 0.02, 0.01)),
      V('Moreno', { chk:'im' }, cerca(P, -0.01, 0.0)),
      V('Banzer', { chk:'ok', chkDe:'Banzer' }, cerca(B, 0.03, 0.0)), V('Banzer', { chk:'ok', chkDe:'Banzer' }, cerca(B, 0.005, 0.005)),
      // las dos: una de acá muy lejos de PTF y una de Banzer pegada a Banzer → con Banzer como último depósito, la primera parada es la de Banzer
      V('Los dos', { chk:'ok' }, cerca(P, -0.06, 0.0)), V('Los dos', { chk:'ok', chkDe:'Banzer' }, cerca(B, 0.004, 0.0))
    ];
    MAPA_DIA='hoy'; MAPA_LIST=STATE.slice(); MAPA_COORDS={};
    STATE.forEach(function(p){ var g=coordsDeLink(p.maps); MAPA_COORDS[String(p.maps)]={ link:p.maps, lat:g.lat, lng:g.lng }; });
    var D={}; mapaRutaDatos().forEach(function(x){ D[x.k]={ deps:x.deps.map(function(d){ return d.id; }).join('>'), primero:x.stops[0] && x.stops[0].p.cliente, txt:rutaSalidaTxt(x.deps) }; });
    var H={}; ['Acá','Banzer','Los dos'].forEach(function(k){ var o=nxRutaOrdenar(STATE.filter(function(p){ return p.chofer===k; }));
      H[k]={ deps:o.deps.map(function(d){ return d.id; }).join('>'), primero:o.stops[0].cliente }; });
    return { D:D, H:H };
  });
  console.log('\n── 1-3. De dónde sale cada camión ──');
  chk('todo de acá (o sin marcar) → sale de PTF', r.D && r.D['Acá'] && r.D['Acá'].deps==='ptf' && r.D['Acá'].txt==='sale de PTF', r.D);
  chk('lo que se trae de Moreno carga en PTF', r.D && r.D['Moreno'] && r.D['Moreno'].deps==='ptf', r.D && r.D['Moreno']);
  chk('todo «✔ hay en Banzer» → sale de Banzer', r.D && r.D['Banzer'] && r.D['Banzer'].deps==='banzer' && r.D['Banzer'].txt==='sale de Banzer', r.D && r.D['Banzer']);
  chk('de los dos → PTF y después Banzer, y la primera parada es la más cerca de Banzer',
      r.D && r.D['Los dos'] && r.D['Los dos'].deps==='ptf>banzer' && r.D['Los dos'].txt==='carga en PTF y en Banzer' && r.D['Los dos'].primero==='C7', r.D && r.D['Los dos']);
  chk('el de Banzer arranca por la parada más cerca de Banzer', r.D && r.D['Banzer'] && r.D['Banzer'].primero==='C5', r.D && r.D['Banzer']);
  console.log('\n── 5. La Hoja de ruta con la misma regla ──');
  chk('la hoja de ruta ordena desde el mismo depósito', r.H && r.H['Banzer'].deps==='banzer' && r.H['Banzer'].primero==='C5' && r.H['Los dos'].deps==='ptf>banzer' && r.H['Los dos'].primero==='C7' && r.H['Acá'].deps==='ptf', r.H);

  console.log('\n── 5b. (12/10, revisión) Un pedido «✔ Banzer» SIN ubicación también dice de dónde sale ──');
  const r5 = await ev(() => {
    var P=almUbic('ptf'), hoy=todayStr();
    var A={ id:'m1', oc:'10-901', cliente:'CON PIN', fecha:hoy, turno:'AM', vendedor:'Mirian Salazar', chofer:'Mixto', vehiculo:'', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000 }], saldo:0, pagado:true, entregado:false, maps:'https://www.google.com/maps?q='+(P.lat+0.01)+','+P.lng, ts:1, fotos:[] };
    var B=Object.assign({}, A, { id:'m2', oc:'10-902', cliente:'SIN PIN', maps:'', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:3000, chk:'ok', chkDe:'Banzer' }] });
    var st=STATE, ml=MAPA_LIST, mc=MAPA_COORDS;
    STATE=[A, B]; MAPA_LIST=STATE.slice(); MAPA_COORDS={}; var g=coordsDeLink(A.maps); MAPA_COORDS[A.maps]={ link:A.maps, lat:g.lat, lng:g.lng };
    var m=mapaRutaDatos().filter(function(x){ return x.k==='Mixto'; })[0], h=nxRutaOrdenar(STATE);
    var out={ mapa:m && rutaSalidaTxt(m.deps), hoja:rutaSalidaTxt(h.deps) };
    STATE=st; MAPA_LIST=ml; MAPA_COORDS=mc; return out;
  });
  chk('el mapa y la Hoja de ruta dicen lo mismo: «carga en PTF y en Banzer»', r5.mapa==='carga en PTF y en Banzer' && r5.hoja===r5.mapa, r5);

  console.log('\n── 4, 6. El panel del recorrido ──');
  const p4 = await ev(() => {
    var panel=document.getElementById('mapa-ruta-panel'); document.getElementById('mapa-overlay').style.display='flex';
    // Leaflet de mentira: lo justo para que mapaRutaPintar dibuje y anote los marcadores de depósito
    var dep=[]; var capa={ addTo:function(){ return capa; } };
    var obj=function(){ var o={ addTo:function(){ return o; }, bindPopup:function(){ return o; }, setLatLng:function(){ return o; } }; return o; };
    window.L={ layerGroup:function(){ return capa; }, polyline:obj, circleMarker:obj,
      divIcon:function(o){ if(/mapa-ruta-dep/.test(o.className||'')) dep.push(o.html); return o; }, marker:function(){ return obj(); } };
    MAPA={ removeLayer:function(){} }; MAPA_RUTA=true;
    mapaRutaPintar();
    var con={ txt:panel.innerText.replace(/\s+/g,' '), dep:dep.join(' ') };
    STATE.forEach(function(p){ p.chofer=''; }); MAPA_LIST=STATE.slice(); dep.length=0;
    mapaRutaPintar();
    return { con:con, sin:panel.innerText.replace(/\s+/g,' '), visible:panel.style.display!=='none', btn:!!panel.querySelector('.mrp-ir') };
  });
  chk('el panel dice de dónde sale cada camión', /sale de Banzer/.test(p4.con.txt) && /carga en PTF y en Banzer/.test(p4.con.txt) && /sale de PTF/.test(p4.con.txt), p4.con && p4.con.txt);
  chk('el mapa marca 🏭 PTF y 🏪 Banzer', /PTF/.test(p4.con.dep) && /Banzer/.test(p4.con.dep), p4.con && p4.con.dep);
  chk('sin ningún camión asignado: lo dice y ofrece asignarlos (antes no salía nada)', p4.visible && /ningún pedido de hoy tiene camión asignado/.test(p4.sin) && p4.btn, p4);
  chk('(12/10) y no promete «desde PTF»: cada camión sale de su depósito', !/desde PTF/.test(p4.sin) && /su depósito/.test(p4.sin), p4.sin);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
