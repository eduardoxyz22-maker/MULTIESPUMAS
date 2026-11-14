/* ⚡ 218 · FRASES RÁPIDAS EN LAS OBSERVACIONES (14/11; el dueño aprobó la 218: «Botones arriba del campo de observaciones con lo que
   más se escribe. Un toque y queda escrito igual siempre, así la ficha de logística lo marca como etiqueta sin errores de tipeo. Se
   puede seguir escribiendo a mano»).
   Cuida: los seis botones arriba del campo; poner (al final, con «. ») y sacar (solo el pedazo, con su separador); que dispara el
   `input` del campo; que se prende con la frase fija Y con lo que se escribe a mano («por favor llamar una hora antes», «avisar antes de
   ir», «pagará al momento de la entrega», «colocar doble bolsa», «3er piso», «de 11 a 12»), y no con «no llamar antes»/«sin doble
   bolsa»; los dos «llamar» se reemplazan; «Edificio · piso…» deja elegido el «…» y «Horario…» el cursor al final; la revisión de las
   observaciones (`obsRevisar`) no avisa por las frases fijas; el pedido guardado lleva el texto y la ficha de logística muestra las
   etiquetas; OC, RPT y ATC sí, venta de tienda no; con el teclado; en el celular (390 px) los botones bajan de renglón.
   Datos inventados (el repo es público).
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_frases_rapidas.js
   `PEDIDOS=<archivo>` corre contra otra página (para ver los dientes contra la de antes). */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.install({ time: new Date('2026-11-05T10:00:00-04:00') });   // jueves 05/11
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.clock.runFor(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  const hay = await ev(() => typeof frqTocar === 'function' && typeof frqSpans === 'function' && !!document.getElementById('frq'));
  chk('0 · la página tiene las frases rápidas (`#frq`, `frqTocar`, `frqSpans`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  await ev(() => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false;
    window._pl = []; window._saves = 0;
    apiSave = function (rec) {
      window._saves++;
      var g = JSON.parse(JSON.stringify(rec));
      window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g });
    };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    STATE = []; saveMirror();
    showView('form'); resetForm();
    /* cuenta los `input` que le llegan al formulario (los pasos, «Para guardar» y la revisión de las observaciones escuchan ahí) */
    window._inputs = 0;
    document.querySelector('#view-form .form-card').addEventListener('input', function (e) { if (e.target && e.target.id === 'f-obs') window._inputs++; });
  });

  /* `estado()` = el texto del campo y qué botones están prendidos */
  const estado = () => ev(() => {
    var b = [].slice.call(document.querySelectorAll('#frq .frq-b'));
    return { v: document.getElementById('f-obs').value, on: b.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; }).map(function (x) { return x.getAttribute('data-frq'); }) };
  });
  const poner = (v) => ev((v) => { var el = document.getElementById('f-obs'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const tocar = (k) => ev((k) => { document.querySelector('#frq .frq-b[data-frq="' + k + '"]').click(); }, k);

  // ============ 1. los botones ============
  const B = await ev(() => {
    var box = document.getElementById('frq'), el = document.getElementById('f-obs'), bs = [].slice.call(box.querySelectorAll('button'));
    return { n: bs.length, tipos: bs.every(function (b) { return b.type === 'button'; }), textos: bs.map(function (b) { return b.textContent.trim(); }),
      arriba: !!(box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING), mismaCaja: box.parentNode === el.parentNode,
      visible: box.offsetParent !== null, grupo: box.getAttribute('role') === 'group' && !!box.getAttribute('aria-label'),
      apagados: bs.every(function (b) { return b.getAttribute('aria-pressed') === 'false'; }) };
  });
  chk('1a · seis botones de verdad (`type="button"`) en un grupo con nombre', B.n === 6 && B.tipos && B.grupo, B);
  chk('1b · los textos de la muestra', JSON.stringify(B.textos) === JSON.stringify(['📞Llamar 1 h antes', '📞Media hora antes', '🏢Edificio · piso…', '💵Paga al recibir', '🛍️Doble bolsa', '🕐Horario…']), B.textos);
  chk('1c · arriba del campo de observaciones, en la misma caja, a la vista y apagados con el campo vacío', B.arriba && B.mismaCaja && B.visible && B.apagados, B);

  // ============ 2. poner y sacar ============
  let e0 = await ev(() => window._inputs);
  await tocar('l1'); let s = await estado();
  chk('2a · con el campo vacío escribe «LLAMAR 1 HORA ANTES» y se prende', s.v === 'LLAMAR 1 HORA ANTES' && JSON.stringify(s.on) === '["l1"]', s);
  let e1 = await ev(() => window._inputs);
  chk('2b · dispara el `input` del campo (lo ven los pasos, «Para guardar» y la revisión)', e1 === e0 + 1, { antes: e0, despues: e1 });
  await tocar('paga'); await tocar('bolsa'); s = await estado();
  chk('2c · las siguientes van al final, separadas con «. »', s.v === 'LLAMAR 1 HORA ANTES. PAGA AL RECIBIR. PONER DOBLE BOLSA' && s.on.join() === 'l1,paga,bolsa', s);
  await tocar('paga'); s = await estado();
  chk('2d · tocar una prendida la saca, con su separador', s.v === 'LLAMAR 1 HORA ANTES. PONER DOBLE BOLSA' && s.on.join() === 'l1,bolsa', s);
  await tocar('l1'); s = await estado();
  chk('2e · sacar la primera no deja «. » colgando', s.v === 'PONER DOBLE BOLSA' && s.on.join() === 'bolsa', s);
  await tocar('bolsa'); s = await estado();
  chk('2f · y sacando la última el campo queda vacío', s.v === '' && s.on.length === 0, s);
  await poner('CASA AZUL PORTON NEGRO'); await tocar('paga'); s = await estado();
  chk('2g · con algo escrito a mano: «CASA AZUL PORTON NEGRO. PAGA AL RECIBIR»', s.v === 'CASA AZUL PORTON NEGRO. PAGA AL RECIBIR', s);
  await poner('CASA AZUL.'); await tocar('bolsa'); s = await estado();
  chk('2h · si ya termina en punto, solo un espacio', s.v === 'CASA AZUL. PONER DOBLE BOLSA', s);
  await poner('CASA AZUL\n'); await tocar('l30'); s = await estado();
  chk('2i · si termina en un renglón nuevo, va en ese renglón', s.v === 'CASA AZUL\nLLAMAR MEDIA HORA ANTES', s);
  await poner('CASA AZUL, LLAMAR 1 HORA ANTES, PORTON NEGRO'); await tocar('l1'); s = await estado();
  chk('2j · sacar del medio deja lo de los costados', s.v === 'CASA AZUL, PORTON NEGRO', s);

  // ============ 3. los dos «llamar» van juntos ============
  await poner(''); await tocar('l1'); await tocar('l30'); s = await estado();
  chk('3a · elegir «Media hora antes» reemplaza a «1 h antes»', s.v === 'LLAMAR MEDIA HORA ANTES' && s.on.join() === 'l30', s);
  await poner('CASA VERDE. LLAMAR MEDIA HORA ANTES. PAGA AL RECIBIR'); await tocar('l1'); s = await estado();
  chk('3b · y al revés, en su lugar, sin tocar lo demás', s.v === 'CASA VERDE. LLAMAR 1 HORA ANTES. PAGA AL RECIBIR' && s.on.join() === 'l1,paga', s);
  await poner('llamar dos horas antes, casa verde'); s = await estado();
  chk('3c · «llamar dos horas antes» no prende ninguno de los dos', s.on.length === 0, s);
  await tocar('l1'); s = await estado();
  chk('3d · …pero elegir uno lo reemplaza (no quedan dos «llamar»)', s.v === 'LLAMAR 1 HORA ANTES, casa verde' && s.on.join() === 'l1', s);
  await poner('AVISAR ANTES DE IR. CASA VERDE'); await tocar('l30'); s = await estado();
  chk('3e · «avisar antes de ir» escrito a mano se reemplaza por la frase fija', s.v === 'LLAMAR MEDIA HORA ANTES. CASA VERDE', s);
  await poner('avisar antes de ir. LLAMAR MEDIA HORA ANTES'); s = await estado();
  chk('3f · «avisar antes» sin hora no prende «1 h» si la nota ya dice media hora', s.on.join() === 'l30', s);
  await tocar('l1'); s = await estado();
  chk('3g · elegir «1 h» deja UNO solo', s.v === 'LLAMAR 1 HORA ANTES', s);

  // ============ 4. se prende con lo que se escribe a mano (las palabras de la ficha de logística) ============
  const V = await ev(() => {
    var C = [['POR FAVOR LLAMAR UNA HORA ANTES', 'l1'], ['llamar al cliente 1 hora antes de llegar', 'l1'], ['avisar antes de ir', 'l1'], ['LLAMAR MEDIA HORA ANTES', 'l30'],
      ['llamar 30 min antes', 'l30'], ['PAGARÁ AL MOMENTO DE LA ENTREGA', 'paga'], ['pago contra entrega', 'paga'], ['el saldo paga al recibir', 'paga'],
      ['colocar doble bolsa', 'bolsa'], ['LLEVAR CON 2 BOLSAS', 'bolsa'], ['vive en el 3er piso', 'edif'], ['Edificio Sol dpto 4B', 'edif'], ['piso 7, sin ascensor', 'edif'],
      ['entregar de 11 a 12', 'hora'], ['HORARIO DE ENTREGA 12:00', 'hora'], ['después de las 15', 'hora']];
    return C.map(function (c) { var S = frqSpans(c[0]); return { t: c[0], quiere: c[1], ok: !!S[c[1]], canon: S[c[1]] ? S[c[1]].canon : null }; });
  });
  const vMal = V.filter(x => !x.ok);
  chk('4a · las formas de escribirlo a mano prenden su botón (' + V.length + ')', vMal.length === 0, vMal);
  chk('4b · lo escrito a mano no es la frase fija (`canon` falso) salvo la de verdad', V.filter(x => x.t === 'LLAMAR MEDIA HORA ANTES')[0].canon === true && V.filter(x => x.t === 'avisar antes de ir')[0].canon === false, V);
  const NO = await ev(() => {
    var C = ['NO LLAMAR ANTES', 'sin doble bolsa', 'NO COBRAR AL ENTREGAR', 'llamar antes de las 12', 'avisar antes del medio dia', 'una bolsa', 'casa de 2 pisos'];
    return C.map(function (c) { var S = frqSpans(c), on = Object.keys(S).filter(function (k) { return k !== 'grupo' && k !== 'hora'; }); return { t: c, on: on }; });
  });
  chk('4c · «no llamar antes», «sin doble bolsa», «no cobrar al entregar», «antes de las 12» no prenden (salvo el horario)', NO.every(x => x.on.length === 0), NO);
  await poner('POR FAVOR LLAMAR UNA HORA ANTES, LO RECIBE EL SR. INVENTADO 70000001'); s = await estado();
  chk('4d · lo escrito a mano prende el botón en el formulario', s.on.join() === 'l1', s);
  const tit = await ev(() => document.querySelector('#frq .frq-b[data-frq="l1"]').title);
  chk('4e · y su cartelito dice qué encontró', /Ya lo dice: «POR FAVOR LLAMAR UNA HORA ANTES»/.test(tit), tit);
  await tocar('l1'); s = await estado();
  chk('4f · tocarlo saca SOLO ese pedazo («lo recibe…» queda)', s.v === 'LO RECIBE EL SR. INVENTADO 70000001' && s.on.length === 0, s);

  // ============ 5. los abiertos: «Edificio · piso…» y «Horario…» ============
  await poner('CASA AZUL'); await tocar('edif');
  const E = await ev(() => { var el = document.getElementById('f-obs'); return { v: el.value, foco: document.activeElement === el, sel: el.value.slice(el.selectionStart, el.selectionEnd) }; });
  chk('5a · «Edificio · piso…» escribe «EDIFICIO …, PISO », pasa al campo y deja elegido el «…»', E.v === 'CASA AZUL. EDIFICIO …, PISO ' && E.foco && E.sel === '…', E);
  await page.keyboard.type('TORRE INVENTADA');
  await ev(() => { var el = document.getElementById('f-obs'); el.setSelectionRange(el.value.length, el.value.length); });
  await page.keyboard.type('5');
  s = await estado();
  chk('5b · lo que se escribe reemplaza el «…» y el piso va al final', s.v === 'CASA AZUL. EDIFICIO TORRE INVENTADA, PISO 5' && s.on.join() === 'edif', s);
  await tocar('l1'); s = await estado();
  chk('5c · otra frase después sigue con «. »', s.v === 'CASA AZUL. EDIFICIO TORRE INVENTADA, PISO 5. LLAMAR 1 HORA ANTES' && s.on.join() === 'l1,edif', s);
  await tocar('edif'); s = await estado();
  chk('5d · sacar el edificio saca toda su frase y deja el «llamar»', s.v === 'CASA AZUL. LLAMAR 1 HORA ANTES' && s.on.join() === 'l1', s);
  await poner('EDIFICIO SOL, PISO 3 LLAMAR 1 HORA ANTES'); await tocar('edif'); s = await estado();
  chk('5e · sin punto en el medio, el edificio termina donde empieza la otra frase', s.v === 'LLAMAR 1 HORA ANTES', s);
  await poner(''); await tocar('hora');
  const H = await ev(() => { var el = document.getElementById('f-obs'); return { v: el.value, foco: document.activeElement === el, cur: el.selectionStart, fin: el.selectionEnd, n: el.value.length }; });
  chk('5f · «Horario…» escribe «HORARIO: » y deja el cursor al final', H.v === 'HORARIO: ' && H.foco && H.cur === H.n && H.fin === H.n, H);
  await page.keyboard.type('DE 9 A 11');
  s = await estado();
  chk('5g · se completa a mano y queda prendido', s.v === 'HORARIO: DE 9 A 11' && s.on.join() === 'hora', s);
  await tocar('paga'); await tocar('hora'); s = await estado();
  chk('5h · sacar el horario saca «HORARIO: DE 9 A 11» y deja lo demás', s.v === 'PAGA AL RECIBIR', s);
  await poner(''); await ev(() => { document.getElementById('f-obs').blur(); });
  await page.click('#frq .frq-b[data-frq="l1"]');
  const F = await ev(() => document.activeElement && document.activeElement.getAttribute('data-frq'));
  chk('5i · una frase cerrada no pasa al campo (en el celular no abre el teclado)', F === 'l1', F);

  // ============ 6. la ficha de logística las marca como etiquetas ============
  const T = await ev(() => {
    var C = function (o) { return fichaObsChips({ id: 'h', observaciones: o, productos: [] }).map(function (c) { return c.i + ' ' + c.t; }); };
    var out = {};
    FRQ.forEach(function (o) { out[o.k] = C(o.f.trim()); });
    out.edifLleno = C('EDIFICIO TORRE INVENTADA, PISO 5');
    out.horaLlena = C('HORARIO: DE 9 A 11');
    out.horaTexto = C('HORARIO: cuando pueda el cliente');
    out.horaTarde = C('HORARIO: después de las 15');
    out.todo = C('LLAMAR 1 HORA ANTES. EDIFICIO TORRE INVENTADA, PISO 5. PAGA AL RECIBIR. PONER DOBLE BOLSA. HORARIO: DE 9 A 11');
    return out;
  });
  chk('6a · «LLAMAR 1 HORA ANTES» → «📞 Llamar 1 h antes»', T.l1.indexOf('📞 Llamar 1 h antes') >= 0, T.l1);
  chk('6b · «LLAMAR MEDIA HORA ANTES» → «📞 Llamar ½ h antes»', T.l30.indexOf('📞 Llamar ½ h antes') >= 0, T.l30);
  chk('6c · «PAGA AL RECIBIR» → «💵 Cobra al entregar» (la lectura del cobro de siempre)', T.paga.indexOf('💵 Cobra al entregar') >= 0, T.paga);
  chk('6d · «PONER DOBLE BOLSA» → «🛍️ Doble bolsa»', T.bolsa.indexOf('🛍️ Doble bolsa') >= 0, T.bolsa);
  chk('6e · «EDIFICIO …, PISO» sin completar → «🏢 Es un edificio»; completo → «🪜 Subir al piso 5»', T.edif.indexOf('🏢 Es un edificio') >= 0 && T.edifLleno.indexOf('🪜 Subir al piso 5') >= 0, { a: T.edif, b: T.edifLleno });
  chk('6f · «HORARIO:» sin nada no inventa etiqueta; con la hora, la etiqueta de la hora', T.hora.length === 0 && T.horaLlena.indexOf('🕐 Entre las 9 y las 11') >= 0 && T.horaTarde.indexOf('🕐 Después de las 15') >= 0, { a: T.hora, b: T.horaLlena, c: T.horaTarde });
  chk('6g · «HORARIO: cuando pueda el cliente» (no es una hora) sale tal cual', T.horaTexto.indexOf('🕐 Horario: cuando pueda el cliente') >= 0, T.horaTexto);
  chk('6h · todas juntas: cinco etiquetas, una por frase', T.todo.length === 5 && ['📞 Llamar 1 h antes', '🪜 Subir al piso 5', '💵 Cobra al entregar', '🛍️ Doble bolsa', '🕐 Entre las 9 y las 11'].every(x => T.todo.indexOf(x) >= 0), T.todo);

  // ============ 7. la revisión de las observaciones no avisa por las frases fijas ============
  const R7 = await ev(() => {
    var fr = FRQ.map(function (o) { return o.f.trim(); }), out = [];
    var base = function (o) { return Object.assign({ id: 'x', oc: '11-001', vendedor: 'Carola Chavez', fecha: '2026-11-09', turno: 'AM', saldo: 2990, pagado: false,
      productos: [{ desc: 'COLCHON ORO ANATOMICO', medida: '140x190', cant: 1, precio: 2990 }, { desc: 'ALMOHADA', medida: '50x70', cant: 1, precio: 0 }] }, o); };
    var casos = [base({ observaciones: fr.join('. ') }), base({ observaciones: fr.join('. '), turno: 'PM' }), base({ observaciones: fr.join('. '), pagado: true, saldo: 0 }),
      base({ observaciones: 'LLAMAR 1 HORA ANTES. EDIFICIO TORRE INVENTADA, PISO 5. PAGA AL RECIBIR. PONER DOBLE BOLSA. HORARIO: ' }),
      base({ observaciones: 'LLAMAR MEDIA HORA ANTES. PONER DOBLE BOLSA', oc: 'RPT 11-001' })];
    casos.forEach(function (p) { out.push(obsRevisar(p, { rel: true }).map(function (x) { return x.t; })); });
    return out;
  });
  chk('7a · `obsRevisar` no avisa nada por las frases fijas (mañana, tarde, pagado, a medio llenar, RPT)', R7.every(x => Array.isArray(x) && x.length === 0), R7);

  // ============ 8. el pedido guardado lleva el texto y la ficha de logística muestra las etiquetas ============
  const G = await ev(async () => {
    closeModal(); showView('form'); resetForm();
    document.getElementById('f-fecha').value = '2026-11-09'; segSet('f-turno', 'AM');
    document.getElementById('f-vendedor').value = 'Carola Chavez'; applyVendedorLite();
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO FRQ';
    document.getElementById('f-celular').value = '71000218';
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 218';
    var n = document.getElementById('f-nota'); if (n) n.value = '5218';
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('COLCHON ORO ANATOMICO', '140x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '2990';
    refreshDelButtons();
    segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '2990';
    try { updateMetodoVisibility(); } catch (e) {}
    var lit0 = document.querySelectorAll('#frq .frq-b[aria-pressed="true"]').length;   // resetForm apaga los botones
    document.getElementById('f-obs').value = 'CASA AZUL';
    ['l1', 'paga', 'bolsa'].forEach(function (k) { document.querySelector('#frq .frq-b[data-frq="' + k + '"]').click(); });
    var v = document.getElementById('f-obs').value;
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, 600));
    var ult = window._pl[window._pl.length - 1] || null;
    var out = { lit0: lit0, v: v, guardo: window._saves - n0, obs: ult && ult.observaciones, id: ult && ult.id };
    if (ult) {
      UNLOCKED = true; try { localStorage.removeItem('me_ficha_tilde'); } catch (e) {}
      if (!findById(ult.id)) STATE.push(ult);
      MODAL_KIND = 'admin'; showPedidoModal(ult.id);
      out.chips = [].map.call(document.querySelectorAll('#modal-box .fl-chip'), function (c) { return c.textContent.replace(/\s+/g, ' ').trim(); });
      out.qh = ((document.querySelector('#modal-box .fl-qh') || {}).textContent || '').replace(/\s+/g, ' ');
      closeModal(); UNLOCKED = false;
    }
    return out;
  });
  chk('8a · al empezar un pedido nuevo los botones están apagados', G.lit0 === 0, G);
  chk('8b · el pedido guardado lleva el texto tal cual quedó en el campo', G.guardo === 1 && G.obs === 'CASA AZUL. LLAMAR 1 HORA ANTES. PAGA AL RECIBIR. PONER DOBLE BOLSA' && G.obs === G.v, G);
  chk('8c · la ficha de logística lo muestra en etiquetas (llamar, cobra al entregar, doble bolsa)', !!G.chips && ['📞 Llamar 1 h antes', '💵 Cobra al entregar', '🛍️ Doble bolsa'].every(x => G.chips.indexOf(x) >= 0), G.chips);
  chk('8d · y «Qué hacer» dice «llamar 1 h antes al cliente»', /llamar 1 h antes al cliente/.test(G.qh || ''), G.qh);

  // ============ 9. al editar, se prenden con lo guardado ============
  const ED = await ev((id) => {
    editPedido(id);
    return { v: document.getElementById('f-obs').value, on: [].map.call(document.querySelectorAll('#frq .frq-b[aria-pressed="true"]'), function (b) { return b.getAttribute('data-frq'); }) };
  }, G.id);
  chk('9 · al abrir un pedido para editarlo, los botones dicen lo que ya tiene', ED.on && ED.on.join() === 'l1,paga,bolsa', ED);

  // ============ 10. OC, RPT y ATC sí; venta de tienda no ============
  const TIPOS = await ev(() => {
    var vis = function () { var b = document.getElementById('frq'); return !!b && b.offsetParent !== null && getComputedStyle(b).display !== 'none'; };
    var out = {};
    closeModal(); showView('form'); resetForm(); out.oc = vis();
    segSet('f-doc-tipo', 'RPT'); setDocTipo(); out.rpt = vis();
    segSet('f-doc-tipo', 'ATC'); setDocTipo(); out.atc = vis();
    segSet('f-doc-tipo', 'OC'); setDocTipo();
    abrirVentaTienda(); out.tienda = vis();
    cancelarVentaTienda(); showView('form'); out.despues = vis();
    return out;
  });
  chk('10a · a la vista en un pedido (OC), una reposición (RPT) y una ATC', TIPOS.oc === true && TIPOS.rpt === true && TIPOS.atc === true, TIPOS);
  chk('10b · en la venta de tienda no están (no hay entrega)', TIPOS.tienda === false, TIPOS);
  chk('10c · y vuelven al salir de la venta de tienda', TIPOS.despues === true, TIPOS);

  // ============ 11. con el teclado ============
  await ev(() => { closeModal(); showView('form'); resetForm(); document.getElementById('f-obs').value = ''; frqPintar(); document.querySelector('#frq .frq-b[data-frq="bolsa"]').focus(); });
  await page.keyboard.press('Enter'); s = await estado();
  chk('11a · Enter sobre el botón escribe la frase', s.v === 'PONER DOBLE BOLSA' && s.on.join() === 'bolsa', s);
  await page.keyboard.press('Space'); s = await estado();
  chk('11b · Espacio sobre el botón prendido la saca', s.v === '' && s.on.length === 0, s);
  await page.keyboard.press('Tab');
  const tab = await ev(() => document.activeElement && document.activeElement.getAttribute('data-frq'));
  chk('11c · Tab pasa al botón siguiente', tab === 'hora', tab);

  // ============ 12. en el celular (390 px) bajan de renglón y no se salen ============
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.runFor(300);
  const CEL = await ev(() => {
    closeModal(); showView('form');
    var box = document.getElementById('frq'); box.scrollIntoView({ block: 'center' });
    var r = box.getBoundingClientRect(), bs = [].slice.call(box.querySelectorAll('.frq-b')).map(function (b) { return b.getBoundingClientRect(); });
    var filas = {}; bs.forEach(function (b) { filas[Math.round(b.top)] = 1; });
    return { filas: Object.keys(filas).length, dentro: bs.every(function (b) { return b.left >= r.left - 1 && b.right <= r.right + 1 && b.right <= window.innerWidth; }),
      sinScroll: document.documentElement.scrollWidth <= window.innerWidth + 1, alto: Math.min.apply(null, bs.map(function (b) { return b.height; })) };
  });
  chk('12a · en 390 px los botones van en varios renglones, dentro de la caja y sin correr la página de costado', CEL.filas >= 2 && CEL.dentro && CEL.sinScroll, CEL);
  chk('12b · se tocan con el dedo (alto ≥ 34 px)', CEL.alto >= 34, CEL);
  await page.setViewportSize({ width: 1366, height: 900 });

  chk('13 · sin errores en la página', errors.length === 0, errors);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
