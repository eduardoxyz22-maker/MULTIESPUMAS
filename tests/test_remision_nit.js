/* 🧾 UNA VENTA CON NIT ES CON FACTURA (27/11/2026, dueño: «no deberían anotar en remisión si es una venta facturada, por algo en el pedido tiene
   datos de la factura. Debemos añadir esa prueba más»).
   1. En Contabilidad, una venta con NIT no se puede anotar como nota de remisión (las dos maneras: la fila de la ficha y la cajita al marcar cargada).
   2. Con factura sí; y una venta SIN NIT sí puede ir con remisión.
   3. En la lista de un retiro, una venta con NIT anotada con remisión (de antes) sale ⛔.
   Datos SINTÉTICOS. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_remision_nit.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,400)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
const P=(id, cli, m, f, nit, doc)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:'Carola Chavez', cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'6'+id.replace(/\D/g,'').padStart(2,'0'), fecha:'2026-11-20', nit:nit||'', facturarA:nit?cli:'', entregado:true,
  productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:m, fdoc:doc||'', fdocn:doc?'77':'' }],
  saldo:0, acuenta:0, pagado:true, ts:TSB(f), metodoPago:'Efectivo '+m+' @'+f+' #80'+id.replace(/\D/g,'') });
const L=[ P('n1','CON NIT SRL',2000,'2026-11-19','1234567'), P('s1','SIN NIT',900,'2026-11-19',''), P('v1','VIEJA CON NIT',700,'2026-11-19','7654321','R') ];
(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage(); const errores=[]; page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(async (L) => {
    CONNECTED=true; UNLOCKED=true; window.RETIRO_TICK_PRUEBA=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._g=[]; apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(L)) }); };
    apiSave=function(x){ window._g.push(JSON.parse(JSON.stringify(x))); return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    window._doc=function(id, t, n){ var e=document.getElementById('cta-doc-num'); if(!e){ e=document.createElement('input'); e.id='cta-doc-num'; document.body.appendChild(e); }
      e.value=n; CTA_DOC={ id:id, t:t, n:n }; window._g=[]; ctaDocGuardar(id); var p=findById(id); return { d:docVentaDe(p), n:docNumDe(p), g:_g.length }; };
  }, L);
  let r = await ev(() => _doc('n1','R','1500'));
  chk('1. venta con NIT: «remisión» NO se guarda', r.d==='' && r.g===0, r);
  r = await ev(() => { var m=document.getElementById('toast'); return m ? m.textContent : ''; });
  chk('1b. y dice por qué (tiene NIT, va con factura)', /tiene NIT 1234567/.test(r) && /va con FACTURA/.test(r), r);
  r = await ev(() => { CTA_REG_DOC={ id:'n1', t:'R', n:'1501' }; var e=document.getElementById('cta-regdoc-num'); if(!e){ e=document.createElement('input'); e.id='cta-regdoc-num'; document.body.appendChild(e); } e.value='1501';
    window._g=[]; ctaRegDocGuardar('n1', false); var p=findById('n1'); return { d:docVentaDe(p), g:_g.length }; });
  chk('1c. tampoco desde la cajita de «Pago registrado en sistema»', r.d==='' && r.g===0, r);
  r = await ev(() => _doc('n1','F','9'));
  chk('2. con factura se guarda', r.d==='F' && r.n==='9' && r.g>=1, r);
  r = await ev(() => _doc('s1','R','1764'));
  chk('2b. una venta SIN NIT puede ir con remisión', r.d==='R' && r.n==='1764' && r.g>=1, r);
  r = await ev(() => { showView('conta'); abrirRetiros(); var s=document.getElementById('ret-entrega'); s.value='Carola Chavez'; retEntregaCambio(); document.getElementById('ret-monto').value='3600'; retCobrosPintar();
    var w=[].filter.call(document.querySelectorAll('#ret-cobros .ret-cob'), function(l){ return /VIEJA CON NIT/.test(l.textContent); })[0]; return w ? w.textContent.replace(/\s+/g,' ') : ''; });
  chk('3. en el retiro, la venta con NIT anotada con remisión sale ⛔', /Anotada con remisión pero tiene NIT 7654321/.test(r), r);
  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); await browser.close(); process.exitCode = FAIL ? 1 : 0;
})();
