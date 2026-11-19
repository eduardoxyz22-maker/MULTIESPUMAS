/* 💵 295 · COBRAR EL SALDO DESDE MIS PEDIDOS (15/11, dueño: aprobado).

   Del 01 al 14/11 se registraron 29 pagos de saldo en otro día que la venta: la lista «💵 Saldo por cobrar» abría la ficha de Mis
   pedidos (sin «Registrar pago») y había que ir a Contabilidad, escribir el nombre y buscar la fila. Ahora cada pedido con saldo
   lleva «💵 Cobrar Bs …» en su tarjeta, en las listas de saldo de «Para hacer» y en su ficha: abre LA MISMA ficha de Contabilidad
   (`showContaModal`), ya en «💵 Pago», con «← Volver a Mis pedidos».

   Lo que se mira:
     1. Sin la bandera (`MIS_COBRAR_PRUEBA`) no hay botón: las tarjetas como siempre.
     2. Con la bandera: el botón sale en la tarjeta de lo que debe, con su saldo; no en lo pagado, una ATC, una RPT ni lo de ROHO.
     3. Tarjeta → la ficha de Contabilidad (no la de Mis pedidos), en «💵 Registrar un pago — falta …» con el monto puesto y
        «← Volver a Mis pedidos»; volver cierra y deja Mis pedidos.
     4. Ficha de Mis pedidos → «Cobrar» → Contabilidad → volver a la ficha de Mis pedidos.
     5. Lista «💵 Saldo por cobrar de este mes» y «🗓️ Saldo de meses anteriores» de «Para hacer» → «Cobrar» en cada renglón (sin
        abrir la ficha de Mis pedidos) → volver a la lista.
     6. Registrar el pago desde ahí es el de siempre: el saldo baja a 0 y al volver la tarjeta ya no dice «Cobrar».
     7. Con la ficha de Contabilidad abierta desde otro lado (Contabilidad), no aparece «← Volver a Mis pedidos». Sin errores.

   Datos SINTÉTICOS. Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_mis_cobrar.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR() {
  CONNECTED = false; try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
  apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); };
  var P = function (id, cli, o) {
    return Object.assign({ id: id, oc: '11-' + id.replace(/\D/g, ''), nota: '45' + id.replace(/\D/g, ''), vendedor: 'Isabel Robledo', cliente: cli, celular: '70001234',
      fecha: '2026-11-18', turno: 'AM', zona: 'NORTE', direccion: 'Calle 1', maps: 'https://maps.google.com/?q=-17.78,-63.18',
      productos: [{ desc: 'COLCHON TITANIO ICE', codigo: 'CH1220', medida: '140x190', cant: 1, precio: 2000 }],
      acuenta: 500, saldo: 1500, pagado: false, metodoPago: '~Efectivo 500 @2026-11-10 #4400', entregado: false, ts: new Date('2026-11-10T10:00:00-04:00').getTime(), facturarA: '', nit: '' }, o || {});
  };
  STATE = [
    P('p101', 'ANA ROJAS'),                                                                                       // debe 1.500
    P('p102', 'BETO PAGADO', { saldo: 0, pagado: true, acuenta: 2000, metodoPago: '~Efectivo 2000 @2026-11-10 #4401' }),
    P('p103', 'CARLA ATC', { oc: 'ATC 11-003', saldo: 300 }),
    P('p104', 'TIENDA CENTRAL', { oc: 'RPT 11-004', saldo: 0 }),
    P('p105', 'DORA OCTUBRE', { fecha: '2026-10-20', entregado: true, saldo: 900, acuenta: 1100, ts: new Date('2026-10-15T10:00:00-04:00').getTime() })   // de un mes anterior, entregada
  ];
  window._txt = function (sel) { var e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._modal = function () { var m = document.getElementById('modal'); return { on: !!(m && m.classList.contains('on')), kind: MODAL_KIND, h: _txt('#modal-box .modal-h h3'), txt: _txt('#modal-box') }; };
  window._cobrar = function () { return [].slice.call(document.querySelectorAll('#mis-lista .cho-card')).map(function (c) { var b = c.querySelector('.mcb-btn'); var m = c.innerText.match(/[A-Z]+ [A-Z]+/); return (m ? m[0] : '?') + ':' + (b ? b.textContent.trim() : '-'); }).sort(); };
  window.MIS = function () { closeModal(); showView('mis'); var mv = document.getElementById('mis-vendedor'); mv.value = 'Isabel Robledo'; setMisFiltro('todos'); renderMis(); };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(flag) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.MIS_COBRAR_PRUEBA = 1; window.MIS_TOP_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    await page.evaluate(() => MIS());
    await page.waitForTimeout(150);
    return { ctx, page };
  }

  // ═══ 1. sin la bandera ═══
  let { ctx, page } = await abrir(false);
  let r = await page.evaluate(() => _cobrar());
  chk('1 sin la bandera: ninguna tarjeta tiene «Cobrar»', r.every(x => /:-$/.test(x)) && r.length === 5, r);
  await ctx.close();

  // ═══ 2. con la bandera ═══
  ({ ctx, page } = await abrir(true));
  r = await page.evaluate(() => _cobrar());
  chk('2a ANA ROJAS (debe 1.500) lleva «💵 Cobrar Bs 1.500,00»', r.indexOf('ANA ROJAS:💵 Cobrar Bs 1.500,00') >= 0, r);
  chk('2b la pagada, la ATC y la RPT no', r.indexOf('BETO PAGADO:-') >= 0 && r.indexOf('CARLA ATC:-') >= 0 && r.indexOf('TIENDA CENTRAL:-') >= 0, r);
  chk('2c la de octubre entregada con saldo, sí (Bs 900)', r.indexOf('DORA OCTUBRE:💵 Cobrar Bs 900,00') >= 0, r);

  // ═══ 3. tarjeta → Contabilidad → volver ═══
  await page.click('#mis-lista .mcb-btn[data-id="p101"]');
  await page.waitForTimeout(150);
  r = await page.evaluate(() => ({ m: _modal(), monto: (document.getElementById('cta-pago-monto') || {}).value, volver: _txt('#pc-volver'), tipo: CTA_TIPO }));
  chk('3a abre la ficha de CONTABILIDAD (no la de Mis pedidos)', r.m.on && r.m.kind === 'conta' && /🧾 ANA ROJAS/.test(r.m.h), r.m.h);
  chk('3b ya en «💵 Registrar un pago — falta Bs 1.500,00», con el monto puesto', /Registrar un pago — falta Bs 1\.500,00/.test(r.m.txt) && r.monto === '1500' && r.tipo === 'pago', { monto: r.monto, tipo: r.tipo });
  chk('3c con «← Volver a Mis pedidos»', r.volver === '← Volver a Mis pedidos', r.volver);
  await page.click('#pc-volver'); await page.waitForTimeout(120);
  r = await page.evaluate(() => ({ m: _modal(), mis: document.getElementById('view-mis').classList.contains('active') }));
  chk('3d volver cierra la ficha y deja Mis pedidos', !r.m.on && r.mis, r);

  // ═══ 4. ficha de Mis pedidos → Cobrar → volver a la ficha ═══
  await page.evaluate(() => showMisModal('p101')); await page.waitForTimeout(100);
  r = await page.evaluate(() => ({ m: _modal(), b: _txt('#modal-box .modal-actions .mcb-btn') }));
  chk('4a la ficha de Mis pedidos tiene «💵 Cobrar Bs 1.500,00»', r.m.kind === 'mis' && r.b === '💵 Cobrar Bs 1.500,00', r.b);
  await page.click('#modal-box .modal-actions .mcb-btn'); await page.waitForTimeout(120);
  r = await page.evaluate(() => _modal());
  chk('4b abre la de Contabilidad', r.kind === 'conta' && /Volver a Mis pedidos/.test(r.txt), r.h);
  await page.click('#pc-volver'); await page.waitForTimeout(120);
  r = await page.evaluate(() => _modal());
  chk('4c volver deja de nuevo la ficha de Mis pedidos', r.on && r.kind === 'mis' && /ANA ROJAS/.test(r.h), r.h);

  // ═══ 5. las listas de «Para hacer» ═══
  for (const [k, cli, monto] of [['saldo', 'ANA ROJAS', '1.500,00'], ['saldoAnt', 'DORA OCTUBRE', '900,00']]) {
    await page.evaluate(() => MIS()); await page.waitForTimeout(80);
    await page.evaluate((k) => misVerLista(k), k); await page.waitForTimeout(80);
    r = await page.evaluate(() => ({ m: _modal(), filas: [].slice.call(document.querySelectorAll('#modal-box .t2-f')).map(function (f) { return f.innerText.replace(/\s+/g, ' ').trim(); }) }));
    const fila = r.filas.filter(f => f.indexOf(cli) === 0)[0] || '';
    chk('5 ' + k + ': el renglón de ' + cli + ' dice «💵 Cobrar Bs ' + monto + '»', fila.indexOf('💵 Cobrar Bs ' + monto) > 0, r.filas);
    if (k === 'saldo') chk('5 saldo: el de la ATC (la lista lo trae) no tiene «Cobrar»: una ATC no se cobra', r.filas.some(f => /^CARLA ATC/.test(f) && !/Cobrar/.test(f)), r.filas);
    await page.click('#modal-box .t2-f .mcb-btn'); await page.waitForTimeout(120);
    r = await page.evaluate(() => _modal());
    chk('5 ' + k + ': «Cobrar» abre la de Contabilidad (no la ficha de Mis pedidos)', r.kind === 'conta' && r.h.indexOf(cli) >= 0, r.h);
    await page.click('#pc-volver'); await page.waitForTimeout(120);
    r = await page.evaluate(() => _modal());
    chk('5 ' + k + ': volver deja la lista otra vez', r.on && /Saldo/.test(r.h), r.h);
  }

  // ═══ 6. registrar el pago desde ahí ═══
  await page.evaluate(() => MIS()); await page.waitForTimeout(80);
  await page.click('#mis-lista .mcb-btn[data-id="p101"]'); await page.waitForTimeout(120);
  await page.evaluate(() => { CTA_PAGO.metodo = 'Efectivo'; CTA_PAGO.comps = ['fotoDeMentira1']; document.getElementById('cta-pago-nota').value = '4499'; ctaRegistrarPago('p101'); });
  await page.waitForTimeout(250);
  r = await page.evaluate(() => { var p = findById('p101'); return { saldo: p.saldo, pagado: p.pagado }; });
  chk('6a el pago es el de siempre: el saldo baja a 0', r.saldo === 0, r);
  await page.evaluate(() => { var v = document.getElementById('pc-volver'); if (v) v.click(); else { closeModal(); MIS(); } }); await page.waitForTimeout(150);
  r = await page.evaluate(() => _cobrar());
  chk('6b …y al volver la tarjeta ya no dice «Cobrar»', r.indexOf('ANA ROJAS:-') >= 0, r);

  // ═══ 7. desde Contabilidad, sin «volver a Mis pedidos» ═══
  await page.evaluate(() => { closeModal(); showView('conta'); showContaModal('p105'); }); await page.waitForTimeout(120);
  r = await page.evaluate(() => _modal());
  chk('7 abierta desde Contabilidad no dice «Volver a Mis pedidos»', r.kind === 'conta' && !/Volver a Mis pedidos/.test(r.txt), r.h);
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
