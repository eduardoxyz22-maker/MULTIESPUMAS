/* 🧠 MEJORA 356 (página) — «EL PORQUÉ DE LA SEMANA, ESCRITO POR CLAUDE», en Proyección (con la contraseña).
   El servidor (2026-11-16-a) arma los números, le pregunta a Claude y guarda cada lectura en la hoja «IA semanal» (tests/test_porque_semana.js).
   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera (Playwright), sin la contraseña o con un servidor anterior al 2026-11-16-a: nada (ni la tarjeta ni el botón de la barra).
   2. Lee lo guardado UNA vez (`iaSemana`; diez minutos de caché) y, si la de la semana pasada no está, ofrece «🧠 Armarla ahora».
   3. «Armarla ahora» (`iaPorque`): la lectura con el resumen, «Por qué», «Para mirar», el código de cada número (y el número al pasar el mouse),
      «📊 Los números», quién la armó y cuándo; «🔄 Armarla de nuevo» pide confirmar y manda `otra`.
   4. Las anteriores plegadas; la del mes (día 1) a la vista la primera semana; la armada con reglas lo dice; «ocupado» y los errores en palabras.
   5. El botón de la barra lleva a la tarjeta; sin errores de la página; la tarjeta es clara también con el tema de Black Friday.
   Datos INVENTADOS. Reloj clavado: lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_porque_semana_pagina.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR() {
  CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = '';
  try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer = function () {};
  var H = [{ id: 'E1', t: 'Equipo del 09 al 15/11: Bs 30.000 en 6 ventas · la anterior Bs 10.000 · +200 % en Bs (+Bs 20.000)' },
           { id: 'T1', t: 'Tienda Central: Bs 15.000 en 3 ventas · la anterior Bs 5.000 en 1 venta · +200 %' },
           { id: 'B1', t: 'Black Friday (del 13/11 al 30/11): 3 días de la campaña, con Bs 12.000 en 2 ventas' },
           { id: 'M1', t: 'Mayoristas (aparte del equipo): Bs 8.000 en 1 OC · la anterior Bs 20.000 · −60 %' }];
  window.ITEM = function (k, o) {
    var d = k.slice(1);
    return Object.assign({ v: 1, k: k, tipo: 'porque', per: k.charAt(0) === 'm' ? 'mes' : 'semana', d: d, h: d, tit: 'La semana del 09 al 15/11', cmp: 'la del 02 al 08/11',
      resumen: { txt: 'Se vendieron Bs 30.000 en 6 ventas: +200 % contra la anterior.', de: ['E1'] },
      porque: [{ txt: 'Central pasó de Bs 5.000 a Bs 15.000.', de: ['T1'] }, { txt: 'Black Friday arrancó con Bs 12.000.', de: ['B1'] }],
      mirar: [{ txt: 'Los mayoristas bajaron a Bs 8.000.', de: ['M1'] }],
      H: H, via: 'claude', motivo: '', hecho: Date.now(), hTxt: '16/11 08:05' }, o || {});
  };
  window._srv = { porque: [], equipo: [], llamadas: [], resp: null };
  apiPost = function (b) {
    _srv.llamadas.push(JSON.parse(JSON.stringify(b)));
    SERVER_VER = window._ver || '2026-11-16-a';
    if (_srv.resp) { var r = _srv.resp(b); if (r) return Promise.resolve(r); }
    if (b.action === 'iaSemana') return Promise.resolve({ ok: true, items: { porque: _srv.porque.slice(), equipo: _srv.equipo.slice() }, ia: '', version: SERVER_VER });
    if (b.action === 'iaPorque') { var it = ITEM('s2026-11-09'); _srv.porque = [it].concat(_srv.porque.filter(function (x) { return x.k !== it.k; })); return Promise.resolve({ ok: true, item: it, version: SERVER_VER }); }
    return Promise.resolve({ ok: true, version: SERVER_VER });
  };
  apiList = function () { return Promise.resolve({ ok: true, pedidos: [] }); };
  window._abrir = function () { UNLOCKED = true; showView('conta'); try { segSet('cta-tab', 'proy'); } catch (e) {} setContaTab('proy'); };
  window._txt = function (sel) { var e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._n = function (a) { return _srv.llamadas.filter(function (x) { return x.action === a; }).length; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(e.message));
  let dialogos = [];
  page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); } catch (e) {} });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(350);
  await page.evaluate(PREPARAR);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error: String((e && e.message) || e).slice(0, 400) }; } };
  const esperar = (ms) => page.waitForTimeout(ms);

  const hay = await ev(() => typeof pqsPintar === 'function' && typeof pqsArmar === 'function');
  chk('0 · la página tiene la 356 (`pqsPintar`, `pqsArmar`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  // ===== 1. cuándo NO hay nada =====
  let r = await ev(async () => { window.PORQUE_PRUEBA = 0; window.MANO_PRUEBA = 0; SERVER_VER = '2026-11-16-a'; _abrir(); await new Promise(f => setTimeout(f, 80));
    return { box: _txt('#pry-porque'), btn: document.getElementById('pry-porque-w').hidden, n: _n('iaSemana') }; });
  chk('1a · sin `PORQUE_PRUEBA` (Playwright): ni la tarjeta ni el botón, y no lee nada', r.box === '' && r.btn === true && r.n === 0, r);
  r = await ev(async () => { window.PORQUE_PRUEBA = 1; window._ver = '2026-11-15-a'; SERVER_VER = '2026-11-15-a'; _abrir(); await new Promise(f => setTimeout(f, 80));
    return { box: _txt('#pry-porque'), btn: document.getElementById('pry-porque-w').hidden, n: _n('iaSemana') }; });
  chk('1b · con un servidor anterior al 2026-11-16-a: nada', r.box === '' && r.btn === true && r.n === 0, r);
  r = await ev(async () => { window._ver = ''; SERVER_VER = '2026-11-16-a'; UNLOCKED = false; pqsPintar(); return { box: _txt('#pry-porque'), btn: document.getElementById('pry-porque-w').hidden }; });
  chk('1c · sin la contraseña: nada', r.box === '' && r.btn === true, r);

  // ===== 2. lee lo guardado y ofrece armarla =====
  r = await ev(async () => { _abrir(); await new Promise(f => setTimeout(f, 150));
    return { box: _txt('#pry-porque'), btn: document.getElementById('pry-porque-w').hidden, n: _n('iaSemana'), armar: !!document.getElementById('pqs-armar') }; });
  chk('2a · lee lo guardado (`iaSemana`) y, sin la de la semana pasada, lo dice y ofrece «🧠 Armarla ahora»', r.n === 1 && r.btn === false && r.armar &&
      /Todavía no está la de la semana del 09 al 15\/11: sale los lunes a las 08:00/.test(r.box), r);
  r = await ev(async () => { renderProyeccion(); renderProyeccion(); await new Promise(f => setTimeout(f, 80)); return _n('iaSemana'); });
  chk('2b · repintar Proyección no vuelve a leer (diez minutos de caché)', r === 1, r);

  // ===== 3. armarla =====
  r = await ev(async () => { document.getElementById('pqs-armar').click(); await new Promise(f => setTimeout(f, 150));
    var b = document.getElementById('pry-porque-box'), chips = [].map.call(b.querySelectorAll('.pqs-de span'), function (s) { return s.textContent + '=' + s.title; });
    return { n: _n('iaPorque'), otra: (_srv.llamadas.filter(function (x) { return x.action === 'iaPorque'; })[0] || {}).otra, txt: _txt('#pry-porque'), chips: chips,
             nums: b.querySelectorAll('.pqs-nums li').length, otraBtn: !!document.getElementById('pqs-otra') }; });
  chk('3a · «Armarla ahora» llama a `iaPorque` sin «otra»', r.n === 1 && !r.otra, r);
  chk('3b · el resumen, «Por qué» y «Para mirar», con quién la armó y cuándo', /La semana del 09 al 15\/11 · contra la del 02 al 08\/11 · lo escribió Claude el 16\/11 08:05/.test(r.txt) &&
      /🛒 Se vendieron Bs 30\.000 en 6 ventas/.test(r.txt) && /❓ Por qué Central pasó de Bs 5\.000 a Bs 15\.000\./i.test(r.txt) && /👀 Para mirar Los mayoristas bajaron a Bs 8\.000\./i.test(r.txt), r.txt.slice(0, 500));
  chk('3c · cada frase con el código de su número, y el número al pasar el mouse', r.chips.length === 4 && r.chips[1] === 'T1=Tienda Central: Bs 15.000 en 3 ventas · la anterior Bs 5.000 en 1 venta · +200 %', r.chips);
  chk('3d · «📊 Los números» plegado, con los cuatro', r.nums === 4 && /📊 Los números de donde sale cada frase \(4\)/.test(r.txt), r.nums);
  dialogos = [];
  r = await ev(async () => { document.getElementById('pqs-otra').click(); await new Promise(f => setTimeout(f, 150));
    return { otra: (_srv.llamadas.filter(function (x) { return x.action === 'iaPorque'; })[1] || {}).otra }; });
  chk('3e · «🔄 Armarla de nuevo» pregunta (cuesta) y manda «otra»', r.otra === 1 && dialogos.length === 1 && /cuesta unos centavos/.test(dialogos[0]), [r, dialogos]);

  // ===== 4. las anteriores, el mes, las reglas, los errores =====
  r = await ev(async () => {
    _srv.porque = [ITEM('s2026-11-09'), ITEM('s2026-11-02', { tit: 'La semana del 02 al 08/11', cmp: 'la del 26/10 al 01/11', hTxt: '09/11 08:04', hecho: Date.now() - 7 * 864e5,
                     resumen: { txt: 'Se vendieron Bs 10.000.', de: ['E1'] } }),
                   ITEM('m2026-10', { tit: 'Octubre 2026 entero', cmp: 'septiembre entero', hTxt: '01/11 10:06', hecho: Date.now() - 15 * 864e5 })];
    await pqsCargar(true);
    return { txt: document.getElementById('pry-porque').textContent.replace(/\s+/g, ' '), ant: document.querySelector('#pry-porque-box .pqs-ant > summary').textContent, abierto: document.querySelector('#pry-porque-box .pqs-ant').open };
  });
  chk('4a · las anteriores plegadas (la semana del 02 y octubre, que ya no es de esta semana)', /^Las anteriores \(2\)$/.test(r.ant) && r.abierto === false && /La semana del 02 al 08\/11 · Se vendieron Bs 10\.000\./.test(r.txt), r.ant);
  r = await ev(async () => {
    _srv.porque = [ITEM('s2026-11-09'), ITEM('m2026-10', { tit: 'Octubre 2026 entero', cmp: 'septiembre entero', hTxt: '01/11 10:06', hecho: Date.now() - 2 * 864e5 })];
    await pqsCargar(true); return _txt('#pry-porque'); });
  chk('4b · la del mes (el día 1) a la vista la primera semana', /📅 Octubre 2026 entero · contra septiembre entero · lo escribió Claude el 01\/11 10:06/.test(r), r.slice(0, 300));
  r = await ev(async () => { _srv.porque = [ITEM('s2026-11-09', { via: 'reglas', motivo: 'Claude está apagado (IA_ACTIVA)' })]; await pqsCargar(true); return _txt('#pry-porque'); });
  chk('4c · la armada con reglas lo dice', /armado con reglas, sin Claude \(Claude está apagado \(IA_ACTIVA\)\) el 16\/11 08:05/.test(r), r.slice(0, 200));
  r = await ev(async () => { _srv.porque = []; await pqsCargar(true); _srv.resp = function (b) { return b.action === 'iaPorque' ? { ok: false, error: 'ocupado' } : null; };
    document.getElementById('pqs-armar').click(); await new Promise(f => setTimeout(f, 150)); var t = _txt('#pry-porque');
    _srv.resp = function (b) { return b.action === 'iaPorque' ? { ok: false, error: 'sin_ventas' } : null; }; document.getElementById('pqs-armar').click(); await new Promise(f => setTimeout(f, 150));
    var t2 = _txt('#pry-porque'); _srv.resp = null; return [t, t2]; });
  chk('4d · «ocupado» y «sin ventas», en palabras', /Ya la está armando \(otro aparato o el WhatsApp de las 08:00\)/.test(r[0]) && /Esa semana no tiene ventas del equipo cargadas/.test(r[1]), r);
  r = await ev(async () => { PQS.items = null; PQS.msg = ''; _srv.resp = function (b) { return b.action === 'iaSemana' ? { ok: false, error: 'clave' } : null; }; await pqsCargar(true); var t = _txt('#pry-porque'); _srv.resp = null; return t; });
  chk('4e · si no puede leer lo guardado, lo dice y ofrece probar de nuevo', /No se pudo leer lo guardado \(clave\)/.test(r) && /Probar de nuevo/.test(r), r);

  // ===== 5. la barra, el tema, sin errores =====
  r = await ev(async () => { _srv.porque = [ITEM('s2026-11-09')]; await pqsCargar(true); window.scrollTo(0, 0); document.getElementById('pry-porque-btn').click(); await new Promise(f => setTimeout(f, 700));
    var b = document.getElementById('pry-porque-box').getBoundingClientRect(); return { top: Math.round(b.top), alto: innerHeight }; });
  chk('5a · el botón de la barra lleva a la tarjeta', r.top >= 0 && r.top < r.alto - 100, r);
  r = await ev(() => { document.documentElement.className += ' tema-black-friday'; var b = document.getElementById('pry-porque-box'), cs = getComputedStyle(b), t = getComputedStyle(b.querySelector('.pqs-f'));
    return { fondo: cs.backgroundColor, letra: t.color }; });
  chk('5b · con el tema de Black Friday la tarjeta sigue clara, con letra oscura', r.fondo === 'rgb(255, 255, 255)' && !/rgb\(2[0-9]{2}, 2[0-9]{2}, 2[0-9]{2}\)/.test(r.letra), r);
  r = await ev(() => { var txt = document.getElementById('pry-porque-box').innerHTML; return /CLIENTE|\b7\d{7}\b/.test(txt); });
  chk('5c · ningún cliente ni celular en la tarjeta', r === false);
  chk('6 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
