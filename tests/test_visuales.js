/* ✨ LAS SEIS VISTAS NUEVAS (§4ik, 09/10; dueño: *«todo menos lo de Kommo y Contabilidad y cupos»*).
   Solo miran: se prueba que cada una sale de la cuenta que YA existe (una sola verdad) y que nada se guarda.
     1. 🏬 Los almacenes en 3D: unidades, productos y avisos de cada galpón = stockData; tocar uno ordena la tabla.
     2. 🌡️ El termómetro: la serie día por día es la de stockProyectar (el corte cae el mismo día), con 🚚 donde llega.
     3. 📊 «Qué producir» en gráfico: las barras son el pie «por medida» de cada bloque; se puede ocultar.
     4. 🛣️ El recorrido en el mapa: un camino por chofer, AM antes que PM, ✓ en lo entregado, 🚚 en la última entrega.
     5. 🔥 El mapa de calor semana por semana: las semanas suman las entregas de los 60 días; elegir una dibuja solo esas.
     6. ⭕ Los anillos de Mis pedidos: lo vendido contra el mes pasado, lo entregado y lo cobrado, como las fichas.
     5b. 📈 Barrios que crecen (§4il): por zona, los últimos 30 días contra los 30 de antes, en lista y con flechas en el mapa.
   Reloj clavado en el viernes 09/10/2026 a las 10:00 de Bolivia. Leaflet de mentira que anota lo que se dibuja.
   Se corre:  node tests/test_visuales.js        Dientes:  PEDIDOS=/ruta/a/pedidos_42665bc.html node tests/test_visuales.js
   Capturas:  SHOTS=/carpeta LEAFLET_DIR=/carpeta/con/leaflet.js node tests/test_visuales.js   (Leaflet de verdad, sin mapa de fondo)
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ if(typeof c==='function'){ try{ c=!!c(); }catch(err){ c=false; } } c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const SHOTS = process.env.SHOTS || '', LEAFLET_DIR = process.env.LEAFLET_DIR || '';

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz', deviceScaleFactor:SHOTS?2:1 });
  const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());   // primero: las rutas de después mandan sobre esta
  if(SHOTS && LEAFLET_DIR){
    await page.route(/unpkg\.com\/leaflet@[^/]+\/dist\/leaflet\.(js|css)/, r => { const f=r.request().url().endsWith('.css')?'leaflet.css':'leaflet.js';
      r.fulfill({ path:path.join(LEAFLET_DIR,f), contentType:f.endsWith('css')?'text/css':'application/javascript' }); });
    const tile=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP4/+PbfwAJjAPmOKuUzgAAAABJRU5ErkJggg==','base64');
    await page.route(/tile\.openstreetmap\.org/, r => r.fulfill({ body:tile, contentType:'image/png' }));
  }
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn,arg) => { try{ return await page.evaluate(fn,arg); }catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  await ev((real)=>{
    CONNECTED=true; CARGA_GEN++; CARGA_ESTADO='ok'; if(window.CARGA_TIMER) clearTimeout(CARGA_TIMER); if(window.CARGA_TIC) clearInterval(CARGA_TIC);
    window._guardados=0;
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(rec){ window._guardados++; return Promise.resolve({ ok:true, pedido:rec }); };
    apiGeocode=function(links){ return Promise.resolve({ ok:true, geo:[] }); };
    if(!real){
      /* Leaflet de mentira que ANOTA lo que se dibuja. */
      window._mapa={ lineas:[], marcas:[], circulos:[], quitadas:0 };
      var cosa=function(tipo, ll, o){ var m={ tipo:tipo, ll:ll, o:o||{}, pop:'', addTo:function(){ (tipo==='linea'?window._mapa.lineas:(tipo==='marca'?window._mapa.marcas:window._mapa.circulos)).push(m); return m; },
        bindPopup:function(t){ m.pop=t; return m; }, bindTooltip:function(){ return m; }, setLatLng:function(x){ m.ll=x; return m; }, setStyle:function(){ return m; } }; return m; };
      var capa=function(){ var c={ addTo:function(){ return c; }, clearLayers:function(){ window._mapa.lineas=[]; window._mapa.marcas=[]; window._mapa.circulos=[]; } }; return c; };
      window.L={
        map:function(){ return { invalidateSize:function(){}, fitBounds:function(){}, setView:function(){}, remove:function(){}, removeLayer:function(){ window._mapa.quitadas++; window._mapa.lineas=[]; window._mapa.marcas=[]; } }; },
        tileLayer:function(){ return { addTo:function(){ return this; } }; },
        layerGroup:capa,
        circleMarker:function(ll,o){ return cosa('circulo', ll, o); },
        marker:function(ll,o){ return cosa('marca', ll, o); },
        divIcon:function(o){ return o; },
        polyline:function(ll,o){ return cosa('linea', ll, o); }
      };
      ensureLeaflet=function(cb){ cb(); };
    }
    var hoy=todayStr(), dia=function(n){ return stockSumarDias(hoy, n); };
    var q=function(lat,lng){ return 'https://www.google.com/maps?q='+lat.toFixed(5)+','+lng.toFixed(5); };
    var LOG='PRODUCTOS TERMINADOS FAB.', IM='IM - PRODUCTOTERMINADO', BZ='01-05-025  Almacen Distribucion Banzer';
    var PR={
      semi:{ desc:'ESPECIAL SEMIORTOPEDICO', medida:'140x190', codigo:'CH1107' },
      tit: { desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201' },
      oro: { desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761' },
      eco: { desc:'NUEVO ECO FLEX', medida:'105x190', codigo:'CH1331' },
      mem: { desc:'MEMORY FLEX', medida:'160x190', codigo:'CH2291' },
      ess: { desc:'COLCHON SUEÑA ESSENTIAL', medida:'140x190', codigo:'CC1002' }
    };
    var K={}; Object.keys(PR).forEach(function(n){ K[n]=stockClave(PR[n]); });
    var st={ v:2, pv:3, c:{ f:hoy, hora:'08:30:00', u:{}, solo0:true, alm:LOG, cod:{}, t:Date.now()-3600000 }, e:[], p:[], a:{}, g:{}, al:{}, h:[], det:[], sm:[] };
    st.g[IM]={ f:hoy, hora:'08:00:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.g[BZ]={ f:hoy, hora:'08:10:00', u:{}, solo0:true, cod:{}, t:Date.now()-3600000, rs:{} };
    st.al[LOG]='log'; st.al[IM]='trae'; st.al[BZ]='sale';
    var ptf={ semi:0, tit:6, oro:20, eco:3, mem:0, ess:5 }, bz={ semi:4, tit:2, oro:5 }, im={ semi:2, mem:8, oro:10 };
    Object.keys(ptf).forEach(function(n){ st.c.u[K[n]]=ptf[n]; });
    Object.keys(bz).forEach(function(n){ st.g[BZ].u[K[n]]=bz[n]; });
    Object.keys(im).forEach(function(n){ st.g[IM].u[K[n]]=im[n]; });
    st.p.push({ id:'fp1', k:K.tit, u:10, fab:'MORENO', f:dia(-1), esp:'', r:'', tipo:'fabrica' });   // 🚚 llega en unos días
    /* Números del azar, pero siempre los mismos. */
    var semilla=7, azar=function(){ semilla=(semilla*16807)%2147483647; return semilla/2147483647; };
    var n=0, P=function(o){ n++; return Object.assign({ id:'v'+n, oc:'10-'+(100+n), vendedor:'Maria Flores', cliente:'CLIENTE '+n, celular:'7000'+(1000+n),
      turno:'AM', zona:'Norte', direccion:'Calle '+n, maps:'', pagado:true, saldo:0, ts:Date.now()-n*60000, metodoPago:'', observaciones:'', estado:'',
      entregado:false, vehiculo:'', chofer:'', garantia:'', nota:String(500+n), acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o); };
    var L=[], zonas=['Norte','Equipetrol','Plan 3000','Villa 1ro de Mayo','Urbari','Centro'];
    /* Entregas de los últimos 56 días por toda la ciudad (dan el ritmo y el mapa de calor). */
    var rot=['semi','semi','tit','tit','eco','oro','ess','semi','tit','eco'];
    for(var i=0;i<70;i++){
      var d=-(1+Math.floor(i*55/70)), lat=-17.78+(azar()-0.5)*0.14, lng=-63.18+(azar()-0.5)*0.14;
      L.push(P({ fecha:dia(d), entregado:true, zona:zonas[i%zonas.length], maps:q(lat,lng), productos:[Object.assign({ cant:1 }, PR[rot[i%rot.length]])] }));
    }
    /* 📈 (§4il) Una zona que crece (Urubó: 1 entrega hace 40 días, 6 en los últimos 30) y una que baja (Pampa: 6 antes, 1 ahora).
       Fuera de los 15 días de la rotación, para no mover el ritmo de ningún producto. */
    [-40,-16,-18,-20,-22,-24,-26].forEach(function(d,j){ L.push(P({ fecha:dia(d), entregado:true, zona:'Urubó', maps:q(-17.765+j*0.002,-63.245), productos:[Object.assign({ cant:1 }, PR.oro)] })); });
    [-31,-35,-39,-43,-47,-51,-20].forEach(function(d,j){ L.push(P({ fecha:dia(d), entregado:true, zona:'Pampa de la Isla', maps:q(-17.765+j*0.002,-63.105), productos:[Object.assign({ cant:1 }, PR.oro)] })); });
    /* Lo vendido y sin entregar: 9 SEMI de mañana a la semana que viene, y otros. */
    [1,2,3,4,5,6,7,8,9].forEach(function(dd){ L.push(P({ fecha:dia(dd), productos:[Object.assign({ cant:1 }, PR.semi)] })); });
    [2,3,5].forEach(function(dd){ L.push(P({ fecha:dia(dd), productos:[Object.assign({ cant:2 }, PR.eco)] })); });
    /* 🛣️ Hoy: dos camiones. Luis Pierre ya entregó 2 de 5; Cristhian, 0 de 3 (uno de la tarde). */
    var R=[ ['Luis Pierre','Carry',[[-17.760,-63.150,'AM',true],[-17.770,-63.165,'AM',true],[-17.785,-63.175,'AM',false],[-17.800,-63.170,'PM',false],[-17.775,-63.190,'AM',false]]],
            ['Cristhian','Foton encarpado',[[-17.720,-63.165,'AM',false],[-17.705,-63.180,'PM',false],[-17.735,-63.200,'AM',false]]] ];
    R.forEach(function(r){ r[2].forEach(function(s,j){ L.push(P({ fecha:hoy, chofer:r[0], vehiculo:r[1], turno:s[2], entregado:s[3], cliente:r[0].split(' ')[0].toUpperCase()+' '+(j+1),
      maps:q(s[0],s[1]), productos:[Object.assign({ cant:1 }, PR.oro)] })); }); });
    /* ⭕ Mis pedidos de Carola Chavez: octubre (por entregar, con saldo) y septiembre entero. */
    var C=function(o){ return P(Object.assign({ vendedor:'Carola Chavez', zona:'Centro' }, o)); };
    L.push(C({ fecha:dia(-5), entregado:false, pagado:true, saldo:0, acuenta:3000, productos:[Object.assign({ cant:1 }, PR.oro)] }));
    L.push(C({ fecha:dia(-2), entregado:true, pagado:false, saldo:1500, acuenta:2500, productos:[Object.assign({ cant:1 }, PR.tit)] }));
    L.push(C({ fecha:dia(3), pagado:false, saldo:2000, acuenta:1000, productos:[Object.assign({ cant:1 }, PR.semi)] }));
    L.push(C({ fecha:dia(10), pagado:false, saldo:4000, acuenta:0, productos:[Object.assign({ cant:1 }, PR.ess)] }));
    L.push(C({ oc:'ATC 10-001', fecha:dia(1), pagado:false, saldo:0, productos:[Object.assign({ cant:1 }, PR.oro)] }));   // la ATC no es venta
    L.push(C({ fecha:'2026-09-10', entregado:true, pagado:true, saldo:0, acuenta:6000, productos:[Object.assign({ cant:1 }, PR.oro)] }));
    L.push(C({ fecha:'2026-09-25', entregado:true, pagado:true, saldo:0, acuenta:9000, productos:[Object.assign({ cant:1 }, PR.tit)] }));
    STATE=L; STOCK=st; STOCK_CARGADO=true; if(typeof stockOlvidarIndice==='function') stockOlvidarIndice();
    window._K=K;
    try{ localStorage.removeItem('me_vis_4ik'); }catch(e){}
  }, !!(SHOTS && LEAFLET_DIR));

  const abrirStock = async () => { await ev(()=>{ abrirStock(); }); await page.waitForTimeout(250); };
  await abrirStock();

  console.log('\n── 1. 🏬 Los almacenes en 3D ──');
  let r = await ev(()=>{
    var d=stockData(), G=stockGalponesDatos(d);
    var ptf=0, sale=0, trae=0, al=0; d.lista.forEach(function(o){ if(o.deposito!=null) ptf+=Math.max(0,o.deposito); sale+=o.enSale||0; trae+=o.enOtros||0; if(o.aviso==='urgente'||o.aviso==='pedir') al++; });
    var caja=document.getElementById('vis-galp');
    return { G:G.map(function(g){ return { id:g.id, nombre:g.nombre, u:g.u, n:g.n, al:g.alerta.length }; }), ptf:ptf, sale:sale, trae:trae, al:al,
      enPantalla:!!caja, botones:caja?caja.querySelectorAll('.galp').length:0, llenos:caja?caja.querySelectorAll('.galp[data-galp="ptf"] .galp-est span.lleno').length:0,
      texto:caja?caja.innerText.replace(/\s+/g,' ').slice(0,400):'' };
  });
  chk('tres galpones: PTF, Banzer y Moreno, en la pantalla de Stock', ()=>(r.enPantalla && r.botones===3 && r.G.map(g=>g.id).join()==='ptf,sale,trae'), r.G);
  chk('las unidades de cada galpón son las de stockData (PTF 32 = 34 del Excel − 2 ya entregadas hoy · Banzer 11 · Moreno 20)', ()=>(r.G[0].u===r.ptf && r.G[1].u===r.sale && r.G[2].u===r.trae && r.ptf===32 && r.sale===11 && r.trae===20), r);
  chk('el aviso de PTF cuenta los que se acaban antes de que llegue la fábrica (urgente o pedir)', ()=>(r.G[0].al===r.al && r.al>0), r);
  chk('el galpón más lleno (Moreno no: PTF con 34) llena más estantes', ()=>(r.llenos===40), r.llenos);
  r = await ev(()=>{ stockGalponTocar('sale'); return { orden:STOCK_FILTRO.orden, dir:STOCK_FILTRO.dir, tabla:!!document.getElementById('stk-tabla-caja') }; });
  chk('tocar Banzer ordena la tabla por lo que hay en Banzer, de mayor a menor', ()=>(r.orden==='sale' && r.dir===-1 && r.tabla), r);
  await ev(()=>{ stockFiltroLimpiar(); });

  console.log('\n── 2. 🌡️ El termómetro se sacó (§4iq, dueño: «esto no se entiende bien… quítalo»); la cuenta día por día queda ──');
  r = await ev(()=>{
    var o=stockData().lista.filter(function(x){ return x.k===_K.semi; })[0];
    var S=[]; S.H=14; stockProyectar(o, S);
    var primero=S.filter(function(x){ return x.saldo< -1e-9; })[0], solo=stockProyectar(o);
    abrirStockPedidos(_K.semi); var det=!!document.querySelector('.termo-detalle'); closeModal();
    return { n:S.length, corte:o.corte, primero:primero&&primero.d, soloCorte:solo.corte, soloDias:solo.dias, dias:o.dias, hoy0:S[0].saldo, saldoHoy:o.saldoHoy,
      filas:document.querySelectorAll('#vis-galp .termo-fila, #vis-galp .termo-caja').length, det:det, fn:typeof window.stockTermometrosHtml };
  });
  chk('⚠️ ya no está «Los que se terminan» en los almacenes, ni el gráfico en el detalle de un producto', ()=>(r.filas===0 && !r.det && r.fn==='undefined'), r);
  chk('la cuenta día por día (`stockProyectar` con su serie) sigue: 15 días y el primer día en rojo es el corte de la tabla', ()=>(r.n===15 && r.primero===r.corte && r.corte==='2026-10-12'), r);
  chk('sin serie, stockProyectar da lo mismo (no cambió la cuenta)', ()=>(!r.__error && r.soloCorte===r.corte && r.soloDias===r.dias && r.hoy0===r.saldoHoy), r);

  console.log('\n── 3. 📊 «Qué producir» en gráfico ──');
  r = await ev(()=>{
    var R=stockProducir(stockData()), out=[];
    R.bloques.forEach(function(B){
      var meds=Object.keys(B.medidas).filter(function(md){ var M=B.medidas[md]; return (M.sem||0)+(M.quin||0)+(M.mes||0)>0; });
      if(meds.length) out.push({ k:B.k, meds:meds.map(function(md){ var M=B.medidas[md]; return md+':'+(M.sem||0)+'/'+(M.quin||0)+'/'+(M.mes||0); }) });
    });
    var svgs=[].map.call(document.querySelectorAll('#producir .qp-svg'), function(s){
      return [].map.call(s.querySelectorAll('text'), function(t){ return t.textContent; }).join('|'); });
    return { out:out, svgs:svgs };
  });
  var bien = ()=> r.out.length>0 && r.out.length===r.svgs.length && r.out.every(function(b,i){ return b.meds.every(function(m){
    var md=m.split(':')[0], v=m.split(':')[1].split('/'); return r.svgs[i].indexOf(md)>=0 && v.every(function(x){ return x==='0' || r.svgs[i].split('|').indexOf(x)>=0; }); }); });
  chk('un gráfico por bloque con algo que producir, con las medidas y los números del pie «por medida»', bien, r);
  r = await ev(()=>{ producirGrafToggle(); var n1=document.querySelectorAll('#producir .qp-svg').length; producirGrafToggle(); var n2=document.querySelectorAll('#producir .qp-svg').length; return { n1:n1, n2:n2 }; });
  chk('«📊 Ocultar gráfico» lo saca y vuelve a ponerlo', ()=>(r.n1===0 && r.n2>0), r);
  if(SHOTS){
    await page.setViewportSize({ width:1180, height:820 });
    await ev(()=>{ var c=document.getElementById('vis-galp'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(1600);
    await page.screenshot({ path:path.join(SHOTS,'v1_galpones.png') });
    await ev(()=>{ var c=document.querySelector('#producir .qp-graf'); if(c) c.scrollIntoView({block:'center'}); }); await page.waitForTimeout(1300);
    await page.screenshot({ path:path.join(SHOTS,'v3_producir.png') });
    await page.setViewportSize({ width:390, height:844 });
    await ev(()=>{ var c=document.getElementById('vis-galp'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(900);
    await page.screenshot({ path:path.join(SHOTS,'v1_galpones_cel.png') });
    await page.setViewportSize({ width:1180, height:820 });
  }
  await ev(()=>{ var ov=document.getElementById('stock-overlay'); if(ov) ov.style.display='none'; });

  console.log('\n── 4. 🛣️ El recorrido del día en el mapa ──');
  await ev(()=>{ MAPA_COLOR_POR='chofer'; setMapaDia('hoy'); });
  await page.waitForTimeout(SHOTS?1500:300);
  r = await ev(()=>{
    var D=mapaRutaDatos().filter(function(x){ return !x.sin; });
    var panel=document.getElementById('mapa-ruta-panel');
    var res={ camiones:D.map(function(x){ return x.k+':'+x.stops.length+':'+x.hechos; }),
      ordenTurnos:D.map(function(x){ return x.stops.map(function(it){ return it.p.turno; }).join(''); }),
      panel:panel?panel.innerText.replace(/\s+/g,' '):'', visible:panel&&panel.style.display==='block' };
    if(window._mapa){
      res.lineas=window._mapa.lineas.filter(function(l){ return l.o.className==='mapa-ruta-linea'; }).map(function(l){ return l.ll.length; });
      var nums=window._mapa.marcas.filter(function(m){ return m.o.icon && m.o.icon.className==='mapa-ruta-num'; });
      res.tildes=nums.filter(function(m){ return /✓/.test(m.o.icon.html); }).length; res.nums=nums.length;
      var cam=window._mapa.marcas.filter(function(m){ return m.o.icon && m.o.icon.className==='mapa-ruta-camion'; });
      var luis=D.filter(function(x){ return x.k==='Luis Pierre'; })[0], ult=luis.stops.filter(function(it){ return it.p.entregado; }).pop();
      res.camionEnLuis=cam.some(function(m){ return Math.abs(m.ll[0]-ult.g.lat)<1e-9 && Math.abs(m.ll[1]-ult.g.lng)<1e-9; });
      var P=almUbic('ptf'); res.camionEnPtf=cam.some(function(m){ return Math.abs(m.ll[0]-P.lat)<1e-9 && Math.abs(m.ll[1]-P.lng)<1e-9; });
      res.desdePtf=window._mapa.lineas.filter(function(l){ return l.o.className==='mapa-ruta-linea'; }).every(function(l){ return Math.abs(l.ll[0][0]-P.lat)<1e-9; });
    }
    return res;
  });
  chk('un recorrido por camión: Luis Pierre 5 paradas (2 entregadas) y Cristhian 3', ()=>(r.camiones.join()==='Cristhian:3:0,Luis Pierre:5:2'), r.camiones);
  chk('el orden pone la mañana antes que la tarde', ()=>(r.ordenTurnos.every(function(t){ return /^A*P*$/.test(t.replace(/M/g,'')); })), r.ordenTurnos);
  chk('el panel dice cuántas van y cuál es la próxima', ()=>(r.visible && /2 de 5 entregados/.test(r.panel) && /0 de 3 entregados/.test(r.panel) && /próxima:/.test(r.panel)), String(r.panel||r.__error||'').slice(0,300));
  if(!SHOTS){
    chk('se dibujan dos caminos que salen de PTF, con las 8 paradas numeradas y 2 ✓', ()=>(r.lineas.join()==='4,6' && r.desdePtf && r.nums===8 && r.tildes===2), r);
    chk('🚚 Luis en su última entrega; 🚚 Cristhian todavía en PTF', ()=>(r.camionEnLuis && r.camionEnPtf), r);
  }
  if(SHOTS){ await page.waitForTimeout(1200); await page.screenshot({ path:path.join(SHOTS,'v4_recorrido.png') }); }
  r = await ev(()=>{ setMapaDia('mes'); var p=document.getElementById('mapa-ruta-panel'); return { vis:p.style.display, raf:MAPA_RUTA_RAF }; });
  chk('en «Mes» no hay recorrido (es de un día)', ()=>(r.vis==='none' && !r.raf), r);
  r = await ev(()=>{ MAPA_RUTA=false; toggleMapaRuta(); var p=document.getElementById('mapa-ruta-panel'); return { dia:MAPA_DIA, vis:p.style.display }; });
  chk('tocar «🛣️ Recorrido» desde «Mes» pasa a Hoy y lo dibuja', ()=>(r.dia==='hoy' && r.vis==='block'), r);
  r = await ev(()=>{ closeMapa(); return { raf:MAPA_RUTA_RAF, anim:MAPA_RUTA_ANIM.length }; });
  chk('al cerrar el mapa se para la animación', ()=>(!r.raf && r.anim===0), r);

  console.log('\n── 5. 🔥 El mapa de calor semana por semana ──');
  await ev(()=>{ abrirAlm(); }); await page.waitForTimeout(SHOTS?1500:300);
  r = await ev(()=>{
    var A=ALM_DATA, S=almSemanas(A), tot=S.reduce(function(a,s){ return a+s.n; },0);
    var hoyEn=A.puntos.filter(function(q){ return q.f>=A.desde && q.f<=A.hoy; }).length;
    return { n:S.length, tot:tot, puntos:A.puntos.length, hoyEn:hoyEn, ult:S[S.length-1].hasta, prim:S[0].desde, desde:A.desde,
      barras:document.querySelectorAll('#alm-sem .alm-sem-barras button').length, txt:(document.getElementById('alm-sem')||{}).innerText||'' };
  });
  chk('9 semanas que cubren los 60 días, de la más vieja a la de hoy', ()=>(r.n===9 && r.ult==='2026-10-09' && r.prim===r.desde && r.barras===10), r);
  chk('las semanas suman todas las entregas con pin de la ventana', ()=>(r.tot===r.hoyEn && r.tot>0), r);
  r = await ev(()=>{
    var S=almSemanas(ALM_DATA), i=S.length-2; almSemVer(i);
    var dib=window._mapa ? window._mapa.circulos.filter(function(c){ return c.o.radius===4; }).length : -1;
    var t=document.getElementById('alm-sem').innerText.replace(/\s+/g,' ');
    return { esperado:S[i].n, dib:dib, t:t, on:document.querySelectorAll('#alm-sem .alm-sem-barras button.on').length };
  });
  if(!SHOTS) chk('elegir una semana dibuja solo sus entregas', ()=>(r.dib===r.esperado && r.esperado>0), r);
  chk('y dice las fechas, cuántas entregas y el reparto PTF / Banzer', ()=>(/Semana del/.test(r.t) && /% PTF/.test(r.t) && /% Banzer/.test(r.t) && r.on===1), r.t);
  r = await ev(()=>{ almSemPlay(); var a=ALM_SEM, t=!!ALM_SEM_TIMER; cerrarAlm(); return { a:a, t:t, t2:!!ALM_SEM_TIMER }; });
  chk('▶ arranca por la primera semana, y cerrar la pantalla lo para', ()=>(r.a===0 && r.t && !r.t2), r);
  if(SHOTS){ await ev(()=>{ abrirAlm(); almSemVer(6); var c=document.getElementById('alm-mapa-caja'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(1500); await page.screenshot({ path:path.join(SHOTS,'v5_calor.png') }); await ev(()=>{ cerrarAlm(); }); }
  await ev(()=>{ ALM_SEM=-1; });

  console.log('\n── 5b. 📈 Barrios que crecen ──');
  await ev(()=>{ abrirAlm(); }); await page.waitForTimeout(SHOTS?1500:300);
  r = await ev(()=>{
    var T=almTendencias(ALM_DATA), u=T.filter(function(z){ return z.nombre==='Urubó'; })[0], pa=T.filter(function(z){ return z.nombre==='Pampa de la Isla'; })[0];
    var caja=document.getElementById('alm-tend-caja'), filas=caja?[].map.call(caja.querySelectorAll('.alm-tend-fila'), function(f){ return f.innerText.replace(/\s+/g,' '); }):[];
    var fl=window._mapa ? window._mapa.marcas.filter(function(m){ return m.o.icon && /alm-tend-flecha/.test(m.o.icon.className||''); }).map(function(m){ return m.o.icon.html; }) : null;
    return { u:u&&{ n0:u.n0, n1:u.n1, tipo:u.tipo, pct:u.pct }, pa:pa&&{ n0:pa.n0, n1:pa.n1, tipo:pa.tipo }, primero:T[0].nombre, filas:filas, fl:fl };
  });
  chk('Urubó crece: 1 entrega en los 30 días de antes y 6 en los últimos 30 (+500 %)', ()=>(r.u.n0===1 && r.u.n1===6 && r.u.tipo==='crece' && r.u.pct===500), r.u);
  chk('Pampa de la Isla baja: 6 → 1', ()=>(r.pa.n0===6 && r.pa.n1===1 && r.pa.tipo==='baja'), r.pa);
  chk('las que crecen van primero (de la que más entregas sumó a la que menos) y Urubó dice «1 → 6 ▲ +500%»', ()=>{ var iU=r.filas.findIndex(function(f){ return /Urubó/.test(f); }), iP=r.filas.findIndex(function(f){ return /Pampa/.test(f); });
    return iU>=0 && iP>iU && /1 → 6/.test(r.filas[iU]) && /▲ \+500%/.test(r.filas[iU]) && /▼/.test(r.filas[iP]) && r.filas.slice(0,iU).every(function(f){ return /▲/.test(f); }); }, r.filas);
  if(!SHOTS) chk('en el mapa («Todas») van las flechas: ▲ Urubó y ▼ Pampa entre ellas', ()=>(r.fl.length>=2 && r.fl.some(function(h){ return /▲ Urubó/.test(h); }) && r.fl.some(function(h){ return /▼ Pampa/.test(h); })), r.fl);
  if(SHOTS){ await ev(()=>{ var c=document.getElementById('alm-mapa-caja'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(1200); await page.screenshot({ path:path.join(SHOTS,'v7_barrios_mapa.png') });
    await ev(()=>{ var c=document.getElementById('alm-tend-caja'); if(c) c.scrollIntoView(); }); await page.waitForTimeout(600); await page.screenshot({ path:path.join(SHOTS,'v7_barrios_lista.png') }); }
  r = await ev(()=>{ almSemVer(3); var n=window._mapa ? window._mapa.marcas.filter(function(m){ return m.o.icon && /alm-tend-flecha/.test(m.o.icon.className||''); }).length : -1; almSemVer(-1); cerrarAlm(); return n; });
  if(!SHOTS) chk('mirando una sola semana no hay flechas (la tendencia es de los 60 días)', r===0, r);

  console.log('\n── 6. ⭕ Los anillos de Mis pedidos ──');
  r = await ev(()=>{
    showView('mis'); var mv=document.getElementById('mis-vendedor'); mv.value='Carola Chavez'; renderMis();
    var R=misAnilloDatos(STATE.filter(function(p){ return mismoVendedor(p.vendedor,'Carola Chavez'); }));
    var a=document.getElementById('mis-anillo');
    return { R:R, arcos:a?a.querySelectorAll('.mis-ani-arco').length:0, t:a?a.innerText.replace(/\s+/g,' '):'' };
  });
  chk('lo vendido para octubre = sus 4 ventas del mes (sin la ATC): 3000 + 4000 + 3000 + 4000', ()=>(r.R.bs===14000 && r.R.n===4), r.R);
  chk('septiembre entero: 15000 → 93 %', ()=>(r.R.bsAnt===15000 && /93% de septiembre/.test(r.t)), String(r.t||r.__error||'').slice(0,200));
  chk('entregados: los 2 de fecha pasada', ()=>(r.R.ent===2 && /2 de 4/.test(r.t)), r.R);
  chk('falta cobrar = la suma de los saldos (1500 + 2000 + 4000), como la ficha «Por cobrar»', ()=>(r.R.cobrar===7500 && r.arcos===3), r.R);
  if(SHOTS){
    await page.setViewportSize({ width:390, height:844 }); await ev(()=>{ VIS_FIRMAS={}; renderMis(); var a=document.getElementById('mis-metrics'); if(a) a.scrollIntoView(); }); await page.waitForTimeout(1400);
    await page.screenshot({ path:path.join(SHOTS,'v6_anillos_cel.png') });
    await page.setViewportSize({ width:1180, height:820 });
  }
  r = await ev(()=>{ document.getElementById('mis-vendedor').value='Isabel Robledo'; renderMis(); return document.getElementById('mis-anillo').innerHTML; });
  chk('una vendedora sin ventas en estos dos meses no ve anillos vacíos', r==='', String(r&&r.__error||r).slice(0,120));

  console.log('\n── 7. Solo miran ──');
  r = await ev(()=>window._guardados);
  chk('ninguna de las seis guardó nada en la planilla', ()=>(r===0), r);
  chk('ningún error de JavaScript', ()=>(errores.length===0), errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close(); process.exit(FAIL?1:0);
})();
