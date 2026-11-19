/* 🧠 MEJORA 360 · EL PRODUCTO ESCRITO A MANO, RECONOCIDO POR CLAUDE — LA PÁGINA.
   El servidor (`iaProductos`, .gs 2026-11-16-a) lo prueba tests/test_ia_gestion_servidor.js; acá, con `apiPost`/`apiList` de mentira:
   1. Los renglones: lo que el stock NO reconoce de los pedidos pendientes o recientes («ice» 105x190 en dos pedidos = UN renglón, «somieres»,
      la medida al revés, «OC 260200619»); no lo que tiene código de la lista, lo de tienda, una medida especial de un producto de la lista
      ni un pedido viejo ya entregado.
   2. Los candidatos (hasta 8): por palabras (abreviaturas y plurales), la familia y la medida (también al revés), de la lista y de los Excel.
   3. Una vez por día, solo: el primer aparato con la contraseña que abre Stock manda UN lote (`iaProductos`, sin `uno`) y guarda en
      `__prod_ia__`; la segunda vez ese día no. Sin la bandera, con el servidor de antes o un vendedor, nada.
   4. El Plan: «seguro» trae «✓ Es ese»; «dudoso» NO (las opciones como botones); «no es un producto», «📂 Abrir el pedido».
   5. «✓ Es ese» pregunta y pone el código, el nombre y la medida de la lista en los DOS pedidos por el guardado de siempre, con las marcas de
      logística intactas; después el renglón ya no está. «Para hacer» de Administración lo cuenta.
   6. El formulario: un producto escrito a mano que el panel no reconoce → Claude propone (UN renglón, `uno`) y NADA cambia hasta «Usar ese»;
      lo ya leído no se vuelve a preguntar; escribir un código saca la propuesta.
   Datos INVENTADOS. Reloj clavado (lunes 16/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_iap_productos.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  const dialogos = []; page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const espera = (ms) => page.waitForTimeout(ms || 300);

  await ev(() => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; CARGA_GEN++; CARGA_ESTADO = 'ok';
    try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    loadFromServer = function () {};
    try { localStorage.removeItem(LS_PEND); localStorage.removeItem(QUIEN_LS_ROL); localStorage.removeItem(LS_ADM_DEV); } catch (e) {}
    ULTIMO_REFRESCO = Date.now();
    var hoy = todayStr(), f = '2026-11-18', n = 0;
    var P = function (id, vend, prods, extra) { n++; var p = { id: id, oc: '11-' + (100 + n), cliente: 'CLIENTE INVENTADO ' + id.toUpperCase(), celular: '7001100' + n, fecha: f, turno: 'AM', vendedor: vend, zona: 'Norte',
      productos: prods.map(function (x) { var o = { desc: x[0], medida: x[1], codigo: x[2] || '', cant: x[3] }; if (x[4]) Object.assign(o, x[4]); return o; }), entregado: false, ts: Date.parse('2026-11-14T09:00:00-04:00') + n * 1000, rev: 2, fotos: [] };
      return Object.assign(p, extra || {}); };
    window.__BASE = [
      P('i1', 'FABRICA', [['ice', '105x190', '', 1, { chk: 'ok', chkDe: 'Banzer', prodF: '2026-11-10' }], ['TITANIO ICE', '140x190', 'CH1220', 1]]),
      P('i2', 'Mirian Salazar', [['ice', '105x190', '', 2]]),
      P('s1', 'FABRICA', [['somieres', '140x190', '', 2]]),
      P('m1', 'Isabel Robledo', [['COLCHON SEMIORTOP.', '180x105', '', 1]]),
      P('o1', 'Eduardo Añez', [['OC 260200619', '', '', 1]]),
      P('t1', 'Carola Chavez', [['PROTECTOR IMPERMEABLE', '140x190', '', 1]]),                      // de tienda: no cuenta
      P('e1', 'Carola Chavez', [['TITANIO LATEX', '160x200', '', 1]]),                              // medida especial de un producto de la lista
      P('v1', 'Carola Chavez', [['ice', '160x190', '', 1]], { fecha: '2026-10-02', entregado: true, ts: Date.parse('2026-09-30T09:00:00-04:00') })   // viejo y entregado
    ];
    STATE = JSON.parse(JSON.stringify(__BASE)); saveMirror();
    window.__S = { posts: [], guardados: [], fila: null, modo: 'ok', uno: null };
    apiList = function () { var L = STATE.filter(function (p) { return p.id !== '__prod_ia__'; }).map(function (p) { return JSON.parse(JSON.stringify(p)); }); if (__S.fila) L.push(JSON.parse(JSON.stringify(__S.fila))); return Promise.resolve({ ok: true, pedidos: L }); };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b)); __S.posts.push(b);
      if (b.action === 'save') { __S.guardados.push(b.pedido); if (b.pedido.id === '__prod_ia__') __S.fila = b.pedido; return Promise.resolve({ ok: true, version: '2026-11-16-a', pedido: Object.assign({}, b.pedido, { rev: (Number(b.pedido.rev) || 0) + 1 }), mode: 'update', ahora: Date.now() }); }
      if (b.action !== 'iaProductos') return Promise.resolve({ ok: true });
      if (__S.modo !== 'ok') return Promise.resolve({ ok: false, error: __S.modo, tope: 6 });
      if (b.uno) { var r0 = b.renglones[0]; return Promise.resolve({ ok: true, res: { renglones: [{ r: r0.r, codigo: __S.uno || '', seguridad: __S.uno ? 'seguro' : 'no_se', opciones: [], motivo: 'LATEX es el TITANIO LATEX' }] }, usadas: 1, tope: 60, t: Date.now() }); }
      var R = b.renglones.map(function (x) {
        if (/^ICE\|/.test(x.r)) return { r: x.r, codigo: 'CH1224', seguridad: 'seguro', opciones: [], motivo: 'ICE es el TITANIO ICE' };
        if (/^SOMIERES\|/.test(x.r)) return { r: x.r, codigo: '', seguridad: 'dudoso', opciones: ['CH1144', 'CH1212'], motivo: 'no dice cuál' };
        if (/^OC /.test(x.r)) return { r: x.r, codigo: '', seguridad: 'no_es_producto', opciones: [], motivo: 'es el N° de la orden' };
        return { r: x.r, codigo: '', seguridad: 'no_se', opciones: [], motivo: '' };
      });
      return Promise.resolve({ ok: true, res: { renglones: R }, usadas: 1, tope: 6, usd: 0.05, t: Date.now() });
    };
  });

  console.log('\n── 1. Los renglones y los candidatos ──');
  let r = await ev(() => iapRenglones().map(function (g) { return { ll: g.ll, cant: g.cant, peds: g.peds.map(function (p) { return p.id; }).join() }; }));
  const ll = {}; (r || []).forEach(g => { ll[g.ll.split('|')[0]] = g; });
  chk('a. 4 renglones: «ice» 105x190 (dos pedidos, 3 unidades), «somieres», la medida al revés y «OC 260200619»', Array.isArray(r) && r.length === 4 && ll.ICE && ll.ICE.peds === 'i1,i2' && ll.ICE.cant === 3 &&
    !!ll.SOMIERES && !!ll['COLCHON SEMIORTOP.'] && !!ll['OC 260200619'], r);
  chk('b. no entran: el código de la lista, lo de tienda, la medida especial de un producto de la lista ni el pedido viejo entregado', !r.some(g => /TITANIO|PROTECTOR|160X190/.test(g.ll)), r.map(g => g.ll));
  r = await ev(() => ({ ice: iapCandidatos('ice', '105x190'), som: iapCandidatos('somieres', '140x190'), sem: iapCandidatos('COLCHON SEMIORTOP.', '180x105'), oc: iapCandidatos('OC 260200619', '') }));
  chk('c. «ice» 105x190: primero el TITANIO ICE 105x190 (CH1224) de la lista; como mucho 8', r.ice[0] && r.ice[0].c === 'CH1224' && r.ice[0].de === 'lista' && r.ice.length <= 8, r.ice.slice(0, 3));
  chk('d. «somieres» (plural) 140x190: somieres de esa medida (SOMIER ORO y SOMIER TITANIO ICE entre ellos, lo discontinuado no), ningún colchón', r.som.length === 8 && r.som.every(c => /SOMIER/.test(c.n) && c.m === '140x190') && r.som.some(c => c.c === 'CH1144') && r.som.some(c => /SOMIER TITANIO ICE/.test(c.n)) && !r.som.some(c => /BAHIA|CARIOCA/.test(c.n)), r.som.map(c => c.c + ' ' + c.n));
  chk('e. «COLCHON SEMIORTOP.» 180x105 (al revés): los SEMIORTOP. de la lista', r.sem.length > 0 && r.sem.every(c => /SEMIORTOP/.test(c.n)), r.sem.map(c => c.c));
  chk('f. «OC 260200619»: ningún candidato', r.oc.length === 0, r.oc);

  console.log('\n── 2. Cuándo corre el lote ──');
  r = await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = true; return { html: iapHtml(), q: iapQuizas(), hacer: iapHacer() }; });
  chk('a. sin IAP_PRUEBA (Playwright) nada: ni el bloque, ni el lote, ni «Para hacer»', r.html === '' && r.q === false && r.hacer === null, r);
  r = await ev(() => { window.IAP_PRUEBA = 1; SERVER_VER = '2026-11-15-a'; return { html: iapHtml(), q: iapQuizas() }; });
  chk('b. con el servidor de antes, tampoco', r.html === '' && r.q === false, r);
  r = await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = false; return { q: iapQuizas(), b: /onclick="iapAplicar|onclick="iapLote/.test(iapHtml()) }; });
  chk('c. un vendedor (sin la contraseña ni rol) ve el bloque pero no dispara el lote ni ve los botones', r.q === false && r.b === false, r);
  await ev(() => { UNLOCKED = true; IAP.auto = ''; iapQuizas(); });
  await espera(900);
  r = await ev(() => ({ p: __S.posts.filter(b => b.action === 'iaProductos'), g: __S.guardados.map(x => x.id), fila: __S.fila }));
  const lote = (r.p || [])[0] || {};
  chk('d. con la contraseña: UN lote (sin `uno`) con los 4 renglones, cada uno con sus candidatos y quién lo cargó', r.p.length === 1 && !lote.uno && lote.renglones.length === 4 &&
    lote.renglones.every(x => Array.isArray(x.cands) && x.cands.length <= 8) && lote.renglones.filter(x => /^ICE/.test(x.r))[0].quien === 'FABRICA' && lote.renglones.filter(x => /^OC/.test(x.r))[0].cands.length === 0, lote.renglones && lote.renglones.map(x => x.r + ':' + x.cands.length));
  chk('e. lo que va NO tiene clientes ni celulares', !/CLIENTE INVENTADO|7001100/.test(JSON.stringify(lote)));
  const fo = JSON.parse((r.fila || {}).observaciones || '{}');
  chk('f. guardó SOLO la fila `__prod_ia__`: {v:1, d:hoy, r:{llave:{c, s, m, op}}}', r.g.length === 1 && r.g[0] === '__prod_ia__' && fo.v === 1 && fo.d === '2026-11-16' && Object.keys(fo.r || {}).length === 4 &&
    fo.r[Object.keys(fo.r).filter(k => /^ICE/.test(k))[0]].c === 'CH1224', fo);
  await ev(() => { IAP.auto = ''; iapQuizas(); });
  await espera(500);
  chk('g. el mismo día no corre otra vez (lo dice la fila)', (await ev(() => __S.posts.filter(b => b.action === 'iaProductos').length)) === 1);

  console.log('\n── 3. El Plan ──');
  r = await ev(() => { var d = document.createElement('div'); d.innerHTML = iapHtml(); document.body.appendChild(d); var t = d.innerText;
    var filas = [].map.call(d.querySelectorAll('.iap-r'), function (x) { return { t: x.innerText.replace(/\s+/g, ' '), b: [].map.call(x.querySelectorAll('button'), function (b) { return b.textContent; }) }; }); d.remove(); return { t: t, filas: filas }; });
  const fila = (re) => (r.filas || []).filter(f => re.test(f.t))[0] || { t: '', b: [] };
  chk('a. el bloque dice cuántos y que nada cambia hasta «Es ese»', /Productos escritos a mano · 4 para revisar/.test(r.t) && /nada cambia hasta que tocás «✓ Es ese»/.test(r.t), r.t.slice(0, 200));
  const fi = fila(/«ice»/);
  chk('b. «ice» → TITANIO ICE 105x190 (CH1224), seguro, con «✓ Es ese» y «📂 Abrir»', /TITANIO ICE 105x190/.test(fi.t) && /CH1224/.test(fi.t) && /seguro/.test(fi.t) && fi.b.indexOf('✓ Es ese') >= 0 && fi.b.some(b => /Abrir/.test(b)), fi);
  const fs = fila(/«somieres»/);
  chk('c. «somieres» → dudoso: las dos opciones como botones y SIN «Es ese»', /dudoso/.test(fs.t) && /SOMIER ORO/.test(fs.t) && fs.b.indexOf('✓ Es ese') < 0 && fs.b.filter(b => /SOMIER ORO 140x190|SOMIER TITANIO ICE 140x190/.test(b)).length === 2, fs);
  const fo2 = fila(/«OC 260200619»/);
  chk('d. «OC 260200619» → «No es un producto» con «📂 Abrir el pedido», sin «Es ese»', /No es un producto/.test(fo2.t) && /N° de la orden/.test(fo2.t) && fo2.b.length === 1 && /Abrir/.test(fo2.b[0]), fo2);
  r = await ev(() => { var h = iapHacer(); return h && { n: h.n, t: h.t, s: h.s }; });
  chk('e. «Para hacer» de Administración: 4 renglones, 2 con propuesta', r && r.n === 4 && /2 con propuesta de Claude/.test(r.s), r);
  r = await ev(() => { var h = admHacerDatos().filter(function (x) { return x.k === 'iap'; })[0]; return !!h; });
  chk('f. …y está en la lista de «Para hacer»', r === true);

  console.log('\n── 4. «✓ Es ese» ──');
  r = await ev(() => { __S.guardados = []; var ll = iapRenglones().filter(function (g) { return /^ICE\|/.test(g.ll); })[0].ll; return iapAplicar(ll, 'CH1224').then(function () {
    var i1 = findById('i1'), i2 = findById('i2'); return { g: __S.guardados.map(function (x) { return x.id; }).sort().join(), x1: i1.productos[0], x1b: i1.productos[1], x2: i2.productos[0], quedan: iapRenglones().map(function (g) { return g.ll; }) }; }); });
  await espera(300);
  chk('a. preguntó antes, nombrando los dos pedidos', dialogos.some(d => /¿Es COLCHON TITANIO ICE 105x190 \(CH1224\)\?/.test(d) && /11-101/.test(d) && /11-102/.test(d)), dialogos.slice(-1));
  chk('b. guardó los DOS pedidos (y nada más) por el guardado de siempre', r.g === 'i1,i2', r.g);
  chk('c. el renglón: código CH1224, el nombre de la lista y la medida', r.x1.codigo === 'CH1224' && r.x1.desc === 'COLCHON TITANIO ICE' && r.x1.medida === '105x190' && r.x2.codigo === 'CH1224' && r.x2.cant === 2, [r.x1, r.x2]);
  chk('d. las marcas de logística quedan (✔ Banzer y el día que se pidió) y el otro producto del pedido no se tocó', r.x1.chk === 'ok' && r.x1.chkDe === 'Banzer' && r.x1.prodF === '2026-11-10' && r.x1b.codigo === 'CH1220' && r.x1b.desc === 'TITANIO ICE', r.x1);
  chk('e. después, «ice» ya no es un renglón para revisar (el stock lo reconoce)', r.quedan.length === 3 && !r.quedan.some(l => /^ICE\|/.test(l)), r.quedan);

  console.log('\n── 5. El formulario ──');
  await ev(() => { showView('form'); resetForm(); });
  const prop = () => ev(() => { var b = document.querySelector('#f-productos .prod-card:last-child .iap-form'); return b && !b.hidden ? b.innerText.replace(/\s+/g, ' ') : ''; });
  const escribir = (desc, med, cod) => ev((a) => { var card = document.querySelector('#f-productos .prod-card:last-child'); var d = card.querySelector('.prod-desc'), m = card.querySelector('.prod-medida'), c = card.querySelector('.prod-codigo');
    if (a.cod != null) { c.value = a.cod; } d.value = a.desc; m.value = a.med; d.dispatchEvent(new Event('change')); return true; }, { desc, med, cod });
  await ev(() => { window.IAP_PRUEBA = 0; });
  await escribir('latex', '140x190');
  await espera(300);
  chk('a. sin la bandera, nada (ni propuesta ni consulta)', (await prop()) === '' && (await ev(() => __S.posts.filter(b => b.uno).length)) === 0);
  await ev(() => { window.IAP_PRUEBA = 1; __S.uno = 'CH1129'; });
  await escribir('latex ', '140x190');
  await espera(400);
  let t = await prop();
  r = await ev(() => { var u = __S.posts.filter(b => b.uno); var card = document.querySelector('#f-productos .prod-card:last-child'); return { n: u.length, b: u[0], cod: card.querySelector('.prod-codigo').value, desc: card.querySelector('.prod-desc').value }; });
  chk('b. «latex» 140x190 escrito a mano: Claude propone (UN renglón, `uno`) y se ve «¿Es … TITANIO LATEX 140x190 (CH1129)? Usar ese»', r.n === 1 && r.b.renglones.length === 1 && r.b.renglones[0].cands.length > 0 && /¿Es COLCHON TITANIO LATEX 140x190 \(CH1129\)\?/.test(t) && /Usar ese/.test(t), { t, n: r.n });
  chk('c. NADA cambió todavía: ni el código ni el nombre', r.cod === '' && r.desc === 'latex ', r);
  await escribir('latex ', '140x190');
  await espera(300);
  chk('d. lo ya leído no se vuelve a preguntar', (await ev(() => __S.posts.filter(b => b.uno).length)) === 1 && /Usar ese/.test(await prop()));
  r = await ev(() => { var card = document.querySelector('#f-productos .prod-card:last-child'); card.querySelector('.iap-form button').click();
    return { cod: card.querySelector('.prod-codigo').value, desc: card.querySelector('.prod-desc').value, med: card.querySelector('.prod-medida').value, reco: card.querySelector('.prod-reco').textContent, box: !!card.querySelector('.iap-form') }; });
  chk('e. «Usar ese» pone el código, el nombre y la medida de la lista (y lo dice)', r.cod === 'CH1129' && r.desc === 'COLCHON TITANIO LATEX' && r.med === '140x190' && /Lo propuso Claude/.test(r.reco) && !r.box, r);
  await ev(() => { addProdRow(); });
  await escribir('oro raro', '160x190', 'CH9999');
  await espera(300);
  chk('f. con un código escrito por la vendedora, no se propone nada', (await prop()) === '' && (await ev(() => __S.posts.filter(b => b.uno).length)) === 1);

  console.log('\n── 6. Los «no» ──');
  r = await ev(() => { __S.modo = 'tope'; __S.fila = null; STATE = STATE.filter(function (p) { return p.id !== '__prod_ia__'; }); IAP.auto = ''; return iapLote(true).then(function () { var d = document.createElement('div'); d.innerHTML = iapHtml(); return d.innerText; }); });
  chk('a. con el tope del día: lo dice y no guarda nada; los renglones quedan «sin leer» con «Que Claude proponga»', /Hoy ya se usó todo/.test(r) && /Todavía sin leer/.test(r) && /Que Claude proponga \(3\)/.test(r), r.slice(0, 400));
  r = await ev(() => { var f = STATE.filter(function (p) { return p.id === '__prod_ia__'; })[0] || filaSistema('__prod_ia__', 'x', '{}'); return { sis: esFilaSistema(f), cuenta: stockCuenta(f) }; });
  chk('b. `__prod_ia__` es una fila del sistema (no cuenta para el stock)', r.sis === true && r.cuenta === false, r);

  chk('sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + (FAIL ? '✗' : '✓') + ' ' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
