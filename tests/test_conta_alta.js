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
    STATE=[P({ id:'G1', nota:'520', oc:'09-520', vendedor:'Carola Chavez', cliente:'DESHACER', ts:ts0+2, acuenta:500, saldo:0, pagado:true,
      metodoPago:textoCobros([{anticipo:true, metodo:'Efectivo', monto:500, fecha:hoy, nota:'520', comps:[]},{metodo:'Efectivo', monto:700, fecha:hoy, nota:'521', comps:[]}]), productos:[{desc:'G',cant:1,precio:1200}] }),
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

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
