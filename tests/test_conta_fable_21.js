/* 🔎 (21/11, revisión de Fable de Contabilidad) LO QUE ENCONTRÓ Y QUEDÓ ARREGLADO.
   1. Una venta YA pagada que se vuelve a cargar «SÍ, pagado» desde el formulario (partir un QR en QR + efectivo, cambiar el reparto) conserva el día
      del pago de antes: antes los renglones rehechos iban con HOY y el pago de una venta del 20/10 se mudaba al Cuadre de noviembre.
   2. «¿Ya lo cobraste?» del recargo: una venta sin adelanto con el flete YA cobrado, al tocar «SÍ, pagado», queda en «SÍ» y guarda sin preguntar
      (antes quedaba en «NO» y aceptar pasaba el flete cobrado a pactado).
   3. Contabilidad le baja el monto al único pago de una venta «SÍ, pagado»: «A cuenta» = el pago nuevo (antes quedaba en 0 hasta otro guardado).
   4. El bot dice el saldo de Bs 0,01 (contra 0.005, como la página; antes «Tu compra ya está pagada»).
   Se corre: node tests/test_conta_fable_21.js   ·  contra otra página: PEDIDOS=…   ·  contra otro servidor: GS=… */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS = 0, FAIL = 0;
const chk = (n, ok, d) => { if (ok) { PASS++; console.log('✓ ' + n); } else { FAIL++; console.log('✗ ' + n + (d !== undefined ? ' · ' + JSON.stringify(d).slice(0, 500) : '')); } };

(async () => {
  /* 4 · el servidor */
  const ctx0 = { console }; vm.createContext(ctx0);
  vm.runInContext(fs.readFileSync(process.env.GS || path.resolve(__dirname, '..', 'google-apps-script.gs'), 'utf8'), ctx0);
  chk('4a · el bot dice «Saldo a pagar… Bs 0,01» con un saldo de un centavo', /Saldo a pagar al recibir: Bs 0,01/.test(ctx0.waSaldo_({ saldo: 0.01, pagado: false, metodoPago: '' })), ctx0.waSaldo_({ saldo: 0.01, pagado: false, metodoPago: '' }));
  chk('4b · …y nombra un recargo de un centavo', /0,01 del recargo/.test(ctx0.waSaldo_({ saldo: 500, pagado: false, metodoPago: '^0.01' })));
  chk('4c · una venta pagada sigue «ya está pagada»', ctx0.waSaldo_({ saldo: 0, pagado: true, metodoPago: '' }) === 'Tu compra ya está pagada');

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, timezoneId: 'America/La_Paz', locale: 'es-BO' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage(); const errores = [], dial = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', async d => { dial.push(d.message().slice(0, 300)); await d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-20T15:00:00Z'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = true; CARGA_GEN++; CARGA_ESTADO = 'ok';
    if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; } if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.SRV = []; window._borradas = [];
    apiPost = function (b) {
      if (b.action === 'save') { var c = JSON.parse(JSON.stringify(b.pedido)); delete c.cobradoBs; c.rev = (Number(c.rev) || 0) + 1;
        window.SRV = window.SRV.filter(function (x) { return x.id !== c.id; }).concat([c]); return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(c)) }); }
      if (b.action === 'list') return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window.SRV)) });
      return Promise.resolve({ ok: true });
    };
    apiList = function () { return new Promise(function (res) { setTimeout(function () { res({ ok: true, pedidos: JSON.parse(JSON.stringify(window.SRV)) }); }, 0); }); };
    apiBorrarFoto = function (id) { window._borradas.push(String(id)); return Promise.resolve({ ok: true }); };
    fotoCronometro = function () { return Promise.resolve('data:image/jpeg;base64,AAAA'); };
    window.__FOTO = 'F0'; subirFoto = function () { return Promise.resolve({ ok: true, fotoId: window.__FOTO }); };
    window.esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    window.cargar = async function (filas) { try { closeModal(); } catch (e) { } try { resetForm(); } catch (e) { }
      window.SRV = JSON.parse(JSON.stringify(filas)); setPending([]); STATE = []; RETIROS = [];
      SAVE_ULTIMO = {}; SAVE_REV = {}; SAVE_EN_VUELO = {}; SAVE_EN_ESPERA = {}; await refrescarEstado(); };
    window.srv = function (id) { return window.SRV.filter(function (x) { return x.id === id; })[0]; };
  });
  const base = (id, o) => Object.assign({ id, oc: '10-' + id.replace(/\D/g, '').padStart(3, '0'), nota: '980', turno: 'AM', celular: '70001001', nit: '1', zona: 'Norte',
    direccion: 'Calle Inventada 1', fecha: '2026-10-22', maps: '', observaciones: '', garantia: '', facturarA: '', estado: '', entregado: true, verificado: false,
    vehiculo: '', chofer: '', nroDia: 1, fotos: [], vendedor: 'Carola Chavez', cliente: 'CLIENTE INVENTADO ' + id, ts: new Date('2026-10-20T11:00:00-04:00').getTime(), rev: 1,
    productos: [{ desc: 'COLCHON ORTOPEDICO', medida: '140x190', cant: 1, precio: 1500 }], pagado: true, saldo: 0, acuenta: 0, metodoPago: '' }, o);

  /* 1 · partir el pago de una venta pagada de octubre */
  await page.evaluate(async (f) => { await cargar([f]); }, base('p1', { metodoPago: '~QR BISA 1500 @2026-10-20 #980 %A1' }));
  const r1 = await page.evaluate(async () => {
    showView('form'); editPedido('p1'); await esperar(350);
    toggleMixto(true); await esperar(60);
    var e1 = document.getElementById('f-monto1'); e1.value = '1000'; mixtoMonto1Input(); segSet('f-metodo2', 'Efectivo'); pintarMixto();
    window.__FOTO = 'RECIBO'; COMP_DESTINO = 2; await onCompFormElegido({ target: { files: [new Blob(['x'], { type: 'image/jpeg' })], value: '' } }); await esperar(30);
    try { FORM_RECIBIO.quien = ''; FORM_RECIBIO.eleg = true; } catch (e) { }
    submitPedido(); await esperar(1000);
    var p = srv('p1');
    return { mp: p.metodoPago, oct: cuadrePagos({ modo: 'mes', val: '2026-10' }, '').map(function (c) { return c.monto + '@' + c.fecha; }),
      nov: cuadrePagos({ modo: 'mes', val: '2026-11' }, '').length };
  });
  chk('⚠️ 1a · partir el «SÍ, pagado» del 20/10 en QR 1.000 + Efectivo 500: los dos renglones con el 20/10, no con hoy', /QR BISA 1000 @2026-10-20/.test(r1.mp) && /Efectivo 500 @2026-10-20/.test(r1.mp), r1);
  chk('⚠️ 1b · …el Cuadre de octubre sigue con los Bs 1.500 y el de noviembre no los gana', r1.oct.length === 2 && r1.nov === 0, r1);

  await page.evaluate(async (f) => { await cargar([f]); }, base('p2', { metodoPago: '~QR BISA 1000 @2026-10-20 #980 %A1 + Efectivo 500 @2026-10-20 #980 %A2' }));
  const r2 = await page.evaluate(async () => {
    showView('form'); editPedido('p2'); await esperar(350);
    var e2 = document.getElementById('f-monto1'); e2.value = '900'; mixtoMonto1Input(); await esperar(40);
    submitPedido(); await esperar(1000);
    return srv('p2').metodoPago;
  });
  chk('⚠️ 1c · cambiar el reparto 1.000 + 500 → 900 + 600 de una venta de octubre: siguen en el 20/10', /900 @2026-10-20/.test(r2) && /600 @2026-10-20/.test(r2), r2);

  /* 1d · una venta NO pagada que ahora se carga «SÍ, pagado»: lo que entra hoy va con hoy (lo de siempre) */
  await page.evaluate(async (f) => { await cargar([f]); }, base('p3', { pagado: false, saldo: 1500, metodoPago: '' }));
  const r3 = await page.evaluate(async () => {
    showView('form'); editPedido('p3'); await esperar(350);
    document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(80);
    var bm = document.querySelector('#f-metodo button[data-val="Tarjeta"]'); if (bm) bm.click(); await esperar(40);
    FORM_COMPS = compsArr(FORM_COMPS).concat(['NUEVA']);
    submitPedido(); await esperar(1000);
    return srv('p3').metodoPago;
  });
  chk('1d · una venta sin pagar cargada «SÍ, pagado» hoy: el pago va con HOY', /@2026-11-20/.test(r3), r3);

  /* 2 · el recargo ya cobrado no se pierde al tocar «SÍ, pagado» */
  dial.length = 0;
  await page.evaluate(async (f) => { await cargar([f]); }, base('f1', { pagado: false, saldo: 1500, entregado: false, fecha: '2026-11-25', metodoPago: '^Efectivo 50 @2026-11-10 #980 %FLETE' }));
  const r4 = await page.evaluate(async () => {
    showView('mis'); await esperar(120); editPedido('f1'); await esperar(350);
    document.querySelector('#f-pagado button[data-val="SI"]').click(); await esperar(100);
    var bm = document.querySelector('#f-metodo button[data-val="Tarjeta"]'); if (bm && !segVal('f-metodo')) bm.click(); await esperar(40);
    var cob = segVal('f-envio-cob');
    FORM_COMPS = compsArr(FORM_COMPS).concat(['NUEVA']);
    submitPedido(); await esperar(1000);
    var p = srv('f1'); return { cob: cob, mp: p.metodoPago, cobrado: envioCobrado(p), pend: envioPorCobrar(p) };
  });
  chk('⚠️ 2a · venta sin adelanto con el flete cobrado: al tocar «SÍ, pagado» y elegir el método, «¿ya lo cobraste?» queda en SÍ', r4.cob === 'SI', r4);
  chk('⚠️ 2b · …guarda sin preguntar y el flete sigue COBRADO (Bs 50, nada por cobrar)', r4.cobrado === 50 && r4.pend === 0 && !dial.some(d => /COBRADO/.test(d)), { r4, dial });
  const r5 = await page.evaluate(async () => { try { resetForm(); } catch (e) { } return { cob: segVal('f-envio-cob') }; });
  chk('2c · un formulario nuevo arranca en NO (no hereda el «SÍ» recordado)', r5.cob === 'NO', r5);

  /* 3 · «A cuenta» al bajar el monto del único pago */
  await page.evaluate(async (f) => { await cargar([f]); showView('conta'); await esperar(120); },
    base('z1', { fecha: '2026-11-12', ts: new Date('2026-11-10T11:00:00-04:00').getTime(), metodoPago: '~QR BISA 1500 @2026-11-10 #980 %A1' }));
  const r6 = await page.evaluate(async () => {
    CTA_EDIT_I = -1; CTA_EDIT_V = null; showContaModal('z1'); ctaEditarPago('z1', 0); await esperar(30);
    document.getElementById('cta-ed-monto').value = '1450';
    ctaGuardarPago('z1', 0, true); await esperar(200);
    var p = srv('z1'); return { acu: Number(p.acuenta) || 0, saldo: Number(p.saldo) || 0, pagado: !!p.pagado };
  });
  chk('⚠️ 3 · bajarle el pago de 1.500 a 1.450 a una «SÍ, pagado»: «A cuenta» 1.450, saldo 50, sin pagar', r6.acu === 1450 && r6.saldo === 50 && r6.pagado === false, r6);
  await page.evaluate(async (f) => { await cargar([f]); showView('conta'); await esperar(120); },
    base('z2', { fecha: '2026-11-12', ts: new Date('2026-11-10T11:00:00-04:00').getTime(), metodoPago: '~QR BISA 1500 @2026-11-10 #980 %A1' }));
  const r7 = await page.evaluate(async () => {
    CTA_EDIT_I = -1; CTA_EDIT_V = null; showContaModal('z2'); ctaEditarPago('z2', 0); await esperar(30);
    document.getElementById('cta-ed-fecha').value = '2026-11-11';
    ctaGuardarPago('z2', 0, true); await esperar(200);
    var p = srv('z2'); return { acu: Number(p.acuenta) || 0, pagado: !!p.pagado };
  });
  chk('3b · corregirle solo la fecha a una «SÍ, pagado»: sigue pagada con «A cuenta» 0 (§4cb)', r7.acu === 0 && r7.pagado === true, r7);

  chk('sin errores de la página', !errores.length, errores);
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
