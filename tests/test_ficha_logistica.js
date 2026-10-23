/* 🗂️ La ficha de Administración para logística (23/10, dueño eligió la «B»): ancha, arriba el N° del día, el cliente, cuándo ingresó y
   para cuándo; las observaciones en amarillo grande; tres columnas (dónde entregar / qué se carga y de dónde con el estado de stock /
   camión y entrega); la plata en «Más datos». Y al prender «Listo para cargar» con observaciones, pregunta «¿Las leíste?».
   Se corre:  node tests/test_ficha_logistica.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));
(async()=>{
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{ width:1366, height:900 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errs=[]; page.on('pageerror', e=>errs.push(e.message)); page.on('dialog', d=>d.accept());
  await page.clock.setFixedTime(new Date('2026-10-23T15:10:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' }); await page.waitForTimeout(400);
  await page.evaluate('('+PREPARAR+')()');
  await page.evaluate(async()=>{
    UNLOCKED=true;
    var a=_ped('f1','2026-10-24','AM',[_lin('CH1201|TITANIO ICE|160x190',2,{chk:'ok'})],{ vendedor:'Isabel Robledo', cliente:'CLIENTE CON NOTA', zona:'Norte',
      direccion:'Calle de prueba 123', observaciones:'LLAMAR 1 HORA ANTES. Subir al 3er piso.', maps:'https://www.google.com/maps?q=-17.7,-63.1', pagado:false, saldo:700,
      ts:_ts('2026-10-21','19:29:00'), nota:'1811', oc:'10-901' });
    var b=_ped('f2','2026-10-24','PM',[_lin('CH1201|TITANIO ICE|160x190',1,{})],{ cliente:'CLIENTE SIN NOTA', observaciones:'', oc:'10-902' });
    await _cargar([a,b], _stock(function(s){ s.c.u[_K]=10; }));
  });
  const r = await page.evaluate(()=>{
    showPedidoModal('f1');
    var box=document.getElementById('modal-box'), txt=box.textContent.replace(/\s+/g,' ');
    var obs=box.querySelector('.fl-obs'), g=box.querySelector('.fl-g'), mas=box.querySelector('details.fl-mas');
    var vis=function(el){ return !!el && (el.checkVisibility ? el.checkVisibility() : el.offsetParent!==null); };   // dentro de un <details> cerrado, Chromium no pone display:none
    var estBtns=[].slice.call(box.querySelectorAll('.fl-est button')).filter(vis).map(function(b){ return b.textContent.trim(); });
    var pagar=[].slice.call(box.querySelectorAll('button')).filter(function(b){ return /Efectivo/.test(b.textContent); });
    return { ancho:box.getBoundingClientRect().width, cls:box.className, txt:txt,
      obsAntes: obs && g ? !!(obs.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING) : false,
      obsTxt: obs ? obs.textContent : '', cols: g ? g.children.length : 0, estBtns:estBtns,
      pagarOculto: pagar.length>0 && pagar.every(function(b){ return !vis(b); }), masCerrado: !!mas && !mas.open,
      cobroOculto: !vis([].slice.call(box.querySelectorAll('.dl-k')).filter(function(k){ return /Cobro/.test(k.textContent); })[0]) };
  });
  chk('la ficha es ancha en la computadora (más de 1000 px)', r.ancho>1000 && /fl-ficha/.test(r.cls), r.ancho);
  chk('arriba: cliente, N° del día, cuándo ingresó y para cuándo', /CLIENTE CON NOTA/.test(r.txt) && /del día/.test(r.txt) && /Ingresó\s*21\/10 · 19:29/.test(r.txt) && /Entrega\s*sábado|Entrega\s*.*24\/10/.test(r.txt), r.txt.slice(0,260));
  chk('las observaciones van arriba de las columnas, en su recuadro', r.obsAntes && /LLAMAR 1 HORA ANTES/.test(r.obsTxt), r.obsTxt);
  chk('tres columnas: dónde entregar / qué se carga / camión y entrega', r.cols===3 && /Dónde entregar/.test(r.txt) && /Qué se carga y de dónde/.test(r.txt) && /Camión y entrega/.test(r.txt), r.cols);
  chk('el estado de stock y sus tres botones están a la vista', r.estBtns.length===3 && /se pone solo/.test(r.txt), r.estBtns);
  chk('la plata (cobro y «marcar pagado») queda en «Más datos», cerrado', r.masCerrado && r.pagarOculto && r.cobroOculto, { mas:r.masCerrado, pagar:r.pagarOculto, cobro:r.cobroOculto });

  // «Listo para cargar» con observaciones: pregunta
  const q = await page.evaluate(async()=>{
    window.OBS_PRUEBA=1; var out={};
    document.querySelector('#modal-box .fl-sw').click();
    var ov=document.getElementById('obs-conf'); out.pregunta=!!ov && !ov.hidden && /LLAMAR 1 HORA ANTES/.test(ov.textContent);
    out.antes=!!findById('f1').verificado;
    document.getElementById('obs-no').click(); out.cancelado=!!findById('f1').verificado; out.cerro=ov.hidden;
    document.querySelector('#modal-box .fl-sw').click(); document.getElementById('obs-si').click();
    out.marcado=findById('f1').verificado;
    document.querySelector('#modal-box .fl-sw').click(); out.apagadoDirecto=findById('f1').verificado===false && document.getElementById('obs-conf').hidden;
    showPedidoModal('f2'); document.querySelector('#modal-box .fl-sw').click();
    out.sinNotaDirecto=findById('f2').verificado===true && document.getElementById('obs-conf').hidden;
    quickVerificado('f1'); out.tablaPregunta=!document.getElementById('obs-conf').hidden; document.getElementById('obs-si').click(); out.tablaMarcado=findById('f1').verificado;
    openModal('<div class="modal-b">otra</div>'); out.otraSinClase=!/fl-ficha/.test(document.getElementById('modal-box').className);
    return out;
  });
  chk('prender «Listo para cargar» con observaciones muestra la ventana con el texto', q.pregunta && q.antes===false, q);
  chk('«Cancelar» no lo marca', q.cancelado===false && q.cerro, q);
  chk('«Las leí, marcar listo» lo marca', q.marcado===true, q);
  chk('apagarlo va directo, sin preguntar', q.apagadoDirecto, q);
  chk('un pedido sin observaciones va directo', q.sinNotaDirecto, q);
  chk('el 📦 de la tabla también pregunta', q.tablaPregunta && q.tablaMarcado===true, q);
  chk('otra ventana no queda ancha como la ficha', q.otraSinClase, q);
  chk('sin errores en la página', errs.length===0, errs);
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
