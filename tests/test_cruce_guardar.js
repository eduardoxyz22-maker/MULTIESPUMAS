/* 🔀 (21/11) «Este cliente puede ser de X»: ANTES de guardar se vuelve a mostrar y hay que tocar «Guardar igual».
   Dueño, con la captura: *«tarda en aparecer… antes de guardar debería volver a este mensaje, mostrarlo y de ahí recién permitir guardar»*.
   · Kommo ya contestó y la atiende otra → pregunta; «Volver» no guarda, «Guardar igual» guarda.
   · Kommo todavía no contestó → espera (no guarda), y al llegar la respuesta pregunta.
   · Kommo no contesta → a los CRUCE_GUARDAR_MS guarda igual (la venta nunca se frena).
   · Cliente libre, o la que vende es la que lo atendía → guarda derecho. */
'use strict';
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
let PASS = 0, FAIL = 0;
const chk = (n, ok, d) => { if (ok) { PASS++; console.log('✓ ' + n); } else { FAIL++; console.log('✗ ' + n + (d !== undefined ? ' · ' + JSON.stringify(d).slice(0, 400) : '')); } };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/La_Paz' });
  await ctx.route(/^https?:\/\//, r => r.abort());
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const DLG = { msgs: [], resp: true };
  page.on('dialog', d => { DLG.msgs.push(d.message()); if (d.type() === 'confirm') (DLG.resp ? d.accept() : d.dismiss()); else d.accept(); });
  await page.addInitScript(() => { window.CRUCE_PRUEBA = 1; });
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00-04:00'));
  await page.goto('file://' + path.resolve(process.env.PEDIDOS || 'pedidos.html'), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const ev = (f, a) => page.evaluate(f, a).catch(e => ({ __err: String((e && e.message) || e).slice(0, 200) }));
  const AHORA = Math.floor(new Date('2026-11-02T10:00:00-04:00').getTime() / 1000);

  await ev((ahora) => {
    document.getElementById('conn-form').style.display = 'none';
    CONNECTED = true; UNLOCKED = false; SERVER_VER = '2026-11-21-a';
    window._pl = []; window._saves = 0;
    apiSave = function (rec) { window._saves++; var g = JSON.parse(JSON.stringify(rec)); window._pl = window._pl.filter(function (x) { return x.id !== g.id; }).concat([g]); return Promise.resolve({ ok: true, pedido: g }); };
    apiList = function () { return Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window._pl)) }); };
    /* Kommo de mentira: KX.modo = 'carola' (la atiende Carola) | 'libre' | 'nunca' (no contesta); KX.ms = cuánto tarda */
    window.KX = { modo: 'carola', ms: 0, n: 0 };
    apiPost = function (b) {
      if (!b || b.action !== 'quienAtiende') return Promise.resolve({ ok: true });
      KX.n++; KX.ult = b;
      if (KX.modo === 'nunca') return new Promise(function () {});
      if (KX.modo === 'tope') return Promise.resolve({ ok: false, error: 'tope', tope: 150 });
      var leads = KX.modo === 'carola' ? [{ id: '71', resp: 'Carola Chavez', pares: [{ ts: ahora - 3 * 86400, desde: ahora - 3 * 86400, quien: 'Carola Chavez' }] }] : [];
      var r = { ok: true, ahora: ahora, cuentas: [{ marca: 'heaven', contactos: 1, msgOk: true, tareasOk: true, notasOk: true, leads: leads }, { marca: 'suena', contactos: 0, leads: [] }] };
      return new Promise(function (res) { setTimeout(function () { res(r); }, KX.ms); });
    };
    STATE = []; saveMirror();
  }, AHORA);

  let celN = 70000000;
  const llenar = (o) => ev((o) => {
    CRUCE_MEMO = {}; CRUCE_F.k = ''; CRUCE_F.r = null; CRUCE_F.sinResp = ''; CRUCE_F.espGuardar = false; CRUCE_F.esp = null; CRUCE_F.preg = '';
    KX.modo = o.modo; KX.ms = o.ms || 0; KX.n = 0; window.CRUCE_GUARDAR_MS = o.tope || 15000;
    showView('form'); resetForm();
    document.getElementById('f-fecha').value = '2026-11-04'; segSet('f-turno', 'AM');
    document.getElementById('f-vendedor').value = o.vend || 'Isabel Robledo'; applyVendedorLite();
    document.getElementById('f-cliente').value = 'CLIENTE INVENTADO ' + 'ABCDEFGHIJ'.charAt(o.cel % 10);   // uno distinto por caso: si no, sale «¿pedido repetido?»
    var c = document.getElementById('f-celular'); c.value = String(o.cel); c.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('f-zona').value = 'Norte';
    document.getElementById('f-direccion').value = 'CALLE FALSA 1';
    var n = document.getElementById('f-nota'); if (n) n.value = String(1000 + (o.cel % 1000));
    var box = document.getElementById('f-productos'); box.innerHTML = '';
    addProdRow('TITANIO LATEX', '160x190', '', 1, ''); box.lastElementChild.querySelector('.prod-precio').value = '3000';
    refreshDelButtons();
    segSet('f-pagado', 'NO'); document.getElementById('f-saldo').value = '3000';
    try { updateMetodoVisibility(); } catch (e) {}
  }, o);
  const guardar = (espera) => ev(async (espera) => {
    var n0 = window._saves; submitPedido();
    await new Promise(r => setTimeout(r, espera || 500));
    return { guardo: window._saves - n0, toast: (document.getElementById('toast') || {}).textContent || '', kx: KX.n };
  }, espera);
  const caja = () => ev(() => { var b = document.getElementById('cruce-form'); return b && !b.hidden ? b.textContent : ''; });

  /* A · Kommo ya contestó: el cartel está a la vista y Guardar pregunta */
  await llenar({ modo: 'carola', cel: ++celN }); await page.waitForTimeout(1500);
  chk('A0 · el cartel ya está a la vista', /puede ser de Carola Chavez/.test(await caja()));
  DLG.msgs = []; DLG.resp = false;
  let g = await guardar();
  chk('⚠️ A1 · Guardar vuelve a mostrar el aviso («puede ser de Carola Chavez»)', DLG.msgs.length === 1 && /puede ser de Carola Chavez/.test(DLG.msgs[0]) && /WhatsApp/.test(DLG.msgs[0]), DLG.msgs);
  chk('⚠️ A2 · «Volver» NO guarda', g.guardo === 0, g);
  DLG.msgs = []; DLG.resp = true;
  g = await guardar();
  chk('⚠️ A3 · «Guardar igual» guarda', DLG.msgs.length === 1 && g.guardo === 1, { g, m: DLG.msgs.length });

  /* B · Kommo tarda 2 s: se toca Guardar enseguida → espera, y al llegar pregunta */
  await llenar({ modo: 'carola', cel: ++celN, ms: 2000 });
  DLG.msgs = []; DLG.resp = true;
  g = await guardar(300);
  chk('B1 · todavía sin respuesta de Kommo: NO guarda y dice que está revisando', g.guardo === 0 && DLG.msgs.length === 0 && /Revisando en Kommo/.test(g.toast), g);
  const g2 = await ev(async () => { var n0 = window._saves; submitPedido(); await new Promise(r => setTimeout(r, 100)); return window._saves - n0; });
  chk('B2 · otro «Guardar» mientras espera no hace nada', g2 === 0, g2);
  await page.waitForTimeout(3500);
  const nB = await ev(() => window._saves);
  chk('⚠️ B3 · llegó la respuesta: pregunta UNA vez y, con «Guardar igual», guarda UNA vez', DLG.msgs.length === 1 && /Carola/.test(DLG.msgs[0]) && nB === 2, { m: DLG.msgs, nB });

  /* C · Kommo no contesta: a los CRUCE_GUARDAR_MS guarda igual, sin preguntar */
  await llenar({ modo: 'nunca', cel: ++celN, tope: 1200 });
  DLG.msgs = [];
  g = await guardar(300);
  chk('C1 · Kommo no contesta: al principio espera', g.guardo === 0, g);
  await page.waitForTimeout(2500);
  { const nC = await ev(() => ({ s: window._saves, t: (document.getElementById('toast') || {}).textContent, f: CRUCE_F.sinResp, e: CRUCE_F.espGuardar, k: CRUCE_F.k })); chk('C2 · pasado el tope guarda igual (la venta no se frena) y sin preguntar', nC.s === 3 && DLG.msgs.length === 0, { nC, m: DLG.msgs }); }

  /* D · cliente libre: guarda derecho */
  await llenar({ modo: 'libre', cel: ++celN }); await page.waitForTimeout(1500);
  DLG.msgs = [];
  g = await guardar();
  chk('D · cliente libre: guarda sin preguntar', g.guardo === 1 && DLG.msgs.length === 0, { g, m: DLG.msgs });

  /* E · la que vende es la que lo atendía */
  await llenar({ modo: 'carola', cel: ++celN, vend: 'Carola Chavez' }); await page.waitForTimeout(1500);
  DLG.msgs = [];
  g = await guardar();
  chk('E · Carola le vende a su propio cliente: guarda sin preguntar', g.guardo === 1 && DLG.msgs.length === 0, { g, m: DLG.msgs });

  /* F · otra marca (Mauricio, Sueña) y al editar: nada */
  await llenar({ modo: 'carola', cel: ++celN, vend: 'Mauricio Merida' }); await page.waitForTimeout(1500);
  DLG.msgs = [];
  g = await guardar();
  chk('F · un vendedor de la OTRA marca (Sueña): guarda sin preguntar', g.guardo === 1 && DLG.msgs.length === 0, { g, m: DLG.msgs });

  /* (Revisión de Fable, 21/11) */
  /* G · se toca el formulario mientras espera → NO se guarda solo, y lo dice */
  await llenar({ modo: 'carola', cel: ++celN, ms: 2500 });
  DLG.msgs = [];
  g = await guardar(300);
  chk('G0 · mientras espera, el cartel dice «Revisando en Kommo» con «Guardar sin esperar»', /Revisando en Kommo/.test(await caja()) && /Guardar sin esperar/.test(await caja()), await caja());
  await ev(() => { fxFormPintar(); });
  chk('G1 · el repintado del formulario no borra ese cartel', /Revisando en Kommo/.test(await caja()));
  await page.type('#f-direccion', ' 2');
  await page.waitForTimeout(3500);
  { const nG = await ev(() => ({ s: window._saves, t: (document.getElementById('toast') || {}).textContent, esp: !!CRUCE_F.esp }));
    chk('⚠️ G2 · cambió la dirección durante la espera: no guarda solo (ni pregunta) y le dice que toque Guardar de nuevo', nG.s === 6 && DLG.msgs.length === 0 && /Guardar» de nuevo/.test(nG.t) && !nG.esp, { nG, m: DLG.msgs }); }
  /* H · «Guardar sin esperar» */
  await llenar({ modo: 'nunca', cel: ++celN });
  g = await guardar(300);
  const nH0 = await ev(() => window._saves);
  const bH = await ev(() => { var b = document.querySelector('#cruce-form button'); if (!b) return false; b.click(); return true; }); await page.waitForTimeout(400);
  chk('H · «Guardar sin esperar» guarda enseguida', bH === true && g.guardo === 0 && await ev(() => window._saves) === nH0 + 1, { bH, g });
  /* I · sale del formulario durante la espera → no guarda */
  await llenar({ modo: 'carola', cel: ++celN, ms: 1500 });
  DLG.msgs = [];
  g = await guardar(300);
  await ev(() => { document.getElementById('view-form').classList.remove('active'); });
  await page.waitForTimeout(2500);
  chk('I · fue a otra pestaña durante la espera: no guarda solo ni pregunta', await ev(() => window._saves) === 7 && DLG.msgs.length === 0, DLG.msgs);
  await ev(() => { document.getElementById('view-form').classList.add('active'); });
  /* J · Kommo dice «tope» → no espera los 15 s */
  await llenar({ modo: 'tope', cel: ++celN });
  g = await guardar(1200);
  chk('J · con el tope del día no espera los 15 s: guarda enseguida', g.guardo === 1, g);
  /* K · la consulta del formulario va solo con la marca de quien vende */
  chk('K · la consulta del formulario manda `solo` con la marca de quien vende', await ev(() => KX.ult && KX.ult.solo === 'heaven' && KX.ult.auto === 1), await ev(() => KX.ult));
  /* L · una pregunta de antes en el mismo guardado no se vuelve a hacer después de la espera */
  await llenar({ modo: 'libre', cel: ++celN, ms: 1200 });
  const nL0 = await ev(() => window._saves);
  const rL = await ev(async () => {
    window.PREG_PRUEBA = 1; window._preg = 0; var n0 = window._saves;
    var ov = function () { window._preg++; var r = preguntaYa('¿Seguro de prueba?', {}, ov); if (r === null) return; if (!r) return; var c = cruceAntesDeGuardar(ov); if (c !== true) return; window._saves++; };
    PREG_MEMO = { 'c|¿Seguro de prueba?': true }; try { ov(); } finally { PREG_MEMO = null; }
    await new Promise(r => setTimeout(r, 2500));
    var abierta = !!document.querySelector('.modal-ov.open, #modal.open'); window.PREG_PRUEBA = 0;
    return { saves: window._saves - n0, abierta: abierta };
  });
  chk('L · la respuesta dada ANTES de la espera sigue valiendo al terminar (no vuelve a preguntar)', rL.saves === 1 && DLG.msgs.length === 0, { rL, m: DLG.msgs });
  /* M · no dos ventanas iguales */
  await llenar({ modo: 'carola', cel: ++celN }); await page.waitForTimeout(1500);
  const rM = await ev(() => { window.PREG_PRUEBA = 1; var a = cruceAntesDeGuardar(function () {}), b = cruceAntesDeGuardar(function () {}); var res = { a: a, b: b, preg: CRUCE_F.preg ? 1 : 0, ventanas: PREG_ABIERTAS }; window.PREG_PRUEBA = 0; return res; });
  chk('M · (con la ventana del panel) la segunda vez, con la pregunta abierta, no abre otra', rM.a === null && rM.b === null && rM.preg === 1 && rM.ventanas === 1, rM);

  chk('sin errores de la página', !errs.length, errs);
  await browser.close();
  console.log(`\n${PASS} bien · ${FAIL} mal`);
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
