/* 🏭 QUÉ PRODUCIR — semana, quincena y el mes que viene, por fábrica (§4dr).

   Lo que este test cuida, por orden de importancia:
   1. Que la fuente sean los PEDIDOS del panel y la regla de rotación de siempre (§4dj):
      equipo, sin Eduardo ni reposiciones de tienda, 3+ entregas. Nada de Excel de ventas.
   2. Que Heaven y Sueña salgan en bloques distintos (fábricas distintas), y que lo que no
      dice de qué marca es caiga en «sin fábrica asignada» en vez de adivinarse — salvo que
      ya se le haya pedido alguna vez a una fábrica.
   3. Que la columna de 7 días sea EXACTAMENTE la de la tabla de stock (una sola verdad),
      que la de 15 días nunca sea menor, y que el mes que viene se calcule con los 30 días
      y reparta el 70% a la 1ª quincena.
   4. Que lo discontinuado, lo de tienda y las ATC no aparezcan nunca, y que sin conteo del
      depósito no se calcule nada.
   5. Que el texto para la fábrica diga producto, cantidad y totales por medida.

   El reloj de la página está clavado en el 10/09/2026 (10:00 de Bolivia): la cuenta del mes
   depende de cuántos días quedan de septiembre (21) y de cuántos tiene octubre (31).

   Se corre:  node tests/test_producir.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-09-10T14:00:00Z'));
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  const faltan = await page.evaluate(() => ['stockProducir','stockProducirDe','renderProducir','copiarProducir','stockMarcaDeNombre','stockBloqueDe','stockMesSiguiente','stockCompHasta','producirVerTodo'].filter(f => typeof window[f] !== 'function'));
  if(faltan.length){
    chk('el panel tiene el módulo «qué producir» (§4dr)', false, 'faltan: '+faltan.join(', '));
    console.log('\n'+PASS+' bien · '+FAIL+' mal'); await browser.close(); process.exit(1);
  }
  chk('el reloj de la página está clavado en el 10/09/2026', await page.evaluate(() => todayStr()==='2026-09-10'));

  /* ---------- 1. La marca por el nombre ---------- */
  const marcas = await page.evaluate(() => {
    var casos={ 'TITANIO ICE':'heaven', 'COLCHON ORTOPEDICO SUEÑA':'suena', 'COMBO SEMIORTOP. SUEÑA CAFÉ':'suena', 'COLCHON SEMIORTOP.':'suena',
      'ESPECIAL SEMIORTOPEDICO':'heaven', 'PILLOW FLEX':'roho', 'NUEVO ECO FLEX':'roho', 'SOMIER NEGRO':'roho', 'ALM/NASA':'heaven', 'SOMIER BiRELAX':'heaven',
      'RESPALDAR PRAG.':'suena', 'MORFEO':'', 'SOMIER PLATA SEMIORTOPEDICO':'heaven', 'COLCHONETA CAMPING':'suena', 'COLCHONETA':'', 'EUROPEDIC':'roho',
      'SOMIER MOVEL PRO':'suena', 'HEAVEN TROPICAL':'heaven', 'DREAM REFORZADO':'heaven', 'COLCHON CUNA':'suena', 'COLCHON SUEÑA PREMIER DELUXE':'suena', 'ORO BI RELAX':'heaven' };
    var mal=[]; Object.keys(casos).forEach(function(n){ var got=stockMarcaDeNombre(n); if(got!==casos[n]) mal.push(n+' → '+JSON.stringify(got)+' (esperaba '+casos[n]+')'); });
    return mal;
  });
  chk('la marca sale del nombre del catálogo: Sueña primero, después las líneas de ROHO, después Heaven', marcas.length===0, marcas.join(' · '));
  const mesR = await page.evaluate(() => [stockMesSiguiente('2026-12-05'), stockMesSiguiente('2026-01-20'), stockMesSiguiente('2026-09-10')]);
  chk('diciembre → enero del año siguiente, 31 días, y fin de mes actual 31/12', mesR[0].nombre==='enero' && mesR[0].y===2027 && mesR[0].dias===31 && mesR[0].finActual==='2026-12-31' && mesR[0].ini==='2027-01-01');
  chk('enero → febrero de 28 días (2026 no es bisiesto)', mesR[1].nombre==='febrero' && mesR[1].dias===28 && mesR[1].fin==='2026-02-28');
  chk('hoy 10/09 → el mes que viene es octubre, 31 días, y septiembre termina el 30', mesR[2].nombre==='octubre' && mesR[2].dias===31 && mesR[2].finActual==='2026-09-30');
  const medidas = await page.evaluate(() => {
    var casos={ '130X190CM':'130x190', '160X200':'160x200', '140x190':'140x190', '50X70':'50x70', '70X190X3':'70x190x3', '':'sin medida', 'ESPECIAL':'ESPECIAL', '140*190':'140x190', ' 105 x 190 cm ':'105x190' };
    var mal=[]; Object.keys(casos).forEach(function(m){ var got=producirMedidaEtq(m); if(got!==casos[m]) mal.push(JSON.stringify(m)+' → '+JSON.stringify(got)+' (esperaba '+casos[m]+')'); });
    return mal;
  });
  chk('la medida del pie se escribe de una sola forma: «130X190CM», «140*190» y «140x190» son 130x190 / 140x190', medidas.length===0, medidas.join(' · '));

  /* ---------- 2. El escenario ---------- */
  const armar = () => page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    try{ localStorage.removeItem(LS_PEND); }catch(e){}
    window._guardadas=[];
    apiSave=function(rec){ window._guardadas.push(JSON.parse(JSON.stringify(rec))); return Promise.resolve({ok:true, pedido:rec}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    var atras=function(n){ var d=new Date(); d.setDate(d.getDate()-n); return isoLocal(d); };
    var adel =function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    window._atras=atras; window._adel=adel;
    var P=function(o){ return Object.assign({id:'p'+Math.random(),fecha:todayStr(),oc:'',vendedor:'Carola Chavez',
      cliente:'C',celular:'70000000',turno:'AM',zona:'Norte',direccion:'x',maps:'',pagado:true,saldo:0,
      ts:Date.now(),metodoPago:'',observaciones:'',estado:'',entregado:true,vehiculo:'',chofer:'',
      garantia:'',nota:'',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:true,fotos:[]},o); };
    var H=function(n){ return [{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}]; };
    var S=function(n){ return [{desc:'COLCHON SOFT',medida:'140x190',codigo:'COLT0048',cant:n}]; };
    var M=function(n){ return [{desc:'MORFEO',medida:'140x190',codigo:'',cant:n}]; };
    var C=function(n){ return [{desc:'COLCHON CARIOCA PREMIER',medida:'140x190',codigo:'CH1672',cant:n}]; };
    var T=function(n){ return [{desc:'PROTECTOR DE COLCHON',medida:'140x190',codigo:'',cant:n}]; };
    var F=function(n){ return [{desc:'PILLOW FLEX',medida:'140x190',codigo:'CH2103',cant:n}]; };
    STATE=[];
    // Heaven: 5 entregas del equipo en los últimos 5 días (2 c/u) + 4 entregas hace 20-26 días
    for(var i=1;i<=5;i++) STATE.push(P({id:'h'+i, fecha:atras(i), productos:H(2)}));
    [20,22,24,26].forEach(function(n,i){ STATE.push(P({id:'hv'+i, fecha:atras(n), productos:H(2)})); });
    // …y lo que NO cuenta: una reposición de tienda (6), una venta de Eduardo (20) y una ATC (3)
    STATE.push(P({id:'rpt1', fecha:atras(2), oc:'RPT 09-001', cliente:'Mutualista', productos:H(6)}));
    STATE.push(P({id:'edu1', fecha:atras(3), vendedor:'Eduardo Añez', productos:H(20)}));
    STATE.push(P({id:'atc1', fecha:atras(1), oc:'ATC 09-001', productos:H(3)}));
    // Sueña: 3 entregas hace 18-24 días (2 c/u), ninguna en los últimos 15
    [18,21,24].forEach(function(n,i){ STATE.push(P({id:'s'+i, fecha:atras(n), productos:S(2)})); });
    // Eduardo: un MORFEO vendido para mañana, sin entregar (se cubre, pero no arma ritmo)
    STATE.push(P({id:'edu2', fecha:adel(1), vendedor:'Eduardo Añez', entregado:false, productos:M(4)}));
    // Discontinuado con venta, accesorio de tienda con venta, y una línea de ROHO que rota
    for(var j=1;j<=5;j++) STATE.push(P({id:'c'+j, fecha:atras(j), productos:C(1)}));
    for(var k=1;k<=6;k++) STATE.push(P({id:'t'+k, fecha:atras(k), productos:T(2)}));
    [2,4,6,8].forEach(function(n,i){ STATE.push(P({id:'f'+i, fecha:atras(n), productos:F(3)})); });
    // Un Heaven que rota (4 entregas en 8 días) pero con 60 en depósito: cubierto en los tres horizontes
    [1,3,5,7].forEach(function(n,i){ STATE.push(P({id:'b'+i, fecha:atras(n), productos:[{desc:'ORO BI RELAX',medida:'140x190',codigo:'CH1761',cant:1}]})); });
    // Un nombre suelto con la medida escrita como en el almacén («130X190CM»): 4 entregas en 8 días, nada en depósito
    [1,3,5,7].forEach(function(n,i){ STATE.push(P({id:'x'+i, fecha:atras(n), productos:[{desc:'XYZ PLUS',medida:'130X190CM',codigo:'',cant:1}]})); });
    var KH=stockClave({desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201'});
    var KS=stockClave({desc:'COLCHON SOFT',medida:'140x190',codigo:'COLT0048'});
    var KF=stockClave({desc:'PILLOW FLEX',medida:'140x190',codigo:'CH2103'});
    var KM=stockClave({desc:'MORFEO',medida:'140x190',codigo:''});
    var KX=stockClave({desc:'XYZ PLUS',medida:'130X190CM',codigo:''});
    window._K={H:KH,S:KS,F:KF,M:KM,X:KX};
    STOCK=stockVacio();
    STOCK.c={ f:todayStr(), hora:'09:00', u:{}, solo0:true };
    STOCK.c.u[KH]=3; STOCK.c.u[KS]=1; STOCK.c.u[KF]=20;
    STOCK.c.u[stockClave({desc:'ORO BI RELAX',medida:'140x190',codigo:'CH1761'})]=60;
    STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:todayStr(), u:{} } };
    STOCK.g['IM - PRODUCTOTERMINADO'].u[KH]=2;
    stockOlvidarIndice();
    return window._K;
  });
  const K = await armar();
  chk('las claves de producto se resuelven por el catálogo', /TITANIO ICE/.test(K.H) && /SOFT/.test(K.S) && /PILLOW FLEX/.test(K.F), JSON.stringify(K));

  /* ---------- 3. Los números ---------- */
  let r = await page.evaluate(() => {
    var d=stockData(), R=stockProducir(d);
    var fila=function(k){ var out=null; R.bloques.forEach(function(B){ B.filas.forEach(function(f){ if(f.o.k===k) out=Object.assign({}, f, {bloque:B.k, por:f.bloque.por, o:{porDia:f.o.porDia, porDiaMes:f.o.porDiaMes, v30:f.o.v30, n30:f.o.n30, vendidosRotacion:f.o.vendidosRotacion, nVentasRotacion:f.o.nVentasRotacion, vendidosUnicos:f.o.vendidosUnicos, deposito:f.o.deposito, enOtros:f.o.enOtros, fabricar:f.o.fabricar, lead:f.o.lead, margen:f.o.margen, comp:f.o.comp, rota:f.o.rota}}); }); }); return out; };
    var tot={}; R.bloques.forEach(function(B){ tot[B.k]=Object.assign({n:B.filas.filter(function(f){return f.algo;}).length, medidas:Object.keys(B.medidas)}, B.tot); });
    return { mes:R.mes.nombre, H:fila(window._K.H), S:fila(window._K.S), F:fila(window._K.F), M:fila(window._K.M), X:fila(window._K.X), tot:tot, cubiertos:R.cubiertos, sinContar:R.sinContar,
             claves:R.bloques.reduce(function(a,B){ return a.concat(B.filas.map(function(f){ return f.o.k; })); },[]) };
  });
  chk('el mes que viene es octubre', r.mes==='octubre');
  // Heaven: 10 en 5 entregas en 15 días (0,67/día, rotación media); 18 en 9 entregas en 30 días (0,6/día)
  chk('TITANIO ICE: el ritmo de 15 días es del equipo — la reposición, Eduardo y la ATC no entran', r.H && r.H.o.vendidosRotacion===10 && r.H.o.nVentasRotacion===5 && r.H.o.vendidosUnicos===26, r.H && JSON.stringify(r.H.o));
  chk('TITANIO ICE: los 30 días suman 18 en 9 entregas → 0,6 por día para el mes', r.H && r.H.o.v30===18 && r.H.o.n30===9 && Math.abs(r.H.o.porDiaMes-0.6)<1e-9);
  chk('TITANIO ICE cae en el bloque de Heaven (Industrias Moreno) por la marca', r.H && r.H.bloque==='heaven' && r.H.por==='marca');
  chk('«Hay» suma lo de acá (3) y lo de Moreno (2)', r.H && r.H.hay===5 && r.H.o.deposito===3 && r.H.o.enOtros===2);
  // 7 días = la cuenta de la tabla: max(0, 0,667×(3+2+3)) = 5,33 → pedir 3, recoger 2 de Moreno → fabricar 1
  chk('7 días = exactamente lo que dice la tabla de stock (fabricar 1: pedir 3, 2 se recogen de Moreno)', r.H && r.H.sem===1 && r.H.o.fabricar===1, r.H && (r.H.sem+' vs '+r.H.o.fabricar));
  // 15 días: 0,667×(3+2+15)=13,33 − 5 → 9
  chk('15 días: ritmo × (fábrica 3 + margen 2 + 15) = 13,3, menos lo que hay (5) → 9', r.H && r.H.quin===9, r.H && r.H.quin);
  // octubre: 0,6×31 = 18,6; quedan 0 el 1/10 (5 − 0,6×21 días de septiembre) → 19; 70% → 14 y 5
  chk('octubre necesita 18,6 (0,6 × 31), no queda nada el 1/10 → producir 19', r.H && Math.abs(r.H.mesNec-18.6)<1e-9 && r.H.mesQueda===0 && r.H.mes===19, r.H && JSON.stringify([r.H.mesNec,r.H.mesQueda,r.H.mes]));
  chk('el 70% (14) para la 1ª quincena y el resto (5) para la 2ª', r.H && r.H.mes1===14 && r.H.mes2===5, r.H && (r.H.mes1+' · '+r.H.mes2));
  // Sueña: nada en 15 días (no rota), 6 en 3 entregas en 30 → 0,2/día. Solo el mes
  chk('COLCHON SOFT: sin rotación en 15 días → 7 y 15 días en cero', r.S && r.S.o.rota===false && r.S.sem===0 && r.S.quin===0, r.S && JSON.stringify([r.S.sem,r.S.quin]));
  chk('…pero 3 entregas en 30 días sí es ritmo del mes: 0,2 × 31 = 6,2, queda 0 → producir 7 (5 + 2)', r.S && Math.abs(r.S.o.porDiaMes-0.2)<1e-9 && r.S.mes===7 && r.S.mes1===5 && r.S.mes2===2, r.S && JSON.stringify([r.S.o.porDiaMes,r.S.mes,r.S.mes1,r.S.mes2]));
  chk('COLCHON SOFT cae en el bloque de Sueña (Multiespumas)', r.S && r.S.bloque==='suena');
  // Eduardo: el MORFEO vendido sin entregar se cubre (4), pero no arma ritmo ni mes
  chk('el MORFEO de Eduardo: se cubren los 4 vendidos sin entregar en 7 y 15 días, nada para octubre', r.M && r.M.sem===4 && r.M.quin===4 && r.M.mes===0 && r.M.o.porDia===0 && r.M.o.porDiaMes===0, r.M && JSON.stringify([r.M.sem,r.M.quin,r.M.mes]));
  chk('…y como el nombre no dice de qué marca es, va a «sin fábrica asignada»', r.M && r.M.bloque==='otros');
  // ROHO line: rota (12 en 4 entregas) pero hay 20: cubierto en la semana y la quincena; octubre 1
  chk('PILLOW FLEX (línea ROHO) rota pero hay 20: 7 y 15 días en cero, octubre pide 1', r.F && r.F.sem===0 && r.F.quin===0 && r.F.mes===1, r.F && JSON.stringify([r.F.sem,r.F.quin,r.F.mes,r.F.mesNec,r.F.mesQueda]));
  chk('…y sin pedidos previos a ninguna fábrica cae en «sin fábrica asignada»', r.F && r.F.bloque==='otros' && r.F.por==='');
  chk('lo discontinuado (CARIOCA PREMIER), lo de tienda (PROTECTOR) y la ATC no aparecen en ningún bloque', !r.claves.some(function(k){ return /CARIOCA|PROTECTOR/.test(k); }), r.claves.join(' | '));
  chk('la quincena nunca pide menos que la semana', [r.H,r.S,r.M,r.F].every(function(f){ return f && f.quin>=f.sem; }));
  // XYZ PLUS: 4 en 4 entregas en 15 días (0,27/día, media) → 0,27×8=2,1 → 3; 0,27×20=5,3 → 6; mes 0,13×31=4,1 → 5 (3+2)
  chk('XYZ PLUS (nombre suelto, medida «130X190CM»): 3 · 6 · 5 (3+2), en «sin fábrica asignada», y la medida queda 130x190', r.X && r.X.sem===3 && r.X.quin===6 && r.X.mes===5 && r.X.mes1===3 && r.X.mes2===2 && r.X.bloque==='otros' && r.X.md==='130x190', r.X && JSON.stringify([r.X.sem,r.X.quin,r.X.mes,r.X.mes1,r.X.mes2,r.X.bloque,r.X.md]));
  chk('totales por bloque: Heaven 1 · 9 · 19 (14+5); Sueña 0 · 0 · 7; sin asignar 7 · 10 · 6', r.tot.heaven.sem===1 && r.tot.heaven.quin===9 && r.tot.heaven.mes===19 && r.tot.heaven.mes1===14 && r.tot.heaven.mes2===5 && r.tot.suena.mes===7 && r.tot.suena.sem===0 && r.tot.otros.sem===7 && r.tot.otros.quin===10 && r.tot.otros.mes===6 && r.tot.otros.mes1===3 && r.tot.otros.mes2===3, JSON.stringify(r.tot));
  chk('el pie de «sin asignar» reparte por medida: 130x190 y 140x190', r.tot.otros.medidas.length===2 && r.tot.otros.medidas.indexOf('130x190')>=0 && r.tot.otros.medidas.indexOf('140x190')>=0, JSON.stringify(r.tot.otros.medidas));
  chk('el ORO BI RELAX rota pero tiene 60: queda como cubierto y no suma nada a Heaven', r.cubiertos===1 && r.tot.heaven.n===1 && r.claves.some(function(k){ return /ORO BI RELAX/.test(k); }), r.cubiertos+' cubiertos');
  chk('el total por medida del bloque Heaven es 160x190', r.tot.heaven.medidas.length===1 && r.tot.heaven.medidas[0]==='160x190', JSON.stringify(r.tot.heaven.medidas));

  /* ---------- 4. Un pedido anterior a una fábrica manda el producto a ese bloque ---------- */
  r = await page.evaluate(() => {
    STOCK.p=[{ id:'fp1', k:window._K.F, u:5, fab:'MULTI', f:window._atras(10), esp:'', r:window._atras(7) }];
    var d=stockData(), R=stockProducir(d), out=null;
    R.bloques.forEach(function(B){ B.filas.forEach(function(f){ if(f.o.k===window._K.F) out={bloque:B.k, por:f.bloque.por, fab:f.bloque.fab, mes:f.mes}; }); });
    STOCK.p=[];
    return out;
  });
  chk('PILLOW FLEX con un pedido anterior a MULTI pasa al bloque de Sueña, marcado «por la última vez que se pidió»', r && r.bloque==='suena' && r.por==='fabrica' && r.fab==='MULTI', JSON.stringify(r));

  /* ---------- 5. La pantalla ---------- */
  await page.evaluate(() => { abrirStock(); });
  await page.waitForTimeout(150);
  if(process.env.SHOT){ await page.evaluate(() => { var el=document.getElementById('producir'); if(el) el.scrollIntoView(); }); await page.locator('#producir').screenshot({ path:process.env.SHOT }); }
  r = await page.evaluate(() => {
    var el=document.getElementById('producir'); if(!el) return null;
    var t=el.textContent.replace(/\s+/g,' ');
    return { t:t, html:el.innerHTML, bloques:el.querySelectorAll('table').length, botones:Array.from(el.querySelectorAll('button')).map(function(b){ return b.textContent.trim(); }),
             filaH:(function(){ var tr=el.querySelector('tr[data-producir-k="'+window._K.H.replace(/"/g,'\\"')+'"]'); return tr?tr.textContent.replace(/\s+/g,' '):''; })() };
  });
  chk('la pantalla de stock muestra el cuadro «🏭 Qué producir» con los tres bloques', r && r.bloques===3 && /Industrias Moreno · Heaven/.test(r.t) && /Multiespumas · Sueña/.test(r.t) && /Sin fábrica asignada/.test(r.t), r && r.t.slice(0,200));
  chk('el título nombra la semana, los 15 días y octubre', r && /esta semana, los próximos 15 días y octubre/.test(r.t));
  chk('el bloque Heaven resume 7 días: 1 · 15 días: 9 · octubre: 19 (1ª quincena 14 · 2ª 5)', r && /7 días: 1 · 15 días: 9 · octubre: 19 \(1ª quincena 14 · 2ª 5\)/.test(r.t), r && r.t.slice(0,600));
  chk('las columnas dicen hasta qué día llega cada horizonte (17/09 y 25/09) y qué queda el 01/10', r && /hasta el 17\/09/.test(r.t) && /hasta el 25\/09/.test(r.t) && /queda el 01\/10/.test(r.t));
  chk('la fila del TITANIO ICE muestra ritmo, hay 5 (3 acá · 2 Moreno) y los cinco números', r && /TITANIO ICE/.test(r.filaH) && /3 acá · 2 Moreno/.test(r.filaH) && /15 d: 10 en 5 entregas/.test(r.filaH) && /30 d: 18 en 9 entregas/.test(r.filaH), r && r.filaH);
  chk('hay botones para copiar cada horizonte por fábrica (7 días, 15 días, octubre)', r && r.botones.some(function(b){ return /📋 7 días/.test(b); }) && r.botones.some(function(b){ return /📋 15 días/.test(b); }) && r.botones.some(function(b){ return /📋 octubre/.test(b); }), r && r.botones.join(' | '));
  chk('el pie del bloque trae el total y el reparto por medida, cerrado, diciendo cuántos modelos hay', r && /TOTAL/.test(r.t) && /▸ por medida · 160x190 · 1 modelo/.test(r.t) && /▸ por medida · 140x190 · 2 modelos/.test(r.t), r && r.t.slice(-700));
  /* ---------- 5b. Tocar una medida del pie abre sus modelos ---------- */
  const r5b = await page.evaluate(() => {
    var el=document.getElementById('producir');
    var fila=el.querySelector('tr.producir-med[data-b="heaven"][data-md="160x190"]');
    if(!fila) return { sinFila:true };
    fila.click();
    el=document.getElementById('producir');
    var celdas=function(tr){ return Array.from(tr.cells).map(function(td){ return td.textContent.replace(/\s+/g,' ').trim(); }); };
    var sub=Array.from(el.querySelectorAll('tr.producir-modelo[data-producir-md="160x190"]')).map(celdas);
    var med=el.querySelector('tr.producir-med[data-b="heaven"][data-md="160x190"]').textContent.replace(/\s+/g,' ');
    var otrosCerrado=!el.querySelector('tr.producir-modelo[data-producir-md="140x190"]');
    return { sub:sub, med:med, otrosCerrado:otrosCerrado };
  });
  if(process.env.SHOT2){ await page.locator('#producir').screenshot({ path:process.env.SHOT2 }); }
  const r5c = await page.evaluate(() => {
    document.getElementById('producir').querySelector('tr.producir-med[data-b="heaven"][data-md="160x190"]').click();
    return document.getElementById('producir').querySelectorAll('tr.producir-modelo').length;
  });
  chk('tocar «por medida · 160x190» de Heaven despliega el TITANIO ICE con sus cinco números (1 · 9 · 19 · 14 · 5) y lo que hay', !r5b.sinFila && r5b.sub.length===1 && /↳ TITANIO ICE cód CH1201 · hay 5/.test(r5b.sub[0][0]) && r5b.sub[0].slice(1).join(' ')==='1 9 19 14 5', JSON.stringify(r5b.sub));
  chk('la fila abierta marca ▾ y las otras medidas siguen cerradas', /▾ por medida · 160x190/.test(r5b.med) && r5b.otrosCerrado===true, r5b.med);
  chk('tocarla de nuevo la cierra', r5c===0, String(r5c));

  /* ---------- 5c. Los títulos no se pierden al bajar ----------
     El dueño, con la tabla real: «cuando bajo a ver el detalle por medida me pierdo al ver
     solo números sin saber si es para la semana, quincena o qué: no se ven los títulos de
     arriba». La tabla scrollea dentro de su caja y el encabezado queda clavado. */
  const rf = await page.evaluate(() => {
    var el=document.getElementById('producir');
    var wrap=el.querySelector('.prod-wrap');
    if(!wrap) return { sinCaja:true };
    var th=wrap.querySelector('thead th');
    var tot=wrap.querySelector('tfoot tr.prod-total td');
    var cs=function(n,p){ return n?getComputedStyle(n)[p]:''; };
    return { alto:getComputedStyle(wrap).maxHeight, scroll:getComputedStyle(wrap).overflowY,
             thPos:cs(th,'position'), thTop:cs(th,'top'), thZ:cs(th,'zIndex'), thFondo:cs(th,'backgroundColor'),
             totPos:cs(tot,'position'), totBottom:cs(tot,'bottom'), totFondo:cs(tot,'backgroundColor'),
             totTxt:(wrap.querySelector('tfoot tr.prod-total')||{}).textContent.replace(/\s+/g,' ').trim() };
  });
  chk('la tabla scrollea dentro de su propia caja (si no, el encabezado clavado no sirve de nada)', rf && !rf.sinCaja && /vh|px/.test(rf.alto) && (rf.scroll==='auto'||rf.scroll==='scroll'), JSON.stringify(rf&&{alto:rf.alto,scroll:rf.scroll}));
  chk('el encabezado queda clavado arriba, con fondo propio y por encima de las filas', rf && rf.thPos==='sticky' && rf.thTop==='0px' && Number(rf.thZ)>=2 && /rgb/.test(rf.thFondo), JSON.stringify(rf&&{p:rf.thPos,t:rf.thTop,z:rf.thZ,f:rf.thFondo}));
  chk('la fila del TOTAL queda clavada abajo mientras se recorre la lista', rf && rf.totPos==='sticky' && rf.totBottom==='0px' && /rgb/.test(rf.totFondo), JSON.stringify(rf&&{p:rf.totPos,b:rf.totBottom,f:rf.totFondo}));
  chk('el TOTAL dice de qué fábrica es y repite qué es cada número (7 d · 15 d · octubre · 1ª q · 2ª q)', rf && /TOTAL Industrias Moreno · Heaven/.test(rf.totTxt) && /1 7 d/.test(rf.totTxt) && /9 15 d/.test(rf.totTxt) && /19 octubre/.test(rf.totTxt) && /14 1ª q/.test(rf.totTxt) && /5 2ª q/.test(rf.totTxt), rf && rf.totTxt);
  chk('el bloque «sin fábrica asignada» pide que el dueño diga dónde se hacen', r && /Decí en cuál se hacen/.test(r.t) && /línea que vende ROHO/.test(r.t));
  chk('nada de plata en el cuadro: ni Bs ni montos', r && !/Bs\b/.test(r.t) && !/\$/.test(r.t));
  chk('la pantalla no tiró errores', errors.length===0, errors.join(' | '));

  /* ---------- 6. El texto para la fábrica ---------- */
  r = await page.evaluate(() => {
    var copiado=''; var orig=window.copyText; window.copyText=function(t){ copiado=t; };
    copiarProducir('heaven','mes'); var mes=copiado; copiado='';
    copiarProducir('heaven','sem'); var sem=copiado; copiado='';
    copiarProducir('suena','sem'); var nada=copiado; copiado='';
    copiarProducir('otros','sem'); var otros=copiado;
    window.copyText=orig;
    return { mes:mes, sem:sem, nada:nada, otros:otros };
  });
  chk('el texto de «sin asignar» reparte por medida con la escritura unificada (130x190 3 · 140x190 4)', /MORFEO · 140x190: 4/.test(r.otros) && /XYZ PLUS · 130X190(CM)?: 3/.test(r.otros) && /Total: 7 unidades · por medida: 130x190 3 · 140x190 4/.test(r.otros), r.otros);
  chk('el texto de octubre lleva el producto con su código, la cantidad y el reparto por quincena', /PRODUCIR PARA OCTUBRE \(TODO EL MES\) — INDUSTRIAS MORENO · HEAVEN/.test(r.mes) && /TITANIO ICE · 160x190 \(cód CH1201\): 19 — 1ª quincena 14 · 2ª quincena 5/.test(r.mes), r.mes);
  chk('…y cierra con el total y el reparto por medida, sin plata', /Total: 19 unidades · por medida: 160x190 19/.test(r.mes) && !/Bs/.test(r.mes));
  chk('el de la semana dice 1 para el TITANIO ICE y explica qué cubre', /PRODUCIR PARA ESTA SEMANA/.test(r.sem) && /TITANIO ICE · 160x190 \(cód CH1201\): 1 —/.test(r.sem) && /Total: 1 unidad ·/.test(r.sem) && /Cubre lo vendido sin entregar/.test(r.sem), r.sem);
  chk('si no hay nada que producir no copia nada (avisa)', r.nada==='');

  /* ---------- 7. Ver también los cubiertos, y sin conteo no hay cuadro ---------- */
  r = await page.evaluate(() => {
    producirVerTodo();
    var el=document.getElementById('producir'), n=el?el.querySelectorAll('tr[data-producir-k]').length:0;
    producirVerTodo();
    var n2=document.getElementById('producir').querySelectorAll('tr[data-producir-k]').length;
    return { todos:n, soloAlgo:n2 };
  });
  chk('«Ver también los cubiertos» agrega los que rotan pero no necesitan nada (y vuelve)', r.todos>r.soloAlgo && r.soloAlgo===5, JSON.stringify(r));
  r = await page.evaluate(() => {
    var guard=JSON.parse(JSON.stringify(STOCK)); STOCK.c={ f:'', u:{} }; renderStock();
    var hay=!!document.getElementById('producir'); STOCK=guard; stockOlvidarIndice(); renderStock();
    return { sinConteo:hay, conConteo:!!document.getElementById('producir') };
  });
  chk('sin conteo del depósito no se calcula nada (no se inventa un número); con conteo vuelve', r.sinConteo===false && r.conConteo===true, JSON.stringify(r));
  chk('sin errores en la página al final', errors.length===0, errors.join(' | '));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
