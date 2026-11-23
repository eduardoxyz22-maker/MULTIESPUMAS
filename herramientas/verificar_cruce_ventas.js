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
/* Lo que existía en el MOMENTO DE LA VENTA (ENV.T), antes de que el .gs lo lea (23/11, revisión de Jarvis):
   · mensajes: el corte va en la PREGUNTA (filter[created_at][to]), no se filtra la respuesta: si no, la primera página (la más nueva) quedaba
     corta o vacía y el .gs dejaba de pedir las siguientes, donde estaban los mensajes que sí valían;
   · tareas: una tarea creada después de la venta no estaba (el .gs mira solo el vencimiento);
   · notas: una nota escrita después de la venta (también la de la hora siguiente, que el .gs acepta) no cuenta. Se le borra el texto en vez de
     sacarla, para que la página siga del mismo largo y el .gs pida la siguiente igual que antes. */
function cortarPregunta(url, T) {
  const m = /([?&]filter\[created_at\]\[to\]=)(\d+)/.exec(url);
  if (m) return url.replace(m[0], m[1] + Math.min(Number(m[2]), T));
  return url.replace(/([?&])limit=/, '$1filter[created_at][to]=' + T + '&limit=');
}
function cortarRespuesta(ruta, code, body, T) {
  if (code !== 200 || !body) return { code, body };
  let o; try { o = JSON.parse(body); } catch (e) { return { code, body }; }
  const E = (o && o._embedded) || {};
  if (ruta === '/events' && Array.isArray(E.events)) E.events = E.events.filter((e) => Number(e.created_at) <= T);   // por si Kommo no respetó el corte
  else if (ruta === '/tasks' && Array.isArray(E.tasks)) { E.tasks = E.tasks.filter((t) => Number(t.created_at) <= T); if (!E.tasks.length) return { code:204, body:'' }; }
  else if (/\/notes$/.test(ruta) && Array.isArray(E.notes)) E.notes.forEach((n) => { if (Number(n.created_at) > T && n.params) n.params.text = ''; });
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
      const r = cortarRespuesta(ruta, r0.code, r0.body, ENV.T);
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

/* Las cuentas (23/11, revisiones de Jarvis). `evaluar(p)` = la respuesta REAL de «¿Quién lo atiende?» (las dos cuentas de Kommo), o null.
   Tres preguntas distintas, cada una con sus pendientes:
   · INDICIO DE CRUCE (qaVeredicto con las dos cuentas): alguien más atendía a ese cliente (conversación, tarea o nota). Un «otro» con datos
     incompletos sigue siendo un cruce visto (cuenta, y se dice cuántos fueron así); «tuyo», «compro», «nose» o nada con datos incompletos
     pueden estar escondiendo uno: PENDIENTES, nunca en el porcentaje.
   · OTRA MARCA (qaVeredicto solo con la cuenta de la otra marca): VENTAS con alguien de la otra marca y, aparte, cuántos asesores.
   · ALERTA DEL FORMULARIO (cruceOtros_ del .gs, la regla del aviso de verdad): solo la cuenta de la marca de quien vende y solo una persona del
     equipo de esa marca reconocida sin dudas. Son DESTINATARIOS POTENCIALES: el bot además no repite el mismo aviso en 48 h.
   La cobertura se cuenta por CUENTA de Kommo: un pedido de Heaven puede quedar pendiente porque Sueña no contestó. */
const FALLA = (c) => !c || !!(c.sinToken || c.error || c.msgOk === false || c.tareasOk === false || c.notasOk === false || c.cortado || c.usOk === false);
const motivosDe = (c) => !c ? ['sin respuesta'] : c.sinToken ? ['sin token'] :
  [c.error && 'error', c.msgOk === false && 'mensajes incompletos', c.tareasOk === false && 'tareas', c.notasOk === false && 'notas',
   c.cortado && 'búsqueda cortada', c.usOk === false && 'nombres de usuarios'].filter(Boolean);
const esTienda = (pg, p) => /^SALIO DE TIENDA/.test(pg.sinTildes(String(p.direccion || '')).toUpperCase().trim()) || pg.sinTildes(String(p.zona || '')).toUpperCase().trim() === 'TIENDA';
function resumir(ventas, evaluar, pg, marcaDe, cruceOtros, alAvanzar) {
  const nuevo = () => ({ si: 0, no: 0, pend: 0 });
  const R = { total: ventas.length, tienda: 0,
    ind: Object.assign(nuevo(), { parcial: 0, conv: 0, tarea: 0, nota: 0, ambas: 0, otraPrimero: 0, sinConvYo: 0, sinConvObs: 0, tienda: 0, motivos: {} }),
    marca: Object.assign(nuevo(), { asesores: 0, sinCuenta: 0 }),
    alerta: Object.assign(nuevo(), { destinatarios: 0, tienda: 0 }),
    cob: { heaven: {}, suena: {} }, pares: {}, porVend: {}, porDia: {} };
  const nombre = (n) => pg.VENDEDORES.filter((x) => pg.qaMismo(x, n))[0] || n;          // «María Flores» = «Maria Flores»
  const fila = (n) => R.porVend[n] = R.porVend[n] || { ventas: 0, pend: 0, indicio: 0, alerta: 0, avisos: 0 };
  ventas.forEach((p, i) => {
    const vr = String(p.vendedor), v = nombre(vr), mv = marcaDe(v), ot = mv === 'heaven' ? 'suena' : 'heaven', tienda = esTienda(pg, p);
    const pv = fila(v); pv.ventas++; if (tienda) R.tienda++;
    if (alAvanzar && (i + 1) % 25 === 0) alAvanzar(i + 1);
    let r = null; try { r = evaluar(p); } catch (e) { r = null; }
    const resp = !!(r && r.ok !== false), cs = resp ? (r.cuentas || []) : [], cta = (mk) => cs.filter((c) => c.marca === mk)[0] || null;
    ['heaven', 'suena'].forEach((mk) => { const c = cta(mk), ms = !resp ? ['sin respuesta'] : FALLA(c) ? motivosDe(c) : ['completa'];
      ms.forEach((m) => { R.cob[mk][m] = (R.cob[mk][m] || 0) + 1; }); });

    /* 1 · indicio de cruce */
    const V = resp ? pg.qaVeredicto(r, vr) : null;
    if (V && V.k === 'otro') {
      R.ind.si++; pv.indicio++; if (V.inc) R.ind.parcial++; if (tienda) R.ind.tienda++;
      const por = V.otros.map((o) => o.por);
      if (por.indexOf('conv') >= 0) R.ind.conv++; else if (por.indexOf('fecha') >= 0) R.ind.tarea++; else R.ind.nota++;
      const yo = V.quien.filter((q) => pg.qaMismo(q.n, vr) && q.por === 'conv')[0];
      if (yo) { R.ind.ambas++; if (V.otros.some((o) => o.por === 'conv' && (o.desde || o.ts) < (yo.desde || yo.ts))) R.ind.otraPrimero++; }
      else if (FALLA(cta(mv))) R.ind.sinConvObs++; else R.ind.sinConvYo++;
      V.otros.forEach((o) => { const k = v + ' → ' + (pg.VENDEDORES.filter((x) => pg.qaMismo(x, o.n))[0] || 'otro usuario de Kommo'); R.pares[k] = (R.pares[k] || 0) + 1; });
      const dia = new Date((Math.floor(Number(p.ts) / 1000) - 4 * 3600) * 1000).toISOString().slice(5, 10); R.porDia[dia] = (R.porDia[dia] || 0) + 1;
    } else if (!V || V.k === 'nose' || V.inc) {
      R.ind.pend++; pv.pend++; const m = !V ? 'sin respuesta' : (V.k === 'nose' ? 'nose' : V.k + ' incompleto'); R.ind.motivos[m] = (R.ind.motivos[m] || 0) + 1;
    } else R.ind.no++;

    /* 2 · otra marca */
    const co = cta(ot);
    if (!resp) R.marca.pend++;
    else {
      const Vo = co ? pg.qaVeredicto({ cuentas: [co], ahora: r.ahora }, vr) : null, qs = Vo ? Vo.otros.map((o) => pg.qaNom(o.n)).filter((x, k, a) => a.indexOf(x) === k) : [];
      if (qs.length) { R.marca.si++; R.marca.asesores += qs.length; }
      else if (FALLA(co)) { R.marca.pend++; if (!co || co.sinToken) R.marca.sinCuenta++; }
      else R.marca.no++;
    }

    /* 3 · alerta del formulario (la misma marca) */
    const cm = cta(mv), oa = (resp && cm && cm.usOk !== false) ? cruceOtros(cm, vr, Number(r.ahora) || 0, mv) : [];
    if (oa.length) { R.alerta.si++; pv.alerta++; if (tienda) R.alerta.tienda++; R.alerta.destinatarios += oa.length; oa.forEach((o) => { fila(nombre(o.n)).avisos++; }); }
    else if (!resp || FALLA(cm)) R.alerta.pend++;
    else R.alerta.no++;
  });
  return R;
}
const UMBRAL_PEND = 0.30;   // más del 30 % de los pedidos sin poder decidir el indicio = el informe no sirve (Jarvis, 23/11)
const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + ' %';
/* 0 = verde; 1 = rojo: había pedidos y ninguno se pudo decidir, o quedó pendiente más del 30 %. Sin pedidos elegibles: verde, sin porcentaje. */
function salidaDe(R) { return R.total && (!(R.ind.si + R.ind.no) || R.ind.pend > UMBRAL_PEND * R.total) ? 1 : 0; }
/* Una línea por pregunta: «N de M decididos · P pendientes», y el porcentaje solo cuando esa pregunta tiene con qué (pendientes ≤ 30 %). */
function linea(t, x, total) {
  const dec = x.si + x.no, rojo = x.pend > UMBRAL_PEND * total;
  if (!total) return t + ': sin pedidos elegibles';
  if (!dec) return t + ': sin porcentaje calculable (0 de ' + total + ' decididos · ' + x.pend + ' pendientes)';
  return t + ': ' + x.si + ' de ' + dec + ' pedidos decididos' + (rojo ? ' (sin porcentaje: más del ' + Math.round(UMBRAL_PEND * 100) + ' % pendiente)' : ' (' + pct(x.si, dec) + ')') + ' · ' + x.pend + ' pendientes de ' + total + ' (' + pct(x.pend, total) + ')';
}
function informe(R) {
  const L = [];
  if (!R.total) { L.push('Sin pedidos elegibles en el período: no hay porcentaje que calcular.'); return L; }
  L.push('Pedidos elegibles: ' + R.total + ' (' + R.tienda + ' ventas de tienda: su hora es la de la venta; si se le corrigió la fecha, no es la de la carga)');
  ['heaven', 'suena'].forEach((mk) => { const c = R.cob[mk], ok = c.completa || 0;
    L.push('Cuenta de Kommo ' + (mk === 'heaven' ? 'Heaven' : 'Sueña') + ': completa en ' + ok + ' de ' + R.total +
      (ok < R.total ? ' · ' + Object.keys(c).filter((k) => k !== 'completa').map((k) => k + ' ' + c[k]).join(' · ') : '')); });
  L.push('');
  L.push(linea('🔀 Indicio de cruce (otra persona atendía al cliente)', R.ind, R.total));
  if (R.ind.si) {
    L.push('   · por conversación: ' + R.ind.conv + ' · solo por una tarea abierta: ' + R.ind.tarea + ' · solo por una nota de visita o compra: ' + R.ind.nota);
    L.push('   · la que vendió también conversaba: ' + R.ind.ambas + ' (en ' + R.ind.otraPrimero + ' la otra empezó primero) · la que vendió no había conversado: ' + R.ind.sinConvYo +
      ' · sin conversación observada (su cuenta no contestó todo): ' + R.ind.sinConvObs);
    L.push('   · con cobertura parcial (un cruce visto, pero faltaron datos): ' + R.ind.parcial + ' · en ventas de tienda: ' + R.ind.tienda);
  }
  if (R.ind.pend) L.push('   · pendientes por: ' + JSON.stringify(R.ind.motivos));
  L.push(linea('🛏️💚 Con un asesor de la OTRA marca (Heaven ↔ Sueña)', R.marca, R.total) + (R.marca.si ? ' · ' + R.marca.asesores + ' asesores de la otra marca' : ''));
  if (R.marca.sinCuenta) L.push('   ⚠️ Comparación Heaven ↔ Sueña INCOMPLETA: en ' + R.marca.sinCuenta + ' pedidos la cuenta de la otra marca no se pudo consultar (sin token)');
  L.push(linea('📣 Alerta del formulario (otra asesora de la MISMA marca)', R.alerta, R.total) +
    (R.alerta.si ? ' · ' + R.alerta.destinatarios + ' destinatarias potenciales del WhatsApp (el bot no repite el mismo aviso en 48 h)' : ''));
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
    return gs.quienAtiende_({ cel: String(p.celular).replace(/\D/g, '').slice(-8), quien: String(p.vendedor) });
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
  console.log('\nPor vendedora: pedidos · pendientes · con indicio · alertas al cargar · avisos potenciales que le habrían llegado:');
  Object.keys(R.porVend).sort().forEach((k) => { const x = R.porVend[k]; console.log('   ' + k.padEnd(22) + String(x.ventas).padStart(4) + ' pedidos · ' + String(x.pend).padStart(3) + ' pend. · ' + String(x.indicio).padStart(3) + ' indicio · ' + String(x.alerta).padStart(3) + ' alertas · ' + String(x.avisos).padStart(3) + ' avisos'); });
  if (Object.keys(R.porDia).length) console.log('\nIndicios por día de carga: ' + JSON.stringify(R.porDia));
  console.log('\nℹ️ Es un piso, no un techo: Kommo no guarda cómo estaba un lead el día de la venta (uno marcado «perdido» después ya no retiene), ni las tareas que se cerraron después.');
  const sal = salidaDe(R);
  if (sal) console.log('\n❌ No sirve para decidir: ' + ((R.ind.si + R.ind.no) ? 'quedó pendiente más del ' + Math.round(UMBRAL_PEND * 100) + ' % (' + R.ind.pend + ' de ' + R.total + ')' : 'no se pudo decidir ningún pedido') + '. Revisá la cobertura de cada cuenta de Kommo y volvé a correrlo.');
  process.exitCode = sal;
}
if (require.main === module) main();
else module.exports = { ventasARevisar, resumir, salidaDe, informe, cargarPagina, cargarGs, cortarPregunta, cortarRespuesta, ENV, UMBRAL_PEND };
