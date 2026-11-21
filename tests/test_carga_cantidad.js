/* 📦 (21/11, revisión de Fable de logística) LA TILDE DE LA LISTA DE CARGA RECUERDA CUÁNTAS UNIDADES SE TILDARON.
   Antes la tilde (fecha|camión|producto[|@lugar][|~PM]) valía por todas las unidades de esa línea: tildado un pedido de 2, si después entraba
   otro de 3 del mismo producto al mismo camión y turno, la línea pasaba a «× 5» y seguía tildada (camión completo), y con «🚚 Ya salió» a la
   mañana `adelantoAlSalir` pasaba a la mañana también el pedido que nadie cargó (con «en camino» al cliente).
   Ahora: al tildar se anota `<clave>|#<unidades>`; si la línea tiene más, ya no está cargada. Una tilde sin cantidad (de antes) vale como siempre.
   Se corre: node tests/test_carga_cantidad.js   ·  contra otra página: PEDIDOS=… */
'use strict';
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS = 0, FAIL = 0;
const chk = (n, ok, d) => { if (ok) { PASS++; console.log('✓ ' + n); } else { FAIL++; console.log('✗ ' + n + (d !== undefined ? ' · ' + JSON.stringify(d).slice(0, 400) : '')); } };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-18T08:30:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; guardarCargaChk = function () {};
    var hoy = todayStr(), veh = Object.keys(VEHICULOS)[0];
    var L = function (n) { return { codigo: 'CH1220', desc: 'TITANIO ICE', medida: '140x190', cant: n, precio: 1000, chk: 'ok' }; };
    var P = function (id, n, t, o) { return Object.assign({ id: id, oc: '11-' + id, fecha: hoy, turno: t || 'AM', cliente: 'CLIENTE ' + id, vendedor: 'Maria Flores', celular: '70000000', zona: 'Norte', vehiculo: veh, chofer: 'X', productos: [L(n)] }, o || {}); };
    var cam = function () { return cargaVivaDatos().cams.filter(function (x) { return x.k === veh; })[0]; };
    var out = {};
    CARGA_CHK = {}; STATE = [P('001', 2)]; saveMirror();
    var k = cam().lineas[0].key; setCargaChk(k, true);
    out.a = { dentro: cam().dentro, total: cam().total, qty: cargaChkQty(k) };
    STATE.push(P('002', 3)); saveMirror();
    out.b = { dentro: cam().dentro, total: cam().total, on: cam().lineas[0].on, dep2: depCargado(STATE[1], STATE[1].productos[0]).u };
    setCargaChk(k, true);
    out.c = { dentro: cam().dentro, total: cam().total, qty: cargaChkQty(k), quedan: cargaChkQtyKeys(k).length };
    STATE.pop(); saveMirror();
    out.d = { on: isCargaChk(k), dentro: cam().dentro, total: cam().total };
    setCargaChk(k, false);
    out.e = { on: isCargaChk(k), qkeys: Object.keys(CARGA_CHK).length };
    /* una tilde de antes (sin cantidad) vale como siempre */
    CARGA_CHK = {}; CARGA_CHK[k] = 1; STATE = [P('001', 2), P('002', 3)]; saveMirror();
    out.f = { on: isCargaChk(k), dentro: cam().dentro, total: cam().total };
    /* lo que se guarda en la planilla lleva la cantidad, y se lee igual */
    CARGA_CHK = {}; STATE = [P('001', 2)]; saveMirror(); setCargaChk(k, true);
    var txt = textoCargaChk(CARGA_CHK); var vuelta = parseCargaChk(txt); CARGA_CHK = vuelta;
    out.g = { txt: txt, on: isCargaChk(k) };
    /* la tarde: un PM tildado y otro PM que se suma después → no está entero en la carga (no se adelanta) */
    CARGA_CHK = {}; STATE = [P('101', 2, 'PM')]; saveMirror();
    var kp = cargaChkKey(hoy, veh, cargaProdKey(STATE[0].productos[0]), '', 'PM'); setCargaChk(kp, true);
    STATE.push(P('102', 3, 'PM')); saveMirror();
    out.h = { aEntero: adelantoCargadoEntero(STATE[0]), bEntero: adelantoCargadoEntero(STATE[1]) };
    /* adelanto: la mañana tenía otro igual SIN cargar → al pasar el de la tarde, la mañana sigue pendiente */
    CARGA_CHK = {}; STATE = [P('201', 1, 'AM'), P('202', 2, 'PM')]; saveMirror();
    var kpm = cargaChkKey(hoy, veh, cargaProdKey(STATE[1].productos[0]), '', 'PM'), kam = cargaChkKey(hoy, veh, cargaProdKey(STATE[1].productos[0]), '', 'AM');
    setCargaChk(kpm, true);
    STATE[1].turno = 'AM'; saveMirror();
    adelantoTildesAM(STATE[1]);
    out.i = { am: isCargaChk(kam), qty: cargaChkQty(kam), dep202: depCargado(STATE[1], STATE[1].productos[0]).u, dep201: depCargado(STATE[0], STATE[0].productos[0]).u };
    /* adelanto: la mañana ya cargada entera + el de la tarde → la mañana sigue cargada */
    CARGA_CHK = {}; STATE = [P('301', 1, 'AM'), P('302', 2, 'PM')]; saveMirror();
    setCargaChk(kam, true); setCargaChk(kpm, true);
    STATE[1].turno = 'AM'; saveMirror();
    adelantoTildesAM(STATE[1]);
    out.j = { am: isCargaChk(kam), qty: cargaChkQty(kam) };
    /* «🚚 Ya salió» sigue andando (no es una tilde de producto) */
    CARGA_CHK = {};
    setCargaChk(cargaChkKey(hoy, veh, CARGA_SALIO) + '|09:45', true);
    out.k = { salio: camionSalio(hoy, veh), claves: Object.keys(CARGA_CHK) };
    return out;
  });

  chk('A · tildado un pedido de 2: 2 de 2 y se anota la cantidad', r.a.dentro === 2 && r.a.total === 2 && r.a.qty === 2, r.a);
  chk('⚠️ B · entra otro de 3 al mismo camión: la línea (× 5) ya NO figura cargada, y el pedido nuevo tampoco', r.b.dentro === 0 && r.b.total === 5 && r.b.on === false && r.b.dep2 === 0, r.b);
  chk('C · volver a tildar: 5 de 5, con una sola cantidad guardada', r.c.dentro === 5 && r.c.total === 5 && r.c.qty === 5 && r.c.quedan === 1, r.c);
  chk('D · se saca un pedido: la línea queda cargada (5 ≥ 2)', r.d.on === true && r.d.dentro === 2, r.d);
  chk('E · destildar saca la tilde y su cantidad', r.e.on === false && r.e.qkeys === 0, r.e);
  chk('F · una tilde de antes, sin cantidad, vale como siempre', r.f.on === true && r.f.dentro === 5, r.f);
  chk('G · lo que va a la planilla lleva «|#2» y al leerlo de vuelta sigue tildado', /\|#2/.test(r.g.txt) && r.g.on === true, r.g);
  chk('⚠️ H · la tarde: el pedido que se sumó después no está «entero en la carga» (no se adelanta)', r.h.bEntero === false, r.h);
  chk('⚠️ I · adelanto con otro de la mañana SIN cargar: la mañana sigue pendiente (2 de 3)', r.i.am === false && r.i.qty === 2, r.i);
  chk('J · adelanto con la mañana ya cargada: la mañana sigue cargada (1 + 2)', r.j.am === true && r.j.qty === 3, r.j);
  chk('K · «🚚 Ya salió» sigue andando y no lleva cantidad', r.k.salio === '09:45' && r.k.claves.length === 1, r.k);
  chk('sin errores de la página', !errs.length, errs);
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
