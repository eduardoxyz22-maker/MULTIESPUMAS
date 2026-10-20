/* 🏭 PEDIDO A PRODUCCIÓN: el total, «qué va a dónde» y la ventana aparte (20/10; dueño: «la idea es que simplemente al hacer el pedido
   se genere el consolidado y ahí muestre qué pedir a producción, y en otra pestaña qué va a qué tienda en los próximos 7 días, 15, 30 y
   para el siguiente mes… o se abra una pestaña o tabla»; vio el ejemplo y dijo «Publica»).

   RP1  La columna «Hasta el <fin del mes que viene>» = 15 días + el mes, producto por producto, por medida y en el TOTAL de cada bloque.
   RP2  «Qué producir» ya no trae el cuadro del total ni la planilla: una línea con 7 / 15 / 30 días / todo noviembre y el botón; el botón
        también está en la barra de Stock y en el Plan de stock.
   RP3  El reparto de cada producto suma EXACTO lo que dice «Qué producir» (7, 15 y 30 días y hasta el 30/11), y la parte de las tiendas
        es la misma de la línea «🏪 De esto, por las tiendas».
   RP4  A dónde va: la venta de tienda de Charcas y Mutualista se reparte 2 a 1 (lo que vendió cada una); la reposición pendiente de
        Carmelo, a Carmelo; la almohada que va por RPT, a Mia Plaza; el TITANIO de clientes de los dos lados de la línea, a PTF y a
        Banzer; el que Banzer ya tiene de sobra, todo a PTF; lo que no rota, a PTF.
   RP5  La ventana, pestaña «📦 Qué pedir a producción»: abre en 7 días, los cuatro plazos con su total, el número grande, una tarjeta por
        fábrica (Industrias Moreno = Heaven + ROHO; Multiespumas = Sueña), cada producto con su número, el detalle al tocarlo y
        «🏬 N son para reponer las tiendas».
   RP6  Pestaña «🗺️ Qué va a dónde»: PTF + Banzer + tiendas = el total, los porcentajes suman 100, cada tienda con su lista, la tabla
        por producto cierra por fila y por columna, y «Ver a qué tienda va» lleva ahí.
   RP7  Copiar: el pedido de una fábrica, todo el reparto y lo de una tienda; «todo hasta el 30/11» de siempre.
   RP8  30 días: la misma cuenta que 15 días (con 15 da lo mismo que 15 días), nunca menos que 15 días ni más que el total; cada plazo
        incluye al anterior.
   RP9  No cambia ningún número del pedido; el interruptor «sin tiendas» queda apagado; sin conteo lo dice; ✕ y Esc cierran; en el celular
        (390 px) nada se sale de la pantalla y la cabecera entra en una línea.

   Reloj CLAVADO (martes 20/10, 10:30 de Bolivia). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_producir_reparto.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_66fb470.html node tests/test_producir_reparto.js   (sin ventana ni 30 días: rojas RP2, RP3, RP5-RP9) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,700)):''); };
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

  /* El escenario (todo en 0 en PTF, Banzer y Moreno salvo lo que se dice):
     · SOFT 140 (Sueña): venta de tienda, 4 en Charcas (2 c/u) y 2 en Mutualista (1 c/u), nada del equipo → todo es de las tiendas, 2 a 1.
     · SOFT 160 (Sueña): una reposición a Carmelo para pasado mañana (2 u) → a Carmelo.
     · ALMOHADA 50x70 (Heaven): 3 reposiciones a Mia Plaza ya salidas (10 c/u) → en almohadas la RPT es la venta: a Mia Plaza.
     · TITANIO ICE 160 (Heaven): 6 entregas del equipo, 3 a clientes del lado de Banzer (oeste de la línea) y 3 del lado de PTF → PTF y Banzer.
     · TITANIO ICE 140 (Heaven): lo mismo, pero Banzer ya tiene 6 → lo que se produce va todo a PTF.
     · SOMIER ORO 160 (Heaven): UNA venta del lado de Banzer, sin entregar → no rota: a PTF. */
  const K = await page.evaluate(async () => {
    var k={ s140:_k('COLT0048','COLCHON SOFT','140x190'), s160:_k('COLT0060','COLCHON SOFT','160x190'), alm:_k('CD1403','ALMOHADA','50x70'),
            ti:_k('CH1201','TITANIO ICE','160x190'), to:_k('CH1220','TITANIO ICE','140x190'), so:_k('CH1145','SOMIER ORO','160x190') };
    window._K=k;
    var tienda=function(id, dias, suc, vend, c){ var t=_ts(_d(-dias), '11:00:00');
      return _ped({ id:id, fecha:'', turno:'', direccion:DIR_TIENDA+' · '+suc, zona:ZONA_TIENDA, vendedor:vend, cliente:'CLIENTE TIENDA', ts:t, productos:[_lin('COLT0048','COLCHON SOFT','140x190', c)] }); };
    var rpt=function(id, oc, fecha, suc, cod, d, m, c, salio){ return _ped({ id:id, oc:oc, fecha:fecha, cliente:suc, vendedor:'Fernando Peinado', entregado:!!salio, ts:_ts(fecha<todayStr()?fecha:todayStr(), '08:00:00'), productos:[_lin(cod, d, m, c)] }); };
    var OESTE='https://www.google.com/maps?q=-17.7200,-63.1900', ESTE='https://www.google.com/maps?q=-17.7600,-63.1000';
    var cli=function(id, dias, cod, d, m, lado){ return _ped({ id:id, fecha:_d(-dias), entregado:true, maps:lado, productos:[_lin(cod, d, m, 1)] }); };
    window._P0=[
      tienda('t1', 2, 'Charcas', 'Fernando Peinado', 2), tienda('t2', 4, 'Charcas', 'Fernando Peinado', 2),
      tienda('t3', 6, 'Charcas', 'Fernando Peinado', 2), tienda('t4', 8, 'Charcas', 'Fernando Peinado', 2),
      tienda('t5', 3, 'Mutualista', 'Mauricio Merida', 1), tienda('t6', 7, 'Mutualista', 'Mauricio Merida', 1),
      tienda('t7', 9, 'Mutualista', 'Mauricio Merida', 1), tienda('t8', 11, 'Mutualista', 'Mauricio Merida', 1),
      rpt('rp1', 'RPT 10-001', _d(2), 'Carmelo', 'COLT0060','COLCHON SOFT','160x190', 2, false),
      rpt('ra1', 'RPT 10-002', _d(-2), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      rpt('ra2', 'RPT 10-003', _d(-5), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      rpt('ra3', 'RPT 10-004', _d(-9), 'Mia Plaza', 'CD1403','ALMOHADA','50x70', 10, true),
      cli('w1', 1, 'CH1201','TITANIO ICE','160x190', OESTE), cli('w2', 3, 'CH1201','TITANIO ICE','160x190', OESTE), cli('w3', 5, 'CH1201','TITANIO ICE','160x190', OESTE),
      cli('e1', 2, 'CH1201','TITANIO ICE','160x190', ESTE), cli('e2', 4, 'CH1201','TITANIO ICE','160x190', ESTE), cli('e3', 6, 'CH1201','TITANIO ICE','160x190', ESTE),
      cli('w4', 1, 'CH1220','TITANIO ICE','140x190', OESTE), cli('w5', 3, 'CH1220','TITANIO ICE','140x190', OESTE), cli('w6', 5, 'CH1220','TITANIO ICE','140x190', OESTE),
      cli('e4', 2, 'CH1220','TITANIO ICE','140x190', ESTE), cli('e5', 4, 'CH1220','TITANIO ICE','140x190', ESTE), cli('e6', 6, 'CH1220','TITANIO ICE','140x190', ESTE),
      _ped({ id:'so1', fecha:_d(3), maps:OESTE, productos:[_lin('CH1145','SOMIER ORO','160x190', 1)] })
    ];
    window._ST0=function(){ return _stock(function(st){ [k.s140, k.s160, k.alm, k.ti, k.to, k.so].forEach(function(x){ st.c.u[x]=0; st.g[_BZ].u[x]=0; st.g[_IM].u[x]=0; }); st.g[_BZ].u[k.to]=6; }); };
    await _cargar(_P0, _ST0());
    return k;
  });

  // ═══ RP1. La columna «Hasta el 30/11» ═══
  console.log('\n── RP1. «Hasta el 30/11» = 15 días + noviembre ──');
  let r = await page.evaluate(() => {
    var R=stockProducirCalc(stockData()), MS=R.mes, filas=[], bl={};
    R.bloques.forEach(function(B){ bl[B.k]={ tot:B.tot.tot, quin:B.tot.quin, mes:B.tot.mes, med:Object.keys(B.medidas).map(function(m){ return [B.medidas[m].tot, B.medidas[m].quin+B.medidas[m].mes]; }) };
      B.filas.forEach(function(f){ filas.push([f.o.k, f.tot, f.quin, f.mes]); }); });
    return { fin:MS.fin, nombre:MS.nombre, filas:filas, bl:bl };
  });
  chk('RP1a el mes que viene es noviembre y termina el 30/11', r.nombre==='noviembre' && r.fin==='2026-11-30', r);
  chk('RP1b cada producto: «hasta el 30/11» = 15 días + noviembre', r.filas.length>=4 && r.filas.every(function(x){ return x[1]===x[2]+x[3]; }), r.filas);
  chk('RP1c cada bloque y cada medida: el total también es 15 días + noviembre', ['heaven','suena'].every(function(k){ var b=r.bl[k]; return b && b.tot===b.quin+b.mes && b.tot>0 && b.med.every(function(m){ return m[0]===m[1]; }); }), r.bl);
  r = await page.evaluate(async () => {
    visPrefSet('masVistas', true); visPrefSet('qrep', true); abrirStock(); renderStock();
    await new Promise(function(res){ setTimeout(res, 50); });
    var el=document.getElementById('producir'); if(!el) return null;
    var th=[].map.call(el.querySelectorAll('.prod-wrap thead th'), function(x){ return _txt(x); });
    var fila=el.querySelector('.prod-wrap tr[data-producir-k="'+CSS.escape(_K.ti)+'"]');
    var tot=el.querySelector('.prod-wrap tfoot tr.prod-total');
    var R=stockProducir(stockData()), f=null; R.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===_K.ti) f=x; }); });
    return { th:th, celda:fila ? _txt(fila.cells[fila.cells.length-1]).trim() : null, n:fila?fila.cells.length:0, f:f && { tot:f.tot }, tot:tot?_txt(tot):'',
             cab:_txt(el.querySelector('.prod-wrap').parentNode) };
  });
  chk('RP1d la tabla tiene la columna «Hasta el 30/11 · en total: 15 días + noviembre» al final', r && /Hasta el 30\/11/.test(r.th[r.th.length-1]) && /en total: 15 días \+ noviembre/.test(r.th[r.th.length-1]), r && r.th);
  chk('RP1e la fila del TITANIO ICE 160 la muestra (10 celdas, la última = 15 días + noviembre)', r && r.n===10 && r.f && r.celda===String(r.f.tot), r && { celda:r.celda, n:r.n, f:r.f });
  chk('RP1f el TOTAL del bloque y su encabezado la dicen («hasta el 30/11», «en total hasta el 30/11: N»)', r && /hasta el 30\/11/.test(r.tot) && /en total hasta el 30\/11: \d+/.test(r.cab), r && r.tot);

  // ═══ RP2. «Qué producir» queda liviano ═══
  console.log('\n── RP2. La línea de «Qué producir» y los botones ──');
  r = await page.evaluate(async () => {
    visPrefSet('masVistas', true); abrirStock(); renderStock();
    await new Promise(function(res){ setTimeout(res, 80); });
    var pr=document.getElementById('producir'), li=document.getElementById('prod-pap');
    var R=stockProducirCalc(stockData()), T={ sem:0, quin:0, d30:0, tot:0 };
    R.bloques.forEach(function(B){ Object.keys(T).forEach(function(h){ T[h]+=B.tot[h]||0; }); });
    return { li:li?_txt(li):null, enProducir:!!(pr && li && pr.contains(li)), T:T, viejo:!!(document.getElementById('prod-total-gen') || document.getElementById('prod-rep')),
             barra:!!document.querySelector('#stock-overlay .stk-acc #stk-pap-btn'), plan:!!document.querySelector('#stk-plan .pl-pap'),
             boton:!!(li && li.querySelector('button')) };
  });
  chk('RP2a «Qué producir» trae la línea con 7 días · 15 días · 30 días · todo noviembre (los totales de los bloques)',
    r.li && r.enProducir && r.li.indexOf('7 días '+r.T.sem)>=0 && r.li.indexOf('15 días '+r.T.quin)>=0 && r.li.indexOf('30 días '+r.T.d30)>=0 && r.li.indexOf('todo noviembre '+r.T.tot)>=0, r);
  chk('RP2b ya no están el cuadro «📦 Total a producir» ni la planilla «🗺️ Qué va a dónde» adentro de «Qué producir»', r.viejo===false, r);
  chk('RP2c el botón «🏭 Pedido a producción» está en la línea, en la barra de Stock y en el Plan de stock', r.boton && r.barra && r.plan, r);

  // ═══ RP3. El reparto suma exacto ═══
  console.log('\n── RP3. Cada producto, repartido entero ──');
  r = await page.evaluate(() => {
    if(typeof producirRepartoFila!=='function' || !STOCK_TP || !STOCK_TP.R) return { falta:true };
    var malos=[], filas=0, partes={}, porBloque={};
    ['sem','quin','d30','tot'].forEach(function(h){
      STOCK_TP.R.bloques.forEach(function(B){
        var s=0;
        B.filas.forEach(function(f){
          if(!(f[h]>0)) return; filas++;
          var x=producirRepartoFila(f, h, STOCK_TP.porK, STOCK_TP.D), t=x.P+x.B;
          Object.keys(x.T).forEach(function(n){ t+=x.T[n]; s+=x.T[n]; });
          if(t!==f[h] || x.P<0 || x.B<0) malos.push([h, f.o.k, f[h], x]);
        });
        porBloque[h+'|'+B.k]=[s, STOCK_TP.v[B.k][h]];
      });
    });
    return { malos:malos, filas:filas, porBloque:porBloque };
  });
  chk('RP3a hay reparto para cada producto y cada plazo', !r.falta && r.filas>=12, r.falta?'no hay producirRepartoFila':r.filas);
  if(!r.falta){
    chk('RP3b cada fila suma EXACTO lo que dice «Qué producir» (PTF + Banzer + tiendas), en 7, 15 y 30 días y hasta el 30/11', r.malos.length===0, r.malos.slice(0,3));
    chk('RP3c lo de las tiendas de cada bloque = la línea «🏪 De esto, por las tiendas» del bloque', Object.keys(r.porBloque).every(function(k){ return r.porBloque[k][0]===r.porBloque[k][1]; }), r.porBloque);
  }

  // ═══ RP4. A dónde va cada cosa ═══
  console.log('\n── RP4. A dónde va ──');
  r = await page.evaluate(() => {
    if(typeof producirRepartoFila!=='function' || !STOCK_TP || !STOCK_TP.R) return { falta:true };
    var out={};
    STOCK_TP.R.bloques.forEach(function(B){ B.filas.forEach(function(f){
      Object.keys(_K).forEach(function(n){ if(_K[n]===f.o.k) out[n]={ quin:f.quin, tot:f.tot, r:producirRepartoFila(f, 'tot', STOCK_TP.porK, STOCK_TP.D), r15:producirRepartoFila(f, 'quin', STOCK_TP.porK, STOCK_TP.D) }; });
    }); });
    return out;
  });
  if(!r.falta){
    var s140=r.s140 && r.s140.r, s160=r.s160 && r.s160.r, alm=r.alm && r.alm.r, ti=r.ti && r.ti.r, to=r.to && r.to.r, so=r.so && r.so.r;
    chk('RP4a SOFT 140: todo a las tiendas, Charcas el doble que Mutualista (vendió 8 y 4), nada a PTF ni Banzer',
      s140 && s140.n>=3 && s140.P===0 && s140.B===0 && (s140.T.Charcas||0)+(s140.T.Mutualista||0)===s140.n && Math.abs((s140.T.Charcas||0)-2*(s140.T.Mutualista||0))<=1, s140);
    chk('RP4b SOFT 160: la reposición pendiente de Carmelo va a Carmelo', s160 && s160.n>=2 && (s160.T.Carmelo||0)>=2 && Object.keys(s160.T).length===1, s160);
    chk('RP4c ALMOHADA 50x70: a Mia Plaza (la RPT es la venta)', alm && alm.n>0 && alm.T['Mia Plaza']===alm.n, alm);
    chk('RP4d TITANIO ICE 160 (clientes de los dos lados, nada en stock): a PTF y a Banzer, nada a tiendas', ti && ti.n>=2 && ti.P>0 && ti.B>0 && !Object.keys(ti.T).length, ti);
    chk('RP4e TITANIO ICE 140 (Banzer ya tiene 6): todo a PTF', to && to.n>0 && to.P===to.n && to.B===0, to);
    chk('RP4f SOMIER ORO (una venta, no rota): a PTF, con el porqué', so && so.n===1 && so.P===1 && so.porque==='poca', so);
  } else chk('RP4 existe el reparto', false, 'no hay producirRepartoFila');

  // ═══ RP5. La ventana: qué pedir ═══
  console.log('\n── RP5. La ventana «🏭 Pedido a producción»: qué pedir ──');
  const abrirVentana = async () => {
    await page.evaluate(() => { var b=document.querySelector('#stock-overlay #stk-pap-btn'); if(b) b.click(); });
    await page.waitForFunction(() => window.PAP && PAP.listo, null, { timeout:15000 }).catch(()=>{});
  };
  await abrirVentana();
  r = await page.evaluate(() => {
    if(typeof PAP==='undefined' || !PAP || !PAP.TODAS) return null;
    var ov=document.getElementById('pap-overlay'), R=stockProducirCalc(stockData()), T={}, porFab={};
    ['sem','quin','d30','tot'].forEach(function(h){ T[h]=0; R.bloques.forEach(function(B){ T[h]+=B.tot[h]||0; var f=B.fab||''; porFab[f+'|'+h]=(porFab[f+'|'+h]||0)+(B.tot[h]||0); }); });
    var pz=[].map.call(ov.querySelectorAll('.pap-pz'), function(b){ return { k:b.getAttribute('data-pap-plazo'), et:_txt(b.querySelector('.pap-pz-et')).trim(), n:_txt(b.querySelector('.pap-pz-n b')).trim(), on:b.getAttribute('aria-pressed') }; });
    var leer=function(){
      var p=document.getElementById('pap-pedir');
      return { tot:_txt(p.querySelector('.pap-totn')).replace('unidades','').trim(), eti:_txt(p.querySelector('.pap-eti')),
        fabs:[].map.call(p.querySelectorAll('.pap-cfab'), function(c){ return _txt(c).trim(); }),
        tti:_txt(p.querySelector('.pap-tti')), tots:_txt(p.querySelector('.pap-tots')),
        cards:[].map.call(p.querySelectorAll('.pap-fab'), function(a){ return { tit:_txt(a.querySelector('.pap-ftit b')), n:_txt(a.querySelector('.pap-fnum')).replace('unidades','').trim(),
          filas:[].map.call(a.querySelectorAll('.pap-fbtn'), function(b){ return { id:b.getAttribute('data-pap-fila'), n:_txt(b.querySelector('.pap-fn')).trim() }; }) }; }) };
    };
    var a=leer();
    var out={ visible:ov.style.display==='flex', sel:_txt(ov.querySelector('[aria-selected="true"]')).trim(), pz:pz, T:T, porFab:porFab, sem:a };
    ['quin','d30','tot'].forEach(function(h){ ov.querySelector('[data-pap-plazo="'+h+'"]').click(); out[h]=leer(); });
    var tiK={}; ['sem','quin','d30','tot'].forEach(function(h){ var s=0; PAP.TODAS.forEach(function(f){ s+=(f.tiendas&&f.tiendas[h])||0; }); tiK[h]=s; }); out.tiK=tiK;
    var fv={}; PAP.TODAS.forEach(function(f){ fv[f.id]={ sem:f.sem, quin:f.quin, d30:f.d30, tot:f.tot, quinMes:f.quin+' + '+f.mes }; }); out.fv=fv;
    // Abrir un producto: el detalle dice cuánto hay y a dónde va.
    ov.querySelector('[data-pap-plazo="quin"]').click();
    var b=ov.querySelector('#pap-pedir .pap-fbtn'); b.click();
    var dl=b.parentNode.querySelector('.pap-det'), f=null; PAP.TODAS.forEach(function(x){ if(x.id===b.getAttribute('data-pap-fila')) f=x; });
    out.det={ txt:_txt(dl), abierto:b.getAttribute('aria-expanded'), va:[].map.call(dl?dl.querySelectorAll('.pap-va b'):[], function(x){ return +x.textContent; }), n:f&&f.quin };
    b.click(); out.det.cerrado=!b.parentNode.querySelector('.pap-det');
    return out;
  });
  chk('RP5a abre en la pestaña «📦 Qué pedir a producción» y en 7 días', r && r.visible && /Qué pedir a producción/.test(r.sel) && r.pz.length===4 && r.pz[0].on==='true', r && { sel:r.sel, pz:r.pz });
  chk('RP5b los cuatro plazos: 7 días · 15 días · 30 días · Todo noviembre, cada uno con el total de «Qué producir»',
    r && ['7 días','15 días','30 días','Todo noviembre'].every(function(e,i){ return r.pz[i].et===e; }) && ['sem','quin','d30','tot'].every(function(h,i){ return r.pz[i].n===String(r.T[h]).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }), r && { pz:r.pz, T:r.T });
  chk('RP5c el número grande cambia con el plazo y es el total (7 → 15 → 30 → todo noviembre), «todo noviembre» dice 15 días + noviembre',
    r && r.sem.tot===String(r.T.sem) && r.quin.tot===String(r.T.quin) && r.d30.tot===String(r.T.d30) && r.tot.tot===String(r.T.tot).replace(/\B(?=(\d{3})+(?!\d))/g,'.') && /de 15 días \+ \d+ de noviembre/.test(r.tot.tots) && /hasta el 30\/11/i.test(r.tot.eti), r && [r.sem.tot, r.quin.tot, r.d30.tot, r.tot.tot, r.tot.tots, r.T]);
  chk('RP5d por fábrica: Industrias Moreno = Heaven + ROHO; Multiespumas = Sueña (en las tarjetas y en las fichas de arriba)',
    r && r.quin.cards.some(function(c){ return c.tit==='Industrias Moreno' && c.n===String(r.porFab['MORENO|quin']); }) && r.quin.cards.some(function(c){ return c.tit==='Multiespumas' && c.n===String(r.porFab['MULTI|quin']); }) &&
    r.quin.fabs.some(function(t){ return /Industrias Moreno/.test(t) && t.indexOf(String(r.porFab['MORENO|quin']))>=0; }), r && { cards:r.quin.cards.map(function(c){ return [c.tit, c.n]; }), porFab:r.porFab });
  chk('RP5e cada producto con su número del plazo, de mayor a menor, y en «todo noviembre» abajo «15 días + noviembre»',
    r && ['sem','quin','d30'].every(function(h){ return r[h].cards.every(function(c){ var prev=1e9; return c.filas.every(function(x){ var ok=x.n===String(r.fv[x.id][h]) && r.fv[x.id][h]<=prev; prev=r.fv[x.id][h]; return ok; }); }); }) &&
    r.tot.cards.every(function(c){ return c.filas.every(function(x){ return x.n.indexOf(String(r.fv[x.id].tot))===0 && x.n.indexOf(r.fv[x.id].quinMes)>0; }); }), r && r.quin.cards);
  chk('RP5f «🏬 N son para reponer las tiendas» = la parte de las tiendas del plazo', r && ['quin','tot'].every(function(h){ return r[h].tti.indexOf(String(r.tiK[h])+' son para reponer las tiendas')>=0; }) && r.tiK.quin>0, r && { tti:r.quin.tti, tiK:r.tiK });
  chk('RP5g tocar un producto abre «Hoy hay · Vendido sin entregar · Va a» (los lugares suman su número) y se vuelve a cerrar',
    r && r.det.abierto==='true' && /Hoy hay/.test(r.det.txt) && /Vendido sin entregar/.test(r.det.txt) && /Va a/.test(r.det.txt) && r.det.va.reduce(function(a,b){ return a+b; },0)===r.det.n && r.det.cerrado, r && r.det);

  // ═══ RP6. Qué va a dónde ═══
  console.log('\n── RP6. Pestaña «🗺️ Qué va a dónde» ──');
  r = await page.evaluate(() => {
    if(typeof PAP==='undefined' || !PAP || !PAP.TODAS) return null;
    var ov=document.getElementById('pap-overlay'), out={};
    ov.querySelector('[data-pap-plazo="quin"]').click();
    ov.querySelector('[data-pap-tab="donde"]').click();
    var d=document.getElementById('pap-donde');
    out.sel=_txt(ov.querySelector('[aria-selected="true"]')).trim(); out.ocultoPedir=document.getElementById('pap-pedir').hidden;
    out.tot=+_txt(d.querySelector('.pap-totn')).replace(/\D/g,'');
    out.fichas=[].map.call(d.querySelectorAll('.pap-fi'), function(b){ return { id:b.getAttribute('data-pap-lugar'), n:+_txt(b.querySelector('.pap-fi-n')).replace(/\D/g,''), pct:+(_txt(b.querySelector('.pap-fi-pie')).match(/(\d+) %/)||[0,0])[1] }; });
    out.chips=[].map.call(d.querySelectorAll('.pap-ct'), function(b){ return { id:b.getAttribute('data-pap-lugar'), n:+_txt(b.querySelector('b')) }; });
    var s=0; PAP.TODAS.forEach(function(f){ s+=f.quin; }); out.esperado=s;
    // Una tienda: su lista suma lo que dice su ficha.
    var ch=d.querySelector('.pap-ct[data-pap-lugar="T:Charcas"]');
    if(ch){ ch.click(); var det=document.getElementById('pap-lugar-det');
      out.charcas={ n:+_txt(det.querySelector('.pap-ldnum')), suma:[].reduce.call(det.querySelectorAll('.pap-fn'), function(a,x){ return a+(+x.textContent.replace(/\D/g,'')); }, 0), tit:_txt(det.querySelector('.pap-ldtit b')),
        filas:[].map.call(det.querySelectorAll('.pap-fq'), function(x){ return _txt(x.querySelector('.pap-fnom b')); }) };
      det.querySelector('[data-pap="lugar-cerrar"]').click(); out.cerro=!document.getElementById('pap-lugar-det'); }
    // La tabla por producto.
    var tp=document.getElementById('pap-tabla-prod'); tp.open=true;
    var th=[].map.call(tp.querySelectorAll('thead th'), function(x){ return _txt(x).trim(); });
    var filas=[].filter.call(tp.querySelectorAll('tbody tr'), function(tr){ return !tr.classList.contains('pap-tbanda'); }).map(function(tr){ return [].map.call(tr.cells, function(td){ return _txt(td).trim(); }); });
    var pie=[].map.call(tp.querySelectorAll('tfoot td'), function(td){ return _txt(td).trim(); });
    out.tabla={ th:th, filas:filas, pie:pie };
    // «Ver a qué tienda va» desde la pestaña 1.
    ov.querySelector('[data-pap-tab="pedir"]').click();
    var ir=ov.querySelector('[data-pap="ir-tiendas"]'); if(ir) ir.click();
    out.irTiendas={ tab:_txt(ov.querySelector('[aria-selected="true"]')).trim(), lugar:PAP_S.lugar, det:_txt(document.querySelector('#pap-lugar-det .pap-ldtit b')) };
    return out;
  });
  const num=x=>+String(x||'').replace(/\./g,'').replace(/\D/g,'')||0;
  chk('RP6a la pestaña cambia y el total del reparto = lo que se pide (15 días)', r && /Qué va a dónde/.test(r.sel) && r.ocultoPedir && r.tot===r.esperado && r.tot>0, r && { sel:r.sel, tot:r.tot, esp:r.esperado });
  chk('RP6b PTF + Banzer + Tiendas = el total y los porcentajes suman 100', r && r.fichas.length>=2 && r.fichas.reduce(function(a,f){ return a+f.n; },0)===r.tot && r.fichas.reduce(function(a,f){ return a+f.pct; },0)===100, r && r.fichas);
  var fT=r && r.fichas.filter(function(f){ return f.id==='T'; })[0];
  chk('RP6c cada tienda tiene su ficha (Charcas, Mutualista, Carmelo, Mia Plaza) y suman lo de «Tiendas»', r && fT && ['T:Charcas','T:Mutualista','T:Carmelo','T:Mia Plaza'].every(function(id){ return r.chips.some(function(c){ return c.id===id && c.n>0; }); }) && r.chips.reduce(function(a,c){ return a+c.n; },0)===fT.n, r && { chips:r.chips, T:fT });
  chk('RP6d tocar Charcas muestra lo suyo (el SOFT 140) y la lista suma su número; «✕ Cerrar» la cierra', r && r.charcas && r.charcas.suma===r.charcas.n && /Tienda Charcas/.test(r.charcas.tit) && r.charcas.filas.some(function(x){ return /COLCHON SOFT/.test(x); }) && r.cerro, r && r.charcas);
  var cierraT=function(t){ if(!t || !t.pie.length) return false; var okFil=t.filas.every(function(f){ return f.length===t.th.length; });
    for(var i=1;i<t.pie.length;i++){ var s=0; t.filas.forEach(function(f){ s+=num(f[i]); }); if(s!==num(t.pie[i])) return false; } return okFil; };
  chk('RP6e la tabla por producto: Producto · Pedir · PTF · Banzer · cada tienda, y el Total cierra por columna', r && r.tabla.th[0]==='Producto' && r.tabla.th[1]==='Pedir' && r.tabla.th.indexOf('Charcas')>=0 && cierraT(r.tabla) && num(r.tabla.pie[1])===r.tot, r && { th:r.tabla.th, pie:r.tabla.pie });
  chk('RP6f en cada fila de la tabla: Pedir = PTF + Banzer + tiendas (sin contar la columna «Tiendas» sumada del celular)', r && r.tabla.filas.every(function(f){
      var s=0; for(var i=2;i<f.length;i++){ if(r.tabla.th[i]==='Tiendas') continue; s+=num(f[i]); } return s===num(f[1]); }), r && r.tabla.filas.slice(0,3));
  chk('RP6g «Ver a qué tienda va» lleva a «Qué va a dónde» con las tiendas abiertas', r && /Qué va a dónde/.test(r.irTiendas.tab) && r.irTiendas.lugar==='T' && /Todas las tiendas/.test(r.irTiendas.det), r && r.irTiendas);

  // ═══ RP7. Copiar ═══
  console.log('\n── RP7. Copiar ──');
  r = await page.evaluate(() => {
    if(typeof PAP==='undefined' || !PAP || !PAP.TODAS) return { fab:'', todo:'', lugar:'', tot:'', uno:'', s:{} };
    var ov=document.getElementById('pap-overlay'), out={};
    var copia=function(sel){ PAP_COPIA=''; var b=ov.querySelector(sel); if(b) b.click(); var h=document.getElementById('pap-hoja'); if(h) h.hidden=true; return PAP_COPIA; };
    ov.querySelector('[data-pap-tab="pedir"]').click(); ov.querySelector('[data-pap-plazo="quin"]').click();
    var F=null; PAP.FABS.forEach(function(x){ if(x.nombre==='Multiespumas') F=x; });
    out.fab=copia('[data-pap-copiar-fab="'+F.k+'"]'); out.fabN=papSumaFab(F,'quin');
    ov.querySelector('[data-pap-tab="donde"]').click();
    out.todo=copia('[data-pap="copiar-todo"]');
    var ch=ov.querySelector('.pap-ct[data-pap-lugar="T:Charcas"]'); if(ch) ch.click();
    out.lugar=copia('[data-pap-copiar-lugar="T:Charcas"]');
    out.tot=_copia(function(){ copiarProducirTodo('tot'); });
    out.uno=_copia(function(){ copiarProducir('suena','tot'); });
    var R=stockProducir(stockData()), s=R.bloques.filter(function(b){ return b.k==='suena'; })[0];
    out.s={ tot:s.tot.tot, quin:s.tot.quin, mes:s.tot.mes };
    return out;
  });
  chk('RP7a «📋 Copiar para Multiespumas»: «PEDIDO A PRODUCCIÓN · MULTIESPUMAS», el plazo con fechas, SUEÑA, cada producto y el TOTAL',
    /^PEDIDO A PRODUCCIÓN · MULTIESPUMAS\nPara los próximos 15 días \(del 20\/10 al 04\/11\)\nMartes 20\/10\/2026/.test(r.fab) && /SUEÑA:/.test(r.fab) && /• COLCHON SOFT · 140x190 \(cód COLT0048\): \d+/.test(r.fab) && new RegExp('TOTAL: '+r.fabN+' unidades$').test(r.fab), r.fab.slice(0,400));
  chk('RP7b «📋 Copiar todo el reparto»: «QUÉ VA A DÓNDE», PTF, BANZER y cada tienda con su lista, y el total partido', /^QUÉ VA A DÓNDE/.test(r.todo) && /\nPTF \(\d+\):/.test(r.todo) && /\nTIENDA CHARCAS \(\d+\):/.test(r.todo) && /TOTAL: \d+ unidades \(PTF \d+ · Banzer \d+ · tiendas \d+\)$/.test(r.todo), r.todo.slice(0,500));
  chk('RP7c «📋 Copiar lo de Charcas»: «QUÉ VA A LA TIENDA CHARCAS», por marca, y su total', /^QUÉ VA A LA TIENDA CHARCAS/.test(r.lugar) && /SUEÑA · MULTIESPUMAS \(\d+\):/.test(r.lugar) && /TOTAL: \d+ unidades$/.test(r.lugar), r.lugar);
  chk('RP7d «📋 Copiar todo hasta el 30/11» de siempre (Plan): cada producto con «15 días N + noviembre M»', /PRODUCIR TODO HASTA EL 30\/11 \(15 DÍAS \+ NOVIEMBRE\)/.test(r.tot) && /15 días \d+ \+ noviembre \d+/.test(r.tot) && /HEAVEN/.test(r.tot) && /SUEÑA/.test(r.tot), r.tot.slice(0,400));
  chk('RP7e el de un bloque (Sueña) cierra con su total = 15 días + noviembre', new RegExp('Total: '+r.s.tot+' unidades').test(r.uno) && r.s.tot===r.s.quin+r.s.mes, { s:r.s, t:r.uno.slice(-300) });

  // ═══ RP8. 30 días ═══
  console.log('\n── RP8. 30 días ──');
  r = await page.evaluate(() => {
    var lee=function(){ var o={}; stockProducirCalc(stockData()).bloques.forEach(function(B){ B.filas.forEach(function(f){ o[f.o.k]={ sem:f.sem, quin:f.quin, d30:f.d30, tot:f.tot, mes:f.mes }; }); }); return o; };
    var a=lee(), out={ a:a, con15:{}, con400:{}, bt:{} };
    if(typeof PRODUCIR_30==='undefined') return out;
    var v=PRODUCIR_30;
    try{ PRODUCIR_30=PRODUCIR_QUINCENA; out.con15=lee(); PRODUCIR_30=400; out.con400=lee(); } finally { PRODUCIR_30=v; }
    var R=stockProducirCalc(stockData()); out.bt={}; R.bloques.forEach(function(B){ var s=0; B.filas.forEach(function(f){ if(f.algo) s+=f.d30; }); out.bt[B.k]=[B.tot.d30, s]; });
    return out;
  });
  const ks=Object.keys(r.a||{});
  chk('RP8a cada producto: 7 días ≤ 15 días ≤ 30 días ≤ todo noviembre', ks.length>=4 && ks.every(k=>{ const x=r.a[k]; return typeof x.d30==='number' && x.sem<=x.quin && x.quin<=x.d30 && x.d30<=x.tot; }), r.a);
  chk('RP8b es la misma cuenta que 15 días: con 15 en lugar de 30, da exacto lo de 15 días', ks.every(k=>r.con15[k] && r.con15[k].d30===r.con15[k].quin), ks.map(k=>[k, r.con15[k]]));
  chk('RP8c nunca más que «todo noviembre» (con un plazo de 400 días, queda en el total)', ks.every(k=>r.con400[k] && r.con400[k].d30===r.con400[k].tot), ks.map(k=>[k, r.con400[k]]));
  chk('RP8d hay algo más en 30 días que en 15 (el TITANIO ICE 160, que rota) y el total del bloque es la suma', ks.some(k=>r.a[k].d30>r.a[k].quin) && Object.keys(r.bt).length>0 && Object.keys(r.bt).every(k=>r.bt[k][0]===r.bt[k][1]), r.bt);

  // ═══ RP9. Nada cambia, cerrar, sin conteo y celular ═══
  console.log('\n── RP9. Ningún número cambia; cerrar; sin conteo; celular ──');
  r = await page.evaluate(async () => {
    var foto=function(){ var d=stockData(); return JSON.stringify(stockPlanDatos(d, d.lista).map(function(x){ return [x.o.k, x.p7, x.p15, x.pm, x.o.fabricar, x.o.comp, x.o.objetivo]; })); };
    var antes=foto();
    if(typeof papDatos==='function') papDatos(true);
    var out={ igual:antes===foto(), flag:STOCK_SIN_TIENDAS };
    if(typeof abrirPap!=='function') return out;
    var ov=document.getElementById('pap-overlay');
    // ✕ cierra; Esc cierra; 🔄 rehace la cuenta.
    abrirPap(); await new Promise(function(res){ setTimeout(res, 150); });
    var p0=PAP; ov.querySelector('[data-pap="actualizar"]').click(); await new Promise(function(res){ setTimeout(res, 150); });
    out.actualizo=!!(PAP && PAP!==p0 && PAP.listo);
    ov.querySelector('[data-pap="cerrar"]').click(); out.cierraX=ov.style.display==='none';
    abrirPap(); await new Promise(function(res){ setTimeout(res, 150); });
    document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', bubbles:true })); out.cierraEsc=ov.style.display==='none';
    // Sin conteo del depósito: lo dice, sin números.
    var _sd=stockData; stockData=function(){ var d=_sd.apply(null, arguments); d.contado=false; return d; };
    try{ abrirPap(); await new Promise(function(res){ setTimeout(res, 150); }); out.sinConteo=_txt(document.getElementById('pap-pedir')); out.sinPlazos=!document.querySelector('#pap-plazos .pap-pz'); }
    finally{ stockData=_sd; cerrarPap(); }
    return out;
  });
  chk('RP9a el Plan da lo mismo antes y después de la ventana, y el interruptor queda apagado', r.igual && r.flag===false, r);
  chk('RP9b «🔄 Actualizar» rehace la cuenta; «✕ Cerrar» y Esc cierran la ventana', r.actualizo && r.cierraX && r.cierraEsc, r);
  chk('RP9c sin conteo del depósito lo dice (subí el Excel de existencias) y no muestra plazos', /no hay conteo del depósito/.test(r.sinConteo||'') && r.sinPlazos, r.sinConteo);
  await page.setViewportSize({ width:390, height:844 });
  await abrirVentana();
  r = await page.evaluate(async () => {
    if(typeof PAP==='undefined' || !PAP) return null;
    var ov=document.getElementById('pap-overlay'), sc=document.getElementById('pap-cuerpo'), out={};
    var cab=ov.querySelector('.pap-cab'), bts=[].slice.call(cab.querySelectorAll('.pap-cab-btn')), tit=cab.querySelector('.pap-cab-tx');
    out.cabUnaLinea=bts.every(function(b){ return Math.abs(b.getBoundingClientRect().top-bts[0].getBoundingClientRect().top)<2 && b.getBoundingClientRect().top<tit.getBoundingClientRect().bottom; });
    out.botonAlto=bts.every(function(b){ return b.getBoundingClientRect().height>=44; });
    var medir=function(){ return { sw:sc.scrollWidth, cw:sc.clientWidth, doc:document.documentElement.scrollWidth, vw:window.innerWidth }; };
    out.pedir=medir();
    ov.querySelector('[data-pap-plazo="tot"]').click(); out.tot=medir();
    ov.querySelector('[data-pap-tab="donde"]').click();
    var tp=document.getElementById('pap-tabla-prod'); tp.open=true; papAjustarTabla();
    await new Promise(function(res){ setTimeout(res, 100); });
    out.donde=medir();
    out.caja=(function(){ var c=document.getElementById('pap-tabla-caja'); return { sw:c.scrollWidth, cw:c.clientWidth }; })();
    out.colTiendas=[].map.call(tp.querySelectorAll('thead th'), function(x){ return getComputedStyle(x).display!=='none' ? _txt(x).trim() : null; }).filter(Boolean);
    return out;
  });
  const cabe=m=>m && m.sw<=m.cw+1 && m.doc<=m.vw+1;
  chk('RP9d en 390 px la cabecera entra en una línea (🔄 y ✕ sin texto, de 44 px)', r && r.cabUnaLinea && r.botonAlto, r);
  chk('RP9e en 390 px nada se sale de la pantalla en las dos pestañas', r && cabe(r.pedir) && cabe(r.tot) && cabe(r.donde), r);
  chk('RP9f en el celular la tabla suma las tiendas en una columna y entra a lo ancho', r && r.colTiendas.indexOf('Tiendas')>=0 && r.colTiendas.indexOf('Charcas')<0 && r.caja.sw<=r.caja.cw+1, r && { col:r.colTiendas, caja:r.caja });

  chk('sin errores de la página', ERRS.length===0, ERRS.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
