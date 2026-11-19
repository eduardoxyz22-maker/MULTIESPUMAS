/* 🔁 (mejora 380, 16/11) CAMBIÓ DESPUÉS DE CARGARLA AL SISTEMA: VUELVE A «SIN CARGAR».
   Cuida: corregir el PRECIO de una venta ya «✅ cargada» (desde «✏️ Corregir este pago» de Contabilidad, o el monto de un pago, o el
   cliente) le saca la marca y deja adentro qué cambió (`rc`), quién y desde dónde; viaja a la planilla en el MISMO guardado; arriba de
   Contabilidad sale «🔁 N cambiaron después de cargarlas» y la ficha lo dice; «✓ Ya lo corregí en el sistema» le devuelve la marca y cierra
   el cambio; cambiar observaciones, camión o fotos NO la saca; una venta que no estaba cargada no anota nada; dos cambios seguidos antes de
   que la planilla conteste no se cuentan dos veces; corregir el pedido desde el formulario (heredarMarcas) conserva `rc`; sin la bandera
   (`RC_PRUEBA`), como antes.
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia. Red cortada, planilla de mentira, datos inventados.
   Se corre:  node tests/test_cargada_cambio.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE() {
  var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
  window.RC_PRUEBA = true;
  CONNECTED = true; UNLOCKED = false; SERVER_AUTH = 'abierto';
  try { localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); } catch (e) {}
  if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; } if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  CARGA_GEN++; CARGA_ESTADO = 'ok'; NO_ENCOLAR = {}; SAVE_ULTIMO = {}; SAVE_REV = {};
  window._hoja = {}; window._env = []; window._lento = false; window._colgados = [];
  apiPost = function (payload) {
    var a = payload && payload.action;
    if (a === 'save') {
      var r = JSON.parse(JSON.stringify(payload.pedido)); r.rev = Date.now() + window._env.length; window._env.push(JSON.parse(JSON.stringify(payload.pedido)));
      var resp = function () { window._hoja[r.id] = r; return { ok: true, pedido: JSON.parse(JSON.stringify(r)), ahora: Date.now() }; };
      if (window._lento) return new Promise(function (res) { window._colgados.push(function () { res(resp()); }); });
      return Promise.resolve(resp());
    }
    if (a === 'list') return Promise.resolve({ ok: true, pedidos: Object.keys(window._hoja).map(function (k) { return JSON.parse(JSON.stringify(window._hoja[k])); }) });
    return Promise.resolve({ ok: true });
  };
  apiList = function () { return apiPost({ action: 'list' }); };
  window.confirm = function () { return true; };
  var ts = new Date('2026-11-10T11:00:00-04:00').getTime();
  window._P = function (o) { return Object.assign({ id: 'p' + Math.random().toString(36).slice(2), fecha: '2026-11-18', oc: '11-065', vendedor: 'Juan Pablo Paredes',
    cliente: 'CLIENTE DE PRUEBA', celular: '70000000', turno: 'AM', zona: 'Este', direccion: 'Calle 1', maps: '', pagado: false, saldo: 0,
    ts: ts, metodoPago: '~Efectivo 790 @2026-11-10 #1500 · REGISTRADO', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '',
    garantia: '', nota: '1500', acuenta: 790, facturarA: 'CLIENTE DE PRUEBA', nit: '1234567', nroDia: 3, verificado: false, fotos: [],
    productos: [{ desc: 'COLCHON SEMIORTOPEDICO', medida: '140x190', cant: 1, codigo: '', precio: 790 }] }, o); };
  window._cargar = function (lista) { window._hoja = {}; lista.forEach(function (p) { var r = JSON.parse(JSON.stringify(p)); r.rev = 1; window._hoja[r.id] = r; });
    STATE = []; STATE = mergePending(lista.map(function (p) { var r = JSON.parse(JSON.stringify(p)); r.rev = 1; return r; })); saveMirror(); };
  window._rc = function (o) { return rcDe(o).map(function (e) { return { c: e.c, q: e.q, d: e.d, ok: !!e.ok }; }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  console.log('\n── 1. el precio cambia en una venta cargada ──');
  let r = await ev(() => { _cargar([_P({ id: 'a1' }), _P({ id: 'a2', oc: '11-093', cliente: 'OTRA CLIENTA', metodoPago: '~QR BISA 4830 @2026-11-10 #1501 · REGISTRADO', acuenta: 4830, nota: '1501',
      productos: [{ desc: 'COLCHON TITANIO ICE', medida: '180x190', cant: 1, codigo: '', precio: 4830 }] }), _P({ id: 'a3', oc: '11-070', metodoPago: '~Efectivo 790 @2026-11-10 #1502' })]);
    setVendedorMem('Isabel Robledo');
    var p = findById('a1'); p.productos[0].precio = 620; p.acuenta = 620; p.metodoPago = conMarcaReg('~Efectivo 620 @2026-11-10 #1500', true);
    var n0 = window._env.length; persistPedido(p);
    var env = window._env[window._env.length - 1];
    return { n: window._env.length - n0, reg: regEnSistema(env), rc: _rc(env), toast: (document.getElementById('toast') || {}).textContent || '' }; });
  chk('1a · le cambian el precio a una venta CARGADA: va a la planilla SIN la marca, en el mismo guardado', r.n === 1 && r.reg === false, r);
  chk('1b · …con qué cambió (precio 790 → 620 y el pago), quién (el nombre elegido) y desde dónde',
    r.rc.length === 1 && r.rc[0].c.some(t => /precio COLCHON SEMIORTOPEDICO 140x190 Bs 790 → Bs 620/.test(t)) && r.rc[0].c.some(t => /^pago Efectivo Bs 790 del 10\/11 → Efectivo Bs 620/.test(t)) && r.rc[0].q === 'Isabel Robledo', r.rc);
  chk('1c · …y lo avisa: vuelve a «sin cargar»', /vuelve a «📥 sin cargar»/.test(r.toast), r.toast);
  await espera();

  console.log('\n── 2. el monto de un pago (desde «✏️ Corregir este pago») ──');
  r = await ev(async () => { setVendedorMem(''); quienRol('conta'); showView('conta');
    CTA_EDIT_I = -1; CTA_EDIT_V = null; showContaModal('a2'); ctaEditarPago('a2', 0);
    document.getElementById('cta-ed-monto').value = '3830'; var n0 = window._env.length;
    ctaGuardarPago('a2', 0, true); await new Promise(res => setTimeout(res, 150));
    var env = window._env[window._env.length - 1];
    return { n: window._env.length - n0, reg: env && regEnSistema(env), rc: env && _rc(env) }; });
  await espera();
  chk('2 · corregir el monto de un QR (4.830 → 3.830) desde Contabilidad la saca de «cargada» y dice el pago, quién y desde dónde',
    r.n >= 1 && r.reg === false && r.rc.length === 1 && /pago QR BISA Bs 4\.830 del 10\/11 → QR BISA Bs 3\.830 del 10\/11/.test(r.rc[0].c.join('|')) && r.rc[0].q === 'Contabilidad' && /Corregir este pago/.test(r.rc[0].d), r);
  await ev(() => { closeModal(); });

  console.log('\n── 3. lo que NO cuenta ──');
  r = await ev(() => { var b = JSON.parse(JSON.stringify(window._hoja.a2)), a1 = JSON.parse(JSON.stringify(window._hoja.a1)); window._a1 = a1; _cargar([_P({ id: 'b1' }), b, a1, _P({ id: 'a3', oc: '11-070', metodoPago: '~Efectivo 790 @2026-11-10 #1502' })]);
    var p = findById('b1'); p.observaciones = 'llamar antes'; p.vehiculo = 'Carry'; p.chofer = 'Omar'; p.fotos = ['F1']; p.productos[0].chk = 'ok';
    var n0 = window._env.length; persistPedido(p); var env = window._env[window._env.length - 1];
    var q = findById('a3'); q.productos[0].precio = 700; persistPedido(q); var env2 = window._env[window._env.length - 1];
    return { n: window._env.length - n0, reg: regEnSistema(env), rc: rcDe(env).length, rc2: rcDe(env2).length, reg2: regEnSistema(env2) }; });
  chk('3a · observaciones, camión, chofer, fotos y la marca de logística NO la sacan de «cargada»', r.reg === true && r.rc === 0, r);
  chk('3b · una venta que no estaba cargada no anota nada al cambiarle el precio', r.rc2 === 0 && r.reg2 === false, r);
  await espera();

  console.log('\n── 4. el cartel de Contabilidad y «✓ Ya lo corregí» ──');
  r = await ev(() => { showView('conta'); renderConta(); var el = document.getElementById('cta-rc');
    var antes = { visible: !!(el && !el.hidden), txt: el ? el.textContent : '' };
    showContaModal('a2'); var fic = (document.getElementById('cta-rc-ficha') || {}).textContent || '';
    var n0 = window._env.length; ctaRcCorregi('a2'); var env = window._env[window._env.length - 1];
    renderConta(); var el2 = document.getElementById('cta-rc');
    return { antes: antes, fic: fic, n: window._env.length - n0, reg: regEnSistema(env), ok: rcDe(env).map(function (e) { return !!e.ok; }), despues: (el2 && !el2.hidden) ? el2.textContent : '' }; });
  chk('4a · arriba de Contabilidad: «🔁 Cambiaron después de cargarlas al sistema» con la venta, qué cambió y «✓ Ya lo corregí en el sistema»',
    r.antes.visible && /Cambiaron después de cargarlas al sistema/.test(r.antes.txt) && /OTRA CLIENTA/.test(r.antes.txt) && /Ya lo corregí en el sistema/.test(r.antes.txt), r.antes);
  chk('4b · la ficha de la venta también lo dice', /Cambió después de cargarla al sistema/.test(r.fic) && /3\.830/.test(r.fic), r.fic);
  chk('4c · «✓ Ya lo corregí» le devuelve la marca, cierra el cambio y la venta sale del cartel (queda la otra)', r.n === 1 && r.reg === true && r.ok.join() === 'true' && !/OTRA CLIENTA/.test(r.despues) && /CLIENTE DE PRUEBA/.test(r.despues), r);
  await espera();
  await ev(() => { closeModal(); });

  console.log('\n── 5. dos cambios seguidos sin que conteste la planilla ──');
  r = await ev(async () => { _cargar([_P({ id: 'c1' })]); window._lento = true;
    var p = findById('c1'); p.cliente = 'CLIENTE CORREGIDO'; persistPedido(p);
    await new Promise(res => setTimeout(res, 50));
    p = findById('c1'); p.nit = '7654321'; persistPedido(p);
    await new Promise(res => setTimeout(res, 50));
    var env = window._env[window._env.length - 1];
    window._lento = false; window._colgados.forEach(function (f) { f(); }); window._colgados = [];
    return { rc: _rc(env), reg: regEnSistema(env), n: window._env.length }; });
  chk('5 · el segundo cambio (el NIT) no vuelve a contar el primero (el cliente): un renglón por cambio, sin repetir',
    r.rc.length >= 1 && r.rc.length <= 2 && r.rc.filter(e => e.c.some(t => /^cliente /.test(t))).length === 1 && r.reg === false, r);
  await espera(800);

  console.log('\n── 6. corregir el pedido desde el formulario conserva lo anotado ──');
  r = await ev(() => { var p = window._a1; var nuevos = [{ desc: 'COLCHON SEMIORTOPEDICO', medida: '140x190', cant: 1, codigo: '', precio: 620 }];
    var h = heredarMarcas(nuevos, p.productos); return { rc: rcDe({ productos: h }).length, rc0: rcDe(p).length }; });
  chk('6 · `heredarMarcas` pasa `rc` a los productos del pedido corregido', r.rc0 >= 1 && r.rc === r.rc0, r);

  console.log('\n── 7. sin la bandera, como antes ──');
  r = await ev(() => { window.RC_PRUEBA = false; _cargar([_P({ id: 'd1' })]);
    var p = findById('d1'); p.productos[0].precio = 500; persistPedido(p); var env = window._env[window._env.length - 1];
    return { reg: regEnSistema(env), rc: rcDe(env).length }; });
  chk('7 · sin `RC_PRUEBA` (las pruebas de siempre) la marca queda y no se anota nada', r.reg === true && r.rc === 0, r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
