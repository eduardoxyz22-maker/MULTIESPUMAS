/* 🎯 EL DASHBOARD DE VENTAS: CUÁNTO HAY QUE CERRAR POR DÍA Y LA VENDEDORA QUE SOLO TRABAJÓ EL MES ANTERIOR
   (25/10, auditoría de Codex/Astra CRM-04 y CRM-03).

   LO QUE CUIDA:
   1. CRM-04: «Para alcanzarla habría que cerrar X/día el resto del mes (hoy Y/día)». X = lo que FALTA CERRAR ÷ los días que
      quedan. Cerrado 100.000, meta 400.000, día 10 de 30 → 300.000 ÷ 20 = 15.000/día (antes decía 5.000: la meta menos la
      PROYECCIÓN, o sea lo que hay que sumar encima del ritmo, comparado con el ritmo de hoy).
   2. CRM-03: la vendedora que solo trabajó el mes anterior aparece con «SIN LEADS ESTE MES» y ninguna vista se rompe ni
      muestra NaN con ella en 0.

   Los datos los arma el generador DE VERDAD contra el Kommo de mentira de tests/test_generar_integridad.py (--solo-datos);
   acá solo se ajustan la fecha y los montos del caso. Sin red.
   Se corre:  node tests/test_panel_meta.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + String(e).slice(0, 300)) : ''); };
const RAIZ = path.join(__dirname, '..');
const TPL = process.env.TPL || path.join(RAIZ, 'panel_template.html');

(async () => {
  const D = JSON.parse(execFileSync('python3', [path.join(__dirname, 'test_generar_integridad.py'), '--solo-datos'], { encoding: 'utf8', maxBuffer: 20e6 }));
  // El caso de la auditoría: día 10 de 30, Ana cerró 100.000 con meta 400.000, sin pipeline abierto.
  D.curDay = 10; D.daysInMonth = 30;
  const ana = D.team.find(v => v.name === 'Ana Prueba'), beto = D.team.find(v => v.name === 'Beto Prueba');
  Object.assign(ana, { value: 100000, cierres: 10, ticket: 10000, pipeline: 100000, metaMonto: 400000 });
  Object.assign(D.global, { cerrado: 100000, cierres: 10, ticket: 10000 });

  const tpl = fs.readFileSync(TPL, 'utf8');
  const html = tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + JSON.stringify(D) + ';');
  const tmp = path.join(os.tmpdir(), 'panel_meta_test.html');
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const errores = [];
  const abrir = async (vista) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(vista + ': ' + (e.stack || e.message)));
    await page.addInitScript((v) => { try { localStorage.clear(); localStorage.setItem('heaven_view', v); } catch (e) {} }, vista);
    await page.goto('file://' + tmp);
    await page.waitForTimeout(900);
    const txt = await page.evaluate(() => document.body.innerText);
    await page.close();
    return txt;
  };

  chk('0. los datos del generador traen a Beto con la marca y en 0', !!beto && beto.soloPrev === true && beto.leads === 0, JSON.stringify(beto && { soloPrev: beto.soloPrev, leads: beto.leads }));

  const proy = await abrir('proyeccion');
  const m = proy.match(/habr[ií]a que cerrar\s*([^\n]*?)\/d[ií]a el resto del mes \(hoy ([^\n]*?)\/d[ií]a\)/);
  chk('1a. la proyección (300.000) no llega a la meta (400.000): lo dice', /queda a/.test(proy) && /400[.,]000/.test(proy), (proy.match(/La proyecci[oó]n base[^\n]*/) || [''])[0]);
  chk('1b. «habría que cerrar 15.000/día el resto del mes» (lo que falta cerrar ÷ 20 días; antes 5.000)', !!m && /15[.,]000/.test(m[1]), m && m[0]);
  chk('1c. y lo compara con el ritmo de hoy: 10.000/día', !!m && /10[.,]000/.test(m[2]), m && m[2]);

  let marca = 0, nan = [];
  for (const v of (D.nav || []).map(n => n.id)) {
    const t = await abrir(v);
    if (/SIN LEADS ESTE MES|\(sin leads este mes\)/.test(t)) marca++;
    if (/\bNaN\b|Infinity/.test(t)) nan.push(v);
  }
  chk('2a. la marca «SIN LEADS ESTE MES» aparece en el dashboard', marca > 0, marca + ' vistas');
  chk('2b. ninguna vista muestra NaN/Infinity con una vendedora en 0', !nan.length, nan.join(', '));
  chk('2c. el dashboard abre todas las vistas sin errores de JavaScript', !errores.length, errores[0]);

  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
