/* 🔎 EL INFORME DE CODEX/ASTRA SOBRE f1b5fe2 (25/10, §4ml): lo que todavía no estaba arreglado.

   LO QUE CUIDA (cada caso es el del informe, con datos ficticios):
   1. FIN-19 · «Quién vendió qué» no cuenta un pedido INTERNO (FABRICA, 999) como venta: TITANIO de octubre = 200,30 (A + B + C), no
      1.199,30; lo dice abajo; y si se elige a propósito el vendedor FABRICA, se muestra.
   2. FIN-06 · Flete pactado 1,01 cobrado 0,50 + 0,50: queda 0,01 por cobrar (antes se perdía el centavo y el pactado bajaba a 1,00).
   3. OPS-12/13/16 · Una ATC que arrastra un saldo de 3.000 de cuando era OC no suma «por cobrar» en Entregas, Envío, la Hoja de ruta, la
      tarjeta del chofer ni el Reporte (su ficha ya decía «No se cobra»).
   4. OPS-03 · La barra de pasos no da «Productos» por listo con cantidad 0 (Guardar la rechaza).
   5. FIN-09 · Una deuda sin fecha o con fecha futura no es «de hoy» ni del tramo «0 a 15 días».
   6. PRY · «De dónde sale lo vendido» con centavos (Sueña 0,30 salía «Bs 0»).
   7. OPS-22 · La mediana del precio con un número par de ventas: 100, 200, 300, 400 → 250 (antes 300).
   8. STK-12/E08 · Dos copias de un pedido con distinta llegada anotada (prodU 3 / 7) NO son «el mismo contenido»: el conflicto ya no se
      toma por un ok tardío (la raíz era la de FLW-1).

   Reloj CLAVADO (domingo 25/10/2026, 12:00 de Bolivia). Solo datos sintéticos.
   Se corre:  node tests/test_codex_f1b5.js   (PEDIDOS=… para correrla contra otra versión) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    apiSave=function(x){ return Promise.resolve({ ok:true, pedido:x }); };
    var hoy=todayStr(), n=0, out={};
    var P=function(o){ n++; return Object.assign({ id:'p'+n, oc:'10-'+(100+n), nota:String(5000+n), cliente:'CLIENTE '+n, celular:'7000000'+n, fecha:'2026-10-25', turno:'AM',
      zona:'Norte', direccion:'CALLE '+n, vendedor:'Maria Flores', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:100 }],
      saldo:0, acuenta:0, pagado:true, metodoPago:'', ts:new Date('2026-10-20T10:00:00-04:00').getTime(), rev:1 }, o); };

    // 1 · Quién vendió qué
    STATE=[ P({ id:'A', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:99.99 }] }),
            P({ id:'B', vendedor:'Mauricio Merida', productos:[{ desc:'TITANIO LATEX', medida:'140x190', cant:1, precio:0.30 }] }),
            P({ id:'C', vendedor:'Isabel Robledo', productos:[{ desc:'TITANIO ICE', medida:'160x190', cant:1, precio:100.01 }] }),
            P({ id:'INT', vendedor:'FABRICA', cliente:'MORENO', productos:[{ desc:'TITANIO ICE', medida:'160x190', cant:1, precio:999 }] }) ];
    var put=function(id, v){ var e=document.getElementById(id); if(e) e.value=v; };
    put('bus-prod','titanio'); put('bus-vend',''); put('bus-desde','2026-10-01'); put('bus-hasta','2026-10-31');
    var d=buscarData();
    out.bus={ plata:d.plata, ids:d.filas.map(function(f){ return f.p.id; }).sort(), fuera:busFueraTxt(d).replace(/<[^>]+>/g,'') };
    var sel=document.getElementById('bus-vend'); if(sel && !Array.prototype.some.call(sel.options||[], function(o){ return o.value==='FABRICA'; })){ var op=document.createElement('option'); op.value='FABRICA'; op.textContent='FABRICA'; sel.appendChild(op); }
    put('bus-vend','FABRICA'); var dF=buscarData(); out.busF={ plata:dF.plata, ids:dF.filas.map(function(f){ return f.p.id; }) };
    put('bus-vend','');

    // 2 · el flete de 1,01 cobrado en dos veces
    STATE=[ P({ id:'F', saldo:0, pagado:true, metodoPago:textoCobros([{ metodo:'Efectivo', monto:100, fecha:hoy, nota:'11', comps:['x'] }, { envio:true, metodo:'', monto:1.01, fecha:'', nota:'', comps:[] }]) }) ];
    out.fleteAntes={ total:envioTotal(findById('F')), porCobrar:envioPorCobrar(findById('F')) };
    showView('conta'); await new Promise(function(res){ setTimeout(res, 150); });
    for(var k=0;k<2;k++){
      showContaModal('F'); ctaSetTipo('F','envio');
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL'+k];
      document.getElementById('cta-pago-monto').value='0,50';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value=String(700+k);
      ctaRegistrarPago('F');
      await new Promise(function(res){ setTimeout(res, 30); });
    }
    try{ closeModal(); }catch(e){}
    var pf=findById('F'); out.flete={ total:envioTotal(pf), cobrado:envioCobrado(pf), porCobrar:envioPorCobrar(pf) };

    // 3 · la ATC con saldo de cuando era OC
    STATE=[ P({ id:'ATC1', oc:'ATC 10-001', cliente:'ATC CON SALDO', saldo:3000, pagado:false, fecha:hoy, vehiculo:'Foton', chofer:'Luis' }),
            P({ id:'OC1', cliente:'VENTA QUE DEBE', saldo:500, pagado:false, fecha:hoy, vehiculo:'Foton', chofer:'Luis' }) ];
    var E=entregasDatos(hoy), V=envioDatos('hoy');
    out.atc={ entregas:E.tot.porCobrarTotal, envio:V.tot.porCobrar };
    try{ abrirReporte(); }catch(e){}
    out.atc.reporte=((document.getElementById('rep-body')||document.getElementById('reporte-overlay')||{}).innerText||'').indexOf('3.500')<0;
    try{ closeReporte(); }catch(e){}
    var rutaTxt=''; try{ abrirRuta(); try{ setRutaDia('hoy'); }catch(e){} rutaTxt=((document.getElementById('ruta-body')||document.body).innerText||''); closeRuta(); }catch(e){ rutaTxt='ERR '+e.message; }
    out.atc.ruta = /A cobrar: Bs 500,00/.test(rutaTxt) && !/A cobrar: Bs 3\.500/.test(rutaTxt);
    out.atc.rutaTxt = (rutaTxt.match(/A cobrar:[^\n]*/)||[''])[0];

    // 4 · la barra de pasos con cantidad 0
    showView('form'); await new Promise(function(res){ setTimeout(res, 200); });
    var card=document.querySelector('#f-productos .prod-card'); card.querySelector('.prod-desc').value='COLCHON TITANIO ICE';
    card.querySelector('.prod-cant').value='0';
    out.pasos0=fxPasosEstado()[1];
    card.querySelector('.prod-cant').value='1';
    out.pasos1=fxPasosEstado()[1];

    // 5 · deuda sin fecha y con fecha futura
    STATE=[ P({ id:'D1', cliente:'SIN FECHA', saldo:110, pagado:false, fecha:'', ts:0 }), P({ id:'D2', cliente:'FUTURA', saldo:200, pagado:false, fecha:'2026-10-26', ts:new Date('2026-10-26T09:00:00-04:00').getTime() }),
            P({ id:'D3', cliente:'VIEJA', saldo:300, pagado:false, fecha:'2026-09-01', ts:new Date('2026-09-01T09:00:00-04:00').getTime() }) ];
    var _cm=document.getElementById('cta-mode'); try{ segSet('cta-mode','todo'); }catch(e){}
    var pend=cuadrePendientes ? cuadrePendientes(true) : [];
    var x1=pend.filter(function(x){ return x.p.id==='D1'; })[0]||{}, x2=pend.filter(function(x){ return x.p.id==='D2'; })[0]||{};
    out.deuda={ sinF:!!x1.sinF, fut:!!x2.fut, t1:typeof deudaEdadTxt==='function' ? deudaEdadTxt(x1) : '', t2:typeof deudaEdadTxt==='function' ? deudaEdadTxt(x2) : '',
                tramos:(tramosDeudaHtml(pend)||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ') };

    // 6 · «De dónde sale lo vendido» con centavos
    STATE=[ P({ id:'S1', vendedor:'Mauricio Merida', saldo:0, pagado:true, productos:[{ desc:'X', cant:1, precio:0.30 }], metodoPago:textoCobros([{ metodo:'Efectivo', monto:0.30, fecha:'2026-10-24', nota:'1', comps:['a'] }]) }) ];
    out.plata=(pryPlataHtml('2026-10')||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

    // 7 · la mediana con número par
    STATE=[100,200,300,400].map(function(v,i){ return P({ id:'M'+i, productos:[{ desc:'X', codigo:'ZZ9', cant:1, precio:v }] }); });
    precIdxReset(); out.med4=precioTipico('ZZ9');
    STATE=STATE.slice(0,3); precIdxReset(); out.med3=precioTipico('ZZ9');

    // 8 · dos copias con distinta llegada anotada
    var base={ id:'Q', oc:'10-900', cliente:'X', fecha:'2026-10-25', productos:[{ desc:'TITANIO', medida:'160x190', codigo:'CH1201', cant:10, chk:'fab', prodF:'2026-10-20', prodU:3, prodC:['c1'] }] };
    var otra=JSON.parse(JSON.stringify(base)); otra.productos[0].prodU=7; otra.productos[0].prodC=['c2'];
    out.mismo={ igual:mismoContenido(base, JSON.parse(JSON.stringify(base))), distinto:mismoContenido(base, otra) };
    return out;
  });
  chk('1a. «Quién vendió qué» TITANIO octubre = 200,30 de A, B y C (antes 1.199,30 con el interno de FABRICA)', Math.abs(r.bus.plata-200.30)<0.001 && r.bus.ids.join(',')==='A,B,C', r.bus);
  chk('1b. …y abajo dice que el pedido interno quedó afuera', /pedidos internos/.test(r.bus.fuera), r.bus.fuera);
  chk('1c. eligiendo a propósito el vendedor FABRICA, se ve el suyo', r.busF.ids.join(',')==='INT' && Math.abs(r.busF.plata-999)<0.001, r.busF);
  chk('2. flete 1,01 cobrado 0,50 + 0,50: el acuerdo sigue en 1,01 y queda 0,01 por cobrar (antes 1,00 y 0)',
      Math.abs(r.fleteAntes.porCobrar-1.01)<0.001 && Math.abs(r.flete.total-1.01)<0.001 && Math.abs(r.flete.cobrado-1)<0.001 && Math.abs(r.flete.porCobrar-0.01)<0.001, [r.fleteAntes, r.flete]);
  chk('3a. la ATC con saldo 3.000 no suma en Entregas ni en Envío: solo los 500 de la venta', r.atc.entregas===500 && Math.abs(r.atc.envio-500)<0.001, r.atc);
  chk('3b. …ni en la Hoja de ruta («A cobrar: Bs 500,00»)', r.atc.ruta, r.atc.rutaTxt);
  chk('4. la barra de pasos no da «Productos» por listo con cantidad 0, y sí con 1', r.pasos0===false && r.pasos1===true, [r.pasos0, r.pasos1]);
  chk('5a. una deuda sin fecha dice «sin fecha» y una agendada para mañana «fecha futura» (antes, las dos «hoy»)', r.deuda.sinF && r.deuda.fut && r.deuda.t1==='sin fecha' && r.deuda.t2==='fecha futura', r.deuda);
  chk('5b. …y van en su propio tramo, no en «0 a 15 días»', /SIN FECHA Bs 110,00/i.test(r.deuda.tramos) && /FECHA FUTURA Bs 200,00/i.test(r.deuda.tramos) && !/0 A 15 DÍAS/i.test(r.deuda.tramos), r.deuda.tramos);
  chk('6. «De dónde sale lo vendido» con centavos: Bs 0,30 (antes «Bs 0»)', /Bs 0,30/.test(r.plata), r.plata);
  chk('7. la mediana del precio: 100-200-300-400 → 250 (antes 300); 100-200-300 → 200', r.med4===250 && r.med3===200, [r.med4, r.med3]);
  chk('8. dos copias con distinta llegada anotada no son «el mismo contenido» (el conflicto se muestra)', r.mismo.igual===true && r.mismo.distinto===false, r.mismo);
  chk('sin errores en la página', !errores.length, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
