/* 🏬📊 EL MALL CON NÚMEROS (14/11, mejoras 276, 278, 279, 280 y 281). Todo solo mira.

   LO QUE CUIDA (servidor de mentira con toques, cotizaciones y ventas INVENTADOS; reloj clavado el sábado 14/11/2026 de Bolivia):
   1. 276 ¿Por qué no compraron?: los «solo miró» del mostrador (con su motivo y su medida) + las cotizaciones «no» (`cotLeer`), por tienda
      y por vendedor, la semana contra la anterior, y «lo que conviene revisar» (precio con el producto, la medida que pidieron).
   2. 278 Por persona atendida: lo vendido por tienda = `pryVentas` (`st`, día de carga); solo el mall cuenta gente, las otras «sin conteo»;
      día por día, por vendedor, semana por semana y el MES, que da lo mismo que Proyección → «🏬 Por tienda» (`cxPryTiendas`).
   3. 279 Vendedores por hora: personas atendidas por hora (rueda + es mío) y vendedores presentes (de «Llegué» a «Me fui» sin las pausas),
      en promedio por día con datos; picos, horas tranquilas y la mejor hora de cambio de turno; el filtro de días.
   4. 280 Qué exhibir: lo más vendido del mall contra el stock de la tienda (con y sin conteo) y lo que pidieron y no había.
   5. La ventana: solo con la contraseña, cuatro pestañas, la semana con ‹ ›, lee del servidor; en 390 px no se sale de la pantalla.
   6. 281 En vivo: quién atiende y desde cuándo, la gente y lo vendido de hoy, la última venta; la meta y la caja SOLO si existen sus
      funciones (dobles); se actualiza sola; sin red se queda con lo último y dice de qué hora; `#envivo` / `?envivo=1` la abren con la contraseña.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9 node tests/test_mall_analisis.js
   (CAPTURAS=<carpeta> deja las capturas de cada pestaña y del en vivo, en 1280 y 390 px) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const CAPTURAS = process.env.CAPTURAS || '';
const hora = (hhmm, dia) => new Date((dia||'2026-11-14')+'T'+hhmm+':00-04:00');

/* Toques, cotizaciones y ventas INVENTADOS (nombres «Prueba», clientes inventados). Ver los números a mano en cada chk. */
function PREPARAR(){
  var c=document.getElementById('conn-form'); if(c) c.style.display='none';
  CONNECTED=true; UNLOCKED=true; SERVER_VER='2026-11-14-b';
  try{ localStorage.removeItem(LS_PEND); localStorage.removeItem('me_mall_cola'); localStorage.removeItem('me_mall_aparato'); localStorage.removeItem('me_mis_vendedor'); }catch(e){}
  CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR='';
  try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  ['Ana Prueba','Beto Prueba','Caro Prueba','Dani Prueba'].forEach(function(v){ if(VENDEDORES.indexOf(v)<0) VENDEDORES.push(v); });
  VENDEDOR_SUCURSAL.unshift([/PRUEBA/i, 'Ventura Mall']);
  window._srv={ toques:{}, cots:[], red:'ok', lecturas:0, cotLecturas:0 };
  window._L=[];
  var dia=function(t){ return isoDeTsBolivia(t.ts); };
  apiPost=function(pl){
    if(_srv.red==='cae' && (pl.action==='mallLeer' || pl.action==='cotLeer' || pl.action==='mallToque')) return Promise.reject(new Error('Failed to fetch'));
    if(pl.action==='mallLeer'){ _srv.lecturas++; return Promise.resolve({ ok:true, toques:JSON.parse(JSON.stringify(Object.keys(_srv.toques).map(function(k){ return _srv.toques[k]; }).filter(function(t){ var d=dia(t); return d>=pl.desde && d<=pl.hasta; }))) }); }
    if(pl.action==='cotLeer'){ _srv.cotLecturas++; return Promise.resolve({ ok:true, cots:JSON.parse(JSON.stringify(_srv.cots.filter(function(c){ var d=dia(c); return d>=pl.desde && d<=pl.hasta; }))) }); }
    if(pl.action==='mallToque'){ pl.toques.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts) }); }); return Promise.resolve({ ok:true, n:pl.toques.length, dup:0 }); }
    if(pl.action==='list') return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) });
    return Promise.resolve({ ok:true });
  };
  apiList=function(){ if(_srv.red==='cae') return Promise.reject(new Error('Failed to fetch')); return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
  window._ts=function(hhmm, d){ return new Date((d||'2026-11-14')+'T'+hhmm+':00-04:00').getTime(); };
  window._n=0;
  window._T=function(k, v, hhmm, x, d){ var ts=_ts(hhmm, d); _n++; return Object.assign({ id:'t'+ts+'_'+('00'+_n).slice(-3), ts:ts, tienda:'Ventura Mall', v:v, k:k, r:'', m:'', ref:'', ap:'PRUEBA' }, x||{}); };
  window._esperar=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  window._txt=function(sel){ var e=document.querySelector(sel); return e ? e.innerText.replace(/\s+/g,' ').trim() : ''; };
  /* ---- los toques ---- */
  var A='2026-11-12', B='2026-11-13', P='2026-11-06', L=[];
  /* Día A (jueves 12): mañana Ana y Beto, tarde Caro y Dani */
  L.push(_T('llegue','Ana Prueba','09:00',null,A), _T('llegue','Beto Prueba','09:00',null,A));
  L.push(_T('miro','Ana Prueba','10:10',{ m:'precio' },A), _T('miro','Beto Prueba','10:20',{ m:'precio' },A));
  L.push(_T('fin','Ana Prueba','11:05',{ r:'compro' },A), _T('miro','Beto Prueba','11:30',{ m:'medida', medida:'160x200' },A));
  L.push(_T('pausa','Ana Prueba','12:10',null,A), _T('volvi','Ana Prueba','12:40',null,A));
  L.push(_T('mefui','Ana Prueba','15:00',null,A), _T('mefui','Beto Prueba','15:00',null,A), _T('llegue','Caro Prueba','15:00',null,A), _T('llegue','Dani Prueba','15:00',null,A));
  L.push(_T('miro','Caro Prueba','18:05',{ m:'medida', medida:'160x200' },A), _T('fin','Dani Prueba','18:15',{ r:'compro' },A), _T('miro','Dani Prueba','18:40',{ m:'demora' },A));
  L.push(_T('miro','Caro Prueba','19:10',{ m:'vuelve' },A), _T('esmio','Dani Prueba','19:20',null,A), _T('fin','Dani Prueba','19:30',{ r:'compro' },A), _T('miro','Caro Prueba','19:45',null,A));
  L.push(_T('mefui','Caro Prueba','21:00',null,A), _T('mefui','Dani Prueba','21:00',null,A));
  /* Día B (viernes 13): Ana y Beto todo el día */
  L.push(_T('llegue','Ana Prueba','09:00',null,B), _T('llegue','Beto Prueba','09:00',null,B));
  L.push(_T('miro','Ana Prueba','10:30',{ m:'precio' },B), _T('fin','Ana Prueba','12:20',{ r:'anoto' },B), _T('fin','Beto Prueba','13:20',{ r:'anoto' },B));
  L.push(_T('fin','Ana Prueba','15:20',{ r:'anoto' },B), _T('fin','Beto Prueba','16:20',{ r:'anoto' },B), _T('fin','Ana Prueba','17:20',{ r:'anoto' },B));
  L.push(_T('fin','Beto Prueba','18:10',{ r:'compro' },B), _T('miro','Ana Prueba','18:20',{ m:'paseaba' },B), _T('miro','Beto Prueba','18:30',{ m:'precio' },B));
  L.push(_T('mefui','Ana Prueba','21:00',null,B), _T('mefui','Beto Prueba','21:00',null,B));
  /* La semana anterior (viernes 06) */
  L.push(_T('llegue','Ana Prueba','09:00',null,P), _T('llegue','Beto Prueba','09:00',null,P));
  L.push(_T('miro','Ana Prueba','10:00',{ m:'precio' },P), _T('miro','Beto Prueba','10:30',{ m:'demora' },P), _T('miro','Ana Prueba','11:00',{ m:'paseaba' },P), _T('fin','Beto Prueba','11:30',{ r:'compro' },P));
  L.push(_T('mefui','Ana Prueba','21:00',null,P), _T('mefui','Beto Prueba','21:00',null,P));
  window._TOQ=L;
  L.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts) }); });
  /* ---- las cotizaciones ---- */
  var cot=function(id, d, h, v, t, prods, estado, motivo){ return { id:id, ts:_ts(h, d), vendedor:v, tienda:t, productos:prods, total:0, estado:estado, motivo:motivo }; };
  window._COTS=[
    cot('c1', A, '10:00', 'Isabel Robledo', 'Central', [{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:5000 }], 'no', 'precio'),
    cot('c2', B, '11:00', 'Ana Prueba', 'Ventura Mall', [{ desc:'TITANIO LATEX', medida:'140x190', cant:1 }], 'no', 'precio'),
    cot('c3', B, '16:00', 'Caro Prueba', 'Ventura Mall', [{ desc:'MEMORY FLEX', medida:'160x200', cant:1 }], 'no', 'medida'),
    cot('c4', A, '17:00', 'Isabel Robledo', 'Central', [], 'no', 'compró en otro lado'),
    cot('c5', B, '12:00', 'Beto Prueba', 'Ventura Mall', [{ desc:'SOFT', medida:'90x190', cant:1 }], 'si', ''),
    cot('c6', '2026-11-05', '10:00', 'Isabel Robledo', 'Central', [{ desc:'SOFT', medida:'140x190', cant:1 }], 'no', 'precio')
  ];
  _srv.cots=_COTS.slice();
  /* ---- las ventas ---- */
  var n=0, V=function(v, d, h, prods, entrega){ n++; var bs=prods.reduce(function(s,x){ return s+x.cant*x.precio; }, 0);
    window._L.push({ id:'pv'+n, oc:'11-'+(700+n), nota:'N'+n, cliente:'CLIENTE INVENTADO '+n, celular:'7100000'+n, fecha:entrega||'2026-11-20', turno:'AM', zona:'Norte', direccion:'CALLE 1',
      maps:'', vendedor:v, productos:prods.map(function(x){ return Object.assign({ codigo:'' }, x); }), saldo:0, acuenta:0, pagado:true, metodoPago:'Efectivo '+bs+' @'+d+' #pv'+n, ts:_ts(h, d), rev:1 }); };
  V('Ana Prueba', A, '11:00', [{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:6000 }]);
  V('Dani Prueba', A, '18:20', [{ desc:'MEMORY FLEX', medida:'160x190', cant:1, precio:4000 }, { desc:'ALMOHADA', medida:'50x70', cant:2, precio:200 }]);
  V('Beto Prueba', B, '18:15', [{ desc:'TITANIO LATEX', medida:'140x190', cant:2, precio:6000 }], '2026-12-02');   // se entrega en diciembre
  V('Isabel Robledo', A, '10:00', [{ desc:'SOFT', medida:'140x190', cant:1, precio:3000 }]);
  V('Carola Chavez', B, '12:00', [{ desc:'SOFT', medida:'140x190', cant:1, precio:2500 }]);
  V('Isabel Robledo', P, '10:00', [{ desc:'SOFT', medida:'140x190', cant:1, precio:5000 }]);
  V('Ana Prueba', P, '10:30', [{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:7000 }]);
  V('Eduardo Añez', A, '09:00', [{ desc:'TITANIO LATEX', medida:'140x190', cant:10, precio:9000 }]);   // mayorista: no es del equipo
  /* Hoy (sábado 14), para el en vivo: Caro y Dani en la tarde, Caro atendiendo desde las 17:00 y Dani con un «es mío» desde las 17:50 */
  window._hoyDatos=function(){
    var H='2026-11-14', L=[_T('llegue','Caro Prueba','15:00',null,H), _T('llegue','Dani Prueba','15:02',null,H), _T('miro','Caro Prueba','15:30',{ m:'precio' },H),
      _T('fin','Dani Prueba','16:10',{ r:'compro' },H), _T('atiendo','Caro Prueba','17:00',null,H), _T('esmio','Dani Prueba','17:50',null,H)];
    L.forEach(function(t){ _srv.toques[t.id]=Object.assign({}, t, { dia:isoDeTsBolivia(t.ts) }); });
    n=100;
    V('Dani Prueba', H, '16:15', [{ desc:'MEMORY FLEX', medida:'160x190', cant:1, precio:4500 }]);
    V('Caro Prueba', H, '18:20', [{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:6200 }]);
    V('Isabel Robledo', H, '18:25', [{ desc:'SOFT', medida:'140x190', cant:1, precio:3000 }]);   // otra tienda: no es del mall
  };
}

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (w, h, hh, url, init) => {
    const ctx = await browser.newContext({ viewport:{ width:w, height:h||900 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await ctx.route(/^https:\/\//, r => r.abort());
    if(init) await page.addInitScript(init);
    await page.clock.setFixedTime(hora(hh||'20:00'));
    await page.goto('file://' + PEDIDOS + (url||''), { waitUntil:'load' });
    await page.waitForTimeout(1000);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { await refrescarEstado(); ULTIMO_ERROR=''; CARGA_ESTADO='ok'; });
    return { ctx, page };
  };
  let { ctx, page } = await abrir(1280);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __err:String((e&&e.message)||e).slice(0,400) }; } };

  /* ============ 1 · 276 ¿POR QUÉ NO COMPRARON? (pura) ============ */
  let r = await ev(() => {
    var A=mallPorQueDatos('2026-11-09', '2026-11-15', { toques:_TOQ, cots:_COTS }), B=mallPorQueDatos('2026-11-02', '2026-11-08', { toques:_TOQ, cots:_COTS });
    var T=A.tot; return { T:T, mall:A.porTienda['Ventura Mall'], cen:A.porTienda['Central'], ana:A.porVend['ana prueba'], caro:A.porVend['caro prueba'], isa:A.porVend['isabel robledo'], B:B.tot,
      rev:mallPorQueRevisar(A, B).map(function(x){ return x.k+'|'+x.txt; }), clave:mallAnNom(mallAnProdClave({ desc:'TITANIO LATEX', medida:'140x190' })) };
  });
  const T1=r.T;
  chk('1a · la semana: 14 se fueron sin comprar = 10 «solo miró» del mostrador + 4 cotizaciones «no» (la «sí» no cuenta)', T1.total===14 && T1.mall===10 && T1.cot===4, [T1.total, T1.mall, T1.cot]);
  chk('1b · por motivo: precio 6 (4 del mostrador + 2 cotizaciones), medida 3, demora 1, vuelve 1, paseaba 1, compró en otro lado 1, sin decir 1',
    T1.m.precio===6 && T1.m.medida===3 && T1.m.demora===1 && T1.m.vuelve===1 && T1.m.paseaba===1 && T1.m.otrolado===1 && T1.m.sin===1 && T1.m.otro===0 && T1.conMot===13, T1.m);
  chk('1c · las medidas que pidieron y no había: 160x200 ×3 (2 del mostrador + 1 cotización); y los 5 «📝 Anotó» aparte', T1.medidas['160x200']===3 && Object.keys(T1.medidas).length===1 && T1.anotaron===5, [T1.medidas, T1.anotaron]);
  chk('1d · por tienda: Ventura Mall 12 (mostrador 10 + 2 cotizaciones) y Central 2 (cotizaciones)', r.mall.total===12 && r.mall.cot===2 && r.cen.total===2 && r.cen.m.otrolado===1, [r.mall.total, r.cen.total]);
  chk('1e · por vendedor: Ana 4 con motivo (precio 3, paseaba 1: 3 del mostrador + 1 cotización), atendió 7 y anotó 3; Caro: medida 2, vuelve 1, sin 1; Isabel (Central): 2 cotizaciones',
    r.ana.m.precio===3 && r.ana.m.paseaba===1 && r.ana.conMot===4 && r.ana.mall===3 && r.ana.cot===1 && r.ana.pers===7 && r.ana.anotaron===3 && r.caro.m.medida===2 && r.caro.m.vuelve===1 && r.caro.m.sin===1 && r.isa.total===2 && r.isa.tienda==='Central', [r.ana, r.caro.m, r.isa.total]);
  chk('1f · la semana anterior: 4 (precio 2, demora 1, paseaba 1)', r.B.total===4 && r.B.m.precio===2 && r.B.m.demora===1 && r.B.m.paseaba===1, r.B.m);
  chk('1g · «lo que conviene revisar»: primero el precio (46 %, 6 de 13) con el producto que no se cerró por precio en 2 cotizaciones, después la medida 160x200',
    r.rev.length===2 && /TITANIO LATEX · 140x190$/.test(r.clave) && r.rev[0].indexOf('precio|💲 El 46 % se fue por el precio (6 de 13 que dijeron por qué): revisá el precio del '+r.clave+' (2 cotizaciones no se cerraron por el precio).')===0 &&
    r.rev[1]==='medida|📐 3 pidieron 160x200 y no había: mirá «🛏️ Qué exhibir» → «Pedir a la tienda».', r.rev);
  r = await ev(() => {
    /* reglas sueltas, con datos armados */
    var V=function(m, x){ var o=mallPqVacio(); Object.keys(m).forEach(function(k){ mallPqSumar(o, k, m[k], 'mall'); }); return Object.assign(o, x||{}); };
    var o={};
    o.vacia=mallPorQueRevisar({ tot:mallPqVacio(), porVend:{} }, null);
    o.demora=mallPorQueRevisar({ tot:V({ demora:4, paseaba:6 }), porVend:{} }, null).map(function(x){ return x.k; });
    o.sin=mallPorQueRevisar({ tot:V({ sin:4, paseaba:3, vuelve:3 }), porVend:{} }, null).map(function(x){ return x.k; });
    var Ana=V({ precio:5, paseaba:1 }, { v:'Ana Prueba' }), Bet=V({ precio:1, paseaba:5 }, { v:'Beto Prueba' });
    o.vend=mallPorQueRevisar({ tot:V({ precio:6, paseaba:6 }), porVend:{ a:Ana, b:Bet } }, null).filter(function(x){ return x.k==='vendedor'; }).map(function(x){ return x.txt; });
    o.subio=mallPorQueRevisar({ tot:V({ precio:6, paseaba:4 }), porVend:{} }, { tot:V({ precio:2, paseaba:8 }), porVend:{} })[0].txt;
    return o;
  });
  chk('1h · sin datos: lo dice (y no inventa nada)', r.vacia.length===1 && r.vacia[0].k==='nada' && /nadie anotó/.test(r.vacia[0].txt), r.vacia);
  chk('1i · reglas: la demora (40 %) primero; los que vuelven, los que no dicen por qué y los que pasean, en ese orden (nunca más de 3 líneas)', r.demora.join()==='demora,paseaba' && r.sin.join()==='vuelve,sin,paseaba', [r.demora, r.sin]);
  chk('1j · el vendedor que pierde por precio bastante más que el resto (Ana 83 % contra 17 %)', r.vend.length===1 && /Con Ana Prueba se fue por el precio el 83 % \(con el resto del equipo, el 17 %\)/.test(r.vend[0]), r.vend);
  chk('1k · contra la semana anterior: «la semana anterior, el 20 %»', /El 60 % se fue por el precio .*; la semana anterior, el 20 %/.test(r.subio), r.subio);

  /* ============ 2 · 278 POR PERSONA ATENDIDA (pura) ============ */
  r = await ev(() => {
    var D=mallPersonaDatos('2026-11-09', '2026-11-15', { toques:_TOQ }), P=mallPersonaDatos('2026-11-02', '2026-11-08', { toques:_TOQ });
    var ti={}; D.tiendas.forEach(function(t){ ti[t.st]={ bs:t.bs, n:t.n, conteo:t.conteo }; });
    var ve={}; D.vend.forEach(function(o){ ve[o.v]={ bs:o.bs, n:o.n, pers:o.pers, co:o.co, st:o.st }; });
    return { m:D.mall, ti:ti, ve:ve, d12:D.mall.porDia['2026-11-12'], d13:D.mall.porDia['2026-11-13'], d14:D.mall.porDia['2026-11-14'], bs12:D.tiendas[0].porDia['2026-11-12'], st0:D.tiendas[0].st,
             P:P.mall };
  });
  chk('2a · el mall en la semana: 19 personas (18 de la rueda + 1 «es mío»), compraron 4 (3 + 1 «es mío»), en 2 días con datos', r.m.pers===19 && r.m.rueda===18 && r.m.esmio===1 && r.m.co===4 && r.m.diasConDatos===2, r.m);
  chk('2b · lo vendido por tienda (día de carga, el equipo de Proyección): mall 22.400 en 3 ventas (incluye la que se entrega en diciembre), Central 3.000, Tienda Banzer 2.500; Eduardo no',
    r.ti['Ventura Mall'].bs===22400 && r.ti['Ventura Mall'].n===3 && r.ti['Central'].bs===3000 && r.ti['Tienda Banzer'].bs===2500 && !r.ve['Eduardo Añez'] && r.st0==='Ventura Mall', r.ti);
  chk('2c · solo el mall cuenta gente: las otras tiendas, «sin conteo»', r.ti['Ventura Mall'].conteo===true && r.ti['Central'].conteo===false && r.ti['Tienda Banzer'].conteo===false, r.ti);
  chk('2d · día por día: el 12, 10 personas, 3 compraron, vendido 10.400 (Bs 1.040 por persona); el 13, 9 personas y 1 compró; el 14, sin toques',
    r.d12.pers===10 && r.d12.co===3 && r.bs12===10400 && r.d13.pers===9 && r.d13.co===1 && r.d14.hay===false, [r.d12, r.d13, r.bs12, r.d14]);
  chk('2e · por vendedor: Ana 6.000 y 7 personas (1 compró), Beto 12.000 y 6, Dani 4.400 y 3 (2 compraron, con el «es mío»), Caro 0 y 3; Isabel 3.000 sin conteo',
    r.ve['Ana Prueba'].bs===6000 && r.ve['Ana Prueba'].pers===7 && r.ve['Ana Prueba'].co===1 && r.ve['Beto Prueba'].pers===6 && r.ve['Beto Prueba'].bs===12000 &&
    r.ve['Dani Prueba'].pers===3 && r.ve['Dani Prueba'].co===2 && r.ve['Dani Prueba'].bs===4400 && r.ve['Caro Prueba'].pers===3 && r.ve['Caro Prueba'].bs===0 &&
    r.ve['Isabel Robledo'].bs===3000 && r.ve['Isabel Robledo'].pers===null, r.ve);
  chk('2f · la semana anterior: 4 personas, 1 compró, vendido 7.000', r.P.pers===4 && r.P.co===1 && r.P.bs===7000, r.P);
  r = await ev(() => {
    var R=proyeccionMes('2026-11'), T=cxPryTiendas(R), M=mallPersonaMes('2026-11', { toques:_TOQ }), a={}, b={};
    T.forEach(function(t){ a[t.st]=t.vendido; }); M.tiendas.forEach(function(t){ if(t.bs>0.005) b[t.st]=t.bs; });
    return { a:a, b:b, pers:M.pers, co:M.co };
  });
  chk('2g · el MES (por la entrega): da EXACTAMENTE lo de Proyección → «🏬 Por tienda» (la venta que se entrega en diciembre, afuera)',
    JSON.stringify(r.a)===JSON.stringify(r.b) && r.b['Ventura Mall']===17400 && r.b['Central']===8000 && r.b['Tienda Banzer']===2500, r);
  chk('2h · la gente del mes en el mall: 23 personas (4 + 10 + 9), 5 compraron', r.pers===23 && r.co===5, [r.pers, r.co]);

  /* ============ 3 · 279 VENDEDORES POR HORA (pura) ============ */
  r = await ev(() => {
    var H=mallPresenciaDia('2026-11-12', _TOQ, 0), D=mallHorasDatos('2026-10-18', '2026-11-14', { toques:_TOQ }), h={};
    D.horas.forEach(function(x){ h[x.h]=[Math.round(x.at*1000)/1000, Math.round(x.pres*1000)/1000]; });
    var S=mallHorasDatos('2026-10-18', '2026-11-14', { toques:_TOQ, tipo:'semana' }), F=mallHorasDatos('2026-10-18', '2026-11-14', { toques:_TOQ, tipo:'finde' });
    return { H:H, n:D.nDias, h:h, prom:Math.round(D.prom*10000)/10000, rec:D.recom.map(function(x){ return x.k+'|'+x.txt; }), S:S.nDias, F:F.nDias, Frec:F.recom.map(function(x){ return x.k; }) };
  });
  chk('3a · presencia del jueves 12: 9-11 h 2 vendedores (120 min), 12 h 90 min (la pausa de Ana de 12:10 a 12:40), 15 h ya los de la tarde, 21 h nadie',
    r.H[9]===120 && r.H[11]===120 && r.H[12]===90 && r.H[15]===120 && r.H[20]===120 && !r.H[21] && !r.H[8], r.H);
  chk('3b · 3 días con datos; por hora, en promedio: 10 h 1,667 personas, 18 h 2, 19 h 1 (2 de la rueda + 1 «es mío» en 3 días), 14 h 0; vendedores 2 (12 h: 1,833)',
    r.n===3 && r.h[10][0]===1.667 && r.h[18][0]===2 && r.h[19][0]===1 && r.h[14][0]===0 && r.h[9][1]===2 && r.h[12][1]===1.833 && r.h[20][1]===2 && Object.keys(r.h).join()==='9,10,11,12,13,14,15,16,17,18,19,20', r.h);
  chk('3c · el promedio de las horas abiertas: 23 personas / 3 días / 12 horas = 0,6389', r.prom===0.6389, r.prom);
  const rec=r.rec;
  chk('3d · recomendaciones: pocos días, los picos (10-12 «más del doble»: que alguien de la tarde entre antes; 18-19 «el triple»: que se crucen los turnos)',
    rec[0].indexOf('pocos|ℹ️ Con 3 días de datos')===0 &&
    rec.indexOf('pico|📈 De 10 a 12 h entra más del doble de gente (1,5 personas por hora contra 0,6 de promedio) y hay 2,0 vendedores: conviene que alguien de la tarde entre antes (o sumar un vendedor a esa hora).')===1 &&
    rec.indexOf('pico|📈 De 18 a 19 h entra el triple de gente (2,0 personas por hora contra 0,6 de promedio) y hay 2,0 vendedores: conviene que se crucen los dos turnos (que alguien de la mañana se quede).')===2, rec);
  chk('3e · las tranquilas (9, 14 y 20 h: «con 1 alcanza») y la mejor hora de cambio de turno: las 14:00 (hoy es a las 15:00)',
    rec.filter(function(x){ return /^bajo\|/.test(x) && /con 1 alcanza/.test(x); }).length===3 && rec.indexOf('bajo|😴 De 14 a 15 h casi no entra gente y hay 2,0 vendedores: con 1 alcanza.')>=0 &&
    rec[rec.length-1]==='cambio|🔄 La mejor hora para el cambio de turno: las 14:00 (es la más tranquila entre las 12 y las 18: casi no entra gente). Hoy el cambio es a las 15:00.' && rec.length===7, rec);
  chk('3f · el filtro: lunes a viernes = los 3 días (jueves y viernes); sábado y domingo = ninguno, y lo dice', r.S===3 && r.F===0 && r.Frec.join()==='nada', [r.S, r.F, r.Frec]);
  r = await ev(() => { var L=[_T('llegue','Ana Prueba','09:00',null,'2026-11-10'), _T('mefui','Ana Prueba','12:00',null,'2026-11-10'), _T('llegue','Beto Prueba','10:00',null,'2026-11-10'),
      _T('atiendo','Beto Prueba','11:30',null,'2026-11-10'), _T('mefui','Beto Prueba','11:40',null,'2026-11-10'), _T('fin','Beto Prueba','11:50',{ r:'anoto' },'2026-11-10'), _T('llegue','Beto Prueba','13:00',null,'2026-11-10')];
    return mallPresenciaDia('2026-11-10', L, 0); });
  chk('3g · «Me fui» atendiendo: sale recién al terminar su cliente (Beto de 10:00 a 11:50); el que no tocó «Me fui» queda hasta el último toque del día', r[9]===60 && r[10]===120 && r[11]===110 && !r[12] && !r[13], r);

  /* ============ 4 · 280 QUÉ EXHIBIR (pura) ============ */
  r = await ev(() => {
    var K=function(d, m){ return mallAnProdClave({ desc:d, medida:m }); };
    var kT=K('TITANIO LATEX','140x190'), kM=K('MEMORY FLEX','160x190'), kS=K('SOFT','90x190'), kM2=K('MEMORY FLEX','160x200');
    var sin=mallExhibirDatos('2026-11-14', 30, { toques:_TOQ, cots:_COTS });
    var tst={ 'Ventura Mall':{ base:{ f:'2026-10-30' }, filas:[{ k:kT, tiene:0, libre:0 }, { k:kM, tiene:2, libre:2 }, { k:kS, tiene:3, libre:3 }, { k:kM2, tiene:1, libre:1 }] } };
    var con=mallExhibirDatos('2026-11-14', 30, { toques:_TOQ, cots:_COTS, tst:tst });
    var nom=function(x){ return x.medida ? ('med:'+x.medida+':'+x.por) : (x.f.k===kT ? 'T' : x.f.k===kM ? 'M' : x.f.k===kS ? 'S' : x.f.k===kM2 ? 'M2' : x.f.k)+':'+x.por; };
    return { top:sin.top.map(function(f){ return (f.k===kT ? 'T' : f.k===kM ? 'M' : f.k)+':'+f.u+':'+f.ventas; }), sinEx:sin.exhibir.map(nom), sinPe:sin.pedir.map(nom), sinSa:sin.sacar.length, sinSt:sin.conStock,
             conEx:con.exhibir.map(nom), conPe:con.pedir.map(nom), conSa:con.sacar.map(function(f){ return f.k===kS ? 'S' : f.k; }), med:con.medidas };
  });
  chk('4a · lo más vendido en el mall (30 días, solo colchones/somieres; la almohada no): TITANIO 140x190 4 unidades en 3 ventas, MEMORY FLEX 160x190 1', r.top.join()==='T:4:3,M:1:1', r.top);
  chk('4b · sin el conteo de la tienda: exhibir lo que más se vende; pedir la medida 160x200 que pidieron 3 y la cotización que no se cerró; «sacar» no se puede saber',
    r.sinSt===false && r.sinEx.join()==='T:vende,M:vende' && r.sinPe.join()==='M2:pidieron,med:160x200:medida' && r.sinSa===0, [r.sinEx, r.sinPe]);
  chk('4c · con el conteo: el TITANIO se vende y la tienda tiene 0 → «Pedir a la tienda»; el MEMORY 160x190 → «Exhibir»; el SOFT 90x190 (3, no se vendió) → «Sacar»',
    r.conPe.join()==='T:vende' && r.conEx[0]==='M:vende' && r.conSa.join()==='S', [r.conEx, r.conPe, r.conSa]);
  chk('4d · …y la 160x200 que dijeron que no había, la tienda SÍ la tiene: «que esté a la vista»', r.conEx.indexOf('med:160x200:avista')>=0 && r.med['160x200']===3, [r.conEx, r.med]);

  /* ============ 5 · LA VENTANA ============ */
  r = await ev(async () => {
    UNLOCKED=false; var o={ sin:mallAnAbrir(), vis:document.getElementById('mallan-ov').style.display };
    UNLOCKED=true; showView('conta'); try{ setContaTab('proy'); }catch(e){} await _esperar(150);
    o.boton=!!document.getElementById('pry-mall-btn') && !!document.getElementById('pry-envivo-btn');
    document.getElementById('pry-mall-btn').click(); await _esperar(400);
    o.vis2=document.getElementById('mallan-ov').style.display; o.tabs=[].map.call(document.querySelectorAll('#mallan-tabs [role=tab]'), function(b){ return b.textContent+(b.getAttribute('aria-selected')==='true' ? '*' : ''); });
    o.sem=_txt('#mallan-sem-txt'); o.sig=document.getElementById('mallan-sem-sig').disabled; o.lect=_srv.lecturas; o.cl=_srv.cotLecturas;
    o.txt=_txt('#mallan-wrap'); return o; });
  chk('5a · sin la contraseña no abre', r.sin===false && r.vis==='none', r);
  chk('5b · Proyección tiene «🏬 El mall» y «📡 El mall en vivo»; la ventana abre en «Por qué no compraron», en la semana de hoy (sin ›), y lee del servidor',
    r.boton && r.vis2==='flex' && r.tabs.length===4 && r.tabs[0]==='🤔 Por qué no compraron*' && /Semana del 09\/11 al 15\/11 \(esta\)/.test(r.sem) && r.sig===true && r.lect>=1 && r.cl>=1, r);
  chk('5c · la pestaña muestra lo de la semana: «lo que conviene revisar», 14 sin comprar, el precio 46 % y la tabla por tienda',
    /Lo que conviene revisar/.test(r.txt) && /se fue por el precio/.test(r.txt) && /Se fueron sin comprar 14 ▲ 10 más que la semana anterior/i.test(r.txt) && /46 %/.test(r.txt) && /Por tienda/.test(r.txt) && /Por vendedor/.test(r.txt), r.txt.slice(0,600));
  r = await ev(async () => { mallAnTab('persona'); await _esperar(300); var o={ txt:_txt('#mallan-wrap') };
    o.mes=[].map.call(document.querySelectorAll('#mallan-mes tbody tr'), function(tr){ return tr.getAttribute('data-st')+':'+tr.getAttribute('data-bs'); });
    o.cen=_txt('#mallan-tiendas tr[data-st="Central"]'); o.mall=_txt('#mallan-tiendas tr[data-st="Ventura Mall"]'); return o; });
  chk('5d · «Por persona atendida»: el mall con 19 personas, 21 % compró, Bs 1.179 por persona; Central y Tienda Banzer «sin conteo»',
    /19/.test(r.mall) && /21 %/.test(r.mall) && /Bs 1\.179/.test(r.mall) && /sin conteo/.test(r.cen) && /Bs 3\.000/.test(r.cen), [r.mall, r.cen]);
  chk('5e · el mes en la pantalla: los mismos números de Proyección por tienda', r.mes.join()==='Ventura Mall:17400,Central:8000,Tienda Banzer:2500', r.mes);
  r = await ev(async () => { mallAnTab('horas'); await _esperar(300); var o={ txt:_txt('#mallan-wrap'), svg:!!document.querySelector('#mallan-wrap svg.mallan-svg'), barras:document.querySelectorAll('#mallan-wrap .mallan-bar').length, filas:document.querySelectorAll('#mallan-horas tbody tr').length };
    mallAnTipo('finde'); await _esperar(100); o.finde=_txt('#mallan-wrap'); mallAnTipo('todos'); mallAnSemanas(2); await _esperar(200); o.dos=_txt('#mallan-wrap'); mallAnSemanas(4); return o; });
  chk('5f · «Vendedores por hora»: el gráfico (barras + línea) y la tabla de 9 a 20 h, con «Qué conviene»', r.svg && r.barras===9 && r.filas===12 && /Qué conviene/.test(r.txt) && /cambio de turno: las 14:00/.test(r.txt), [r.barras, r.filas]);
  chk('5g · sábado y domingo: sin días, lo dice; 2 semanas: del 01/11', /Todavía no hay días con toques/.test(r.finde) && /Del 01\/11 al 14\/11/.test(r.dos), r.dos.slice(0,200));
  r = await ev(async () => { mallAnTab('exhibir'); await _esperar(300); return { txt:_txt('#mallan-wrap'), si:_txt('#mallan-ex-si'), pe:_txt('#mallan-ex-pedir'), sa:_txt('#mallan-ex-sacar') }; });
  chk('5h · «Qué exhibir» sin conteo de la tienda: Exhibir el TITANIO, Pedir la 160x200, y «Sacar» explica que falta el conteo',
    /TITANIO/.test(r.si) && /160x200/.test(r.pe) && /hace falta el conteo de la tienda/.test(r.sa) && /sin el stock de la tienda/.test(r.txt), [r.si, r.pe, r.sa]);
  r = await ev(async () => { mallAnTab('porque'); mallAnSemanaMover(-1); await _esperar(300); var o={ sem:_txt('#mallan-sem-txt'), sig:document.getElementById('mallan-sem-sig').disabled, txt:_txt('#mallan-wrap'), cop:mallAnTexto() };
    mallAnSemanaMover(1); await _esperar(200); o.vuelta=_txt('#mallan-sem-txt'); mallAnSemanaMover(1); o.noPasa=_txt('#mallan-sem-txt'); return o; });
  chk('5i · ‹ la semana anterior (02/11 a 08/11): 4 sin comprar; › vuelve y no pasa de esta semana', /Semana del 02\/11 al 08\/11/.test(r.sem) && r.sig===false && /Se fueron sin comprar 4/i.test(r.txt) && /\(esta\)/.test(r.vuelta) && r.noPasa===r.vuelta, [r.sem, r.vuelta, r.noPasa]);
  chk('5j · «📋 Copiar» arma el texto de la pestaña', /¿Por qué no compraron\? \(4\)/.test(r.cop) && /Lo que conviene revisar/.test(r.cop), r.cop);
  r = await ev(async () => { SERVER_VER='2026-11-14-a'; MALL.leido={}; MALL.dias={}; MALLAN.cots={}; MALLAN.cotDias={}; var l0=_srv.lecturas; mallAnTab('persona'); await _esperar(200);
    var o={ txt:_txt('#mallan-wrap'), lect:_srv.lecturas-l0 }; SERVER_VER='2026-11-14-b'; return o; });
  chk('5k · con el servidor de antes: no lee los toques, lo dice, y lo vendido por tienda se ve igual', r.lect===0 && /necesita el servidor nuevo/.test(r.txt) && /Bs 22\.400/.test(r.txt), r.txt.slice(0,300));
  /* Un conteo de la tienda de mentira (para «Qué exhibir» con stock en las capturas) */
  const conConteo = () => ev(() => { window._tstAntes=[tstHayConteo, tstCalcular]; var K=function(d, m){ return mallAnProdClave({ desc:d, medida:m }); };
    tstHayConteo=function(){ return true; };
    tstCalcular=function(){ return { 'Ventura Mall':{ base:{ f:'2026-10-30' }, filas:[{ k:K('TITANIO LATEX','140x190'), tiene:0, libre:0 }, { k:K('MEMORY FLEX','160x190'), tiene:2, libre:2 }, { k:K('SOFT','90x190'), tiene:3, libre:3 }, { k:K('MEMORY FLEX','160x200'), tiene:1, libre:1 }] } }; }; });
  const sinConteo = () => ev(() => { if(window._tstAntes){ tstHayConteo=_tstAntes[0]; tstCalcular=_tstAntes[1]; } });
  if(CAPTURAS){
    await page.setViewportSize({ width:1280, height:1500 });
    await ev(async () => { SERVER_VER='2026-11-14-b'; MALLAN.lunes=''; MALL.leido={}; MALLAN.cotDias={}; mallAnCerrar(); mallAnAbrir('porque'); await _esperar(400); });
    await conConteo();
    for(const t of ['porque','persona','horas','exhibir']){
      await ev(async (t) => { mallAnTab(t); await _esperar(400); }, t);
      await page.screenshot({ path:path.join(CAPTURAS, 'mall_analisis_'+t+'_1280.png') });
    }
    await sinConteo();
    await page.setViewportSize({ width:1280, height:900 });
  }
  await ev(() => mallAnCerrar());

  /* ============ 6 · 281 EN VIVO ============ */
  await page.clock.setFixedTime(hora('18:30'));
  r = await ev(async () => {
    _hoyDatos(); await refrescarEstado(); MVIV_MS=400;
    document.getElementById('pry-envivo-btn').click(); await _esperar(600);
    var o={ vis:document.getElementById('mviv-ov').style.display, txt:_txt('#mviv-wrap'), est:_txt('#mviv-est'), pers:_txt('#mviv-pers'), co:_txt('#mviv-co'), miro:_txt('#mviv-miro'), pct:_txt('#mviv-pct'),
            bs:_txt('#mviv-bs'), ult:_txt('#mviv-ult'), meta:!!document.getElementById('mviv-meta'), caja:!!document.getElementById('mviv-caja'), horas:_txt('#mviv-horas'),
            caro:_txt('.mviv-v[data-v="Caro Prueba"]'), dani:_txt('.mviv-v[data-v="Dani Prueba"]') };
    return o; });
  chk('6a · «📡 El mall en vivo» abre: los dos atendiendo (Caro desde las 17:00, hace 1 h 30 min; Dani con un «es mío» desde las 17:50, hace 40 min)',
    r.vis==='flex' && /Están todos atendiendo/.test(r.txt) && /Atendiendo/.test(r.caro) && /desde 17:00 · hace 1 h 30 min/.test(r.caro) && /Es mío/.test(r.dani) && /desde 17:50 · hace 40 min/.test(r.dani), [r.caro, r.dani]);
  chk('6b · la gente de hoy: 4 atendidos (3 de la rueda + 1 es mío), 1 compró (25 %), 1 solo miró', r.pers==='4' && r.co==='1' && r.miro==='1' && r.pct==='25 %', [r.pers, r.co, r.miro, r.pct]);
  chk('6c · vendido hoy en la tienda: Bs 10.700 (Isabel, de Central, no); la última venta: 18:20, Caro, Bs 6.200, TITANIO LATEX', r.bs==='Bs 10.700' && /a las 18:20: Caro Prueba · Bs 6\.200 · TITANIO LATEX 140x190/.test(r.ult), [r.bs, r.ult]);
  chk('6d · sin las funciones de la meta y la caja (otros trabajos), esas partes NO se muestran', !r.meta && !r.caja, r);
  chk('6e · la gente por hora (15 h 1, 16 h 1, 17 h 2) y «🟢 En vivo»', /^1 15 1 16 2 17$/.test(r.horas) && /En vivo · cada 15 s · 18:30/.test(r.est), [r.horas, r.est]);
  r = await ev(async () => {
    var l0=_srv.lecturas; _srv.toques['nuevo1']={ id:'nuevo1', ts:_ts('18:28'), dia:'2026-11-14', tienda:'Ventura Mall', v:'Caro Prueba', k:'fin', r:'anoto', m:'', ref:'', ap:'X' };
    _srv.toques['nuevo2']={ id:'nuevo2', ts:_ts('18:29'), dia:'2026-11-14', tienda:'Ventura Mall', v:'Caro Prueba', k:'miro', r:'', m:'paseaba', ref:'', ap:'X' };
    await _esperar(1300); var o={ lect:_srv.lecturas-l0, pers:_txt('#mviv-pers'), caro:_txt('.mviv-v[data-v="Caro Prueba"]') };
    window.metaDiaTienda=function(t, d){ return t==='Ventura Mall' && d==='2026-11-14' ? { meta:20000, minima:15000, lleva:10700, porVend:{} } : null; };
    window.cajaResumenDia=function(t, d){ return { ventas:10700, cobrado:8000, efectivoCobrado:3000, retirado:0, quedoAyer:500, debeHaber:3500, contadoAm:500, contadoPm:null, dif:0, cerrada:false, faltan:['el conteo de la tarde'] }; };
    await mvivTic(); o.meta=_txt('#mviv-meta'); o.caja=_txt('#mviv-caja');
    _srv.red='cae'; await mvivTic(); o.err=_txt('#mviv-est'); o.siguePers=_txt('#mviv-pers'); o.sigueBs=_txt('#mviv-bs'); _srv.red='ok';
    return o; });
  chk('6f · se actualiza sola (el reloj de 15 s, acá acortado): leyó del servidor; Caro terminó (anotó) y atendió a otro que solo miró: 5 atendidos, Caro libre', r.lect>=2 && r.pers==='5' && /Libre|Le toca/.test(r.caro), r);
  chk('6g · con `metaDiaTienda`: la meta de hoy, 54 %, faltan Bs 9.300', /Meta de hoy Bs 20\.000 · mínima Bs 15\.000 54 %/.test(r.meta) && /faltan Bs 9\.300/.test(r.meta), r.meta);
  chk('6h · con `cajaResumenDia`: debería haber Bs 3.500 en efectivo (500 de ayer + 3.000 cobrado), y lo que falta', /Bs 3\.500 debería haber en efectivo/.test(r.caja) && /Quedó de ayer Bs 500/.test(r.caja) && /Efectivo cobrado hoy Bs 3\.000/.test(r.caja) && /Falta: el conteo de la tarde/.test(r.caja), r.caja);
  chk('6i · sin red: se queda con lo último y dice de qué hora es', /No contestó la planilla: lo de las 18:30/.test(r.err) && /reintenta solo/.test(r.err) && r.siguePers==='5' && r.sigueBs==='Bs 10.700', r);
  if(CAPTURAS){ await ev(async () => { await mvivTic(); await _esperar(200); }); await page.screenshot({ path:path.join(CAPTURAS, 'mall_analisis_envivo_1280.png') }); }
  r = await ev(async () => { mvivCerrar(); await _esperar(50); var t=MVIV.timer; delete window.metaDiaTienda; delete window.cajaResumenDia; return { vis:document.getElementById('mviv-ov').style.display, t:t }; });
  chk('6j · cerrar apaga el reloj', r.vis==='none' && !r.t, r);
  chk('sin errores de la página (1280 px)', errores.length===0, errores);
  await ctx.close();

  /* ============ 7 · EN EL CELULAR (390 px) y EL ATAJO ============ */
  ({ ctx, page } = await abrir(390, 844, '18:30', '#envivo', () => { window.MVIV_PRUEBA=1; }));
  r = await ev(async () => {
    var o={ vis:document.getElementById('mviv-ov').style.display };
    UNLOCKED=false; mvivPintar(); o.lock=_txt('#mviv-wrap');
    localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
    document.getElementById('mviv-pass').value='otra'; mvivClave(); o.mal=!document.getElementById('mviv-pass-err').hidden && !UNLOCKED;
    document.getElementById('mviv-pass').value='clave-de-prueba'; mvivClave(); await _esperar(500);
    o.unl=UNLOCKED; o.txt=_txt('#mviv-wrap');
    var b=document.getElementById('mviv-body'); o.sw=b.scrollWidth; o.cw=b.clientWidth; o.dw=document.documentElement.scrollWidth; o.iw=innerWidth;
    return o; });
  chk('7a · `#envivo` en la dirección abre la pantalla; sin la contraseña pide la de Administración (una equivocada no entra)', r.vis==='flex' && /con la contraseña de Administración/.test(r.lock) && r.mal, r);
  chk('7b · con la contraseña: la pantalla del mall (lo vendido hoy, la gente), sin salirse de los 390 px', r.unl && /En el mostrador ahora/.test(r.txt) && /Vendido hoy en la tienda/.test(r.txt) && r.sw<=r.cw+1 && r.dw<=r.iw, r);
  if(CAPTURAS){
    await ev(async () => { try{ saludCerrar(); }catch(e){} _hoyDatos(); await refrescarEstado(); await mvivTic(); await _esperar(300); });
    await page.screenshot({ path:path.join(CAPTURAS, 'mall_analisis_envivo_390.png'), fullPage:false });
    await ev(async () => { window.metaDiaTienda=function(){ return { meta:20000, minima:15000, lleva:10700, porVend:{} }; };
      window.cajaResumenDia=function(){ return { debeHaber:3500, quedoAyer:500, efectivoCobrado:3000, retirado:0, contadoAm:500, contadoPm:null, dif:0, cerrada:false, faltan:['el conteo de la tarde'] }; };
      await mvivTic(); await _esperar(200); });
    await page.setViewportSize({ width:390, height:1500 });
    await page.screenshot({ path:path.join(CAPTURAS, 'mall_analisis_envivo_390_entera.png') });
    await page.setViewportSize({ width:390, height:844 });
    await ev(() => { delete window.metaDiaTienda; delete window.cajaResumenDia; });
  }
  r = await ev(async () => { mvivCerrar(); await _esperar(50); var o={ hash:location.hash };
    mallAnAbrir('persona'); await _esperar(400); var b=document.getElementById('mallan-body'), o2={ sw:b.scrollWidth, cw:b.clientWidth, dw:document.documentElement.scrollWidth, iw:innerWidth };
    var tabs=document.getElementById('mallan-tabs'); o2.tabsOk=tabs.getBoundingClientRect().right<=innerWidth+1; return Object.assign(o, o2); });
  chk('7c · cerrar saca `#envivo` de la dirección', r.hash==='', r);
  chk('7d · «El mall» en 390 px: la ventana no ensancha la página (las tablas se corren adentro)', r.sw<=r.cw+1 && r.dw<=r.iw && r.tabsOk, r);
  if(CAPTURAS){
    await page.setViewportSize({ width:390, height:2400 });
    await ev(() => { window._tstAntes=[tstHayConteo, tstCalcular]; var K=function(d, m){ return mallAnProdClave({ desc:d, medida:m }); };
      tstHayConteo=function(){ return true; };
      tstCalcular=function(){ return { 'Ventura Mall':{ base:{ f:'2026-10-30' }, filas:[{ k:K('TITANIO LATEX','140x190'), tiene:0, libre:0 }, { k:K('MEMORY FLEX','160x190'), tiene:2, libre:2 }, { k:K('SOFT','90x190'), tiene:3, libre:3 }, { k:K('MEMORY FLEX','160x200'), tiene:1, libre:1 }] } }; }; });
    for(const t of ['porque','persona','horas','exhibir']){ await ev(async (t) => { mallAnTab(t); await _esperar(400); }, t); await page.screenshot({ path:path.join(CAPTURAS, 'mall_analisis_'+t+'_390.png') }); }
  }
  chk('sin errores de la página (390 px)', errores.length===0, errores);
  await ctx.close();

  /* ?envivo=1 */
  ({ ctx, page } = await abrir(1280, 900, '18:30', '?envivo=1', () => { window.MVIV_PRUEBA=1; }));
  r = await ev(() => ({ vis:document.getElementById('mviv-ov').style.display }));
  chk('7e · `?envivo=1` también la abre', r.vis==='flex', r);
  await ctx.close();
  ({ ctx, page } = await abrir(1280, 900, '18:30', '#envivo'));
  r = await ev(() => ({ vis:document.getElementById('mviv-ov').style.display }));
  chk('7f · en Playwright sin MVIV_PRUEBA, el atajo de la dirección no hace nada', r.vis==='none', r);
  await ctx.close();
  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
