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
     6. El monto de una «PAGADA sin monto» que se escribe en el formulario queda con el día de
        la venta (como «💵 Anotar el monto»), no con el de hoy.
     7. El Excel del Cuadre marca los pagos de FLETE, como ya lo hacen la pantalla y el texto.
     8. «Buscar» de Contabilidad → Ventas no distingue acentos (como Administración y el Cuadre).
     9. La ficha de una venta «SIN MONTO ANOTADO» no dice «Saldo: PAGADO».
    10. En Ventas («Pagos recibidos») y en el Excel de Contabilidad el flete dice que es flete.
    11. «1.500» tipeado en «Corregir precios y montos» es 1.500 (como en «Registrar pago»), no 1,50.

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

  /* ══ 6 · EL MONTO DE UNA «PAGADA SIN MONTO» ESCRITO EN EL FORMULARIO ═════════════════
     Venta de AGOSTO «PAGADA sin monto». En septiembre la vendedora le corrige la dirección; el
     formulario no deja guardar sin el «MONTO TOTAL COBRADO» (a propósito) y ella escribe 1.500.
     El pago quedaba fechado HOY: Bs 1.500 cobrados en agosto aparecían en la caja del 16/09 y en
     el «efectivo por retirar» de la vendedora, que ya los había rendido. «💵 Anotar el monto» de
     Contabilidad, para lo mismo, usa el día de la venta. */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    var out={}, tsAgo=new Date('2026-08-20T12:00:00').getTime();
    var pagos=function(id){ return contaPagos(findById(id)).map(function(c){ return (c.anticipo?'ANT ':'')+c.metodo+' '+c.monto+' @'+c.fecha+' '+compsArr(c.comps!=null?c.comps:c.comp).join(','); }); };
    STATE=[ P({ id:'V1', nota:'90', oc:'08-090', cliente:'VIEJA DE AGOSTO', ts:tsAgo, pagado:true, metodoPago:'Efectivo %REC90',
                productos:[{desc:'COLCHON',cant:1,precio:1500}] }),
            P({ id:'V2', nota:'92', oc:'09-092', cliente:'DEBÍA Y PAGÓ HOY', ts:tsAgo, acuenta:0, saldo:1500, metodoPago:'',
                productos:[{desc:'COLCHON',cant:1,precio:1500}] }) ];
    RETIROS=[]; releer();
    // (a) la vieja «PAGADA sin monto»: dirección nueva + el monto que pide el formulario
    editPedido('V1'); await new Promise(r=>setTimeout(r,200));
    document.getElementById('f-direccion').value='Calle nueva 123';
    document.getElementById('f-cobrado').value='1500';
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    out.vieja={ pagos:pagos('V1'), dir:findById('V1').direccion, pagado:findById('V1').pagado };
    // (b) control: la que DEBÍA y se marca «SÍ, pagado» hoy sigue entrando hoy
    editPedido('V2'); await new Promise(r=>setTimeout(r,200));
    segSet('f-pagado','SI'); if(typeof updateMetodoVisibility==='function') updateMetodoVisibility();
    segSet('f-metodo','Efectivo'); updateMetodoVisibility();
    FORM_COMPS=['REC92']; document.getElementById('f-cobrado').value='1500';
    submitPedido(); await new Promise(r=>setTimeout(r,400));
    out.debia={ pagos:pagos('V2'), pagado:findById('V2').pagado };
    return out;
  });
  chk('6 · ⚠️ el monto de una «PAGADA sin monto» escrito en el formulario queda con el DÍA DE LA VENTA', J(r.vieja.pagos)===J(['ANT Efectivo 1500 @2026-08-20 REC90']) && r.vieja.dir==='Calle nueva 123' && r.vieja.pagado===true, J(r.vieja));
  chk('6 · control: la venta que debía y se paga HOY sigue entrando con la fecha de hoy', J(r.debia.pagos)===J(['ANT Efectivo 1500 @2026-09-16 REC92']) && r.debia.pagado===true, J(r.debia));

  /* ══ 7 · EL EXCEL DEL CUADRE SEPARA EL FLETE, COMO LA PANTALLA Y EL TEXTO ═════════════
     La pantalla marca cada pago de flete con «🚚 RECARGO» y lo suma aparte («🚚 Transporte
     cobrado»), y el texto dice «De eso, Bs X son recargos por entrega (flete, no es de la venta)».
     En el Excel la fila del flete era igual a la de un pago de la venta: el contador no tenía cómo
     saber qué no se factura. La marca va en una columna NUEVA al final: no se mueve ninguna. */
  D.confirm=true; D.vistos=[];
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'X1', nota:'30', oc:'09-030', cliente:'CON FLETE', pagado:true, acuenta:0,
                metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:1500,fecha:hoy,nota:'30',comps:['V30']},
                                        {envio:true,metodo:'QR',banco:'BISA',monto:120,fecha:hoy,nota:'31',comps:['F31']}]) }),
            P({ id:'X2', nota:'32', oc:'09-032', cliente:'SIN FLETE', vendedor:'Maria Flores', pagado:true, acuenta:0,
                metodoPago:textoCobros([{anticipo:true,metodo:'QR',banco:'BISA',monto:900,fecha:hoy,nota:'32',comps:['V32']}]) }) ];
    RETIROS=[]; releer();
    showView('conta'); segSet('cta-tab','cuadre'); setContaTab('cuadre'); await new Promise(r=>setTimeout(r,120));
    document.getElementById('cua-vendedor').value='';
    segSet('cua-mode','mes'); document.getElementById('cua-mes').value=hoy.slice(0,7); setCuadreModo('mes');
    var pantalla=0; cuadrePagos().forEach(function(c){ if(esEnvio(c)) pantalla=r2(pantalla+c.monto); });
    var texto=cuadreTexto();
    exportCuadre();
    var m=window.__XLSX[0].matrix, h=m[0].map(function(c){ return c&&c.v; });
    var iR=h.indexOf('RECARGO POR ENTREGA'), iM=h.indexOf('MONTO (Bs)'), iC=h.indexOf('CLIENTE');
    var filas=[]; for(var i=1;i<m.length && m[i] && m[i].length;i++) filas.push(m[i]);
    var excel=0, marcadas=[];
    filas.forEach(function(f){ if(iR>=0 && f[iR]){ marcadas.push(f[iC]); excel=r2(excel+((f[iM]&&f[iM].v)||0)); } });
    return { cabecera:h, iR:iR, ult:h.length-1, pantalla:pantalla, excel:excel, marcadas:marcadas, filas:filas.length,
             texto:(texto.match(/De eso, \*([^*]+)\*/)||[])[1]||'', cols:window.__XLSX[0].cols.length };
  });
  chk('7 · el Excel del Cuadre trae la columna «RECARGO POR ENTREGA», AL FINAL (no se mueve ninguna)', r.iR===r.ult && r.iR===14 && r.cabecera[13]==='EFECTIVO EN MANO DE' && r.cols===15, J({cabecera:r.cabecera, cols:r.cols}));
  chk('7 · …marca SOLO la fila del flete', J(r.marcadas)===J(['CON FLETE']) && r.filas===3, J(r));
  chk('7 · …y lo marcado suma lo mismo que la pantalla y el texto (Bs 120)', r.excel===120 && r.pantalla===120 && /120/.test(r.texto), J({excel:r.excel, pantalla:r.pantalla, texto:r.texto}));

  /* ══ 8 · «BUSCAR» DE CONTABILIDAD → VENTAS, SIN ACENTOS ════════════════════════════════
     Con «Buscar» la tabla, las tarjetas y el Excel muestran solo lo que coincide (§4fv). Pero
     comparaba con los acentos puestos: «maria perez» no encontraba a «María Pérez», ni «jose» a
     «José». El de Administración ya los saca desde §4ew y el del Cuadre también. */
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'B1', nota:'40', oc:'09-040', cliente:'María Pérez', saldo:1000 }),
            P({ id:'B2', nota:'41', oc:'09-041', cliente:'Jose Gomez', saldo:500 }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    segSet('cta-mode','mes'); document.getElementById('cta-mes').value=hoy.slice(0,7); setContaModo('mes');
    var buscar=function(t){ document.getElementById('cta-search').value=t; return contaLista().map(function(p){ return p.id; }).join(','); };
    var out={ maria:buscar('maria perez'), jose:buscar('josé'), mayus:buscar('PÉREZ') };
    document.getElementById('cta-search').value='';
    return out;
  });
  chk('8 · «maria perez» encuentra a «María Pérez» (y las tarjetas y el Excel la cuentan)', r.maria==='B1', J(r));
  chk('8 · …y «josé» a «Jose Gomez», con mayúsculas o sin ellas', r.jose==='B2' && r.mayus==='B1', J(r));

  /* ══ 9 · LA FICHA DE UNA VENTA «SIN MONTO ANOTADO» NO DICE «PAGADO» ══════════════════
     El aviso del Cuadre «venta sin ningún monto anotado… hay que abrirla y completarla» manda a
     su ficha, y ahí la fila «Saldo» decía «PAGADO» en verde (saldo 0 = pagado, para esa fila):
     la contadora leía que estaba pagada una venta que nadie cobró. La tabla ya decía bien
     «⚠️ SIN MONTO ANOTADO». */
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'N1', nota:'95', oc:'09-095', cliente:'NADIE ANOTÓ NADA', pagado:false, saldo:0, acuenta:0, metodoPago:'' }),
            P({ id:'N2', nota:'96', oc:'09-096', cliente:'PAGADA', pagado:true, metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:900,fecha:hoy,nota:'96',comps:['V96']}]) }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    var saldo=function(id){ CTA_ULTIMA=''; showContaModal(id);
      var f=[].slice.call(document.querySelectorAll('#modal-box .dl-row')).map(function(e){ return e.textContent.replace(/\s+/g,' '); })
              .filter(function(t){ return /^Saldo/.test(t); })[0]||''; closeModal(); return f; };
    return { nada:saldo('N1'), pagada:saldo('N2') };
  });
  chk('9 · la ficha de una venta sin ningún monto NO dice «PAGADO»: dice «SIN MONTO ANOTADO»', !/PAGADO/.test(r.nada.replace('SIN MONTO ANOTADO','')) && /SIN MONTO ANOTADO/.test(r.nada), r.nada);
  chk('9 · control: la pagada sigue diciendo «PAGADO»', /PAGADO/.test(r.pagada), r.pagada);

  /* ══ 10 · EL FLETE EN «PAGOS RECIBIDOS» DE VENTAS Y EN EL EXCEL DE CONTABILIDAD ═══════════
     La tabla de Ventas («Pagos recibidos») y la columna PAGOS del Excel del contador listan el
     flete cobrado al lado de los pagos de la venta, sin decir que es flete: PAGOS sumaba 1.620 y
     TOTAL COBRADO 1.500, y no había cómo saber cuál de los renglones no es de la venta (la ficha
     sí lo marca «🚚 RECARGO POR ENTREGA»). */
  r = await page.evaluate(async () => {
    STATE=[ P({ id:'E1', nota:'30', oc:'09-030', cliente:'CON FLETE', pagado:true,
                metodoPago:textoCobros([{anticipo:true,metodo:'Efectivo',monto:1500,fecha:hoy,nota:'30',comps:['V30']},
                                        {envio:true,metodo:'QR',banco:'BISA',monto:120,fecha:hoy,nota:'31',comps:['F31']}]) }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    segSet('cta-mode','mes'); document.getElementById('cta-mes').value=hoy.slice(0,7); document.getElementById('cta-search').value=''; setContaModo('mes');
    var celda=document.getElementById('tbl-conta').textContent;
    exportConta();
    var m=window.__XLSX[0].matrix, h=m[0].map(function(c){ return c&&c.v; });
    var pagos=m[1][h.indexOf('PAGOS (fecha · método · monto · nota)')], cob=m[1][h.indexOf('TOTAL COBRADO (Bs)')], rec=m[1][h.indexOf('RECARGO COBRADO (Bs)')];
    var partes=String(pagos).split('  |  ');
    return { partes:partes, cobrado:cob&&cob.v, recargo:rec&&rec.v, celdaFlete:/flete/i.test(celda.split('CON FLETE')[1]||'') };
  });
  chk('10 · en el Excel de Contabilidad, el renglón del flete dice que es flete (y el de la venta no)', r.partes.length===2 && !/flete/i.test(r.partes[0]) && /flete/i.test(r.partes[1]), J(r.partes));
  chk('10 · …así PAGOS sin el flete = TOTAL COBRADO, y el flete = RECARGO COBRADO', r.cobrado===1500 && r.recargo===120, J({cobrado:r.cobrado, recargo:r.recargo}));
  chk('10 · …y la tabla («Pagos recibidos») también lo marca', r.celdaFlete===true, J(r.celdaFlete));

  /* ══ 11 · «1.500» TIPEADO EN «CORREGIR PRECIOS Y MONTOS» ES 1.500, NO 1,50 ═══════════════
     En Bolivia 1.500 se escribe con punto. Tipeado en un campo numérico, el navegador lo deja
     tal cual («1.500»): «Registrar pago» y el arqueo lo leen con `parseMonto` (1.500), pero esta
     caja lo leía con `parseFloat` (1,5): A cuenta, Saldo y precios quedaban en Bs 1,50 y la venta
     de 1.500 pasaba a valer 1,50. Se tipea con el teclado, como la contadora. */
  await page.evaluate(async () => {
    STATE=[ P({ id:'K1', nota:'97', oc:'09-097', cliente:'TIPEA CON PUNTO', saldo:0, acuenta:0, metodoPago:'',
                productos:[{desc:'COLCHON',cant:2}] }) ];
    RETIROS=[]; releer(); aConta(); await new Promise(r=>setTimeout(r,120));
    CTA_ULTIMA=''; showContaModal('K1');
  });
  for (const [sel, txt] of [['#cta-pr-0','1.250'], ['#cta-acuenta','1.000'], ['#cta-saldo','1.500']]) {
    await page.fill(sel, ''); await page.click(sel); await page.keyboard.type(txt);
  }
  r = await page.evaluate(async () => {
    var aviso=(document.getElementById('cta-tot-aviso')||{}).textContent||'';
    ctaGuardarMontos('K1');
    var p=findById('K1');
    return { precio:prodPrecio(p.productos[0]), acuenta:Number(p.acuenta)||0, saldo:Number(p.saldo)||0, venta:ventaTotal(p), aviso:aviso };
  });
  chk('11 · «1.000» y «1.500» tipeados en A cuenta y Saldo son 1.000 y 1.500 (no 1 y 1,50)', r.acuenta===1000 && r.saldo===1500 && r.venta===2500, J(r));
  chk('11 · …el precio «1.250» es 1.250, y el total en vivo ya lo dice (Bs 2.500,00, cuadra con 2 × 1.250)', r.precio===1250 && /2\.500,00/.test(r.aviso) && /cuadra/.test(r.aviso), J(r));

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
