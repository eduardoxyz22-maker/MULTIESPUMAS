/* ☀️ (17/11, Fable + dueño: «Sí, prográmalo apagado hasta el 1/12») «A esta altura» con los mismos DOMINGOS.
   1. Apagado antes del 01/12: el corte no trae `dom` (página y .gs) y la cuenta es la de siempre.
   2. Desde el 01/12: el k-ésimo domingo del otro mes contra el k-ésimo de este; hoy domingo, a la misma hora; la Tienda Banzer cuenta sus
      domingos desde el 02/11. Lo demás, los mismos días hábiles.
   3. La página (`pryCorteAltura`, `pryEnAltura`, `pryAcum`, la línea «Domingos», «Tu mes» no se rompe) y el .gs (`waVbCorte_`, `waEnAltura_`,
      `waVbDatos_`) dan lo mismo. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const G = { console }; G.globalThis = G; vm.createContext(G); vm.runInContext(fs.readFileSync(GS, 'utf8'), G);

const TS = (d, h) => new Date(d + 'T' + (h || '10:00') + ':00-04:00').getTime();
let n = 0;
const V = (vend, reg, h, bs, fecha) => { n++; return { id: 'd' + n, oc: '11-' + (300 + n), nota: String(800 + n), vendedor: vend, cliente: 'CLIENTE ' + n, fecha: fecha || reg,
  turno: 'AM', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: bs }], saldo: bs, acuenta: 0, pagado: false, metodoPago: '', entregado: false,
  ts: TS(reg, h), rev: TS(reg, h), fotos: [] }; };
const LISTA = [
  V('Mirian Salazar', '2026-11-01', '09:00', 1000, '2026-11-10'),   // 1.er domingo, antes de las 10
  V('Mirian Salazar', '2026-11-01', '11:00', 600, '2026-11-10'),    // 1.er domingo, después de las 10
  V('Mirian Salazar', '2026-11-05', '10:00', 500, '2026-11-12'),    // día hábil
  V('Mirian Salazar', '2026-11-08', '10:00', 2000, '2026-11-14'),   // 2.º domingo
  V('Mirian Salazar', '2026-11-20', '10:00', 9000, '2026-11-25'),   // después del corte
  V('Carola Chávez', '2026-11-08', '10:00', 3000, '2026-11-14'),    // Tienda Banzer: su 1.er domingo
  V('Carola Chávez', '2026-11-15', '10:00', 4000, '2026-11-20'),    // Tienda Banzer: su 2.º domingo
  V('Mirian Salazar', '2026-12-06', '09:30', 700, '2026-12-10'),    // diciembre: 1.er domingo
  V('Mirian Salazar', '2026-12-07', '09:00', 800, '2026-12-12')
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(hoy) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.dismiss());
    await page.clock.setFixedTime(new Date(hoy));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' }); await page.waitForTimeout(350);
    await page.evaluate((L) => {
      CONNECTED = false; CARGA_GEN++; CARGA_ESTADO = 'ok';
      try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
      loadFromServer = function () {}; STATE = L;
    }, LISTA);
    page._ctx = ctx; return page;
  }
  const cuenta = (hoy, min) => (page) => page.evaluate(({ hoy, min }) => {
    var C = pryCorteAltura(hoy, '2026-11', min), V = pryVentas();
    return { C: C, ant: pryAcum(V, '2026-11', C.lim, C.min, C).equipo, st: V.filter(function (x) { return /CAROLA/i.test(x.v); }).map(function (x) { return x.st; })[0] };
  }, { hoy, min });

  // 1 · Apagado: noviembre (hoy 17/11) y el 30/11
  let page = await abrir('2026-11-17T10:00:00-04:00');
  let r = await page.evaluate(() => ({ C: pryCorteAltura('2026-11-17', '2026-10', 600), C30: pryCorteAltura('2026-11-30', '2026-10', 600), on: pryDomActivo('2026-11-30'), on1: pryDomActivo('2026-12-01'),
    txt: pryCorteTxt(pryCorteAltura('2026-11-17', '2026-10', 600), '10:00') }));
  chk('1a apagado hasta el 30/11: el corte no trae `dom` y el texto es el de siempre', r.C.dom === undefined && r.C30.dom === undefined && !r.on && r.on1 && !/domingo/.test(r.txt), r);
  const g1 = G.waVbCorte_('2026-11-17', '2026-10', 600), g30 = G.waVbCorte_('2026-11-30', '2026-10', 600);
  chk('1b el .gs igual: sin `dom` antes del 01/12 (y el corte da lo mismo que la página)', g1.dom === undefined && JSON.stringify(g1) === JSON.stringify(r.C) && JSON.stringify(g30) === JSON.stringify(r.C30), [g1, r.C]);
  await page._ctx.close();

  // 2 · Lunes 07/12 a las 10:00: 1 domingo en diciembre → del otro mes, su 1.er domingo (Banzer: el 08/11)
  page = await abrir('2026-12-07T10:00:00-04:00');
  r = await cuenta('2026-12-07', 600)(page);
  chk('2a el corte del 07/12: los mismos 6 días hábiles (hasta el 09/11) y 1 domingo', r.C.lim === '2026-11-09' && r.C.dom === 1 && r.C.domMin === null && r.C.domCmp === 1, r.C);
  chk('2b Carola en noviembre es de la Tienda Banzer (`x.st`)', r.st === 'Tienda Banzer', r.st);
  chk('2c entra el 1.er domingo (01/11, las dos), el día hábil y el 1.er domingo de la Banzer (08/11); NO el 2.º domingo de Mirian (08/11): Bs 5.100 (antes 7.100)', Math.abs(r.ant.bs - 5100) < 0.01, r.ant);
  chk('2d lo vendido en domingo del otro mes: Bs 4.600 (01/11 y el 08/11 de la Banzer)', Math.abs(r.ant.dbs - 4600) < 0.01, r.ant);
  const D7 = G.waVbDatos_(LISTA, TS('2026-12-07', '10:00'));
  chk('2e el .gs (lunes, «cómo va cada vendedor») da lo mismo: noviembre a esta altura Bs 5.100', Math.abs(D7.eq.ant.bs - 5100) < 0.01, D7.eq.ant);
  // la línea de Domingos y el texto
  r = await page.evaluate(() => { UNLOCKED = true; showView('conta'); segSet('cta-tab', 'proy'); setContaTab('proy'); document.getElementById('pry-mes').value = '2026-12'; renderProyeccion();
    var b = document.getElementById('pry-altura-box'), d = b && b.querySelector('.pry-dom'); return { t: b ? b.innerText.replace(/\s+/g, ' ') : '', d: d ? d.innerText.replace(/\s+/g, ' ') : '(sin .pry-dom)' }; });
  chk('2f «A esta altura» dice «Domingos: Bs 700 en 1 domingo; noviembre Bs 4.600 en 1 domingo (el 1.er domingo contra el 1.er domingo)»', /Domingos: Bs 700 en 1 domingo; noviembre Bs 4\.600 en 1 domingo \(el 1\.er domingo contra el 1\.er domingo\)/.test(r.d), r.d);
  chk('2g el texto del corte suma «y su primer domingo» y «Cómo funciona» explica los domingos', /días hábiles y su primer domingo/.test(r.t) && /Los domingos van aparte/.test(r.t), r.t.slice(0, 900));
  await page._ctx.close();

  // 3 · Domingo 06/12 a las 10:00: el 1.er domingo del otro mes hasta las 10:00
  page = await abrir('2026-12-06T10:00:00-04:00');
  r = await cuenta('2026-12-06', 600)(page);
  chk('3a domingo 06/12: hasta el 08/11 entero en días hábiles, 1 domingo hasta las 10:00', r.C.lim === '2026-11-08' && r.C.dom === 1 && r.C.domMin === 600, r.C);
  chk('3b entra la del 01/11 a las 09:00 (no la de las 11:00), el día hábil y la Banzer del 08/11 a las 10:00: Bs 4.500', Math.abs(r.ant.bs - 4500) < 0.01, r.ant);
  const D6 = G.waVbDatos_(LISTA, TS('2026-12-06', '10:00'));
  chk('3c el .gs da lo mismo: Bs 4.500', Math.abs(D6.eq.ant.bs - 4500) < 0.01, D6.eq.ant);

  // 4 · Página y .gs: el corte y «¿entra?» iguales todos los días de diciembre, con varias horas, tiendas y días de noviembre
  r = await page.evaluate(() => {
    var out = { cortes: {}, en: {} }, tiendas = ['Tienda Banzer', 'Mia Plaza', 'Central', ''], ms = [480, 600, 1439];
    for (var d = 1; d <= 31; d++) { var hoy = '2026-12-' + (d < 10 ? '0' : '') + d;
      [0, 600, 1439].forEach(function (mi) { var C = pryCorteAltura(hoy, '2026-11', mi); out.cortes[hoy + '|' + mi] = JSON.stringify(C);
        for (var e = 1; e <= 30; e++) { var f = '2026-11-' + (e < 10 ? '0' : '') + e;
          tiendas.forEach(function (st) { ms.forEach(function (m) { out.en[hoy + '|' + mi + '|' + f + '|' + st + '|' + m] = pryEnAltura({ reg: f, m: m, st: st }, C); }); }); } }); }
    return out;
  });
  const difC = Object.keys(r.cortes).filter(k => { const q = k.split('|'); return JSON.stringify(G.waVbCorte_(q[0], '2026-11', Number(q[1]))) !== r.cortes[k]; });
  chk('4a el corte de cada día de diciembre (con `dom`) da lo mismo en la página y en el .gs (' + Object.keys(r.cortes).length + ' casos)', difC.length === 0, difC.slice(0, 3));
  const difE = Object.keys(r.en).filter(k => { const q = k.split('|'); const C = G.waVbCorte_(q[0], '2026-11', Number(q[1])); return G.waEnAltura_({ reg: q[2], st: q[3], m: Number(q[4]) }, C) !== r.en[k]; });
  chk('4b «¿entra a esta altura?» da lo mismo en la página y en el .gs (' + Object.keys(r.en).length + ' casos)', difE.length === 0, difE.slice(0, 3));
  r = await page.evaluate(() => ({ d: PRY_DOM_DESDE, t: JSON.stringify(PRY_DOM_TIENDA) }));
  chk('4c las mismas constantes: desde el ' + r.d + ' y la Tienda Banzer desde el 02/11', r.d === G.WA_DOM_DESDE && r.t === JSON.stringify(G.WA_DOM_TIENDA), [r, G.WA_DOM_DESDE]);
  await page._ctx.close();

  chk('sin errores en la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
