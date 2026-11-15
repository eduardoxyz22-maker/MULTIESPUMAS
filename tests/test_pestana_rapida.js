/* 🚀 296 · CAMBIAR DE PESTAÑA SIN ESPERAR A GOOGLE (15/11, dueño: aprobado; «nunca mostrar algo más viejo que la última lectura
   buena sin decirlo»).

   Antes: Contabilidad esperaba la planilla para dibujar (2-3 s con la tabla vacía aunque se hubiera leído hace segundos); Mis pedidos
   y Administración dibujaban, leían y volvían a dibujar todo. Ahora las tres hacen lo de ATC (§4ea): dibujan al instante con lo
   leído; con una lectura de menos de 1 minuto no piden otra; si la que llega es igual (`LECTURA_IGUAL`) no redibujan.

   Lo que se mira (con un servidor de mentira que contesta cuando la prueba quiere):
     1. Sin la bandera (`PES_RAPIDA_PRUEBA`) Contabilidad espera la lectura para dibujar, como siempre.
     2. Contabilidad con la bandera y una lectura de hace 2 min: dibuja YA (antes de que conteste Google), lee UNA vez y lo dice
        («Actualizando… lo que ves es lo leído a las 09:58»); si llega igual, no redibuja y el cartel se va.
     3. Con una lectura de hace segundos, volver a Contabilidad no le pide nada a Google.
     4. Si llega con un cambio, redibuja y lo nuevo aparece.
     5. Si la lectura falla, lo dice: «📴 No se pudo actualizar: lo que ves es lo leído a las …» con «Volver a intentar».
     6. Sin ninguna lectura buena todavía (solo la copia del aparato), espera a Google como siempre.
     7. 🔄 Actualizar lee siempre, aunque se haya leído recién.
     8. Mis pedidos y Administración: dibujan una vez, leen una vez si hace falta y no redibujan si llegó igual; con la lectura de
        hace segundos, no leen.

   Datos SINTÉTICOS. Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_pestana_rapida.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR() {
  try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
  CONNECTED = true;
  apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); };
  flushPending = function () { return Promise.resolve(); };
  var P = function (id, cli) {
    return { id: id, oc: '11-' + id.replace(/\D/g, ''), nota: '45' + id.replace(/\D/g, ''), vendedor: 'Isabel Robledo', cliente: cli, celular: '70001234',
      fecha: '2026-11-18', turno: 'AM', zona: 'NORTE', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO ICE', codigo: 'CH1220', medida: '140x190', cant: 1, precio: 2000 }],
      acuenta: 500, saldo: 1500, pagado: false, metodoPago: '~Efectivo 500 @2026-11-10 #4400', entregado: false, ts: new Date('2026-11-10T10:00:00-04:00').getTime(), facturarA: '', nit: '' };
  };
  window.BASE = [P('p101', 'ANA ROJAS'), P('p102', 'BETO PEREZ'), P('p103', 'CARLA GOMEZ')];
  window.NUEVO = P('p104', 'DORA NUEVA');
  STATE = JSON.parse(JSON.stringify(BASE));
  UNLOCKED = true;
  document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
  document.getElementById('mis-vendedor').value = 'Isabel Robledo';
  REFRESCO_EN_VUELO = null;   // la lectura del arranque (sin red) no cuenta
  window.__api = { n: 0, pend: [] };
  apiList = function () { __api.n++; return new Promise(function (res, rej) { __api.pend.push({ res: res, rej: rej }); }); };
  window._contestar = function (igual, conNuevo) { var L = JSON.parse(JSON.stringify(BASE)); if (conNuevo) L.push(JSON.parse(JSON.stringify(NUEVO))); if (igual) L._igual = true; var q = __api.pend.splice(0); q.forEach(function (x) { x.res({ ok: true, pedidos: L }); }); };
  window._fallar = function () { var q = __api.pend.splice(0); q.forEach(function (x) { x.rej(new Error('Failed to fetch')); }); };
  window.__n = { adm: 0, cta: 0, mis: 0 };
  var rA = renderAdmin, rC = renderConta, rM = renderMis;
  renderAdmin = function () { __n.adm++; return rA.apply(this, arguments); };
  renderConta = function () { __n.cta++; return rC.apply(this, arguments); };
  renderMis = function () { __n.mis++; return rM.apply(this, arguments); };
  window._cero = function () { __n.adm = 0; __n.cta = 0; __n.mis = 0; __api.n = 0; };
  window._ctaFilas = function () { return document.querySelectorAll('#tbl-conta tbody tr').length; };
  window._aviso = function () { var e = document.getElementById('pes-av-conta'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._hace = function (ms) { ULTIMO_REFRESCO = Date.now() - ms; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(flag) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.PES_RAPIDA_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => { showViewAhora('form'); _contestar(true); });   // el formulario lee al entrar: que conteste
    await page.waitForTimeout(60);
    await page.evaluate(() => { _cero(); });
    return { ctx, page };
  }
  const paso = (page, fn) => page.evaluate(fn).then(() => page.waitForTimeout(80));

  // ═══ 1. sin la bandera ═══
  let { ctx, page } = await abrir(false);
  await paso(page, () => { _hace(120000); showView('conta'); });
  let r = await page.evaluate(() => ({ n: __n.cta, api: __api.n, filas: _ctaFilas() }));
  chk('1 sin la bandera: Contabilidad espera a Google para dibujar (como siempre)', r.n === 0 && r.api === 1 && r.filas === 0, r);
  await page.evaluate(() => _contestar(false)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.cta, filas: _ctaFilas() }));
  chk('1b …y dibuja cuando contesta', r.n >= 1 && r.filas === 3, r);
  await ctx.close();

  // ═══ 2-7. Contabilidad con la bandera ═══
  ({ ctx, page } = await abrir(true));
  await paso(page, () => { _hace(120000); showView('conta'); });
  r = await page.evaluate(() => ({ n: __n.cta, api: __api.n, filas: _ctaFilas(), av: _aviso(), hora: hhmmDeTs(ULTIMO_REFRESCO) }));
  chk('2a dibuja YA, antes de que Google conteste', r.n === 1 && r.filas === 3, r);
  chk('2b …y lee una vez atrás', r.api === 1, r.api);
  chk('2c …diciendo de cuándo es lo que se ve («Actualizando… lo leído a las ' + r.hora + '»)', r.av.indexOf('Actualizando') >= 0 && r.av.indexOf(r.hora) >= 0, r.av);
  await page.evaluate(() => _contestar(true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.cta, av: _aviso(), igual: LECTURA_IGUAL }));
  chk('2d llegó igual: no redibuja y el cartel se va', r.n === 1 && r.igual && r.av === '', r);
  // 3. fresca
  await paso(page, () => { _cero(); showView('mis'); showView('conta'); });
  r = await page.evaluate(() => ({ n: __n.cta, api: __api.n, av: _aviso() }));
  chk('3 con la lectura de recién, volver a Contabilidad no le pide nada a Google (y dibuja una vez)', r.api === 0 && r.n === 1 && r.av === '', r);
  // 4. con cambio
  await paso(page, () => { _cero(); _hace(90000); showView('mis'); showView('conta'); });
  await page.evaluate(() => _contestar(false, true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.cta, filas: _ctaFilas(), api: __api.n }));
  chk('4 llegó con un cambio: redibuja y aparece lo nuevo', r.n === 2 && r.filas === 4, r);
  // 5. falla
  await paso(page, () => { _cero(); _hace(300000); showView('mis'); __n.cta = 0; __api.n = 0; showView('conta'); });
  await page.evaluate(() => _fallar()); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ av: _aviso(), hora: hhmmDeTs(ULTIMO_REFRESCO), filas: _ctaFilas() }));
  chk('5 si falla lo dice, con la hora de lo que se ve y «Volver a intentar»', /No se pudo actualizar/.test(r.av) && r.av.indexOf(r.hora) >= 0 && /Volver a intentar/.test(r.av) && r.filas === 4, r);
  // 7. 🔄 Actualizar lee siempre
  await page.evaluate(() => _contestar(true));
  await paso(page, () => { _cero(); ULTIMO_REFRESCO = Date.now(); refreshConta(); });
  r = await page.evaluate(() => ({ api: __api.n }));
  chk('7 🔄 Actualizar lee aunque se haya leído recién', r.api === 1, r);
  await page.evaluate(() => _contestar(true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ av: _aviso() }));
  chk('7b …y el cartel de error de antes se va', r.av === '', r);

  // ═══ 8. Mis pedidos y Administración ═══
  await paso(page, () => { _cero(); _hace(120000); showView('mis'); });
  r = await page.evaluate(() => ({ n: __n.mis, api: __api.n, est: (document.getElementById('mis-estado') || {}).innerText || '' }));
  chk('8a Mis pedidos: dibuja una vez y lee una vez («Buscando tus pedidos…»)', r.n === 1 && r.api === 1 && /Buscando/.test(r.est), r);
  await page.evaluate(() => _contestar(true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.mis, est: (document.getElementById('mis-estado') || {}).innerText || '' }));
  chk('8b …llegó igual: no redibuja', r.n === 1 && r.est === '', r);
  await paso(page, () => { _cero(); showView('conta'); showView('mis'); });
  r = await page.evaluate(() => ({ n: __n.mis, api: __api.n }));
  chk('8c con la lectura de recién, no lee', r.api === 0 && r.n === 1, r);
  await paso(page, () => { _cero(); _hace(120000); showView('admin'); });
  r = await page.evaluate(() => ({ n: __n.adm, api: __api.n }));
  chk('8d Administración: dibuja una vez y lee una vez', r.n === 1 && r.api === 1, r);
  await page.evaluate(() => _contestar(true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.adm }));
  chk('8e …llegó igual: no redibuja', r.n === 1, r);
  await paso(page, () => { _cero(); showView('conta'); showView('admin'); });
  r = await page.evaluate(() => ({ n: __n.adm, api: __api.n }));
  chk('8f con la lectura de recién, no lee', r.api === 0 && r.n === 1, r);
  await paso(page, () => { _cero(); showView('conta'); });
  await paso(page, () => { _cero(); _hace(120000); showView('admin'); });
  await page.evaluate(() => _contestar(false, true)); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ n: __n.adm, nuevo: /DORA NUEVA/.test(document.getElementById('view-admin').innerText) }));
  chk('8g Administración con un cambio: redibuja y aparece', r.n === 2 && r.nuevo, r);
  await ctx.close();

  // ═══ 6. sin ninguna lectura buena: espera como siempre ═══
  ({ ctx, page } = await abrir(true));
  await paso(page, () => { ULTIMO_REFRESCO = 0; showView('conta'); });
  r = await page.evaluate(() => ({ n: __n.cta, api: __api.n, filas: _ctaFilas() }));
  chk('6 sin ninguna lectura buena (la copia del aparato), Contabilidad espera a Google', r.n === 0 && r.api === 1 && r.filas === 0, r);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
