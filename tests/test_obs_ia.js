/* 🤖📌 MEJORAS 345 Y 349 · CLAUDE LEE TUS OBSERVACIONES ANTES DE GUARDAR + «LO QUE PROMETISTE» — LA PÁGINA.
   El servidor (`obsIa`, .gs 2026-11-16-a) lo prueba tests/test_obs_ia_servidor.js; acá, con `apiPost`/`apiSave` de mentira:
   1. Apagado: en Playwright sin `OBS_IA_PRUEBA`, con el servidor de antes, en una ATC o una venta de tienda, sin observaciones, o editando
      sin tocar la nota → no le pregunta nada a Claude y guarda como siempre.
   2. Al guardar, UNA consulta con el pedido entero (renglones, de dónde sale cada uno, plata, las tiendas y lo que ya dijo la regla).
   3. Con avisos: la ventana «⚠️ Antes de guardar, revisá» con cada aviso y su arreglo de un toque; los arreglos tocan el FORMULARIO
      («🏬 Marcar Tienda X» → la marca en el renglón; «🚚 Anotar recargo» → el campo del recargo; «💵 Dejar el saldo en 0»; «➕ Agregar…»
      → un renglón); «💾 Guardar con los arreglos» guarda UNA vez sin volver a preguntar y el pedido queda marcado; «Corregir» no guarda;
      «Guardar igual» guarda tal cual. No repite lo que ya dijo la regla.
   4. Los compromisos van adentro de los productos (`cmp`), salen en «📋 Para hacer» («📌 Lo que prometiste») con «✓ Hecho» / «Ya no va»,
      y en la ficha de logística (`fichaAvisos`) mientras estén abiertos. `heredarMarcas` los pasa al editar.
   5. Si Claude tarda más de lo que se espera: guarda como hoy y, cuando contesta, lo deja ADENTRO del pedido guardado (`oia` + `cmp`, un
      guardado aparte), con «🤖 Claude vio algo…» en «Para hacer» («Ya está bien» lo cierra).
   6. Errores (Claude apagado, el tope): guarda como siempre y deja de preguntar un rato.
   Datos INVENTADOS. Reloj clavado (lunes 16/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_obs_ia.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  await ev(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; SERVER_VER = '2026-11-16-a';
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    STATE = []; saveMirror();
    window.__S = { obs: [], saves: [], pl: [], resp: null, espera: false, soltar: null };
    apiSave = function (rec) {
      var g = JSON.parse(JSON.stringify(rec)); __S.saves.push(g);
      __S.pl = __S.pl.filter(function (x) { return x.id !== g.id; }).concat([g]);
      return Promise.resolve({ ok: true, pedido: g });
    };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(__S.pl)) }); };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b));
      if (b.action !== 'obsIa') return Promise.resolve({ ok: true });
      __S.obs.push(b);
      var r = JSON.parse(JSON.stringify(__S.resp || { ok: true, avisos: [], compromisos: [] }));
      if (__S.espera) return new Promise(function (ok) { __S.soltar = function () { ok(r); }; });
      return Promise.resolve(r);
    };
  });
  let N = 0;
  const llenar = (o) => ev((o) => {
    closeModal(); showView('form'); resetForm();
    if (o.tipo) { segSet('f-doc-tipo', o.tipo); setDocTipo(); }
    document.getElementById('f-fecha').value = o.fecha || '2026-11-18'; segSet('f-turno', o.turno || 'PM');
    document.getElementById('f-vendedor').value = 'Carola Chavez'; applyVendedorLite();
    if (o.tipo === 'RPT') { var s = document.getElementById('f-rpt-suc'); s.value = 'Mia Plaza'; try { sucursalElegida(); } catch (e) {} }
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO ' + o.n;
    document.getElementById('f-celular').value = '7' + String(1000000 + o.n);
    document.getElementById('f-zona').value = 'Norte'; document.getElementById('f-direccion').value = 'CALLE FALSA ' + o.n;
    var nn = document.getElementById('f-nota'); if (nn) nn.value = String(7000 + o.n);
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    (o.prods || [['COLCHON SMART', 1, '140x190', 3830], ['ALMOHADA', 1, '50x70', 150]]).forEach(function (x) { addProdRow(x[0], x[2] || '', '', x[1] || 1, ''); box.lastElementChild.querySelector('.prod-precio').value = String(x[3] || 100); });
    refreshDelButtons();
    if (o.tipo !== 'RPT') { segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = String(o.saldo != null ? o.saldo : 3980); }
    try { updateMetodoVisibility(); } catch (e) {}
    document.getElementById('f-obs').value = o.obs || '';
  }, Object.assign({ n: ++N }, o));
  const guardar = (ms) => ev(async (ms) => {
    var n0 = __S.saves.length, q0 = __S.obs.length; submitPedido();
    await new Promise(r => setTimeout(r, ms || 600));
    var box = document.getElementById('modal-box'), on = document.getElementById('modal').classList.contains('on') && !!box.querySelector('#obsrev-igual');
    return { guardo: __S.saves.length - n0, pidio: __S.obs.length - q0, modal: on, titulo: on ? box.querySelector('.modal-h h3').textContent : '',
      regla: on ? [].map.call(box.querySelectorAll('#obsrev-lista li'), function (li) { return li.textContent; }) : [],
      ia: on ? [].map.call(box.querySelectorAll('#oia-lista .oia-it'), function (d) { return d.textContent; }) : [],
      botones: on ? [].map.call(box.querySelectorAll('#oia-lista .oia-arr'), function (b) { return b.textContent; }) : [],
      cmp: on ? [].map.call(box.querySelectorAll('.oia-cmp li'), function (li) { return li.textContent; }) : [],
      ult: __S.saves[__S.saves.length - 1] || null };
  }, ms);
  const RESP = { ok: true, avisos: [
      { cita: 'recoger el colchón de tienda Mutualista', texto: 'El colchón no tiene la marca de recoger de la tienda: el stock lo va a descontar de PTF.', arreglo: { tipo: 'tienda', renglon: 0, tienda: 'Mutualista' } },
      { cita: 'cobrar transporte Bs 180', texto: 'No tiene recargo por entrega: el chofer no va a saber que cobra.', arreglo: { tipo: 'recargo', monto: 180 } } ],
    compromisos: [{ texto: 'Confirmar si compra el somier', dia: '', cita: 'somier por confirmar' }] };
  const OBS1 = 'Recoger el colchón de tienda Mutualista. Cobrar transporte Bs 180. Somier por confirmar.';

  console.log('\n── 1. Apagado ──');
  await llenar({ obs: OBS1 });
  await ev((R) => { __S.resp = R; }, RESP);
  let r = await guardar();
  chk('a. en Playwright sin OBS_IA_PRUEBA: no le pregunta a Claude y guarda como siempre', r.pidio === 0 && r.guardo === 1 && !r.modal, r);
  await ev(() => { window.OBS_IA_PRUEBA = 1; SERVER_VER = '2026-11-15-a'; });
  await llenar({ obs: OBS1 });
  r = await guardar();
  chk('b. con el servidor de antes (2026-11-15-a): nada', r.pidio === 0 && r.guardo === 1, r);
  await ev(() => { SERVER_VER = '2026-11-16-a'; });
  await llenar({ obs: '' });
  r = await guardar();
  chk('c. sin observaciones: nada', r.pidio === 0 && r.guardo === 1, r);
  await llenar({ obs: OBS1, tipo: 'ATC' });
  const atc = await ev(() => obsIaVa({ oc: 'ATC 11-001', observaciones: 'x', productos: [] }, null, 'ATC') === false && obsIaVa({ oc: '11-001', observaciones: 'x', productos: [], direccion: DIR_TIENDA, entregado: true, fecha: '' }, null, 'OC') === false);
  chk('d. ni en una 🎧 ATC ni en una venta de tienda', atc === true, atc);

  console.log('\n── 2. La consulta y la ventana ──');
  await llenar({ obs: OBS1 });
  r = await guardar();
  const q = await ev(() => __S.obs[__S.obs.length - 1]);
  chk('a. UNA consulta y NO guarda: abre «⚠️ Antes de guardar, revisá»', r.pidio === 1 && r.guardo === 0 && r.modal && r.titulo === '⚠️ Antes de guardar, revisá', r);
  chk('b. la consulta lleva la nota, los renglones con precio, la plata, el turno y las tiendas (sin Tiendas Roho)',
    q.obs === OBS1 && q.tipo === 'OC' && q.fecha === '2026-11-18' && q.turno === 'PM' && q.prods.length === 2 && q.prods[0].d === 'COLCHON SMART 140x190' && q.prods[0].p === 3830 &&
    q.plata.saldo === 3980 && q.plata.recargo === 0 && q.tiendas.indexOf('Mutualista') >= 0 && q.tiendas.indexOf('Tiendas Roho') < 0 && Array.isArray(q.ya), q);
  chk('c. los dos avisos de Claude con lo que escribió y su arreglo', r.ia.length === 2 && /Escribiste: «recoger el colchón de tienda Mutualista»/.test(r.ia[0]) &&
    r.botones[0] === '🏬 Marcar «Tienda Mutualista»' && r.botones[1] === '🚚 Anotar recargo Bs 180', r);
  chk('d. y lo que queda para después', r.cmp.length === 1 && /Confirmar si compra el somier/.test(r.cmp[0]), r.cmp);
  const corr = await ev(async () => { var n0 = __S.saves.length; document.getElementById('obsrev-corregir').click(); await new Promise(r => setTimeout(r, 200));
    return { guardo: __S.saves.length - n0, abierta: document.getElementById('modal').classList.contains('on') }; });
  chk('e. «✏️ Corregir» cierra y NO guarda', corr.guardo === 0 && !corr.abierta, corr);

  console.log('\n── 3. Los arreglos de un toque y «Guardar con los arreglos» ──');
  r = await guardar();
  chk('a. volver a guardar con lo mismo: la ventana sale de nuevo SIN volver a preguntarle a Claude (ya lo leyó)', r.modal && r.pidio === 0 && r.ia.length === 2, r);
  const arr = await ev(async () => {
    var bs = document.querySelectorAll('#oia-lista .oia-arr'); bs[0].click(); bs[1].click();
    await new Promise(r => setTimeout(r, 100));
    var card = document.querySelectorAll('#f-productos .prod-card')[0];
    return { b0: bs[0].textContent, dis: bs[0].disabled, marca: (card.querySelector('.oia-marca') || {}).textContent || '', envio: document.getElementById('f-envio').value,
             guardar: document.getElementById('obsrev-igual').textContent };
  });
  chk('b. «🏬 Marcar…» queda ✓ y el renglón dice de qué tienda se recoge', arr.b0 === '✓ Listo' && arr.dis && /Se recoge de Tienda Mutualista/.test(arr.marca), arr);
  chk('c. «🚚 Anotar recargo» pone 180 en el recargo por entrega', arr.envio === '180', arr);
  chk('d. el botón pasa a «💾 Guardar con los arreglos»', arr.guardar === '💾 Guardar con los arreglos', arr);
  const g = await ev(async () => { var n0 = __S.saves.length, q0 = __S.obs.length; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1];
    return { guardo: __S.saves.length - n0, pidio: __S.obs.length - q0, modalObs: !!document.querySelector('#modal-box #obsrev-igual'), u: u,
             envio: u ? envioTotal(u) : -1, porCobrar: u ? envioPorCobrar(u) : -1 }; });
  chk('e. guarda UNA vez, sin volver a preguntar (ni a Claude ni la ventana)', g.guardo === 1 && g.pidio === 0 && !g.modalObs, { guardo: g.guardo, pidio: g.pidio, modal: g.modalObs });
  const u = g.u || { productos: [] };
  chk('f. el colchón quedó «📥 recoger de Tienda Mutualista» (la marca de siempre); la almohada, sin marca',
    u.productos[0].chk === 'im' && u.productos[0].chkDe === 'Tienda Mutualista' && !u.productos[1].chk, u.productos.map(function (x) { return [x.chk, x.chkDe]; }));
  chk('g. el recargo de Bs 180 quedó por cobrar al entregar', g.envio === 180 && g.porCobrar === 180, { e: g.envio, p: g.porCobrar });
  chk('h. el compromiso quedó en TODOS los renglones, abierto', u.productos.every(function (x) { return Array.isArray(x.cmp) && x.cmp.length === 1 && x.cmp[0].t === 'Confirmar si compra el somier' && !x.cmp[0].e && x.cmp[0].c === 'somier por confirmar'; }),
    u.productos.map(function (x) { return x.cmp; }));

  console.log('\n── 4. «Lo que prometiste»: Para hacer, ✓ Hecho, la ficha de logística ──');
  let H = await ev(() => { var v = 'Carola Chavez', mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, v); });
    var I = misHacerDatos(v, mine); return I.filter(function (x) { return /prometiste|Claude/.test(x.t); }).map(function (x) { return { t: x.t, n: x.n, s: x.s, sev: x.sev, b: x.b }; }); });
  chk('a. «📋 Para hacer» trae «📌 Lo que prometiste» con 1 y el texto', H.length === 1 && H[0].t === 'Lo que prometiste' && H[0].n === 1 && /somier/.test(H[0].s), H);
  const fa = await ev((id) => fichaAvisos(findById(id), null, []), u.id);
  chk('b. la ficha de logística lo dice en amarillo mientras está abierto', Array.isArray(fa) && fa.some(function (t) { return /📌 Pendiente de Carola: Confirmar si compra el somier\./.test(t); }), fa);
  const lista = await ev(async () => { cmpVerLista('Carola Chavez'); await new Promise(r => setTimeout(r, 50));
    var b = document.querySelector('#modal-box .cmp-hecho'), t = (document.querySelector('#modal-box .cmp-r') || {}).textContent || ''; return { t: t, hay: !!b }; });
  chk('c. «Ver» abre la lista con el día, el pedido y «✓ Hecho» / «Ya no va»', lista.hay && /antes de entregar/.test(lista.t) && /Confirmar si compra el somier/.test(lista.t) && /Ya no va/.test(lista.t), lista);
  const hecho = await ev(async () => { var n0 = __S.saves.length; document.querySelector('#modal-box .cmp-hecho').click(); await new Promise(r => setTimeout(r, 300));
    var p = __S.saves[__S.saves.length - 1]; return { guardo: __S.saves.length - n0, cmp: p && p.productos[0].cmp }; });
  chk('d. «✓ Hecho» lo cierra con quién y cuándo, y se guarda', hecho.guardo === 1 && hecho.cmp && hecho.cmp[0].e === 'h' && hecho.cmp[0].f > 0, hecho);
  H = await ev(() => { var v = 'Carola Chavez', mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, v); }); return misHacerDatos(v, mine).filter(function (x) { return /prometiste/.test(x.t); }).length; });
  const fa2 = await ev((id) => fichaAvisos(findById(id), null, []).filter(function (t) { return /📌/.test(t); }).length, u.id);
  chk('e. cerrado: ya no está en «Para hacer» ni en la ficha de logística', H === 0 && fa2 === 0, { H, fa2 });
  const her = await ev((id) => { var p = findById(id); var nuevos = heredarMarcas([{ desc: 'COLCHON SMART', medida: '140x190', codigo: '', cant: 1 }, { desc: 'OTRO', medida: '', codigo: '', cant: 3 }], p.productos);
    return nuevos.map(function (x) { return x.cmp && x.cmp[0] && x.cmp[0].e; }); }, u.id);
  chk('f. `heredarMarcas` pasa lo prometido a todos los renglones (también a uno nuevo)', JSON.stringify(her) === '["h","h"]', her);

  console.log('\n── 5. Sin arreglos: «Guardar igual», la regla no se repite, solo compromisos ──');
  await ev(() => { window.OBS_REV_PRUEBA = 1; __S.resp = { ok: true, avisos: [
    { cita: '2 almohadas', texto: 'Dice 2 almohadas y cargaste 1.', arreglo: { tipo: 'ninguno' } },
    { cita: 'NO COBRAR – autorizada por gerencia', texto: 'Quedó con saldo: en Contabilidad va a figurar como deuda.', arreglo: { tipo: 'saldo0' } } ], compromisos: [] }; });
  await llenar({ obs: 'Son 2 almohadas. NO COBRAR – autorizada por gerencia.' });
  r = await guardar();
  chk('a. lo de la regla («2 almohadas») va en su lista y Claude NO lo repite; su aviso de la plata, sí', r.modal && r.regla.length === 1 && /2 almohadas/.test(r.regla[0]) && r.ia.length === 1 && /deuda/.test(r.ia[0]) && r.botones[0] === '💵 Dejar el saldo en 0', r);
  const s0 = await ev(async () => { document.querySelector('#oia-lista .oia-arr').click(); await new Promise(r => setTimeout(r, 50));
    var n0 = __S.saves.length; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { guardo: __S.saves.length - n0, saldo: u && u.saldo, pagado: u && u.pagado }; });
  chk('b. «💵 Dejar el saldo en 0» y guardar: la venta queda sin saldo', s0.guardo === 1 && s0.saldo === 0, s0);
  await ev(() => { window.OBS_REV_PRUEBA = 0; });
  await ev(() => { __S.resp = { ok: true, avisos: [{ cita: 'x', texto: 'Algo sin arreglo.', arreglo: { tipo: 'ninguno' } }], compromisos: [{ texto: 'Pasar por su última pieza', dia: '2026-11-23', cita: 'pasar el lunes' }] }; });
  await llenar({ obs: 'Pasar el lunes por su última pieza. x' });
  r = await guardar();
  const igual = await ev(async () => { var n0 = __S.saves.length; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { guardo: __S.saves.length - n0, cmp: u && u.productos[0].cmp, oia: u && u.productos[0].oia }; });
  chk('c. un aviso sin arreglo no tiene botón; «Guardar igual» guarda tal cual, con el compromiso y su día',
    r.botones.length === 0 && igual.guardo === 1 && igual.cmp && igual.cmp[0].d === '2026-11-23' && !igual.oia, { r: r.botones, igual });
  await ev(() => { __S.resp = { ok: true, avisos: [], compromisos: [{ texto: 'Recoger el colchón viejo y dejarlo en Central', dia: '', cita: 'recoger el colchón' }] }; });
  await llenar({ obs: 'Recoger el colchón de la clienta y dejarlo en Central para exhibición.' });
  r = await guardar();
  chk('d. sin avisos: guarda derecho, sin ventana, con lo prometido adentro', r.guardo === 1 && !r.modal && r.ult && r.ult.productos[0].cmp && /Central/.test(r.ult.productos[0].cmp[0].t), r);

  console.log('\n── 6. RPT: «➕ Agregar…» ──');
  await ev(() => { __S.resp = { ok: true, avisos: [{ cita: 'mandar 2 bolsas', texto: 'Las bolsas no están en los productos: logística no las carga.', arreglo: { tipo: 'producto', producto: 'BOLSA PARA COLCHON', cant: 2 } }], compromisos: [] }; });
  await llenar({ obs: 'Mandar 2 bolsas para colchón.', tipo: 'RPT', prods: [['COLCHON SMART', 1, '140x190', 0]] });
  r = await guardar();
  const q2 = await ev(() => __S.obs[__S.obs.length - 1]);
  chk('a. en una RPT también lee (tipo RPT)', r.modal && q2.tipo === 'RPT' && r.botones[0] === '➕ Agregar 2 BOLSA PARA COLCHON', { r, tipo: q2.tipo });
  const rpt = await ev(async () => { document.querySelector('#oia-lista .oia-arr').click(); await new Promise(r => setTimeout(r, 80));
    var n0 = __S.saves.length; document.getElementById('obsrev-igual').click(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { guardo: __S.saves.length - n0, prods: u && u.productos.map(function (x) { return x.desc + '×' + x.cant; }), oc: u && u.oc }; });
  chk('b. agrega el renglón y lo guarda en la RPT', rpt.guardo === 1 && rpt.prods && rpt.prods.indexOf('BOLSA PARA COLCHON×2') >= 0 && /^RPT/.test(rpt.oc || ''), rpt);

  console.log('\n── 7. Claude tarda: se guarda como hoy y lo suyo queda en el pedido ──');
  await ev(() => { OBS_IA_ESPERA_MS = 300; OBS_IA_TARDE_CADA_MS = 100; __S.espera = true;
    __S.resp = { ok: true, avisos: [{ cita: 'cobrar transporte Bs 200', texto: 'No tiene recargo por entrega.', arreglo: { tipo: 'recargo', monto: 200 } }], compromisos: [{ texto: 'Confirmar el GPS', dia: '', cita: 'GPS pendiente' }] }; });
  await llenar({ obs: 'Cobrar transporte Bs 200. GPS pendiente.' });
  r = await guardar(1200);
  chk('a. pasados los 300 ms guarda como siempre, sin ventana', r.pidio === 1 && r.guardo === 1 && !r.modal, r);
  const id7 = r.ult && r.ult.id;
  const tarde = await ev(async (id) => { var n0 = __S.saves.length; __S.espera = false; __S.soltar(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { guardo: __S.saves.length - n0, id: u && u.id, oia: u && u.productos[0].oia, cmp: u && u.productos[0].cmp, toast: (document.getElementById('toast') || {}).textContent || '' }; }, id7);
  chk('b. cuando contesta, un guardado aparte del MISMO pedido con lo que dijo (`oia`) y lo prometido', tarde.guardo === 1 && tarde.id === id7 && tarde.oia && tarde.oia.a.length === 1 && /recargo/.test(tarde.oia.a[0].t) && !tarde.oia.v && tarde.cmp && tarde.cmp[0].t === 'Confirmar el GPS', tarde);
  chk('c. y lo dice («Para hacer»)', /Para hacer/.test(tarde.toast), tarde.toast);
  H = await ev(() => { var v = 'Carola Chavez', mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, v); }); return misHacerDatos(v, mine).filter(function (x) { return /Claude/.test(x.t); }).map(function (x) { return x.n; }); });
  chk('d. «🤖 Claude vio algo en tus observaciones» en «Para hacer»', H.length === 1 && H[0] === 1, H);
  const fichaMis = await ev(async (id) => { showMisModal(id); await new Promise(r => setTimeout(r, 50)); var t = (document.getElementById('modal-box') || {}).textContent || ''; return { t: /No tiene recargo por entrega/.test(t), cmp: /Confirmar el GPS/.test(t), b: /Ya está bien/.test(t) }; }, id7);
  chk('e. la ficha de Mis pedidos muestra el aviso (con «Ya está bien») y lo prometido', fichaMis.t && fichaMis.cmp && fichaMis.b, fichaMis);
  const visto = await ev(async (id) => { var n0 = __S.saves.length; oiaVisto(id, 'mis'); await new Promise(r => setTimeout(r, 300));
    var u = __S.saves[__S.saves.length - 1], v = 'Carola Chavez', mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, v); });
    return { guardo: __S.saves.length - n0, v: u && u.productos[0].oia && u.productos[0].oia.v, quedan: misHacerDatos(v, mine).filter(function (x) { return /Claude/.test(x.t); }).length }; }, id7);
  chk('f. «Ya está bien» lo cierra (se guarda) y sale de «Para hacer»', visto.guardo === 1 && visto.v === 1 && visto.quedan === 0, visto);

  console.log('\n── 8. Editar: solo si la nota cambió ──');
  await ev(() => { OBS_IA_ESPERA_MS = 4000; __S.resp = { ok: true, avisos: [], compromisos: [] }; });
  const ed = await ev(async (id) => { closeModal(); var q0 = __S.obs.length, n0 = __S.saves.length; editPedido(id); await new Promise(r => setTimeout(r, 200));
    document.getElementById('f-direccion').value = 'OTRA CALLE INVENTADA'; submitPedido(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { pidio: __S.obs.length - q0, guardo: __S.saves.length - n0, cmp: u && u.productos[0].cmp, oia: u && u.productos[0].oia }; }, id7);
  chk('a. editando sin tocar la nota no le pregunta; lo prometido y lo visto se conservan', ed.pidio === 0 && ed.guardo === 1 && ed.cmp && ed.cmp[0].t === 'Confirmar el GPS' && ed.oia && ed.oia.v === 1, ed);
  const ed2 = await ev(async (id) => { closeModal(); var q0 = __S.obs.length; editPedido(id); await new Promise(r => setTimeout(r, 200));
    document.getElementById('f-obs').value = 'Cobrar transporte Bs 200 (ya anotado). GPS pendiente. Llamar antes.'; submitPedido(); await new Promise(r => setTimeout(r, 900));
    var u = __S.saves[__S.saves.length - 1]; return { pidio: __S.obs.length - q0, oia: u && u.productos[0].oia, cmp: u && u.productos[0].cmp }; }, id7);
  chk('b. con la nota cambiada pregunta de nuevo y lo que Claude había dicho tarde (de la nota vieja) se va; lo prometido queda', ed2.pidio === 1 && !ed2.oia && ed2.cmp && ed2.cmp.length === 1, ed2);

  console.log('\n── 9. Errores: guarda como siempre ──');
  await ev(() => { __S.resp = { ok: false, error: 'ia_apagada' }; });
  await llenar({ obs: 'Cobrar transporte Bs 90.' });
  r = await guardar();
  chk('a. Claude apagado: guarda sin ventana', r.pidio === 1 && r.guardo === 1 && !r.modal, r);
  await llenar({ obs: 'Cobrar transporte Bs 95.' });
  r = await guardar();
  chk('b. y por un rato no vuelve a preguntar', r.pidio === 0 && r.guardo === 1, r);
  await ev(() => { OBS_IA.parado = 0; apiPost = function (b) { if (b.action === 'obsIa') { __S.obs.push(b); return Promise.reject(new Error('Failed to fetch')); } return Promise.resolve({ ok: true }); }; });
  await llenar({ obs: 'Cobrar transporte Bs 97.' });
  r = await guardar();
  chk('c. sin conexión con el servidor: guarda igual', r.pidio === 1 && r.guardo === 1 && !r.modal, r);

  chk('z. sin errores de la página', errores.length === 0, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
