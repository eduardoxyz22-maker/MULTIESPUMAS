/* 🧮 EL TOTAL SE COMPLETA SOLO + 💵 LOS PRECIOS EN MIS PEDIDOS (06/11/2026).
   El dueño: «el usar como total no le veo sentido que tengan que darle a un botón ahora que tienen obligatorio colocar precio de
   productos, debería ir colocándose el total conforme van llenando» y «Eduardo en mis pedidos necesita ver los precios de los
   productos, igual los vendedores».
   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Al escribir precios y cantidades el «Saldo por cobrar» se llena solo con la suma (− A cuenta), sin botón; sacar un producto lo
      baja; con «SÍ, pagado» el monto cobrado es la suma.
   2. Con un producto sin precio no se toca nada (la suma no es el total) y se dice.
   3. Lo escrito a mano manda: un saldo distinto de la suma queda, se avisa y «Usar la suma» lo arregla. Mientras se escribe en el
      saldo no se lo cambia.
   4. Abrir un pedido para editarlo no cambia ningún monto; corregirle un precio sí, descontando lo ya cobrado aparte.
   5. Una ATC no se toca; en Playwright sin `TOT_AUTO_PRUEBA` queda el «Usar como total» de siempre.
   6. La ficha de Mis pedidos muestra el precio de cada producto («c/u =» con más de uno) y cuánto suman; una ATC no.
   Datos INVENTADOS. Reloj clavado el martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_total_solo.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    apiSave = function (rec) { return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(rec)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    STATE = []; saveMirror();
  });

  // ============ 5b. en Playwright sin la marca: lo de siempre ============
  const viejo = await ev(() => {
    showView('form'); resetForm();
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, 3200); refreshDelButtons();
    var pr = box.querySelector('.prod-precio'); pr.dispatchEvent(new Event('input', { bubbles: true }));
    return { caja: document.getElementById('f-prods-total').textContent, saldo: document.getElementById('f-saldo').value };
  });
  chk('5b · en Playwright sin TOT_AUTO_PRUEBA queda «Usar como total» y el saldo no se toca', /Usar como total/.test(viejo.caja) && viejo.saldo === '0', viejo);

  await ev(() => { window.TOT_AUTO_PRUEBA = 1; });
  /* Escribir en un campo como una persona (el evento de «input»). */
  const tipear = (sel, i, v) => ev((o) => {
    var el = o.sel.charAt(0) === '#' ? document.querySelector(o.sel) : document.querySelectorAll('#f-productos ' + o.sel)[o.i];
    el.value = o.v; el.dispatchEvent(new Event('input', { bubbles: true }));
  }, { sel, i, v });
  const estado = () => ev(() => ({ saldo: document.getElementById('f-saldo').value, cobrado: document.getElementById('f-cobrado').value,
    caja: document.getElementById('f-prods-total').textContent }));

  // ============ 1. se llena solo ============
  await ev(() => {
    showView('form'); resetForm();
    document.getElementById('f-vendedor').value = 'Carola Chavez'; applyVendedorLite();
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, ''); addProdRow('SOMIER ORO', '160x190', '', 2, ''); refreshDelButtons();
  });
  let e = await estado();
  chk('1a · un pedido nuevo sin precios: el saldo sigue en 0 y no hay caja', e.saldo === '0' && !e.caja.trim(), e);
  await tipear('.prod-precio', 0, '3200');
  e = await estado();
  chk('1b · falta el precio del segundo: no se toca el saldo y se dice', e.saldo === '0' && /1 ítem sin precio/.test(e.caja), e);
  await tipear('.prod-precio', 1, '1500');
  e = await estado();
  chk('1c · con los dos precios el saldo se llena solo: 3.200 + 2 × 1.500 = 6.200', Number(e.saldo) === 6200 && /el saldo se completa solo/.test(e.caja) && !/Usar como total/.test(e.caja), e);
  await tipear('.prod-cant', 1, '3');
  e = await estado();
  chk('1d · cambiar la cantidad lo sigue (7.700)', Number(e.saldo) === 7700, e);
  await tipear('#f-acuenta', 0, '2000');
  e = await estado();
  chk('1e · con «A cuenta» 2.000 el saldo baja a 5.700', Number(e.saldo) === 5700, e);
  await ev(() => { document.querySelectorAll('#f-productos .prod-del')[1].click(); });
  e = await estado();
  chk('1f · sacar un producto lo baja (3.200 − 2.000 = 1.200)', Number(e.saldo) === 1200, e);
  await ev(() => { document.querySelector('#f-pagado button[data-val="SI"]').click(); });
  await page.clock.runFor(50);
  e = await estado();
  chk('1g · con «SÍ, pagado» el monto cobrado es la suma (3.200)', Number(e.cobrado) === 3200 && /es el monto cobrado/.test(e.caja), e);
  await ev(() => { document.querySelector('#f-pagado button[data-val="NO"]').click(); });
  await page.clock.runFor(50);

  // ============ 3. lo escrito a mano manda ============
  await tipear('#f-saldo', 0, '900');
  await tipear('.prod-precio', 0, '3500');
  e = await estado();
  chk('3a · un saldo escrito a mano (900) no se pisa al cambiar un precio, y se avisa', e.saldo === '900' && /no da con la suma/.test(e.caja) && /Usar la suma/.test(e.caja), e);
  await ev(() => { totalUsarSuma(); });
  e = await estado();
  chk('3b · «Usar la suma» lo arregla (3.500 − 2.000 = 1.500) y vuelve a seguir a la suma', Number(e.saldo) === 1500, e);
  await tipear('.prod-precio', 0, '3600');
  e = await estado();
  chk('3c · …y sigue a la suma después (1.600)', Number(e.saldo) === 1600, e);
  const foco = await ev(() => {
    var s = document.getElementById('f-saldo'); s.focus(); s.value = '';
    TOT_AUTO.toc = true; pintarTotalProds();
    var v = s.value; s.blur(); return v;
  });
  chk('3d · mientras se escribe en el saldo (vaciarlo para poner otro) no se lo rellena', foco === '', foco);

  // ============ 4. editar un pedido ============
  await ev(() => {
    var p = { id: 'ed1', oc: '11-201', fecha: '2026-11-05', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE INVENTADO', celular: '70012345',
      zona: 'Norte', direccion: 'CALLE 1', nota: '555', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, precio: 1200 }],
      pagado: false, saldo: 650, acuenta: 0, metodoPago: 'QR BNB 500 @2026-11-02 #77 %IMGA', observaciones: '', ts: Date.now() - 86400000, rev: 3 };
    STATE = [p]; saveMirror(); editPedido('ed1');
  });
  await page.waitForTimeout(250);
  e = await estado();
  chk('4a · abrir un pedido para editarlo no cambia el saldo (650 aunque no dé con la suma)', e.saldo === '650', e);
  await tipear('.prod-precio', 0, '1300');
  e = await estado();
  chk('4b · corregirle el precio: el saldo sigue a la suma y descuenta el QR ya cobrado (1.300 − 500 = 800)', Number(e.saldo) === 800, e);

  // ============ 5. una ATC no se toca ============
  await ev(() => {
    showView('form'); resetForm(); segSet('f-doc-tipo', 'ATC'); setDocTipo();
    var box = document.getElementById('f-productos'); box.innerHTML = ''; addProdRow('TITANIO LATEX', '160x190', '', 1, ''); refreshDelButtons();
  });
  await tipear('.prod-precio', 0, '999');
  e = await estado();
  chk('5a · en una ATC el saldo no se toca', e.saldo === '0', e);
  await ev(() => { segSet('f-doc-tipo', 'OC'); setDocTipo(); resetForm(); });

  // ============ 6. los precios en la ficha de Mis pedidos ============
  const ficha = await ev(() => {
    STATE = [
      { id: 'm1', oc: '11-031', fecha: '2026-11-07', turno: 'AM', vendedor: 'Eduardo Añez', cliente: 'TIENDA INVENTADA', celular: '', zona: 'Parque Industrial',
        direccion: 'Bodega 14', productos: [{ desc: 'COLCHON SEMIORTOP.', medida: '105x190', codigo: 'COLT0037', cant: 1, precio: 510 },
          { desc: 'SOMIER ORO', medida: '105x190', cant: 2, precio: 400 }], pagado: false, saldo: 1310, ts: Date.now() },
      { id: 'm2', oc: 'ATC 11-002', fecha: '2026-11-07', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'OTRO INVENTADO', celular: '70012345', zona: 'Norte',
        direccion: 'Calle 2', productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, atc: { mot: 'Hundimiento' } }], pagado: false, saldo: 0, ts: Date.now() }
    ];
    saveMirror();
    showMisModal('m1'); var a = (document.getElementById('modal') || document.body).innerText; closeModal();
    showMisModal('m2'); var b = (document.getElementById('modal') || document.body).innerText; closeModal();
    return { a: a, b: b, bs: fmtBs(510), bs2: fmtBs(800), tot: fmtBs(1310) };
  });
  chk('6a · cada producto con su precio en la ficha (Eduardo)', ficha.a.indexOf(ficha.bs) >= 0, ficha.a.slice(0, 600));
  chk('6b · con más de uno: «c/u =» y el subtotal', /c\/u = /.test(ficha.a) && ficha.a.indexOf(ficha.bs2) >= 0, ficha.a.slice(0, 600));
  chk('6c · y abajo cuánto suman', ficha.a.indexOf('Suman ' + ficha.tot) >= 0, ficha.a.slice(0, 600));
  chk('6d · una ATC no lleva precio ni «Suman»', !/Suman /.test(ficha.b) && !/c\/u/.test(ficha.b), ficha.b.slice(0, 400));

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  await browser.close();
  process.exitCode = FAIL ? 1 : 0;
})();
