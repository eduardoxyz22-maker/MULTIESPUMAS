/* ⚡ VELOCIDAD DEL PANEL (30/10, §4oa, propuestas 84 a 89; dueño: «ok todo») y los arreglos de la revisión de la otra IA (H1, H2).
   Lo que cuida:
   1. (84) La copia del aparato guarda lo reciente, lo que viene, lo sin entregar y lo que tiene saldo; lo viejo entregado y cobrado no.
   2. (84) Sin lugar en el navegador, el pedido que se manda IGUAL queda en la cola: se va primero la copia de la planilla.
   3. (85) La lectura sin cambios: `_igual` solo con «lo cambiado» vacío; sin cambios no reescribe la copia ni repinta Nuevo pedido, Mis
      pedidos ni Contabilidad; Administración sí; a los 5 minutos sí; si la junta saca un pedido, sí. H2: una lectura CON cambios que no
      repintó (o cualquier cambio de `STATE`) hace que la siguiente «sin cambios» repinte igual.
   4. (86/87) Contabilidad y Mis pedidos de a partes: el primer trozo, «Ver más», el resto al acercarse al final, sin repetir filas; con la
      primera columna escondida el botón se ve. H1: un redibujo no vuelve al primer trozo ni mueve la página; otra pestaña, sí.
      Sin `TROZOS_PRUEBA` (las pruebas de siempre) se dibuja todo de una.
   5. (88/89) La contraseña de Administración con su estilo, «Semana» escondida de verdad, «A mañana» en un renglón.
   Se corre:  HTTPS_PROXY=http://127.0.0.1:9 node tests/test_velocidad_4oa.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 400)) : ''); };
const RAIZ = process.env.RAIZ || path.resolve(__dirname, '..');
const PEDIDOS = process.env.PEDIDOS || path.join(RAIZ, 'pedidos.html');
const HOY = '2026-10-30T11:00:00-04:00', T0 = Date.parse(HOY), DIA = 864e5;
const iso = ms => new Date(ms - 4 * 3600e3).toISOString().slice(0, 10);

/* Pedidos de mentira: 160 de Carola en octubre (para Contabilidad y Mis pedidos) + los casos de la copia. */
function lista() {
  const P = [];
  for (let i = 0; i < 160; i++) {
    const d = String(1 + (i % 29)).padStart(2, '0');
    P.push({ id: 'v' + i, fecha: '2026-10-' + d, oc: '10-' + (100 + i), vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + (500 + i), celular: '7000' + (1000 + i),
      productos: [{ desc: 'COLCHON TITANIO 140x190', medida: '', codigo: '', cant: 1, precio: 1500 }], turno: 'AM', zona: 'Norte', direccion: 'CALLE ' + i,
      pagado: true, saldo: 0, acuenta: 1500, metodoPago: 'Efectivo 1500 @2026-10-' + d, ts: Date.parse('2026-10-' + d + 'T10:00:00-04:00') + i * 1000, entregado: i % 3 === 0, rev: 1 });
  }
  const base = { vendedor: 'Mirian Salazar', productos: [{ desc: 'COLCHON', cant: 1, precio: 900 }], turno: 'AM', zona: 'Sur', direccion: 'X', rev: 1, metodoPago: '' };
  const caso = (id, diasTs, diasFecha, extra) => P.push(Object.assign({}, base, { id, cliente: id.toUpperCase(), ts: diasTs == null ? 0 : T0 - diasTs * DIA, fecha: diasFecha == null ? '' : iso(T0 - diasFecha * DIA) }, extra));
  caso('viejo-cerrado', 100, 100, { entregado: true, pagado: true, saldo: 0 });         // no va
  caso('viejo-sin-entregar', 100, 100, { entregado: false, pagado: true, saldo: 0 });   // va (sin entregar, < 180 días)
  caso('muy-viejo-sin-entregar', 220, 220, { entregado: false, pagado: true, saldo: 0 });  // no va
  caso('viejo-con-saldo', 300, 300, { entregado: true, pagado: false, saldo: 250 });    // va (debe)
  caso('cargado-hace-poco', 10, 100, { entregado: true, pagado: true, saldo: 0 });      // va
  caso('para-el-mes-que-viene', 100, -20, { entregado: false, pagado: true, saldo: 0 }); // va (viene)
  caso('sin-fechas', null, null, { entregado: true, pagado: true, saldo: 0 });          // va
  return { ok: true, version: '2026-10-29-b', ahora: T0, pedidos: P };
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  async function abrir(trozos, vp) {
    const ctx = await browser.newContext({ viewport: vp || { width: 1440, height: 900 }, timezoneId: 'America/La_Paz' });
    await ctx.route(/^https?:\/\//, r => r.abort());
    await ctx.addInitScript(t => { try { sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); localStorage.setItem('me_mis_vendedor', 'Carola Chavez'); } catch (e) {} if (t) window.TROZOS_PRUEBA = true; }, !!trozos);
    const page = await ctx.newPage();
    page.on('pageerror', e => errores.push(e.message));
    await page.clock.setFixedTime(new Date(HOY));
    await page.goto('file://' + PEDIDOS, { waitUntil: 'load' });
    await page.evaluate(async L => {
      CONNECTED = true; CARGA_GEN++; CARGA_ESTADO = 'ok'; try { clearTimeout(CARGA_TIMER); clearInterval(CARGA_TIC); } catch (e) {}
      window.apiListReal = apiList;   // la de la página (el punto 3 la usa con un servidor de mentira)
      window.__L = L; apiList = function () { return Promise.resolve(JSON.parse(JSON.stringify(window.__L))); };
      apiSave = function (r) { return Promise.resolve({ ok: true, pedido: r }); }; apiPost = function () { return Promise.resolve({ ok: true }); };
      await refrescarEstado();
    }, lista());
    await page.waitForTimeout(150);
    return { ctx, page };
  }

  // ---------- 1. la copia del aparato ----------
  let { ctx, page } = await abrir(false);
  const r1 = await page.evaluate(() => { saveMirror(); const c = JSON.parse(localStorage.getItem(LS_KEY) || '[]').map(p => p.id); return { ids: c, n: c.length, total: STATE.length }; });
  const tiene = id => r1.ids.indexOf(id) >= 0;
  chk('1a no guarda lo viejo entregado y cobrado (100 días)', !tiene('viejo-cerrado'), r1.n);
  chk('1b guarda lo sin entregar de los últimos 180 días, no lo de 220', tiene('viejo-sin-entregar') && !tiene('muy-viejo-sin-entregar'));
  chk('1c guarda lo que tiene saldo, aunque sea de hace 300 días', tiene('viejo-con-saldo'));
  chk('1d guarda lo cargado hace poco, lo que viene y lo sin fechas', tiene('cargado-hace-poco') && tiene('para-el-mes-que-viene') && tiene('sin-fechas'));
  chk('1e y todo lo de este mes (' + (r1.total - 7) + ' ventas de octubre)', r1.ids.filter(x => /^v\d+$/.test(x)).length === 160, r1.n);
  const r1f = await page.evaluate(() => { const L = JSON.parse(localStorage.getItem(LS_KEY)); return L.every(p => typeof p.ts === 'number' || p.ts === 0 || p.ts === undefined); });
  chk('1f la copia se sigue leyendo como antes (una lista de pedidos)', r1f);

  // ---------- 2. sin lugar: la cola gana ----------
  const r2 = await page.evaluate(async () => {
    /* Tope de mentira: el navegador dice «no hay lugar» si lo guardado pasa de lo que ocupa la copia + 20.000 letras. */
    const orig = Storage.prototype.setItem, tam = () => { let t = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); t += k.length + (localStorage.getItem(k) || '').length; } return t; };
    saveMirror(); const TOPE = tam() + 20000;
    Storage.prototype.setItem = function (k, v) { const viejo = this.getItem(k); if (tam() - (viejo ? viejo.length + k.length : 0) + k.length + String(v).length > TOPE) { const e = new Error('lleno'); e.name = 'QuotaExceededError'; throw e; } return orig.call(this, k, v); };
    try {
      const rec = { id: 'nuevo-1', fecha: '2026-11-03', vendedor: 'Carola Chavez', cliente: 'NUEVO ' + 'X'.repeat(30000), productos: [{ desc: 'COLCHON', cant: 1 }], turno: 'AM' };
      const copia = prepararDurable(rec);
      const enCola = getPending().some(p => p.id === 'nuevo-1');
      const copiaSigue = !!localStorage.getItem(LS_KEY);
      saveMirror();   // la copia vuelve a intentar: no entra, y la cola no se toca
      const colaSigue = getPending().some(p => p.id === 'nuevo-1');
      return { copia: !!copia, enCola, copiaSigue, colaSigue, sucio: MIRROR_SUCIO };
    } finally { Storage.prototype.setItem = orig; }
  });
  chk('2a sin lugar, el pedido se conserva igual (no sale «El pedido NO se envió»)', r2.copia && r2.enCola, r2);
  chk('2b para eso se borró la copia de la planilla (se vuelve a bajar sola)', !r2.copiaSigue && r2.sucio, r2);
  chk('2c la copia que no entra no le quita el lugar a la cola', r2.colaSigue, r2);
  await ctx.close();

  // ---------- 3. la lectura sin cambios ----------
  ({ ctx, page } = await abrir(false));
  const r3 = await page.evaluate(async () => {
    const out = {};
    /* _igual en apiList: se simula la respuesta de «lo cambiado» del servidor y la copia `LISTA_BASE`. */
    const base = STATE.slice(), apA = apiPost, ad = listaAplicarDelta, B0 = LISTA_BASE;
    const probar = async (resp, conBase) => {
      LISTA_BASE = conBase ? { ahora: 1000, filas: {}, orden: [] } : null;
      apiPost = () => Promise.resolve(Object.assign({ ok: true, delta: true }, resp));
      listaAplicarDelta = () => JSON.parse(JSON.stringify(base));
      const j = await apiListReal({ desde: 1 }); return !!(j && j.pedidos && j.pedidos._igual);
    };
    out.vacio = await probar({ pedidos: [], borrados: [], ahora: 2000 }, true);
    out.conFila = await probar({ pedidos: [{ id: 'v1' }], borrados: [], ahora: 2000 }, true);
    out.conBorrado = await probar({ pedidos: [], borrados: ['v1'], ahora: 2000 }, true);
    out.relojAtras = await probar({ pedidos: [], borrados: [], ahora: 500 }, true);
    out.sinBase = await probar({ pedidos: [], borrados: [], ahora: 2000 }, false);
    apiPost = apA; listaAplicarDelta = ad; LISTA_BASE = B0;
    return out;
  }).catch(e => ({ error: String(e) }));
  chk('3a `_igual` solo cuando «lo cambiado» vino vacío, con copia y el reloj no fue para atrás', r3.vacio === true && !r3.conFila && !r3.conBorrado && !r3.relojAtras && !r3.sinBase, r3);

  const r3b = await page.evaluate(async () => {
    const out = {}, set = Storage.prototype.setItem; let escrituras = 0;
    Storage.prototype.setItem = function (k, v) { if (k === LS_KEY) escrituras++; return set.call(this, k, v); };
    let pintadas = 0; const ar = autoRepintar; autoRepintar = function () { pintadas++; return ar.apply(this, arguments); };
    let badges = 0; const nb = nxBadges; nxBadges = function () { badges++; return nb.apply(this, arguments); };
    const igual = () => { const L = JSON.parse(JSON.stringify(window.__L)); Object.defineProperty(L.pedidos, '_igual', { value: true }); return Promise.resolve(L); };
    const distinta = () => Promise.resolve(JSON.parse(JSON.stringify(window.__L)));
    const ronda = async (fn) => { apiList = fn; escrituras = 0; pintadas = 0; badges = 0; await autoRefrescar('prueba'); return { escrituras, pintadas, badges }; };
    for (const v of ['form', 'mis', 'conta']) {
      showView(v); await ronda(distinta);                        // una lectura con cambios: pinta y escribe
      out[v] = await ronda(igual);                               // la siguiente, sin cambios
    }
    showView('admin'); UNLOCKED = true; await ronda(distinta); out.admin = await ronda(igual);
    showView('mis'); await ronda(distinta); AUTO_PINTADO_T = Date.now() - 6 * 60000; out.cinco = await ronda(igual);   // pasaron 6 minutos
    /* H2: un cambio de STATE que no repintó (acá: lo de la relectura de un borrado, que no pasa por autoRepintar) */
    showView('conta'); await ronda(distinta); await ronda(igual);
    saveMirror(); out.h2 = await ronda(igual);                   // algo cambió STATE y lo guardó: la siguiente «sin cambios» repinta
    out.h2despues = await ronda(igual);                          // y después vuelve a esperar
    /* La junta saca un pedido (otro equipo lo borró): la lectura «sin cambios» del servidor igual repinta */
    await ronda(distinta);
    const L2 = JSON.parse(JSON.stringify(window.__L)); L2.pedidos = L2.pedidos.filter(p => p.id !== 'v5'); Object.defineProperty(L2.pedidos, '_igual', { value: true });
    out.saca = await ronda(() => Promise.resolve(L2));
    Storage.prototype.setItem = set; autoRepintar = ar; nxBadges = nb;
    return out;
  });
  for (const v of ['form', 'mis', 'conta']) chk('3b ' + v + ': la lectura sin cambios no reescribe la copia ni repinta', r3b[v].escrituras === 0 && r3b[v].pintadas === 0, r3b[v]);
  chk('3c los números de las pestañas no se recalculan a cada rato', r3b.form.badges === 0 && r3b.mis.badges === 0, [r3b.form.badges, r3b.mis.badges]);
  chk('3d Administración se repinta siempre (el GPS llega con cada lectura)', r3b.admin.pintadas === 1, r3b.admin);
  chk('3e a los 5 minutos repinta igual', r3b.cinco.pintadas === 1, r3b.cinco);
  chk('3f H2: si STATE cambió sin repintar, la siguiente «sin cambios» repinta, y después vuelve a esperar', r3b.h2.pintadas === 1 && r3b.h2despues.pintadas === 0, [r3b.h2, r3b.h2despues]);
  chk('3g si la junta saca un pedido, repinta y guarda la copia', r3b.saca.pintadas === 1 && r3b.saca.escrituras === 1, r3b.saca);
  await ctx.close();

  // ---------- 4. de a partes ----------
  ({ ctx, page } = await abrir(true));
  const r4 = await page.evaluate(async () => {
    const out = {}, filas = () => document.querySelectorAll('#tbl-conta tbody tr:not(.trz)'), espera = ms => new Promise(r => setTimeout(r, ms));
    showView('conta'); await espera(100);
    out.total = contaLista().length;   // las ventas del mes que muestra Contabilidad (las 160 + una de los casos de la copia)
    out.primero = filas().length; out.boton = (document.querySelector('#tbl-conta .trz-btn') || {}).textContent || '';
    document.querySelector('#tbl-conta .trz-btn').click(); await espera(60);
    out.trasBoton = filas().length;
    const ids = [...filas()].map(tr => tr.getAttribute('onclick')); out.repetidas = ids.length - new Set(ids).size;
    /* H1: llega una lectura con cambios estando abajo de todo */
    const tw = document.getElementById('cx-tw'); window.scrollTo(0, document.body.scrollHeight); await espera(50);
    const y0 = window.scrollY; autoRepintar(); await espera(60);
    out.trasRepintar = filas().length; out.y = [y0, window.scrollY];
    /* el resto llega solo al acercarse al final */
    for (let k = 0; k < 50 && document.querySelector('#tbl-conta tr.trz'); k++) { document.querySelector('#tbl-conta tr.trz').scrollIntoView(); await espera(100); }   // hasta 5 s (con la máquina cargada el observador tarda)
    await espera(150);
    out.alFinal = filas().length; out.quedaBoton = !!document.querySelector('#tbl-conta tr.trz');
    /* con la 1ª columna escondida, el botón se ve */
    window.scrollTo(0, 0); showView('mis'); showView('conta');   // arriba de todo, como al cambiar de pestaña (con la página abajo, el observador trae el trozo siguiente enseguida, y está bien)
    for (let k = 0; k < 30 && filas().length > 60; k++) await espera(50);   // Contabilidad relee la planilla y recién dibuja
    out.vuelveAlPrimero = filas().length;
    await espera(80);
    tblColTocar('conta', 0, false); renderConta(); await espera(60);
    const m = document.querySelector('#tbl-conta tr.trz'); out.conColumna = m ? Math.round(m.getBoundingClientRect().height) : -1;
    tblColTocar('conta', 0, true);
    /* Mis pedidos: 30 tarjetas y el marcador; los números siguen al cargar más */
    showView('mis'); await espera(100);
    const tarj = () => document.querySelectorAll('#mis-lista > .cho-card');
    out.mis = tarj().length; document.querySelector('#mis-lista .trz-btn').click(); await espera(60);
    out.misMas = tarj().length; out.misUnicas = new Set([...tarj()].map(c => c.outerHTML.length + c.textContent.slice(0, 60))).size;
    return out;
  });
  chk('4a Contabilidad: primero 50 filas y «Ver más»', r4.primero === 50 && /Ver 100 más/.test(r4.boton), r4);
  chk('4b «Ver más» agrega 100, sin repetir ninguna', r4.trasBoton === 150 && r4.repetidas === 0, [r4.trasBoton, r4.repetidas]);
  chk('4c H1: una lectura con cambios no vuelve al primer trozo ni sube la página', r4.trasRepintar === 150 && Math.abs(r4.y[1] - r4.y[0]) < 5, [r4.trasRepintar, r4.y]);
  chk('4d el resto llega solo al acercarse al final (' + r4.total + ')', r4.total > 150 && r4.alFinal === r4.total && !r4.quedaBoton, [r4.alFinal, r4.total, r4.quedaBoton]);
  chk('4e otra pestaña y volver: arranca otra vez por el primer trozo', r4.vuelveAlPrimero === 50, r4.vuelveAlPrimero);
  chk('4f con «Ingresado» escondida, el botón se sigue viendo', r4.conColumna > 30, r4.conColumna);
  chk('4g Mis pedidos: 30 tarjetas y «Ver más» agrega el resto, sin repetir', r4.mis === 30 && r4.misMas > 30 && r4.misUnicas === r4.misMas, [r4.mis, r4.misMas, r4.misUnicas]);
  await ctx.close();
  ({ ctx, page } = await abrir(false));
  const r4b = await page.evaluate(async () => { showView('conta'); await new Promise(r => setTimeout(r, 100)); return { filas: document.querySelectorAll('#tbl-conta tbody tr').length, total: contaLista().length, trz: document.querySelectorAll('.trz').length }; });
  chk('4h sin TROZOS_PRUEBA (las pruebas de siempre) se dibuja todo de una', r4b.total > 150 && r4b.filas === r4b.total && r4b.trz === 0, r4b);

  // ---------- 5. detalles ----------
  const r5 = await page.evaluate(() => {
    const p = getComputedStyle(document.getElementById('admin-pass')), sem = document.getElementById('adm-semana');
    sem.hidden = true; const semD = getComputedStyle(sem).display;
    const sm = document.createElement('div'); sm.className = 'af-tb'; sm.innerHTML = '<button><small>A mañana</small></button>'; document.body.appendChild(sm);
    const ws = getComputedStyle(sm.querySelector('small')).whiteSpace; sm.remove();
    return { alto: p.height, radio: p.borderTopLeftRadius, borde: p.borderTopStyle, semD, ws };
  });
  chk('5a la contraseña de Administración con el estilo de los demás campos (48 px, redondeada)', r5.alto === '48px' && parseFloat(r5.radio) >= 8 && r5.borde === 'solid', r5);
  chk('5b «Semana» escondida no deja una barra vacía', r5.semD === 'none', r5.semD);
  chk('5c «A mañana» en un solo renglón', r5.ws === 'nowrap', r5.ws);
  await ctx.close();

  chk('sin errores de la página', errores.length === 0, errores.slice(0, 3));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
