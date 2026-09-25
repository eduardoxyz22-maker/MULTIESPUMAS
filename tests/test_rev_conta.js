/* 🧾 REVISIÓN DE CONTABILIDAD Y DEL CUADRE (25/09)

   Lo que encontró la revisión del 25/09, una sección por arreglo. Todo se arma por los
   mismos botones que usa la gente (la ficha de Contabilidad, la tabla de Administración,
   el formulario) y con el reloj CLAVADO en un miércoles de mitad de mes, para que la prueba
   no se pudra a fin de mes ni los domingos.

     1. En una venta YA PAGADA la ficha muestra solo «🚚 Cobrar el recargo por entrega»: su
        botón anota el FLETE, no un «cobro de más» de la venta (regresión de §4fk).
     2. El 💰✓ de la tabla de Administración deshace solo los cobros de la puerta, nunca el QR
        que registró Contabilidad ni el 2° método de un adelanto mixto.
     3. Corregir desde el formulario una venta con pago MIXTO no le cambia el día al adelanto
        (lo de §4fr, que cubría solo el adelanto simple).
     4. «Guardar precios y montos» sobre una venta «PAGADA sin monto» no le borra el método ni
        el recibo al adelanto (§4fg: todo lo que reescribe el historial usa `cobrosReales`).
     5. …y cargarle solo el PRECIO de un ítem no la desmarca de pagada.

   Red cortada, servidor simulado. Se corre:  node tests/test_rev_conta.js
   Dientes:   PEDIDOS=/ruta/a/un/pedidos.html/viejo node tests/test_rev_conta.js            */
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
    window._borradas=[];
    apiBorrarFoto=function(f){ window._borradas.push(f); return Promise.resolve({ok:true}); };
    // La lista vuelve con las filas tal cual están (y los retiros), como la planilla.
    apiList=function(){ return new Promise(function(res){ setTimeout(function(){ res({ok:true, pedidos:JSON.parse(JSON.stringify(STATE.concat(RETIROS)))}); },0); }); };
    var al=document.getElementById('admin-lock'); if(al) al.style.display='none';
    var ac=document.getElementById('admin-content'); if(ac) ac.style.display='block';
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
    window.aConta=function(){ showView('conta'); segSet('cta-tab','ventas'); setContaTab('ventas'); renderConta(); };
    // El botón que la ficha MUESTRA para registrar (no la función a mano).
    window.botonRegistrar=function(){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){ return /ctaRegistrarPago/.test(b.getAttribute('onclick')||''); })[0]||null; };
    window.selectorVisible=function(){ return [].slice.call(document.querySelectorAll('#modal-box button')).filter(function(b){ return /ctaSetTipo/.test(b.getAttribute('onclick')||''); }).length; };
  });

  /* ══ 1 · EL FLETE DE UNA VENTA YA PAGADA ══════════════════════════════════════════
     Venta pagada entera en la tienda, con Bs 150 de flete PACTADO que se cobra al entregar. El
     chofer vuelve con los 150 y Contabilidad los anota desde la ficha. La ficha no muestra el
     selector «💵 Pago / 🚚 Recargo» (no hay saldo): el bloque entero dice «🚚 Cobrar el recargo
     por entrega — pactado Bs 150» y su botón «Registrar el cobro del flete». Desde §4fk ese botón
     preguntaba «¿cobro de MÁS?… usá el botón 🚚» (que no está) y, aceptando, los 150 entraban
     como pago de la venta: saldo −150 y el flete seguía «por cobrar» (el chofer lo volvía a cobrar). */
  D.confirm=true; D.vistos=[];
  let r = await page.evaluate(async () => {
    STATE=[ P({ id:'F1', nota:'70', oc:'09-070', cliente:'PAGADA CON FLETE', pagado:true,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:3000,fecha:hoy,nota:'70',comps:['V70']},
                                        {envio:true,metodo:'',monto:150}]) }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('F1');
    var sel=selectorVisible(), b=botonRegistrar();
    CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL70'];
    document.getElementById('cta-pago-monto').value='150';
    document.getElementById('cta-pago-fecha').value=hoy;
    document.getElementById('cta-pago-nota').value='71';
    var txtBoton=b?b.textContent:'';
    if(b) b.click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('F1');
    return { sel:sel, boton:txtBoton, envCob:envioCobrado(p), envPend:envioPorCobrar(p), cobrado:totalCobrado(p),
             saldo:Number(p.saldo)||0, pagado:p.pagado, exceso:excesoCobro(p), txt:p.metodoPago };
  });
  chk('1 · la ficha de una venta pagada no ofrece el selector: el bloque es el del flete', r.sel===0 && /flete/i.test(r.boton), r.boton);
  chk('1 · ⚠️ su botón anota el FLETE (150 cobrados, nada pactado pendiente)', r.envCob===150 && r.envPend===0, J({envCob:r.envCob, envPend:r.envPend, txt:r.txt}));
  chk('1 · ⚠️ …y NO un «cobro de más» de la venta (saldo 0, sigue pagada)', r.cobrado===0 && r.saldo===0 && r.pagado===true && r.exceso===0, J({cobrado:r.cobrado, saldo:r.saldo, exceso:r.exceso}));
  chk('1 · ⚠️ …sin preguntar «¿cobro de MÁS?» por un botón que no existe', !D.vistos.some(function(t){ return /cobro de MÁS/.test(t); }), D.vistos.join(' | ').slice(0,160));

  // 1b · Venta pagada SIN flete pactado: «Anotar el recargo» también anota un flete.
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'F2', nota:'72', oc:'09-072', cliente:'PAGADA SIN FLETE', pagado:true,
                metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:1500,fecha:hoy,nota:'72',comps:['V72']}]) }) ];
    releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('F2');
    var b=botonRegistrar();
    CTA_PAGO.metodo='Efectivo'; CTA_PAGO.comps=['FL72'];
    document.getElementById('cta-pago-monto').value='80';
    document.getElementById('cta-pago-fecha').value=hoy;
    document.getElementById('cta-pago-nota').value='73';
    var txtBoton=b?b.textContent:'';
    if(b) b.click();
    await new Promise(r=>setTimeout(r,60));
    var p=findById('F2');
    return { boton:txtBoton, envCob:envioCobrado(p), cobrado:totalCobrado(p), saldo:Number(p.saldo)||0 };
  });
  chk('1b · «Anotar el recargo» en una venta pagada sin flete anota el flete, no un cobro de más', /recargo/i.test(r.boton) && r.envCob===80 && r.cobrado===0 && r.saldo===0, J(r));

  /* 1c · §4fk sigue valiendo donde SÍ se eligió «💵 Pago de la venta»: la ficha se abrió con
     saldo (selector a la vista, «Pago» elegido) y, antes de tocar el botón, otro dispositivo
     saldó la venta. Ahí se pregunta; si se dice que NO, no se anota nada. */
  D.confirm=false; D.vistos=[];
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'F3', nota:'74', oc:'09-074', cliente:'SE SALDÓ EN OTRA COMPU', acuenta:500, saldo:1000,
                metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:500,fecha:hoy,nota:'74',comps:['V74']}]) }) ];
    releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('F3');
    var sel=selectorVisible(), b=botonRegistrar();
    // …otro dispositivo registró los 1.000 (la lista trajo la fila nueva) sin repintar esta ficha:
    var p=findById('F3');
    p.metodoPago=textoCobros([{anticipo:true,metodo:'Efectivo',monto:500,fecha:hoy,nota:'74',comps:['V74']},
                              {metodo:'QR',banco:'BISA',monto:1000,fecha:hoy,nota:'75',comps:['Q75']}]);
    p.saldo=0; p.pagado=true;
    CTA_PAGO.metodo='QR'; CTA_PAGO.banco='BISA'; CTA_PAGO.comps=['Q76'];
    document.getElementById('cta-pago-monto').value='1000';
    document.getElementById('cta-pago-fecha').value=hoy;
    document.getElementById('cta-pago-nota').value='76';
    if(b) b.click();
    await new Promise(r=>setTimeout(r,60));
    p=findById('F3');
    return { sel:sel, cobros:cobrosDe(p).length, envios:enviosDe(p).length };
  });
  chk('1c · §4fk: con «💵 Pago» a la vista y la venta saldada por otro, PREGUNTA antes de anotar', r.sel===2 && D.vistos.some(function(t){ return /ya está pagada/.test(t); }), D.vistos.join(' | ').slice(0,120));
  chk('1c · …y si se dice que NO, no se anota nada (ni cobro ni flete)', r.cobros===1 && r.envios===0, J(r));
  D.confirm=true;

  /* ══ 2 · EL 💰✓ DE LA TABLA DE ADMINISTRACIÓN ═══════════════════════════════════════
     Sobre una venta pagada, 💰✓ «deshace el cobro». Con UN solo cobro no preguntaba nada, y
     ese cobro podía ser el QR de Bs 600 que registró Contabilidad con su recibo y su captura,
     o el 2° método de un adelanto mixto: un toque y la venta volvía a «DEBE», para que el chofer
     le cobrara de nuevo al cliente. Deshace SOLO los cobros de la puerta (§4fy), como el ↺ del
     chofer: los que se anotan sin recibo ni imagen (el chofer y el mismo 💰). */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    var ayer=dia(-1);
    STATE=[
      P({ id:'Q1', nota:'50', oc:'09-050', cliente:'QR REGISTRADO', acuenta:1000, pagado:true,
          metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:1000,fecha:ayer,nota:'50',comps:['A1']},
                                  {metodo:'QR',banco:'BISA',monto:600,fecha:hoy,nota:'1750',comps:['CAP']}]) }),
      P({ id:'Q2', nota:'51', oc:'09-051', cliente:'MIXTO', acuenta:2000, pagado:true,
          metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:1500,fecha:ayer,nota:'51',comps:['E1']},
                                  {metodo:'QR',banco:'BISA',monto:500,fecha:ayer,nota:'51',comps:['Q1']}]) }),
      P({ id:'Q3', nota:'52', oc:'09-052', cliente:'PUERTA', pagado:true,
          metodoPago:textoCobros([{metodo:'Efectivo',monto:900,fecha:hoy,recibio:'Luis Pierre'}]) }),
      P({ id:'Q4', nota:'53', oc:'09-053', cliente:'LAS DOS COSAS', acuenta:500, pagado:true,
          metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:500,fecha:ayer,nota:'53',comps:['A4']},
                                  {metodo:'QR',banco:'BISA',monto:700,fecha:hoy,nota:'1760',comps:['CAP4']},
                                  {metodo:'Efectivo',monto:300,fecha:hoy}]) })
    ];
    RETIROS=[]; releer();
    var foto=function(id){ var p=findById(id); return { pagado:p.pagado, saldo:Number(p.saldo)||0, cobros:cobrosDe(p).map(function(c){ return c.metodo+' '+c.monto; }) }; };
    var out={};
    quickCobrado('Q1'); out.q1=foto('Q1');
    quickCobrado('Q2'); out.q2=foto('Q2');
    quickCobrado('Q3'); out.q3=foto('Q3');
    quickCobrado('Q4'); out.q4=foto('Q4');
    return out;
  });
  chk('2 · ⚠️ 💰✓ NO borra el QR que registró Contabilidad (con recibo y captura)', J(r.q1.cobros)===J(['QR 600']) && r.q1.pagado===true && r.q1.saldo===0, J(r.q1));
  chk('2 · ⚠️ …ni el 2° método de un adelanto mixto', J(r.q2.cobros)===J(['QR 500']) && r.q2.pagado===true && r.q2.saldo===0, J(r.q2));
  chk('2 · el cobro de la puerta SÍ se deshace, como siempre (la venta vuelve a deber 900)', r.q3.cobros.length===0 && r.q3.pagado===false && r.q3.saldo===900, J(r.q3));
  chk('2 · con las dos cosas, se va SOLO el de la puerta (debe 300, el QR queda)', J(r.q4.cobros)===J(['QR 700']) && r.q4.saldo===300 && r.q4.pagado===false, J(r.q4));
  chk('2 · …y el aviso nombra el de la puerta y dice que el otro NO se toca', D.vistos.some(function(t){ return /300/.test(t) && /NO se toca/.test(t); }), D.vistos.join(' | ').slice(0,200));

  /* ══ 3 · CORREGIR UNA VENTA CON PAGO MIXTO DESDE EL FORMULARIO ══════════════════════
     §4fr hizo que corregir el adelanto desde el formulario conserve su fecha y su recibo… pero
     solo el adelanto SIMPLE. Con pago mixto (Efectivo 1.500 + QR 500 el 28/08) la vendedora
     corregía el SALDO el 16/09 y los dos renglones pasaban a «hoy»: Bs 2.000 salían del cuadre de
     AGOSTO (ya arqueado) y entraban en el de septiembre. */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    var tsAgo=new Date('2026-08-28T12:00:00').getTime();
    var mixto=function(ant, m2, n){ return textoCobros([{anticipo:true,metodo:'Efectivo',monto:ant,fecha:'2026-08-28',nota:n,comps:['E'+n]},
                                                        {metodo:'QR',banco:'BISA',monto:m2,fecha:'2026-08-28',nota:n,comps:['Q'+n]}]); };
    STATE=[ P({ id:'M1', nota:'61', oc:'08-061', cliente:'MIXTO DE AGOSTO', ts:tsAgo, acuenta:2000, saldo:1000,
                metodoPago:mixto(1500,500,'61'), productos:[{desc:'COLCHON',cant:1,precio:3000}] }),
            P({ id:'M2', nota:'62', oc:'08-062', cliente:'MIXTO, CAMBIA EL QR', ts:tsAgo, acuenta:2000, saldo:1000,
                metodoPago:mixto(1500,500,'62'), productos:[{desc:'COLCHON',cant:1,precio:3000}] }) ];
    RETIROS=[]; releer();
    var fechas=function(id){ return contaPagos(findById(id)).map(function(c){ return (c.anticipo?'ANT ':'')+c.metodo+' '+c.monto+' @'+c.fecha+' #'+limpiaNota(c.nota); }); };
    var cuadreMes=function(id, mes){
      var t=0; contaPagos(findById(id)).forEach(function(c){ if(String(c.fecha).slice(0,7)===mes) t=r2(t+c.monto); }); return t; };
    var out={};
    // (a) solo corrige el SALDO
    editPedido('M1'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-saldo').value='900';
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    var p1=findById('M1');
    out.a={ pagos:fechas('M1'), agosto:cuadreMes('M1','2026-08'), septiembre:cuadreMes('M1','2026-09'),
            saldo:Number(p1.saldo)||0, acuenta:Number(p1.acuenta)||0, mixto:!!mixtoDe(p1) };
    // (b) corrige el monto del 2° método (500 → 600): el 1° pasa a 1.400, la plata sigue siendo de agosto
    editPedido('M2'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-monto2').value='600';
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    var p2=findById('M2');
    out.b={ pagos:fechas('M2'), agosto:cuadreMes('M2','2026-08'), septiembre:cuadreMes('M2','2026-09'), mixto:!!mixtoDe(p2) };
    return out;
  });
  chk('3 · ⚠️ corregir el SALDO de una venta con pago mixto NO muda el adelanto de día', r.a.pagos.every(function(t){ return /@2026-08-28 #61$/.test(t); }) && r.a.pagos.length===2, J(r.a.pagos));
  chk('3 · ⚠️ …los Bs 2.000 siguen en el cuadre de AGOSTO (no en septiembre)', r.a.agosto===2000 && r.a.septiembre===0, J({agosto:r.a.agosto, septiembre:r.a.septiembre}));
  chk('3 · …y la corrección sí entró (saldo 900, A cuenta 2.000, sigue siendo mixto)', r.a.saldo===900 && r.a.acuenta===2000 && r.a.mixto===true, J(r.a));
  chk('3 · cambiar el monto del 2° método tampoco cambia el día del adelanto', J(r.b.pagos)===J(['ANT Efectivo 1400 @2026-08-28 #62','QR 600 @2026-08-28 #62']) && r.b.agosto===2000 && r.b.mixto===true, J(r.b));

  /* ══ 4 · «GUARDAR PRECIOS Y MONTOS» SOBRE UNA VENTA «PAGADA SIN MONTO» (§4fg) ══════════
     La venta vieja que se marcó PAGADA sin anotar cuánto guarda solo el método suelto con su
     recibo («Efectivo %REC»). La ficha la muestra con A cuenta 0 y «Total Bs 0»: la contadora
     pone 1.500 en «A cuenta» y guarda. `aplicarMontos` reescribía el historial con `cobrosDe` —el
     pago de mentira de §4fg— y armaba el adelanto SIN método: el recibo quedaba colgado, el pago
     en «sin método anotado» y los Bs 1.500 fuera de la caja del Cuadre. */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    var ayer=dia(-1);
    STATE=[ P({ id:'S1', nota:'77', oc:'09-077', cliente:'PAGADA SIN MONTO', ts:new Date(ayer+'T12:00:00').getTime(),
                pagado:true, metodoPago:'Efectivo %REC77', productos:[{desc:'COLCHON',cant:1}] }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('S1');
    document.getElementById('cta-acuenta').value='1500';
    ctaGuardarMontos('S1');
    await new Promise(r=>setTimeout(r,60));
    var p=findById('S1');
    segSet('cta-tab','cuadre'); setContaTab('cuadre'); document.getElementById('cua-vendedor').value='';
    segSet('cua-mode','dia'); document.getElementById('cua-dia').value=ayer; setCuadreModo('dia');
    var formas=cuadrePorForma(cuadrePagos()).map(function(f){ return f.forma+' '+f.monto; });
    return { pagos:contaPagos(p).map(function(c){ return { met:c.metodo, monto:c.monto, fecha:c.fecha, comps:compsArr(c.comps!=null?c.comps:c.comp), ant:!!c.anticipo }; }),
             cobrado:contaCobrado(p), venta:ventaTotal(p), pagado:p.pagado, saldo:Number(p.saldo)||0, formas:formas, txt:p.metodoPago };
  });
  chk('4 · ⚠️ el adelanto anotado conserva el MÉTODO de la venta (Efectivo, no «sin método»)', r.pagos.length===1 && r.pagos[0].met==='Efectivo' && r.pagos[0].monto===1500, J(r.pagos));
  chk('4 · ⚠️ …y su RECIBO (la imagen no queda colgada)', r.pagos.length===1 && J(r.pagos[0].comps)===J(['REC77']), J({pagos:r.pagos, txt:r.txt}));
  chk('4 · ⚠️ …así que en el Cuadre del día entra en la CAJA (Efectivo 1.500)', J(r.formas)===J(['Efectivo 1500']), J(r.formas));
  chk('4 · …una sola vez: cobrado = total de la venta = 1.500, pagada', r.cobrado===1500 && r.venta===1500 && r.pagado===true && r.saldo===0, J({cobrado:r.cobrado, venta:r.venta, pagado:r.pagado}));

  /* ══ 5 · CARGARLE EL PRECIO A UNA VENTA «PAGADA SIN MONTO» ═══════════════════════════
     La caja «✏️ Corregir precios y montos» sirve sobre todo para el precio de cada ítem. En una
     venta vieja «PAGADA sin monto», cargar el precio del colchón y tocar «💾 Guardar» —sin tocar
     A cuenta ni Saldo— la DESMARCABA de pagada (`pagado = saldo 0 && (adelanto>0 || cobrado>0)`,
     y el monto de esas ventas no se conoce): el pago desaparecía de la ficha, se iba el botón
     «💵 Anotar el monto», el Excel pasaba a «SIN MONTO» y al chofer le decía «preguntá antes de
     entregar» sobre una venta cobrada. */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    var ayer=dia(-1), out={};
    var mk=function(id, mp){ return P({ id:id, nota:id.slice(1), oc:'09-0'+id.slice(1), cliente:'VIEJA '+id, ts:new Date(ayer+'T12:00:00').getTime(),
                                         pagado:true, metodoPago:mp, productos:[{desc:'COLCHON',medida:'140x190',cant:1}] }); };
    STATE=[ mk('P80','Efectivo %REC80'),
            mk('P81','QR BISA %REC81 + '+textoCobros([{envio:true,metodo:'Efectivo',monto:100,fecha:ayer,nota:'81',comps:['F81']}])) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    ['P80','P81'].forEach(function(id){
      CTA_ULTIMA=''; showContaModal(id);
      document.getElementById('cta-pr-0').value='1500';
      ctaGuardarMontos(id);
      var p=findById(id);
      out[id]={ pagado:p.pagado, precio:prodPrecio(p.productos[0]), pagos:contaPagos(p).map(function(c){ return (c.envio?'E:':'')+cobroMetodoTxt(c)+' '+compsArr(c.comps!=null?c.comps:c.comp).join(','); }),
                pago:contaPagoTxt(p), ruta:cobroRutaTxt(p).t };
    });
    closeModal();
    return out;
  });
  chk('5 · ⚠️ cargar el precio y guardar NO desmarca de pagada una venta «PAGADA sin monto»', r.P80.pagado===true && r.P80.precio===1500 && /^PAGADO/.test(r.P80.pago), J(r.P80));
  chk('5 · ⚠️ …el pago (con su recibo) sigue en la ficha, y al chofer no le dice «sin monto»', J(r.P80.pagos)===J(['Efectivo REC80']) && /PAGADO/.test(r.P80.ruta), J({pagos:r.P80.pagos, ruta:r.P80.ruta}));
  chk('5 · …lo mismo con un flete cobrado al lado (el flete no se toca)', r.P81.pagado===true && J(r.P81.pagos)===J(['QR BISA REC81','E:Efectivo F81']), J(r.P81));

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
