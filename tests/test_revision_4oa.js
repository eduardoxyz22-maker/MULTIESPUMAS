/* 🔎 LA REVISIÓN DE OTRA IA SOBRE LA VELOCIDAD (30/10, §4oa; `correciones_de_app_ME.txt`, verificada por tres agentes).
   Lo que cuida (los tres primeros los reprodujo el agente de la página contra 8c4193e):
   1. H4: en Mis pedidos de a partes hay UN solo «Ver más» (antes el del trozo y el de los 120, a la vez).
   2. H2: lo que trajo OTRA lectura (el Excel del cierre, la cola de reescritas) llega a la pantalla aunque la de cada minuto venga
      «sin cambios» (`LISTA_CAMBIO_N`).
   3. N3: vencidos los 90 s de un guardado, la pantalla muestra lo de la planilla (`MERGE_DE_ACA`).
   4. El reloj de 30 s de Mis pedidos no redibuja con la lectura sin cambios (antes, dos veces cada vuelta).
   5. La copia del aparato guarda lo que Contabilidad y ATC tienen pendiente (ATC abiertas, sin monto, cobradas de más, sin fecha).
   6. D11: sin lectura de la planilla, Contabilidad avisa que ve la copia del aparato; con la lectura, el aviso se va.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_revision_4oa.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PEDIDOS = process.env.PEDIDOS || require('path').resolve(__dirname, '..', 'pedidos.html');
const HOY = '2026-10-30T11:00:00-04:00';
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? '· ' + JSON.stringify(e).slice(0, 300) : ''); };
function filas() {
  const P = [];
  for (let i = 0; i < 160; i++) {
    const d = String(1 + (i % 29)).padStart(2, '0');
    P.push({ id: 'v' + i, fecha: '2026-10-' + d, oc: '10-' + (100 + i), vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + (500 + i), celular: '7000' + (1000 + i),
      productos: [{ desc: 'COLCHON TITANIO 140x190', medida: '', codigo: '', cant: 1, precio: 1500 }], turno: 'AM', zona: 'Norte', direccion: 'CALLE ' + i,
      pagado: true, saldo: 0, acuenta: 1500, metodoPago: 'Efectivo 1500 @2026-10-' + d, ts: Date.parse('2026-10-' + d + 'T10:00:00-04:00') + i * 1000, entregado: i % 3 === 0, rev: 1 });
  }
  return P;
}
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(trozos) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript(t => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_mis_vendedor', 'Carola Chavez'); } catch (e) {} if (t) window.TROZOS_PRUEBA = true; }, !!trozos);
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    /* Un servidor de mentira con «lo cambiado» (ahora, n, huella) como el .gs 30-a */
    await page.evaluate(async (S) => {
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); clearInterval(MIS_TIMER); clearInterval(AUTO_TIMER); } catch (e) {}
      window.SRV = { filas: S, cambio: {}, ahora: 1000000 };
      const huella = L => L.reduce((h, p) => (h + huellaFila(p.id, p.rev)) % 4294967296, 0);
      apiPost = function (pl) {
        if (pl.action !== 'list') return Promise.resolve({ ok: true });
        SRV.ahora += 1000;
        const L = SRV.filas, base = { ok: true, ahora: SRV.ahora, n: L.length, huella: huella(L) };
        if (pl.desde) return Promise.resolve(Object.assign(base, { delta: true, pedidos: JSON.parse(JSON.stringify(L.filter(p => (SRV.cambio[p.id] || 0) > pl.desde))), borrados: [] }));
        return Promise.resolve(Object.assign(base, { pedidos: JSON.parse(JSON.stringify(L)) }));
      };
      apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); };
      window.srvCambiar = (id, f) => { const p = SRV.filas.find(x => x.id === id); f(p); p.rev++; SRV.cambio[id] = SRV.ahora + 1; };
      await refrescarEstado();
    }, filas());
    await page.waitForTimeout(150);
    return { ctx, page };
  }

  /* ---- H4: dos «ver más» a la vez en Mis pedidos (con trozos) ---- */
  let { ctx, page } = await abrir(true);
  const h4 = await page.evaluate(async () => {
    showView('mis'); await new Promise(r => setTimeout(r, 200));
    const bot = [...document.querySelectorAll('#mis-lista button')].map(b => b.textContent.trim()).filter(t => /Ver/.test(t));
    return { tarjetas: document.querySelectorAll('#mis-lista > .cho-card').length, botones: bot };
  });
  chk('1 H4 Mis pedidos (160, MIS_TOPE 120): un solo «Ver más»', h4.botones.length === 1, h4);
  await ctx.close();

  /* ---- Hueco de H2: otra lectura (como la del Excel del cierre) se come lo cambiado ---- */
  ({ ctx, page } = await abrir(false));
  const h2 = await page.evaluate(async () => {
    const espera = ms => new Promise(r => setTimeout(r, ms));
    let pint = 0; const ar = autoRepintar; autoRepintar = function () { pint++; return ar.apply(this, arguments); };
    showView('conta'); await espera(200);
    await autoRefrescar('x'); await autoRefrescar('x'); pint = 0;      // base: dibujado y al día
    const antes = { igual: LECTURA_IGUAL, gen: [AUTO_PINTADO_GEN, STATE_GEN] };
    srvCambiar('v5', p => { p.cliente = 'CAMBIADO EN OTRA COMPU'; });
    await apiList();                                                      // otra lectura (nxCierreBajar, mandarReescritaDeCola…) que no toca STATE
    await autoRefrescar('x');                                             // la de cada 2 min: «lo cambiado» viene vacío
    const enState = (findById('v5') || {}).cliente, enPantalla = /CAMBIADO EN OTRA COMPU/.test(document.getElementById('tbl-conta').textContent);
    autoRepintar = ar;
    return { antes, igual: LECTURA_IGUAL, pint, enState, enPantalla };
  });
  chk('2 H2: lo que trajo otra lectura llega a la pantalla', h2.enPantalla, h2);

  /* ---- N3: vence la ventana de 90 s de un guardado (la copia de acá ≠ la de la planilla, mismo sello) ---- */
  const n3 = await page.evaluate(async () => {
    const espera = ms => new Promise(r => setTimeout(r, ms));
    let pint = 0; const ar = autoRepintar; autoRepintar = function () { pint++; return ar.apply(this, arguments); };
    await autoRefrescar('x'); await autoRefrescar('x');
    /* lo que deja un guardado confirmado acá: la copia local con un campo que la planilla no guarda (como cobradoBs) */
    const loc = JSON.parse(JSON.stringify(findById('v7'))); loc.cliente = 'SOLO EN ESTE APARATO';
    upsert(loc); SAVE_ULTIMO['v7'] = { rec: loc, t: Date.now(), okN: ++RED_N, okT: relojMs() }; SAVE_REV['v7'] = loc.rev;
    saveMirror(); renderConta();                                          // la acción repinta lo suyo
    await autoRefrescar('x');                                             // dentro de los 90 s: manda la de acá
    const dentro = { st: findById('v7').cliente, pant: /SOLO EN ESTE APARATO/.test(document.getElementById('tbl-conta').textContent) };
    SAVE_ULTIMO['v7'].t -= 100000;                                        // pasaron los 90 s
    pint = 0; await autoRefrescar('x');
    const fuera = { st: findById('v7').cliente, pant: /SOLO EN ESTE APARATO/.test(document.getElementById('tbl-conta').textContent), igual: LECTURA_IGUAL, pint };
    autoRepintar = ar;
    return { dentro, fuera };
  });
  chk('3 N3: vencida la ventana, la pantalla muestra lo de la planilla', !n3.fuera.pant, n3);
  await ctx.close();

  /* ---- Extra: en Mis pedidos el reloj de 30 s (refreshMis) dibuja igual, con la lectura sin cambios ---- */
  ({ ctx, page } = await abrir(false));
  const mis = await page.evaluate(async () => {
    showView('mis'); await new Promise(r => setTimeout(r, 200));
    await autoRefrescar('x'); await autoRefrescar('x');
    let n = 0; const rm = renderMis; renderMis = function () { n++; return rm.apply(this, arguments); };
    if (misAlAire()) await refreshMis({ tic: true });                     // lo que hace MIS_TIMER cada 30 s
    renderMis = rm;
    return { renderMis: n, igual: LECTURA_IGUAL, alAire: misAlAire() };
  });
  chk('4 el reloj de 30 s de Mis pedidos no redibuja con la lectura sin cambios', mis.renderMis === 0, mis);
  await ctx.close();

  /* ---- 5: la copia guarda lo pendiente de Contabilidad y ATC ---- */
  ({ ctx, page } = await abrir(false));
  const r5 = await page.evaluate(() => {
    const viejo = Date.parse('2026-07-15T10:00:00-04:00');
    const base = { vendedor: 'Mirian Salazar', productos: [{ desc: 'COLCHON', cant: 1, precio: 900 }], turno: 'AM', zona: 'Sur', direccion: 'X', rev: 1, ts: viejo, fecha: '2026-07-16', entregado: true };
    const casos = {
      atcAbierta: Object.assign({}, base, { id: 'c-atc', oc: 'ATC 07-001', cliente: 'A', pagado: true, saldo: 0, metodoPago: '' }),
      sinMonto: Object.assign({}, base, { id: 'c-sm', oc: '07-050', cliente: 'B', pagado: false, saldo: 0, metodoPago: '' }),
      deMas: Object.assign({}, base, { id: 'c-dm', oc: '07-051', cliente: 'C', pagado: true, saldo: -200, metodoPago: 'Efectivo 1100 @2026-07-16' }),
      sinFecha: Object.assign({}, base, { id: 'c-sf', oc: '07-052', cliente: 'D', pagado: true, saldo: 0, fecha: '', entregado: false, metodoPago: 'Efectivo 900 @2026-07-16' }),
      cerrado: Object.assign({}, base, { id: 'c-ce', oc: '07-053', cliente: 'E', pagado: true, saldo: 0, metodoPago: 'Efectivo 900 @2026-07-16' }) };
    const out = {}; Object.keys(casos).forEach(k => { out[k] = mirrorRecortar([casos[k]]).length === 1; });
    return out;
  });
  chk('5 la copia guarda la ATC abierta, la venta sin monto, la cobrada de más y lo sin entregar sin fecha (de julio)', r5.atcAbierta && r5.sinMonto && r5.deMas && r5.sinFecha, r5);
  chk('5 y no guarda lo viejo entregado y cobrado', r5.cerrado === false, r5);
  await ctx.close();

  /* ---- 6: D11, el aviso de la copia en Contabilidad ---- */
  {
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await c2.route(/^https?:\/\//, r => r.abort());
    await c2.addInitScript(L => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('ME_PEDIDOS_V1', JSON.stringify(L)); } catch (e) {} }, filas().slice(0, 20));
    const p2 = await c2.newPage(); p2.on('pageerror', e => errores.push(e.message));
    await p2.clock.setFixedTime(new Date(HOY));
    await p2.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    const r6 = await p2.evaluate(async (L) => {
      try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      const k = LS_KEY; const conCopia = STATE.length;
      CONNECTED = false; showView('conta'); await new Promise(r => setTimeout(r, 150));
      const el = document.getElementById('cta-copia'), sin = !!(el && !el.hidden && /copia de este aparato/.test(el.textContent) && /incompleto/.test(el.textContent));
      CONNECTED = true; window.__L = L; apiList = () => Promise.resolve({ ok: true, pedidos: JSON.parse(JSON.stringify(window.__L)) });
      await refrescarEstado(); contaRepintar();
      const el2 = document.getElementById('cta-copia');
      return { k, conCopia, recortado: STATE_RECORTADO, sin, despues: !el2 || el2.hidden };
    }, filas());
    chk('6 D11: sin lectura de la planilla, Contabilidad avisa que es la copia del aparato y que lo viejo sale incompleto', r6.conCopia > 0 && r6.sin, r6);
    chk('6 D11: con la lectura, el aviso se va', r6.despues && r6.recortado === false, r6);
    await c2.close();
  }
  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
