/* 🧾 (mejora 379, 16/11) EL N° DE FACTURA O REMISIÓN SE ANOTA AL CARGARLA AL SISTEMA.
   Cuida: tocar «✅ Pago registrado en sistema» en una venta SIN N° abre la cajita (no marca todavía); «Guardar las dos cosas» deja la marca
   y el documento (con `fdocT`) en UN solo guardado; «Solo marcar cargada» deja la marca como antes, sin documento; un N° que ya está en otra
   venta pregunta (y «Cancelar» no guarda nada); con N° y sin elegir el tipo no guarda; una venta que YA tiene el N° (o una ATC) se marca de
   un toque como siempre; sin la bandera de prueba (como las pruebas de siempre) el botón marca de un toque.
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia, red cortada, datos inventados.
   Se corre:  node tests/test_factura_al_cargar.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.__err) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let RESP = true, ULT = ''; page.on('dialog', d => { ULT = d.message(); RESP ? d.accept() : d.dismiss(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    loadFromServer = function () {};
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._env = [];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._env.push(g);
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    var ts = new Date('2026-11-10T11:00:00-04:00').getTime();
    var P = function (o) { return Object.assign({ id: 'x', oc: '11-001', nota: '1', vendedor: 'Juan Pablo Paredes', cliente: 'CLIENTE', celular: '70000000', fecha: '2026-11-12', turno: 'AM',
      zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SEMIORTOP.', medida: '140x190', codigo: '', cant: 1, precio: 2580 }], saldo: 0, acuenta: 2580,
      pagado: true, metodoPago: '~Efectivo 2580 @2026-11-10 #1', entregado: false, ts: ts, fotos: [] }, o); };
    window._pl = [
      P({ id: 'v1', oc: '11-201', cliente: 'CLIENTE DE EJEMPLO UNO' }),
      P({ id: 'v2', oc: '11-202', cliente: 'CLIENTE DE EJEMPLO DOS' }),
      P({ id: 'v3', oc: '11-203', cliente: 'CLIENTE DE EJEMPLO TRES', productos: [{ desc: 'COLCHON SEMIORTOP.', medida: '140x190', codigo: '', cant: 1, precio: 2580, fdoc: 'F', fdocn: '0412' }] }),
      P({ id: 'v4', oc: '11-204', cliente: 'CLIENTE DE EJEMPLO CUATRO' }),
      P({ id: 'v5', oc: '11-205', cliente: 'CLIENTE DE EJEMPLO CINCO' })
    ];
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    window.REG_DOC_PRUEBA = true;
    window._btnReg = function () { return [].slice.call(document.querySelectorAll('#modal-box .modal-actions button')).filter(function (b) { return /registrado/i.test(b.textContent); })[0]; };
    window._g = function (id) { return window._pl.find(function (x) { return x.id === id; }); };
  });

  console.log('\n── 1. sin N°: la cajita, y la marca todavía no ──');
  let r = await ev(() => { showView('conta'); showContaModal('v1'); var n0 = window._env.length; _btnReg().click();
    return { caja: !!document.getElementById('cta-regdoc'), txt: (document.getElementById('cta-regdoc') || {}).textContent || '', guardo: window._env.length - n0, reg: regEnSistema(findById('v1')) }; });
  chk('1a · tocar «✅ Pago registrado en sistema» en una venta sin N° abre la cajita', r.caja && /qué número le dio el sistema/i.test(r.txt) && /Guardar las dos cosas/.test(r.txt) && /Solo marcar cargada/.test(r.txt), r);
  chk('1b · …y todavía no guarda ni marca nada', r.guardo === 0 && r.reg === false, r);

  console.log('\n── 2. «Guardar las dos cosas»: un solo guardado ──');
  r = await ev(() => { var n0 = window._env.length;
    document.querySelector('#cta-regdoc button[data-v="R"]').click();
    document.getElementById('cta-regdoc-num').value = '0457';
    document.getElementById('cta-regdoc-ok').click();
    var g = window._g('v1'), p = findById('v1');
    return { n: window._env.length - n0, reg: regEnSistema(g), d: docVentaDe(g), num: docNumDe(g), T: docTDe(g), falta: docVentaFalta(p), caja: !!document.getElementById('cta-regdoc'), toast: (document.getElementById('toast') || {}).textContent || '' }; });
  chk('2a · la marca y la nota de remisión N° 0457 van en UN guardado', r.n === 1 && r.reg === true && r.d === 'R' && r.num === '0457', r);
  chk('2b · …con el día en que se anotó (`fdocT`, lo usa el dashboard)', r.T > 0 && Math.abs(r.T - new Date('2026-11-16T10:00:00-04:00').getTime()) < 120000, r.T);
  chk('2c · la venta sale de «Anotá la factura» y el aviso lo dice (le quedan las otras 3 de Juan Pablo)', r.falta === false && /le quedan 3/.test(r.toast) && !r.caja, r.toast);

  console.log('\n── 3. «Solo marcar cargada»: como antes ──');
  r = await ev(() => { showContaModal('v2'); _btnReg().click(); var n0 = window._env.length;
    document.getElementById('cta-regdoc-solo').click();
    var g = window._g('v2'); return { n: window._env.length - n0, reg: regEnSistema(g), d: docVentaDe(g), falta: docVentaFalta(findById('v2')) }; });
  chk('3 · «Solo marcar cargada» deja la marca sin documento (la vendedora lo sigue teniendo que anotar)', r.n === 1 && r.reg === true && r.d === '' && r.falta === true, r);

  console.log('\n── 4. el N° repetido pregunta ──');
  RESP = false;
  r = await ev(() => { showContaModal('v4'); _btnReg().click(); var n0 = window._env.length;
    document.querySelector('#cta-regdoc button[data-v="F"]').click();
    document.getElementById('cta-regdoc-num').value = '0412';
    document.getElementById('cta-regdoc-ok').click();
    return { n: window._env.length - n0, reg: regEnSistema(findById('v4')), caja: !!document.getElementById('cta-regdoc') }; });
  chk('4a · la factura 0412 ya está en la 11-203: pregunta y con «Cancelar» no guarda', r.n === 0 && r.reg === false && r.caja === true && /11-203/.test(ULT), { r: r, ULT: ULT });
  RESP = true;
  r = await ev(() => { var n0 = window._env.length; document.getElementById('cta-regdoc-ok').click();
    var g = window._g('v4'); return { n: window._env.length - n0, reg: regEnSistema(g), num: docNumDe(g) }; });
  chk('4b · con «Aceptar» la anota igual', r.n === 1 && r.reg === true && r.num === '0412', r);

  console.log('\n── 5. con N° y sin tipo no guarda ──');
  r = await ev(() => { showContaModal('v5'); _btnReg().click(); var n0 = window._env.length;
    document.getElementById('cta-regdoc-num').value = '99';
    document.getElementById('cta-regdoc-ok').click();
    return { n: window._env.length - n0, reg: regEnSistema(findById('v5')), toast: (document.getElementById('toast') || {}).textContent || '' }; });
  chk('5 · con N° pero sin elegir Factura o Remisión no guarda y lo pide', r.n === 0 && r.reg === false && /FACTURA o NOTA DE REMISI/.test(r.toast), r);
  await ev(() => { CTA_REG_DOC = null; closeModal(); });

  console.log('\n── 6. la que ya tiene N°: de un toque ──');
  r = await ev(() => { showContaModal('v3'); var n0 = window._env.length; _btnReg().click();
    return { n: window._env.length - n0, reg: regEnSistema(window._g('v3')), caja: !!document.getElementById('cta-regdoc') }; });
  chk('6 · una venta que ya tiene su factura se marca de un toque, sin cajita', r.n === 1 && r.reg === true && !r.caja, r);

  console.log('\n── 7. sin la bandera: como antes ──');
  r = await ev(() => { window.REG_DOC_PRUEBA = false; showContaModal('v5'); var n0 = window._env.length; _btnReg().click();
    return { n: window._env.length - n0, reg: regEnSistema(window._g('v5')), caja: !!document.getElementById('cta-regdoc') }; });
  chk('7 · sin `REG_DOC_PRUEBA` (las pruebas de siempre) el botón marca de un toque', r.n === 1 && r.reg === true && !r.caja, r);

  chk('sin errores de la página', errors.length === 0, errors);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
