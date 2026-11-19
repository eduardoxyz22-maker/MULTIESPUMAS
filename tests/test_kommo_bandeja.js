/* 📥 307 · «ESTE CLIENTE YA ESTÁ EN TU BANDEJA DE KOMMO» (15/11; el dueño aprobó la 307: «ok»).
   Cuida: que sin la bandera no aparece; que en un pedido NUEVO, al escribir el celular, si en SU bandeja hay una venta de Kommo con ese número
   sale el cartel (desde cuándo, el lead); que las ya cargadas (§81) y las de otra vendedora no cuentan; «No, es otra venta» lo saca y no
   vuelve con el mismo número; «📥 Usar la de Kommo» convierte el formulario en el completado de ese borrador sin perder lo escrito
   (productos, fecha) y completa solo lo vacío; al guardar queda UNA fila con el id del lead (`kommo-…`), sin duplicar; sin productos
   escritos, trae los de Kommo; editando o en una venta de tienda no aparece.
   Reloj clavado (miércoles 11/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_kommo_bandeja.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-11T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const esperar = (ms) => page.waitForTimeout(ms);

  const hay = await ev(() => typeof kbcBuscar === 'function' && !!document.getElementById('kbc'));
  chk('0 · la página tiene la 307 (`kbcBuscar`, `#kbc`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(async () => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    var T = function (s) { return Date.parse(s + '-04:00'); };
    window._pl = [
      { id: 'kommo-501', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'ROSA M.', celular: '71234567', direccion: 'CALLE INVENTADA 123', saldo: 5200, fecha: '',
        productos: [{ desc: 'TITANIO ICE', medida: '140x190', codigo: 'CH1220', cant: 1, precio: 5200 }], ts: T('2026-11-03T15:00:00') },
      { id: 'kommo-502', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'YA CARGADA', celular: '72222222', saldo: 3000, fecha: '', productos: [], ts: T('2026-11-05T15:00:00') },
      { id: 'kommo-503', estado: BORRADOR_EST, vendedor: 'Maria Flores', cliente: 'DE OTRA', celular: '73333333', saldo: 1000, fecha: '', productos: [], ts: T('2026-11-06T15:00:00') },
      { id: 'p1', oc: '11-050', nota: '501', vendedor: 'Isabel Robledo', cliente: 'YA CARGADA', celular: '72222222', zona: 'Norte', fecha: '2026-11-13', turno: 'AM',
        productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: 1, precio: 3000 }], saldo: 3000, acuenta: 0, ts: T('2026-11-06T10:00:00') }
    ];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    await refrescarEstado();
    window._nuevo = function (o) {
      o = o || {};
      showView('form'); resetForm();
      document.getElementById('f-vendedor').value = o.v || 'Isabel Robledo'; applyVendedorLite();
      document.getElementById('f-fecha').value = '2026-11-13'; segSet('f-turno', 'PM');
      if (o.prod !== false) { var c = document.querySelector('#f-productos .prod-card');
        c.querySelector('.prod-desc').value = 'COLCHON TITANIO LATEX'; c.querySelector('.prod-medida').value = '160x190'; c.querySelector('.prod-codigo').value = 'CH1130'; c.querySelector('.prod-cant').value = '1';
        c.querySelector('.prod-precio').value = '7000'; }
    };
    window._cel = function (v) { var e = document.getElementById('f-celular'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    window._kbc = function () { var e = document.getElementById('kbc'); return { vis: !!e && !e.hidden && e.offsetParent !== null, txt: e ? e.innerText.replace(/\s+/g, ' ') : '' }; };
  });
  const borrs = await ev(() => BORRADORES.map(function (b) { return b.id; }).sort());
  chk('0b · los tres borradores están en la bandeja', JSON.stringify(borrs) === '["kommo-501","kommo-502","kommo-503"]', borrs);

  // ============ 1. sin la bandera ============
  await ev(() => { window.KOMMO_BANDEJA_PRUEBA = 0; _nuevo(); _cel('7123 4567'); });
  await esperar(500);
  let r = await ev(() => _kbc());
  chk('1 · sin `KOMMO_BANDEJA_PRUEBA` (Playwright) no aparece', r.vis === false, r);

  // ============ 2. con la bandera ============
  await ev(() => { window.KOMMO_BANDEJA_PRUEBA = 1; _nuevo(); _cel('7123 4567'); });
  await esperar(500);
  r = await ev(() => _kbc());
  chk('2a · con su celular sale «📥 Este cliente está en tu bandeja de Kommo desde el 03/11 (lead «ROSA M.»…)»', r.vis && /Este cliente está en tu bandeja de Kommo desde el 03\/11/.test(r.txt) && /lead «ROSA M\.», Bs 5\.200/.test(r.txt), r.txt);
  chk('2b · dice lo que trae Kommo y que lo escrito se queda', /Kommo trae: TITANIO ICE 140x190 × 1/.test(r.txt) && /Lo que ya escribiste/.test(r.txt), r.txt);
  await ev(() => { _cel('72222222'); });
  await esperar(500);
  r = await ev(() => _kbc());
  chk('2c · una venta de Kommo que ya está cargada (§81) no cuenta', r.vis === false, r);
  await ev(() => { _cel('73333333'); });
  await esperar(500);
  r = await ev(() => _kbc());
  chk('2d · la de otra vendedora no (es SU bandeja)', r.vis === false, r);

  // ============ 3. «No, es otra venta» ============
  await ev(() => { _cel('71234567'); });
  await esperar(500);
  await ev(() => { [].filter.call(document.querySelectorAll('#kbc button'), function (b) { return /No, es otra venta/.test(b.textContent); })[0].click(); });
  r = await ev(() => _kbc());
  chk('3a · «No, es otra venta» lo saca', r.vis === false, r);
  await ev(() => { _cel('7123-4567'); });
  await esperar(500);
  r = await ev(() => _kbc());
  chk('3b · y no vuelve con el mismo número', r.vis === false, r);

  // ============ 4. «📥 Usar la de Kommo» ============
  await ev(() => { _nuevo(); _cel('71234567'); });
  await esperar(500);
  r = await ev(() => { var b = [].filter.call(document.querySelectorAll('#kbc button'), function (x) { return /Usar la de Kommo/.test(x.textContent); })[0]; if (b) b.click();
    return { edit: EDIT_ID, banner: document.getElementById('edit-banner').classList.contains('on'), cli: document.getElementById('f-cliente').value, dir: document.getElementById('f-direccion').value,
      fecha: document.getElementById('f-fecha').value, prods: [].map.call(document.querySelectorAll('#f-productos .prod-desc'), function (d) { return d.value; }), kbc: _kbc().vis }; });
  chk('4a · el formulario pasa a completar ese borrador (`kommo-501`), con el cartel de edición', r.edit === 'kommo-501' && r.banner && r.kbc === false, r);
  chk('4b · lo escrito se queda (el producto, la fecha) y de Kommo se completa solo lo vacío (nombre, dirección)', JSON.stringify(r.prods) === '["COLCHON TITANIO LATEX"]' && r.fecha === '2026-11-13' && r.cli === 'ROSA M.' && r.dir === 'CALLE INVENTADA 123', r);
  const n0 = await ev(() => _pl.length);
  await ev(() => { document.getElementById('f-nota').value = '7001'; document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-saldo').value = '7000'; submitPedido(); });
  await esperar(900);
  r = await ev(() => { var g = _pl.filter(function (x) { return x.id === 'kommo-501'; })[0] || {};
    return { n: _pl.length, esBorr: g.estado === BORRADOR_EST, cli: g.cliente, prod: (g.productos || []).map(function (x) { return x.desc + ' ' + x.medida; }), fecha: g.fecha, enBandeja: !!borradorDe('kommo-501') }; });
  chk('4c · al guardar queda UNA fila con el id del lead (no se duplica) y ya no es borrador', r.n === n0 && !r.esBorr && r.cli === 'ROSA M.' && JSON.stringify(r.prod) === '["COLCHON TITANIO LATEX 160x190"]' && r.fecha === '2026-11-13', r);
  chk('4d · sale de la bandeja', r.enBandeja === false, r);

  // ============ 5. sin productos escritos trae los de Kommo ============
  r = await ev(async () => {
    _pl.push({ id: 'kommo-601', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'OTRO CLIENTE', celular: '74444444', saldo: 2500, fecha: '', productos: [{ desc: 'ALMOHADA', medida: '50x70', codigo: 'CD1403', cant: 2, precio: 150 }], ts: Date.now() - 86400000 });
    await refrescarEstado();
    _nuevo({ prod: false }); _cel('74444444');
    await new Promise(function (res) { setTimeout(res, 500); });
    kbcUsar();
    return { edit: EDIT_ID, prods: [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return c.querySelector('.prod-desc').value + '|' + c.querySelector('.prod-codigo').value + '|' + c.querySelector('.prod-cant').value; }),
      saldo: document.getElementById('f-saldo').value };
  });
  chk('5 · sin productos escritos trae los de Kommo (y el monto como saldo)', r.edit === 'kommo-601' && r.prods.length === 1 && /CD1403\|2$/.test(r.prods[0]) && r.saldo === '2500', r);

  // ============ 6. editando o en venta de tienda no aparece ============
  r = await ev(async () => { cancelEdit(); editPedido('p1'); _cel('74444444'); await new Promise(function (res) { setTimeout(res, 500); }); return _kbc(); });
  chk('6a · editando un pedido no aparece', r.vis === false, r);
  r = await ev(async () => { resetForm(); VENTA_TIENDA = true; _cel('74444444'); await new Promise(function (res) { setTimeout(res, 500); }); var o = _kbc(); VENTA_TIENDA = false; return o; });
  chk('6b · en una venta de tienda no aparece', r.vis === false, r);

  chk('7 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
