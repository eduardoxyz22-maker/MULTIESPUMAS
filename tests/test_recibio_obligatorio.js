/* 💵 ¿QUIÉN RECIBIÓ EL EFECTIVO? OBLIGATORIO (07/11). El dueño: *«debe ser obligatorio que los vendedores marquen quién carajo recibió
   la plata»*. Pasó con la 10-382 de Maria Flores: el cliente le pagó Bs 3.410 al CHOFER al recibir (lo dice la nota de venta) y el pago
   se anotó el 03/11 sin marcarlo: el panel se los pedía a ella.
   Cuida:
   1. En el formulario, una venta con «A cuenta» en efectivo no se guarda sin tocar quién lo recibió (vendedora o chofer); «Para
      guardar» y el paso del cobro dicen lo mismo.
   2. Tocando a la vendedora se guarda como siempre (el adelanto suelto, sin marca).
   3. Tocando un chofer, el adelanto va como renglón con `>Nombre` (§4eq): el Cuadre se lo pide al chofer.
   4. Con QR no se pregunta. Eduardo, ROHO, un interno y la venta de tienda no lo piden.
   5. Editar sin tocar la plata no pregunta; «SÍ, pagado» con lo que faltaba en efectivo sí, y el chofer va SOLO en el cobro nuevo.
   6. Contabilidad → «Registrar pago» en efectivo: sin tocar quién lo recibió no se registra; tocando la vendedora o un chofer, sí. El
      chofer que se pone solo el día de la entrega (§4ok-112) cuenta como marcado.
   7. En Playwright sin `RECIBIO_PRUEBA` queda apagado (las pruebas de siempre).
   Reloj CLAVADO (martes 03/11/2026, 10:00 de Bolivia). Sin red; datos inventados.
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la publicada). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  const sinFlag = await ev(() => typeof recibioObligatorio === 'function' ? recibioObligatorio('Carola Chavez') : 'no existe');
  chk('0 · en Playwright sin RECIBIO_PRUEBA queda apagado', sinFlag === false, sinFlag);

  await ev(() => {
    window.RECIBIO_PRUEBA = 1;
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
  });

  /* Una venta para el jueves con «A cuenta» 1.000 (o pagada 3.000) en el método que se diga, con la foto del recibo. */
  const llenar = (o) => ev(async (o) => {
    try { closeModal(); } catch (e) {}
    showView('form'); resetForm();
    if (o.tienda) { try { abrirVentaTienda(); } catch (e) { VENTA_TIENDA = true; try { pintarModoTienda(); } catch (x) {} } }
    document.getElementById('f-fecha').value = '2026-11-05'; segSet('f-turno', 'AM');
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value = o.cliente || 'CLIENTE INVENTADO';
    document.getElementById('f-celular').value = '70000000';
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    var n = document.getElementById('f-nota'); if (n) n.value = '1234';
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '3000';
    refreshDelButtons();
    if (o.pagado) { segSet('f-pagado', 'SI'); document.getElementById('f-cobrado').value = '3000'; }
    else { segSet('f-pagado', 'NO'); document.getElementById('f-acuenta').value = '1000'; document.getElementById('f-saldo').value = '2000'; }
    try { updateMetodoVisibility(); } catch (e) {}
    segSet('f-metodo', o.metodo || 'Efectivo');
    if (o.metodo === 'QR') { try { updateBancoVisibility(); } catch (e) {} var bb = document.querySelector('#f-banco button'); if (bb) segSet('f-banco', bb.dataset.val); }
    FORM_COMPS = ['RECIBO' + (o.img || 1)];
    try { updateMetodoVisibility(); } catch (e) {}
    document.getElementById('f-acuenta').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
  }, o);
  const estado = () => ev(() => {
    try { fxDerPintar(); } catch (e) {}
    var w = document.getElementById('wrap-recibio');
    return { ve: !!w && w.style.display !== 'none', hace: recibioFormHace(document.getElementById('f-vendedor').value),
      paso: fxPasosEstado()[3], der: ((document.getElementById('fx-der') || {}).textContent || '').replace(/\s+/g, ' '),
      botones: [].map.call(document.querySelectorAll('#f-recibio-box .seg button'), function (b) { return (b.classList.contains('active') ? '*' : '') + b.textContent.trim(); }) };
  });
  const guardar = () => ev(async () => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 450));
    return { guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent || '', ult: window._pl[window._pl.length - 1] || null };
  });

  // ============ 1. sin elegir no se guarda ============
  await llenar({});
  let e = await estado();
  chk('1a · con A cuenta en efectivo aparece «¿Quién recibió el efectivo?», sin nada marcado', e.ve && e.hace && e.botones.length === 2 && !e.botones.some(b => b[0] === '*'), e);
  chk('1b · «Para guardar» lo pide en su propio chip (el saldo sigue ✓) y el paso del cobro no está listo', /○ Quién recibió el efectivo/.test(e.der) && /✓ Saldo o pagado/.test(e.der) && e.paso === false, { der: e.der.slice(0, 300), paso: e.paso });
  let r = await guardar();
  chk('1c · Guardar sin tocar quién recibió NO guarda y dice qué falta', !r.guardo && /QUIÉN RECIBIÓ EL EFECTIVO/.test(r.toast), r.toast);

  // ============ 2. la vendedora ============
  await page.click('#f-recibio-box .seg button:has-text("Carola")');
  e = await estado();
  chk('2a · tocando a la vendedora queda marcada y el paso listo', e.botones[0][0] === '*' && /✓ Quién recibió el efectivo/.test(e.der) && e.paso === true, e);
  r = await guardar();
  chk('2b · se guarda como siempre: adelanto suelto, sin marca de chofer', r.guardo && r.ult && r.ult.acuenta === 1000 && /^Efectivo %RECIBO1$/.test(String(r.ult.metodoPago)) && !/>/.test(r.ult.metodoPago), r.ult && r.ult.metodoPago);
  const idVend = r.ult && r.ult.id;

  // ============ 3. un chofer ============
  await llenar({ cliente: 'OTRO CLIENTE', img: 2 });
  await page.click('#f-recibio-box .seg button:has-text("El chofer")');
  await page.selectOption('#f-recibio-sel', 'Luis Pierre');
  e = await estado();
  chk('3a · tocando «🚚 El chofer» sale la lista y se elige cuál', e.botones[1][0] === '*' && /Luis Pierre/.test(await page.textContent('#f-recibio-box')), e);
  r = await guardar();
  const mp3 = r.ult && String(r.ult.metodoPago);
  chk('3b · el adelanto va como renglón a nombre del chofer: ~Efectivo 1000 @03/11 #1234 >Luis Pierre %RECIBO2', r.guardo && mp3 === '~Efectivo 1000 @2026-11-03 #1234 >Luis Pierre %RECIBO2', mp3);
  const tiene = await ev((id) => { var p = findById(id); var a = anticipoDe(p); return { r: a && a.recibio, quien: a && pagoRecibio(a, p), acu: p && p.acuenta, total: p && ventaTotal(p) }; }, r.ult && r.ult.id);
  chk('3c · el panel lo pone en la mano del chofer y la venta sigue igual (A cuenta 1.000, total 3.000)', tiene.r === 'Luis Pierre' && tiene.quien === 'Luis Pierre' && tiene.acu === 1000 && tiene.total === 3000, tiene);

  // ============ 4. lo que no pregunta ============
  await llenar({ metodo: 'QR', cliente: 'CLIENTE QR' });
  e = await estado();
  chk('4a · con QR no se pregunta (va al banco)', !e.ve && !e.hace, e);
  const noPide = await ev(async () => {
    var o = {};
    o.eduardo = recibioObligatorio('Eduardo Añez'); o.roho = recibioObligatorio('ROHO'); o.alba = recibioObligatorio('ALBA'); o.carola = recibioObligatorio('Carola Chavez');
    return o;
  });
  chk('4b · Eduardo, ROHO y un interno (ALBA) no lo piden; una vendedora sí', noPide.eduardo === false && noPide.roho === false && noPide.alba === false && noPide.carola === true, noPide);
  await llenar({ tienda: true, cliente: 'CLIENTE TIENDA' });
  e = await estado();
  chk('4c · en una venta de tienda no se pregunta (se paga en el mostrador)', !e.ve && !e.hace, e);
  await ev(() => { try { cerrarVentaTienda(); } catch (x) {} VENTA_TIENDA = false; });

  // ============ 5. editar ============
  const ed = await ev(async (id) => {
    try { closeModal(); } catch (e) {}
    editPedido(id); await new Promise(r => setTimeout(r, 250));
    document.getElementById('f-direccion').value = 'CALLE NUEVA 22';
    var w = document.getElementById('wrap-recibio');
    var o = { ve: w.style.display !== 'none', hace: recibioFormHace(document.getElementById('f-vendedor').value) };
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    var g = window._pl.filter(function (x) { return x.id === id; })[0];
    o.guardo = window._saves > n0; o.mp = g && g.metodoPago; o.dir = g && g.direccion;
    return o;
  }, idVend);
  chk('5a · editar sin tocar la plata no pregunta y conserva el pago tal cual', !ed.ve && !ed.hace && ed.guardo && ed.mp === 'Efectivo %RECIBO1' && ed.dir === 'CALLE NUEVA 22', ed);
  const ed2 = await ev(async (id) => {
    try { closeModal(); } catch (e) {}
    editPedido(id); await new Promise(r => setTimeout(r, 250));
    segSet('f-pagado', 'SI'); updateMetodoVisibility(); document.getElementById('f-cobrado').value = '3000'; segSet('f-metodo', 'Efectivo');
    FORM_COMPS = compsArr(FORM_COMPS).concat(['RECIBO9']);
    document.getElementById('f-cobrado').dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 30));
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    return { hace: recibioFormHace(document.getElementById('f-vendedor').value), guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent || '' };
  }, idVend);
  chk('5b · «SÍ, pagado» con lo que faltaba en efectivo SÍ pregunta y no guarda sin elegir', ed2.hace && !ed2.guardo && /QUIÉN RECIBIÓ/.test(ed2.toast), ed2);
  await page.click('#f-recibio-box .seg button:has-text("El chofer")');
  await page.selectOption('#f-recibio-sel', 'Luis Pierre');
  r = await guardar();
  const cob5 = await ev((id) => { var p = findById(id); return { a: anticipoDe(p), c: cobrosDe(p).map(function (c) { return { m: c.metodo, monto: c.monto, f: c.fecha, r: c.recibio }; }), pag: !!p.pagado, mp: p.metodoPago }; }, idVend);
  chk('5c · el chofer va SOLO en el cobro nuevo (2.000 de hoy); el adelanto de 1.000 sigue en la mano de la vendedora',
    r.guardo && cob5.pag && cob5.a && !cob5.a.recibio && Number(cob5.a.monto) === 1000 && cob5.c.length === 1 && cob5.c[0].monto === 2000 && cob5.c[0].r === 'Luis Pierre' && cob5.c[0].f === '2026-11-03', cob5);

  // ============ 6. Contabilidad → Registrar pago ============
  const c6 = await ev(async () => {
    try { closeModal(); } catch (e) {}
    var esp = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var base = { oc: '11-090', nota: '5501', cliente: 'CLIENTE CONTA', celular: '70000002', turno: 'AM', zona: 'Norte', direccion: 'Calle Inventada 2',
      vendedor: 'Carola Chavez', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 2000 }], saldo: 1000, acuenta: 1000, pagado: false,
      ts: new Date('2026-11-01T11:00:00-04:00').getTime(), rev: 1, metodoPago: '~QR BISA 1000 @2026-11-01 #5501 %A1' };
    var P = function (id, o) { var b = JSON.parse(JSON.stringify(base)); b.id = id; for (var k in o) b[k] = o[k]; return b; };
    STATE = [P('c1', { fecha: '2026-11-07', vehiculo: 'Carry', chofer: 'Omar' }), P('c2', { fecha: '2026-11-07' }), P('c3', { fecha: '2026-11-03', vehiculo: 'Carry', chofer: 'Omar' })];
    window._pl = JSON.parse(JSON.stringify(STATE)); saveMirror();
    gpsLlegadaDe = function () { return null; };
    var reg = async function (id, antes) {
      CTA_ULTIMA = ''; showContaModal(id); await esp(60);
      if (antes) { antes(); await esp(60); }
      var n = document.getElementById('cta-pago-nota'); if (n) n.value = '9' + id.replace(/\D/g, '');
      var m = document.getElementById('cta-pago-monto'); if (m) m.value = '1000';
      CTA_PAGO.comps = ['R' + id];
      var b = document.getElementById('cta-recibio'); var txt = b ? b.textContent.replace(/\s+/g, ' ') : '';
      var on = b ? [].filter.call(b.querySelectorAll('button'), function (x) { return /var\(--teal\)/.test(x.getAttribute('style') || ''); }).map(function (x) { return x.textContent.trim(); }) : [];
      var antesN = cobrosDe(findById(id)).length;
      ctaRegistrarPago(id); await esp(150);
      var L = cobrosDe(findById(id)), toast = (document.getElementById('toast') || {}).textContent || '';
      try { closeModal(); } catch (e) {} await esp(30);
      return { txt: txt, on: on, nuevo: L.length > antesN, ult: L[L.length - 1] || null, toast: toast };
    };
    var o = {};
    o.sin = await reg('c1');
    o.vend = await reg('c1', function () { ctaSetRecibio('c1', ''); });
    o.ch = await reg('c2', function () { ctaSetRecibio('c2', 'Luis Pierre'); });
    o.auto = await reg('c3');
    return o;
  });
  chk('6a · un pago en efectivo nuevo no viene con la vendedora marcada y dice que hay que tocar quién la tiene', c6.sin && c6.sin.on.length === 0 && /Tocá quién tiene esta plata/.test(c6.sin.txt), c6.sin && { on: c6.sin.on, txt: c6.sin.txt.slice(0, 200) });
  chk('6b · sin tocar quién la recibió NO se registra', c6.sin && !c6.sin.nuevo && /QUIÉN RECIBIÓ/.test(c6.sin.toast), c6.sin && { nuevo: c6.sin.nuevo, toast: c6.sin.toast });
  chk('6c · tocando a la vendedora se registra sin marca', c6.vend && c6.vend.nuevo && c6.vend.ult && c6.vend.ult.metodo === 'Efectivo' && !c6.vend.ult.recibio, c6.vend && c6.vend.ult);
  chk('6d · tocando un chofer se registra a su nombre (>Luis Pierre)', c6.ch && c6.ch.nuevo && c6.ch.ult && c6.ch.ult.recibio === 'Luis Pierre', c6.ch && c6.ch.ult);
  chk('6e · el día de la entrega el chofer se pone solo (§4ok-112) y eso cuenta como marcado: se registra a su nombre', c6.auto && c6.auto.nuevo && c6.auto.ult && c6.auto.ult.recibio === 'Omar' && /Puesto solo/.test(c6.auto.txt), c6.auto && { ult: c6.auto.ult, txt: c6.auto.txt.slice(0, 200) });

  chk('9 · sin errores de la página', errors.length === 0, errors.slice(0, 3));
  console.log('\n' + PASS + ' bien, ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
