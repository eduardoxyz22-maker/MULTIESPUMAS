/* 📍 (mejora 387, 16/11) «PASÓ SU TURNO» CON LO QUE VIO EL GPS.
   Cuida: en «Para hacer» de Mis pedidos, un pedido que pasó su turno sin ✅ y que HOY el GPS vio con el camión parado en su puerta sale
   aparte, en gris (no rojo), con el camión y la hora («el Carry estuvo en la puerta a las 11:20 · falta el ✅ de logística»); el que el GPS no
   vio sigue en rojo y dice «llamá a logística»; sin GPS, todos en rojo como antes; la lista «Ver» los muestra con la hora; «👑 Ver todos»
   (el equipo) hace lo mismo. Solo mira: no marca nada.
   Reloj clavado el lunes 16/11/2026 14:30 de Bolivia (el turno de la mañana termina a las 13:00). Red cortada, datos inventados.
   Se corre:  node tests/test_turno_gps.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T14:30:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    try { localStorage.removeItem('me_gps_dia'); } catch (e) {}
    CONNECTED = true; UNLOCKED = false; window.MIS_TOP_PRUEBA = true;
    apiSave = function (rec) { return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(rec)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    var hoy = todayStr(), P0 = { lat: -17.75, lng: -63.17 };
    var pin = function (i) { return { lat: P0.lat + 0.02 * i, lng: P0.lng + 0.01 }; };
    var V = function (id, veh, i, o) { return Object.assign({ id: id, oc: '11-' + (700 + i), cliente: 'CLIENTE ' + id.toUpperCase(), fecha: hoy, turno: 'AM', vendedor: 'Jonathan Monje', vehiculo: veh,
      chofer: veh ? (VEHICULOS[veh] || [])[0] : '', zona: 'Norte', direccion: 'Calle ' + i, productos: [{ desc: 'TITANIO LATEX', medida: '140x190', cant: 1, precio: 3000, chk: 'ok' }], saldo: 0, pagado: true,
      entregado: false, maps: 'https://www.google.com/maps?q=' + pin(i).lat + ',' + pin(i).lng, ts: 1, fotos: [], rev: 1 }, o || {}); };
    STATE = [V('g1', 'Carry', 1), V('g2', 'Carry', 2), V('n1', 'Carry', 3), V('m1', 'Carry', 4, { vendedor: 'Mirian Salazar' })];
    window.__pin = pin;
    window._todos = function () { var I = misHacerDatos('Jonathan Monje', STATE.filter(function (p) { return mismoVendedor(p.vendedor, 'Jonathan Monje'); }));
      return I.map(function (o) { return { sev: o.sev, ic: o.ic, n: o.n, t: o.t, s: o.s }; }); };
  });

  console.log('\n── 1. sin GPS: como antes ──');
  let r = await ev(() => _todos().filter(function (o) { return o.ic === '⏰' || o.ic === '📍'; }));
  chk('1 · sin GPS, los 3 atrasados de Jonathan van en rojo y no hay renglón gris', r.length === 1 && r[0].sev === 'r' && r[0].n === 3 && !/GPS/.test(r[0].s), r);

  console.log('\n── 2. el GPS vio el Carry en la puerta de dos ──');
  r = await ev(() => { var pl = gpsPlaca(VEHICULO_PLACA['Carry']), pin = window.__pin, u = {};
    u[pl] = { s: '09:00', ev: [['09:00', 'sal', 'ptf', 0]], par: [['11:20', '11:32', pin(1).lat, pin(1).lng, ['g1'], 0, 25], ['12:05', '12:15', pin(2).lat, pin(2).lng, ['g2'], 0, 30]] };
    gpsDiaTomar({ f: todayStr(), t: Date.now(), u: u });
    return _todos().filter(function (o) { return o.ic === '⏰' || o.ic === '📍'; }); });
  var rojo = (r || []).filter(o => o.ic === '⏰')[0], gris = (r || []).filter(o => o.ic === '📍')[0];
  chk('2a · en rojo queda solo el que el GPS no vio, y dice «llamá a logística»', rojo && rojo.sev === 'r' && rojo.n === 1 && /CLIENTE N1/.test(rojo.s) && /llamá a logística/.test(rojo.s), r);
  chk('2b · los dos que vio salen aparte, en gris, «falta el ✅ de logística»', gris && gris.sev === 'i' && gris.n === 2 && /falta el ✅ de logística/.test(gris.t) && /casi seguro se entregó/.test(gris.s), gris);
  r = await ev(() => { misVerLista('atrGps'); var t = (document.getElementById('modal-box') || {}).textContent || ''; closeModal(); return t; });
  chk('2c · «Ver» lista cada uno con el camión y la hora', /el Carry estuvo en la puerta a las 11:20/.test(r) && /a las 12:05/.test(r) && /No hace falta llamar/.test(r), r);

  console.log('\n── 3. uno solo: lo dice en la línea ──');
  r = await ev(() => { findById('g2').entregado = true; return _todos().filter(function (o) { return o.ic === '📍'; })[0]; });
  chk('3 · con uno solo, la línea dice el camión y la hora', r && r.n === 1 && /el Carry estuvo en la puerta a las 11:20/.test(r.s), r);

  console.log('\n── 4. «👑 Ver todos» ──');
  r = await ev(() => { var I = []; try { I = misEqHacerDatos ? misEqHacerDatos(STATE.slice()) : []; } catch (e) { return { err: String(e) }; }
    return I.filter(function (o) { return o.ic === '⏰' || o.ic === '📍'; }).map(function (o) { return { sev: o.sev, ic: o.ic, n: o.n }; }); });
  chk('4 · el equipo: el visto por el GPS va en gris y el rojo cuenta 2 (Jonathan y Mirian)', !r.err && r.some(o => o.ic === '📍' && o.n === 1 && o.sev === 'i') && r.some(o => o.ic === '⏰' && o.n === 2), r);

  console.log('\n── 5. no marca nada ──');
  r = await ev(() => ({ g1: findById('g1').entregado, n1: findById('n1').entregado }));
  chk('5 · solo mira: nada queda marcado entregado', r.g1 === false && r.n1 === false, r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
