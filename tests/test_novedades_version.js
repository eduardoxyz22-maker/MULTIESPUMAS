/* ✨ 303 · LO NUEVO DE ESTA VERSIÓN, AL RECARGAR (15/11, dueño: aprobado).

   Después de recargar por «Hay una versión nueva» (`?nv=…`), o al abrir con una versión más nueva que la última que vio el aparato,
   una tarjeta chica, una vez por versión: «✨ Lo nuevo para vos», con 1 a 3 renglones según quién eligió ser y «Mostrame», que lleva al
   lugar con Bloki. Las notas van en `panel-version.json` junto a la versión: { v, n:{ todos, vend, log, conta, admin } }.

   Lo que se mira (el archivo lo sirve la prueba, nunca sale a la red):
     1. Sin la bandera (`NOV_PRUEBA`) nada, aunque venga de «Recargar».
     2. Vendedora que recargó: la tarjeta con lo de todos y lo de vendedoras (como mucho 3), nada de logística; la dirección queda
        sin `?nv=`.
     3. «Entendido» la cierra para siempre en esa versión: volver a recargar no la muestra.
     4. Logística ve lo suyo, no lo de las vendedoras.
     5. Un aparato que abre por primera vez (sin «Recargar» y sin versión anterior) no la ve; uno que tenía una versión anterior, sí.
     6. Si el archivo trae otra versión (o sin notas), nada.
     7. «Mostrame» lleva a la pestaña y señala el lugar (Bloki: `asis-foco`).

   Se corre:  node tests/test_novedades_version.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const fs = require('fs');
const PANEL_V = (fs.readFileSync(PEDIDOS, 'utf8').match(/var PANEL_V='([^']+)'/) || [])[1];
const NOTAS = { todos: ['📅 El calendario de entregas ahora se abre en el mes'],
  vend: [{ t: '⚡ Frases rápidas arriba de Observaciones', v: 'form', f: '#f-obs', x: 'Tocá una y se agrega sola.' }, '🕓 La historia de cada pedido en su ficha', '📅 El cliente elige el día nuevo por el bot'],
  log: ['🚚 Cada camión con sus entregas', '🛰️ El GPS de hoy en la ficha'], conta: ['💵 Mayor y saldos del efectivo'] };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function contexto(flag, ls, json) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.route('https://x.test/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json || { v: PANEL_V, n: NOTAS }) }));
    await ctx.addInitScript(([flag, ls]) => {
      window.VER_URL = 'https://x.test/panel-version.json';
      if (flag) window.NOV_PRUEBA = 1;
      try { if (!sessionStorage.getItem('_ini')) { sessionStorage.setItem('_ini', '1'); Object.keys(ls || {}).forEach(function (k) { localStorage.setItem(k, ls[k]); }); } } catch (e) {}
    }, [flag, ls || {}]);
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    return { ctx, page };
  }
  const ir = async (page, q) => { await page.goto('file://' + PEDIDOS + (q || ''), { waitUntil: 'load' }); await page.waitForTimeout(2300); };
  const tarjeta = (page) => page.evaluate(() => { var b = document.getElementById('nov-card'); return b && !b.hidden ? { txt: b.innerText.replace(/\s+/g, ' ').trim(), n: b.querySelectorAll('.nov-li').length, url: location.search } : { url: location.search }; });
  const VEND = { me_mis_vendedor: 'Isabel Robledo', me_quien_ok: '1' };

  let { ctx, page } = await contexto(false, VEND);
  await ir(page, '?nv=' + PANEL_V);
  let r = await tarjeta(page);
  chk('1 sin la bandera: nada, aunque venga de «Recargar»', !r.txt, r);
  await ctx.close();

  ({ ctx, page } = await contexto(true, VEND));
  await ir(page, '?nv=' + PANEL_V);
  r = await tarjeta(page);
  chk('2a la vendedora que recargó ve «✨ Lo nuevo para vos · vendedoras»', r.txt && /Lo nuevo para vos · vendedoras/.test(r.txt), r);
  chk('2b …lo de todos y lo de vendedoras, como mucho 3 renglones, nada de logística', r.n === 3 && /calendario de entregas/.test(r.txt) && /Frases rápidas/.test(r.txt) && !/camión|GPS/.test(r.txt), r);
  chk('2c la dirección queda sin «?nv=»', !/nv=/.test(r.url), r.url);
  // 7. Mostrame
  await page.evaluate(() => { showView('mis'); });
  await page.click('#nov-card .nov-li button'); await page.waitForTimeout(600);
  r = await page.evaluate(() => ({ form: document.getElementById('view-form').classList.contains('active'), foco: (document.querySelector('.asis-foco') || {}).id || '', card: !document.getElementById('nov-card') || document.getElementById('nov-card').hidden }));
  chk('7 «Mostrame» lleva al formulario y señala Observaciones (y cierra la tarjeta)', r.form && r.foco === 'f-obs' && r.card, r);
  // 3. una vez
  await ir(page, '?nv=' + PANEL_V);
  r = await tarjeta(page);
  chk('3 ya vista en esta versión: al recargar otra vez no sale', !r.txt, r);
  await ctx.close();

  ({ ctx, page } = await contexto(true, { me_quien_rol: 'logistica', me_quien_ok: '1' }));
  await ir(page, '?nv=' + PANEL_V);
  r = await tarjeta(page);
  chk('4 logística ve lo suyo y no lo de las vendedoras', r.txt && /logística/.test(r.txt) && /camión/.test(r.txt) && !/Frases rápidas/.test(r.txt), r);
  await page.click('#nov-card .nov-ok'); await page.waitForTimeout(100);
  r = await page.evaluate(() => ({ visto: localStorage.getItem('me_ver_nov'), hid: document.getElementById('nov-card').hidden }));
  chk('3b «Entendido» la cierra y queda anotada esta versión', r.hid && r.visto === document_v(), r);
  await ctx.close();

  ({ ctx, page } = await contexto(true, VEND));
  await ir(page, '');
  r = await tarjeta(page);
  chk('5a un aparato que abre por primera vez (sin «Recargar») no la ve', !r.txt, r);
  await ctx.close();
  ({ ctx, page } = await contexto(true, Object.assign({ me_ver_ult: '2026-11-01-a' }, VEND)));
  await ir(page, '');
  r = await tarjeta(page);
  chk('5b uno que tenía una versión anterior, sí (aunque abra con F5)', r.txt && /vendedoras/.test(r.txt), r);
  await ctx.close();

  ({ ctx, page } = await contexto(true, VEND, { v: '2099-01-01-a', n: NOTAS }));
  await ir(page, '?nv=' + PANEL_V);
  r = await tarjeta(page);
  chk('6a el archivo trae otra versión: nada', !r.txt, r);
  await ctx.close();
  ({ ctx, page } = await contexto(true, VEND, { v: PANEL_V }));
  await ir(page, '?nv=' + PANEL_V);
  r = await tarjeta(page);
  chk('6b sin notas: nada', !r.txt, r);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
  function document_v() { return PANEL_V; }
})().catch(e => { console.error(e); process.exit(1); });
