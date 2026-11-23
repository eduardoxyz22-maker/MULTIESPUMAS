#!/usr/bin/env node
/* 🔀 ¿CUÁNTAS VENTAS SE CRUZARON CON OTRA ASESORA? — SOLO LECTURA (20/11; dueño: «al momento de cargar un nuevo pedido… si otro asesor lo
   está atendiendo, le salga la alerta y le llegue la notificación al asesor que está atendiendo… procedamos a verificar»).

   Antes de programar la alerta, se mide con lo de VERDAD: cada venta del panel de los últimos días (OC, de una vendedora de Heaven o Sueña,
   con celular) se pasa por el MISMO «¿Quién lo atiende?» del panel (`quienAtiende_` REAL del .gs + `qaVeredicto` REAL de la página),
   con el reloj puesto en el momento en que se cargó esa venta y sin los mensajes de Kommo de después. Dice cuántas habrían sacado la alerta
   («lo atiende otra») y entre qué vendedoras.

   ⚠️ EL REPOSITORIO Y ESTE REGISTRO SON PÚBLICOS: no se imprime ningún cliente, celular, OC, id ni texto. Solo cantidades y los nombres de
      las vendedoras (los de VENDEDORES de pedidos.html, que ya están en el repo).
   ⚠️ SOLO LECTURA: a Kommo únicamente GET; al panel, solo la lectura `list`. No escribe nada en ningún lado.
   Se corre: Actions → «Verificar cruces de ventas (solo lectura)», o al cambiar este archivo. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..'), GS = path.join(RAIZ, 'google-apps-script.gs'), PEDIDOS = path.join(RAIZ, 'pedidos.html');
/* La dirección del panel sale del secreto PANEL_URL (el mismo de panel.yml). Solo si no está, de la herramienta de los correos
   (que vive en la rama, no en main). Nunca se imprime. */
const PANEL_ARCH = path.join(RAIZ, 'herramientas/pedidos_correo/cargar_pedidos.py');
const PANEL = (process.env.PANEL_URL || '').trim()
  || (fs.existsSync(PANEL_ARCH) ? ((fs.readFileSync(PANEL_ARCH, 'utf8').match(/URL = "([^"]+)"/) || [])[1] || '') : '');
const DIAS = Number(process.env.CRUCE_DIAS) || 14;            // ventas de los últimos N días (Kommo guarda los mensajes; la ventana es de 15)
const D = 86400, T0 = Math.floor(Date.now() / 1000);
const CUENTAS = [
  { marca: 'heaven', sub: (process.env.KOMMO_SUBDOMAIN || '').trim() || 'eanez', token: (process.env.KOMMO_TOKEN || '').trim(), prop: 'KOMMO_TOKEN' },
  { marca: 'suena', sub: 'gerenciamultiespumasviscarra', token: (process.env.KOMMO_TOKEN_SUENA || '').trim(), prop: 'KOMMO_TOKEN_SUENA' }
];
const dormir = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) {} };

/* ── la red: SOLO GET a Kommo ── */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cruce-')), HDR = {};
CUENTAS.forEach((c) => { if (c.token) { const f = path.join(TMP, 'h-' + c.marca); fs.writeFileSync(f, 'Authorization: Bearer ' + c.token + '\n', { mode: 0o600 }); HDR[c.token] = f; } });
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} });
const RED = { n: 0, ultimo: 0, noGet: 0 };
function kGet(url, token) {
  if (!/^https:\/\/[a-z0-9-]+\.kommo\.com\/api\/v4\//.test(url) || !HDR[token]) return { code: 401, body: '' };
  for (let i = 0; i < 4; i++) {
    const falta = 190 - (Date.now() - RED.ultimo); if (falta > 0) dormir(falta);
    RED.ultimo = Date.now(); RED.n++;
    let out = '';
    try { out = execFileSync('curl', ['-sS', '-g', '--max-time', '45', '-H', '@' + HDR[token], '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch (e) { dormir(1500); continue; }
    const k = out.lastIndexOf('\n'), code = Number(out.slice(k + 1)) || 0;
    if (code === 429) { dormir(2500 * (i + 1)); continue; }
    return { code, body: out.slice(0, k) };
  }
  return { code: 0, body: '' };
}

/* ── el .gs REAL, con el reloj movible (ENV.T = el momento de la venta) ── */
const ENV = { T: T0, cache: {}, dudas: new Set() };
/* Lo que existía en el MOMENTO DE LA VENTA (ENV.T), antes de que el .gs lo lea (23/11, revisiones de Jarvis). Es una RECONSTRUCCIÓN:
   Kommo no guarda cómo estaba todo ese día. ENV.dudas registra los límites de la reconstrucción por cuenta («<marca>: <motivo>»).
   Las dudas sobre la etapa se informan aparte: no cambian ninguna de las cuatro preguntas de atención (Jarvis, 23/11).
   · mensajes: el corte va en la PREGUNTA (filter[created_at][to]), no se filtra la respuesta: si no, la primera página (la más nueva) quedaba
     corta o vacía y el .gs dejaba de pedir las siguientes, donde estaban los mensajes que sí valían;
   · leads: uno creado después de la venta no existía; uno ganado o perdido DESPUÉS (closed_at) estaba abierto; uno que hoy está en una
     etapa de compra («Compradores» / «COMPRO») y se tocó después no se sabe en qué etapa estaba → duda «estado histórico»;
   · tareas: una creada después de la venta no estaba; si quedan más páginas (el .gs lee una), duda «tareas con más de una página»;
   · notas: una escrita después de la venta (también la de la hora siguiente, que el .gs acepta) no cuenta; una editada después no se sabe
     qué decía → duda. A las dos se les borra el texto en vez de sacarlas: la página sigue del mismo largo y el .gs pide la siguiente igual. */
function cortarPregunta(url, T) {
  const m = /([?&]filter\[created_at\]\[to\]=)(\d+)/.exec(url);
  if (m) return url.replace(m[0], m[1] + Math.min(Number(m[2]), T));
  return url.replace(/([?&])limit=/, '$1filter[created_at][to]=' + T + '&limit=');
}
function cortarRespuesta(ruta, code, body, T, est) {
  est = est || { marca: '', dudas: new Set() };
  const duda = (m) => est.dudas.add((est.marca || '?') + ': ' + m);
  let o;
  if (code === 200 && body) {
    try { o = JSON.parse(body); } catch (e) {}
  }
  const E = (o && o._embedded) || {};
  if (ruta === '/leads/pipelines') {
    const tieneEtapas = Array.isArray(E.pipelines) && E.pipelines.some((p) => Array.isArray(p?._embedded?.statuses) && p._embedded.statuses.length > 0);
    if (!tieneEtapas) duda('catálogo de etapas no disponible');
    return { code, body };
  }
  if (!o) return { code, body };
  if (ruta === '/events' && Array.isArray(E.events)) E.events = E.events.filter((e) => Number(e.created_at) <= T);   // por si Kommo no respetó el corte
  else if (ruta === '/leads' && Array.isArray(E.leads)) {
    E.leads = E.leads.filter((l) => !(Number(l.created_at) > T));
    E.leads.forEach((l) => {
      const st = String(l.status_id);
      if ((st === '142' || st === '143') && Number(l.closed_at) > T) { l.status_id = 0; l.closed_at = 0; }          // se cerró después: estaba abierto
    });
    if (!E.leads.length) return { code:204, body:'' };
  } else if (ruta === '/tasks' && Array.isArray(E.tasks)) {
    if ((o._links && o._links.next) || E.tasks.length >= 250) duda('tareas con más de una página');
    E.tasks = E.tasks.filter((t) => Number(t.created_at) <= T); if (!E.tasks.length) return { code:204, body:'' };
  } else if (/\/notes$/.test(ruta) && Array.isArray(E.notes)) E.notes.forEach((n) => {
    if (!n.params) return;
    if (Number(n.created_at) > T) n.params.text = '';
    else if (Number(n.updated_at) > T && n.params.text) { n.params.text = ''; duda('nota editada después'); }
  });
  else return { code, body };
  return { code, body:JSON.stringify(o) };
}
function cargarGs(opt) {
  opt = opt || {};
  const pedir = opt.pedir || kGet;
  const props = opt.props || {};
  if (!opt.props) {
    CUENTAS.forEach((c) => { if (c.token) props[c.prop] = c.token; });
    if ((process.env.KOMMO_SUBDOMAIN || '').trim()) props.KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN.trim();
  }
  const hojas = {}, hoja = (n) => hojas[n] = hojas[n] || { appendRow() {}, getRange: () => ({ setFontWeight() {}, setNumberFormat() {} }), setFrozenRows() {} };
  const cache = { get: (k) => ENV.cache[k] != null ? ENV.cache[k] : null, put: (k, v) => { ENV.cache[k] = String(v); }, remove: (k) => { delete ENV.cache[k]; } };
  class Fecha extends Date { constructor(...a) { a.length ? super(...a) : super(ENV.T * 1000); } static now() { return ENV.T * 1000; } }
  const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => body || '' });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, Date: Fecha,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => hojas[n] || null, insertSheet: (n) => hoja(n) }), flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, getProperties: () => Object.assign({}, props), setProperty() {}, deleteProperty() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    Utilities: { formatDate: (d) => new Date(d.getTime() - 4 * 3600000).toISOString().slice(0, 10).replace(/-/g, '') },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'CRUCE' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }) }) }), getProjectTriggers: () => [], deleteTrigger() {} },
    UrlFetchApp: { fetch: (url, op) => {
      op = op || {};
      if (String(op.method || 'get').toLowerCase() !== 'get' || op.payload != null) { RED.noGet++; return resp(405, '{}'); }   // SOLO LECTURA
      const ruta = (url.split('/api/v4')[1] || '').split('?')[0];
      if (ruta === '/events') url = cortarPregunta(url, ENV.T);
      const r0 = pedir(url, String((op.headers || {}).Authorization || '').replace(/^Bearer /, ''));
      const marca = ctx.KC_CTA === 'suena' ? 'suena' : 'heaven';
      const r = cortarRespuesta(ruta, r0.code, r0.body, ENV.T, { marca, dudas: ENV.dudas });
      return resp(r.code, r.body);
    } }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx, { filename: 'google-apps-script.gs' });
  return ctx;
}
function cargarPagina() {
  const src = fs.readFileSync(PEDIDOS, 'utf8');
  const fn = (nombre) => {
    const i = src.indexOf('\nfunction ' + nombre + '('); if (i < 0) throw new Error('no está ' + nombre);
    let n = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') n++; else if (src[k] === '}' && !--n) return src.slice(i + 1, k + 1); }
    throw new Error('no cierra ' + nombre);
  };
  const lista = (v) => { const m = new RegExp('\\nvar ' + v + '\\s*=\\s*(\\[[^\\]]*\\])').exec(src); return m ? m[1] : '[]'; };
  const ctx = { Date, Math, String, Number, Object, Array, JSON }; vm.createContext(ctx);
  const bloque = (v) => { const i = src.indexOf('\nvar ' + v + '='); if (i < 0) throw new Error('no está ' + v);
    let n = 0; for (let k = src.indexOf('[', i); k < src.length; k++) { if (src[k] === '[') n++; else if (src[k] === ']' && !--n) return src.slice(src.indexOf('[', i), k + 1); }
    throw new Error('no cierra ' + v); };
  vm.runInContext('var QA_DIAS=15, QA_PAR_H=24;\n' + ['sinTildes', 'qaNom', 'qaMismo', 'qaIncompleto', 'qaN', 'qaVeredicto', 'cruceOtros'].map(fn).join('\n') +
    '\nvar VENDEDORES=' + lista('VENDEDORES') + ';\nvar MARCAS=' + bloque('MARCAS') + ';', ctx, { filename: 'pedidos.html(qa)' });
  return ctx;
}
/* La lectura del panel (23/11, revisión de Jarvis): Google a veces convierte el POST en GET (CLAUDE.md §4fx) y, con la puerta GET
   cerrada, contesta `get_cerrado`; o devuelve una página, o nada. Eso NO es «la planilla está vacía»: se reintenta, con tope
   (LEER_INTENTOS, esperando LEER_ESPERAS), y si no se puede leer la corrida falla. Del registro (público) no sale nada de la respuesta. */
const LEER_INTENTOS = 3, LEER_ESPERAS = [5000, 15000];
function pedirPanel() {
  return execFileSync('curl', ['-sS', '-L', '--max-time', '180', '-H', 'Content-Type: text/plain;charset=utf-8', '--data-binary', '{"action":"list"}', PANEL + '?_=' + Date.now()],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}
/** Por qué una respuesta no sirve ('' = sirve). Solo palabras nuestras: nunca un pedazo de lo que contestó Google. */
function panelNoSirve(out) {
  let r; try { r = JSON.parse(out); } catch (e) { return 'no contestó JSON'; }
  if (r && r.error === 'get_cerrado') return 'Google la convirtió en GET (get_cerrado)';
  if (r && r.ok === false) return 'el servidor dijo que no (' + String(r.error || 'sin motivo').replace(/[^\w-]/g, '').slice(0, 30) + ')';
  if (!r || !Array.isArray(r.pedidos)) return 'la respuesta no trae la lista';
  return '';
}
function leerPanel(pedir, esperar) {
  pedir = pedir || pedirPanel; esperar = esperar || dormir;
  let ultimo = '';
  for (let i = 0; i < LEER_INTENTOS; i++) {
    if (i) { console.log('↻ La lectura del panel no sirvió (' + ultimo + '): reintento ' + (i + 1) + ' de ' + LEER_INTENTOS); esperar(LEER_ESPERAS[i - 1] || LEER_ESPERAS[LEER_ESPERAS.length - 1]); }
    let out; try { out = pedir(); } catch (e) { ultimo = 'sin respuesta de red'; continue; }
    ultimo = panelNoSirve(out);
    if (!ultimo) return JSON.parse(out).pedidos;
  }
  throw new Error('no se pudo leer la planilla (' + LEER_INTENTOS + ' intentos; el último: ' + ultimo + ')');
}

/* La lista de ventas a revisar: cada PEDIDO una vez, por su id (23/11, revisión de Jarvis: con «el mismo cliente y vendedora, una
   vez» la segunda compra del mismo cliente quedaba afuera, y el cruce podía estar justo en esa). */
function ventasARevisar(P, pg, VEND, desde, hasta) {
  const vistos = {};
  return P.filter((p) => {
    const id = String(p.id || ''), oc = String(p.oc || ''), v = String(p.vendedor || '');
    if (!id || id.indexOf('__') === 0 || /orrador/i.test(String(p.estado || '')) || !/^\d/.test(oc)) return false;   // solo OC (sin ATC, RPT, borradores ni filas del sistema)
    if (!VEND.some((x) => pg.qaMismo(x, v))) return false;                                                          // sin Eduardo, ROHO ni internos
    const ts = Math.floor((Number(p.ts) || 0) / 1000), c8 = String(p.celular || '').replace(/\D/g, '').slice(-8);
    if (ts < desde || ts > hasta || c8.length !== 8) return false;
    if (vistos[id]) return false; vistos[id] = 1;                                                                   // cada pedido una vez
    return true;
  }).sort((a, b) => Number(a.ts) - Number(b.ts));
}

/* Las cuentas (23/11, revisiones de Jarvis). `evaluar(p)` = la respuesta REAL de «¿Quién lo atiende?» (las dos cuentas de Kommo, con
   `_dudas` = lo que no se pudo reconstruir al momento de la venta), o null. Cuatro preguntas, cada una con sus decididos y sus pendientes
   (sí + no + pendientes = pedidos elegibles, siempre):
   · 🔀 INDICIO DE CRUCE (qaVeredicto con las dos cuentas): otra PERSONA atendía al cliente (conversación, tarea o nota). Cuenta si la otra
     persona se puede distinguir de quien vendió: sin los nombres de los usuarios de esa cuenta, un «usuario 11» puede ser la misma vendedora
     (pendiente «identidad desconocida»). Un positivo con datos incompletos sigue siendo un cruce visto (y se dice cuántos); un negativo con
     algo incompleto sobre la atención (una cuenta que no contestó, más leads de los que se miran) es PENDIENTE.
   · 🛏️💚 OTRA MARCA (qaVeredicto solo con la cuenta de la otra marca): VENDIDAS con alguien de la otra marca y, aparte, cuántos asesores
     (por cuenta y nombre; «usuario 901» y «usuario 902» son dos). En los dos sentidos: Heaven → Sueña y Sueña → Heaven.
   · 📋 CARTEL DEL FORMULARIO (cruceOtros de pedidos.html, solo la cuenta de la marca de quien vende: lo que la regla habría mostrado al cargar).
   · 💬 WHATSAPP (cruceOtros_ del .gs, la regla del bot): DESTINATARIAS POTENCIALES. Sin los nombres de los usuarios el bot no avisa: queda
     pendiente aunque el cartel haya salido (son dos resultados distintos). El bot además no repite el mismo aviso en 48 h.
   La cobertura se cuenta por CUENTA de Kommo y con el motivo. */
const NO_CONTESTO = { 'sin respuesta': 1, 'sin token': 1, 'error': 1 };
const noContesto = (m) => !!NO_CONTESTO[m] || /^error\b/.test(m);
/* «estado histórico» y «catálogo de etapas no disponible»: una oportunidad viva en «Compradores»/«COMPRO» aporta conversaciones, tareas y
   notas igual que una abierta; la etapa solo cambia «libre» por «compro» (las dos, sin cruce). Se informan por cuenta, sin pendientes. */
const INFO_ETAPAS = new Set(['estado histórico', 'catálogo de etapas no disponible']);
/* El error de una cuenta: la operación y el código HTTP de Kommo, nada más del mensaje. HTTP 0 = no hubo respuesta (red);
   «local» = falló el programa antes de preguntar. */
function errorDe(e) {
  const t = String(e || ''), cod = /HTTP (\d+)/.exec(t);
  const op = /búsqueda/.test(t) ? 'búsqueda' : /leads/.test(t) ? 'leads' : /^falló/.test(t) ? 'local' : 'otra';
  return 'error ' + op + (cod ? (cod[1] === '0' ? ' sin respuesta de red' : ' HTTP ' + cod[1]) : '');
}
const motivosDe = (c, dudas, mk, T) => {
  if (!c) return ['sin respuesta'];
  if (c.sinToken) return ['sin token'];
  const m = [c.error && errorDe(c.error), c.msgOk === false && 'mensajes incompletos', c.tareasOk === false && 'tareas', c.notasOk === false && 'notas',
    c.cortado && 'búsqueda cortada', c.usOk === false && 'nombres de usuarios', Number(c.masLeads) > 0 && 'más leads de los que se miran'].filter(Boolean);
  // El .gs resuelve vivo con las etapas de esta cuenta después de leer los leads, también en la primera consulta.
  if ((c.leads || []).some((l) => l.vivo && Number(l.tocado) > T)) m.push('estado histórico');
  (dudas || []).forEach((d) => { if (d.indexOf(mk + ': ') === 0) m.push(d.slice(mk.length + 2)); });
  return m.filter((x, k, a) => a.indexOf(x) === k);
};
const esTienda = (pg, p) => /^SALIO DE TIENDA/.test(pg.sinTildes(String(p.direccion || '')).toUpperCase().trim()) || pg.sinTildes(String(p.zona || '')).toUpperCase().trim() === 'TIENDA';
function resumir(ventas, evaluar, pg, marcaDe, cruceOtrosBot, alAvanzar) {
  const preg = (extra) => Object.assign({ si: 0, no: 0, pend: 0, motivos: {}, tienda: 0 }, extra || {});
  const R = { total: ventas.length, tienda: 0,
    ind: preg({ parcial: 0, conv: 0, tarea: 0, nota: 0, tareaNota: 0, ambas: 0, otraPrimero: 0, sinConvYo: 0, sinConvObs: 0 }),
    marca: preg({ asesores: 0, parcial: 0, dir: { 'heaven→suena': { si: 0, no: 0, pend: 0 }, 'suena→heaven': { si: 0, no: 0, pend: 0 } } }),
    cartel: preg({ parcial: 0 }), wa: preg({ destinatarias: 0, parcial: 0 }),
    cob: { heaven: {}, suena: {} }, infoEtapas: { heaven: {}, suena: {} }, noContesto: { heaven: 0, suena: 0 }, pares: {}, porVend: {}, porDia: {} };
  const nombre = (n) => pg.VENDEDORES.filter((x) => pg.qaMismo(x, n))[0] || n;          // «María Flores» = «Maria Flores»
  const fila = (n) => R.porVend[n] = R.porVend[n] || { ventas: 0, pend: 0, indicio: 0, cartel: 0, wa: 0, avisos: 0 };
  const pendiente = (q, m) => { q.pend++; q.motivos[m] = (q.motivos[m] || 0) + 1; };
  ventas.forEach((p, i) => {
    const vr = String(p.vendedor), v = nombre(vr), mv = marcaDe(v), ot = mv === 'heaven' ? 'suena' : 'heaven', tienda = esTienda(pg, p);
    const pv = fila(v); pv.ventas++; if (tienda) R.tienda++;
    if (alAvanzar && (i + 1) % 25 === 0) alAvanzar(i + 1);
    let r = null; try { r = evaluar(p); } catch (e) { r = null; }
    const resp = !!(r && r.ok !== false), cs = resp ? (r.cuentas || []) : [], dudas = resp ? (r._dudas || []) : [];
    const cta = (mk) => cs.filter((c) => c.marca === mk)[0] || null;
    const mot = { heaven: [], suena: [] };
    const V = resp ? pg.qaVeredicto(r, vr) : null;
    const usuarioSinNombre = (o) => /^usuario \d+$/i.test(o.n);
    const parcial = (mk) => mot[mk].length > 0;
    ['heaven', 'suena'].forEach((mk) => {
      for (const m of (resp ? motivosDe(cta(mk), dudas, mk, r.ahora) : ['sin respuesta'])) {
        if (INFO_ETAPAS.has(m)) { const info = R.infoEtapas[mk]; info[m] = (info[m] || 0) + 1; }
        else mot[mk].push(m);
      }
      if (mk === mv && V && V.otros.some((o) => o.marca === mv && usuarioSinNombre(o))) mot[mk].push('autor sin identificar');
      (mot[mk].length ? mot[mk] : ['completa']).forEach((m) => { R.cob[mk][m] = (R.cob[mk][m] || 0) + 1; });
      if (mot[mk].some(noContesto)) R.noContesto[mk]++;
    });
    const motTxt = (mks) => mks.filter(parcial).map((mk) => (mk === 'heaven' ? 'Heaven' : 'Sueña') + ' ' + mot[mk].join(', ')).join(' + ') || 'incompleto';
    // Un ID de otra cuenta prueba actividad en ella. Por sí solo no permite comparar personas entre cuentas.
    const identificado = (o) => o.n !== '(sin asignar)' && !usuarioSinNombre(o);
    const clave = (o) => o.marca + '|' + pg.qaNom(o.n) + '|' + String(o.n).replace(/\D/g, '');

    /* 1 · indicio de cruce */
    const ov = V ? V.otros.filter(identificado) : [];
    if (ov.length) {
      R.ind.si++; pv.indicio++; if (ov.length < V.otros.length || parcial('heaven') || parcial('suena')) R.ind.parcial++; if (tienda) R.ind.tienda++;
      const por = ov.map((o) => o.por);
      if (por.indexOf('conv') >= 0) R.ind.conv++; else if (por.indexOf('fecha') >= 0 && por.indexOf('nota') >= 0) R.ind.tareaNota++; else if (por.indexOf('fecha') >= 0) R.ind.tarea++; else R.ind.nota++;
      const yo = V.quien.filter((q) => pg.qaMismo(q.n, vr) && q.por === 'conv')[0];
      if (yo) { R.ind.ambas++; if (ov.some((o) => o.por === 'conv' && (o.desde || o.ts) < (yo.desde || yo.ts))) R.ind.otraPrimero++; }
      else if (parcial(mv)) R.ind.sinConvObs++; else R.ind.sinConvYo++;
      ov.forEach((o) => { const k = v + ' → ' + (pg.VENDEDORES.filter((x) => pg.qaMismo(x, o.n))[0] || 'otro usuario de Kommo'); R.pares[k] = (R.pares[k] || 0) + 1; });
      const dia = new Date((Math.floor(Number(p.ts) / 1000) - 4 * 3600) * 1000).toISOString().slice(5, 10); R.porDia[dia] = (R.porDia[dia] || 0) + 1;
    } else if (!V) { pendiente(R.ind, 'sin respuesta'); pv.pend++; }
    else if (V.otros.length) {
      const cuentas = Array.from(new Set(V.otros.map((o) => NOMBRE_CTA[o.marca])));
      pendiente(R.ind, 'identidad desconocida (' + cuentas.join(' y ') + ')'); pv.pend++;
    }
    else if (parcial('heaven') || parcial('suena') || V.k === 'nose') { pendiente(R.ind, V.k + ' · ' + motTxt([mv, ot])); pv.pend++; }
    else R.ind.no++;

    /* 2 · otra marca */
    const co = cta(ot), dir = R.marca.dir[mv + '→' + ot];
    if (!resp || !co) { pendiente(R.marca, 'sin respuesta'); dir.pend++; }
    else {
      const Vo = pg.qaVeredicto({ cuentas: [co], ahora: r.ahora }, vr);
      const hayAutor = (o) => identificado(o) || (usuarioSinNombre(o) && co.usOk !== false);
      const qs = Array.from(new Set(Vo.otros.filter(hayAutor).map(clave)));
      if (qs.length) {
        R.marca.si++; dir.si++; R.marca.asesores += qs.length;
        if (tienda) R.marca.tienda++;
        if (parcial(ot)) R.marca.parcial++;
      }
      else if (Vo.otros.length) { pendiente(R.marca, 'identidad desconocida (' + motTxt([ot]) + ')'); dir.pend++; }
      else if (parcial(ot)) { pendiente(R.marca, motTxt([ot])); dir.pend++; }
      else { R.marca.no++; dir.no++; }
    }

    /* 3 · cartel del formulario (la consulta del formulario pide solo la marca de quien vende) */
    const cm = cta(mv), soloMia = cm ? { cuentas: [cm], ahora: r.ahora } : null, Lf = soloMia ? pg.cruceOtros(soloMia, vr, mv) : [];
    if (Lf.length) { R.cartel.si++; pv.cartel++; if (tienda) R.cartel.tienda++; if (parcial(mv)) R.cartel.parcial++; }
    else if (!resp || !cm) pendiente(R.cartel, 'sin respuesta');
    else if (parcial(mv)) pendiente(R.cartel, motTxt([mv]));
    else R.cartel.no++;

    /* 4 · WhatsApp del bot (destinatarias potenciales) */
    const Lb = (cm && cm.usOk !== false) ? cruceOtrosBot(cm, vr, Number(r.ahora) || 0, mv) : [];
    if (Lb.length) { R.wa.si++; pv.wa++; if (tienda) R.wa.tienda++; if (parcial(mv)) R.wa.parcial++; R.wa.destinatarias += Lb.length; Lb.forEach((o) => { fila(nombre(o.n)).avisos++; }); }
    else if (!resp || !cm) pendiente(R.wa, 'sin respuesta');
    else if (parcial(mv)) pendiente(R.wa, motTxt([mv]));
    else R.wa.no++;
  });
  return R;
}
const UMBRAL_PEND = 0.30;   // más del 30 % de los pedidos sin poder decidir el indicio = el informe no sirve (Jarvis, 23/11)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + ' %';
const NOMBRE_CTA = { heaven: 'Heaven', suena: 'Sueña' };
/* Cuentas que no contestaron en NINGÚN pedido (sin token, error o sin respuesta): con eso no hay comparación posible. */
function cuentasCaidas(R) { return R.total ? ['heaven', 'suena'].filter((mk) => R.noContesto[mk] === R.total) : []; }
/* 0 = verde; 1 = rojo: había pedidos y (ninguno se pudo decidir, o quedó pendiente más del 30 %, o una cuenta de Kommo no contestó en toda
   la corrida). Sin pedidos elegibles: verde, sin porcentaje. */
function salidaDe(R) {
  if (!R.total) return 0;
  return (!(R.ind.si + R.ind.no) || R.ind.pend > UMBRAL_PEND * R.total || cuentasCaidas(R).length) ? 1 : 0;
}
/* Una línea por pregunta: «N de M decididos · P pendientes», y el porcentaje solo cuando esa pregunta tiene con qué (pendientes ≤ 30 %). */
function linea(t, x, total) {
  const dec = x.si + x.no, rojo = x.pend > UMBRAL_PEND * total;
  let s = t + ': ';
  if (!total) return s + 'sin pedidos elegibles';
  if (!dec) s += 'sin porcentaje calculable (0 de ' + total + ' decididos · ' + x.pend + ' pendientes)';
  else s += x.si + ' de ' + dec + ' pedidos decididos' + (rojo ? ' (sin porcentaje: más del ' + Math.round(UMBRAL_PEND * 100) + ' % pendiente)' : ' (' + pct(x.si, dec) + ')') +
    ' · ' + x.pend + ' pendientes de ' + total + ' (' + pct(x.pend, total) + ')';
  if (x.si + x.no + x.pend !== total) s += ' ⚠️ NO CUADRA: ' + (x.si + x.no + x.pend) + ' ≠ ' + total;
  return s;
}
const motivos = (x) => Object.keys(x.motivos).sort((a, b) => x.motivos[b] - x.motivos[a]).map((k) => x.motivos[k] + ' × ' + k).join(' · ');
function informe(R) {
  const L = [];
  if (!R.total) { L.push('Sin pedidos elegibles en el período: no hay porcentaje que calcular.'); return L; }
  L.push('Pedidos elegibles: ' + R.total + ' (' + R.tienda + ' ventas de tienda: su hora es la de la venta; si se le corrigió la fecha, no es la de la carga)');
  ['heaven', 'suena'].forEach((mk) => {
    const c = R.cob[mk], ok = c.completa || 0;
    L.push('Cuenta de Kommo ' + NOMBRE_CTA[mk] + ': completa en ' + ok + ' de ' + R.total + (ok < R.total ? ' · ' + Object.keys(c).filter((k) => k !== 'completa').map((k) => k + ' ' + c[k]).join(' · ') : ''));
    const info = Object.entries(R.infoEtapas[mk]);
    if (info.length) L.push('   · Etapas de ' + NOMBRE_CTA[mk] + ' (pedidos por observación; no cambian las cuatro preguntas): ' + info.map(([m, n]) => m + ' ' + n).join(' · '));
  });
  cuentasCaidas(R).forEach((mk) => L.push('❌ La cuenta de ' + NOMBRE_CTA[mk] + ' no contestó en NINGÚN pedido (' + Object.keys(R.cob[mk]).filter(noContesto).join(', ') + '): el informe no puede comparar.'));
  L.push('ℹ️ Es una reconstrucción de lo que había en Kommo al cargar cada venta: puede haber omisiones y atribuciones erróneas.');
  L.push('');
  L.push(linea('🔀 Indicio de cruce (otra persona atendía al cliente)', R.ind, R.total));
  if (R.ind.si) {
    L.push('   · por conversación: ' + R.ind.conv + ' · solo por una tarea abierta: ' + R.ind.tarea + ' · solo por una nota de visita o compra: ' + R.ind.nota + ' · por tarea y nota: ' + R.ind.tareaNota);
    L.push('   · la que vendió también conversaba: ' + R.ind.ambas + ' (en ' + R.ind.otraPrimero + ' la otra empezó primero) · la que vendió no había conversado: ' + R.ind.sinConvYo +
      ' · sin conversación observada (su cuenta no contestó todo): ' + R.ind.sinConvObs);
    L.push('   · vistos con cobertura parcial: ' + R.ind.parcial + ' · en ventas de tienda: ' + R.ind.tienda);
  }
  if (R.ind.pend) L.push('   · pendientes: ' + motivos(R.ind));
  L.push(linea('🛏️💚 Con alguien de la OTRA marca', R.marca, R.total) + (R.marca.si ? ' · ' + R.marca.asesores + ' asesores de la otra marca · ' + R.marca.parcial + ' con cobertura parcial · en ventas de tienda: ' + R.marca.tienda : ''));
  Object.keys(R.marca.dir).forEach((k) => { const d = R.marca.dir[k], [a, b] = k.split('→');
    if (d.si + d.no + d.pend) L.push('   · ventas de ' + NOMBRE_CTA[a] + ' mirando ' + NOMBRE_CTA[b] + ': ' + d.si + ' sí · ' + d.no + ' no · ' + d.pend + ' pendientes' + (d.pend && !(d.si + d.no) ? ' → INCOMPLETA' : '')); });
  if (R.marca.pend) L.push('   · pendientes: ' + motivos(R.marca));
  L.push(linea('📋 Cartel del formulario (otra asesora de la MISMA marca, lo que la regla habría mostrado al cargar)', R.cartel, R.total) +
    (R.cartel.si ? ' · ' + R.cartel.parcial + ' con cobertura parcial · en ventas de tienda: ' + R.cartel.tienda : ''));
  if (R.cartel.pend) L.push('   · pendientes: ' + motivos(R.cartel));
  L.push(linea('💬 WhatsApp a la otra asesora (la regla del bot)', R.wa, R.total) +
    (R.wa.si ? ' · ' + R.wa.destinatarias + ' destinatarias potenciales (el bot no repite el mismo aviso en 48 h) · ' + R.wa.parcial + ' con cobertura parcial · en ventas de tienda: ' + R.wa.tienda : ''));
  if (R.wa.pend) L.push('   · pendientes: ' + motivos(R.wa));
  return L;
}

function main() {
  if (!CUENTAS[0].token) { console.log('❌ Falta KOMMO_TOKEN'); process.exit(1); }
  if (!PANEL) { console.log('❌ Falta la dirección del panel: poné el secreto PANEL_URL en el paso del workflow'); process.exit(1); }
  const gs = cargarGs(), pg = cargarPagina();
  const VEND = pg.VENDEDORES.filter((v) => !/eduardo|roho/i.test(v));
  const SUENA = ['Juan Pablo Paredes', 'Fernando Peinado', 'Mauricio Merida'];
  const marcaDe = (v) => SUENA.some((s) => pg.qaMismo(s, v)) ? 'suena' : 'heaven';
  const P = leerPanel(), ventas = ventasARevisar(P, pg, VEND, T0 - DIAS * D, T0);
  console.log('Panel: ' + P.length + ' filas · ventas a revisar (cada pedido OC de una vendedora, con celular, últimos ' + DIAS + ' días): ' + ventas.length +
    ' · Sueña con token: ' + (CUENTAS[1].token ? 'sí' : 'NO (sus ventas quedan pendientes)'));
  const t0 = Date.now();
  const R = resumir(ventas, (p) => {
    ENV.T = Math.floor(Number(p.ts) / 1000);
    Object.keys(ENV.cache).forEach((k) => { if (/^qa_(?!us|et)/.test(k)) delete ENV.cache[k]; });   // cada venta con su propio momento
    ENV.dudas = new Set();
    const r = gs.quienAtiende_({ cel: String(p.celular).replace(/\D/g, '').slice(-8), quien: String(p.vendedor) });
    if (r) r._dudas = Array.from(ENV.dudas);
    return r;
  }, pg, marcaDe, gs.cruceOtros_, (n) => console.log('   … ' + n + ' de ' + ventas.length + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)'));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTADO (cada pedido mirado con lo que había en Kommo en el momento en que se cargó: 15 días, cliente + vendedora a ≤ 24 h)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Llamadas a Kommo: ' + RED.n + ' · ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min · escrituras intentadas: ' + RED.noGet);
  informe(R).forEach((l) => console.log(l));
  if (Object.keys(R.pares).length) {
    console.log('\nCon indicio de cruce (vendedora que cargó → la otra persona; un pedido puede tener más de una):');
    Object.keys(R.pares).sort((a, b) => R.pares[b] - R.pares[a]).forEach((k) => console.log('   ' + R.pares[k] + ' × ' + k));
  }
  console.log('\nPor vendedora: pedidos · indicio pendiente · con indicio · cartel al cargar · WhatsApp a otra · avisos potenciales que le habrían llegado:');
  Object.keys(R.porVend).sort().forEach((k) => { const x = R.porVend[k]; console.log('   ' + k.padEnd(22) + String(x.ventas).padStart(4) + ' pedidos · ' + String(x.pend).padStart(3) + ' pend. · ' + String(x.indicio).padStart(3) + ' indicio · ' + String(x.cartel).padStart(3) + ' cartel · ' + String(x.wa).padStart(3) + ' WhatsApp · ' + String(x.avisos).padStart(3) + ' avisos'); });
  if (Object.keys(R.porDia).length) console.log('\nIndicios por día de carga: ' + JSON.stringify(R.porDia));
  console.log('\nℹ️ Kommo devuelve las tareas que siguen abiertas. Las que se cerraron después de la venta pueden faltar en la reconstrucción.');
  const sal = salidaDe(R);
  if (sal) { const caidas = cuentasCaidas(R).map((mk) => NOMBRE_CTA[mk]);
    console.log('\n❌ No sirve para decidir: ' + (caidas.length ? 'la cuenta de ' + caidas.join(' y ') + ' no contestó en ningún pedido' :
      (R.ind.si + R.ind.no) ? 'quedó pendiente más del ' + Math.round(UMBRAL_PEND * 100) + ' % (' + R.ind.pend + ' de ' + R.total + ')' : 'no se pudo decidir ningún pedido') +
      '. Revisá la cobertura de cada cuenta de Kommo y volvé a correrlo.'); }
  process.exitCode = sal;
}
if (require.main === module) main();
else module.exports = { ventasARevisar, resumir, salidaDe, informe, cuentasCaidas, errorDe, cargarPagina, cargarGs, cortarPregunta, cortarRespuesta, ENV, UMBRAL_PEND, leerPanel, panelNoSirve, LEER_INTENTOS };
