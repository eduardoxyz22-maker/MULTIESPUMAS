#!/usr/bin/env node
/* 📞 «¿QUIÉN LO ATIENDE?» CONTRA EL KOMMO DE VERDAD — SOLO LECTURA (20/11, segunda revisión de Fable).

   Corre el `quienAtiende_` REAL de google-apps-script.gs (en Node: UrlFetchApp hecho con curl, la hoja y la caché de mentira) para
   una muestra de números y nombres sacados de los mensajes recientes de Kommo, y compara lo que dice (la hoja «Quién atiende» y el
   cartel de la página, con el `qaVeredicto` REAL de pedidos.html) contra una VERDAD armada aparte: todos los mensajes de chat de la
   cuenta en 17 días (sin filtro de entidad, §4ng), cada lead pedido de a uno, todas las tareas abiertas.

   Además mide lo que la simulación no puede saber: si la búsqueda de Kommo distingue tildes, si corta en 250 contactos, si
   `updated_at` del lead se mueve con los mensajes, cuántas conversaciones quedan repartidas entre dos leads del mismo contacto,
   cuántas llamadas y cuánto tarda cada búsqueda, y si cada vendedora del panel tiene su usuario en Kommo con ese nombre.

   ⚠️ EL REPOSITORIO Y ESTE REGISTRO SON PÚBLICOS: no se imprime NINGÚN nombre, teléfono, id ni texto de cliente o de lead; de Kommo
      no se imprime ningún nombre de usuario. Solo cantidades y si coincide o no. Los nombres de vendedoras que salen son los de la
      lista VENDEDORES de pedidos.html (ya están en el repo). El token no se imprime.
   ⚠️ SOLO LECTURA: UrlFetchApp acepta únicamente GET a https://<cuenta>.kommo.com/api/v4/…; cualquier otra cosa no sale a la red.
   Se corre: Actions → «Probar ¿Quién lo atiende? contra Kommo (solo lectura)», o al cambiar este archivo. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const GS = path.join(RAIZ, 'google-apps-script.gs'), PEDIDOS = path.join(RAIZ, 'pedidos.html');
const MUESTRA = Number(process.env.QA_MUESTRA) || 40, MUESTRA_NOMBRE = Number(process.env.QA_MUESTRA_NOMBRE) || 14;
const D = 86400, H = 3600, IN = 'incoming_chat_message', OUT = 'outgoing_chat_message';
const T0 = Math.floor(Date.now() / 1000);            // «ahora» para toda la corrida (lo que entre después a Kommo no se mira)
const LIM = T0 - 15 * D, DESDE = T0 - 17 * D;
const CUENTAS = [
  { marca: 'heaven', sub: (process.env.KOMMO_SUBDOMAIN || '').trim() || 'eanez', token: (process.env.KOMMO_TOKEN || '').trim(), prop: 'KOMMO_TOKEN' },
  { marca: 'suena', sub: (process.env.KOMMO_SUBDOMAIN_SUENA || '').trim() || 'gerenciamultiespumasviscarra', token: (process.env.KOMMO_TOKEN_SUENA || '').trim(), prop: 'KOMMO_TOKEN_SUENA' }
];
const dormir = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch (e) {} };
const titulo = (t) => console.log('\n' + '━'.repeat(100) + '\n' + t + '\n' + '━'.repeat(100));
const nfd = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normN = (n) => nfd(n).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const conj = (a) => Array.from(new Set(a.map(normN))).sort().join('|');
const olvidar = () => { Object.keys(ENV.cache).forEach((k) => { if (!/^qa_(us2|et)/.test(k)) delete ENV.cache[k]; }); ENV.hoja = []; ENV.llamadas = []; };
const sinDatos = (e) => String((e && e.name) || 'Error') + ' en ' + String((e && e.stack) || '').split('\n').slice(1, 2).join('').replace(/^.*[\/(]([^\/():]+:\d+:\d+)\)?$/, '$1').slice(0, 60);
const mediana = (v) => { v = v.slice().sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };

/* ── la red: SOLO GET a Kommo, con curl (sincrónico, como UrlFetchApp), a lo sumo ~5 por segundo ── */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-'));
const HDR = {};
CUENTAS.forEach((c) => { if (c.token) { const f = path.join(TMP, 'h-' + c.marca); fs.writeFileSync(f, 'Authorization: Bearer ' + c.token + '\n', { mode: 0o600 }); HDR[c.token] = f; } });
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} });
const RED = { n: 0, n429: 0, errores: 0, ultimo: 0, urlMax: 0, noGet: 0, ajenos: 0 };
function kGet(url, token) {
  if (!/^https:\/\/[a-z0-9-]+\.kommo\.com\/api\/v4\//.test(url)) { RED.ajenos++; return { code: 0, body: '' }; }
  if (!HDR[token]) return { code: 401, body: '' };
  RED.urlMax = Math.max(RED.urlMax, url.length);
  for (let intento = 0; intento < 4; intento++) {
    const falta = 190 - (Date.now() - RED.ultimo); if (falta > 0) dormir(falta);
    RED.ultimo = Date.now(); RED.n++;
    let out = '';
    try { out = execFileSync('curl', ['-sS', '-g', '--max-time', '45', '-H', '@' + HDR[token], '-H', 'Content-Type: application/json', '-w', '\n%{http_code}', url], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch (e) { RED.errores++; dormir(1500); continue; }
    const i = out.lastIndexOf('\n'), code = Number(out.slice(i + 1)) || 0, body = out.slice(0, i);
    if (code === 429) { RED.n429++; dormir(2500 * (intento + 1)); continue; }
    return { code, body };
  }
  return { code: 0, body: '' };
}
function api(c, ruta) {   // → {code, o}
  const r = kGet('https://' + c.sub + '.kommo.com/api/v4' + ruta, c.token); let o = null;
  try { o = JSON.parse(r.body || 'null'); } catch (e) { o = null; }
  return { code: r.code, o };
}
const emb = (o, k) => ((o || {})._embedded || {})[k] || [];
function paginar(c, ruta, k, limite, maxPag) {
  const out = []; let estado = 'ok', pag = 1;
  for (; pag <= maxPag; pag++) {
    const r = api(c, ruta + (ruta.indexOf('?') >= 0 ? '&' : '?') + 'limit=' + limite + '&page=' + pag);
    if (r.code === 204) break;
    if (r.code !== 200 || !r.o) { estado = 'HTTP ' + r.code; break; }
    const L = emb(r.o, k); if (!L.length) break;
    L.forEach((x) => out.push(x));
    if (!(r.o._links && r.o._links.next)) break;
  }
  if (pag > maxPag) estado = 'cortado en ' + maxPag + ' páginas';
  return { L: out, estado, pags: pag };
}

/* ── el .gs REAL en un vm ── */
const ENV = { hoja: [], cache: {}, cacheMax: 0, ttlMax: 0, llamadas: [], despues: 0, urlMaxGs: 0 };
function cargarGs() {
  const props = {}; CUENTAS.forEach((c) => { if (c.token) props[c.prop] = c.token; });
  if ((process.env.KOMMO_SUBDOMAIN || '').trim()) props.KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN.trim();
  const hojas = {};
  const hoja = (n) => hojas[n] = hojas[n] || { appendRow(r) { if (n === 'Quién atiende') ENV.hoja.push(r); }, getRange: () => ({ setFontWeight() {}, setNumberFormat() {} }), setFrozenRows() {} };
  const cache = { get: (k) => ENV.cache[k] != null ? ENV.cache[k] : null,
                  put: (k, v, ttl) => { v = String(v); const b = Buffer.byteLength(v); if (b > 100 * 1024) throw new Error('Argument too large: value'); ENV.cacheMax = Math.max(ENV.cacheMax, b); ENV.ttlMax = Math.max(ENV.ttlMax, ttl || 600); ENV.cache[k] = v; },
                  remove: (k) => { delete ENV.cache[k]; } };
  class FechaFija extends Date { constructor(...a) { a.length ? super(...a) : super(T0 * 1000); } static now() { return T0 * 1000; } }
  const resp = (code, body) => ({ getResponseCode: () => code, getContentText: () => body || '' });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} }, Date: FechaFija,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => hojas[n] || null, insertSheet: (n) => hoja(n) }), flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] != null ? props[k] : null, getProperties: () => Object.assign({}, props), setProperty() {}, deleteProperty() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }), getDocumentLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    CacheService: { getScriptCache: () => cache },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _t: t, setMimeType() { return this; } }) },
    Utilities: { formatDate: (d) => new Date(d.getTime() - 4 * 3600000).toISOString().slice(0, 10).replace(/-/g, '') },
    Session: { getScriptTimeZone: () => 'America/La_Paz', getTemporaryActiveUserKey: () => 'PRUEBA' },
    ScriptApp: { newTrigger: () => ({ timeBased: () => ({ after: () => ({ create: () => ({}) }) }) }), getProjectTriggers: () => [], deleteTrigger() {} },
    UrlFetchApp: { fetch: (url, op) => {
      op = op || {};
      const metodo = String(op.method || 'get').toLowerCase(), ruta = (url.split('/api/v4')[1] || '').split('?')[0];
      const reg = { ruta, t: Date.now(), code: 0, len: url.length }; ENV.llamadas.push(reg); ENV.urlMaxGs = Math.max(ENV.urlMaxGs, url.length);
      if (metodo !== 'get' || op.payload != null) { RED.noGet++; reg.code = 405; return resp(405, '{}'); }   // SOLO LECTURA
      const tok = String((op.headers || {}).Authorization || '').replace(/^Bearer /, '');
      const r = kGet(url, tok); reg.code = r.code; reg.ms = Date.now() - reg.t;
      if (ruta === '/events' && r.code === 200) {   // lo que entró a Kommo después de T0 no se mira (la verdad se bajó hasta T0)
        try { const o = JSON.parse(r.body), E = emb(o, 'events'), antes = E.length; o._embedded.events = E.filter((e) => Number(e.created_at) <= T0); ENV.despues += antes - o._embedded.events.length; return resp(200, JSON.stringify(o)); } catch (e) {}
      }
      return resp(r.code, r.body);
    } }
  };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(GS, 'utf8'), ctx, { filename: 'google-apps-script.gs' });
  return ctx;
}
/* ── las funciones REALES de la página (qaVeredicto y las que usa), sacadas de pedidos.html ── */
function cargarPagina() {
  const src = fs.readFileSync(PEDIDOS, 'utf8');
  const fn = (nombre) => {
    const i = src.indexOf('\nfunction ' + nombre + '('); if (i < 0) throw new Error('no está la función ' + nombre + ' en pedidos.html');
    let n = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) { const ch = src[k]; if (ch === '{') n++; else if (ch === '}') { n--; if (!n) return src.slice(i + 1, k + 1); } }
    throw new Error('no cierra ' + nombre);
  };
  const m = /\nvar VENDEDORES\s*=\s*(\[[^\]]*\])/.exec(src);
  const codigo = 'var QA_DIAS=15, QA_PAR_H=24;\n' + ['sinTildes', 'qaNom', 'qaMismo', 'qaNombreBusca', 'qaIncompleto', 'qaN', 'qaVeredicto'].map(fn).join('\n') + '\nvar VENDEDORES=' + (m ? m[1] : '[]') + ';';
  const ctx = { Date, Math, String, Number, Object, Array }; vm.createContext(ctx); vm.runInContext(codigo, ctx, { filename: 'pedidos.html(qa)' });
  return ctx;
}

/* ═════ LA VERDAD (la regla del dueño, escrita aparte del código del panel) ═════
   conversación = un mensaje del cliente y uno de una PERSONA (created_by ≠ 0) a ≤ 24 h; su hora = el más tarde de los dos; vale 15 días.
   Excepción: tarea abierta, puesta por una persona, con fecha futura a ≤ 90 días → su responsable. Lead perdido: no retiene.
   Lead ganado: no retiene; «ya compró» si se cerró o conversó hace ≤ 15 días. */
function conversaciones(msgs) {
  const out = {}, ins = msgs.filter((m) => m.type === IN), outs = msgs.filter((m) => m.type === OUT && Number(m.created_by));
  for (const o of outs) for (const i of ins) if (Math.abs(o.created_at - i.created_at) <= 24 * H) { const f = Math.max(o.created_at, i.created_at); if (!(out[o.created_by] >= f)) out[o.created_by] = f; }
  return out;
}
const telEs = (t, c8) => { const d = String(t == null ? '' : t).replace(/\D/g, ''); return !!c8 && d.length >= c8.length && d.slice(-c8.length) === c8; };
const tels = (c) => { const out = []; ((c && c.custom_fields_values) || []).forEach((f) => { if (String(f.field_code || '') === 'PHONE') (f.values || []).forEach((v) => { if (v && v.value != null) out.push(String(v.value)); }); }); return out; };

function main() {
  const activas = CUENTAS.filter((c) => c.token);
  if (!activas.length || !CUENTAS[0].token) { console.log('❌ Falta KOMMO_TOKEN'); process.exit(1); }
  console.log('Cuentas con acceso: ' + activas.map((c) => c.marca).join(', ') + (CUENTAS[1].token ? '' : ' (Sueña SIN token en este repositorio: el servidor de la prueba dirá «sinToken», como en el panel si faltara)') +
              ' · ahora fijo = ' + new Date(T0 * 1000).toISOString() + ' · muestra ' + MUESTRA + ' números y ' + MUESTRA_NOMBRE + ' nombres');
  const gs = cargarGs(), pag = cargarPagina();
  console.log('Versión del .gs que se prueba: ' + gs.SCRIPT_VERSION + ' · QA_DIAS ' + gs.QA_DIAS + ' · QA_PAR_H ' + gs.QA_PAR_H + ' · topes: ' + gs.QA_MAX_LEADS + ' leads por número, ' + gs.QA_LEADS_POR_CLIENTE + ' por cliente, ' + gs.QA_MAX_CONTACTOS + ' contactos, ' + gs.QA_PAGINAS + ' páginas de mensajes');
  let MAL = 0; const mal = (t) => { MAL++; console.log('   ❌ ' + t); };

  /* ── 1 · la verdad de cada cuenta ── */
  const V = {};
  for (const c of activas) {
    titulo('1 · ' + c.marca.toUpperCase() + ' · La verdad: todos los mensajes de chat de la cuenta en 17 días, usuarios y tareas abiertas');
    const t = Date.now();
    const ev = paginar(c, '/events?filter[type][]=' + IN + '&filter[type][]=' + OUT + '&filter[created_at][from]=' + DESDE + '&filter[created_at][to]=' + T0, 'events', 100, 600);
    const porLead = {}, porEnt = {}; let ordenDesc = 0, ordenAsc = 0;
    ev.L.forEach((e, i) => {
      porEnt[e.entity_type || '?'] = (porEnt[e.entity_type || '?'] || 0) + 1;
      if (e.entity_type === 'lead') (porLead[e.entity_id] = porLead[e.entity_id] || []).push({ type: e.type, created_at: Number(e.created_at) || 0, created_by: Number(e.created_by) || 0 });
      if (i && i < 100) { if (ev.L[i - 1].created_at >= e.created_at) ordenDesc++; if (ev.L[i - 1].created_at <= e.created_at) ordenAsc++; }
    });
    console.log('   mensajes de chat: ' + ev.L.length + ' (' + ev.pags + ' páginas, estado ' + ev.estado + ', ' + ((Date.now() - t) / 1000).toFixed(0) + ' s) · por entidad ' + JSON.stringify(porEnt) + ' · de personas: ' + ev.L.filter((e) => e.type === OUT && Number(e.created_by)).length + ' · entrantes: ' + ev.L.filter((e) => e.type === IN).length);
    console.log('   orden de la primera página: ' + (ordenDesc >= 98 ? 'del más nuevo al más viejo' : ordenAsc >= 98 ? 'del más viejo al más nuevo' : 'ni uno ni otro (' + ordenDesc + ' bajan, ' + ordenAsc + ' suben de 99)'));
    const us = paginar(c, '/users', 'users', 250, 5), nomU = {};
    us.L.forEach((u) => { nomU[String(u.id)] = String(u.name || '').split(/\s+[-–]\s+/)[0].trim(); });
    if (c.marca === 'suena') nomU['13073611'] = 'Juan Pablo Paredes';
    console.log('   usuarios de Kommo: ' + us.L.length + ' (estado ' + us.estado + ')');
    const ta = paginar(c, '/tasks?filter[is_completed]=0', 'tasks', 250, 60);
    const tareas = { leads: {}, contacts: {} }; let tBot = 0, tFut = 0, tLejos = 0;
    ta.L.forEach((x) => { const et = x.entity_type; if (tareas[et]) (tareas[et][x.entity_id] = tareas[et][x.entity_id] || []).push(x); if (!Number(x.created_by)) tBot++; if (Number(x.complete_till) > T0) tFut++; if (Number(x.complete_till) > T0 + 90 * D) tLejos++; });
    console.log('   tareas abiertas: ' + ta.L.length + ' (estado ' + ta.estado + ') · puestas por el bot: ' + tBot + ' · con fecha futura: ' + tFut + ' · a más de 90 días: ' + tLejos + ' · en leads: ' + Object.keys(tareas.leads).length + ' leads · en contactos: ' + Object.keys(tareas.contacts).length);
    V[c.marca] = { c, ev, porLead, nomU, tareas, tareasOk: ta.estado === 'ok', evOk: ev.estado === 'ok', leads: {}, cDeLead: {} };
    if (ev.estado !== 'ok') mal('no se pudo bajar la verdad entera de ' + c.marca + ' (' + ev.estado + '): la comparación de abajo puede dar diferencias que no son del panel');
  }

  /* ── 2 · los leads con mensajes → su contacto (de a 50), para medir lo que pasa ENTRE leads del mismo contacto ── */
  for (const c of activas) {
    const W = V[c.marca], ids = Object.keys(W.porLead);
    titulo('2 · ' + c.marca.toUpperCase() + ' · Los ' + ids.length + ' leads con mensajes en 17 días: su contacto, su estado y si updated_at se mueve con los mensajes');
    let fall = 0;
    for (let k = 0; k < ids.length; k += 50) {
      const r = api(c, '/leads?with=contacts&limit=250&' + ids.slice(k, k + 50).map((x) => 'filter[id][]=' + x).join('&'));
      if (r.code !== 200 || !r.o) { if (r.code !== 204) fall++; continue; }
      emb(r.o, 'leads').forEach((l) => { W.leads[l.id] = l; const cs = emb(l, 'contacts'); const pr = cs.filter((x) => x.is_main)[0] || cs[0]; if (pr) W.cDeLead[l.id] = pr.id; });
    }
    const L = Object.keys(W.leads).map((k) => W.leads[k]);
    const est = { abierto: 0, ganado: 0, perdido: 0 }; let sinCierre = 0, updAntes = 0, updIgual = 0, sinContacto = 0, variosContactos = 0;
    L.forEach((l) => {
      est[String(l.status_id) === '142' ? 'ganado' : String(l.status_id) === '143' ? 'perdido' : 'abierto']++;
      if ((String(l.status_id) === '142' || String(l.status_id) === '143') && !l.closed_at) sinCierre++;
      const ult = Math.max.apply(null, W.porLead[l.id].map((m) => m.created_at));
      if (Number(l.updated_at) < ult - 120) updAntes++; else updIgual++;
      const n = emb(l, 'contacts').length; if (!n) sinContacto++; if (n > 1) variosContactos++;
    });
    console.log('   leads leídos: ' + L.length + ' de ' + ids.length + ' (' + fall + ' pedidos fallaron; los que faltan están borrados) · ' + JSON.stringify(est) + ' · cerrados sin closed_at: ' + sinCierre + ' · sin contacto: ' + sinContacto + ' · con 2+ contactos: ' + variosContactos);
    console.log('   updated_at del lead ANTERIOR a su último mensaje (más de 2 min): ' + updAntes + ' de ' + L.length + ' → ' + (updAntes > L.length * 0.05 ? '⚠️ updated_at NO sigue a los mensajes: «los 8 leads más recientes» (QA_MAX_LEADS) y «3 por cliente» pueden dejar afuera el lead donde está la conversación' : 'updated_at sigue a los mensajes (el tope de leads se queda con los que tienen la conversación)'));
    /* la regla por LEAD (como está programado) contra la regla por CONTACTO (juntando sus leads) */
    const porC = {}; L.forEach((l) => { const cid = W.cDeLead[l.id]; if (cid) (porC[cid] = porC[cid] || []).push(l); });
    let cVarios = 0, cruzados = 0, cruzSinNadie = 0, masDe3 = 0, masDe8 = 0, dosVend = 0;
    Object.keys(porC).forEach((cid) => {
      const ls = porC[cid]; if (ls.length > 1) cVarios++; if (ls.length > 3) masDe3++; if (ls.length > 8) masDe8++;
      const abiertos = ls.filter((l) => String(l.status_id) !== '142' && String(l.status_id) !== '143');
      const porLeadU = {}; abiertos.forEach((l) => { const cv = conversaciones(W.porLead[l.id]); for (const u in cv) if (cv[u] >= LIM) porLeadU[u] = 1; });
      if (Object.keys(porLeadU).length > 1) dosVend++;
      const junto = conversaciones([].concat.apply([], abiertos.map((l) => W.porLead[l.id])));
      const extra = Object.keys(junto).filter((u) => junto[u] >= LIM && !porLeadU[u]);
      if (extra.length) { cruzados++; if (!Object.keys(porLeadU).length) cruzSinNadie++; }
    });
    console.log('   contactos con mensajes: ' + Object.keys(porC).length + ' · con 2+ leads con mensajes: ' + cVarios + ' · con más de 3: ' + masDe3 + ' · con más de 8: ' + masDe8 + ' · con conversación vigente de 2+ vendedoras: ' + dosVend);
    console.log('   conversaciones que SOLO se ven juntando los leads del contacto (el cliente escribe en un lead y le contestan desde otro): ' + cruzados + ' contactos' + (cruzados ? ' · de esos, ' + cruzSinNadie + ' saldrían «Libre» con la regla por lead' + (cruzSinNadie ? ' ⚠️' : '') : ''));
    const sueltos = W.ev.L.filter((e) => e.entity_type !== 'lead'), porCont = {};
    sueltos.forEach((e) => { (porCont[e.entity_type + '|' + e.entity_id] = porCont[e.entity_type + '|' + e.entity_id] || []).push({ type: e.type, created_at: Number(e.created_at), created_by: Number(e.created_by) || 0 }); });
    const sueltosConPar = Object.keys(porCont).filter((k) => { const cv = conversaciones(porCont[k]); return Object.keys(cv).some((u) => cv[u] >= LIM); }).length;
    console.log('   mensajes que NO cuelgan de un lead (el servidor los cuenta en «otros» y no los mira): ' + sueltos.length + ' en ' + Object.keys(porCont).length + ' contactos · con conversación vigente ahí: ' + sueltosConPar + (sueltosConPar ? ' ⚠️' : ''));
  }

  /* ── 3 · la muestra: números de verdad, de todo tipo ── */
  const H1 = V.heaven, cH = H1.c;
  titulo('3 · La muestra (' + MUESTRA + ' números de Heaven): el quienAtiende_ REAL contra la verdad');
  const idsL = Object.keys(H1.leads);
  const info = idsL.map((id) => {
    const cv = conversaciones(H1.porLead[id]), us = Object.keys(cv), ult = us.length ? Math.max.apply(null, us.map((u) => cv[u])) : 0;
    return { id, n: H1.porLead[id].length, ult, vig: us.filter((u) => cv[u] >= LIM).length, cerrado: String(H1.leads[id].status_id) === '142' ? 'g' : String(H1.leads[id].status_id) === '143' ? 'p' : '' };
  });
  const azar = (() => { let a = T0 >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const toma = (arr, n) => arr.map((x) => [azar(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  const grupos = [
    ['conversación de las últimas 48 h', info.filter((x) => x.vig && x.ult >= T0 - 2 * D), 7],
    ['conversación de hace 3 a 13 días', info.filter((x) => x.vig && x.ult < T0 - 3 * D && x.ult >= T0 - 13 * D), 7],
    ['conversación en el BORDE (hace 13,5 a 15 días: todavía vale)', info.filter((x) => x.vig && x.ult < T0 - 13.5 * D), 6],
    ['conversación VENCIDA por poco (hace 15 a 16,9 días)', info.filter((x) => !x.vig && x.ult && x.ult < LIM), 6],
    ['mensajes pero SIN conversación (uno solo, o el bot)', info.filter((x) => !x.ult), 6],
    ['dos o más vendedoras conversando en el mismo lead', info.filter((x) => x.vig > 1), 3],
    ['lead ganado o perdido con mensajes', info.filter((x) => x.cerrado), 3],
    ['los leads con más mensajes', info.slice().sort((a, b) => b.n - a.n).slice(0, 12), 2]
  ];
  const elegidos = [], ya = {};
  grupos.forEach((g) => { let n = 0; toma(g[1], g[2] * 4).forEach((x) => { if (n < g[2] && !ya[x.id] && H1.cDeLead[x.id]) { ya[x.id] = 1; elegidos.push({ lead: x.id, grupo: g[0] }); n++; } }); console.log('   ' + g[0] + ': ' + g[1].length + ' leads en la cuenta → ' + n + ' a la muestra'); });
  const R = { probados: 0, sinTel: 0, noEncuentra: 0, hojaIgual: 0, hojaDist: 0, pagIgual: 0, pagDist: 0, hojaPag: 0, incompletos: 0, libreConIncompleto: 0, tuyoBien: 0, tuyoMal: 0, tuyoN: 0,
              masLeads: 0, masContactos: 0, variosContactos: 0, enSuena: 0, cruz: 0, masDeUnTel: 0, t4Distinto: 0, cache: 0, formato: 0 };
  const tiempos = [], nLlam = [], porClase = {}, difs = [];
  const nombresMuestra = [];
  for (const el of elegidos) {
    if (R.probados >= MUESTRA) break;
    const cid = H1.cDeLead[el.lead], rc = api(cH, '/contacts/' + cid);
    if (rc.code !== 200 || !rc.o) continue;
    const tt = tels(rc.o).map((t) => t.replace(/\D/g, '')).filter((d) => d.length >= 7);
    if (!tt.length) { R.sinTel++; continue; }
    const c8 = tt[0].slice(-8); R.probados++; if (tt.length > 1) R.masDeUnTel++;
    nombresMuestra.push({ nombre: String(rc.o.name || ''), cid, lead: el.lead, c8 });
    /* el servidor REAL */
    olvidar();
    const t = Date.now(); let r = null;
    try { r = gs.quienAtiende_({ action: 'quienAtiende', cel: c8, quien: 'Prueba de solo lectura' }); } catch (e) { mal('muestra ' + R.probados + ': quienAtiende_ reventó (' + sinDatos(e) + ')'); continue; }
    tiempos.push((Date.now() - t) / 1000); nLlam.push(ENV.llamadas.length);
    const hoja = ENV.hoja.length ? String(ENV.hoja[ENV.hoja.length - 1][4]) : '';
    if (!r || r.ok === false || !Array.isArray(r.cuentas)) { mal('muestra ' + R.probados + ': el servidor contestó ' + (r && r.error)); continue; }
    if (r.incompleto) R.incompletos++;
    const cuH = r.cuentas.filter((x) => x.marca === 'heaven')[0] || {}, cuS = r.cuentas.filter((x) => x.marca === 'suena')[0] || {};
    if (cuH.masLeads) R.masLeads++; if (cuH.masContactos) R.masContactos++; if ((cuH.contactos || 0) > 1) R.variosContactos++; if ((cuS.leads || []).length) R.enSuena++;
    if (!(cuH.leads || []).some((l) => String(l.id) === String(el.lead)) && !cuH.masLeads) { R.noEncuentra++; }
    /* la verdad de ESE número, por su cuenta */
    const at = {}, ganados = []; let truncado = false;
    for (const c of activas) {
      const W = V[c.marca], bc = paginar(c, '/contacts?query=' + c8 + '&with=leads', 'contacts', 250, 8);
      if (bc.estado !== 'ok') truncado = true;
      const mios = bc.L.filter((x) => tels(x).some((t2) => telEs(t2, c8)));
      const vistos = {};
      for (const co of mios) {
        const lids = emb(co, 'leads').map((l) => l.id), abiertos = [];
        for (const lid of lids.slice(0, 40)) {
          if (vistos[lid]) continue; vistos[lid] = 1;
          let l = W.leads[lid]; if (!l) { const rl = api(c, '/leads/' + lid); if (rl.code !== 200 || !rl.o) continue; l = rl.o; }
          const est = String(l.status_id) === '142' ? 'g' : String(l.status_id) === '143' ? 'p' : '';
          const cv = conversaciones(W.porLead[lid] || []), ult = Math.max(0, ...Object.keys(cv).map((u) => cv[u]));
          if (est === 'p') continue;
          if (est === 'g') { const tc = Math.max(Number(l.closed_at) || Number(l.updated_at) || 0, ult); if (tc >= LIM) ganados.push(W.nomU[String(l.responsible_user_id)] || (Number(l.responsible_user_id) ? 'usuario ' + l.responsible_user_id : '(sin asignar)')); continue; }
          abiertos.push(l);
          for (const u in cv) if (cv[u] >= LIM) at[c.marca + '|' + u] = W.nomU[u] || 'usuario ' + u;
          (W.tareas.leads[lid] || []).forEach((x) => { const ts = Number(x.complete_till) || 0; if (Number(x.created_by) && ts > T0 && ts <= T0 + 90 * D) { const u = Number(x.responsible_user_id) || Number(l.responsible_user_id) || 0; at[c.marca + '|' + u] = u ? (W.nomU[String(u)] || 'usuario ' + u) : '(sin asignar)'; } });
        }
        (W.tareas.contacts[co.id] || []).forEach((x) => { const ts = Number(x.complete_till) || 0; if (Number(x.created_by) && ts > T0 && ts <= T0 + 90 * D) abiertos.forEach((l) => { const u = Number(x.responsible_user_id) || Number(l.responsible_user_id) || 0; at[c.marca + '|' + u] = u ? (W.nomU[String(u)] || 'usuario ' + u) : '(sin asignar)'; }); });
      }
    }
    const nomsV = Object.keys(at).map((k) => at[k]), kV = nomsV.length ? 'atiende' : ganados.length ? 'compro' : 'libre';
    /* la página REAL */
    const Vp = pag.qaVeredicto(JSON.parse(JSON.stringify(r)), ''), kP = (Vp.k === 'otro' || Vp.k === 'tuyo') ? 'atiende' : Vp.k, nomsP = Array.from(Vp.quien || []).map((q) => q.n);
    const kHj = hoja === 'Libre' ? 'libre' : /^Atiende: /.test(hoja) ? 'atiende' : /^Ya compró con /.test(hoja) ? 'compro' : /^No se pudo consultar/.test(hoja) ? 'nose' : '?';
    const nomsH = (/^Atiende: (.*?)( \(Kommo no contestó todo\))?$/.exec(hoja) || ['', ''])[1].split(', ').filter(Boolean);
    porClase[kV + ' → ' + kP] = (porClase[kV + ' → ' + kP] || 0) + 1;
    if (r.incompleto && (kP === 'libre' || kHj === 'libre')) { R.libreConIncompleto++; mal('muestra ' + R.probados + ': Kommo no contestó todo y dice «Libre»'); }
    const igualP = !r.incompleto && kP === kV && (kV !== 'atiende' || conj(nomsP) === conj(nomsV)) && (kV !== 'compro' || ganados.map(normN).indexOf(normN(Vp.compro.n)) >= 0);
    const igualH = !r.incompleto && kHj === kV && (kV !== 'atiende' || conj(nomsH) === conj(nomsV)) && (kV !== 'compro' || ganados.map(normN).indexOf(normN(hoja.replace(/^Ya compró con /, ''))) >= 0);
    if (r.incompleto || truncado) { /* no se compara: está dicho arriba */ }
    else {
      if (igualP) R.pagIgual++; else { R.pagDist++; difs.push('muestra ' + R.probados + ' (' + el.grupo + '): la página dice ' + kP + '(' + nomsP.length + ') y la verdad ' + kV + '(' + nomsV.length + ')' + (kP === kV ? ' · otros nombres' : '') + ' · contactos ' + (cuH.contactos || 0) + ', leads ' + (cuH.leads || []).length + ', más leads ' + (cuH.masLeads || 0)); }
      if (igualH) R.hojaIgual++; else { R.hojaDist++; if (igualP) difs.push('muestra ' + R.probados + ' (' + el.grupo + '): la HOJA dice ' + kHj + '(' + nomsH.length + ') y la verdad ' + kV + '(' + nomsV.length + ')'); }
      if ((kHj === kP || (kHj === 'nose' && kP === 'nose')) && conj(nomsH) === conj(nomsP)) R.hojaPag++;
      else mal('muestra ' + R.probados + ': la hoja (' + kHj + ', ' + nomsH.length + ') y el cartel (' + kP + ', ' + nomsP.length + ') no dicen lo mismo');
    }
    /* con el nombre de quien lo atiende (si es una sola), el cartel tiene que decir «lo atendés vos» */
    if (!r.incompleto && kP === 'atiende' && nomsP.length === 1 && !/^usuario |^\(sin/.test(nomsP[0])) { R.tuyoN++; if (pag.qaVeredicto(JSON.parse(JSON.stringify(r)), nomsP[0]).k === 'tuyo') R.tuyoBien++; else R.tuyoMal++; }
    /* la misma búsqueda seguida: de la caché, sin llamar a Kommo · y con 591, espacios y guiones: lo mismo */
    if (!r.incompleto) {
      const n0 = RED.n; let r2 = null; try { r2 = gs.quienAtiende_({ action: 'quienAtiende', cel: '+591 ' + c8.slice(0, 3) + '-' + c8.slice(3, 5) + ' ' + c8.slice(5), quien: 'Prueba de solo lectura' }); } catch (e) {}
      if (r2 && r2.cache === true && RED.n === n0) R.cache++; else mal('muestra ' + R.probados + ': la segunda búsqueda (con +591, guion y espacio) no salió de la caché');
      if (r2 && JSON.stringify(r2.cuentas) === JSON.stringify(r.cuentas)) R.formato++;
    }
  }
  console.log('\n   números probados: ' + R.probados + ' (sin teléfono: ' + R.sinTel + ') · con más de un teléfono en el contacto: ' + R.masDeUnTel + ' · con 2+ contactos con ese número: ' + R.variosContactos + ' · que también están en Sueña: ' + R.enSuena);
  console.log('   la búsqueda NO encontró el lead de la muestra: ' + R.noEncuentra + (R.noEncuentra ? ' ⚠️' : ''));
  console.log('   «Kommo no contestó todo» (incompleto): ' + R.incompletos + ' · de esos, dice «Libre»: ' + R.libreConIncompleto);
  console.log('   EL CARTEL (qaVeredicto de la página) contra la verdad: ' + R.pagIgual + ' iguales, ' + R.pagDist + ' distintos');
  console.log('   LA HOJA (qaResumen_ del servidor) contra la verdad: ' + R.hojaIgual + ' iguales, ' + R.hojaDist + ' distintos');
  console.log('   la hoja y el cartel dicen lo mismo: ' + R.hojaPag + ' de ' + (R.pagIgual + R.pagDist));
  console.log('   verdad → cartel: ' + JSON.stringify(porClase));
  console.log('   con el nombre de la que lo atiende dice «lo atendés vos»: ' + R.tuyoBien + ' de ' + R.tuyoN + (R.tuyoMal ? ' ⚠️' : ''));
  console.log('   la segunda búsqueda sale de la caché: ' + R.cache + ' · con +591, guion y espacio da lo mismo: ' + R.formato);
  console.log('   topes: «… y N leads más viejos» en ' + R.masLeads + ' · «… y N clientes más» en ' + R.masContactos);
  console.log('   llamadas a Kommo por búsqueda: mediana ' + mediana(nLlam) + ', máx ' + Math.max.apply(null, nLlam.concat([0])) + ' · tiempo por búsqueda desde acá: mediana ' + mediana(tiempos).toFixed(1) + ' s, máx ' + Math.max.apply(null, tiempos.concat([0])).toFixed(1) + ' s');
  difs.forEach((d) => mal(d));

  /* ── 4 · por NOMBRE: que el contacto de la muestra aparezca, y lo que no se puede saber sin probar ── */
  titulo('4 · Por nombre y apellido (' + MUESTRA_NOMBRE + ' contactos de la muestra con nombre y apellido)');
  const N = { probados: 0, encontrado: 0, enMas: 0, noAparece: 0, incompletos: 0, varios: 0, corta250: 0, masDe8: 0, llam: [], tiempos: [] };
  const conTilde = [];
  for (const m of nombresMuestra) {
    if (/[áéíóúñÁÉÍÓÚÑ]/.test(m.nombre)) m.nombre.split(/\s+/).forEach((w) => { if (/[áéíóúñÁÉÍÓÚÑ]/.test(w) && w.length >= 4 && conTilde.length < 8 && conTilde.indexOf(w) < 0) conTilde.push(w); });
    if (N.probados >= MUESTRA_NOMBRE) continue;
    const nom = pag.qaNombreBusca(m.nombre); if (!nom || /\d/.test(m.nombre)) continue;
    N.probados++;
    olvidar();
    const t = Date.now(); let r = null;
    try { r = gs.quienAtiende_({ action: 'quienAtiende', nombre: nom, nombreOrig: m.nombre.trim().slice(0, 60), quien: 'Prueba de solo lectura' }); } catch (e) { mal('nombre ' + N.probados + ': quienAtiende_ reventó (' + sinDatos(e) + ')'); continue; }
    N.tiempos.push((Date.now() - t) / 1000); N.llam.push(ENV.llamadas.length);
    if (!r || !Array.isArray(r.cuentas)) { mal('nombre ' + N.probados + ': el servidor contestó ' + (r && r.error)); continue; }
    if (r.incompleto) N.incompletos++;
    const cu = r.cuentas.filter((x) => x.marca === 'heaven')[0] || {};
    if ((cu.contactos || 0) > 1) N.varios++; if (cu.masContactos) N.masDe8++;
    if ((cu.leads || []).some((l) => String(l.id) === String(m.lead))) N.encontrado++;
    else if (cu.masContactos || cu.masLeads) N.enMas++;
    else { N.noAparece++; }
    /* ¿la búsqueda de Kommo por la palabra más larga corta en 250? */
    const larga = m.nombre.trim().split(/\s+/).sort((a, b) => b.length - a.length)[0] || '';
    const p1 = api(cH, '/contacts?query=' + encodeURIComponent(larga) + '&with=leads&limit=250');
    if (p1.code === 200 && p1.o && p1.o._links && p1.o._links.next) N.corta250++;
  }
  console.log('   nombres probados: ' + N.probados + ' · su contacto aparece con su lead: ' + N.encontrado + ' · quedó en «… y N más»: ' + N.enMas + ' · NO aparece: ' + N.noAparece + (N.noAparece ? ' ⚠️' : ''));
  console.log('   con 2+ contactos que se llaman así: ' + N.varios + ' · con más de ' + gs.QA_MAX_CONTACTOS + ': ' + N.masDe8 + ' · incompletos: ' + N.incompletos);
  console.log('   la búsqueda de Kommo por la palabra más larga trae MÁS de 250 contactos (el servidor mira solo los primeros 250 y no avisa): ' + N.corta250 + ' de ' + N.probados + (N.corta250 ? ' ⚠️' : ''));
  console.log('   llamadas por búsqueda: mediana ' + mediana(N.llam) + ', máx ' + Math.max.apply(null, N.llam.concat([0])) + ' · tiempo: mediana ' + mediana(N.tiempos).toFixed(1) + ' s, máx ' + Math.max.apply(null, N.tiempos.concat([0])).toFixed(1) + ' s');
  /* ¿la búsqueda de Kommo distingue tildes y mayúsculas? (se cuentan contactos, no se imprime la palabra) */
  let tIgual = 0, tDist = 0, tMas = 0, mIgual = 0, mDist = 0;
  conTilde.forEach((w) => {
    const ids = (q) => { const r = api(cH, '/contacts?query=' + encodeURIComponent(q) + '&limit=250'); return r.code === 200 ? emb(r.o, 'contacts').map((x) => x.id).sort().join() : (r.code === 204 ? '' : 'ERR' + r.code); };
    const a = ids(w), b = ids(w.normalize('NFD').replace(/[̀-ͯ]/g, '')), m2 = ids(w.toUpperCase());
    if (a === b) tIgual++; else { tDist++; if (b.split(',').length > a.split(',').length) tMas++; }
    if (a === m2) mIgual++; else mDist++;
  });
  console.log('   ¿la búsqueda de Kommo distingue tildes? ' + conTilde.length + ' palabras con tilde o ñ probadas: con y sin tilde trae LOS MISMOS contactos en ' + tIgual + ', distintos en ' + tDist + (tDist ? ' ⚠️ (sin tilde trae más en ' + tMas + ')' : '') + ' · en mayúsculas: iguales ' + mIgual + ', distintos ' + mDist);

  /* ── 5 · las vendedoras del panel y sus usuarios de Kommo (qaMismo de la página) ── */
  titulo('5 · ¿Cada vendedora del panel tiene SU usuario en Kommo con ese nombre? (si no, verá «lo atiende <ella misma>»)');
  const panel = Array.from(pag.VENDEDORES || []).filter((v) => !/^ROHO$/i.test(v));
  const todosU = []; activas.forEach((c) => Object.keys(V[c.marca].nomU).forEach((id) => todosU.push({ marca: c.marca, id, n: V[c.marca].nomU[id] })));
  panel.forEach((v) => {
    const por = {}; todosU.forEach((u) => { if (pag.qaMismo(u.n, v)) por[u.marca] = (por[u.marca] || 0) + 1; });
    const tot = Object.keys(por).reduce((s, k) => s + por[k], 0);
    console.log('   ' + v + ': ' + (tot === 0 ? '⚠️ NINGÚN usuario de Kommo se llama así' + (CUENTAS[1].token ? '' : ' en Heaven (Sueña no se pudo mirar)') : tot === 1 ? 'un usuario (' + Object.keys(por)[0] + ')' : (Object.keys(por).length === tot ? 'uno en cada cuenta (' + Object.keys(por).join(' y ') + ')' : '⚠️ ' + tot + ' usuarios coinciden: ' + JSON.stringify(por))));
  });
  let ambiguos = 0; for (let i = 0; i < todosU.length; i++) for (let j = i + 1; j < todosU.length; j++) if (todosU[i].marca === todosU[j].marca && pag.qaMismo(todosU[i].n, todosU[j].n)) ambiguos++;
  console.log('   pares de usuarios DISTINTOS de la misma cuenta que la página tomaría por la misma persona: ' + ambiguos + (ambiguos ? ' ⚠️' : ''));

  /* ── 6 · cuentas técnicas ── */
  titulo('6 · Límites');
  console.log('   pedidos a Kommo en toda la corrida: ' + RED.n + ' · 429 (demasiados pedidos): ' + RED.n429 + ' · errores de red: ' + RED.errores + ' · intentos de ESCRIBIR frenados: ' + RED.noGet + ' · a otro host: ' + RED.ajenos);
  console.log('   la dirección más larga que arma el servidor: ' + ENV.urlMaxGs + ' letras (la más larga de toda la corrida ' + RED.urlMax + '; Apps Script corta en 2.082)');
  console.log('   el valor más grande guardado en la caché: ' + ENV.cacheMax + ' bytes (tope 102.400) · el vencimiento más largo pedido: ' + ENV.ttlMax + ' s' + (ENV.ttlMax > 21600 ? ' ⚠️ (CacheService guarda 6 h = 21.600 s como mucho: el tope «por día» no dura el día)' : ''));
  console.log('   mensajes que entraron a Kommo DESPUÉS de empezar y no se miraron: ' + ENV.despues);
  console.log('\n' + (MAL ? '❌ ' + MAL + ' cosas para mirar (arriba, con ❌)' : '✅ Todo coincide') + '. Nada se cambió en Kommo.');
  process.exit(MAL ? 1 : 0);
}
try { main(); } catch (e) { console.log('❌ La prueba reventó: ' + sinDatos(e)); process.exit(1); }
