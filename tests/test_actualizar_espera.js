/* 🔄 EL BOTÓN «ACTUALIZAR» DEL DASHBOARD ESPERA LO QUE TARDA GITHUB (30/10, dueño: *«le di actualizar… no se modificó la hora
   y el día de actualización pero el botón no dio error ni nada»*).
   La corrida en GitHub (Kommo + publicar) tarda ~5-6 min. El botón esperaba 3,5 min, decía «Está tardando» 4 s y volvía a
   «Actualizar»: parecía que no había hecho nada, y la página no se recargaba sola cuando los datos llegaban.

   LO QUE CUIDA (con un Worker de mentira y el reloj de la página manejado por la prueba):
   1. A los 4 minutos sigue esperando y dice cuánto lleva («Generando desde Kommo… 4:0x de ~6 min»).
   2. Si la corrida termina a los 6 minutos, dice «Datos listos» y recarga la página sola.
   3. Si la corrida termina mal, lo dice y el aviso queda a la vista (no 4 s).
   4. Pasados 12 minutos sin terminar, dice que siga en GitHub y que recargue en unos minutos, a la vista.

   Se corre:  node tests/test_actualizar_espera.js   (TPL=<otro panel_template.html> para medirlo contra uno viejo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + String(e).slice(0, 300)) : ''); };
const RAIZ = path.join(__dirname, '..');
const TPL = process.env.TPL || path.join(RAIZ, 'panel_template.html');
const W = 'https://prueba-worker.example.workers.dev/';

(async () => {
  const D = JSON.parse(execFileSync('python3', [path.join(__dirname, 'test_generar_integridad.py'), '--solo-datos'], { encoding: 'utf8', maxBuffer: 20e6 }));
  D.workerUrl = W;
  const tpl = fs.readFileSync(TPL, 'utf8');
  const tmp = path.join(os.tmpdir(), 'panel_actualizar_test.html');
  fs.writeFileSync(tmp, tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + JSON.stringify(D) + ';'));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });

  // Una vuelta: la corrida «empieza» al segundo pedido de estado y termina (con `fin`) a los `terminaMs` de la página.
  const vuelta = async ({ terminaMs, fin }) => {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
    const est = { t0: null, cargas: 0 };
    await ctx.route(/^https?:\/\//, async r => {
      const rq = r.request();
      if (!rq.url().startsWith(W)) return r.abort();
      const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
      if (rq.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
      const b = JSON.parse(rq.postData() || '{}');
      let j;
      if (b.action === 'refresh') j = { ok: true, since: '2026-10-30T00:28:15Z' };
      else {
        const va = est.ahora - est.t0;
        if (terminaMs != null && va >= terminaMs) j = { created_at: '2026-10-30T13:17:08Z', status: 'completed', conclusion: fin };
        else j = { created_at: '2026-10-30T13:17:08Z', status: 'in_progress', conclusion: null };
      }
      return r.fulfill({ status: 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors), body: JSON.stringify(j) });
    });
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push(e.message));
    page.on('load', () => { est.cargas++; });
    await page.clock.install({ time: new Date('2026-10-30T13:17:00Z') });
    await page.goto('file://' + tmp);
    await page.waitForTimeout(700);
    const btn = () => page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(x => /Actualiz|Conectando|Iniciando|Generando|Datos listos|Recargando|tardando|GitHub/.test(x.innerText));
      return b ? b.innerText.trim() : '(sin botón)';
    });
    const ahora = () => page.evaluate(() => Date.now());
    est.t0 = await ahora(); est.ahora = est.t0;
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Actualizar$/.test(x.innerText.trim())); b.click(); });
    await page.waitForTimeout(150);
    // Avanza el reloj de a 3 s, dejando que el fetch de mentira conteste entre paso y paso.
    const avanzar = async ms => {
      for (let h = 0; h < ms; h += 3000) {
        await page.clock.runFor(3000);
        est.ahora = await ahora().catch(() => est.ahora);
        await page.waitForTimeout(25);
      }
    };
    return { ctx, page, est, btn, avanzar, errores };
  };

  // 1 y 2: termina bien a los 6 minutos.
  {
    const v = await vuelta({ terminaMs: 360000, fin: 'success' });
    await v.avanzar(240000);
    const a4 = await v.btn();
    chk('1a. a los 4 minutos el botón sigue esperando (no volvió a «Actualizar»)', a4 !== 'Actualizar' && /Generando/.test(a4), a4);
    chk('1b. dice cuánto lleva y cuánto tarda', /\b[34]:\d\d de ~6 min/.test(a4), a4);
    await v.avanzar(130000);
    const a6 = await v.btn();
    chk('2a. al terminar la corrida dice «Datos listos»', /Datos listos/.test(a6), a6);
    const cargas0 = v.est.cargas;
    await v.avanzar(45000);
    await v.page.waitForTimeout(500);
    chk('2b. y recarga la página sola', v.est.cargas > cargas0, 'cargas ' + cargas0 + ' → ' + v.est.cargas);
    chk('2c. sin errores en la página', v.errores.length === 0, v.errores.join(' | '));
    await v.ctx.close();
  }

  // 3: la corrida termina mal.
  {
    const v = await vuelta({ terminaMs: 300000, fin: 'failure' });
    await v.avanzar(312000);
    const m = await v.btn();
    chk('3a. si GitHub falla, lo dice', /falló en GitHub/.test(m), m);
    await v.avanzar(9000);
    const m2 = await v.btn();
    chk('3b. el aviso sigue a la vista 9 s después (antes duraba 4 s)', /falló en GitHub/.test(m2), m2);
    chk('3c. no recarga la página', v.est.cargas === 1, 'cargas ' + v.est.cargas);
    await v.ctx.close();
  }

  // 4: no termina nunca.
  {
    const v = await vuelta({ terminaMs: null });
    await v.avanzar(600000);
    const m10 = await v.btn();
    chk('4a. a los 10 minutos todavía espera y dice que tarda más que otras veces', /Generando.*tarda m[aá]s/.test(m10), m10);
    await v.avanzar(130000);
    const m = await v.btn();
    chk('4b. pasados 12 minutos dice que recargue en unos minutos', /recarg[aá] la p[aá]gina en unos minutos/.test(m), m);
    await v.avanzar(9000);
    const m2 = await v.btn();
    chk('4c. y el aviso sigue a la vista 9 s después', /recarg[aá] la p[aá]gina en unos minutos/.test(m2), m2);
    await v.ctx.close();
  }

  await browser.close();
  console.log(`\nactualizar_espera :: ${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
