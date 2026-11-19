/* 🎧 (19/11) La ATC en Administración. El dueño: «no entiendo dónde se marca recogido y dónde se programa la devolución… ahorita está
   marcando entregado cuando se recoge», «al momento de marcar RECOGIDO debe salir el botón para programar devolución», «que no se marquen
   solas… logística debe marcar recogido», «con el GPS sí, cuando ya se programa la devolución» y «al llenar una ATC solo lunes y martes».
   Se corre:  node tests/test_atc_admin.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 300)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const _src = fs.readFileSync(path.join(__dirname, 'test_stock_rev2_u2_turno.js'), 'utf8');
const PREPARAR = _src.slice(_src.indexOf('function PREPARAR(){'), _src.indexOf('\nconst corre'));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  await ctx.addInitScript(() => { window.ATC_RECOGER_PRUEBA = 1; window.ATC_DIA_PRUEBA = 1; });
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-25T10:00:00-04:00'));   // miércoles
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(400);
  await page.evaluate('(' + PREPARAR + ')()');
  await page.evaluate(async () => {
    window.ADM_FICHAS_PRUEBA = 1; UNLOCKED = true;
    var base = { tipo: 'gar', mot: 'Hundimiento', det: 'hundido en el medio', fcom: '2025-06-10', r_col: 1 };
    var L = function (o) { var l = _lin('CH1107|COLCHON ESPECIAL SEMIORTOPEDICO|140x190', 1); l.atc = Object.assign({}, base, o || {}); return [l]; };
    var X = function (id, fecha, turno, o, extra) { return _ped(id, fecha, turno, L(o), Object.assign({ oc: 'ATC 11-' + id.slice(-3), cliente: 'CLIENTE ' + id.toUpperCase(), vehiculo: 'Carry', chofer: 'Omar', ts: _ts('2026-11-10', '10:00:00') }, extra || {})); };
    await _cargar([
      X('a01', '2026-11-16', 'AM'),                                            // recojo de ANTES del 20/11: la fecha pasada sigue valiendo
      X('a02', '2026-11-23', 'PM'),                                            // recojo del lunes 23 que nadie marcó
      X('a03', '2026-11-30', 'AM'),                                            // recojo futuro
      X('a04', '2026-11-23', 'AM', {}, { entregado: true }),                   // recogido (marcado), sin devolución
      X('a05', '2026-11-27', 'AM', { rec: '2026-11-23', rturno: 'AM', pdev: '2026-11-27', pturno: 'AM' }),   // devolución viernes: traer de fábrica
      X('a06', '2026-11-25', 'AM', { rec: '2026-11-23', rturno: 'AM', pdev: '2026-11-25', pturno: 'AM', rf: '2026-11-24' }),   // devolución HOY
      X('a07', '2026-11-25', 'PM'),                                            // recojo HOY
      _ped('v01', '2026-11-25', 'AM', [_lin('CH1201|TITANIO ICE|160x190', 1, { chk: 'ok' })], { cliente: 'CLIENTE VENTA', vehiculo: 'Carry', ts: _ts('2026-11-20', '09:00:00') })
    ], _stock(function (s) { s.c.u[_K] = 10; }));
    document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
    ADM_PASADOS_VER = true; showView('admin'); setQuick(''); renderAdmin();
  });
  await page.waitForTimeout(150);
  const T = (sel) => page.evaluate((sel) => { var e = document.querySelector(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
  const ficha = (id) => page.evaluate((id) => { var e = document.querySelector('#adm-fichas .af-f[data-pid="' + id + '"]'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, id);

  // ---------- 1. la regla: el recojo se marca a mano desde el 20/11 ----------
  let r = await page.evaluate(() => ({
    a01: atcEstado(findById('a01')), a02: atcEstado(findById('a02')), a03: atcEstado(findById('a03')), a04: atcEstado(findById('a04')),
    sin02: atcRecojoSinMarcar(findById('a02')), sin01: atcRecojoSinMarcar(findById('a01')), lista: atcRecojosSinMarcar().map(function (p) { return p.id; })
  }));
  chk('1a · un recojo de ANTES del 20/11 con la fecha pasada sigue «En fábrica» (las ATC en curso no vuelven atrás)', r.a01 === 'fabrica', r);
  chk('1b · un recojo del lunes 23 que nadie marcó sigue «Por recoger» (no se marca solo)', r.a02 === 'sinrecoger' && r.sin02, r);
  chk('1c · marcado «Recogido» (el ✅ del viaje) sí está en fábrica', r.a04 === 'fabrica', r);
  chk('1d · la lista de recojos sin marcar: solo el del lunes 23', JSON.stringify(r.lista) === '["a02"]', r.lista);

  // ---------- 2. la ficha chica ----------
  let f = await ficha('a02');
  chk('2a · la ficha chica de un recojo sin marcar lo dice', /⚠️ Recojo sin marcar/.test(f), f);
  chk('2b · el botón dice «Recogido», no «Entregó»', /Recogido/.test(f) && !/Entregó/.test(f), f);
  chk('2c · sin «sin revisar» de stock: dice que se trae del cliente', !/sin revisar/.test(f) && /se trae del cliente/.test(f), f);
  f = await ficha('a04');
  chk('2d · recogido sin devolución: «En fábrica» con «🔁 Programar devolución»', /En fábrica/.test(f) && /Programar devolución/.test(f), f);
  f = await ficha('a05');
  chk('2e · devolución a 2 días hábiles sin traer de fábrica: «Traer de fábrica» con su botón', /Traer de fábrica/.test(f) && /Recogido de fábrica/.test(f), f);
  chk('2f · en la devolución el botón dice «Devuelto»', /Devuelto/.test(f) && !/Entregó/.test(f), f);
  f = await ficha('v01');
  chk('2g · una venta sigue con «Entregó»', /Entregó/.test(f) && !/Recogido/.test(f), f);

  // ---------- 3. la ficha grande del recojo ----------
  await page.evaluate(() => showPedidoModal('a02')); await page.waitForTimeout(80);
  let m = await T('#modal-box');
  chk('3a · arriba dice «🎧 Recojo», no «Entrega»', /🎧 Recojo/.test(m) && !/🚚 Entrega/.test(m), (m.match(/.{0,60}🚚 Entrega.{0,60}/) || [m.slice(0, 300)])[0]);
  chk('3b · el recuadro «🎧 La ATC» con sus 4 pasos', /La ATC/.test(m) && /1 · Recojo/.test(m) && /2 · En fábrica/.test(m) && /3 · Devolución/.test(m) && /4 · Entregada/.test(m), m.slice(0, 600));
  chk('3c · avisa que el recojo pasó y nadie lo marcó, con «✓ Recogido»', /nadie marcó «✓ Recogido»/.test(m) && /✓ Recogido/.test(m), m.slice(0, 900));
  chk('3d · sin «Qué se carga y de dónde» ni los botones de stock', !/Qué se carga y de dónde/.test(m) && !/En producción/.test(m) && /Qué se trae del cliente/.test(m), m);
  chk('3e · «Qué hacer» dice ir a buscar', /ir a buscar/.test(m), m.slice(0, 500));

  // ---------- 4. «✓ Recogido» abre «Programar devolución» ----------
  await page.evaluate(() => toggleEntregado('a02')); await page.waitForTimeout(300);
  m = await T('#modal-box');
  r = await page.evaluate(() => ({ ent: findById('a02').entregado, est: atcEstado(findById('a02')) }));
  chk('4a · marcado: el recojo quedó recogido (en fábrica)', r.ent === true && r.est === 'fabrica', r);
  chk('4b · se abrió solo «✓ Recogido · …» para programar la devolución, con «Más tarde»', /✓ Recogido ·/.test(m) && /Quedó recogido/.test(m) && /Más tarde/.test(m), m.slice(0, 400));
  await page.evaluate(() => { document.getElementById('pdev-fecha').value = '2026-11-27'; segSet('pdev-turno', 'PM'); guardarProgramarDevAtc('a02'); });
  await page.waitForTimeout(300);
  r = await page.evaluate(() => { var p = findById('a02'), a = atcDe(p); return { fecha: p.fecha, turno: p.turno, pdev: a.pdev, rec: a.rec, ent: p.entregado, est: atcEstado(p), viaje: atcViaje(p) }; });
  chk('4c · programada: la ATC pasa al viernes 27 a la tarde como devolución', r.fecha === '2026-11-27' && r.pdev === '2026-11-27' && r.turno === 'PM' && r.rec === '2026-11-23' && r.ent === false && r.viaje === 'dev', r);
  m = await T('#modal-box');
  chk('4d · vuelve a la ficha: dice «🔁 Devolución» y el interruptor «✅ Devuelto al cliente»', /🔁 Devolución/.test(m) && /Devuelto al cliente/.test(m), m.slice(0, 500));
  await page.evaluate(() => closeModal());

  // ---------- 5. «Más tarde» ----------
  await page.evaluate(() => { setQuick(''); renderAdmin(); quickEntregado('a03'); }); await page.waitForTimeout(300);
  m = await T('#modal-box');
  chk('5a · desde la ficha chica también se abre «Programar devolución»', /Quedó recogido/.test(m), m.slice(0, 200));
  await page.evaluate(() => pdevMasTarde()); await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ abierta: document.getElementById('modal').classList.contains('on'), est: atcEstado(findById('a03')), pdev: (atcDe(findById('a03')) || {}).pdev || '' }));
  chk('5b · «Más tarde» cierra y la deja recogida, en fábrica, sin devolución', !r.abierta && r.est === 'fabrica' && !r.pdev, r);
  f = await ficha('a03');
  chk('5c · la ficha chica ofrece «🔁 Programar devolución»', /Programar devolución/.test(f), f);

  // ---------- 6. el GPS: no en el recojo, sí en la devolución ----------
  r = await page.evaluate(() => {
    var _g = window.gpsLlegadaDe; window.gpsLlegadaDe = function () { return { veh: 'Carry', t0: Date.now() }; };
    var o = { rec: cierreEntGps(findById('a07')), dev: (cierreEntGps(findById('a06')) || {}).k || '', venta: (cierreEntGps(findById('v01')) || {}).k || '' };
    window.gpsLlegadaDe = _g; return o;
  });
  chk('6a · el GPS no propone el recojo de hoy', r.rec === null, r);
  chk('6b · el GPS sí propone la devolución de hoy (y una venta)', r.dev === 'vio' && r.venta === 'vio', r);

  // ---------- 7. traer de fábrica ----------
  await page.evaluate(() => showPedidoModal('a05')); await page.waitForTimeout(80);
  m = await T('#modal-box');
  chk('7a · la ficha de la devolución avisa traerlo de la fábrica, con su botón', /Hay que ir a buscarlo a la fábrica/.test(m) && /🏭 ✓ Recogido de fábrica/.test(m) && /traerlo de la fábrica/.test(m), m.slice(0, 900));
  chk('7b · lo que se lleva: el producto del cliente, de fábrica (no stock)', /Qué se le lleva/.test(m) && /falta traerlo/.test(m) && !/En producción/.test(m), m);
  await page.evaluate(() => atcFabDesdeFicha('a05')); await page.waitForTimeout(200);
  r = await page.evaluate(() => ({ rf: atcRecogidoFab(findById('a05')), pend: atcRecogerFabPend(findById('a05')) }));
  m = await T('#modal-box');
  chk('7c · «✓ Recogido de fábrica» lo anota y apaga el aviso', !!r.rf && !r.pend && !/Hay que ir a buscarlo a la fábrica/.test(m), r);
  await page.evaluate(() => closeModal());

  // ---------- 8. el botón «🎧 ATC» de los filtros cuenta los recojos sin marcar ----------
  await page.evaluate(() => { findById('a02').entregado = false; var a = atcDe(findById('a02')); var p = findById('a02'); p.fecha = '2026-11-23'; p.turno = 'PM'; mergeAtcDatos(p, { pdev: '', pturno: '', rec: '', rturno: '' }); renderAdmin(); });
  let c = await T('#adm-chips .qchip[data-k="atc"]');
  chk('8a · el botón «🎧 ATC» avisa el recojo sin marcar', /🔴 1 por marcar/.test(c), c);

  // ---------- 9. la pestaña ATC ofrece «✓ Recogido» ----------
  await page.evaluate(() => verAtc('a02')); await page.waitForTimeout(80);
  m = await T('#modal-box');
  chk('9a · la ficha de la pestaña ATC tiene «✓ Recogido» (antes el botón de la devolución quedaba gris)', /✓ Recogido/.test(m), m.slice(-500));
  await page.evaluate(() => closeModal());

  // ---------- 10. lunes y martes ----------
  r = await page.evaluate(() => ({
    jue: atcDiaMal('2026-11-26', null), lun: atcDiaMal('2026-11-30', null), mar: atcDiaMal('2026-12-01', null),
    dev: atcDiaMal('2026-11-26', findById('a06')), igual: atcDiaMal('2026-11-25', findById('a07'))
  }));
  chk('10a · un jueves no vale para el recojo; lunes y martes sí', r.jue === true && r.lun === false && r.mar === false, r);
  chk('10b · la devolución, o una ATC a la que no le cambiaron el día, no se mira', r.dev === false && r.igual === false, r);
  await page.evaluate(() => { showView('form'); resetForm(); segSet('f-doc-tipo', 'ATC'); pintarDocTipo(true); });
  let lb = await T('#f-fecha-lbt');
  chk('10c · en el formulario de una ATC la fecha dice «Día del recojo (lunes o martes)»', /Día del recojo \(lunes o martes\)/.test(lb), lb);
  r = await page.evaluate(async () => {
    UNLOCKED = false;
    document.getElementById('f-fecha').value = '2026-11-26';
    document.getElementById('f-vendedor').value = 'Isabel Robledo'; document.getElementById('f-cliente').value = 'CLIENTE NUEVO';
    document.getElementById('f-celular').value = '70000001'; document.getElementById('f-zona').value = 'Norte';
    var d = document.querySelector('#f-productos .prod-desc'); if (d) d.value = 'COLCHON ESPECIAL SEMIORTOPEDICO';
    var n0 = STATE.length; var tt = ''; var _t = window.toast; window.toast = function (m) { tt = m; };
    try { submitPedido(); } catch (e) { tt = 'ERR ' + e.message; }
    window.toast = _t;
    return { n: STATE.length - n0, tt: tt };
  });
  chk('10d · el vendedor no puede guardar una ATC un jueves (si lo demás está completo, lo dice)', r.n === 0, r);

  chk('sin errores en la página', !errs.length, errs);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
