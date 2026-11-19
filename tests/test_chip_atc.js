/* 🎧 (19/11) El dueño, mirando los filtros de Administración: «¿y acá dónde filtro por ATC?» → «sí, agregalo».
   Botón «🎧 ATC» al lado de «🏪 Reposiciones»: deja solo las ATC (recojos y devoluciones) y parpadea con las que hay que ir a buscar
   a la fábrica antes de su devolución y nadie marcó «✓ Recogido» (`recogerFabPendientes`).
   Se corre:  node tests/test_chip_atc.js */
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
  const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-19T09:10:00-04:00'));   // jueves
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(400);
  await page.evaluate('(' + PREPARAR + ')()');
  await page.evaluate(async () => {
    window.ADM_FICHAS_PRUEBA = 1; UNLOCKED = true;
    var L = function (atc) { var l = _lin('CH1201|TITANIO ICE|160x190', 1, { chk: 'ok' }); if (atc) l.atc = atc; return [l]; };
    var base = { tipo: 'gar', mot: 'Hundimiento', det: 'hundido en el medio', fcom: '2025-06-10', r_col: 1 };
    var A = function (o) { return Object.assign({}, base, o || {}); };
    await _cargar([
      _ped('p1', '2026-11-19', 'AM', L(), { cliente: 'CLIENTE VENTA', ts: _ts('2026-11-17', '09:00:00') }),
      _ped('r1', '2026-11-20', 'AM', L(), { oc: 'RPT 11-001', cliente: 'Mia Plaza', ts: _ts('2026-11-17', '10:00:00') }),
      // por recoger: el recojo es mañana
      _ped('a1', '2026-11-20', 'PM', L(A()), { oc: 'ATC 11-001', cliente: 'CLIENTE ATC RECOJO', ts: _ts('2026-11-18', '10:00:00') }),
      // devolución el sábado 21: desde el jueves 19 (2 días hábiles antes) hay que ir a buscarla a la fábrica y nadie la marcó
      _ped('a2', '2026-11-21', 'AM', L(A({ rec: '2026-11-10', rturno: 'AM', pdev: '2026-11-21', pturno: 'AM' })),
           { oc: 'ATC 11-002', cliente: 'CLIENTE ATC SIN RECOGER', ts: _ts('2026-11-08', '10:00:00') }),
      // devolución el sábado 21, ya recogida de fábrica: no avisa
      _ped('a3', '2026-11-21', 'AM', L(A({ rec: '2026-11-11', rturno: 'AM', pdev: '2026-11-21', pturno: 'AM', rf: '2026-11-18' })),
           { oc: 'ATC 11-003', cliente: 'CLIENTE ATC RECOGIDA', ts: _ts('2026-11-09', '10:00:00') })
    ], _stock(function (s) { s.c.u[_K] = 10; }));
    document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
    showView('admin'); renderAdmin();
  });
  await page.waitForTimeout(150);
  const estado = () => page.evaluate(() => {
    var T = function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); };
    var ch = [].slice.call(document.querySelectorAll('#adm-chips .qchip'));
    var atc = document.querySelector('#adm-chips .qchip[data-k="atc"]');
    var F = [].slice.call(document.querySelectorAll('#adm-fichas .af-f')).map(T).filter(function (t) { return /CLIENTE |Mia Plaza/.test(t); });
    return { ks: ch.map(function (b) { return b.getAttribute('data-k'); }), txt: atc ? T(atc) : '', cls: atc ? atc.className : '', tit: atc ? atc.title : '',
      q: QUICK_FILTER, F: F };
  });

  let r = await estado();
  chk('1a · hay un botón «🎧 ATC»', /🎧 ATC/.test(r.txt), r.txt);
  chk('1b · va justo al lado de «Reposiciones»', r.ks.indexOf('atc') === r.ks.indexOf('rpt') + 1, r.ks);
  chk('1c · cuenta las 3 ATC (no la venta ni la reposición)', /🎧 ATC 3\b/.test(r.txt), r.txt);
  chk('1d · parpadea en rojo: 1 para recoger de fábrica', /qchip-alerta/.test(r.cls) && /🔴 1 recoger de fábrica/.test(r.txt), r);
  chk('1e · el globito explica qué falta y dónde se marca', /buscar a la fábrica/.test(r.tit) && /Recogido/.test(r.tit), r.tit);

  await page.evaluate(() => setQuick('atc')); r = await estado();
  chk('2a · tocarlo deja solo las ATC', r.q === 'atc' && r.F.length === 3 && r.F.every(function (t) { return /CLIENTE ATC/.test(t); }), r.F);
  chk('2b · la venta y la reposición no aparecen', !r.F.some(function (t) { return /CLIENTE VENTA|Mia Plaza/.test(t); }), r.F);

  await page.evaluate(() => { marcarRecogidoFab('a2'); renderAdmin(); }); await page.waitForTimeout(100); r = await estado();
  chk('3a · al marcar «✓ Recogido» de fábrica deja de parpadear', !/qchip-alerta/.test(r.cls) && !/🔴/.test(r.txt), r);
  chk('3b · sin pendientes, el globito dice qué filtra', /Solo las ATC/.test(r.tit), r.tit);

  chk('sin errores en la página', !errs.length, errs);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
