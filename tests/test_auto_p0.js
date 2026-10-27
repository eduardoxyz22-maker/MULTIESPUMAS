/* 🏭 «EN PRODUCCIÓN» AUTOMÁTICO: LA PRIORIDAD 0 PARA PODER PRENDERLO (27/10, §4ne).

   El dueño (27/10): lo va a hablar con logística; mientras, queda APAGADO y listo para prender. La revisión 2 (§4ls) pidió cinco cosas
   antes de prenderlo; esta prueba las cuida (con el automático prendido SOLO adentro de cada bloque, y apagado de nuevo al salir):
     P1  Página vieja: una copia del stock que perdió lo anotado (`ap`) y la escribió un formato más viejo se JUNTA al leer (no se adopta);
         el servidor 2026-10-27-a además no la deja guardar (test_servidor §22 i). Apagado, el formato sigue en 3.
     P2  Junta de tres copias: la poda es SOLO por fecha. Lo que llegó o se anuló en un equipo ya no lo revive la copia de otro.
     P3  Un solo reparto: con el automático prendido, «Ya pedí» se anota en `STOCK.ap` (a mano), no en `STOCK.p`; «Deshacer» lo anula; la
         llegada del lote lo cierra una vez. Apagado, «Ya pedí» sigue como siempre.
     P4  Lo anotado antes de prender (`STOCK_AUTO_DESDE`) no cuenta, no se ve y no se cierra.
     P5  El camión que nadie vio salir: lo de hoy que el Excel dio por salido sin GPS, «Ya salió», ✅ ni cierre no se toma como producción.
   Reloj CLAVADO: miércoles 28/10/2026 12:30 de Bolivia. Red cortada, datos sintéticos.
   Se corre:  node tests/test_auto_p0.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR() {
  var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
  CONNECTED = true; UNLOCKED = true; SERVER_AUTH = 'abierto';
  try { localStorage.removeItem(LS_PEND); } catch (e) {}
  CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = '';
  try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  apiSave = function (rec) { return Promise.resolve({ ok: true, pedido: rec }); };
  apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
  window.LOG = 'PRODUCTOS TERMINADOS FAB.'; window.BZ = 'Almacen Distribucion Banzer'; window.IM = 'IM - PRODUCTOTERMINADO';
  window.K = stockClave({ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201' });
  window.K2 = stockClave({ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129' });
  window._fila = function (k) { stockOlvidarIndice(); SALDO_CACHE = null; return stockData().lista.filter(function (o) { return o.k === k; })[0] || null; };
  /* Stock de hoy a las 08:00 en los tres almacenes; 10 TITANIO LATEX vendidos para el viernes con 4 en PTF: el panel pide fabricar. */
  window._base = function () {
    STOCK = stockVacio(); STOCK_CARGADO = true;
    var hoy = todayStr(), t = new Date(hoy + 'T08:00:00-04:00').getTime();
    STATE = [{ id: 'p-v', oc: 'OC 10-901', fecha: '2026-10-30', turno: 'AM', cliente: 'CLIENTE VIERNES', vendedor: 'Maria Flores', celular: '70000000', zona: 'Norte',
               productos: [{ codigo: 'CH1129', desc: 'COLCHON TITANIO LATEX', medida: '140x190', cant: 10, precio: 1000 }] }];
    STOCK.c = { f: hoy, hora: '08:00:00', u: {}, solo0: true, alm: LOG, t: t }; STOCK.c.u[K] = 11; STOCK.c.u[K2] = 4;
    STOCK.g = {}; STOCK.g[BZ] = { f: hoy, hora: '08:00:00', u: {}, solo0: true, t: t, rs: {} }; STOCK.g[BZ].u[K] = 5;
    STOCK.g[IM] = { f: hoy, hora: '08:00:00', u: {}, solo0: true, t: t, rs: {} }; STOCK.g[IM].u[K] = 25;
    STOCK.al = {}; STOCK.al[LOG] = 'log'; STOCK.al[BZ] = 'sale'; STOCK.al[IM] = 'otro';
    STOCK.p = []; STOCK.ap = {}; stockOlvidarIndice();
  };
  window._prender = function (desde) { STOCK_AUTO_ACTIVO = true; STOCK_AUTO_DESDE = desde || ''; };
  window._apagar = function () { STOCK_AUTO_ACTIVO = false; STOCK_AUTO_DESDE = ''; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-10-28T12:30:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error: String((e && e.message) || e).slice(0, 400) }; } };

  // ══ 0. Apagado y listo ══════════════════════════════════════════════════════
  console.log('\n── 0. Viene APAGADO; el formato del stock sigue en 3 ──');
  const def = await ev(() => ({ on: STOCK_AUTO_ACTIVO, desde: STOCK_AUTO_DESDE, pv: STOCK_PV }));
  chk('STOCK_AUTO_ACTIVO=false, STOCK_AUTO_DESDE vacío y STOCK_PV=3 (la página de hoy no traba a nadie)', def.on === false && def.desde === '' && def.pv === 3, def);

  // ══ P4. Lo anotado antes de prender ═════════════════════════════════════════
  console.log('\n── P4. Lo anotado antes de prender no cuenta ──');
  const p4 = await ev(() => {
    _base(); var t = Math.floor(Date.now() / 1000);
    STOCK.ap = {}; STOCK.ap[K2] = { '2026-10-26': [5, 0, 0, 0, t], '2026-10-27': [3, 0, 0, 0, t] };
    _prender(''); var sin = _fila(K2), sinTxt = stockAutoHtml(sin);
    _prender('2026-10-27'); var d27 = _fila(K2);
    _prender('2026-10-28'); var d28 = _fila(K2), d28Txt = stockAutoHtml(d28);
    var cons = stockAutoConsumir((function () { var o = {}; o[K2] = 8; return o; })(), todayStr(), 'lote-p4');
    var quedo = JSON.stringify(STOCK.ap[K2]);
    _apagar();
    return { sin: sin.enCamino, sinTxt: /En producción/.test(sinTxt), d27: d27.enCamino, d28: d28.enCamino, d28Txt: d28Txt, cons: cons.length, quedo: quedo };
  });
  chk('sin fecha de inicio cuenta todo lo anotado (8 en producción, como el 17/10)', p4.sin === 8 && p4.sinTxt, p4);
  chk('con STOCK_AUTO_DESDE=27/10: solo lo del 27 (3)', p4.d27 === 3, p4);
  chk('con STOCK_AUTO_DESDE=28/10 (el día en que se prende): nada de antes cuenta ni se muestra', p4.d28 === 0 && p4.d28Txt === '', p4);
  chk('…y una llegada no lo cierra (queda como estaba, para la poda)', p4.cons === 0 && /\[5,0,0,0/.test(p4.quedo) && /\[3,0,0,0/.test(p4.quedo), p4.quedo);

  // ══ P2. La junta de tres copias no revive lo cerrado ═══════════════════════
  console.log('\n── P2. La poda solo por fecha: lo cerrado en un equipo no lo revive otro ──');
  const p2 = await ev(() => {
    _base(); var t1 = 1761500000, t2 = t1 + 3600, hoy = todayStr();
    var mk = function (ap) { var s = stockVacio(); s.c = JSON.parse(JSON.stringify(STOCK.c)); s.g = JSON.parse(JSON.stringify(STOCK.g)); s.al = STOCK.al; s.ap = ap; s.v = 2; s.pv = STOCK_PV; return s; };
    var ap = function (o) { var x = {}; x[K2] = o; return x; };
    /* base y la planilla: abierto el 23/10 (5) y el 26/10 (4); este equipo: el 23 llegó entero, el 26 lo anuló («No se pidió») */
    var b = mk(ap({ '2026-10-23': [5, 0, 0, 0, t1], '2026-10-26': [4, 0, 0, 0, t1], '2026-10-10': [7, 0, 0, 0, t1] }));
    var s = mk(ap({ '2026-10-23': [5, 0, 0, 0, t1], '2026-10-26': [4, 0, 0, 0, t1], '2026-10-10': [7, 0, 0, 0, t1] }));
    var m = mk(ap({ '2026-10-23': [5, 5, 0, 0, t2], '2026-10-26': [4, 0, 0, 1, t2], '2026-10-10': [7, 0, 0, 0, t1] }));
    stockPodar(m, hoy);   // lo que pasa al guardar y al leer
    var mp = JSON.stringify(m.ap[K2]);
    var j = stockFusionar(b, m, s);
    var ja = (j.ap || {})[K2] || {};
    STOCK = j; stockOlvidarIndice(); _prender(''); var o = _fila(K2); _apagar();
    return { mp: mp, a23: ja['2026-10-23'], a26: ja['2026-10-26'], viejo: ja['2026-10-10'] || null, enCamino: o.enCamino };
  });
  chk('podar este equipo NO borra lo que llegó ni lo anulado de hace menos de 12 días', /"2026-10-23":\[5,5/.test(p2.mp) && /"2026-10-26":\[4,0,0,1/.test(p2.mp), p2.mp);
  chk('…y sí lo de más de 12 días (todas las copias podan lo mismo)', !/2026-10-10/.test(p2.mp) && p2.viejo === null, p2);
  chk('juntar con las copias que lo tenían abierto: lo del 23 sigue LLEGADO (5 de 5) y lo del 26 sigue ANULADO', p2.a23 && p2.a23[1] === 5 && p2.a26 && p2.a26[3] === 1, p2);
  chk('…así que nada de eso vuelve a contar como «en producción»', p2.enCamino === 0, p2);

  // ══ P3. Un solo reparto con «Ya pedí» ═══════════════════════════════════════
  console.log('\n── P3. Prendido, «Ya pedí» va al mismo lugar que lo del panel ──');
  const p3 = await ev(() => {
    _base(); _prender('2026-10-28');
    var o = _fila(K2), fab = o.fabricar;
    var htmlAntes = planYaHtml(o);
    planYaPedi(K2, true);
    var e = stockAutoDe(K2, todayStr()), pYa = (STOCK.p || []).filter(function (q) { return q && q.ya; }).length;
    var o2 = _fila(K2), htmlDesp = planYaHtml(o2), undo = planYaUndoHtml();
    planYaDeshacer();
    var e2 = stockAutoDe(K2, todayStr()), o3 = _fila(K2), htmlUndo = planYaHtml(o3);
    /* al día siguiente cuenta, y la llegada del lote lo cierra UNA vez */
    planYaPedi(K2, true);
    _apagar();
    return { fab: fab, chkAntes: /Ya pedí/.test(htmlAntes), e: e && [e.u, e.rec, e.man, e.no], pYa: pYa, txt: /anotado a mano/.test(htmlDesp), sinChk: !/type="checkbox"/.test(htmlDesp),
             undo: /Deshacer/.test(undo), e2: e2 && e2.no, chkUndo: /type="checkbox"/.test(htmlUndo), ap: JSON.stringify(STOCK.ap[K2]) };
  });
  chk('el Plan ofrece «Ya pedí» (el panel todavía no anotó nada hoy)', p3.fab > 0 && p3.chkAntes, p3);
  chk('tildarlo anota HOY en `STOCK.ap`, a mano, con lo de «Pedir 7 días»; nada en `STOCK.p`', p3.e && p3.e[0] === p3.fab && p3.e[1] === 0 && p3.e[2] === true && p3.e[3] === false && p3.pYa === 0, p3);
  chk('la fila dice «anotado a mano» y ya no ofrece la casilla; arriba, «↩️ Deshacer»', p3.txt && p3.sinChk && p3.undo, p3);
  chk('«Deshacer» lo anula y vuelve la casilla', p3.e2 === true && p3.chkUndo, p3);
  const p3b = await page.evaluate(() => {
    _prender('2026-10-28');
    var pend = function () { var e = stockAutoDe(K2, '2026-10-28'); return e ? e.u - e.rec : -1; };
    return { antes: pend() };
  });
  await page.clock.setFixedTime(new Date('2026-10-29T12:30:00-04:00'));
  const p3c = await ev(() => {
    var o = _fila(K2), cam = o.enCamino;
    var prod = {}; prod[K2] = 4;
    var c1 = stockAutoConsumir(prod, todayStr(), 'lote-29');
    var c2 = stockAutoConsumir(prod, todayStr(), 'lote-29');   // el mismo lote otra vez (otro equipo, o volver a subir): no cierra dos veces
    var e = stockAutoDe(K2, '2026-10-28'), o2 = _fila(K2);
    _apagar();
    return { cam: cam, c1: c1.length, c2: c2.length, rec: e && e.rec, cam2: o2.enCamino, det: stockDetectadoSinAsignar(K2) };
  });
  chk('al otro día cuenta como en producción', p3c.cam === p3b.antes && p3c.cam > 0, { antes: p3b.antes, p3c });
  chk('la llegada del lote (4) lo cierra una vez; el mismo lote otra vez no', p3c.c1 === 1 && p3c.c2 === 0 && p3c.rec === 4 && p3c.cam2 === p3c.cam - 4, p3c);
  chk('…y no hay un «Ya pedí» en `STOCK.p` al que el control del Excel le reste la misma llegada', p3c.det === 0, p3c);
  await page.clock.setFixedTime(new Date('2026-10-28T12:30:00-04:00'));
  const p3d = await ev(() => {
    _base(); _apagar(); var o = _fila(K2);
    planYaPedi(K2, true);
    var r = { ap: Object.keys(STOCK.ap || {}).length, p: (STOCK.p || []).filter(function (q) { return q && q.ya; }).length };
    planYaDeshacer(); r.p2 = (STOCK.p || []).filter(function (q) { return q && q.ya; }).length;
    return r;
  });
  chk('apagado, «Ya pedí» sigue como siempre (en `STOCK.p`, y «Deshacer» lo saca)', p3d.ap === 0 && p3d.p === 1 && p3d.p2 === 0, p3d);

  // ══ P5. El camión que nadie vio salir ═══════════════════════════════════════
  console.log('\n── P5. Lo de un camión que nadie vio salir no es producción ──');
  const p5 = await ev(() => {
    _base(); var hoy = todayStr();
    STATE.push({ id: 'p-hoy', oc: 'OC 10-950', fecha: hoy, turno: 'AM', cliente: 'CLIENTE HOY', vendedor: 'Maria Flores', celular: '70000000', zona: 'Norte', vehiculo: 'Camión 1',
                 ts: new Date(hoy + 'T07:00:00-04:00').getTime(), productos: [{ codigo: 'CH1129', desc: 'COLCHON TITANIO LATEX', medida: '140x190', cant: 3, chk: 'ok' }] });
    STATE.push({ id: 'p-bz', oc: 'OC 10-951', fecha: hoy, turno: 'AM', cliente: 'CLIENTE BANZER', vendedor: 'Maria Flores', celular: '70000000', zona: 'Sur', vehiculo: 'Camión 2',
                 ts: new Date(hoy + 'T07:00:00-04:00').getTime(), productos: [{ codigo: 'CH1201', desc: 'TITANIO ICE', medida: '160x190', cant: 2, chk: 'ok', chkDe: BZ }] });
    var v = stockVentanaCorte({ f: '2026-10-27', hora: '18:00:00', incT: 'ampm', inc: true }, { fecha: hoy, hora: '12:30:00' }, { am: true, pm: false });
    var sale = stockSalioVentana(STATE[1], STATE[1].productos[0], v);
    var sinAca = existLoteSinCamion(v, ''), sinBz = existLoteSinCamion(v, BZ);
    var _cs = camionSalio; camionSalio = function (f, veh) { return veh === 'Camión 1' ? '09:10' : ''; };
    var conGps = existLoteSinCamion(v, '');
    camionSalio = _cs;
    STATE[1].entregado = true; var conOk = existLoteSinCamion(v, ''); STATE[1].entregado = false;
    STATE[1].productos[0].eF = hoy; var conCierre = existLoteSinCamion(v, ''); delete STATE[1].productos[0].eF;
    var L = { roles: { log: 1, otro: 1 }, dif: {}, ent: {}, sinCam: {} }; L.dif[K2] = 5; L.sinCam[K2] = 3;
    var prod = existLoteProduccion(L);
    var L2 = { roles: { log: 1, otro: 1 }, dif: {}, ent: {}, sinCam: {} }; L2.dif[K2] = 2; L2.sinCam[K2] = 3;
    var prod2 = existLoteProduccion(L2);
    return { sale: sale, aca: sinAca[K2] || 0, bz: sinBz[K] || 0, bzAca: sinAca[K] || 0, gps: conGps[K2] || 0, ok: conOk[K2] || 0, cierre: conCierre[K2] || 0, prod: prod[K2] || 0, prod2: prod2[K2] || 0 };
  });
  chk('lo de hoy de la mañana, con la casilla «ya trae la mañana», el Excel lo da por salido', p5.sale === true, p5);
  chk('sin GPS ni «Ya salió»: 3 de PTF y 2 de Banzer son «de un camión que nadie vio salir» (cada uno en su depósito)', p5.aca === 3 && p5.bz === 2 && p5.bzAca === 0, p5);
  chk('con el camión visto (GPS / «Ya salió»), con ✅ o con el cierre de entregas: nada', p5.gps === 0 && p5.ok === 0 && p5.cierre === 0, p5);
  chk('el lote: +5 en el Excel con 3 de un camión que nadie vio salir = 2 de producción; +2 = nada', p5.prod === 2 && p5.prod2 === 0, p5);

  // ══ P1. Una página vieja que perdió lo anotado ══════════════════════════════
  console.log('\n── P1. Una copia de una página vieja que perdió lo anotado se junta ──');
  const p1 = await ev(() => {
    _base(); var t = Math.floor(Date.now() / 1000);
    STOCK.ap = {}; STOCK.ap[K2] = { '2026-10-28': [6, 0, 1, 0, t] }; STOCK.v = 2; STOCK.pv = STOCK_PV;
    var obs = JSON.stringify(STOCK);
    SIS_BASE = SIS_BASE || {}; SIS_BASE[STOCK_ID] = { obs: obs };
    var viejo = JSON.parse(obs); delete viejo.ap; viejo.pv = 3;
    var hoyPv = stockProtegerDePaginaVieja(viejo);          // formato 3 con la página de hoy (3): está al día, se adopta
    var _pv = STOCK_PV; STOCK_PV = 4;                        // prendido: la página nueva es de formato 4
    var j = stockProtegerDePaginaVieja(viejo);
    var sinPv = JSON.parse(obs); delete sinPv.ap; delete sinPv.pv;
    var j2 = stockProtegerDePaginaVieja(sinPv);
    STOCK_PV = _pv;
    return { hoy: hoyPv === null, junta: !!(j && j.ap && j.ap[K2] && j.ap[K2]['2026-10-28']), junta2: !!(j2 && j2.ap && j2.ap[K2]) };
  });
  chk('con el automático apagado (formato 3) una copia de formato 3 se adopta como hoy', p1.hoy, p1);
  chk('prendido (formato 4): una copia de formato 3 sin lo anotado se JUNTA y lo anotado queda', p1.junta, p1);
  chk('…y una sin formato (la página de antes del 06/10), también', p1.junta2, p1);

  const fin = await ev(() => ({ on: STOCK_AUTO_ACTIVO, desde: STOCK_AUTO_DESDE }));
  chk('al terminar quedó APAGADO', fin.on === false && fin.desde === '', fin);
  chk('sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
