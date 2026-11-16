/* 🎓 (mejora 381, 16/11) «TE MUESTRO CÓMO»: BLOKI ENSEÑA LO QUE NUNCA HICISTE.
   Cuida: una vendedora con 3 avisos de Contabilidad abiertos que nunca cerró uno recibe UNA vez «¿Te muestro cómo? (1 minuto)»; «Sí,
   mostrame» abre su lista de avisos e ilumina el botón exacto de SU primer aviso, paso a paso («Abrir la venta» y después «✓ Ya lo corregí»),
   y al final dice cuántos le quedan; no se ofrece dos veces; la próxima tarea (la factura) sale en otra apertura del panel y «Ya sé» la apaga
   para esa persona; quien ya cerró un aviso no la recibe; logística, con entregas sin ✅ y sin haber usado nunca el cierre, recibe «el cierre
   de entregas» y Bloki ilumina el botón y después «Confirmar»; lo que pide el dueño desde «📊 Uso del panel» (`__ensena__`) la vuelve a
   ofrecer; solo señala (no guarda nada); sin la bandera (`ENSENA_PRUEBA`), nada.
   Reloj clavado el lunes 16/11/2026 17:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_bloki_ensena.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.error) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-16T17:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(1500);
  const ev = (fn, arg) => page.evaluate(fn, arg).catch(e => ({ error: String(e.message || e).slice(0, 300) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    try { if (typeof MIS_TIMER !== 'undefined' && MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
    try { localStorage.removeItem('me_ensena'); } catch (e) {}
    CONNECTED = true; UNLOCKED = false; window.ENSENA_PRUEBA = true; window.MIS_TOP_PRUEBA = true;
    window._saves = 0;
    apiSave = function (rec) { window._saves++; return Promise.resolve({ ok: true, pedido: JSON.parse(JSON.stringify(rec)) }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    var ts = new Date('2026-11-10T11:00:00-04:00').getTime(), hoy = todayStr();
    var V = function (id, o) { return Object.assign({ id: id, oc: '11-' + id.slice(1), nota: id.slice(1), vendedor: 'Juan Pablo Paredes', cliente: 'CLIENTE ' + id.toUpperCase(), celular: '70000000',
      fecha: '2026-11-20', turno: 'AM', zona: 'Norte', direccion: 'Calle 1', maps: '', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 1200 }], saldo: 0, acuenta: 1200,
      pagado: true, metodoPago: '~QR BISA 1200 @2026-11-10 #1', entregado: false, ts: ts, fotos: [], rev: 1 }, o); };
    var av = function (i, pid) { return { id: 'av' + i, k: 'k' + i, pid: pid, vend: 'Juan Pablo Paredes', cli: 'CLIENTE ' + pid.toUpperCase(), nota: '1', f: '2026-11-10', m: 1200, met: 'QR BISA',
      txt: 'la foto dice Bs 1.020', mes: '2026-11', t: ts, por: 'Contabilidad' }; };
    STATE = [V('v101'), V('v102'), V('v103'),
      { id: CTA_AV_ID, cliente: '📣 AVISOS', observaciones: JSON.stringify({ v: 1, a: [av(1, 'v101'), av(2, 'v102'), av(3, 'v103')] }), productos: [], rev: 1 },
      /* logística: 3 entregas de hoy sin ✅ y nunca un cierre */
      V('e201', { vendedor: 'Mirian Salazar', fecha: hoy }), V('e202', { vendedor: 'Mirian Salazar', fecha: hoy }), V('e203', { vendedor: 'Mirian Salazar', fecha: hoy })];
    saveMirror();
    window._card = function () { var c = document.getElementById('ensena'); return (c && !c.hidden) ? c.textContent : ''; };
    window._foco = function () { var f = document.querySelector('.asis-foco'); return f ? (f.textContent || f.id || f.tagName).trim().slice(0, 60) : ''; };
    window._mis = function (v) { closeModal(); showView('mis'); var mv = document.getElementById('mis-vendedor'); mv.value = v; renderMis(); };
  });

  console.log('\n── 1. la oferta, una vez ──');
  await ev(() => { _mis('Juan Pablo Paredes'); });
  await espera(3000);
  let r = await ev(() => ({ card: _card(), est: JSON.parse(localStorage.getItem('me_ensena') || '{}') }));
  chk('1a · con 3 avisos y ninguno cerrado, Bloki ofrece «Te muestro cómo» para cerrar un aviso', /Te muestro cómo/.test(r.card) && /Tenés 3 avisos de Contabilidad/.test(r.card) && /Sí, mostrame/.test(r.card) && /Ya sé, no me muestres más/.test(r.card), r.card);
  chk('1b · …y queda anotado que se le ofreció (una sola vez por persona y tarea)', r.est['juan pablo paredes|aviso'] && r.est['juan pablo paredes|aviso'].e === 'ofrecido', r.est);

  console.log('\n── 2. paso a paso con su primer aviso ──');
  r = await ev(() => { var b = [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /mostrame/.test(x.textContent); })[0]; b.click(); return 1; });
  await espera(600);
  r = await ev(() => ({ card: _card(), foco: _foco(), lista: !!document.querySelector('.ctav-it[data-av="av1"]'), enEl: !!document.querySelector('.ctav-it[data-av="av1"] .asis-foco') }));
  chk('2a · abre su lista de avisos e ilumina «Abrir la venta» de SU primer aviso (paso 1 de 2)', r.lista && r.enEl && /Abrir la venta/.test(r.foco) && /paso 1 de 2/.test(r.card) && /CLIENTE V101/.test(r.card), r);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /Siguiente/.test(x.textContent); })[0].click(); return 1; });
  await espera(400);
  r = await ev(() => ({ card: _card(), foco: _foco() }));
  chk('2b · después ilumina «✓ Ya lo corregí» (paso 2 de 2)', /Ya lo corregí/.test(r.foco) && /paso 2 de 2/.test(r.card), r);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /Listo/.test(x.textContent); })[0].click();
    return { card: _card(), est: JSON.parse(localStorage.getItem('me_ensena') || '{}')['juan pablo paredes|aviso'], saves: window._saves }; });
  chk('2c · al final: «¡Listo! Te quedan 3 avisos…», queda «hecho» y no guardó nada (solo señala)', /¡Listo!/.test(r.card) && /Te quedan 3 avisos/.test(r.card) && r.est.e === 'hecho' && r.saves === 0, r);
  await ev(() => { ensenaCerrar(); closeModal(); });

  console.log('\n── 3. otra apertura: la factura, y «Ya sé» ──');
  await ev(() => { ENSENA.ofrecio = false; _mis('Juan Pablo Paredes'); });
  await espera(3000);
  r = await ev(() => _card());
  chk('3a · en otra apertura no repite el aviso: ofrece anotar la factura (3 ventas sin N°)', /factura o la nota de remisión/.test(r) && /Tenés 3 ventas sin el N°/.test(r), r);
  r = await ev(() => { [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /Ya sé/.test(x.textContent); })[0].click();
    return { card: _card(), est: JSON.parse(localStorage.getItem('me_ensena') || '{}')['juan pablo paredes|factura'] }; });
  chk('3b · «Ya sé, no me muestres más» la apaga para esa persona', !r.card && r.est && r.est.e === 'ya', r);
  await ev(() => { ENSENA.ofrecio = false; _mis('Juan Pablo Paredes'); });
  await espera(3000);
  r = await ev(() => _card());
  chk('3c · …y no vuelve a ofrecer nada (cobrar el saldo no aplica: no tiene saldos)', !r, r);

  console.log('\n── 4. lo que pide el dueño desde «📊 Uso del panel» ──');
  await ev(() => { STATE.push({ id: ENSENA_ID, cliente: '🎓', observaciones: JSON.stringify({ v: 1, e: { factura: { t: Date.now() + 1000, por: 'Administración' } } }), productos: [], rev: 1 });
    ENSENA.ofrecio = false; _mis('Juan Pablo Paredes'); });
  await espera(3000);
  r = await ev(() => _card());
  chk('4 · el dueño pidió «Que Bloki la enseñe» (fila `__ensena__`): la vuelve a ofrecer y lo dice', /Administración pidió que te lo muestre/.test(r) && /factura/.test(r), r);
  await ev(() => { ensenaCerrar(); });

  console.log('\n── 5. quien ya cerró un aviso no la recibe ──');
  r = await ev(() => { localStorage.removeItem('me_ensena'); STATE = STATE.filter(function (p) { return p.id !== ENSENA_ID; });
    var f = STATE.filter(function (p) { return p.id === CTA_AV_ID; })[0], o = JSON.parse(f.observaciones); o.a[2].ok = Date.now(); o.a[2].okPor = 'Juan Pablo Paredes'; f.observaciones = JSON.stringify(o);
    var D = ensenaTarea('aviso').datos('Juan Pablo Paredes'); return { n: D.n, nunca: D.nunca }; });
  chk('5 · con un aviso cerrado por ella, «nunca lo hizo» es falso (no se ofrece)', r.nunca === false && r.n === 2, r);

  console.log('\n── 6. logística: el cierre de entregas ──');
  await ev(() => { ENSENA.ofrecio = false; closeModal(); UNLOCKED = true; document.getElementById('admin-lock').style.display = 'none'; document.getElementById('admin-content').style.display = 'block'; quienRol('logistica'); setVendedorMem(''); showView('admin'); renderAdmin(); });
  await espera(3000);
  r = await ev(() => _card());
  chk('6a · logística con 3 entregas sin ✅ y nunca el cierre: Bloki ofrece «el cierre de entregas»', /cierre de entregas/i.test(r) && /Tenés 3 entregas sin el ✅/.test(r), r);
  await ev(() => { [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /mostrame/.test(x.textContent); })[0].click(); });
  await espera(600);
  r = await ev(() => ({ foco: _foco(), card: _card() }));
  chk('6b · ilumina el botón «✅ Cierre de entregas» de Herramientas', /Cierre de entregas/.test(r.foco) && /paso 1 de 2/.test(r.card), r);
  await ev(() => { [].slice.call(document.querySelectorAll('#ensena button')).filter(function (x) { return /Siguiente/.test(x.textContent); })[0].click(); });
  await espera(700);
  r = await ev(() => ({ foco: (document.querySelector('.asis-foco') || {}).id || '', card: _card(), modal: document.getElementById('modal').classList.contains('on') }));
  chk('6c · abre el cierre e ilumina «Confirmar»', r.modal && r.foco === 'cie-ent-confirmar' && /paso 2 de 2/.test(r.card), r);
  await ev(() => { ensenaCerrar(); closeModal(); });

  console.log('\n── 7. sin la bandera ──');
  await ev(() => { window.ENSENA_PRUEBA = false; UNLOCKED = false; localStorage.removeItem('me_ensena'); ENSENA.ofrecio = false; quienRol(''); _mis('Juan Pablo Paredes'); });
  await espera(3000);
  r = await ev(() => _card());
  chk('7 · sin `ENSENA_PRUEBA` (las pruebas de siempre) Bloki no ofrece nada', !r, r);

  chk('sin errores de la página', errores.length === 0, errores);
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
