/* 🧮 LO COBRADO DA CON LA SUMA DE LOS PRODUCTOS (18/11/2026). El dueño: «ese error de pago fue garrafal».
   La 11-218 se guardó «SÍ, pagó todo» con Bs 700 (solo el efectivo) y productos por Bs 1.080; Contabilidad registró el QR de 380
   como flete y «Era un pago de la venta» la dejó en 700 con saldo −380.
   ⚠️ LO QUE ESTE TEST CUIDA (`cobroSumaRevisar` + `submitPedido`):
   1. «SÍ» con un monto distinto de la suma NO se guarda (el caso de la 11-218); con la suma, sí.
   2. «NO» con lo pagado + el saldo distinto de la suma no se guarda; igual a la suma, sí.
   3. Una venta pagada que pasa a «NO» sin saldo no se guarda (quedaba de Bs 0).
   4. Subir un precio en una venta pagada deja la diferencia POR COBRAR y los pagos tal cual (antes se perdía).
   5. Bajarlo por debajo de lo pagado no se guarda.
   6. Una venta vieja que ya estaba guardada con la diferencia y no se toca: pregunta (no frena).
   7. Eduardo no; un producto sin precio no; en Playwright sin `COBRO_SUMA_PRUEBA`, lo de siempre.
   Datos INVENTADOS. Reloj clavado el martes 17/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_cobro_suma.js     (`PEDIDOS=<archivo>` corre contra otra página) */
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
  const DLG = []; page.on('dialog', d => { DLG.push(d.message()); d.accept(); });
  await page.clock.install({ time: new Date('2026-11-17T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    window._saved = []; window._toasts = [];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); g.rev = (g.rev || 0) + 1; window._saved.push(g); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    var _t = toast; toast = function (m, k) { window._toasts.push(String(k) + ': ' + m); try { _t.apply(this, arguments); } catch (e) {} };
    STATE = []; saveMirror();
    window.COBRO_SUMA_PRUEBA = true;
  });

  /* Llena el formulario como una venta nueva (o deja el que abrió `editPedido`) y responde la pregunta, si sale. */
  const venta = (o) => ev((o) => {
    if (!o.editar) {
      showView('form'); resetForm();
      document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez';
      document.getElementById('f-cliente').value = 'CLIENTE PRUEBA'; document.getElementById('f-celular').value = '71234567';
      document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-direccion').value = 'Calle Falsa 123';
      document.getElementById('f-fecha').value = '2026-11-19'; segSet('f-turno', 'AM');
      document.getElementById('f-nota').value = '5555';
      var box = document.getElementById('f-productos'); box.innerHTML = '';
      addProdRow('COLCHON TITANIO', '140x190', '', 1, ''); addProdRow('ALMOHADA', '50x70', '', 1, ''); refreshDelButtons();
    }
    var pr = document.querySelectorAll('#f-productos .prod-precio');
    if (o.precios) o.precios.forEach(function (v, i) { pr[i].value = v; });
    if (o.pagado) segSet('f-pagado', o.pagado);
    if (o.cobrado != null) document.getElementById('f-cobrado').value = o.cobrado;
    if (o.acuenta != null) document.getElementById('f-acuenta').value = o.acuenta;
    if (o.saldo != null) document.getElementById('f-saldo').value = o.saldo;
    if (o.metodo) segSet('f-metodo', o.metodo);
    if (!FORM_COMPS.length) FORM_COMPS = ['IMG1'];
    window._saved = []; window._toasts = [];
    submitPedido();
    return true;
  }, o);
  const resp = (si) => ev((si) => { var b = [...document.querySelectorAll(si ? '.preg-si' : '.preg-no')].filter(x => x.offsetParent)[0]; if (!b) return null; var t = b.closest('.preg-c').innerText; b.click(); return t; }, si);
  const fin = async () => { await page.clock.runFor(1500); return ev(() => { var s = window._saved.filter(x => !/^__/.test(x.id)).slice(-1)[0];
    return s ? { id: s.id, mp: s.metodoPago, acu: s.acuenta, sal: s.saldo, pag: s.pagado, vt: ventaTotal(s), cc: contaCobrado(s) } : { nada: true, t: window._toasts.slice(-2).join(' | ') }; }); };
  const sembrar = (p) => ev((p) => { STATE = STATE.filter(x => x.id !== p.id).concat([p]); saveMirror(); try { closeModal(); } catch (e) {} EDIT_ID = null; editPedido(p.id); return true; }, p);
  const base = (o) => Object.assign({ id: o.id, oc: o.oc || '11-901', ts: new Date('2026-11-14T10:00:00-04:00').getTime(), vendedor: 'Carola Chavez',
    cliente: 'CLIENTE PRUEBA', celular: '71234567', zona: 'Norte', direccion: 'Calle Falsa 123', fecha: '2026-11-19', turno: 'AM', nota: '5555',
    productos: [{ desc: 'COLCHON TITANIO', medida: '140x190', cant: 1, precio: 850 }, { desc: 'ALMOHADA', medida: '50x70', cant: 1, precio: 230 }] }, o);

  // ============ 1. «SÍ» con otro monto ============
  await venta({ precios: [850, 230], pagado: 'SI', cobrado: 700, metodo: 'Efectivo' });
  let r = await fin();
  chk('1a «SÍ» con 700 y productos por 1.080: NO se guarda', r.nada && /suman Bs 1\.080/.test(r.t), r);
  await venta({ precios: [850, 230], pagado: 'SI', cobrado: 1080, metodo: 'Efectivo' });
  r = await fin();
  chk('1b «SÍ» con la suma: se guarda pagada', !r.nada && r.pag === true && Math.abs(r.vt - 1080) < 0.01, r);

  // ============ 2. «NO» ============
  await venta({ precios: [850, 230], pagado: 'NO', acuenta: 500, saldo: 300, metodo: 'Efectivo' });
  r = await fin();
  chk('2a «NO» con 500 + 300 y suma 1.080: NO se guarda', r.nada && /tiene que ser Bs 580/.test(r.t), r);
  await venta({ precios: [850, 230], pagado: 'NO', acuenta: 500, saldo: 580, metodo: 'Efectivo' });
  r = await fin();
  chk('2b «NO» con 500 + 580: se guarda', !r.nada && r.pag === false && Math.abs(r.sal - 580) < 0.01, r);

  // ============ 3. pagada → «NO» sin saldo ============
  const pagada = base({ id: 'cs-pag', metodoPago: '~Efectivo 700 @2026-11-14 #5555 %IMG1 + QR BISA 380 @2026-11-14 #5555 %IMG2', acuenta: 0, saldo: 0, pagado: true });
  await sembrar(pagada); await page.clock.runFor(300);
  await venta({ editar: true, pagado: 'NO', acuenta: 0, saldo: 0 });
  r = await fin();
  chk('3 pagada → «NO» con saldo 0: NO se guarda (quedaba de Bs 0)', r.nada && /figura PAGADA/.test(r.t), r);

  // ============ 4. subir un precio en una venta pagada ============
  await sembrar(pagada); await page.clock.runFor(300);
  await venta({ editar: true, precios: [900, 230] });
  await page.clock.runFor(300);
  const q4 = DLG.slice(-1)[0];
  chk('4a pregunta «Quedan Bs 50 por cobrar»', /quedan Bs 50/i.test(q4 || ''), q4);
  r = await fin();
  chk('4b se guarda con saldo 50, los pagos tal cual y sin pagar', !r.nada && r.pag === false && Math.abs(r.sal - 50) < 0.01 && /@2026-11-14/.test(r.mp) && Math.abs(r.vt - 1130) < 0.01, r);

  // ============ 5. bajarlo por debajo de lo pagado ============
  await sembrar(pagada); await page.clock.runFor(300);
  await venta({ editar: true, precios: [800, 230], cobrado: 1030 });
  r = await fin();
  chk('5 bajar el precio por debajo de lo pagado: NO se guarda', r.nada && /por debajo de lo que ya pagó/.test(r.t), r);

  // ============ 6. una vieja que ya estaba así ============
  const vieja = base({ id: 'cs-vieja', oc: '11-902', metodoPago: '~Efectivo 700 @2026-11-14 #5555 %IMG1', acuenta: 0, saldo: 0, pagado: true });
  await sembrar(vieja); await page.clock.runFor(300);
  await ev(() => { document.getElementById('f-direccion').value = 'Otra calle 9'; });
  await venta({ editar: true });
  await page.clock.runFor(300);
  const q6 = DLG.slice(-1)[0];
  chk('6a la vieja pregunta en vez de frenar', /ya estaba guardada así/.test(q6 || ''), q6);
  r = await fin();
  chk('6b «Guardar igual» la guarda como estaba', !r.nada && r.pag === true && /@2026-11-14/.test(r.mp), r);

  // ============ 7. Eduardo, sin precio y sin la marca ============
  await venta({ vend: 'Eduardo Añez', precios: [850, 230], pagado: 'SI', cobrado: 700, metodo: 'Efectivo' });
  r = await fin();
  chk('7a Eduardo: se guarda como siempre', !r.nada, r);
  const s7 = await ev(() => { window.COBRO_SUMA_PRUEBA = false; var x = cobroSumaVa(); window.COBRO_SUMA_PRUEBA = true; return x; });
  chk('7b en Playwright sin la marca está apagado', s7 === false, s7);

  // ============ 8. Contabilidad: la 11-218 (pagada con el total corto) ============
  const c218 = (mp, sal) => ev((o) => { var p = { id:'x218', oc:'11-903', ts:new Date('2026-11-14T10:00:00-04:00').getTime(), vendedor:'Juan Pablo Paredes', cliente:'C', celular:'71234567', fecha:'2026-11-14', nota:'506',
      productos:[{ desc:'COLCHON SOFT', medida:'105x190', cant:1, precio:850 }, { desc:'PROTECTOR', medida:'105x190', cant:1, precio:230 }], metodoPago:o.mp, acuenta:0, saldo:o.sal, pagado:true };
    STATE = STATE.filter(x => x.id !== 'x218').concat([p]); saveMirror(); UNLOCKED = true; CTA_TIPO = 'pago'; return true; }, { mp, sal });
  const e218 = () => ev(() => { var p = findById('x218'); return { sal:p.saldo, pag:p.pagado, vt:ventaTotal(p), env:envioTotal(p) }; });
  await c218('~Efectivo 700 @2026-11-14 #506 %A1', 0);
  const env8 = await ev(() => { try { closeModal(); } catch (e) {} showContaModal('x218'); var m = document.getElementById('cta-pago-monto'); m.value = '380'; document.getElementById('cta-pago-fecha').value = '2026-11-14';
    var n = document.getElementById('cta-pago-nota'); if (n) n.value = '506'; CTA_PAGO.metodo = 'QR'; CTA_PAGO.banco = 'BISA'; CTA_PAGO.comps = ['IMGQ']; CTA_PAGO.rEleg = true; var e = CTA_FORM_ENV; ctaRegistrarPago('x218'); return e; });
  await page.clock.runFor(800);
  r = await e218();
  chk('8a la ficha abre como PAGO de la venta (no como recargo)', env8 === false, env8);
  chk('8b registrar el QR de 380 deja total 1.080, saldo 0 y sin recargo', Math.abs(r.vt - 1080) < 0.01 && Math.abs(r.sal) < 0.01 && r.pag === true && r.env === 0, r);
  await c218('~Efectivo 700 @2026-11-14 #506 %A1 + ^QR BISA 380 @2026-11-14 #506 %A2', 0);
  await ev(() => { ctaEnvioAPago('x218', 0); }); await page.clock.runFor(800);
  r = await e218();
  chk('9 «Era un pago de la venta» completa el total: 1.080 y saldo 0', Math.abs(r.vt - 1080) < 0.01 && Math.abs(r.sal) < 0.01 && r.env === 0, r);
  await c218('~Efectivo 700 @2026-11-14 #506 %A1 + QR BISA 380 @2026-11-14 #506 %A2', -380);
  const s10 = await ev(() => { try { closeModal(); } catch (e) {} CTA_EDIT = true; showContaModal('x218'); var x = document.getElementById('cta-saldo'); return x ? x.value : null; });
  chk('10 «Corregir precios y montos» no propone un saldo negativo', s10 === '0', s10);
  await ev(() => { try { closeModal(); } catch (e) {} });

  // ============ 11. una foto con el día y el mes al revés (la 11-008) ============
  const a11 = await ev(() => { var p = { id:'x008', oc:'11-904', ts:new Date('2026-10-31T10:00:00-04:00').getTime(), vendedor:'Isabel Robledo', productos:[], metodoPago:'' };
    var x = { p:p, ant:false, f:'2026-11-03', monto:14130 }; var c = { mot:[{ k:'dia', fFoto:'2026-03-11', fEsp:'2026-11-03' }] };
    return ctaAvArreglos(x, c).map(f => f.k); });
  chk('11 no ofrece «poner la fecha de la foto» si es de antes de cargar la venta', Array.isArray(a11) && a11.indexOf('dia') < 0, a11);

  // ============ 12-14. Formulario: revisión de Fable (pagada → NO con «A cuenta», saldo negativo, bajar el adelanto) ============
  const mix = base({ id: 'cs-mix', oc: '11-905', metodoPago: '~Efectivo 700 @2026-11-14 #5555 %IMG1 + QR BISA 380 @2026-11-14 #5555 %IMG2', acuenta: 0, saldo: 0, pagado: true });
  await sembrar(mix); await page.clock.runFor(300);
  await venta({ editar: true, pagado: 'NO', acuenta: 700, saldo: 0 });
  r = await fin();
  chk('12 pagada con dos métodos → «NO» + A cuenta 700: NO se guarda (perdía plata)', r.nada && /figura PAGADA/.test(r.t), r);
  const neg = base({ id: 'cs-neg', oc: '11-906', metodoPago: '~Efectivo 700 @2026-11-14 #5555 %IMG1 + QR BISA 380 @2026-11-14 #5555 %IMG2', acuenta: 0, saldo: -380, pagado: true });
  await sembrar(neg); await page.clock.runFor(300);
  await venta({ editar: true, cobrado: 1080 });
  r = await fin();
  chk('13 la 11-218 como quedó (saldo −380): guardar la deja en 1.080 y saldo 0', !r.nada && Math.abs(r.sal) < 0.01 && Math.abs(r.vt - 1080) < 0.01 && /@2026-11-14/.test(r.mp), r);
  const ade = base({ id: 'cs-ade', oc: '11-907', metodoPago: 'Efectivo %IMG1', acuenta: 700, saldo: 380, pagado: false });
  await sembrar(ade); await page.clock.runFor(300);
  const nDlg = DLG.length;
  await venta({ editar: true, acuenta: 0, saldo: 1080 });
  await page.clock.runFor(300);
  chk('14 bajar el «A cuenta» de 700 a 0 pregunta antes', DLG.length > nDlg && /pago ya anotado/.test(DLG[DLG.length - 1] || ''), DLG.slice(-1));
  await fin();

  chk('sin errores de la página', !errors.length, errors.slice(0, 3));
  console.log(`\n${PASS} ✓ · ${FAIL} ✗`);
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
