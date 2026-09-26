/* 🧾 SEGUNDA REVISIÓN DE CONTABILIDAD → 📋 VENTAS Y 🏭 MAYORISTAS (26/09)

   Una sección por arreglo. Todo por los botones que usa la gente (la ficha de Contabilidad),
   con el reloj CLAVADO en un miércoles de mitad de mes (no se pudre a fin de mes ni los domingos).

     1. «✏️ Corregir este pago»: la fecha, el monto y el recibo van ARRIBA del método. Tocar «QR» o
        el banco repintaba la ficha y los volvía a lo viejo: «💾 Guardar» corregía solo el método y el
        pago seguía con la fecha y el monto de antes. Lo mismo con ✅ «Pago registrado en sistema».
     2. Una venta SIN MONTO ANOTADO (la de Eduardo cargada sin cobro, la que el Cuadre manda a
        completar) abría SOLO el bloque del flete, y su botón anotaba el pago como RECARGO POR
        ENTREGA sin preguntar (efecto del arreglo del 25/09 para las ventas YA PAGADAS). Ahora tiene
        el selector, arranca en «💵 Pago» y dice que primero va el total.

   Red cortada, servidor simulado. Se corre:  node tests/test_rev2_ventas.js
   Dientes:   PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_rev2_ventas.js            */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,extra)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, extra!=null?('· '+(typeof extra==='string'?extra:JSON.stringify(extra))):''); };
const J=x=>JSON.stringify(x);
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const page = await browser.newPage({ viewport:{width:1500,height:1000}, timezoneId:'America/La_Paz' });
  // Miércoles 16/09/2026, 11:00 de Bolivia: ni fin de mes, ni sábado, ni domingo.
  await page.clock.setFixedTime(new Date('2026-09-16T15:00:00Z'));
  const errores=[]; page.on('pageerror',e=>errores.push(e.message));
  /* Los diálogos se contestan desde Node (un evaluate dentro del handler se cuelga). */
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
    window.__XLSX=null;
    buildXlsx=function(sheets){ window.__XLSX=JSON.parse(JSON.stringify(sheets)); return new Uint8Array([1]); };
    downloadBlob=function(){};
    apiSave=function(r){ return Promise.resolve({ok:true, pedido:JSON.parse(JSON.stringify(r))}); };
    apiDelete=function(){ return Promise.resolve({ok:true}); };
    apiBorrarFoto=function(){ return Promise.resolve({ok:true}); };
    // La lista vuelve con las filas tal cual están, como la planilla.
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    window.hoy=todayStr();                                  // 2026-09-16
    window.dia=function(n){ var d=new Date(); d.setDate(d.getDate()+n); return isoLocal(d); };
    window.ts0=new Date(window.hoy+'T12:00:00').getTime();
    window.P=function(o){
      var b={ turno:'AM', celular:'7', nit:'1', zona:'Norte', direccion:'X', fecha:window.dia(2), maps:'', observaciones:'',
              garantia:'', facturarA:'', estado:'', entregado:false, verificado:false, vehiculo:'', chofer:'', nroDia:1,
              fotos:[], vendedor:'Carola Chavez', ts:window.ts0, acuenta:0, saldo:0, pagado:false, metodoPago:'',
              productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:1,precio:1500}] };
      var q={}; for(var k in b) q[k]=b[k]; for(var k2 in o) q[k2]=o[k2]; return q;
    };
    // Como vuelve de la planilla: `cobradoBs` no tiene columna (§4fg), así que se pierde.
    window.releer=function(){ STATE=JSON.parse(JSON.stringify(STATE)).map(function(p){ delete p.cobradoBs; return p; }); };
    window.aConta=function(t){ t=t||'ventas'; showView('conta'); segSet('cta-tab',t); setContaTab(t); renderConta(); };
    // El botón de la ficha cuyo onclick llama a `fn` (y, si se dice, con ese texto).
    window.boton=function(fn, txt){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){
      return new RegExp(fn).test(b.getAttribute('onclick')||'') && (txt==null || txt.test(b.textContent)); })[0]||null; };
    window.valEd=function(){ var g=function(id){ var e=document.getElementById(id); return e?e.value:null; };
      return { fecha:g('cta-ed-fecha'), monto:g('cta-ed-monto'), nota:g('cta-ed-nota') }; };
  });

  /* ══ 1 · «✏️ CORREGIR ESTE PAGO» NO PIERDE LO TIPEADO AL ELEGIR EL MÉTODO ══════════════════════
     Un efectivo de Bs 700 anotado HOY que en realidad fue un QR de Bs 750 del lunes, recibo 32.
     Contabilidad abre ✏️ Corregir y llena de arriba para abajo: fecha, monto, recibo… y recién
     después toca «QR» y el banco. Antes esos dos toques repintaban la ficha: la fecha, el monto y el
     recibo volvían a lo viejo y «💾 Guardar» dejaba el pago en HOY por Bs 700 (solo cambiaba a QR). */
  D.confirm=true; D.vistos=[];
  let r = await page.evaluate(async () => {
    STATE=[ P({ id:'C1', nota:'30', oc:'09-030', cliente:'CORREGIR METODO', acuenta:1000, saldo:800,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:1000,fecha:dia(-6),nota:'30',comps:['I1']},
                                        {metodo:'Efectivo',monto:700,fecha:hoy,nota:'31',comps:['I2']}]) }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('C1');
    ctaEditarPago('C1', 1);                                   // el cobro (el 0 es el anticipo)
    document.getElementById('cta-ed-fecha').value=dia(-2);
    document.getElementById('cta-ed-monto').value='750';
    document.getElementById('cta-ed-nota').value='32';
    boton('ctaEditMetodo', /^QR$/).click();
    var trasMetodo=valEd();
    boton('ctaEditBanco', /BISA/).click();
    var trasBanco=valEd();
    boton('ctaGuardarPago').click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('C1'), c=cobrosDe(p)[0]||{};
    return { trasMetodo:trasMetodo, trasBanco:trasBanco, cobro:{metodo:c.metodo, banco:c.banco, monto:c.monto, fecha:c.fecha, nota:c.nota},
             saldo:Number(p.saldo)||0, lunes:dia(-2) };
  });
  chk('1 · tocar «QR» en ✏️ Corregir no borra la fecha, el monto ni el recibo que se tipearon',
      r.trasMetodo.fecha===r.lunes && r.trasMetodo.monto==='750' && r.trasMetodo.nota==='32', J(r.trasMetodo));
  chk('1 · …ni tocar el banco', r.trasBanco.fecha===r.lunes && r.trasBanco.monto==='750' && r.trasBanco.nota==='32', J(r.trasBanco));
  chk('1 · ⚠️ «💾 Guardar» deja el pago con lo tipeado: QR BISA Bs 750 del lunes, recibo 32',
      r.cobro.metodo==='QR' && r.cobro.banco==='BISA' && r.cobro.monto===750 && r.cobro.fecha===r.lunes && r.cobro.nota==='32', J(r.cobro));
  chk('1 · …y el saldo baja por los 50 de más (el total de la venta no se mueve)', r.saldo===750, 'saldo '+r.saldo);

  // 1b · El anticipo: cambiarle el día y pasar de QR a Efectivo (con la vendedora como quien lo recibió).
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'C2', nota:'40', oc:'09-040', cliente:'CORREGIR ANTICIPO', acuenta:1000, saldo:1500,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:1000,fecha:hoy,nota:'40',comps:['I3']}]) }) ];
    releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('C2');
    ctaEditarPago('C2', 0);
    document.getElementById('cta-ed-fecha').value=dia(-3);
    document.getElementById('cta-ed-nota').value='41';
    boton('ctaEditMetodo', /^Efectivo$/).click();
    var tras=valEd();
    boton('ctaGuardarPago').click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('C2'), a=anticipoDe(p)||{};
    return { tras:tras, ant:{metodo:a.metodo, fecha:a.fecha, nota:a.nota, monto:a.monto}, saldo:Number(p.saldo)||0, d3:dia(-3) };
  });
  chk('1b · en el ANTICIPO también: pasar a «Efectivo» no le vuelve la fecha a hoy', r.tras.fecha===r.d3 && r.tras.nota==='41', J(r.tras));
  chk('1b · ⚠️ el adelanto queda en efectivo, del día tipeado y con su recibo', r.ant.metodo==='Efectivo' && r.ant.fecha===r.d3 && r.ant.nota==='41' && r.ant.monto===1000 && r.saldo===1500, J(r.ant));

  // 1c · Con el editor abierto, ✅ «Pago registrado en sistema» tampoco borra lo tipeado.
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'C3', nota:'50', oc:'09-050', cliente:'CORREGIR Y REGISTRAR', acuenta:1000, saldo:500,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:1000,fecha:dia(-6),nota:'50',comps:['I5']},
                                        {metodo:'Efectivo',monto:1000,fecha:hoy,nota:'51',comps:['I6']}]) }) ];
    releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('C3');
    ctaEditarPago('C3', 1);
    document.getElementById('cta-ed-fecha').value=dia(-1);
    boton('ctaToggleRegistrado').click();
    var tras=valEd();
    boton('ctaGuardarPago').click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('C3'), c=cobrosDe(p)[0]||{};
    return { tras:tras, fecha:c.fecha, reg:regEnSistema(p), ayer:dia(-1) };
  });
  chk('1c · ✅ con «Corregir» abierto no le devuelve la fecha vieja al pago', r.tras.fecha===r.ayer && r.fecha===r.ayer && r.reg===true, J(r));

  // 1d · Control: «Cancelar» y abrir OTRO pago siguen arrancando de lo guardado, no de lo tipeado.
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'C4', nota:'60', oc:'09-060', cliente:'CORREGIR Y CANCELAR', acuenta:1000, saldo:500,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:1000,fecha:dia(-6),nota:'60',comps:['I7']},
                                        {metodo:'Efectivo',monto:1000,fecha:hoy,nota:'61',comps:['I8']}]) }) ];
    releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('C4');
    ctaEditarPago('C4', 1);
    document.getElementById('cta-ed-fecha').value=dia(-1);
    document.getElementById('cta-ed-monto').value='999';
    boton('ctaEditMetodo', /^QR$/).click();
    ctaEditarPago('C4', 0);                                   // abre el ANTICIPO
    var otro=valEd();
    ctaEditarPago('C4', -1);                                  // Cancelar
    ctaEditarPago('C4', 1);                                   // vuelve a abrir el cobro
    var denuevo=valEd();
    var p=findById('C4'), c=cobrosDe(p)[0]||{};
    return { otro:otro, denuevo:denuevo, fecha:c.fecha, monto:c.monto, seis:dia(-6), hoy:hoy };
  });
  chk('1d · control: abrir OTRO pago muestra lo suyo, no lo tipeado en el primero', r.otro.fecha===r.seis && r.otro.monto==='1000', J(r.otro));
  chk('1d · control: después de «Cancelar» el pago vuelve a abrir con lo guardado', r.denuevo.fecha===r.hoy && r.denuevo.monto==='1000' && r.fecha===r.hoy && r.monto===1000, J(r));

  /* ══ 2 · UNA VENTA SIN MONTO ANOTADO NO MANDA EL PAGO AL FLETE ═════════════════════════════════
     Eduardo carga la venta a un mayorista sin cobro (su formulario no lo pide): pagado NO, a cuenta
     0, saldo 0. El mayorista paga Bs 5.000 y Contabilidad abre la ficha en 🏭 Mayoristas. La ficha
     trataba «sin saldo» como «ya pagada»: mostraba SOLO «🚚 Anotar el recargo por entrega», y desde
     el 25/09 ese botón anotaba los 5.000 como FLETE sin preguntar — fuera de «Ya ingresó», del
     saldo y del Excel de la venta, y la venta seguía «SIN MONTO ANOTADO». */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'M1', nota:'', oc:'09-101', cliente:'DISTRIBUIDORA SIN MONTO', vendedor:'Eduardo Añez',
                productos:[{desc:'COLCHON SOFT',medida:'140x190',cant:10}] }) ];
    releer(); aConta('mayor'); await new Promise(r=>setTimeout(r,150));
    CTA_ULTIMA=''; showContaModal('M1');
    var sel=[].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){ return /ctaSetTipo/.test(b.getAttribute('onclick')||''); }).length;
    var reg=boton('ctaRegistrarPago'), aviso=document.getElementById('cta-sinmonto-aviso');
    var txtBoton=reg?reg.textContent.trim():'';
    // Lo que hacía la persona: llenar el bloque y tocar el botón que había.
    CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['PM1'];
    var m=document.getElementById('cta-pago-monto'); if(m) m.value='5000';
    var n=document.getElementById('cta-pago-nota'); if(n) n.value='900';
    if(reg) reg.click(); else ctaRegistrarPago('M1');      // sin botón: el camino directo tampoco anota nada
    await new Promise(r=>setTimeout(r,60));
    var p=findById('M1');
    return { sel:sel, boton:txtBoton, aviso:aviso?aviso.textContent:'', envCob:envioCobrado(p), cobrado:contaCobrado(p),
             txt:p.metodoPago, sinMonto:sinMontoAnotado(p), ficha:(document.getElementById('modal-box')||{}).textContent||'' };
  });
  chk('2 · la ficha de una venta SIN MONTO ofrece «💵 Pago / 🚚 Recargo» (no solo el flete)', r.sel===2, 'selector '+r.sel);
  chk('2 · arranca en «💵 Pago» y dice que primero va el total, en «Corregir precios y montos»',
      /nadie le anotó cuánto era/.test(r.aviso) && /Corregir precios y montos/.test(r.aviso) && !/Anotar el recargo/.test(r.boton), J({aviso:r.aviso.slice(0,80), boton:r.boton}));
  chk('2 · ⚠️ el pago del mayorista NO queda anotado como flete (ni como nada: falta el total)',
      r.envCob===0 && r.cobrado===0 && r.txt==='' && r.sinMonto===true, J({envCob:r.envCob, cobrado:r.cobrado, txt:r.txt}));
  chk('2 · la ficha sigue diciendo «SIN MONTO ANOTADO» y no «PAGADO» (§9 del 25/09)',
      /SIN MONTO ANOTADO/.test(r.ficha) && !/PAGADO/.test(r.ficha.replace(/SIN MONTO ANOTADO/g,'')), '');

  // 2b · El camino: el total en «Corregir precios y montos» y después el pago le baja el saldo.
  r = await page.evaluate(async () => {
    showContaModal('M1');                                     // (con el panel viejo quedó abierta la ventana del «recargo»)
    var s=document.getElementById('cta-saldo'); s.value='20000';
    boton('ctaGuardarMontos').click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('M1');
    var reg=boton('ctaRegistrarPago'), txtBoton=reg?reg.textContent.trim():'';
    CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['PM1'];
    document.getElementById('cta-pago-monto').value='5000';
    document.getElementById('cta-pago-fecha').value=hoy;
    document.getElementById('cta-pago-nota').value='900';
    reg.click();
    await new Promise(r=>setTimeout(r,60));
    p=findById('M1');
    return { boton:txtBoton, saldo:Number(p.saldo)||0, cobrado:contaCobrado(p), total:ventaTotal(p), envCob:envioCobrado(p), pagado:p.pagado };
  });
  chk('2b · con el total puesto, el bloque vuelve a ser «Registrar pago»', /Registrar pago/.test(r.boton), r.boton);
  chk('2b · ⚠️ y el pago del mayorista le baja el saldo: 20.000 → 15.000, entró 5.000 de la VENTA',
      r.saldo===15000 && r.cobrado===5000 && r.total===20000 && r.envCob===0 && r.pagado===false, J(r));

  // 2c · En la venta SIN MONTO el flete se sigue anotando, eligiendo «🚚 Recargo por entrega».
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'M2', nota:'910', oc:'09-110', cliente:'TIENDA SIN MONTO', vendedor:'Maria Flores' }) ];
    releer(); aConta('ventas'); await new Promise(r=>setTimeout(r,150));
    CTA_ULTIMA=''; showContaModal('M2');
    var bt=boton('ctaSetTipo', /Recargo/); if(bt) bt.click();   // (el panel viejo no tenía selector: ya estaba en el flete)
    var reg=boton('ctaRegistrarPago'), txtBoton=reg?reg.textContent.trim():'';
    CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL2'];
    document.getElementById('cta-pago-monto').value='120';
    document.getElementById('cta-pago-fecha').value=hoy;
    document.getElementById('cta-pago-nota').value='911';
    reg.click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('M2');
    return { boton:txtBoton, envCob:envioCobrado(p), cobrado:totalCobrado(p) };
  });
  chk('2c · en la venta SIN MONTO, eligiendo «🚚 Recargo» el flete se anota como siempre',
      /recargo/i.test(r.boton) && r.envCob===120 && r.cobrado===0, J(r));

  // 2d · Control (25/09): una venta YA PAGADA sigue abriendo el bloque del flete, sin selector.
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'M3', nota:'920', oc:'09-120', cliente:'PAGADA DE VERDAD', pagado:true,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:1500,fecha:hoy,nota:'920',comps:['V3']}]) }) ];
    releer(); aConta('ventas'); await new Promise(r=>setTimeout(r,150));
    CTA_ULTIMA=''; showContaModal('M3');
    var sel=[].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){ return /ctaSetTipo/.test(b.getAttribute('onclick')||''); }).length;
    var reg=boton('ctaRegistrarPago');
    return { sel:sel, boton:reg?reg.textContent.trim():'', aviso:!!document.getElementById('cta-sinmonto-aviso') };
  });
  chk('2d · control: en una venta YA PAGADA el bloque sigue siendo el del flete, sin selector', r.sel===0 && /recargo/i.test(r.boton) && !r.aviso, J(r));

  /* ══ 3 · 📦 PRODUCTOS DEL MES: UNA «PAGADA SIN MONTO» NO ES UNA VENTA DE Bs 0 ═══════════════════
     La venta marcada PAGADA sin anotar cuánto (§4fg: su monto vivía en `cobradoBs`, que no viaja en
     la planilla) entraba al reporte con total CONOCIDO de Bs 0: «Importe total vendido» salía
     completo, sin el «Incompleto» de §4fw, y la conciliación la mostraba como un «ajuste sin
     distribuir» de −Bs 1.500 — un descuento que nadie hizo. */
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'Q1', nota:'301', oc:'09-301', cliente:'CON MONTO', acuenta:1000, saldo:500, metodoPago:'QR BISA %Q1' }),
            P({ id:'Q2', nota:'302', oc:'09-302', cliente:'PAGADA SIN MONTO', pagado:true, metodoPago:'Efectivo %Q2' }) ];
    releer(); aConta('ventas'); await new Promise(r=>setTimeout(r,150));
    segSet('cta-mode','mes'); setContaModo('mes');
    document.getElementById('cta-mes').value=hoy.slice(0,7);
    await abrirProductosMes();
    var R=PM_REPORTE||{}, aj=(R.ajustes||[]).filter(function(a){ return a.nota==='302'; })[0]||{};
    var txt=(document.getElementById('pm-body')||{}).textContent||'';
    pmCerrar();
    return { total:R.total, conocido:R.totalConocido, aj:{total:aj.total, dif:aj.diferencia, motivo:aj.motivo},
             incompleto:/Incompleto/.test(txt), aviso:(R.avisos||[]).filter(function(a){ return /sin monto/.test(a); })[0]||'' };
  });
  chk('3 · ⚠️ con una «PAGADA sin monto» el importe del mes sale «Incompleto» (no Bs 1.500 completo)',
      r.total===null && r.conocido===1500 && r.incompleto===true && /1 pedidos sin monto/.test(r.aviso), J(r));
  chk('3 · …y la conciliación la pone como «Total de venta sin dato», no como un ajuste de −Bs 1.500',
      r.aj.total===null && r.aj.dif===null && /sin dato/.test(r.aj.motivo||''), J(r.aj));

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
