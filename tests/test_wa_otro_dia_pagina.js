/* 📅 MEJORA 217, LA PÁGINA: LOS CLIENTES QUE ELIGIERON OTRO DÍA POR EL BOT (servidor 2026-11-14-a, `waRespuestas` → `rd`).
   El dueño: «Lo que elige le llega a logística con un botón «Mover»: logística confirma con un toque y el bot le avisa al cliente. Nada se
   mueve solo.» Lo que cuida, con el servidor de mentira:
     1. Con un servidor anterior no se toma ni se pide nada; con el 14-a, `rd` llega con `waRespuestas`.
     2. Se ve en los tres lugares: la pestaña Bot (con el número rojo), «📋 Para hacer» de Administración y la ficha del pedido.
     3. «📅 Mover» llama a `reproAplicar` con el día y el turno que eligió (sin avisos: sin `forzar`, un toque) y después `rdMarcar` «hecho»;
        con el turno lleno pregunta y va con `forzar`; con el `reproAplicar` de verdad el pedido queda en ese día (persistPedido).
     4. «No, dejarlo» manda `rdMarcar` «no» y no mueve nada.
     5. Uno que ya no hace falta (lo movieron, se entregó) se ve «viejo», solo con «Quitar».
     6. En Playwright sin RD_PRUEBA no se muestra nada.
   Se corre:  node tests/test_wa_otro_dia_pagina.js   (desde la raíz; con HTTPS_PROXY=http://127.0.0.1:9 como toda la batería) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const ARCH = 'file://' + (process.env.PEDIDOS || path.resolve('pedidos.html'));
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/La_Paz' });
  const errores = [], dialogos = [];
  page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));   // lunes
  await page.route(/^https?:/, r => r.abort());
  await page.goto(ARCH, { waitUntil: 'load' }); await page.waitForTimeout(700);
  const preparar = (extra) => page.evaluate((extra) => {
    CARGA_GEN++; CARGA_ESTADO = 'ok';
    STATE = [{ id: 'c1', fecha: '2026-11-17', turno: 'AM', oc: '11-201', vendedor: 'Carola Chavez', cliente: 'JUAN PEREZ', celular: '70000031', zona: 'Norte',
               direccion: 'Calle 1', productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1 }], ts: 1, rev: 2 },
             { id: 'c2', fecha: '2026-11-17', turno: 'PM', oc: '11-202', vendedor: 'Maria Flores', cliente: 'ANA ROJAS', celular: '70000032', zona: 'Sur',
               direccion: 'Calle 2', productos: [{ desc: 'COLCHON SOFT', medida: '100x190', cant: 1 }], ts: 2, rev: 2 }];
    (extra && extra.relleno || []).forEach(function (r, i) { STATE.push({ id: 'r' + i, fecha: r[0], turno: r[1], oc: '11-3' + i, vendedor: 'Maria Flores', cliente: 'OTRO ' + i, productos: [{ desc: 'X', cant: 1 }], ts: 3 }); });
    window.__ll = []; window.__repro = []; window.RD_PRUEBA = true; RD_HECHOS = {};
    window.__RD = [{ k: 'c1@a', id: 'c1', oc: '11-201', cli: 'JUAN PEREZ', f: '2026-11-18', t: 'AM', de: '2026-11-17|AM', ts: Date.parse('2026-11-16T09:40:00-04:00'), num: '59170000031' }].concat(extra && extra.rd || []);
    apiPost = function (b) { __ll.push(JSON.parse(JSON.stringify(b)));
      if (b.action === 'waRespuestas') return Promise.resolve({ ok: true, version: SERVER_VER, resp: [], rd: JSON.parse(JSON.stringify(__RD)) });
      if (b.action === 'rdMarcar') { __RD = __RD.filter(function (x) { return x.k !== b.k; }); return Promise.resolve({ ok: true, k: b.k, est: b.est }); }
      return Promise.resolve({ ok: true }); };
    UNLOCKED = true; WA_BOT = true; SERVER_VER = (extra && extra.ver) || '2026-11-14-a'; WA_RESP_T = 0;
    return waRespTraer();
  }, extra || null);
  const espera = (ms) => page.waitForTimeout(ms || 120);

  // 1. Servidor anterior / nuevo
  await preparar({ ver: '2026-11-13-b' }); await espera();
  let r = await page.evaluate(() => ({ n: RD_PEDIDOS.length, pidio: __ll.filter(x => x.action === 'waRespuestas').length }));
  chk('1a con el servidor 2026-11-13-b: `rd` no se toma (aunque venga en la respuesta)', r.n === 0 && r.pidio === 1, r);
  await preparar(); await espera();
  r = await page.evaluate(() => ({ n: RD_PEDIDOS.length, k: (RD_PEDIDOS[0] || {}).k, servidor: RD_SERVIDOR }));
  chk('1b con el 2026-11-14-a (RD_SERVIDOR): llega el pedido de cambio de JUAN PEREZ', r.n === 1 && r.k === 'c1@a' && r.servidor === '2026-11-14-a', r);

  // 2. Los tres lugares
  r = await page.evaluate(() => {
    showView('bot'); waRespPintar();
    var el = document.getElementById('rd-bot'), tb = document.querySelector('#tab-bot .nx-tb');
    return { txt: el.innerText, mover: el.querySelectorAll('.rd-mover').length, no: el.querySelectorAll('.rd-no').length, vacio: document.getElementById('bot-vacio').hidden, badge: tb ? tb.textContent : '' };
  });
  chk('2a la pestaña Bot: «JUAN PEREZ pidió pasar su entrega al miércoles 18/11 · 🌅 mañana», con «📅 Mover» y «No, dejarlo»', /JUAN PEREZ pidió pasar su entrega al miércoles 18\/11 · 🌅 mañana/.test(r.txt) && r.mover === 1 && r.no === 1, r);
  chk('2b …dice cómo estaba, cuándo lo pidió y el lugar en ese turno («quedan 12 de 12»)', /ahora: martes 17\/11 · 🌅 mañana/.test(r.txt) && /lo pidió por el bot el 16\/11 09:40/.test(r.txt) && /quedan 12 de 12/.test(r.txt), r.txt);
  chk('2c «No hay respuestas…» escondido y el número rojo de la pestaña cuenta 1', r.vacio === true && r.badge === '1', r);
  r = await page.evaluate(() => { var o = admHacerDatos().filter(function (x) { return x.k === 'rd'; })[0]; return o || null; });
  chk('2d «📋 Para hacer» de Administración: rojo, «Un cliente pidió otro día por el bot», «JUAN PEREZ → miércoles 18/11 mañana», abre la lista', r && r.sev === 'r' && r.n === 1 && /Un cliente pidió otro día por el bot/.test(r.t) &&
      /JUAN PEREZ → miércoles 18\/11 mañana/.test(r.s) && r.fn === 'rdAbrir()', r);
  r = await page.evaluate(() => { rdAbrir(); var b = document.getElementById('modal-box'); var o = { txt: b.innerText, m: b.querySelectorAll('.rd-mover').length }; closeModal(); return o; });
  chk('2e «📅 Ver y mover» abre la lista con el mismo «Mover»', r.m === 1 && /pidió pasar su entrega al miércoles 18\/11/.test(r.txt), r);
  r = await page.evaluate(() => { showPedidoModal('c1'); var b = document.getElementById('modal-box'), f = b.querySelector('.rd-ficha');
    var o = { hay: !!f, txt: f ? f.innerText : '', mover: f ? f.querySelectorAll('.rd-mover').length : 0 }; closeModal();
    showPedidoModal('c2'); o.otro = !!document.querySelector('#modal-box .rd-ficha'); closeModal(); return o; });
  chk('2f la ficha del pedido: «📅 El cliente pidió pasar su entrega al miércoles 18/11 · 🌅 mañana» con «Mover»; la de otro pedido, nada', r.hay && /El cliente pidió pasar su entrega al miércoles 18\/11 · 🌅 mañana/.test(r.txt) && r.mover === 1 && !r.otro, r);

  // 3. Mover (el espía de reproAplicar)
  r = await page.evaluate(async () => {
    var real = reproAplicar;
    reproAplicar = function (p, f, t, forzar) { __repro.push({ id: p.id, f: f, t: t, forzar: !!forzar }); return Promise.resolve({ ok: true }); };
    showView('bot'); waRespPintar();
    document.querySelector('#rd-bot .rd-mover').click();
    await new Promise(function (ok) { setTimeout(ok, 120); });
    reproAplicar = real;
    return { repro: __repro, marca: __ll.filter(function (x) { return x.action === 'rdMarcar'; }), queda: document.getElementById('rd-bot').innerText, pend: rdPendientes() };
  });
  chk('3a «📅 Mover»: reproAplicar(JUAN PEREZ, «2026-11-18», «AM») sin forzar (sin avisos: un toque, sin preguntar)', r.repro.length === 1 && r.repro[0].id === 'c1' && r.repro[0].f === '2026-11-18' && r.repro[0].t === 'AM' && r.repro[0].forzar === false, r.repro);
  chk('3b …y después rdMarcar «hecho» con quién; la tarjeta se va y el número también', r.marca.length === 1 && r.marca[0].k === 'c1@a' && r.marca[0].est === 'hecho' && !!r.marca[0].quien && r.queda.trim() === '' && r.pend === 0, r);
  chk('3c sin preguntar nada (no había avisos)', dialogos.length === 0, dialogos);

  await preparar({ relleno: Array.from({ length: 12 }, () => ['2026-11-18', 'AM']) }); await espera();
  r = await page.evaluate(async () => {
    var real = reproAplicar;
    reproAplicar = function (p, f, t, forzar) { __repro.push({ id: p.id, f: f, t: t, forzar: !!forzar }); return Promise.resolve({ ok: true }); };
    showView('bot'); waRespPintar();
    var av = document.querySelector('#rd-bot .rd-av'); var avTxt = av ? av.innerText : '';
    document.querySelector('#rd-bot .rd-mover').click();
    await new Promise(function (ok) { setTimeout(ok, 120); });
    reproAplicar = real;
    return { av: avTxt, repro: __repro };
  });
  chk('3d el turno se llenó (12 de 12): la tarjeta lo dice, «Mover» pregunta y va con `forzar`', /ya está lleno \(12\/12\)/.test(r.av) && r.repro.length === 1 && r.repro[0].forzar === true && dialogos.some(d => /ya está lleno/.test(d)), { r, dialogos });

  await preparar(); await espera();
  r = await page.evaluate(async () => {
    var guardados = [], realP = persistPedido;
    persistPedido = function (p, o) { guardados.push({ id: p.id, fecha: p.fecha, turno: p.turno, nro: p.nroDia, forzar: !!(o && o.forzar) }); return Promise.resolve({ ok: true }); };
    showPedidoModal('c1');
    document.querySelector('#modal-box .rd-ficha .rd-mover').click();
    await new Promise(function (ok) { setTimeout(ok, 150); });
    persistPedido = realP;
    var p = findById('c1'), b = document.getElementById('modal-box');
    var o = { guardados: guardados, fecha: p.fecha, turno: p.turno, ficha: b ? b.innerText : '', rd: !!(b && b.querySelector('.rd-ficha')), marca: __ll.filter(function (x) { return x.action === 'rdMarcar'; }) };
    closeModal(); return o;
  });
  chk('3e desde la ficha, con el reproAplicar de verdad: el pedido queda el miércoles 18 a la mañana y se guarda por persistPedido', r.guardados.length === 1 && r.guardados[0].fecha === '2026-11-18' && r.guardados[0].turno === 'AM' && r.guardados[0].nro > 0 && r.fecha === '2026-11-18', r.guardados);
  chk('3f …la ficha se vuelve a abrir con el día nuevo y sin el recuadro, y queda marcado «hecho»', !r.rd && /miércoles 18\/11/.test(r.ficha) && r.marca.length === 1 && r.marca[0].est === 'hecho', { rd: r.rd, m: r.marca });

  // 4. No, dejarlo
  await preparar(); await espera();
  r = await page.evaluate(async () => {
    var real = reproAplicar;
    reproAplicar = function (p, f, t, forzar) { __repro.push({ id: p.id }); return Promise.resolve({ ok: true }); };
    showView('bot'); waRespPintar();
    document.querySelector('#rd-bot .rd-no').click();
    await new Promise(function (ok) { setTimeout(ok, 120); });
    reproAplicar = real;
    return { repro: __repro.length, marca: __ll.filter(function (x) { return x.action === 'rdMarcar'; }), queda: document.getElementById('rd-bot').innerText, fecha: findById('c1').fecha };
  });
  chk('4a «No, dejarlo»: rdMarcar «no», no mueve nada (ni reproAplicar) y sale de la lista', r.repro === 0 && r.marca.length === 1 && r.marca[0].est === 'no' && r.fecha === '2026-11-17' && r.queda.trim() === '', r);

  // 5. Ya no hace falta
  await preparar({ rd: [{ k: 'c2@b', id: 'c2', oc: '11-202', cli: 'ANA ROJAS', f: '2026-11-19', t: 'PM', de: '2026-11-17|PM', ts: 1, num: '59170000032' }] }); await espera();
  r = await page.evaluate(async () => {
    findById('c1').fecha = '2026-11-20';            // lo movieron a mano después de que lo pidió
    findById('c2').entregado = true;
    showView('bot'); waRespPintar();
    var el = document.getElementById('rd-bot'), o = { txt: el.innerText, mover: el.querySelectorAll('.rd-mover').length, quitar: el.querySelectorAll('.rd-quitar').length,
      hacer: admHacerDatos().filter(function (x) { return x.k === 'rd'; })[0], pend: rdPendientes() };
    el.querySelector('.rd-quitar').click();
    await new Promise(function (ok) { setTimeout(ok, 120); });
    o.marca = __ll.filter(function (x) { return x.action === 'rdMarcar'; });
    return o;
  });
  chk('5a lo movieron a otro día / ya se entregó: «Ya no hace falta moverlo…», solo «Quitar»', r.mover === 0 && r.quitar === 2 && /lo movieron al viernes 20\/11/.test(r.txt) && /ya figura entregado/.test(r.txt), r.txt);
  chk('5b «Para hacer» lo pone en azul (no cuenta como urgente) y la pestaña no lo cuenta', r.hacer && r.hacer.sev === 'i' && r.pend === 0, r.hacer);
  chk('5c «Quitar» manda rdMarcar «quitar»', r.marca.length === 1 && r.marca[0].est === 'quitar', r.marca);

  // 6. Playwright sin RD_PRUEBA
  await preparar(); await espera();
  r = await page.evaluate(() => { window.RD_PRUEBA = false; showView('bot'); waRespPintar(); showPedidoModal('c1'); var f = !!document.querySelector('#modal-box .rd-ficha'); closeModal();
    return { bot: document.getElementById('rd-bot').innerText.trim(), ficha: f, hacer: admHacerDatos().some(function (x) { return x.k === 'rd'; }) }; });
  chk('6a sin RD_PRUEBA (Playwright) no se muestra en ningún lado', r.bot === '' && !r.ficha && !r.hacer, r);
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
