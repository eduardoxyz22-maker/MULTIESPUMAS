/* 🐱📎 EL COMPROBANTE OLVIDADO, EN CONTABILIDAD.
   Pedido del dueño, después de abrir el gato a todo el equipo: *"lo mismo cuando corrigen
   en contabilidad, y registran un pago, y olvidan adjuntar comprobante"*.

   Se midió antes de tocar (`/tmp/conta.js`) y había TRES cosas:
   1. REGISTRAR un pago sin imagen → frenaba, pero con un toast de texto (el que se pasa
      de largo). Ahora: el gato.
   2. CORREGIR un pago sin imagen → guardaba EN SILENCIO, sin avisar nada. Ahora: el gato,
      con la opción de guardar igual (hay pagos viejos de antes de que la imagen fuera
      obligatoria; trabar ahí sería la misma trampa del banco de §4bd).
   3. 💰 Y el de plata: adjuntar la imagen repintaba la ficha y **borraba la FECHA y el N°
      DE RECIBO** que se estaban tipeando. La fecha volvía a HOY sin avisar, así que un
      pago del sábado cargado el lunes se cuadraba en el día equivocado. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1300,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Una venta de Bs 2.000 con un adelanto de 500 SIN imagen (el caso del olvido) y
     Bs 1.500 por cobrar. */
  const prep = () => page.evaluate(async () => {
    var el=document.getElementById('conn-form'); if(el) el.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    window._t=[]; if(!window._tOrig) window._tOrig=window.toast;
    window.toast=function(m,k){ window._t.push(k+': '+m); return window._tOrig.apply(null,arguments); };
    apiSave=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(STATE))}); };
    window._subidas=0;
    apiFoto=function(){ window._subidas++; return Promise.resolve({ok:true, fotoId:'IMG'+window._subidas}); };
    achicarFoto=function(){ return Promise.resolve('data:image/jpeg;base64,x'); };
    CTA_PAGO={metodo:'Efectivo', banco:'', comps:[]}; CTA_PAGO_V=null;
    CTA_EDIT_I=-1; CTA_EDIT_V=null; CTA_TIPO='pago';
    STATE=[{ id:'PZ', fecha:'2026-08-01', turno:'AM', oc:'08-900', nota:'10',
      vendedor:'Isabel Robledo', cliente:'DOÑA ANA', celular:'7', zona:'N', direccion:'Av',
      maps:'', pagado:false, saldo:1500, acuenta:500, cobradoBs:0,
      metodoPago:textoCobros([{anticipo:true, metodo:'Efectivo', monto:500, fecha:'2026-08-01', nota:'10', comps:[]}]),
      observaciones:'', garantia:'', facturarA:'', nit:'', estado:'', entregado:false,
      verificado:false, vehiculo:'', chofer:'', nroDia:1, ts:Date.now(),
      productos:[{desc:'SOFT ICE', medida:'140x190', codigo:'A1', cant:1, precio:2000}] }];
    saveMirror(); closeModal();
    showContaModal('PZ');
    await new Promise(r=>setTimeout(r,150));
  });
  const modalHtml = () => page.evaluate(()=>{ var m=document.getElementById('modal');
    return (m && m.classList.contains('on')) ? m.innerHTML : ''; });

  // ================= 1. REGISTRAR un pago sin la imagen =================
  await prep();
  let r = await page.evaluate(async () => {
    document.getElementById('cta-pago-monto').value='1500';
    document.getElementById('cta-pago-nota').value='55';
    document.getElementById('cta-pago-fecha').value='2026-08-15';
    window._t=[];
    ctaRegistrarPago('PZ');
    await new Promise(r=>setTimeout(r,200));
    return { pagos:parseCobros(findById('PZ').metodoPago).length, toasts:window._t.slice() };
  });
  let html = await modalHtml();
  chk('registrar sin imagen saca EL GATO, no un avisito', /combo-instrucciones\.jpg/.test(html));
  chk('…diciendo que falta la foto del recibo', /foto del RECIBO/.test(html), '');
  chk('…y que el pago NO se registra', /no se registra/.test(html));
  chk('y de verdad no se registró', r.pagos===1, r.pagos);
  chk('ya no queda un toast que se pase de largo', r.toasts.length===0, JSON.stringify(r.toasts));
  chk('el gato ofrece adjuntarla ahí mismo', /ctaAdjuntar\('PZ'\)/.test(html));

  // ================= 2. 💰 lo tipeado NO se pierde al adjuntar =================
  const vuelta = await page.evaluate(async () => {
    ctaAdjuntar('PZ');
    onCompElegido({ target:{ files:[{name:'x.jpg'}], dataset:{pedido:'PZ'} } });
    await new Promise(r=>setTimeout(r,400));
    return { monto:(document.getElementById('cta-pago-monto')||{}).value,
             nota:(document.getElementById('cta-pago-nota')||{}).value,
             fecha:(document.getElementById('cta-pago-fecha')||{}).value,
             comps:compsArr(CTA_PAGO.comps).length };
  });
  chk('la imagen quedó cargada', vuelta.comps===1, vuelta.comps);
  chk('💰 la FECHA del pago no volvió a hoy — se cuadraría en el día equivocado',
      vuelta.fecha==='2026-08-15', vuelta.fecha);
  chk('el N° de recibo tampoco se borró', vuelta.nota==='55', vuelta.nota);
  chk('ni el monto', vuelta.monto==='1500', vuelta.monto);

  // ================= 3. con la imagen, el pago entra =================
  const entro = await page.evaluate(async () => {
    window._t=[];
    ctaRegistrarPago('PZ');
    await new Promise(r=>setTimeout(r,300));
    var p=findById('PZ'), cs=contaPagos(p);
    return { pagos:cs.length, ultimo:cs[cs.length-1], saldo:p.saldo, pagado:p.pagado,
             quedoV:(typeof CTA_PAGO_V==='undefined')?'?':CTA_PAGO_V };
  });
  chk('con la imagen el pago SÍ se registra', entro.pagos===2, entro.pagos);
  chk('…con la fecha que se puso, no la de hoy', entro.ultimo.fecha==='2026-08-15', entro.ultimo.fecha);
  chk('…con su recibo', String(entro.ultimo.nota).indexOf('55')>=0, entro.ultimo.nota);
  chk('…y la venta queda saldada', entro.saldo===0 && entro.pagado===true, entro.saldo+'/'+entro.pagado);
  chk('lo tipeado se descarta para que no se le pegue al pago siguiente',
      entro.quedoV===null, JSON.stringify(entro.quedoV));

  // ================= 4. CORREGIR un pago que no tiene imagen =================
  await prep();
  r = await page.evaluate(async () => {
    ctaEditarPago('PZ', 0);
    await new Promise(r=>setTimeout(r,200));
    document.getElementById('cta-ed-monto').value='777';
    window._t=[];
    ctaGuardarPago('PZ', 0);
    await new Promise(r=>setTimeout(r,300));
    return { acuenta:Number(findById('PZ').acuenta)||0, toasts:window._t.slice() };
  });
  html = await modalHtml();
  chk('corregir un pago sin imagen ya NO guarda en silencio', r.acuenta===500, r.acuenta);
  chk('…sale el gato', /combo-instrucciones\.jpg/.test(html));
  chk('…diciendo que ese pago no tiene ninguna', /no tiene NINGUNA imagen/.test(html));

  // ================= 5. …pero NO traba: se puede guardar igual =================
  chk('el gato ofrece guardar igual (hay pagos viejos sin imagen)',
      /Guardar igual/.test(html) && /ctaGuardarPago\('PZ',0,true\)/.test(html));
  const igual = await page.evaluate(async () => {
    ctaGuardarPago('PZ', 0, true);
    await new Promise(r=>setTimeout(r,300));
    var p=findById('PZ');
    return { acuenta:Number(p.acuenta)||0, saldo:Number(p.saldo)||0, editor:CTA_EDIT_I };
  });
  chk('«Guardar igual» guarda el monto corregido', igual.acuenta===777, igual.acuenta);
  chk('…y el saldo se reacomoda solo (2000 − 777)', igual.saldo===1223, igual.saldo);
  chk('…y el editor se cierra', igual.editor===-1, igual.editor);

  // ================= 6. el otro botón lleva a adjuntar, sin perder lo tipeado ==========
  await prep();
  const desde = await page.evaluate(async () => {
    ctaEditarPago('PZ', 0);
    await new Promise(r=>setTimeout(r,200));
    document.getElementById('cta-ed-monto').value='888';
    document.getElementById('cta-ed-nota').value='321';
    ctaGuardarPago('PZ', 0);                    // sale el gato
    await new Promise(r=>setTimeout(r,200));
    ctaAdjuntarDespues('PZ', 0);                // "Ya la adjunto"
    await new Promise(r=>setTimeout(r,200));
    onCompElegido({ target:{ files:[{name:'x.jpg'}], dataset:{pedido:'PZ'} } });
    await new Promise(r=>setTimeout(r,400));
    return { monto:(document.getElementById('cta-ed-monto')||{}).value,
             nota:(document.getElementById('cta-ed-nota')||{}).value,
             comps:compsArr(anticipoDe(findById('PZ')).comps).length,
             acuenta:Number(findById('PZ').acuenta)||0 };
  });
  chk('«Ya la adjunto» vuelve al editor y sube la imagen', desde.comps===1, desde.comps);
  chk('…sin perder el monto que se estaba corrigiendo', desde.monto==='888', desde.monto);
  chk('…ni el recibo', desde.nota==='321', desde.nota);
  chk('…y todavía sin guardar (falta tocar Guardar)', desde.acuenta===500, desde.acuenta);

  // ================= 7. y ahora que tiene imagen, guarda sin gato =================
  const final = await page.evaluate(async () => {
    window._t=[];
    ctaGuardarPago('PZ', 0);
    await new Promise(r=>setTimeout(r,300));
    var m=document.getElementById('modal');
    return { acuenta:Number(findById('PZ').acuenta)||0,
             gato:(m&&m.classList.contains('on'))?/combo-instrucciones/.test(m.innerHTML):false,
             toasts:window._t.slice() };
  });
  chk('con imagen, corregir guarda derecho y sin gato', final.acuenta===888 && !final.gato,
      final.acuenta+' gato:'+final.gato);
  chk('…y avisa que quedó corregido', final.toasts.some(t=>/Pago corregido/.test(t)),
      JSON.stringify(final.toasts));

  chk('sin errores JS', errors.length===0, errors.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
