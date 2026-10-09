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
    /* (30/09, §4hd) La página nueva ya no suma al producto de la lista las ventas viejas de OTRO código (X-4: el «TITANIO ICE
       Med.Esp. 160X200» sumaba al 160x190). Esta prueba compara la regla de Multicenter con la publicada, no el histórico: se
       sacan del histórico las filas de códigos que la lista no conoce en las DOS páginas, y lo demás sigue siendo literal. */
    await page.evaluate(() => { VENTAS_HIST.filas=VENTAS_HIST.filas.filter(function(f){ return !!CODIGOS[String(f[0]).toUpperCase()]; });
      VENTAS_HIST_IDX=null; if(typeof stockOlvidarIndice==='function') stockOlvidarIndice(); });
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
      // (28/09, 2ª revisión) una consignación escrita de otra forma también queda afuera, como antes
      ['Eduardo Añez','MULTICENTER CONSIGNADO',false], ['Eduardo Añez','MULTICENTER (CONSIG.)',false],
      ['Eduardo Añez','MULTIESPUMAS',false], ['Eduardo Añez','MULTI CENTRO',false], ['Eduardo Añez','MULTICENTRO',false], ['Eduardo Añez','MULTI',false],
      ['Eduardo Añez','CLIENTE MAYORISTA',false], ['Carola Chavez','MULTICENTER',false], ['ROHO','MULTICENTER',false],
      ['Eduardo Añez','MULTICENTER',false,'RPT 09-001']
    ];
    return casos.map(function(c){ var got=stockEduardoMulticenter(p(c[0],c[1],c[3])); return { caso:c[0]+' → '+c[1]+(c[3]?(' ('+c[3]+')'):''), ok:got===c[2], got:got }; });
  }).catch(e => [{ caso:'(la página no tiene stockEduardoMulticenter)', ok:false, got:String(e).slice(0,120) }]);
  const malQuien = quien.filter(q => !q.ok);
  chk('Eduardo (cualquier forma de escribirlo) → MULTICENTER (palabra entera) es la excepción; consignación, «multi…», otro cliente, otro vendedor y una RPT no',
      malQuien.length===0, malQuien.map(q => q.caso+' dio '+q.got).join(' · '));
  /* «Pedido puntual» y «pedido único» dan IGUAL que antes para todo lo que no es la excepción: la consignación de los
     otros vendedores sigue siendo «CONSIGNACI…» (la forma amplia es solo para no meter una consignación de Eduardo). */
  const casosIg = [['Carola Chavez','MULTICENTER'],['Carola Chavez','CLIENTE CONSIGNADO'],['Carola Chavez','CONSIGNACION X'],['ROHO','TIENDA 1'],
                   ['ROHO','Juan Perez'],['Carola Chavez','MULTIESPUMAS'],['Eduardo Añez','MULTICENTER CONSIGNADO'],['Eduardo Añez','CLIENTE MAYORISTA']];
  const igual = (P) => P.evaluate((c) => c.map(function(x){ var p={ vendedor:x[0], cliente:x[1], oc:'' }; return [stockPuntual(p), stockPedidoUnico(p)]; }), casosIg);
  const igN = await igual(NUEVA), igV = await igual(VIEJA);
  chk('«pedido puntual» y «pedido único» dan igual que en la página publicada fuera de la excepción (también «CLIENTE CONSIGNADO» de Carola)',
      JSON.stringify(igN)===JSON.stringify(igV), { nueva:igN, antes:igV });

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
  /* Los números exactos del ejemplo del informe (reloj clavado): si cambian, cambió una regla — mirarlo a conciencia. */
  chk('rotación media → ALTA (18 unidades en 2 tramos): margen 2 → 4 días, reserva 3 → 7',
      nBase.T.rotacion==='media' && nBase.T.margen===2 && nBase.T.cubrir===3 && nMc.T.rotacion==='alta' && nMc.T.margen===4 && nMc.T.cubrir===7,
      { base:[nBase.T.rotacion, nBase.T.margen, nBase.T.cubrir], con:[nMc.T.rotacion, nMc.T.margen, nMc.T.cubrir] });
  /* (§4iy) El 10/09 (jueves) la fábrica tiene piso de 4 días (sale el sábado, el domingo no hay camión): 12 → 13, 14 → 15, 22 → 23. */
  chk('7 días de «Qué producir» 1 → 13 = fabricar de la tabla; pedir 3 → 15 (recoger 2 de Moreno + fabricar 13)',
      nBase.T.sem===1 && nBase.T.pedir===3 && nBase.T.recoger===2 && nMc.T.sem===13 && nMc.T.pedir===15 && nMc.T.recoger===2 && nMc.T.fabricar===13,
      { base:[nBase.T.pedir, nBase.T.recoger, nBase.T.sem], con:[nMc.T.pedir, nMc.T.recoger, nMc.T.fabricar, nMc.T.sem] });
  /* (30/09, §4hd) Sin la medida especial CH1389 en el histórico: oct-25 = 6 y tendencia 18 (antes 8 y 24), así que el rango
     arranca en 6, el máximo sin Multicenter es el ritmo de 30 d (18,6 → 19) y con Multicenter la mediana es el 90 d (20,4 → 21). */
  chk('15 días 9 → 23 y octubre 15 → 21 (rango 5–18 → 1–29)',
      /* (§4iz, E1-6) el rango de «producir» descuenta lo que el 15 días ya manda: 6–19 → 5–18 y 6–34 → 1–29 (lo que se NECESITA no cambia) */
      nBase.T.quin===9 && nMc.T.quin===23 && nBase.T.mesNec===15 && nMc.T.mesNec===21 && nBase.T.mesMin===5 && nBase.T.mesMax===18 && nMc.T.mesMin===1 && nMc.T.mesMax===29,
      { base:[nBase.T.quin, nBase.T.mesNec, nBase.T.mesMin, nBase.T.mesMax], con:[nMc.T.quin, nMc.T.mesNec, nMc.T.mesMin, nMc.T.mesMax] });
  // En la publicada esas ventas SÍ se veían, pero solo en los carteles de «no cuentan» (únicos de Eduardo y puntuales):
  // ningún número de la proyección se movía. Se comparan solo los de la proyección.
  const PROY = ['vendidosRotacion','nVentasRotacion','rotacion','porDia','v30','n30','porDiaMes','comp','pedir','recoger','fabricar','margen','cubrir',
                'sem','quin','mesNec','est','ago','sep'];   // (§4iz, E1-6/10) mes, mesQueda, mesMin, mesMax cambiaron a propósito: «queda» suma lo de 15 días y no tiene tope en 0
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
  const MES_NUEVO = ['mes','mesQueda','mesMin','mesMax'];   // (§4iz, E1-6/10) cambiaron a propósito contra la página publicada
  const comunes = (a, b) => { const out={}; Object.keys(b).forEach(k => { if(k!=='vendidosEduMc' && k!=='v30EduMc' && MES_NUEVO.indexOf(k)<0) out[k]=a[k]; }); return out; };
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

  // ═══ 8. Varios pedidos de Multicenter el MISMO día son UNA entrega (dueño, 29/09) ═════════════════════════
  /* *«Multicenter hace pedidos y todos son a su bodega, pero hace pedidos por unidades: a veces hasta 4 pedidos en el
     mismo día para su bodega.»* Contados uno por uno, una sola compra partida en 4 pedidos pasaba el umbral de 3 entregas
     distintas y armaba un ritmo que no existe. Dientes: PEDIDOS=<página 040e1df> (ahí cada pedido es una entrega). */
  console.log('\n── 8. Multicenter: varios pedidos el MISMO día a su bodega son UNA entrega (dueño, 29/09) ──');
  const mismoDia = await NUEVA.evaluate(() => {
    var hoy=todayStr(), k=stockClave({desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761'});
    var P=function(id, d, v, c, u){ var f=stockSumarDias(hoy,-d); return { id:id, fecha:f, oc:'', vendedor:v, cliente:c, entregado:true, verificado:true,
      ts:Date.parse(f+'T12:00:00-04:00'), productos:[{desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761', cant:u}] }; };
    var ver=function(lista){ STATE=lista; STOCK=stockVacio(); STOCK.c={ f:hoy, hora:'09:00', u:{}, solo0:true }; STOCK.c.u[k]=2; stockOlvidarIndice();
      var o=stockData().lista.filter(function(x){ return x.k===k; })[0];
      return { u:o.vendidosRotacion, n:o.nVentasRotacion, nTodas:o.nVentas, rot:o.rotacion, porDia:Math.round(o.porDia*1000)/1000,
               v30:o.v30, n30:o.n30, porDiaMes:Math.round(o.porDiaMes*1000)/1000, pedir:o.pedir }; };
    var MC=function(id, d){ return P(id, d, 'Eduardo Añez', 'MULTICENTER', 2); };
    return {
      mismo:ver([MC('m1',3), MC('m2',3), P('m3',3,'EDUARDO AÑEZ','Multicenter S.R.L.',2), MC('m4',3)]),   // 4 pedidos de 2, el mismo día
      tresDias:ver([MC('d1',2), MC('d2',2), MC('d3',5), MC('d4',8)]),                                    // los mismos, en 3 días distintos
      conEquipo:ver([P('e1',6,'Carola Chavez','CLIENTE',2), MC('m1',3), MC('m2',3), MC('m3',3), MC('m4',3)]),
      equipo:ver([P('t1',3,'Carola Chavez','CLIENTE A',2), P('t2',3,'Maria Flores','CLIENTE B',2), P('t3',3,'Mirian Salazar','CLIENTE C',2)])
    };
  });
  const md = mismoDia;
  chk('8a. 4 pedidos de 2 a Multicenter el mismo día: 8 unidades en UNA entrega (15 y 30 días)',
      md.mismo.u===8 && md.mismo.n===1 && md.mismo.nTodas===1 && md.mismo.v30===8 && md.mismo.n30===1, md.mismo);
  chk('8b. …así que es rotación baja: sin ritmo ni reserva, y no pide nada a fábrica',
      md.mismo.rot==='baja' && md.mismo.porDia===0 && md.mismo.porDiaMes===0 && md.mismo.pedir===0, md.mismo);
  chk('8c. los mismos pedidos en 3 días distintos son 3 entregas: rotación media, con ritmo (como siempre)',
      md.tresDias.n===3 && md.tresDias.rot==='media' && md.tresDias.porDia>0, md.tresDias);
  chk('8d. una entrega del equipo + los 4 de Multicenter del mismo día = 2 entregas: todavía sin rotación',
      md.conEquipo.n===2 && md.conEquipo.rot==='baja', md.conEquipo);
  chk('8e. tres clientes del equipo el mismo día siguen siendo 3 entregas (la regla es solo para Multicenter)',
      md.equipo.n===3 && md.equipo.rot==='media', md.equipo);

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
  /* (28/09, 2ª revisión) La caché del formulario (`saldoDatos`, una foto de `stockData` por lectura) se rehace con la
     corrección. Lo que VE la vendedora en el cuadrito no cambia con esta regla (ver abajo): esto solo mide que la foto
     no quede vieja. */
  chk('…y la caché del formulario se rehace con la corrección (no queda una foto vieja)', c.saldoCant===c.saldoIni-5, [c.saldoIni, c.saldoCant]);
  /* El cuadrito del saldo usa lo pendiente de TODOS, los almacenes y la fábrica; nunca el ritmo ni `stockPedidoUnico`.
     Lo pendiente de Eduardo (a Multicenter o a quien sea) ya contaba antes: con los mismos pedidos da IGUAL. */
  const cuadrito = (P) => P.evaluate(() => {
    var K=ESCENARIO({ rpt:true, mc:true, pend:true }); STOCK_CARGADO=true; if(typeof SALDO_GEN!=='undefined') SALDO_GEN++;
    return [1,4,9].map(function(n){ var v=saldoVeredicto(K.KT, n, '', '', true); return [n, v.tipo, v.alm, v.pend, v.libres, v.faltan].join('|'); });
  });
  const cuN = await cuadrito(NUEVA), cuV = await cuadrito(VIEJA);
  chk('el cuadrito del formulario da lo mismo que en la página publicada (lo pendiente de Eduardo ya contaba)', JSON.stringify(cuN)===JSON.stringify(cuV), { nueva:cuN, antes:cuV });
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
  /* (28/09, 2ª revisión) Tres textos que se contradecían o decían de más. */
  const txt2 = await NUEVA.evaluate(() => {
    var hoy=todayStr(), K=null, out={};
    var P=function(id, d, v, c, u){ return { id:id, fecha:stockSumarDias(hoy,-d), oc:'', vendedor:v, cliente:c, entregado:true, verificado:true,
      ts:Date.parse(stockSumarDias(hoy,-d)+'T12:00:00-04:00'), productos:[{desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761', cant:u}] }; };
    var k=stockClave({desc:'ORO BI RELAX', medida:'140x190', codigo:'CH1761'});
    var armar=function(lista){ STATE=lista; STOCK=stockVacio(); STOCK.c={ f:hoy, hora:'09:00', u:{}, solo0:true }; STOCK.c.u[k]=1; stockOlvidarIndice(); };
    // (a) solo Eduardo → Multicenter, 3 entregas: sin pedidos únicos, la «Base de rotación» no dice «0 de eduardo»
    armar([P('a1',2,'Eduardo Añez','MULTICENTER',2), P('a2',5,'Eduardo Añez','MULTICENTER',2), P('a3',8,'Eduardo Añez','MULTICENTER',2)]);
    abrirStock(); abrirStockPedidos(k);
    out.base=((document.body.textContent||'').replace(/\s+/g,' ').match(/Base de rotación:[^.]*\.[^.]*\./)||[''])[0];   // el detalle no va en #stock-body
    closeStock();
    // (b) solo Carola → MULTICENTER (pedido puntual): el cartel no dice «Lo vendió Eduardo»
    armar([P('b1',2,'Carola Chavez','MULTICENTER',7)]);
    abrirStock(); out.fila=(document.getElementById('stock-body').textContent||'').replace(/\s+/g,' ');
    closeStock();
    // (c) lo que se copia para la fábrica («el mes»): cuánto es de Multicenter y de dónde sale el número
    ESCENARIO({ rpt:true, mc:true });
    var R=stockProducir(stockData()), B=R.bloques.filter(function(b){ return b.filas.some(function(f){ return /TITANIO ICE/.test(f.o.desc); }); })[0];
    var copiado=''; var _c=copyText; copyText=function(t){ copiado=t; }; var _t=toast; toast=function(){};
    try{ copiarProducir(B.k, 'mes'); } finally { copyText=_c; toast=_t; }
    out.copia=copiado;
    return out;
  });
  chk('«Base de rotación» sin pedidos únicos no dice «0 de eduardo, excluidas»', /incluye 6 de Eduardo a Multicenter/.test(txt2.base) && !/\b0 de /.test(txt2.base) && !/eduardo, excluidas/.test(txt2.base), txt2.base);
  chk('una venta de Carola a Multicenter no dice «Lo vendió Eduardo» (es un pedido puntual)',
      !/Lo vendió Eduardo/.test(txt2.fila) && /pedido puntual/i.test(txt2.fila), (txt2.fila.match(/[^.]*pedido puntual[^.]*/i)||[txt2.fila.slice(0,200)])[0]);
  chk('lo que se copia para la fábrica dice cuánto es de Eduardo a Multicenter y que el mes es lo probable de cinco estimaciones',
      /14 de Eduardo a Multicenter/.test(txt2.copia) && /lo probable entre los últimos 30, 60 y 90 días/.test(txt2.copia) && /Eduardo a Multicenter, sin otras ventas puntuales ni reposiciones de tienda/.test(txt2.copia),
      txt2.copia.slice(0,500));

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
