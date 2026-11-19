/* 🧾 MEJORA 366 — LA FICHA DE CONTABILIDAD ANCHA: EL PAGO A LA VISTA (16/11/2026; dueño: «espero no se vea feo, como pasó antes»).

   La ficha de cada venta se abría en 540 px y medía unos 2.000 px: «Registrar un pago» quedaba dos pantallas abajo. Ahora se abre ancha
   (hasta 1.100 px): arriba Total · Cobrado · Falta cobrar; a la izquierda lo que compró, la factura o remisión y los datos; a la derecha los
   pagos y «Registrar un pago» abierto; «Corregir precios», «Pago en sistema», «Reenviar» y «Eliminar» en «▸ Más». La ficha de Mis pedidos
   toma la misma forma. Solo reordena los MISMOS bloques.

   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera `CTA_ANCHA_PRUEBA` (Playwright): la ficha de siempre (540 px, la lista «dato: valor»).
   2. Con la bandera: ancha (1.100 px en 1366), los tres números (= `ventaTotal`, `contaCobrado`, el saldo) y los MISMOS campos y botones
      (ids y `onclick` de siempre); en 1366 × 768 el botón «Registrar pago» se ve sin bajar.
   3. Registrar un pago desde la ficha ancha deja EXACTAMENTE lo mismo en la venta que desde la de siempre.
   4. «Más»: cerrado al abrir; «✏️ Ir a Corregir precios y montos» lo abre y lleva al saldo; una vez abierto se recuerda al repintar.
   5. Otra ventana (cualquier `openModal`) no queda ancha.
   6. La ficha de Mis pedidos: ancha, con los tres números y sus botones de siempre; en una ATC no hay números (no se cobra).
   7. En 820 px (iPad parado): una sola columna, sin scroll a lo ancho.
   Datos INVENTADOS. Reloj clavado: martes 03/11/2026 a las 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cta_ancha.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS=0, FAIL=0;
const chk=(l,c,e)=>{ c?PASS++:FAIL++; console.log((c?'✓':'✗'), l, e!=null?('· '+(typeof e==='string'?e:JSON.stringify(e)).slice(0,500)):''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const errores=[];
  const abrir = async (flag, w, h) => {
    const ctx = await browser.newContext({ viewport:{ width:w||1366, height:h||768 }, timezoneId:'America/La_Paz' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await ctx.route(/^https?:/, r => r.abort());
    if(flag) await page.addInitScript(() => { window.CTA_ANCHA_PRUEBA=1; });
    await page.clock.setFixedTime(new Date('2026-11-03T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS + '?tema=espuma', { waitUntil:'load' });
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      document.getElementById('conn-form').style.display='none';
      CONNECTED=true; UNLOCKED=true; CARGA_GEN++; CARGA_ESTADO='ok';
      try{ clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); }catch(e){}
      if(typeof AUTO_TIMER!=='undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      window._pl=[]; window._saves=0;
      apiSave=function(rec){ window._saves++; var g=JSON.parse(JSON.stringify(rec)); window._pl=window._pl.filter(function(x){ return x.id!==g.id; }).concat([g]); return Promise.resolve({ ok:true, pedido:g }); };
      apiList=function(){ return Promise.resolve({ ok:true, pedidos:JSON.parse(JSON.stringify(window._pl)) }); };
      var base={ oc:'11-090', nota:'5501', cliente:'CLIENTE CONTA', celular:'70000002', turno:'AM', zona:'Norte', direccion:'Calle Inventada 2', fecha:'2026-11-07',
        vendedor:'Carola Chavez', productos:[{ desc:'COLCHON SOFT', medida:'140x190', codigo:'CH1999', cant:1, precio:2000 }, { desc:'ALMOHADA', medida:'50x70', cant:2, precio:50 }],
        saldo:1100, acuenta:1000, pagado:false, ts:new Date('2026-11-01T11:00:00-04:00').getTime(), rev:1, metodoPago:'~QR BISA 1000 @2026-11-01 #5501 %A1' };
      var P=function(id, o){ var b=JSON.parse(JSON.stringify(base)); b.id=id; for(var k in (o||{})) b[k]=o[k]; return b; };
      STATE=[P('c1'), P('c2'), P('a1', { oc:'ATC 11-001', saldo:0, acuenta:0, metodoPago:'', productos:[{ desc:'COLCHON SOFT', medida:'140x190', cant:1 }] })];
      window._pl=JSON.parse(JSON.stringify(STATE)); saveMirror();
      window._esp=function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
      window._reg=async function(id){ CTA_ULTIMA=''; showContaModal(id); await _esp(60);
        document.getElementById('cta-pago-nota').value='7001'; document.getElementById('cta-pago-monto').value='600';
        CTA_PAGO.comps=['R1']; try{ ctaSetRecibio(id, ''); }catch(e){} await _esp(40);
        document.querySelector('#modal-box [onclick^="ctaRegistrarPago"]').click(); await _esp(200);
        var p=findById(id); try{ closeModal(); }catch(e){} return { metodoPago:p.metodoPago.replace(/\b\d{6,}\b/g,'#'), saldo:p.saldo, acuenta:p.acuenta, pagado:p.pagado }; };
    });
    page._ctx=ctx; return page;
  };
  const ficha = (page, id) => page.evaluate(async (id) => {
    CTA_ULTIMA=''; showContaModal(id); await _esp(120);
    var box=document.getElementById('modal-box'), b=box.getBoundingClientRect(), k=box.querySelectorAll('.cta-k3 b');
    var reg=box.querySelector('[onclick^="ctaRegistrarPago"]'), rr=reg ? reg.getBoundingClientRect() : null;
    var ids=['cta-pago-monto','cta-pago-fecha','cta-pago-nota','cta-doc','cta-doc-num','cta-edit','cta-acuenta','cta-saldo'].filter(function(x){ return !!document.getElementById(x); });
    var onc=['ctaRegistrarPago','ctaDocGuardar','ctaToggleRegistrado','ctaEliminarVenta','ctaWhatsappVenta','ctaGuardarMontos','ctaSetMetodo'].filter(function(x){ return !!box.querySelector('[onclick*="'+x+'"]'); });
    var mas=document.getElementById('cta-mas');
    return { ancha:box.classList.contains('cta-ancha'), w:box.offsetWidth, k:[].map.call(k, function(x){ return x.textContent.trim(); }), ids:ids, onc:onc,
      regTop:rr ? Math.round(rr.top) : null, regBot:rr ? Math.round(rr.bottom) : null, ih:innerHeight, mas:mas ? mas.open : null, dlTotal:/Total de la venta/.test(box.textContent),
      tot:fmtBs(ventaTotal(findById(id))), cob:fmtBs(contaCobrado(findById(id))), sal:fmtBs(Number(findById(id).saldo)||0), sw:document.documentElement.scrollWidth, iw:innerWidth,
      cols:getComputedStyle(box.querySelector('.cta-g')||box).gridTemplateColumns };
  }, id);

  console.log('\n── 1. Sin la bandera ──');
  let page = await abrir(false);
  let sin = await ficha(page, 'c1');
  chk('1a. sin la bandera: la ficha de siempre (540 px, sin los tres números)', !sin.ancha && sin.w===540 && sin.k.length===0 && sin.dlTotal, sin);
  const regSin = await page.evaluate(() => _reg('c2'));
  await page._ctx.close();

  console.log('\n── 2-5. Con la bandera ──');
  page = await abrir(true);
  let r = await ficha(page, 'c1');
  chk('2a. ancha: 1.100 px en una pantalla de 1.366', r.ancha && r.w===1100, r.w);
  chk('2b. los tres números: Total = `ventaTotal`, Cobrado = `contaCobrado`, Falta cobrar = el saldo', r.k.length===3 && r.k[0]===r.tot && r.k[1]===r.cob && r.k[2]===r.sal, [r.k, r.tot, r.cob, r.sal]);
  chk('2c. los MISMOS campos (ids) que la ficha de siempre', JSON.stringify(r.ids)===JSON.stringify(sin.ids), [sin.ids, r.ids]);
  chk('2d. los MISMOS botones (onclick) que la ficha de siempre', JSON.stringify(r.onc)===JSON.stringify(sin.onc), [sin.onc, r.onc]);
  chk('2e. en 1366 × 768 el botón «Registrar pago» se ve sin bajar (antes, a '+sin.regTop+' px)', r.regBot!=null && r.regBot<=r.ih && sin.regTop>r.ih, [r.regTop, r.regBot, sin.regTop]);
  const regCon = await page.evaluate(() => _reg('c2'));
  chk('3a. registrar un pago desde la ficha ancha deja EXACTAMENTE lo mismo que desde la de siempre', JSON.stringify(regCon)===JSON.stringify(regSin) && /600/.test(regCon.metodoPago), [regSin, regCon]);
  chk('4a. «Más» cerrado al abrir', r.mas===false, r.mas);
  r = await page.evaluate(async () => { CTA_ULTIMA=''; showContaModal('c1'); await _esp(80); ctaIrAMontos(); await _esp(150); var m=document.getElementById('cta-mas'), a=document.activeElement;
    var o={ abierto:m.open, foco:a ? a.id : '' }; showContaModal('c1'); await _esp(80); o.recordado=document.getElementById('cta-mas').open; closeModal(); await _esp(30); showContaModal('c2'); await _esp(80); o.otra=document.getElementById('cta-mas').open; closeModal(); return o; });
  chk('4b. «✏️ Ir a Corregir precios y montos» abre «Más» y lleva al saldo', r.abierto && r.foco==='cta-saldo', r);
  chk('4c. abierto se recuerda al repintar la misma venta; otra venta abre con «Más» cerrado', r.recordado===true && r.otra===false, r);
  r = await page.evaluate(async () => { CTA_ULTIMA=''; showContaModal('c1'); await _esp(50); openModal('<div class="modal-h"><h3>Otra</h3></div><div class="modal-b">x</div>'); await _esp(50);
    var b=document.getElementById('modal-box'); var o={ ancha:b.classList.contains("cta-ancha"), w:b.offsetWidth }; closeModal(); return o; });
  chk('5a. otra ventana (cualquier `openModal`) no queda ancha', !r.ancha && r.w===540, r);
  r = await page.evaluate(async () => { showMisModal('c1'); await _esp(80); var b=document.getElementById('modal-box');
    var o={ ancha:b.classList.contains("cta-ancha"), w:b.offsetWidth, k:b.querySelectorAll('.cta-k3 b').length,
      bt:['editarDesdeMis','copyPedido','editarUbicacionMis','closeModal'].filter(function(x){ return !!b.querySelector('[onclick*="'+x+'"]'); }).length };
    closeModal(); await _esp(30); showMisModal('a1'); await _esp(80); o.atcK=document.querySelectorAll('#modal-box .cta-k3').length; o.atcAncha=document.getElementById('modal-box').classList.contains('cta-ancha'); closeModal(); return o; });
  chk('6a. la ficha de Mis pedidos: ancha, con los tres números y sus botones de siempre', r.ancha && r.w===1100 && r.k===3 && r.bt===4, r);
  chk('6b. en una ATC (no se cobra) la ficha ancha va sin los números', r.atcAncha && r.atcK===0, r);
  r = await page.evaluate(async () => { CTA_ULTIMA=''; showContaModal('c2'); await _esp(80); var b=document.getElementById('modal-box'), f=document.getElementById('cta-reg-pend'), rr=f ? f.getBoundingClientRect() : null;
    var o={ hay:!!f, txt:f ? f.textContent : '', top:rr ? Math.round(rr.top) : null, ih:innerHeight, enIzq:!!(f && f.closest('.cta-c1')), mas:(document.querySelector('#cta-mas > summary')||{}).textContent||'' };
    f.querySelector('.cta-reg-btn').click(); await _esp(250);
    o.reg=regEnSistema(findById('c2')); o.despues=!!document.getElementById('cta-reg-pend'); closeModal(); await _esp(30);
    showContaModal('a1'); await _esp(80); o.atc=!!document.getElementById('cta-reg-pend'); closeModal(); return o; });
  chk('6c. (16/11, pregunta 9: «presionar que lo hagan») sin registrar: arriba de la ficha, a la vista, «⚠️ Todavía NO está registrada en el sistema contable» con «✅ Ya la registré en el sistema»; «Más» ya no lo lista', r.hay && /NO está registrada/.test(r.txt) && /Ya la registré/.test(r.txt) && r.enIzq && r.top!=null && r.top<r.ih && !/pago registrado/i.test(r.mas), r);
  chk('6d. tocarlo la marca registrada (el mismo `ctaToggleRegistrado`) y la franja se va; en una ATC no sale', r.reg && !r.despues && !r.atc, r);
  await page._ctx.close();

  console.log('\n── 7. iPad parado ──');
  page = await abrir(true, 820, 1180);
  r = await ficha(page, 'c1');
  chk('7a. en 820 px: una sola columna y sin scroll a lo ancho', r.ancha && r.cols.split(' ').length===1 && r.sw<=r.iw, [r.cols, r.sw, r.iw]);
  await page._ctx.close();

  chk('sin errores en la página', errores.length===0, errores.slice(0,4));
  await browser.close();
  console.log('\n'+PASS+' bien · '+FAIL+' mal');
  process.exit(FAIL?1:0);
})();
