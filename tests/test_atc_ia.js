/* 🧠 MEJORA 359 · «LO QUE DICEN LAS ATC»: LA CAUSA DE FONDO, PARA HABLAR CON LA FÁBRICA — LA PÁGINA.
   El servidor (`iaAtc`, .gs 2026-11-16-a) lo prueba tests/test_ia_gestion_servidor.js; acá, con `apiPost`/`apiList`/`apiSave` de mentira:
   1. Aparece SOLO para gerencia (`atcVeInforme`), con el servidor nuevo y (en Playwright) con `ATC_IA_PRUEBA`.
   2. Lo que va a Claude: las ATC que ENTRARON de septiembre a noviembre (no las de agosto ni las ventas), SIN cliente ni celular, y el detalle
      sin el nombre del cliente ni números; con producto, medida, motivo, meses desde la compra y garantía/STC.
   3. Una vez por mes, sola: la primera vez que gerencia abre la pestaña lee (relee la planilla antes) y guarda en `__atc_ia__`; la segunda no.
      Si otro aparato ya la guardó este mes, no se paga de nuevo.
   4. Se ve: las causas en barras con «era «Otro»», lo que se repite y «Para hablar con la fábrica»; tocar una causa muestra sus ATC.
      El motivo guardado de ninguna ATC cambia y ningún pedido se guarda.
   5. «📋 Copiar para la fábrica» sin clientes; «📄 Sumar al Informe PDF» suma UNA hoja (sin tildar, el informe tiene las de siempre).
   6. Los «no» (tope, sin conexión) se dicen, sin guardar nada. `__atc_ia__` es una fila del sistema (no es una venta ni una ATC).
   Datos INVENTADOS. Reloj clavado (lunes 16/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_atc_ia.js     (`PEDIDOS=<archivo>` corre contra otra página) */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const RES = {
  resumen: 'Casi todo es hundimiento; dos «Otro» son otra cosa.',
  grupos: [
    { causa: 'Hundimiento', que_es: 'compras de más de un año', atc: ['ATC 11-001', 'ATC 10-001'] },
    { causa: 'Se siente distinto al de la tienda', que_es: 'más duro que el de exhibición', atc: ['ATC 11-002'] },
    { causa: 'Olor o humedad', que_es: 'a los pocos días', atc: ['ATC 09-001'] }
  ],
  reclasificadas: [{ atc: 'ATC 11-002', causa: 'Se siente distinto al de la tienda', por_que: 'el detalle dice más duro' }],
  patrones: ['2 de las 4 son 200x200'],
  para_fabrica: [{ titulo: 'Firmeza del 200x200', detalle: 'revisar contra el de exhibición', atc: ['ATC 11-002'] }],
  no_son_atc: [], n: 4
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));

  await ev((RES) => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; CARGA_GEN++; CARGA_ESTADO = 'ok';
    try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try { localStorage.removeItem(LS_PEND); localStorage.removeItem('me_atc_ia_pdf'); } catch (e) {}
    var ts = function (f) { return new Date(f + 'T10:00:00-04:00').getTime(); };
    var A = function (id, oc, entro, cli, desc, med, atc) {
      return { id: id, oc: oc, fecha: '', turno: 'AM', cliente: cli, vendedor: 'Carola Chavez', celular: '70011' + id.slice(-3), zona: 'Centro', ts: ts(entro), entregado: false,
               productos: [{ desc: desc, medida: med, cant: 1, atc: atc }] };
    };
    window.__BASE = [
      A('a1', 'ATC 11-001', '2026-11-03', 'ROCA PRUEBA JUAN', 'TITANIO LATEX', '200x200', { mot: 'Hundimiento', det: 'Se hunde en el centro', fcom: '2024-10-01', tipo: 'gar' }),
      A('a2', 'ATC 11-002', '2026-11-05', 'PAZ INVENTADA ANA', 'ORO ANATOMICO VISCOLASTICO', '200x200', { mot: 'Otro', det: 'Ana dice que es más duro que el de la tienda, llamar al 76543210', fcom: '2026-10-20', tipo: 'gar' }),
      A('a3', 'ATC 10-001', '2026-10-10', 'SOSA FALSO LUIS', 'TITANIO LATEX', '140x190', { mot: 'Hundimiento', det: 'Hundido a los costados', tipo: 'stc' }),
      A('a4', 'ATC 09-001', '2026-09-20', 'LUNA FICTICIA PIA', 'ESPECIAL SEMIORTOPEDICO', '140x190', { mot: '', det: 'Olor a químico y humedad' }),
      A('a5', 'ATC 08-001', '2026-08-15', 'VIEJA FUERA ROSA', 'BAHIA', '140x190', { mot: 'Patas', det: 'de agosto: fuera de la ventana' }),
      { id: 'v1', oc: '11-050', fecha: '2026-11-18', turno: 'AM', cliente: 'VENTA COMUN', vendedor: 'Carola Chavez', ts: ts('2026-11-05'), productos: [{ desc: 'TITANIO LATEX', medida: '140x190', cant: 1 }] }
    ];
    STATE = JSON.parse(JSON.stringify(__BASE)); saveMirror();
    window.__S = { posts: [], guardados: [], lista: null, modo: 'ok', res: RES, listas: 0 };
    apiSave = function (rec) { rec = JSON.parse(JSON.stringify(rec)); __S.guardados.push(rec); if (rec.id === '__atc_ia__') __S.fila = rec; return Promise.resolve({ ok: true, pedido: Object.assign({ rev: 3 }, rec) }); };
    apiList = function () { __S.listas++; var L = JSON.parse(JSON.stringify(__BASE)); if (__S.fila) L.push(JSON.parse(JSON.stringify(__S.fila))); return Promise.resolve({ ok: true, pedidos: L }); };
    apiPost = function (b) {
      b = JSON.parse(JSON.stringify(b)); __S.posts.push(b);
      if (b.action !== 'iaAtc') return Promise.resolve({ ok: true });
      if (__S.modo === 'red') return Promise.reject(new Error('Failed to fetch'));
      if (__S.modo !== 'ok') return Promise.resolve({ ok: false, error: __S.modo, tope: 4 });
      return Promise.resolve({ ok: true, res: JSON.parse(JSON.stringify(__S.res)), usadas: 1, tope: 4, usd: 0.04, t: Date.now() });
    };
    showView('atc');
  }, RES);
  const espera = (ms) => page.waitForTimeout(ms || 250);
  const visible = () => ev(() => { var b = document.getElementById('atc-ia'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none' && b.innerText.length > 0; });

  console.log('\n── 1. Cuándo aparece ──');
  await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = true; renderAtc(); });
  chk('a. en Playwright sin ATC_IA_PRUEBA no aparece (aunque el servidor la tenga)', !(await visible()));
  await ev(() => { window.ATC_IA_PRUEBA = 1; ATC_IA.auto = '2026-11'; SERVER_VER = '2026-11-15-a'; renderAtc(); });
  chk('b. con el servidor de antes (2026-11-15-a) no aparece', !(await visible()));
  await ev(() => { SERVER_VER = '2026-11-16-a'; UNLOCKED = false; try { localStorage.removeItem(QUIEN_LS_ROL); localStorage.removeItem(LS_ADM_DEV); } catch (e) {} renderAtc(); });
  chk('c. sin la contraseña ni el rol de gerencia (un vendedor) no aparece', !(await visible()));
  await ev(() => { UNLOCKED = true; renderAtc(); });
  chk('d. con la contraseña aparece, antes de leer: cuántas ATC y el botón para leerlas', await visible());
  let r = await ev(() => document.getElementById('atc-ia').innerText);
  chk('e. dice las 4 ATC de septiembre a noviembre y «🧠 Leer las 4 ATC»', /4\s*ATC que entraron entre septiembre a noviembre 2026/.test(r) && /Leer las 4 ATC/.test(r), r);
  chk('f. no le preguntó nada a Claude todavía (la lectura sola la frenamos con ATC_IA.auto)', (await ev(() => __S.posts.length)) === 0);

  console.log('\n── 2. Lo que va a Claude ──');
  r = await ev(() => { var L = atcIaLista(); return { L: L, txt: JSON.stringify(L) }; });
  const L = r.L || [];
  chk('a. las 4 de septiembre a noviembre, la más nueva primero (ni la de agosto ni la venta común)', L.map(x => x.a).join() === 'ATC 11-002,ATC 11-001,ATC 10-001,ATC 09-001', L.map(x => x.a));
  chk('b. SIN cliente ni celular: solo a, p, m, mot, det, meses, tipo', L.every(x => Object.keys(x).sort().join() === 'a,det,m,meses,mot,p,tipo') && !/PRUEBA|INVENTADA|FALSO|FICTICIA|70011/.test(r.txt), r.txt.slice(0, 300));
  const a2 = L.filter(x => x.a === 'ATC 11-002')[0] || {};
  chk('c. el detalle sin el nombre del cliente ni el número que escribió la vendedora', !/Ana\b/.test(a2.det) && !/76543210/.test(a2.det) && /más duro que el de la tienda/.test(a2.det), a2.det);
  chk('d. producto, medida, motivo, meses desde la compra y el tipo', a2.p === 'ORO ANATOMICO VISCOLASTICO' && a2.m === '200x200' && a2.mot === 'Otro' && a2.meses === 0 && a2.tipo === 'gar' &&
    (L.filter(x => x.a === 'ATC 11-001')[0] || {}).meses === 25 && (L.filter(x => x.a === 'ATC 09-001')[0] || {}).meses === null, L);

  console.log('\n── 3. Una vez por mes, sola ──');
  await ev(() => { ATC_IA.auto = ''; renderAtc(); });
  await espera(600);
  r = await ev(() => ({ posts: __S.posts.filter(b => b.action === 'iaAtc'), listas: __S.listas, g: __S.guardados.map(x => x.id), fila: __S.fila }));
  const p0 = (r.posts || [])[0] || {};
  chk('a. leyó UNA vez, con la clave del mes y el período, después de releer la planilla', r.posts.length === 1 && p0.clave === '2026-11' && p0.periodo === 'septiembre a noviembre 2026' && p0.lista.length === 4 && p0.forzar === false && r.listas >= 2, { n: r.posts.length, c: p0.clave, l: r.listas });
  chk('b. guardó SOLO la fila del sistema `__atc_ia__` (con fecha vacía), ningún pedido', r.g.length === 1 && r.g[0] === '__atc_ia__' && r.fila && r.fila.fecha === '', r.g);
  const fo = JSON.parse((r.fila || {}).observaciones || '{}');
  chk('c. la fila: {v:1, L:{2026-11:{t, n:4, txt, res}}}', fo.v === 1 && fo.L && fo.L['2026-11'] && fo.L['2026-11'].n === 4 && fo.L['2026-11'].txt === 'septiembre a noviembre 2026' && fo.L['2026-11'].res.grupos.length === 3, fo);
  await ev(() => { renderAtc(); });
  await espera(300);
  chk('d. al volver a dibujar no lee otra vez', (await ev(() => __S.posts.filter(b => b.action === 'iaAtc').length)) === 1);
  r = await ev(() => document.getElementById('atc-ia').innerText);
  chk('e. se ve: las causas con su número, «era «Otro»», lo que se repite y «Para hablar con la fábrica»',
    /Hundimiento[\s\S]*2/.test(r) && /Se siente distinto al de la tienda/.test(r) && /era «Otro»/.test(r) && /2 de las 4 son 200x200/.test(r) && /Para hablar con la fábrica/.test(r) && /Firmeza del 200x200/.test(r) &&
    /4 ATC leídas por Claude el 16\/11/.test(r) && /el motivo guardado de cada ATC no cambia/.test(r), r.slice(0, 600));
  chk('f. los tres botones: Sumar al Informe PDF, Copiar para la fábrica, Volver a leer', /Sumar al Informe PDF/.test(r) && /Copiar para la fábrica/.test(r) && /Volver a leer/.test(r));
  r = await ev(() => { var b = document.querySelectorAll('#atc-ia .aia-rb')[0]; b.click(); return [].slice.call(document.querySelectorAll('#atc-ia .aia-at')).map(function (x) { return x.textContent; }); });
  chk('g. tocar «Hundimiento» muestra sus ATC (cada una abre su ficha)', r.length === 2 && /ATC 11-001 · Hundimiento/.test(r[0]) && /ATC 10-001/.test(r[1]), r);
  r = await ev(() => STATE.filter(p => /^ATC/.test(p.oc || '')).map(p => p.oc + ':' + atcMotivo(p)).join());
  chk('h. el motivo guardado de cada ATC NO cambió', r === 'ATC 11-001:Hundimiento,ATC 11-002:Otro,ATC 10-001:Hundimiento,ATC 09-001:,ATC 08-001:Patas', r);
  /* otro aparato: la planilla ya tiene la lectura de este mes → no se paga de nuevo */
  r = await ev(() => { var f = STATE.filter(p => p.id === '__atc_ia__')[0]; STATE = STATE.filter(p => p.id !== '__atc_ia__'); var antes = __S.posts.length;
    return atcIaLeer(false).then(function (x) { return { antes: antes, despues: __S.posts.length, x: !!x, vuelve: !!STATE.filter(p => p.id === '__atc_ia__')[0] }; }); });
  chk('i. en OTRO aparato (sin la fila en su copia): relee la planilla, la encuentra y NO le pregunta a Claude', r.antes === r.despues && r.x && r.vuelve, r);

  console.log('\n── 4. Copiar, el informe ──');
  r = await ev(() => atcIaTexto());
  chk('a. «Copiar para la fábrica»: lo que hay que revisar con los casos, las causas y lo que se repite; ningún cliente',
    /Para revisar con la fábrica:\n1\. Firmeza del 200x200: revisar contra el de exhibición \(casos: ATC 11-002\)/.test(r) && /· Hundimiento: 2/.test(r) && /Lo que se repite:/.test(r) && !/PRUEBA|INVENTADA|FALSO|FICTICIA/.test(r), r);
  r = await ev(() => { var D = atciDatos('2026-11'); return { sin: atciHojas(D).length }; });
  const sinIa = r.sin;
  await ev(() => { atcIaAlInforme(); });
  await espera(300);
  r = await ev(() => { var D = atciDatos('2026-11'), H = atciHojas(D), w = document.getElementById('atci-ia-w'), c = document.getElementById('atci-ia');
    return { con: H.length, ia: H.filter(function (h) { return /Lo que dicen las ATC/.test(h); }).length, txt: (H.filter(function (h) { return /Lo que dicen las ATC/.test(h); })[0] || '').replace(/<[^>]+>/g, ' '),
      bar: !!w && !w.hidden, tilde: !!c && c.checked, abierto: atciAbierto() }; });
  chk('b. «📄 Sumar al Informe PDF» abre el informe con UNA hoja más («🧠 Lo que dicen las ATC») y la casilla tildada', r.abierto && r.con === sinIa + 1 && r.ia === 1 && r.bar && r.tilde, { sin: sinIa, con: r.con, bar: r.bar, tilde: r.tilde });
  chk('c. la hoja: las causas, «Para hablar con la fábrica» y lo que se repite', /Hundimiento/.test(r.txt) && /Para hablar con la fábrica/.test(r.txt) && /Firmeza del 200x200/.test(r.txt) && /Lo que se repite/.test(r.txt), r.txt.slice(0, 300));
  r = await ev(() => { var c = document.getElementById('atci-ia'); c.checked = false; c.dispatchEvent(new Event('change')); return atciHojas(atciDatos('2026-11')).length; });
  chk('d. destildar la casilla la saca (las hojas de siempre)', r === sinIa, r);
  await ev(() => { atciCerrar(); });

  console.log('\n── 5. Volver a leer y los «no» ──');
  await ev(() => { __S.modo = 'tope'; __S.guardados = []; });
  r = await ev(() => atcIaLeer(true).then(function () { return { txt: document.getElementById('atc-ia').innerText, g: __S.guardados.length, ult: __S.posts[__S.posts.length - 1] }; }));
  chk('a. «🔄 Volver a leer» pregunta a Claude con `forzar`; con el tope del día lo dice y no guarda nada', r.ult && r.ult.forzar === true && /Hoy ya se usó todo/.test(r.txt) && r.g === 0, r.txt.slice(0, 300));
  chk('b. …y la lectura de antes se sigue viendo', /Se siente distinto al de la tienda/.test(r.txt));
  await ev(() => { __S.modo = 'red'; });
  r = await ev(() => atcIaLeer(true).then(function () { return document.getElementById('atc-ia').innerText; }));
  chk('c. sin conexión: «Sin conexión con el servidor»', /Sin conexión con el servidor/.test(r), r.slice(0, 200));

  console.log('\n── 6. La fila del sistema ──');
  r = await ev(() => { var f = STATE.filter(p => p.id === '__atc_ia__')[0]; return { sis: esFilaSistema(f), atc: esATC(f.oc), conta: fueraDeConta(f, 'tienda') }; });
  chk('a. `__atc_ia__` es una fila del sistema: ni ATC ni venta', r.sis === true && r.atc === false && r.conta === true, r);

  chk('sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + (FAIL ? '✗' : '✓') + ' ' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
