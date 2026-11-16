/* 🎨 «PEDIDO GUARDADO» ANCHO, CON EL MENSAJE COMO EN WHATSAPP (16/11/2026, mejora 397; el dueño la eligió en «Mejoras visuales 390-440»).

   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Sin `GUARDADO_ANCHO_PRUEBA` (Playwright): la ventana de siempre, con las dos cajas de texto a la vista.
   2. Con la bandera, un pedido nuevo a domicilio: la ventana ancha (~1.000 px), arriba «✓ Quedó guardado: OC · cliente», a la izquierda el
      mensaje del equipo y a la derecha el del cliente como burbuja de WhatsApp. Los MISMOS textos en los MISMOS campos (#wa-text con
      `pedidoText`, #nx-wa-cli con `nxMsgCliente`) y los mismos botones.
   3. «✏️ Corregir el mensaje» muestra la caja de texto; lo escrito pasa a la burbuja y es lo que abre WhatsApp.
   4. ATC, «Reenviar la venta» y la pantalla angosta: como siempre.
   Datos SINTÉTICOS. Reloj clavado el lunes 16/11/2026 10:00. Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_v397_guardado_ancho.js */
const { chromium } = require('playwright');
const path = require('path');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1366, height:800 }, timezoneId:'America/La_Paz' });
  const errores=[]; page.on('pageerror', e=>errores.push(e.message)); page.on('dialog', d=>d.accept());
  await page.route(/^https?:/, r=>r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil:'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch(e){ return { __error:String((e&&e.message)||e).slice(0,300) }; } };
  await ev(() => {
    CONNECTED=false; try{ CARGA_GEN++; CARGA_ESTADO='ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
    if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.REC={ id:'r397', oc:'11-193', fecha:'2026-11-17', turno:'AM', vendedor:'Carola Chavez', cliente:'ANA ROJAS VACA', celular:'71234567', zona:'Norte', direccion:'Calle 1',
      productos:[{ desc:'COLCHON TITANIO ICE', codigo:'CH1220', medida:'140x190', cant:1, precio:4290 }, { desc:'ALMOHADA', codigo:'CD1403', medida:'50x70', cant:2, precio:180 }],
      pagado:true, saldo:0, metodoPago:'Efectivo 4650', nota:'1188', ts:Date.now(), acuenta:0, maps:'', entregado:false, fotos:[] };
    STATE=[REC];
    window.__abiertas=[]; window.open=function(u){ window.__abiertas.push(u); return null; };
    window.__mirar=function(){ var b=document.getElementById('modal-box'), r=b.getBoundingClientRect(), vis=function(id){ var e=document.getElementById(id); return !!(e && e.offsetParent!==null && getComputedStyle(e).display!=='none'); };
      return { ancha:b.classList.contains('p397'), w:Math.round(r.width), tit:(b.querySelector('h3')||{}).textContent||'', top:((b.querySelector('.p397-top')||{}).innerText||'').replace(/\s+/g,' '),
        eq:(document.getElementById('wa-text')||{}).value||'', cli:(document.getElementById('nx-wa-cli')||{}).value||'', eqVis:vis('wa-text'), cliVis:vis('nx-wa-cli'),
        bub:((document.getElementById('p397-bub')||{}).innerText||'').replace(/\s+/g,' '), botones:[].map.call(b.querySelectorAll('button'), function(x){ return x.textContent.trim(); }) }; };
  });

  console.log('\n── 1. Sin la bandera ──');
  let r = await ev(() => { showWhatsappModal(REC); return __mirar(); });
  chk('1 la ventana de siempre: las dos cajas de texto a la vista, sin la ancha', !r.ancha && r.eqVis && r.cliVis && r.tit==='✅ Pedido guardado', r);
  const eq0=r.eq, cli0=r.cli;

  console.log('\n── 2. Con la bandera ──');
  r = await ev(() => { closeModal(); window.GUARDADO_ANCHO_PRUEBA=1; showWhatsappModal(REC); return __mirar(); });
  chk('2a la ventana ancha (~1.000 px)', r.ancha && r.w>=950, [r.ancha, r.w]);
  chk('2b arriba: «Quedó guardado: OC 11-193 · ANA ROJAS VACA · Martes 17/11 · turno AM · 2 productos · Bs 4.650 ✅ pagado»', /Quedó guardado: OC 11-193 · ANA ROJAS VACA/.test(r.top) && /Martes 17\/11 · turno AM · 2 productos/.test(r.top) && /Bs 4\.650/.test(r.top) && /pagado/.test(r.top), r.top);
  chk('2c los MISMOS textos en los mismos campos (equipo y cliente)', r.eq===eq0 && r.cli===cli0 && r.eq.length>20 && r.cli.length>20, [r.eq.slice(0,60), r.cli.slice(0,60)]);
  chk('2d el del cliente se ve como burbuja (con el texto entero) y la caja de texto queda escondida hasta corregir', !r.cliVis && r.bub.indexOf(cli0.split('\n')[0].replace(/\*/g,'').trim().slice(0,20))>=0, [r.bub.slice(0,80), r.cliVis]);
  chk('2e los botones: Copiar el mensaje, Abrir WhatsApp, Copiar, «💬 Abrir el WhatsApp de Ana», Corregir, Cerrar', ['📋 Copiar el mensaje','📲 Abrir WhatsApp','📋 Copiar','💬 Abrir el WhatsApp de Ana','✏️ Corregir el mensaje','Cerrar'].every(t=>r.botones.indexOf(t)>=0), r.botones);

  console.log('\n── 3. Corregir el mensaje ──');
  r = await ev(() => { var b=[].filter.call(document.querySelectorAll('#modal-box button'), function(x){ return /Corregir el mensaje/.test(x.textContent); })[0]; b.click();
    var t=document.getElementById('nx-wa-cli'), vis=getComputedStyle(t).display!=='none'; t.value='Hola Ana, mensaje corregido'; t.dispatchEvent(new Event('input',{bubbles:true}));
    b.click(); var bub=document.getElementById('p397-bub').innerText;
    [].filter.call(document.querySelectorAll('#modal-box button'), function(x){ return /Abrir el WhatsApp de Ana/.test(x.textContent); })[0].click();
    return { vis:vis, bub:bub, url:window.__abiertas[window.__abiertas.length-1]||'' }; });
  chk('3 la caja aparece, lo escrito pasa a la burbuja y es lo que abre WhatsApp', r.vis && /mensaje corregido/.test(r.bub) && /wa\.me\/59171234567\?text=Hola%20Ana%2C%20mensaje%20corregido/.test(r.url), r);

  console.log('\n── 4. Como siempre ──');
  r = await ev(() => { closeModal(); var a=Object.assign({}, REC, { id:'a397', oc:'ATC 11-010' }); STATE.push(a); showWhatsappModal(a); var o=__mirar(); closeModal(); return o; });
  chk('4a una ATC: la ventana de siempre', !r.ancha && /ATC guardada/.test(r.tit), r.tit);
  r = await ev(() => { showWhatsappModal(REC, 'closeModal()', true); var o=__mirar(); closeModal(); return o; });
  chk('4b «Reenviar la venta»: la de siempre', !r.ancha && /Reenviar/.test(r.tit), r.tit);
  await page.setViewportSize({ width:800, height:800 });
  r = await ev(() => { showWhatsappModal(REC); var o=__mirar(); closeModal(); return o; });
  chk('4c la pantalla angosta (800 px): la de siempre', !r.ancha && r.eqVis, r.ancha);
  r = await ev(() => { openModal('<div class="modal-h"><h3>Otra</h3></div>'); var c=document.getElementById('modal-box').classList.contains('p397'); closeModal(); return c; });
  chk('4d otra ventana no queda ancha', r===false, r);

  chk('sin errores de la página', errores.length===0, errores.slice(0,3));
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  await browser.close();
  process.exit(FAIL?1:0);
})();
