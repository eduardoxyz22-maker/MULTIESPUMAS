/* 🛡️ CORREGIR UN PEDIDO NO PUEDE BORRAR NADA.

   Reportado por el dueño, con capturas: *"cuando un vendedor corrige un precio o algo se
   borran los archivos subidos y pagos realizados"* y *"cuando marcan pagado, y suben los
   respaldos sale esa alerta abajo, y si corrigen esa alerta se borra todos los pagos hechos"*.

   Eran TRES bugs encadenados, todos reproducidos antes de tocar nada:

   1. FALSA ALARMA. Al marcar «SÍ, pagado» en el formulario, el pago entero se guarda como
      ANTICIPO en el historial y `p.acuenta` queda en 0 (a propósito). Pero «Corregir precios
      y montos» leía `p.acuenta`, así que una venta de Bs 16.920 COBRADA le daba total 0 y
      avisaba «hay Bs 16.920 de más que el total». Sobre una venta perfecta.
   2. Y quien intentaba callar esa alerta tocando los montos BORRABA el pago con sus dos
      recibos, sin una sola pregunta. La venta volvía a figurar por cobrar.
   3. Editar CUALQUIER cosa desde el formulario borraba las fotos de la entrega: `rec` se
      arma de cero enumerando campos y `fotos` no estaba en la lista, así que la planilla
      recibía la celda vacía.

   ⚠️ LO QUE ESTE TEST CUIDA: que corregir un precio, una dirección o un teléfono NUNCA se
   lleve puesto un pago, un comprobante ni una foto. Es plata y es la prueba de la entrega.

   Se corre:  node tests/test_noborra.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+e):''); };
const D=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000} });
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  let ACEPTAR=true; const dialogs=[];
  page.on('dialog', d => { dialogs.push(d.message()); ACEPTAR ? d.accept() : d.dismiss(); });
  await page.goto('file://' + path.resolve('pedidos.html'), { waitUntil:'load' });
  await page.waitForTimeout(300);

  /* Un pedido igual al de la captura: Bs 16.920 marcados PAGADO desde el formulario
     (o sea: el pago como ANTICIPO en el historial y `acuenta` en 0), con dos recibos
     adjuntos y dos fotos de la entrega. Y un campo inventado que el formulario no
     conoce, para probar que tampoco se pierden los que se agreguen mañana. */
  const armar = () => page.evaluate((hoy) => {
    document.getElementById('conn-form').style.display='none';
    CONNECTED=true; UNLOCKED=true;
    document.getElementById('admin-lock').style.display='none';
    document.getElementById('admin-content').style.display='block';
    mostrarBotonesTodos();
    window._pl=[];
    apiSave=function(rec){ var g=JSON.parse(JSON.stringify(rec));
      window._pl=window._pl.filter(function(x){return x.id!==g.id;}).concat([g]); return Promise.resolve({ok:true}); };
    apiList=function(){ return Promise.resolve({ok:true,pedidos:JSON.parse(JSON.stringify(window._pl))}); };
    /* El historial se arma con textoCobros(), la MISMA función del panel: escribirlo a
       mano da un anticipo de 0 y una conclusión falsa (me pasó al reproducir el bug). */
    var ledger = textoCobros([{ anticipo:true, metodo:'Efectivo', banco:'', monto:16920,
                                fecha:hoy, nota:'645', comps:['RECIBO_A','RECIBO_B'] }]);
    window._pl=[{
      id:'X1', fecha:hoy, oc:'', vendedor:'Mirian Salazar', cliente:'INES GUTIERREZ SUAREZ',
      productos:[{desc:'TITANIO ICE',medida:'160x190',codigo:'CH1201',cant:2,precio:6510},
                 {desc:'SOMIER TITANIO ICE',medida:'160x190',codigo:'CH1208',cant:2,precio:1900},
                 {desc:'ALMOHADA',medida:'50x70',codigo:'CD1403',cant:4,precio:25}],
      celular:'62241536', turno:'PM', zona:'Norte', direccion:'calle x', maps:'',
      pagado:true, saldo:0, acuenta:0, ts:Date.now(), metodoPago:ledger,
      observaciones:'', estado:'', entregado:true, vehiculo:'', chofer:'Juan',
      garantia:'', nota:'645', facturarA:'FRANCISCO ANDRES HERRERA', nit:'1027941024',
      nroDia:1, verificado:true,
      fotos:['FOTOENTREGA_A','FOTOENTREGA_B'],
      campoDelFuturo:'no lo toca el formulario'
    }];
    STATE=mergePending(JSON.parse(JSON.stringify(window._pl))); saveMirror(); updateStats();
    var p=STATE.filter(x=>x.id==='X1')[0], a=anticipoDe(p);
    return { anticipo:a?Number(a.monto):0, comps:a?compsArr(a.comps).length:0,
             acuenta:Number(p.acuenta)||0, ventaTotal:ventaTotal(p) };
  }, D(0));

  // ══ 0. El punto de partida ═════════════════════════════════════════════════
  console.log('\n── 0. Cómo queda una venta marcada PAGADO en el formulario ──');
  const e0 = await armar();
  chk('el pago vive en el historial como anticipo', e0.anticipo===16920, 'Bs '+e0.anticipo);
  chk('…con sus dos comprobantes', e0.comps===2, e0.comps);
  chk('⚠️ y el campo «acuenta» queda en 0 (así funciona el formulario)', e0.acuenta===0, e0.acuenta);
  chk('la ficha calcula bien el total de la venta', e0.ventaTotal===16920, 'Bs '+e0.ventaTotal);

  // ══ 1. La falsa alarma ═════════════════════════════════════════════════════
  console.log('\n── 1. La alerta que asustaba ──');
  const r1 = await page.evaluate(() => {
    showContaModal('X1'); ctaRecalc();
    return { aviso:(document.getElementById('cta-tot-aviso')||{}).textContent||'',
             acu:(document.getElementById('cta-acuenta')||{}).value,
             sal:(document.getElementById('cta-saldo')||{}).value };
  });
  chk('⚠️ NO dice que sobra plata en una venta ya cobrada',
      !/de más que el total/.test(r1.aviso), r1.aviso.trim().slice(0,110));
  chk('…dice que cuadra', /cuadra con los precios/.test(r1.aviso), r1.aviso.trim().slice(0,80));
  chk('el total que muestra es el de la venta, no cero',
      /16\.920/.test(r1.aviso), r1.aviso.trim().slice(0,60));
  chk('«A cuenta» muestra lo que realmente se cobró', Number(r1.acu)===16920, r1.acu);

  // ══ 2. Bajar el pago a 0 ahora avisa ═══════════════════════════════════════
  console.log('\n── 2. Si igual intentan borrar el pago ──');
  dialogs.length=0; ACEPTAR=false;                       // la vendedora CANCELA
  const r2 = await page.evaluate(async () => {
    document.getElementById('cta-acuenta').value='0'; ctaRecalc();
    ctaGuardarMontos('X1');
    await new Promise(r=>setTimeout(r,300));
    var p=STATE.filter(x=>x.id==='X1')[0], a=anticipoDe(p);
    return { anticipo:a?Number(a.monto):0, comps:a?compsArr(a.comps).length:0, pagado:p.pagado };
  });
  chk('⚠️ pregunta antes de borrar un pago registrado', dialogs.length>0, 'ventanas='+dialogs.length);
  chk('…y le dice cuánta plata se va', /16\.920/.test(dialogs[0]||''), (dialogs[0]||'').slice(0,90));
  chk('…y que hay comprobantes adjuntos', /comprobante/.test(dialogs[0]||''));
  chk('…y le sugiere qué hacer si solo quería el precio', /solo querías corregir un PRECIO/i.test(dialogs[0]||''));
  chk('⚠️ al CANCELAR, el pago sigue entero', r2.anticipo===16920, 'Bs '+r2.anticipo);
  chk('…y sus recibos también', r2.comps===2, r2.comps);
  chk('…y la venta sigue figurando pagada', r2.pagado===true);

  // ══ 3. Corregir SOLO un precio no toca la plata ════════════════════════════
  console.log('\n── 3. Corregir solo un precio ──');
  await armar(); ACEPTAR=true; dialogs.length=0;
  const r3 = await page.evaluate(async () => {
    showContaModal('X1');
    document.getElementById('cta-pr-0').value='6500'; ctaRecalc();
    ctaGuardarMontos('X1');
    await new Promise(r=>setTimeout(r,300));
    var p=STATE.filter(x=>x.id==='X1')[0], a=anticipoDe(p);
    return { precio:(p.productos[0]||{}).precio, anticipo:a?Number(a.monto):0,
             comps:a?compsArr(a.comps).length:0, fotos:(p.fotos||[]).length, dialogos:0 };
  });
  chk('el precio se corrigió', Number(r3.precio)===6500, r3.precio);
  chk('⚠️ el pago no se movió', r3.anticipo===16920, 'Bs '+r3.anticipo);
  chk('⚠️ los comprobantes tampoco', r3.comps===2, r3.comps);
  chk('…y no hizo falta ninguna advertencia', dialogs.length===0, 'ventanas='+dialogs.length);

  // ══ 4. Editar desde el formulario no borra las fotos ═══════════════════════
  console.log('\n── 4. Corregir desde el formulario (lo que hace la vendedora) ──');
  await armar(); ACEPTAR=true; dialogs.length=0;
  const r4 = await page.evaluate(async () => {
    editPedido('X1');
    document.getElementById('f-direccion').value='calle nueva 123';   // corrige la dirección
    var pr=document.querySelectorAll('#f-productos .prod-precio');
    if(pr.length){ pr[0].value='6500'; pr[0].dispatchEvent(new Event('input',{bubbles:true})); }
    submitPedido();
    await new Promise(r=>setTimeout(r,900));
    var g=window._pl.filter(x=>x.id==='X1')[0]||{};
    return { guardo:(g.productos||[])[0] && (g.productos||[])[0].precio===6500,
             direccion:g.direccion, fotos:g.fotos, futuro:g.campoDelFuturo,
             anticipo:(anticipoDe(g)||{}).monto||0,
             comps:compsArr((anticipoDe(g)||{}).comps).length,
             nota:g.nota, nit:g.nit, facturarA:g.facturarA };
  });
  chk('la corrección se guardó', r4.guardo===true && r4.direccion==='calle nueva 123', r4.direccion);
  chk('⚠️ LAS FOTOS DE LA ENTREGA SIGUEN AHÍ',
      JSON.stringify(r4.fotos)===JSON.stringify(['FOTOENTREGA_A','FOTOENTREGA_B']), JSON.stringify(r4.fotos));
  chk('⚠️ el pago sigue entero', Number(r4.anticipo)===16920, 'Bs '+r4.anticipo);
  chk('⚠️ y sus dos recibos', r4.comps===2, r4.comps);
  chk('los datos de factura no se perdieron', r4.nit==='1027941024' && !!r4.facturarA, r4.nit);
  chk('⚠️ un campo que el formulario NO conoce tampoco se borra',
      r4.futuro==='no lo toca el formulario', JSON.stringify(r4.futuro));

  // ══ 5. Que el rescate general no reviva lo que sí se editó ═════════════════
  console.log('\n── 5. …pero el rescate no puede pisar lo que la vendedora sí cambió ──');
  await armar(); ACEPTAR=true;
  const r5 = await page.evaluate(async () => {
    editPedido('X1');
    document.getElementById('f-cliente').value='CLIENTE CORREGIDO';
    document.getElementById('f-celular').value='71234567';
    segSet('f-turno','AM');
    document.getElementById('f-zona').value='Sur';
    submitPedido();
    await new Promise(r=>setTimeout(r,900));
    var g=window._pl.filter(x=>x.id==='X1')[0]||{};
    return { cliente:g.cliente, celular:g.celular, turno:g.turno, zona:g.zona, fotos:(g.fotos||[]).length };
  });
  chk('el cliente corregido es el nuevo', r5.cliente==='CLIENTE CORREGIDO', r5.cliente);
  chk('el celular corregido es el nuevo', r5.celular==='71234567', r5.celular);
  chk('el turno corregido es el nuevo', r5.turno==='AM', r5.turno);
  chk('la zona corregida es la nueva', r5.zona==='Sur', r5.zona);
  chk('…y las fotos siguen', r5.fotos===2, r5.fotos);

  // ══ 6. Un pedido nuevo no hereda nada ══════════════════════════════════════
  console.log('\n── 6. Un pedido nuevo nace limpio ──');
  const r6 = await page.evaluate(async (man) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value=man;
    document.getElementById('f-nota').value='777';
    document.getElementById('f-vendedor').value='Mirian Salazar'; applyVendedorLite();
    document.getElementById('f-cliente').value='NUEVO';
    document.getElementById('f-celular').value='70000001';
    document.getElementById('f-zona').value='Norte';
    var d=document.querySelector('#f-productos .prod-desc'); if(d) d.value='COLCHON';
    var c=document.querySelector('#f-productos .prod-cant'); if(c) c.value='1';
    submitPedido();
    await new Promise(r=>setTimeout(r,900));
    var g=window._pl.filter(x=>x.cliente==='NUEVO')[0]||{};
    return { existe:!!g.id, fotos:g.fotos, futuro:g.campoDelFuturo, metodoPago:g.metodoPago };
  }, D(3));
  chk('el pedido nuevo se guardó', r6.existe===true);
  chk('⚠️ NO heredó las fotos de otro pedido', JSON.stringify(r6.fotos)==='[]', JSON.stringify(r6.fotos));
  chk('⚠️ NO heredó el campo del futuro', r6.futuro===undefined, JSON.stringify(r6.futuro));
  chk('⚠️ NO heredó el pago de otro', !/16920/.test(String(r6.metodoPago||'')), r6.metodoPago);

  chk('la página no tiró ningún error de JavaScript', errors.length===0, errors.join(' | ').slice(0,300));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
