/* 🔎 MEJORA 364 · LO QUE EL STOCK GANA O PIERDE SIN EXPLICAR — LA PÁGINA (Stock → «🔎 Lo que no cierra»).
   El servidor (`iaStockSemana`, .gs 2026-11-16-a: lee «Historial stock» y saca lo que no explican los movimientos) lo prueba
   tests/test_ia_gestion_servidor.js; acá, con `apiPost`/`apiList` de mentira:
   1. Los movimientos que manda el panel, por día y producto: las entregas por depósito (PTF o Banzer, con el día real del cierre),
      las reposiciones aparte, las ventas de tienda aparte (no salen de PTF), las llegadas de fábrica, las recogidas de Moreno y las
      salidas anotadas a mano (sin las anuladas); fuera de la ventana, nada. Solo números: ni clientes ni celulares.
   2. Qué es cada almacén: Banzer de salida, Moreno la fábrica.
   3. El botón aparece solo para gerencia y logística, con el servidor nuevo y (en Playwright) con `ISS_PRUEBA`.
   4. Abrir la ventana lee la semana UNA vez (relee la planilla antes): la semana = el lunes, 14 días de Excel; guarda en `__stock_ia__`;
      volver a abrir no lee de nuevo; «una vez por semana, sola» corre solo si esta semana no tiene lectura.
   5. Se ve: cada hallazgo con su ícono, los días (−1 en rojo, +4 en verde), qué pasa y qué preguntar; el botón dice cuántos.
      «📋 Copiar» lo arma en texto. NADA toca el stock (ni `STOCK` ni la fila `__stock__`).
   6. Los «no»: sin historial, sin conexión.
   Datos INVENTADOS. Reloj clavado (lunes 16/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_iss_stock.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const BZ = '01-05-025  Almacen Distribucion Banzer', IM = 'IM - PRODUCTOTERMINADO';
const RES = { resumen: 'El LITE 105 baja 1 por día sin entregas; el ICE pasó de PTF a Banzer.', dias: 6, productos: 2, desde: '2026-11-09', hasta: '2026-11-14', hallazgos: [
  { tipo: 'baja_sin_entrega', producto: 'SUEÑA LITE 105x190', almacen: 'PTF', dias: [{ dia: '2026-11-10', u: -1 }, { dia: '2026-11-11', u: -1 }], que_pasa: 'Baja casi todos los días sin entregas.', preguntar: 'Preguntar en las tiendas si se lo llevan sin cargar' },
  { tipo: 'traspaso', producto: 'TITANIO ICE 160x190', almacen: 'PTF y Banzer', dias: [{ dia: '2026-11-12', u: -4 }, { dia: '2026-11-12', u: 4 }], que_pasa: 'Es un traspaso entre depósitos.', preguntar: 'Nada que hacer' } ] };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const espera = (ms) => page.waitForTimeout(ms || 300);

  await ev((a) => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; CARGA_GEN++; CARGA_ESTADO = 'ok';
    try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer = function () {};
    try { localStorage.removeItem(LS_PEND); localStorage.removeItem(QUIEN_LS_ROL); localStorage.removeItem(LS_ADM_DEV); } catch (e) {}
    ULTIMO_REFRESCO = Date.now();
    var kT = stockInfo({ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129' }).k, kL = stockInfo({ desc: 'COLCHON SUEÑA LITE', medida: '105x190', codigo: 'CH2531' }).k;
    window.__K = { T: kT, L: kL };
    var g = {}; g[a.BZ] = { f: '2026-11-16', hora: '08:00', u: {} }; g[a.BZ].u[kT] = 4; g[a.IM] = { f: '2026-11-16', hora: '08:00', u: {} }; g[a.IM].u[kT] = 10;
    var cu = {}; cu[kT] = 6; cu[kL] = 9;
    STOCK = leerStock({ observaciones: JSON.stringify({ c: { f: '2026-11-16', hora: '08:00', u: cu, solo0: true, t: Date.parse('2026-11-16T08:05:00-04:00') }, e: [],
      p: [ { id: 'q1', k: kT, u: 5, tipo: 'fabrica', fab: 'MORENO', f: '2026-11-08', recs: [{ id: 'r1', u: 5, f: '2026-11-13', ts: 1 }] },
           { id: 'q2', k: kL, u: 2, tipo: 'recogida', de: a.IM, f: '2026-11-11', recs: [{ id: 'r2', u: 2, f: '2026-11-12', ts: 1 }] },
           { id: 'q3', k: kL, u: 9, tipo: 'fabrica', f: '2026-10-01', recs: [{ id: 'r3', u: 9, f: '2026-10-20', ts: 1 }] } ],
      a: {}, g: g, al: {}, sm: [ { id: 's1', k: kT, u: 1, f: '2026-11-11', ts: 1, m: 'muestra' }, { id: 's2', k: kT, u: 7, f: '2026-11-11', ts: 1, an: { t: 1, m: 'x' } } ], det: [] }) });
    /* lo anotado (llegadas, recogidas, salidas a mano), puesto después de leer: `leerStock` poda lo que el Excel ya incluye */
    STOCK.p = [ { id: 'q1', k: kT, u: 5, tipo: 'fabrica', fab: 'MORENO', f: '2026-11-08', recs: [{ id: 'r1', u: 5, f: '2026-11-13', ts: 1 }] },
                { id: 'q2', k: kL, u: 2, tipo: 'recogida', de: a.IM, f: '2026-11-11', recs: [{ id: 'r2', u: 2, f: '2026-11-12', ts: 1 }] },
                { id: 'q3', k: kL, u: 9, tipo: 'fabrica', f: '2026-10-01', recs: [{ id: 'r3', u: 9, f: '2026-10-20', ts: 1 }] } ];
    STOCK.sm = [ { id: 's1', k: kT, u: 1, f: '2026-11-11', ts: 1, m: 'muestra' }, { id: 's2', k: kT, u: 7, f: '2026-11-11', ts: 1, an: { t: 1, m: 'x' } } ];
    STOCK_CARGADO = true;
    var P = function (id, oc, fecha, prods, extra) { return Object.assign({ id: id, oc: oc, fecha: fecha, turno: 'AM', cliente: 'CLIENTE INVENTADO ' + id, celular: '70099' + id.length, vendedor: 'Mirian Salazar', zona: 'Norte',
      productos: prods, entregado: false, ts: Date.parse('2026-11-05T09:00:00-04:00'), rev: 2, fotos: [] }, extra || {}); };
    window.__BASE = [
      P('e1', '11-101', '2026-11-12', [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129', cant: 2 }], { entregado: true }),
      P('e2', '11-102', '2026-11-10', [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129', cant: 1, chk: 'ok', chkDe: 'Banzer', eF: '2026-11-11' }], { entregado: true }),
      P('r1', 'RPT 11-001', '2026-11-13', [{ desc: 'COLCHON SUEÑA LITE', medida: '105x190', codigo: 'CH2531', cant: 3 }]),
      P('t1', '11-103', '', [{ desc: 'COLCHON SUEÑA LITE', medida: '105x190', codigo: 'CH2531', cant: 1 }], { direccion: 'SALIÓ DE TIENDA · Carmelo', zona: 'TIENDA', ts: Date.parse('2026-11-14T15:00:00-04:00') }),
      P('f1', '11-104', '2026-11-20', [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129', cant: 1 }]),                       // futuro: no salió
      P('v1', '11-090', '2026-10-20', [{ desc: 'TITANIO LATEX', medida: '140x190', codigo: 'CH1129', cant: 1 }], { entregado: true })  // fuera de la ventana
    ];
    STATE = JSON.parse(JSON.stringify(__BASE)); saveMirror();
    window.__STOCK0 = JSON.stringify(STOCK);
    window.__S = { posts: [], guardados: [], fila: null, modo: 'ok', res: a.RES };
    apiList = function () { var L = JSON.parse(JSON.stringify(__BASE)); if (__S.fila) L.push(JSON.parse(JSON.stringify(__S.fila))); return Promise.resolve({ ok: true, pedidos: L }); };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b)); __S.posts.push(b);
      if (b.action === 'save') { __S.guardados.push(b.pedido); if (b.pedido.id === '__stock_ia__') __S.fila = b.pedido; return Promise.resolve({ ok: true, pedido: Object.assign({}, b.pedido, { rev: 3 }), mode: 'update' }); }
      if (b.action !== 'iaStockSemana') return Promise.resolve({ ok: true });
      if (__S.modo === 'red') return Promise.reject(new Error('Failed to fetch'));
      if (__S.modo !== 'ok') return Promise.resolve({ ok: false, error: __S.modo, tope: 4 });
      return Promise.resolve({ ok: true, res: JSON.parse(JSON.stringify(__S.res)), usadas: 1, tope: 4, usd: 0.06, t: Date.now() });
    };
  }, { BZ, IM, RES });

  console.log('\n── 1. Los movimientos que manda el panel ──');
  let r = await ev(() => ({ M: issMovimientos('2026-11-02', '2026-11-16'), K: __K }));
  const M = r.M || {}, K = r.K || {};
  const d = (dia, k) => ((M[dia] || {})[k]) || {};
  chk('a. la entrega de PTF el día de su fecha (2 unidades, 12/11)', (d('2026-11-12', K.T).e || {}).PTF === 2, M['2026-11-12']);
  chk('b. la de Banzer, con el día REAL del cierre (11/11, no el 10/11) y el nombre del Excel de Banzer', (d('2026-11-11', K.T).e || {})[BZ] === 1 && !M['2026-11-10'], M['2026-11-11']);
  chk('c. la reposición aparte (`r`), de PTF', (d('2026-11-13', K.L).r || {}).PTF === 3 && !(d('2026-11-13', K.L).e), d('2026-11-13', K.L));
  chk('d. la venta de tienda aparte (`t`): no sale de PTF', d('2026-11-14', K.L).t === 1 && !(d('2026-11-14', K.L).e), d('2026-11-14', K.L));
  chk('e. la llegada de fábrica (`l`) y la recogida de Moreno (`g`, desde IM)', d('2026-11-13', K.T).l === 5 && (d('2026-11-12', K.L).g || {})[IM] === 2, [d('2026-11-13', K.T), d('2026-11-12', K.L)]);
  chk('f. la salida anotada a mano (`s`, PTF), sin la anulada', (d('2026-11-11', K.T).s || {}).PTF === 1, d('2026-11-11', K.T));
  chk('g. nada de fuera de la ventana (la de octubre) ni lo que todavía no salió', !M['2026-10-20'] && !M['2026-11-20'] && Object.keys(M).sort().join() === '2026-11-11,2026-11-12,2026-11-13,2026-11-14', Object.keys(M));
  chk('h. solo números: ni clientes ni celulares', !/CLIENTE|70099/.test(JSON.stringify(M)));
  r = await ev(() => issAlms());
  chk('i. qué es cada almacén: Banzer de salida («Banzer»), Moreno la fábrica', r[BZ] && r[BZ].rol === 'sale' && r[BZ].corto === 'Banzer' && r[IM] && r[IM].rol === 'fab', r);

  console.log('\n── 2. El botón y la ventana ──');
  const boton = () => ev(() => { var b = document.getElementById('stk-iss-btn'); return b && b.style.display !== 'none' ? b.textContent : ''; });
  await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = true; issBotonPintar(); });
  chk('a. en Playwright sin ISS_PRUEBA no hay botón', (await boton()) === '');
  await ev(() => { window.ISS_PRUEBA = 1; SERVER_VER = '2026-11-15-a'; issBotonPintar(); });
  chk('b. con el servidor de antes, tampoco', (await boton()) === '');
  await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = false; issBotonPintar(); });
  chk('c. un vendedor (sin la contraseña ni rol), tampoco', (await boton()) === '');
  await ev(() => { quienRol('logistica'); issBotonPintar(); });
  chk('d. logística, sí: «🔎 Lo que no cierra»', (await boton()) === '🔎 Lo que no cierra');
  await ev(() => { issAbrir(); });
  await espera(600);
  r = await ev(() => ({ p: __S.posts.filter(b => b.action === 'iaStockSemana'), g: __S.guardados.map(x => x.id), fila: __S.fila, abierta: issAbierto() }));
  const q = (r.p || [])[0] || {};
  chk('e. abrir la ventana lee la semana UNA vez: el lunes 16/11, 14 días (del 02/11 al 16/11), con los movimientos y los almacenes', r.abierta && r.p.length === 1 && q.semana === '2026-11-16' && q.desde === '2026-11-02' && q.hasta === '2026-11-16' &&
    q.mov && Object.keys(q.mov).length === 4 && q.alms && q.alms[BZ] && q.forzar === false, { n: r.p.length, s: q.semana, d: q.desde });
  const fo = JSON.parse((r.fila || {}).observaciones || '{}');
  chk('f. guardó SOLO la fila `__stock_ia__` ({v:1, L:{lunes:{t, semana, res}}})', r.g.length === 1 && r.g[0] === '__stock_ia__' && fo.v === 1 && fo.L['2026-11-16'] && fo.L['2026-11-16'].res.hallazgos.length === 2, r.g);
  r = await ev(() => document.getElementById('iss-body').innerText);
  chk('g. se ve el resumen y cada hallazgo con sus días, qué pasa y qué preguntar', /baja 1 por día sin entregas/.test(r) && /SUEÑA LITE 105x190 · PTF/.test(r) && /baja sin entrega/.test(r) && /mar 10\/11 −1/.test(r) &&
    /→ Preguntar en las tiendas/.test(r) && /TITANIO ICE 160x190 · PTF y Banzer/.test(r) && /traspaso entre depósitos/.test(r) && /Solo mira: no toca el stock/.test(r), r.slice(0, 700));
  r = await ev(() => ({ m: document.querySelectorAll('#iss-body .iss-d i.m').length, p: document.querySelectorAll('#iss-body .iss-d i.p').length, info: document.getElementById('iss-info').textContent }));
  chk('h. los días: −1 en rojo, +4 en verde; arriba, de qué Excel a qué Excel y cuándo lo leyó', r.m === 3 && r.p === 1 && /Excel del 09\/11 al 14\/11 · leído por Claude el 16\/11/.test(r.info), r);
  chk('i. el botón dice cuántas cosas encontró', (await boton()) === '🔎 Lo que no cierra · 2');
  await ev(() => { issCerrar(); issAbrir(); });
  await espera(400);
  chk('j. volver a abrir no lee otra vez', (await ev(() => __S.posts.filter(b => b.action === 'iaStockSemana').length)) === 1);
  r = await ev(() => { ISS.auto = ''; return issQuizas(); });
  chk('k. «una vez por semana, sola»: con la de esta semana ya hecha, no corre', r === false);
  r = await ev(() => issTexto());
  chk('l. «📋 Copiar»: el resumen y cada hallazgo con los días y qué preguntar', /Excel del 09\/11 al 14\/11/.test(r) && /📉 SUEÑA LITE 105x190 · PTF \(baja sin entrega\)\n   10\/11 −1 · 11\/11 −1/.test(r) && /→ Nada que hacer/.test(r), r);
  r = await ev(() => ({ igual: JSON.stringify(STOCK) === __STOCK0, stk: __S.guardados.filter(x => x.id === '__stock__').length }));
  chk('m. NADA tocó el stock (ni `STOCK` ni la fila `__stock__`)', r.igual && r.stk === 0, r);

  console.log('\n── 3. Volver a leer y los «no» ──');
  r = await ev(() => { __S.modo = 'sin_historial'; return issLeer(true).then(function () { return { t: document.getElementById('iss-body').innerText, u: __S.posts[__S.posts.length - 1] }; }); });
  chk('a. «🔄 Volver a leer» va con `forzar`; sin historial lo dice (y la lectura de antes se sigue viendo)', r.u && r.u.forzar === true && /todavía no tiene dos Excel/.test(r.t) && /SUEÑA LITE/.test(r.t), r.t.slice(0, 300));
  r = await ev(() => { __S.modo = 'red'; return issLeer(true).then(function () { return document.getElementById('iss-body').innerText; }); });
  chk('b. sin conexión: «Sin conexión con el servidor»', /Sin conexión con el servidor/.test(r));
  r = await ev(() => { __S.modo = 'ok'; __S.fila = null; STATE = STATE.filter(function (p) { return p.id !== '__stock_ia__'; }); ISS.auto = ''; ISS.err = ''; var a = issQuizas(); var b = issQuizas(); return { a: a, b: b }; });
  chk('c. sin la lectura de esta semana, «sola» corre UNA vez (la segunda no)', r.a === true && r.b === false, r);
  await espera(1800);
  chk('d. …y lee', (await ev(() => __S.posts.filter(b => b.action === 'iaStockSemana').length)) === 4);
  r = await ev(() => { var f = STATE.filter(function (p) { return p.id === '__stock_ia__'; })[0]; return { sis: esFilaSistema(f), cuenta: stockCuenta(f) }; });
  chk('e. `__stock_ia__` es una fila del sistema', r.sis === true && r.cuenta === false, r);

  chk('sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + (FAIL ? '✗' : '✓') + ' ' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
