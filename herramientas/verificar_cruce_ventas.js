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
const ENV = { T: T0, cache: {} };
function cargarGs() {
  const props = {}; CUENTAS.forEach((c) => { if (c.token) props[c.prop] = c.token; });
  if ((process.env.KOMMO_SUBDOMAIN || '').trim()) props.KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN.trim();
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
      const r = kGet(url, String((op.headers || {}).Authorization || '').replace(/^Bearer /, ''));
      const ruta = (url.split('/api/v4')[1] || '').split('?')[0];
      if (ruta === '/events' && r.code === 200) {   // lo que pasó DESPUÉS de cargar la venta no se mira
        try { const o = JSON.parse(r.body); o._embedded.events = (o._embedded.events || []).filter((e) => Number(e.created_at) <= ENV.T); return resp(o._embedded.events.length ? 200 : 204, JSON.stringify(o)); } catch (e) {}
      }
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
  vm.runInContext('var QA_DIAS=15, QA_PAR_H=24;\n' + ['sinTildes', 'qaNom', 'qaMismo', 'qaIncompleto', 'qaN', 'qaVeredicto'].map(fn).join('\n') +
    '\nvar VENDEDORES=' + lista('VENDEDORES') + ';', ctx, { filename: 'pedidos.html(qa)' });
  return ctx;
}
function leerPanel() {
  const out = execFileSync('curl', ['-sS', '-L', '--max-time', '180', '-H', 'Content-Type: text/plain;charset=utf-8', '--data-binary', '{"action":"list"}', PANEL + '?_=' + Date.now()],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const r = JSON.parse(out); if (!r || !Array.isArray(r.pedidos)) throw new Error('no se pudo leer la planilla');
  return r.pedidos;
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

/* Las cuentas. `evaluar(p)` = lo que contestó «¿Quién lo atiende?» (o null si falló).
   · Solo cuenta como VERIFICADA una venta con respuesta completa: un error o un «no se pudo saber» (nose / incompleto) va a PENDIENTES
     y nunca entra en el porcentaje (si no, una caída de Kommo parecía «pocos cruces»).
   · Heaven ↔ Sueña cuenta VENTAS con algún asesor de la otra marca, y aparte cuántos asesores de la otra marca había. */
function resumir(ventas, evaluar, pg, marcaDe, alAvanzar) {
  const R = { total: ventas.length, verif: 0, pend: 0, error: 0, k: {}, otro: 0, soloOtra: 0, ambas: 0, otraPrimero: 0,
    otraMarcaVentas: 0, otraMarcaAsesores: 0, compro: 0, pares: {}, porVend: {}, porDia: {}, pendPorMarca: {} };
  const nombre = (n) => pg.VENDEDORES.filter((x) => pg.qaMismo(x, n))[0] || n;                    // «María Flores» = «Maria Flores»
  ventas.forEach((p, i) => {
    const v = nombre(String(p.vendedor)), mv = marcaDe(v);
    const pv = R.porVend[v] = R.porVend[v] || { ventas: 0, verif: 0, pend: 0, alerta: 0, leAvisan: 0 }; pv.ventas++;
    if (alAvanzar && (i + 1) % 25 === 0) alAvanzar(i + 1);
    let r = null; try { r = evaluar(p); } catch (e) { r = null; }
    const pendiente = (motivo) => { R.pend++; pv.pend++; R.k[motivo] = (R.k[motivo] || 0) + 1; R.pendPorMarca[mv] = (R.pendPorMarca[mv] || 0) + 1; };
    if (!r || r.ok === false) { R.error++; pendiente('error'); return; }
    const V = pg.qaVeredicto(r, v);
    // con datos incompletos, un cruce visto sigue siendo un cruce; «tuyo», «compro» o nada pueden estar escondiendo uno: pendientes
    if (V.k === 'nose' || (V.inc && V.k !== 'otro')) { pendiente(V.k === 'nose' ? 'nose' : 'incompleto'); return; }
    R.verif++; pv.verif++; R.k[V.k] = (R.k[V.k] || 0) + 1;
    if (V.k === 'compro') R.compro++;
    if (V.k !== 'otro') return;
    R.otro++; pv.alerta++;
    const yo = V.quien.filter((q) => pg.qaMismo(q.n, v) && q.por === 'conv')[0];
    if (yo) R.ambas++; else R.soloOtra++;
    let otraMarca = 0, empezoOtra = false;
    V.otros.forEach((o) => {
      const on = pg.VENDEDORES.filter((x) => pg.qaMismo(x, o.n))[0] || 'otro usuario de Kommo';
      const k = v + ' → le vendió a un cliente de ' + on; R.pares[k] = (R.pares[k] || 0) + 1;
      const po = R.porVend[on] = R.porVend[on] || { ventas: 0, verif: 0, pend: 0, alerta: 0, leAvisan: 0 }; po.leAvisan++;
      if (o.marca !== mv) otraMarca++;
      if (yo && (o.desde || o.ts) < (yo.desde || yo.ts)) empezoOtra = true;
    });
    if (otraMarca) { R.otraMarcaVentas++; R.otraMarcaAsesores += otraMarca; }
    if (empezoOtra) R.otraPrimero++;
    const dia = new Date((Math.floor(Number(p.ts) / 1000) - 4 * 3600) * 1000).toISOString().slice(5, 10); R.porDia[dia] = (R.porDia[dia] || 0) + 1;
  });
  return R;
}
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + ' %';
/* Termina en ROJO si no se pudo verificar ninguna venta, o si quedó pendiente más de la mitad: un informe así no sirve para decidir. */
function salidaDe(R) { return R.total && (!R.verif || R.pend * 2 > R.total) ? 1 : 0; }

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
    return gs.quienAtiende_({ cel: String(p.celular).replace(/\D/g, '').slice(-8), quien: String(p.vendedor) });
  }, pg, marcaDe, (n) => console.log('   … ' + n + ' de ' + ventas.length + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)'));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTADO (cada venta mirada en el momento en que se cargó, con la regla de 15 días y cliente + vendedora a ≤ 24 h)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Ventas a revisar: ' + R.total + ' · VERIFICADAS: ' + R.verif + ' · PENDIENTES (Kommo no contestó todo o falló): ' + R.pend +
    ' (' + pct(R.pend, R.total) + ') · llamadas a Kommo: ' + RED.n + ' · ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min · escrituras intentadas: ' + RED.noGet);
  console.log('Pendientes por marca de quien vendió: ' + JSON.stringify(R.pendPorMarca));
  console.log('Cartel: ' + JSON.stringify(R.k) + '   (tuyo = la que vendió era la que conversaba · libre = nadie · otro = ⚠️ ALERTA · compro = ya compró hace poco · nose / incompleto / error = PENDIENTE, no cuenta)');
  console.log('⚠️ Habrían sacado la ALERTA: ' + R.otro + ' de ' + R.verif + ' ventas verificadas (' + pct(R.otro, R.verif) + ')' +
    (R.pend ? ' · faltan ' + R.pend + ' por verificar: el número real puede ser mayor' : ''));
  console.log('   · la otra conversaba y la que vendió NO había conversado en Kommo (cruce claro): ' + R.soloOtra);
  console.log('   · conversaban LAS DOS en los 15 días: ' + R.ambas + ' (en ' + R.otraPrimero + ' la otra empezó primero)');
  console.log('   · ventas con un asesor de la OTRA marca (Heaven ↔ Sueña): ' + R.otraMarcaVentas + ' ventas · ' + R.otraMarcaAsesores + ' asesores de la otra marca');
  console.log('\nQuién le vendió a un cliente que atendía otra (vendedora que cargó → la que conversaba; una venta puede tener más de una):');
  Object.keys(R.pares).sort((a, b) => R.pares[b] - R.pares[a]).forEach((k) => console.log('   ' + R.pares[k] + ' × ' + k));
  console.log('\nPor vendedora: ventas · verificadas · pendientes · alertas al cargar · avisos que le habrían llegado («tu cliente acaba de comprar»):');
  Object.keys(R.porVend).sort().forEach((k) => { const x = R.porVend[k]; console.log('   ' + k.padEnd(22) + String(x.ventas).padStart(4) + ' ventas · ' + String(x.verif).padStart(3) + ' verif. · ' + String(x.pend).padStart(3) + ' pend. · ' + String(x.alerta).padStart(3) + ' alertas · ' + String(x.leAvisan).padStart(3) + ' avisos'); });
  console.log('\nAlertas por día de carga: ' + JSON.stringify(R.porDia));
  console.log('\nℹ️ Es un piso, no un techo: Kommo no guarda cómo estaba un lead el día de la venta (uno marcado «perdido» después ya no retiene), ni las tareas que se cerraron después.');
  const sal = salidaDe(R);
  if (sal) console.log('\n❌ No sirve para decidir: ' + (R.verif ? 'quedó pendiente más de la mitad (' + R.pend + ' de ' + R.total + ')' : 'no se pudo verificar ninguna venta') + '. Volvé a correrlo más tarde.');
  process.exitCode = sal;
}
if (require.main === module) main();
else module.exports = { ventasARevisar, resumir, salidaDe, cargarPagina };
