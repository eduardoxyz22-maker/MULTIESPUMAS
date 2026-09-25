/* 💰 LOS OCHO BOTONES DE PLATA QUE NO TENÍAN PRUEBA (§4fy)

   El 23/09 una auditoría pasó por los botones que tocan plata y no tenían ningún test: ↺ «Borrar
   los cobros» del chofer, 📎/✕ del recargo por entrega y del editor «Corregir», ✏️ del flete,
   🗑 Eliminar venta, ✅ «registrado en sistema», la ✕ del pago en curso y 💵/📱/💳 de la ficha
   de Administración. Encontró cinco ALTAS, tres MEDIAS y varias BAJAS, y las reprodujo todas.
   Esta prueba deja UNA comprobación por arreglo, armando el estado por los mismos caminos que
   usa la gente (formulario, Contabilidad, ficha del chofer) cuando se puede.

     1. ↺ del chofer: borra SOLO lo cobrado en la puerta, nunca lo que registró Contabilidad o
        la tienda (el QR con recibo, el 2° método del adelanto mixto).
     2. Una imagen que respaldan DOS renglones no va a la papelera al sacarla de uno.
     3. Guardar el pedido desde el formulario no reescribe fletes cobrados.
     4. 📎 / ✕ / ✏️ del flete apuntan al renglón de verdad (orden [pactado, cobrado] y 2° flete).
     5. 🗑 Eliminar venta dice TODA la plata que se lleva.
     6. La marca REGISTRADO sobrevive a una edición desde el formulario.
     7. Lo tipeado en «Registrar un pago» no se pierde al tocar ✕, ✅ o ✏️.
     8. 📱 QR de Administración con su banco, y ni una ATC ni una RPT se cobran.

   Se corre:  node tests/test_botones.js
   Dientes:   PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_botones.js                  */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  /* Los diálogos se contestan desde Node: un page.evaluate() dentro del handler se cuelga,
     porque el diálogo tiene la página trabada. */
  const D = { confirm:true, promptVal:'', vistos:[] };
  page.on('dialog', async d => {
    D.vistos.push(d.message());
    if (d.type()==='prompt') await d.accept(String(D.promptVal));
    else if (D.confirm===false) await d.dismiss();
    else await d.accept();
  });
  await page.route(/^https?:/, r=>r.abort());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true;
    CARGA_GEN++; CARGA_ESTADO='ok';
    if(CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    if(typeof MIS_TIMER!=='undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
    apiSave=function(r){ return Promise.resolve({ok:true}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    window._borradas=[];
    apiBorrarFoto=function(f){ window._borradas.push(f); return Promise.resolve({ok:true}); };
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    window._toasts=[]; var _t=toast; toast=function(m,k,ms){ window._toasts.push(String(k||'')+': '+String(m)); return _t(m,k,ms); };
    downloadBlob=function(){};
    var al=document.getElementById('admin-lock'); if(al) al.style.display='none';
    var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
    window.fotoCronometro=function(){ return Promise.resolve('data:image/jpeg;base64,AA'); };
    window.subir=async function(id, fotoId){
      window.subirFoto=function(){ return Promise.resolve({ok:true, fotoId:fotoId, version:'x'}); };
      onCompElegido({ target:{ files:[{name:'x.jpg'}], dataset:{pedido:id} } });
      await new Promise(function(r){ setTimeout(r,150); });
    };
    window.hoy=todayStr();
    var d1=new Date(); d1.setDate(d1.getDate()-1); window.ayer=isoLocal(d1);
    var d2=new Date(); d2.setDate(d2.getDate()+2); window.pasado=isoLocal(d2);
    while(diaDomingo(window.pasado) || diaCerrado(window.pasado)){ d2.setDate(d2.getDate()+1); window.pasado=isoLocal(d2); }
    window.ts0=new Date(new Date().setHours(12,0,0,0)).getTime();
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:window.pasado, maps:'', observaciones:'', garantia:'', facturarA:'',
              estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1, fotos:[], vendedor:'Carola Chavez', ts:window.ts0,
              productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:1500}] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
    window.envs=function(p){ return enviosDe(p).map(function(c){ return { met:c.metodo||'', monto:Number(c.monto)||0, nota:limpiaNota(c.nota), comps:compsArr(c.comps!=null?c.comps:c.comp) }; }); };
    window.aConta=function(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta(); };
    /* Contabilidad anota un flete cobrado, como la persona: tipo «recargo», método, imagen, campos. */
    window.fleteCobrar=function(id, monto, nota, met){
      showContaModal(id); ctaSetTipo(id,'envio');
      CTA_PAGO.metodo=met||'Efectivo'; if(met==='QR') CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['C'+nota];
      showContaModal(id);
      document.getElementById('cta-pago-monto').value=String(monto);
      document.getElementById('cta-pago-fecha').value=hoy;
      document.getElementById('cta-pago-nota').value=nota;
      ctaRegistrarPago(id); showContaModal(id);
    };
    window.ponerPorCobrar=function(id, v){ showContaModal(id); ctaEditarEnvio(id,1); document.getElementById('cta-env-monto').value=String(v); ctaGuardarEnvio(id); };
    /* La vendedora abre el pedido desde «Mis pedidos», cambia algo y guarda. */
    window.editarForm=async function(id, cambios){
      window._toasts=[]; resetForm(); editarDesdeMis(id); await new Promise(function(r){ setTimeout(r,250); });
      var f={ envio:document.getElementById('f-envio').value, cob:segVal('f-envio-cob') };
      (cambios||function(){ document.getElementById('f-direccion').value='Av. Corregida 123'; })();
      submitPedido(); await new Promise(function(r){ setTimeout(r,450); });
      return f;
    };
    /* Una venta NUEVA por el formulario, como la vendedora (el mismo camino que test_mixto.js). */
    window.cargarForm=async function(o){
      resetForm(); EDIT_ID=null; STATE=[]; RETIROS=[];
      document.getElementById('f-vendedor').value='Carola Chavez'; applyVendedorLite();
      document.getElementById('f-cliente').value=o.cliente; document.getElementById('f-celular').value='70000000';
      document.getElementById('f-zona').value='Norte'; document.getElementById('f-direccion').value='Av. Prueba 1';
      document.getElementById('f-fecha').value=pasado; segSet('f-turno','AM');
      document.getElementById('f-nota').value=o.nota;
      document.querySelector('#f-productos .prod-desc').value='COLCHON SOFT';
      document.querySelector('#f-productos .prod-medida').value='140x190'; document.querySelector('#f-productos .prod-cant').value='1';
      segSet('f-pagado', o.pagado?'SI':'NO'); updateMetodoVisibility();
      if(o.pagado) document.getElementById('f-cobrado').value=o.total;
      else { document.getElementById('f-acuenta').value=o.acuenta; document.getElementById('f-saldo').value=o.saldo; updateMetodoVisibility(); }
      segSet('f-metodo', o.m1); updateBancoVisibility(); if(o.b1) segSet('f-banco', o.b1);
      FORM_COMPS=o.comps.slice(); renderCompForm(true);
      if(o.m2){ toggleMixto(true); segSet('f-metodo2', o.m2); pintarMixto(); if(o.b2) segSet('f-banco2', o.b2);
                document.getElementById('f-monto2').value=o.monto2; FORM_COMPS2=[o.nota+'_2']; pintarMixto(); }
      if(o.envio){ document.getElementById('f-envio').value=o.envio; pintarEnvioCobrado(); segSet('f-envio-cob','SI'); pintarEnvioCobrado(); }
      window._toasts=[]; submitPedido(); await new Promise(function(r){ setTimeout(r,450); });
      var p=STATE.filter(function(x){ return x.cliente===o.cliente; })[0];
      return p ? p.id : ('NO SE GUARDÓ: '+window._toasts.join(' | '));
    };
    window.tarjetaChofer=function(id){
      CHO_FILTER='todos'; CHO_TODOS=false;
      llenarSelectChoferes(); document.getElementById('cho-nombre').value='Luis Pierre';
      renderChofer();
      var p=findById(id);
      var card=[].slice.call(document.querySelectorAll('#cho-lista .cho-card')).filter(function(c){ return c.textContent.indexOf(p.cliente)>=0; })[0];
      return { hay:!!card, boton:!!card && card.innerHTML.indexOf('choDeshacerCobro')>=0,
               equis:card ? (card.innerHTML.match(/choQuitarCobro\(/g)||[]).length : -1,
               texto:cobroChoferHtml(p).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() };
    };
  });

  // ══ 1. ↺ «Borrar los cobros» del chofer ═══════════════════════════════════════════
  // 1a · Contabilidad registró un QR de 600 (recibo 701, con captura) y el chofer cobró 400.
  D.confirm=true; D.promptVal='400';
  await page.evaluate(async () => {
    STATE=[P({ id:'D1', nota:'700', oc:'09-700', cliente:'CLIENTE DESHACER', chofer:'Luis Pierre', vehiculo:'Carry', fecha:hoy,
      acuenta:500, saldo:1000, pagado:false, metodoPago:'~Efectivo 500 @'+ayer+' #700 %A1' })];
    RETIROS=[]; aConta(); await new Promise(function(r){ setTimeout(r,60); });
    showContaModal('D1'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['Q1']; showContaModal('D1');
    document.getElementById('cta-pago-monto').value='600';
    document.getElementById('cta-pago-fecha').value=ayer;
    document.getElementById('cta-pago-nota').value='701';
    ctaRegistrarPago('D1'); closeModal();
  });
  await page.evaluate(() => { choCobrarMetodo('D1','Efectivo'); });
  let r = await page.evaluate(() => tarjetaChofer('D1'));
  chk('1a · (partida) el chofer ve «↺ Borrar los cobros» porque cobró algo', r.boton, r.texto);
  chk('1a · y el QR que registró Contabilidad NO tiene ✕ en su tarjeta: solo el suyo', r.equis===1, r.equis);
  D.vistos.length=0;
  r = await page.evaluate(() => { window._borradas=[]; choDeshacerCobro('D1'); var p=findById('D1');
    return { txt:p.metodoPago, saldo:p.saldo, pagado:p.pagado, borradas:window._borradas.slice() }; });
  chk('1a · ⚠️ ↺ NO se lleva el QR de 600 que registró Contabilidad (recibo 701 y su captura)', /QR BISA 600 @\S+ #701 %Q1/.test(r.txt), r.txt);
  chk('  …se borra solo el efectivo del chofer: el saldo vuelve a 400, no a 1.000', r.saldo===400 && r.txt.indexOf('Efectivo 400')<0, r);
  chk('  …y el confirm nombra QUÉ se borra, cuánto, y que lo registrado no se toca', D.vistos.length===1 && /Efectivo Bs 400/.test(D.vistos[0]) && /Total: Bs 400/.test(D.vistos[0]) && /NO se toca/.test(D.vistos[0]), D.vistos);

  // 1b · adelanto MIXTO cargado por el formulario (Efectivo 1.500 + QR BISA 500, mismo recibo).
  let id = await page.evaluate(() => cargarForm({ cliente:'MIXTO ADELANTO', nota:'800', pagado:false, acuenta:2000, saldo:2990, m1:'Efectivo', comps:['800_1'], m2:'QR', b2:'BISA', monto2:500 }));
  await page.evaluate((id) => { setChofer(id,'Luis Pierre'); }, id);
  r = await page.evaluate((id) => tarjetaChofer(id), id);
  chk('1b · con el adelanto mixto, ANTES de cobrar nada el chofer no ve «↺ Borrar los cobros»', r.hay && !r.boton, r.texto);
  chk('  …ni lee «ya cobraste Bs 500»: dice «ya entraron»', !/ya cobraste/.test(r.texto) && /ya entraron/.test(r.texto), r.texto);
  r = await page.evaluate((id) => { window._toasts=[]; choDeshacerCobro(id); var p=findById(id); return { txt:p.metodoPago, saldo:p.saldo, toasts:window._toasts.slice() }; }, id);
  chk('  …y si igual se llama, el 2° método del ADELANTO (QR BISA 500) queda y el saldo sigue 2.990', r.txt.indexOf('QR BISA 500')>=0 && r.saldo===2990 && r.toasts.some(function(t){ return /^err:/.test(t); }), r);

  // 1c · venta mixta «SÍ, pagado» en la tienda (QR 3.000 + Tarjeta 1.990).
  id = await page.evaluate(() => cargarForm({ cliente:'MIXTO PAGADO', nota:'1800', pagado:true, total:4990, m1:'QR', b1:'BISA', comps:['1800_1'], m2:'Tarjeta', monto2:1990 }));
  r = await page.evaluate((id) => { choDeshacerCobro(id); var p=findById(id); return { pagado:p.pagado, saldo:p.saldo, txt:p.metodoPago }; }, id);
  chk('1c · ⚠️ una venta pagada ENTERA en la tienda (mixto) sigue PAGADA: no se le vuelve a cobrar', r.pagado===true && r.saldo===0 && /Tarjeta 1990/.test(r.txt), r);

  // 1d · ✕ de un pago con recibo desde la ficha del chofer.
  r = await page.evaluate(() => {
    STATE=[P({ id:'D2', nota:'710', oc:'09-710', cliente:'CON RECIBO', chofer:'Luis Pierre', vehiculo:'Carry', fecha:hoy, acuenta:0, saldo:400, pagado:false,
      metodoPago:'QR BISA 600 @'+ayer+' #711 %Q2', productos:[{desc:'A',cant:1,precio:1000}] })];
    window._toasts=[]; choQuitarCobro('D2', 0); var p=findById('D2');
    return { txt:p.metodoPago, toasts:window._toasts.slice() };
  });
  chk('1d · la ✕ del chofer no borra un pago con recibo (lo registró Contabilidad) y lo dice', /QR BISA 600/.test(r.txt) && r.toasts.some(function(t){ return /^err:.*Contabilidad/.test(t); }), r);

  // 1e · «PAGADA sin monto» en el dispositivo que la cargó (con `cobradoBs`).
  r = await page.evaluate(() => {
    STATE=[P({ id:'D3', nota:'905', oc:'09-905', cliente:'SIN MONTO CHOFER', chofer:'Luis Pierre', vehiculo:'Carry', fecha:hoy,
      acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMG5', cobradoBs:1500 })];
    var t=tarjetaChofer('D3'); choDeshacerCobro('D3'); var p=findById('D3');
    return { boton:t.boton, pagado:p.pagado, saldo:p.saldo };
  });
  chk('1e · una «PAGADA sin monto» no ofrece ↺ y no queda DEBIENDO Bs 1.500', !r.boton && r.pagado===true && !(r.saldo>0), r);

  // ══ 2. Una imagen que respaldan DOS renglones ═════════════════════════════════════
  // 2a · formulario «SÍ, pagado» + flete «¿ya lo cobraste? SÍ»: el flete hereda la imagen del pago.
  id = await page.evaluate(() => cargarForm({ cliente:'IMAGEN COMPARTIDA', nota:'1900', pagado:true, total:1500, m1:'Efectivo', comps:['IMG_V'], envio:'80' }));
  r = await page.evaluate((id) => { var p=findById(id); return { txt:p.metodoPago, n:p.metodoPago.split('%IMG_V').length-1 }; }, id);
  chk('2a · (partida) el pago de la venta y el flete comparten la MISMA imagen', r.n===2, r.txt);
  D.confirm=true;
  r = await page.evaluate((id) => {
    window._borradas=[]; aConta(); showContaModal(id);
    var p=findById(id), i=-1; contaPagos(p).forEach(function(c,j){ if(esEnvio(c) && i<0) i=j; });
    ctaEnvioQuitarComp(id, ctaIdxEnvio(p,i), 0);
    p=findById(id);
    return { borradas:window._borradas.slice(), ant:compsArr(anticipoDe(p).comps), flete:envs(p)[0].comps };
  }, id);
  chk('2a · ⚠️ ✕ a la imagen del FLETE no manda a la papelera el comprobante del PAGO DE LA VENTA', r.borradas.indexOf('IMG_V')<0 && r.ant.indexOf('IMG_V')>=0, r);
  chk('  …pero sí la saca del flete', r.flete.indexOf('IMG_V')<0, r.flete);

  // 2b · 🗑 Quitar el recargo de una venta por QR con captura + recibo.
  id = await page.evaluate(() => cargarForm({ cliente:'QUITAR RECARGO', nota:'1901', pagado:true, total:1500, m1:'QR', b1:'BISA', comps:['IMG_W','IMG_W2'], envio:'80' }));
  r = await page.evaluate((id) => {
    window._borradas=[]; aConta(); showContaModal(id); ctaBorrarEnvio(id); var p=findById(id);
    return { borradas:window._borradas.slice(), ant:compsArr(anticipoDe(p).comps), env:enviosDe(p).length };
  }, id);
  chk('2b · ⚠️ 🗑 Quitar el recargo no se lleva de Drive la captura del QR y el recibo de la venta', r.env===0 && r.borradas.length===0 && r.ant.join()==='IMG_W,IMG_W2', r);

  // 2c · al revés: ✕ a la imagen del ADELANTO desde «Corregir» con el flete usándola.
  id = await page.evaluate(() => cargarForm({ cliente:'QUITAR ADELANTO', nota:'1902', pagado:true, total:1500, m1:'Efectivo', comps:['IMG_X'], envio:'80' }));
  r = await page.evaluate((id) => {
    window._borradas=[]; aConta(); showContaModal(id); ctaEditarPago(id, 0); ctaQuitarCompEdit(id, 0, 0); var p=findById(id);
    return { borradas:window._borradas.slice(), flete:envs(p)[0].comps };
  }, id);
  chk('2c · ✕ a la imagen del ADELANTO no deja al flete apuntando a un archivo en la papelera', r.borradas.indexOf('IMG_X')<0 && r.flete.indexOf('IMG_X')>=0, r);

  // 2d · control: una imagen que NADIE más usa sí se manda a la papelera.
  r = await page.evaluate(() => {
    STATE=[P({ id:'F2', nota:'995', oc:'09-995', cliente:'DOS FLETES', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 1500 @'+hoy+' #995 %V1 + ^Efectivo 60 @'+hoy+' #995 %FL1 + ^QR BISA 40 @'+hoy+' #996 %FL2' })];
    aConta(); showContaModal('F2'); window._borradas=[];
    var p=findById('F2'), idx=[]; contaPagos(p).forEach(function(c,i){ if(esEnvio(c)) idx.push(i); });
    ctaEnvioQuitarComp('F2', ctaIdxEnvio(p, idx[1]), 0);
    return { borradas:window._borradas.slice(), envs:envs(findById('F2')) };
  });
  chk('2d · (control) la imagen que solo usaba ESE flete sí va a la papelera, y la del otro no', r.borradas.join()==='FL2' && r.envs[0].comps.join()==='FL1' && r.envs[1].comps.length===0, r);

  // ══ 3. Guardar desde el formulario no reescribe fletes cobrados ═══════════════════
  // 3a · por cobrar 100 → el cliente paga 40 en efectivo y después 60 por QR → se corrige la DIRECCIÓN.
  await page.evaluate(() => {
    STATE=[P({ id:'H4', nota:'703', oc:'09-703', cliente:'CADENA', acuenta:0, saldo:0, pagado:true, metodoPago:'~Efectivo 1500 @'+hoy+' #703 %V4' })];
    RETIROS=[]; aConta(); ponerPorCobrar('H4', 100); fleteCobrar('H4', 40, '704', 'Efectivo'); fleteCobrar('H4', 60, '705', 'QR');
  });
  let f = await page.evaluate(() => editarForm('H4'));
  r = await page.evaluate(() => { var p=findById('H4'); return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p), dir:p.direccion }; });
  chk('3a · ⚠️ venta pagada con DOS fletes cobrados: corregir la dirección deja 40 + 60 (no 100 + 60)',
      r.dir==='Av. Corregida 123' && r.cob===100 && r.pend===0 && r.envs.length===2 && r.envs[0].met==='Efectivo' && r.envs[0].monto===40 && r.envs[0].comps.join()==='C704', { formulario:f, envs:r.envs });

  // 3b · lo mismo con la venta que todavía DEBE (el «¿ya lo cobraste?» no está a la vista).
  await page.evaluate(() => {
    STATE=[P({ id:'H5', nota:'706', oc:'09-706', cliente:'CADENA DEBE', acuenta:0, saldo:1500, pagado:false, metodoPago:'' })];
    RETIROS=[]; aConta(); ponerPorCobrar('H5', 100); fleteCobrar('H5', 40, '707', 'Efectivo'); fleteCobrar('H5', 60, '708', 'QR');
  });
  f = await page.evaluate(() => editarForm('H5'));
  r = await page.evaluate(() => { var p=findById('H5'); return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p), dir:p.direccion }; });
  chk('3b · ⚠️ venta que DEBE: corregir la dirección no le saca el cobro ni la imagen al flete de 40 ni lo manda a cobrar de nuevo',
      r.dir==='Av. Corregida 123' && r.cob===100 && r.pend===0 && r.envs[0].comps.join()==='C707', { formulario:f, envs:r.envs });

  // 3c · UN solo flete cobrado y la venta debe: el «NO» que pone el formulario no lo eligió nadie.
  await page.evaluate(() => {
    STATE=[P({ id:'H6', nota:'712', oc:'09-712', cliente:'UN FLETE DEBE', acuenta:0, saldo:1500, pagado:false,
      metodoPago:'^QR BISA 80 @'+hoy+' #713 %FL6' })];
  });
  f = await page.evaluate(() => editarForm('H6'));
  r = await page.evaluate(() => { var p=findById('H6'); return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p) }; });
  chk('3c · un flete cobrado con el «¿ya lo cobraste?» ESCONDIDO sigue cobrado (método, recibo e imagen)',
      r.cob===80 && r.pend===0 && r.envs[0].met==='QR' && r.envs[0].nota==='713' && r.envs[0].comps.join()==='FL6', { formulario:f, envs:r.envs });

  // 3d · control: con el control A LA VISTA, el «NO» elegido a mano sí lo vuelve a «por cobrar».
  await page.evaluate(() => {
    STATE=[P({ id:'H7', nota:'714', oc:'09-714', cliente:'NO ELEGIDO', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 1500 @'+hoy+' #714 %V7 + ^Efectivo 80 @'+hoy+' #714 %FL7' })];
  });
  f = await page.evaluate(() => editarForm('H7', function(){
    var w=document.getElementById('wrap-envio-cob'); window._visible=!!(w && w.style.display!=='none');
    segSet('f-envio-cob','NO'); pintarEnvioCobrado();
  }));
  r = await page.evaluate(() => { var p=findById('H7'); return { visible:window._visible, cob:envioCobrado(p), pend:envioPorCobrar(p) }; });
  chk('3d · (control) con el control a la vista, el «NO» elegido a mano sigue pasando el flete a «por cobrar»', r.visible && r.cob===0 && r.pend===80, { formulario:f, r:r });

  // 3e · dos cobrados y se SUBE el flete a 150: los cobrados quedan y aparece un pactado de 50.
  await page.evaluate(() => {
    STATE=[P({ id:'H8', nota:'715', oc:'09-715', cliente:'SUBE FLETE', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 1500 @'+hoy+' #715 %V8 + ^Efectivo 40 @'+hoy+' #716 %C716 + ^QR BISA 60 @'+hoy+' #717 %C717' })];
  });
  f = await page.evaluate(() => editarForm('H8', function(){ document.getElementById('f-envio').value='150'; segSet('f-envio-cob','NO'); pintarEnvioCobrado(); }));
  r = await page.evaluate(() => { var p=findById('H8'); return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p) }; });
  chk('3e · subir el flete con dos cobrados: los dos quedan tal cual y lo nuevo (50) queda por cobrar',
      r.cob===100 && r.pend===50 && r.envs[0].monto===40 && r.envs[1].monto===60, { formulario:f, envs:r.envs });

  // 3f · control: UN flete cobrado con el control a la vista y «SÍ»: el monto se sigue corrigiendo (§4eu).
  await page.evaluate(() => {
    STATE=[P({ id:'H9', nota:'718', oc:'09-718', cliente:'CORRIGE FLETE', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 1500 @'+hoy+' #718 %V9 + ^Efectivo 80 @'+hoy+' #718 %FL9' })];
  });
  D.vistos.length=0;
  f = await page.evaluate(() => editarForm('H9', function(){ document.getElementById('f-envio').value='50'; }));
  r = await page.evaluate(() => { var p=findById('H9'); return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p) }; });
  chk('3f · (control) un solo flete cobrado, control a la vista: corregir 80 → 50 sigue andando, sin preguntar',
      r.cob===50 && r.pend===0 && r.envs.length===1 && r.envs[0].comps.join()==='FL9' && D.vistos.length===0, { formulario:f, envs:r.envs, dialogos:D.vistos });

  // 3g · DOS fletes cobrados (40 + 60) y alguien pone 80: no se sabe de cuál bajar → se pregunta.
  const dosCobrados = () => page.evaluate(() => {
    STATE=[P({ id:'H10', nota:'719', oc:'09-719', cliente:'BAJA FLETE', acuenta:0, saldo:0, pagado:true, direccion:'Vieja 1',
      metodoPago:'~Efectivo 1500 @'+hoy+' #719 %V10 + ^Efectivo 40 @'+hoy+' #720 %C720 + ^QR BISA 60 @'+hoy+' #721 %C721' })];
  });
  const bajarA80 = () => page.evaluate(() => editarForm('H10', function(){
    document.getElementById('f-envio').value='80'; document.getElementById('f-direccion').value='Av. Corregida 123'; }));
  await dosCobrados(); D.vistos.length=0; D.confirm=false;
  await bajarA80(); D.confirm=true;
  r = await page.evaluate(() => { var p=findById('H10'); return { dir:p.direccion, cob:envioCobrado(p) }; });
  chk('3g · bajar el flete por debajo de lo COBRADO (dos renglones) lo dice y, con «Cancelar», no guarda nada',
      D.vistos.some(function(m){ return /ya tiene Bs 100,00 COBRADOS/.test(m) && /Contabilidad/.test(m); }) && r.dir==='Vieja 1' && r.cob===100, { dialogos:D.vistos, r:r });
  await dosCobrados(); D.vistos.length=0;
  await bajarA80();
  r = await page.evaluate(() => { var p=findById('H10'); return { dir:p.direccion, envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p) }; });
  chk('  …y con «Aceptar» guarda lo demás y el flete cobrado queda entero (40 + 60)',
      r.dir==='Av. Corregida 123' && r.cob===100 && r.pend===0 && r.envs.length===2 && r.envs[0].monto===40, r);

  // ══ 4. El flete correcto: orden [pactado, cobrado] y el 2° flete ══════════════════
  // 4a · ✏️ Corregir el QR de 60 → 65 con un PACTADO de 100 adelante.
  r = await page.evaluate(() => {
    STATE=[P({ id:'K1', nota:'709', oc:'09-709', cliente:'ORDEN', acuenta:0, saldo:1500, pagado:false,
      metodoPago:'^100 + ^QR BISA 60 @'+hoy+' #705 %C705' })];
    CTA_EDIT_I=-1; CTA_EDIT_V=null; aConta(); showContaModal('K1');
    var p=findById('K1'), i=-1; contaPagos(p).forEach(function(c,j){ if(esEnvio(c) && i<0) i=j; });
    ctaEditarPago('K1', i);
    document.getElementById('cta-ed-monto').value='65';
    document.getElementById('cta-ed-fecha').value=hoy;
    document.getElementById('cta-ed-nota').value='705';
    ctaGuardarPago('K1', i);
    p=findById('K1');
    return { envs:envs(p), cob:envioCobrado(p), pend:envioPorCobrar(p) };
  });
  chk('4a · ⚠️ con [pactado 100, QR 60], corregir el QR a 65 cambia EL QR: cobrado 65 y siguen 100 por cobrar',
      r.cob===65 && r.pend===100 && r.envs.length===2 && !r.envs[0].met && r.envs[0].monto===100 && r.envs[1].met==='QR' && r.envs[1].monto===65, r);

  // 4b · mismo orden: ✕ y 📎 de la fila del QR cobrado.
  D.confirm=true;
  r = await page.evaluate(async () => {
    STATE=[P({ id:'K2', nota:'709', oc:'09-719', cliente:'ORDEN 2', acuenta:0, saldo:1500, pagado:false,
      metodoPago:'^100 + ^QR BISA 60 @'+hoy+' #705 %C705' })];
    CTA_EDIT_I=-1; aConta(); showContaModal('K2');
    var p=findById('K2'), i=-1; contaPagos(p).forEach(function(c,j){ if(esEnvio(c) && i<0) i=j; });
    var e=ctaIdxEnvio(p,i);
    window._borradas=[];
    ctaEnvioQuitarComp('K2', e, 0);
    var trasQuitar={ envs:envs(findById('K2')), borradas:window._borradas.slice() };
    ctaEnvioAdjuntar('K2', ctaIdxEnvio(findById('K2'), i)); await subir('K2','NUEVA');
    return { e:e, trasQuitar:trasQuitar, trasAdjuntar:envs(findById('K2')) };
  });
  chk('4b · la ✕ saca la imagen del QR cobrado (y no hace nada con el pactado)', r.e===1 && r.trasQuitar.envs[1].comps.length===0 && r.trasQuitar.borradas.join()==='C705', r.trasQuitar);
  chk('  …y el 📎 se la pone al QR cobrado, no al pactado', r.trasAdjuntar[1].comps.join()==='NUEVA' && r.trasAdjuntar[0].comps.length===0, r.trasAdjuntar);

  // 4c · 📎 DENTRO del editor «Corregir» del SEGUNDO flete, y por el camino del gato.
  await page.evaluate(() => {
    window.dosFletes=function(){
      STATE=[P({ id:'G1', nota:'995', oc:'09-995', cliente:'DOS FLETES', acuenta:0, saldo:0, pagado:true,
        metodoPago:'~Efectivo 1500 @'+hoy+' #995 %V1 + ^Efectivo 60 @'+hoy+' #995 %FL1 + ^QR BISA 40 @'+hoy+' #996' })];
      RETIROS=[]; CTA_EDIT_I=-1; CTA_EDIT_V=null; aConta(); showContaModal('G1');
      var p=findById('G1'), idx=[]; contaPagos(p).forEach(function(c,i){ if(esEnvio(c)) idx.push(i); });
      return idx;
    };
  });
  r = await page.evaluate(async () => {
    var i2=dosFletes()[1];
    ctaEditarPago('G1', i2); ctaAdjuntarEdit('G1', i2); await subir('G1','QR40');
    return envs(findById('G1'));
  });
  chk('4c · ⚠️ 📎 en el editor del 2° flete: la captura del QR 40 queda en el QR 40, no en el efectivo de 60', r[1].comps.join()==='QR40' && r[0].comps.join()==='FL1', r);
  r = await page.evaluate(async () => {
    var i2=dosFletes()[1];
    ctaEditarPago('G1', i2);
    document.getElementById('cta-ed-fecha').value=hoy; document.getElementById('cta-ed-nota').value='996';
    ctaGuardarPago('G1', i2); closeModal(); ctaAdjuntarDespues('G1', i2);
    await new Promise(function(r){ setTimeout(r,20); });
    await subir('G1','QR40B');
    return envs(findById('G1'));
  });
  chk('  …y por el gato («📎 Ya la adjunto») también va al 2°', r[1].comps.indexOf('QR40B')>=0 && r[0].comps.join()==='FL1', r);

  // 4d · el tope de 4 imágenes se mide en EL flete elegido.
  r = await page.evaluate(async () => {
    window._toasts=[];
    STATE=[P({ id:'F3', nota:'997', oc:'09-997', cliente:'TOPE', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~Efectivo 1500 @'+hoy+' #997 %V1 + ^Efectivo 60 @'+hoy+' #997 %A1 %A2 %A3 %A4 + ^QR BISA 40 @'+hoy+' #998 %B1' })];
    aConta(); showContaModal('F3');
    var p=findById('F3'), idx=[]; contaPagos(p).forEach(function(c,i){ if(esEnvio(c)) idx.push(i); });
    ctaEnvioAdjuntar('F3', ctaIdxEnvio(p, idx[1])); await subir('F3','B2');
    return { envs:envs(findById('F3')), toasts:window._toasts.slice() };
  });
  chk('4d · el 2° flete (1 imagen) acepta otra aunque el 1° ya tenga 4', r.envs[1].comps.join()==='B1,B2' && r.envs[0].comps.length===4, r);

  // ══ 5. 🗑 Eliminar venta dice TODA la plata ═══════════════════════════════════════
  const eliminar = async (arma) => {
    D.vistos.length=0; D.confirm=false;              // se rechaza la 1ª: acá se mira solo QUÉ dice
    await page.evaluate(arma);
    await page.evaluate(() => { var id=STATE[0].id; aConta(); showContaModal(id); ctaEliminarVenta(id); });
    D.confirm=true;
    return D.vistos.slice();
  };
  let dl = await eliminar(() => {
    STATE=[P({ id:'E1', nota:'900', oc:'09-900', cliente:'CLIENTE UNO', acuenta:1000, saldo:500, pagado:false,
      metodoPago:'~Efectivo 1000 @'+hoy+' #900 %A1 + ^Efectivo 80 @'+hoy+' #900 %FL1' })];
  });
  chk('5a · adelanto 1.000 + flete cobrado 80: el aviso dice 1.080 y que incluye el flete', /1\.080/.test(dl[0]||'') && /flete cobrado/.test(dl[0]||''), dl);
  // Solo el flete cobrado: esta vez se acepta la 1ª para ver que pide la 2ª.
  D.vistos.length=0; D.confirm=true;
  let n=0; const h = async () => { n++; if(n===1) D.confirm=false; };
  page.on('dialog', h);
  r = await page.evaluate(() => {
    STATE=[P({ id:'E2', nota:'901', oc:'09-901', cliente:'CLIENTE DOS', acuenta:0, saldo:1500, pagado:false,
      metodoPago:'^QR BISA 150 @'+hoy+' #901 %FL2' })];
    aConta(); showContaModal('E2'); ctaEliminarVenta('E2'); return !!findById('E2');
  });
  page.off('dialog', h); D.confirm=true;
  chk('5b · ⚠️ con SOLO Bs 150 de flete cobrado lo nombra y pide la 2ª confirmación (y el NO se respeta)', D.vistos.length===2 && /150/.test(D.vistos[0]) && r===true, D.vistos);
  dl = await eliminar(() => {
    STATE=[P({ id:'E3', nota:'902', oc:'09-902', cliente:'CLIENTE TRES', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMGV' })];
  });
  chk('5c · una «PAGADA sin monto» no se borra con un aviso callado: dice que está PAGADA', /PAGADA/.test(dl[0]||''), dl);
  dl = await eliminar(() => {
    STATE=[P({ id:'E4', nota:'903', oc:'09-903', cliente:'CLIENTE CUATRO', acuenta:0, saldo:0, pagado:true,
      metodoPago:'~QR BISA 1500 @'+hoy+' #903 %R1 · REGISTRADO' })];
  });
  chk('5d · una venta ✅ REGISTRADA avisa que ya está cargada en el sistema contable', /sistema contable/.test(dl[0]||''), dl);

  // ══ 6. La marca REGISTRADO y el formulario ═════════════════════════════════════════
  r = await page.evaluate(async () => {
    STATE=[P({ id:'R5', nota:'500', oc:'09-505', cliente:'SUELTO REG', acuenta:500, saldo:1000, pagado:false, metodoPago:'QR BISA %A5 · REGISTRADO' })];
    RETIROS=[]; await editarForm('R5'); var p=findById('R5');
    return { txt:p.metodoPago, reg:regEnSistema(p), dir:p.direccion };
  });
  chk('6a · ⚠️ corregir SOLO la dirección de una venta con adelanto suelto no le borra ✅ REGISTRADO', r.reg===true && r.dir==='Av. Corregida 123' && /%A5/.test(r.txt), r);
  r = await page.evaluate(async () => {
    STATE=[P({ id:'R6', nota:'500', oc:'09-506', cliente:'SIN MONTO REG', acuenta:0, saldo:0, pagado:true, metodoPago:'Efectivo %IMG6 · REGISTRADO' })];
    await editarForm('R6', function(){ document.getElementById('f-direccion').value='Av. Corregida 123'; document.getElementById('f-cobrado').value='1500'; });
    var p=findById('R6'); return { txt:p.metodoPago, reg:regEnSistema(p) };
  });
  chk('6b · «PAGADA sin monto» registrada: anotar el monto que pide el formulario no le borra la marca', r.reg===true, r);
  r = await page.evaluate(async () => {
    STATE=[P({ id:'R8', nota:'500', oc:'09-508', cliente:'SIN FLETE', acuenta:500, saldo:1000, pagado:false, metodoPago:'~QR BISA 500 @'+ayer+' #500 %A8 · REGISTRADO' }),
           P({ id:'R9', nota:'501', oc:'09-509', cliente:'CON FLETE', acuenta:500, saldo:1000, pagado:false, metodoPago:'~QR BISA 500 @'+ayer+' #501 %A9 + ^100 · REGISTRADO' })];
    var cambiar=function(){ document.getElementById('f-acuenta').value='600'; document.getElementById('f-saldo').value='900'; };
    await editarForm('R8', cambiar); await editarForm('R9', cambiar);
    return { sin:regEnSistema(findById('R8')), con:regEnSistema(findById('R9')) };
  });
  chk('6c · cambiar el adelanto desde el formulario conserva la marca, con flete y sin flete', r.sin===true && r.con===true, r);
  r = await page.evaluate(async () => {
    STATE=[P({ id:'R7', nota:'500', oc:'09-507', cliente:'NO REG', acuenta:500, saldo:1000, pagado:false, metodoPago:'QR BISA %A7' })];
    await editarForm('R7'); return regEnSistema(findById('R7'));
  });
  chk('6d · (control) a una venta que NO estaba registrada el formulario no le inventa la marca', r===false, r);

  // ══ 7. Lo tipeado en «Registrar un pago» ═══════════════════════════════════════════
  await page.evaluate(() => {
    window.campos=function(){ return { monto:document.getElementById('cta-pago-monto').value, fecha:document.getElementById('cta-pago-fecha').value, nota:document.getElementById('cta-pago-nota').value }; };
    window.nueva=function(id){
      STATE=[P({ id:id, nota:'500', oc:'09-5'+id.slice(-1), cliente:'CLIENTE '+id, ts:ts0-3*86400000,
        acuenta:500, saldo:1000, pagado:false, metodoPago:'~Efectivo 500 @'+ayer+' #500 %A0' })];
      RETIROS=[]; CTA_ULTIMA=''; CTA_EDIT_I=-1; CTA_EDIT_V=null; aConta(); showContaModal(id);
    };
    window.tipear=function(){
      document.getElementById('cta-pago-monto').value='400';
      document.getElementById('cta-pago-fecha').value=ayer;
      document.getElementById('cta-pago-nota').value='510';
    };
  });
  r = await page.evaluate(async () => {
    nueva('S1'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; showContaModal('S1');
    ctaAdjuntar('S1'); await subir('S1','P1');
    ctaAdjuntar('S1'); await subir('S1','P2');
    tipear();
    ctaSacarCompIdx('S1', 1);                                   // ✕ a la imagen equivocada
    var despues=campos();
    ctaRegistrarPago('S1');
    var p=findById('S1');
    return { despues:despues, cobro:cobrosDe(p).map(function(c){ return c.monto+' '+c.fecha+' '+limpiaNota(c.nota); }), saldo:p.saldo, ayer:ayer };
  });
  chk('7a · ⚠️ la ✕ a una imagen del pago en curso no le cambia el monto, la fecha ni el recibo tipeados', r.despues.monto==='400' && r.despues.nota==='510' && r.despues.fecha===r.ayer, r.despues);
  chk('  …y se registra lo que pagó el cliente (400 de ayer), no el saldo entero de hoy', r.cobro.length===1 && r.cobro[0]==='400 '+r.ayer+' 510' && r.saldo===600, r);
  r = await page.evaluate(async () => {
    nueva('S2'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; showContaModal('S2');
    ctaAdjuntar('S2'); await subir('S2','P3'); tipear();
    ctaToggleRegistrado('S2'); var a=campos();
    tipear(); ctaEditarPago('S2', 0); var b=campos();
    ctaEditarPago('S2', -1); var c=campos();
    return { a:a, b:b, c:c, ayer:ayer };
  });
  chk('7b · tocar ✅ «registrado» con el pago a medio cargar no lo borra', r.a.monto==='400' && r.a.fecha===r.ayer && r.a.nota==='510', r.a);
  chk('7c · abrir y cerrar ✏️ Corregir de OTRO pago tampoco', r.b.monto==='400' && r.b.nota==='510' && r.c.monto==='400' && r.c.fecha===r.ayer, { abrir:r.b, cerrar:r.c });
  r = await page.evaluate(async () => {
    nueva('S3'); CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; showContaModal('S3');
    ctaAdjuntar('S3'); await subir('S3','P5');                 // sin tipear: el monto es el que puso el panel (1.000)
    var antes=campos().monto;
    ctaEditarPago('S3', 0);                                     // se corrige el adelanto: 500 → 700
    document.getElementById('cta-ed-monto').value='700';
    document.getElementById('cta-ed-fecha').value=ayer;
    document.getElementById('cta-ed-nota').value='500';
    ctaGuardarPago('S3', 0);
    showContaModal('S3');
    return { antes:antes, despues:campos().monto, saldo:findById('S3').saldo };
  });
  chk('7d · el monto que puso el panel NO queda pegado: si el saldo cambia (1.000 → 800), muestra el nuevo', r.antes==='1000' && r.saldo===800 && r.despues==='800', r);

  // ══ 8. 📱 QR con banco, y ni una ATC ni una RPT se cobran ═══════════════════════════
  r = await page.evaluate(() => {
    STATE=[P({ id:'M1', nota:'600', oc:'09-600', cliente:'CLIENTE QR', acuenta:500, saldo:1000, pagado:false,
      metodoPago:'~Efectivo 500 @'+ayer+' #600 %A1' })];
    showPedidoModal('M1');
    var html=document.getElementById('modal').innerHTML;
    var botones=(html.match(/markPaid\('M1','QR'[^)]*\)/g)||[]);
    var b=[].slice.call(document.querySelectorAll('#modal button')).filter(function(x){ return /QR BISA/.test(x.textContent); })[0];
    if(b) b.click();
    var p=findById('M1'), c=cobrosDe(p).slice(-1)[0]||{};
    return { botones:botones, texto:b?b.textContent:'', banco:c.banco||'', txt:p.metodoPago,
             formas:cuadrePorForma(cuadrePagos().filter(function(x){ return x.p.id==='M1'; })).map(function(x){ return x.forma; }) };
  });
  chk('8a · 📱 la ficha ofrece un QR POR BANCO de la vendedora (BISA y Económico), no «QR» a secas', r.botones.length===2 && /BISA/.test(r.botones[0]) && /Econ/.test(r.botones[1]), r.botones);
  chk('  …y el cobro queda como «QR BISA», que se puede cruzar con el extracto', r.banco==='BISA' && r.formas.indexOf('QR')<0 && r.formas.indexOf('QR BISA')>=0, r);
  r = await page.evaluate(() => {
    window._toasts=[];
    STATE=[P({ id:'M4', nota:'', oc:'ATC 09-004', cliente:'CLIENTE ATC', acuenta:0, saldo:0, pagado:false, metodoPago:'', productos:[{desc:'A',cant:1}] }),
           P({ id:'M5', nota:'', oc:'RPT 09-005', cliente:'Mia Plaza', acuenta:0, saldo:300, pagado:false, metodoPago:'', productos:[{desc:'A',cant:1,precio:300}] })];
    showPedidoModal('M4'); var ficha=document.getElementById('modal').innerHTML.indexOf('markPaid(')>=0;
    markPaid('M4','Efectivo'); quickCobrado('M5');
    /* «Todo»: los dos van para pasado mañana, que los días 29 y 30 ya es el mes que viene, y con
       «Mes» la tabla no los mostraba (la prueba se pudría a fin de mes, 24/09). */
    closeModal(); showView('admin'); segSet('adm-mode','todo'); QUICK_FILTER=''; renderAdmin();
    var cuenta=function(re){ return [].slice.call(document.querySelectorAll('button')).filter(function(b){ return re.test(b.getAttribute('onclick')||''); }).length; };
    return { ficha:ficha, filas:cuenta(/quickVerificado\('M[45]'\)/), tabla:cuenta(/quickCobrado\('M[45]'\)/),
             m4:findById('M4').metodoPago, m5:findById('M5').metodoPago, pagado5:findById('M5').pagado, toasts:window._toasts.slice() };
  });
  chk('8b · a una ATC la ficha NO le ofrece «Marcar como pagado»', r.ficha===false, r.ficha);
  chk('  …ni la tabla le pone 💰 a una ATC o una RPT (las dos filas están, con su 📦)', r.filas===2 && r.tabla===0, { filas:r.filas, botones:r.tabla });
  chk('  …y si igual se llama, no se anota nada y el aviso dice que no se cobra (no manda a revisar Contabilidad)',
      r.m4==='' && r.m5==='' && r.pagado5===false && r.toasts.length===2 && r.toasts.every(function(t){ return /^err:.*no se cobra/.test(t) && !/revisá el monto/.test(t); }), r.toasts);

  chk('sin errores JS', errores.length===0, errores.slice(0,3).join(' | '));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
