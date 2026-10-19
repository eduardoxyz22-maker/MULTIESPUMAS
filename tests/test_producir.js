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
      🎯 (18/10, §4ls, decisión 4 del dueño) Para lo que ROTA las tres columnas salen de su objetivo y su punto de pedido (venta de 26
      días hábiles por día de venta): la regla está escrita aparte acá arriba (`regla`, `columnas`) y la página tiene que dar lo mismo.
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

/* 🎯 (18/10, §4ls, decisión 4 del dueño) La regla del cuánto para lo que rota, escrita APARTE (la de test_stock_rev2_cuanto.js, que es la
   de la revisión 2): venta de los últimos 26 días hábiles por día de venta (el domingo se cuenta el sábado), punto de pedido = μ·5 + z·σ·√5,
   objetivo = eso + 1 día (nunca menos que el pedido típico), y se pide hasta el objetivo cuando lo libre llega al punto de pedido. */
const sumar=(f,n)=>{ const d=new Date(f+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const habil=(f,fer)=> new Date(f+'T12:00:00Z').getUTCDay()!==0 && !fer.has(f);
function regla(ventas, hoy, fer){
  const dias=[]; let f=hoy; while(dias.length<48){ if(habil(f,fer)) dias.push(f); f=sumar(f,-1); }
  const pos={}; dias.forEach((d,i)=>pos[d]=i);
  const serie=new Array(26).fill(0), ord={};
  for(const v of ventas){ let g=v.f; while(!(g in pos) && g>=dias[47]) g=sumar(g,-1); if(!(g in pos)) continue;
    const i=pos[g]; if(i<26) serie[i]+=v.u; ord[v.ek]=(ord[v.ek]||0)+v.u; }
  const tot=serie.reduce((a,b)=>a+b,0), mu=tot/26, sd=Math.sqrt(serie.reduce((a,x)=>a+(x-mu)*(x-mu),0)/25);
  let tam=Object.values(ord).sort((a,b)=>a-b); if(!tam.length) tam=[1];
  const q75=tam[Math.floor(0.75*(tam.length-1))];
  const z=(mu*5>=4)?1.645:1.28, prot=mu*5+z*sd*Math.sqrt(5), S=Math.max(prot+mu, q75), s=Math.min(S-1, prot);
  return { mu, sd, q75, z, S, s, obj:Math.ceil(S-1e-9), pp:Math.floor(s+1e-9), tot };
}
const habilesEntre=(a,b,fer)=>{ let n=0; for(let f=sumar(a,1); f<=b; f=sumar(f,1)) if(habil(f,fer)) n++; return n; };
/* Las cinco columnas de «Qué producir» para un producto que rota, sin nada vendido sin entregar (como los de este fixture): 7 días = lo
   que se pide (objetivo − libre, si lo libre llegó al punto de pedido) menos lo que se trae de Moreno; 15 días = el objetivo + la venta de
   los días hábiles de los próximos 15 − lo que hay (acá + Moreno); el mes = su venta (días hábiles) − lo que el 1° queda sobre el objetivo. */
function columnas(R, aca, moreno, hoy, finActual, ini, fin, fer){
  const libre=aca, pedir=(libre<=R.s || libre<0) ? Math.max(0, Math.ceil(R.S-libre-1e-9)) : 0, sem=pedir-Math.min(moreno, pedir), hay=aca+moreno;
  const quin=Math.max(sem, Math.ceil(R.S+R.mu*habilesEntre(hoy, sumar(hoy,15), fer)-hay-1e-9), 0);
  /* (18/10, §4ls, corrector) El mes se redondea UNA vez, como la regla validada (`ceil(μ·hábiles + vendido − lo que sobra)`); «queda» se
     muestra como necesita − producir para que la fila cierre (§4ds). Lo que queda sigue sin tope (§4iz E1-6). */
  const qRaw=hay+quin-(R.S+R.mu*habilesEntre(hoy, finActual, fer)), necRaw=R.mu*habilesEntre(sumar(ini,-1), fin, fer);
  const nec=Math.ceil(necRaw-1e-9), mes=Math.max(0, Math.ceil(necRaw-qRaw-1e-9)), queda=mes>0 ? nec-mes : Math.floor(qRaw+1e-9);
  const mes1=Math.min(mes, Math.max(0, Math.ceil(nec*0.7-1e-9)-queda));
  return { pedir, sem, quin, mesNec:nec, mesQueda:queda, mes, mes1, mes2:mes-mes1 };
}

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
    /* (18/10, §4ls, decisión 4) Lo que ROTA tiene objetivo y punto de pedido con la venta POR DÍA DE VENTA (`contaFecha`, de `ts`): esas
       ventas (TITANIO, PILLOW, ORO BI RELAX, XYZ) se cargan el día de su entrega. Con `ts:Date.now()` el fixture las vendía todas hoy (18
       TITANIO en un día). Las demás siguen con `ts` de hoy, como siempre: el SOFT no rota y su mes sale de la historia por mes de venta. */
    var PV=function(o){ var x=P(o); x.ts=new Date(x.fecha+'T09:00:00-04:00').getTime(); return x; };
    var H=function(n){ return [{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:n}]; };
    var S=function(n){ return [{desc:'COLCHON SOFT',medida:'140x190',codigo:'COLT0048',cant:n}]; };
    var M=function(n){ return [{desc:'MORFEO',medida:'140x190',codigo:'',cant:n}]; };
    var C=function(n){ return [{desc:'COLCHON CARIOCA PREMIER',medida:'140x190',codigo:'CH1672',cant:n}]; };
    var T=function(n){ return [{desc:'PROTECTOR DE COLCHON',medida:'140x190',codigo:'',cant:n}]; };
    var F=function(n){ return [{desc:'PILLOW FLEX',medida:'140x190',codigo:'CH2103',cant:n}]; };
    STATE=[];
    // Heaven: 5 entregas del equipo en los últimos 5 días (2 c/u) + 4 entregas hace 20-26 días
    for(var i=1;i<=5;i++) STATE.push(PV({id:'h'+i, fecha:atras(i), productos:H(2)}));
    [20,22,24,26].forEach(function(n,i){ STATE.push(PV({id:'hv'+i, fecha:atras(n), productos:H(2)})); });
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
    [2,4,6,8].forEach(function(n,i){ STATE.push(PV({id:'f'+i, fecha:atras(n), productos:F(3)})); });
    // Un Heaven que rota (4 entregas en 8 días) pero con 60 en depósito: cubierto en los tres horizontes
    [1,3,5,7].forEach(function(n,i){ STATE.push(PV({id:'b'+i, fecha:atras(n), productos:[{desc:'ORO BI RELAX',medida:'140x190',codigo:'CH1761',cant:1}]})); });
    // Un nombre suelto con la medida escrita como en el almacén («130X190CM»): 4 entregas en 8 días, nada en depósito
    [1,3,5,7].forEach(function(n,i){ STATE.push(PV({id:'x'+i, fecha:atras(n), productos:[{desc:'XYZ PLUS',medida:'130X190CM',codigo:'',cant:1}]})); });
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
  const HOY='2026-09-10';
  const fer = new Set(await page.evaluate(()=>Object.keys(FERIADOS||{}).concat(Object.keys(typeof FERIADOS_PASADOS!=='undefined'?FERIADOS_PASADOS:{}))));
  const vtas=(dias,u,pre)=>dias.map(n=>({ f:sumar(HOY,-n), u:u, ek:pre+n }));
  const RH=regla(vtas([1,2,3,4,5],2,'h').concat(vtas([20,22,24,26],2,'hv')), HOY, fer);   // TITANIO ICE: 18 del equipo (sin RPT, Eduardo ni ATC)
  const RF=regla(vtas([2,4,6,8],3,'f'), HOY, fer);                                         // PILLOW FLEX: 12 en 4 entregas
  const RX=regla(vtas([1,3,5,7],1,'x'), HOY, fer);                                         // XYZ PLUS: 4 en 4 entregas
  const col=(R,aca,mor)=>columnas(R, aca, mor, HOY, '2026-09-30', '2026-10-01', '2026-10-31', fer);
  const EH=col(RH,3,2), EF=col(RF,20,0), EX=col(RX,0,0);
  chk('las claves de producto se resuelven por el catálogo', /TITANIO ICE/.test(K.H) && /SOFT/.test(K.S) && /PILLOW FLEX/.test(K.F), JSON.stringify(K));

  /* ---------- 3. Los números ---------- */
  let r = await page.evaluate(() => {
    var d=stockData(), R=stockProducir(d);
    var fila=function(k){ var out=null; R.bloques.forEach(function(B){ B.filas.forEach(function(f){ if(f.o.k===k) out=Object.assign({}, f, {bloque:B.k, por:f.bloque.por, o:{porDia:f.o.porDia, porDiaMes:f.o.porDiaMes, v30:f.o.v30, n30:f.o.n30, vendidosRotacion:f.o.vendidosRotacion, nVentasRotacion:f.o.nVentasRotacion, vendidosUnicos:f.o.vendidosUnicos, deposito:f.o.deposito, enOtros:f.o.enOtros, fabricar:f.o.fabricar, lead:f.o.lead, margen:f.o.margen, comp:f.o.comp, rota:f.o.rota, objetivo:f.o.objetivo, puntoPedido:f.o.puntoPedido, objMu:f.o.objMu, objSd:f.o.objSd}}); }); }); return out; };
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
  /* 🎯 (18/10, §4ls, decisión 4 del dueño) REEMPLAZA a la regla de antes para lo que rota: 7 días era «ritmo de 15 días × (fábrica 3 +
     margen 2 + 3 de reserva) − lo que hay» (0,667 × 8 = 5,33 → pedir 3, 2 de Moreno → fabricar 1) y 15 días «ritmo × (fábrica + margen + 15)
     − lo que hay» (13,3 − 5 → 9). Ahora: venta de los últimos 26 días hábiles POR DÍA DE VENTA (TITANIO: 18, μ 0,69, σ 1,12), punto de
     pedido μ·5 + 1,28·σ·√5 = 6,4, objetivo 7,4 → 8. Lo libre (3 en PTF) está bajo el punto de pedido → se pide hasta el objetivo: 5, se
     traen 2 de Moreno → fabricar 3. 15 días: el objetivo + la venta de los 12 días hábiles hasta el 25/09 − lo que hay (3 + 2) → 11. */
  chk('🎯 TITANIO ICE: objetivo 8 y punto de pedido 6 con la venta de 26 días hábiles (la misma cuenta, hecha aparte)',
      r.H && r.H.o.objetivo===RH.obj && r.H.o.puntoPedido===RH.pp && RH.obj===8 && RH.pp===6 && Math.abs(r.H.o.objMu-RH.mu)<1e-9 && Math.abs(r.H.o.objSd-RH.sd)<1e-9,
      r.H && JSON.stringify([r.H.o.objetivo, r.H.o.puntoPedido, RH.obj, RH.pp]));
  chk('7 días = exactamente lo que dice la tabla de stock (lo libre 3 ≤ 6: pedir 5 hasta el objetivo, 2 se traen de Moreno → fabricar 3)',
      r.H && r.H.sem===EH.sem && r.H.o.fabricar===EH.sem && EH.sem===3 && EH.pedir===5, r.H && (r.H.sem+' vs '+r.H.o.fabricar+' · regla '+EH.sem));
  chk('15 días: el objetivo + la venta de los días hábiles de los próximos 15 − lo que hay (5) → 11', r.H && r.H.quin===EH.quin && EH.quin===11, r.H && (r.H.quin+' · regla '+EH.quin));
  /* octubre: la regla es la de §4ec/§4ds (revisada en §4er: coherente): se necesita lo PROBABLE del
     rango (mediana de 30 d / 60 d / 90 d / año pasado / tendencia), EN ENTEROS para arriba. Sin
     historia del TITANIO ICE, el rango sale del ritmo de 30 d: 0,6×31 = 18,6 → 19; quedan 0 el
     1/10 (5 − 0,6×21 días de septiembre) → producir 19; 70% → 14 y 5
     ⚠️ (30/09, §4hd, a conciencia) Cambió la HISTORIA, no la regla: el histórico del sistema sumaba al TITANIO ICE 160x190 las
     ventas del «TITANIO ICE Med.Esp. 160X200» (CH1389, otro código: una medida especial, que se fabrica a pedido). Desde §4hd
     un código que la lista no conoce no se suma «por parecerse» (§4cy, X-4), así que oct-25 = 6 (antes 8) y la tendencia
     6 × 3 = 18 (antes 24). El rango es {30 d 18,6 · oct-25 6 · tendencia 18}: la mediana es 18 → producir 18; 70% → 13 y 5;
     rango 6–19. */
  /* (§4iz, E1-6/E1-10) «queda el 1/10» suma lo que «15 días» ya manda a producir (sin pedirlo dos veces) y puede ser negativo (lo que
     falta antes del 1°, se suma al mes). Por eso octubre cambió en estos productos: TITANIO 18 → 17, el de Sueña 17 → 21, XYZ 5 → 2. */
  /* 🎯 (18/10, §4ls) REEMPLAZA a «lo probable del rango (mediana de 30 d · oct-25 · tendencia) − lo que queda el 1°» para lo que rota:
     octubre = la venta de la regla (μ) × sus 27 días hábiles = 18,7 → 19, menos lo que el 1/10 quede POR ENCIMA del objetivo (el objetivo
     se mantiene). Con lo de 15 días el 30/09 quedan 3 por DEBAJO del objetivo (−3: la venta del 26 al 30/09), que se suman → producir 22. */
  chk('octubre: la venta de la regla × 27 días hábiles → 19; el 1/10 quedan 3 bajo el objetivo → producir 22 (sin rango: el ritmo es el de la regla)',
      r.H && r.H.mesNec===EH.mesNec && r.H.mesQueda===EH.mesQueda && r.H.mes===EH.mes && EH.mesNec===19 && EH.mesQueda===-3 && EH.mes===22 && r.H.rango==null,
      r.H && JSON.stringify([r.H.mesNec,r.H.mesQueda,r.H.mes,'regla',EH.mesNec,EH.mesQueda,EH.mes]));
  chk('el 70% (14 + los 3 que faltan = 17) para la 1ª quincena y el resto (5) para la 2ª', r.H && r.H.mes1===EH.mes1 && r.H.mes2===EH.mes2 && EH.mes1===17 && EH.mes2===5, r.H && (r.H.mes1+' · '+r.H.mes2));
  // Sueña: nada en 15 días (no rota), 6 en 3 entregas en 30 → 0,2/día. Solo el mes
  chk('COLCHON SOFT: sin rotación en 15 días → 7 y 15 días en cero', r.S && r.S.o.rota===false && r.S.sem===0 && r.S.quin===0, r.S && JSON.stringify([r.S.sem,r.S.quin]));
  /* El SOFT (COLT0048) SÍ tiene historia en VENTAS_HIST (jun-26 = 29, jul-26 = 41, oct-25 = 34).
     0️⃣ (18/10, §4ls Mes-VM2/U45, a conciencia) Agosto no tiene ventas en el panel (las 3 entregas se cargaron en septiembre): ahora es un 0,
     no «sin datos», y entran el 60 d ((0 + 41) / 2 = 20,9) y el 90 d ((0 + 41 + 29) / 3 = 23,8). El rango es {30 d 6,2 · tendencia 17 ·
     60 d 20,9 · 90 d 23,8 · oct-25 34}: la MEDIANA es 20,9 → 21, + los 4 que faltan antes del 1/10 (queda −4, §4iz E1-6) → producir 25
     (70 % → 15 + 4 = 19 y 6). Antes: {6,2 · 17 · 34} → 17 + 4 = 21 (16 + 5).
     (§4ls, corrector) Sin «Mes-VM4»: esos 4 vuelven al mes (estaban en «15 días»). */
  chk('…pero 3 entregas en 30 días sí es ritmo del mes: 0,2/día; con la historia (5 estimaciones, agosto = 0) el probable es 21 + los 4 que faltan antes del 1° → producir 25 (19 + 6)', r.S && Math.abs(r.S.o.porDiaMes-0.2)<1e-9 && r.S.mes===25 && r.S.mes1===19 && r.S.mes2===6 && r.S.rango && r.S.rango.n===5 && r.S.mesQueda===-4, r.S && JSON.stringify([r.S.o.porDiaMes,r.S.mes,r.S.mes1,r.S.mes2,r.S.rango&&r.S.rango.n,r.S.mesQueda]));
  chk('COLCHON SOFT cae en el bloque de Sueña (Multiespumas)', r.S && r.S.bloque==='suena');
  // Eduardo: el MORFEO vendido sin entregar se cubre (4), pero no arma ritmo ni mes
  chk('el MORFEO de Eduardo: se cubren los 4 vendidos sin entregar en 7 y 15 días, nada para octubre', r.M && r.M.sem===4 && r.M.quin===4 && r.M.mes===0 && r.M.o.porDia===0 && r.M.o.porDiaMes===0, r.M && JSON.stringify([r.M.sem,r.M.quin,r.M.mes]));
  chk('…y como el nombre no dice de qué marca es, va a «sin fábrica asignada»', r.M && r.M.bloque==='otros');
  /* ROHO line: rota (12 en 4 entregas) pero hay 20: cubierto en la semana y la quincena (sobre el punto de pedido). 🎯 (§4ls) Octubre ya no
     sale de la historia (oct-25 = 19 → 18) sino de la venta de la regla: 12 en 26 días hábiles × 27 = 12,5 → 13; el 1/10 quedan 6 por encima
     del objetivo → 7 (antes, también 7: 18 − 11). */
  /* (18/10, §4ls, corrector, a conciencia) El mes redondeado UNA vez (la regla validada): necesita 12,x y quedan 6,x sobre el objetivo →
     pide 6 (antes 13 − 6 = 7, con +1 por redondear dos veces); «queda» se muestra 7 para que cierre (13 − 7 = 6). */
  chk('PILLOW FLEX (línea ROHO) rota pero hay 20: 7 y 15 días en cero; octubre necesita 13 (la regla) y quedan 6,x sobre el objetivo → pide 6 (redondeo único)',
      r.F && r.F.sem===0 && r.F.quin===0 && r.F.mes===EF.mes && r.F.mesNec===EF.mesNec && r.F.mesQueda===EF.mesQueda && EF.mes===6 && EF.mesNec===13 && EF.mesQueda===7 && EF.sem===0 && EF.quin===0,
      r.F && JSON.stringify([r.F.sem,r.F.quin,r.F.mes,r.F.mesNec,r.F.mesQueda,'regla',EF]));
  /* 21/09: el dueño dijo dónde se hacen las líneas de ROHO — *«flex pedic de roho se
     fabrica en industrias moreno»*. Antes caían en «❓ Sin fábrica asignada». */
  chk('⚠️ …y va al bloque de ROHO en Industrias Moreno, por su NOMBRE (ya no a «sin asignar»)', r.F && r.F.bloque==='roho' && r.F.por==='marca', r.F && JSON.stringify([r.F.bloque, r.F.por]));
  chk('lo discontinuado (CARIOCA PREMIER), lo de tienda (PROTECTOR) y la ATC no aparecen en ningún bloque', !r.claves.some(function(k){ return /CARIOCA|PROTECTOR/.test(k); }), r.claves.join(' | '));
  chk('la quincena nunca pide menos que la semana', [r.H,r.S,r.M,r.F].every(function(f){ return f && f.quin>=f.sem; }));
  /* XYZ PLUS: 4 en 4 entregas en 15 días (rota). Antes: 0,27/día × 8 = 2,1 → 3; × 20 = 5,3 → 6; mes 0,13 × 31 → 5 − lo que quedaba → 2 (1+1).
     🎯 (§4ls) Ahora: 4 en 26 días hábiles (μ 0,15), objetivo 2, punto de pedido 0; con 0 en el depósito se pide hasta el objetivo → 2; 15
     días: 2 + la venta de 12 días hábiles (1,8) → 4; octubre: 0,15 × 27 = 4,2, y el 1/10 queda menos de 1 bajo el objetivo → 5 (4 + 1)
     (§4ls, corrector, a conciencia: redondeado UNA vez, antes 6). */
  chk('XYZ PLUS (nombre suelto, medida «130X190CM»): 2 · 4 · 5 (4+1), en «sin fábrica asignada», y la medida queda 130x190',
      r.X && r.X.sem===EX.sem && r.X.quin===EX.quin && r.X.mes===EX.mes && r.X.mes1===EX.mes1 && r.X.mes2===EX.mes2 && EX.sem===2 && EX.quin===4 && EX.mes===5 && EX.mes1===4 && r.X.bloque==='otros' && r.X.md==='130x190',
      r.X && JSON.stringify([r.X.sem,r.X.quin,r.X.mes,r.X.mes1,r.X.mes2,r.X.bloque,r.X.md,'regla',EX]));
  chk('totales por bloque: Heaven 3 · 11 · 22 (17+5); Sueña 0 · 0 · 25 (19+6, no rota); sin asignar 6 · 8 · 5 (4+1) = MORFEO 4 · 4 · 0 + XYZ',
      r.tot.heaven.sem===EH.sem && r.tot.heaven.quin===EH.quin && r.tot.heaven.mes===EH.mes && r.tot.heaven.mes1===EH.mes1 && r.tot.heaven.mes2===EH.mes2 &&
      r.tot.suena.mes===25 && r.tot.suena.mes1===19 && r.tot.suena.mes2===6 && r.tot.suena.sem===0 &&
      r.tot.otros.sem===4+EX.sem && r.tot.otros.quin===4+EX.quin && r.tot.otros.mes===EX.mes && r.tot.otros.mes1===EX.mes1 && r.tot.otros.mes2===EX.mes2, JSON.stringify(r.tot));
  chk('⚠️ …y el PILLOW FLEX ya no está en «sin asignar»: hace bloque aparte con sus 6 de octubre (3+3)', r.tot.roho && r.tot.roho.n===1 && r.tot.roho.sem===0 && r.tot.roho.quin===0 && r.tot.roho.mes===EF.mes && r.tot.roho.mes1===EF.mes1 && r.tot.roho.mes2===EF.mes2 && EF.mes1===3, JSON.stringify(r.tot.roho));
  chk('el pie de «sin asignar» reparte por medida: 130x190 y 140x190', r.tot.otros.medidas.length===2 && r.tot.otros.medidas.indexOf('130x190')>=0 && r.tot.otros.medidas.indexOf('140x190')>=0, JSON.stringify(r.tot.otros.medidas));
  chk('el ORO BI RELAX rota pero tiene 60: queda como cubierto y no suma nada a Heaven', r.cubiertos===1 && r.tot.heaven.n===1 && r.claves.some(function(k){ return /ORO BI RELAX/.test(k); }), r.cubiertos+' cubiertos');
  chk('el total por medida del bloque Heaven es 160x190', r.tot.heaven.medidas.length===1 && r.tot.heaven.medidas[0]==='160x190', JSON.stringify(r.tot.heaven.medidas));

  /* ---------- 4. Un pedido anterior a una fábrica manda el producto a ese bloque ---------- */
  r = await page.evaluate(() => {
    STOCK.p=[{ id:'fp1', k:window._K.F, u:5, fab:'MULTI', f:window._atras(10), esp:'', r:window._atras(7) },
             { id:'fp2', k:window._K.M, u:5, fab:'MULTI', f:window._atras(10), esp:'', r:window._atras(7) }];
    var d=stockData(), R=stockProducir(d), out={};
    R.bloques.forEach(function(B){ B.filas.forEach(function(f){
      var q=(f.o.k===window._K.F)?'F':((f.o.k===window._K.M)?'M':'');
      if(q) out[q]={bloque:B.k, por:f.bloque.por, fab:f.bloque.fab, mes:f.mes};
    }); });
    STOCK.p=[];
    return out;
  });
  chk('⚠️ el NOMBRE manda: al PILLOW FLEX un pedido viejo a MULTI no lo saca de Industrias Moreno', r && r.F && r.F.bloque==='roho' && r.F.por==='marca', JSON.stringify(r && r.F));
  chk('…pero el que NO dice su marca (MORFEO) sí cae donde se le pidió la última vez', r && r.M && r.M.bloque==='suena' && r.M.por==='fabrica' && r.M.fab==='MULTI', JSON.stringify(r && r.M));

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
  chk('la pantalla de stock muestra el cuadro «🏭 Qué producir» con los cuatro bloques', r && r.bloques===4 && /Industrias Moreno · Heaven/.test(r.t) && /Industrias Moreno · ROHO \(FLEX \/ PEDIC\)/.test(r.t) && /Multiespumas · Sueña/.test(r.t) && /Sin fábrica asignada/.test(r.t), r && r.t.slice(0,240));
  chk('el título nombra la semana, los 15 días y octubre', r && /esta semana, los próximos 15 días y octubre/.test(r.t));
  // Desde §4du el resumen del bloque trae el RANGO del mes: «octubre: 18 (rango 6–19)» (§4hd: sin la medida especial CH1389).
  /* 🎯 (18/10, §4ls) Lo que rota ya no tiene rango (mín–máx según qué historia se mire): su mes sale de la venta de la regla. */
  chk('el bloque Heaven resume 7 días: 3 · 15 días: 11 · octubre: 22 · 1ª quincena 17 · 2ª 5 (sin rango: el TITANIO rota)', r && /7 días: 3 · 15 días: 11 · octubre: 22 · 1ª quincena 17 · 2ª 5/.test(r.t) && !/octubre: 22 \(rango/.test(r.t), r && (r.t.match(/7 días: \d[^·]*·[^·]*·[^·]*·[^·]*·[^·]*/)||[r.t.slice(0,300)])[0]);
  /* (16/10, §4lr U17) Las columnas dicen lo que CUBRE cada número (antes «hasta el hoy+7 / hoy+15», que no era lo que cubría). */
  chk('las columnas dicen qué cubre cada horizonte (15 incluye 7, el mes va además) y qué queda el 01/10', r && /incluye lo de 7: no sumar/.test(r.t) && /además de 15 días/.test(r.t) && /queda el 01\/10/.test(r.t));
  chk('la fila del TITANIO ICE muestra ritmo, hay 5 (3 acá · 2 Moreno) y los cinco números', r && /TITANIO ICE/.test(r.filaH) && /3 acá · 2 Moreno/.test(r.filaH) && /15 d: 10 en 5 entregas/.test(r.filaH) && /30 d: 18 en 9 entregas/.test(r.filaH), r && r.filaH);
  chk('hay botones para copiar cada horizonte por fábrica (7 días, 15 días, octubre)', r && r.botones.some(function(b){ return /📋 7 días/.test(b); }) && r.botones.some(function(b){ return /📋 15 días/.test(b); }) && r.botones.some(function(b){ return /📋 octubre/.test(b); }), r && r.botones.join(' | '));
  /* ⚠️ Desde que el PILLOW FLEX se fue a su bloque, en este fixture ninguna medida junta
     dos modelos dentro del MISMO bloque, así que el plural no se ve acá. */
  chk('el pie del bloque trae el total y el reparto por medida, cerrado, diciendo cuántos modelos hay', r && /TOTAL/.test(r.t) && /▸ por medida · 160x190 · 1 modelo/.test(r.t) && /▸ por medida · 130x190 · 1 modelo/.test(r.t), r && r.t.slice(-700));
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
  chk('tocar «por medida · 160x190» de Heaven despliega el TITANIO ICE con sus cinco números (3 · 11 · 22 · 17 · 5) y lo que hay', !r5b.sinFila && r5b.sub.length===1 && /↳ TITANIO ICE cód CH1201 · hay 5/.test(r5b.sub[0][0]) && r5b.sub[0].slice(1).join(' ')==='3 11 22 17 5', JSON.stringify(r5b.sub));
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
  chk('el TOTAL dice de qué fábrica es y repite qué es cada número (7 d · 15 d · octubre · 1ª q · 2ª q)', rf && /TOTAL Industrias Moreno · Heaven/.test(rf.totTxt) && /3 7 d/.test(rf.totTxt) && /11 15 d/.test(rf.totTxt) && /22 octubre/.test(rf.totTxt) && /17 1ª q/.test(rf.totTxt) && /5 2ª q/.test(rf.totTxt), rf && rf.totTxt);
  chk('el bloque «sin fábrica asignada» pide que el dueño diga dónde se hacen', r && /Decí en cuál se hacen/.test(r.t) && /nombres fuera del catálogo/.test(r.t) && !/Flex y Pedic/.test(r.t));
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
  chk('el texto de «sin asignar» reparte por medida con la escritura unificada (130x190 2 · 140x190 4)', /MORFEO · 140x190: 4/.test(r.otros) && /XYZ PLUS · 130X190(CM)?: 2/.test(r.otros) && /Total: 6 unidades · por medida: 130x190 2 · 140x190 4/.test(r.otros), r.otros);
  chk('el texto de octubre lleva el producto con su código, la cantidad, el reparto por quincena y el objetivo', /PRODUCIR PARA OCTUBRE \(ADEMÁS DE LO DE 15 DÍAS\) — INDUSTRIAS MORENO · HEAVEN/.test(r.mes) && /TITANIO ICE · 160x190 \(cód CH1201\): 22 — 1ª quincena 17 · 2ª quincena 5/.test(r.mes) && /vende 18 en 26 días hábiles, tener 8/.test(r.mes), r.mes);
  chk('…y cierra con el total y el reparto por medida, sin plata', /Total: 22 unidades · por medida: 160x190 22/.test(r.mes) && !/Bs/.test(r.mes));
  /* 🎯 (§4ls) La explicación ya no es «cubre lo vendido sin entregar + la venta de fábrica + margen + reserva»: es la regla del objetivo. */
  chk('el de la semana dice 3 para el TITANIO ICE y explica la regla (punto de pedido, objetivo, Moreno primero)', /PRODUCIR PARA 7 DÍAS/.test(r.sem) && /TITANIO ICE · 160x190 \(cód CH1201\): 3 —/.test(r.sem) && /Total: 3 unidades ·/.test(r.sem) && /baja al punto de pedido/.test(r.sem) && /se pide hasta el objetivo/.test(r.sem) && /primero se trae de Moreno/.test(r.sem), r.sem);
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

  /* ---------- 8. FLEX / PEDIC de ROHO: Industrias Moreno (dueño, 21/09) ----------
     Antes caían en «❓ Sin fábrica asignada» porque faltaba que él dijera dónde se hacen.
     Van en su propio bloque y NO bajo el título «Heaven»: son la línea que vende ROHO. */
  r = await page.evaluate(() => {
    var d=function(n){ return stockBloqueDe({desc:n}).k; };
    return {
      flex:d('COLCHON MEMORY FLEX 140X190'), europedic:d('COLCHON EUROPEDIC 160X200'),
      semipedic:d('COLCHON SEMIPEDIC 100X190'), somier:d('SOMIER NEGRO 140X190'),
      titanio:d('COLCHON TITANIO ICE 160X190'), suena:d('COLCHON ORTOPEDICO SUEÑA 140X190'),
      raro:d('MESA DE LUZ RARA'),
      /* ⚠️ Heaven y ROHO comparten fábrica: el que no dice su marca y solo trae «se pidió a
         MORENO» tiene que caer en Heaven, la marca de la casa, no en ROHO. */
      sinMarcaMoreno:stockBloqueDe({desc:'ARTICULO SIN MARCA', fab:'MORENO'}).k,
      sinMarcaMulti:stockBloqueDe({desc:'ARTICULO SIN MARCA', fab:'MULTI'}).k,
      bloques:PRODUCIR_BLOQUES.map(function(b){ return b.k+':'+(b.fab||'-'); }).join(' ')
    };
  });
  chk('⚠️ FLEX, PEDIC, EUROPEDIC, SEMIPEDIC y SOMIER NEGRO van a Industrias Moreno, no a «sin asignar»',
      r.flex==='roho' && r.europedic==='roho' && r.semipedic==='roho' && r.somier==='roho', JSON.stringify(r));
  chk('…en su propio bloque, que apunta a la MISMA fábrica que Heaven (MORENO)',
      r.bloques==='heaven:MORENO roho:MORENO suena:MULTI otros:-', r.bloques);
  chk('Heaven y Sueña siguen donde estaban, y lo que no se sabe sigue sin asignar',
      r.titanio==='heaven' && r.suena==='suena' && r.raro==='otros', JSON.stringify([r.titanio,r.suena,r.raro]));
  chk('⚠️ el que no dice su marca y se pidió a MORENO cae en Heaven, no en ROHO',
      r.sinMarcaMoreno==='heaven' && r.sinMarcaMulti==='suena', JSON.stringify([r.sinMarcaMoreno,r.sinMarcaMulti]));

  chk('sin errores en la página al final', errors.length===0, errors.join(' | '));

  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
