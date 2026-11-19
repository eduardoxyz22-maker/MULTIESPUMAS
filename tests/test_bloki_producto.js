/* 🧽 306 · BLOKI ENTIENDE «TITANIO ICE 2.5» Y EL PRODUCTO SOLO (15/11; el dueño aprobó la 306: «ok»).
   Cuida: las plazas como número suelto («2.5», «1,5», «2 1/2») son la medida (como el formulario: 2½ = 160x190); el nombre de un producto
   escrito SOLO contesta con la tarjeta (si hay y desde cuándo = `blokiStockDe`, precio típico = `blokiPrecioDe`, el código, vendidos este
   mes) y «➕ Cargarlo en un pedido» agrega el renglón al formulario; con varias medidas pregunta cuál (sin somieres); lo que NO es un
   producto («hola», las preguntas de la ayuda) no se toma por uno; «¿Qué es la nota de remisión y dónde la anoto?» va AL FINAL de la ayuda
   y señala algo que existe; sin la bandera (Playwright) nada cambia.
   Reloj clavado (martes 10/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_bloki_producto.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = path.resolve(process.env.PEDIDOS || 'pedidos.html');

function PREPARAR() {
  var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
  CONNECTED = false; CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = '';
  try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  loadFromServer = function () {};
  try { localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_asis_video', JSON.stringify('ofrecido')); } catch (e) {}
  window._esp = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var hoy = todayStr(), n = 0;
  var V = function (o) { n++; return Object.assign({ id: 'k' + n, oc: '11-' + (100 + n), nota: String(900 + n), vendedor: 'Mirian Salazar', cliente: 'CLIENTE ' + n, fecha: stockSumarDias(hoy, 2), turno: 'AM',
    productos: [{ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201', cant: 1, precio: 6510 }], saldo: 0, acuenta: 0, pagado: true, entregado: false, ts: Date.now() - 2 * 86400000,
    maps: 'https://maps.app.goo.gl/x', celular: '7' + String(1000000 + n), zona: 'Norte' }, o); };
  STATE = [V({}), V({ productos: [{ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201', cant: 2, precio: 6400 }] }), V({ productos: [{ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201', cant: 1, precio: 6600 }] }),
           V({ productos: [{ desc: 'TITANIO ICE', medida: '140x190', codigo: 'CH1220', cant: 1, precio: 5200 }] })];
  var LOG = 'PRODUCTOS TERMINADOS FAB.';
  var st = { c: { f: hoy, hora: '08:30:00', u: {}, solo0: true, alm: LOG, t: Date.now() - 3600000 }, e: [], p: [], a: {}, g: {}, al: {}, h: [] };
  st.al[LOG] = 'log';
  st.c.u[stockClave({ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201' })] = 8;
  st.c.u[stockClave({ desc: 'TITANIO ICE', medida: '140x190', codigo: 'CH1220' })] = 3;
  STOCK = st; STOCK_CARGADO = true; stockOlvidarIndice(); SALDO_CACHE = null;
  UNLOCKED = false; quienRol(''); setVendedorMem('Mirian Salazar');
  window.PREG = async function (q) {
    if (!ASIS.abierto || ASIS.tab !== 'ayuda') asisAbrir('ayuda');
    var inp = document.getElementById('asis-q'); inp.value = q; inp.dispatchEvent(new Event('input', { bubbles: true }));
    var f = inp.closest('form'); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true }));
    await _esp(60);
    var as = document.querySelectorAll('#asis-chat .bkp-a'), a = as[as.length - 1];
    if (!a) return { t: '' };
    return { t: a.innerText.replace(/\s+/g, ' '), nums: [].map.call(a.querySelectorAll('.bkp-n'), function (x) { return x.innerText.replace(/\s+/g, ' '); }),
      opc: [].map.call(a.querySelectorAll('.bkp-opc button'), function (b) { return b.textContent; }),
      btns: [].map.call(a.querySelectorAll('.bkp-acc button'), function (b) { return b.textContent; }) };
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const abrir = async (bandera) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message)); page.on('dialog', d => d.accept());
    await page.addInitScript((b) => { window.ASIS_PRUEBA = 1; if (b) window.BLOKI_PROD_PRUEBA = 1; try { sessionStorage.setItem('me_quien_ok', '1'); } catch (e) {} }, bandera);
    await page.clock.setFixedTime(new Date('2026-11-10T10:00:00-04:00'));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(1800);
    await page.evaluate(PREPARAR);
    return page;
  };
  const evq = (page) => (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  // ============ 1. sin la bandera ============
  const p0 = await abrir(false), ev0 = evq(p0);
  let r = await ev0(() => ({ hay: typeof blokiProd === 'function', solo: blokiEntender('titanio ice 2.5'), med: blokiMedidas(' TITANIO ICE 2.5 ').med,
    ayuda: ASIS_AYUDA.some(function (a) { return /remisi/i.test(a.q); }), n: ASIS_AYUDA.length }));
  chk('0 · la página tiene la 306 (`blokiProd`)', r.hay === true, r);
  chk('1 · sin `BLOKI_PROD_PRUEBA` (Playwright) nada cambia: «titanio ice 2.5» sigue sin entenderse, «2.5» no es medida y la ayuda no suma la respuesta', r.solo === null && r.med === null && r.ayuda === false, r);

  // ============ 2. con la bandera ============
  const page = await abrir(true), ev = evq(page);
  r = await ev(() => {
    var M = function (t) { var m = blokiMedidas(' ' + blokiNorm(t).toUpperCase() + ' ').med; return m ? (m.exacta ? ('x:' + m.exacta) : (m.plz + ':' + (m.anchos || []).join('/'))) : null; };
    var T = function (q) { var o = blokiEntender(q); return o ? o.tipo : null; };
    return { m25: M('titanio ice 2.5'), m15: M('titanio ice 1,5'), m2: M('titanio ice 2 1/2'), m3: M('oro 3.0'), m90: M('titanio 90x190'),
      solo: T('titanio ice 2.5'), solo2: T('titanio ice 160x190'), solo3: T('titanio ice'), hay: T('hay titanio ice 2.5'),
      no: ['hola', 'gracias', 'cómo cargo un pedido', 'factura con nit extranjero', 'el cliente no contesta', 'cuánto vendí', 'plata', 'negro', 'colchon', 'nuevo'].map(function (q) { return q + '→' + T(q); }).filter(function (x) { return /→prod$/.test(x); }) };
  });
  chk('2a · «2.5», «1,5» y «2 1/2» son 2½, 1½ y 2½ plazas (160, 105, 160); «3.0» = 3 plazas (180/200); «90x190» sigue igual', r.m25 === '2.5:160' && r.m15 === '1.5:105' && r.m2 === '2.5:160' && r.m3 === '3:180/200' && r.m90 === 'x:90x190', r);
  chk('2b · el nombre solo es una pregunta de producto («titanio ice 2.5», «titanio ice 160x190», «titanio ice»)', r.solo === 'prod' && r.solo2 === 'prod' && r.solo3 === 'prod', r);
  chk('2c · «hay titanio ice 2.5» sigue siendo de stock', r.hay === 'stock', r);
  chk('2d · lo que no es un producto no se toma por uno («hola», «plata», preguntas de la ayuda)', r.no.length === 0, r.no);
  r = await ev(() => ({ ay: ASIS_AYUDA.filter(function (a) { return blokiEntender(a.q); }).map(function (a) { return a.q + ' → ' + blokiEntender(a.q).tipo; }) }));
  chk('2e · ninguna pregunta de la ayuda se toma por producto', r.ay.length === 0, r.ay);

  // ============ 3. la tarjeta ============
  r = await ev(() => PREG('titanio ice 2.5'));
  chk('3a · contesta con el producto entendido y su código: TITANIO ICE 160x190 · CH1201', /TITANIO ICE 160x190/.test(r.t) && /CH1201/.test(r.t), r.t);
  chk('3b · si hay y desde cuándo (el cuadrito: «Libres»)', r.nums.some(function (x) { return /Libres/.test(x); }) && /🛏️/.test(r.t), r.nums);
  chk('3c · el precio típico (la mediana de lo cobrado: Bs 6.510) y los vendidos este mes (4)', r.nums.some(function (x) { return /6\.510/.test(x) && /precio típico/.test(x); }) && r.nums.some(function (x) { return /^4 vendidos este mes/.test(x); }), r.nums);
  chk('3d · dice cómo entendió «2.5»', /Entendí «2 ½» como 2 ½ plazas \(160x190\)/.test(r.t), r.t);
  chk('3e · con «➕ Cargarlo en un pedido»', r.btns.indexOf('➕ Cargarlo en un pedido') >= 0, r.btns);
  r = await ev(() => PREG('titanio ice'));
  chk('3f · sin medida pregunta cuál (las medidas del colchón, sin somieres)', r.opc.length >= 2 && r.opc.every(function (o) { return /TITANIO ICE/.test(o) && !/SOMIER/.test(o); }), r.opc);

  // ============ 4. «➕ Cargarlo en un pedido» ============
  r = await ev(async () => {
    showView('form'); resetForm(); asisAbrir('ayuda');
    await PREG('titanio ice 2.5');
    var as = document.querySelectorAll('#asis-chat .bkp-a'), a = as[as.length - 1];
    var b = [].filter.call(a.querySelectorAll('.bkp-acc button'), function (x) { return /Cargarlo/.test(x.textContent); })[0]; if (b) b.click();
    await _esp(80);
    return { vista: document.getElementById('view-form').classList.contains('active'),
      filas: [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return [c.querySelector('.prod-desc').value, c.querySelector('.prod-medida').value, c.querySelector('.prod-codigo').value, c.querySelector('.prod-cant').value]; }) };
  });
  chk('4 · agrega el renglón al pedido (con el código y la medida; el renglón vacío se va)', r.vista && r.filas.length === 1 && /TITANIO ICE/.test(r.filas[0][0]) && r.filas[0][1] === '160x190' && r.filas[0][2] === 'CH1201' && r.filas[0][3] === '1', r);

  // ============ 5. la nota de remisión ============
  r = await ev(() => { var i = asisBuscar('qué es la nota de remisión')[0], a = ASIS_AYUDA[i] || {}, ult = ASIS_AYUDA[ASIS_AYUDA.length - 1];
    return { q: a.q, ult: ult.q, existe: [].concat(ult.f).some(function (s) { return !!document.querySelector(s); }), entender: blokiEntender(ult.q), p: (a.p || []).join(' ') }; });
  chk('5a · «¿Qué es la nota de remisión y dónde la anoto?» va AL FINAL de la ayuda y la encuentra', r.ult === '¿Qué es la nota de remisión y dónde la anoto?' && r.q === r.ult, r);
  chk('5b · señala algo que existe y no se toma por otra pregunta', r.existe && r.entender === null, r);
  chk('5c · explica que es la de una venta sin factura y que se anota en Contabilidad', /NO lleva factura/.test(r.p) && /Contabilidad/.test(r.p), r.p);

  chk('6 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
