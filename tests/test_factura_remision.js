/* 🧾 LA FACTURA O LA NOTA DE REMISIÓN, OBLIGATORIA, LA ANOTA LA VENDEDORA EN CONTABILIDAD (06/11). El dueño: *«factura/nota remisión.
   obligatorio»* y después: *«los vendedores generan pedido… aún no saben qué nro de factura o nota remisión les tocará… que lo puedan
   colocar en contabilidad»*.
   Cuida: el formulario del pedido NO lo pide (se guarda igual que siempre); corregir el pedido desde el formulario lo conserva; en la
   ficha de Contabilidad se elige 🧾 Factura / 📄 Nota de remisión y se anota el N° (sin tipo o sin N° no se guarda); es obligatorio para las
   ventas del equipo desde el 01/11 (no las de octubre, ni Eduardo, ROHO, ATC, RPT); lo dicen «Para hacer» de Contabilidad (con su filtro),
   el control del cierre (rojo), el «Para hacer» de la vendedora (la lista abre la ficha de Contabilidad), el chip de la tabla y el Excel.
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la publicada). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, timezoneId: 'America/La_Paz' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-06T10:00:00-04:00') });   // viernes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));
  const espera = (ms) => ev((ms) => new Promise(r => setTimeout(r, ms)), ms);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    loadFromServer = function () {};
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    var ts = function (f) { return new Date(f + 'T11:00:00-04:00').getTime(); };
    var P = function (o) { return Object.assign({ id: 'x', oc: '11-001', nota: '1', vendedor: 'Carola Chavez', cliente: 'CLIENTE', celular: '70000000', fecha: '2026-11-09', turno: 'AM',
      zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', codigo: '', cant: 1, precio: 3200 }], saldo: 3200, acuenta: 0,
      pagado: false, metodoPago: '', entregado: false, ts: ts('2026-11-03'), fotos: [] }, o); };
    window._pl = [
      P({ id: 'n1', oc: '11-101', nota: '501', cliente: 'ANA NOVIEMBRE' }),
      P({ id: 'n2', oc: '11-102', nota: '502', cliente: 'BRUNO NOVIEMBRE', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', codigo: '', cant: 1, precio: 3200, fdoc: 'F', fdocn: '7788' }] }),
      P({ id: 'o1', oc: '10-301', nota: '400', cliente: 'CARLA OCTUBRE', ts: ts('2026-10-20'), fecha: '2026-10-25' }),
      P({ id: 'e1', oc: '11-103', nota: '', vendedor: 'Eduardo Añez', cliente: 'MULTICENTER' }),
      P({ id: 'a1', oc: 'ATC 11-001', nota: '', cliente: 'DIEGO ATC' }),
      P({ id: 'm1', oc: '11-104', nota: '503', vendedor: 'Maria Flores', cliente: 'ELENA MARIA' })
    ];
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
  });

  // 1. El formulario no lo pide
  let r = await ev(async () => {
    showView('form'); resetForm();
    var hay = !!document.getElementById('f-doc-venta');
    document.getElementById('f-fecha').value = '2026-11-09'; segSet('f-turno', 'AM');
    document.getElementById('f-vendedor').value = 'Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value = 'CLIENTE NUEVO'; document.getElementById('f-celular').value = '70000000';
    document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-direccion').value = 'CALLE FALSA 1'; document.getElementById('f-nota').value = '1234';
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '3200'; refreshDelButtons();
    segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3200';
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 400));
    return { hay: hay, guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent || '' };
  });
  chk('1a · el formulario del pedido NO tiene el selector de factura o remisión', r.hay === false, r);
  chk('1b · una venta se guarda sin decir nada de la factura (la vendedora todavía no sabe el número)', r.guardo === true, r.toast);

  // 2. Corregir desde el formulario lo conserva
  await ev(() => { STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); editPedido('n2'); });
  await espera(250);
  r = await ev(async () => {
    document.getElementById('f-direccion').value = 'OTRA CALLE 2';
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    var g = window._pl.find(x => x.id === 'n2');
    return { guardo: window._saves > n0, prods: g && g.productos, dir: g && g.direccion };
  });
  chk('2 · corregir el pedido desde el formulario conserva la factura anotada', r.guardo && r.dir === 'OTRA CALLE 2' && r.prods.every(x => x.fdoc === 'F' && x.fdocn === '7788'), r);

  // 3. Quién la tiene que tener
  r = await ev(() => {
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    var f = function (id) { return docVentaFalta(findById(id)); };
    return { n1: f('n1'), n2: f('n2'), o1: f('o1'), e1: f('e1'), a1: f('a1'), m1: f('m1') };
  });
  chk('3 · obligatoria en las ventas del equipo desde el 01/11 (no octubre, ni Eduardo, ni ATC; la que ya la tiene, no)', r.n1 === true && r.m1 === true && r.n2 === false && r.o1 === false && r.e1 === false && r.a1 === false, r);

  // 4. La ficha de Contabilidad
  r = await ev(async () => {
    showView('conta'); var m = document.getElementById('cta-mes'); if (m) m.value = '2026-11'; segSet('cta-mode', 'mes');
    showContaModal('n1');
    var box = document.getElementById('cta-doc');
    var o = { hay: !!box, btns: box ? [].map.call(box.querySelectorAll('button[data-v]'), b => b.textContent.trim()) : [], aviso: /Obligatorio/.test((document.getElementById('modal-box') || document.body).textContent) };
    var n0 = window._saves;
    ctaDocGuardar('n1'); o.sinTipo = { guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent };
    ctaDocTipo('n1', 'R');
    ctaDocGuardar('n1'); o.sinNum = { guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent };
    document.getElementById('cta-doc-num').value = ' 00451 ';
    ctaDocGuardar('n1'); await new Promise(r => setTimeout(r, 400));
    var g = window._pl.find(x => x.id === 'n1');
    o.guardo = window._saves > n0; o.prods = g && g.productos;
    o.despues = !!document.getElementById('cta-doc') && document.getElementById('cta-doc-num').value;
    o.falta = docVentaFalta(findById('n1'));
    return o;
  });
  chk('4a · la ficha de Contabilidad tiene «🧾 Factura» / «📄 Nota de remisión», el N° y dice que es obligatorio', r.hay && /Factura/.test(r.btns[0]) && /remisi/i.test(r.btns[1]) && r.aviso, r);
  chk('4b · sin elegir el tipo no se guarda', r.sinTipo && !r.sinTipo.guardo && /FACTURA o con NOTA DE REMISI/.test(r.sinTipo.toast), r.sinTipo);
  chk('4c · sin el número no se guarda', r.sinNum && !r.sinNum.guardo && /N° de la nota de remisión/.test(r.sinNum.toast), r.sinNum);
  chk('4d · con tipo y número se guarda en los productos (fdoc R, fdocn 00451) y deja de faltar', r.guardo && r.prods.every(x => x.fdoc === 'R' && x.fdocn === '00451') && r.falta === false && r.despues === '00451', r);

  // 5. Para hacer, filtro, cierre, la vendedora, tabla y Excel
  r = await ev(() => {
    window._pl = window._pl.filter(x => ['n1', 'n2', 'o1', 'e1', 'a1', 'm1'].indexOf(x.id) >= 0);   // sin la venta nueva del paso 1 (a esa sí le falta)
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    var L = contaLista(), I = cxHacerDatos(L, {}), it = I.find(x => /factura o nota de remisi/i.test(x.t));
    var d = cxChipDef({ k: 'sdoc' }), filt = L.filter(d.f).map(p => p.id);
    var C = nxCierreControl('2026-11'), rojo = C.rojo.find(x => /factura o nota de remisi/i.test(x.t));
    var mineC = STATE.filter(p => p.vendedor === 'Carola Chavez'), mineM = STATE.filter(p => p.vendedor === 'Maria Flores');
    var vc = misHacerDatos('Carola Chavez', mineC).find(x => /factura/i.test(x.t)), vm = misHacerDatos('Maria Flores', mineM).find(x => /factura/i.test(x.t));
    var lista = MIS_LISTAS.sdoc;
    var hojas = null, _b = buildXlsx, _d = downloadBlob;
    buildXlsx = function (sh) { hojas = JSON.parse(JSON.stringify(sh)); return new Uint8Array([1]); }; downloadBlob = function () {};
    try { exportConta(); } finally { buildXlsx = _b; downloadBlob = _d; }
    var mx = hojas ? hojas[0].matrix : [], cab = (mx[0] || []).map(c => c && typeof c === 'object' ? c.v : c), n = cab.length;
    var fila = function (oc) { return mx.find(f => f && f[3] === oc) || []; };
    return { it: it && { n: it.n, sev: it.sev, fn: it.fn }, filt: filt, rojo: rojo && rojo.n, vc: vc && vc.n, vm: vm && vm.n, abrir: lista && lista.abrir,
             cab: [cab[n - 3], cab[n - 2], cab[n - 1]], f1: [fila('11-101')[n - 2], fila('11-101')[n - 1]], f2: [fila('11-102')[n - 2], fila('11-102')[n - 1]], fm: [fila('11-104')[n - 2], fila('11-104')[n - 1]],
             chipF: docVentaChip(findById('n2')), chipFalta: docVentaChip(findById('m1')), chipOct: docVentaChip(findById('o1')) };
  });
  chk('5a · «Para hacer» de Contabilidad lo pide en rojo y «Ver» filtra la tabla', r.it && r.it.n === 1 && r.it.sev === 'r' && /sdoc/.test(r.it.fn) && r.filt.join() === 'm1', r);
  chk('5b · el control del cierre del mes lo pone en rojo', r.rojo === 1, r.rojo);
  chk('5c · el «Para hacer» de la vendedora: Maria tiene una, Carola ninguna (ya la anotó) y la lista abre la ficha de Contabilidad', r.vm === 1 && !r.vc && r.abrir === 'showContaModal', r);
  chk('5d · el chip de la tabla dice «Fact. 7788», el que falta «❓ sin factura/remisión» y uno de octubre nada', /Fact\. 7788/.test(r.chipF) && /sin factura\/remisi/.test(r.chipFalta) && r.chipOct === '', r);
  chk('5e · el Excel lleva al FINAL «FACTURA / REMISIÓN» y su N° (FALTA cuando falta)', r.cab[0] === 'OBSERVACIONES' && r.cab[1] === 'FACTURA / REMISIÓN' && r.cab[2] === 'N° FACTURA / REMISIÓN' &&
      r.f1.join() === 'NOTA DE REMISIÓN,00451' && r.f2.join() === 'FACTURA,7788' && r.fm.join() === 'FALTA,', r);

  chk('sin errores de JavaScript', errors.length === 0, errors);
  console.log('\n' + PASS + ' bien, ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
