/* 🗺️ DÓNDE SE VENDE (13/11/2026, mejora 207; dueño: «mapa por barrio para la publicidad»).

   Contabilidad → Proyección → «🗺️ Dónde se vende»: lo vendido por zona y por marca, en el mapa y en una lista, para decidir a qué zonas
   apuntar la publicidad de Facebook e Instagram. LO QUE ESTA PRUEBA CUIDA:
   1. Solo con la contraseña: sin ella el botón no se ve (la pestaña Proyección no está) y abrirla por código no hace nada.
   2. Las sumas = la Proyección: para este mes, el mes pasado y los últimos 3 meses, y para Todas, Heaven y Sueña, la suma de todas las filas
      (zonas + «vendidas en tienda» + «sin zona») da lo «vendido» y la cantidad de ventas de `proyeccionMes`. Sin ATC, RPT ni ROHO; los
      mayoristas (Eduardo) aparte, fuera del total y del mapa.
   3. Las zonas escritas distinto se juntan («Norte», «norte», «NORTE ») con la escritura que más se usa; sin zona escrita y con pin, la de los
      pedidos de al lado (`zonaCercaDe`) o hacia dónde queda de la plaza; la venta de tienda en su fila aparte; sin zona ni pin, «Sin zona».
   4. La comparación: este mes contra octubre A ESTA ALTURA (los mismos días hábiles, `pryCorteAltura`; el total del período anterior es el
      de «📊 A esta altura»); el mes pasado contra el anterior entero; sin datos de antes de agosto, sin comparación.
   5. El mapa (Leaflet de mentira que anota): un círculo por zona con pin, en el promedio de sus pines; sin pines en el período, en el centro
      conocido de la zona; sin ninguno, solo en la lista. Tamaño por lo vendido, color de la marca que más vende. Tocar una zona (en la lista o
      en el mapa) la resalta, muestra sus ventas y cada venta abre su ficha.
   6. «📋 Copiar para la publicidad»: las 5 zonas que más venden por marca y las que bajaron, «(−60 % vs octubre)».
   7. Sin internet (sin Leaflet) queda la lista sola, sin errores. Escape cierra. Solo mira: no guarda nada.
   8. En el iPad parado (820) y en el celular (390) no se corre de costado.

   Datos INVENTADOS (el repo es público). Reloj clavado: jueves 12/11/2026 a las 10:00 de Bolivia (9 días hábiles: el 2 fue Todos Santos).
   Se corre:  node tests/test_mapa_ventas.js   (desde la raíz del repo, con las variables de proxy de `correr.sh`) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=false; CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  try{ cargaBanner(); }catch(e){}
  loadFromServer=function(){};
  window._saves=[];
  apiSave=function(rec){ window._saves.push(rec); return Promise.resolve({ ok:true, pedido:rec }); };
  apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
  window._abrio=[]; showContaModal=function(id){ window._abrio.push(id); };
  window._copia=''; copyText=function(t){ window._copia=t; };
  /* Leaflet de mentira que ANOTA lo que se dibuja (sin internet en la prueba). */
  window.FAKE_L=function(){
    window._mapa={ circ:[], enc:0, pan:0 };
    var capa=function(){ return { addTo:function(){ return this; }, clearLayers:function(){ window._mapa.circ=[]; } }; };
    window.L={
      map:function(){ return { invalidateSize:function(){}, fitBounds:function(){ window._mapa.enc++; }, setView:function(){ window._mapa.enc++; }, panTo:function(){ window._mapa.pan++; }, remove:function(){} }; },
      tileLayer:function(){ return { addTo:function(){ return this; } }; },
      layerGroup:capa,
      circleMarker:function(ll, o){ var m={ ll:ll, o:o||{}, tip:'', tipO:null, clic:null,
        bindTooltip:function(t, oo){ m.tip=t; m.tipO=oo||{}; return m; }, bindPopup:function(){ return m; },
        on:function(ev, f){ if(ev==='click') m.clic=f; return m; },
        addTo:function(){ window._mapa.circ.push(m); return m; } }; return m; }
    };
  };
  FAKE_L();
  var n=0;
  var q=function(lat, lng, aprox){ return 'https://www.google.com/maps?q='+lat+','+lng+(aprox ? '&aprox=1' : ''); };
  /* Una venta: `fecha` la entrega agendada, `reg` el día en que se cargó (09:00 de Bolivia). */
  window.V=function(vend, fecha, reg, bs, o){
    o=o||{}; n++;
    return { id:'p'+n, oc:o.oc||((fecha||reg).slice(5,7)+'-'+(100+n)), nota:String(500+n), vendedor:vend, cliente:o.cliente||('CLIENTE '+n), fecha:fecha, turno:fecha?'AM':'',
             zona:(o.zona==null ? '' : o.zona), direccion:o.direccion||('Calle '+n), maps:o.maps||'', productos:[{desc:'COLCHON',medida:'140x190',cant:1}],
             saldo:bs, acuenta:0, pagado:false, metodoPago:'', entregado:false, ts:new Date(reg+'T09:00:00-04:00').getTime(), fotos:[] };
  };
  window.PIN={ N1:[-17.735,-63.175], N2:[-17.737,-63.178], N3:[-17.733,-63.172], N4:[-17.736,-63.174],
               E1:[-17.7850,-63.1400], E2:[-17.7860,-63.1410], E3:[-17.7855,-63.1395], E4:[-17.7853,-63.1403],
               C1:[-17.7840,-63.1830], Q1:[-17.7650,-63.1970], S1:[-17.8300,-63.1800], P3:[-17.7900,-63.1000] };
  window.FIX=function(){
    var P=window.PIN, o=[];
    /* ── NOVIEMBRE (hoy, jueves 12/11) ── */
    o.push(V('Maria Flores',   '2026-11-05','2026-11-04',10000,{ zona:'Norte',  maps:q(P.N1[0],P.N1[1]) }));          // p1  Heaven
    o.push(V('Carola Chavez',  '2026-11-06','2026-11-05', 8000,{ zona:'norte',  maps:q(P.N2[0],P.N2[1]) }));          // p2  Heaven, en minúsculas
    o.push(V('Isabel Robledo', '2026-11-20','2026-11-10', 6000,{ zona:'NORTE ', maps:q(P.N3[0],P.N3[1], true) }));    // p3  Heaven, aproximada, agendada
    o.push(V('Mauricio Merida','2026-11-09','2026-11-06', 5000,{ zona:'Norte' }));                                     // p4  Sueña, sin pin
    o.push(V('Mauricio Merida','2026-11-04','2026-11-03',12000,{ zona:'Este',   maps:q(P.E1[0],P.E1[1]) }));          // p5  Sueña
    o.push(V('Fernando Peinado','2026-11-10','2026-11-09',9000,{ zona:'Este',   maps:q(P.E2[0],P.E2[1]) }));          // p6  Sueña
    o.push(V('Maria Flores',   '2026-11-11','2026-11-10', 4000,{ zona:'Este',   maps:q(P.E3[0],P.E3[1]) }));          // p7  Heaven
    o.push(V('Fernando Peinado','2026-11-12','2026-11-11',3000,{ zona:'',       maps:q(P.E4[0],P.E4[1]) }));          // p8  Sueña, sin zona: los de al lado son «Este»
    o.push(V('Carola Chavez',  '2026-11-06','2026-11-05', 7000,{ zona:'',       maps:q(P.C1[0],P.C1[1]) }));          // p9  Heaven, sin zona, al lado de la plaza: «Centro»
    o.push(V('Isabel Robledo', '2026-11-05','2026-11-04',15000,{ zona:'Equipetrol', maps:q(P.Q1[0],P.Q1[1]) }));      // p10 Heaven
    o.push(V('Maria Flores',   '2026-11-09','2026-11-06', 2000,{ zona:'Sur' }));                                       // p11 Heaven, sin pin (el centro sale de octubre)
    o.push(V('Mauricio Merida','2026-11-10','2026-11-09', 3500,{ zona:'Urubó' }));                                     // p12 Sueña, sin pin en ningún lado
    o.push(V('Jonathan Monje', '',          '2026-11-07', 1500,{ zona:ZONA_TIENDA, direccion:DIR_TIENDA+' · Mia Plaza' }));   // p13 venta de tienda
    o.push(V('Pedro Prueba',   '2026-11-06','2026-11-05', 1000,{ zona:'' }));                                          // p14 sin marca, sin zona ni pin
    o.push(V('Maria Flores',   '2026-11-12','2026-11-11',    0,{ zona:'Norte',  maps:q(P.N4[0],P.N4[1]) }));          // p15 Heaven, sin monto
    /* lo que NO entra */
    o.push(V('Eduardo Añez',   '2026-11-09','2026-11-06',20000,{ zona:'Norte', cliente:'MULTICENTER', maps:q(P.N1[0],P.N1[1]) }));   // p16 mayorista
    o.push(V('ROHO',           '2026-11-09','2026-11-06', 4000,{ zona:'Norte' }));                                     // p17 ROHO
    o.push(V('Maria Flores',   '2026-11-09','2026-11-06',    0,{ zona:'Norte', oc:'ATC 11-001', maps:q(P.N1[0],P.N1[1]) }));   // p18 ATC
    o.push(V('Carola Chavez',  '2026-11-09','2026-11-06',    0,{ zona:'Norte', oc:'RPT 11-001', cliente:'Tienda Banzer' }));     // p19 RPT
    /* ── OCTUBRE (cerrado). A esta altura = lo cargado hasta su 9° día hábil (sábado 10/10) a las 10:00 ── */
    o.push(V('Maria Flores',   '2026-10-06','2026-10-05',20000,{ zona:'Norte', maps:q(P.N1[0],P.N1[1]) }));           // p20
    o.push(V('Mauricio Merida','2026-10-07','2026-10-06',10000,{ zona:'Este',  maps:q(P.E1[0],P.E1[1]) }));           // p21
    o.push(V('Fernando Peinado','2026-10-20','2026-10-15',30000,{ zona:'Este', maps:q(P.E2[0],P.E2[1]) }));           // p22 cargada DESPUÉS de esa altura
    o.push(V('Maria Flores',   '2026-10-08','2026-10-07', 5000,{ zona:'Sur',   maps:q(P.S1[0],P.S1[1]) }));           // p23
    o.push(V('Isabel Robledo', '2026-10-09','2026-10-08',10000,{ zona:'Equipetrol', maps:q(P.Q1[0],P.Q1[1]) }));      // p24
    o.push(V('Carola Chavez',  '2026-10-09','2026-10-08', 4000,{ zona:'Plan 3000', maps:q(P.P3[0],P.P3[1]) }));       // p25 en noviembre no vendió
    /* ── SEPTIEMBRE ── */
    o.push(V('Maria Flores',   '2026-09-10','2026-09-09',12000,{ zona:'Norte' }));                                     // p26
    return o;
  };
  window._vis=function(el){ if(typeof el==='string') el=document.getElementById(el); if(!el) return false; var r=el.getBoundingClientRect(); return !!(el.offsetParent || getComputedStyle(el).position==='fixed') && r.width>0 && r.height>0; };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const page = await browser.newPage({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,400) }; } };

  const faltan = await ev(() => ['dsvAbrir','dsvDatos','dsvTexto','dsvCopiar','dsvElegir','dsvCerrar','pryVentas','proyeccionMes'].filter(f => typeof window[f] !== 'function'));
  if (!Array.isArray(faltan) || faltan.length) {
    chk('el panel tiene «🗺️ Dónde se vende»', false, faltan);
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }

  // ═══ 1. Solo con la contraseña ═══════════════════════════════════════════════════════════════
  console.log('\n── 1. Solo con la contraseña de Administración ──');
  let r = await ev(() => {
    STATE=FIX(); UNLOCKED=false; mostrarBotonesTodos(); showView('conta');
    segSet('cta-tab','proy'); setContaTab('proy');
    var out={ tab:_vis('cta-tab-proy'), btn:_vis('pry-donde-btn'), abre:dsvAbrir(), ov:dsvAbierto() };
    UNLOCKED=true; mostrarBotonesTodos(); segSet('cta-tab','proy'); setContaTab('proy');
    var b=document.getElementById('pry-donde-btn');
    out.tab2=_vis('cta-tab-proy'); out.btn2=_vis(b); out.txt=b ? b.textContent.trim() : '';
    if(b) b.click();
    out.ov2=dsvAbierto(); out.cls=document.getElementById('dsv-ov').className;
    return out;
  });
  chk('sin la contraseña: ni la pestaña Proyección ni el botón «🗺️ Dónde se vende» se ven', r && !r.tab && !r.btn, r);
  chk('…y abrirlo por código no abre nada', r && r.abre===false && r.ov===false, r);
  chk('con la contraseña el botón está en Proyección, al lado de las otras herramientas, y abre la ventana', r && r.tab2 && r.btn2 && r.txt==='🗺️ Dónde se vende' && r.ov2, r);
  chk('la ventana es a pantalla completa con `adm-ov` (lleva la franja de arriba en la compu sin barra y en el iPad instalado)', r && /\badm-ov\b/.test(r.cls), r && r.cls);

  // ═══ 2. Las sumas = la Proyección ═════════════════════════════════════════════════════════════
  console.log('\n── 2. La suma de las filas es lo vendido de la Proyección ──');
  r = await ev(() => {
    var meses={ mes:['2026-11'], ant:['2026-10'], '3m':['2026-09','2026-10','2026-11'] }, out=[];
    Object.keys(meses).forEach(function(per){
      ['', 'heaven', 'suena'].forEach(function(mk){
        var D=dsvDatos(per, mk), filas=D.zonas.concat([D.tienda, D.sin]);
        var bs=filas.reduce(function(s,z){ return s+z.bs; }, 0), n=filas.reduce(function(s,z){ return s+z.n; }, 0);
        var pb=0, pn=0;
        meses[per].forEach(function(ym){
          var R=proyeccionMes(ym), t=mk ? R.marcas.filter(function(m){ return m.g.k===mk; })[0].tot : R.equipo;
          pb+=t.vendido; pn+=t.n;
        });
        out.push({ per:per, mk:mk||'todas', bs:Math.round(bs*100)/100, n:n, T:D.T.bs, pb:Math.round(pb*100)/100, pn:pn });
      });
    });
    return out;
  });
  const malSuma = Array.isArray(r) ? r.filter(o => Math.abs(o.bs-o.pb)>0.011 || o.n!==o.pn || Math.abs(o.T-o.pb)>0.011) : [r];
  chk('este mes / el mes pasado / 3 meses × Todas / Heaven / Sueña: la suma de las zonas + tienda + sin zona = lo vendido y las ventas de Proyección (9 de 9)',
      Array.isArray(r) && r.length===9 && malSuma.length===0, malSuma.length ? malSuma : r);
  chk('noviembre, Todas: Bs 87.000 en 15 ventas (sin el mayorista, ROHO, la ATC ni la RPT)', Array.isArray(r) && r[0].bs===87000 && r[0].n===15, r && r[0]);
  chk('noviembre por marca: Heaven Bs 53.500 · Sueña Bs 32.500 (la venta del vendedor sin marca solo entra en Todas)', Array.isArray(r) && r[1].bs===53500 && r[2].bs===32500, r && [r[1], r[2]]);

  // ═══ 3. Las zonas ═════════════════════════════════════════════════════════════════════════════
  console.log('\n── 3. Las zonas: escritas distinto se juntan, la que puso el panel, la tienda aparte ──');
  r = await ev(() => {
    var D=dsvDatos('mes', ''), z=function(nm){ return D.zonas.filter(function(x){ return x.nom===nm; })[0] || null; };
    var nor=z('Norte');
    return { nombres:D.zonas.map(function(x){ return x.nom+':'+x.bs+':'+x.n; }),
             norte:nor && { bs:nor.bs, n:nor.n, nm:nor.nm, ids:nor.ventas.map(function(o){ return o.p.id; }).sort(), aprox:nor.aprox, g:nor.g, dom:nor.dom },
             este:z('Este') && { bs:z('Este').bs, n:z('Este').n, panel:z('Este').panel, dom:z('Este').dom },
             centro:z('Centro') && { bs:z('Centro').bs, panel:z('Centro').panel, por:z('Centro').ventas[0].por },
             tienda:{ bs:D.tienda.bs, n:D.tienda.n, ids:D.tienda.ventas.map(function(o){ return o.p.id; }) },
             sin:{ bs:D.sin.bs, n:D.sin.n, ids:D.sin.ventas.map(function(o){ return o.p.id; }) },
             may:D.may, roho:D.roho, panel:D.panel, aprox:D.aprox, dom:D.dom };
  });
  chk('«Norte», «norte» y «NORTE » son UNA zona, escrita como más se usa («Norte»): Bs 29.000 en 5 ventas (una sin monto)',
      r.norte && r.norte.bs===29000 && r.norte.n===5 && r.norte.nm===4 && r.nombres.filter(n=>/^norte:/i.test(n)).length===1, r.norte || r.nombres);
  chk('el orden es por lo vendido: Norte, Este, Equipetrol, Centro, Urubó, Sur', (r.nombres||[]).map(s=>s.split(':')[0]).join('|')==='Norte|Este|Equipetrol|Centro|Urubó|Sur', r.nombres);
  chk('Norte: Heaven Bs 24.000 y Sueña Bs 5.000 → la marca que más vende ahí es Heaven; la aproximada cuenta igual',
      r.norte && r.norte.g.heaven===24000 && r.norte.g.suena===5000 && r.norte.dom==='heaven' && r.norte.aprox===1, r.norte);
  chk('sin zona escrita y con pin: va a la zona de los pedidos de al lado (Este, Bs 28.000 con la de p8) y se cuenta como puesta por el panel',
      r.este && r.este.bs===28000 && r.este.n===4 && r.este.panel===1 && r.este.dom==='suena', r.este);
  chk('sin zona y sin vecinos, al lado de la plaza: «Centro» (como «Zona sola»)', r.centro && r.centro.bs===7000 && r.centro.panel===1 && r.centro.por==='plaza', r.centro);
  chk('🏪 la venta de tienda va en su fila aparte (Bs 1.500), no en una zona', r.tienda.bs===1500 && r.tienda.n===1 && r.tienda.ids[0]==='p13', r.tienda);
  chk('sin zona ni pin: «Sin zona ni ubicación» (Bs 1.000)', r.sin.bs===1000 && r.sin.n===1 && r.sin.ids[0]==='p14', r.sin);
  chk('los mayoristas van aparte (Eduardo, Bs 20.000) y ROHO no entra', r.may && r.may.bs===20000 && r.may.n===1 && r.roho===1, [r.may, r.roho]);
  chk('a domicilio con zona: Bs 84.500; 2 zonas puestas por el panel y 1 ubicación aproximada', r.dom && r.dom.bs===84500 && r.panel===2 && r.aprox===1, [r.dom, r.panel, r.aprox]);

  // ═══ 4. La comparación ════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. La comparación con el período anterior ──');
  r = await ev(() => {
    var D=dsvDatos('mes', ''), z=function(L, nm){ return L.filter(function(x){ return x.nom===nm; })[0] || {}; };
    var A=pryAltura(proyeccionMes('2026-11'));
    var Dh=dsvDatos('mes', 'heaven'), Da=dsvDatos('ant', ''), D3=dsvDatos('3m', '');
    return { PT:D.PT, ant:A && A.ant && A.ant.equipo.bs, cmp:A && A.cmp, prevTxt:D.P.prevTxt, cmpOk:D.P.cmpOk,
             norte:z(D.zonas,'Norte').dif, este:z(D.zonas,'Este').dif, sur:z(D.zonas,'Sur').dif, centro:z(D.zonas,'Centro').dif,
             cero:D.cero.map(function(x){ return x.nom+':'+x.prev.bs; }), baj:dsvBajaron(D).map(function(x){ return x.nom; }),
             hNorte:z(Dh.zonas,'Norte').dif, antNorte:z(Da.zonas,'Norte').dif, antPT:Da.PT.bs, ok3:D3.P.cmpOk, dif3:D3.dif };
  });
  chk('el período anterior de «este mes» es octubre A ESTA ALTURA: Bs 49.000 (sin la de 30.000 cargada el 15/10), lo mismo que «📊 A esta altura» contra octubre',
      r.PT && r.PT.bs===49000 && r.ant===49000 && r.cmp==='2026-10', [r.PT, r.ant, r.cmp]);
  chk('…y lo dice: «octubre de 2026 a esta altura: al día 10 a las 10:00 (los mismos 9 días hábiles)»', /octubre de 2026 a esta altura: al día 10 a las 10:00 \(los mismos 9 días hábiles\)/.test(r.prevTxt||''), r.prevTxt);
  chk('Norte +45 % (29.000 contra 20.000), Este +180 %, Sur −60 %, Centro nueva (sin comparación)',
      Math.round(r.norte*100)===45 && Math.round(r.este*100)===180 && Math.round(r.sur*100)===-60 && r.centro==null, [r.norte, r.este, r.sur, r.centro]);
  chk('Plan 3000 vendió en octubre y en noviembre no: queda en «sin ventas ahora» y bajaron = Plan 3000 y Sur',
      (r.cero||[]).join('|')==='Plan 3000:4000' && (r.baj||[]).join('|')==='Plan 3000|Sur', [r.cero, r.baj]);
  chk('solo Heaven: Norte +20 % (24.000 contra 20.000)', Math.round(r.hNorte*100)===20, r.hNorte);
  chk('el mes pasado (octubre) contra septiembre ENTERO: Norte +67 % (20.000 contra 12.000)', Math.round(r.antNorte*100)===67 && r.antPT===12000, [r.antNorte, r.antPT]);
  chk('los últimos 3 meses no se comparan: el anterior (junio a agosto) cae antes de que el panel tenga ventas', r.ok3===false && r.dif3==null, [r.ok3, r.dif3]);

  // ═══ 5. Lo que se ve: la lista y el mapa ══════════════════════════════════════════════════════
  console.log('\n── 5. La lista y el mapa ──');
  r = await ev(async () => {
    DSV.per='mes'; DSV.marca=''; dsvAbrir();
    await new Promise(res => setTimeout(res, 250));
    var C=window._mapa.circ.map(function(m){ return { ll:m.ll, r:m.o.radius, col:m.o.fillColor, w:m.o.weight, tip:m.tip, perm:!!(m.tipO && m.tipO.permanent) }; });
    var por=function(t){ return C.filter(function(c){ return c.tip.indexOf('<b>'+t+'</b>')===0; })[0] || null; };
    var filas=[].map.call(document.querySelectorAll('#dsv-lista .dsv-z'), function(e){ return e.innerText.replace(/\s+/g,' ').trim(); });
    return { n:C.length, nombres:C.map(function(c){ return c.tip.replace(/<br>.*$/,'').replace(/<\/?b>/g,''); }), norte:por('Norte'), este:por('Este'), sur:por('Sur'), centro:por('Centro'),
             urubo:por('Urubó'), enc:window._mapa.enc, filas:filas, res:_txt('#dsv-res'), pie:_txt('#dsv-pie'), sinmapa:document.getElementById('dsv-wrap').classList.contains('dsv-sinmapa'),
             nota:_txt('#dsv-mapa-nota'), on:[].map.call(document.querySelectorAll('#dsv-per button.on, #dsv-marca button.on'), function(b){ return b.textContent.trim(); }) };
  });
  chk('arranca en «Este mes» y «Todas»', r.on && r.on.join('|')==='Este mes|Todas', r.on);
  chk('arriba: Bs 87.000 vendido (lo mismo que la Proyección), Bs 84.500 a domicilio en 6 zonas, +78 % contra octubre',
      /Bs 87\.000/.test(r.res) && /Bs 84\.500/.test(r.res) && /en 6 zonas/.test(r.res) && /\+78 %/.test(r.res), r.res);
  chk('el mapa: 5 círculos (las zonas con pin), encuadrado; Urubó (sin ningún pin) no está', r.n===5 && !r.urubo && r.enc>=1, r.nombres);
  const prom = (a) => [a.reduce((s,p)=>s+p[0],0)/a.length, a.reduce((s,p)=>s+p[1],0)/a.length];
  const pn = await ev(() => PIN);
  const nC = prom([pn.N1, pn.N2, pn.N3, pn.N4]);
  chk('Norte va en el PROMEDIO de los pines de sus ventas (la aproximada incluida)', r.norte && Math.abs(r.norte.ll[0]-nC[0])<1e-9 && Math.abs(r.norte.ll[1]-nC[1])<1e-9, [r.norte && r.norte.ll, nC]);
  chk('Sur no tiene pines en noviembre: va en el centro conocido de la zona (el pin de octubre)', r.sur && Math.abs(r.sur.ll[0]-pn.S1[0])<1e-9 && Math.abs(r.sur.ll[1]-pn.S1[1])<1e-9, r.sur);
  chk('tamaño por lo vendido (Norte el más grande, 32 px; Sur el más chico) y color de la marca que más vende (Norte turquesa de Heaven, Este amarillo de Sueña)',
      r.norte && r.norte.r===32 && r.sur && r.sur.r<r.este.r && r.este.r<r.norte.r && r.norte.col==='#00B5AD' && r.este.col==='#FFD400', [r.norte, r.este, r.sur]);
  chk('las 5 primeras zonas tienen su nombre a la vista en el mapa', r.norte && r.norte.perm && r.este.perm && r.centro && r.centro.perm, [r.norte && r.norte.perm, r.este && r.este.perm]);
  chk('la lista: Norte primero con «5 ventas · 33% del total · ticket Bs 7.250» y «+45 % vs octubre»',
      r.filas && /^1 Norte Bs 29\.000 5 ventas · 33% del total · ticket Bs 7\.250 \+45 % vs octubre/.test(r.filas[0]), r.filas && r.filas[0]);
  chk('Urubó en la lista con «sin pin: no está en el mapa»; Este dice que una zona la puso el panel',
      r.filas && r.filas.some(f=>/Urubó.*sin pin: no está en el mapa/.test(f)) && r.filas.some(f=>/^2 Este.*1 sin zona escrita \(la puso el panel por el pin\)/.test(f)), r.filas);
  chk('«Fuera del mapa»: la venta de tienda y la sin zona, al final', r.filas && /^🏪 Vendidas en tienda \(sin domicilio\) Bs 1\.500/.test(r.filas[r.filas.length-2]) && /^❓ Sin zona ni ubicación Bs 1\.000/.test(r.filas[r.filas.length-1]), r.filas && r.filas.slice(-2));
  chk('abajo: los mayoristas aparte, ROHO no entra y cómo se cuenta', /Mayoristas \(Eduardo Añez\): Bs 20\.000 en 1 venta\. Van aparte/.test(r.pie) && /ROHO no entra/.test(r.pie) && /Cómo se cuenta/.test(r.pie), r.pie);
  chk('con el mapa cargado no dice «sin mapa» y explica colores y tamaño', !r.sinmapa && /El color es la marca que más vende/.test(r.nota) && /1 zona sin ningún pin/.test(r.nota), [r.sinmapa, r.nota]);

  // ═══ 6. Tocar una zona ════════════════════════════════════════════════════════════════════════
  console.log('\n── 6. Tocar una zona la resalta y muestra sus ventas ──');
  r = await ev(async () => {
    var fila=document.querySelector('#dsv-lista .dsv-z[data-k="norte"]'); fila.click();
    await new Promise(res => setTimeout(res, 200));
    var on=document.querySelector('#dsv-lista .dsv-z.on'), vs=[].map.call(on ? on.querySelectorAll('.dsv-v') : [], function(e){ return e.innerText.replace(/\s+/g,' ').trim(); });
    var C=window._mapa.circ, sel=C.filter(function(m){ return m.o.weight===4; }), dots=C.filter(function(m){ return m.o.radius===4; });
    var out={ on:on && on.getAttribute('data-k'), vs:vs, sel:sel.map(function(m){ return m.tip.replace(/<br>.*$/,''); }), dots:dots.length, hueca:dots.filter(function(m){ return m.o.fillOpacity<0.5; }).length };
    /* una venta abre su ficha de Contabilidad */
    var v=on && on.querySelector('.dsv-v'); if(v) v.click();
    out.abrio=window._abrio.slice();
    /* el círculo de Este, tocado en el mapa */
    var este=window._mapa.circ.filter(function(m){ return m.tip.indexOf('<b>Este</b>')===0; })[0]; if(este && este.clic) este.clic();
    await new Promise(res => setTimeout(res, 200));
    out.on2=(document.querySelector('#dsv-lista .dsv-z.on')||{}).getAttribute && document.querySelector('#dsv-lista .dsv-z.on').getAttribute('data-k');
    out.vs2=document.querySelectorAll('#dsv-lista .dsv-z.on .dsv-v').length;
    out.pan=window._mapa.pan;
    /* tocar de nuevo la misma zona en la lista la cierra */
    document.querySelector('#dsv-lista .dsv-z.on').click();
    out.cerr=document.querySelectorAll('#dsv-lista .dsv-z.on').length;
    return out;
  });
  chk('tocar Norte en la lista la marca y muestra sus 5 ventas (cliente, vendedora, día y monto), la de entrega más adelante primero',
      r.on==='norte' && r.vs.length===5 && /^CLIENTE 3 Isabel Robledo · entrega 20\/11 · ≈ por la dirección Bs 6\.000$/.test(r.vs[0]) && /^CLIENTE 15 Maria Flores · entrega 12\/11 sin monto$/.test(r.vs[1]), r.vs);
  chk('en el mapa Norte queda resaltada y se ven sus 4 ventas con pin como puntitos (la aproximada, hueca)', r.sel && r.sel.join('|')==='<b>Norte</b>' && r.dots===4 && r.hueca===1, [r.sel, r.dots, r.hueca]);
  chk('cada venta abre su ficha (Contabilidad)', r.abrio && r.abrio[0]==='p3', r.abrio);
  chk('tocar el círculo de Este en el mapa elige Este en la lista (con sus 4 ventas) y lleva el mapa ahí', r.on2==='este' && r.vs2===4 && r.pan>=1, [r.on2, r.vs2, r.pan]);
  chk('tocar otra vez la zona elegida la cierra', r.cerr===0, r.cerr);

  // ═══ 7. Período y marca ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 7. Cambiar el período y la marca ──');
  r = await ev(async () => {
    document.querySelector('#dsv-marca button[data-v="suena"]').click();
    await new Promise(res => setTimeout(res, 200));
    var a={ res:_txt('#dsv-res'), filas:[].map.call(document.querySelectorAll('#dsv-lista .dsv-z'), function(e){ return e.querySelector('.dsv-nom').textContent; }), circ:window._mapa.circ.length,
            nota:_txt('#dsv-mapa-nota') };
    document.querySelector('#dsv-marca button[data-v=""]').click();
    document.querySelector('#dsv-per button[data-v="3m"]').click();
    await new Promise(res => setTimeout(res, 200));
    a.res3=_txt('#dsv-res');
    document.querySelector('#dsv-per button[data-v="mes"]').click(); document.querySelector('#dsv-marca button[data-v=""]').click();
    await new Promise(res => setTimeout(res, 150));
    return a;
  });
  chk('solo Sueña: Bs 32.500 y sus zonas (Este, Norte, Urubó), sin la tienda ni la sin zona (son de otros)',
      /Bs 32\.500/.test(r.res) && r.filas.join('|')==='Este|Norte|Urubó' && r.circ===2 && /Sueña/.test(r.nota) && !/Heaven/.test(r.nota), r);
  chk('los últimos 3 meses (septiembre a noviembre de 2026): Bs 178.000 y «sin comparación»', /septiembre de 2026 a noviembre de 2026/.test(r.res3) && /Bs 178\.000/.test(r.res3) && /Sin comparación/.test(r.res3), r.res3);

  // ═══ 8. Copiar para la publicidad ═════════════════════════════════════════════════════════════
  console.log('\n── 8. 📋 Copiar para la publicidad ──');
  r = await ev(() => {
    document.getElementById('dsv-copiar').click();
    var t=window._copia, s=dsvTexto('mes','heaven'), a=dsvTexto('ant','');
    return { t:t, s:s, a:a };
  });
  const T = r.t || '';
  chk('el texto dice el período y contra qué se compara', /^🗺️ DÓNDE SE VENDE — noviembre de 2026/.test(T) && /Comparado con octubre de 2026 a esta altura/.test(T), T.slice(0,300));
  chk('las 5 zonas que más venden de cada marca, la marca más grande primero (Heaven Bs 53.500, después Sueña)',
      /💚 HEAVEN · Bs 53\.500 en 9 ventas\nLas 5 zonas que más venden:\n1\. Norte: Bs 24\.000 · 4 ventas \(\+20 % vs octubre\)\n2\. Equipetrol: Bs 15\.000 · 1 venta \(\+50 % vs octubre\)\n3\. Centro: Bs 7\.000 · 1 venta \(nueva: nada en octubre\)\n4\. Este: Bs 4\.000 · 1 venta \(nueva: nada en octubre\)\n5\. Sur: Bs 2\.000 · 1 venta \(−60 % vs octubre\)/.test(T)
      && T.indexOf('💚 HEAVEN')<T.indexOf('🛏️ SUEÑA'), T);
  chk('…y las que bajaron, con el ejemplo del dueño: «Sur: Bs 2.000 (−60 % vs octubre)»', /Bajaron:\n• Plan 3000: Bs 0 \(−100 % vs octubre\)\n• Sur: Bs 2\.000 \(−60 % vs octubre\)/.test(T), T);
  chk('Sueña: Este primero (+140 %), Norte y Urubó nuevas', /🛏️ SUEÑA · Bs 32\.500 en 5 ventas\nLas 3 zonas que más venden:\n1\. Este: Bs 24\.000 · 3 ventas \(\+140 % vs octubre\)\n2\. Norte: Bs 5\.000 · 1 venta \(nueva: nada en octubre\)\n3\. Urubó: Bs 3\.500 · 1 venta \(nueva: nada en octubre\)/.test(T), T);
  chk('al final, lo de tienda y lo sin zona', /🏪 En tienda \(sin domicilio\): Bs 1\.500 · ❓ Sin zona ni ubicación: Bs 1\.000$/.test(T), T.slice(-120));
  chk('con una marca elegida, solo esa', /💚 HEAVEN/.test(r.s) && !/SUEÑA/.test(r.s), r.s.slice(0,200));
  chk('el mes pasado se compara con septiembre entero', /Comparado con septiembre de 2026 entero/.test(r.a) && /Norte: Bs 20\.000 · 1 venta \(\+67 % vs septiembre\)/.test(r.a) && /La zona que más vende:\n1\. Este: Bs 40\.000/.test(r.a), r.a);

  // ═══ 9. Sin Leaflet, Escape y solo mira ═══════════════════════════════════════════════════════
  console.log('\n── 9. Sin internet queda la lista; Escape cierra; no guarda nada ──');
  r = await ev(async () => {
    var antes=JSON.stringify(STATE);
    dsvCerrar(); delete window.L; DSV.mapa=null; DSV.capa=null; window.DSV_MAPA_ESPERA=300;
    dsvAbrir();
    var cargando=_txt('#dsv-mapa-nota');
    await new Promise(res => setTimeout(res, 600));
    var out={ cargando:cargando, nota:_txt('#dsv-mapa-nota'), sinmapa:document.getElementById('dsv-wrap').classList.contains('dsv-sinmapa'),
              mapaVis:_vis('dsv-mapa'), filas:document.querySelectorAll('#dsv-lista .dsv-z').length };
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true }));
    out.cerro=!dsvAbierto();
    out.igual=(JSON.stringify(STATE)===antes); out.saves=window._saves.length;
    FAKE_L(); DSV.sinMapa=false; DSV.pidio=0; window.DSV_MAPA_ESPERA=9000;
    return out;
  });
  chk('sin Leaflet: «Cargando el mapa…» y después «el mapa no cargó: está todo en la lista»; el mapa se esconde y la lista queda entera',
      /Cargando el mapa/.test(r.cargando) && /El mapa no cargó/.test(r.nota) && r.sinmapa && !r.mapaVis && r.filas===8, r);
  chk('Escape cierra la ventana', r.cerro, r);
  chk('solo mira: no guardó nada ni cambió la planilla', r.igual && r.saves===0, r);
  r = await ev(async () => {
    var guarda=STATE; STATE=[];
    DSV.per='mes'; DSV.marca='heaven'; dsvAbrir();
    await new Promise(res => setTimeout(res, 200));
    var out={ res:_txt('#dsv-res'), lista:_txt('#dsv-lista'), circ:window._mapa.circ.length, copia:dsvTexto() };
    dsvCerrar(); STATE=guarda; DSV.marca='';
    return out;
  });
  chk('sin ventas no se rompe: «No hay ventas de Heaven…», la lista lo dice, el mapa vacío y el texto también',
      /No hay ventas de Heaven con entrega en noviembre de 2026/.test(r.res) && /Sin ventas en el período/.test(r.lista) && r.circ===0 && /Sin ventas a domicilio con zona/.test(r.copia), r);

  // ═══ 10. iPad parado y celular ════════════════════════════════════════════════════════════════
  console.log('\n── 10. En el iPad parado (820) y en el celular (390) no se corre de costado ──');
  for (const w of [820, 390]) {
    await page.setViewportSize({ width:w, height:(w===390 ? 844 : 1180) });
    r = await ev(async () => {
      DSV.per='mes'; DSV.marca=''; dsvAbrir();
      await new Promise(res => setTimeout(res, 250));
      dsvElegir('norte');
      await new Promise(res => setTimeout(res, 150));
      var ov=document.getElementById('dsv-ov'), body=document.getElementById('dsv-body'), bar=ov.firstElementChild, lista=document.getElementById('dsv-lista'), mapa=document.getElementById('dsv-mapa');
      var anchos=[].map.call(ov.querySelectorAll('*'), function(e){ var q=e.getBoundingClientRect(); return { r:q.right, id:e.id||e.className }; }).filter(function(o){ return o.r>innerWidth+1; });
      var out={ W:innerWidth, doc:document.documentElement.scrollWidth, body:body.scrollWidth-body.clientWidth, bar:bar.scrollWidth-bar.clientWidth,
                fuera:anchos.slice(0,5), listaAbajo:lista.getBoundingClientRect().top>=mapa.getBoundingClientRect().bottom-1, mapaH:mapa.getBoundingClientRect().height,
                botones:[].every.call(bar.querySelectorAll('button'), function(b){ var q=b.getBoundingClientRect(); return q.left>=0 && q.right<=innerWidth+1; }) };
      dsvCerrar();
      return out;
    });
    chk(w+' px: nada se sale de costado (página, ventana y barra de arriba)', r.doc<=r.W && r.body<=0 && r.bar<=0 && r.fuera.length===0, r);
    chk(w+' px: la lista va abajo del mapa y todos los botones de la barra se ven', r.listaAbajo && r.mapaH>=200 && r.botones, r);
  }

  chk('sin errores en la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
