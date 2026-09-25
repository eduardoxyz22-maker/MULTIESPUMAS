/* 💰 CONTABILIDAD: cuatro formas de perder plata anotada (§4eu, los ALTA de §4er).

   1. Editar el pedido desde el formulario borraba el flete YA COBRADO cuando además había
      una parte pactada sin cobrar: Bs 50 que entraron desaparecían del Cuadre con solo
      corregir la observación, y al chofer se le mandaba a cobrar el total.
   2. Pago mixto «a cuenta» (Efectivo 1500 + QR 500 = A cuenta 2000): «💾 Guardar precios y
      montos» sin tocar nada bajaba p.acuenta a 1500, y la próxima edición del pedido rehacía
      el historial con 1000 + 500 — Bs 500 de efectivo fuera de todo cuadre.
   3. «✏️ Corregir» sobre el cobro de una venta PAGADA SIN MONTO dejaba saldo −1.500 y un
      «cobro de más» falso (el objetivo se congelaba en 0).
   4. Corregirle la FECHA al anticipo de una venta pagada por completo la desmarcaba de
      PAGADA: la tabla decía «A CUENTA Bs 1.500» y el formulario no la dejaba guardar.

   Red cortada, servidor simulado, fixtures sintéticos. Se corre:  node tests/test_conta_alta.js
   Dientes contra el panel viejo:  PEDIDOS=/ruta/al/viejo.html node tests/test_conta_alta.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const J = (o) => JSON.stringify(o);

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  page.on('dialog', d => { if (d.type()==='prompt') d.accept('1500'); else d.accept(); });
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok'; if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; } if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    window._saves=[];
    apiSave=function(r){ window._saves.push(JSON.parse(JSON.stringify(r))); return Promise.resolve({ok:true}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(m)); return _t(m,k,ms); };
    downloadBlob=function(){};
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    window.hoy=todayStr();
    var d1=new Date(); d1.setDate(d1.getDate()-1); window.ayer=isoLocal(d1);
    var d2=new Date(); d2.setDate(d2.getDate()+2); window.pasado=isoLocal(d2);
    while(diaDomingo(window.pasado) || diaCerrado(window.pasado)){ d2.setDate(d2.getDate()+1); window.pasado=isoLocal(d2); }
    window.ts0=new Date(new Date().setHours(12,0,0,0)).getTime();
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:window.pasado, maps:'', observaciones:'', garantia:'', facturarA:'',
              estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, fotos:[] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
    window.pagosDe=function(p){ return contaPagos(p).map(function(c){ return [c.anticipo?'ant':(esEnvio(c)?'env':'cobro'), c.metodo, c.monto]; }); };
    window.envs=function(p){ return enviosDe(p).map(function(c){ return [c.metodo||'', c.monto, c.fecha||'', limpiaNota(c.nota), compsArr(c.comps!=null?c.comps:c.comp)]; }); };
    window.aConta=function(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta(); };
  });

  // ═══ 4. Corregir la FECHA del anticipo de una venta pagada por completo ═══════════
  console.log('\n── 4. Corregir el anticipo de una venta PAGADA no la desmarca ──');
  let r = await page.evaluate(async () => {
    window._saves=[]; window._toasts=[];
    STATE=[P({ id:'A1', nota:'500', oc:'09-500', vendedor:'Carola Chavez', cliente:'PAGO COMPLETO AL CARGAR', ts:ts0,
      acuenta:0, saldo:0, pagado:true, metodoPago:'~Efectivo 1500 @'+hoy+' #500 %IMG1', productos:[{desc:'A',cant:1,precio:1500}] })];
    RETIROS=[]; aConta(); await new Promise(r=>setTimeout(r,50));
    showContaModal('A1'); ctaEditarPago('A1',0);
    document.getElementById('cta-ed-fecha').value=ayer;      // solo le corrige la FECHA
    ctaGuardarPago('A1',0,true);
    var p=findById('A1'), ant=anticipoDe(p);
    var out={ pagado:p.pagado, acuenta:p.acuenta, saldo:p.saldo, txt:contaPagoTxt(p), ruta:cobroRutaTxt(p).t, antFecha:ant&&ant.fecha, antMonto:ant&&ant.monto,
      antComps:ant?compsArr(ant.comps!=null?ant.comps:ant.comp):[], resumen:document.getElementById('cta-resumen').textContent.replace(/\s+/g,' ') };
    // y ahora la vendedora corrige otra cosa del pedido desde el formulario
    closeModal(); window._toasts=[]; window._saves=[];
    editPedido('A1');
    out.form={ pagado:segVal('f-pagado'), acuenta:document.getElementById('f-acuenta').value, saldo:document.getElementById('f-saldo').value };
    document.getElementById('f-obs').value='solo cambio la observación';
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    p=findById('A1'); ant=anticipoDe(p);
    out.guardados=window._saves.length; out.toasts=window._toasts.slice();
    out.despuesForm={ pagado:p.pagado, acuenta:p.acuenta, saldo:p.saldo, obs:p.observaciones, antFecha:ant&&ant.fecha, antMonto:ant&&ant.monto };
    return out;
  });
  chk('⚠️ corregir solo la fecha del anticipo deja la venta PAGADA, sin «A cuenta» y sin saldo', r.pagado===true && r.acuenta===0 && r.saldo===0, J([r.pagado, r.acuenta, r.saldo]));
  chk('…la fecha nueva quedó en el anticipo, con su monto y su comprobante', r.antFecha===await page.evaluate(()=>ayer) && r.antMonto===1500 && r.antComps.join(',')==='IMG1', J([r.antFecha, r.antMonto, r.antComps]));
  chk('…la tabla dice PAGADO y el chofer ve ✅ PAGADO', /^PAGADO/.test(r.txt) && /PAGADO/.test(r.ruta), r.txt+' · '+r.ruta);
  chk('…y el resumen la cuenta como pagada, sin «cobradas sin marcar»', /Pagados: 1/.test(r.resumen) && !/sin marcar/.test(r.resumen), r.resumen.slice(0,120));
  chk('…el formulario la abre como pagada (SÍ, a cuenta 0)', r.form.pagado==='SI' && Number(r.form.acuenta)===0, J(r.form));
  chk('⚠️ …y la vendedora puede volver a guardar el pedido: se guarda, con el historial intacto', r.guardados===1 && r.despuesForm.obs==='solo cambio la observación' && r.despuesForm.pagado===true && r.despuesForm.antMonto===1500 && r.despuesForm.antFecha===await page.evaluate(()=>ayer) && !r.toasts.some(t=>/poné el saldo/.test(t)), J(r.toasts)+' · '+J(r.despuesForm));

  r = await page.evaluate(async () => {
    // A2: venta vieja con «A cuenta» suelto + marcada PAGADA sin monto (cobradoBs no viaja)
    window._saves=[];
    STATE=[P({ id:'A2', nota:'510', oc:'09-510', vendedor:'Maria Flores', cliente:'A CUENTA VIEJA Y PAGADA', ts:ts0+1,
      acuenta:500, saldo:0, pagado:true, metodoPago:'Efectivo', productos:[{desc:'A',cant:1}] })];
    aConta(); await new Promise(r=>setTimeout(r,30));
    showContaModal('A2'); ctaEditarPago('A2',0);
    document.getElementById('cta-ed-fecha').value=ayer;
    ctaGuardarPago('A2',0,true);
    var p=findById('A2'), ant=anticipoDe(p); closeModal();
    return { pagado:p.pagado, saldo:p.saldo, acuenta:p.acuenta, antFecha:ant&&ant.fecha, antMonto:ant&&ant.monto, txt:contaPagoTxt(p) };
  });
  chk('la venta vieja (A cuenta suelto + PAGADA sin monto) también sigue pagada al corregir la fecha del anticipo', r.pagado===true && r.saldo===0 && r.acuenta===500 && r.antMonto===500 && /^PAGADO/.test(r.txt), J(r));

  r = await page.evaluate(async () => {
    // el «deshacer» del chofer no cambia: con un cobro en la entrega, deshacerlo vuelve a deber
    // (25/09: el de la entrega va SIN recibo, como lo anotan el chofer y el 💰; uno con recibo lo registró Contabilidad)
    STATE=[P({ id:'G1', nota:'520', oc:'09-520', vendedor:'Carola Chavez', cliente:'DESHACER', ts:ts0+2, acuenta:500, saldo:0, pagado:true,
      metodoPago:textoCobros([{anticipo:true, metodo:'Efectivo', monto:500, fecha:hoy, nota:'520', comps:[]},{metodo:'Efectivo', monto:700, fecha:hoy, comps:[]}]), productos:[{desc:'G',cant:1,precio:1200}] }),
           P({ id:'G2', nota:'530', oc:'09-530', vendedor:'Carola Chavez', cliente:'TODO ADELANTO', ts:ts0+3, acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 900 @'+hoy+' #530 %IMG9', productos:[{desc:'G',cant:1,precio:900}] })];
    quickCobrado('G1'); quickCobrado('G2');
    var a=findById('G1'), b=findById('G2');
    return { g1:{ pagado:a.pagado, saldo:a.saldo, cobros:cobrosDe(a).length }, g2:{ pagado:b.pagado, saldo:b.saldo } };
  });
  chk('el «deshacer cobro» del chofer sigue igual: la venta vuelve a deber lo que se cobró en la puerta', r.g1.pagado===false && r.g1.saldo===700 && r.g1.cobros===0, J(r.g1));
  chk('…y en una venta pagada entera con el adelanto no la deja «por cobrar Bs 0»', r.g2.pagado===true && r.g2.saldo===0, J(r.g2));

  // ═══ 3. «Corregir» el cobro de una venta PAGADA SIN MONTO ═══════════════════════
  console.log('\n── 3. Corregir un cobro sin monto no deja saldo negativo ──');
  r = await page.evaluate(async () => {
    window._saves=[]; window._toasts=[];
    var fx=function(){ return P({ id:'B1', nota:'600', oc:'09-600', vendedor:'Maria Flores', cliente:'PAGADA SIN MONTO', ts:ts0+4, acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMGB', productos:[{desc:'B',cant:1}] }); };
    STATE=[fx()]; aConta(); await new Promise(r=>setTimeout(r,30));
    showContaModal('B1'); ctaEditarPago('B1',0);
    document.getElementById('cta-ed-fecha').value=hoy; document.getElementById('cta-ed-monto').value='1500'; document.getElementById('cta-ed-nota').value='600';
    ctaGuardarPago('B1',0,true);
    var p=findById('B1');
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); segSet('cua-mode','todo'); setCuadreModo('todo');
    var al=cuadreAlertas(cuadrePagos()).map(function(a){ return a.k; });
    var corregir={ saldo:p.saldo, pagado:p.pagado, exceso:excesoCobro(p), total:ventaTotal(p), cobros:cobrosDe(p).map(function(c){ return [c.metodo, c.monto, limpiaNota(c.nota), compsArr(c.comps!=null?c.comps:c.comp)]; }), alertas:al };
    closeModal(); STATE=[fx()]; aConta(); showContaModal('B1'); ctaAnotarMonto('B1',0);      // el otro camino (el prompt contesta 1500)
    p=findById('B1');
    var anotar={ saldo:p.saldo, pagado:p.pagado, exceso:excesoCobro(p), total:ventaTotal(p) };
    closeModal();
    return { corregir:corregir, anotar:anotar };
  });
  chk('⚠️ «Corregir» con monto 1.500 deja saldo 0, pagada, sin «cobro de más» y con total 1.500', r.corregir.saldo===0 && r.corregir.pagado===true && r.corregir.exceso===0 && r.corregir.total===1500, J(r.corregir));
  chk('…el cobro quedó con su monto, su nota y su imagen', r.corregir.cobros.length===1 && r.corregir.cobros[0][1]===1500 && r.corregir.cobros[0][2]==='600' && r.corregir.cobros[0][3].join(',')==='IMGB', J(r.corregir.cobros));
  chk('…y el Cuadre no grita «exceso»', r.corregir.alertas.indexOf('exceso')<0, J(r.corregir.alertas));
  chk('«Anotar el monto» da exactamente lo mismo', r.anotar.saldo===0 && r.anotar.pagado===true && r.anotar.exceso===0 && r.anotar.total===1500, J(r.anotar));

  // ═══ 1. El flete YA COBRADO sobrevive a la edición del pedido ═══════════════════
  console.log('\n── 1. El flete cobrado no se borra al editar el pedido ──');
  const C = async (edit) => page.evaluate(async (edit) => {
    window._saves=[]; window._toasts=[];
    var hist=textoCobros([
      { anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:hoy, nota:'700', comps:['QC'] },
      { envio:true, metodo:'Efectivo', monto:50, fecha:hoy, nota:'700', comps:['FL1'] },
      { envio:true, metodo:'', monto:100, fecha:'', nota:'', comps:[] }]);
    STATE=[P({ id:'C1', nota:'700', oc:'09-700', vendedor:'Carola Chavez', cliente:'FLETE MITAD', ts:ts0+5, acuenta:1000, saldo:500, pagado:false, metodoPago:hist, productos:[{desc:'C',cant:1,precio:1500}] })];
    showView('mis'); editPedido('C1');
    var form={ envio:document.getElementById('f-envio').value, cob:segVal('f-envio-cob'), hint:(document.getElementById('f-envio-hint')||{}).textContent||'' };
    document.getElementById('f-obs').value='cambio de dirección nomás';
    if(edit.envio!=null){ document.getElementById('f-envio').value=edit.envio; pintarEnvioCobrado(); }
    if(edit.cob){ segSet('f-envio-cob', edit.cob); pintarEnvioCobrado(); }
    submitPedido();
    await new Promise(r=>setTimeout(r,250));
    var p=findById('C1');
    return { form:form, guardado:window._saves.length, toasts:window._toasts.slice(0,3), tot:envioTotal(p), cob:envioCobrado(p), pend:envioPorCobrar(p), envios:envs(p), obs:p.observaciones, ant:anticipoDe(p)&&anticipoDe(p).monto };
  }, edit);
  r = await C({});
  chk('el formulario abre con el TOTAL del flete (150) y «NO» (falta una parte), y avisa que Bs 50 ya entraron', r.form.envio==='150' && r.form.cob==='NO' && /50,00/.test(r.form.hint) && /no se tocan/.test(r.form.hint), J(r.form));
  chk('⚠️ editar solo la observación conserva el flete COBRADO (Efectivo 50, con fecha, recibo y foto) y lo pactado (100)', r.guardado===1 && r.obs==='cambio de dirección nomás' && r.cob===50 && r.pend===100 && r.tot===150 && r.envios.length===2 && r.envios[0][0]==='Efectivo' && r.envios[0][1]===50 && r.envios[0][3]==='700' && r.envios[0][4].join(',')==='FL1' && r.envios[1][0]==='' && r.envios[1][1]===100, J(r.envios)+' · '+J(r.toasts));
  chk('…y el anticipo de la venta sigue igual', r.ant===1000, r.ant);
  r = await C({ envio:'200' });
  chk('subir el flete a 200: lo cobrado (50) queda y lo pactado pasa a 150', r.cob===50 && r.pend===150 && r.envios.length===2 && r.envios[0][4].join(',')==='FL1', J(r.envios));
  r = await C({ envio:'50' });
  chk('bajarlo a 50 (lo que ya entró): queda solo el cobrado, sin nada pactado', r.cob===50 && r.pend===0 && r.envios.length===1 && r.envios[0][0]==='Efectivo', J(r.envios));
  r = await C({ envio:'' });
  chk('vaciar el campo saca lo pactado pero NUNCA lo cobrado', r.cob===50 && r.pend===0 && r.envios.length===1 && r.envios[0][4].join(',')==='FL1', J(r.envios));
  r = await C({ cob:'SI' });
  chk('con «SI, ya lo cobré» en ese estado, lo que faltaba entra AHORA (con el método del pago) y lo cobrado de antes no se toca', r.cob===150 && r.pend===0 && r.envios.length===2 && r.envios[0][1]===50 && r.envios[0][4].join(',')==='FL1' && r.envios[1][0]==='QR' && r.envios[1][1]===100 && r.envios[1][4].join(',')==='QC', J(r.envios));

  r = await page.evaluate(async () => {
    // lo de siempre sigue: todo cobrado + «NO» lo deshace; solo pactado + «SI» lo cobra ahora
    var base=function(id, env){ return P({ id:id, nota:'710', oc:'09-710', vendedor:'Carola Chavez', cliente:'FLETE '+id, ts:ts0+6, acuenta:1000, saldo:500, pagado:false,
      metodoPago:textoCobros([{ anticipo:true, metodo:'QR', banco:'BISA', monto:1000, fecha:hoy, nota:'710', comps:['QC'] }].concat(env)), productos:[{desc:'C',cant:1,precio:1500}] }); };
    STATE=[base('D0', [{ envio:true, metodo:'Efectivo', monto:150, fecha:hoy, nota:'710', comps:['FL2'] }]), base('D1', [{ envio:true, metodo:'Efectivo', monto:150, fecha:hoy, nota:'710', comps:['FL2'] }]), base('D2', [{ envio:true, metodo:'', monto:100, fecha:'', nota:'', comps:[] }])];
    showView('mis');
    editPedido('D0'); var f0=segVal('f-envio-cob'); document.getElementById('f-obs').value='sin tocar el flete'; submitPedido(); await new Promise(r=>setTimeout(r,250));
    editPedido('D1'); var f1=segVal('f-envio-cob'); segSet('f-envio-cob','NO'); pintarEnvioCobrado(); submitPedido(); await new Promise(r=>setTimeout(r,250));
    editPedido('D2'); var f2=segVal('f-envio-cob'); segSet('f-envio-cob','SI'); pintarEnvioCobrado(); submitPedido(); await new Promise(r=>setTimeout(r,250));
    return { d0:{ abre:f0, envios:envs(findById('D0')), obs:findById('D0').observaciones }, d1:{ abre:f1, envios:envs(findById('D1')) }, d2:{ abre:f2, envios:envs(findById('D2')) } };
  });
  chk('⚠️ un flete cobrado ENTERO abre en «SI», y guardar el pedido sin tocarlo lo deja cobrado (antes abría en «NO» y lo borraba)', r.d0.abre==='SI' && r.d0.obs==='sin tocar el flete' && r.d0.envios.length===1 && r.d0.envios[0][0]==='Efectivo' && r.d0.envios[0][1]===150 && r.d0.envios[0][4].join(',')==='FL2', J(r.d0));
  chk('(de siempre) pasarlo a «NO» a propósito lo deja por cobrar sin método', r.d1.abre==='SI' && r.d1.envios.length===1 && r.d1.envios[0][0]==='' && r.d1.envios[0][1]===150, J(r.d1));
  chk('(de siempre) solo pactado abre en «NO»; pasarlo a «SI» lo cobra ahora con el método del pago', r.d2.abre==='NO' && r.d2.envios.length===1 && r.d2.envios[0][0]==='QR' && r.d2.envios[0][1]===100 && r.d2.envios[0][4].join(',')==='QC', J(r.d2));

  // ═══ 2. Pago mixto «a cuenta»: p.acuenta es TODO el adelanto ════════════════════
  console.log('\n── 2. Pago mixto a cuenta: guardar montos sin tocar nada no pierde el 2° método ──');
  r = await page.evaluate(async () => {
    window._saves=[]; window._toasts=[];
    var fx=function(){ return P({ id:'F1', nota:'950', oc:'09-950', vendedor:'Carola Chavez', cliente:'MIXTO A CUENTA', ts:ts0+7, acuenta:2000, saldo:2990, pagado:false,
      metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1500, fecha:hoy, nota:'950', comps:['M1'] },{ anticipo:false, metodo:'QR', banco:'BISA', monto:500, fecha:hoy, nota:'950', comps:['M2'] }]),
      productos:[{desc:'F',cant:1,precio:4990}] }); };
    STATE=[fx()]; aConta(); await new Promise(r=>setTimeout(r,30));
    showContaModal('F1');
    var label=(document.getElementById('cta-edit')||{}).textContent||'';
    var acuInput=document.getElementById('cta-acuenta').value;
    ctaGuardarMontos('F1');                                  // sin cambiar nada
    var p=findById('F1');
    var conta={ acuenta:p.acuenta, saldo:p.saldo, total:ventaTotal(p), pagos:pagosDe(p), badge:contaPagoTxt(p), resumen:(document.getElementById('cta-resumen').textContent.match(/A cuenta: [^·]+/)||[''])[0].trim() };
    closeModal();
    // la vendedora abre el pedido para corregir el saldo
    showView('mis'); editPedido('F1');
    var form={ acuenta:document.getElementById('f-acuenta').value, monto2:document.getElementById('f-monto2').value };
    document.getElementById('f-saldo').value='2000';
    submitPedido(); await new Promise(r=>setTimeout(r,250));
    p=findById('F1');
    var despuesForm={ acuenta:p.acuenta, saldo:p.saldo, total:ventaTotal(p), pagos:pagosDe(p) };
    // y corregir el MONTO del anticipo desde la ficha también arrastra el 2° método
    STATE=[fx()]; aConta(); showContaModal('F1'); ctaEditarPago('F1',0);
    document.getElementById('cta-ed-monto').value='1600';
    ctaGuardarPago('F1',0,true);
    p=findById('F1'); closeModal();
    var corr={ acuenta:p.acuenta, ant:anticipoDe(p).monto, mixto:mixtoDe(p)&&mixtoDe(p).monto, total:ventaTotal(p), saldo:p.saldo };
    return { label:label, acuInput:acuInput, conta:conta, form:form, despuesForm:despuesForm, corr:corr };
  });
  chk('la ficha dice que ese «A cuenta» es solo el 1er método y que el 2° puso Bs 500 aparte', r.acuInput==='1500' && /solo el 1er método/.test(r.label) && /500,00/.test(r.label), r.label.slice(0,160));
  chk('⚠️ «Guardar precios y montos» sin tocar nada deja el A cuenta en 2.000 (1.500 + 500), no en 1.500', r.conta.acuenta===2000 && r.conta.saldo===2990 && r.conta.total===4990 && /2\.000,00/.test(r.conta.resumen), J(r.conta));
  chk('…y los dos pagos siguen ahí', r.conta.pagos.length===2 && r.conta.pagos[0][2]===1500 && r.conta.pagos[1][2]===500, J(r.conta.pagos));
  chk('⚠️ la vendedora edita el pedido (solo el saldo): el historial se rehace con 1.500 + 500, no con 1.000 + 500', r.form.acuenta==='2000' && r.form.monto2==='500' && r.despuesForm.acuenta===2000 && r.despuesForm.saldo===2000 && r.despuesForm.total===4000 && r.despuesForm.pagos.length===2 && r.despuesForm.pagos[0][2]===1500 && r.despuesForm.pagos[1][2]===500, J(r.form)+' · '+J(r.despuesForm));
  // corregir el adelanto no mueve el TOTAL de la venta (4.990): baja lo que falta cobrar (2.990 → 2.890)
  chk('corregir el monto del anticipo (1.500 → 1.600) desde la ficha deja el A cuenta en 2.100 y el total igual', r.corr.acuenta===2100 && r.corr.ant===1600 && r.corr.mixto===500 && r.corr.total===4990 && r.corr.saldo===2890, J(r.corr));

  /* ══ §4fj — CORREGIRLE EL RECIBO O LA FECHA AL ANTICIPO ══════════════════════════
     `mixtoDe` reconoce al 2° método por HEURÍSTICA: mismo día y mismo recibo que el
     anticipo. Corregirle al anticipo el recibo —lo que §4ei recomienda hacer— y dejar el
     otro renglón con el viejo lo volvía invisible: el «A cuenta» bajaba a 1.500 en la tabla
     y la corrección SIGUIENTE, con `mxM=0`, borraba los Bs 500 del historial entero. */
  {
    const q = await page.evaluate(async () => {
      var fx=function(){ return P({ id:'X1', nota:'1700', oc:'09-960', vendedor:'Carola Chavez', cliente:'MIXTO RECIBO', ts:ts0+8,
        acuenta:2000, saldo:3000, pagado:false,
        metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1500, fecha:ayer, nota:'1700', comps:['A'] },
                                { anticipo:false, metodo:'QR', banco:'BISA', monto:500, fecha:ayer, nota:'1700', comps:['B'] }]),
        productos:[{desc:'C',cant:1,precio:5000}] }); };
      var foto=function(){ var p=findById('X1'); var a=anticipoDe(p), m=mixtoDe(p);
        return { txt:p.metodoPago, acuenta:r2(Number(p.acuenta)||0), ant:a?a.monto:null, mixto:m?m.monto:null,
                 venta:ventaTotal(p), entro:r2(totalCobrado(p)+(a?(Number(a.monto)||0):0)) }; };
      var out={};
      // (a) corregirle el N° de recibo al anticipo: 1700 → 1750
      STATE=[fx()]; aConta(); await new Promise(r=>setTimeout(r,30));
      showContaModal('X1'); ctaEditarPago('X1',0);
      document.getElementById('cta-ed-nota').value='1750';
      ctaGuardarPago('X1',0,true);
      out.recibo=foto();
      // (b) y AHORA la fecha: con el mixto perdido, acá se borraban los 500
      showContaModal('X1'); ctaEditarPago('X1',0);
      document.getElementById('cta-ed-fecha').value=hoy;
      ctaGuardarPago('X1',0,true);
      out.fecha=foto();
      // (c) el camino que ya andaba (solo el monto) no se tocó
      STATE=[fx()]; aConta(); showContaModal('X1'); ctaEditarPago('X1',0);
      document.getElementById('cta-ed-monto').value='1600';
      ctaGuardarPago('X1',0,true);
      out.monto=foto();
      closeModal();
      return out;
    });
    chk('§4fj · corregir el RECIBO del anticipo no despega al 2° método del pago mixto', q.recibo.mixto===500 && q.recibo.acuenta===2000 && q.recibo.entro===2000, J(q.recibo));
    chk('  …y los dos renglones quedan con el recibo nuevo', /#1750/.test(q.recibo.txt) && !/#1700/.test(q.recibo.txt), q.recibo.txt);
    chk('§4fj · corregir la FECHA después NO borra los Bs 500 (antes desaparecían del ledger)', q.fecha.mixto===500 && q.fecha.entro===2000 && q.fecha.venta===5000, J(q.fecha));
    chk('  …y los dos pagos quedan en el mismo día', q.fecha.txt.split('@').length===3 && q.fecha.txt.indexOf('@'+q.fecha.txt.split('@')[1].slice(0,10))>=0, q.fecha.txt);
    chk('§4fj · corregir solo el MONTO sigue funcionando igual que antes', q.monto.ant===1600 && q.monto.mixto===500 && q.monto.acuenta===2100 && q.monto.venta===5000, J(q.monto));
  }

  /* ══ 💰 «Marcar cobrado» SUMA, no reemplaza (§4fd) ══════════════════════════════
     El botón 💰 de cada fila de Administración —el que más se toca— hacía
     `aplicarCobros(p,[unCobro])`, y eso REESCRIBE el historial: borraba los pagos ya
     registrados por Contabilidad con su recibo y su comprobante, SUBÍA el saldo, y el aviso
     salía en verde. Además el cobro nacía sin fecha, así que no entraba a ningún Cuadre. */
  {
    const r = await page.evaluate(async () => {
      CONNECTED=false;
      var mk=function(id, metodoPago, saldo){
        return { id:id, fecha:todayStr(), oc:'09-90'+id, vendedor:'Maria Flores', cliente:'CLIENTE '+id,
          celular:'70000000', turno:'AM', zona:'Norte', direccion:'x', maps:'', nota:'180'+id, nit:'1',
          nroDia:1, ts:Date.now(), observaciones:'', estado:'', entregado:false, vehiculo:'', chofer:'',
          garantia:'', facturarA:'', verificado:false, fotos:[], acuenta:0, pagado:false,
          productos:[{desc:'COLCHON',medida:'140x190',codigo:'C1',cant:1,precio:1000}],
          metodoPago:metodoPago, saldo:saldo };
      };
      // (a) Contabilidad ya registró 600 por QR con recibo y comprobante; el cliente debe 400
      var a=mk('1','QR BISA 600 @'+todayStr()+' #1750 %IMG1', 400);
      STATE=[a]; quickCobrado('1'); var qa=findById('1');
      // (b) tres pagos registrados y la venta pagada: «deshacer» tiene que preguntar
      var t=todayStr();
      var c=mk('3','QR BISA 600 @'+t+' %IMG1 + Efectivo 300 @'+t+' #99 + Tarjeta 100 @'+t, 0);
      c.pagado=true; STATE=[c];
      window.__conf=[]; var _cf=window.confirm; window.confirm=function(m){ window.__conf.push(String(m)); return false; };
      quickCobrado('3'); var qc=findById('3');
      window.confirm=_cf;
      return {
        sumo:{ cobrado:totalCobrado(qa), saldo:r2(Number(qa.saldo)||0), n:cobrosDe(qa).length,
               pagado:!!qa.pagado, conservaComp:JSON.stringify(cobrosDe(qa)[0].comps||[]),
               todosConFecha:cobrosDe(qa).every(function(x){ return !!x.fecha; }),
               enCuadreMes:cobrosDe(qa).filter(function(x){ return enPeriodoCuadre(x.fecha,'mes'); })
                            .reduce(function(n,x){ return n+(Number(x.monto)||0); },0) },
        deshacer:{ preguntas:window.__conf.length, texto:(window.__conf[0]||''), quedan:cobrosDe(qc).length }
      };
    });
    chk('⚠️ 💰 con un pago ya registrado SUMA el saldo en vez de borrarlo (600 + 400 = 1000)', r.sumo.cobrado===1000 && r.sumo.n===2, J([r.sumo.cobrado, r.sumo.n]));
    chk('…el saldo BAJA a 0 y la venta queda pagada (antes el saldo SUBÍA a 600)', r.sumo.saldo===0 && r.sumo.pagado===true, J([r.sumo.saldo, r.sumo.pagado]));
    chk('⚠️ …y el comprobante del pago viejo NO se pierde', r.sumo.conservaComp==='["IMG1"]', r.sumo.conservaComp);
    chk('⚠️ el cobro nuevo nace CON fecha, así que entra al Cuadre del mes', r.sumo.todosConFecha===true && r.sumo.enCuadreMes===1000, J([r.sumo.todosConFecha, r.sumo.enCuadreMes]));
    // 25/09: deshace solo el de la puerta (la tarjeta sin recibo) y lo dice; los 2 con recibo no se tocan (test_rev_conta §2).
    chk('⚠️ «deshacer» con 3 pagos registrados PREGUNTA antes de borrarlos', r.deshacer.preguntas===1 && /Tarjeta/.test(r.deshacer.texto) && /otros 2 pagos \(con recibo\) NO se tocan/.test(r.deshacer.texto), J(r.deshacer));
    chk('…y si se dice que no, no se borra ninguno', r.deshacer.quedan===3, J(r.deshacer.quedan));
  }

  /* ══ 🚚 EL RECARGO POR ENTREGA (§4fe) ═══════════════════════════════════════════
     Los tres botones del flete no tenían NINGÚN test, y ahí vivían cuatro bugs:
     el pago de la venta entraba como flete, cobrar una parte borraba el resto,
     con dos renglones ✏️ y ✕ pegaban siempre en el primero, y 🗑 nombraba solo uno. */
  {
    const r = await page.evaluate(async () => {
      var base=function(id, metodoPago, saldo, acuenta){
        return P({ id:id, nota:'90'+id, oc:'09-9'+id, vendedor:'Maria Flores', cliente:'FLETE '+id, ts:ts0,
          acuenta:acuenta||0, saldo:saldo, pagado:false, metodoPago:metodoPago,
          productos:[{desc:'A',cant:1,precio:1000}] });
      };
      var out={};
      // (a) anotar el flete y DESPUÉS el pago de la venta: el pago no puede entrar como flete
      STATE=[ base('1','',1000,0) ]; RETIROS=[]; aConta(); await new Promise(r=>setTimeout(r,30));
      showContaModal('1'); ctaSetTipo('1','envio');
      // ⚠️ La imagen del respaldo es OBLIGATORIA (`ctaRegistrarPago` se planta y abre el gato
      // de comprobantes si falta): sin `comps` el pago no se registra y el test miente.
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL1'];
      document.getElementById('cta-pago-monto').value='150';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='973';
      ctaRegistrarPago('1');
      out.trasFlete=CTA_TIPO;
      showContaModal('1');                                  // «Listo, volver a la venta»
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['P1'];
      document.getElementById('cta-pago-monto').value='1000';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='974';
      ctaRegistrarPago('1');
      var p1=findById('1');
      out.pago={ cobrado:totalCobrado(p1), envioCobrado:envioCobrado(p1), saldo:r2(Number(p1.saldo)||0) };
      // (b) flete PACTADO de 100, el cliente da 40: tienen que quedar 60 por cobrar
      STATE=[ base('2','^ 100',1000,0) ]; aConta(); await new Promise(r=>setTimeout(r,30));
      showContaModal('2'); ctaSetTipo('2','envio');
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL2'];
      document.getElementById('cta-pago-monto').value='40';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='701';
      ctaRegistrarPago('2');
      var p2=findById('2');
      out.parcial={ cobrado:envioCobrado(p2), porCobrar:envioPorCobrar(p2), total:envioTotal(p2) };
      // (c) DOS fletes cobrados: corregir el SEGUNDO no puede tocar el primero
      var t=hoy;
      STATE=[ base('3','^Efectivo 60 @'+t+' #995 + ^QR BISA 40 @'+t+' #996',1000,0) ]; aConta(); await new Promise(r=>setTimeout(r,30));
      showContaModal('3');
      var ps=contaPagos(findById('3')), iEnv=[];
      ps.forEach(function(c,i){ if(esEnvio(c)) iEnv.push(i); });
      ctaEditarPago('3', iEnv[1]);                       // el SEGUNDO recargo
      document.getElementById('cta-ed-monto').value='45';
      ctaGuardarPago('3', iEnv[1], true);
      var p3=findById('3');
      out.dos=enviosDe(p3).map(function(c){ return [c.metodo, c.monto, limpiaNota(c.nota)]; });
      // (d) 🗑 Quitar con dos renglones: el confirm los nombra a los dos
      window.__c=[]; var _cf=window.confirm; window.confirm=function(m){ window.__c.push(String(m)); return false; };
      ctaBorrarEnvio('3'); window.confirm=_cf;
      out.borrar={ txt:(window.__c[0]||''), quedan:enviosDe(findById('3')).length };
      return out;
    });
    chk('⚠️ tras anotar un flete el selector vuelve a «Pago de la venta»', r.trasFlete==='pago', r.trasFlete);
    chk('⚠️ …y el pago siguiente entra como PAGO, no como flete (la venta queda saldada)', r.pago.cobrado===1000 && r.pago.envioCobrado===150 && r.pago.saldo===0, J(r.pago));
    chk('⚠️ cobrar 40 de un flete pactado de 100 deja 60 por cobrar (antes desaparecían)', r.parcial.cobrado===40 && r.parcial.porCobrar===60 && r.parcial.total===100, J(r.parcial));
    chk('⚠️ con DOS fletes, corregir el segundo NO toca el primero', J(r.dos)===J([['Efectivo',60,'995'],['QR',45,'996']]), J(r.dos));
    chk('⚠️ 🗑 Quitar nombra el TOTAL y los dos renglones', /Bs 105,00/.test(r.borrar.txt) && /2 renglones/.test(r.borrar.txt), r.borrar.txt.replace(/\n/g,' ').slice(0,110));
    chk('…y si se dice que no, no se borra ninguno', r.borrar.quedan===2, J(r.borrar.quedan));
  }

  /* ══ §4fk — UN PAGO SOBRE UNA VENTA YA PAGADA NO ES UN FLETE ══════════════════════
     La condición era `CTA_TIPO==='envio' || falta<=0.01`: en una venta sin saldo, un pago
     registrado con «💵 Pago de la venta» elegido se guardaba como RECARGO POR ENTREGA sin
     preguntar, con el aviso en verde. En el Excel del contador esos Bs 700 salían en
     «RECARGO COBRADO» y no en lo cobrado de la venta.
     ══ §4fl — y bajar el adelanto a 0 en un pago mixto inventaba un anticipo fantasma. */
  {
    const q = await page.evaluate(async () => {
      var out={}, conf=[];
      var _cf=window.confirm;
      window.confirm=function(m){ conf.push(String(m)); return true; };
      // (a) contabilidad registra otro pago de 700 con tipo «pago» sobre una venta PAGADA.
      /* 25/09: «Pago» solo está a la vista si la ficha se abrió CON saldo (en una venta pagada
         no hay selector y el bloque es el del flete, test_rev_conta §1). Así que se abre con
         saldo y la venta se salda en otro dispositivo antes del toque, como traería la lista. */
      var saldarEnOtro=function(id, txt){ var q=findById(id); q.metodoPago=txt; q.acuenta=0; q.saldo=0; q.pagado=true; };
      STATE=[ P({ id:'K1', nota:'800', oc:'09-800', vendedor:'Maria Flores', cliente:'YA PAGADA', ts:ts0+9,
        acuenta:0, saldo:1000, pagado:false, metodoPago:'',
        productos:[{desc:'A',cant:1,precio:1000}] }) ];
      RETIROS=[]; aConta(); await new Promise(r=>setTimeout(r,30));
      showContaModal('K1');
      saldarEnOtro('K1', '~Efectivo 1000 @'+hoy+' #800 %V1');
      out.tipo=CTA_TIPO;
      CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['QR1'];
      document.getElementById('cta-pago-monto').value='700';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='801';
      ctaRegistrarPago('K1');
      var k1=findById('K1');
      out.pagada={ cobros:cobrosDe(k1).length, envios:enviosDe(k1).length, cobrado:totalCobrado(k1),
                   envCob:envioCobrado(k1), exceso:excesoCobro(k1) };
      out.pregunta=(conf[0]||'');
      // (b) …y si se dice que NO, no se anota nada
      conf.length=0; window.confirm=function(m){ conf.push(String(m)); return false; };
      STATE=[ P({ id:'K2', nota:'802', oc:'09-802', vendedor:'Maria Flores', cliente:'YA PAGADA 2', ts:ts0+10,
        acuenta:0, saldo:1000, pagado:false, metodoPago:'',
        productos:[{desc:'A',cant:1,precio:1000}] }) ];
      aConta(); showContaModal('K2');
      saldarEnOtro('K2', '~Efectivo 1000 @'+hoy+' #802 %V2');
      CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['QR2'];
      document.getElementById('cta-pago-monto').value='700';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='803';
      ctaRegistrarPago('K2');
      var k2=findById('K2');
      out.dijoNo={ cobros:cobrosDe(k2).length, envios:enviosDe(k2).length, txt:k2.metodoPago };
      // (c) el flete de verdad (tipo «envio») sigue entrando como flete, sin preguntar nada
      conf.length=0; window.confirm=function(m){ conf.push(String(m)); return true; };
      STATE=[ P({ id:'K3', nota:'804', oc:'09-804', vendedor:'Maria Flores', cliente:'PAGADA CON FLETE', ts:ts0+11,
        acuenta:0, saldo:0, pagado:true, metodoPago:'~Efectivo 1000 @'+hoy+' #804 %V3',
        productos:[{desc:'A',cant:1,precio:1000}] }) ];
      aConta(); showContaModal('K3'); ctaSetTipo('K3','envio');
      CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL9'];
      document.getElementById('cta-pago-monto').value='150';
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value='805';
      ctaRegistrarPago('K3');
      var k3=findById('K3');
      out.flete={ envCob:envioCobrado(k3), cobros:cobrosDe(k3).length, preguntas:conf.length };
      // (d) §4fl: bajar el A cuenta a 0 en un pago mixto
      STATE=[ P({ id:'K4', nota:'960', oc:'09-960', vendedor:'Maria Flores', cliente:'MIXTO A CERO', ts:ts0+12,
        acuenta:2000, saldo:2990, pagado:false,
        metodoPago:textoCobros([{ anticipo:true, metodo:'Efectivo', monto:1500, fecha:hoy, nota:'960', comps:['M1'] },
                                { anticipo:false, metodo:'QR', banco:'BISA', monto:500, fecha:hoy, nota:'960', comps:['M2'] }]),
        productos:[{desc:'C',cant:1,precio:4990}] }) ];
      aConta(); showContaModal('K4');
      document.getElementById('cta-acuenta').value='0';
      document.getElementById('cta-saldo').value='4990';
      ctaGuardarMontos('K4');
      var k4=findById('K4');
      out.aCero={ acuenta:r2(Number(k4.acuenta)||0), ant:anticipoDe(k4), cobrado:totalCobrado(k4),
                  pagos:contaPagos(k4).length, txt:k4.metodoPago };
      window.confirm=_cf; closeModal();
      return out;
    });
    chk('§4fk · con «Pago de la venta» elegido, el pago NO se guarda como flete', q.pagada.cobros===1 && q.pagada.envios===0 && q.pagada.cobrado===700, J(q.pagada));
    chk('  …se avisa que la venta ya está pagada y se ofrece el botón del flete', /ya está pagada/.test(q.pregunta) && /Recargo por entrega/.test(q.pregunta), q.pregunta.replace(/\n/g,' ').slice(0,130));
    chk('  …y queda marcado como cobro de MÁS, que es lo que es', q.pagada.exceso===700, J(q.pagada.exceso));
    chk('§4fk · si se dice que NO, no se anota nada de nada', q.dijoNo.cobros===0 && q.dijoNo.envios===0, q.dijoNo.txt);
    chk('§4fk · el flete de verdad (🚚 elegido) entra como flete y sin preguntar', q.flete.envCob===150 && q.flete.cobros===0 && q.flete.preguntas===0, J(q.flete));
    chk('§4fl · bajar el A cuenta a 0 en un pago mixto no deja un anticipo FANTASMA', q.aCero.acuenta===0 && q.aCero.ant===null, J({acuenta:q.aCero.acuenta, ant:q.aCero.ant}));
    chk('  …y el 2° método sigue anotado como cobro, una sola vez', q.aCero.cobrado===500 && q.aCero.pagos===1, J({cobrado:q.aCero.cobrado, pagos:q.aCero.pagos, txt:q.aCero.txt}));
  }

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
