/* 🏪 CUÁNTO DEL PEDIDO A PRODUCCIÓN ES POR LAS TIENDAS (19/10; dueño: «la idea es tener un consolidado general para hacer el pedido a
   producción, pero veo que no tomas en cuenta lo que pedirán las tiendas, en especial de Sueña»; eligió «Mostrarlo en el panel», SIN cambiar
   ningún número).

   TP1  La cuenta: la parte de las tiendas = el pedido de siempre − el mismo pedido sin la demanda de las tiendas. Sueña que rota SOLO por
        sus ventas de tienda es todo «de las tiendas»; la almohada que va a las tiendas (RPT) también; lo que una tienda pidió y falta
        entregarle (RPT pendiente) también; el TITANIO del equipo, no.
   TP2  No cambia ningún número: el Plan (7 / 15 días / el mes) y la tabla dan lo mismo antes y después, y el interruptor queda apagado.
   TP3  El Plan dice «Las tiendas ya están en este pedido» con lo de cada marca; primero «Calculando…» (la cuenta va un momento DESPUÉS
        de dibujar, para no volver lento abrir Stock) y enseguida los números.
   TP4  «Qué producir»: debajo del TOTAL de cada bloque, «De esto, por las tiendas: …»; el bloque sin nada de tiendas no muestra la línea.
   TP5  Vale 60 s con la misma planilla: redibujar la muestra al toque; una venta de tienda nueva la rehace.

   Reloj CLAVADO (martes 20/10, 10:30 de Bolivia). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_stock_tiendas_parte.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_a21a3d2.html node tests/test_stock_tiendas_parte.js   (sin la línea: rojas TP1-TP5) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,600)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
/* El mismo arranque que `test_stock_rev2_textos.js` (datos sintéticos «CLIENTE n», red cortada). */
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_textos.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
const ERRS=[];

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1300, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => ERRS.push(e.message)); page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-20T10:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');

  /* El escenario:
     · SOFT 140 (Sueña): 4 ventas de tienda en Charcas (2 c/u, días −2, −4, −6, −8) y ninguna del equipo → rota SOLO por la tienda.
     · SOFT 160 (Sueña): una reposición a Carmelo para pasado mañana, 2 u, sin stock → «vendido sin entregar» de una tienda.
     · ALMOHADA 50x70 (Heaven): 3 reposiciones a Mia Plaza ya salidas (10 c/u, días −2, −5, −9) → en almohadas la RPT ES la venta.
     · TITANIO ICE 160 (Heaven): 3 ventas del equipo (días −1, −3, −5) → NADA de tiendas.
     Todo en 0 en PTF, Banzer y Moreno. */
  const K = await page.evaluate(async () => {
    var k={ s140:_k('COLT0048','COLCHON SOFT','140x190'), s160:_k('COLT0060','COLCHON SOFT','160x190'), alm:_k('CD1403','ALMOHADA','50x70'), ti:_k('CH1201','TITANIO ICE','160x190') };
    window._K=k;
    var tienda=function(id, dias, cod, d, m, c){ var t=_ts(_d(-dias), '11:00:00');
      return _ped({ id:id, fecha:'', turno:'', direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA, vendedor:'Fernando Peinado', cliente:'CLIENTE TIENDA', ts:t, productos:[_lin(cod, d, m, c)] }); };
    var rpt=function(id, oc, fecha, suc, cod, d, m, c, salio){ return _ped({ id:id, oc:oc, fecha:fecha, cliente:suc, vendedor:'Fernando Peinado', entregado:!!salio, ts:_ts(fecha<todayStr()?fecha:todayStr(), '08:00:00'), productos:[_lin(cod, d, m, c)] }); };
    window._P0=[
      tienda('t1', 2, 'COLT0048','COLCHON SOFT','140x190', 2), tienda('t2', 4, 'COLT0048','COLCHON SOFT','140x190', 2),
      tienda('t3', 6, 'COLT0048','COLCHON SOFT','140x190', 2), tienda('t4', 8, 'COLT0048','COLCHON SOFT','140x190', 2),
      rpt('rp1', 'RPT 10-001', _d(2), 'Carmelo', 'COLT0060','COLCHON SOFT','160x190', 2, false),
      rpt('ra1', 'RPT 10-002', _d(-2), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      rpt('ra2', 'RPT 10-003', _d(-5), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      rpt('ra3', 'RPT 10-004', _d(-9), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      _ped({ id:'e1', fecha:_d(-1), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }),
      _ped({ id:'e2', fecha:_d(-3), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] }),
      _ped({ id:'e3', fecha:_d(-5), entregado:true, productos:[_lin('CH1201','TITANIO ICE','160x190',1)] })
    ];
    window._ST0=function(){ return _stock(function(st){ [k.s140, k.s160, k.alm, k.ti].forEach(function(x){ st.c.u[x]=0; st.g[_BZ].u[x]=0; st.g[_IM].u[x]=0; }); }); };
    await _cargar(_P0, _ST0());
    return k;
  });

  // ═══ TP1. La cuenta ═══
  console.log('\n── TP1. La parte de las tiendas ──');
  let r = await page.evaluate(() => {
    if(typeof stockTiendasParteCalc!=='function') return { falta:true };
    var d=stockData(), R=stockProducirCalc(d), base=stockTiendasTotales(R), v=stockTiendasParteCalc(null);
    var f=function(k){ var o=d.lista.filter(function(x){ return x.k===k; })[0]; return o ? { fab:o.fabricar||0, rota:o.objS!=null, comp:o.comp||0 } : null; };
    return { base:base, v:v, s140:f(_K.s140), s160:f(_K.s160), alm:f(_K.alm), ti:f(_K.ti), flag:STOCK_SIN_TIENDAS };
  });
  chk('TP1a existe la cuenta de la parte de las tiendas', !r.falta, r.falta?'no hay stockTiendasParteCalc':null);
  if (!r.falta) {
    chk('TP1b el escenario: SOFT 140 rota (por la tienda), almohada rota (por la RPT), TITANIO rota (equipo), SOFT 160 vendido sin entregar 2',
      r.s140 && r.s140.rota && r.alm && r.alm.rota && r.ti && r.ti.rota && r.s160 && r.s160.comp===2, r);
    chk('TP1c Sueña: TODO el pedido de 7 días es por las tiendas (SOFT 140 + la reposición pendiente del SOFT 160)',
      r.v.suena.sem>0 && r.v.suena.sem===r.base.suena.sem && r.base.suena.sem===r.s140.fab+r.s160.fab, { parte:r.v.suena, base:r.base.suena, s140:r.s140.fab, s160:r.s160.fab });
    chk('TP1d Sueña: también en 15 días y en el mes (lo que no viene de las tiendas = 0)', r.v.suena.quin===r.base.suena.quin && r.v.suena.mes===r.base.suena.mes, { parte:r.v.suena, base:r.base.suena });
    chk('TP1e Heaven: la parte de 7 días es la ALMOHADA (la RPT a la tienda), no el TITANIO del equipo',
      r.v.heaven.sem>0 && r.v.heaven.sem===r.alm.fab && r.base.heaven.sem===r.alm.fab+r.ti.fab && r.ti.fab>0, { parte:r.v.heaven, base:r.base.heaven, alm:r.alm.fab, ti:r.ti.fab });
    chk('TP1f el interruptor queda apagado después de la cuenta', r.flag===false);
  }

  // ═══ TP2. No cambia ningún número ═══
  console.log('\n── TP2. Ningún número del pedido cambia ──');
  r = await page.evaluate(() => {
    var foto=function(){ var d=stockData(); return JSON.stringify(stockPlanDatos(d, d.lista).map(function(x){ return [x.o.k, x.p7, x.p15, x.pm, x.o.fabricar, x.o.comp, x.o.objetivo]; })); };
    var antes=foto();
    if(typeof stockTiendasParteCalc==='function'){ stockTiendasParteCalc(null); stockTiendasParteCalc(null); }
    var despues=foto();
    return { igual:antes===despues, flag:typeof STOCK_SIN_TIENDAS!=='undefined'?STOCK_SIN_TIENDAS:null, n:JSON.parse(antes).length };
  });
  chk('TP2a el Plan (7 / 15 días / el mes, objetivo y vendido sin entregar) da lo mismo antes y después', r.igual && r.n>=4, r);
  chk('TP2b el interruptor sigue apagado', r.flag===false, r);

  // ═══ TP3. El Plan lo dice ═══
  console.log('\n── TP3. El Plan de stock ──');
  r = await page.evaluate(() => {
    STOCK_TP=null; abrirStock(); renderStock();
    var el=document.querySelector('.pl-tiendas');
    return { hay:!!el, alDibujar:el?_txt(el):'' };
  });
  chk('TP3a el Plan tiene la línea de las tiendas', r.hay, r);
  chk('TP3b al dibujar dice «Calculando…» (la cuenta va después: abrir Stock no se vuelve lento)', /Calculando/.test(r.alDibujar), r.alDibujar);
  await page.waitForFunction(() => { var el=document.querySelector('.pl-tiendas'); return el && !/Calculando/.test(el.textContent); }, null, { timeout:8000 }).catch(()=>{});
  r = await page.evaluate(() => {
    var el=document.querySelector('.pl-tiendas'), v=(typeof STOCK_TP!=='undefined' && STOCK_TP) ? STOCK_TP.v : null;
    return { txt:el?_txt(el):'', v:v, mes:stockMesSiguiente(todayStr()).nombre };
  });
  chk('TP3c después dice «Las tiendas ya están en este pedido» y que ya está sumado', /Las tiendas ya están en este pedido/.test(r.txt) && /ya está sumado/i.test(r.txt), r.txt);
  chk('TP3d con los números de cada marca (Sueña y Heaven) y sin ROHO', r.v && r.txt.indexOf('Sueña '+r.v.suena.sem+' · '+r.v.suena.quin+' · '+r.v.suena.mes)>=0 &&
    r.txt.indexOf('Heaven '+r.v.heaven.sem+' · '+r.v.heaven.quin+' · '+r.v.heaven.mes)>=0 && !/ROHO/.test(r.txt) && r.txt.indexOf(r.mes)>=0, r.txt);

  // ═══ TP4. «Qué producir» ═══
  console.log('\n── TP4. «Qué producir» ──');
  r = await page.evaluate(async () => {
    visPrefSet('masVistas', true); renderStock();
    await new Promise(function(res){ setTimeout(res, 50); });
    var fila=function(k){ var td=document.querySelector('#producir [data-tp="'+k+'"]'); if(!td) return null; var tr=td.closest('tr'); return { txt:_txt(td), oculta:!!tr.hidden }; };
    return { suena:fila('suena'), heaven:fila('heaven'), v:STOCK_TP && STOCK_TP.v, mes:stockMesSiguiente(todayStr()).nombre };
  });
  chk('TP4a Sueña: «De esto, por las tiendas: N en 7 días · N en 15 días · N en <mes>»', r.suena && !r.suena.oculta && r.v &&
    r.suena.txt.indexOf('De esto, por las tiendas: '+r.v.suena.sem+' en 7 días · '+r.v.suena.quin+' en 15 días · '+r.v.suena.mes+' en '+r.mes)>=0, r.suena);
  chk('TP4b Heaven también (la almohada de las tiendas)', r.heaven && !r.heaven.oculta && r.v && r.heaven.txt.indexOf('por las tiendas: '+r.v.heaven.sem+' en 7 días')>=0, r.heaven);

  // ═══ TP5. Vale 60 s; un cambio la rehace ═══
  console.log('\n── TP5. Caché y cambios ──');
  r = await page.evaluate(() => { renderStock(); var el=document.querySelector('.pl-tiendas'); return _txt(el); });
  chk('TP5a redibujar con la misma planilla la muestra al toque (sin «Calculando…»)', /Las tiendas ya están/.test(r) && !/Calculando/.test(r), r);
  const antes = await page.evaluate(() => STOCK_TP && STOCK_TP.v.suena.sem);
  r = await page.evaluate(async () => {
    var t=_ts(_d(-1), '12:00:00');
    var P=_P0.concat([ _ped({ id:'t5', fecha:'', turno:'', direccion:DIR_TIENDA+' · Charcas', zona:ZONA_TIENDA, vendedor:'Fernando Peinado', cliente:'CLIENTE TIENDA', ts:t, productos:[_lin('COLT0048','COLCHON SOFT','140x190', 6)] }) ]);
    await _cargar(P, _ST0());
    renderStock();
    var al=_txt(document.querySelector('.pl-tiendas'));
    await new Promise(function(res){ setTimeout(res, 600); });
    return { al:al, despues:_txt(document.querySelector('.pl-tiendas')), v:STOCK_TP && STOCK_TP.v.suena.sem };
  });
  chk('TP5b una venta de tienda nueva rehace la cuenta («Calculando…» y otro número para Sueña)', /Calculando/.test(r.al) && r.v>antes && /Las tiendas ya están/.test(r.despues), { antes:antes, r:r });

  chk('sin errores de la página', ERRS.length===0, ERRS.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
