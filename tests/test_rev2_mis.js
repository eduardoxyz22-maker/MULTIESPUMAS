/* 📋 REVISIÓN DE «MIS PEDIDOS», PESTAÑA POR PESTAÑA (26/09).

   Lo que mira cada vendedora de lo suyo, del celular: las fichas, lo que marca cada una, el
   mensaje de WhatsApp que pasa al grupo y lo que queda sin llegar a la planilla.

   ⚠️ El reloj de la página está CLAVADO (`page.clock.setFixedTime`) en el miércoles 16/09/2026
   a las 10 de Bolivia y la página corre con `timezoneId:'America/La_Paz'`: las fechas de los
   fixtures son fijas y no se pudren con el calendario (ni caen en domingo ni cruzan el mes).

   Se corre:  node tests/test_rev2_mis.js          (desde la raíz del repo)
   Dientes:   PEDIDOS=/ruta/al/viejo/pedidos.html node tests/test_rev2_mis.js
   Solo datos sintéticos: el repo es público. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,300)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RELOJ = '2026-09-16T10:00:00-04:00';           // miércoles, 10 de la mañana en Bolivia

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:360,height:780}, timezoneId:'America/La_Paz' });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(RELOJ));
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);

  /* Un pedido sintético de Carola, para el jueves 17/09 AM, con saldo. */
  await page.evaluate(() => {
    CONNECTED=false;
    if(typeof CARGA_TIMER!=='undefined' && CARGA_TIMER){ clearTimeout(CARGA_TIMER); CARGA_TIMER=null; }
    if(typeof CARGA_TIC!=='undefined' && CARGA_TIC){ clearInterval(CARGA_TIC); CARGA_TIC=null; }
    window.__P=function(o){ return Object.assign({id:'x'+Math.random(),fecha:'2026-09-17',oc:'09-001',
      vendedor:'Carola Chavez',cliente:'CLIENTE',productos:[{desc:'TITANIO ICE',medida:'160x190',cant:1,precio:6660}],
      celular:'70000001',turno:'AM',zona:'Norte',direccion:'Calle 1',maps:'https://www.google.com/maps?q=-17.7,-63.1',pagado:false,saldo:6660,
      ts:Date.parse('2026-09-15T10:00:00-04:00'),metodoPago:'',observaciones:'',estado:'',entregado:false,vehiculo:'',chofer:'',garantia:'',
      nota:'1',acuenta:0,facturarA:'',nit:'',nroDia:1,verificado:false,fotos:[]},o); };
    window.__verMis=function(){
      MIS_TODOS=false; MIS_FILTER='todos'; if(typeof MIS_TOPE!=='undefined') MIS_TOPE=120;
      setVendedorMem('Carola Chavez');
      document.getElementById('mis-vendedor').value='Carola Chavez';
      renderMis();
      var cards=[].slice.call(document.querySelectorAll('#mis-lista .cho-card'));
      var de=function(id){ var c=cards.filter(function(x){ return (x.getAttribute('onclick')||'').indexOf("'"+id+"'")>=0; })[0]; return c?c.textContent.replace(/\s+/g,' '):null; };
      return { cards:cards, de:de, ids:cards.map(function(x){ var m=(x.getAttribute('onclick')||'').match(/'([^']+)'/); return m?m[1]:''; }),
               txt:(document.getElementById('mis-lista').textContent||'').replace(/\s+/g,' ') };
    };
    showView('mis');
  });
  await page.waitForTimeout(150);

  // ══ 1. Lo que dice la ficha sobre la plata ═════════════════════════════════
  console.log('\n── 1. La ficha: la plata ──');
  let r = await page.evaluate(() => {
    STATE=[
      __P({id:'suelto', cliente:'PAGADA SIN MONTO', pagado:true, saldo:0, metodoPago:'Efectivo %1AbCdEfGhIjKlMnOpQr'}),
      __P({id:'adelanto', cliente:'PAGADA CON EL ADELANTO', pagado:true, saldo:0, acuenta:2000, metodoPago:'~QR BISA 2000 @2026-09-10 #939 %ZZimgZZ'}),
      __P({id:'sinmonto', cliente:'NADIE ANOTO EL MONTO', saldo:0}),
      __P({id:'atc', cliente:'UNA ATC', oc:'ATC 09-001', saldo:0}),
      __P({id:'rpt', cliente:'Mia Plaza', oc:'RPT 09-001', saldo:0, celular:''}),
      __P({id:'debe', cliente:'DEBE', saldo:1500}),
      __P({id:'fabrica', cliente:'YA PEDIDO A FABRICA', productos:[{desc:'SOMIER NEGRO',medida:'160x190',cant:2,chk:'no',enProd:true,prodEn:'MORENO'}]})
    ];
    var v=__verMis(), o={};
    ['suelto','adelanto','sinmonto','atc','rpt','debe','fabrica'].forEach(function(id){ o[id]=v.de(id); });
    showMisModal('sinmonto'); o.modalSinMonto=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
    return o;
  });
  chk('⚠️ «PAGADA sin monto»: la ficha NO muestra el ID de la imagen', r.suelto && !/1AbCdEfGh|%/.test(r.suelto), r.suelto);
  chk('…y dice PAGADO con el método', /PAGADO · Efectivo/.test(r.suelto||''), r.suelto);
  chk('⚠️ pagada con el adelanto: NO muestra el historial crudo (~, @fecha, #recibo, %imagen)', r.adelanto && !/~|@2026|#939|%ZZ/.test(r.adelanto), r.adelanto);
  chk('…y lo dice legible (QR BISA Bs 2.000)', /PAGADO · QR BISA Bs 2\.000/.test(r.adelanto||''), r.adelanto);
  chk('⚠️ venta sin monto anotado: la ficha dice «SIN MONTO ANOTADO», no «Sin saldo»', /SIN MONTO ANOTADO/.test(r.sinmonto||'') && !/Sin saldo/.test(r.sinmonto||''), r.sinmonto);
  chk('…lo mismo que dice la ventana de la ficha', /SIN MONTO ANOTADO/.test(r.modalSinMonto), r.modalSinMonto.slice(0,200));
  chk('⚠️ una ATC dice «No se cobra» (§4fy, §4ga), no «Sin saldo»', /No se cobra/.test(r.atc||'') && !/Sin saldo/.test(r.atc||''), r.atc);
  chk('⚠️ una RPT también', /No se cobra/.test(r.rpt||'') && !/Sin saldo/.test(r.rpt||''), r.rpt);
  chk('la que debe sigue diciendo cuánto', /Bs 1\.500,00 por cobrar/.test(r.debe||''), r.debe);
  chk('⚠️ un «NO HAY» que ya se pidió a fábrica lo dice en la ficha (🏭), como en la ventana', /NO HAY/.test(r.fabrica||'') && /🏭 en producción/.test(r.fabrica||''), r.fabrica);

  // ══ 2. El mensaje de WhatsApp que se pasa al grupo ═════════════════════════
  console.log('\n── 2. El WhatsApp del pedido ──');
  r = await page.evaluate(() => ({
    sinMonto: pedidoText(findById('sinmonto')), atc: pedidoText(findById('atc')),
    debe: pedidoText(findById('debe')), suelto: pedidoText(findById('suelto')),
    ruta: cobroRutaTxt(findById('sinmonto')).t
  }));
  chk('⚠️ la venta sin monto anotado NO sale «💰 PAGADO» en el mensaje al grupo', !/💰 PAGADO/.test(r.sinMonto), r.sinMonto);
  chk('…dice que falta el monto y que pregunten, como la hoja de ruta', /SIN MONTO ANOTADO/.test(r.sinMonto) && /SIN MONTO ANOTADO/.test(r.ruta), r.sinMonto);
  chk('⚠️ una ATC no sale «PAGADO»: no se cobra', !/💰 PAGADO/.test(r.atc) && /NO SE COBRA/.test(r.atc), r.atc);
  chk('la que debe sigue con «POR COBRAR»', /💰 POR COBRAR: Bs 1\.500,00/.test(r.debe), r.debe);
  chk('la pagada sigue «PAGADO»', /💰 PAGADO/.test(r.suelto), r.suelto);
  r = await page.evaluate(() => {
    showMisModal('sinmonto'); copyPedido('sinmonto');
    var wa=pedidoText(findById('sinmonto')); closeModal();
    showWhatsappModal(findById('sinmonto')); var t=(document.getElementById('wa-text')||{}).value||''; closeModal();
    return { wa:wa, modal:t };
  });
  chk('…y el modal «✅ Pedido guardado» (el que sale al guardar) dice lo mismo', /SIN MONTO ANOTADO/.test(r.modal) && !/💰 PAGADO/.test(r.modal), r.modal);

  // ══ 3. La lista: la venta de tienda y lo que no entra ══════════════════════
  console.log('\n── 3. La lista entera ──');
  r = await page.evaluate(() => {
    STATE=[
      __P({id:'tienda-hoy', cliente:'VENDIDA HOY EN LA TIENDA', fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Central',
           entregado:true, verificado:true, pagado:true, saldo:0, ts:Date.parse('2026-09-16T09:00:00-04:00'), metodoPago:'Efectivo 500 @2026-09-16', maps:''}),
      __P({id:'manana', cliente:'PARA MAÑANA', fecha:'2026-09-17'})
    ];
    for(var i=0;i<130;i++) STATE.push(__P({id:'viejo'+i, cliente:'VIEJO '+i, fecha:'2026-08-'+String(1+(i%28)).padStart(2,'0'),
      ts:Date.parse('2026-08-01T10:00:00-04:00')+i*60000, entregado:true}));
    var v=__verMis(), idx=v.ids.indexOf('tienda-hoy');
    var o={ n:v.cards.length, total:STATE.length, idx:idx, tienda:v.de('tienda-hoy'), primero:v.ids[0],
            pie:(document.getElementById('mis-lista').textContent||'').replace(/\s+/g,' ').slice(-160) };
    var b=[].slice.call(document.querySelectorAll('#mis-lista button')).filter(function(x){ return /Ver \d+ más/.test(x.textContent); })[0];
    o.hayBoton=!!b;
    if(b){ b.click(); o.nTras=document.querySelectorAll('#mis-lista .cho-card').length; }
    // Cambiar de filtro vuelve a arrancar de a 120
    setMisFiltro('ent'); setMisFiltro('todos');
    o.nFiltro=document.querySelectorAll('#mis-lista .cho-card').length;
    showMisModal('tienda-hoy'); o.modalTienda=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
    STATE.push(__P({id:'ya-entregado', cliente:'YA ENTREGADO SIN GPS', maps:'', entregado:true}));
    STATE.push(__P({id:'falta-gps', cliente:'FALTA GPS', maps:''}));
    showMisModal('ya-entregado'); o.modalEnt=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
    showMisModal('falta-gps'); o.modalGps=document.getElementById('modal-box').textContent.replace(/\s+/g,' '); closeModal();
    return o;
  });
  chk('⚠️ la venta de tienda de HOY aparece en la lista (antes quedaba debajo del corte de 120)', r.idx>=0, 'posición '+r.idx);
  chk('…arriba, con lo de estos días (va por el día en que salió)', r.idx>=0 && r.idx<=1, 'posición '+r.idx+' · primero: '+r.primero);
  chk('…y la ficha dice el día de la venta', /16\/09\/2026 · TIENDA/.test(r.tienda||''), r.tienda);
  chk('se dibujan 120 fichas de 132', r.n===120, r.n+' de '+r.total);
  chk('⚠️ y se DICE que hay más (antes el corte era callado)', /120 más nuevos de 132/.test(r.pie), r.pie);
  chk('…con un botón para ver el resto', r.hayBoton===true && r.nTras===132, 'tras tocar: '+r.nTras);
  chk('al cambiar de filtro vuelve a arrancar de a 120', r.nFiltro===120, r.nFiltro);
  chk('⚠️ la ficha de una venta de TIENDA no pide la ubicación GPS (no va a ningún lado)', !/Falta la ubicación GPS|Agregar enlace de ubicación/.test(r.modalTienda), r.modalTienda.slice(0,160));
  chk('…y dice el día en que salió de la tienda, no una «Fecha de entrega» vacía', /Salió de tienda16\/09\/2026/.test(r.modalTienda) && !/Fecha de entrega/.test(r.modalTienda), r.modalTienda.slice(0,120));
  chk('…ni la de un pedido ya entregado grita «Falta la ubicación GPS»', !/Falta la ubicación GPS/.test(r.modalEnt), r.modalEnt.slice(0,120));
  chk('…pero uno que todavía va sí lo pide', /Falta la ubicación GPS/.test(r.modalGps) && /Agregar enlace de ubicación/.test(r.modalGps), r.modalGps.slice(0,120));

  // ══ 4. Completar un borrador de Kommo es un pedido NUEVO ═══════════════════
  console.log('\n── 4. El borrador de Kommo completado ──');
  r = await page.evaluate(async () => {
    CARGA_GEN++; CARGA_ESTADO='ok';
    CONNECTED=true;
    var borr=__P({id:'kommo-555', estado:'Borrador Kommo', cliente:'LEAD DE KOMMO', fecha:'', turno:'', oc:'', zona:'', direccion:'', maps:'',
                  nota:'', saldo:3000, nroDia:0, ts:Date.parse('2026-09-16T08:00:00-04:00'), rev:3});
    window._pl=[JSON.parse(JSON.stringify(borr))];
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    apiSave=function(rec){ var c=JSON.parse(JSON.stringify(rec)); c.rev=(Number(rec.rev)||0)+1; c.nroDia=c.nroDia||1;
      window._pl=window._pl.filter(function(x){ return x.id!==rec.id; }).concat([c]); return Promise.resolve({ok:true,pedido:c}); };
    STATE=[]; BORRADORES=[JSON.parse(JSON.stringify(borr))]; saveMirror();
    setVendedorMem('Carola Chavez'); document.getElementById('mis-vendedor').value='Carola Chavez';
    showView('mis'); await new Promise(function(r){ setTimeout(r,150); });
    completarBorrador('kommo-555');
    document.getElementById('f-fecha').value='2026-09-17';
    document.getElementById('f-nota').value='9001';
    document.getElementById('f-zona').value='Norte';
    document.getElementById('f-direccion').value='Calle 1';
    segSet('f-turno','AM');
    var toasts=[], _t=toast; toast=function(m){ toasts.push(String(m)); return _t.apply(this, arguments); };
    submitPedido();
    await new Promise(function(r){ setTimeout(r,800); });
    toast=_t;
    var mb=document.getElementById('modal-box');
    var o={ modal: mb?mb.textContent.replace(/\s+/g,' '):'', wa:(document.getElementById('wa-text')||{}).value||'', toasts:toasts.join(' | '),
            enMis: document.getElementById('view-mis').classList.contains('active'),
            fila: window._pl.filter(function(x){ return x.id==='kommo-555'; }).map(function(x){ return (x.estado||'')+'|'+x.fecha; })[0] };
    closeModal(); CONNECTED=false;
    return o;
  });
  chk('se guardó como pedido (con fecha, sin la marca de borrador)', r.fila==='|2026-09-17', r.fila);
  chk('⚠️ NO dice «no cambió nada de lo que se ve en la lista de entrega» de una entrega recién agendada', !/no cambió nada/.test(r.modal), r.modal.slice(0,200));
  chk('⚠️ sale el mensaje para pasar al grupo, como todo pedido nuevo', /Pedido guardado/.test(r.modal) && /LEAD DE KOMMO/.test(r.wa), r.modal.slice(0,120));
  chk('…el aviso dice «Pedido enviado al equipo», no «Cambios guardados»', /Pedido enviado al equipo/.test(r.toasts) && !/Cambios guardados/.test(r.toasts), r.toasts);
  chk('…y vuelve a Mis pedidos, de donde salió', r.enMis===true);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
