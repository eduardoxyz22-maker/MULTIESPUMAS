/* 🔁 «REPETIR PEDIDO» (§4ok-101, 05/11/2026; mejora 101 del plan del jueves).
   Desde el 01/10 Eduardo cargó 16 pedidos con exactamente los mismos productos que uno anterior del mismo cliente.
   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Qué se puede repetir (`repetirPuede`): una venta sí; ATC, RPT, venta de tienda, borrador de Kommo y filas del sistema no.
   2. El botón: en cada compra de la ficha del cliente (para todos) y en Mis pedidos SOLO con Eduardo elegido (la tarjeta y su ficha).
   3. Abre un pedido NUEVO (sin EDIT_ID) con los mismos productos (desc, medida, código, cantidad, precio) SIN las marcas de logística,
      con cliente, celular, dirección, zona, ubicación, «Facturar a» y NIT; sin fecha, nota, pagos, observaciones ni garantía.
   4. Guardar sin fecha lo frena (para Eduardo no pasa a «hoy» solo); con la fecha se guarda como un pedido nuevo (id y OC nuevos) y el
      pedido de antes queda igual.
   5. Un pedido NUEVO a medio escribir o una EDICIÓN sin guardar: pregunta antes; «Cancelar» deja todo como estaba.
   Datos INVENTADOS. Reloj clavado el martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_repetir_pedido.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 420)) : ''); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let RESP = 'aceptar', preguntas = [];
  page.on('dialog', d => { preguntas.push(d.message().slice(0, 200)); return RESP === 'aceptar' ? d.accept() : d.dismiss(); });
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });   // martes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    window.CLF_PRUEBA = 1;
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = true;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    var dia = 86400000, ahora = Date.now();
    var base = function (id, o) { return Object.assign({ id: id, oc: '10-2' + id.slice(-2), fecha: '2026-10-20', turno: 'PM', vendedor: 'Eduardo Añez', cliente: 'MULTICENTER INVENTADO',
      celular: '70000009', zona: 'Equipetrol', direccion: 'AV. FALSA 123', maps: 'https://www.google.com/maps?q=-17.77,-63.19', facturarA: 'EMPRESA INVENTADA SRL', nit: '1234567',
      nota: '5' + id.slice(-2), garantia: 'JUAN INVENTADO', observaciones: 'Entregar en el depósito de atrás',
      productos: [
        { desc: 'TITANIO LATEX', medida: '160x190', codigo: 'CH0001', cant: 2, precio: 3200, chk: 'ok', chkDe: 'Banzer', prodF: '2026-10-15', prodR: '2026-10-17', eF: '2026-10-20', eT: 1, eQ: 'Ernesto', klead: '999', fmov: 2, sinwa: 1 },
        { desc: 'ALMOHADA', medida: '50x70', codigo: '', cant: 4, precio: 150, chk: 'im', enProd: 1 }
      ],
      pagado: true, saldo: 0, acuenta: 6700, metodoPago: 'Efectivo 6700 @2026-10-18 #501', entregado: true, verificado: true, vehiculo: 'KSC', chofer: 'Luis',
      ts: ahora - 16 * dia, rev: 3, nroDia: 4 }, o || {}); };
    STATE = [
      base('p01'),
      base('p02', { oc: 'ATC 10-002', cliente: 'MULTICENTER INVENTADO' }),
      base('p03', { oc: 'RPT 10-003', cliente: 'Mia Plaza', vendedor: 'Carola Chavez' }),
      base('p04', { fecha: '', direccion: 'SALIÓ DE TIENDA · Mia Plaza', zona: 'TIENDA', vendedor: 'Carola Chavez', cliente: 'OTRO CLIENTE', celular: '70000008' }),
      base('p05', { vendedor: 'Carola Chavez', cliente: 'CLIENTE DE CAROLA', celular: '70000007', oc: '10-205' })
    ];
    window._pl = JSON.parse(JSON.stringify(STATE)); saveMirror();
  });

  // ============ 1. qué se puede repetir ============
  const pu = await ev(() => ({ venta: repetirPuede(findById('p01')), atc: repetirPuede(findById('p02')), rpt: repetirPuede(findById('p03')),
    tienda: repetirPuede(findById('p04')), sistema: repetirPuede({ id: '__stock__', productos: [{ desc: 'X' }] }),
    borrador: repetirPuede({ id: 'kommo-1', estado: BORRADOR_EST, oc: '', productos: [{ desc: 'X', cant: 1 }] }) }));
  chk('1 · se repite una venta; no una ATC, una RPT, una venta de tienda, una fila del sistema ni un borrador de Kommo',
    pu.venta === true && pu.atc === false && pu.rpt === false && pu.tienda === false && pu.sistema === false && pu.borrador === false, pu);

  // ============ 2. el botón ============
  const btn = await ev(async () => {
    clfAbrir('p01', 'mis'); await new Promise(r => setTimeout(r, 100));
    var mb = document.getElementById('modal-box'), filas = [].map.call(mb.querySelectorAll('.clf-l > li'), function (li) { return !!li.querySelector('.rep-btn'); });
    var o = { clf: filas }; closeModal();
    showView('mis'); var mv = document.getElementById('mis-vendedor');
    mv.value = 'Eduardo Añez'; renderMis(); await new Promise(r => setTimeout(r, 200));
    o.misEdu = document.querySelectorAll('#mis-lista .rep-btn').length;
    o.misEduCards = document.querySelectorAll('#mis-lista .mis-c').length;
    showMisModal('p01'); o.fichaEdu = !!document.querySelector('#modal-box .rep-btn'); closeModal();
    mv.value = 'Carola Chavez'; renderMis(); await new Promise(r => setTimeout(r, 200));
    o.misCarola = document.querySelectorAll('#mis-lista .rep-btn').length; o.misCarolaCards = document.querySelectorAll('#mis-lista .mis-c').length;
    showMisModal('p05'); o.fichaCarola = !!document.querySelector('#modal-box .rep-btn'); closeModal();
    return o;
  });
  chk('2a · en la ficha del cliente, cada compra tiene «🔁 Repetir» (la ATC no está en compras)', btn.clf.length >= 1 && btn.clf.every(Boolean), btn.clf);
  chk('2b · en Mis pedidos con Eduardo elegido: la tarjeta de una venta y su ficha lo tienen (la ATC no)', btn.misEdu >= 1 && btn.misEdu < btn.misEduCards && btn.fichaEdu === true, btn);
  chk('2c · con otra vendedora elegida, Mis pedidos no lo muestra', btn.misCarolaCards >= 1 && btn.misCarola === 0 && btn.fichaCarola === false, btn);

  // ============ 3. lo que trae el pedido nuevo ============
  const f = await ev(async () => {
    setVendedorMem('Eduardo Añez');
    clfAbrir('p01', 'mis'); await new Promise(r => setTimeout(r, 100));
    document.querySelector('#modal-box .clf-l > li .rep-btn').click(); await new Promise(r => setTimeout(r, 200));
    var v = function (id) { return String((document.getElementById(id) || {}).value || ''); };
    return { modal: document.getElementById('modal').classList.contains('on'), enForm: document.getElementById('view-form').classList.contains('active'),
      edit: EDIT_ID, cliente: v('f-cliente'), cel: v('f-celular'), zona: v('f-zona'), dir: v('f-direccion'), maps: v('f-maps'), fact: v('f-facturar'), nit: v('f-nit'),
      fecha: v('f-fecha'), nota: v('f-nota'), obs: v('f-obs'), gar: v('f-garantia'), oc: v('f-oc'), pagado: segVal('f-pagado'), saldo: v('f-saldo'), acuenta: v('f-acuenta'),
      vend: v('f-vendedor'), prods: getProductos(), banner: document.getElementById('edit-banner').classList.contains('on'),
      toast: (document.getElementById('toast') || {}).textContent || '' };
  });
  chk('3a · abre el formulario con un pedido NUEVO (sin edición abierta)', !f.modal && f.enForm && f.edit === null && !f.banner, f);
  chk('3b · con cliente, celular, zona, dirección, ubicación, «Facturar a» y NIT', f.cliente === 'MULTICENTER INVENTADO' && f.cel === '70000009' && f.zona === 'Equipetrol' &&
    f.dir === 'AV. FALSA 123' && /-17\.77,-63\.19/.test(f.maps) && f.fact === 'EMPRESA INVENTADA SRL' && f.nit === '1234567', f);
  chk('3c · los mismos productos: desc, medida, código, cantidad y precio', JSON.stringify(f.prods) === JSON.stringify([
    { desc: 'TITANIO LATEX', medida: '160x190', codigo: 'CH0001', cant: 2, precio: 3200 }, { desc: 'ALMOHADA', medida: '50x70', codigo: '', cant: 4, precio: 150 }]), f.prods);
  chk('3d · sin fecha, nota, pagos, observaciones ni garantía', f.fecha === '' && f.nota === '' && f.obs === '' && f.gar === '' && f.oc === '' &&
    f.pagado === 'NO' && f.saldo === '0' && f.acuenta === '0', f);
  chk('3e · el vendedor es el de esta compu y el aviso dice qué falta', f.vend === 'Eduardo Añez' && /Elegí la fecha/.test(f.toast), { vend: f.vend, toast: f.toast });

  // ============ 4. guardar ============
  let g = await ev(async () => { var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 300));
    return { guardo: window._saves > n0, rojo: document.getElementById('f-fecha').classList.contains('err'), toast: (document.getElementById('toast') || {}).textContent || '' }; });
  chk('4a · sin fecha no se guarda (para Eduardo no pasa a «hoy» solo)', !g.guardo && g.rojo && /fecha de entrega/.test(g.toast), g);
  g = await ev(async () => {
    document.getElementById('f-fecha').value = '2026-11-05'; segSet('f-turno', 'AM');
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    var nuevo = window._pl.filter(function (x) { return x.id !== 'p01' && x.id !== 'p02' && x.id !== 'p03' && x.id !== 'p04' && x.id !== 'p05'; })[0] || null;
    var viejo = window._pl.filter(function (x) { return x.id === 'p01'; })[0];
    return { guardo: window._saves > n0, nuevo: nuevo, viejoIgual: !!viejo && viejo.rev === 3 && viejo.entregado === true && viejo.productos[0].chk === 'ok' && viejo.fecha === '2026-10-20' };
  });
  const marcas = g.nuevo ? g.nuevo.productos.map(x => Object.keys(x).filter(k => ['desc', 'medida', 'codigo', 'cant', 'precio'].indexOf(k) < 0)) : null;
  chk('4b · con la fecha se guarda como pedido NUEVO (otro id, OC nueva, sin entregar, sin camión)', g.guardo && g.nuevo && g.nuevo.id !== 'p01' && g.nuevo.oc && g.nuevo.oc !== '10-201' &&
    g.nuevo.fecha === '2026-11-05' && !g.nuevo.entregado && !g.nuevo.verificado && !g.nuevo.vehiculo && !g.nuevo.chofer, g.nuevo && { id: g.nuevo.id, oc: g.nuevo.oc, fecha: g.nuevo.fecha });
  chk('4c · los productos van SIN ninguna marca de logística (chk, chkDe, prodF, prodR, eF, enProd, klead, fmov, sinwa…)', !!marcas && marcas.every(k => k.length === 0), marcas);
  chk('4d · sin la nota, los pagos ni las observaciones de antes', g.nuevo && !g.nuevo.nota && !g.nuevo.pagado && !String(g.nuevo.metodoPago || '').trim() && !g.nuevo.observaciones && !g.nuevo.garantia, g.nuevo);
  chk('4e · el pedido de antes queda igual', g.viejoIgual === true, g.viejoIgual);

  // ============ 5. lo que hay en el formulario ============
  await ev(async () => { STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); showView('form'); resetForm();
    document.getElementById('f-cliente').value = 'A MEDIO ESCRIBIR'; });
  preguntas = []; RESP = 'cancelar';
  let s = await ev(async () => { repetirPedido('p05'); await new Promise(r => setTimeout(r, 150)); return { cli: document.getElementById('f-cliente').value, edit: EDIT_ID }; });
  chk('5a · con un pedido nuevo a medio escribir pregunta, y «Cancelar» lo deja como estaba', preguntas.some(q => /pedido NUEVO a medio llenar/.test(q)) && s.cli === 'A MEDIO ESCRIBIR', { s, preguntas });
  preguntas = []; RESP = 'aceptar';
  s = await ev(async () => { repetirPedido('p05'); await new Promise(r => setTimeout(r, 150)); return { cli: document.getElementById('f-cliente').value, edit: EDIT_ID }; });
  chk('5b · «Aceptar» descarta lo escrito y abre el repetido', preguntas.length === 1 && s.cli === 'CLIENTE DE CAROLA' && s.edit === null, { s, preguntas });

  await ev(async () => { editPedido('p01'); await new Promise(r => setTimeout(r, 200)); showView('mis'); });
  preguntas = []; RESP = 'cancelar';
  s = await ev(async () => { repetirPedido('p05'); await new Promise(r => setTimeout(r, 150)); return { cli: document.getElementById('f-cliente').value, edit: EDIT_ID, enForm: document.getElementById('view-form').classList.contains('active') }; });
  chk('5c · con una EDICIÓN sin guardar pregunta (como «＋ Nuevo pedido»), y «Cancelar» vuelve a esa edición', preguntas.some(q => /Estabas editando el pedido de MULTICENTER INVENTADO/.test(q)) &&
    s.edit === 'p01' && s.cli === 'MULTICENTER INVENTADO' && s.enForm, { s, preguntas });
  preguntas = []; RESP = 'aceptar';
  s = await ev(async () => { showView('mis'); repetirPedido('p05'); await new Promise(r => setTimeout(r, 150)); return { cli: document.getElementById('f-cliente').value, edit: EDIT_ID }; });
  chk('5d · «Aceptar» deja esa venta como estaba y abre el repetido como pedido nuevo', s.edit === null && s.cli === 'CLIENTE DE CAROLA', s);

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
