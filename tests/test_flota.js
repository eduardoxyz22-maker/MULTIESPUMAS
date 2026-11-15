/* 🚌 311 · «VA POR FLOTA»: LOS ENVÍOS AL INTERIOR (15/11; el dueño: «ok pero siempre enviamos por pagar» → «Por pagar» de entrada, se puede cambiar).
   Cuida: que sin la bandera no aparece; la casilla en una venta a domicilio (no en RPT); al prenderla, lo VACÍO se pone solo (zona BIMODAL, la
   ubicación aproximada de la terminal, la dirección «TRANSPORTADORA <empresa> — enviar a <ciudad>») y lo escrito a mano no se pisa; «Por
   pagar» de entrada; al apagarla se saca solo lo que puso ella; se guarda adentro de los productos y vuelve al editar; logística lo ve como
   etiqueta («🚌 Trans Guarayos → Concepción · por pagar») en la ficha y en la Lista de carga; en Mis pedidos, «📸 Subí la foto de la guía»
   para lo que ya salió sin foto (abre `pedirFoto`), y no para lo que ya tiene foto o es de otro pedido.
   Reloj clavado (miércoles 11/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_flota.js */
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

  const hay = await ev(() => typeof flotaPintar === 'function' && !!document.getElementById('wrap-flota'));
  chk('0 · la página tiene la 311 (`flotaPintar`, `#wrap-flota`)', hay === true, hay);
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
      document.getElementById('f-vendedor').value = 'Maria Flores'; applyVendedorLite();
      document.getElementById('f-cliente').value = 'CLIENTE INTERIOR'; document.getElementById('f-celular').value = '71113333'; document.getElementById('f-nota').value = '8101';
      document.getElementById('f-fecha').value = '2026-11-13'; segSet('f-turno', 'AM');
      var c = document.querySelector('#f-productos .prod-card');
      c.querySelector('.prod-desc').value = 'COLCHON SOFT'; c.querySelector('.prod-medida').value = '140x190'; c.querySelector('.prod-codigo').value = 'COLT0048'; c.querySelector('.prod-cant').value = '1'; c.querySelector('.prod-precio').value = '2000';
      document.getElementById('f-saldo').value = '2000';
    };
    window._set = function (id, v) { var e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    window._ck = function (on) { var e = document.getElementById('f-flota'); e.checked = on; e.dispatchEvent(new Event('change', { bubbles: true })); };
    window._f = function () { var w = document.getElementById('wrap-flota'), b = document.getElementById('f-flota-box');
      return { vis: !w.hidden && w.offsetParent !== null, box: !b.hidden && b.offsetParent !== null, z: document.getElementById('f-zona').value, m: document.getElementById('f-maps').value,
        d: document.getElementById('f-direccion').value, pago: segVal('f-flota-pago'), prev: document.getElementById('f-flota-prev').textContent }; };
  });

  // ============ 1. sin la bandera ============
  await ev(() => { window.FLOTA_PRUEBA = 0; _nuevo(); flotaPintar(false); });
  let r = await ev(() => _f());
  chk('1 · sin `FLOTA_PRUEBA` (Playwright) no aparece', r.vis === false, r);

  // ============ 2. prender: lo vacío se pone solo ============
  await ev(() => { window.FLOTA_PRUEBA = 1; _nuevo(); flotaPintar(false); });
  r = await ev(() => _f());
  chk('2a · en una venta a domicilio está la casilla «🚌 Va por flota», apagada', r.vis && !r.box, r);
  await ev(() => { _ck(true); });
  r = await ev(() => _f());
  chk('2b · al prenderla: zona BIMODAL, la ubicación aproximada de la terminal y la dirección de la transportadora', r.box && r.z === 'BIMODAL' && /maps\?q=-17\.78\d*,-63\.16\d*&aprox=1$/.test(r.m) && r.d === 'TRANSPORTADORA ZONA BIMODAL', r);
  chk('2c · el flete de la flota arranca «Por pagar» (dueño: «siempre enviamos por pagar») y pide la empresa y la ciudad', r.pago === 'X' && /Poné la empresa y la ciudad.*por pagar/.test(r.prev), r);
  await ev(() => { _set('f-flota-emp', 'Trans Guarayos'); _set('f-flota-ciu', 'Concepción'); _set('f-flota-rec', 'Juana P. 70000000'); });
  r = await ev(() => _f());
  chk('2d · con la empresa y la ciudad: «TRANSPORTADORA TRANS GUARAYOS — enviar a CONCEPCIÓN»', r.d === 'TRANSPORTADORA TRANS GUARAYOS — enviar a CONCEPCIÓN', r.d);
  chk('2e · dice cómo lo ve logística: «🚌 Trans Guarayos → Concepción · por pagar»', /Logística lo ve así: 🚌 Trans Guarayos → Concepción · por pagar/.test(r.prev), r.prev);
  await ev(() => { _ck(false); });
  r = await ev(() => _f());
  chk('2f · al apagarla se saca lo que puso ella', !r.box && r.z === '' && r.m === '' && r.d === '', r);
  await ev(() => { document.getElementById('f-direccion').value = 'Llevar a la terminal, oficina 12'; document.getElementById('f-zona').value = 'TERMINAL'; _ck(true); });
  r = await ev(() => _f());
  chk('2g · lo escrito a mano no se pisa (dirección y zona)', r.d === 'Llevar a la terminal, oficina 12' && r.z === 'TERMINAL' && /aprox=1$/.test(r.m), r);
  r = await ev(() => { segSet('f-doc-tipo', 'RPT'); setDocTipo(); flotaPintar(false); var a = _f().vis; segSet('f-doc-tipo', 'OC'); setDocTipo(); flotaPintar(false); return { rpt: a }; });
  chk('2h · en una RPT no aparece', r.rpt === false, r);

  // ============ 3. guardar y editar ============
  await ev(() => { _nuevo(); _ck(true); _set('f-flota-emp', 'Trans Guarayos'); _set('f-flota-ciu', 'Concepción'); _set('f-flota-rec', 'Juana P.'); submitPedido(); });
  await esperar(800);
  r = await ev(() => { var g = _pl[_pl.length - 1] || {}; return { n: _pl.length, fl: (g.productos || []).map(function (x) { return x.flota; }), zona: g.zona, maps: g.maps, dir: g.direccion, id: g.id }; });
  chk('3a · se guarda adentro de los productos, con «por pagar»', r.n === 1 && r.fl.length === 1 && JSON.stringify(r.fl[0]) === JSON.stringify({ e: 'Trans Guarayos', c: 'Concepción', r: 'Juana P.', p: 'X' }) && r.zona === 'BIMODAL' && /aprox=1/.test(r.maps), r);
  const id = r.id;
  r = await ev((id) => { var p = findById(id); return { chips: fichaObsChips(p).map(function (c) { return c.i + ' ' + c.t; }), tags: vdCargaTags(p), aprox: esUbicAprox(p.maps) }; }, id);
  chk('3b · logística ve la etiqueta «🚌 Trans Guarayos → Concepción · por pagar» en la ficha y en la Lista de carga', r.chips.indexOf('🚌 Trans Guarayos → Concepción · por pagar') >= 0 && /Trans Guarayos → Concepción · por pagar/.test(r.tags), r);
  chk('3c · la ubicación queda marcada «aproximada» (cada transportadora tiene su puesto en la terminal)', r.aprox === true, r);
  await ev((id) => { editPedido(id); }, id);
  await esperar(150);
  r = await ev(() => { var o = _f(); o.emp = document.getElementById('f-flota-emp').value; return o; });
  chk('3d · al editar vuelve prendida con lo guardado', r.box && r.emp === 'Trans Guarayos' && r.pago === 'X', r);
  await ev(() => { document.querySelector('#f-flota-pago button[data-val="P"]').click(); submitPedido(); });
  await esperar(800);
  r = await ev((id) => { var g = _pl.filter(function (x) { return x.id === id; })[0]; return { p: g.productos[0].flota.p, txt: flotaTxt(flotaDe(g)) }; }, id);
  chk('3e · «Pagado» se guarda y se dice «flete pagado»', r.p === 'P' && r.txt === 'Trans Guarayos → Concepción · flete pagado', r);

  // ============ 4. la foto de la guía ============
  r = await ev((id) => {
    var p = findById(id), mine = STATE.filter(function (x) { return mismoVendedor(x.vendedor, 'Maria Flores'); });
    var futuro = misHacerDatos('Maria Flores', mine).filter(function (o) { return /guía/.test(o.t); }).length;
    p.fecha = '2026-11-10';   // ya salió
    var it = misHacerDatos('Maria Flores', mine).filter(function (o) { return /guía/.test(o.t); })[0] || null;
    window._fotoPedida = ''; var viejo = pedirFoto; pedirFoto = function (x) { window._fotoPedida = x; };
    misVerLista('flotaGuia'); var fila = document.querySelector('#modal .t2-f'); if (fila) fila.click();
    pedirFoto = viejo;
    p.fotos = ['fotoGuia123'];
    var conFoto = misHacerDatos('Maria Flores', mine).filter(function (o) { return /guía/.test(o.t); }).length;
    return { futuro: futuro, it: it && { t: it.t, b: it.b, n: it.n }, pedida: window._fotoPedida, conFoto: conFoto };
  }, id);
  chk('4a · lo que todavía no salió no pide la guía', r.futuro === 0, r);
  chk('4b · ya salido y sin foto: «📸 Subí la foto de la guía de la flota» en «Para hacer»', r.it && r.it.n === 1 && /Subí la foto de la guía/.test(r.it.t) && r.it.b === 'Subir', r);
  chk('4c · tocar el pedido abre para elegir la foto (las fotos de la entrega, `pedirFoto`)', r.pedida === id, r);
  chk('4d · con una foto ya no la pide', r.conFoto === 0, r);

  chk('5 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
