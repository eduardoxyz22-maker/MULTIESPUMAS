/* 📐 MEDIDA ESPECIAL: ~5 DÍAS HÁBILES EN NOVIEMBRE Y DICIEMBRE (18/11/2026). El dueño: «cambia las medidas especiales a 5 días, este mes y
   diciembre». `ESP_TEMPORADA` (18/11 al 31/12): 4 días hábiles de producción + el día de entrega = ~5 días hábiles; fuera de la temporada,
   las 48 h de siempre. Se corre: HTTPS_PROXY=http://127.0.0.1:9 node tests/test_esp_temporada.js */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + JSON.stringify(e).slice(0, 300)) : ''); };
(async () => {
  const b = await chromium.launch();
  const caso = async (t) => { const pg = await b.newPage({ timezoneId: 'America/La_Paz' }); await pg.route(/^https?:\/\//, r => r.abort());
    await pg.clock.install({ time: new Date(t) }); await pg.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html')); await pg.clock.runFor(500);
    const v = await pg.evaluate(() => { STATE = []; var v = saldoVeredictoEspecial({ k: 'esp|x', total: 1, x: {} }, '', ''); return { sale: v.sale, desde: v.desde, t: saldoTitulo(v) }; });
    await pg.close(); return v; };
  let v = await caso('2026-11-18T09:00:00-04:00');
  chk('miércoles 18/11: sale de fábrica el lunes 23/11 y se entrega desde el martes 24/11', v.sale === '2026-11-23' && v.desde === '2026-11-24', v);
  chk('el cuadrito dice «~5 días hábiles»', /~5 días hábiles/.test(v.t), v.t);
  v = await caso('2026-12-30T09:00:00-04:00');
  chk('30/12 todavía es temporada (4 días hábiles de producción)', /~5 días hábiles/.test(v.t), v);
  v = await caso('2027-01-12T09:00:00-04:00');
  chk('en enero vuelve sola a las 48 h', v.sale === '2027-01-14' && !/hábiles/.test(v.t), v);
  v = await caso('2026-11-17T09:00:00-04:00');
  chk('antes del 18/11 seguía igual (48 h)', !/hábiles/.test(v.t), v);
  console.log(`\n${PASS} bien · ${FAIL} mal`); await b.close(); process.exit(FAIL ? 1 : 0);
})();
