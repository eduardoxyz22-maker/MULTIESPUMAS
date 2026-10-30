/* 📦 «EL CLIENTE AVISA CUÁNDO» (30/10, propuesta 76; servidor 2026-10-30-a).

   El problema (octubre, real): ventas pagadas cuyo cliente todavía no eligió el día. El formulario obliga a una fecha y las vendedoras
   ponían una inventada (30-31 del mes) y la corrían a mano: 12 ventas (Bs 84.226) con fecha 32-82 días después de cargarlas. El bot le
   mandaba al cliente confirmación, cambio y recordatorio con días que nadie eligió, ocupaban cupo, daban «no hay» en rojo, salían en
   «sin camión» y «pedir hoy», y una se mandó a fabricar apurada.

   Lo que esta prueba cuida (la página y el .gs de verdad, con un Google y un Meta de mentira: ningún mensaje sale de verdad):
     1. El servidor solo: la versión (las tres iguales), el bot CALLADO con una venta «avisa cuándo» (ni confirmación, ni pedido nuevo,
        ni recordatorio, ni «sin camión», ni «pedir hoy», ni el cierre de las 19:00), el portero no la cuenta, al ponerle el día sale la
        CONFIRMACIÓN (no un «cambio»), una página sin `av` (sin F5) no le puede poner un día (`actualizar`) pero sí guardar otra cosa,
        lo que le dice Claude, y que con fecha puesta la marca no manda.
     2. La página: la casilla (solo en 📄 OC, no en ATC/RPT/tienda), «Volver a llamar el…» obligatorio y desde mañana, sin turno; se
        guarda sin fecha y con `avisa` en los productos, sin cupo ni camión; las etiquetas de Mis pedidos y Administración; nada de carga,
        mapa, «Semana», cierre, «Mañana», bot, atraso ni «no hay» rojo; el stock la aparta DESPUÉS de las que tienen día; «📞 Llamá a…» el
        día de volver a llamar; y al sacar la casilla y poner el día, el bot manda la confirmación con ese día.
     3. La misma regla en la página y en el .gs (`entregaAConfirmar` / `entregaAConfirmar_`).
     4. La página de antes (sin F5): no la cuenta en el cupo, abre la venta con hoy y no deja guardar sin elegir; si elige un día, el
        servidor nuevo contesta `actualizar` y la fila queda como estaba. Y la página nueva con el servidor de HOY (29-b): anda igual.
   Datos SINTÉTICOS (el repo es público). Reloj clavado en el martes 10/11/2026, 10:00 de Bolivia.

   Se corre:  node tests/test_avisa_cuando.js   (desde la raíz del repo, con HTTPS_PROXY=http://127.0.0.1:9 como toda la batería)
   Dientes:   PEDIDOS=/ruta/al/pedidos_viejo.html GS=/ruta/al/gs_viejo.gs node tests/test_avisa_cuando.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const PEDIDOS = process.env.PEDIDOS || path.resolve('pedidos.html');
const GS = process.env.GS || path.resolve('google-apps-script.gs');
const VIEJO_SHA = process.env.VIEJO || '2f9ad92';        // la página y el servidor de antes de esto (29-b)
let PASS = 0, FAIL = 0;
const chk = (l, c, e) => { c ? PASS++ : FAIL++; console.log((c ? '✓' : '✗'), l, e != null ? ('· ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 420)) : ''); };

const HDR = ['id','Fecha','N° OC','Vendedor','Cliente','Productos','Celular','Turno','Zona','Dirección','Link Maps','Pagado','Saldo (Bs)','ts',
  '_productos_json','Método pago','Observaciones','Estado stock','Entregado','Vehículo','Chofer','Garantía (a nombre de)','Nota de venta',
  'A cuenta (Bs)','Facturar a','NIT','N° del día','Verificado','Fotos entrega','Revisión'];
function hacerPlanilla(filas) {
  const datos = filas.map(f => f.slice());
  return {
    _datos: datos,
    getLastRow: () => datos.length, getLastColumn: () => (datos[0] || []).length,
    getDataRange: () => ({ getValues: () => datos.map(f => f.slice()) }),
    setFrozenRows: () => {}, appendRow: (r) => { datos.push(r.slice()); },
    deleteRow: (n) => { datos.splice(n - 1, 1); }, deleteRows: (n, k) => { datos.splice(n - 1, k); },
    getRange: (fila, col, nFilas, nCols) => ({
      getValue: () => (datos[fila - 1] || [])[col - 1],
      setValue: (v) => { if (!datos[fila - 1]) datos[fila - 1] = []; datos[fila - 1][col - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nFilas || 1); i++) { const f = datos[fila - 1 + i] || [], r = []; for (let j = 0; j < (nCols || 1); j++) r.push(f[col - 1 + j]); out.push(r); } return out; },
      setValues: (v) => { for (let i = 0; i < v.length; i++) { const r = datos[fila - 1 + i] || (datos[fila - 1 + i] = []); for (let j = 0; j < v[i].length; j++) r[col - 1 + j] = v[i][j]; } },
      setFontWeight: () => {}, setNumberFormat: () => {}
    })
  };
}
/* El reloj del servidor: hora de Bolivia (UTC−4) escrita como '2026-11-10 10:00'. La página tiene el suyo (page.clock). */
const RELOJ = { ms: 0 };
const poner = (txt) => { RELOJ.ms = Date.parse(txt.replace(' ', 'T') + ':00-04:00'); };
const pasar = (min) => { RELOJ.ms += min * 60000; };
class FakeDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(RELOJ.ms); }
  static now() { return RELOJ.ms; }
}
const ON = { WA_ACTIVO: '1', WA_TOKEN: 'tok-de-mentira', WA_PHONE_ID: '1234567890', WA_LOGISTICA: 'Ernesto:59171000001, David:59172000002' };
function servidor(src, props) {
  const sh = hacerPlanilla([HDR]), hojas = {}, P = Object.assign({}, props || {});
  const meta = { llamadas: [], n: 0 };
  const ctx = {
    console, Date: FakeDate, JSON, Math, Number, String, Array, Object, RegExp, encodeURIComponent,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => n === 'Pedidos' ? sh : (hojas[n] || null), insertSheet: (n) => (hojas[n] = hacerPlanilla([])) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => P[k] != null ? P[k] : null, setProperty: (k, v) => { P[k] = String(v); },
      deleteProperty: (k) => { delete P[k]; }, setProperties: (o) => Object.assign(P, o), getProperties: () => Object.assign({}, P) }) },
    UrlFetchApp: { fetch: (url, o) => { const body = (o && o.payload) ? JSON.parse(o.payload) : null; meta.llamadas.push({ url, body });
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ messages: [{ id: 'wamid.' + (++meta.n) }] }) }; } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock() { return true; } }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, putAll() {}, remove() {}, removeAll() {}, getAll: () => ({}) }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    DriveApp: { getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ getId: () => 'f' }), getFileById: () => { throw new Error('no'); } },
    Utilities: { formatDate: (d) => String(d), base64Decode: () => [], newBlob: () => ({}) },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'ABCDEFGH' },
    Logger: { log() {} },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }), everyMinutes: () => ({ create: () => ({}) }), everyDays: () => ({ atHour: () => ({ create: () => ({}) }) }) }) }),
                 getProjectTriggers: () => [], deleteTrigger: () => {} }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const postTxt = (txt) => ctx.doPost({ postData: { contents: txt }, parameter: {} })._t;
  const post = (b) => JSON.parse(postTxt(JSON.stringify(b)));
  const guardar = (rec, extra) => { const r = post(Object.assign({ action: 'save', pedido: rec }, extra || {})); if (r.ok) rec.rev = r.pedido.rev; return r; };
  const leer = (id) => { const f = sh._datos.find(x => x[0] === id); return f ? ctx.rowToRec_(f) : null; };
  const filas = () => sh._datos.slice(1).map(r => ctx.rowToRec_(r));
  const cola = () => { try { return JSON.parse(P.WA_COLA || '[]'); } catch (e) { return []; } };
  const salen = () => meta.llamadas.filter(c => c.body && c.body.template).map(c => ({ to: c.body.to, pl: c.body.template.name.replace(/_v2$/, ''), p: c.body.template.components[0].parameters.map(x => x.text) }));
  return { ctx, sh, P, meta, postTxt, post, guardar, leer, filas, cola, salen, limpiar: () => { meta.llamadas.length = 0; }, version: ctx.SCRIPT_VERSION };
}
let nId = 0;
const PROD = (o) => Object.assign({ desc: 'TITANIO ICE', medida: '160x190', codigo: 'CH1201', cant: 1, precio: 4000 }, o || {});
function ped(o) {
  return Object.assign({ id: 'p' + (++nId), fecha: '2026-11-11', oc: '11-0' + (40 + nId), vendedor: 'Carola Chavez', cliente: 'CLIENTE ' + nId,
    productos: [PROD()], celular: '70111' + String(100 + nId), turno: 'AM', zona: 'Equipetrol', direccion: 'Calle inventada ' + nId, maps: '',
    pagado: false, saldo: 1000, ts: RELOJ.ms, metodoPago: 'Efectivo 3000', observaciones: '', estado: '', entregado: false, vehiculo: '', chofer: '',
    garantia: '', nota: String(5000 + nId), acuenta: 3000, facturarA: '', nit: '', rev: 0 }, o || {});
}
/* Una venta «avisa cuándo» como la guarda la página: sin fecha ni turno y con `avisa` en TODOS los productos. */
function pedAvisa(dia, o) {
  const p = ped(Object.assign({ fecha: '', turno: '' }, o || {}));
  p.productos = (p.productos || []).map(x => Object.assign({}, x, { avisa: dia }));
  return p;
}
const HOY = '2026-11-10', PROX = '2026-11-11', LLAMAR = '2026-11-16', ELIGE = '2026-11-18';
/* Contra el código de ANTES (dientes) las funciones nuevas no existen: que den rojo, no que corten la prueba. */
const gem = (Srv, p) => (typeof Srv.ctx.entregaAConfirmar_ === 'function') ? Srv.ctx.entregaAConfirmar_(p) : null;

(async () => {
  // ══ 1. El servidor solo ═══════════════════════════════════════════════════════════════════════════
  console.log('\n── 1. El servidor: el bot callado, el portero, la confirmación al ponerle el día y la página vieja ──');
  const SRC = fs.readFileSync(GS, 'utf8');
  {
    const ph = fs.readFileSync(PEDIDOS, 'utf8');
    const vG = (SRC.match(/var SCRIPT_VERSION = '([^']+)'/) || [])[1], vE = (SRC.match(/var ESTA_VERSION = '([^']+)'/) || [])[1], vP = (ph.match(/var SCRIPT_VERSION_ESPERADA='([^']+)'/) || [])[1];
    chk('⚠️ 1a. la versión es 2026-10-30-a en SCRIPT_VERSION, ESTA_VERSION (adentro de probarAntesDeImplementar) y SCRIPT_VERSION_ESPERADA de la página',
        vG === '2026-10-30-a' && vE === vG && vP === vG, { vG, vE, vP });
  }
  poner(HOY + ' 10:00');
  let S = servidor(SRC, ON);
  chk('⚠️ 1b. el .gs tiene la gemela `entregaAConfirmar_` (y `avisaDe_`)', typeof S.ctx.entregaAConfirmar_ === 'function' && typeof S.ctx.avisaDe_ === 'function');
  const A1 = pedAvisa(LLAMAR, { cliente: 'CLIENTE AVISA UNO' });
  let r = S.guardar(A1);
  chk('⚠️ 1c. guardar una venta «avisa cuándo» (sin fecha, con `avisa` en los productos) entra, y el bot NO anota nada (ni confirmación, ni pedido nuevo a logística)',
      r.ok && S.cola().length === 0 && S.leer(A1.id).fecha === '' && (S.leer(A1.id).productos || []).every(x => x.avisa === LLAMAR), { ok: r.ok, cola: S.cola() });
  pasar(3); S.ctx.waRepaso();
  chk('…a los 3 minutos el repaso no le manda nada a nadie', S.salen().length === 0, S.salen());
  A1.observaciones = 'llamar despues del 15'; r = S.guardar(A1);
  chk('…corregirla (otra observación) tampoco: sigue sin fecha, sin cola', r.ok && S.cola().length === 0 && S.leer(A1.id).fecha === '', S.cola());
  chk('1d. la gemela: «avisa cuándo» = sin fecha + `avisa` + no entregada, ni ATC/RPT, ni venta de tienda, ni fila del sistema',
      gem(S, A1) === true && gem(S, Object.assign({}, A1, { fecha: ELIGE })) === false && gem(S, Object.assign({}, A1, { entregado: true })) === false &&
      gem(S, Object.assign({}, A1, { oc: 'ATC 11-001' })) === false && gem(S, Object.assign({}, A1, { direccion: 'SALIÓ DE TIENDA · Central' })) === false &&
      gem(S, Object.assign({}, A1, { id: '__stock__' })) === false && gem(S, ped({ fecha: '' })) === false);
  // El portero: 12 entregas de la mañana del próximo día + la venta sin día → la 12ª entra igual (la sin día no cuenta) y la 13ª no
  const lleno = [];
  S.P.WA_ACTIVO = '0';                                                        // estas entregas se cargan con el bot apagado: así nadie las «confirmó hoy» (1g)
  for (let i = 0; i < 11; i++) { const q = ped({ fecha: PROX, turno: 'AM' }); lleno.push(S.guardar(q).ok); }
  for (let i = 0; i < 3; i++) S.guardar(pedAvisa(LLAMAR));                  // más ventas sin día
  const doce = S.guardar(ped({ fecha: PROX, turno: 'AM' })), trece = S.guardar(ped({ fecha: PROX, turno: 'AM' }));
  S.P.WA_ACTIVO = '1';
  chk('⚠️ 1e. el portero no cuenta las ventas sin día: con 11 entregas de la mañana y 4 «avisa cuándo», la 12ª entra y la 13ª da «cupos_llenos (12/12)»',
      lleno.every(Boolean) && doce.ok && trece.ok === false && trece.error === 'cupos_llenos' && trece.usados === 12, [doce.ok, trece]);
  // «sin camión» a las 16:00 y el recordatorio de las 17:00 (los pedidos del próximo día sí; la venta sin día no aparece)
  S.limpiar(); poner(HOY + ' 16:05'); S.ctx.waRepaso();
  const sc = S.salen().filter(m => m.pl === 'logistica_sin_camion');
  chk('⚠️ 1f. 16:00 «sin camión»: lista las 12 entregas del próximo día y NINGUNA venta sin día', sc.length === 2 && sc[0].p[0] === '12' && !/AVISA/.test(sc[0].p[2]), sc.map(m => m.p));
  S.limpiar(); poner(HOY + ' 17:05'); S.ctx.waRepaso();
  const rec = S.salen().filter(m => m.pl === 'recordatorio_entrega');
  chk('⚠️ 1g. 17:00 recordatorio: sale a los clientes de las entregas del próximo día y a NINGUNA venta sin día', rec.length === 12 && rec.every(m => m.to !== S.ctx.waCel_(A1.celular)), rec.length);
  // «pedir hoy» y el cierre de las 19:00
  const B = { hoy: HOY, hora: 15.9 };
  const conRev = ped({ fecha: PROX, productos: [PROD({ desc: 'TITANIO LATEX', codigo: 'CH1' })] });   // sin marcar = ⬜ por revisar
  const avRev = pedAvisa(LLAMAR, { productos: [PROD({ desc: 'TITANIO LATEX', codigo: 'CH1', chk: 'no' })] });
  const urg = S.ctx.waPhUrgentes_([conRev, avRev], B);
  chk('⚠️ 1h. «pedir hoy» (waPhUrgentes_, la lista de «Semana»): la entrega del próximo día sí; la venta sin día con «no hay» NO', urg.length === 1 && urg[0].p.id === conRev.id, urg.map(u => u.p.id));
  const cie = S.ctx.waCierreFaltan_([ped({ fecha: HOY }), pedAvisa(LLAMAR)], HOY);
  chk('1i. el cierre de las 19:00 (entregas de hoy sin ✅): la venta sin día no está', cie.length === 1 && gem(S, cie[0]) === false, cie.length);
  // Ponerle el día: CONFIRMACIÓN (no cambio)
  S.limpiar(); poner(HOY + ' 11:00');
  const A1b = JSON.parse(JSON.stringify(S.leer(A1.id)));
  A1b.fecha = ELIGE; A1b.turno = 'PM'; A1b.productos.forEach(x => { delete x.avisa; });
  r = S.guardar(A1b, { av: 1 });
  const ev = S.cola().find(c => c.id === A1.id);
  chk('⚠️ 1j. al ponerle el día (la página nueva, con `av`) entra, le da su N° del día y el bot lo anota como NUEVO («n»), no como cambio',
      r.ok && S.leer(A1.id).fecha === ELIGE && S.leer(A1.id).nroDia > 0 && ev && ev.t === 'n', { ok: r.ok, ev, nro: S.leer(A1.id).nroDia });
  pasar(3); S.ctx.waRepaso();
  const sal = S.salen(), conf = sal.filter(m => m.pl === 'confirmacion_pedido'), camb = sal.filter(m => m.pl === 'cambio_entrega'), ln = sal.filter(m => m.pl === 'logistica_pedido_nuevo');
  chk('⚠️ …y a los 2 minutos sale la CONFIRMACIÓN al cliente con el día verdadero («miércoles 18/11 por la tarde»), «pedido nuevo» a logística y NINGÚN «cambio de día»',
      conf.length === 1 && conf[0].to === S.ctx.waCel_(A1.celular) && /miércoles 18\/11 por la tarde/.test(conf[0].p.join(' | ')) && camb.length === 0 && ln.length === 2,
      sal.map(m => m.pl + ':' + m.p.slice(0, 7).join('/')));
  // La página vieja: sin `av` no le pone día; otra cosa sí
  const A2 = pedAvisa(LLAMAR, { cliente: 'CLIENTE AVISA DOS' }); S.guardar(A2);
  const vieja = JSON.parse(JSON.stringify(S.leer(A2.id)));
  vieja.fecha = PROX; vieja.turno = 'AM'; vieja.productos.forEach(x => { delete x.avisa; });   // lo que arma la página sin F5: rehace los productos sin la marca
  const revAntes = S.leer(A2.id).rev;
  r = S.guardar(vieja);
  chk('⚠️ 1k. una página SIN F5 (sin `av`) que le pone un día a una venta «avisa cuándo» recibe `actualizar` y la hoja queda igual (sin fecha, con la marca, el mismo sello)',
      r.ok === false && r.error === 'actualizar' && S.leer(A2.id).fecha === '' && S.leer(A2.id).productos.every(x => x.avisa === LLAMAR) && S.leer(A2.id).rev === revAntes && S.cola().every(c => c.id !== A2.id), r);
  const pago = JSON.parse(JSON.stringify(S.leer(A2.id))); pago.metodoPago = 'Efectivo 3000 + Efectivo 1000'; pago.saldo = 0; pago.pagado = true;
  r = S.guardar(pago);
  chk('…pero la misma página vieja SÍ puede guardar otra cosa de esa venta sin tocarle la fecha (un pago): entra y la marca sigue', r.ok && S.leer(A2.id).pagado && S.leer(A2.id).productos.every(x => x.avisa === LLAMAR), r.ok);
  const nueva = JSON.parse(JSON.stringify(S.leer(A2.id))); nueva.fecha = PROX; nueva.turno = 'PM'; nueva.productos.forEach(x => { delete x.avisa; });
  r = S.guardar(nueva, { av: 1 });
  chk('…y la página nueva (con `av`) sí le pone el día', r.ok && S.leer(A2.id).fecha === PROX, r.ok);
  // Lo que le dice Claude
  poner(HOY + ' 12:00');
  const txtA = S.ctx.iaPedidoTxt_(pedAvisa(LLAMAR), S.ctx.waBo_(RELOJ.ms)), txtN = S.ctx.iaPedidoTxt_(ped({ fecha: '' }), S.ctx.waBo_(RELOJ.ms));
  chk('1l. Claude (iaPedidoTxt_): a una venta «avisa cuándo» le dice «el cliente nos avisa cuándo la quiere»; a una sin fecha cualquiera, lo de siempre',
      /el cliente nos avisa cuándo la quiere/.test(txtA) && /todavía sin día de entrega agendado/.test(txtN) && !/avisa cuándo/.test(txtN), txtA.split('\n').filter(l => /Entrega/.test(l)).join(' | '));
  // probarAntesDeImplementar
  const pr = S.ctx.probarAntesDeImplementar();
  chk('1m. probarAntesDeImplementar dice cuántas ventas «avisa cuándo» hay (las 3 de 1e) y sigue sin faltar ninguna función',
      pr.lineas.some(l => /✅ Ventas «el cliente avisa cuándo».*: 3\./.test(l)) && !pr.lineas.some(l => /Faltan funciones/.test(l)), pr.lineas.filter(l => /avisa|Faltan/.test(l)));

  // ══ 2. La página contra el servidor nuevo ═════════════════════════════════════════════════════════
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errores = [];
  const K = 'TITANIO ICE|160X190';
  const stockDe = (n) => ({ id: '__stock__', fecha: '', cliente: '📦 STOCK', rev: 0, observaciones: JSON.stringify({
    c: { f: HOY, hora: '09:00:00', u: { [K]: n }, solo0: true, alm: 'PRODUCTOS TERMINADOS FAB.', t: Date.parse(HOY + 'T09:00:00-04:00'), incT: '' },
    e: [], p: [], a: {}, g: {}, al: { 'PRODUCTOS TERMINADOS FAB.': 'log' }, h: [], v: 2, pv: 3 }) });
  function INIT(vend) {
    try { localStorage.setItem('me_mis_vendedor', vend); sessionStorage.setItem('me_quien_ok', '1'); localStorage.setItem('me_asis_tour', '1'); } catch (e) {}
    window.__ctl = { saves: [] };
    window.esperar = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); };
    window.fetch = function (url, o) {
      var body = (o && o.body) || '{}', P = {}; try { P = JSON.parse(body); } catch (e) {}
      if (P.action === 'save') window.__ctl.saves.push(P);
      return window.__gs(body).then(function (t) { return { ok: true, status: 200, json: function () { return Promise.resolve(JSON.parse(t)); }, text: function () { return Promise.resolve(t); } }; });
    };
  }
  const abrir = async (Srv, archivo, vend, reloj) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/La_Paz' });
    await context.exposeFunction('__gs', (body) => Srv.postTxt(body));
    await context.addInitScript(INIT, vend || 'Carola Chavez');
    await context.route(/^https?:/, rr => rr.abort());
    const p = await context.newPage();
    p.setDefaultTimeout(8000);
    const ev0 = p.evaluate.bind(p);
    p.evaluate = (fn, arg) => ev0(fn, arg).catch(e => ({ __err: String((e && e.message) || e).slice(0, 160) }));   // contra el código de antes: rojo, no corte
    p.__dialogos = [];
    p.on('pageerror', e => errores.push((archivo === PEDIDOS ? 'nueva' : 'vieja') + ': ' + e.message));
    p.on('dialog', d => { p.__dialogos.push(d.message()); d.accept(); });
    await p.clock.setFixedTime(new Date((reloj || HOY + 'T10:00:00') + '-04:00'));
    await p.goto('file://' + archivo, { waitUntil: 'load' });
    await p.waitForTimeout(400);
    await p.evaluate(async () => {
      CONNECTED = true;
      if (typeof AUTO_TIMER !== 'undefined' && AUTO_TIMER) clearInterval(AUTO_TIMER);
      CARGA_GEN++; CARGA_ESTADO = 'ok';
      if (CARGA_TIMER) { clearTimeout(CARGA_TIMER); CARGA_TIMER = null; }
      if (CARGA_TIC) { clearInterval(CARGA_TIC); CARGA_TIC = null; }
      await refrescarEstado(); ULTIMO_ERROR = '';
      window._esperarGuardado = async function () { for (var i = 0; i < 80; i++) { await esperar(50); if (!Object.keys(SAVE_EN_VUELO || {}).length && !Object.keys(SAVE_EN_ESPERA || {}).length && !document.getElementById('f-submit').disabled) break; } await esperar(250); };
      window._toast = function () { var t = document.getElementById('toast'); return t ? t.textContent : ''; };
    });
    return { context, p };
  };
  /* Escribir en un campo; si está tapado o escondido (contra el código de antes), se escribe igual por JavaScript: rojo, no corte. */
  const rellenar = async (P, sel, v) => { try { await rellenar(P, sel, v, { timeout: 3000 }); } catch (e) {
    await P.evaluate((a) => { var x = document.querySelector(a.sel); if (x) { x.value = a.v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); } }, { sel, v }); } };
  const nuevoForm = async (P) => { await P.evaluate(() => { if (document.getElementById('modal').classList.contains('on')) closeModal(); showView('form'); resetForm(); }); };
  const llenar = async (P, cli) => {
    await rellenar(P, '#f-nota', String(6000 + Math.floor(Math.random() * 900)));
    await rellenar(P, '#f-cliente', cli);
    await rellenar(P, '#f-celular', '7' + String(1000000 + Math.floor(Math.random() * 8999999)));
    await rellenar(P, '#f-productos .prod-codigo', 'CH1201');
    await rellenar(P, '#f-productos .prod-cant', '1');
    await rellenar(P, '#f-zona', 'Norte');
    await rellenar(P, '#f-saldo', '3000');
    await P.waitForTimeout(300);
  };
  const guardar = async (P) => {
    await P.evaluate(() => { var m = document.getElementById('modal'); if (m && m.classList.contains('on')) closeModal(); });
    try { await P.click('#f-submit', { timeout: 4000 }); } catch (e) { await P.evaluate(() => submitPedido()); }   // contra el código de antes, algo puede tapar el botón
    await P.waitForTimeout(300); await P.evaluate(() => _esperarGuardado());
  };
  const tildar = async (P, on) => { await P.evaluate((on) => { var c = document.getElementById('f-avisa'); if (c.checked !== on) { c.checked = on; avisaFormCambio(); } }, on); };

  console.log('\n── 2. La página: la casilla, el guardado, las etiquetas, lo que no aparece, el stock y ponerle el día ──');
  poner(HOY + ' 10:00');
  S = servidor(SRC, ON);
  S.guardar(stockDe(1));
  const dia = ped({ fecha: PROX, turno: 'AM', cliente: 'CLIENTE CON DIA' }); S.guardar(dia);   // una entrega con día del mismo producto
  let { context: c1, p: V } = await abrir(S, PEDIDOS, 'Carola Chavez');
  await nuevoForm(V);
  let f = await V.evaluate(() => { var w = document.getElementById('f-avisa-wrap'); var vis = function () { return !!w && !w.hidden && w.offsetParent !== null; };
    var r = { oc: vis() }; segSet('f-doc-tipo', 'ATC'); pintarDocTipo(true); r.atc = vis(); segSet('f-doc-tipo', 'RPT'); pintarDocTipo(true); r.rpt = vis();
    segSet('f-doc-tipo', 'OC'); pintarDocTipo(true); r.oc2 = vis(); VENTA_TIENDA = true; pintarModoTienda(); r.tienda = vis(); VENTA_TIENDA = false; pintarModoTienda(); r.oc3 = vis(); return r; });
  chk('⚠️ 2a. la casilla «📦 El cliente avisa cuándo» está en un pedido (📄 OC) y NO en ATC, RPT ni venta de tienda', f.oc && !f.atc && !f.rpt && f.oc2 && !f.tienda && f.oc3, f);
  await llenar(V, 'CLIENTE AVISA FORM');
  await tildar(V, true);
  f = await V.evaluate(() => ({ lb: document.getElementById('f-fecha-lbt').textContent, fecha: document.getElementById('f-fecha').value,
    turnoVis: document.getElementById('f-turno').closest('.field').offsetParent !== null, info: !document.getElementById('f-avisa-info').hidden,
    cupo: document.getElementById('cupo-form').textContent }));
  chk('⚠️ 2b. tildada: la fecha se llama «Volver a llamar el…» y queda vacía, el turno no se pide, y el cartel de cupos dice que no ocupa cupo',
      f.lb === 'Volver a llamar el…' && f.fecha === '' && !f.turnoVis && f.info && /no ocupa cupo/.test(f.cupo), f);
  await guardar(V);
  f = await V.evaluate(() => ({ t: _toast(), n: STATE.filter(function (p) { return p.cliente === 'CLIENTE AVISA FORM'; }).length }));
  chk('2c. sin el día de volver a llamar no guarda («Poné el día en que vas a volver a llamar al cliente»)', /volver a llamar/.test(f.t) && f.n === 0, f);
  await rellenar(V, '#f-fecha', HOY); await guardar(V);
  f = await V.evaluate(() => ({ t: _toast(), n: STATE.filter(function (p) { return p.cliente === 'CLIENTE AVISA FORM'; }).length }));
  chk('…con hoy tampoco («tiene que ser desde mañana»)', /desde mañana/.test(f.t) && f.n === 0, f);
  await rellenar(V, '#f-fecha', '2027-08-01'); await guardar(V);
  f = await V.evaluate(() => ({ t: _toast(), n: STATE.filter(function (p) { return p.cliente === 'CLIENTE AVISA FORM'; }).length }));
  chk('…ni a más de 180 días («revisá el año»)', /revisá el año/.test(f.t) && f.n === 0, f);
  await rellenar(V, '#f-fecha', LLAMAR);
  const savesAntes = await V.evaluate(() => window.__ctl.saves.length);
  await guardar(V);
  const fila = S.filas().find(q => q.cliente === 'CLIENTE AVISA FORM');
  const env = await V.evaluate((n) => window.__ctl.saves.slice(n).filter(function (s) { return s.pedido && s.pedido.cliente === 'CLIENTE AVISA FORM'; })[0], savesAntes);
  chk('⚠️ 2d. con el 16/11 se guarda: en la planilla SIN fecha ni turno, sin camión, con `avisa: 2026-11-16` en cada producto',
      !!fila && fila.fecha === '' && fila.turno === '' && !fila.vehiculo && fila.productos.length && fila.productos.every(x => x.avisa === LLAMAR), fila && { fecha: fila.fecha, turno: fila.turno, prods: fila.productos });
  chk('…el guardado llevó `av` (la página sabe de la casilla) y NO llevó `reserva` (no compite con las que tienen día en el libro del servidor)',
      !!env && env.av === 1 && !env.reserva, env && { av: env.av, reserva: env.reserva });
  chk('⚠️ …y el bot no anotó nada: ni confirmación al cliente ni «pedido nuevo» a logística', S.cola().every(c => c.id !== (fila || {}).id), S.cola());
  const ID = fila && fila.id;
  await V.evaluate(() => { if (document.getElementById('modal').classList.contains('on')) closeModal(); });
  f = await V.evaluate((a) => { var p = findById(a.id); WA_BOT = true; CARGA_DIA = 'todos'; MAPA_DIA = 'todos'; MAPA_MARCA = '';
    return { ok: entregaAConfirmar(p), cupo: cuposUsadosTurno(a.llamar, 'AM') + cuposUsadosTurno(a.llamar, 'PM'), carga: cargaLista().some(function (q) { return q.id === a.id; }),
      mapa: mapaEntra(p), semana: semanaEntra(p), cierre: cierreEntEntra(p), m1: nxM1Lista('Carola Chavez', false).some(function (q) { return q.id === a.id; }),
      bot: nxBotManda(p), atraso: minutosAtraso(p), admin: (function () { QUICK_FILTER = 'sinchofer'; return admFilter().some(function (q) { return q.id === a.id; }); })(),
      txt: pedidoText(p) }; }, { id: ID, llamar: LLAMAR });
  chk('⚠️ 2e. no ocupa cupo (ni el 16/11 ni ningún día), y no está en la carga («Todos»), el mapa, «Semana», el cierre, «🔔 Mañana», ni «🚚 Sin chofer»; el bot no le escribe y no tiene atraso',
      f.ok && f.cupo === 0 && !f.carga && !f.mapa && !f.semana && !f.cierre && !f.m1 && !f.bot && f.atraso === 0 && !f.admin, f);
  chk('…y el mensaje para el grupo dice «📦 Entrega: el cliente avisa cuándo (volver a llamar el 16/11/2026)»', /📦 Entrega: el cliente avisa cuándo \(volver a llamar el 16\/11\/2026\)/.test(f.txt), String(f.txt || f.__err || '').split('\n')[1]);
  // Las etiquetas
  f = await V.evaluate((id) => { QUICK_FILTER = ''; var mv = document.getElementById('mis-vendedor'); if (mv) mv.value = 'Carola Chavez'; MIS_FILTER = 'todos'; MIS_TODOS = false;
    showView('mis'); renderMis(); var p = findById(id); UNLOCKED = true;
    var card = document.querySelector('#mis-lista .cho-card[onclick*="' + id + '"]');
    showView('admin'); try { segSet('adm-mode', 'todo'); } catch (e) {} renderAdmin();
    var tr = [].slice.call(document.querySelectorAll('#tbl-pedidos tr')).filter(function (t) { return (t.getAttribute('onclick') || '').indexOf(id) >= 0; })[0];
    var chips = (document.getElementById('mis-chips') || {}).textContent || '';
    UNLOCKED = false;
    return { card: card ? card.innerText.replace(/\s+/g, ' ') : '', tr: tr ? tr.innerText.replace(/\s+/g, ' ') : '', badge: avisaBadge(p).replace(/<[^>]+>/g, ''), chips: chips }; }, ID);
  chk('⚠️ 2f. Mis pedidos: la tarjeta dice «📦 Avisa cuándo · llamar el 16/11» (y «sin día de entrega»), con el chip «📦 Avisa cuándo»',
      /📦 Avisa cuándo · llamar el 16\/11/.test(f.card) && /sin día de entrega/.test(f.card) && /📦 Avisa cuándo/.test(f.chips), { card: String(f.card || f.__err || '').slice(0, 200), chips: f.chips });
  chk('⚠️ …y Administración (la tabla, columna «Entrega») también', /📦 Avisa cuándo · llamar el 16\/11/.test(f.tr), String(f.tr || f.__err || '').slice(0, 200));
  // «Para hacer»: antes del día, nada; ese día, «📞 Llamá a 1 cliente…»
  f = await V.evaluate((id) => { var mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, 'Carola Chavez'); }); var I = misHacerDatos('Carola Chavez', mine);
    return { t: I.map(function (o) { return o.t; }), ok: I.ok }; }, ID);
  chk('2g. «Para hacer» antes del 16/11: no pide llamar; en «✅ Al día» dice «1 venta espera que el cliente avise · la próxima llamada, el 16/11»',
      !!f.t && !f.t.some(t => /Llamá a/.test(t)) && (f.ok || []).some(t => /1 venta espera que el cliente avise · la próxima llamada, el 16\/11/.test(t)), f);
  await V.clock.setFixedTime(new Date(LLAMAR + 'T09:00:00-04:00'));
  f = await V.evaluate((id) => { var mine = STATE.filter(function (p) { return mismoVendedor(p.vendedor, 'Carola Chavez'); }); var I = misHacerDatos('Carola Chavez', mine);
    var it = I.filter(function (o) { return /Llamá a/.test(o.t); })[0]; if (it) { try { eval(it.fn); } catch (e) {} }
    var m = document.getElementById('modal-box'); var txt = m ? m.innerText.replace(/\s+/g, ' ') : ''; try { closeModal(); } catch (e) {}
    return { it: it ? { t: it.t, n: it.n, sev: it.sev } : null, lista: txt }; }, ID);
  chk('⚠️ 2h. el 16/11 «Para hacer» dice «📞 Llamá a 1 cliente con entrega a confirmar» y «Ver» abre la lista con «llamar hoy»',
      !!f.it && f.it.t === 'Llamá a 1 cliente con entrega a confirmar' && f.it.n === 1 && /CLIENTE AVISA FORM/.test(f.lista) && /llamar hoy/.test(f.lista), f);
  await V.clock.setFixedTime(new Date(HOY + 'T10:00:00-04:00'));
  // «no hay» en rojo: una venta sin día con un ✗ marcado (logística la había marcado con la fecha inventada)
  f = await V.evaluate((id) => { var p = findById(id), q = JSON.parse(JSON.stringify(p)); q.id = 'tmp-nohay'; q.productos.forEach(function (x) { x.chk = 'no'; }); STATE.push(q);
    var r = { row: rowKind(q), ficha: admFichaColor(q), est: misEstadoCard(q, 0), pend: misPendientes([q]).sinStock.length, card: misCardHtml(q, 1, false, false) };
    STATE = STATE.filter(function (x) { return x.id !== 'tmp-nohay'; }); r.card = /NO HAY/.test(r.card) ? 'rojo' : 'sin rojo'; return r; }, ID);
  chk('⚠️ 2i. con un «✗ no hay» marcado, la venta sin día NO da rojo (fila, ficha, tarjeta) ni entra en «🔴 Productos que no hay»',
      f.row !== 'nohay' && f.ficha === '' && f.est !== 'mal' && f.pend === 0 && f.card === 'sin rojo', f);
  // El stock: 1 en PTF, 1 vendida CON día (CLIENTE CON DIA, para el 11/11) y la sin día
  f = await V.evaluate((a) => { SALDO_CACHE = null; var o = stockData().lista.filter(function (x) { return x.k === a.k; })[0] || {};
    var pedidosRev = revStkPedidos(), todos = revStkPedidos(true);
    return { comp: o.comp, por: o.compPor, hor: stockCompHorizonte(o), tot: stockComprometido(a.k), hasta: stockComprometido(a.k, '2026-12-31'),
             enReparto: pedidosRev.some(function (p) { return p.id === a.id; }), ultimo: (todos[todos.length - 1] || {}).id }; }, { k: K, id: ID });
  chk('⚠️ 2j. el stock la APARTA: «vendido sin entregar» = 2 (la del 11/11 y la sin día), y la sin día va al final (`AVISA_STOCK_F`)',
      f.comp === 2 && (f.por || {})['9999-12-31'] === 1 && (f.por || {})[PROX] === 1 && f.tot === 2, f);
  chk('⚠️ …pero DESPUÉS de las que tienen día: no entra en lo vendido de los próximos 15 días («Pedir 7 días»), ni «hasta» ninguna fecha',
      f.hor === 1 && f.hasta === 1, f);
  chk('…y la revisión automática no le propone marcas (fuera del reparto), aunque en la lista entera va última', !f.enReparto && f.ultimo === ID, f);
  // El cuadrito de una venta NUEVA con día del mismo producto, con 2 en PTF: una es de la del 11/11; la otra la «aparta» la sin día, pero
  // DESPUÉS de las que tienen fecha: para el 20/11 está libre.
  await V.evaluate((k) => { STOCK.c.u[k] = 2; SALDO_CACHE = null; try { stockOlvidarIndice(); } catch (e) {} }, K);
  await nuevoForm(V); await llenar(V, 'CLIENTE NUEVO'); await rellenar(V, '#f-fecha', '2026-11-20'); await V.evaluate(() => { var e = document.getElementById('f-fecha'); e.dispatchEvent(new Event('change')); saldoAvisosPintar(); });
  await V.waitForTimeout(500);
  f = await V.evaluate(() => { var b = document.querySelector('#f-productos .prod-card .prod-saldo'); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
  chk('⚠️ 2k. el cuadrito de un pedido NUEVO para el 20/11 con 2 en PTF: «✅ DISPONIBLE» — a la fecha cuenta solo la del 11/11, y la sin día va «para después» («Pendiente en total: 2 (1 para después del 20/11, sin día: el cliente avisa cuándo)»)',
      /DISPONIBLE/.test(f) && /Pendientes hasta el \d\d\/\d\d 1/.test(f) && /Pendiente en total: 2 \(1 para después del 20\/11, sin día: el cliente avisa cuándo\)/.test(f), f.slice(0, 300));
  await V.evaluate((k) => { STOCK.c.u[k] = 1; SALDO_CACHE = null; try { stockOlvidarIndice(); } catch (e) {} }, K);
  await V.evaluate(() => resetForm());
  // Editar: la casilla vuelve tildada; sacarla obliga a poner el día; con el día → confirmación (no cambio)
  f = await V.evaluate((id) => { editPedido(id); return { chk: document.getElementById('f-avisa').checked, fecha: document.getElementById('f-fecha').value, lb: document.getElementById('f-fecha-lbt').textContent }; }, ID);
  chk('⚠️ 2l. al editarla, la casilla vuelve tildada y la fecha es la de volver a llamar (16/11)', f.chk && f.fecha === LLAMAR && f.lb === 'Volver a llamar el…', f);
  await V.waitForTimeout(200);
  await tildar(V, false);
  f = await V.evaluate(() => ({ fecha: document.getElementById('f-fecha').value, lb: document.getElementById('f-fecha-lbt').textContent, turnoVis: document.getElementById('f-turno').closest('.field').offsetParent !== null }));
  chk('…sacarla: «Fecha de entrega» vacía (para poner el día que eligió el cliente) y vuelve el turno', f.fecha === '' && f.lb === 'Fecha de entrega' && f.turnoVis, f);
  await guardar(V);
  f = await V.evaluate((id) => ({ t: _toast(), fecha: (findById(id) || {}).fecha }), ID);
  chk('…y sin ponerlo no guarda («Poné el día de entrega que eligió el cliente»)', /Poné el día de entrega que eligió el cliente/.test(f.t) && f.fecha === '' && (S.leer(ID) || {}).fecha === '', f);
  poner(HOY + ' 10:30');
  await rellenar(V, '#f-fecha', ELIGE); await V.evaluate(() => { segSet('f-turno', 'PM'); renderCupoForm(); });
  await guardar(V);
  const fila2 = S.leer(ID), ev2 = S.cola().find(c => c.id === ID);
  chk('⚠️ 2m. con el 18/11 a la tarde se guarda como cualquier pedido: fecha, turno, N° del día, y sin la marca',
      fila2 && fila2.fecha === ELIGE && fila2.turno === 'PM' && fila2.nroDia > 0 && fila2.productos.every(x => !x.avisa), fila2 && { fecha: fila2.fecha, turno: fila2.turno, nro: fila2.nroDia, p: fila2.productos.map(x => x.avisa) });
  S.limpiar(); pasar(3); S.ctx.waRepaso();
  const sal2 = S.salen();
  chk('⚠️ …y el bot lo anota como NUEVO y manda la CONFIRMACIÓN con el día verdadero (miércoles 18/11 por la tarde), sin «cambio de día»',
      ev2 && ev2.t === 'n' && sal2.some(m => m.pl === 'confirmacion_pedido' && /miércoles 18\/11 por la tarde/.test(m.p.join(' '))) && !sal2.some(m => m.pl === 'cambio_entrega'), { ev2, sal: sal2.map(m => m.pl) });
  f = await V.evaluate((id) => ({ ok: entregaAConfirmar(findById(id)), cupo: cuposUsadosTurno('2026-11-18', 'PM') }), ID);
  chk('…y ahora sí ocupa su lugar en el camión del 18/11 a la tarde', !f.ok && f.cupo === 1, f);

  // ══ 3. La misma regla en la página y en el .gs ═══════════════════════════════════════════════════
  console.log('\n── 3. La gemela: entregaAConfirmar (página) = entregaAConfirmar_ (.gs) ──');
  const casos = [pedAvisa(LLAMAR), Object.assign(pedAvisa(LLAMAR), { fecha: ELIGE }), Object.assign(pedAvisa(LLAMAR), { entregado: true }),
    Object.assign(pedAvisa(LLAMAR), { oc: 'ATC 11-002' }), Object.assign(pedAvisa(LLAMAR), { oc: 'RPT 11-003' }), Object.assign(pedAvisa(LLAMAR), { direccion: 'SALIÓ DE TIENDA · Central' }),
    Object.assign(pedAvisa(LLAMAR), { zona: 'TIENDA' }), Object.assign(pedAvisa(LLAMAR), { estado: 'Borrador Kommo' }), Object.assign(pedAvisa(LLAMAR), { id: '__stock__' }),
    ped({ fecha: '' }), ped(), pedAvisa('16/11/2026'), Object.assign(pedAvisa(LLAMAR), { productos: [PROD(), PROD({ avisa: LLAMAR })] })];
  const enPag = await V.evaluate((L) => L.map(function (p) { return entregaAConfirmar(p); }), casos);
  const enGs = casos.map(p => gem(S, p));
  chk('⚠️ 3. las dos dan lo mismo en 13 casos (con fecha, entregada, ATC, RPT, tienda, borrador de Kommo, fila del sistema, marca mal escrita, marca en un solo renglón…)',
      JSON.stringify(enPag) === JSON.stringify(enGs) && enGs.filter(Boolean).length === 2, { enPag, enGs });
  await c1.close();

  // ══ 4. La página de antes (sin F5) y el servidor de hoy (29-b) ═════════════════════════════════════
  console.log('\n── 4. La página vieja contra el servidor nuevo, y la página nueva contra el servidor de hoy ──');
  let viejoHtml = '', viejoGs = '';
  try { viejoHtml = execSync('git show ' + VIEJO_SHA + ':pedidos.html', { maxBuffer: 64 * 1024 * 1024 }).toString(); viejoGs = execSync('git show ' + VIEJO_SHA + ':google-apps-script.gs', { maxBuffer: 64 * 1024 * 1024 }).toString(); } catch (e) {}
  if (!viejoHtml || !viejoGs) chk('hace falta la página y el .gs de antes (git show ' + VIEJO_SHA + ')', false);
  else {
    const archV = path.join(os.tmpdir(), 'pedidos_antes_avisa_' + VIEJO_SHA + '.html');
    fs.writeFileSync(archV, viejoHtml);
    poner(HOY + ' 10:00');
    const S4 = servidor(SRC, ON); S4.guardar(stockDe(1));
    const AV = pedAvisa(LLAMAR, { cliente: 'CLIENTE AVISA VIEJA', acuenta: 0, saldo: 4000, metodoPago: '' }); S4.guardar(AV);
    const { context: c4, p: O } = await abrir(S4, archV, 'Carola Chavez');
    f = await O.evaluate((a) => { var p = findById(a.id); return { esta: !!p, cupo: cuposUsadosTurno(a.hoy, 'AM') + cuposUsadosTurno(a.prox, 'AM'), comp: stockComprometido(a.k) }; }, { id: AV.id, hoy: HOY, prox: PROX, k: K });
    chk('4a. la página de antes la ve (es una fila más), no la cuenta en ningún cupo (no tiene fecha) — y tampoco la aparta en el stock (no conoce la marca)',
        f.esta && f.cupo === 0 && f.comp === 0, f);
    f = await O.evaluate((id) => { editPedido(id); return document.getElementById('f-fecha').value; }, AV.id);
    await guardar(O);
    let t4 = await O.evaluate(() => document.getElementById('toast') ? document.getElementById('toast').textContent : '');
    chk('4b. al editarla, la página de antes la abre con la fecha de HOY y no deja guardar («desde mañana»): no la pasa a hoy sola', f === HOY && /desde mañana/.test(t4) && S4.leer(AV.id).fecha === '', { fecha: f, toast: t4 });
    await rellenar(O, '#f-fecha', PROX);
    await guardar(O);
    const fv = S4.leer(AV.id);
    chk('⚠️ 4c. si la vendedora elige un día cualquiera, el servidor nuevo contesta `actualizar` (recargar): la fila queda sin fecha, con la marca, y el bot no anota nada',
        fv.fecha === '' && fv.productos.every(x => x.avisa === LLAMAR) && S4.cola().every(c => c.id !== AV.id), { fecha: fv.fecha, cola: S4.cola() });
    await c4.close();
    // La página nueva con el servidor de HOY (29-b): sin fecha ya no ocupaba cupo ni el bot le escribía
    const S5 = servidor(viejoGs, ON); S5.guardar(stockDe(1));
    chk('(partida) el servidor de antes es el 2026-10-29-b', S5.version === '2026-10-29-b', S5.version);
    const { context: c5, p: N } = await abrir(S5, PEDIDOS, 'Carola Chavez');
    await nuevoForm(N); await llenar(N, 'CLIENTE AVISA 29B'); await tildar(N, true); await rellenar(N, '#f-fecha', LLAMAR); await guardar(N);
    const f5 = S5.filas().find(q => q.cliente === 'CLIENTE AVISA 29B');
    chk('⚠️ 4d. con el servidor de HOY la casilla anda: se guarda sin fecha y con la marca, y el bot no anota nada',
        !!f5 && f5.fecha === '' && f5.productos.every(x => x.avisa === LLAMAR) && S5.cola().length === 0, f5 && { fecha: f5.fecha, cola: S5.cola() });
    poner(HOY + ' 10:40');
    await N.evaluate((id) => { if (document.getElementById('modal').classList.contains('on')) closeModal(); editPedido(id); }, f5 && f5.id);
    await N.waitForTimeout(200); await tildar(N, false); await rellenar(N, '#f-fecha', ELIGE); await N.evaluate(() => segSet('f-turno', 'AM')); await guardar(N);
    S5.limpiar(); pasar(3); S5.ctx.waRepaso();
    const s5 = S5.salen();
    chk('⚠️ …y al ponerle el día, el servidor de hoy también manda la CONFIRMACIÓN (no un cambio): pasar de sin fecha a una fecha ya era «nuevo»',
        S5.leer(f5.id).fecha === ELIGE && s5.some(m => m.pl === 'confirmacion_pedido') && !s5.some(m => m.pl === 'cambio_entrega'), s5.map(m => m.pl));
    await c5.close();
    try { fs.unlinkSync(archV); } catch (e) {}
  }

  chk('ningún error de JavaScript en las páginas', errores.length === 0, errores.slice(0, 5));
  await browser.close();
  console.log('\n' + PASS + ' bien · ' + FAIL + ' mal');
  process.exit(FAIL ? 1 : 0);
})().catch(e => { console.log('✗ (la prueba no terminó)', String(e && e.stack || e).slice(0, 700)); console.log('\n' + PASS + ' bien · ' + (FAIL + 1) + ' mal'); process.exit(1); });
