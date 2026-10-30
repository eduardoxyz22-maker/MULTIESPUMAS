/* 🔄 «HAY UNA VERSIÓN NUEVA DEL PANEL» (30/10, §4nx; dueño: «la app del panel se actualiza sola o que onda?» → «si hazlo»).
   La página nunca se guarda en el aparato, pero una ventana que quedó abierta sigue con la versión con la que se abrió. El panel
   mira `panel-version.json` y, si dice una versión más nueva que `PANEL_V`, avisa con «Recargar». Lo que cuida:
   1. En el repo, `PANEL_V` (pedidos.html) y `panel-version.json` dicen LO MISMO (si no, después de recargar el cartel seguiría).
   2. Sin `VER_PRUEBA` (Playwright) o desde un archivo (file://) no pide nada ni muestra nada.
   3. Misma versión, una más vieja, un JSON roto o un error → nada. Una más nueva → el cartel, a la vista y dentro de la pantalla.
   4. «✕» lo saca por media hora; una versión TODAVÍA más nueva vuelve a avisar.
   5. Al volver a la ventana mira otra vez, pero no más de una vez por minuto; escondida no mira.
   6. «Recargar»: con un pedido enviándose no recarga; con un pedido NUEVO a medio llenar pregunta (Cancelar = sigue); al recargar va
      con `?nv=<versión>` (que GitHub no conteste la copia vieja) y al abrir lo saca de la dirección sin tocar `?tema=`.
   Se corre:  node tests/test_version_nueva.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const RAIZ = path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const URLV = 'https://prueba.example/panel-version.json';

(async () => {
  // 1. El repo
  const html = fs.readFileSync(PEDIDOS, 'utf8');
  const m = /var PANEL_V='([^']+)'/.exec(html);
  const j = JSON.parse(fs.readFileSync(path.join(RAIZ, 'panel-version.json'), 'utf8'));
  chk('1a. pedidos.html tiene PANEL_V con forma fecha-letra', m && /^\d{4}-\d{2}-\d{2}-[a-z]$/.test(m[1]), m && m[1]);
  chk('1b. panel-version.json dice lo mismo que PANEL_V', m && j.v === m[1], (m && m[1]) + ' / ' + j.v);
  const V0 = m ? m[1] : '2026-10-30-a';
  const masNueva = V0.slice(0, 11) + String.fromCharCode(V0.charCodeAt(11) + 1);
  const masNueva2 = V0.slice(0, 11) + String.fromCharCode(V0.charCodeAt(11) + 2);
  const masVieja = '2026-01-01-a';

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(op) {
    op = op || {};
    const ctx = await browser.newContext({ viewport: op.vp || { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    const est = { pedidos: 0, resp: op.resp || { status: 200, body: JSON.stringify({ v: V0 }) } };
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.route(/prueba\.example\/panel-version\.json/, r => { est.pedidos++; const x = est.resp; return r.fulfill({ status: x.status, contentType: 'application/json', body: x.body }); });
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    est.dialogos = [];
    page.on('dialog', d => { est.dialogos.push(d.message()); return est.aceptar ? d.accept() : d.dismiss(); });
    if (op.prueba !== false) await page.addInitScript(u => { window.VER_PRUEBA = 1; window.VER_URL = u; }, URLV);
    await page.goto('file://' + PEDIDOS + (op.q || ''));
    await page.waitForTimeout(op.espera || 900);
    return { ctx, page, est };
  }
  const cartel = page => page.evaluate(() => { const b = document.getElementById('ver-nueva'); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); return { t: b.innerText, x: r.left, w: r.width, top: r.top, vw: innerWidth, hdr: (document.querySelector('.header') || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom }; });

  // 2. Sin VER_PRUEBA no pide nada
  {
    const { ctx, page, est } = await abrir({ prueba: false, resp: { status: 200, body: JSON.stringify({ v: masNueva }) } });
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(300);
    chk('2a. en Playwright (sin VER_PRUEBA) no pide panel-version.json', est.pedidos === 0, est.pedidos);
    chk('2b. ni muestra el cartel', (await cartel(page)) === null);
    chk('2c. desde un archivo (file://) tampoco: verActivo() da false', await page.evaluate(() => { try { Object.defineProperty(navigator, 'webdriver', { get: () => false }); } catch (e) {} return verActivo(); }) === false);
    await ctx.close();
  }

  // 3. Las respuestas que no avisan
  for (const [nom, resp] of [['la misma versión', { status: 200, body: JSON.stringify({ v: V0 }) }], ['una más vieja', { status: 200, body: JSON.stringify({ v: masVieja }) }],
    ['un JSON roto', { status: 200, body: '<html>no' }], ['sin forma fecha-letra', { status: 200, body: JSON.stringify({ v: '9999' }) }], ['un 404', { status: 404, body: 'no' }]]) {
    const { ctx, page, est } = await abrir({ resp });
    chk('3. con ' + nom + ' no sale el cartel (y sí lo pidió)', est.pedidos === 1 && (await cartel(page)) === null, 'pedidos ' + est.pedidos);
    await ctx.close();
  }

  // 3b-4-5. Una más nueva
  {
    const { ctx, page, est } = await abrir({ resp: { status: 200, body: JSON.stringify({ v: masNueva }) } });
    const c = await cartel(page);
    chk('3b. con una versión más nueva sale el cartel', c && /versión nueva del panel/.test(c.t) && /Recargar/.test(c.t), c && c.t);
    chk('3c. está debajo del encabezado y dentro de la pantalla', c && c.top >= c.hdr - 1 && c.x >= 0 && c.x + c.w <= c.vw, c);
    await page.click('#ver-nueva .vn-x');
    chk('4a. «✕» lo saca', (await cartel(page)) === null);
    await page.evaluate(() => { VER.ult = 0; window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(300);
    chk('4b. y al mirar de nuevo con la misma versión no vuelve (media hora)', est.pedidos === 2 && (await cartel(page)) === null, 'pedidos ' + est.pedidos);
    est.resp = { status: 200, body: JSON.stringify({ v: masNueva2 }) };
    await page.evaluate(() => { VER.ult = 0; window.dispatchEvent(new Event('focus')); });
    await page.waitForTimeout(300);
    chk('4c. una versión todavía más nueva vuelve a avisar', /versión nueva/.test(((await cartel(page)) || {}).t || ''));
    // 5. al volver, como mucho una vez por minuto
    const n0 = est.pedidos;
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    chk('5a. dos vueltas a la ventana seguidas: no pide otra vez antes del minuto', est.pedidos === n0, n0 + ' → ' + est.pedidos);
    await page.evaluate(() => { VER.ult = 0; Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); return verMirar(false); });
    chk('5b. con la ventana escondida no mira', est.pedidos === n0, n0 + ' → ' + est.pedidos);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(300);
    chk('5c. al volver a verse, mira', est.pedidos === n0 + 1, n0 + ' → ' + est.pedidos);

    // 6. Recargar
    await page.evaluate(() => { document.getElementById('f-submit').disabled = true; });
    const url0 = page.url();
    const r1 = await page.evaluate(() => verRecargar());
    chk('6a. con un pedido enviándose no recarga', r1 === false && page.url() === url0);
    await page.evaluate(() => { document.getElementById('f-submit').disabled = false; showViewAhora('form'); document.getElementById('f-cliente').value = 'CLIENTE A MEDIO ESCRIBIR'; });
    est.aceptar = false;
    const r2 = await page.evaluate(() => verRecargar());
    await page.waitForTimeout(200);
    chk('6b. con un pedido nuevo a medio llenar pregunta, y Cancelar no recarga', r2 === false && est.dialogos.some(d => /a medio llenar/.test(d)) && page.url() === url0, est.dialogos);
    chk('6c. lo escrito sigue ahí', await page.evaluate(() => document.getElementById('f-cliente').value) === 'CLIENTE A MEDIO ESCRIBIR');
    await ctx.close();
  }
  {
    const { ctx, page, est } = await abrir({ q: '?tema=espuma', resp: { status: 200, body: JSON.stringify({ v: masNueva }) } });
    chk('6d. arranca con ?tema=espuma', /tema=espuma/.test(page.url()));
    const nav = page.waitForNavigation({ timeout: 15000 }).catch(() => null);
    await page.evaluate(() => verRecargar());
    const resp = await nav;
    chk('6e. sin nada a medio escribir recarga sin preguntar, con ?nv=<la nueva>', resp && est.dialogos.length === 0 && /nv=/.test(resp.url()) && resp.url().includes(encodeURIComponent(masNueva)), resp && resp.url());
    await page.waitForTimeout(600);
    const loc = await page.evaluate(() => location.search);
    chk('6f. al abrir saca el ?nv= de la dirección y deja el ?tema=', loc === '?tema=espuma', loc);
    chk('6g. y sigue con el tema que pedía la dirección', await page.evaluate(() => document.documentElement.classList.contains('tema-espuma')));
    await ctx.close();
  }

  // 7. En el celular entra en la pantalla
  {
    const { ctx, page } = await abrir({ vp: { width: 360, height: 760 }, resp: { status: 200, body: JSON.stringify({ v: masNueva }) } });
    const c = await cartel(page);
    chk('7. en 360 px el cartel entra entero', c && c.x >= 0 && c.x + c.w <= c.vw + 0.5, c);
    await ctx.close();
  }

  chk('8. sin errores en la página', errores.length === 0, errores.join(' | '));
  await browser.close();
  console.log(`\nversion_nueva :: ${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
