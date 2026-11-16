/* 🔎 294 · BUSCAR SIN QUE SE TRABE LA LETRA (15/11, dueño: aprobado).

   Medido con la planilla del 15/11: cada letra redibujaba la lista entera (escribir «titanio» trababa 0,4-0,6 s, 2 s en una compu lenta).
   Ahora los buscadores de Administración, Contabilidad y Mis pedidos esperan a que se deje de escribir ¼ de segundo (`buscarLuego`) y
   dibujan UNA vez; mientras tanto, al lado del campo, «🔎 buscando…». Enter dibuja enseguida.

   Lo que se mira:
     1. Sin la bandera (`BUSCAR_LUEGO_PRUEBA`) todo sigue como siempre: una letra = un dibujo, sin «buscando…».
     2. Con la bandera, en Administración: escribir «titanio» letra por letra no dibuja nada mientras se escribe; «🔎 buscando…» se ve
        adentro del campo; a los ¼ s dibuja UNA vez y se va el cartel. Lo que encuentra es lo mismo que sin la bandera.
     3. Enter dibuja al instante (sin esperar) y no dibuja otra vez después.
     4. Contabilidad (`cta-search`) y Mis pedidos (`mis-q`): lo mismo; Mis pedidos sigue pasando a «Todos» al buscar.
     5. El cartel queda adentro del campo en 1366 y en 1920 px. Sin errores de la página.

   Datos SINTÉTICOS. Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_buscar_luego.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR() {
  CONNECTED = false; try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
  apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); };
  var n = 0;
  var P = function (cli, prod, o) {
    n++; o = o || {};
    return Object.assign({ id: 'p' + n, oc: '11-' + (100 + n), nota: String(4000 + n), vendedor: 'Isabel Robledo', cliente: cli, celular: '7000' + (1000 + n),
      fecha: '2026-11-1' + (n % 9), turno: 'AM', zona: 'NORTE', direccion: 'Calle ' + n, maps: '', productos: [{ desc: prod, codigo: 'CH' + (1200 + n), medida: '140x190', cant: 1, precio: 2000 }],
      acuenta: 500, saldo: 1500, pagado: false, metodoPago: 'Efectivo', entregado: false, ts: new Date('2026-11-0' + (1 + n % 9) + 'T10:00:00-04:00').getTime(), facturarA: '', nit: '' }, o);
  };
  var L = [];
  for (var i = 0; i < 24; i++) L.push(P('CLIENTE NUMERO ' + i, i % 3 === 0 ? 'COLCHON TITANIO ICE' : (i % 3 === 1 ? 'COLCHON SOFT' : 'SOMIER ORO')));
  STATE = L;
  UNLOCKED = true;
  document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
  /* cuántas veces se dibujó cada lista */
  window.__n = { adm: 0, cta: 0, mis: 0 };
  var rA = renderAdmin, rC = renderConta, rM = renderMis;
  renderAdmin = function () { __n.adm++; return rA.apply(this, arguments); };
  renderConta = function () { __n.cta++; return rC.apply(this, arguments); };
  renderMis = function () { __n.mis++; return rM.apply(this, arguments); };
  window._admOcs = function () { return [].slice.call(document.querySelectorAll('#tbl-pedidos tbody tr')).map(function (tr) { var m = tr.innerText.match(/11-\d{3}/); return m ? m[0] : ''; }).filter(Boolean).sort().join(','); };
  window._ctaOcs = function () { return [].slice.call(document.querySelectorAll('#tbl-conta tbody tr')).map(function (tr) { var m = tr.innerText.match(/11-\d{3}/); return m ? m[0] : ''; }).filter(Boolean).sort().join(','); };
  window._misOcs = function () { return [].slice.call(document.querySelectorAll('#mis-lista .cho-card')).map(function (c) { var m = c.innerText.match(/11-\d{3}/); return m ? m[0] : ''; }).filter(Boolean).sort().join(','); };
  window._pill = function (k) { var p = document.getElementById('bl-pill-' + k); return p ? { hid: p.hidden, txt: p.textContent } : null; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(w, flag) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.BUSCAR_LUEGO_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.clock.runFor(500);
    await page.clock.pauseAt(new Date('2026-11-16T10:00:05-04:00'));   // el reloj quieto: solo avanza con runFor (si no, una máquina lenta dispara la espera)
    await page.evaluate(PREPARAR);
    return { ctx, page };
  }
  const escribir = async (page, sel, txt) => { await page.fill(sel, ''); await page.focus(sel); for (const ch of txt) { await page.keyboard.type(ch); await page.clock.runFor(40); } };

  // ═══ 1. sin la bandera, como siempre ═══
  let { ctx, page } = await abrir(1440, false);
  await page.evaluate(() => { showView('admin'); renderAdmin(); __n.adm = 0; });
  await escribir(page, '#adm-search', 'titanio');
  let r = await page.evaluate(() => ({ n: __n.adm, ocs: _admOcs(), pill: _pill('adm') }));
  chk('1a sin la bandera: cada letra dibuja (7 letras = 7 dibujos), como siempre', r.n === 7, r.n);
  chk('1b …y no hay «buscando…»', r.pill === null, r.pill);
  const base = r.ocs;
  chk('1c encuentra los 8 TITANIO', base.split(',').length === 8, base);
  await ctx.close();

  // ═══ 2-4. con la bandera ═══
  ({ ctx, page } = await abrir(1440, true));
  await page.evaluate(() => { showView('admin'); renderAdmin(); __n.adm = 0; });
  await escribir(page, '#adm-search', 'titanio');
  r = await page.evaluate(() => ({ n: __n.adm, pill: _pill('adm') }));
  chk('2a mientras se escribe no se dibuja nada', r.n === 0, r.n);
  chk('2b «🔎 buscando…» a la vista', r.pill && !r.pill.hid && /buscando/.test(r.pill.txt), r.pill);
  await page.clock.runFor(300);
  r = await page.evaluate(() => ({ n: __n.adm, pill: _pill('adm'), ocs: _admOcs() }));
  chk('2c al dejar de escribir (¼ s) dibuja UNA vez', r.n === 1, r.n);
  chk('2d …y se va «buscando…»', r.pill && r.pill.hid, r.pill);
  chk('2e lo que encuentra es lo mismo que sin la bandera', r.ocs === base, { con: r.ocs, sin: base });
  // 3. Enter
  await page.evaluate(() => { __n.adm = 0; });
  await page.fill('#adm-search', ''); await page.clock.runFor(300);
  await page.evaluate(() => { __n.adm = 0; });
  await page.focus('#adm-search'); await page.keyboard.type('soft'); await page.keyboard.press('Enter');
  r = await page.evaluate(() => ({ n: __n.adm, pill: _pill('adm'), ocs: _admOcs() }));
  chk('3a Enter dibuja al instante', r.n === 1 && r.ocs.split(',').length === 8, r);
  await page.clock.runFor(400);
  r = await page.evaluate(() => ({ n: __n.adm }));
  chk('3b …y después no dibuja otra vez', r.n === 1, r.n);

  // 4a. Contabilidad
  await page.evaluate(() => { showView('conta'); segSet('cta-mode', 'todo'); setContaModo('todo'); __n.cta = 0; });
  await escribir(page, '#cta-search', 'titanio');
  r = await page.evaluate(() => ({ n: __n.cta, pill: _pill('cta') }));
  chk('4a Contabilidad: mientras se escribe no dibuja y dice «buscando…»', r.n === 0 && r.pill && !r.pill.hid, r);
  await page.clock.runFor(300);
  r = await page.evaluate(() => ({ n: __n.cta, ocs: _ctaOcs(), pill: _pill('cta') }));
  chk('4b …y dibuja una vez, con los mismos 8', r.n === 1 && r.ocs === base && r.pill.hid, r);
  // 4c. Mis pedidos
  await page.evaluate(() => { showView('mis'); var mv = document.getElementById('mis-vendedor'); mv.value = 'Isabel Robledo'; setMisFiltro('hoy'); __n.mis = 0; });
  await escribir(page, '#mis-q', 'titanio');
  r = await page.evaluate(() => ({ n: __n.mis, q: MIS_Q, pill: _pill('mis') }));
  chk('4c Mis pedidos: mientras se escribe no dibuja (la búsqueda todavía no cambió)', r.n === 0 && r.q === '' && r.pill && !r.pill.hid, r);
  await page.clock.runFor(300);
  r = await page.evaluate(() => ({ n: __n.mis, q: MIS_Q, f: MIS_FILTER, ocs: _misOcs() }));
  chk('4d …dibuja una vez, pasa a «Todos» y encuentra los mismos 8', r.n === 1 && r.q === 'titanio' && r.f === 'todos' && r.ocs === base, r);
  await page.keyboard.press('Enter'); await page.clock.runFor(50);
  r = await page.evaluate(() => ({ n: __n.mis }));
  chk('4e Enter sin nada esperando no dibuja de más', r.n === 1, r.n);
  await ctx.close();

  // ═══ 5. el cartel adentro del campo ═══
  for (const w of [1366, 1920]) {
    ({ ctx, page } = await abrir(w, true));
    await page.evaluate(() => { showView('admin'); renderAdmin(); });
    for (const [sel, k, vista] of [['#adm-search', 'adm', 'admin'], ['#cta-search', 'cta', 'conta'], ['#mis-q', 'mis', 'mis']]) {
      await page.evaluate((v) => { showView(v); if (v === 'mis') { document.getElementById('mis-vendedor').value = 'Isabel Robledo'; renderMis(); } }, vista);
      await page.focus(sel); await page.keyboard.type('ti');
      const g = await page.evaluate(([sel, k]) => { var i = document.querySelector(sel).getBoundingClientRect(), p = document.getElementById('bl-pill-' + k).getBoundingClientRect(); return { dentro: p.left >= i.left - 1 && p.right <= i.right + 1 && p.top >= i.top - 1 && p.bottom <= i.bottom + 1, i: [i.left, i.right, i.top, i.bottom].map(Math.round), p: [p.left, p.right, p.top, p.bottom].map(Math.round) }; }, [sel, k]);
      chk('5 ' + w + ' px · ' + k + ': «buscando…» adentro del campo', g.dentro, g);
      await page.clock.runFor(300); await page.fill(sel, ''); await page.clock.runFor(300);
    }
    await ctx.close();
  }

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
