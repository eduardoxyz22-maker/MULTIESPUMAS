/* 🎧🤖 MEJORA 347 · LA ATC CON FOTOS: CLAUDE PROPONE EL MOTIVO Y EL RECLAMO — LA PÁGINA.
   El servidor (`atcFotos`, .gs 2026-11-16-a) lo prueba tests/test_ia_vend_atc_servidor.js; acá, con `apiPost`/`apiSave` de mentira:
   1. Apagado: en Playwright sin `ATF_PRUEBA`, con el servidor de antes, o una ATC sin fotos → ni botón ni consulta.
   2. La ficha de la ATC trae «🤖 Mirar las fotos»: UNA consulta con las fotos (hasta 2), el detalle, el motivo, el producto, la fecha de
      compra, la lista de motivos de la página (`ATC_MOTIVOS`) y lo que el certificado no cubre (`CERT_TEXTO.noCubre`).
   3. Lo que vuelve: el motivo propuesto con «Usar este motivo», qué se ve, «⚠️ … Solo es un aviso: lo decide gerencia.», el párrafo para la
      fábrica con «📧 Pasar al correo», qué foto pedir con «💬 Pedirle otra foto» (el WhatsApp del cliente con el texto) y que garantía/STC lo
      decide gerencia.
   4. «Usar este motivo» guarda la ATC con ESE motivo (una vez) y no toca garantía/STC; volver a abrir no vuelve a preguntar.
   5. «📧 Pasar al correo» lleva el párrafo al mensaje del correo de la ATC (`atcCorreoTexto`), sin repetirlo.
   6. Al guardar una ATC NUEVA con fotos («✅ ATC guardada») lo mira solo; si falla, ahí no dice nada; en la ficha, una línea.
   Datos INVENTADOS. Reloj clavado (lunes 16/11/2026, 10:00 de Bolivia).
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 TZ=America/La_Paz node tests/test_ia_vend_atc.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 500)) : ''); };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  page.on('dialog', d => d.accept());
  await page.clock.setFixedTime(new Date('2026-11-16T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 300) }));
  const IA = { muestra: true, motivo: 'Retapizado / costura', seVe: 'Costura del borde abierta unos 20 cm, del lado de la cabecera.', noCubre: true, noCubrePor: 'Mancha clara en la tapa, en la 2ª foto.',
    fab: 'Colchón Oro Bi Relax 200x200, comprado el 15/03/2022. Costura del borde abierta ~20 cm. Se pide revisar la costura.', pedir: '', fotos: 2 };

  await ev((IA) => {
    var c = document.getElementById('conn-form'); if (c) c.style.display = 'none';
    CONNECTED = true; UNLOCKED = false; SERVER_VER = '2026-11-16-a';
    CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
    if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
    try { localStorage.removeItem(LS_PEND); } catch (e) {}
    var atc = function (id, oc, fot) { return { id: id, oc: oc, fecha: '2026-11-18', turno: 'AM', vendedor: 'Carola Chavez', cliente: 'CLIENTA INVENTADA ' + id, celular: '71234567', zona: 'Norte', direccion: 'CALLE FALSA',
      ts: Date.parse('2026-11-14T10:00:00-04:00'), saldo: 0, pagado: false, productos: [{ desc: 'ORO BI RELAX', medida: '200x200', cant: 1,
      atc: { tipo: 'gar', mot: 'Otro', det: 'Se le abrió la costura del borde y tiene una mancha', fcom: '2022-03-15', fot: fot } }], fotos: fot.slice() }; };
    STATE = [atc('a1', 'ATC 11-014', ['fotoA', 'fotoB']), atc('a2', 'ATC 11-015', [])]; saveMirror();
    window.__S = { ia: [], saves: [], resp: { ok: true, ia: IA } };
    apiSave = function (rec) { var g = JSON.parse(JSON.stringify(rec)); __S.saves.push(g); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(STATE)) }); };
    apiPost = function (b) { b = JSON.parse(JSON.stringify(b)); if (b.action !== 'atcFotos') return Promise.resolve({ ok: true }); __S.ia.push(b); return Promise.resolve(JSON.parse(JSON.stringify(__S.resp))); };
  }, IA);
  const ficha = (id) => ev(async (id) => { closeModal(); verAtc(id); await new Promise(r => setTimeout(r, 80));
    var box = document.getElementById('modal-box'); return { btn: !!box.querySelector('.atf-btn:not([hidden])'), txt: (box.querySelector('.atf-box') || {}).textContent || '', n: __S.ia.length }; }, id);

  console.log('\n── 1. Apagado ──');
  let f = await ficha('a1');
  chk('a. en Playwright sin ATF_PRUEBA: la ficha no trae «🤖 Mirar las fotos»', !f.btn && f.n === 0, f);
  await ev(() => { window.ATF_PRUEBA = 1; SERVER_VER = '2026-11-15-a'; });
  f = await ficha('a1');
  chk('b. con el servidor de antes, tampoco', !f.btn, f);
  await ev(() => { SERVER_VER = '2026-11-16-a'; });
  f = await ficha('a2');
  chk('c. una ATC sin fotos, tampoco', !f.btn, f);

  console.log('\n── 2. «🤖 Mirar las fotos» ──');
  f = await ficha('a1');
  chk('a. con la bandera y el servidor nuevo, la ficha trae el botón (y todavía no preguntó nada)', f.btn && f.n === 0, f);
  const m = await ev(async () => { document.querySelector('#modal-box .atf-btn').click(); await new Promise(r => setTimeout(r, 150));
    var box = document.querySelector('#modal-box .atf-box'); return { q: __S.ia[0], txt: box.textContent, usar: !!box.querySelector('.atf-usar'), correo: (box.querySelector('.atf-correo') || {}).textContent || '',
      motivos: JSON.stringify(ATC_MOTIVOS), nc: JSON.stringify(CERT_TEXTO.noCubre), btnOculto: document.querySelector('#modal-box .atf-btn').hidden }; });
  chk('b. UNA consulta con las 2 fotos, el detalle, el motivo, el producto, la fecha de compra, la lista de motivos y lo que no cubre',
    m.q && m.q.fotos.join() === 'fotoA,fotoB' && /costura del borde/.test(m.q.det) && m.q.mot === 'Otro' && m.q.prod === 'ORO BI RELAX 200x200' && m.q.fcom === '2022-03-15' &&
    JSON.stringify(m.q.motivos) === m.motivos && JSON.stringify(m.q.noCubre) === m.nc, m.q);
  chk('c. el motivo propuesto con «Usar este motivo», qué se ve, el párrafo y «📧 Pasar al correo»',
    /Claude miró las 2 fotos/.test(m.txt) && /Otro → Retapizado \/ costura/.test(m.txt) && m.usar && /Costura del borde abierta unos 20 cm/.test(m.txt) && /Para la fábrica/.test(m.txt) && m.correo === '📧 Pasar al correo', m.txt);
  chk('d. «no cubre» con su porqué y «Solo es un aviso: lo decide gerencia.»; garantía/STC lo decide gerencia', /Mancha clara en la tapa/.test(m.txt) && /Solo es un aviso: lo decide gerencia\./.test(m.txt) && /Garantía o contra costo \(STC\) lo decide gerencia/.test(m.txt), m.txt);
  chk('e. el botón se esconde al tocarlo', m.btnOculto === true);

  console.log('\n── 3. «Usar este motivo» ──');
  const u = await ev(async () => { var n0 = __S.saves.length; document.querySelector('#modal-box .atf-usar').click(); await new Promise(r => setTimeout(r, 300));
    var s = __S.saves[__S.saves.length - 1], box = document.querySelector('#modal-box .atf-box');
    return { guardo: __S.saves.length - n0, mot: s && s.productos[0].atc.mot, tipo: s && s.productos[0].atc.tipo, det: s && s.productos[0].atc.det, txt: box ? box.textContent : '', pidio: __S.ia.length,
             ficha: (document.getElementById('modal-box') || {}).textContent || '' }; });
  chk('a. guarda la ATC UNA vez con ese motivo; garantía y el detalle quedan como estaban', u.guardo === 1 && u.mot === 'Retapizado / costura' && u.tipo === 'gar' && /costura del borde/.test(u.det), u);
  chk('b. la ficha se vuelve a abrir con «✓ el que elegiste» SIN volver a preguntarle a Claude', /✓ el que elegiste/.test(u.txt) && u.pidio === 1, { txt: u.txt.slice(0, 120), pidio: u.pidio });

  console.log('\n── 4. «📧 Pasar al correo» ──');
  const c = await ev(async () => { document.querySelector('#modal-box .atf-correo').click(); await new Promise(r => setTimeout(r, 120));
    var tx = document.getElementById('atc-correo-texto'); return { abierto: !!tx, v: tx ? tx.value : '', solo: atcCorreoTexto(findById('a1')) }; });
  chk('a. abre el correo de la ATC con «PARA LA FÁBRICA» y el párrafo antes del saludo', c.abierto && /PARA LA FÁBRICA \(lo que se ve en las fotos\)\nColchón Oro Bi Relax/.test(c.v) && c.v.indexOf('PARA LA FÁBRICA') < c.v.indexOf('Saludos,'), c.v.slice(-400));
  chk('b. y el motivo del correo ya es el elegido', /Motivo: Retapizado \/ costura/.test(c.v));
  chk('c. `atcCorreoTexto` lo trae una sola vez', (c.solo.match(/PARA LA FÁBRICA/g) || []).length === 1);

  console.log('\n── 5. Al guardar una ATC nueva («✅ ATC guardada») ──');
  const g = await ev(async () => {
    closeModal(); var p = JSON.parse(JSON.stringify(findById('a1'))); p.id = 'a3'; p.oc = 'ATC 11-016'; p.productos[0].atc.fot = ['fotoC', 'fotoD']; p.fotos = ['fotoC', 'fotoD']; STATE.push(p);
    var n0 = __S.ia.length; showWhatsappModal(p); await new Promise(r => setTimeout(r, 150));
    var box = document.querySelector('#modal-box .atf-box'), tx = document.getElementById('atc-correo-texto');
    var antes = box && tx ? !!(box.compareDocumentPosition(tx) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
    document.querySelector('#modal-box .atf-correo').click(); await new Promise(r => setTimeout(r, 80));
    var v1 = tx.value; document.querySelector('#modal-box .atf-correo').click(); await new Promise(r => setTimeout(r, 80));
    return { pidio: __S.ia.length - n0, txt: box ? box.textContent : '', antes: antes, v1: v1, v2: tx.value, sigue: document.getElementById('atc-correo-texto') === tx }; });
  chk('a. lo mira solo, UNA vez, y lo muestra arriba del correo', g.pidio === 1 && /Claude miró las 2 fotos/.test(g.txt) && g.antes, g);
  chk('b. «📧 Pasar al correo» lo pone en el mensaje de ESA ventana, una sola vez', g.sigue && /PARA LA FÁBRICA/.test(g.v1) && (g.v2.match(/PARA LA FÁBRICA/g) || []).length === 1, g.v2.slice(-300));

  console.log('\n── 6. La foto no muestra el problema, y los errores ──');
  await ev(() => { __S.resp = { ok: true, ia: { muestra: false, motivo: '', seVe: 'Se ve el colchón de lejos.', noCubre: false, noCubrePor: '', fab: '', pedir: 'Una foto de cerca del hundimiento, con luz.', fotos: 1 } }; });
  const nm = await ev(async () => { closeModal(); var p = JSON.parse(JSON.stringify(findById('a1'))); p.id = 'a4'; p.oc = 'ATC 11-017'; p.productos[0].atc.fot = ['fotoE']; p.fotos = ['fotoE']; STATE.push(p);
    verAtc('a4'); await new Promise(r => setTimeout(r, 60)); document.querySelector('#modal-box .atf-btn').click(); await new Promise(r => setTimeout(r, 150));
    var box = document.querySelector('#modal-box .atf-box'), a = box.querySelector('.atf-wa'); return { txt: box.textContent, href: a ? a.getAttribute('href') : '', correo: !!box.querySelector('.atf-correo'), usar: !!box.querySelector('.atf-usar') }; });
  chk('a. dice que la foto no muestra el problema y qué foto pedir; sin motivo ni párrafo, sin esos botones', /La foto no muestra bien el problema/.test(nm.txt) && /Una foto de cerca del hundimiento/.test(nm.txt) && /no se puede saber/.test(nm.txt) && !nm.correo && !nm.usar, nm);
  chk('b. «💬 Pedirle otra foto» abre el WhatsApp del cliente con el pedido escrito (lo manda la vendedora)', /^https:\/\/wa\.me\/59171234567\?text=/.test(nm.href) && /una%20foto%20de%20cerca%20del%20hundimiento/i.test(nm.href), nm.href);
  await ev(() => { __S.resp = { ok: false, error: 'tope' }; });
  const er = await ev(async () => { closeModal(); var p = JSON.parse(JSON.stringify(findById('a1'))); p.id = 'a5'; p.oc = 'ATC 11-018'; p.productos[0].atc.fot = ['fotoF']; p.fotos = ['fotoF']; STATE.push(p);
    showWhatsappModal(p); await new Promise(r => setTimeout(r, 120)); var auto = (document.querySelector('#modal-box .atf-box') || {}).textContent || '';
    closeModal(); verAtc('a5'); await new Promise(r => setTimeout(r, 60)); var b = document.querySelector('#modal-box .atf-btn'); if (b) b.click(); await new Promise(r => setTimeout(r, 120));
    return { auto: auto, ficha: (document.querySelector('#modal-box .atf-box') || {}).textContent || '' }; });
  chk('c. con el tope: al guardar no dice nada; en la ficha, una línea', er.auto === '' && /tope de ATC que mira Claude/.test(er.ficha), er);

  chk('z. sin errores de la página', errores.length === 0, errores.slice(0, 3));
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  await browser.close();
  process.exit(FAIL ? 1 : 0);
})();
