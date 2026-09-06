/* 👯 LA TABLA DE DUPLICADOS DEL PANEL TIENE QUE DECIR CUÁL FICHA ES DE QUIÉN.

   Misma falla que la del aviso de duplicadas de pedidos (bitácora §4cd), en el otro
   panel: la tabla decía «Isabel Robledo · Mirian Salazar» en una columna y
   «Agendado/Visita · Compradores» en otra, y no había forma de saber cuál ficha era
   de quién sin abrir las dos en Kommo. Y con una sola vendedora mostraba su nombre
   una sola vez, que se leía como si el duplicado fuera con otra persona.

   ⚠️ LO QUE ESTE TEST CUIDA: que la tabla alcance para resolverlo sin salir a buscar,
   y que separe los dos casos, porque NO son el mismo problema:
     · Choque         → dos vendedoras sobre el mismo cliente (disputa de cartera).
     · Auto-duplicado → una vendedora duplicando su propia ficha (forma de registrar).

   Arma un panel con el template de verdad y datos de mentira, y lo mira en Chromium.

   Se corre:  node tests/test_paneldup.js   (desde la raíz del repo) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + e) : ''); };

const RAIZ = path.join(__dirname, '..');

const DATOS = {
  month: "Agosto", year: 2026, prevMonth: "Julio", curDay: 31, daysInMonth: 31,
  updated: "31/08 15:45", archives: [{ label: "Agosto 2026", url: "#" }],
  kommoBase: "https://eanez.kommo.com",
  global: { leads: 100, prevLeads: 90, cierres: 10, pipeline: 1000, cerrado: 900, ticket: 90, unidades: 11 },
  metrics: {
    promPrimera: "10 min", promPrimeraMin: 10, respWeekly: [1, 1, 1, 1, 1], respPct: 90,
    noResp: 5, noRespPct: 5, backlog: 10, backlogPct: 10, criticos7d: 2, nuncaTocados: 0,
    sinSucursalFichas: 0, sinSucursalPct: 0, abiertosSinValor: 3, abiertosSinValorPct: 3,
    duplicadosTel: 2, duplicadosFichas: 4, duplicadosChoques: 1, duplicadosAuto: 1,
    interesado: 1, agendado: 1, cotizaciones: 1, leadsEnHorario: 50, leadsFueraHorario: 50,
    leadsHorarioPorSuc: [], leadsEnHorarioFijo: 50, leadsFueraHorarioFijo: 50
  },
  dupRows: [
    { phone: "+591 70407799", phoneNorm: "70407799", fichas: 2, tipo: "Choque",
      vendedoras: "Carola Chavez · Isabel Robledo", etapas: "Agendado / Visita · Compradores",
      leadIds: [38575888, 38956404], estado: "Fusionar",
      detalle: [{ id: 38575888, vend: "Carola Chavez", etapa: "Agendado / Visita" },
                { id: 38956404, vend: "Isabel Robledo", etapa: "Compradores" }] },
    { phone: "77099803", phoneNorm: "77099803", fichas: 2, tipo: "Auto-duplicado",
      vendedoras: "Maria Flores", etapas: "Compradores",
      leadIds: [33803894, 33804426], estado: "Fusionar",
      detalle: [{ id: 33803894, vend: "Maria Flores", etapa: "Compradores" },
                { id: 33804426, vend: "Maria Flores", etapa: "Compradores" }] }
  ],
  leadsMomPct: 11,
  // el panel calcula la que más cierra sobre D.team, así que no puede ir vacío
  team: [{ ini: "IR", name: "Isabel Robledo", suc: "Central", color: "#00B5AD", leads: 50, cierres: 6 },
         { ini: "MF", name: "Maria Flores", suc: "Buenos Aires", color: "#D98300", leads: 50, cierres: 4 }],
  funnel: [], funnel2: [], stagesGlobal: [], stagesByV: {},
  origin: [], channels: [], lossReasons: [], backlogRows: [], alerts: [],
  nav: [{ id: "resumen", label: "Resumen" }, { id: "datos", label: "Datos" }],
  productos: { total: 0, conProducto: 0, sinProducto: 0, items: [] }, history: [], wsp: {}
};

(async () => {
  const tpl = fs.readFileSync(path.join(RAIZ, 'panel_template.html'), 'utf8');
  const html = tpl.replace('__PANEL_DATA__', 'window.PANEL_DATA = ' + JSON.stringify(DATOS) + ';');
  const tmp = path.join(os.tmpdir(), 'panel_dup_test.html');
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.stack || e.message));
  // la tabla de duplicados vive en la vista "Datos"; el panel recuerda la vista en
  // localStorage, así que se abre ahí directo sin pasar por el resumen
  await page.addInitScript(() => localStorage.setItem('heaven_view', 'datos'));
  await page.goto('file://' + tmp);
  await page.waitForTimeout(1400);
  chk('la vista de calidad de datos abre', /Salud del CRM|Duplicados/i.test(await page.evaluate(() => document.body.innerText)));

  const txt = await page.evaluate(() => document.body.innerText);

  chk('el panel carga sin errores de JavaScript', errors.length === 0, errors[0]);
  chk('la tabla tiene la columna que dice de quién es cada ficha', /Qui[eé]n tiene cada ficha/i.test(txt));

  // ── el choque: las dos vendedoras Y su etapa, cada una en su renglón ──
  chk('el choque se marca como Choque', /Choque/.test(txt));
  chk('y aclara que son dos vendedoras', /dos vendedoras/.test(txt));
  chk('nombra a Carola con SU etapa', /Carola Chavez\s*·\s*Agendado \/ Visita/.test(txt), txt.match(/Carola[^\n]*/));
  chk('nombra a Isabel con SU etapa', /Isabel Robledo\s*·\s*Compradores/.test(txt), txt.match(/Isabel[^\n]*/));

  // ── el auto-duplicado: no se lee como si fuera con otra persona ──
  chk('la vendedora que se duplica sola se marca Auto-duplicado', /Auto-duplicado/.test(txt));
  chk('y aclara que es la misma vendedora', /la misma vendedora/.test(txt));
  const flores = (txt.match(/Maria Flores/g) || []).length;
  chk('Maria Flores aparece una vez por cada ficha suya, no una sola', flores >= 2, flores + ' veces');

  // ── cada nombre lleva a SU ficha, no todos a la primera del grupo ──
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a.lead-link')].map(a => a.getAttribute('href')));
  chk('el nombre de cada vendedora abre su propia ficha',
    hrefs.includes('https://eanez.kommo.com/leads/detail/38575888') &&
    hrefs.includes('https://eanez.kommo.com/leads/detail/38956404'),
    hrefs.join(' '));

  // ── el resumen de la tarjeta separa los dos casos ──
  chk('el encabezado dice cuántos son choques y cuántos auto-duplicados',
    /1 es un choque entre dos vendedoras/.test(txt) &&
    /1 es la misma vendedora duplicando su propia ficha/.test(txt));
  chk('la nota al pie avisa que el número se compara normalizado', /normalizado/.test(txt));

  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
