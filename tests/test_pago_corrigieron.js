/* 💵 (mejora 386, 16/11) «LO QUE TE CORRIGIERON»: CADA PAGO GUARDA QUIÉN LO CAMBIÓ.
   Cuida: cambiar el banco de un QR desde «✏️ Corregir este pago» deja `pH` adentro del pedido (qué era, qué quedó, quién y desde dónde) y
   viaja a la planilla; corregir el monto dice «monto»; borrar un pago dice «borrado»; sumar un pago nuevo o una foto NO es una corrección;
   la 🕓 Historia del pedido lo muestra; el sábado, «☀️ Tu día» de la vendedora dice cuántos le corrigieron esta semana, por qué y un consejo
   (lo que corrigió ella misma no cuenta); `heredarMarcas` lo pasa; sin la bandera (`PAGO_HIST_PRUEBA`), como antes.
   Reloj clavado el sábado 21/11/2026 10:00 de Bolivia. Red cortada, planilla de mentira, datos inventados.
   Se corre:  node tests/test_pago_corrigieron.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function BASE() {
  var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
  window.PAGO_HIST_PRUEBA = true; window.FH_PRUEBA = true; window.MIS_TOP_PRUEBA = true;
  CONNECTED = true; UNLOCKED = false; SERVER_AUTH = 'abierto';
  try { localStorage.removeItem(LS_PEND); localStorage.removeItem(LS_RECHAZOS); } catch (e) {}
  if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; } if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  if (typeof MIS_TIMER !== 'undefined' && MIS_TIMER) clearInterval(MIS_TIMER);
  CARGA_GEN++; CARGA_ESTADO = 'ok'; NO_ENCOLAR = {}; SAVE_ULTIMO = {}; SAVE_REV = {};
  window._hoja = {}; window._env = [];
  apiPost = function (payload) {
    var a = payload && payload.action;
    if (a === 'save') { var r = JSON.parse(JSON.stringify(payload.pedido)); r.rev = Date.now() + window._env.length; window._hoja[r.id] = r; window._env.push(JSON.parse(JSON.stringify(payload.pedido)));
      return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(r)), ahora: Date.now() }); }
    if (a === 'list') return Promise.resolve({ ok: true, pedidos: Object.keys(window._hoja).map(function (k) { return JSON.parse(JSON.stringify(window._hoja[k])); }) });
    return Promise.resolve({ ok: true });
  };
  apiList = function () { return apiPost({ action: 'list' }); };
  window.confirm = function () { return true; };
  try { pregActivo = function () { return false; }; } catch (e) {}
  var ts = new Date('2026-11-17T11:00:00-04:00').getTime();
  window._P = function (o) { return Object.assign({ id: 'p' + Math.random().toString(36).slice(2), fecha: '2026-11-25', oc: '11-336', vendedor: 'Fernando Paz',
    cliente: 'CLIENTE DE PRUEBA', celular: '70000000', turno: 'AM', zona: 'Este', direccion: 'Calle 1', maps: '', pagado: false, saldo: 2000,
    ts: ts, metodoPago: '~QR Económico 680 @2026-11-17 #2001 %CMP1', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '',
    garantia: '', nota: '2001', acuenta: 680, facturarA: '', nit: '', nroDia: 3, verificado: false, fotos: [],
    productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, codigo: '', precio: 2680 }] }, o); };
  window._cargar = function (lista) { window._hoja = {}; lista.forEach(function (p) { var r = JSON.parse(JSON.stringify(p)); r.rev = 1; window._hoja[r.id] = r; });
    STATE = []; STATE = mergePending(lista.map(function (p) { var r = JSON.parse(JSON.stringify(p)); r.rev = 1; return r; })); saveMirror(); };
  window._ph = function (o) { return phDe(o).map(function (e) { return { tp: e.tp, de: e.de, a: e.a, q: e.q, d: e.d }; }); };
  window._corregir = function (id, i, f) { CTA_EDIT_I = -1; CTA_EDIT_V = null; showContaModal(id); ctaEditarPago(id, i); f(); ctaGuardarPago(id, i, true); };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-21T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.clock.runFor(1500);
  await page.evaluate(BASE);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  console.log('\n── 1. el banco de un QR ──');
  let r = await ev(async () => { _cargar([_P({ id: 'a1' }), _P({ id: 'a2', oc: '11-093', cliente: 'OTRA CLIENTA', acuenta: 0, saldo: 0, pagado: true,
      metodoPago: 'QR BISA 4830 @2026-11-18 #2002 %CMP2 + Efectivo 500 @2026-11-19 #2003 %CMP3', productos: [{ desc: 'COLCHON ICE', medida: '160x190', cant: 1, codigo: '', precio: 5330 }] })]);
    quienRol('conta'); setVendedorMem(''); showView('conta');
    var n0 = window._env.length; _corregir('a1', 0, function () { CTA_EDIT_M = 'QR'; CTA_EDIT_B = 'Ganadero'; });
    await new Promise(res => setTimeout(res, 150));
    var env = window._env[window._env.length - 1];
    return { n: window._env.length - n0, ph: env && _ph(env), mp: env && env.metodoPago }; });
  await espera();
  chk('1 · cambiar el banco de un QR (Económico → Ganadero) deja el renglón: qué era, qué quedó, quién y desde dónde, y viaja a la planilla',
    r.n >= 1 && r.ph.length === 1 && r.ph[0].tp === 'banco' && /QR Económico Bs 680/.test(r.ph[0].de[0]) && /QR Ganadero Bs 680/.test(r.ph[0].a[0]) && r.ph[0].q === 'Contabilidad' && /Corregir este pago/.test(r.ph[0].d), r);

  console.log('\n── 2. el monto, y borrar ──');
  r = await ev(async () => { var n0 = window._env.length; _corregir('a2', 0, function () { document.getElementById('cta-ed-monto').value = '3830'; });
    await new Promise(res => setTimeout(res, 150)); var e1 = window._env[window._env.length - 1];
    return { ph: e1 && _ph(e1) }; });
  await espera();
  chk('2a · corregir el monto (4.830 → 3.830) dice «monto»', r.ph && r.ph.length === 1 && r.ph[0].tp === 'monto' && /4\.830/.test(r.ph[0].de[0]) && /3\.830/.test(r.ph[0].a[0]), r);
  r = await ev(async () => { closeModal(); showContaModal('a2'); var i = contaPagos(findById('a2')).findIndex(function (c) { return c.metodo === 'Efectivo'; });
    ctaBorrarPago('a2', i); await new Promise(res => setTimeout(res, 200)); var e = window._env[window._env.length - 1];
    return { ph: e && _ph(e), i: i }; });
  await espera();
  chk('2b · borrar el pago en efectivo deja «borrado» (y el de antes sigue)', r.ph && r.ph.length === 2 && r.ph[1].tp === 'borrado' && /Efectivo Bs 500/.test(r.ph[1].de[0]) && r.ph[1].a.length === 0 && /Borrar este pago/.test(r.ph[1].d), r);

  console.log('\n── 3. lo que NO es una corrección ──');
  r = await ev(() => { var p = findById('a1'); var n0 = (phDe(p) || []).length;
    p.metodoPago = p.metodoPago + ' + Efectivo 300 @2026-11-21 #2010 %CMP9'; persistPedido(p); var e1 = window._env[window._env.length - 1];
    var q = findById('a1'); q.metodoPago = String(q.metodoPago).replace('%CMP9', '%CMP9 %CMP10'); persistPedido(q); var e2 = window._env[window._env.length - 1];
    return { antes: n0, n1: phDe(e1).length, n2: phDe(e2).length }; });
  chk('3 · sumar un pago nuevo o una foto más no anota corrección', r.n1 === r.antes && r.n2 === r.antes, r);
  await espera();

  console.log('\n── 4. la historia del pedido ──');
  r = await ev(() => { var h = pedHistHtml(findById('a2')); var d = document.createElement('div'); d.innerHTML = h; return d.textContent; });
  chk('4 · la 🕓 Historia del pedido dice quién corrigió cada pago', /Contabilidad corrigió un pago: QR BISA Bs 4\.830 del 18\/11 → QR BISA Bs 3\.830 del 18\/11/.test(r) && /lo borraron/.test(r), r);

  console.log('\n── 5. el sábado, «Tu día» ──');
  r = await ev(() => { var a = findById('a1'), b = findById('a2'); b.vendedor = 'Fernando Paz';
    /* una corrección que hizo ella misma no cuenta */
    var mia = { t: Date.now() - 3600000, q: 'Fernando Paz', d: 'formulario del pedido', tp: 'fecha', de: ['QR 1'], a: ['QR 1'] };
    a.productos.forEach(function (x) { x.pH = (x.pH || []).concat([mia]); });
    var D = phSemanaDatos('Fernando Paz', STATE.filter(function (p) { return mismoVendedor(p.vendedor, 'Fernando Paz'); }));
    showView('mis'); var mv = document.getElementById('mis-vendedor'); mv.value = 'Fernando Paz'; renderMis();
    var el = document.getElementById('ph-sem'); return { n: D.L.length, top: D.top, txt: el ? el.textContent : '' }; });
  chk('5a · el sábado, «Tu día» dice cuántos pagos le corrigieron esta semana y por qué', r.n === 3 && /Esta semana te corrigieron 3 pagos/.test(r.txt) && /1 por el banco/.test(r.txt) && /1 por el monto/.test(r.txt) && /1 por lo borraron/.test(r.txt), r);
  chk('5b · …con un consejo', /💡/.test(r.txt), r.txt);
  chk('5c · lo que corrigió ella misma no cuenta', !/la fecha/.test(r.txt), r.txt);
  r = await ev(() => { var D0 = phSemanaVe; var dom = phSemanaHtml('Fernando Paz', STATE); return { sab: !!dom }; });
  chk('5d · (control) el sábado sale', r.sab === true, r);

  console.log('\n── 6. heredarMarcas y sin la bandera ──');
  r = await ev(() => { var p = findById('a2'); var h = heredarMarcas([{ desc: 'COLCHON ICE', medida: '160x190', cant: 1, codigo: '', precio: 5330 }], p.productos);
    return { n: phDe({ productos: h }).length, n0: phDe(p).length }; });
  chk('6a · `heredarMarcas` pasa `pH` al pedido corregido', r.n0 === 2 && r.n === 2, r);
  r = await ev(async () => { window.PAGO_HIST_PRUEBA = false; _cargar([_P({ id: 'z1' })]);
    _corregir('z1', 0, function () { CTA_EDIT_M = 'QR'; CTA_EDIT_B = 'BISA'; }); await new Promise(res => setTimeout(res, 150));
    var e = window._env[window._env.length - 1]; return { ph: phDe(e).length, mp: e.metodoPago }; });
  chk('6b · sin `PAGO_HIST_PRUEBA` (las pruebas de siempre) no se anota nada', r.ph === 0 && /QR BISA 680/.test(r.mp), r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
