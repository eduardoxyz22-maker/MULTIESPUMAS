/* 🧾 SEGUNDA REVISIÓN DE CONTABILIDAD → 📋 VENTAS Y 🏭 MAYORISTAS (26/09)

   Una sección por arreglo. Todo por los botones que usa la gente (la ficha de Contabilidad),
   con el reloj CLAVADO en un miércoles de mitad de mes (no se pudre a fin de mes ni los domingos).

     1. «✏️ Corregir este pago»: la fecha, el monto y el recibo van ARRIBA del método. Tocar «QR» o
        el banco repintaba la ficha y los volvía a lo viejo: «💾 Guardar» corregía solo el método y el
        pago seguía con la fecha y el monto de antes. Lo mismo con ✅ «Pago registrado en sistema».

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

  chk('sin errores JS', errores.length===0, J(errores.slice(0,3)));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
