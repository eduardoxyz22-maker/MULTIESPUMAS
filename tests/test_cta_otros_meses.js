/* 📅 298 · CONTABILIDAD AVISA SI LO BUSCADO ES DE OTRO MES (15/11, dueño: aprobado).

   De los 29 pagos de saldo de noviembre, 8 (Bs 33.340) fueron de ventas de agosto a octubre: con «Mes» = noviembre el buscador miraba
   solo noviembre y el cliente «no aparecía» hasta pasar a «Todo». Ahora, con algo escrito, lo que coincide fuera del período sale
   debajo: «📅 Hay 2 en otros meses: 10-218 · octubre · saldo Bs 1.900» con «Ver en todos los meses» o tocar una para abrirla.

   Lo que se mira:
     1. Sin la bandera (`CTA_OTROS_PRUEBA`) nada nuevo.
     2. «rojas» en noviembre (ninguna) → «Ninguna venta de noviembre con «rojas». Pero hay 3 en otros meses» con OC, mes, cliente y el
        saldo de la que debe. Los números del mes no cambian (0 ventas).
     3. «perez» (una en noviembre y una en octubre) → «También hay 1 en otros meses».
     4. Respeta el vendedor elegido (la de otra vendedora no cuenta).
     5. Tocar una abre su ficha; «Ver en todos los meses» pasa a «Todo» y la tabla las muestra (y la línea se va).
     6. Sin búsqueda, o en «Todo», no hay línea. En «Día» dice «otros días».

   Datos SINTÉTICOS. Reloj clavado en el lunes 16/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_cta_otros_meses.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve(__dirname, '..', 'pedidos.html');

function PREPARAR() {
  CONNECTED = false; try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
  var P = function (oc, cli, dia, saldo, o) {
    var tot = 3000;
    return Object.assign({ id: 'id' + oc.replace(/\D/g, ''), oc: oc, nota: '45' + oc.replace(/\D/g, ''), vendedor: 'Isabel Robledo', cliente: cli, celular: '70001234',
      fecha: dia, turno: 'AM', zona: 'NORTE', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON TITANIO ICE', codigo: 'CH1220', medida: '140x190', cant: 1, precio: tot }],
      acuenta: tot - saldo, saldo: saldo, pagado: saldo < 0.01, metodoPago: '~Efectivo ' + (tot - saldo) + ' @' + dia + ' #44', entregado: true, ts: new Date(dia + 'T10:00:00-04:00').getTime(), facturarA: '', nit: '' }, o || {});
  };
  STATE = [
    P('10-218', 'ANA ROJAS', '2026-10-21', 1900),
    P('10-150', 'LUIS ROJAS', '2026-10-05', 0),
    P('09-077', 'MARIA ROJAS', '2026-09-12', 0),
    P('10-219', 'PEPE ROJAS', '2026-10-22', 0, { vendedor: 'Carola Chavez' }),
    P('11-020', 'JUAN PEREZ', '2026-11-04', 0),
    P('10-300', 'JOSE PEREZ', '2026-10-28', 500),
    P('11-021', 'OTRO CLIENTE', '2026-11-05', 0)
  ];
  window._om = function () { var e = document.getElementById('cta-om'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._chips = function () { return [].slice.call(document.querySelectorAll('#cta-om .cta-om-v')).map(function (b) { return b.innerText.replace(/\s+/g, ' ').trim(); }); };
  window.BUSCAR = function (q, vend, modo) {
    closeModal(); showView('conta'); segSet('cta-tab', 'ventas'); setContaTab('ventas');
    llenarSelectContaVendedor(); document.getElementById('cta-vendedor').value = vend || '';
    document.getElementById('cta-mes').value = '2026-11'; document.getElementById('cta-dia').value = '2026-11-04';
    document.getElementById('cta-search').value = q || '';
    segSet('cta-mode', modo || 'mes'); setContaModo(modo || 'mes');
    segSet('cta-base', 'ingreso'); setContaBase();
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(flag) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    if (flag) await ctx.addInitScript(() => { window.CTA_OTROS_PRUEBA = 1; });
    const page = await ctx.newPage(); page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(PREPARAR);
    return { ctx, page };
  }

  let { ctx, page } = await abrir(false);
  await page.evaluate(() => BUSCAR('rojas')); await page.waitForTimeout(80);
  let r = await page.evaluate(() => ({ om: _om(), res: document.getElementById('cta-resumen').innerText }));
  chk('1 sin la bandera: nada nuevo', r.om === '', r);
  const resumenSin = r.res;
  await ctx.close();

  ({ ctx, page } = await abrir(true));
  await page.evaluate(() => BUSCAR('rojas')); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ om: _om(), ch: _chips(), res: document.getElementById('cta-resumen').innerText }));
  chk('2a «Ninguna venta de noviembre con «rojas». Pero hay 4 en otros meses»', /Ninguna venta de noviembre con «rojas»\. Pero hay 4 en otros meses/.test(r.om), r.om);
  chk('2b cada una con OC, mes y cliente; la que debe, con el saldo', r.ch.some(c => /^OC 10-218 · octubre · ANA ROJAS · saldo Bs 1\.900,00$/.test(c)) && r.ch.some(c => /^OC 09-077 · septiembre · MARIA ROJAS$/.test(c)), r.ch);
  chk('2c los números del mes no cambian', r.res === resumenSin, { con: r.res, sin: resumenSin });
  await page.evaluate(() => BUSCAR('perez')); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ om: _om(), ch: _chips() }));
  chk('3 «perez»: «También hay 1 en otros meses» (la de noviembre está en la tabla)', /También hay 1 en otros meses/.test(r.om) && r.ch.length === 1 && /JOSE PEREZ · saldo Bs 500,00/.test(r.ch[0]), r);
  await page.evaluate(() => BUSCAR('rojas', 'Isabel Robledo')); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ om: _om(), ch: _chips() }));
  chk('4 con Isabel elegida, la de Carola no cuenta (3)', /Pero hay 3 en otros meses/.test(r.om) && !r.ch.some(c => /PEPE/.test(c)), r);
  await page.click('#cta-om .cta-om-v'); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ on: document.getElementById('modal').classList.contains('on'), h: document.querySelector('#modal-box .modal-h h3').innerText }));
  chk('5a tocar una abre su ficha', r.on && /ROJAS/.test(r.h), r);
  await page.evaluate(() => closeModal());
  await page.click('#cta-om .cta-om-t'); await page.waitForTimeout(80);
  r = await page.evaluate(() => ({ modo: segVal('cta-mode'), om: _om(), filas: document.querySelectorAll('#tbl-conta tbody tr').length }));
  chk('5b «Ver en todos los meses» pasa a «Todo», la tabla las muestra y la línea se va', r.modo === 'todo' && r.filas === 3 && r.om === '', r);
  await page.evaluate(() => BUSCAR('')); await page.waitForTimeout(60);
  r = await page.evaluate(() => _om());
  chk('6a sin búsqueda no hay línea', r === '', r);
  await page.evaluate(() => BUSCAR('perez', '', 'dia')); await page.waitForTimeout(60);
  r = await page.evaluate(() => _om());
  chk('6b en «Día» dice «otros días»', /También hay 1 en otros días/.test(r), r);
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await ctx.close();
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
