/* 🖼️ IMÁGENES SUBIDAS Y SIN PEGAR A NINGÚN PEDIDO (§4ep) — el lado del panel.

   La imagen sube a Drive apenas se elige y se pega al pedido al guardar. Si la vendedora
   cambia de pestaña con imágenes «listas» y el pedido sin guardar, se iba convencida de que
   estaban. Y en Contabilidad, cambiar de venta con la imagen del pago «lista» la tiraba.

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Salir del formulario con imágenes sin pegar pregunta; si dice NO se queda; si dice SÍ
      las borra de Drive y las saca del formulario.
   2. Al editar, las imágenes que el pedido YA tenía no cuentan como «sin pegar».
   3. Después de guardar bien, cambiar de pestaña no pregunta ni borra nada.
   4. En Contabilidad, la imagen del pago en curso se conserva por venta al cambiar y volver.

   Red cortada, servidor simulado. Se corre:  node tests/test_huerfanas.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:900}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);
  const R = await page.evaluate(async () => {
    var casos=[]; var chk=function(n, ok, det){ casos.push({n:n, ok:!!ok, det:det}); };
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; VENTA_TIENDA=false; window._pl=[];
    apiSave=function(r){ var g=JSON.parse(JSON.stringify(r)); window._pl=window._pl.filter(function(p){return p.id!==g.id;}).concat([g]); return Promise.resolve({ok:true, pedido:g}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiPost=function(){ return Promise.resolve({ok:true}); };
    var borradas=[]; apiBorrarFoto=function(id){ borradas.push(id); return Promise.resolve({ok:true}); };
    window._toasts=[]; toast=function(m,k){ window._toasts.push(String(k)+': '+m); };
    var respuesta=true, preguntas=[]; confirm=function(m){ preguntas.push(m); return respuesta; };
    var enForm=function(){ return document.getElementById('view-form').classList.contains('active'); };
    // 1. formulario nuevo con dos imágenes subidas, sin guardar
    showView('form'); resetForm(); EDIT_ID=null; FORM_COMPS=['IMG_1','IMG_2'];
    respuesta=false; showView('mis');
    chk('salir con imágenes sin pegar pregunta, y si dice NO se queda en el formulario', preguntas.length===1 && /2 imágenes/.test(preguntas[0]) && enForm() && FORM_COMPS.length===2 && borradas.length===0, preguntas[0]);
    respuesta=true; showView('mis');
    chk('⚠️ si dice SÍ, las borra de Drive y las saca del formulario', !enForm() && borradas.join(',')==='IMG_1,IMG_2' && FORM_COMPS.length===0 && window._toasts.some(function(t){ return /borraron 2 imágenes/.test(t); }), borradas.join(',')+' | '+FORM_COMPS.length);
    // 2. editar: las que ya tenía no cuentan; una nueva sí
    var p={ id:'PH', fecha:'2026-09-25', turno:'AM', oc:'09-900', nota:'1950', vendedor:'Carola Chavez', cliente:'DON HUERFANO', celular:'70000000', zona:'Norte', direccion:'x', maps:'', pagado:true, saldo:0, acuenta:0, cobradoBs:500,
      metodoPago:textoCobros([{anticipo:true, metodo:'QR', banco:'BISA', monto:500, fecha:'2026-09-10', nota:'1950', comps:['IMG_VIEJA']}]), observaciones:'', garantia:'', facturarA:'', nit:'', estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(), fotos:[], productos:[{desc:'X', medida:'1x1', codigo:'A', cant:1}] };
    STATE=[p]; window._pl=[JSON.parse(JSON.stringify(p))]; saveMirror(); resetForm(); editarDesdeMis('PH'); await new Promise(r=>setTimeout(r,250));
    preguntas=[]; borradas=[]; showView('mis');
    chk('al editar sin subir nada nuevo, salir no pregunta ni borra', preguntas.length===0 && borradas.length===0 && !enForm(), preguntas.length);
    resetForm(); editarDesdeMis('PH'); await new Promise(r=>setTimeout(r,250));
    FORM_COMPS=compsArr(FORM_COMPS.concat(['IMG_NUEVA'])); preguntas=[]; borradas=[]; respuesta=true; showView('mis');
    chk('…con una imagen nueva sin guardar pregunta por UNA y borra solo esa', preguntas.length===1 && /1 imagen/.test(preguntas[0]) && borradas.join(',')==='IMG_NUEVA', preguntas[0]+' | '+borradas.join(','));
    // 3. después de guardar bien no pregunta
    resetForm(); editarDesdeMis('PH'); await new Promise(r=>setTimeout(r,250));
    FORM_COMPS=compsArr(FORM_COMPS.concat(['IMG_OK'])); window._toasts=[]; submitPedido(); await new Promise(r=>setTimeout(r,400));
    preguntas=[]; borradas=[]; showView('form'); showView('mis');
    chk('después de guardar bien, cambiar de pestaña no pregunta ni borra nada', preguntas.length===0 && borradas.length===0 && /IMG_OK/.test(findById('PH').metodoPago), preguntas.length+' '+borradas.length);
    // 4. Contabilidad: el pago en curso se conserva por venta
    var q=JSON.parse(JSON.stringify(p)); q.id='PH2'; q.cliente='DOÑA DOS'; q.pagado=false; q.saldo=300; q.metodoPago=''; q.acuenta=0; q.cobradoBs=0;
    STATE=[findById('PH'), q]; showContaModal('PH2'); CTA_PAGO.comps=['IMG_PAGO_EN_CURSO']; CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA';
    showContaModal('PH'); var enOtra=compsArr(CTA_PAGO.comps).length;
    showContaModal('PH2');
    chk('⚠️ la imagen del pago en curso de una venta se conserva al cambiar de venta y volver', enOtra===0 && compsArr(CTA_PAGO.comps).join(',')==='IMG_PAGO_EN_CURSO' && CTA_PAGO.metodo==='QR' && CTA_PAGO.banco==='BISA', enOtra+' | '+compsArr(CTA_PAGO.comps).join(','));
    chk('…y al volver avisa que está esperando «Registrar pago»', window._toasts.some(function(t){ return /esperando que toques «Registrar pago»/.test(t); }), window._toasts.slice(-1)[0]);
    closeModal();
    return casos;
  });
  console.log('\n── Imágenes sin pegar ──');
  R.forEach(c => chk(c.n, c.ok, c.det));
  chk('sin errores de JavaScript en la página', errores.length===0, errores.join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
