/* 📶 LAS COMISIONES CON LOS ESCALONES EN Bs DE CADA VENDEDORA (17/11/2026; dueño: «Las comisiones están mal, calculas por % de presupuesto y
   mínimo. Nosotros se los asignamos cada mes»; mandó la tabla de cada vendedora de Heaven).

   Antes: el % salía de la escala de la MARCA (2 % desde la mínima, 2,75 % desde el presupuesto, 3 % desde el 120 % del presupuesto).
   Ahora cada vendedora puede tener SUS escalones en Bs (`vd[v][2] = [[Bs, %]…]`, en `__metas__`); noviembre arranca con las tablas del dueño
   (`CCM_TRAMOS_DUENO`). LO QUE ESTA PRUEBA CUIDA:
   1. Las tablas del dueño: Fabián 2 % desde 90.000 … 4 % desde 245.000; Carola desde 110.000; Isabel desde 100.000. El escalón justo y un
      centavo menos. La mínima = el primer escalón y el presupuesto = el del 2,75 %.
   2. El cierre comercial (`ccmFilas`) cobra con los escalones; Sueña (sin escalones) sigue con la escala de su marca.
   3. Lo guardado manda: una vendedora con escalones guardados usa esos; sin escalones guardados, los del dueño.
   4. El escalón siguiente (`ccmTramoSig`) y los escalones de la escalera (`comEscPasos`).
   5. El editor: lee «2 % desde 90.000 · 2,5 % desde 100.000» (y «90.000 = 2»), dice lo mal escrito, y arranca con los del dueño.
   6. El `.gs` calcula igual (`waCcmFilas_`, `waCcmMetas_`).
   7. Sin la bandera (`CCM_TRAMOS_PRUEBA`), las pruebas viejas no ven las tablas del dueño.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_comision_escalones.js   (PEDIDOS=… / GS=… para otras) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const KEY = v => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

const ctx = { console, Logger: { log() {} } }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);

const VENTAS = [
  ['Fabian Godoy', 'heaven', 120000], ['Andrea Orias', 'heaven', 104999.99], ['Carola Chavez', 'heaven', 130000], ['Isabel Robledo', 'heaven', 255000],
  ['Mirian Salazar', 'heaven', 94000], ['Maria Flores', 'heaven', 200000], ['Jonathan Monje', 'heaven', 150000], ['Mauricio Merida', 'suena', 100000]
];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const abrir = async (bandera) => {
    const bctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    const page = await bctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await bctx.route(/^https?:/, r => r.abort());
    if (bandera) await page.addInitScript(() => { window.CCM_TRAMOS_PRUEBA = 1; });
    await page.clock.setFixedTime(new Date('2026-11-17T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => { CONNECTED = false; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {} if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER); loadFromServer = function () {}; STATE = []; });
    page._c = bctx; return page;
  };
  const page = await abrir(true);

  console.log('\n── 1. Las tablas del dueño ──');
  let r = await page.evaluate(() => {
    const mt = ccmMetas('2026-11'), es = ccmEscala('2026-11'), H = es.esc.heaven;
    const em = v => ccmEmVend(H, ccmMetaDe(mt.vd, v)), pc = (v, bs) => { const m = ccmMetaDe(mt.vd, v); return ccmPctDe(em(v), bs, m[0], m[1]).pct; };
    return { ok: mt.ok, fab: ccmMetaDe(mt.vd, 'Fabián Godoy'), car: ccmMetaDe(mt.vd, 'Carola Chávez').slice(0, 2), isa: ccmMetaDe(mt.vd, 'Isabel Robledo')[2].map(t => t[0]),
      f: [pc('Fabian Godoy', 89999.99), pc('Fabian Godoy', 90000), pc('Fabian Godoy', 114999), pc('Fabian Godoy', 115000), pc('Fabian Godoy', 144999.99), pc('Fabian Godoy', 145000), pc('Fabian Godoy', 195000), pc('Fabian Godoy', 300000)],
      c: [pc('Carola Chavez', 109999), pc('Carola Chavez', 110000), pc('Carola Chavez', 130000), pc('Carola Chavez', 135000)],
      a: [pc('Andrea Orias', 94999), pc('Andrea Orias', 95000), pc('Andrea Orias', 250000)] };
  });
  chk('1a. noviembre tiene las metas (de las tablas del dueño) y Fabián con sus 6 escalones', r.ok && r.fab[2] && r.fab[2].length === 6 && JSON.stringify(r.fab[2][0]) === '[90000,2]' && JSON.stringify(r.fab[2][5]) === '[245000,4]', r.fab);
  chk('1b. la mínima = el primer escalón y el presupuesto = el del 2,75 % (Fabián 90.000 / 115.000; Carola 110.000 / 135.000)', r.fab[0] === 90000 && r.fab[1] === 115000 && r.car.join() === '110000,135000', [r.fab.slice(0, 2), r.car]);
  chk('1c. Isabel: 100.000 · 110.000 · 125.000 · 155.000 · 205.000 · 255.000', r.isa.join() === '100000,110000,125000,155000,205000,255000', r.isa);
  chk('1d. Fabián: un centavo antes de 90.000 = 0; 90.000 = 2 %; 114.999 = 2,5 %; 115.000 = 2,75 %; 144.999,99 = 2,75 %; 145.000 = 3 %; 195.000 = 3,5 %; 300.000 = 4 %', JSON.stringify(r.f) === '[0,2,2.5,2.75,2.75,3,3.5,4]', r.f);
  chk('1e. Carola (sus escalones son otros): 109.999 = 0; 110.000 = 2 %; 130.000 = 2,5 %; 135.000 = 2,75 %', JSON.stringify(r.c) === '[0,2,2.5,2.75]', r.c);
  chk('1f. Andrea (Banzer 1): 94.999 = 0; 95.000 = 2 %; 250.000 = 4 %', JSON.stringify(r.a) === '[0,2,4]', r.a);

  console.log('\n── 2. El cierre comercial ──');
  r = await page.evaluate((V) => {
    const mt = ccmMetas('2026-11'), es = ccmEscala('2026-11'); const KEY = v => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const ventas = V.map(([v, g, bs]) => ({ est: 'cuenta', v, g, u: 1, bs, ti: 0, tiFalta: [] }));
    const F = ccmFilas(ventas, [], mt, es), o = {};
    F.forEach(f => { o[KEY(f.v)] = { pc: f.pc, co: f.co, sub: ccmTramoTxt(f.tramo), tr: !!f.tr }; });
    return o;
  }, VENTAS);
  chk('2a. Fabián con Bs 120.000: 2,75 % = Bs 3.300 («desde Bs 115.000»)', r['Fabian Godoy'].pc === 2.75 && r['Fabian Godoy'].co === 3300 && /desde Bs 115\.000/.test(r['Fabian Godoy'].sub), r['Fabian Godoy']);
  chk('2b. Andrea con Bs 104.999,99: 2 % (no llegó al 2,5 % de 105.000)', r['Andrea Orias'].pc === 2, r['Andrea Orias']);
  chk('2c. Isabel con Bs 255.000: 4 %; Mirian con 94.000: 0 (no llegó a 95.000)', r['Isabel Robledo'].pc === 4 && r['Mirian Salazar'].pc === 0 && r['Mirian Salazar'].co === 0, [r['Isabel Robledo'], r['Mirian Salazar']]);
  chk('2d. Maria con 200.000 = 3,5 % y Jonathan con 150.000 = 3 % (antes, con la escala de la marca, otro %)', r['Maria Flores'].pc === 3.5 && r['Jonathan Monje'].pc === 3, [r['Maria Flores'], r['Jonathan Monje']]);
  chk('2e. Sueña (sin escalones) sigue con la escala de su marca', r['Mauricio Merida'] && !r['Mauricio Merida'].tr, r['Mauricio Merida']);

  console.log('\n── 3. Lo guardado manda ──');
  r = await page.evaluate(() => {
    STATE = [filaSistema(META_ID, 'x', JSON.stringify({ v: 1, m: { '2026-11': { heaven: 900000, suena: 300000, t: 1,
      vd: { 'Fabian Godoy': [80000, 100000, [[80000, 1], [100000, 5]]], 'Carola Chavez': [125000, 160000] } } } }))];
    const mt = ccmMetas('2026-11'), es = ccmEscala('2026-11'), H = es.esc.heaven;
    const f = ccmMetaDe(mt.vd, 'Fabian Godoy'), c = ccmMetaDe(mt.vd, 'Carola Chavez'), i = ccmMetaDe(mt.vd, 'Isabel Robledo');
    return { f, c, iTr: i[2] && i[2][0], pf: ccmPctDe(ccmEmVend(H, f), 100000, f[0], f[1]).pct, pc: ccmPctDe(ccmEmVend(H, c), 120000, c[0], c[1]).pct };
  });
  chk('3a. Fabián con escalones GUARDADOS: valen esos (5 % desde 100.000), no los del dueño', r.pf === 5 && r.f[0] === 80000, r);
  chk('3b. Carola guardada sin escalones: toma los del dueño (120.000 = 2,5 %)', r.pc === 2.5 && r.c[2] && r.c[2][0][0] === 110000, r);
  chk('3c. Isabel, que no estaba guardada: los del dueño', r.iTr && r.iTr[0] === 100000, r.iTr);
  await page.evaluate(() => { STATE = []; });

  console.log('\n── 4. El escalón siguiente y la escalera ──');
  r = await page.evaluate(() => {
    const mt = ccmMetas('2026-11'), H = ccmEscala('2026-11').esc.heaven, m = ccmMetaDe(mt.vd, 'Fabian Godoy'), em = ccmEmVend(H, m);
    const s1 = ccmTramoSig(em, 101000, m[0], m[1]), s2 = ccmTramoSig(em, 50000, m[0], m[1]), s3 = ccmTramoSig(em, 260000, m[0], m[1]);
    return { s1: s1 && [s1.desde, s1.falta, s1.pct], s2: s2 && [s2.desde, s2.pct], s3, pasos: comEscPasos(em, m[0], m[1]).map(p => [p.desde, p.pct]) };
  });
  chk('4a. con 101.000 le faltan 14.000 para el 2,75 % (115.000)', JSON.stringify(r.s1) === '[115000,14000,2.75]', r.s1);
  chk('4b. con 50.000, lo siguiente es 90.000 al 2 %; con 260.000 ya está en el más alto', JSON.stringify(r.s2) === '[90000,2]' && r.s3 === null, [r.s2, r.s3]);
  chk('4c. la escalera tiene sus 7 escalones (sin % hasta 90.000 y los 6 suyos)', JSON.stringify(r.pasos) === '[[0,0],[90000,2],[100000,2.5],[115000,2.75],[145000,3],[195000,3.5],[245000,4]]', r.pasos);

  console.log('\n── 5. El editor ──');
  r = await page.evaluate(() => ({
    a: ccmTramosLeer('2 % desde 90.000 · 2,5 % desde 100.000 · 2,75 % desde 115.000').tr,
    b: ccmTramosLeer('90.000 = 2\n100.000=2,5;  Bs 115.000 = 2,75 %').tr,
    c: ccmTramosLeer('2 % desde noventa mil').mal,
    d: ccmTramosLeer('').tr,
    e: ccmTramosTxt([[90000, 2], [100000, 2.5]])
  }));
  chk('5a. lee «2 % desde 90.000 · 2,5 % desde 100.000 · 2,75 % desde 115.000»', JSON.stringify(r.a) === '[[90000,2],[100000,2.5],[115000,2.75]]', r.a);
  chk('5b. también «90.000 = 2», uno por renglón o con «;»', JSON.stringify(r.b) === JSON.stringify(r.a), r.b);
  chk('5c. lo mal escrito lo dice; vacío = sin escalones; y se escribe «2 % desde 90.000 · 2,5 % desde 100.000»', /no se entiende/.test(r.c || '') && r.d === null && r.e === '2 % desde 90.000 · 2,5 % desde 100.000', r);
  r = await page.evaluate(() => {
    UNLOCKED = true; CONNECTED = true; ccmAbrir('2026-11'); ccmEdAbrir(); const i = CCM.ed.vs.map(o => normNombre(o.v)).indexOf(normNombre('Fabian Godoy'));
    const el = document.getElementById('ccm-tr-' + i);
    return { v: el ? el.value : null, mi: (document.getElementById('ccm-mi-' + i) || {}).value };
  });
  chk('5d. el editor del cierre comercial arranca con los escalones de Fabián y su mínima 90.000', /^2 % desde 90\.000 · 2,5 % desde 100\.000/.test(r.v || '') && /4 % desde 245\.000$/.test(r.v || '') && r.mi === '90.000', r);
  r = await page.evaluate(() => {
    let guardado = null; CONNECTED = true;
    apiList = () => Promise.resolve({ ok: true, pedidos: [] });
    apiSave = (f) => { guardado = JSON.parse(f.observaciones); return Promise.resolve({ ok: true, pedido: f }); };
    const i = CCM.ed.vs.map(o => normNombre(o.v)).indexOf(normNombre('Fabian Godoy'));
    document.getElementById('ccm-tr-' + i).value = '2 % desde 91.000 · 3 % desde 120.000';
    document.getElementById('ccm-mi-' + i).value = '';
    return ccmEdGuardar().then(() => ({ fab: guardado && ccmMetaDe(guardado.m['2026-11'].vd, 'Fabian Godoy'), mal: null }));
  });
  chk('5e. guardar deja [mínima, presupuesto, escalones] y sin mínima escrita la mínima es el primer escalón', r.fab && r.fab[0] === 91000 && JSON.stringify(r.fab[2]) === '[[91000,2],[120000,3]]', r.fab);
  r = await page.evaluate(() => {
    let msg = ''; const t0 = toast; toast = (m) => { msg = m; }; ccmAbrir('2026-11'); ccmEdAbrir();
    const i = CCM.ed.vs.map(o => normNombre(o.v)).indexOf(normNombre('Carola Chavez')); document.getElementById('ccm-tr-' + i).value = '2 % desde ciento diez';
    return ccmEdGuardar().then(() => { toast = t0; return msg; });
  });
  chk('5f. un escalón mal escrito no se guarda y lo dice', /Carola Chavez, escalones/.test(r || ''), r);
  await page.evaluate(() => { CCM.ed = null; STATE = []; });

  console.log('\n── 6. El servidor calcula igual ──');
  const srv = (() => {
    const M = {}, mt = ctx.waCcmMetas_(M, '2026-11'), es = ctx.waCcmEscala_(M, '2026-11');
    const ventas = VENTAS.map(([v, g, bs]) => ({ est: 'cuenta', v, g, bs, ti: 0, tiFalta: 0 }));
    const o = {}; ctx.waCcmFilas_(ventas, [], mt, es).forEach(f => { o[KEY(f.v)] = [f.pc, f.co]; }); return o;
  })();
  const pag = await page.evaluate((V) => {
    const mt = ccmMetas('2026-11'), es = ccmEscala('2026-11'); const KEY = v => String(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const o = {}; ccmFilas(V.map(([v, g, bs]) => ({ est: 'cuenta', v, g, u: 1, bs, ti: 0, tiFalta: [] })), [], mt, es).forEach(f => { o[KEY(f.v)] = [f.pc, f.co]; }); return o;
  }, VENTAS);
  const dist = VENTAS.map(x => x[0]).filter(v => JSON.stringify(pag[v]) !== JSON.stringify(srv[v]));
  chk('6a. el % y la comisión de cada vendedora dan igual en la página y en el .gs', !dist.length, { dist, pag, srv });
  chk('6b. el .gs con escalones guardados también manda lo guardado', (() => { const M = { '2026-11': { vd: { 'Fabian Godoy': [80000, 100000, [[80000, 1], [100000, 5]]] } } };
    const mt = ctx.waCcmMetas_(M, '2026-11'), es = ctx.waCcmEscala_(M, '2026-11'), m = ctx.waCcmMetaDe_(mt.vd, 'Fabian Godoy');
    return ctx.waCcmPctDe_(ctx.waCcmEmVend_(es.esc.heaven, m), 100000, m[0], m[1]).pct === 5; })());
  await page._c.close();

  console.log('\n── 7. Sin la bandera ──');
  const p2 = await abrir(false);
  r = await p2.evaluate(() => { const mt = ccmMetas('2026-11'); return { ok: mt.ok, tr: ccmMetaDe(mt.vd, 'Fabian Godoy')[2] }; });
  chk('7a. las pruebas viejas no ven las tablas del dueño (siguen con sus metas de prueba)', !r.ok && !r.tr, r);
  await p2._c.close();

  chk('8. sin errores de JavaScript', !errores.length, errores[0]);
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})();
