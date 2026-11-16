/* 🏆 EL BONO TITANIO CON LA FOTO DEL LUNES: la página y el servidor dicen LO MISMO (2026-11-16-a, mejora 376 b; regla del dueño «1A, 2B»).

   La regla vive en la página (`alDiaBonoCumple`, `alDiaSemLunesDelMes`, `ccmBonoRegla`) y está COPIADA en el `.gs` para el cierre del mes
   del día 1 (`waAlDiaBonoCumple_`, `waAlDiaLunesDelMes_`, `waCcmBonoRegla_`). Esta prueba corre las dos con los MISMOS casos (fotos SINTÉTICAS)
   y compara lo que deciden: si rige, si cobra, si llegó a la mínima, qué lunes estaba en rojo, qué lunes no tienen foto.
   1. Los lunes de cada mes (nov/2026 a dic/2027) dan igual.
   2. 30 casos: antes del 23/11, noviembre con 2 lunes, diciembre con 4, en rojo, ámbar (no cuenta), sin foto, sin mínima, mínima justa (el
      centavo), el nombre con y sin tildes, un lunes que todavía no llegó.
   3. `waCcmBonoRegla_` pone el bono en 0 con la razón y el total baja lo mismo; sin foto en rojo no toca nada; un mes que no rige no toca nada.
   Se corre:  node tests/test_bono_al_dia_gs.js   (GS=<otro .gs> o PEDIDOS=<otra página> para probar contra otras) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const GS = process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs');
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

/* El servidor: solo sus funciones puras (no se llama a ningún servicio de Google al cargar). */
const ctx = { console, Logger: { log() {} } };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx);

const F = (por) => ({ t: 1, f: 'x', por });
const FOTOS = {
  '2026-11-23': F({ 'Isabel Robledo': { r: 0, d: '' }, 'Jonathan Monje': { r: 1, d: 'Factura (2 ventas sin N°)' }, 'Carola Chávez': { r: 0, d: '' }, 'Maria Flores': { r: 0, d: '' } }),
  '2026-11-30': F({ 'Isabel Robledo': { r: 0, d: '' }, 'Jonathan Monje': { r: 0, d: '' }, 'Maria Flores': { r: 1, d: 'Ubicaciones (3)' } }),
  '2026-12-07': F({ 'Isabel Robledo': { r: 0, d: '' }, 'Carola Chavez': { r: 1, d: 'Kommo (5 sin cargar)' } }),
  '2026-12-14': F({ 'Isabel Robledo': { r: 0, d: '' } }),
  '2026-12-21': F({ 'Isabel Robledo': { r: 1, d: 'Efectivo' } }),
};
const CASOS = [];
['2026-11-20', '2026-11-23', '2026-11-24', '2026-12-01', '2026-12-10', '2026-12-31', '2027-01-02'].forEach(hoy => {
  [['Isabel Robledo', 130000, 120000], ['Jonathan Monje', 90000, 125000], ['Jonathan Monje', 130000, 125000], ['carola chavez', 50000, 0],
   ['Maria Flores', 100000, 100000.004], ['Fabián Godoy', 10, 5]].forEach(([v, bs, mi]) => {
    ['2026-11', '2026-12'].forEach(ym => { if (ym <= hoy.slice(0, 7)) CASOS.push({ v, ym, bs, mi, hoy }); });
  });
});
const corta = o => ({ rige: o.rige, ok: o.ok, min: o.min, rojo: o.rojo, semanas: o.semanas, sinFoto: o.sinFoto });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const bctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, timezoneId: 'America/La_Paz' });
  const page = await bctx.newPage();
  await bctx.route(/^https?:/, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-12-01T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  console.log('\n── 1. Los lunes de cada mes ──');
  const meses = []; for (let y = 2026, m = 11; y < 2028; ) { meses.push(y + '-' + String(m).padStart(2, '0')); m++; if (m > 12) { m = 1; y++; } }
  const lunesPag = await page.evaluate(M => M.map(ym => alDiaSemLunesDelMes(ym)), meses);
  const lunesSrv = meses.map(ym => Array.from(ctx.waAlDiaLunesDelMes_(ym)));
  chk('1a. los lunes de nov/2026 a dic/2027 son los mismos', JSON.stringify(lunesPag) === JSON.stringify(lunesSrv), { nov: lunesSrv[0], dic: lunesSrv[1] });
  chk('1b. noviembre de 2026: 2, 9, 16, 23 y 30', JSON.stringify(lunesSrv[0]) === JSON.stringify(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']), lunesSrv[0]);

  console.log('\n── 2. La regla, caso por caso ──');
  const pag = await page.evaluate(({ C, FO }) => C.map(c => { const o = alDiaBonoCumple(FO, c.v, c.ym, c.bs, c.mi, c.hoy); return { rige: o.rige, ok: o.ok, min: o.min, rojo: o.rojo, semanas: o.semanas, sinFoto: o.sinFoto }; }), { C: CASOS, FO: FOTOS });
  let distintos = [];
  CASOS.forEach((c, i) => {
    const s = corta(JSON.parse(JSON.stringify(ctx.waAlDiaBonoCumple_(FOTOS, c.v, c.ym, c.bs, c.mi, c.hoy))));
    if (JSON.stringify(s) !== JSON.stringify(pag[i])) distintos.push({ c, pag: pag[i], srv: s });
  });
  chk('2a. los ' + CASOS.length + ' casos dan lo mismo en la página y en el servidor', !distintos.length, distintos.slice(0, 2));
  const S = (v, ym, bs, mi, hoy) => JSON.parse(JSON.stringify(ctx.waAlDiaBonoCumple_(FOTOS, v, ym, bs, mi, hoy)));
  let o = S('Isabel Robledo', '2026-11', 130000, 120000, '2026-11-20');
  chk('2b. antes del 23/11 no rige: cobra como siempre', !o.rige && o.ok, o);
  o = S('Jonathan Monje', '2026-11', 130000, 125000, '2026-12-01');
  chk('2c. Jonathan en noviembre: llegó a la mínima pero el 23/11 estaba en rojo → sin bono, con la razón', o.rige && !o.ok && o.min && o.rojo && o.rojo.lun === '2026-11-23' && /23\/11/.test(o.razon), o);
  o = S('Isabel Robledo', '2026-11', 130000, 120000, '2026-12-01');
  chk('2d. Isabel en noviembre: las dos fotos al día y la mínima → cobra', o.rige && o.ok && o.semanas.length === 2, o);
  o = S('carola chavez', '2026-11', 50000, 0, '2026-12-01');
  chk('2e. Carola: el nombre sin tildes encuentra «Carola Chávez»; sin mínima (0) cuenta como que llegó; el 30/11 sin foto no castiga', o.ok && o.min && o.sinFoto.join() === '2026-11-30', o);
  o = S('Maria Flores', '2026-11', 100000, 100000.004, '2026-12-01');
  chk('2f. la mínima justa (al centavo) cuenta como que llegó; el 30/11 en rojo saca el bono', o.min && !o.ok && o.rojo.lun === '2026-11-30', o);
  o = S('Isabel Robledo', '2026-12', 130000, 120000, '2026-12-10');
  chk('2g. diciembre mirado el 10/12: solo los lunes que ya pasaron (7/12)', o.rige && o.semanas.map(x => x.lun).join() === '2026-12-07', o);
  o = S('Isabel Robledo', '2026-12', 130000, 120000, '2026-12-31');
  chk('2h. diciembre al final: el 21/12 en rojo saca el bono', !o.ok && o.rojo.lun === '2026-12-21', o);

  console.log('\n── 3. El bono en el cierre (`waCcmBonoRegla_`) ──');
  const fila = { id: '__al_dia_sem__', observaciones: JSON.stringify({ v: 1, s: FOTOS }) };
  const filas = () => [
    { v: 'Jonathan Monje', bs: 130000, mi: 125000, co: 2600, bo: 300, ajCom: 0, ajBono: 0, to: 2900 },
    { v: 'Isabel Robledo', bs: 130000, mi: 120000, co: 2600, bo: 200, ajCom: 0, ajBono: 0, to: 2800 },
    { v: 'Carola Chavez', bs: 50000, mi: 0, co: 0, bo: 0, ajCom: 0, ajBono: 0, to: 0 },
  ];
  let R = filas(); ctx.waCcmBonoRegla_(R, fila, '2026-11', '2026-12-01'); R = JSON.parse(JSON.stringify(R));
  chk('3a. Jonathan: bono 0, el total baja lo mismo (2.900 → 2.600) y queda lo que habría sido y por qué', R[0].bo === 0 && R[0].to === 2600 && R[0].boSin === 300 && /rojo/.test(R[0].boRazon), R[0]);
  chk('3b. Isabel: el bono queda (200) y el total igual', R[1].bo === 200 && R[1].to === 2800 && !R[1].boSin, R[1]);
  const Pg = await page.evaluate(({ FO }) => {
    window.AL_DIA_BONO_PRUEBA = 1;
    STATE = (STATE || []).filter(p => String(p.id) !== '__al_dia_sem__');
    STATE.push({ id: '__al_dia_sem__', fecha: '', cliente: '✅ PANEL AL DÍA', rev: 1, observaciones: JSON.stringify({ v: 1, s: FO }) });
    const R = [
      { v: 'Jonathan Monje', bs: 130000, mi: 125000, co: 2600, bo: 300, ajCom: 0, ajBono: 0, to: 2900 },
      { v: 'Isabel Robledo', bs: 130000, mi: 120000, co: 2600, bo: 200, ajCom: 0, ajBono: 0, to: 2800 },
      { v: 'Carola Chavez', bs: 50000, mi: 0, co: 0, bo: 0, ajCom: 0, ajBono: 0, to: 0 },
    ];
    ccmBonoRegla(R, '2026-11', '2026-12-01');
    return R.map(r => ({ bo: r.bo, to: r.to, boSin: r.boSin || 0 }));
  }, { FO: FOTOS });
  chk('3c. la página y el servidor dejan el mismo bono, el mismo total y lo mismo sin cobrar', JSON.stringify(Pg) === JSON.stringify(R.map(r => ({ bo: r.bo, to: r.to, boSin: r.boSin || 0 }))), { Pg });
  R = filas(); ctx.waCcmBonoRegla_(R, fila, '2026-10', '2026-12-01'); R = JSON.parse(JSON.stringify(R));
  chk('3d. un mes que no rige (octubre) no toca nada', R[0].bo === 300 && R[0].to === 2900 && !R[0].boRegla, R[0]);
  R = filas(); ctx.waCcmBonoRegla_(R, null, '2026-11', '2026-12-01'); R = JSON.parse(JSON.stringify(R));
  chk('3e. sin ninguna foto: rige, pero un lunes sin foto no castiga (los bonos quedan)', R[0].bo === 300 && R[1].bo === 200 && R[0].boRegla && R[0].boRegla.sinFoto.length === 2, R[0].boRegla);

  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
