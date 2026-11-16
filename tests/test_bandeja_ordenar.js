/* 🧹 (mejora 389, 16/11) ORDENAR LA BANDEJA DE KOMMO EN UN TOQUE.
   Cuida: con ventas de Kommo ya cargadas y vacías viejas, la bandeja ofrece «🧹 Ordenar mi bandeja (N)»; la ventana trae los dos bloques
   tildados («🔗 Unir las 2 que ya cargaste» y «🗑️ Sacar las 2 vacías de más de 15 días») y dice cuántas quedan; las vacías nuevas (≤15 días),
   las que tienen productos o monto y las que solo «parecen» no se tocan; «Hacer las 2 cosas» une (el pedido queda con la marca del lead) y
   descarta de a una (nunca dos borrados a la vez); lo que Google no borró vuelve a la bandeja y se dice; destildar un bloque lo saltea;
   sin la bandera (`BANDEJA_PRUEBA`) el botón no sale.
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia. Red cortada, planilla de mentira, datos inventados.
   Se corre:  node tests/test_bandeja_ordenar.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.__error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await ctx.route(/^https?:\/\//, r => r.abort());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error: String((e && e.message) || e).slice(0, 300) }; } };

  const r0 = await ev(async () => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; try { localStorage.removeItem(LS_PEND); } catch (e) {}
    CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = ''; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.BANDEJA_PRUEBA = true;
    var T = function (iso) { return Date.parse(iso + 'T11:00:00-04:00'); };
    var P = function (id, o) { return Object.assign({ id: id, oc: '', nota: '', cliente: 'CLIENTE ' + id.toUpperCase(), celular: '', fecha: '2026-11-18', turno: 'AM', zona: 'Norte', direccion: 'Calle 1', maps: '',
      vendedor: 'Maria Flores', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 3000 }], saldo: 0, acuenta: 3000, pagado: true, metodoPago: '', ts: T('2026-11-10'), rev: 1, estado: '' }, o); };
    var B = function (id, o) { return Object.assign({ id: 'kommo-' + id, estado: BORRADOR_EST, vendedor: 'Maria Flores', cliente: 'LEAD ' + id, celular: '', saldo: 0, productos: [], fecha: '', turno: '', zona: '', ts: T('2026-11-14'), rev: 1 }, o); };
    window._pl = [
      P('p1', { oc: '11-101', nota: '5101', cliente: 'CLIENTA UNO', celular: '71111111' }),
      P('p2', { oc: '11-102', nota: '5102', cliente: 'CLIENTE DOS', celular: '72222222', ts: T('2026-11-12') }),
      B('1', { cliente: 'CLIENTA UNO', celular: '71111111', saldo: 3000 }),                       // ya cargada → unir
      B('2', { cliente: 'CLIENTE DOS', celular: '+591 72222222', saldo: 3000, ts: T('2026-11-13') }), // ya cargada → unir
      B('3', { cliente: 'VACIA VIEJA A', ts: T('2026-10-20') }),                                   // vacía de 27 días → sacar
      B('4', { cliente: 'VACIA VIEJA B', celular: '79990000', ts: T('2026-10-25') }),             // vacía de 22 días → sacar
      B('5', { cliente: 'VACIA NUEVA', ts: T('2026-11-10') }),                                     // vacía de 6 días → queda
      B('6', { cliente: 'CON PRODUCTOS VIEJA', ts: T('2026-10-20'), productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1 }] }),   // con productos → queda
      B('7', { cliente: 'CON MONTO VIEJA', ts: T('2026-10-20'), saldo: 2500 }),                    // con monto → queda
      B('8', { cliente: 'DE OTRA VENDEDORA', vendedor: 'Mirian Salazar', ts: T('2026-10-20') })    // de otra → no es suya
    ];
    window._dels = []; window._enVuelo = 0; window._max = 0; window._saves = []; window._falla = {};
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    apiSave = function (r) { var g = JSON.parse(JSON.stringify(r)); g.rev = (Number(g.rev) || 0) + 1; window._saves.push(g.id); window._pl = window._pl.filter(function (p) { return p.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiDelete = function (id) {
      window._enVuelo++; window._max = Math.max(window._max, window._enVuelo); window._dels.push(id);
      return new Promise(function (ok) { setTimeout(function () { window._enVuelo--;
        if (window._falla[id]) { ok({ ok: false, error: 'busy' }); return; }
        window._pl = window._pl.filter(function (p) { return p.id !== id; }); ok({ ok: true }); }, 60); });
    };
    await refrescarEstado(); ULTIMO_ERROR = ''; CARGA_ESTADO = 'ok';
    showView('mis'); var mv = document.getElementById('mis-vendedor'); mv.value = 'Maria Flores'; renderMis();
    return { borr: BORRADORES.length, state: STATE.length };
  });
  chk('0 · arma el panel de prueba (8 ventas de Kommo, 2 pedidos)', r0 && r0.borr === 8 && r0.state === 2, r0);

  console.log('\n── 1. el botón y la ventana ──');
  let r = await ev(() => { var b = document.getElementById('band-ord-btn'); if (!b) return { b: null };
    var t = b.textContent; b.click(); var m = (document.getElementById('modal-box') || {}).textContent || '';
    return { b: t, m: m, c: !!(document.getElementById('bo-c') || {}).checked, v: !!(document.getElementById('bo-v') || {}).checked, boton: (document.getElementById('bo-hacer') || {}).textContent }; });
  chk('1a · la bandeja ofrece «🧹 Ordenar mi bandeja (4)»', r.b && /Ordenar mi bandeja \(4\)/.test(r.b), r.b);
  chk('1b · dos bloques ya tildados: unir las 2 que ya cargaste y sacar las 2 vacías de más de 15 días', r.c && r.v && /Unir las 2 que ya cargaste/.test(r.m) && /Sacar las 2 vacías de más de 15 días/.test(r.m), r);
  chk('1c · nombra cada una (la que ya cargaste → su OC) y dice cuántas quedan', /CLIENTA UNO → 11-101/.test(r.m) && /VACIA VIEJA A · hace 26 días/.test(r.m) && /Después quedan 3/.test(r.m) && r.boton === 'Hacer las 2 cosas', r.m);
  chk('1d · no se tocan la vacía nueva, la que tiene productos, la que tiene monto ni la de otra vendedora', !/VACIA NUEVA|CON PRODUCTOS|CON MONTO|DE OTRA/.test(r.m.replace(/Después quedan[^.]*\./, '')), r.m);

  console.log('\n── 2. «Hacer las 2 cosas», con un borrado que Google no hace ──');
  r = await ev(async () => { window._falla['kommo-4'] = true;
    await bandejaOrdenarHacer(); await new Promise(res => setTimeout(res, 300));
    var ids = BORRADORES.map(function (b) { return b.id; }).sort();
    return { ids: ids, dels: window._dels.slice(), max: window._max, kl: [kleadDe(findById('p1')), kleadDe(findById('p2'))], toast: (document.getElementById('toast') || {}).textContent || '', modal: (document.getElementById('modal') || {}).classList.contains('on') }; });
  chk('2a · une las 2 ya cargadas: cada pedido queda con la marca de su venta de Kommo', r.kl[0] && r.kl[1], r.kl);
  chk('2b · borra de a uno (nunca dos a la vez)', r.max === 1 && r.dels.length === 4, r);
  chk('2c · en la bandeja quedan las 4 que no se tocan y la que Google no borró', JSON.stringify(r.ids) === JSON.stringify(['kommo-4', 'kommo-5', 'kommo-6', 'kommo-7', 'kommo-8']), r.ids);
  chk('2d · el aviso dice lo que se hizo y que 1 no se pudo', /se unieron 2/.test(r.toast) && /se sacó 1 vacía/.test(r.toast) && /1 no se pudo/.test(r.toast) && !r.modal, r.toast);

  console.log('\n── 3. destildar un bloque lo saltea ──');
  r = await ev(async () => { window._falla = {}; window._dels = []; renderMis(); bandejaOrdenarAbrir();
    var t = (document.getElementById('modal-box') || {}).textContent || '';
    var v = document.getElementById('bo-v'); return { t: t, hay: !!v }; });
  chk('3a · queda solo la vacía que falló: un bloque, «Hacer esto (1)»', r.hay && /Sacar la vacía de más de 15 días/.test(r.t) && /Hacer esto \(1\)/.test(r.t), r.t);
  r = await ev(async () => { var v = document.getElementById('bo-v'); v.checked = false; v.dispatchEvent(new Event('change'));
    var b = document.getElementById('bo-hacer'); var dis = b.disabled; await bandejaOrdenarHacer(); return { dis: dis, dels: window._dels.length }; });
  chk('3b · sin nada tildado el botón no hace nada', r.dis === true && r.dels === 0, r);
  await ev(() => { closeModal(); });

  console.log('\n── 4. sin la bandera ──');
  r = await ev(() => { window.BANDEJA_PRUEBA = false; renderMis(); return !!document.getElementById('band-ord-btn'); });
  chk('4 · sin `BANDEJA_PRUEBA` (las pruebas de siempre) el botón no sale', r === false, r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
