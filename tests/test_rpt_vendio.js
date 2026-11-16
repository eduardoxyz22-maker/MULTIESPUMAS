/* 🏪 305 · LA RPT SE ARMA CON LO QUE VENDIÓ LA TIENDA (15/11; el dueño: «ok pero aún no subo stock de las tiendas, ¿debo subirlo cada mes?»
   → con un conteo en «🏬 Stock de las tiendas» se descuenta lo que ya tiene; sin conteo se propone por lo vendido y se dice en una línea).
   Cuida: que sin la bandera no aparece; que al elegir la sucursal en una RPT NUEVA sale la lista de lo vendido en esa tienda DESPUÉS de cargar
   su última RPT (lo de antes, otra tienda y lo que no es venta de tienda no); bolsas/sábanas/protectores en su grupo; «Sin conteo de la
   tienda: se propone por lo vendido»; con conteo, «Le queda» = `tstCalcular` y pedir = vendido − le queda; «Agregar los tildados» llena los
   renglones como «Reposición» (lo destildado no, la cantidad cambiada sí) y no se guarda nada; sin RPT anterior, los últimos 30 días; al
   editar una RPT no sale.
   Reloj clavado (sábado 14/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_rpt_vendio.js */
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
  await page.clock.setFixedTime(new Date('2026-11-14T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  const hay = await ev(() => typeof rptVendioDatos === 'function' && !!document.getElementById('rpt-vendio'));
  chk('0 · la página tiene la 305 (`rptVendioDatos`, `#rpt-vendio`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(async () => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    var T = function (s) { return Date.parse(s + '-04:00'); };
    var VT = function (id, ts, prods, suc, vend) { return { id: id, oc: '11-' + id, vendedor: vend || 'Fernando Peinado', cliente: 'CLIENTE ' + id, direccion: 'SALIÓ DE TIENDA · ' + (suc || 'Charcas'), zona: 'TIENDA', fecha: '', turno: '',
      productos: prods, pagado: true, ts: T(ts) }; };
    var SOFT = function (n) { return { desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: n, precio: 2000 }; };
    var ALM = function (n) { return { desc: 'ALMOHADA', medida: '50x70', codigo: 'CD1403', cant: n, precio: 150 }; };
    window._pl = [
      { id: 'r1', oc: 'RPT 11-008', vendedor: 'Fernando Peinado', cliente: 'Charcas', zona: 'Centro', fecha: '2026-11-10', turno: 'AM', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: 2, rtipo: 'Reposición' }], ts: T('2026-11-08T11:00:00') },
      VT('v1', '2026-11-07T16:00:00', [SOFT(1)]),                         // antes de la RPT: ya la cubría ella
      VT('v2', '2026-11-08T09:00:00', [SOFT(1)]),                         // el mismo día, antes de cargarla: tampoco
      VT('v3', '2026-11-08T15:00:00', [SOFT(1), ALM(2)]),                 // después: sí
      VT('v4', '2026-11-10T12:00:00', [SOFT(2), { desc: 'PROTECTOR DE COLCHON', medida: '140x190', codigo: '', cant: 1, precio: 300 }]),
      VT('v5', '2026-11-12T12:00:00', [ALM(4)], 'Mutualista', 'Mauricio Merida'),   // otra tienda
      { id: 'd1', oc: '11-090', vendedor: 'Fernando Peinado', cliente: 'CLIENTE D', zona: 'Norte', fecha: '2026-11-13', turno: 'AM', productos: [SOFT(3)], ts: T('2026-11-11T12:00:00') }   // a domicilio
    ];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    await refrescarEstado();
    window._rpt = function (suc) {
      showView('form'); resetForm(); segSet('f-doc-tipo', 'RPT'); setDocTipo();
      document.getElementById('f-vendedor').value = 'Fernando Peinado'; applyVendedorLite();
      var e = document.getElementById('f-rpt-suc'); e.value = suc; e.dispatchEvent(new Event('input', { bubbles: true }));
    };
    window._vis = function () { var el = document.getElementById('rpt-vendio'); return { vis: !!el && !el.hidden && el.offsetParent !== null, txt: el ? el.innerText.replace(/\s+/g, ' ').trim() : '',
      filas: el ? [].map.call(el.querySelectorAll('tr[data-i]'), function (tr) { var td = tr.querySelectorAll('td'); return { p: td[1].textContent, v: td[2].textContent, q: td[3].textContent, pedir: tr.querySelector('.vd-rv-q').value, ck: tr.querySelector('.vd-rv-ck').checked }; }) : [] }; };
  });

  // ============ 1. sin la bandera ============
  await ev(() => { window.RPT_VENDIO_PRUEBA = 0; _rpt('Charcas'); });
  let r = await ev(() => _vis());
  chk('1 · sin `RPT_VENDIO_PRUEBA` (Playwright) no aparece', r.vis === false, r);

  // ============ 2. con la bandera, sin conteo ============
  await ev(() => { window.RPT_VENDIO_PRUEBA = 1; _rpt('Charcas'); });
  r = await ev(() => _vis());
  chk('2a · al elegir Charcas sale «📦 Lo que vendió Charcas desde su última RPT (08/11)»', r.vis && /Lo que vendió Charcas desde su última RPT \(08\/11\)/.test(r.txt), r.txt);
  const soft = r.filas.filter(f => /SOFT/.test(f.p))[0] || {}, alm = r.filas.filter(f => /ALMOHADA/.test(f.p))[0] || {}, prot = r.filas.filter(f => /PROTECTOR/.test(f.p))[0] || {};
  chk('2b · SOFT 140x190 vendido 3 (lo de antes de cargar la RPT del 08/11 no cuenta, ni lo de otra tienda ni lo de domicilio)', soft.v === '3' && alm.v === '2' && r.filas.length === 3, r.filas);
  chk('2c · sin conteo: «Le queda» vacío, pedir = lo vendido, tildado', soft.q === '—' && soft.pedir === '3' && soft.ck && alm.pedir === '2', r.filas);
  chk('2d · lo dice en una línea: «Sin conteo de la tienda: se propone por lo vendido.»', /Sin conteo de la tienda: se propone por lo vendido\./.test(r.txt), r.txt);
  chk('2e · el protector va en su grupo («Bolsas, sábanas y protectores»), al final', /Bolsas, sábanas y protectores/.test(r.txt) && r.filas[r.filas.length - 1].p.indexOf('PROTECTOR') >= 0, r.filas.map(f => f.p));
  const btn = await ev(() => document.getElementById('vd-rv-add').textContent);
  chk('2f · el botón dice cuántos agrega', btn === 'Agregar los 3 tildados a la RPT', btn);

  // ============ 3. agregar: lo destildado no, la cantidad cambiada sí, nada se guarda ============
  const n0 = await ev(() => _pl.length);
  r = await ev(() => {
    var trs = document.querySelectorAll('#rpt-vendio tr[data-i]');
    [].forEach.call(trs, function (tr) { var p = tr.querySelectorAll('td')[1].textContent;
      if (/PROTECTOR/.test(p)) { var c = tr.querySelector('.vd-rv-ck'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); }
      if (/ALMOHADA/.test(p)) { var q = tr.querySelector('.vd-rv-q'); q.value = '5'; q.dispatchEvent(new Event('input', { bubbles: true })); } });
    var b = document.getElementById('vd-rv-add').textContent;
    rptVendioAgregar();
    var cards = [].map.call(document.querySelectorAll('#f-productos .prod-card'), function (c) { return [c.querySelector('.prod-desc').value, c.querySelector('.prod-codigo').value, c.querySelector('.prod-cant').value, (c.querySelector('.prod-rtipo') || {}).value]; });
    return { b: b, cards: cards, msg: _vis().txt };
  });
  chk('3a · el botón se actualiza al destildar (2)', r.b === 'Agregar los 2 tildados a la RPT', r.b);
  chk('3b · llena los renglones con el código, la cantidad y «Reposición» (sin el renglón vacío del principio)', JSON.stringify(r.cards) === JSON.stringify([['COLCHON SOFT', 'COLT0048', '3', 'Reposición'], ['ALMOHADA', 'CD1403', '5', 'Reposición']]), r.cards);
  chk('3c · dice qué agregó y deja ver la lista otra vez', /Agregaste 2 productos de lo que vendió Charcas/.test(r.msg) && /Ver la lista otra vez/.test(r.msg), r.msg);
  chk('3d · no se guardó nada', (await ev(() => _pl.length)) === n0);

  // ============ 4. con conteo de la tienda ============
  r = await ev(async () => {
    var ks = stockAliasDe(stockClave({ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048' })), ka = stockAliasDe(stockClave({ desc: 'ALMOHADA', medida: '50x70', codigo: 'CD1403' }));
    var u = {}; u[ks] = 4; u[ka] = 10;
    _pl.push(filaSistema(TST_ID, '🏬 STOCK DE LAS TIENDAS', JSON.stringify({ v: 1, s: { Charcas: { f: '2026-10-31', u: u, t: Date.parse('2026-10-31T20:00:00-04:00') } }, x: [], h: [] })));
    await refrescarEstado();
    _rpt('Charcas');
    var T = tstCalcular().Charcas;
    return { vis: _vis(), tieneS: T.P[ks].tiene, tieneA: T.P[ka].tiene };
  });
  const s4 = r.vis.filas.filter(f => /SOFT/.test(f.p))[0] || {}, a4 = r.vis.filas.filter(f => /ALMOHADA/.test(f.p))[0] || {}, p4 = r.vis.filas.filter(f => /PROTECTOR/.test(f.p))[0] || {};
  chk('4a · «Le queda» = lo que dice 🏬 Stock de las tiendas (`tstCalcular`)', s4.q === String(Math.max(0, r.tieneS)) && a4.q === String(Math.max(0, r.tieneA)), { s4, a4, tS: r.tieneS, tA: r.tieneA });
  chk('4b · pedir = vendido − le queda (SOFT: 3 − 1 = 2; nunca menos de 0); lo que ya alcanza queda destildado', s4.pedir === '2' && s4.ck && s4.pedir === String(Math.max(0, 3 - Math.max(0, r.tieneS))) && a4.pedir === String(Math.max(0, 2 - Math.max(0, r.tieneA))) && a4.ck === (Number(a4.pedir) > 0), { s4, a4 });
  chk('4c · lo dice: «Le queda» sale del conteo del 31/10', /conteo del 31\/10 de 🏬 Stock de las tiendas/.test(r.vis.txt) && !/Sin conteo/.test(r.vis.txt), r.vis.txt);
  chk('4d · el protector no tiene «Le queda» (el conteo no lo lleva) y se pide por lo vendido', p4.q === '—' && p4.pedir === '1', p4);

  // ============ 5. sin RPT anterior y al editar ============
  r = await ev(() => { _rpt('Mutualista'); return _vis(); });
  chk('5a · sin RPT anterior: «en los últimos 30 días»', /Lo que vendió Mutualista en los últimos 30 días/.test(r.txt) && r.filas.length === 1 && r.filas[0].v === '4', r);
  r = await ev(() => { editPedido('r1'); return _vis(); });
  chk('5b · al editar una RPT no sale', r.vis === false, r);
  r = await ev(() => { _rpt('Tiendas Roho'); return _vis(); });
  chk('5c · Tiendas Roho no (no es tienda propia)', r.vis === false, r);

  chk('6 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
