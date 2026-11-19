/* 💳 308 · ¿CÓMO PAGA LO QUE FALTA? (y llevar el POS) (15/11; el dueño aprobó la 308: «ok»; no es obligatorio).
   Cuida: que sin la bandera no aparece; que sale SOLO con saldo por cobrar en una venta a domicilio (no con «SÍ, pagado», ni en una venta de
   tienda, ni en una RPT); elegir y des-elegir; que se guarda adentro de los productos (`pcob`) y vuelve al editar; que sin saldo se va;
   que logística lo ve SIN montos nuevos: la hoja de ruta («💰 COBRAR … · 💳 llevar el POS»), la ficha (etiqueta) y la Lista de carga; y que una
   venta pagada no lo muestra.
   Reloj clavado (miércoles 11/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_paga_como.js */
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

  const hay = await ev(() => typeof pcobPintar === 'function' && !!document.getElementById('wrap-pcob'));
  chk('0 · la página tiene la 308 (`pcobPintar`, `#wrap-pcob`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    window._pl = [];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    window._nuevo = function () {
      showView('form'); resetForm();
      document.getElementById('f-vendedor').value = 'Isabel Robledo'; applyVendedorLite();
      document.getElementById('f-cliente').value = 'CLIENTE PRUEBA'; document.getElementById('f-celular').value = '71112222'; document.getElementById('f-nota').value = '8001';
      document.getElementById('f-zona').value = 'Equipetrol'; document.getElementById('f-fecha').value = '2026-11-13'; segSet('f-turno', 'AM');
      var c = document.querySelector('#f-productos .prod-card');
      c.querySelector('.prod-desc').value = 'COLCHON TITANIO ICE'; c.querySelector('.prod-medida').value = '140x190'; c.querySelector('.prod-codigo').value = 'CH1220'; c.querySelector('.prod-cant').value = '1';
      c.querySelector('.prod-precio').value = '2580';
    };
    window._saldo = function (v) { var e = document.getElementById('f-saldo'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    window._w = function () { var w = document.getElementById('wrap-pcob'); return { vis: !w.hidden && w.offsetParent !== null, on: [].filter.call(w.querySelectorAll('button'), function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.getAttribute('data-val'); }) }; };
  });

  // ============ 1. sin la bandera ============
  await ev(() => { window.PAGA_COMO_PRUEBA = 0; _nuevo(); _saldo('1580'); });
  await esperar(80);
  let r = await ev(() => _w());
  chk('1 · sin `PAGA_COMO_PRUEBA` (Playwright) no aparece', r.vis === false, r);

  // ============ 2. cuándo aparece ============
  await ev(() => { window.PAGA_COMO_PRUEBA = 1; _nuevo(); });
  await esperar(80);
  r = await ev(() => _w());
  chk('2a · sin saldo por cobrar no aparece', r.vis === false, r);
  await ev(() => { _saldo('1580'); });
  await esperar(80);
  r = await ev(() => { var o = _w(); o.txt = document.getElementById('wrap-pcob').innerText.replace(/\s+/g, ' '); return o; });
  chk('2b · con saldo aparece «¿Cómo paga lo que falta?» con 💵 Efectivo · 📱 QR · 💳 Tarjeta, ninguno elegido', r.vis && /Cómo va a pagar el cliente el SALDO/.test(r.txt) && /Efectivo/.test(r.txt) && /QR/.test(r.txt) && /Tarjeta/.test(r.txt) && r.on.length === 0, r);
  await ev(() => { document.querySelector('#f-pagado button[data-val="SI"]').click(); });
  await esperar(80);
  r = await ev(() => _w());
  chk('2c · con «SÍ, pagado» se va', r.vis === false, r);
  await ev(() => { document.querySelector('#f-pagado button[data-val="NO"]').click(); _saldo('1580'); });
  await esperar(80);
  r = await ev(() => { segSet('f-doc-tipo', 'RPT'); setDocTipo(); pcobPintar(); var a = _w(); segSet('f-doc-tipo', 'OC'); setDocTipo(); _saldo('1580'); pcobPintar(); return { rpt: a.vis, oc: _w().vis }; });
  chk('2d · en una RPT no; de vuelta en OC, sí', r.rpt === false && r.oc === true, r);
  await ev(() => { _nuevo(); _saldo('1580'); });   // pasar a RPT limpia el cliente y el celular: se carga de nuevo
  await esperar(80);

  // ============ 3. elegir y guardar ============
  r = await ev(() => { var b = function (v) { document.querySelector('#f-pcob button[data-val="' + v + '"]').click(); return _w().on.join(); };
    return { t: b('T'), t2: b('T'), q: b('Q') }; });
  chk('3a · tocar elige, tocar de nuevo saca, y se cambia', r.t === 'T' && r.t2 === '' && r.q === 'Q', r);
  await ev(() => { submitPedido(); });
  await esperar(800);
  r = await ev(() => { var g = _pl[_pl.length - 1] || {}; return { n: _pl.length, pc: (g.productos || []).map(function (x) { return x.pcob; }), saldo: g.saldo, id: g.id }; });
  chk('3b · se guarda adentro de los productos (`pcob:"Q"`)', r.n === 1 && r.pc.length === 1 && r.pc[0] === 'Q' && Number(r.saldo) === 1580, r);
  const id = r.id;

  // ============ 4. logística lo ve, sin montos nuevos ============
  r = await ev((id) => { var p = findById(id);
    return { ruta: cobroRutaTxt(p).t, chips: fichaObsChips(p).map(function (c) { return c.i + ' ' + c.t; }), tags: vdCargaTags(p) }; }, id);
  chk('4a · la hoja de ruta: «💰 COBRAR Bs 1.580,00 · 📱 llevar el QR de la empresa»', r.ruta === '💰 COBRAR Bs 1.580,00 · 📱 llevar el QR de la empresa', r.ruta);
  chk('4b · la ficha de logística: la etiqueta «📱 Llevar el QR de la empresa» (sin montos)', r.chips.indexOf('📱 Llevar el QR de la empresa') >= 0 && !r.chips.some(function (c) { return /Bs/.test(c); }), r.chips);
  chk('4c · la Lista de carga: la etiqueta', /llevar el QR de la empresa/.test(r.tags), r.tags);
  r = await ev((id) => { var p = JSON.parse(JSON.stringify(findById(id))); setPcob(p, 'T'); var t = { ruta: cobroRutaTxt(p).t, chips: fichaObsChips(p).map(function (c) { return c.i + ' ' + c.t; }), tags: vdCargaTags(p) };
    setPcob(p, 'E'); t.rutaE = cobroRutaTxt(p).t; t.tagsE = vdCargaTags(p); p.pagado = true; p.saldo = 0; t.pagado = cobroRutaTxt(p).t; t.chipsPag = fichaObsChips(p).length; return t; }, id);
  chk('4d · con tarjeta: «💳 llevar el POS» en la hoja y en la ficha', /💳 llevar el POS$/.test(r.ruta) && r.chips.indexOf('💳 Llevar el POS (paga con tarjeta)') >= 0 && /llevar el POS/.test(r.tags), r);
  chk('4e · efectivo: lo dice la hoja de ruta; la ficha y la carga no agregan nada', /💵 paga en efectivo$/.test(r.rutaE) && r.tagsE === '', r);
  chk('4f · pagada: nada', r.pagado === '✅ PAGADO' && r.chipsPag === 0, r);

  // ============ 5. al editar ============
  await ev((id) => { editPedido(id); }, id);
  await esperar(200);
  r = await ev(() => _w());
  chk('5a · al editar vuelve elegido', r.vis && r.on.join() === 'Q', r);
  await ev(() => { _saldo('0'); });
  await esperar(100);
  r = await ev(() => _w());
  chk('5b · sin saldo se esconde', r.vis === false, r);
  await ev(() => { submitPedido(); });
  await esperar(800);
  r = await ev((id) => { var g = _pl.filter(function (x) { return x.id === id; })[0] || {}; return { pc: (g.productos || []).map(function (x) { return x.pcob || ''; }), saldo: g.saldo }; }, id);
  chk('5c · y al guardar sin saldo la marca se va', r.pc.join() === '' && Number(r.saldo) === 0, r);

  chk('6 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
