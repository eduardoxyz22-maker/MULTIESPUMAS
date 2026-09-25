/* 🧾 REVISIÓN DE CONTABILIDAD Y DEL CUADRE (25/09)

   Lo que encontró la revisión del 25/09, una sección por arreglo. Todo se arma por los
   mismos botones que usa la gente (la ficha de Contabilidad, la tabla de Administración,
   el formulario) y con el reloj CLAVADO en un miércoles de mitad de mes, para que la prueba
   no se pudra a fin de mes ni los domingos.

     1. En una venta YA PAGADA la ficha muestra solo «🚚 Cobrar el recargo por entrega»: su
        botón anota el FLETE, no un «cobro de más» de la venta (regresión de §4fk).

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

  chk('sin errores JS', errores.length===0, J(errores));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
