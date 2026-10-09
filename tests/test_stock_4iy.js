/* 📦 STOCK CON LAS RESPUESTAS DEL DUEÑO A LAS 8 PREGUNTAS (§4iy, 09/10). Casos inventados (el repo es público).

   1. (6 «sí») El tiempo de fábrica nunca es menor que las 48 h de verdad + el día de recoger: un viernes a las 18:00 la
      fábrica arranca el sábado, sale el martes y se entrega el miércoles → 5 días, no 3. Una medición de 1 día no cuenta.
   2. (4 «no») Para el mes que viene no se fabrica lo que no se vendió en 30 días, ni el mes pasado, ni en este, aunque el
      año pasado sí se vendió.
   3. (3) La venta de tienda («SALIÓ DE TIENDA») cuenta para la rotación pero NO baja PTF: sale del stock de la tienda.
   4. (8) «SOMIER 2P HEAVEN» es el SOMIER ORO.
   5. (7) «✓ Ya pedí»: tildar anota lo pedido, deja de pedirse hasta el día en que tendría que llegar y vuelve después;
      destildar lo saca; la poda lo tira a los 15 días si nunca llegó.
   6. (2 «sí») Lo apartado para un pedido lejano se sugiere soltar para uno más cercano que quedó sin stock. Solo sugiere.
   7. Sin errores de la página.

   Se corre:  node tests/test_stock_4iy.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

const PREP = `
  try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
  window.__k=stockClave({codigo:'CH1129'});
  window.__ped=function(id,u,f,chk,extra){ return Object.assign({ id:id, oc:id.toUpperCase(), cliente:'CLIENTE '+id, vendedor:'Mirian Salazar', fecha:f,
    productos:[{codigo:'CH1129',desc:'TITANIO LATEX',medida:'140x190',cant:u,chk:chk||''}] }, extra||{}); };
  window.__seed=function(L, dep){ STOCK=stockVacio(); STOCK.c={f:todayStr(), u:{}}; STOCK.c.u[__k]=dep; STATE=L; STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){} };
  window.__fila=function(){ STOCK_MEMO={}; try{ stockOlvidarIndice(); }catch(e){} return stockData().lista.find(function(x){ return x.k===__k; }); };
`;

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1300, height:800 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message));
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));   // martes, antes de las 17
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  await page.evaluate(PREP);

  // 1. piso del tiempo de fábrica
  const r1 = await page.evaluate(()=>{
    var out={ martes:stockLeadPiso() };
    __seed([ __ped('a',1,diasAdelante(3)) ], 0);
    out.leadMartes=__fila().lead;
    // una muestra medida de 1 día (pedido y llegada al otro día) no entra: no se puede fabricar en 1 día
    var q={ id:'m1', k:__k, u:2, fab:'Industrias Moreno', f:diasAtras(6), r:diasAtras(5), esp:'' };
    STOCK.p=[q]; STOCK_MEMO={};
    var M=stockMuestrasFabrica(), n=0; Object.keys(M||{}).forEach(function(f){ var v=M[f]; n+=Array.isArray(v)?v.length:(v&&v.length)||0; });
    out.muestras1dia=n;
    return out;
  });
  chk('1a. un martes a las 10 el piso es 3 días (48 h + el día de recoger)', r1.martes===3, r1);
  chk('1b. …y un producto sin medición usa 3', r1.leadMartes===3, r1);
  chk('1c. una medición de 1 día no se toma como tiempo de fábrica', r1.muestras1dia===0, r1);
  await page.clock.setFixedTime(new Date('2026-10-09T18:00:00-04:00'));   // viernes, después de las 17
  const r1b = await page.evaluate(()=>{ __seed([ __ped('a',1,diasAdelante(3)) ], 0); return { piso:stockLeadPiso(), lead:__fila().lead }; });
  chk('1d. un viernes a las 18 el piso es 5 días (arranca el sábado, sale el martes, se entrega el miércoles)', r1b.piso===5, r1b);
  chk('1e. …y el producto pide con 5 días, no con 3', r1b.lead===5, r1b);
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));

  // 2. dormido para el mes que viene
  const r2 = await page.evaluate(()=>{
    var MS={ ini:'2026-11-01', dias:30 }, o={ k:'X|Y', porDiaMes:0 };
    var vh=window.ventasHistIndex; window.ventasHistIndex=function(){ return { 'X|Y':{ '2025-11':20, '2025-10':12 } }; };
    var dormido=stockRangoMes(o, MS, { 'X|Y':{} });
    var vivo=stockRangoMes(o, MS, { 'X|Y':{ '2026-09':3 } });
    window.ventasHistIndex=vh;
    return { dormido:dormido, vivo:vivo && vivo.est.map(function(e){ return e.n; }) };
  });
  chk('2a. sin ventas en 30 días ni el mes pasado ni este: el año pasado no cuenta', r2.dormido===null, r2);
  chk('2b. con ventas el mes pasado, el año pasado sigue contando', Array.isArray(r2.vivo) && r2.vivo.indexOf('nov 25')>=0 || (r2.vivo||[]).some(function(n){ return /25/.test(n); }), r2);

  // 3. venta de tienda
  const r3 = await page.evaluate(()=>{
    var tienda={ direccion:'SALIÓ DE TIENDA · Carmelo', zona:'TIENDA', entregado:true };
    __seed([ __ped('n',2,diasAtras(1),'ok',{entregado:true}) ], 10); STOCK.c.f=diasAtras(3);
    var normal=__fila();
    __seed([ __ped('t',2,diasAtras(1),'',tienda) ], 10); STOCK.c.f=diasAtras(3);
    var t=__fila();
    var v={ desde:diasAtras(3), hasta:todayStr(), incluyeHasta:false };
    return { depNormal:normal.deposito, depTienda:t.deposito, vendNormal:normal.vendidos, vendTienda:t.vendidos,
             ventana:stockSalioVentana(STATE[0], STATE[0].productos[0], v) };
  });
  chk('3a. la venta de tienda no baja PTF (10 sigue 10; una entrega normal deja 8)', r3.depNormal===8 && r3.depTienda===10, r3);
  chk('3b. …pero cuenta para lo vendido (rotación)', r3.vendTienda===r3.vendNormal && r3.vendTienda>0, r3);
  chk('3c. …y el control del Excel no la espera como salida de PTF', r3.ventana===false, r3);

  // 4. alias
  const r4 = await page.evaluate(()=>({
    oro: stockClave({desc:'SOMIER 2P HEAVEN', medida:'140x190'})===stockClave({desc:'SOMIER ORO', medida:'140x190'}),
    otro: stockClave({desc:'SOMIER 2P HEAVEN', medida:'140x190'})!==stockClave({desc:'SOMIER PLATA', medida:'140x190'})
  }));
  chk('4. «SOMIER 2P HEAVEN» = SOMIER ORO (y no otro somier)', r4.oro && r4.otro, r4);

  // 5. ✓ Ya pedí
  const r5 = await page.evaluate(()=>{
    window.guardarStock=function(){};   // sin servidor: solo la cuenta
    var L=[]; for(var i=1;i<=15;i++) L.push(__ped('h'+i,2,diasAtras(i)));
    __seed(L, 4);
    var o=__fila(), out={ antes:o.fabricar, aviso:o.aviso, chk:planYaHtml(o).indexOf('Ya pedí')>=0 };
    planYaPedi(__k, true);
    var q=(STOCK.p||[])[0]; out.anotado=q && q.ya===1 && q.u===out.antes && q.f===todayStr();
    o=__fila(); out.despues=o.fabricar; out.html=planYaHtml(o).indexOf('✓ Ya pedí')>=0 && planYaHtml(o).indexOf('checked')>=0;
    out.llega=stockEsperado(q, stockTiemposFabrica()); out.esp=q.esp;
    return out;
  });
  chk('5a. con algo para pedir aparece el tilde «Ya pedí N»', r5.antes>0 && r5.chk, r5);
  chk('5b. tildar anota el pedido a fábrica de hoy por esa cantidad', r5.anotado, r5);
  chk('5c. …y deja de pedirlo', r5.despues<r5.antes, r5);
  chk('5d. …y el tilde queda marcado con lo pedido', r5.html, r5);
  chk('5d2. el día de llegada queda fijo desde que se tildó', r5.esp===r5.llega && r5.esp>'2026-10-06', r5);
  await page.clock.setFixedTime(new Date(new Date(r5.llega+'T10:00:00-04:00').getTime()+86400000));   // el día después de cuando tenía que llegar
  const r5b = await page.evaluate(()=>{ var o=__fila(); return { fab:o.fabricar, enCamino:o.enCamino, sigue:(STOCK.p||[]).length }; });
  chk('5e. pasado el día en que tenía que llegar, sin Excel que lo muestre, se vuelve a pedir', r5b.fab>0 && !(r5b.enCamino>0), r5b);
  await page.clock.setFixedTime(new Date('2026-10-06T10:00:00-04:00'));
  const r5c = await page.evaluate(()=>{
    var out={};
    __seed(STATE, 4); STOCK.p=[];
    planYaPedi(__k, true); out.con=(STOCK.p||[]).length;
    planYaPedi(__k, false); out.sin=(STOCK.p||[]).length;
    var S={ p:[ { id:'v', k:__k, u:3, fab:'', f:diasAtras(20), esp:'', r:'', ya:1 }, { id:'n', k:__k, u:3, fab:'', f:diasAtras(20), esp:'', r:'' } ] };
    out.poda=(stockPodar(S, todayStr()).p||[]).map(function(q){ return q.id; });
    return out;
  });
  chk('5f. destildar el mismo día lo saca', r5c.con===1 && r5c.sin===0, r5c);
  chk('5g. un «Ya pedí» de hace 20 días que nunca llegó se poda (un pedido a fábrica normal no)', r5c.poda.join()==='n', r5c);

  // 6. soltar lo apartado para más adelante
  const r6 = await page.evaluate(()=>{
    __seed([ __ped('lejos',2,diasAdelante(20),'ok'), __ped('cerca',2,diasAdelante(2),'') ], 2);
    var A=stockAsignar(), s=(A.soltar||[])[0];
    var html=renderRevisionFija()||'';
    var marcas=STATE.map(function(p){ return p.productos[0].chk; }).join(',');
    return { n:(A.soltar||[]).length, para:s&&s.para.oc, de:s&&s.de.map(function(d){ return d.oc+'x'+d.u; }).join(), cubre:s&&s.cubre,
             html:html.indexOf('Para entregar antes')>=0 && html.indexOf('LEJOS')>=0, marcas:marcas };
  });
  chk('6a. el pedido cercano sin stock recibe la sugerencia de soltar el lejano', r6.n===1 && r6.para==='CERCA' && r6.de==='LEJOSx2' && r6.cubre===2, r6);
  chk('6b. la revisión automática lo muestra', r6.html, r6);
  chk('6c. no cambia ninguna marca (lo decide logística)', r6.marcas==='ok,', r6);

  chk('7. ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
