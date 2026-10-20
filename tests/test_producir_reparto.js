/* 📦 EL TOTAL A PRODUCIR Y 🗺️ QUÉ VA A DÓNDE (20/10; dueño: «la idea es que el qué producir muestre la totalidad de lo que tiene que
   producir… y luego mostrar una planilla o desglose de qué va a dónde, ya sea almacén Banzer, productos terminados fábrica o almacén de
   las tiendas… para los siguientes 7, 15 y 30 días, o para el siguiente mes»).

   RP1  La columna «Hasta el <fin del mes que viene>» = 15 días + el mes, producto por producto, por medida y en el TOTAL de cada bloque.
   RP2  El cuadro «📦 Total a producir»: una fila por fábrica, 7 / 15 / hasta el 30/11 (acumulados), el TOTAL de todas y la fila de las
        tiendas (que llega un momento después).
   RP3  El reparto de cada producto suma EXACTO lo que dice «Qué producir» (7 días, 15 días y hasta el 30/11), y la parte de las tiendas
        es la misma de la línea «🏪 De esto, por las tiendas».
   RP4  A dónde va: la venta de tienda de Charcas y Mutualista se reparte 2 a 1 (lo que vendió cada una); la reposición pendiente de
        Carmelo, a Carmelo; la almohada que va por RPT, a Mia Plaza; el TITANIO de clientes de los dos lados de la línea, a PTF y a
        Banzer; el que Banzer ya tiene de sobra, todo a PTF; lo que no rota, a PTF.
   RP5  La planilla en pantalla: una tabla por fábrica con una columna por tienda, TOTAL que cierra y los botones 7 / 15 / hasta el 30/11.
   RP6  Copiar: la planilla («QUÉ VA A DÓNDE») y «todo hasta el 30/11» de todas las fábricas y de un bloque.
   RP7  No cambia ningún número del pedido; el interruptor «sin tiendas» queda apagado; en el celular (390 px) nada se sale de la caja.

   Reloj CLAVADO (martes 20/10, 10:30 de Bolivia). Red cortada, datos sintéticos (el repo es público).
   Se corre:  node tests/test_producir_reparto.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_ec3a32e.html node tests/test_producir_reparto.js   (sin el total ni la planilla: rojas RP1-RP6) */
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

  // ═══ RP2. El cuadro del total ═══
  console.log('\n── RP2. «📦 Total a producir» ──');
  await page.waitForFunction(() => { var t=document.querySelector('#prod-total-gen [data-tp="total"]'); return t && !/Calculando/.test(t.textContent); }, null, { timeout:8000 }).catch(()=>{});
  r = await page.evaluate(() => {
    var g=document.getElementById('prod-total-gen'); if(!g) return null;
    var R=stockProducir(stockData()), bl={}, T={ sem:0, quin:0, tot:0 };
    R.bloques.forEach(function(B){ bl[B.k]={ sem:B.tot.sem, quin:B.tot.quin, tot:B.tot.tot, mes:B.tot.mes }; T.sem+=B.tot.sem; T.quin+=B.tot.quin; T.tot+=B.tot.tot; });
    var filas=[].map.call(g.querySelectorAll('tbody tr'), function(tr){ return [].map.call(tr.cells, function(td){ return _txt(td).trim(); }); });
    var pie=[].map.call(g.querySelectorAll('tfoot tr')[0].cells, function(td){ return _txt(td).trim(); });
    var ti=g.querySelector('tr[data-tp="total"]'), v=STOCK_TP && STOCK_TP.v, TT={ sem:0, quin:0, tot:0 };
    if(v) Object.keys(v).forEach(function(k){ TT.sem+=v[k].sem; TT.quin+=v[k].quin; TT.tot+=v[k].tot; });
    var enProducir=!!(document.getElementById('producir') && document.getElementById('producir').contains(g));
    var antesDeBloques=enProducir && !!(g.compareDocumentPosition(document.querySelector('#producir .prod-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { th:[].map.call(g.querySelectorAll('thead th'), function(x){ return _txt(x).trim(); }), filas:filas, pie:pie, bl:bl, T:T,
             ti:ti?[].map.call(ti.cells, function(td){ return _txt(td).trim(); }):null, TT:TT, txt:_txt(g), enProducir:enProducir, antes:antesDeBloques,
             botones:[].map.call(g.querySelectorAll('button'), function(b){ return _txt(b).trim(); }) };
  });
  chk('RP2a está arriba de todo en «Qué producir», antes de los bloques', r && r.enProducir && r.antes, r && { en:r.enProducir, antes:r.antes });
  chk('RP2b columnas: Próximos 7 días · Próximos 15 días · Hasta el 30/11 (15 días + noviembre)', r && /Próximos 7 días/.test(r.th[1]) && /Próximos 15 días/.test(r.th[2]) && /Hasta el 30\/11/.test(r.th[3]) && /15 días \+ noviembre/.test(r.th[3]), r && r.th);
  chk('RP2c una fila por fábrica con sus totales (Heaven y Sueña) y «15 días N + noviembre M» debajo',
    r && ['heaven','suena'].every(function(k){ var b=r.bl[k], tit=k==='heaven'?/Heaven/:/Sueña/;
      return r.filas.some(function(f){ return tit.test(f[0]) && f[1]===String(b.sem||'—') && f[2]===String(b.quin||'—') && f[3].indexOf(String(b.tot))===0 && f[3].indexOf('15 días '+b.quin+' + noviembre '+b.mes)>=0; }); }), r && { filas:r.filas, bl:r.bl });
  chk('RP2d el TOTAL de todas las fábricas es la suma', r && r.pie[0]==='TOTAL' && r.pie[1]===String(r.T.sem) && r.pie[2]===String(r.T.quin) && r.pie[3]===String(r.T.tot), r && { pie:r.pie, T:r.T });
  chk('RP2e la fila «De esto, para las tiendas» trae los tres números debajo de cada columna (la suma de cada bloque)', r && r.ti && r.ti.length===4 && /para las tiendas/.test(r.ti[0]) && r.ti[1]===String(r.TT.sem) && r.ti[2]===String(r.TT.quin) && r.ti[3]===String(r.TT.tot) && r.TT.tot>0, r && { ti:r.ti, TT:r.TT });
  chk('RP2f dice que cada columna ya incluye la anterior y que noviembre va además de 15 días', r && /ya incluye la anterior/.test(r.txt) && /no se suman/.test(r.txt) && /además/.test(r.txt), r && r.txt);
  chk('RP2g botones para copiar 7 días, 15 días y todo hasta el 30/11', r && r.botones.some(function(b){ return /Copiar 7 días/.test(b); }) && r.botones.some(function(b){ return /Copiar 15 días/.test(b); }) && r.botones.some(function(b){ return /Copiar todo hasta el 30\/11/.test(b); }), r && r.botones);

  // ═══ RP3. El reparto suma exacto ═══
  console.log('\n── RP3. Cada producto, repartido entero ──');
  r = await page.evaluate(() => {
    if(typeof producirRepartoFila!=='function' || !STOCK_TP || !STOCK_TP.R) return { falta:true };
    var malos=[], filas=0, partes={}, porBloque={};
    ['sem','quin','tot'].forEach(function(h){
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
    chk('RP3b cada fila suma EXACTO lo que dice «Qué producir» (PTF + Banzer + tiendas), en 7, 15 días y hasta el 30/11', r.malos.length===0, r.malos.slice(0,3));
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

  // ═══ RP5. La planilla en pantalla ═══
  console.log('\n── RP5. La planilla «🗺️ Qué va a dónde» ──');
  r = await page.evaluate(async () => {
    var rep=document.getElementById('prod-rep'); if(!rep) return null;
    var leer=function(){
      var bls=[].map.call(rep.querySelectorAll('.prod-rep-bl'), function(b){
        var th=[].map.call(b.querySelectorAll('thead th'), function(x){ return _txt(x).trim(); });
        var pie=[].map.call(b.querySelectorAll('tfoot tr.prod-total td'), function(x){ return _txt(x).trim(); });
        var filas=[].map.call(b.querySelectorAll('tbody tr'), function(tr){ return [].map.call(tr.cells, function(td){ return _txt(td).trim(); }); });
        return { tit:_txt(b.querySelector('.prod-rep-tit')), th:th, pie:pie, filas:filas };
      });
      return { bls:bls, sel:_txt(rep.querySelector('.prod-rep-hs .sel')).trim() };
    };
    var abierto=rep.open, a=leer();
    producirRepVer('tot'); var b=leer();
    producirRepVer('sem'); var c=leer();
    producirRepVer('quin');
    return { abierto:abierto, a:a, b:b, c:c, guardado:(function(){ try{ return localStorage.getItem('me_prod_rep_h'); }catch(e){ return null; } })(), txt:_txt(rep) };
  });
  chk('RP5a está abierta y explica cómo reparte (tiendas, línea de logística, lo que tiene Banzer)', r && r.abierto && /línea de logística/.test(r.txt) && /no cambia ninguno/.test(r.txt) && /lo que ya tiene Banzer/.test(r.txt), r && r.txt.slice(0,300));
  var suena=r && r.a.bls.filter(function(b){ return /Sueña/.test(b.tit); })[0];
  chk('RP5b Sueña (15 días): columnas Producto · Producir · PTF · Banzer · Charcas · Mutualista · Carmelo', suena && suena.th[0]==='Producto' && /Producir/.test(suena.th[1]) && /PTF/.test(suena.th[2]) && /Banzer/.test(suena.th[3]) &&
    ['Charcas','Mutualista','Carmelo'].every(function(n){ return suena.th.some(function(t){ return t.indexOf(n)>=0; }); }), suena && suena.th);
  var cierra=function(bl){ if(!bl || !bl.pie.length) return false; for(var i=1;i<bl.pie.length;i++){ var s=0; bl.filas.forEach(function(f){ var v=parseInt(f[i],10); if(v>0) s+=v; }); if(String(s)!==bl.pie[i]) return false; } return true; };
  chk('RP5c el TOTAL de cada tabla es la suma de sus columnas', r && r.a.bls.length>=2 && r.a.bls.every(cierra), r && r.a.bls.map(function(b){ return [b.tit.slice(0,40), b.pie]; }));
  chk('RP5d cada fila: Producir = PTF + Banzer + tiendas', r && r.a.bls.every(function(bl){ return bl.filas.every(function(f){ var s=0; for(var i=2;i<f.length;i++){ var v=parseInt(f[i],10); if(v>0) s+=v; } return String(s)===f[1]; }); }), r && r.a.bls[0] && r.a.bls[0].filas.slice(0,3));
  chk('RP5e el título de cada fábrica dice el total y a dónde va («producir N → PTF · Banzer · tiendas (…)»)', suena && /producir \d+ → 🏭 PTF \d+ · 🏪 Banzer \d+ · 🏬 tiendas \d+ \(/.test(suena.tit), suena && suena.tit);
  chk('RP5f los botones cambian el plazo (15 días → hasta el 30/11 → 7 días) y lo recuerda', r && /15 días/.test(r.a.sel) && /Hasta el 30\/11/.test(r.b.sel) && /7 días/.test(r.c.sel) && r.guardado==='quin', r && [r.a.sel, r.b.sel, r.c.sel, r.guardado]);
  chk('RP5g «hasta el 30/11» reparte más que 15 días, y 7 días menos o igual', r && (function(){ var n=function(x){ var s=0; x.bls.forEach(function(b){ s+=parseInt(b.pie[1],10)||0; }); return s; }; return n(r.b)>=n(r.a) && n(r.c)<=n(r.a) && n(r.b)>0; })(), r && 'ok');

  // ═══ RP6. Copiar ═══
  console.log('\n── RP6. Copiar ──');
  r = await page.evaluate(() => {
    if(typeof copiarProducirReparto!=='function') return { rep:'', todo:'', uno:'', s:{ tot:-1, quin:0, mes:0 } };
    var rep=_copia(function(){ copiarProducirReparto(); });
    var todo=_copia(function(){ copiarProducirTodo('tot'); });
    var uno=_copia(function(){ copiarProducir('suena','tot'); });
    var R=stockProducir(stockData()), s=R.bloques.filter(function(b){ return b.k==='suena'; })[0];
    return { rep:rep, todo:todo, uno:uno, s:{ tot:s.tot.tot, quin:s.tot.quin, mes:s.tot.mes } };
  });
  chk('RP6a «📋 Copiar la planilla»: «QUÉ VA A DÓNDE», cada producto con «→ PTF … · Banzer … · Charcas …» y el total', /QUÉ VA A DÓNDE — PRODUCIR PARA 15 DÍAS/.test(r.rep) && /COLCHON SOFT · 140x190[^\n]*: \d+ → (Charcas|Mutualista) \d+/.test(r.rep) && /Total: \d+ → /.test(r.rep) && /línea de logística/.test(r.rep), r.rep.slice(0,500));
  chk('RP6b «📋 Copiar todo hasta el 30/11» de todas las fábricas: cada producto con «15 días N + noviembre M»', /PRODUCIR TODO HASTA EL 30\/11 \(15 DÍAS \+ NOVIEMBRE\)/.test(r.todo) && /15 días \d+ \+ noviembre \d+/.test(r.todo) && /HEAVEN/.test(r.todo) && /SUEÑA/.test(r.todo), r.todo.slice(0,400));
  chk('RP6c el de un bloque (Sueña) cierra con su total = 15 días + noviembre', new RegExp('Total: '+r.s.tot+' unidades').test(r.uno) && r.s.tot===r.s.quin+r.s.mes, { s:r.s, t:r.uno.slice(-300) });

  // ═══ RP7. Nada cambia y entra en el celular ═══
  console.log('\n── RP7. Ningún número cambia; celular ──');
  r = await page.evaluate(() => {
    var foto=function(){ var d=stockData(); return JSON.stringify(stockPlanDatos(d, d.lista).map(function(x){ return [x.o.k, x.p7, x.p15, x.pm, x.o.fabricar, x.o.comp, x.o.objetivo]; })); };
    var antes=foto();
    if(typeof producirDestinos==='function'){ var c=stockTiendasParteCalc(null); producirDestinos(c.R); }
    else if(typeof stockTiendasParteCalc==='function') stockTiendasParteCalc(null);
    return { igual:antes===foto(), flag:STOCK_SIN_TIENDAS };
  });
  chk('RP7a el Plan da lo mismo antes y después del reparto, y el interruptor queda apagado', r.igual && r.flag===false, r);
  await page.setViewportSize({ width:390, height:844 });
  r = await page.evaluate(async () => {
    renderStock(); await new Promise(function(res){ setTimeout(res, 300); });
    var med=function(id){ var e=document.getElementById(id); return e ? { sw:e.scrollWidth, cw:e.clientWidth } : null; };
    return { pr:med('producir'), tg:med('prod-total-gen'), rep:med('prod-rep') };
  });
  chk('RP7b en 390 px el total y la planilla no se salen de su caja (las tablas scrollean adentro)', r.pr && r.tg && r.rep && r.pr.sw<=r.pr.cw+1 && r.tg.sw<=r.tg.cw+1 && r.rep.sw<=r.rep.cw+1, r);

  chk('sin errores de la página', ERRS.length===0, ERRS.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
