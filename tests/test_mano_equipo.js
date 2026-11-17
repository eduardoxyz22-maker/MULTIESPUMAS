/* 🤝 MEJORA 362 (página) — «QUIÉN NECESITA UNA MANO ESTA SEMANA (SIN CULPAR)», en Proyección (con la contraseña).
   El servidor (2026-11-16-a, acción `iaEquipo`, tests/test_porque_semana.js §8) le pregunta a Claude y guarda la semana en la hoja «IA semanal».
   LO QUE ESTA PRUEBA CUIDA:
   1. Sin la bandera (Playwright) o con un servidor anterior: nada.
   2. `mnoDatos`: una entrada por vendedora del EQUIPO (sin Eduardo, ROHO ni internos), con lo que ya cuenta el panel: sus 4 semanas (las de
      `pryVentas`), la venta cruzada, las ventas sin N° de factura o remisión (`docVentaFalta`), los avisos de Contabilidad por tipo, el panel al
      día (`alDiaDatos`), los cambios de fecha (`fmovDe`) y sus ATC; NINGÚN cliente, celular ni OC.
   3. «Pedirle a Claude» manda `iaEquipo` con la semana (el lunes), los datos y los videos de Bloki; se ve cada persona POR NOMBRE con «le va bien»,
      «le cuesta», «cómo ayudar», el video, «✓ Ya hablé con ella / con él»; el resto, «nada que pida ayuda».
   4. «✓ Ya hablé» (`iaEquipoHable`) la pasa a «Ya hablaste con…» (y si el servidor no lo guarda, vuelve y lo dice); «Deshacer».
   5. El lunes se pide SOLA una vez al abrir Proyección; los demás días no. Los errores en palabras (el tope, Claude apagado).
   Datos INVENTADOS. Reloj clavado: martes 17/11/2026 y lunes 23/11/2026, 10:00 de Bolivia.
   Se corre:  TZ=America/La_Paz HTTPS_PROXY=http://127.0.0.1:9 node tests/test_mano_equipo.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 700)) : ''); };
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');

function PREPARAR() {
  CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; ULTIMO_ERROR = '';
  try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
  if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
  var T = function (s) { return Date.parse(s + 'T11:00:00-04:00'); }, n = 0;
  var P = function (vend, dia, o) { n++; return Object.assign({ id: 'p' + n, oc: '11-' + (400 + n), nota: String(800 + n), vendedor: vend, cliente: 'CLIENTE SECRETO ' + n, celular: '7' + String(3000000 + n),
    zona: 'Norte', maps: 'https://www.google.com/maps?q=-17.78,-63.18', fecha: '2026-11-25', turno: 'AM',
    productos: [{ desc: 'COLCHON SOFT', medida: '140x190', codigo: '', cant: 1, precio: 5000, fdoc: 'F', fdocn: '7' + n }], saldo: 5000, acuenta: 0, pagado: false, metodoPago: '', ts: T(dia) }, o || {}); };
  var sinDoc = function (p) { p.productos.forEach(function (x) { delete x.fdoc; delete x.fdocn; }); p.fecha = '2026-11-14'; return p; };   // (17/11) solo entregadas: ya salió
  window._pl = [
    sinDoc(P('Isabel Robledo', '2026-11-10')), sinDoc(P('Isabel Robledo', '2026-11-11')),
    P('Isabel Robledo', '2026-11-03', { productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 5000, fdoc: 'F', fdocn: '91' }, { desc: 'ALMOHADA FIBRA', medida: '50x70', cant: 2, precio: 100, fdoc: 'F', fdocn: '91' }] }),
    P('Maria Flores', '2026-11-12'), P('Maria Flores', '2026-11-13', { productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, precio: 5000, fdoc: 'F', fdocn: '92', fmov: 2 }] }),
    P('Carola Chavez', '2026-10-27'),
    P('Eduardo Añez', '2026-11-10', { cliente: 'MULTICENTER' }), P('ROHO', '2026-11-10'), P('ALBA', '2026-11-10'),
    P('Isabel Robledo', '2026-11-12', { oc: 'ATC 11-001', productos: [{ desc: 'COLCHON SOFT', medida: '140x190', cant: 1, atc: { mot: 'Hundimiento', det: 'se hundió' } }] }),
    { id: '__avisos_conta__', cliente: '📣', fecha: '', observaciones: JSON.stringify({ v: 1, a: [
      { id: 'av1', pid: 'p1', vend: 'Isabel Robledo', cli: 'CLIENTE SECRETO 1', txt: 'la foto es del 08/11', ks: ['dia'], t: T('2026-11-11') },
      { id: 'av2', pid: 'p2', vend: 'Isabel Robledo', cli: 'CLIENTE SECRETO 2', txt: 'la foto dice Bs 900', ks: ['menos'], t: T('2026-11-12') }] }) }
  ];
  apiSave = function (rec) { return Promise.resolve({ ok: true, pedido: rec }); };
  apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
  window._srv = { equipo: [], llamadas: [], resp: null, hab: {} };
  apiPost = function (b) {
    _srv.llamadas.push(JSON.parse(JSON.stringify(b)));
    SERVER_VER = window._ver || '2026-11-16-a';
    if (_srv.resp) { var r = _srv.resp(b); if (r) return Promise.resolve(r); }
    if (b.action === 'iaSemana') return Promise.resolve({ ok: true, items: { porque: [], equipo: _srv.equipo.slice() }, ia: '', version: SERVER_VER });
    if (b.action === 'iaEquipo') {
      var it = { v: 1, k: 'e' + b.semana, tipo: 'equipo', semana: b.semana, hab: {}, hTxt: '17/11 10:00', hecho: Date.now(),
        personas: [{ vend: 'Isabel Robledo', bien: 'Carga el día de la venta.', cuesta: 'Dos de sus ventas no tienen N° de factura.', ayuda: '5 minutos con Contabilidad.', video: 'pago' },
                   { vend: 'Jonathan Monje', bien: '', cuesta: 'No cargó ventas en 4 semanas.', ayuda: 'Preguntarle si necesita algo.', video: '' }],
        resto: ['Carola Chavez', 'Maria Flores'] };
      _srv.equipo = [it]; return Promise.resolve({ ok: true, item: it, version: SERVER_VER });
    }
    if (b.action === 'iaEquipoHable') { var k = String(b.vend).toLowerCase(); if (b.si) _srv.hab[k] = 1; else delete _srv.hab[k]; return Promise.resolve({ ok: true, hab: JSON.parse(JSON.stringify(_srv.hab)), version: SERVER_VER }); }
    return Promise.resolve({ ok: true, version: SERVER_VER });
  };
  window._abrir = function () { UNLOCKED = true; showView('conta'); try { segSet('cta-tab', 'proy'); } catch (e) {} setContaTab('proy'); };
  window._txt = function (sel) { var e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
  window._n = function (a) { return _srv.llamadas.filter(function (x) { return x.action === a; }).length; };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const abrir = async (cuando) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => { try { sessionStorage.setItem('me_quien_ok', '1'); } catch (e) {} });
    await page.clock.setFixedTime(new Date(cuando));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.waitForTimeout(350);
    await page.evaluate(PREPARAR);
    await page.evaluate(async () => { await refrescarEstado(); });
    return page;
  };
  let page = await abrir('2026-11-17T10:00:00-04:00');
  const ev = async (fn, arg) => { try { return await page.evaluate(fn, arg); } catch (e) { return { __error: String((e && e.message) || e).slice(0, 400) }; } };

  const hay = await ev(() => typeof mnoDatos === 'function' && typeof mnoPedir === 'function');
  chk('0 · la página tiene la 362 (`mnoDatos`, `mnoPedir`)', hay === true, hay);
  if (hay !== true) { await browser.close(); console.log('\n' + PASS + ' bien · ' + FAIL + ' mal'); process.exit(1); }

  // ===== 1. sin la bandera / servidor viejo =====
  let r = await ev(async () => { window.MANO_PRUEBA = 0; window.PORQUE_PRUEBA = 0; _abrir(); await new Promise(f => setTimeout(f, 80)); return { box: _txt('#pry-mano'), btn: document.getElementById('pry-mano-w').hidden, n: _n('iaSemana') }; });
  chk('1a · sin `MANO_PRUEBA` (Playwright): nada', r.box === '' && r.btn === true && r.n === 0, r);
  r = await ev(async () => { window.MANO_PRUEBA = 1; window._ver = '2026-11-15-a'; SERVER_VER = '2026-11-15-a'; _abrir(); await new Promise(f => setTimeout(f, 80)); var o = { box: _txt('#pry-mano'), n: _n('iaSemana') }; window._ver = ''; SERVER_VER = '2026-11-16-a'; return o; });
  chk('1b · con un servidor anterior al 2026-11-16-a: nada', r.box === '' && r.n === 0, r);

  // ===== 2. lo que se le manda a Claude =====
  r = await ev(() => { var D = mnoDatos('2026-11-16'), por = {}; D.forEach(function (x) { por[x.vend] = x; }); return { nombres: D.map(function (x) { return x.vend; }), I: por['Isabel Robledo'], M: por['Maria Flores'], todo: JSON.stringify(D) }; });
  chk('2a · las vendedoras del equipo (sin Eduardo, ROHO ni ALBA)', r.nombres.indexOf('Isabel Robledo') >= 0 && r.nombres.indexOf('Maria Flores') >= 0 && r.nombres.indexOf('Carola Chavez') >= 0 &&
      !r.nombres.some(function (n) { return /Eduardo|ROHO|ALBA/i.test(n); }), r.nombres);
  chk('2b · sus 4 semanas (las de Proyección, por el día de carga) y la venta promedio', r.I && r.I.semanas.length === 4 && r.I.semanas[3].semana === 'del 09/11 al 15/11' && r.I.semanas[3].ventas === 2 &&
      r.I.semanas[3].bs === 10000 && r.I.semanas[2].ventas === 1 && r.I.ventas4semanas === 3 && r.I.ventaPromedio > 0, r.I && r.I.semanas);
  chk('2c · la venta cruzada: Isabel 1 de 3 con almohada; María 0 de 2', JSON.stringify(r.I.ventaCruzada) === '{"ventasConColchonOSomier":3,"deEsasConAlmohadaOProtector":1}' &&
      JSON.stringify(r.M.ventaCruzada) === '{"ventasConColchonOSomier":2,"deEsasConAlmohadaOProtector":0}', [r.I.ventaCruzada, r.M.ventaCruzada]);
  chk('2d · factura o remisión (`docVentaFalta`) y los avisos de Contabilidad por tipo', r.I.facturaORemision.sinNumero === 2 && r.I.avisosDeContabilidadAbiertos.total === 2 &&
      JSON.stringify(r.I.avisosDeContabilidadAbiertos.porTipo) === '{"fechaDeLaFoto":1,"montoDistinto":1}', [r.I.facturaORemision, r.I.avisosDeContabilidadAbiertos]);
  chk('2e · el panel al día, los cambios de fecha (María 1 cambiada dos veces) y sus ATC (Isabel 1, hundimiento)', typeof r.I.panelAlDiaPorcentaje === 'number' &&
      r.M.cambiosDeFecha.ventasCambiadasDosVecesOMas === 1 && r.I.atcDeSusVentas30dias.total === 1 && r.I.atcDeSusVentas30dias.porMotivo.hundimiento === 1, [r.I.panelAlDiaPorcentaje, r.M.cambiosDeFecha, r.I.atcDeSusVentas30dias]);
  chk('2f · NINGÚN cliente, celular, OC ni N° de nota', !/CLIENTE|SECRETO|MULTICENTER|7300000|11-4\d\d|ATC 11|\b8\d\d\b"/.test(r.todo), r.todo.slice(0, 200));

  // ===== 3. pedirle a Claude =====
  r = await ev(async () => { _abrir(); await new Promise(f => setTimeout(f, 150)); return { txt: _txt('#pry-mano'), btn: !!document.getElementById('mno-pedir'), eq: _n('iaEquipo') }; });
  chk('3a · el martes no se pide sola: dice que no está y ofrece «Pedirle a Claude»', r.btn && r.eq === 0 && /Todavía no está la de la semana del 16\/11/.test(r.txt), r);
  r = await ev(async () => { document.getElementById('mno-pedir').click(); await new Promise(f => setTimeout(f, 200));
    var b = _srv.llamadas.filter(function (x) { return x.action === 'iaEquipo'; })[0] || {};
    return { semana: b.semana, nDatos: (b.datos || []).length, videos: (b.videos || []).map(function (v) { return v.k; }), otra: b.otra, txt: _txt('#pry-mano'),
             orden: [].map.call(document.querySelectorAll('#pry-mano-box .mno-v h4 span'), function (s) { return s.textContent; }),
             botones: [].map.call(document.querySelectorAll('#pry-mano-box .mno-k button'), function (x) { return x.textContent; }) }; });
  chk('3b · `iaEquipo` con el lunes de esta semana, los datos de cada una y los videos de Bloki', r.semana === '2026-11-16' && r.nDatos >= 3 && r.videos.indexOf('pago') >= 0 && r.videos.indexOf('pedido') >= 0 && !r.otra, r);
  chk('3c · cada persona por NOMBRE, con le va bien / le cuesta / cómo ayudar', JSON.stringify(r.orden) === '["Isabel Robledo","Jonathan Monje"]' &&
      /Le va bien Carga el día de la venta\./i.test(r.txt) && /Le cuesta Dos de sus ventas no tienen N° de factura\./i.test(r.txt) && /Cómo ayudar 5 minutos con Contabilidad\./i.test(r.txt), r.txt.slice(0, 600));
  chk('3d · el video que le sirve, «Copiar el enlace» y «✓ Ya hablé con ella / con él»', r.botones.indexOf('🎬 Ver el video: Cómo cobrar el saldo pendiente') >= 0 && r.botones.indexOf('📋 Copiar el enlace del video') >= 0 &&
      r.botones.indexOf('✓ Ya hablé con ella') >= 0 && r.botones.indexOf('✓ Ya hablé con él') >= 0, r.botones);
  chk('3e · el resto: «nada que pida ayuda»', /Las otras 2 personas: nada que pida ayuda esta semana \(Carola Chavez, Maria Flores\)\./.test(r.txt), r.txt.slice(-200));

  // ===== 4. ya hablé =====
  r = await ev(async () => { document.querySelector('#pry-mano-box .mno-v[data-vend="Isabel Robledo"] .mno-hable').click(); await new Promise(f => setTimeout(f, 120));
    var b = _srv.llamadas.filter(function (x) { return x.action === 'iaEquipoHable'; }).pop() || {};
    return { b: b, pend: [].map.call(document.querySelectorAll('#pry-mano-box > .mno-v h4 span'), function (s) { return s.textContent; }), txt: document.getElementById('pry-mano').textContent.replace(/\s+/g, ' ') }; });
  chk('4a · «✓ Ya hablé» manda `iaEquipoHable` y la pasa a «Ya hablaste con 1»', r.b.semana === '2026-11-16' && r.b.vend === 'Isabel Robledo' && r.b.si === true &&
      JSON.stringify(r.pend) === '["Jonathan Monje"]' && /✓ Ya hablaste con 1 \(hasta la semana que viene\)/.test(r.txt), r);
  r = await ev(async () => { document.querySelector('#pry-mano-box .pqs-ant .mno-hable').click(); await new Promise(f => setTimeout(f, 120));
    return { si: (_srv.llamadas.filter(function (x) { return x.action === 'iaEquipoHable'; }).pop() || {}).si, pend: document.querySelectorAll('#pry-mano-box > .mno-v').length }; });
  chk('4b · «Deshacer» la vuelve a la lista', r.si === false && r.pend === 2, r);
  r = await ev(async () => { _srv.resp = function (b) { return b.action === 'iaEquipoHable' ? { ok: false, error: 'ocupado' } : null; };
    document.querySelector('#pry-mano-box .mno-v[data-vend="Jonathan Monje"] .mno-hable').click(); await new Promise(f => setTimeout(f, 150)); _srv.resp = null;
    return { pend: document.querySelectorAll('#pry-mano-box > .mno-v').length, toast: (document.getElementById('toast') || {}).textContent || '' }; });
  chk('4c · si el servidor no lo guarda, vuelve como estaba y lo dice', r.pend === 2 && /No se guardó «Ya hablé» \(ocupado\)/.test(r.toast), r);
  r = await ev(async () => { _srv.resp = function (b) { return b.action === 'iaEquipo' ? { ok: false, error: 'tope' } : null; }; document.getElementById('mno-otra').click(); await new Promise(f => setTimeout(f, 150));
    var t = _txt('#pry-mano'); _srv.resp = null; return { t: t, otra: (_srv.llamadas.filter(function (x) { return x.action === 'iaEquipo'; }).pop() || {}).otra }; });
  chk('4d · «🔄 Pedirla de nuevo» manda «otra»; el tope, en palabras', r.otra === 1 && /Ya se usaron las consultas a Claude de hoy/.test(r.t), r);

  // ===== 5. el lunes, sola, una vez =====
  page = await abrir('2026-11-23T10:00:00-04:00');
  r = await ev(async () => { window.MANO_PRUEBA = 1; SERVER_VER = '2026-11-16-a'; _abrir(); await new Promise(f => setTimeout(f, 250)); renderProyeccion(); await new Promise(f => setTimeout(f, 250));
    var b = _srv.llamadas.filter(function (x) { return x.action === 'iaEquipo'; }); return { n: b.length, semana: (b[0] || {}).semana, txt: _txt('#pry-mano') }; });
  chk('5a · el lunes, al abrir Proyección, se pide SOLA una vez (la de esta semana)', r.n === 1 && r.semana === '2026-11-23' && /Isabel Robledo/.test(r.txt), r);
  r = await ev(async () => { _srv.equipo = []; _srv.resp = function (b) { return b.action === 'iaEquipo' ? { ok: false, error: 'ia_apagada' } : null; }; MNO.auto = ''; PQS.items = null; await pqsCargar(true);
    await new Promise(f => setTimeout(f, 200)); _srv.resp = null; return _txt('#pry-mano'); });
  chk('5b · Claude apagado: lo dice', /Claude está apagado \(IA_ACTIVA\): sin él no se arma\./.test(r), r);
  chk('6 · sin errores de la página', errores.length === 0, errores);
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})();
