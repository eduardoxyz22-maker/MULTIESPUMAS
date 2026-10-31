/* 💵 EL PRECIO DE VENTA ES OBLIGATORIO (31/10). El dueño: *«coloca un filtro, que al cargar una venta los vendedores coloquen sí o sí
   precio de venta del producto. no pueden generar un pedido ni nada, si no cargar el pedido»*.
   Cuida: una venta (📄 OC, también la venta de tienda) no se guarda con un producto sin «Precio c/u»; ATC, RPT, Eduardo, ROHO y los
   pedidos internos no lo piden; un pedido viejo que ya venía sin precio: el vendedor tiene que ponerlo, Administración (con la clave)
   puede guardarlo igual tras preguntar, pero un producto NUEVO sin precio no pasa ni con la clave. «Para guardar», los pasos y el
   asterisco dicen lo mismo que Guardar.
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la publicada). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let DIALOGO = 'aceptar', preguntas = [];
  page.on('dialog', d => { preguntas.push(d.message().slice(0, 160)); return DIALOGO === 'aceptar' ? d.accept() : d.dismiss(); });
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });   // martes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 160) }));

  await ev(() => {
    window.__sinFlag = precioObligatorio('Carola Chavez');   // sin PRECIO_PRUEBA: apagado en Playwright (las pruebas de siempre)
    window.PRECIO_PRUEBA = 1;
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
  });

  /* Llena una venta como una vendedora; `o.prods` = [[producto, precio], …] ('' = sin precio). */
  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    if (o.tienda) { try { abrirVentaTienda(); } catch (e) { VENTA_TIENDA = true; try { pintarModoTienda(); } catch (x) {} } }
    document.getElementById('f-fecha').value = '2026-11-04'; segSet('f-turno', 'AM');
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = o.cliente || 'CLIENTE INVENTADO';
    document.getElementById('f-celular').value = '70000000';
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    var n = document.getElementById('f-nota'); if (n) n.value = '1234';
    if (o.tipo === 'ATC') {
      segSet('f-atc-tipo', 'gar'); document.getElementById('f-atc-motivo').value = 'Hundimiento';
      document.getElementById('f-atc-detalle').value = 'hundido en el medio, no retoma su forma';
      document.getElementById('f-atc-compra').value = '2025-03-10';
      var pz = document.getElementById('f-pz-col'); if (pz) pz.checked = true;
    }
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    (o.prods || [['TITANIO LATEX', '']]).forEach(function (x) { addProdRow(x[0], '160x190', '', 1, ''); var c = box.lastElementChild; c.querySelector('.prod-precio').value = x[1]; });
    refreshDelButtons();
    if (!o.tienda && o.tipo !== 'ATC' && o.tipo !== 'RPT') { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3000'; }
    try { updateMetodoVisibility(); } catch (e) {}
  }, o);
  const guardar = () => ev(async () => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 400));
    var rojos = [].map.call(document.querySelectorAll('#f-productos .prod-precio.err'), function (e) { return e.closest('.prod-card').querySelector('.prod-desc').value; });
    return { guardo: window._saves > n0, rojos: rojos, toast: (document.getElementById('toast') || {}).textContent || '', ult: window._pl[window._pl.length - 1] || null };
  });

  const sinFlag = await ev(() => window.__sinFlag);
  chk('0 · en Playwright sin PRECIO_PRUEBA queda apagado (las pruebas de siempre guardan ventas de ejemplo sin precio)', sinFlag === false, sinFlag);

  // ============ 1. el campo dice que es obligatorio ============
  await llenar({});
  const ast = await ev(() => {
    var lb = document.querySelector('#f-productos .prod-precio-w .mini-lb');
    return { conVend: getComputedStyle(lb, '::after').content, oblig: precioObligatorio('Carola Chavez') };
  });
  chk('1a · en una venta «Precio c/u» lleva el asterisco de obligatorio', /\*/.test(ast.conVend) && ast.oblig === true, ast);
  await llenar({ vend: 'Eduardo Añez' });
  const astE = await ev(() => getComputedStyle(document.querySelector('#f-productos .prod-precio-w .mini-lb'), '::after').content);
  chk('1b · para Eduardo no (no se le pide)', !/\*/.test(astE), astE);

  // ============ 2. sin precio no se guarda ============
  await llenar({});
  let r = await guardar();
  chk('2a · una venta con un producto SIN precio no se guarda', !r.guardo, r);
  chk('2b · el precio queda en rojo y el aviso dice qué falta', r.rojos.join() === 'TITANIO LATEX' && /PRECIO/.test(r.toast) && /TITANIO LATEX/.test(r.toast), { rojos: r.rojos, toast: r.toast });
  const paso = await ev(() => ({ pasos: fxPasosEstado()[1], der: (document.getElementById('fx-der') || {}).textContent || '' }));
  chk('2c · el paso «Productos» no está listo sin el precio (lo mismo que Guardar)', paso.pasos === false, paso.pasos);

  await llenar({ prods: [['TITANIO LATEX', '3200'], ['ALMOHADA', '']] });
  r = await guardar();
  chk('2d · con dos productos, el que no tiene precio frena y solo él queda en rojo', !r.guardo && r.rojos.join() === 'ALMOHADA', r.rojos);

  await llenar({ prods: [['TITANIO LATEX', '0']] });
  r = await guardar();
  chk('2e · un precio en 0 tampoco vale', !r.guardo && r.rojos.length === 1, r.rojos);

  // ============ 3. con precio se guarda ============
  await llenar({ prods: [['TITANIO LATEX', '3200'], ['ALMOHADA', '120,50']] });
  const paso2 = await ev(() => { try { fxDerPintar(); } catch (e) {} return { p: fxPasosEstado()[1], der: (document.getElementById('fx-der') || {}).textContent || '' }; });
  r = await guardar();
  chk('3a · con el precio de cada producto se guarda', r.guardo && r.ult && r.ult.productos.map(x => x.precio).join() === '3200,120.5', r.ult && r.ult.productos);
  chk('3b · el paso «Productos» queda listo', paso2.p === true, paso2.p);

  // ============ 4. venta de tienda también ============
  await llenar({ tienda: true });
  const tie = await ev(() => VENTA_TIENDA);
  r = await guardar();
  chk('4 · una venta de tienda sin precio tampoco se guarda', tie === true && !r.guardo && r.rojos.length === 1, { tie, rojos: r.rojos, toast: r.toast });

  // ============ 5. lo que no es venta o no lo pide ============
  const no = await ev(() => {
    var o = {};
    o.eduardo = precioObligatorio('Eduardo Añez'); o.roho = precioObligatorio('ROHO'); o.alba = precioObligatorio('ALBA');
    segSet('f-doc-tipo', 'ATC'); setDocTipo(); o.atc = precioObligatorio('Carola Chavez');
    segSet('f-doc-tipo', 'RPT'); setDocTipo(); o.rpt = precioObligatorio('Carola Chavez');
    segSet('f-doc-tipo', 'OC'); setDocTipo(); o.oc = precioObligatorio('Carola Chavez');
    return o;
  });
  chk('5a · no lo piden Eduardo, ROHO ni un pedido interno (ALBA)', no.eduardo === false && no.roho === false && no.alba === false, no);
  chk('5b · ni una ATC ni una RPT (no se vende nada)', no.atc === false && no.rpt === false && no.oc === true, no);
  await llenar({ vend: 'Eduardo Añez' });
  r = await guardar();
  chk('5c · Eduardo guarda sin precio, como siempre', r.guardo, r.toast);
  await llenar({ tipo: 'RPT' });
  r = await guardar();
  chk('5d · una RPT se guarda sin precio', r.guardo, r.toast);

  // ============ 6. un pedido viejo que ya venía sin precio ============
  await ev(() => {
    var p = { id: 'viejo1', oc: '10-201', fecha: '2026-11-04', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE VIEJO', celular: '70000001',
      zona: 'Sur', direccion: 'CALLE 2', nota: '999', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1 }], pagado: false, saldo: 3000, ts: Date.now() - 86400000 * 5, rev: 1 };
    window._pl.push(JSON.parse(JSON.stringify(p))); STATE.push(p); saveMirror();
  });
  const editar = () => ev(async () => { UNLOCKED = false; editPedido('viejo1'); await new Promise(r => setTimeout(r, 300)); });
  await editar();
  r = await guardar();
  chk('6a · la vendedora que edita su pedido viejo sin precio tiene que ponerlo', !r.guardo && r.rojos.length === 1, { rojos: r.rojos, toast: r.toast });

  await editar(); await ev(() => { UNLOCKED = true; });
  preguntas = []; DIALOGO = 'aceptar';
  r = await guardar();
  chk('6b · con la clave de Administración se guarda igual, después de preguntar', r.guardo && preguntas.some(q => /SIN el precio/.test(q)), { guardo: r.guardo, preguntas });

  await editar(); await ev(() => { UNLOCKED = true; });
  preguntas = []; DIALOGO = 'cancelar';
  r = await guardar();
  chk('6c · con la clave, «Cancelar» deja el precio en rojo para ponerlo', !r.guardo && r.rojos.length === 1, r.rojos);

  await editar(); await ev(() => { UNLOCKED = true; addProdRow('ALMOHADA', '50x70', '', 2, ''); });
  preguntas = []; DIALOGO = 'aceptar';
  r = await guardar();
  chk('6d · un producto NUEVO sin precio no pasa ni con la clave', !r.guardo && r.rojos.indexOf('ALMOHADA') >= 0 && !preguntas.some(q => /SIN el precio/.test(q)), { rojos: r.rojos, preguntas });

  await editar(); await ev(() => { document.querySelector('#f-productos .prod-precio').value = '3100'; });
  r = await guardar();
  chk('6e · la vendedora le pone el precio y se guarda', r.guardo && r.ult && r.ult.productos[0].precio === 3100, r.ult && r.ult.productos);

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
