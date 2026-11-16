/* ◀ ▶ 297 · LA SIGUIENTE SIN CERRAR LA FICHA (15/11, dueño: aprobado).

   De las 154 ventas de noviembre, Contabilidad marcó 62 «Registrado» y anotó 85 N° de factura o remisión: cada una era abrir, tocar,
   cerrar y buscar la siguiente; desde «Para hacer» de Mis pedidos la lista se cerraba al abrir una venta. Ahora la ficha de
   Contabilidad abierta DESDE UNA LISTA dice «◀ 3 de 69 ▶» y pasa a la de al lado sin cerrarse (también con ← →, con el foco fuera de un
   campo); en la fila del N°, «💾 Guardar N° y siguiente ▶».

   Lo que se mira:
     1. Sin la bandera (`CTA_NAV_PRUEBA`) la ficha es la de siempre (sin flechas).
     2. Desde la tabla de Ventas: «2 de 5 · en la lista de Ventas», en el orden de la tabla; ▶ / ◀ pasan; en la primera ◀ apagado y en
        la última ▶ apagado.
     3. ← → del teclado pasan; con el foco en un campo (el monto) no.
     4. Repintar la misma ficha (tocar un método de pago) no saca las flechas; abrir una venta desde otro lado (Cobranza, el buscador)
        no las trae.
     5. Desde «🧾 Sin N° de factura» de «Para hacer» (Mis pedidos): «1 de 3 · 🧾 Sin N° de factura o nota de remisión»; «💾 Guardar
        N° y siguiente ▶» guarda (lo de siempre) y pasa a la 2; sin número no pasa.
     6. Sin errores de la página.

   Datos SINTÉTICOS. Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_cta_nav.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR() {
  CONNECTED = false; try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
  apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); };
  var P = function (i, cli, o) {
    return Object.assign({ id: 'p' + i, oc: '11-' + (100 + i), nota: String(4500 + i), vendedor: 'Isabel Robledo', cliente: cli, celular: '7000123' + i,
      fecha: '2026-11-18', turno: 'AM', zona: 'NORTE', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO ICE', codigo: 'CH1220', medida: '140x190', cant: 1, precio: 2000 }],
      acuenta: 500, saldo: 1500, pagado: false, metodoPago: '~Efectivo 500 @2026-11-0' + i + ' #44' + i, entregado: false, ts: new Date('2026-11-0' + i + 'T10:00:00-04:00').getTime(), facturarA: '', nit: '' }, o || {});
  };
  var F = function (p, t, n) { p.productos.forEach(function (x) { x.fdoc = t; x.fdocn = n; }); return p; };
  STATE = [P(1, 'ANA UNO'), P(2, 'BETO DOS'), F(P(3, 'CARLA TRES'), 'F', '900'), P(4, 'DORA CUATRO'), F(P(5, 'EMA CINCO'), 'R', '77')];
  window._txt = function (sel) { var e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._nav = function () { var n = document.getElementById('cta-nav'), a = document.getElementById('cta-nav-ant'), s = document.getElementById('cta-nav-sig');
    return { h: _txt('#modal-box .modal-h h3'), nav: n ? n.innerText.replace(/\s+/g, ' ').trim() : '', ant: a ? !a.disabled : null, sig: s ? !s.disabled : null, kind: MODAL_KIND }; };
  window.VENTAS = function () { closeModal(); showView('conta'); segSet('cta-tab', 'ventas'); setContaTab('ventas'); document.getElementById('cta-mes').value = '2026-11'; segSet('cta-mode', 'mes'); setContaModo('mes'); };
  window._filasTabla = function () { return [].slice.call(document.querySelectorAll('#tbl-conta tbody tr')).map(function (tr) { var m = tr.innerText.match(/[A-Z]+ [A-Z]+/); return m ? m[0] : ''; }); };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(flag) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.CTA_NAV_PRUEBA = 1; window.MIS_TOP_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => VENTAS());
    await page.waitForTimeout(150);
    return { ctx, page };
  }

  // ═══ 1. sin la bandera ═══
  let { ctx, page } = await abrir(false);
  await page.click('#tbl-conta tbody tr:nth-child(2)'); await page.waitForTimeout(100);
  let r = await page.evaluate(() => _nav());
  chk('1 sin la bandera: la ficha de siempre, sin flechas', r.kind === 'conta' && r.nav === '' && /BETO DOS|DORA CUATRO/.test(r.h), r);
  await ctx.close();

  // ═══ 2. desde la tabla ═══
  ({ ctx, page } = await abrir(true));
  const orden = await page.evaluate(() => _filasTabla());
  chk('2a la tabla (lo último cargado arriba)', orden.join('|') === 'EMA CINCO|DORA CUATRO|CARLA TRES|BETO DOS|ANA UNO', orden);
  await page.click('#tbl-conta tbody tr:nth-child(2)'); await page.waitForTimeout(100);
  r = await page.evaluate(() => _nav());
  chk('2b el renglón 2 abre «2 de 5 · en la lista de Ventas» con las dos flechas', /DORA CUATRO/.test(r.h) && /^◀ 2 de 5 en la lista de Ventas/.test(r.nav) && r.ant && r.sig, r);
  await page.click('#cta-nav-sig'); await page.waitForTimeout(80);
  r = await page.evaluate(() => _nav());
  chk('2c ▶ pasa a la siguiente de la tabla (CARLA TRES, 3 de 5) sin cerrar', /CARLA TRES/.test(r.h) && /3 de 5/.test(r.nav), r);
  await page.click('#cta-nav-ant'); await page.click('#cta-nav-ant'); await page.waitForTimeout(80);
  r = await page.evaluate(() => _nav());
  chk('2d ◀ ◀ vuelve a la primera (EMA CINCO) y ◀ queda apagado', /EMA CINCO/.test(r.h) && /1 de 5/.test(r.nav) && r.ant === false && r.sig, r);

  // ═══ 3. teclado ═══
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.getElementById('modal-box').focus(); });
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  r = await page.evaluate(() => _nav());
  chk('3a → → pasa dos (3 de 5)', /CARLA TRES/.test(r.h) && /3 de 5/.test(r.nav), r);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(60);
  r = await page.evaluate(() => _nav());
  chk('3b ← vuelve una (2 de 5)', /DORA CUATRO/.test(r.h) && /2 de 5/.test(r.nav), r);
  await page.focus('#cta-pago-monto'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60);
  r = await page.evaluate(() => _nav());
  chk('3c con el foco en el monto, la flecha es del campo (no pasa)', /DORA CUATRO/.test(r.h) && /2 de 5/.test(r.nav), r);

  // ═══ 4. repintar la misma / abrir desde otro lado ═══
  await page.evaluate(() => ctaSetMetodo('p4', 'QR')); await page.waitForTimeout(60);
  r = await page.evaluate(() => _nav());
  chk('4a tocar un método (repinta la misma ficha) no saca las flechas', /2 de 5/.test(r.nav), r);
  await page.evaluate(() => { for (var i = 0; i < 3; i++) ctaNavIr(1); }); await page.waitForTimeout(60);
  r = await page.evaluate(() => _nav());
  chk('4b en la última, ▶ apagado (5 de 5)', /ANA UNO/.test(r.h) && /5 de 5/.test(r.nav) && r.sig === false, r);
  await page.evaluate(() => { closeModal(); showContaModal('p3'); }); await page.waitForTimeout(60);
  r = await page.evaluate(() => _nav());
  chk('4c abierta desde otro lado (no una lista), sin flechas', /CARLA TRES/.test(r.h) && r.nav === '', r);

  // ═══ 5. desde «Para hacer» de Mis pedidos ═══
  await page.evaluate(() => { closeModal(); showView('mis'); document.getElementById('mis-vendedor').value = 'Isabel Robledo'; renderMis(); misVerLista('sdoc'); });
  await page.waitForTimeout(100);
  r = await page.evaluate(() => [].slice.call(document.querySelectorAll('#modal-box .t2-f')).map(function (f) { return f.innerText.split('\n')[0]; }));
  chk('5a la lista «Sin N° de factura» trae las 3 que faltan', r.length === 3, r);
  await page.click('#modal-box .t2-f:nth-child(2)'); await page.waitForTimeout(100);
  r = await page.evaluate(() => _nav());
  chk('5b la ficha de Contabilidad dice «1 de 3 · 🧾 Sin N° de factura o nota de remisión»', r.kind === 'conta' && /1 de 3/.test(r.nav) && /Sin N° de factura o nota de remisión/.test(r.nav), r);
  const primero = r.h;
  r = await page.evaluate(() => ({ b: _txt('#cta-doc-sig') }));
  chk('5c al lado de «💾 Guardar N°», «💾 Guardar N° y siguiente ▶»', r.b === '💾 Guardar N° y siguiente ▶', r.b);
  await page.click('#cta-doc-sig'); await page.waitForTimeout(80);   // sin tipo ni número
  r = await page.evaluate(() => _nav());
  chk('5d sin el tipo ni el número no pasa (dice qué falta, como siempre)', r.h === primero && /1 de 3/.test(r.nav), r);
  await page.evaluate(() => { ctaDocTipo(CTA_NAV.id, 'F'); document.getElementById('cta-doc-num').value = '001245'; ctaDocNum(CTA_NAV.id, '001245'); });
  const idAntes = await page.evaluate(() => CTA_NAV.id);
  await page.click('#cta-doc-sig'); await page.waitForTimeout(120);
  r = await page.evaluate((id) => { var p = findById(id); return Object.assign(_nav(), { doc: docVentaDe(p), num: docNumDe(p) }); }, idAntes);
  chk('5e guarda la factura N° 001245 (lo de siempre)…', r.doc === 'F' && r.num === '001245', r);
  chk('5f …y pasa a la siguiente (2 de 3)', /2 de 3/.test(r.nav) && r.h !== primero, r);

  chk('6 sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
