/* 🏷️ PRECIO MUY POR DEBAJO DEL DE SIEMPRE (mejora 466, 22/11; el dueño la eligió de la muestra «cuidar la plata y los precios»).
   Cuida:
   1. Al guardar una venta del equipo con un producto más de 15 % por debajo del precio de siempre de su código (la mediana de lo que cobró
      el equipo en 90 días, con 3 ventas o más), el panel pregunta por qué en SU ventana (promoción · cliente antiguo · combo · otro ·
      corregir). Con el motivo se guarda y el motivo queda en el renglón (`dsc`).
   2. «Corregir el precio» no guarda y deja el precio en rojo.
   3. Volver a guardar la venta sin tocar el precio no pregunta (y conserva el motivo); cambiarle el precio a otro bajo, sí.
   4. No pregunta: un precio normal, 14 % menos, un código con menos de 3 ventas, Eduardo, ROHO, un interno, un mayorista, una ATC, una RPT.
   5. Un combo que suma bien (colchón caro + somier barato) no pregunta; si la suma también baja, sí.
   6. Los precios de Eduardo (mayorista) no cuentan para «el de siempre».
   7. «Otro» pide escribir el motivo y lo guarda.
   8. La historia del pedido y «💵 Precios del mes» lo muestran.
   9. En Playwright sin `DSC_PRUEBA`, apagado.
   Reloj clavado el martes 17/11/2026 10:00 de Bolivia. Red cortada, datos inventados.
   Se corre:  node tests/test_precio_bajo.js   · `PEDIDOS=<archivo>` corre contra otra página. */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { if (e && e.__err) c = false; c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, timezoneId: 'America/La_Paz' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const dialogos = []; page.on('dialog', d => { dialogos.push(d.message().slice(0, 120)); d.accept(); });
  await page.route(/^https?:/, r => r.abort());
  await page.clock.install({ time: new Date('2026-11-17T10:00:00-04:00') });
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(600);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));
  const espera = (ms) => page.clock.runFor(ms || 400);

  const sinFlag = await ev(() => dscActivo());
  chk('0 · en Playwright sin DSC_PRUEBA queda apagado', sinFlag === false, sinFlag);

  await ev(() => {
    window.DSC_PRUEBA = 1; window.PREG_PRUEBA = 1;
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; } if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
    CARGA_GEN++; CARGA_ESTADO = 'ok';
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    /* El historial del equipo: el colchón ZZ9001 se cobró 4.750 (tres veces) y 4.600; el somier ZZ9002, 2.000 (tres veces); ZZ9003, solo dos. */
    var dia = function (n) { return Date.parse('2026-11-17T09:00:00-04:00') - n * 86400000; };
    var V = function (id, vend, cli, prods, n) { return { id: id, oc: '11-' + id, fecha: '2026-11-05', turno: 'AM', vendedor: vend, cliente: cli, celular: '70000001', zona: 'Norte',
      direccion: 'CALLE 1', nota: '100', productos: prods, pagado: false, saldo: 1000, ts: dia(n), metodoPago: '', rev: 1 }; };
    var C = function (p) { return { desc: 'COLCHON PRUEBA', medida: '160x190', codigo: 'ZZ9001', cant: 1, precio: p }; };
    var S = function (p) { return { desc: 'SOMIER PRUEBA', medida: '160x190', codigo: 'ZZ9002', cant: 1, precio: p }; };
    var hist = [
      V('h1', 'Carola Chavez', 'A', [C(4750)], 3), V('h2', 'Maria Flores', 'B', [C(4750), S(2000)], 10), V('h3', 'Isabel Robledo', 'C', [C(4600)], 20),
      V('h4', 'Mirian Salazar', 'D', [C(4750), S(2000)], 40), V('h5', 'Carola Chavez', 'E', [S(2000)], 60),
      V('h6', 'Carola Chavez', 'F', [{ desc: 'ALMOHADA PRUEBA', medida: '50x70', codigo: 'ZZ9003', cant: 1, precio: 100 }], 5),
      V('h7', 'Maria Flores', 'G', [{ desc: 'ALMOHADA PRUEBA', medida: '50x70', codigo: 'ZZ9003', cant: 1, precio: 100 }], 6),
      /* Eduardo vende a mayorista mucho más barato: no tiene que bajar «el de siempre» */
      V('e1', 'Eduardo Añez', 'MULTICENTER', [C(2500)], 2), V('e2', 'Eduardo Añez', 'MULTICENTER', [C(2500)], 4), V('e3', 'Eduardo Añez', 'MULTICENTER', [C(2500)], 7),
      V('e4', 'Eduardo Añez', 'MULTICENTER', [C(2500)], 8), V('e5', 'Eduardo Añez', 'MULTICENTER', [C(2500)], 9),
      /* una de hace 120 días a 9.000: fuera de la ventana de 90 */
      V('v1', 'Carola Chavez', 'H', [C(9000)], 120)
    ];
    window._pl = JSON.parse(JSON.stringify(hist));
    STATE = []; STATE = mergePending(JSON.parse(JSON.stringify(hist))); saveMirror();
  });

  const llenar = (o) => ev((o) => {
    showView('form'); resetForm();
    document.getElementById('f-fecha').value = '2026-11-20'; segSet('f-turno', 'AM');
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-vendedor').value = o.vend || 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = o.cliente || 'CLIENTE INVENTADO';
    document.getElementById('f-celular').value = '70000000';
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    var n = document.getElementById('f-nota'); if (n) n.value = '1234';
    if (o.tipo === 'ATC') {
      segSet('f-atc-tipo', 'gar'); document.getElementById('f-atc-motivo').value = 'Hundimiento';
      document.getElementById('f-atc-detalle').value = 'hundido en el medio, no retoma su forma';
      document.getElementById('f-atc-compra').value = '2025-03-10';
      var pz = document.getElementById('f-pz-col'); if (pz) pz.checked = true;
    }
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    (o.prods || []).forEach(function (x) { addProdRow(x[0], '160x190', x[1], 1, ''); var c = box.lastElementChild; c.querySelector('.prod-precio').value = x[2]; });
    refreshDelButtons();
    if (o.tipo !== 'ATC' && o.tipo !== 'RPT') { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3000'; }
    try { updateMetodoVisibility(); } catch (e) {}
  }, o);
  /* Toca Guardar y contesta las ventanas del panel: `resp` = el `data-v` del botón a tocar en la de 🏷️ ('no' = Corregir), `texto` para «otro». */
  const guardar = async (resp, texto) => {
    await ev(() => { window._n0 = window._saves; submitPedido(); });
    await espera(300);
    const vista = await ev(() => { var ov = document.querySelector('.preg-ov'); if (!ov) return null;
      return { tit: (ov.querySelector('#preg-tit') || {}).textContent || '', txt: ov.innerText, ops: [].map.call(ov.querySelectorAll('.preg-op'), function (b) { return b.getAttribute('data-v'); }), no: (ov.querySelector('.preg-no') || {}).textContent || '' }; });
    if (vista && resp) {
      await ev((r) => { var ov = document.querySelector('.preg-ov'); var b = r === 'no' ? ov.querySelector('.preg-no') : ov.querySelector('.preg-op[data-v="' + r + '"]'); b.click(); }, resp);
      await espera(400);
      if (texto != null) {
        await ev((t) => { var ov = document.querySelector('.preg-ov'); if (!ov) return; ov.querySelector('.preg-in').value = t; ov.querySelector('.preg-si').click(); }, texto);
        await espera(400);
      }
    }
    for (let i = 0; i < 4; i++) {   // otra ventana (no debería): se cuenta y se acepta
      const otra = await ev(() => { var ov = document.querySelector('.preg-ov'); if (!ov) return null; var t = (ov.querySelector('#preg-tit') || {}).textContent; var b = ov.querySelector('.preg-si') || ov.querySelector('.preg-op'); b.click(); return t; });
      if (!otra) break; vista && (vista.otras = (vista.otras || []).concat([otra])); await espera(300);
    }
    await espera(600);
    return ev((v) => {
      var rojos = [].map.call(document.querySelectorAll('#f-productos .prod-precio.err'), function (e) { return e.closest('.prod-card').querySelector('.prod-desc').value; });
      return { vista: v, guardo: window._saves > window._n0, rojos: rojos, ult: window._pl[window._pl.length - 1] || null, toast: ((document.getElementById('toast')||{}).textContent||'').slice(0,200), saves: window._saves };
    }, vista);
  };

  // ============ 5. el combo ============
  let r = await ev(() => ({
    combo: dscRevisar('Carola Chavez', 'X', [{ desc: 'COLCHON PRUEBA', medida: '160x190', codigo: 'ZZ9001', cant: 1, precio: 5450 }, { desc: 'SOMIER PRUEBA', medida: '160x190', codigo: 'ZZ9002', cant: 1, precio: 1100 }], null).length,
    baja: dscRevisar('Carola Chavez', 'X', [{ desc: 'COLCHON PRUEBA', medida: '160x190', codigo: 'ZZ9001', cant: 1, precio: 4000 }, { desc: 'SOMIER PRUEBA', medida: '160x190', codigo: 'ZZ9002', cant: 1, precio: 1100 }], null).map(function (f) { return f.x.codigo; })
  }));
  chk('5a · colchón 5.450 + somier 1.100 (suman 6.550 contra 6.750): el descuento está repartido, no pregunta', r.combo === 0, r);
  chk('5b · colchón 4.000 + somier 1.100 (la suma baja 24 %): pregunta por los dos', r.baja && r.baja.join() === 'ZZ9001,ZZ9002', r);

  // ============ 6. los precios de Eduardo no cuentan ============
  r = await ev(() => dscDeSiempre(dscIdx(), 'ZZ9001', ''));
  chk('6 · «el de siempre» del ZZ9001 es 4.750 (sin los 2.500 de Eduardo a Multicenter ni los 9.000 de hace 120 días)', r === 4750, r);

  // ============ 1. un precio muy por debajo pregunta y guarda el motivo ============
  await llenar({ prods: [['COLCHON PRUEBA', 'ZZ9001', '3900']] });
  r = await guardar('promo');
  chk('1a · 3.900 contra 4.750 (18 % menos) abre la ventana del panel con el renglón y el precio de siempre',
    !!r.vista && /muy por debajo/i.test(r.vista.tit) && /COLCHON PRUEBA 160x190 a Bs 3\.900/.test(r.vista.txt) && /4\.750/.test(r.vista.txt) && /18 % menos/.test(r.vista.txt), r.vista);
  chk('1b · con los cuatro motivos y «Corregir el precio»', !!r.vista && r.vista.ops.join() === 'promo,antiguo,combo,otro' && /Corregir/.test(r.vista.no), r.vista && { ops: r.vista.ops, no: r.vista.no });
  const d1 = r.ult && r.ult.productos && r.ult.productos[0] && r.ult.productos[0].dsc;
  chk('1c · con «Promoción» se guarda y el motivo queda en el renglón (dsc: m, tip, t, q)', r.guardo && !!d1 && d1.m === 'promo' && d1.tip === 4750 && d1.t > 0 && d1.q === 'Carola Chavez', d1);
  chk('1d · sin otras ventanas en el medio', !(r.vista && r.vista.otras), r.vista && r.vista.otras);
  const idNueva = r.ult && r.ult.id;

  // ============ 2. Corregir ============
  await llenar({ prods: [['COLCHON PRUEBA', 'ZZ9001', '3900']] });
  r = await guardar('no');
  chk('2 · «Corregir el precio» no guarda y deja el precio en rojo', !r.guardo && r.rojos.join() === 'COLCHON PRUEBA', { guardo: r.guardo, rojos: r.rojos });

  // ============ 3. volver a guardar sin tocar el precio ============
  await ev(async (id) => { var p = window._pl.find(function (x) { return x.id === id; }); STATE = mergePending(JSON.parse(JSON.stringify(window._pl))); saveMirror(); resetForm(); editPedido(id); await new Promise(r => setTimeout(r, 300)); }, idNueva);
  await espera(400);
  await ev(() => { document.getElementById('f-direccion').value = 'CALLE FALSA 2'; });
  r = await guardar('promo');
  chk('3a · editar otra cosa y volver a guardar NO pregunta (el precio no cambió) y el motivo sigue', !r.vista && r.guardo && r.ult.productos[0].dsc && r.ult.productos[0].dsc.m === 'promo', { vista: r.vista, dsc: r.ult && r.ult.productos[0].dsc });
  await ev(async (id) => { STATE = mergePending(JSON.parse(JSON.stringify(window._pl))); saveMirror(); resetForm(); editPedido(id); await new Promise(r => setTimeout(r, 300)); }, idNueva);
  await espera(400);
  await ev(() => { document.querySelector('#f-productos .prod-precio').value = '3500'; });
  r = await guardar('antiguo');
  chk('3b · bajarle el precio a 3.500 vuelve a preguntar y queda el motivo nuevo', !!r.vista && /3\.500/.test(r.vista.txt) && r.guardo && r.ult.productos[0].dsc.m === 'antiguo', { vista: r.vista && r.vista.txt.slice(0, 120), dsc: r.ult && r.ult.productos[0].dsc });

  // ============ 4. lo que no pregunta ============
  const casos = [
    ['4a · un precio normal (4.700)', { prods: [['COLCHON PRUEBA', 'ZZ9001', '4700']] }],
    ['4b · 14 % menos (4.090)', { prods: [['COLCHON PRUEBA', 'ZZ9001', '4090']] }],
    ['4c · un código con solo 2 ventas en el equipo (ZZ9003 a 10)', { prods: [['ALMOHADA PRUEBA', 'ZZ9003', '10']] }],
    ['4d · Eduardo', { vend: 'Eduardo Añez', prods: [['COLCHON PRUEBA', 'ZZ9001', '2500']] }],
    ['4e · ROHO', { vend: 'ROHO', prods: [['COLCHON PRUEBA', 'ZZ9001', '2500']] }],
    ['4f · un pedido interno (FABRICA)', { vend: 'FABRICA', prods: [['COLCHON PRUEBA', 'ZZ9001', '2500']] }],
    ['4g · una venta a un mayorista (TIENDA AMIGA)', { cliente: 'TIENDA AMIGA ER S.A.', prods: [['COLCHON PRUEBA', 'ZZ9001', '2500']] }],
    ['4h · una RPT', { tipo: 'RPT', prods: [['COLCHON PRUEBA', 'ZZ9001', '2500']] }]
  ];
  for (const [lbl, o] of casos) {
    await llenar(o);
    r = await guardar(null);
    chk(lbl + ' no pregunta', !r.vista || !/muy por debajo/i.test(r.vista.tit), r.vista && r.vista.tit);
  }
  const dr = await ev(() => { segSet('f-doc-tipo', 'ATC'); setDocTipo(); var x = dscRevisar('Carola Chavez', 'X', [{ desc: 'COLCHON PRUEBA', medida: '160x190', codigo: 'ZZ9001', cant: 1, precio: 100 }], null).length;
    segSet('f-doc-tipo', 'OC'); setDocTipo(); return x; });
  chk('4i · una ATC no pregunta', dr === 0, dr);

  // ============ 7. «Otro» con el motivo escrito ============
  await llenar({ prods: [['COLCHON PRUEBA', 'ZZ9001', '3000']] });
  r = await guardar('otro', 'tenía una mancha');
  const d7 = r.ult && r.ult.productos[0].dsc;
  chk('7 · «Otro motivo» pide escribirlo y lo guarda', r.guardo && !!d7 && d7.m === 'otro' && d7.x === 'tenía una mancha', d7);
  const id7 = r.ult && r.ult.id;

  // ============ 8. la historia y «Precios del mes» ============
  r = await ev((id) => { window.FH_PRUEBA = 1; window.PRH_PRUEBA = 1; UNLOCKED = true; mostrarBotonesTodos();
    STATE = mergePending(JSON.parse(JSON.stringify(window._pl))); saveMirror();
    var h = pedHistDatos(findById(id)).filter(function (e) { return e.k === 'dsc'; }).map(function (e) { return e.html.replace(/<[^>]+>/g, ''); });
    var L = prmDatos('2026-11').filter(function (x) { return x.tp === 'dsc'; });
    var btn = document.getElementById('prm-btn');
    prmAbrir(); var txt = (document.getElementById('prm') || {}).innerText || ''; closeModal();
    return { h: h, n: L.length, mot: L.map(function (x) { return x.mot; }), btn: btn && !btn.hidden, txt: txt.slice(0, 600) }; }, id7);
  chk('8a · la historia del pedido dice quién guardó el precio bajo, contra cuánto y por qué', r.h && r.h.length === 1 && /Carola Chavez guardó COLCHON PRUEBA 160x190 a Bs 3\.000/.test(r.h[0]) && /normalmente Bs 4\.\d{3}/.test(r.h[0]) && /Otro motivo: tenía una mancha/.test(r.h[0]), r.h);
  chk('8b · «💵 Precios del mes» lista los descuentos confirmados (3: promoción→antiguo, otro… uno por venta)', r.n === 2 && r.mot.indexOf('Cliente antiguo') >= 0 && r.mot.indexOf('Otro motivo: tenía una mancha') >= 0, r);
  chk('8c · el botón aparece con la contraseña y la ventana lo muestra', r.btn === true && /tenía una mancha/.test(r.txt) && /descuento/.test(r.txt), r.txt);

  chk('sin errores de la página', errors.length === 0, errors.slice(0, 3));
  console.log('\n' + PASS + ' bien, ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
