/* 📅 «¿EL CLIENTE TODAVÍA NO SABE EL DÍA?» CUANDO LA ENTREGA SE CORRE OTRA VEZ (§4ok-96, 05/11/2026; mejora 96 del plan del jueves).
   Medido el 02/11: 10 pendientes con la entrega a 34-82 días de la venta (fechas de relleno), uno por su cuarta fecha; cada cambio = un
   WhatsApp al cliente con una fecha que nadie eligió, dos a logística, y ocupa cupo.
   ⚠️ LO QUE ESTE TEST CUIDA:
   1. Cuándo se pregunta (`fmovPorque`): la 2ª vez que se mueve, el día nuevo a ≥14 días de hoy y a >30 de la venta, o las observaciones
      dicen «confirmará»/«avisará». No: la 1ª vez a un día cercano, hacia hoy o atrás, ATC, RPT, venta de tienda, entregado.
   2. 📅 Reprogramar: la 1ª vez mueve sin preguntar y cuenta 1 (`fmov` en los productos); la 2ª pregunta; «Cancelar» mueve (cuenta 2) y no
      vuelve a preguntar por ese día; «Aceptar» = «📦 El cliente avisa cuándo» (sin fecha, turno ni camión; volver a llamar ese día).
   3. ✏️ Editar: lo mismo desde el formulario (la casilla de la 76 queda tildada y se guarda sin día); sin cambiar la fecha no pregunta
      ni cuenta; `heredarMarcas` pasa el contador también a un producto nuevo.
   4. El cierre de entregas (`reproAplicar` a secas) cuenta sin preguntar. En Playwright apagado salvo `FMOV_PRUEBA`.
   Datos INVENTADOS. Reloj clavado el martes 03/11/2026, 10:00 de Bolivia.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_fecha_relleno.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let RESP = 'aceptar', preguntas = [];
  page.on('dialog', d => {
    const m = d.message();
    if (/¿El cliente todavía no sabe el día\?/.test(m)) { preguntas.push(m.slice(0, 300)); return RESP === 'aceptar' ? d.accept() : d.dismiss(); }
    return d.accept();
  });
  await page.clock.install({ time: new Date('2026-11-03T10:00:00-04:00') });   // martes
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));

  await ev(() => {
    window.__sinFlag = (typeof fmovPuede === 'function') ? fmovPuede({ id: 'x', oc: '11-001', fecha: '2026-11-05', productos: [] }) : 'no existe';
    window.FMOV_PRUEBA = 1;
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = true;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    var dia = 86400000, ahora = Date.now();
    var base = function (id, o) { return Object.assign({ id: id, oc: '11-0' + id.slice(-2), fecha: '2026-11-06', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + id,
      celular: '70000001', zona: 'Norte', direccion: 'CALLE FALSA 1', nota: '1' + id.slice(-2), productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, precio: 3200 }],
      pagado: true, saldo: 0, acuenta: 3200, metodoPago: 'Efectivo', observaciones: '', ts: ahora - 3 * dia, rev: 1, vehiculo: 'KSC', chofer: 'Luis' }, o || {}); };
    STATE = [
      base('p01'),                                                       // venta de hace 3 días, nunca se movió
      base('p02', { ts: ahora - 40 * dia }),                             // venta de hace 40 días
      base('p03', { observaciones: 'El cliente confirmará la fecha' }),
      base('p04', { productos: [{ desc: 'TITANIO LATEX', medida: '160x190', cant: 1, precio: 3200, fmov: 1 }] }),   // ya se movió una vez
      base('p05', { oc: 'ATC 11-005' }), base('p06', { oc: 'RPT 11-006', cliente: 'Mia Plaza' }),
      base('p07', { entregado: true }), base('p08', { fecha: '', direccion: 'SALIÓ DE TIENDA · Mia Plaza', zona: 'Tienda' }),
      base('p09'), base('p10'), base('p11')
    ];
    window._pl = JSON.parse(JSON.stringify(STATE)); saveMirror();
  });
  const sinFlag = await ev(() => window.__sinFlag);
  chk('0 · en Playwright sin FMOV_PRUEBA queda apagado (las pruebas de siempre aceptan todos los confirm)', sinFlag === false, sinFlag);

  // ============ 1. cuándo se pregunta ============
  const P = await ev(() => {
    var q = function (id, f) { return fmovPorque(findById(id), f); };
    return {
      primeraCerca: q('p01', '2026-11-09'), primeraLejos: q('p01', '2026-11-20'), lejosDeVenta: q('p01', '2026-12-08'),
      vieja14: q('p02', '2026-11-17'), vieja13: q('p02', '2026-11-16'), nota: q('p03', '2026-11-09'), segunda: q('p04', '2026-11-09'),
      haciaHoy: q('p04', '2026-11-03'), atras: q('p04', '2026-11-02'), misma: q('p04', '2026-11-06'),
      atc: q('p05', '2026-12-20'), rpt: q('p06', '2026-12-20'), entregado: q('p07', '2026-12-20'), tienda: q('p08', '2026-12-20'),
      notaAcento: fmovPorque(Object.assign({}, findById('p01'), { observaciones: 'avisará cuando tenga la casa' }), '2026-11-09'),
      notaNo: fmovPorque(Object.assign({}, findById('p01'), { observaciones: 'confirmar dirección con el portero' }), '2026-11-09')
    };
  });
  chk('1a · la 1ª vez a un día cercano NO pregunta', P.primeraCerca === '' && P.primeraLejos === '', P);
  chk('1b · el día nuevo a ≥14 días de hoy y a >30 de la venta pregunta (también una venta reciente con la entrega lejos)', /días de hoy/.test(P.lejosDeVenta) && /días de hoy/.test(P.vieja14) && P.vieja13 === '', P);
  chk('1c · las observaciones «confirmará» / «avisará» preguntan (con acento)', /confirmará/.test(P.nota) && /avisará/.test(P.notaAcento) && P.notaNo === '', P);
  chk('1d · la 2ª vez que se mueve pregunta', /2ª vez/.test(P.segunda), P.segunda);
  chk('1e · hacia hoy, hacia atrás o al mismo día no pregunta', P.haciaHoy === '' && P.atras === '' && P.misma === '', P);
  chk('1f · ni ATC, ni RPT, ni entregado, ni venta de tienda', P.atc === '' && P.rpt === '' && P.entregado === '' && P.tienda === '', P);

  /* 📅 Reprogramar desde la ficha */
  const repro = (id, f, t) => ev(async (a) => {
    var n0 = window._saves; reprogramarPedido(a.id); REPRO.fecha = a.f; REPRO.turno = a.t || 'AM'; reproConfirmar();
    await new Promise(r => setTimeout(r, 350)); try { closeModal(); } catch (e) {}
    var g = window._pl.filter(function (x) { return x.id === a.id; })[0] || {};
    return { guardo: window._saves > n0, fecha: g.fecha, turno: g.turno, veh: g.vehiculo, chofer: g.chofer, nroDia: g.nroDia, fmov: (g.productos || []).map(function (x) { return x.fmov || 0; }),
      avisa: avisaDe(g), conf: entregaAConfirmar(g), toast: (document.getElementById('toast') || {}).textContent || '' };
  }, { id, f, t });

  // ============ 2. 📅 Reprogramar ============
  preguntas = [];
  let r = await repro('p01', '2026-11-09');
  chk('2a · la 1ª vez mueve sin preguntar y cuenta 1', r.guardo && r.fecha === '2026-11-09' && r.fmov.join() === '1' && preguntas.length === 0, { r, preguntas });
  preguntas = []; RESP = 'cancelar';
  r = await repro('p01', '2026-11-11');
  chk('2b · la 2ª vez pregunta «¿El cliente todavía no sabe el día?» con el motivo', preguntas.length === 1 && /2ª vez/.test(preguntas[0]) && /Aceptar: todavía no sabe/.test(preguntas[0]), preguntas);
  chk('2c · «Cancelar» (ya eligió ese día) lo mueve como siempre y cuenta 2', r.guardo && r.fecha === '2026-11-11' && r.fmov.join() === '2' && !r.conf, r);
  preguntas = []; RESP = 'aceptar';
  r = await repro('p09', '2026-11-09');                 // p09 1ª vez
  r = await repro('p09', '2026-11-12');                 // 2ª: pregunta → Aceptar
  chk('2d · «Aceptar» lo pasa a «📦 El cliente avisa cuándo»: sin fecha, turno ni camión, volver a llamar ese día', r.guardo && r.fecha === '' && r.turno === '' &&
    r.veh === '' && r.chofer === '' && r.nroDia === 0 && r.avisa === '2026-11-12' && r.conf === true && preguntas.length === 1, r);
  chk('2e · el aviso lo dice', /avisa cuándo/.test(r.toast) && /12\/11/.test(r.toast), r.toast);
  const st = await ev(() => ({ cupo: cuposUsadosTurno('2026-11-12', 'AM') }));
  chk('2f · ya no ocupa cupo del día que se iba a poner', st.cupo === 0, st);

  // ============ 3. ✏️ Editar ============
  const editar = (id, cambiar) => ev(async (a) => {
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    editPedido(a.id); await new Promise(r => setTimeout(r, 250));
    if (a.f) { var fe = document.getElementById('f-fecha'); fe.value = a.f; fe.dispatchEvent(new Event('change', { bubbles: true })); }
    if (a.prod) { addProdRow('ALMOHADA', '50x70', '', 2, 150); }
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    var g = window._pl.filter(function (x) { return x.id === a.id; })[0] || {};
    return { guardo: window._saves > n0, fecha: g.fecha, turno: g.turno, fmov: (g.productos || []).map(function (x) { return x.fmov || 0; }),
      avisa: avisaDe(g), conf: entregaAConfirmar(g), toast: (document.getElementById('toast') || {}).textContent || '' };
  }, Object.assign({ id }, cambiar || {}));

  preguntas = []; RESP = 'aceptar';
  r = await editar('p04', { f: '2026-11-10' });
  chk('3a · ✏️ Editar la 2ª vez pregunta, y «Aceptar» guarda la venta sin día («avisa cuándo», volver a llamar ese día)', preguntas.length === 1 &&
    r.guardo && r.fecha === '' && r.turno === '' && r.avisa === '2026-11-10' && r.conf === true && r.fmov.join() === '2', { r, preguntas });

  preguntas = []; RESP = 'cancelar';
  r = await editar('p03', { f: '2026-11-09' });
  chk('3b · con «confirmará» en las observaciones pregunta; «Cancelar» guarda el día nuevo y cuenta 1', preguntas.length === 1 && /confirmará/.test(preguntas[0]) &&
    r.guardo && r.fecha === '2026-11-09' && !r.conf && r.fmov.join() === '1', { r, preguntas });

  preguntas = []; RESP = 'aceptar';
  r = await editar('p03', {});
  chk('3c · sin cambiar la fecha no pregunta ni cuenta', preguntas.length === 0 && r.guardo && r.fecha === '2026-11-09' && r.fmov.join() === '1', { r, preguntas });

  r = await editar('p03', { prod: true });
  chk('3d · `heredarMarcas` pasa el contador también al producto nuevo', r.guardo && r.fmov.join() === '1,1', r.fmov);

  preguntas = []; RESP = 'aceptar';
  r = await editar('p10', { f: '2026-11-09' });
  chk('3e · la 1ª vez a un día cercano: guarda sin preguntar y cuenta 1', preguntas.length === 0 && r.guardo && r.fecha === '2026-11-09' && r.fmov.join() === '1', { r, preguntas });

  // ============ 4. el cierre de entregas cuenta sin preguntar ============
  preguntas = [];
  const ci = await ev(async () => {
    var p = findById('p11'); await reproAplicar(p, '2026-11-09', 'AM', false);
    var p2 = findById('p11'); await reproAplicar(p2, '2026-11-10', 'PM', false);
    var g = window._pl.filter(function (x) { return x.id === 'p11'; })[0] || {};
    return { fecha: g.fecha, fmov: (g.productos || []).map(function (x) { return x.fmov || 0; }) };
  });
  chk('4 · «No salió · reprogramar» (reproAplicar) cuenta las dos veces sin preguntar', preguntas.length === 0 && ci.fecha === '2026-11-10' && ci.fmov.join() === '2', { ci, preguntas });

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
