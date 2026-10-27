/* 🧹 SEGUIMIENTO SIN TAREAS EN KOMMO (27/10, dueño: «no quiero que Cloudflare haga eso ya, si no se usa»).
   En «Seguimiento» del dashboard, ✓ y 🕐 creaban una tarea en Kommo, 📝 guardaba una nota y «Acción masiva» creaba tareas para
   todas las fichas: las cuatro pasaban por el Worker de Cloudflare con su propia copia del token de Kommo. Nadie las usa.

   LO QUE CUIDA:
   1. No quedan «Acción masiva» ni «Copia para mí».
   2. Cada ficha tiene solo ✓ y 🕐 (sin 📝), y ninguno dice que crea algo en Kommo.
   3. ✓ y 🕐 siguen marcando la ficha en el panel (Atendido / Pospuesto) y NO llaman a nadie (ni Cloudflare ni Kommo).

   Los datos los arma el generador DE VERDAD contra el Kommo de mentira de tests/test_generar_integridad.py (--solo-datos). Sin red.
   Se corre:  node tests/test_seguimiento_sin_cloudflare.js   (TPL=<otro panel_template.html> para medirlo contra uno viejo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + String(e).slice(0, 300)) : ''); };
const RAIZ = path.join(__dirname, '..');
const TPL = process.env.TPL || path.join(RAIZ, 'panel_template.html');

(async () => {
  const D = JSON.parse(execFileSync('python3', [path.join(__dirname, 'test_generar_integridad.py'), '--solo-datos'], { encoding: 'utf8', maxBuffer: 20e6 }));
  D.workerUrl = 'https://prueba-worker.example.workers.dev';   // aunque haya Worker, Seguimiento no lo llama
  const tpl = fs.readFileSync(TPL, 'utf8');
  const tmp = path.join(os.tmpdir(), 'panel_seguimiento_test.html');
  fs.writeFileSync(tmp, tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + JSON.stringify(D) + ';'));

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  const pedidos = [];
  await ctx.route(/^https?:\/\//, r => { pedidos.push(r.request().method() + ' ' + r.request().url()); return r.abort(); });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.stack || e.message));
  page.on('dialog', d => d.dismiss());
  await page.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('heaven_view', 'seguimiento'); } catch (e) {} });
  await page.goto('file://' + tmp);
  await page.waitForTimeout(900);

  const txt = await page.evaluate(() => document.body.innerText);
  chk('0. se abre Seguimiento con la ficha del Kommo de mentira', /Lead 4/.test(txt), txt.slice(0, 120));
  chk('1a. no queda «Acción masiva»', !/Acci[oó]n masiva/.test(txt));
  chk('1b. no queda «Copia para mí»', !/Copia para m[ií]/.test(txt));

  const fila = await page.evaluate(() => {
    const tr = [...document.querySelectorAll('tr')].find(t => /Lead 4/.test(t.innerText));
    const bs = tr ? [...tr.querySelectorAll('.row-act')] : [];
    return { n: bs.length, titulos: bs.map(b => b.title) };
  });
  chk('2a. la ficha tiene solo ✓ y 🕐 (sin 📝 nota)', fila.n === 2, JSON.stringify(fila));
  chk('2b. ningún botón dice que crea algo en Kommo', fila.titulos.every(t => !/Kommo/i.test(t)), fila.titulos.join(' | '));

  const antes = pedidos.length;
  const tocar = async i => {
    await page.evaluate(i => { const tr = [...document.querySelectorAll('tr')].find(t => /Lead 4/.test(t.innerText)); tr.querySelectorAll('.row-act')[i].click(); }, i);
    await page.waitForTimeout(400);
    return page.evaluate(() => { const tr = [...document.querySelectorAll('tr')].find(t => /Lead 4/.test(t.innerText)); return tr ? tr.innerText : ''; });
  };
  const t1 = await tocar(0);
  chk('3a. ✓ marca la ficha «Atendido» en el panel', /Atendido/.test(t1), t1);
  const t2 = await tocar(1);
  chk('3b. 🕐 la marca «Pospuesto»', /Pospuesto/.test(t2), t2);
  const nuevos = pedidos.slice(antes);
  chk('3c. tocar ✓ y 🕐 no llama a nadie (ni Cloudflare ni Kommo)', !nuevos.length, nuevos.join(' · '));
  chk('3d. sin errores de JavaScript', !errores.length, errores[0]);

  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
