/* 📅 LA VENTA QUE CUENTA EN EL MES EN QUE SE CARGÓ (§4pb, 08/11/2026).

   El dueño: «a fin de mes hay una o dos ventas que se entregan el siguiente mes, pero ya se facturaron y entraron en las ventas de
   octubre… una opción para marcar "esta venta entró en octubre" para no contaminar las métricas» y «no necesito ver todas las listas:
   marcar ventas puntuales que cuentan en octubre pero se entregan en noviembre».

   LO QUE ESTA PRUEBA CUIDA (contra lo publicado antes de §4pb, sin la marca, casi todas se ponen rojas):
   1. Las reglas: `ventaMes` = el mes de la entrega agendada, o el marcado (`vmes` en los productos) si es ANTERIOR; `ventaMesPuede` solo
      para una venta (no ATC, RPT ni venta de tienda) que se entrega en un mes posterior al de su carga.
   2. Proyección (`pryVentas` → `ym`): la marcada cuenta en octubre y no en noviembre; la fecha de entrega (`f`) no cambia.
   3. Contabilidad → Ventas por «Entrega agendada», con «Mes»: la marcada está en octubre; por «Ingreso», nada cambia.
   4. Los saldos de meses anteriores (§4ok-E7) de noviembre la traen si ya se entregó y debe (si no, desaparecía de los dos meses).
   5. La casilla de la ficha: solo en una venta que puede llevarla; sin la contraseña, apagada; con la contraseña se pone y se saca en
      TODOS los productos y se guarda; en una venta que no puede, no se pone.
   6. La columna de la entrega dice «📅 CUENTA EN OCTUBRE» en vez de «📆 OTRO MES».
   7. Corregir el pedido desde el formulario no se la lleva.
   8. «Tu mes» de Mis pedidos (`misAnilloDatos`) y Productos del mes por entrega (`pmCalcular`) la cuentan en octubre.

   Datos INVENTADOS (el repo es público). Reloj: jueves 12/11/2026 a las 10:00 de Bolivia.
   Se corre:  node tests/test_venta_mes.js   (desde la raíz del repo, con las variables de proxy de `correr.sh`) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 600)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, timezoneId: 'America/La_Paz' });
  page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-12T10:00:00-04:00') });
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const espera = (ms) => ev((ms) => new Promise(r => setTimeout(r, ms)), ms);

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    try { CARGA_GEN++; CARGA_ESTADO = 'ok'; clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    try { if (AUTO_TIMER) clearInterval(AUTO_TIMER); } catch (e) {}
    try { if (MIS_TIMER) clearInterval(MIS_TIMER); } catch (e) {}
    loadFromServer = function () {};
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    var ts = function (f) { return new Date(f + 'T11:00:00-04:00').getTime(); };
    /* Una venta: `reg` el día en que se cargó, `fecha` la entrega agendada, `bs` el total (todo por cobrar), `vm` la marca. */
    var P = function (id, vend, reg, fecha, bs, o) {
      o = o || {};
      var prods = (o.prods || [{ desc: 'TITANIO LATEX', medida: '160x190', codigo: '', cant: 1, precio: bs }, { desc: 'ALMOHADA', medida: '50x70', codigo: '', cant: 2, precio: 0 }]);
      if (o.vm) prods.forEach(function (x) { x.vmes = o.vm; });
      return Object.assign({ id: id, oc: o.oc || (reg.slice(5, 7) + '-' + id), nota: o.nota || String(id.length * 100 + bs % 97), vendedor: vend, cliente: o.cliente || ('CLIENTE ' + id.toUpperCase()),
        celular: '70000000', fecha: fecha, turno: fecha ? 'AM' : '', zona: o.zona || 'Norte', direccion: o.direccion || 'Calle 1', maps: '',
        productos: prods, saldo: bs, acuenta: 0, pagado: false, metodoPago: '', entregado: !!o.ent, ts: ts(reg), fotos: [] }, o.mas || {});
    };
    window._pl = [
      P('o1', 'Maria Flores', '2026-10-10', '2026-10-12', 3000, { ent: true }),                 // octubre, entregada en octubre
      P('mk', 'Maria Flores', '2026-10-29', '2026-11-05', 5000, { vm: '2026-10' }),             // MARCADA: se cargó en octubre, se entregó el 05/11
      P('nm', 'Maria Flores', '2026-10-30', '2026-11-06', 2000),                                // cargada en octubre, entrega en noviembre, SIN marca
      P('n1', 'Maria Flores', '2026-11-03', '2026-11-10', 4000),                                // noviembre
      P('mf', 'Carola Chavez', '2026-10-28', '2026-11-20', 6000, { vm: '2026-10' }),            // MARCADA, se entrega más adelante (20/11)
      P('ms', 'Maria Flores', '2026-10-20', '2026-10-27', 1500, { vm: '2026-10' }),             // marcada pero reprogramada al mismo mes: la marca no hace nada
      P('tv', 'Maria Flores', '2026-10-31', '', 900, { direccion: DIR_TIENDA + ' · Buenos Aires', zona: ZONA_TIENDA }),   // venta de tienda (sin entrega)
      P('a1', 'Maria Flores', '2026-10-29', '2026-11-04', 0, { oc: 'ATC 10-001' }),             // ATC que cruza de mes
      P('r1', 'Carola Chavez', '2026-10-29', '2026-11-04', 0, { oc: 'RPT 10-001', cliente: 'Tienda Banzer' })
    ];
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
  });

  // ═══ 1. Las reglas ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 1. ventaMes / ventaMesPuede ──');
  let r = await ev(() => {
    var o = {};
    ['o1', 'mk', 'nm', 'n1', 'mf', 'ms', 'tv', 'a1', 'r1'].forEach(function (id) { var p = findById(id); o[id] = [ventaMes(p), ventaMesPuede(p), ventaMesMarca(p)]; });
    return o;
  });
  chk('sin marca, el mes de la entrega: o1 octubre, nm y n1 noviembre (la que se cargó en octubre y se entrega en noviembre cuenta en NOVIEMBRE, como siempre)',
      r.o1 && r.o1[0] === '2026-10' && r.nm[0] === '2026-11' && r.n1[0] === '2026-11', r);
  chk('con la marca: mk (entregada el 05/11) y mf (se entrega el 20/11) cuentan en OCTUBRE', r.mk && r.mk[0] === '2026-10' && r.mf[0] === '2026-10', [r.mk, r.mf]);
  chk('la marca de una venta reprogramada al mismo mes en que se cargó no hace nada (ms: octubre por su entrega)', r.ms && r.ms[0] === '2026-10' && r.ms[1] === false && r.ms[2] === '2026-10', r.ms);
  chk('se ofrece solo en una venta que se entrega en un mes posterior al de su carga (mk, nm, mf); no en o1, n1, la venta de tienda, la ATC ni la RPT',
      r.mk[1] && r.nm[1] && r.mf[1] && !r.o1[1] && !r.n1[1] && !r.tv[1] && !r.a1[1] && !r.r1[1], r);

  // ═══ 2. Proyección ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 2. Proyección: la marcada cuenta en octubre ──');
  r = await ev(() => {
    var V = pryVentas(), x = V.filter(function (v) { return v.id === 'mk'; })[0];
    var oct = proyeccionMes('2026-10').equipo, nov = proyeccionMes('2026-11').equipo;
    var idsNov = V.filter(function (v) { return v.ym === '2026-11'; }).map(function (v) { return v.id; }).sort();
    var idsOct = V.filter(function (v) { return v.ym === '2026-10'; }).map(function (v) { return v.id; }).sort();
    return { x: x && { ym: x.ym, f: x.f, reg: x.reg }, oct: oct.vendido, nov: nov.vendido, idsNov: idsNov, idsOct: idsOct };
  });
  chk('pryVentas: la marcada lleva ym 2026-10, su entrega sigue siendo el 05/11 y se cargó el 29/10', r.x && r.x.ym === '2026-10' && r.x.f === '2026-11-05' && r.x.reg === '2026-10-29', r.x);
  chk('octubre: o1 + mk + mf + ms + la venta de tienda (3.000 + 5.000 + 6.000 + 1.500 + 900 = Bs 16.400)', r.oct === 16400 && r.idsOct.join('|') === 'mf|mk|ms|o1|tv', [r.oct, r.idsOct]);
  chk('noviembre: solo nm y n1 (2.000 + 4.000 = Bs 6.000): las marcadas no están', r.nov === 6000 && r.idsNov.join('|') === 'n1|nm', [r.nov, r.idsNov]);

  // ═══ 3. Contabilidad → Ventas ════════════════════════════════════════════════════════════════
  console.log('\n── 3. Ventas por «Entrega agendada» y por «Ingreso» ──');
  r = await ev(() => {
    showView('conta');
    var lista = function (base, mes) { segSet('cta-base', base); segSet('cta-mode', 'mes'); document.getElementById('cta-mes').value = mes;
      return contaLista().map(function (p) { return p.id; }).sort().join('|'); };
    var o = { eOct: lista('entrega', '2026-10'), eNov: lista('entrega', '2026-11'), iOct: lista('ingreso', '2026-10'), iNov: lista('ingreso', '2026-11') };
    segSet('cta-base', 'entrega');
    return o;
  });
  chk('por «Entrega agendada»: octubre = mf, mk, ms, o1 y la venta de tienda; noviembre = n1 y nm', r.eOct === 'mf|mk|ms|o1|tv' && r.eNov === 'n1|nm', r);
  chk('por «Ingreso» nada cambia: octubre = todo lo cargado en octubre (mf, mk, ms, nm, o1, tv); noviembre = n1', r.iOct === 'mf|mk|ms|nm|o1|tv' && r.iNov === 'n1', r);

  // ═══ 4. Los saldos de meses anteriores ═══════════════════════════════════════════════════════
  console.log('\n── 4. En noviembre, lo que debe una marcada ya entregada sale en «de meses anteriores» ──');
  r = await ev(() => {
    segSet('cta-base', 'entrega'); segSet('cta-mode', 'mes'); document.getElementById('cta-mes').value = '2026-11';
    var A = contaSaldosAnteriores().map(function (x) { return x.p.id; }).sort();
    segSet('cta-base', 'ingreso'); var B = contaSaldosAnteriores().map(function (x) { return x.p.id; }).sort();
    segSet('cta-base', 'entrega');
    return { A: A, B: B };
  });
  chk('por entrega: mk (entregada el 05/11 con Bs 5.000 por cobrar) sale con o1, ms y la venta de tienda; mf todavía no se entregó (no es deuda vieja); nm es de noviembre',
      r.A && r.A.join('|') === 'mk|ms|o1|tv', r.A);
  chk('por ingreso: lo de siempre (todo lo cargado en octubre y ya entregado: mk, ms, nm, o1 y la venta de tienda)', r.B && r.B.join('|') === 'mk|ms|nm|o1|tv', r.B);

  // ═══ 5. La casilla de la ficha ═══════════════════════════════════════════════════════════════
  console.log('\n── 5. La casilla «📅 Esta venta cuenta en las ventas de octubre» ──');
  r = await ev(() => {
    var mira = function (id) { closeModal(); showContaModal(id); var c = document.getElementById('cta-vmes'), l = document.getElementById('cta-vmes-lbl');
      return c ? { on: c.checked, dis: c.disabled, txt: (l ? l.innerText : '').replace(/\s+/g, ' ').trim(), modal: (document.getElementById('modal-box') || document.body).innerText.replace(/\s+/g, ' ') } : null; };
    var o = { mk: mira('mk'), nm: mira('nm'), n1: mira('n1'), o1: mira('o1'), tv: mira('tv') };
    var n0 = window._saves; ctaVentaMesPoner('nm', true); o.sinClave = { guardo: window._saves > n0, toast: (document.getElementById('toast') || {}).textContent, vm: ventaMesMarca(findById('nm')) };
    closeModal();
    return o;
  });
  chk('mk (marcada): la casilla está tildada y dice «Esta venta cuenta en las ventas de octubre de 2026», cuándo se cargó y se entrega',
      r.mk && r.mk.on && /^Esta venta cuenta en las ventas de octubre de 2026 Se cargó el 29\/10\/2026 y se entrega el 05\/11\/2026\. Proyección, comisiones y «Entrega agendada» la cuentan en octubre de 2026; la entrega no cambia\./.test(r.mk.txt), r.mk && r.mk.txt);
  chk('nm (sin marcar): destildada, «Sin marcar, cuenta en noviembre de 2026, el mes de su entrega»', r.nm && !r.nm.on && /Sin marcar, cuenta en noviembre de 2026, el mes de su entrega/.test(r.nm.txt), r.nm && r.nm.txt);
  chk('sin la contraseña, la casilla está apagada y dice que se marca con la contraseña de Administración', r.mk.dis && r.nm.dis && /🔒 Se marca con la contraseña de Administración/.test(r.nm.modal), [r.mk.dis, r.nm.dis]);
  chk('no aparece en una venta que se carga y se entrega en el mismo mes (n1, o1) ni en la venta de tienda', r.n1 === null && r.o1 === null && r.tv === null, [r.n1, r.o1, r.tv]);
  chk('sin la contraseña, tocarla no guarda nada', r.sinClave && !r.sinClave.guardo && /contraseña de Administración/.test(r.sinClave.toast) && r.sinClave.vm === '', r.sinClave);

  r = await ev(async () => {
    localStorage.setItem(LS_ADMIN, sha256('clave-de-prueba'));
    document.getElementById('admin-pass').value = 'clave-de-prueba'; tryUnlock();
    var o = { unlocked: UNLOCKED };
    closeModal(); showContaModal('nm'); o.dis = document.getElementById('cta-vmes').disabled;
    var n0 = window._saves;
    ctaVentaMesPoner('nm', true); await new Promise(r => setTimeout(r, 400));
    var g = window._pl.find(x => x.id === 'nm');
    o.pone = { guardo: window._saves > n0, prods: g && g.productos.map(x => x.vmes), mes: ventaMes(findById('nm')), on: (document.getElementById('cta-vmes') || {}).checked,
               toast: (document.getElementById('toast') || {}).textContent };
    n0 = window._saves;
    ctaVentaMesPoner('nm', false); await new Promise(r => setTimeout(r, 400));
    g = window._pl.find(x => x.id === 'nm');
    o.saca = { guardo: window._saves > n0, prods: g && g.productos.map(x => x.vmes === undefined), mes: ventaMes(findById('nm')), toast: (document.getElementById('toast') || {}).textContent };
    n0 = window._saves; ctaVentaMesPoner('o1', true); await new Promise(r => setTimeout(r, 200));
    o.o1 = { guardo: window._saves > n0, vm: ventaMesMarca(findById('o1')), toast: (document.getElementById('toast') || {}).textContent };
    closeModal();
    return o;
  });
  chk('con la contraseña, la casilla se puede tocar', r.unlocked && r.dis === false, r);
  chk('tildarla guarda vmes 2026-10 en TODOS los productos y la venta pasa a contar en octubre', r.pone && r.pone.guardo && r.pone.prods.every(v => v === '2026-10') && r.pone.mes === '2026-10' && r.pone.on === true
      && /Cuenta en las ventas de octubre de 2026 ✓ \(se sigue entregando el 06\/11\/2026\)/.test(r.pone.toast), r.pone);
  chk('destildarla la saca de todos y vuelve a contar en noviembre', r.saca && r.saca.guardo && r.saca.prods.every(Boolean) && r.saca.mes === '2026-11' && /Vuelve a contar en el mes de su entrega \(noviembre de 2026\)/.test(r.saca.toast), r.saca);
  chk('en una venta que no puede llevarla (o1, cargada y entregada en octubre), no se pone', r.o1 && !r.o1.guardo && r.o1.vm === '' && /Solo una venta que se entrega en un mes posterior/.test(r.o1.toast), r.o1);

  // ═══ 6. La columna de la entrega ═════════════════════════════════════════════════════════════
  console.log('\n── 6. La etiqueta en la tabla ──');
  r = await ev(() => {
    var t = function (id) { var d = document.createElement('div'); d.innerHTML = entregaFechaHtml(findById(id)); return d.innerText.replace(/\s+/g, ' ').trim(); };
    return { mk: t('mk'), nm: t('nm'), n1: t('n1') };
  });
  chk('la marcada dice «📅 CUENTA EN OCTUBRE»; la que cruza sin marca, «📆 OTRO MES»; la de noviembre, solo la fecha',
      /05\/11\/2026\s*📅 CUENTA EN OCTUBRE/.test(r.mk) && !/OTRO MES/.test(r.mk) && /📆 OTRO MES/.test(r.nm) && !/OTRO MES|CUENTA EN/.test(r.n1), r);

  // ═══ 7. Corregir el pedido no se la lleva ════════════════════════════════════════════════════
  console.log('\n── 7. El formulario la conserva ──');
  await ev(() => { STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror(); editPedido('mf'); });
  await espera(250);
  r = await ev(async () => {
    document.getElementById('f-direccion').value = 'OTRA CALLE 2';
    var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 450));
    var g = window._pl.find(x => x.id === 'mf');
    return { guardo: window._saves > n0, dir: g && g.direccion, prods: g && g.productos.map(x => x.vmes), toast: (document.getElementById('toast') || {}).textContent };
  });
  chk('corregir la dirección desde el formulario conserva la marca en todos los productos', r.guardo && r.dir === 'OTRA CALLE 2' && r.prods && r.prods.length === 2 && r.prods.every(v => v === '2026-10'), r);

  // ═══ 8. «Tu mes» y Productos del mes ═════════════════════════════════════════════════════════
  console.log('\n── 8. «Tu mes» de Mis pedidos y Productos del mes por entrega ──');
  r = await ev(() => {
    STATE = JSON.parse(JSON.stringify(window._pl)); saveMirror();
    var mine = STATE.filter(function (p) { return p.vendedor === 'Maria Flores'; });
    var R = misAnilloDatos(mine);
    var pm = function (mes, base) { var X = pmCalcular(STATE, { mes: mes, base: base, vendedor: '' }, []); return X.detalle.map(function (l) { return l.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort().join('|'); };
    return { bs: R.bs, bsAnt: R.bsAnt, n: R.n, pmOctE: pm('2026-10', 'entrega'), pmNovE: pm('2026-11', 'entrega'), pmOctI: pm('2026-10', 'ingreso') };
  });
  chk('«Tu mes» de Maria: vendido para noviembre = nm + n1 (Bs 6.000, 2 ventas); octubre = o1 + mk + ms (Bs 9.500)', r.bs === 6000 && r.n === 2 && r.bsAnt === 9500, r);
  chk('Productos del mes por entrega: octubre trae mf, mk, ms, o1 y la venta de tienda; noviembre, n1 y nm', r.pmOctE === 'mf|mk|ms|o1|tv' && r.pmNovE === 'n1|nm', [r.pmOctE, r.pmNovE]);
  chk('Productos del mes por ingreso: lo de siempre (todo lo cargado en octubre)', r.pmOctI === 'mf|mk|ms|nm|o1|tv', r.pmOctI);

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
