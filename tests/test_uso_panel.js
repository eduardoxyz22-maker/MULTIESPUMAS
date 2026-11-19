/* 📊 (mejora 382, 16/11) QUÉ PARTES DEL PANEL SE USAN Y CUÁLES NO.
   Cuida: con la contraseña, Administración → Herramientas tiene «📊 Uso del panel» (sin la contraseña, no); la tabla sale SOLO de lo que ya
   guarda la planilla: el cierre de entregas contra los ✅ de a uno, los tildes de la Lista de carga y «Ya salió» (el último día), el camión
   anotado, el stock de las tiendas, el cierre comercial, el talonario, los lugares guardados, los «Ya lo corregí» por vendedora, las facturas,
   las ventas de Kommo por unir, los retiros con cobros tildados y el Excel; verde/ámbar/gris; lo que no deja rastro dice «no se puede medir»;
   arriba, lo que más trabajo ahorraría; «🙈 Sacarla de la vista» esconde su botón en este aparato (y se puede volver a mostrar); «👍 Está
   bien así» la deja en gris claro; «🎓 Que Bloki la enseñe» guarda el pedido en la fila `__ensena__` (relee la planilla antes); sin la
   bandera (`USO_PRUEBA`), el botón no sale.
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia. Red cortada, planilla de mentira, datos inventados.
   Se corre:  node tests/test_uso_panel.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    try { localStorage.removeItem('me_uso'); } catch (e) {}
    CONNECTED = true; UNLOCKED = true; window.USO_PRUEBA = true;
    document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block';
    window._hoja = {}; window._env = [];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); g.rev = (Number(g.rev) || 0) + 1; window._env.push(g); window._hoja[g.id] = g; return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: Object.keys(window._hoja).map(function (k) { return JSON.parse(JSON.stringify(window._hoja[k])); }) }); };
    var T = function (iso, h) { return new Date(iso + 'T' + (h || '11:00') + ':00-04:00').getTime(); };
    var P = function (id, o) { return Object.assign({ id: id, oc: '11-' + id.slice(1), nota: id.slice(1), vendedor: 'Isabel Robledo', cliente: 'CLIENTE ' + id.toUpperCase(), celular: '70000000',
      fecha: '2026-11-12', turno: 'AM', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1000 }], saldo: 0, acuenta: 1000,
      pagado: true, metodoPago: '', entregado: false, vehiculo: '', ts: T('2026-11-10'), fotos: [], rev: 1 }, o); };
    var eH = function (d, q, dia) { return [{ v: 1, t: T(dia || '2026-11-12', '15:00'), q: q || 'Logística', d: d }]; };
    var conP = function (o, x) { o.productos = o.productos.map(function (y) { return Object.assign({}, y, x); }); return o; };
    var av = function (i, v, ok) { var a = { id: 'av' + i, k: 'k' + i, pid: 'x', vend: v, cli: 'C', f: '2026-11-10', m: 100, met: 'QR', txt: 't', t: T('2026-11-10') }; if (ok) { a.ok = T('2026-11-11'); a.okPor = v; } return a; };
    STATE = [
      conP(P('p1', { entregado: true, vehiculo: 'Carry' }), { eT: T('2026-11-12', '18:00'), eF: '2026-11-12', eQ: 'Ernesto', eH: eH('cierre de entregas', 'Logística · Ernesto') }),
      conP(P('p2', { entregado: true, fecha: '2026-11-13', vehiculo: 'Carry' }), { eT: T('2026-11-13', '18:00'), eF: '2026-11-13', eQ: 'Ernesto' }),
      conP(P('p3', { entregado: true, fecha: '2026-11-13' }), { eH: eH('ficha de Administración') }),
      conP(P('p4', { entregado: true, fecha: '2026-11-14' }), { eH: eH('ficha de Administración', 'Logística', '2026-11-14') }),
      conP(P('p5', { entregado: true, fecha: '2026-11-14' }), { eH: eH('Mis pedidos', 'Logística', '2026-11-14'), fdoc: 'F', fdocn: '77' }),
      P('p6', { fecha: '2026-11-14' }), P('p7', { fecha: '2026-11-14' }),
      { id: CTA_AV_ID, cliente: '📣', observaciones: JSON.stringify({ v: 1, a: [av(1, 'Isabel Robledo', 1), av(2, 'Isabel Robledo'), av(3, 'Juan Pablo Paredes'), av(4, 'Juan Pablo Paredes'), av(5, 'Juan Pablo Paredes')] }), productos: [], rev: 1 },
      { id: DEST_ID, cliente: '📌', observaciones: JSON.stringify({ v: 1, k: [JSON.stringify(['d', 'tienda amiga', 'eduardo anez', 1, 'https://www.google.com/maps?q=-17.7,-63.1', 'Norte', 'Bodega', 'TIENDA AMIGA', 'Eduardo Añez'])] }), productos: [], rev: 1 }
    ];
    STATE.forEach(function (p) { window._hoja[p.id] = JSON.parse(JSON.stringify(p)); });
    CARGA_CHK = {}; CARGA_CHK['2026-10-10|Carry|COLCHON|'] = 1; CARGA_CHK[cargaChkKey('2026-10-12', 'Carry', CARGA_SALIO) + '|08:40'] = 1;
    BORRADORES = [];
    saveMirror();
    showView('admin'); try { renderAdmin(); } catch (e) {}
  });

  console.log('\n── 1. el botón ──');
  let r = await ev(() => ({ b: !!document.getElementById('uso-btn'), txt: (document.getElementById('uso-btn') || {}).textContent }));
  chk('1a · con la contraseña, Herramientas tiene «📊 Uso del panel»', r.b && /Uso del panel/.test(r.txt), r);
  r = await ev(() => { UNLOCKED = false; usoBotonPintar(); var b = !!document.getElementById('uso-btn'); UNLOCKED = true; usoBotonPintar(); return b; });
  chk('1b · sin la contraseña, no', r === false, r);

  console.log('\n── 2. la tabla ──');
  r = await ev(() => { usoAbrir(); var fila = function (k) { var tr = document.querySelector('#uso-ov tr[data-k="' + k + '"]'); return tr ? { cls: tr.className, txt: tr.textContent.replace(/\s+/g, ' ') } : null; };
    return { cierre: fila('cierre'), carga: fila('carga'), salio: fila('salio'), camion: fila('camion'), tst: fila('tst'), ccm: fila('ccm'), dest: fila('dest'), aviso: fila('aviso'), factura: fila('factura'),
      buscar: fila('buscar'), top: (document.getElementById('uso-top') || {}).textContent || '', sub: (document.querySelector('#uso-ov .uso-sub') || {}).textContent || '' }; });
  chk('2a · ✅ Cierre de entregas: 2 días con cierre, el ✅ de a uno 3 veces (ámbar), quién: Ernesto', r.cierre && /uso-ambar/.test(r.cierre.cls) && /2 días con cierre/.test(r.cierre.txt) && /de a uno 3 veces/.test(r.cierre.txt) && /Ernesto/.test(r.cierre.txt), r.cierre);
  chk('2b · tildes de la Lista de carga y «Ya salió»: nada en 30 días, con el último día (gris)', r.carga && /uso-gris/.test(r.carga.cls) && /el último el 10\/10/.test(r.carga.txt) && r.salio && /uso-gris/.test(r.salio.cls) && /el último el 12\/10/.test(r.salio.txt), [r.carga, r.salio]);
  chk('2c · el camión anotado: 2 de 7 entregas de los últimos 14 días', r.camion && /2 de 7 entregas/.test(r.camion.txt), r.camion);
  chk('2d · stock de las tiendas y cierre comercial: «nunca» en gris; un lugar guardado', r.tst && /uso-gris/.test(r.tst.cls) && /nunca se guardó un conteo/.test(r.tst.txt) && r.ccm && /nunca se tocó/.test(r.ccm.txt) && r.dest && /1 lugar guardado/.test(r.dest.txt), [r.tst, r.ccm, r.dest]);
  chk('2e · «Ya lo corregí» por vendedora (Juan 0/3 · Isabel 1/2)', r.aviso && /Juan 0\/3/.test(r.aviso.txt) && /Isabel 1\/2/.test(r.aviso.txt), r.aviso);
  chk('2f · la factura: 1 de 7 ventas de noviembre', r.factura && /1 de 7 ventas/.test(r.factura.txt), r.factura);
  chk('2g · lo que no deja rastro dice «no se puede medir»', r.buscar && /no se puede medir/.test(r.buscar.txt), r.buscar);
  chk('2h · arriba: lo que más trabajo ahorraría (la factura: 6 sin anotar)', /Lo que más trabajo ahorraría/.test(r.top) && /factura/.test(r.top), r.top);
  chk('2i · dice de dónde sale y que nadie es vigilado', /Nadie es vigilado/.test(r.sub), r.sub);

  console.log('\n── 3. 🙈 y 👍, en este aparato ──');
  r = await ev(() => { var b = document.querySelector('#uso-ov tr[data-k="tst"] button[onclick*="\'o\'"]'); b.click();
    var btn = document.getElementById('stk-tst-btn'); return { oc: JSON.parse(localStorage.getItem('me_uso')).o.tst > 0, disp: btn ? getComputedStyle(btn).display : 'sin botón',
      txt: document.querySelector('#uso-ov tr[data-k="tst"]').textContent }; });
  chk('3a · «🙈 Sacarla de la vista» esconde el botón de Stock de las tiendas en este aparato (y ofrece volver a mostrarla)', r.oc && r.disp === 'none' && /Volver a mostrarla/.test(r.txt) && /escondida en este aparato/.test(r.txt), r);
  r = await ev(() => { document.querySelector('#uso-ov tr[data-k="tst"] button[onclick*="\'o\'"]').click(); var btn = document.getElementById('stk-tst-btn'); return btn ? getComputedStyle(btn).display : 'sin botón'; });
  chk('3b · «↩️ Volver a mostrarla» la devuelve', r !== 'none', r);
  r = await ev(() => { document.querySelector('#uso-ov tr[data-k="ccm"] button[onclick*="\'b\'"]').click(); var tr = document.querySelector('#uso-ov tr[data-k="ccm"]'); return { cls: tr.className, txt: tr.textContent }; });
  chk('3c · «👍 Está bien así» la deja en gris claro, en este aparato', /uso-ok/.test(r.cls) && /está bien así \(en este aparato\)/.test(r.txt), r);

  console.log('\n── 4. 🎓 Que Bloki la enseñe ──');
  r = await ev(async () => { var b = document.querySelector('#uso-ov tr[data-k="cierre"] .uso-ens'); var n0 = window._env.length; b.click();
    await new Promise(res => setTimeout(res, 200)); var g = window._hoja[ENSENA_ID]; var o = g ? JSON.parse(g.observaciones) : null;
    return { n: window._env.length - n0, e: o && o.e, sis: g ? esFilaSistema(g) : null, ped: ensenaPedidos() }; });
  chk('4 · «🎓 Que Bloki la enseñe» guarda el pedido en la fila `__ensena__` (fila del sistema) para todos los aparatos', r.n === 1 && r.e && r.e.cierre && r.e.cierre.t > 0 && r.sis === true && r.ped.cierre, r);

  console.log('\n── 5. sin la bandera ──');
  r = await ev(() => { closeModal(); window.USO_PRUEBA = false; usoBotonPintar(); return !!document.getElementById('uso-btn'); });
  chk('5 · sin `USO_PRUEBA` (las pruebas de siempre) el botón no sale', r === false, r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
