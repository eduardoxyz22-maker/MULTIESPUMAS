/* 🏬 (mejora 383, 16/11; dueño: «Cada tienda carga al sistema sus ventas propias») LAS VENTAS DE LAS TIENDAS SALEN DE «POR CARGAR».
   Cuida: toda venta de una TIENDA (la de quien vendió ese día, con el cambio de sucursales del 01/11: Carola era de Central en octubre y es de
   Tienda Banzer desde noviembre) deja de contar como «📥 Por cargar al sistema» de Contabilidad; con su N° de factura o remisión se ve aparte
   como «🏬 La cargó la tienda · F 1234» (chip «🏬 Las carga la tienda», la tabla, la ficha y el Excel); sin N° se lo sigue pidiendo a la
   vendedora (`docVentaFalta`) sin volver a la lista; lo que NO es de una tienda (sin sucursal, los mayoristas de Eduardo) sigue en la lista;
   la tarjeta «Por cargar al sistema», el chip, «Revisar antes de cerrar» y el control del cierre del mes dan el MISMO número; corregir el
   precio de una venta de tienda ya marcada no la vuelve a «sin cargar» (la 380 no aplica); sin la bandera (`TIENDAS_CARGAN_PRUEBA`), como antes.
   Reloj clavado el lunes 16/11/2026 10:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_tiendas_cargan.js   · `PEDIDOS=<archivo>` corre contra otra página. */
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

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    CONNECTED = true; UNLOCKED = true; window.TIENDAS_CARGAN_PRUEBA = true; window.RC_PRUEBA = true;
    window._hoja = {}; window._env = [];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); g.rev = (Number(g.rev) || 0) + 1; window._env.push(g); window._hoja[g.id] = g; return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: Object.keys(window._hoja).map(function (k) { return JSON.parse(JSON.stringify(window._hoja[k])); }) }); };
    var T = function (iso) { return new Date(iso + 'T11:00:00-04:00').getTime(); };
    var P = function (id, o) { return Object.assign({ id: id, oc: '11-' + id.slice(1), nota: id.slice(1), vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + id.toUpperCase(), celular: '70000000',
      fecha: '2026-11-20', turno: 'AM', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1000 }], saldo: 0, acuenta: 1000,
      pagado: true, metodoPago: '~QR BISA 1000 @2026-11-10 #1', entregado: false, ts: T('2026-11-10'), fotos: [], rev: 1 }, o); };
    var doc = function (o, t, n) { o.productos = o.productos.map(function (x) { return Object.assign({}, x, { fdoc: t, fdocn: n, fdocT: T('2026-11-11') }); }); return o; };
    var L = [
      doc(P('t1', { cliente: 'CON FACTURA' }), 'F', '1234'),                                     // Carola · Tienda Banzer · con N°
      P('t2', { vendedor: 'Juan Pablo Paredes', cliente: 'SIN NUMERO' }),                          // Carmelo · sin N°
      P('t3', { cliente: 'DE OCTUBRE', ts: T('2026-10-20'), fecha: '2026-10-25', metodoPago: '~QR BISA 1000 @2026-10-20 #2' }),   // Carola en octubre = Central
      P('t4', { vendedor: 'Fernando Paz', cliente: 'SIN SUCURSAL' }),                              // sin sucursal → Contabilidad
      doc(P('t5', { vendedor: 'Isabel Robledo', cliente: 'YA CARGADA', metodoPago: '~QR BISA 1000 @2026-11-10 #5 · REGISTRADO' }), 'R', '88'),
      P('t6', { vendedor: 'Eduardo Añez', cliente: 'MULTICENTER' })                               // mayorista
    ];
    L.forEach(function (p) { window._hoja[p.id] = JSON.parse(JSON.stringify(p)); });
    STATE = mergePending(L.map(function (p) { return JSON.parse(JSON.stringify(p)); })); saveMirror();
  });

  console.log('\n── 1. quién sale de «por cargar» ──');
  let r = await ev(() => { var f = function (id) { var p = findById(id); return { pc: porCargarSistema(p), t: talCargaAfuera(p), txt: tndCargaTxt(p), falta: docVentaFalta(p), xl: talEnSistemaTxt(p) }; };
    return { t1: f('t1'), t2: f('t2'), t3: f('t3'), t4: f('t4'), t5: f('t5'), t6: f('t6') }; });
  chk('1a · la venta de Tienda Banzer con su factura: no está «por cargar» y se ve «🏬 La cargó la tienda · F 1234»', r.t1.pc === false && r.t1.t === 'Tienda Banzer' && /La cargó la tienda · F 1234/.test(r.t1.txt) && /LA CARGÓ LA TIENDA \(F 1234\)/.test(r.t1.xl), r.t1);
  chk('1b · la de Carmelo sin N°: tampoco está «por cargar», pero se lo sigue pidiendo a la vendedora', r.t2.pc === false && r.t2.t === 'Carmelo' && r.t2.falta === true && /falta el N°/.test(r.t2.txt), r.t2);
  chk('1c · Carola en octubre era de Central: también la carga la tienda (la sucursal de ESE día)', r.t3.pc === false && r.t3.t === 'Central', r.t3);
  chk('1d · sin sucursal (Fernando) y el mayorista (Eduardo): siguen «por cargar» en Contabilidad', r.t4.pc === true && r.t4.t === '' && r.t6.pc === true && r.t6.t === '', [r.t4, r.t6]);
  chk('1e · la que Contabilidad ya marcó cargada sigue «SÍ»', r.t5.pc === false && r.t5.xl === 'SÍ' && r.t5.txt === '', r.t5);

  console.log('\n── 2. los mismos números en todos lados ──');
  r = await ev(() => { showView('conta'); var m = document.getElementById('cta-mes'); if (m) m.value = '2026-11'; segSet('cta-mode', 'mes'); renderConta();
    var L = contaLista(), nc = L.filter(function (p) { return porCargarSistema(p); }).length, C = nxCierreControl('2026-11'), it = C.rojo.concat(C.ambar, C.ok).filter(function (o) { return /cargad[oa] al sistema|por cargar al sistema/i.test(o.t); })[0];
    var chips = (document.getElementById('cx-chips') || {}).textContent || '', card = [].slice.call(document.querySelectorAll('#cta-metrics .mc, #cta-metrics > *')).map(function (x) { return x.textContent; }).filter(function (t) { return /Por cargar al sistema/.test(t); })[0] || '';
    return { lista: L.map(function (p) { return p.id; }), nc: nc, top: CX_TOP_M && CX_TOP_M.nCarg, cierre: it && it.n, cierreS: it && it.s, chips: chips.replace(/\s+/g, ' '), card: card.replace(/\s+/g, ' ') }; });
  chk('2a · la tarjeta, «Para hacer» de arriba y el control del cierre dicen lo mismo (1: la de Fernando)', r.nc === 1 && r.top === 1 && r.cierre === 1, r);
  chk('2b · …y explican cuántas carga cada tienda y cuántas siguen sin N°', /no se cuentan: las carga cada tienda/.test(r.cierreS) && /1 todavía sin N° de factura o remisión: lo pide la vendedora/.test(r.cierreS) && /las carga cada tienda/.test(r.card), r);
  chk('2c · el chip «🏬 Las carga la tienda» las junta aparte (las 2 de noviembre) y «📥 Por cargar al sistema» dice 1', /Las carga la tienda 2/.test(r.chips) && /Por cargar al sistema 1/.test(r.chips), r.chips);

  console.log('\n── 3. la tabla y la ficha ──');
  r = await ev(() => { var tr = [].slice.call(document.querySelectorAll('#tbl-conta tr')).map(function (x) { return x.textContent.replace(/\s+/g, ' '); });
    showContaModal('t1'); var f1 = (document.getElementById('cta-tnd') || {}).textContent || ''; closeModal();
    showContaModal('t2'); var f2 = (document.getElementById('cta-tnd') || {}).textContent || ''; closeModal();
    showContaModal('t4'); var f4 = !!document.getElementById('cta-tnd'); closeModal();
    return { t1: tr.filter(function (t) { return /CON FACTURA/.test(t); })[0] || '', f1: f1, f2: f2, f4: f4 }; });
  chk('3a · en la tabla, la venta con factura dice «🏬 La cargó la tienda · F 1234»', /La cargó la tienda · F 1234/.test(r.t1), r.t1);
  chk('3b · la ficha lo dice; sin N°, «cuando la vendedora anote el N°…»; la que no es de tienda, nada', /La cargó la tienda · F 1234/.test(r.f1) && /falta el N°/.test(r.f2) && /Cuando la vendedora anote el N°/.test(r.f2) && r.f4 === false, r);

  console.log('\n── 4. la 380 no aplica a una venta de tienda ──');
  r = await ev(() => { var a = findById('t5'); a.productos[0].precio = 900; persistPedido(a); var e1 = window._env[window._env.length - 1];
    return { reg: regEnSistema(e1), rc: rcDe(e1).length }; });
  chk('4 · corregir el precio de una venta de tienda ya marcada no la vuelve a «sin cargar» (la carga su tienda)', r.reg === true && r.rc === 0, r);

  console.log('\n── 5. sin la bandera ──');
  r = await ev(() => { window.TIENDAS_CARGAN_PRUEBA = false; var p = findById('t2'); return { pc: porCargarSistema(p), xl: talEnSistemaTxt(p), txt: tndCargaTxt(p) }; });
  chk('5 · sin `TIENDAS_CARGAN_PRUEBA` (las pruebas de siempre) una venta de tienda sigue «por cargar»', r.pc === true && r.xl === 'NO' && r.txt === '', r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
