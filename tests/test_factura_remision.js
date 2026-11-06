/* 🧾 FACTURA O NOTA DE REMISIÓN, OBLIGATORIO (06/11). El dueño: *«factura/nota remisión. obligatorio.»* (con «sin preferencia» quedó lo
   propuesto: elegir uno de los dos; con factura, «Facturar a» y el NIT también).
   Cuida: una venta (📄 OC, también la de tienda) no se guarda sin elegir 🧾 Factura o 📄 Nota de remisión; con factura y sin «Facturar a»
   o sin NIT, tampoco; con remisión no hace falta el NIT; Eduardo, ROHO, ATC, RPT e internos no lo piden; queda en los productos (`fdoc`)
   y al editar vuelve elegido; «Para guardar» y los pasos dicen lo mismo que Guardar; Contabilidad lo muestra y lo baja al final del Excel.
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la publicada). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-06T10:00:00-04:00') });   // viernes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    window.__sinFlag = (typeof docVentaObligatoria === 'function') ? docVentaObligatoria('Carola Chavez') : 'no existe';
    window.DOCV_PRUEBA = 1;
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
  });

  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    if (o.tienda) { try { abrirVentaTienda(); } catch (e) { VENTA_TIENDA = true; } }
    document.getElementById('f-fecha').value = '2026-11-09'; segSet('f-turno', 'AM');
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO';
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
    addProdRow('TITANIO LATEX', '160x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '3200';
    refreshDelButtons();
    if (!o.tienda && o.tipo !== 'ATC' && o.tipo !== 'RPT') { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3200'; }
    if (o.doc) { var b = document.querySelector('#f-doc-venta button[data-val="' + o.doc + '"]'); if (b) b.click(); }
    if (o.fac != null) document.getElementById('f-facturar').value = o.fac;
    if (o.nit != null) document.getElementById('f-nit').value = o.nit;
    try { updateMetodoVisibility(); } catch (e) {}
  }, o);
  const guardar = () => ev(async () => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 400));
    return { guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent || '',
             rojos: ['f-facturar', 'f-nit'].filter(function (id) { return document.getElementById(id).classList.contains('err'); }),
             ult: window._pl[window._pl.length - 1] || null };
  });

  const sinFlag = await ev(() => window.__sinFlag);
  chk('0 · en Playwright sin DOCV_PRUEBA queda apagado (las pruebas de siempre guardan ventas de ejemplo)', sinFlag === false, sinFlag);

  // 1. El selector
  await llenar({});
  let v = await ev(() => {
    var w = document.getElementById('wrap-doc-venta'), r = document.getElementById('f-doc-venta-req');
    return { hay: !!w, vis: !!w && w.style.display !== 'none' && w.offsetParent !== null, btns: [].map.call(document.querySelectorAll('#f-doc-venta button'), b => b.textContent.trim()), ast: !!r && !r.hidden };
  });
  chk('1a · en una venta está «¿Con factura o con nota de remisión?» con sus dos botones y el asterisco', v.hay && v.vis && v.btns.length === 2 && /Factura/.test(v.btns[0]) && /remisi/i.test(v.btns[1]) && v.ast, v);

  // 2. Sin elegir no se guarda
  let r = await guardar();
  chk('2a · sin elegir factura o remisión, la venta NO se guarda', !r.guardo, r);
  chk('2b · el aviso dice qué falta', /FACTURA o con NOTA DE REMISI/.test(r.toast), r.toast);
  let pasos = await ev(() => { try { fxDerPintar(); } catch (e) {} return { p: fxPasosEstado()[0], der: (document.getElementById('fx-der') || {}).textContent || '' }; });
  chk('2c · el paso 1 no está listo y «Para guardar» lo pide (lo mismo que Guardar)', pasos.p === false && /Factura o remisión/.test(pasos.der), pasos.p);

  // 3. Factura sin «Facturar a» / NIT
  await llenar({ doc: 'F' });
  v = await ev(() => ({ req: [].map.call(document.querySelectorAll('#wrap-factura .dv-req'), e => !e.hidden), opc: [].map.call(document.querySelectorAll('#wrap-factura .dv-opc'), e => !e.hidden) }));
  chk('3a · con factura, «Facturar a» y NIT pasan a tener asterisco (sin «opcional»)', v.req.every(Boolean) && v.opc.every(x => !x), v);
  r = await guardar();
  chk('3b · con factura y sin «Facturar a» ni NIT no se guarda, y los dos quedan en rojo', !r.guardo && r.rojos.join() === 'f-facturar,f-nit' && /Con factura/.test(r.toast), { rojos: r.rojos, toast: r.toast });
  await llenar({ doc: 'F', fac: 'EMPRESA INVENTADA SRL' });
  r = await guardar();
  chk('3c · con factura y sin NIT tampoco', !r.guardo && r.rojos.join() === 'f-nit' && /NIT/.test(r.toast), { rojos: r.rojos, toast: r.toast });

  // 4. Con factura completa se guarda
  await llenar({ doc: 'F', fac: 'EMPRESA INVENTADA SRL', nit: '1234567' });
  pasos = await ev(() => fxPasosEstado()[0]);
  r = await guardar();
  chk('4a · con factura, «Facturar a» y NIT se guarda', r.guardo, r.toast);
  chk('4b · queda en los productos (fdoc = F) y con su NIT', r.ult && r.ult.productos.every(x => x.fdoc === 'F') && r.ult.nit === '1234567', r.ult && r.ult.productos);
  chk('4c · el paso 1 queda listo', pasos === true, pasos);
  const idF = r.ult && r.ult.id;

  // 5. Remisión: sin NIT
  await llenar({ doc: 'R' });
  r = await guardar();
  chk('5a · con nota de remisión se guarda sin «Facturar a» ni NIT', r.guardo && r.ult.productos.every(x => x.fdoc === 'R'), r.ult && r.ult.productos);

  // 6. Venta de tienda también
  await llenar({ tienda: true });
  r = await guardar();
  chk('6 · una venta de tienda sin elegir tampoco se guarda', !r.guardo && /FACTURA o con NOTA DE REMISI/.test(r.toast), r.toast);

  // 7. Lo que no lo pide
  await llenar({ vend: 'Eduardo Añez' });
  v = await ev(() => ({ ast: !document.getElementById('f-doc-venta-req').hidden, hint: document.getElementById('f-doc-venta-hint').textContent }));
  r = await guardar();
  chk('7a · Eduardo: el selector está pero sin asterisco («opcional») y se guarda sin elegir', !v.ast && /opcional/.test(v.hint) && r.guardo && r.ult.productos.every(x => !x.fdoc), { v, guardo: r.guardo });
  const no = await ev(() => {
    var o = { roho: docVentaObligatoria('ROHO'), alba: docVentaObligatoria('ALBA') };
    segSet('f-doc-tipo', 'ATC'); setDocTipo(); o.atc = docVentaObligatoria('Carola Chavez'); o.atcVis = document.getElementById('wrap-doc-venta').style.display !== 'none';
    segSet('f-doc-tipo', 'RPT'); setDocTipo(); o.rpt = docVentaObligatoria('Carola Chavez');
    segSet('f-doc-tipo', 'OC'); setDocTipo(); o.oc = docVentaObligatoria('Carola Chavez');
    return o;
  });
  chk('7b · no lo piden ROHO, un pedido interno (ALBA), una ATC ni una RPT; en una ATC el selector no se ve', no.roho === false && no.alba === false && no.atc === false && no.rpt === false && no.oc === true && no.atcVis === false, no);
  await llenar({ tipo: 'ATC' });
  r = await guardar();
  chk('7c · una ATC se guarda sin elegirlo y sin la marca', r.guardo && r.ult.productos.every(x => !x.fdoc), r.toast);

  // 8. Al editar vuelve elegido; un pedido viejo lo pide
  v = await ev((id) => {
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    editPedido(id);
    return segVal('f-doc-venta');
  }, idF);
  await ev(() => new Promise(r => setTimeout(r, 200)));
  v = await ev(() => segVal('f-doc-venta'));
  chk('8a · al editar una venta con factura, el selector vuelve en «Factura»', v === 'F', v);
  await ev(() => {
    var viejo = { id: 'viejo1', oc: '10-500', nota: '999', vendedor: 'Carola Chavez', cliente: 'CLIENTE VIEJO', celular: '70000001', fecha: '2026-11-09', turno: 'AM',
      zona: 'Norte', direccion: 'Calle', maps: '', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', codigo: '', cant: 1, precio: 3200 }], saldo: 3200, acuenta: 0,
      pagado: false, metodoPago: '', ts: new Date('2026-10-20T10:00:00-04:00').getTime(), fotos: [] };
    window._pl.push(viejo); STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); editPedido('viejo1');
  });
  await ev(() => new Promise(r => setTimeout(r, 250)));
  r = await guardar();
  chk('8b · un pedido viejo sin la marca: al editarlo la vendedora la tiene que elegir', !r.guardo && /NOTA DE REMISI/.test(r.toast), r.toast);

  // 9. Contabilidad
  const co = await ev(() => {
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    var pF = STATE.find(p => (p.productos || []).some(x => x.fdoc === 'F')), pR = STATE.find(p => (p.productos || []).some(x => x.fdoc === 'R'));
    var hojas = null; var _b = buildXlsx, _d = downloadBlob;
    buildXlsx = function (sh) { hojas = JSON.parse(JSON.stringify(sh)); return new Uint8Array([1]); }; downloadBlob = function () {};
    try { showView('conta'); var m = document.getElementById('cta-mes'); if (m) m.value = '2026-11'; segSet('cta-mode', 'mes'); exportConta(); } finally { buildXlsx = _b; downloadBlob = _d; }
    var mx = hojas ? hojas[0].matrix : [], cab = (mx[0] || []).map(c => c && typeof c === 'object' ? c.v : c);
    var col = cab.length - 1, filaF = mx.find(f => f && f[3] === pF.oc), filaR = mx.find(f => f && f[3] === pR.oc);
    return { chipF: docVentaChip(pF), chipR: docVentaChip(pR), ult: cab[col], antes: cab[col - 1], vF: filaF && filaF[col], vR: filaR && filaR[col], nCab: cab.length };
  });
  chk('9a · Contabilidad muestra el chip «🧾 Factura» / «📄 Remisión»', /Factura/.test(co.chipF) && /Remisi/.test(co.chipR), co);
  chk('9b · el Excel de Contabilidad lo lleva al FINAL (después de OBSERVACIONES) con FACTURA / NOTA DE REMISIÓN', co.ult === 'FACTURA / REMISIÓN' && co.antes === 'OBSERVACIONES' && co.vF === 'FACTURA' && co.vR === 'NOTA DE REMISIÓN', co);

  chk('sin errores de JavaScript', errors.length === 0, errors);
  console.log('\n' + PASS + ' bien, ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
