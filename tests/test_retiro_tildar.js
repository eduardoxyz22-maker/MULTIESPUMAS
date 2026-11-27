/* 🧷 AL TILDAR LOS COBROS DE UN RETIRO (27/11/2026, dueño: «¿cómo podemos evitar que pasen estos errores al tildar?»).
   Pasó el 21/11: dos recibos de un vendedor, la venta de Bs 2.730 CON FACTURA tildada en el recibo No facturado (que era de Bs 2.270) y
   la de Bs 800 CON REMISIÓN en el Facturado. El panel partió la venta de 2.730: 800 en un recibo y 1.930 en el otro.

   Lo que esta prueba cuida:
   1. Lo tildado suma MÁS que el retiro (una venta quedaría partida): NO se guarda (sin la contraseña). Con la contraseña, pregunta.
   2. Una venta con remisión tildada en un recibo Facturado (o con factura en uno No facturado): el renglón lo marca ⛔ y al guardar pregunta.
   3. Una venta que ya está en parte en otro recibo lo dice en su renglón, con el N° de ese recibo y lo que queda.
   4. Con «Las dos» (dos recibos): si lo tildado de un lado suma más que ese recibo, no se guarda.
   5. Lo correcto (justo y del tipo que va) se guarda como siempre.
   Datos SINTÉTICOS. Reloj clavado el sábado 21/11/2026 a las 12:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_retiro_tildar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const TSB=(dia, hora)=>new Date(dia+'T'+(hora||'11:00')+':00-04:00').getTime();
const P=(id, cli, m, f, doc, h)=>({ id:id, oc:'11-'+id.replace(/\D/g,'').padStart(3,'0'), vendedor:'Carola Chavez', cliente:cli, celular:'70001001', zona:'Norte', turno:'AM',
  nota:'5'+id.replace(/\D/g,'').padStart(2,'0'), fecha:'2026-12-20', productos:[{ desc:'COLCHON TITANIO ICE', medida:'160x190', codigo:'CH1201', cant:1, precio:m, fdoc:doc||'', fdocn:doc?'55':'' }],
  saldo:0, acuenta:0, pagado:true, ts:TSB(f, h), metodoPago:'Efectivo '+m+' @'+f+' #70'+id.replace(/\D/g,'') });
const L=[ P('x1','CLIENTE REMISION A',1470,'2026-11-18','R'), P('w1','WILMA PRUEBA',2730,'2026-11-19','F','12:48'),
          P('z1','ZAIR PRUEBA',800,'2026-11-19','R','16:50'), P('w2','WILLIAMS PRUEBA',990,'2026-11-19','F','17:00') ];

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1280, height:900 }, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  const errores=[]; page.on('pageerror', e => errores.push(e.message));
  let dialogos=[], aceptar=false;
  page.on('dialog', d => { dialogos.push(d.type()+': '+d.message()); aceptar ? d.accept() : d.dismiss(); });
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-21T12:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(async (L) => {
    var c0=document.getElementById('conn-form'); if(c0) c0.style.display='none';
    CONNECTED=true; UNLOCKED=false; window.RETIRO_TICK_PRUEBA=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; ULTIMO_ERROR=''; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window._L=JSON.parse(JSON.stringify(L)); window._g=[];
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._L)) }); };
    apiSave=function(x){ window._g.push(JSON.parse(JSON.stringify(x))); return Promise.resolve({ ok:true, pedido:x }); };
    await refrescarEstado(); await new Promise(function(r){ setTimeout(r, 150); });
    showView('conta'); await new Promise(function(r){ setTimeout(r, 150); });
    window._fijar=function(monto){ var s=document.getElementById('ret-entrega'); s.value='Carola Chavez'; retEntregaCambio(); var m=document.getElementById('ret-monto'); m.value=String(monto); retCobrosPintar(); };
    window._tildar=function(ids){ [].forEach.call(document.querySelectorAll('#ret-cobros input[data-k]'), function(i){ i.checked=ids.some(function(id){ return i.getAttribute('data-k').indexOf(id+'|')===0; }); }); retTickToggle(); };
    window._nota=function(n){ document.getElementById('ret-nota-nueva').value=n; retAgregarNota(); };
    window._guardados=function(){ return _g.filter(function(x){ return /^__ret_/.test(x.id); }).length; };
  }, L);

  console.log('\n── 1. Lo tildado suma más que el retiro: no se guarda ──');
  let r = await ev(() => { abrirRetiros(); _fijar(2270); _tildar(['x1','w1']); retSetTipo('No facturado'); _nota('440'); window._g=[]; var ok=guardarRetiroForm(); return { ok:ok, g:_guardados(), suma:retCobrosDatos(RET_FORM).suma }; });
  chk('1. el caso del 21/11 (1.470 + 2.730 en un recibo de 2.270): no se guarda', r.ok===false && r.g===0 && r.suma===4200, r);
  chk('1b. y avisa por qué (sobran, una venta quedaría partida)', dialogos.some(d => /sobran Bs 1\.930,00/.test(d)), dialogos.slice(-1));

  console.log('\n── 2. Venta del otro tipo en el recibo: ⛔ en el renglón y pregunta al guardar ──');
  dialogos=[];
  r = await ev(() => { abrirRetiros(); _fijar(1790); _tildar(['z1','w2']); retSetTipo('Facturado'); _nota('441');
    var mal=[].map.call(document.querySelectorAll('#ret-cobros .ret-cob-mal'), function(l){ return l.querySelector('b').textContent; });
    var txt=(document.querySelector('#ret-cobros .ret-cob-cruz')||{}).textContent||'';
    window._g=[]; var ok=guardarRetiroForm(); return { mal:mal, txt:txt, ok:ok, g:_guardados() }; });
  chk('2. el renglón de la venta con remisión dice ⛔ en un recibo Facturado', JSON.stringify(r.mal)===JSON.stringify(['ZAIR PRUEBA']) && /va en el recibo No facturado/.test(r.txt), r);
  chk('2b. al guardar pregunta y con «Volver» no guarda', r.ok===false && r.g===0 && dialogos.some(d => /ZAIR PRUEBA/.test(d)), { r, d:dialogos.slice(-1) });
  aceptar=true; dialogos=[];
  r = await ev(async () => { window._g=[]; var ok=guardarRetiroForm(); await new Promise(function(x){ setTimeout(x, 150); }); return { ok:ok, g:_guardados() }; });
  chk('2c. con «Guardar igual» se guarda (caso raro: lo decide quien carga)', r.ok===true && r.g===1, r);
  aceptar=false;

  console.log('\n── 3. Lo correcto se guarda sin preguntar ──');
  await ev(async (L) => { window._L=JSON.parse(JSON.stringify(L)); window._g=[]; RETIROS=[]; await refrescarEstado(); }, L);
  dialogos=[];
  r = await ev(async () => { abrirRetiros(); _fijar(2270); _tildar(['x1','z1']); retSetTipo('No facturado'); _nota('440'); window._g=[];
    var mal=document.querySelectorAll('#ret-cobros .ret-cob-mal').length; var ok=guardarRetiroForm(); await new Promise(function(x){ setTimeout(x, 150); }); return { ok:ok, g:_guardados(), mal:mal }; });
  chk('3. No facturado 2.270 = 1.470 + 800 (las dos con remisión): se guarda sin preguntar', r.ok===true && r.g===1 && r.mal===0 && dialogos.length===0, { r, d:dialogos });

  console.log('\n── 4. Una venta ya en parte en otro recibo lo dice ──');
  aceptar=true;
  r = await ev(async () => {
    UNLOCKED=true;   // con la contraseña se puede partir una venta a propósito
    abrirRetiros(); _fijar(800); _tildar(['w1']); retSetTipo('Facturado'); _nota('450'); window._g=[]; var ok=guardarRetiroForm();
    await new Promise(function(x){ setTimeout(x, 200); }); UNLOCKED=false;
    abrirRetiros(); _fijar(1930);
    var w=[].filter.call(document.querySelectorAll('#ret-cobros .ret-cob'), function(l){ return /WILMA/.test(l.textContent); })[0];
    return { ok:ok, txt:w ? w.textContent.replace(/\s+/g,' ') : '' };
  });
  chk('4. con la contraseña se puede partir una venta (pregunta y se acepta)', r.ok===true, r.ok);
  chk('4b. la venta partida dice cuánto ya está en el recibo 450 y cuánto queda', /Bs 800,00 de esta venta \(de Bs 2\.730,00\) ya está en el recibo 450/.test(r.txt) && /queda Bs 1\.930,00/.test(r.txt), r.txt);
  aceptar=false;

  console.log('\n── 5. Con dos recibos, lo tildado de un lado no puede pasar ese recibo ──');
  await ev(async (L) => { window._L=JSON.parse(JSON.stringify(L)); window._g=[]; RETIROS=[]; await refrescarEstado(); }, L);
  dialogos=[];
  r = await ev(() => { abrirRetiros(); _fijar(5990); _tildar(['x1','w1','z1','w2']); retSetTipo('Ambos');
    _nota('460'); document.getElementById('ret-nota-nueva-r').value='461'; retAgregarNotaR();
    var mf=document.getElementById('ret-monto-f'); mf.value='3000'; retLeerForm(); window._g=[]; var ok=guardarRetiroForm(); return { ok:ok, g:_guardados() }; });
  chk('5. facturado tildado 3.720 en un recibo de 3.000: no se guarda', r.ok===false && r.g===0 && dialogos.some(d => /suma más/.test(d)), { r, d:dialogos.slice(-1) });
  r = await ev(async () => { var mf=document.getElementById('ret-monto-f'); mf.value='3720'; retLeerForm(); window._g=[]; var ok=guardarRetiroForm(); await new Promise(function(x){ setTimeout(x, 200); }); return { ok:ok, g:_guardados() }; });
  chk('5b. con lo facturado justo (3.720 + 2.270) se guardan los dos', r.ok===true && r.g===2, r);

  chk('sin errores de la página', errores.length===0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exitCode = FAIL ? 1 : 0;
})();
