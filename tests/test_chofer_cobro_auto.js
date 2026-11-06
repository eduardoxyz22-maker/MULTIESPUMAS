/* 🚚 EL CHOFER QUE COBRÓ, PUESTO SOLO Y SIN CRUCES (plan del jueves 05/11, item 112; §4eq)
   Octubre: 13 cobros en efectivo de choferes (Bs 39.146); de 8 con chofer asignado, 3 nombran a uno de OTRO camión (Bs 9.866), y 4
   cobros del día de la entrega quedaron a nombre de la vendedora (Bs 4.910).

   LO QUE CUIDA:
   1. «Registrar pago» en efectivo con la fecha de la ENTREGA de una venta a domicilio: viene con «🚚 El chofer» elegido (el del pedido)
      y dice por qué; se guarda `>Nombre` (§4eq).
   2. Si el GPS vio OTRO camión en la casa del cliente ese día, viene con el chofer de ESE camión (el que lo maneja ese día).
   3. Venta de tienda, otro día, ATC, o la persona eligió a la vendedora: la vendedora, como siempre. Cambiar la fecha al día de la
      entrega lo pone (se repinta).
   4. Elegir a mano un chofer de OTRO camión ese día pregunta antes de guardar; Cancelar no guarda nada.
   5. «Corregir»: un efectivo ya anotado de la vendedora NO cambia de mano solo (sale la pista «¿lo cobró el chofer? [🚚 …]»); pasar un QR
      a efectivo lo trae con el chofer; el cruce de camión también pregunta.
   Reloj CLAVADO (jueves 05/11/2026, 10:00 de Bolivia). Sin red; datos inventados.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_chofer_cobro_auto.js */
const { chromium } = require('playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async()=>{
  const browser = await chromium.launch();
  const errores=[];
  const ctx = await browser.newContext({ viewport:{ width:1400, height:1000 }, timezoneId:'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  const dialogos=[]; let rechazar=false;
  page.on('dialog', d => { dialogos.push(d.message()); if(rechazar){ rechazar=false; d.dismiss(); } else d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };

  const r0 = await ev(async () => {
    var c=document.getElementById('conn-form'); if(c) c.style.display='none';
    CONNECTED=true; UNLOCKED=true; try{ localStorage.removeItem(LS_PEND); }catch(e){}
    CARGA_GEN++; CARGA_ESTADO='ok'; try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    apiSave=function(r){ return Promise.resolve({ ok:true, pedido:JSON.parse(JSON.stringify(r)) }); };
    apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(STATE)) }); };
    window.GPS_STUB={};
    gpsLlegadaDe=function(p){ return (p && window.GPS_STUB[p.id]) || null; };
    var hoy='2026-11-05', ts=new Date('2026-11-01T11:00:00-04:00').getTime();
    var P=function(id, o){ var b={ id:id, oc:'11-'+id, nota:'7'+id.replace(/\D/g,''), cliente:'CLIENTE '+id.toUpperCase(), celular:'70000001', fecha:hoy, turno:'AM', zona:'Norte',
      direccion:'Calle Inventada 1', vendedor:'Carola Chavez', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1, precio:2000 }], saldo:1000, acuenta:1000, pagado:false,
      ts:ts, rev:1, vehiculo:'Foton nuevo', chofer:'Luis Eyzaguirre', metodoPago:'~QR BISA 1000 @2026-11-01 #7'+id.replace(/\D/g,'')+' %A'+id }; for(var k in o) b[k]=o[k]; return b; };
    STATE=[
      P('p1', {}), P('p9', {}), P('p10', {}), P('p11', {}),
      P('p2', {}),
      P('p3', { vehiculo:'Foton encarpado', chofer:'Miguel', cliente:'OTRO PEDIDO DEL ENCARPADO' }),
      P('p4', { fecha:'', turno:'', zona:'TIENDA', direccion:'SALIÓ DE TIENDA · Central', vehiculo:'', chofer:'', entregado:true }),
      P('p5', { fecha:'2026-11-04' }),
      P('p6', { vehiculo:'Carry', chofer:'Luis Pierre', saldo:0, pagado:true, metodoPago:'~QR BISA 1000 @2026-11-01 #76 %A6 + Efectivo 1000 @2026-11-05 #76 %E6' }),
      P('p7', { vehiculo:'Carry', chofer:'Luis Pierre', saldo:0, pagado:true, metodoPago:'~QR BISA 1000 @2026-11-01 #77 %A7 + QR BISA 1000 @2026-11-05 #77 %Q7' }),
      P('p8', { oc:'ATC 11-008', saldo:0, acuenta:0, metodoPago:'' })
    ];
    window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    window._abrir=function(id){ CTA_ULTIMA=''; showContaModal(id); };
    window._rec=function(modo){ var b=document.querySelector('#cta-recibio[data-modo="'+(modo||'pa')+'"]'); if(!b) return { hay:false };
      var on=[].filter.call(b.querySelectorAll('button'), function(x){ return /var\(--teal\)/.test(x.getAttribute('style')||''); }).map(function(x){ return x.textContent.trim(); });
      var sel=b.querySelector('select');
      return { hay:true, on:on, sel:sel ? sel.value : '', txt:b.textContent.replace(/\s+/g,' ').trim() }; };
    window._registrar=async function(id){ var n=document.getElementById('cta-pago-nota'); if(n) n.value='9'+id.replace(/\D/g,''); CTA_PAGO.comps=['R'+id]; ctaRegistrarPago(id); await _esp(120); closeModal(); await _esp(30); };
    window._ultimo=function(id){ var L=cobrosDe(findById(id)); return L[L.length-1]||null; };
    return true;
  });
  chk('0. arma el panel de prueba', r0===true, r0);

  /* 1 · el chofer del pedido */
  const r1 = await ev(async () => {
    _abrir('p1'); await _esp(60);
    var a=_rec(); await _registrar('p1');
    var c=_ultimo('p1'); return { a:a, c:c && { m:c.metodo, r:c.recibio, f:c.fecha, monto:c.monto } };
  });
  chk('1a. pago en efectivo HOY, que es el día de la entrega: viene con «🚚 El chofer» Luis Eyzaguirre', r1.a.hay && r1.a.on.some(t=>/El chofer/.test(t)) && r1.a.sel==='Luis Eyzaguirre', r1.a);
  chk('1b. …y dice por qué: «Puesto solo: es el día de la entrega y es el chofer del pedido (Foton nuevo)»', /Puesto solo: es el día de la entrega y es el chofer del pedido \(Foton nuevo\)/.test(r1.a.txt), r1.a.txt);
  chk('1c. se guarda a nombre del chofer (>Luis Eyzaguirre), del 05/11', r1.c && r1.c.m==='Efectivo' && r1.c.r==='Luis Eyzaguirre' && r1.c.f==='2026-11-05' && r1.c.monto===1000, r1.c);

  /* 2 · el GPS vio otro camión en la casa */
  const r2 = await ev(async () => {
    GPS_STUB.p2={ veh:'Foton encarpado', t0:Date.now()-3600000, t1:Date.now()-3000000, m:40 };
    _abrir('p2'); await _esp(60);
    var a=_rec(); await _registrar('p2');
    var c=_ultimo('p2'); delete GPS_STUB.p2; return { a:a, r:c && c.recibio };
  });
  chk('2a. el GPS vio el Foton encarpado en la casa: viene con su chofer de ese día (Miguel, el de sus pedidos de hoy)', r2.a.sel==='Miguel' && /el GPS vio el Foton encarpado en la casa del cliente/.test(r2.a.txt), r2.a);
  chk('2b. se guarda a nombre de Miguel, sin preguntar (es el camión que fue)', r2.r==='Miguel', r2);

  /* 3 · lo que sigue con la vendedora */
  const r3 = await ev(async () => {
    var o={};
    _abrir('p4'); await _esp(40); o.tienda=_rec(); closeModal();
    _abrir('p5'); await _esp(40); o.otroDia=_rec();
    var f=document.getElementById('cta-pago-fecha'); f.value='2026-11-04'; f.dispatchEvent(new Event('change', { bubbles:true })); await _esp(80);
    o.alCambiar=_rec(); o.fechaQueda=(document.getElementById('cta-pago-fecha')||{}).value;
    await _registrar('p5'); o.r5=_ultimo('p5').recibio;
    _abrir('p9'); await _esp(40); o.antes=_rec(); ctaSetRecibio('p9', ''); await _esp(40); o.eligio=_rec(); await _registrar('p9'); o.r1=_ultimo('p9').recibio;
    _abrir('p8'); await _esp(40); o.atc=ctaChoferSugerido(findById('p8'), '2026-11-05'); closeModal();
    return o;
  });
  chk('3a. venta de tienda: la vendedora (sin chofer puesto)', r3.tienda.hay && !r3.tienda.sel && r3.tienda.on.some(t=>/Carola/.test(t)), r3.tienda);
  chk('3b. la entrega era AYER y el pago es de hoy: la vendedora', r3.otroDia.hay && !r3.otroDia.sel, r3.otroDia);
  chk('3c. al poner la fecha del pago en el día de la entrega (04/11) se repinta con el chofer, y la fecha queda', r3.alCambiar.sel==='Luis Eyzaguirre' && r3.fechaQueda==='2026-11-04' && r3.r5==='Luis Eyzaguirre', r3);
  chk('3d. si la persona elige a la vendedora, queda la vendedora (no se vuelve a poner solo)', r3.antes.sel==='Luis Eyzaguirre' && !r3.eligio.sel && r3.r1==='', r3);
  chk('3e. una ATC no se cobra: nada', r3.atc===null, r3.atc);

  /* 4 · un chofer de otro camión pregunta */
  dialogos.length=0; rechazar=true;
  const r4 = await ev(async () => {
    var n0=cobrosDe(findById('p10')).length;
    _abrir('p10'); await _esp(40); ctaSetRecibio('p10', 'Cristhian'); await _esp(40);
    await _registrar('p10');
    var o={ guardo:cobrosDe(findById('p10')).length>n0 };
    return o;
  });
  chk('4a. elegir a Cristhian (Foton encarpado) cuando el pedido iba en el Foton nuevo pregunta, y Cancelar no guarda', !r4.guardo && dialogos.some(m=>/Ese día el pedido lo llevó el Foton nuevo \(Luis Eyzaguirre\)/.test(m) && /Cristhian es del Foton encarpado/.test(m)), { r4, dialogos });
  dialogos.length=0;
  const r4b = await ev(async () => { _abrir('p10'); await _esp(40); ctaSetRecibio('p10', 'Cristhian'); await _esp(40); await _registrar('p10'); return _ultimo('p10').recibio; });
  chk('4b. con Aceptar se guarda a nombre de Cristhian', r4b==='Cristhian' && dialogos.length>=1, { r4b, dialogos });
  dialogos.length=0;
  const r4c = await ev(async () => { _abrir('p11'); await _esp(40); ctaSetRecibio('p11', 'Luis Eyzaguirre'); await _esp(40); await _registrar('p11'); return _ultimo('p11').recibio; });
  chk('4c. el chofer del pedido elegido a mano no pregunta', r4c==='Luis Eyzaguirre' && !dialogos.some(m=>/recibió esta plata/.test(m)), { r4c, dialogos });

  /* 5 · «Corregir» */
  dialogos.length=0;
  const r5 = await ev(async () => {
    var o={};
    _abrir('p6'); await _esp(40); ctaEditarPago('p6', 1); await _esp(60);
    o.abre=_rec('ed'); o.pista=!!document.querySelector('#cta-recibio[data-modo="ed"] .ctr-pista');
    ctaGuardarPago('p6', 1); await _esp(80); o.sinTocar=cobrosDe(findById('p6'))[0].recibio;
    _abrir('p6'); await _esp(40); ctaEditarPago('p6', 1); await _esp(60);
    var b=document.querySelector('#cta-recibio[data-modo="ed"] .ctr-pista button'); if(b) b.click(); await _esp(60);
    o.trasPista=_rec('ed'); ctaGuardarPago('p6', 1); await _esp(80); o.conPista=cobrosDe(findById('p6'))[0].recibio;
    _abrir('p7'); await _esp(40); ctaEditarPago('p7', 1); await _esp(60); ctaEditMetodo('p7', 'Efectivo'); await _esp(60);
    o.aEfectivo=_rec('ed'); ctaGuardarPago('p7', 1); await _esp(80); var c7=cobrosDe(findById('p7'))[0]; o.p7={ m:c7.metodo, r:c7.recibio };
    closeModal(); return o;
  });
  chk('5a. corregir un efectivo de la vendedora del día de la entrega: sigue con la vendedora y sale la pista «¿lo cobró el chofer? [🚚 Luis Pierre]»', r5.abre.hay && !r5.abre.sel && r5.pista &&
    /¿lo cobró el chofer\?/.test(r5.abre.txt) && /🚚 Luis Pierre/.test(r5.abre.txt), r5.abre);
  chk('5b. guardar sin tocar no lo cambia de mano', r5.sinTocar==='', r5);
  chk('5c. tocar la pista lo pasa al chofer y se guarda', r5.trasPista.sel==='Luis Pierre' && r5.conPista==='Luis Pierre', r5);
  chk('5d. pasar un QR del día de la entrega a efectivo lo trae con el chofer («Puesto solo») y se guarda así', r5.aEfectivo.sel==='Luis Pierre' && /Puesto solo/.test(r5.aEfectivo.txt) && r5.p7.m==='Efectivo' && r5.p7.r==='Luis Pierre', r5);
  rechazar=true; dialogos.length=0;
  const r5e = await ev(async () => {
    _abrir('p7'); await _esp(40); ctaEditarPago('p7', 1); await _esp(60); ctaEditRecibio('p7', 'Fernando'); await _esp(40);
    ctaGuardarPago('p7', 1); await _esp(80); var r=cobrosDe(findById('p7'))[0].recibio; closeModal(); return r;
  });
  chk('5e. corregir a un chofer de otro camión (Fernando, Foton insumo) pregunta, y Cancelar deja el de antes', r5e==='Luis Pierre' && dialogos.some(m=>/Fernando es del Foton insumo/.test(m)), { r5e, dialogos });

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
