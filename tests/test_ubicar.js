/* 🎯 UBICAR POR LA DIRECCIÓN ESCRITA — los pedidos de ROHO en el mapa (§4dh).

   El dueño, mirando el mapa con «Todos»: *"¿El botón Todos en el mapa muestra las entregas
   de ROHO? Debería… logística usa este mapa para ver sus entregas."* No las mostraba: los
   pedidos de ROHO entran del Excel con la dirección escrita y sin link de Maps, y el mapa
   dibuja solo los que tienen link — y ni siquiera los contaba.

   ⚠️ LO QUE ESTE TEST CUIDA, por orden de importancia:
   1. Que el mapa DIGA cuántos pedidos del período no tiene cómo dibujar («sin ubicación»),
      y ofrezca ubicarlos por la dirección.
   2. Que ubicar por la dirección guarde la ubicación ADENTRO del pedido (link con
      coordenadas + `aprox=1`), de a uno en el servidor, sin pisar una ubicación existente,
      sin buscar lo que no tiene dirección, y una sola consulta por dirección repetida.
   3. Que lo aproximado se vea como aproximado: en el mapa, para el chofer y en Revisar
      ubicaciones.
   4. Que un Excel de ROHO recién importado quede en el mapa solo.

   Los datos son inventados. Se corre:  node tests/test_ubicar.js   (desde la raíz) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1400,height:1000} });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['ubicables','ubicConsulta','ubicarPorDireccion','ubicarSinLinkMapa','mapaSinLinkList','esUbicAprox','ubicarImportadosRoho']
    .filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel ubica por la dirección escrita (§4dh)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; NO_ENCOLAR={};
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._saves=[]; window._geo=[];
    apiSave=function(rec){ window._saves.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true,pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    /* El servidor de mentira: encuentra lo que diga «Banzer» o «Cusis», el resto no. */
    apiGeocode=function(links){ window._geo.push(links.slice()); return Promise.resolve({ok:true, geo:links.map(function(l){
      if(/Banzer/.test(l)) return {link:l, lat:-17.7512, lng:-63.1634, aprox:true};
      if(/Cusis/.test(l))  return {link:l, lat:-17.7700, lng:-63.1950, aprox:true};
      return {link:l, lat:null, lng:null}; })}); };
    window.confirm=function(){ return true; };
    var man=tomorrowStr();
    var P=function(o){ return Object.assign({id:'p'+Math.random().toString(36).slice(2),fecha:man,oc:'',vendedor:'ROHO',cliente:'C',
      celular:'70000000',turno:'AM',zona:'Norte',direccion:'',maps:'',pagado:true,saldo:0,ts:Date.now(),metodoPago:'',observaciones:'',
      estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[],
      productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}]},o); };
    STATE=[
      P({id:'r1', oc:'R1', direccion:'Av. Banzer 4to anillo, Barrio Las Palmas'}),
      P({id:'r2', oc:'R2', direccion:'Av. Banzer 4to anillo, Barrio Las Palmas'}),            // misma dirección: una consulta
      P({id:'r3', oc:'R3', direccion:'casa 3'}),                                              // no alcanza para buscar
      P({id:'r4', oc:'H4', vendedor:'Carola Chavez', direccion:'Otra', maps:'https://www.google.com/maps?q=-17.78,-63.18'}),   // ya tiene link
      P({id:'r5', oc:'R5', direccion:'Calle Los Cusis 456, Barrio Equipetrol', entregado:true}),   // ya se entregó: no importa
      P({id:'r6', oc:'R6', direccion:'Calle Falsa 123, zona Norte'})                            // el servidor no la encuentra
    ];
    saveMirror(); updateStats();
    MAPA_DIA='todos'; MAPA_MARCA='';
  });

  // ══ 1. El mapa cuenta lo que no puede dibujar ═════════════════════════════
  console.log('\n── 1. «Todos» en el mapa: los de ROHO sin link ahora se cuentan ──');
  let r = await page.evaluate(() => {
    MAPA_LIST=mapaFilteredList(); renderMapaLegend();
    return { dibuja:mapaFilteredList().map(p=>p.id), sinLink:mapaSinLinkList().map(p=>p.id), busc:ubicables(mapaSinLinkList()).map(p=>p.id),
             info:document.getElementById('mapa-info').textContent, btn:document.getElementById('mapa-ubicar').style.display, btnTxt:document.getElementById('mapa-ubicar').textContent,
             consulta:ubicConsulta(STATE.filter(p=>p.id==='r1')[0]), consulta6:ubicConsulta(STATE.filter(p=>p.id==='r6')[0]) };
  });
  chk('el mapa solo dibuja el que tiene link (Carola)', JSON.stringify(r.dibuja)===JSON.stringify(['r4']), r.dibuja.join(','));
  chk('⚠️ pero ahora CUENTA los 4 sin link y sin entregar (el entregado no molesta)', JSON.stringify(r.sinLink)===JSON.stringify(['r1','r2','r3','r6']), r.sinLink.join(','));
  chk('…y lo dice en la barra: «4 sin ubicación»', /4 sin ubicación/.test(r.info), r.info);
  chk('de esos, 3 tienen una dirección que se puede buscar («casa 3» no alcanza)', JSON.stringify(r.busc)===JSON.stringify(['r1','r2','r6']), r.busc.join(','));
  chk('el botón «📍 Ubicar 3 por dirección» aparece', r.btn!=='none' && /Ubicar 3 por dirección/.test(r.btnTxt), r.btnTxt);
  chk('la consulta lleva la zona si la dirección no la dice, y no la repite si ya está',
      r.consulta==='Av. Banzer 4to anillo, Barrio Las Palmas, Norte' && r.consulta6==='Calle Falsa 123, zona Norte', r.consulta+' | '+r.consulta6);

  // ══ 2. Ubicar por la dirección ════════════════════════════════════════════
  console.log('\n── 2. Tocar el botón: el servidor busca, el pedido guarda ──');
  r = await page.evaluate(async () => {
    ubicarSinLinkMapa();
    await new Promise(r=>setTimeout(r,600));
    var by={}; STATE.forEach(function(p){ by[p.id]=p; });
    /* En el panel de verdad el botón vive con el mapa abierto y `mapaRefreshSiActivo` repinta
       la barra; acá el mapa está cerrado (Leaflet viene de internet), así que se repinta a mano. */
    MAPA_LIST=mapaFilteredList(); renderMapaLegend();
    return { consultas:window._geo, saves:window._saves.map(function(s){ return s.id+':'+(s.maps||''); }),
             m1:by.r1.maps, m2:by.r2.maps, m3:by.r3.maps, m4:by.r4.maps, m6:by.r6.maps,
             coords:coordsDeLink(by.r1.maps), cache:MAPA_COORDS[by.r1.maps], dibuja:mapaFilteredList().map(p=>p.id),
             info:document.getElementById('mapa-info').textContent, enCurso:UBIC_EN_CURSO };
  });
  chk('⚠️ UNA consulta al servidor con 2 direcciones distintas (la repetida va una sola vez)',
      r.consultas.length===1 && r.consultas[0].length===2 && /Banzer/.test(r.consultas[0][0]) && /Falsa/.test(r.consultas[0][1]), JSON.stringify(r.consultas));
  chk('⚠️ r1 y r2 quedan con link de coordenadas y la marca aprox=1', /maps\?q=-17\.7512,-63\.1634&aprox=1$/.test(r.m1) && r.m2===r.m1, r.m1);
  chk('…el link se lee solo (sin servidor) y la caché lo sabe aproximado', r.coords && Math.abs(r.coords.lat+17.7512)<1e-6 && r.cache && r.cache.aprox===true, JSON.stringify(r.coords));
  chk('⚠️ el que ya tenía link NO se pisa', r.m4==='https://www.google.com/maps?q=-17.78,-63.18', r.m4);
  chk('«casa 3» no se busca y «Calle Falsa» queda sin ubicar', r.m3==='' && r.m6==='', r.m3+'|'+r.m6);
  chk('⚠️ se guardan en el servidor SOLO los 2 ubicados, de a uno', JSON.stringify(r.saves)===JSON.stringify(['r1:'+r.m1,'r2:'+r.m1]), r.saves.join(' / '));
  chk('…y ahora el mapa los dibuja', JSON.stringify(r.dibuja.sort())===JSON.stringify(['r1','r2','r4']), r.dibuja.join(','));
  chk('la barra baja a «2 sin ubicación» y el trabajo terminó', /2 sin ubicación/.test(r.info) && r.enCurso===false, r.info);

  // ══ 3. Lo aproximado se ve como aproximado ════════════════════════════════
  console.log('\n── 3. Aproximado quiere decir aproximado ──');
  r = await page.evaluate(() => {
    var by={}; STATE.forEach(function(p){ by[p.id]=p; });
    var pop=mapaPopup(by.r1), popH=mapaPopup(by.r4);
    renderRevUbic(false);
    var rev=(document.getElementById('rev-ubic-panel')||{}).textContent||'';
    closeModal();
    return { pop:pop, popH:popH, rev:rev.replace(/\s+/g,' '), esA:esUbicAprox(by.r1.maps), esH:esUbicAprox(by.r4.maps) };
  });
  chk('el globo del mapa avisa «≈ aproximada, por la dirección escrita»', /≈ aproximada, por la dirección escrita/.test(r.pop) && r.esA===true, r.pop.slice(-90));
  chk('…y el pin exacto de Carola no lleva el aviso', !/aproximada/.test(r.popH) && r.esH===false);
  chk('📍 Revisar ubicaciones los lista aparte: «≈ 2 ubicados por la dirección escrita»', /≈ 2 ubicados por la dirección escrita/.test(r.rev), (r.rev.match(/≈[^.]*/)||[''])[0].slice(0,80));
  chk('…y ofrece ubicar el que falta y tiene dirección (Calle Falsa)', /Ubicar por la dirección el 1 que la tiene/.test(r.rev), (r.rev.match(/Ubicar por la dirección[^.]*/)||[''])[0]);

  // ══ 4. Un Excel de ROHO recién importado queda en el mapa solo ════════════
  console.log('\n── 4. Importar de ROHO y que aparezca en el mapa sin cargar nada ──');
  r = await page.evaluate(async () => {
    STATE=[]; saveMirror(); window._saves=[]; window._geo=[];
    var man=tomorrowStr(), lista=[
      { oc:'N1', fecha:man, cliente:'Cliente uno', celular:'70000000', direccion:'Calle Los Cusis 456, Barrio Equipetrol', zona:'Norte', nit:'', pagado:true, obs:'', combos:0, productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] },
      { oc:'N2', fecha:man, cliente:'Cliente dos', celular:'70000001', direccion:'Calle Falsa 123', zona:'Sur', nit:'', pagado:true, obs:'', combos:0, productos:[{desc:'COLCHON',medida:'140x190',codigo:'',cant:1}] } ];
    ROHO_IMP={nuevos:lista, viejos:[], yaEstan:[], sinFecha:[], malos:[], filas:2};
    ROHO_TURNO='AM'; ROHO_VIEJOS=false;
    confirmarImportRoho();
    await new Promise(r=>setTimeout(r,1500));
    var by={}; STATE.forEach(function(p){ by[p.oc]=p; });
    return { m1:(by.N1||{}).maps||'', m2:(by.N2||{}).maps||'', geo:window._geo.length, caja:(document.getElementById('roho-geo')||{}).textContent||'',
             saves:window._saves.map(function(s){ return s.oc+':'+(s.maps?'con link':'sin link'); }) };
  });
  chk('⚠️ el importado con dirección conocida queda con ubicación aproximada, solo', /aprox=1$/.test(r.m1) && r.geo===1, r.m1);
  chk('el que el servidor no encuentra queda sin link (y se avisa)', r.m2==='' && /Sin ubicar: N2/.test(r.caja), r.caja.slice(0,160));
  chk('el panel del importador cuenta el resultado: «1 de 2 quedaron en el mapa»', /1 de 2/.test(r.caja) && /aproximados/.test(r.caja), r.caja.slice(0,120));
  chk('se guardó primero el pedido y después su ubicación (dos guardadas para N1, una para N2)',
      JSON.stringify(r.saves)===JSON.stringify(['N1:sin link','N2:sin link','N1:con link']), r.saves.join(' / '));

  chk('la página no tiró ningún error de JavaScript', errores.length===0, errores.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
