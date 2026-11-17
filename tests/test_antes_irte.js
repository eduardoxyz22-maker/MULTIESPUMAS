/* 🌙 310 · «ANTES DE IRTE»: LO DE HOY QUE FALTA (15/11; el dueño aprobó la 310: «ok»).
   Cuida: que sin la bandera no sale nada (ni la ventana ni «🌙 Me voy»); que desde las 19:00, en Mis pedidos de una vendedora, sale sola UNA
   vez por día y aparato; que dice SOLO lo de hoy: ventas cargadas hoy sin factura o remisión (las de ayer no), entregas del próximo camión
   sin ubicación (las de otro día no), el efectivo cobrado hoy sin entregar y las ventas de Kommo de hoy sin completar; cada una con su botón;
   con todo en verde «✅ Listo, buen descanso»; antes de las 19:00 no sale sola pero «🌙 Me voy» la abre; no frena nada.
   Reloj clavado (jueves 12/11/2026, 19:30 de Bolivia). Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_antes_irte.js */
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
  await page.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.removeItem('me_antes_irte'); } catch (e) {} });
  await page.clock.setFixedTime(new Date('2026-11-12T19:30:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const esperar = (ms) => page.waitForTimeout(ms);

  const hay = await ev(() => typeof antesIrteDatos === 'function' && typeof antesIrteAbrir === 'function');
  chk('0 · la página tiene la 310 (`antesIrteDatos`, `antesIrteAbrir`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(async () => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = ''; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    window.MIS_TOP_PRUEBA = 1;
    var T = function (s) { return Date.parse(s + '-04:00'); }, n = 0;
    var P = function (o) { n++; return Object.assign({ id: 'p' + n, oc: '11-' + (400 + n), nota: String(800 + n), vendedor: 'Isabel Robledo', cliente: 'CLIENTE ' + n, celular: '7' + String(3000000 + n), zona: 'Norte',
      maps: 'https://www.google.com/maps?q=-17.78,-63.18', fecha: '2026-11-16', turno: 'AM', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: 'COLT0048', cant: 1, precio: 2000, fdoc: 'F', fdocn: '66' + n }],
      saldo: 0, acuenta: 0, pagado: true, metodoPago: '', ts: T('2026-11-12T15:00:00') }, o); };
    var sinDoc = function (o) { var p = P(o); p.productos.forEach(function (x) { delete x.fdoc; delete x.fdocn; }); return p; };
    window._pl = [
      sinDoc({ id: 'h1' }),                                                                     // hoy, sin factura
      P({ id: 'h2', fecha: '2026-11-13', maps: '', entregado: false, pagado: true, metodoPago: 'Efectivo 870 @2026-11-12 #20' }),   // hoy, con factura; mañana sin ubicación; efectivo de hoy
      sinDoc({ id: 'a1', ts: T('2026-11-11T15:00:00') }),                                       // ayer sin factura: no es de hoy
      P({ id: 'a2', fecha: '2026-11-16', maps: '', ts: T('2026-11-10T15:00:00') }),             // sin ubicación pero para el 16/11: no es del próximo camión
      { id: 'kommo-81', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'LEAD DE HOY', celular: '78888888', saldo: 1000, fecha: '', productos: [], ts: T('2026-11-12T12:00:00') },
      { id: 'kommo-82', estado: BORRADOR_EST, vendedor: 'Isabel Robledo', cliente: 'LEAD VIEJO', celular: '78888877', saldo: 1000, fecha: '', productos: [], ts: T('2026-11-09T12:00:00') },
      P({ id: 'm1', vendedor: 'Mirian Salazar' })                                                // Mirian: todo al día
    ];
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    await refrescarEstado();
    window._ver = function (v) { showView('mis'); MIS_TODOS = false; var mv = document.getElementById('mis-vendedor'); mv.value = v; renderMis(); };
    window._m = function () { var m = document.getElementById('modal'), b = document.getElementById('vd-antes-irte');
      return { on: m.classList.contains('on') && !!b, txt: b ? b.innerText.replace(/\s+/g, ' ') : '', botones: b ? [].map.call(b.querySelectorAll('.vd-ai-it button'), function (x) { return x.textContent; }) : [],
        verdes: b ? b.querySelectorAll('.vd-ai-ck.vd-on').length : 0 }; };
  });

  // ============ 1. sin la bandera ============
  await ev(() => { window.ANTES_IRTE_PRUEBA = 0; _ver('Isabel Robledo'); });
  await esperar(800);
  let r = await ev(() => ({ m: _m().on, boton: !!document.getElementById('vd-me-voy') }));
  chk('1 · sin `ANTES_IRTE_PRUEBA` (Playwright) no sale la ventana ni «🌙 Me voy»', r.m === false && r.boton === false, r);

  // ============ 2. a las 19:30 sale sola ============
  await ev(() => { window.ANTES_IRTE_PRUEBA = 1; try { localStorage.removeItem('me_antes_irte'); } catch (e) {} document.getElementById('mis-top')._h = ''; _ver('Isabel Robledo'); });
  await esperar(900);
  r = await ev(() => _m());
  chk('2a · a las 19:30 sale sola «🌙 Antes de irte, Isabel» con «Solo lo de HOY»', r.on && /Antes de irte, Isabel/.test(r.txt) && /Solo lo de HOY · jueves 12\/11 · 19:30/.test(r.txt), r.txt);
  chk('2b · «2 ventas cargadas hoy» (las de ayer no)', /2 ventas cargadas hoy/.test(r.txt), r.txt);
  chk('2c · «🧾 1 venta de hoy sin factura o remisión» (la de ayer no cuenta)', /🧾 1 venta de hoy sin factura o remisión/.test(r.txt), r.txt);
  chk('2d · «📍 1 entrega del viernes 13/11 sin ubicación» (la del 16/11 no)', /📍 1 entrega del viernes 13\/11 sin ubicación/.test(r.txt), r.txt);
  chk('2e · «💵 Bs 870 en efectivo de hoy sin entregar»', /💵 Bs 870 en efectivo de hoy sin entregar/.test(r.txt), r.txt);
  chk('2f · «📥 1 venta de Kommo de hoy sin completar» (la de hace 3 días no)', /📥 1 venta de Kommo de hoy sin completar/.test(r.txt), r.txt);
  chk('2g · cada una con su botón, y lo que falta no está en verde', JSON.stringify(r.botones) === '["Anotar","Pedir ubicación","Ver","Completar"]' && r.verdes === 1 && /Cuando estén todos en verde/.test(r.txt), r);

  // ============ 3. los botones ============
  r = await ev(() => { [].filter.call(document.querySelectorAll('#vd-antes-irte .vd-ai-it button'), function (b) { return b.textContent === 'Anotar'; })[0].click();
    var m = document.getElementById('modal'); return { tit: (m.querySelector('.modal-h h3') || {}).textContent, n: m.querySelectorAll('.t2-f').length, cli: (m.querySelector('.t2-f b') || {}).textContent }; });
  chk('3 · «Anotar» abre las ventas de hoy sin factura (1)', /Ventas de hoy sin factura o remisión/.test(r.tit) && r.n === 1 && r.cli === 'CLIENTE 1', r);
  await ev(() => closeModal());

  // ============ 4. una vez por día ============
  await ev(() => { document.getElementById('mis-top')._h = ''; _ver('Isabel Robledo'); });
  await esperar(900);
  r = await ev(() => ({ m: _m().on, boton: !!document.getElementById('vd-me-voy') }));
  chk('4a · no vuelve a salir sola el mismo día', r.m === false, r);
  chk('4b · «🌙 Me voy» está en «Tu día»', r.boton === true, r);
  r = await ev(() => { document.getElementById('vd-me-voy').click(); return _m().on; });
  chk('4c · «🌙 Me voy» la abre cuando quiera', r === true, r);
  await ev(() => closeModal());

  // ============ 5. todo en verde ============
  await ev(() => { _ver('Mirian Salazar'); });
  await esperar(900);
  r = await ev(() => _m());
  chk('5 · con todo al día: «✅ Listo, buen descanso», todo en verde y sin botones', r.on && /✅ Listo, buen descanso/.test(r.txt) && r.botones.length === 0 && r.verdes === 5, r);
  await ev(() => closeModal());
  await ev(() => { document.getElementById('mis-top')._h = ''; _ver('Isabel Robledo'); });
  await esperar(900);
  r = await ev(() => _m().on);
  chk('5b · volver a Isabel después de mirar a Mirian no la abre de nuevo (una vez por día y por vendedora)', r === false, r);

  // ============ 5c. escribiendo el nombre (17/11, captura del dueño: «cada vez que borré una letra me salió ese aviso como 10 veces») ============
  // como el dueño: estaba en Isabel (ya la vio hoy) y borra su nombre letra por letra para poner otra vendedora
  await ev(() => { closeModal(); try { localStorage.setItem('me_antes_irte', JSON.stringify({ d: diaNegocio(), v: [normNombre('Isabel Robledo')] })); } catch (e) {}
    document.getElementById('mis-top')._h = ''; _ver('Isabel Robledo');
    window._abiertas = 0; var m = document.getElementById('modal');
    window._obs = new MutationObserver(function () { var on = m.classList.contains('on') && !!document.getElementById('vd-antes-irte'); if (on && !m._contada) { m._contada = 1; window._abiertas++; } if (!on) m._contada = 0; });
    window._obs.observe(m, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true }); });
  await page.click('#mis-vendedor');
  await page.keyboard.press('End');
  for (let i = 0; i < 14; i++) await page.keyboard.press('Backspace', { delay: 60 });
  await esperar(2200);
  r = await ev(() => { var o = null; try { o = JSON.parse(localStorage.getItem('me_antes_irte') || 'null'); } catch (e) {} return { abiertas: window._abiertas, vistos: o ? o.v : [], foco: document.activeElement && document.activeElement.id }; });
  chk('5c · borrando letra por letra en «Tu nombre» no sale ninguna vez (ni para «Isabel Robled», «Isa» o «I»)', r.abiertas === 0 && (r.vistos || []).length === 1 && r.foco === 'mis-vendedor', r);
  await page.keyboard.type('Mirian Salazar', { delay: 40 });
  await esperar(600);
  r = await ev(() => window._abiertas);
  chk('5d · con el nombre entero, mientras el campo sigue en uso, espera (no sale enseguida)', r === 0, r);
  await esperar(1900);
  r = await ev(() => { var o = null; try { o = JSON.parse(localStorage.getItem('me_antes_irte') || 'null'); } catch (e) {} return { abiertas: window._abiertas, txt: _m().txt.slice(0, 60), vistos: o ? o.v : [], k: normNombre('Mirian Salazar') }; });
  chk('5e · con el nombre quieto sale UNA vez, para Mirian', r.abiertas === 1 && /Antes de irte, Mirian/.test(r.txt) && JSON.stringify(r.vistos) === JSON.stringify(['isabel robledo', r.k]), r);
  await ev(() => { window._obs.disconnect(); closeModal(); document.getElementById('mis-vendedor').blur(); });

  // ============ 6. antes de las 19:00 ============
  await page.clock.setFixedTime(new Date('2026-11-13T18:30:00-04:00'));
  await ev(() => { try { localStorage.removeItem('me_antes_irte'); } catch (e) {} document.getElementById('mis-top')._h = ''; _ver('Isabel Robledo'); });
  await esperar(900);
  r = await ev(() => _m().on);
  chk('6 · a las 18:30 no sale sola', r === false, r);

  chk('7 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
