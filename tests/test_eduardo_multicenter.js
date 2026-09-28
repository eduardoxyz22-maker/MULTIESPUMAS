/* 🏬 LAS VENTAS DE EDUARDO A MULTICENTER EN LA PROYECCIÓN DE STOCK (dueño, 28/09, §4gm).

   El pedido del dueño, textual en lo que importa:
     · Eduardo → Multicenter: entra al histórico y a la demanda con que se proyecta el stock.
     · Eduardo → otros clientes: sigue afuera.
     · Multicenter vendido por otro vendedor: sin cambios (pedido puntual).
     · Consignación y los otros pedidos puntuales: siguen afuera.
     · Las RPT no son ventas; siguen en «Qué va a pedir cada tienda», y eso no se suma a «Qué producir».
     · Lo pendiente compromete stock UNA vez.
     · Mismos umbrales de rotación: una compra grande sola no es demanda recurrente.

   Cómo se prueba: los MISMOS pedidos (sintéticos) en dos páginas a la vez — la publicada (`2040720`, la de antes) y
   la nueva — con el reloj clavado en el jueves 10/09/2026 a las 10 de Bolivia (15 días = desde el 27/08; 30 días =
   desde el 12/08; el mes que viene es octubre; agosto ya es un mes del panel, julio y antes salen del histórico).
   Así cada número de «después» se compara con el de «antes» sin copiar cuentas a mano, y la validación 7 (las demás
   ventas no cambian) es literal: lo que no es Eduardo → Multicenter tiene que dar IGUAL en las dos.

   Se corre:  node tests/test_eduardo_multicenter.js          (desde la raíz del repo)
   Con otra «antes»:  ANTES=<sha> node tests/test_eduardo_multicenter.js
   Dientes:   PEDIDOS=/ruta/a/pedidos_viejo.html node tests/test_eduardo_multicenter.js   (las de «después» fallan)
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), { execSync } = require('child_process');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const ANTES_SHA = process.env.ANTES || '2040720';
const RELOJ = '2026-09-10T10:00:00-04:00';

/* Los pedidos del ejemplo. Corre ADENTRO de cada página. `esc` elige qué se agrega a la base. */
function ESCENARIO(esc){
  var hoy=todayStr();
  var atras=function(n){ return stockSumarDias(hoy,-n); }, adel=function(n){ return stockSumarDias(hoy,n); };
  var TS=function(iso){ return Date.parse(iso+'T12:00:00-04:00'); };
  var n=0;
  var P=function(o){
    var r=Object.assign({ id:'p'+(++n), fecha:hoy, oc:'', vendedor:'Carola Chavez', cliente:'CLIENTE', celular:'70000000', turno:'AM', zona:'Norte',
      direccion:'Calle 1', maps:'', pagado:true, saldo:0, metodoPago:'', observaciones:'', estado:'', entregado:true, vehiculo:'', chofer:'',
      garantia:'', nota:'', acuenta:0, facturarA:'', nit:'', nroDia:1, verificado:true, fotos:[] }, o);
    r.ts=TS(o.venta||r.fecha);             // la venta es del día que se cargó (`contaFecha`): acá, el de la entrega salvo que se diga otro
    return r;
  };
  var TIT=function(c){ return [{desc:'TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:c}]; };
  var SOFT=function(c){ return [{desc:'COLCHON SOFT', medida:'140x190', codigo:'COLT0048', cant:c}]; };
  STATE=[];
  // ── El equipo, TITANIO ICE: 5 entregas de 2 en los últimos 5 días, 4 de 2 hace 20-26 días, y 3 de 2 a principio de agosto.
  for(var i=1;i<=5;i++) STATE.push(P({ fecha:atras(i), productos:TIT(2) }));
  [20,22,24,26].forEach(function(d){ STATE.push(P({ fecha:atras(d), productos:TIT(2) })); });
  ['2026-08-03','2026-08-05','2026-08-07'].forEach(function(f){ STATE.push(P({ fecha:f, productos:TIT(2) })); });
  // ── El equipo, COLCHON SOFT (otro producto, sin Multicenter): 3 entregas de 2 hace 18-24 días y 2 en los últimos 15.
  [18,21,24,2,6].forEach(function(d){ STATE.push(P({ fecha:atras(d), productos:SOFT(2) })); });
  // ── Lo que NO es demanda y tiene que seguir afuera:
  STATE.push(P({ id:'edu-otro', fecha:atras(3), vendedor:'Eduardo Añez', cliente:'CLIENTE MAYORISTA', productos:TIT(20) }));          // Eduardo a otro cliente
  STATE.push(P({ id:'mc-carola', fecha:atras(2), vendedor:'Carola Chavez', cliente:'MULTICENTER', productos:TIT(7) }));              // Multicenter de otro vendedor
  STATE.push(P({ id:'edu-consig', fecha:atras(4), vendedor:'Eduardo Añez', cliente:'MULTICENTER CONSIGNACIÓN', productos:TIT(9) })); // consignación: manda
  STATE.push(P({ id:'roho-t1', fecha:atras(3), vendedor:'ROHO', cliente:'TIENDA 1', productos:TIT(4) }));                           // ROHO a tienda
  STATE.push(P({ id:'edu-multi', fecha:atras(5), vendedor:'Eduardo Añez', cliente:'MULTIESPUMAS', productos:TIT(5) }));             // «multi…» NO es Multicenter
  if(esc.rpt!==false) STATE.push(P({ id:'rpt-charcas', fecha:atras(2), oc:'RPT 09-001', vendedor:'Fernando Peinado', cliente:'Charcas', productos:TIT(6) }));
  // ── Eduardo → Multicenter (el pedido del dueño):
  if(esc.mc){
    STATE.push(P({ id:'mc-1', fecha:atras(4), vendedor:'Eduardo Añez', cliente:'MULTICENTER', productos:TIT(esc.mc1!=null?esc.mc1:8) }));   // en 15 y en 30 días
    STATE.push(P({ id:'mc-2', fecha:atras(18), vendedor:'EDUARDO ANEZ', cliente:'Multicenter S.R.L.', productos:TIT(6) }));              // solo en 30 días
    STATE.push(P({ id:'mc-ago', fecha:'2026-08-06', vendedor:'eduardo añez', cliente:' multicenter ', productos:TIT(12) }));           // agosto: solo en el índice del mes
    if(esc.pend) STATE.push(P({ id:'mc-pend', fecha:adel(6), venta:hoy, entregado:false, vendedor:'Eduardo Añez', cliente:'MULTICENTER', productos:TIT(5) }));
  }
  (esc.extra||[]).forEach(function(o){ STATE.push(P(o)); });
  STOCK=stockVacio(); STOCK.c={ f:hoy, hora:'09:00', u:{}, solo0:true };
  var KT=stockClave(TIT(1)[0]), KS=stockClave(SOFT(1)[0]);
  STOCK.c.u[KT]=3; STOCK.c.u[KS]=1;
  STOCK.g={ 'IM - PRODUCTOTERMINADO':{ f:hoy, u:{} } }; STOCK.g['IM - PRODUCTOTERMINADO'].u[KT]=2;
  stockOlvidarIndice();
  return { KT:KT, KS:KS };
}
/* Los números de un producto: la tabla de stock (15 d y 30 d), «Qué producir» (7 d, 15 d, el mes) y el índice mensual. */
function NUMEROS(k){
  var d=stockData(), R=stockProducir(d), o=d.lista.filter(function(x){ return x.k===k; })[0], f=null;
  R.bloques.forEach(function(B){ B.filas.forEach(function(x){ if(x.o.k===k) f=x; }); });
  var I=ventasPanelIndex()[k]||{};
  var r2=function(x){ return Math.round(x*1000)/1000; };
  return { vendidosRotacion:o.vendidosRotacion, nVentasRotacion:o.nVentasRotacion, vendidosUnicos:o.vendidosUnicos, vendidosRpt:o.vendidosRpt,
           vendidosPunt:o.vendidosPunt, vendidosEduMc:o.vendidosEduMc, v30EduMc:o.v30EduMc, rotacion:o.rotacion, porDia:r2(o.porDia),
           v30:o.v30, n30:o.n30, porDiaMes:r2(o.porDiaMes), comp:o.comp, pedir:o.pedir, recoger:o.recoger, fabricar:o.fabricar, margen:o.margen, cubrir:o.cubrir,
           sem:f&&f.sem, quin:f&&f.quin, mesNec:f&&f.mesNec, mes:f&&f.mes, mesQueda:f&&f.mesQueda, mesMin:f&&f.mesMin, mesMax:f&&f.mesMax,
           est:f&&f.rango ? f.rango.est.map(function(e){ return e.n+'='+(Math.round(e.v*10)/10); }).join(' | ') : null,
           ago:I['2026-08']||0, sep:I['2026-09']||0 };
}

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores = [];
  const abrir = async (archivo) => {
    const page = await browser.newPage({ viewport:{ width:1400, height:1000 }, timezoneId:'America/La_Paz' });
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.route(/^https?:/, r => r.abort());
    await page.clock.setFixedTime(new Date(RELOJ));
    await page.goto('file://' + archivo, { waitUntil:'load' });
    await page.waitForTimeout(300);
    await page.evaluate(() => { var c=document.getElementById('conn-form'); if(c) c.style.display='none'; CONNECTED=false; UNLOCKED=true;
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER); if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER); });
    await page.evaluate('window.ESCENARIO='+ESCENARIO.toString()+'; window.NUMEROS='+NUMEROS.toString()+';');
    return page;
  };
  const viejoArch = path.join(os.tmpdir(), 'pedidos_antes_'+ANTES_SHA+'.html');
  fs.writeFileSync(viejoArch, execSync('git show '+ANTES_SHA+':pedidos.html', { maxBuffer: 64*1024*1024 }));
  const NUEVA = await abrir(PEDIDOS), VIEJA = await abrir(viejoArch);
  const correr = (page, esc) => page.evaluate((esc) => { var K=ESCENARIO(esc); return { T:NUMEROS(K.KT), S:NUMEROS(K.KS), K:K }; }, esc);
  chk('el reloj está clavado en el 10/09/2026 en las dos páginas', await NUEVA.evaluate(() => todayStr()) === '2026-09-10' && await VIEJA.evaluate(() => todayStr()) === '2026-09-10');

  // ═══ 0. Quién es quién ═══════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 0. Quién es Eduardo y quién es Multicenter ──');
  const quien = await NUEVA.evaluate(() => {
    var p=function(v,c,oc){ return { vendedor:v, cliente:c, oc:oc||'' }; };
    var casos=[
      ['Eduardo Añez','MULTICENTER',true], ['EDUARDO ANEZ','Multicenter S.R.L.',true], ['  eduardo  añez ',' multicenter ',true], ['Eduardo','MULTICENTER',true],
      ['Eduardo Añez','MULTICENTER CONSIGNACIÓN',false], ['Eduardo Añez','CONSIGNACION MULTICENTER',false],
      ['Eduardo Añez','MULTIESPUMAS',false], ['Eduardo Añez','MULTI CENTRO',false], ['Eduardo Añez','MULTICENTRO',false], ['Eduardo Añez','MULTI',false],
      ['Eduardo Añez','CLIENTE MAYORISTA',false], ['Carola Chavez','MULTICENTER',false], ['ROHO','MULTICENTER',false],
      ['Eduardo Añez','MULTICENTER',false,'RPT 09-001']
    ];
    return casos.map(function(c){ var got=stockEduardoMulticenter(p(c[0],c[1],c[3])); return { caso:c[0]+' → '+c[1]+(c[3]?(' ('+c[3]+')'):''), ok:got===c[2], got:got }; });
  }).catch(e => [{ caso:'(la página no tiene stockEduardoMulticenter)', ok:false, got:String(e).slice(0,120) }]);
  const malQuien = quien.filter(q => !q.ok);
  chk('Eduardo (cualquier forma de escribirlo) → MULTICENTER (palabra entera) es la excepción; consignación, «multi…», otro cliente, otro vendedor y una RPT no',
      malQuien.length===0, malQuien.map(q => q.caso+' dio '+q.got).join(' · '));

  // ═══ Los escenarios ═══════════════════════════════════════════════════════════════════════════════════════
  const base = { rpt:true };
  const conMc = { rpt:true, mc:true };
  const nBase = await correr(NUEVA, base), vBase = await correr(VIEJA, base);
  const nMc = await correr(NUEVA, conMc), vMc = await correr(VIEJA, conMc);

  // ═══ 1. Eduardo → Multicenter entra ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 1. Eduardo → Multicenter entra en el ritmo de 15 y 30 días, en el índice del mes y en «Qué producir» ──');
  chk('15 días: +8 unidades y +1 entrega (la de hace 4 días); la de hace 18 días no está en la ventana',
      nMc.T.vendidosRotacion===nBase.T.vendidosRotacion+8 && nMc.T.nVentasRotacion===nBase.T.nVentasRotacion+1 && nMc.T.vendidosEduMc===8,
      { base:[nBase.T.vendidosRotacion, nBase.T.nVentasRotacion], con:[nMc.T.vendidosRotacion, nMc.T.nVentasRotacion, nMc.T.vendidosEduMc] });
  chk('30 días: +14 unidades (8 + 6) y +2 entregas; la de agosto 6 queda afuera (antes del 12/08)',
      nMc.T.v30===nBase.T.v30+14 && nMc.T.n30===nBase.T.n30+2 && nMc.T.v30EduMc===14, { base:[nBase.T.v30, nBase.T.n30], con:[nMc.T.v30, nMc.T.n30, nMc.T.v30EduMc] });
  chk('índice mensual del panel (60 d / 90 d / tendencia): agosto +18 (la del 06/08 y la del 23/08) y septiembre +8 (la del 06/09)',
      nMc.T.ago===nBase.T.ago+18 && nMc.T.sep===nBase.T.sep+8, { base:[nBase.T.ago, nBase.T.sep], con:[nMc.T.ago, nMc.T.sep] });
  chk('7 días de «Qué producir» = lo de la tabla de stock, y sube con la demanda de Multicenter',
      nMc.T.sem===nMc.T.fabricar && nMc.T.pedir>nBase.T.pedir, { base:[nBase.T.pedir, nBase.T.sem], con:[nMc.T.pedir, nMc.T.sem] });
  chk('15 días y el mes de octubre también suben', nMc.T.quin>nBase.T.quin && nMc.T.mesNec>nBase.T.mesNec, { base:[nBase.T.quin, nBase.T.mesNec], con:[nMc.T.quin, nMc.T.mesNec] });
  // En la publicada esas ventas SÍ se veían, pero solo en los carteles de «no cuentan» (únicos de Eduardo y puntuales):
  // ningún número de la proyección se movía. Se comparan solo los de la proyección.
  const PROY = ['vendidosRotacion','nVentasRotacion','rotacion','porDia','v30','n30','porDiaMes','comp','pedir','recoger','fabricar','margen','cubrir',
                'sem','quin','mesNec','mes','mesQueda','mesMin','mesMax','est','ago','sep'];
  const proy = (o) => PROY.map(k => k+'='+o[k]).join(' ');
  chk('(antes) en la página publicada, Eduardo → Multicenter no movía ningún número de la proyección', proy(vMc.T)===proy(vBase.T), { antesBase:proy(vBase.T), antesConMc:proy(vMc.T) });
  chk('(antes) …solo aparecía en los carteles de «no cuentan»: +8 en únicos de Eduardo y +8 en puntuales (la de hace 4 días)',
      vMc.T.vendidosUnicos===vBase.T.vendidosUnicos+8 && vMc.T.vendidosPunt===vBase.T.vendidosPunt+8, { base:[vBase.T.vendidosUnicos, vBase.T.vendidosPunt], con:[vMc.T.vendidosUnicos, vMc.T.vendidosPunt] });

  // ═══ 2 y 3. Lo que sigue afuera ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 2 y 3. Eduardo a otro cliente, Multicenter de otro vendedor, consignación y «multi…» siguen afuera ──');
  chk('Eduardo a otros clientes (20 + la consignación 9 + MULTIESPUMAS 5) sigue en «únicos», fuera del ritmo',
      nBase.T.vendidosUnicos-nBase.T.vendidosRpt-nBase.T.vendidosPunt===25 && nMc.T.vendidosUnicos===nBase.T.vendidosUnicos, [nBase.T.vendidosUnicos, nBase.T.vendidosRpt, nBase.T.vendidosPunt]);
  chk('Multicenter de Carola (7), la consignación (9) y ROHO a tienda (4) siguen como pedido puntual (20), igual que antes',
      nBase.T.vendidosPunt===20 && vBase.T.vendidosPunt===20, [nBase.T.vendidosPunt, vBase.T.vendidosPunt]);

  // ═══ 7. Las demás ventas no cambian ═══════════════════════════════════════════════════════════════════════
  console.log('\n── 7. Sin Eduardo → Multicenter, todo da IGUAL que en la página publicada ──');
  const comunes = (a, b) => { const out={}; Object.keys(b).forEach(k => { if(k!=='vendidosEduMc' && k!=='v30EduMc') out[k]=a[k]; }); return out; };
  chk('TITANIO ICE sin ventas de Eduardo a Multicenter: cada número igual que antes (15 d, 30 d, 7 d, 15 d, el mes, el rango y el índice)',
      JSON.stringify(comunes(nBase.T, vBase.T))===JSON.stringify(comunes(vBase.T, vBase.T)), { nueva:comunes(nBase.T, vBase.T), antes:vBase.T });
  chk('COLCHON SOFT (el equipo solo) da igual que antes, con y sin las ventas de Eduardo a Multicenter del TITANIO',
      JSON.stringify(comunes(nMc.S, vMc.S))===JSON.stringify(comunes(vMc.S, vMc.S)) && JSON.stringify(comunes(nBase.S, vBase.S))===JSON.stringify(comunes(vBase.S, vBase.S)), { nueva:nMc.S, antes:vMc.S });

  // ═══ 4. La RPT ════════════════════════════════════════════════════════════════════════════════════════════
  console.log('\n── 4. Una RPT sigue fuera de las ventas y conserva su efecto en «Qué va a pedir cada tienda» ──');
  const sinRpt = await correr(NUEVA, { rpt:false, mc:true });
  chk('la RPT de 6 a Charcas no es venta: no entra al ritmo, a los 30 días ni al índice', nMc.T.vendidosRpt===6 && nMc.T.v30===sinRpt.T.v30 && nMc.T.sep===sinRpt.T.sep && nMc.T.vendidosRotacion===sinRpt.T.vendidosRotacion,
      { con:[nMc.T.vendidosRpt, nMc.T.v30, nMc.T.sep], sin:[sinRpt.T.v30, sinRpt.T.sep] });
  chk('…ni a «Qué producir»: 7 días, 15 días y el mes dan lo mismo con y sin la RPT', nMc.T.sem===sinRpt.T.sem && nMc.T.quin===sinRpt.T.quin && nMc.T.mes===sinRpt.T.mes,
      { con:[nMc.T.sem, nMc.T.quin, nMc.T.mes], sin:[sinRpt.T.sem, sinRpt.T.quin, sinRpt.T.mes] });
  const tiendas = await NUEVA.evaluate(() => { var K=ESCENARIO({ rpt:true, mc:true }); var L=stockTiendas(stockMesSiguiente(todayStr()));
    var ch=L.filter(function(t){ return t.n==='Charcas'; })[0]; var f=ch && ch.filas.filter(function(x){ return x.k===K.KT; })[0];
    var mc=L.filter(function(t){ return /multicenter/i.test(t.n); }).length;
    return { r:f?f.r:null, v:f?f.v:null, sucursales:L.map(function(t){ return t.n; }), mc:mc }; });
  chk('en «Qué va a pedir cada tienda», Charcas recibió 6 TITANIO ICE (la RPT sigue ahí), y Multicenter no aparece como tienda',
      tiendas.r===6 && tiendas.mc===0, tiendas);

  // ═══ 5. Lo pendiente compromete una sola vez ══════════════════════════════════════════════════════════════
  console.log('\n── 5. Un pedido pendiente de Eduardo → Multicenter compromete stock una sola vez ──');
  const pend = await correr(NUEVA, { rpt:true, mc:true, pend:true });
  chk('el pendiente de 5 (para dentro de 6 días) compromete 5, una vez', pend.T.comp===nMc.T.comp+5, [nMc.T.comp, pend.T.comp]);
  chk('…y como se vendió hoy, entra a los 30 días (+5) y al índice de septiembre (+5), pero no a los 15 días (sale después)',
      pend.T.v30===nMc.T.v30+5 && pend.T.sep===nMc.T.sep+5 && pend.T.vendidosRotacion===nMc.T.vendidosRotacion, [pend.T.v30, pend.T.sep, pend.T.vendidosRotacion]);
  const pendSolo = await NUEVA.evaluate(() => {
    // Solo el pendiente de Multicenter, sin nada más de ese producto: pedir = lo comprometido − lo que hay, ni una unidad más.
    STATE=[]; var hoy=todayStr(), P=function(o){ return Object.assign({ id:'x', fecha:hoy, oc:'', vendedor:'Eduardo Añez', cliente:'MULTICENTER', entregado:false, verificado:false,
      productos:[{desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761', cant:5}], ts:Date.parse(hoy+'T12:00:00-04:00') }, o); };
    STATE.push(P({ id:'solo', fecha:stockSumarDias(hoy,6) }));
    var k=stockClave({desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761'});
    STOCK=stockVacio(); STOCK.c={ f:hoy, hora:'09:00', u:{}, solo0:true }; STOCK.c.u[k]=2; stockOlvidarIndice();
    var o=stockData().lista.filter(function(x){ return x.k===k; })[0];
    return { comp:o.comp, pedir:o.pedir, porDia:o.porDia, rotacion:o.rotacion, v30:o.v30, n30:o.n30, porDiaMes:o.porDiaMes };
  });
  chk('solo ese pendiente (5) con 2 en depósito: pedir 3 — ni 8 (contarlo dos veces) ni reserva de rotación',
      pendSolo.comp===5 && pendSolo.pedir===3 && pendSolo.porDia===0 && pendSolo.porDiaMes===0, pendSolo);

  // ═══ Una compra grande sola no es demanda recurrente ══════════════════════════════════════════════════════
  console.log('\n── Mismos umbrales: una compra grande sola de Multicenter no arma ritmo ──');
  const grande = await NUEVA.evaluate(() => {
    STATE=[]; var hoy=todayStr();
    STATE.push({ id:'g', fecha:stockSumarDias(hoy,-3), oc:'', vendedor:'Eduardo Añez', cliente:'MULTICENTER', entregado:true, ts:Date.parse(stockSumarDias(hoy,-3)+'T12:00:00-04:00'),
      productos:[{desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761', cant:40}] });
    var k=stockClave({desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761'});
    STOCK=stockVacio(); STOCK.c={ f:hoy, hora:'09:00', u:{}, solo0:true }; STOCK.c.u[k]=10; stockOlvidarIndice();
    var o=stockData().lista.filter(function(x){ return x.k===k; })[0];
    return { vendidosRotacion:o.vendidosRotacion, nVentasRotacion:o.nVentasRotacion, rotacion:o.rotacion, porDia:o.porDia, porDiaMes:o.porDiaMes, pedir:o.pedir };
  });
  chk('40 en UNA entrega a Multicenter: cuenta como venta del equipo, pero es 1 entrega → rotación baja, sin ritmo ni reserva, no pide nada',
      grande.vendidosRotacion===40 && grande.nVentasRotacion===1 && grande.rotacion==='baja' && grande.porDia===0 && grande.porDiaMes===0 && grande.pedir===0, grande);

  // ═══ 6. Cambiar cantidad, cliente o vendedor recalcula ════════════════════════════════════════════════════
  console.log('\n── 6. Cambiar cantidad, cliente o vendedor recalcula todo, también el índice del mes y la caché del formulario ──');
  const cambios = await NUEVA.evaluate(() => {
    var K=ESCENARIO({ rpt:true, mc:true }), out={};
    var mc=findById('mc-1'), foto=function(){ var n=NUMEROS(K.KT); return { rot:n.vendidosRotacion, eduMc:n.vendidosEduMc, v30:n.v30, sep:n.sep, unicos:n.vendidosUnicos, punt:n.vendidosPunt }; };
    var saldoRot=function(){ var o=saldoDatos('').porK[K.KT]; return o ? o.vendidosRotacion : null; };
    out.ini=foto(); out.saldoIni=saldoRot();
    mc.productos[0].cant=3; saveMirror();                              // como después de guardar una corrección
    out.cant=foto(); out.saldoCant=saldoRot();
    mc.cliente='CLIENTE PARTICULAR'; saveMirror(); out.cliente=foto();
    mc.cliente='MULTICENTER'; mc.vendedor='Carola Chavez'; saveMirror(); out.vendedor=foto();
    mc.vendedor='Eduardo Añez'; saveMirror(); out.vuelta=foto();
    return out;
  });
  const c = cambios;
  chk('cantidad 8 → 3: el ritmo de 15 días, los 30 días y septiembre bajan 5', c.cant.rot===c.ini.rot-5 && c.cant.eduMc===3 && c.cant.v30===c.ini.v30-5 && c.cant.sep===c.ini.sep-5, c);
  chk('…y el saldo del formulario (su caché por lectura) también lo ve', c.saldoCant===c.saldoIni-5, [c.saldoIni, c.saldoCant]);
  chk('cliente → otro: sale de la demanda y pasa a «únicos» de Eduardo', c.cliente.rot===c.ini.rot-8 && c.cliente.eduMc===0 && c.cliente.sep===c.ini.sep-8 && c.cliente.unicos===c.ini.unicos+3, c.cliente);
  chk('vendedor → Carola (Multicenter de otro vendedor): pedido puntual, como siempre', c.vendedor.rot===c.ini.rot-8 && c.vendedor.punt===c.ini.punt+3 && c.vendedor.sep===c.ini.sep-8, c.vendedor);
  chk('de vuelta a Eduardo → Multicenter (3): vuelve a entrar', c.vuelta.rot===c.ini.rot-5 && c.vuelta.eduMc===3 && c.vuelta.sep===c.ini.sep-5, c.vuelta);

  // ═══ Los textos ═══════════════════════════════════════════════════════════════════════════════════════════
  console.log('\n── Los textos del panel dicen los filtros de verdad ──');
  const txt = await NUEVA.evaluate(() => { ESCENARIO({ rpt:true, mc:true }); abrirStock();
    var p=document.getElementById('producir'), t=p?p.textContent.replace(/\s+/g,' '):'';
    var fila=document.querySelector('#producir tr[data-producir-k*="TITANIO ICE"]'), ft=fila?fila.textContent.replace(/\s+/g,' '):'';
    var stk=document.getElementById('stock-body'), st=stk?stk.textContent.replace(/\s+/g,' '):'';
    closeStock(); return { cab:t.slice(0,700), fila:ft, tabla:/incluye 8 de Eduardo a Multicenter/.test(st) }; });
  chk('la cabecera de «Qué producir»: «ventas del equipo + ventas de Eduardo a Multicenter; sin otras ventas puntuales … ni reposiciones de tienda (RPT)»',
      /ventas del equipo \+ ventas de Eduardo a Multicenter; sin otras ventas puntuales \(las demás de Eduardo, Multicenter de otros vendedores, consignación, ROHO a tienda\) ni reposiciones de tienda \(RPT\)/.test(txt.cab) && /no dice vendedor ni cliente/.test(txt.cab), txt.cab);
  chk('la fila del TITANIO ICE dice cuánto es de Multicenter (15 d: 8 · 30 d: 14)', /8 de Eduardo a Multicenter/.test(txt.fila) && /14 de Eduardo a Multicenter/.test(txt.fila), txt.fila.slice(0,300));
  chk('la tabla de stock: «Equipo: … (incluye 8 de Eduardo a Multicenter)»', txt.tabla===true, txt.tabla);

  // ═══ El ejemplo de antes y después ════════════════════════════════════════════════════════════════════════
  console.log('\n── Ejemplo: TITANIO ICE 160x190 (acá 3 · Moreno 2), los mismos pedidos, antes y después ──');
  const filaEj = (n, a, d) => console.log('   '+n.padEnd(34)+String(a).padEnd(26)+String(d));
  filaEj('', 'ANTES (2040720)', 'DESPUÉS');
  [['15 d: unidades · entregas', vMc.T.vendidosRotacion+' · '+vMc.T.nVentasRotacion, nMc.T.vendidosRotacion+' · '+nMc.T.nVentasRotacion+' (8 de Multicenter)'],
   ['rotación · por día', vMc.T.rotacion+' · '+vMc.T.porDia, nMc.T.rotacion+' · '+nMc.T.porDia],
   ['margen · reserva (días)', vMc.T.margen+' · '+vMc.T.cubrir, nMc.T.margen+' · '+nMc.T.cubrir],
   ['7 d: pedir (recoger · fabricar)', vMc.T.pedir+' ('+vMc.T.recoger+' · '+vMc.T.fabricar+')', nMc.T.pedir+' ('+nMc.T.recoger+' · '+nMc.T.fabricar+')'],
   ['«Qué producir»: 7 d · 15 d · oct.', vMc.T.sem+' · '+vMc.T.quin+' · '+vMc.T.mes, nMc.T.sem+' · '+nMc.T.quin+' · '+nMc.T.mes],
   ['30 d: unidades · entregas · /día', vMc.T.v30+' · '+vMc.T.n30+' · '+vMc.T.porDiaMes, nMc.T.v30+' · '+nMc.T.n30+' · '+nMc.T.porDiaMes+' (14 de Multicenter)'],
   ['índice: agosto · septiembre', vMc.T.ago+' · '+vMc.T.sep, nMc.T.ago+' · '+nMc.T.sep],
   ['octubre: necesita (mín–máx)', vMc.T.mesNec+' ('+vMc.T.mesMin+'–'+vMc.T.mesMax+')', nMc.T.mesNec+' ('+nMc.T.mesMin+'–'+nMc.T.mesMax+')']].forEach(r => filaEj(r[0], r[1], r[2]));
  console.log('   estimaciones antes:   '+vMc.T.est);
  console.log('   estimaciones después: '+nMc.T.est);

  chk('ningún error de JavaScript en las páginas', errores.length===0, errores.slice(0,5));
  await browser.close();
  try{ fs.unlinkSync(viejoArch); }catch(e){}
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
