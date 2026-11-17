/* ✅ 309 · ¿TIENE EL PANEL AL DÍA? UNA FILA POR VENDEDORA (15/11; el dueño aprobó la 309: «ok»).
   Cuida: que sin la bandera no hay nada; los cinco puntos con las cuentas de siempre (🧾 `docVentaFalta`, 📣 `ctaAvAbiertos`, 📍 lo que viene sin
   ubicación, 📥 `borrPendientes(borradoresDe)`, 💵 `misEfectivoDatos`) y sus colores (verde nada · ámbar de esta semana · rojo de más de 4
   días o de plata), «al día N %»; la tabla en «👑 Ver todos» (lo más atrasado primero) y la fila de cada vendedora arriba de «Para hacer»; que
   tocar un punto abre esa lista; Bloki contesta «¿Isabel tiene el panel al día?» (con la contraseña de cualquiera; una vendedora, solo lo suyo).
   Reloj clavado (jueves 12/11/2026, 10:00 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_al_dia.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); } catch (e) {} });
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const esperar = (ms) => page.waitForTimeout(ms);

  const hay = await ev(() => typeof alDiaDatos === 'function' && typeof alDiaTablaHtml === 'function');
  chk('0 · la página tiene la 309 (`alDiaDatos`, `alDiaTablaHtml`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(async () => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = true;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = ''; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    var T = function (s) { return Date.parse(s + '-04:00'); }, n = 0;
    var P = function (o) { n++; return Object.assign({ id: 'p' + n, oc: '11-' + (300 + n), nota: String(700 + n), vendedor: 'Isabel Robledo', cliente: 'CLIENTE ' + n, celular: '7' + String(2000000 + n), zona: 'Norte',
      maps: 'https://www.google.com/maps?q=-17.78,-63.18', fecha: '2026-11-16', turno: 'AM', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: 1, precio: 2000, fdoc: 'F', fdocn: '55' + n }],
      saldo: 0, acuenta: 0, pagado: true, metodoPago: '', ts: T('2026-11-11T11:00:00') }, o); };
    var sinDoc = function (o) { var p = P(o); p.productos.forEach(function (x) { delete x.fdoc; delete x.fdocn; }); return p; };
    window._pl = [
      P({ id: 'i1', ts: T('2026-11-05T11:00:00'), maps: '' }),                                        // Isabel: sin ubicación (para el 16/11)
      P({ id: 'i2', fecha: '2026-11-13', maps: '' }),                                                   // sin ubicación para el próximo camión
      P({ id: 'i3', fecha: '2026-11-10', entregado: true, metodoPago: 'Efectivo 1000 @2026-11-10 #11' }),   // efectivo de hace 2 días
      P({ id: 'm1', vendedor: 'Mirian Salazar' }),                                                       // Mirian: todo al día
      sinDoc({ id: 'f1', vendedor: 'Maria Flores', ts: T('2026-11-12T09:00:00'), fecha: '2026-11-12', entregado: true }),   // María: sin factura de hoy ((17/11) solo entregadas: ✅ hoy)
      /* (17/11) solo entregadas: la factura se pide recién con la entrega hecha; las dos de Isabel sin factura ya salieron (aparte de las sin ubicación,
         que todavía no se entregan). Al final, para no correr los números de las de arriba. */
      sinDoc({ id: 'i1b', ts: T('2026-11-05T11:00:00'), fecha: '2026-11-07', entregado: true }),     // Isabel: sin factura hace 7 días
      sinDoc({ id: 'i2b', fecha: '2026-11-11' }),                                                       // sin factura de ayer (salió ayer)
      { id: 'kommo-71', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'LEAD NUEVO', celular: '79999999', saldo: 1000, fecha: '', productos: [], ts: T('2026-11-10T12:00:00') },
      { id: '__avisos_conta__', cliente: '📣', fecha: '', observaciones: JSON.stringify({ v: 1, a: [
        { id: 'av1', pid: 'i3', vend: 'Isabel Robledo', cli: 'CLIENTE 3', txt: 'la foto dice Bs 900', ks: ['monto'], t: T('2026-11-11T12:00:00') },
        { id: 'av2', pid: 'f1', vend: 'Maria Flores', cli: 'CLIENTE 5', txt: 'la foto es del 10/11', ks: ['dia'], t: T('2026-11-11T12:00:00') },
        /* 🗓️ (17/11) un aviso de un pago de OCTUBRE: no cuenta para el al día de Mirian (sigue 100 %) */
        { id: 'av3', pid: 'm1', vend: 'Mirian Salazar', cli: 'CLIENTE VIEJO', f: '2026-10-20', m: 500, met: 'QR BISA', txt: 'la foto dice Bs 450', ks: ['monto'], t: T('2026-10-26T12:00:00') }] }) }
    ];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    await refrescarEstado();
    window._ver = function (v, todos) { showView('mis'); MIS_TODOS = !!todos; var mv = document.getElementById('mis-vendedor'); mv.value = v || ''; renderMis(); };
  });

  // ============ 1. sin la bandera ============
  let r = await ev(() => { window.AL_DIA_PRUEBA = 0; var o = blokiEntender('¿isabel tiene el panel al día?'); return { fila: alDiaFilaHtml('Isabel Robledo'), tabla: alDiaTablaHtml(['Isabel Robledo']), bloki: o ? o.tipo : null }; });
  chk('1 · sin `AL_DIA_PRUEBA` (Playwright) no hay fila, ni tabla, ni pregunta de Bloki', r.fila === '' && r.tabla === '' && r.bloki !== 'aldia', r);

  // ============ 2. las cuentas ============
  r = await ev(() => { window.AL_DIA_PRUEBA = 1;
    var f = function (v) { var R = alDiaDatos(v); return { pct: R.pct, d: R.D.map(function (d) { return d.k + ':' + d.sev + ':' + d.n; }).join(' ') }; };
    return { isa: f('Isabel Robledo'), mir: f('Mirian Salazar'), mar: f('Maria Flores') }; });
  chk('2a · Isabel: 🧾 2 rojo (una de hace 7 días) · 📣 rojo (de plata) · 📍 2 rojo (una es para el próximo camión) · 📥 1 ámbar · 💵 ámbar (2 días) → 0 %',
      r.isa.d === 'fac:r:2 av:r:1 ub:r:2 ko:a:1 ef:a:1' && r.isa.pct === 0, r.isa);
  chk('2b · Mirian, todo verde → 100 %', r.mir.d === 'fac:v:0 av:v:0 ub:v:0 ko:v:0 ef:v:0' && r.mir.pct === 100, r.mir);
  chk('2c · María: 🧾 de hoy ámbar · 📣 solo la fecha ámbar → 60 %', r.mar.d === 'fac:a:1 av:a:1 ub:v:0 ko:v:0 ef:v:0' && r.mar.pct === 60, r.mar);

  // ============ 3. la tabla en «👑 Ver todos» ============
  await ev(() => { window.MIS_TOP_PRUEBA = 1; _ver('', true); });
  await esperar(200);
  r = await ev(() => { var t = document.getElementById('vd-al-dia'); if (!t) return { hay: false };
    return { hay: t.offsetParent !== null, nombres: [].map.call(t.querySelectorAll('.vd-ad-nm'), function (b) { return b.textContent; }), pc: [].map.call(t.querySelectorAll('.vd-ad-pc'), function (b) { return b.textContent; }),
      rojos: t.querySelectorAll('.vd-ad-r').length, txt: t.innerText.replace(/\s+/g, ' ') }; });
  chk('3a · en «👑 Ver todos» sale «¿Tienen el panel al día?» con una fila por vendedora, lo más atrasado primero', r.hay && JSON.stringify(r.nombres) === '["Isabel Robledo","Maria Flores","Mirian Salazar"]' && JSON.stringify(r.pc) === '["0 %","60 %","100 %"]', r);
  chk('3b · los cinco títulos y los puntos rojos de Isabel (3)', /Factura/.test(r.txt) && /Avisos/.test(r.txt) && /Ubic/.test(r.txt) && /Kommo/.test(r.txt) && /Efectivo/.test(r.txt) && r.rojos === 3, r);

  // ============ 4. tocar un punto ============
  r = await ev(() => { var b = document.querySelector('#vd-al-dia .vd-ad-d[data-v="Isabel Robledo"][data-k="fac"]'); b.click();
    var m = document.getElementById('modal'), o = { abierto: m.classList.contains('on'), tit: (m.querySelector('.modal-h h3') || {}).textContent, n: m.querySelectorAll('.t2-f').length }; closeModal(); return o; });
  chk('4a · 🧾 abre la lista de sus ventas sin factura o remisión (2)', r.abierto && /Isabel Robledo · sin N° de factura o remisión/.test(r.tit) && r.n === 2, r);
  r = await ev(() => { var b = document.querySelector('#vd-al-dia .vd-ad-d[data-v="Isabel Robledo"][data-k="ub"]'); b.click();
    var m = document.getElementById('modal'), o = { abierto: m.classList.contains('on'), n: m.querySelectorAll('.t2-f').length }; closeModal(); return o; });
  chk('4b · 📍 abre sus entregas sin ubicación (2)', r.abierto && r.n === 2, r);
  r = await ev(() => { var b = document.querySelector('#vd-al-dia .vd-ad-d[data-v="Isabel Robledo"][data-k="av"]'); b.click();
    var m = document.getElementById('modal'), o = { abierto: m.classList.contains('on'), txt: m.innerText.replace(/\s+/g, ' ') }; closeModal(); return o; });
  chk('4c · 📣 abre los avisos de Contabilidad', r.abierto && /CLIENTE 3/.test(r.txt), r);

  // ============ 5. la fila de cada vendedora, arriba de «Para hacer» ============
  await ev(() => { _ver('Isabel Robledo', false); });
  await esperar(200);
  r = await ev(() => { var y = document.getElementById('vd-al-dia-yo'); if (!y) return { hay: false };
    var card = y.parentNode, cab = card.querySelector('.ah-cab'); return { hay: y.offsetParent !== null, arriba: !!(y.compareDocumentPosition(cab) & Node.DOCUMENT_POSITION_FOLLOWING) && /Para hacer/.test(cab.textContent), txt: y.innerText.replace(/\s+/g, ' ') }; });
  chk('5a · Isabel ve su fila «✅ Tu panel al día … 0 %» arriba de «Para hacer»', r.hay && r.arriba && /Tu panel al día/.test(r.txt) && /0 %/.test(r.txt), r);
  r = await ev(() => { document.querySelector('#vd-al-dia-yo .vd-ad-d[data-k="ef"]').click(); return { ab: MIS_EF_ABIERTO }; });
  chk('5b · 💵 en su fila abre su efectivo', r.ab === true, r);

  // ============ 6. Bloki ============
  r = await ev(() => {
    var T = function (q) { var o = blokiEntender(q); return o ? o.tipo : null; };
    var tipos = { a: T('¿isabel tiene el panel al día?'), b: T('tengo el panel al dia?'), c: T('¿están al día?'), no: T('hay titanio para el jueves') };
    var mv = document.getElementById('mis-vendedor'); if (mv) mv.value = '';
    UNLOCKED = true; quienRol('admin'); setVendedorMem('');
    var adm = blokiResponder(blokiEntender('¿Isabel tiene el panel al día?'));
    UNLOCKED = false; quienRol(''); setVendedorMem('Mirian Salazar');
    var otra = blokiResponder(blokiEntender('¿Isabel tiene el panel al día?')), yo = blokiResponder(blokiEntender('¿tengo el panel al día?'));
    var ay = ASIS_AYUDA.filter(function (a) { var o = blokiEntender(a.q); return o && o.tipo === 'aldia'; }).map(function (a) { return a.q; });
    return { tipos: tipos, adm: { h: adm.h, f: (adm.filas || []).length }, otra: otra.h, yo: yo.h, ay: ay };
  });
  chk('6a · Bloki entiende «¿Isabel tiene el panel al día?» y «¿tengo el panel al día?»', r.tipos.a === 'aldia' && r.tipos.b === 'aldia' && r.tipos.c === 'aldia' && r.tipos.no !== 'aldia', r.tipos);
  chk('6b · con la contraseña: «Isabel Robledo tiene el panel al día en un 0 %», con los cinco puntos', /Isabel Robledo<\/b> tiene el panel al día en un <b>0 %/.test(r.adm.h) && r.adm.f === 5, r.adm);
  chk('6c · una vendedora solo ve lo suyo', /Solo te puedo decir lo tuyo/.test(r.otra) && /Tenés el panel al día en un <b>100 %/.test(r.yo), r);
  chk('6d · ninguna pregunta de la ayuda se toma por esta', r.ay.length === 0, r.ay);

  // ============ 7b. lo de antes de noviembre no cuenta (dueño, 17/11) ============
  r = await ev(() => { window.AL_DIA_PRUEBA = 1; var R = alDiaDatos('Mirian Salazar'), av = R.D.filter(function (d) { return d.k === 'av'; })[0];
    var H = misHacerDatos('Mirian Salazar', (STATE || []).filter(function (p) { return p && !esFilaSistema(p) && mismoVendedor(p.vendedor, 'Mirian Salazar'); }));
    var it = H.filter(function (o) { return o.ic === '🗂️'; })[0], rojo = H.filter(function (o) { return o.ic === '📣'; })[0];
    ctaAvVer('Mirian Salazar'); var m = document.getElementById('modal-box') || document.body;
    var t = m.innerText; closeModal();
    return { pct: R.pct, av: av.sev + ':' + av.n, it: it ? (it.sev + ':' + it.n) : null, rojo: !!rojo, lista: /De antes de noviembre/.test(t) && /CLIENTE VIEJO/.test(t) }; });
  chk('7b · un aviso de un pago de octubre: Mirian sigue 100 %, 📣 verde, «Para hacer» lo pone gris aparte y la lista lo muestra «De antes de noviembre»',
    r.pct === 100 && r.av === 'v:0' && r.it === 'i:1' && !r.rojo && r.lista, r);

  chk('7 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
