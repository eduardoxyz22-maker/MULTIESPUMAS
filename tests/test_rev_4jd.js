/* 🔎 REVISIÓN DEL 10/10 (§4jd): las respuestas del dueño y los arreglos de los 3 agentes + super + mega.
   Pedidos inventados, reloj clavado. Lo que se prueba:
     1. Corte 16:30 (dueño: «si entra luego de las 4:30 las 48 empiezan a correr al siguiente día»): diaArranque y el texto.
     2. Pedidos internos (ALBA, FABRICA, MULTIESPUMA, MORENO, ALZER, REPOSICION DE ALMACEN) fuera de Contabilidad, dentro del stock.
     3. Arriba: un día cerrado por administración no ofrece cupos (los anillos van al próximo camión que sale) y la copia vieja se dice.
     4. «🏭 esta semana» con el último día para pedir → «🚨 ya» (dias === lead).
     5. Detalles: WhatsApp con dos celulares, DEVOLVER y PANEL POCKET fuera, «Pedí 0 ya», margen de rotación baja, Mis pedidos «artículos».
   Se corre:  node tests/test_rev_4jd.js          Dientes:  PEDIDOS=/ruta/a/pedidos_097c56a.html node tests/test_rev_4jd.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{ width:1180, height:820 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));   // viernes
  await page.goto('file://'+PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  await page.evaluate(()=>{ try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){} CONNECTED=true; });
  const ev=async(fn,a)=>{ try{ return await page.evaluate(fn,a); }catch(e){ return { __error:String(e.message||e).slice(0,300) }; } };

  console.log('\n── 1. Corte 16:30 ──');
  const arr={};
  for (const [h,k] of [['16:29','a'],['16:30','b'],['17:00','c']]) {
    await page.clock.setFixedTime(new Date('2026-10-12T'+h+':00-04:00'));   // lunes
    arr[k]=await ev(()=>({ a:diaArranque(), t:saldoArrancaTxt({ arranca:diaArranque(), sale:saldoSaleDeFabrica(diaArranque()) }) }));
  }
  chk('lunes 16:29 → arranca hoy (12/10)', arr.a.a==='2026-10-12', arr.a);
  chk('lunes 16:30 → arranca el martes (13/10)', arr.b.a==='2026-10-13', arr.b);
  chk('…y dice «Ya pasaron las 16:30»', /Ya pasaron las 16:30/.test(arr.c.t), arr.c.t);
  await page.clock.setFixedTime(new Date('2026-10-09T10:00:00-04:00'));

  console.log('\n── 2. Pedidos internos ──');
  let r=await ev(()=>{
    var vs=['ALBA','FABRICA','MULTIESPUMA','MORENO','ALZER','REPOSICION DE ALMACEN','Maria Flores','ROHO','Eduardo Añez'];
    var fuera={}, stock={};
    vs.forEach(function(v){ var p={ id:'x'+v, oc:'10-900', vendedor:v, cliente:'C', fecha:'2026-10-13', productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1}] };
      fuera[v]=fueraDeConta(p); stock[v]=stockCuenta(p); });
    return { fuera:fuera, stock:stock };
  });
  chk('ALBA, FABRICA, MULTIESPUMA, MORENO, ALZER y REPOSICION DE ALMACEN quedan fuera de Contabilidad', ['ALBA','FABRICA','MULTIESPUMA','MORENO','ALZER','REPOSICION DE ALMACEN'].every(v=>r.fuera[v]===true), r.fuera);
  chk('…una vendedora sigue adentro', r.fuera['Maria Flores']===false, r.fuera);
  chk('…y en el stock cuentan todos igual («sí en el stock»)', Object.keys(r.stock).every(v=>r.stock[v]===true), r.stock);

  console.log('\n── 3. Arriba: día cerrado y copia vieja ──');
  r=await ev(()=>{
    var man=proximoDiaEntrega();   // sábado 10/10
    STATE=[{ id:'a1', oc:'10-001', vendedor:'Maria Flores', cliente:'C1', fecha:man, turno:'AM', productos:[{desc:'X',cant:1}] }];
    DIAS_CERRADOS=[man]; updateStats();
    var lbl=document.getElementById('stat-hoy-l').innerText, an=document.getElementById('h-anillos');
    var out={ man:man, sig:hdrProximoAbierto().d, lbl:lbl, aria:an.getAttribute('aria-label') };
    DIAS_CERRADOS=[]; updateStats(); out.lbl2=document.getElementById('stat-hoy-l').innerText;
    cargaEstado('error'); out.viejo=an.classList.contains('viejo'); cargaEstado('ok'); out.viejo2=an.classList.contains('viejo');
    var M=saludDatos(); out.salud=M.filter(function(m){ return /^Cupos/.test(m.t); })[0];
    return out;
  });
  chk('con el sábado cerrado, los cupos son los del lunes 12/10 y lo dice', r.sig==='2026-10-12' && /lunes/.test(r.lbl) && /cerrado por administración/.test(r.lbl), r);
  chk('…sin cerrar, vuelve a ser el sábado', /sábado|mañana/i.test(r.lbl2) && !/cerrado por/.test(r.lbl2), r.lbl2);
  chk('sin la planilla leída los anillos se marcan como copia, y con la lectura buena se apagan', r.viejo===true && r.viejo2===false, r);
  chk('la salud del día dice ocupados y libres', r.salud && /ocupados de \d+ · \d+ libres/.test(r.salud.txt), r.salud);

  console.log('\n── 4. El último día para pedir ──');
  r=await ev(()=>{
    var base={ k:'DREAM|180x190', desc:'DREAM', medida:'180x190', deposito:0, enSale:0, enOtros:0, enCamino:0, comp:1, vendidos:3, rota:true, descont:false, pedidos:[], margen:2, revisarStock:false, sobra:false, porDia:0.2 };
    var a=Object.assign({}, base, { dias:5, lead:5 }), b=Object.assign({}, base, { dias:6, lead:5 }), c=Object.assign({}, base, { dias:4, lead:5 });
    var f=function(o){ try{ return stockAvisoDe(o); }catch(e){ return 'ERR '+e.message; } };
    return { igual:f(a), uno:f(b), menos:f(c) };
  });
  chk('se corta el mismo día que llegaría lo pedido hoy (dias = lead) → «urgente»', r.igual==='urgente', r);
  chk('…con un día de holgura sigue «pedir» (esta semana); con menos, «urgente»', r.uno==='pedir' && r.menos==='urgente', r);

  console.log('\n── 5. Detalles ──');
  r=await ev(()=>({
    wa:misWaCliente('70012345 / 76543210'), wa2:misWaCliente('+591 7-655-4433'), wa3:misWaCliente('3 3445566'),
    dev:esTextoDeTienda ? !!esTextoDeTienda('DEVOLVER TITANIO LATEX 200X200') : null,
    panel:pryTipoProd({ desc:'PANEL POCKET', cant:50 }), colchon:pryTipoProd({ desc:'COLCHON SOFT', cant:1 }),
    margen:stockMargen({ vendidos:0, vendidosRotacion:0, sem:[0,0,0], rotacion:'baja' }),
    traer:(function(){ var o={ aviso:'traer', recoger:1, pedir:1, revisarStock:true }; return sfAccion(o); })()
  }));
  chk('WhatsApp con dos celulares en el campo: abre con el primero', r.wa==='https://wa.me/59170012345', r);
  chk('…uno con +591 y guiones también; un fijo no', r.wa2==='https://wa.me/59176554433' && r.wa3==='', r);
  chk('«DEVOLVER …» no es stock (no cuenta como venta ni salida)', r.dev===true, r);
  chk('«PANEL POCKET» no cuenta como colchón en la Proyección; un colchón sí', r.panel==='' && r.colchon==='colchon', r);
  chk('rotación baja sin ventas: margen 0 (antes 2)', r.margen===0, r);
  chk('«🚚 Traé 1 de Moreno · ⚠️ revisá el saldo» (nunca «Pedí 0 ya»)', /^🚚 Traé 1 de Moreno · ⚠️ revisá el saldo$/.test(r.traer), r.traer);
  r=await ev(()=>{ try{ var M=document.getElementById('mis-metrics')||document.body; return /artículos · se entregan este mes/.test(document.documentElement.innerHTML) || /artículos · se entregan este mes/.test(String(renderMis)); }catch(e){ return 'ERR '+e.message; } });
  chk('Mis pedidos dice «artículos» (todo lo que lleva), no «unidades» (que en Contabilidad son colchones y somieres)', r===true, r);

  chk('ningún error de JavaScript', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
