/* 📅 (31/10, dueño: «administración entra por defecto en "todas" en vez de hoy día y eso ralentiza un poco y satura todo… ¿no habíamos
   acordado que ingresa en "hoy"? las fichas?») Administración abre en «📅 Hoy». Buscar mira todo mientras nadie eligió otro chip, y al
   borrar vuelve a Hoy. Hoy sin pedidos lo dice y ofrece el próximo día y todos.
   Se corre:  node tests/test_adm_hoy.js */
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
  async function abrir(fecha, hoyPrueba) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (hoyPrueba) await ctx.addInitScript(() => { window.ADM_HOY_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date(fecha));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(400);
    await page.evaluate('(' + PREPARAR + ')()');
    await page.evaluate(async () => {
      window.ADM_FICHAS_PRUEBA = 1; UNLOCKED = true;
      var L = function () { return [_lin('CH1201|TITANIO ICE|160x190', 1, { chk: 'ok' })]; };
      await _cargar([
        _ped('h1', '2026-10-22', 'AM', L(), { cliente: 'CLIENTE HOY UNO', ts: _ts('2026-10-20', '09:00:00') }),
        _ped('h2', '2026-10-22', 'PM', L(), { cliente: 'CLIENTE HOY DOS', ts: _ts('2026-10-20', '10:00:00') }),
        _ped('m1', '2026-10-23', 'AM', L(), { cliente: 'CLIENTE VIERNES', ts: _ts('2026-10-20', '11:00:00') }),
        _ped('l1', '2026-10-26', 'AM', L(), { cliente: 'CLIENTE LUNES', ts: _ts('2026-10-20', '11:30:00') }),
        _ped('v1', '2026-10-15', 'AM', L(), { cliente: 'CLIENTE VIEJO', entregado: true, ts: _ts('2026-10-13', '12:00:00') })
      ], _stock(function (s) { s.c.u[_K] = 10; }));
      document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
      showView('admin'); renderAdmin();
    });
    await page.waitForTimeout(150);
    return { ctx, page };
  }
  const estado = page => page.evaluate(() => {
    var T = function (e) { return e.textContent.replace(/\s+/g, ' ').trim(); };
    var F = [].slice.call(document.querySelectorAll('#adm-fichas .af-f')).map(T).filter(function (t) { return /CLIENTE /.test(t); });
    var on = document.querySelector('#adm-chips .qchip.active');
    var vac = document.getElementById('pedidos-empty');
    return { q: QUICK_FILTER, def: ADM_HOY_DEF, n: F.length, hoy1: F.some(function (t) { return t.indexOf('HOY UNO') >= 0; }), viejo: F.some(function (t) { return t.indexOf('VIEJO') >= 0; }),
      lunes: F.some(function (t) { return t.indexOf('LUNES') >= 0; }), chip: on ? T(on) : '', vacio: vac && vac.style.display !== 'none' ? T(vac) : '' };
  });
  const buscar = (page, t) => page.evaluate(t => { var b = document.getElementById('adm-search'); b.value = t; b.dispatchEvent(new Event('input', { bubbles: true })); }, t);

  // ---------- 1. abre en Hoy ----------
  let { ctx, page } = await abrir('2026-10-22T09:10:00-04:00', true);   // jueves
  let r = await estado(page);
  chk('1a · Administración abre en «📅 Hoy»: solo los dos de hoy', r.q === 'hoy' && r.n === 2 && r.hoy1 && !r.viejo, r);
  chk('1b · el chip encendido es «Hoy»', /Hoy/.test(r.chip), r.chip);

  // ---------- 2. buscar mira todo y al borrar vuelve a Hoy ----------
  await buscar(page, 'viejo'); r = await estado(page);
  chk('2a · buscar «viejo» encuentra el pedido del 15/10 (busca en todos, no solo hoy)', r.q === '' && r.viejo && r.n === 1, r);
  await buscar(page, ''); r = await estado(page);
  chk('2b · al borrar la búsqueda vuelve a «Hoy»', r.q === 'hoy' && r.n === 2, r);

  // ---------- 3. si se elige otro chip, buscar ya no lo cambia ----------
  await page.evaluate(() => setQuick('manana')); r = await estado(page);
  chk('3a · elegir «Mañana» muestra el viernes y deja de ser lo de entrada', r.q === 'manana' && !r.def && r.n === 1, r);
  await buscar(page, 'cliente'); r = await estado(page);
  chk('3b · con un chip elegido, buscar filtra dentro de ese chip (no salta a Todos)', r.q === 'manana', r);
  await buscar(page, '');
  await page.evaluate(() => setQuick('manana')); r = await estado(page);
  chk('3c · tocar el chip encendido otra vez va a «Todos» (como siempre; lo entregado de días pasados va plegado)', r.q === '' && /Todos 5/.test(r.chip) && r.n === 4, r);
  await ctx.close();

  // ---------- 4. hoy sin pedidos ----------
  ({ ctx, page } = await abrir('2026-10-25T10:00:00-04:00', true));   // domingo
  r = await estado(page);
  chk('4a · el domingo «Hoy» está vacío y lo dice, con el próximo día y «Ver todos»', r.q === 'hoy' && r.n === 0 && /Hoy no hay entregas/.test(r.vacio) && /Mañana|Lunes/.test(r.vacio) && /Ver todos/.test(r.vacio), r);
  await page.evaluate(() => { var b = [].slice.call(document.querySelectorAll('#pedidos-empty button'))[0]; b.click(); });
  r = await estado(page);
  chk('4b · «Ver el próximo día» lleva al lunes', r.q === 'manana' && r.lunes && r.n === 1, r);
  await page.evaluate(() => { setQuick(''); setQuick('cobrar'); QUICK_FILTER = 'especial'; renderAdmin(); });
  r = await estado(page);
  chk('4c · con otro filtro vacío el cartel sigue siendo el de siempre', r.n === 0 && /No hay pedidos para este filtro/.test(r.vacio) && !/Hoy no hay/.test(r.vacio), r);
  await ctx.close();

  // ---------- 5. en Playwright, sin pedirlo, sigue «Todos» ----------
  ({ ctx, page } = await abrir('2026-10-22T09:10:00-04:00', false));
  r = await estado(page);
  chk('5 · sin ADM_HOY_PRUEBA (las pruebas de siempre) arranca en «Todos»', r.q === '' && /Todos 5/.test(r.chip) && r.n === 4, r);
  await ctx.close();

  chk('sin errores de la página', errs.length === 0, errs.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
